"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminOrManager } from "@/lib/auth/access";

function redirectToTenants(
  status: "success" | "error",
  message: string
): never {
  const params = new URLSearchParams({ status, message });
  redirect(`/tenants?${params.toString()}`);
}

function requiredText(
  formData: FormData,
  key: string,
  label: string,
  maxLength = 160
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

function optionalText(
  formData: FormData,
  key: string,
  maxLength = 160
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

function tenantIdFrom(formData: FormData) {
  return requiredText(
    formData,
    "tenant_id",
    "L’identifiant du locataire",
    100
  );
}

export async function createTenantAction(formData: FormData) {
  const { supabase, membership } = await requireAdminOrManager();

  try {
    const firstName = requiredText(
      formData,
      "first_name",
      "Le prénom",
      120
    );
    const lastName = requiredText(
      formData,
      "last_name",
      "Le nom",
      120
    );
    const phone = optionalText(formData, "phone", 40);

    const { error } = await supabase.from("tenants").insert({
      organization_id: membership.organization_id,
      first_name: firstName,
      last_name: lastName,
      phone,
      is_active: true,
    });

    if (error) {
      console.error("Erreur création locataire :", error);
      redirectToTenants(
        "error",
        "Impossible de créer le locataire."
      );
    }

    revalidatePath("/tenants");
    revalidatePath("/dashboard");
    revalidatePath("/leases");

    redirectToTenants(
      "success",
      "Le locataire a été créé."
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    redirectToTenants(
      "error",
      error instanceof Error
        ? error.message
        : "Impossible de créer le locataire."
    );
  }
}

export async function updateTenantAction(formData: FormData) {
  const { supabase, membership } = await requireAdminOrManager();

  try {
    const tenantId = tenantIdFrom(formData);
    const firstName = requiredText(
      formData,
      "first_name",
      "Le prénom",
      120
    );
    const lastName = requiredText(
      formData,
      "last_name",
      "Le nom",
      120
    );
    const phone = optionalText(formData, "phone", 40);

    const { data: existingTenant, error: tenantError } =
      await supabase
        .from("tenants")
        .select("id")
        .eq("id", tenantId)
        .eq(
          "organization_id",
          membership.organization_id
        )
        .maybeSingle();

    if (tenantError || !existingTenant) {
      redirectToTenants(
        "error",
        "Ce locataire est introuvable dans votre organisation."
      );
    }

    const { error } = await supabase
      .from("tenants")
      .update({
        first_name: firstName,
        last_name: lastName,
        phone,
      })
      .eq("id", tenantId)
      .eq(
        "organization_id",
        membership.organization_id
      );

    if (error) {
      console.error("Erreur modification locataire :", error);
      redirectToTenants(
        "error",
        "Impossible de modifier le locataire."
      );
    }

    revalidatePath("/tenants");
    revalidatePath("/dashboard");
    revalidatePath("/leases");

    redirectToTenants(
      "success",
      "Les informations du locataire ont été mises à jour."
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    redirectToTenants(
      "error",
      error instanceof Error
        ? error.message
        : "Impossible de modifier le locataire."
    );
  }
}

export async function toggleTenantActiveAction(
  formData: FormData
) {
  const { supabase, membership } = await requireAdminOrManager();

  const tenantId = tenantIdFrom(formData);
  const nextValue = String(
    formData.get("next_is_active") ?? ""
  );

  if (!["true", "false"].includes(nextValue)) {
    redirectToTenants(
      "error",
      "Le statut demandé n’est pas valide."
    );
  }

  const nextIsActive = nextValue === "true";

  const { data: tenant, error: tenantError } =
    await supabase
      .from("tenants")
      .select("id")
      .eq("id", tenantId)
      .eq(
        "organization_id",
        membership.organization_id
      )
      .maybeSingle();

  if (tenantError || !tenant) {
    redirectToTenants(
      "error",
      "Ce locataire est introuvable dans votre organisation."
    );
  }

  const { error } = await supabase
    .from("tenants")
    .update({ is_active: nextIsActive })
    .eq("id", tenantId)
    .eq(
      "organization_id",
      membership.organization_id
    );

  if (error) {
    console.error("Erreur statut locataire :", error);
    redirectToTenants(
      "error",
      "Impossible de modifier le statut du locataire."
    );
  }

  revalidatePath("/tenants");
  revalidatePath("/dashboard");
  revalidatePath("/leases");

  redirectToTenants(
    "success",
    nextIsActive
      ? "Le locataire a été réactivé."
      : "Le locataire a été désactivé."
  );
}

export async function deleteTenantAction(formData: FormData) {
  const { supabase, membership } = await requireAdminOrManager();

  const tenantId = tenantIdFrom(formData);

  const { data: tenant, error: tenantError } =
    await supabase
      .from("tenants")
      .select("id, first_name, last_name, auth_user_id")
      .eq("id", tenantId)
      .eq(
        "organization_id",
        membership.organization_id
      )
      .maybeSingle();

  if (tenantError || !tenant) {
    redirectToTenants(
      "error",
      "Ce locataire est introuvable dans votre organisation."
    );
  }

  if (tenant.auth_user_id) {
    redirectToTenants(
      "error",
      "Ce locataire possède encore un compte portail lié. Dissociez d’abord son accès avant de supprimer sa fiche."
    );
  }

  const { count: leaseCount, error: leaseError } =
    await supabase
      .from("leases")
      .select("id", { count: "exact", head: true })
      .eq(
        "organization_id",
        membership.organization_id
      )
      .eq("tenant_id", tenantId);

  if (leaseError) {
    console.error(
      "Erreur vérification baux du locataire :",
      leaseError
    );
    redirectToTenants(
      "error",
      "Impossible de vérifier les baux liés à ce locataire."
    );
  }

  if ((leaseCount ?? 0) > 0) {
    redirectToTenants(
      "error",
      "Impossible de supprimer ce locataire tant qu’un bail est lié à sa fiche. Désactivez-le si vous souhaitez conserver son historique."
    );
  }

  const { error: deleteError } = await supabase
    .from("tenants")
    .delete()
    .eq("id", tenantId)
    .eq(
      "organization_id",
      membership.organization_id
    );

  if (deleteError) {
    console.error("Erreur suppression locataire :", deleteError);
    redirectToTenants(
      "error",
      "Impossible de supprimer le locataire."
    );
  }

  revalidatePath("/tenants");
  revalidatePath("/dashboard");
  revalidatePath("/leases");

  const tenantName =
    `${tenant.first_name ?? ""} ${tenant.last_name ?? ""}`.trim();

  redirectToTenants(
    "success",
    tenantName
      ? `${tenantName} a été supprimé définitivement.`
      : "Le locataire a été supprimé définitivement."
  );
}
