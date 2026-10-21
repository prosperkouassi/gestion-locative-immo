"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { assertAgencyWritable } from "@/lib/subscriptions/assert-agency-writable";
import { createClient } from "@/lib/supabase/server";

const MANAGEABLE_ROLES = ["MANAGER", "OWNER", "TENANT"] as const;

type ManageableRole = (typeof MANAGEABLE_ROLES)[number];

function redirectToSettings(
  status: "success" | "error",
  message: string,
  extraParams?: Record<string, string>
): never {
  const params = new URLSearchParams({
    status,
    message,
    ...extraParams,
  });

  redirect(`/settings?${params.toString()}`);
}

async function getRequestOrigin() {
  const requestHeaders = await headers();

  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";

  const forwardedProtocol =
    requestHeaders.get("x-forwarded-proto");

  const protocol =
    forwardedProtocol ??
    (host.startsWith("localhost") ||
    host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${protocol}://${host}`;
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

  await assertAgencyWritable(organizationId);

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

  await assertAgencyWritable(organizationId);

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
    redirectToSettings(
      "error",
      "L’adresse e-mail saisie n’est pas valide."
    );
  }

  if (!MANAGEABLE_ROLES.includes(roleValue as ManageableRole)) {
    redirectToSettings(
      "error",
      "Le rôle sélectionné n’est pas autorisé."
    );
  }

  const role = roleValue as ManageableRole;
  const admin = createAdminClient();

  const userMetadata = {
    first_name: firstName,
    last_name: lastName,
    phone,
    organization_id: organizationId,
    organization_role: role,
  };

  let invitedUserId: string | null = null;
  let localActivationUrl: string | null = null;

  /*
   * En développement local, on ne dépend pas du SMTP :
   * Supabase génère le lien d'invitation sans envoyer d'e-mail.
   *
   * En production, le flux normal reste inviteUserByEmail().
   */
  if (process.env.NODE_ENV === "development") {
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          data: userMetadata,
        },
      });

    if (linkError) {
      redirectToSettings(
        "error",
        getFriendlyInviteError(linkError.message)
      );
    }

    invitedUserId = linkData.user?.id ?? null;

    const hashedToken =
      linkData.properties?.hashed_token ?? null;

    if (!invitedUserId || !hashedToken) {
      redirectToSettings(
        "error",
        "Le lien d’activation local n’a pas pu être généré."
      );
    }

    const origin = await getRequestOrigin();

    const activationUrl = new URL(
      "/auth/confirm",
      origin
    );

    activationUrl.searchParams.set(
      "token_hash",
      hashedToken
    );
    activationUrl.searchParams.set(
      "type",
      "invite"
    );

    localActivationUrl = activationUrl.toString();
  } else {
    const { data: inviteData, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(email, {
        data: userMetadata,
      });

    if (inviteError) {
      redirectToSettings(
        "error",
        getFriendlyInviteError(inviteError.message)
      );
    }

    invitedUserId = inviteData.user?.id ?? null;
  }

  if (!invitedUserId) {
    redirectToSettings(
      "error",
      "L’utilisateur a été créé, mais son identifiant n’a pas été retourné."
    );
  }

  const { error: profileError } = await admin
    .from("profiles")
    .upsert(
      {
        id: invitedUserId,
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
      "L’utilisateur a été créé, mais son profil n’a pas pu être enregistré."
    );
  }

  const { error: membershipError } = await admin
    .from("organization_members")
    .insert({
      organization_id: organizationId,
      user_id: invitedUserId,
      role,
      is_active: true,
    });

  if (membershipError) {
    redirectToSettings(
      "error",
      "L’utilisateur a été créé, mais son accès à l’agence n’a pas pu être enregistré."
    );
  }

  revalidatePath("/settings");

  if (localActivationUrl) {
    redirectToSettings(
      "success",
      "L’utilisateur a été créé. Copiez le lien d’activation local ci-dessous et ouvrez-le dans une fenêtre privée.",
      {
        activation: localActivationUrl,
      }
    );
  }

  redirectToSettings(
    "success",
    "L’utilisateur a été invité et son accès à l’agence a été créé."
  );
}

export async function updateMemberAccessAction(formData: FormData) {
  const { user, organizationId } = await requireAgencyAdmin();

  await assertAgencyWritable(organizationId);

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
