"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminOrManager } from "@/lib/auth/access";

function redirectToProperties(status: "success" | "error", message: string): never {
  const params = new URLSearchParams({ status, message });
  redirect(`/properties?${params.toString()}`);
}

function requiredText(formData: FormData, key: string, label: string, max = 180) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${label} est obligatoire.`);
  if (value.length > max) throw new Error(`${label} est trop long.`);
  return value;
}

function optionalText(formData: FormData, key: string, max = 240) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) return null;
  if (value.length > max) throw new Error(`Le champ ${key} est trop long.`);
  return value;
}

async function assertOwnerBelongsToOrganization(
  supabase: Awaited<ReturnType<typeof requireAdminOrManager>>["supabase"],
  organizationId: string,
  ownerId: string | null
) {
  if (!ownerId) return;

  const { data, error } = await supabase
    .from("owners")
    .select("id")
    .eq("id", ownerId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Le propriétaire sélectionné est invalide pour votre organisation.");
  }
}

export async function createPropertyAction(formData: FormData) {
  const { supabase, membership } = await requireAdminOrManager();

  try {
    const name = requiredText(formData, "name", "Le nom du bien");
    const ownerId = optionalText(formData, "owner_id", 100);
    const propertyType = optionalText(formData, "property_type", 100);
    const address = optionalText(formData, "address", 240);
    const city = optionalText(formData, "city", 120);
    const country = optionalText(formData, "country", 120) ?? "Côte d'Ivoire";

    await assertOwnerBelongsToOrganization(
      supabase,
      membership.organization_id,
      ownerId
    );

    const { error } = await supabase.from("properties").insert({
      organization_id: membership.organization_id,
      owner_id: ownerId,
      name,
      property_type: propertyType,
      address,
      city,
      country,
      is_active: true,
    });

    if (error) {
      console.error("Erreur création bien :", error);
      redirectToProperties("error", "Impossible de créer le bien.");
    }

    revalidatePath("/properties");
    revalidatePath("/units");
    revalidatePath("/dashboard");
    redirectToProperties("success", "Le bien a été créé.");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    redirectToProperties(
      "error",
      error instanceof Error ? error.message : "Impossible de créer le bien."
    );
  }
}

export async function updatePropertyAction(formData: FormData) {
  const { supabase, membership } = await requireAdminOrManager();

  try {
    const propertyId = requiredText(formData, "property_id", "L’identifiant du bien", 100);
    const name = requiredText(formData, "name", "Le nom du bien");
    const ownerId = optionalText(formData, "owner_id", 100);
    const propertyType = optionalText(formData, "property_type", 100);
    const address = optionalText(formData, "address", 240);
    const city = optionalText(formData, "city", 120);
    const country = optionalText(formData, "country", 120);

    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .eq("organization_id", membership.organization_id)
      .maybeSingle();

    if (propertyError || !property) {
      throw new Error("Ce bien est introuvable dans votre organisation.");
    }

    await assertOwnerBelongsToOrganization(
      supabase,
      membership.organization_id,
      ownerId
    );

    const { error } = await supabase
      .from("properties")
      .update({
        owner_id: ownerId,
        name,
        property_type: propertyType,
        address,
        city,
        country,
      })
      .eq("id", propertyId)
      .eq("organization_id", membership.organization_id);

    if (error) {
      console.error("Erreur modification bien :", error);
      throw new Error("Impossible de modifier le bien.");
    }

    revalidatePath("/properties");
    revalidatePath("/units");
    revalidatePath("/dashboard");
    redirectToProperties("success", "Le bien a été mis à jour.");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) throw error;
    redirectToProperties(
      "error",
      error instanceof Error ? error.message : "Impossible de modifier le bien."
    );
  }
}

export async function togglePropertyActiveAction(formData: FormData) {
  const { supabase, membership } = await requireAdminOrManager();
  const propertyId = requiredText(formData, "property_id", "L’identifiant du bien", 100);
  const nextValue = String(formData.get("next_is_active") ?? "").trim();

  if (nextValue !== "true" && nextValue !== "false") {
    redirectToProperties("error", "Le statut demandé est invalide.");
  }

  const nextIsActive = nextValue === "true";

  const { error } = await supabase
    .from("properties")
    .update({ is_active: nextIsActive })
    .eq("id", propertyId)
    .eq("organization_id", membership.organization_id);

  if (error) {
    console.error("Erreur statut bien :", error);
    redirectToProperties("error", "Impossible de modifier le statut du bien.");
  }

  revalidatePath("/properties");
  revalidatePath("/units");
  revalidatePath("/dashboard");
  redirectToProperties(
    "success",
    nextIsActive ? "Le bien a été réactivé." : "Le bien a été désactivé."
  );
}

export async function deletePropertyAction(formData: FormData) {
  const { supabase, membership } = await requireAdminOrManager();
  const propertyId = requiredText(formData, "property_id", "L’identifiant du bien", 100);

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, name")
    .eq("id", propertyId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (propertyError || !property) {
    redirectToProperties("error", "Ce bien est introuvable dans votre organisation.");
  }

  const [{ count: unitCount, error: unitsError }, { count: maintenanceCount, error: maintenanceError }] =
    await Promise.all([
      supabase
        .from("units")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", membership.organization_id)
        .eq("property_id", propertyId),
      supabase
        .from("maintenance_requests")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", membership.organization_id)
        .eq("property_id", propertyId),
    ]);

  if (unitsError || maintenanceError) {
    redirectToProperties("error", "Impossible de vérifier les dépendances de ce bien.");
  }

  if ((unitCount ?? 0) > 0) {
    redirectToProperties(
      "error",
      "Impossible de supprimer ce bien tant qu’il possède des unités. Supprimez ou réaffectez d’abord ses unités."
    );
  }

  if ((maintenanceCount ?? 0) > 0) {
    redirectToProperties(
      "error",
      "Impossible de supprimer ce bien car il possède un historique de maintenance. Désactivez-le plutôt."
    );
  }

  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", propertyId)
    .eq("organization_id", membership.organization_id);

  if (error) {
    console.error("Erreur suppression bien :", error);
    redirectToProperties("error", "Impossible de supprimer le bien.");
  }

  revalidatePath("/properties");
  revalidatePath("/units");
  revalidatePath("/dashboard");
  redirectToProperties("success", `${property.name} a été supprimé définitivement.`);
}
