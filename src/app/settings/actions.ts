"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MANAGEABLE_ROLES = ["MANAGER", "OWNER", "TENANT"] as const;

type ManageableRole = (typeof MANAGEABLE_ROLES)[number];

function getRequiredText(
  formData: FormData,
  key: string,
  label: string,
  maxLength: number
) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${label} est obligatoire.`);
  }

  if (value.length > maxLength) {
    throw new Error(`${label} est trop long.`);
  }

  return value;
}

function getOptionalText(
  formData: FormData,
  key: string,
  maxLength: number
) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    return null;
  }

  if (value.length > maxLength) {
    throw new Error(`Le champ ${key} est trop long.`);
  }

  return value;
}

async function requireAgencyAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(
      "Impossible de vérifier votre accès à l’organisation."
    );
  }

  if (!membership?.organization_id) {
    throw new Error("Aucune organisation active n’a été trouvée.");
  }

  if (membership.role !== "ADMIN_AGENCY") {
    throw new Error(
      "Seul un administrateur d’agence peut effectuer cette action."
    );
  }

  return {
    supabase,
    user,
    organizationId: membership.organization_id,
  };
}

export async function updateOrganizationAction(formData: FormData) {
  const { supabase, organizationId } = await requireAgencyAdmin();

  const name = getRequiredText(
    formData,
    "name",
    "Le nom de l’agence",
    120
  );

  const email = getOptionalText(formData, "email", 160);
  const phone = getOptionalText(formData, "phone", 40);
  const address = getOptionalText(formData, "address", 240);
  const city = getOptionalText(formData, "city", 120);
  const country = getOptionalText(formData, "country", 120);

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("L’adresse e-mail de l’agence n’est pas valide.");
  }

  const { error: updateError } = await supabase
    .from("organizations")
    .update({
      name,
      email,
      phone,
      address,
      city,
      country,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId);

  if (updateError) {
    throw new Error(
      `Impossible de mettre à jour l’agence : ${updateError.message}`
    );
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function inviteUserAction(formData: FormData) {
  const { organizationId } = await requireAgencyAdmin();

  const email = getRequiredText(
    formData,
    "invite_email",
    "L’adresse e-mail",
    160
  ).toLowerCase();

  const firstName = getRequiredText(
    formData,
    "invite_first_name",
    "Le prénom",
    120
  );

  const lastName = getRequiredText(
    formData,
    "invite_last_name",
    "Le nom",
    120
  );

  const phone = getOptionalText(
    formData,
    "invite_phone",
    40
  );

  const roleValue = String(
    formData.get("invite_role") ?? ""
  ).trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("L’adresse e-mail saisie n’est pas valide.");
  }

  if (!MANAGEABLE_ROLES.includes(roleValue as ManageableRole)) {
    throw new Error("Le rôle sélectionné n’est pas autorisé.");
  }

  const role = roleValue as ManageableRole;
  const admin = createAdminClient();

  const { data: inviteData, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        first_name: firstName,
        last_name: lastName,
        phone,
        organization_id: organizationId,
        organization_role: role,
      },
    });

  if (inviteError) {
    throw new Error(
      `Impossible d’envoyer l’invitation : ${inviteError.message}`
    );
  }

  const invitedUser = inviteData.user;

  if (!invitedUser?.id) {
    throw new Error(
      "L’utilisateur a été invité, mais son identifiant n’a pas été retourné."
    );
  }

  const { error: profileError } = await admin
    .from("profiles")
    .upsert(
      {
        id: invitedUser.id,
        first_name: firstName,
        last_name: lastName,
        phone,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      }
    );

  if (profileError) {
    throw new Error(
      `Invitation créée, mais le profil n’a pas pu être enregistré : ${profileError.message}`
    );
  }

  const { error: membershipError } = await admin
    .from("organization_members")
    .insert({
      organization_id: organizationId,
      user_id: invitedUser.id,
      role,
      is_active: true,
    });

  if (membershipError) {
    throw new Error(
      `Invitation créée, mais l’accès à l’agence n’a pas pu être enregistré : ${membershipError.message}`
    );
  }

  revalidatePath("/settings");
}

export async function updateMemberAccessAction(formData: FormData) {
  const { user, organizationId } = await requireAgencyAdmin();

  const membershipId = getRequiredText(
    formData,
    "membership_id",
    "L’identifiant du membre",
    100
  );

  const roleValue = String(
    formData.get("member_role") ?? ""
  ).trim();

  const activeValue = String(
    formData.get("member_is_active") ?? ""
  ).trim();

  if (!MANAGEABLE_ROLES.includes(roleValue as ManageableRole)) {
    throw new Error(
      "Le rôle sélectionné n’est pas autorisé pour ce membre."
    );
  }

  if (!["true", "false"].includes(activeValue)) {
    throw new Error("Le statut d’accès sélectionné n’est pas valide.");
  }

  const admin = createAdminClient();

  const { data: targetMembership, error: targetError } = await admin
    .from("organization_members")
    .select("id, organization_id, user_id, role, is_active")
    .eq("id", membershipId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (targetError) {
    throw new Error(
      `Impossible de vérifier ce membre : ${targetError.message}`
    );
  }

  if (!targetMembership) {
    throw new Error(
      "Ce membre n’appartient pas à votre organisation."
    );
  }

  if (targetMembership.user_id === user.id) {
    throw new Error(
      "Vous ne pouvez pas modifier votre propre rôle ni désactiver votre propre accès."
    );
  }

  if (targetMembership.role === "ADMIN_AGENCY") {
    throw new Error(
      "Un accès administrateur d’agence ne peut pas être modifié depuis cette interface."
    );
  }

  const { error: updateError } = await admin
    .from("organization_members")
    .update({
      role: roleValue as ManageableRole,
      is_active: activeValue === "true",
    })
    .eq("id", membershipId)
    .eq("organization_id", organizationId);

  if (updateError) {
    throw new Error(
      `Impossible de mettre à jour ce membre : ${updateError.message}`
    );
  }

  revalidatePath("/settings");
}
