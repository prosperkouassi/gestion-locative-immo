"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminOrManager } from "@/lib/auth/access";

function redirectToOwners(
  status: "success" | "error",
  message: string,
  extraParams?: Record<string, string>
): never {
  const params = new URLSearchParams({
    status,
    message,
    ...extraParams,
  });

  redirect(`/owners?${params.toString()}`);
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

function getOwnerId(formData: FormData) {
  return getRequiredText(
    formData,
    "owner_id",
    "L’identifiant du propriétaire",
    100
  );
}

function validateEmail(email: string | null) {
  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error(
      "L’adresse e-mail du propriétaire n’est pas valide."
    );
  }
}

export async function createOwnerAction(
  formData: FormData
) {
  const { supabase, membership } =
    await requireAdminOrManager();

  try {
    const firstName = getRequiredText(
      formData,
      "first_name",
      "Le prénom",
      120
    );

    const lastName = getRequiredText(
      formData,
      "last_name",
      "Le nom",
      120
    );

    const email = getOptionalText(
      formData,
      "email",
      160
    );

    const phone = getOptionalText(
      formData,
      "phone",
      40
    );

    const address = getOptionalText(
      formData,
      "address",
      240
    );

    const city = getOptionalText(
      formData,
      "city",
      120
    );

    validateEmail(email);

    const { error } = await supabase
      .from("owners")
      .insert({
        organization_id:
          membership.organization_id,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        address,
        city,
        is_active: true,
      });

    if (error) {
      console.error(
        "Erreur création propriétaire :",
        error
      );

      redirectToOwners(
        "error",
        "Impossible de créer le propriétaire."
      );
    }

    revalidatePath("/owners");
    revalidatePath("/dashboard");
    revalidatePath("/properties");

    redirectToOwners(
      "success",
      "Le propriétaire a été créé."
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error(
      "Erreur validation propriétaire :",
      error
    );

    redirectToOwners(
      "error",
      error instanceof Error
        ? error.message
        : "Impossible de créer le propriétaire."
    );
  }
}

export async function updateOwnerAction(
  formData: FormData
) {
  const { supabase, membership } =
    await requireAdminOrManager();

  try {
    const ownerId = getOwnerId(formData);

    const firstName = getRequiredText(
      formData,
      "first_name",
      "Le prénom",
      120
    );

    const lastName = getRequiredText(
      formData,
      "last_name",
      "Le nom",
      120
    );

    const email = getOptionalText(
      formData,
      "email",
      160
    );

    const phone = getOptionalText(
      formData,
      "phone",
      40
    );

    const address = getOptionalText(
      formData,
      "address",
      240
    );

    const city = getOptionalText(
      formData,
      "city",
      120
    );

    validateEmail(email);

    const {
      data: existingOwner,
      error: ownerError,
    } = await supabase
      .from("owners")
      .select("id")
      .eq("id", ownerId)
      .eq(
        "organization_id",
        membership.organization_id
      )
      .maybeSingle();

    if (ownerError || !existingOwner) {
      redirectToOwners(
        "error",
        "Ce propriétaire est introuvable dans votre organisation."
      );
    }

    const { error } = await supabase
      .from("owners")
      .update({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        address,
        city,
      })
      .eq("id", ownerId)
      .eq(
        "organization_id",
        membership.organization_id
      );

    if (error) {
      console.error(
        "Erreur modification propriétaire :",
        error
      );

      redirectToOwners(
        "error",
        "Impossible de modifier le propriétaire."
      );
    }

    revalidatePath("/owners");
    revalidatePath("/dashboard");
    revalidatePath("/properties");

    redirectToOwners(
      "success",
      "Les informations du propriétaire ont été mises à jour."
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error(
      "Erreur validation modification propriétaire :",
      error
    );

    redirectToOwners(
      "error",
      error instanceof Error
        ? error.message
        : "Impossible de modifier le propriétaire."
    );
  }
}

export async function toggleOwnerActiveAction(
  formData: FormData
) {
  const { supabase, membership } =
    await requireAdminOrManager();

  const ownerId = getOwnerId(formData);

  const activeValue = String(
    formData.get("next_is_active") ?? ""
  ).trim();

  if (!["true", "false"].includes(activeValue)) {
    redirectToOwners(
      "error",
      "Le statut demandé n’est pas valide."
    );
  }

  const nextIsActive =
    activeValue === "true";

  const {
    data: existingOwner,
    error: ownerError,
  } = await supabase
    .from("owners")
    .select("id")
    .eq("id", ownerId)
    .eq(
      "organization_id",
      membership.organization_id
    )
    .maybeSingle();

  if (ownerError || !existingOwner) {
    redirectToOwners(
      "error",
      "Ce propriétaire est introuvable dans votre organisation."
    );
  }

  const { error } = await supabase
    .from("owners")
    .update({
      is_active: nextIsActive,
    })
    .eq("id", ownerId)
    .eq(
      "organization_id",
      membership.organization_id
    );

  if (error) {
    console.error(
      "Erreur changement statut propriétaire :",
      error
    );

    redirectToOwners(
      "error",
      "Impossible de modifier le statut du propriétaire."
    );
  }

  revalidatePath("/owners");
  revalidatePath("/dashboard");
  revalidatePath("/properties");

  redirectToOwners(
    "success",
    nextIsActive
      ? "Le propriétaire a été réactivé."
      : "Le propriétaire a été désactivé."
  );
}

export async function deleteOwnerAction(
  formData: FormData
) {
  const { supabase, membership } =
    await requireAdminOrManager();

  const ownerId = getOwnerId(formData);

  const {
    data: existingOwner,
    error: ownerError,
  } = await supabase
    .from("owners")
    .select(
      "id, auth_user_id, first_name, last_name"
    )
    .eq("id", ownerId)
    .eq(
      "organization_id",
      membership.organization_id
    )
    .maybeSingle();

  if (ownerError || !existingOwner) {
    redirectToOwners(
      "error",
      "Ce propriétaire est introuvable dans votre organisation."
    );
  }

  if (existingOwner.auth_user_id) {
    redirectToOwners(
      "error",
      "Ce propriétaire possède encore un compte portail lié. Désactivez ou dissociez d’abord son accès avant de supprimer sa fiche."
    );
  }

  const {
    count: linkedPropertiesCount,
    error: propertiesError,
  } = await supabase
    .from("properties")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq(
      "organization_id",
      membership.organization_id
    )
    .eq("owner_id", ownerId);

  if (propertiesError) {
    console.error(
      "Erreur vérification biens propriétaire :",
      propertiesError
    );

    redirectToOwners(
      "error",
      "Impossible de vérifier les biens liés à ce propriétaire."
    );
  }

  if ((linkedPropertiesCount ?? 0) > 0) {
    redirectToOwners(
      "error",
      "Impossible de supprimer ce propriétaire tant qu’il possède des biens liés. Désactivez-le ou réattribuez d’abord ses biens."
    );
  }

  const { error: deleteError } =
    await supabase
      .from("owners")
      .delete()
      .eq("id", ownerId)
      .eq(
        "organization_id",
        membership.organization_id
      );

  if (deleteError) {
    console.error(
      "Erreur suppression propriétaire :",
      deleteError
    );

    redirectToOwners(
      "error",
      "Impossible de supprimer le propriétaire."
    );
  }

  revalidatePath("/owners");
  revalidatePath("/dashboard");
  revalidatePath("/properties");

  const ownerName =
    `${existingOwner.first_name ?? ""} ${
      existingOwner.last_name ?? ""
    }`.trim();

  redirectToOwners(
    "success",
    ownerName
      ? `${ownerName} a été supprimé définitivement.`
      : "Le propriétaire a été supprimé définitivement."
  );
}