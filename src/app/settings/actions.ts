"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MANAGEABLE_ROLES = ["MANAGER", "OWNER", "TENANT"] as const;

type ManageableRole = (typeof MANAGEABLE_ROLES)[number];

function redirectToSettings(
  status: "success" | "error",
  message: string
): never {
  const params = new URLSearchParams({
    status,
    message,
  });

  redirect(`/settings?${params.toString()}`);
}

function getFriendlyInviteError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("too many")
  ) {
    return "Trop de tentatives d’invitation ont été effectuées. Réessayez plus tard.";
  }

  if (
    normalizedMessage.includes("error sending invite email") ||
    normalizedMessage.includes("smtp")
  ) {
    return "L’invitation n’a pas pu être envoyée par e-mail. La configuration SMTP pourra être finalisée plus tard.";
  }

  if (
    normalizedMessage.includes("already") ||
    normalizedMessage.includes("registered") ||
    normalizedMessage.includes("exists")
  ) {
    return "Un compte utilisant cette adresse e-mail existe déjà.";
  }

  return "L’invitation n’a pas pu être envoyée. Réessayez plus tard.";
}

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
    redirectToSettings(
      "error",
      "Impossible de mettre à jour les informations de l’agence."
    );
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");

  redirectToSettings(
    "success",
    "Les informations de l’agence ont été mises à jour."
  );
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
    redirectToSettings(
      "error",
      getFriendlyInviteError(inviteError.message)
    );
  }

  const invitedUser = inviteData.user;

  if (!invitedUser?.id) {
    redirectToSettings(
      "error",
      "L’invitation a été créée, mais l’utilisateur n’a pas pu être finalisé."
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
    redirectToSettings(
      "error",
      "L’invitation a été créée, mais le profil utilisateur n’a pas pu être enregistré."
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
    redirectToSettings(
      "error",
      "L’invitation a été créée, mais l’accès à l’agence n’a pas pu être enregistré."
    );
  }

  revalidatePath("/settings");

  redirectToSettings(
    "success",
    "L’utilisateur a été invité et son accès à l’agence a été créé."
  );
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
    redirectToSettings(
      "error",
      "Le rôle sélectionné n’est pas autorisé pour ce membre."
    );
  }

  if (!["true", "false"].includes(activeValue)) {
    redirectToSettings(
      "error",
      "Le statut d’accès sélectionné n’est pas valide."
    );
  }

  const admin = createAdminClient();

  const { data: targetMembership, error: targetError } = await admin
    .from("organization_members")
    .select("id, organization_id, user_id, role, is_active")
    .eq("id", membershipId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (targetError) {
    redirectToSettings(
      "error",
      "Impossible de vérifier ce membre."
    );
  }

  if (!targetMembership) {
    redirectToSettings(
      "error",
      "Ce membre n’appartient pas à votre organisation."
    );
  }

  if (targetMembership.user_id === user.id) {
    redirectToSettings(
      "error",
      "Vous ne pouvez pas modifier votre propre rôle ni désactiver votre propre accès."
    );
  }

  if (targetMembership.role === "ADMIN_AGENCY") {
    redirectToSettings(
      "error",
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
    redirectToSettings(
      "error",
      "Impossible de mettre à jour ce membre."
    );
  }

  revalidatePath("/settings");

  redirectToSettings(
    "success",
    "Le rôle et l’accès du membre ont été mis à jour."
  );
}
