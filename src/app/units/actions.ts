"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminOrManager } from "@/lib/auth/access";

function go(status: "success" | "error", message: string): never {
  const params = new URLSearchParams({ status, message });
  redirect(`/units?${params.toString()}`);
}

function requiredText(formData: FormData, key: string, label: string, max = 180) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${label} est obligatoire.`);
  if (value.length > max) throw new Error(`${label} est trop long.`);
  return value;
}

function optionalText(formData: FormData, key: string, max = 120) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) return null;
  if (value.length > max) throw new Error(`Le champ ${key} est trop long.`);
  return value;
}

function optionalInteger(formData: FormData, key: string, label: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} doit être un entier positif.`);
  return value;
}

function optionalNumber(formData: FormData, key: string, label: string) {
  const raw = String(formData.get(key) ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} doit être un nombre positif.`);
  return value;
}

async function assertProperty(
  supabase: Awaited<ReturnType<typeof requireAdminOrManager>>["supabase"],
  organizationId: string,
  propertyId: string
) {
  const { data, error } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error || !data) throw new Error("Le bien sélectionné est invalide pour votre organisation.");
}

export async function createUnitAction(formData: FormData) {
  const { supabase, membership } = await requireAdminOrManager();
  try {
    const propertyId = requiredText(formData, "property_id", "Le bien", 100);
    const name = requiredText(formData, "name", "Le nom de l’unité");
    const unitType = optionalText(formData, "unit_type", 100);
    const floor = optionalInteger(formData, "floor", "L’étage");
    const bedrooms = optionalInteger(formData, "bedrooms", "Le nombre de chambres");
    const bathrooms = optionalInteger(formData, "bathrooms", "Le nombre de salles d’eau");
    const surfaceArea = optionalNumber(formData, "surface_area", "La superficie");
    const monthlyRent = optionalNumber(formData, "monthly_rent", "Le loyer mensuel") ?? 0;
    const currency = optionalText(formData, "currency", 10) ?? "XOF";

    await assertProperty(supabase, membership.organization_id, propertyId);

    const { error } = await supabase.from("units").insert({
      organization_id: membership.organization_id,
      property_id: propertyId,
      name,
      unit_type: unitType,
      floor,
      bedrooms,
      bathrooms,
      surface_area: surfaceArea,
      monthly_rent: monthlyRent,
      currency,
      is_active: true,
    });

    if (error) {
      console.error("Erreur création unité :", error);
      throw new Error("Impossible de créer l’unité.");
    }

    revalidatePath("/units");
    revalidatePath("/properties");
    revalidatePath("/dashboard");
    go("success", "L’unité a été créée.");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) throw error;
    go("error", error instanceof Error ? error.message : "Impossible de créer l’unité.");
  }
}

export async function updateUnitAction(formData: FormData) {
  const { supabase, membership } = await requireAdminOrManager();
  try {
    const unitId = requiredText(formData, "unit_id", "L’identifiant de l’unité", 100);
    const propertyId = requiredText(formData, "property_id", "Le bien", 100);
    const name = requiredText(formData, "name", "Le nom de l’unité");
    const unitType = optionalText(formData, "unit_type", 100);
    const floor = optionalInteger(formData, "floor", "L’étage");
    const bedrooms = optionalInteger(formData, "bedrooms", "Le nombre de chambres");
    const bathrooms = optionalInteger(formData, "bathrooms", "Le nombre de salles d’eau");
    const surfaceArea = optionalNumber(formData, "surface_area", "La superficie");
    const monthlyRent = optionalNumber(formData, "monthly_rent", "Le loyer mensuel") ?? 0;
    const currency = optionalText(formData, "currency", 10) ?? "XOF";

    const { data: unit, error: unitError } = await supabase
      .from("units")
      .select("id")
      .eq("id", unitId)
      .eq("organization_id", membership.organization_id)
      .maybeSingle();
    if (unitError || !unit) throw new Error("Cette unité est introuvable dans votre organisation.");

    await assertProperty(supabase, membership.organization_id, propertyId);

    const { error } = await supabase
      .from("units")
      .update({ property_id: propertyId, name, unit_type: unitType, floor, bedrooms, bathrooms, surface_area: surfaceArea, monthly_rent: monthlyRent, currency })
      .eq("id", unitId)
      .eq("organization_id", membership.organization_id);

    if (error) {
      console.error("Erreur modification unité :", error);
      throw new Error("Impossible de modifier l’unité.");
    }

    revalidatePath("/units");
    revalidatePath("/properties");
    revalidatePath("/dashboard");
    go("success", "L’unité a été mise à jour.");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) throw error;
    go("error", error instanceof Error ? error.message : "Impossible de modifier l’unité.");
  }
}

export async function toggleUnitActiveAction(formData: FormData) {
  const { supabase, membership } = await requireAdminOrManager();
  const unitId = requiredText(formData, "unit_id", "L’identifiant de l’unité", 100);
  const next = String(formData.get("next_is_active") ?? "");
  if (next !== "true" && next !== "false") go("error", "Le statut demandé est invalide.");

  const { error } = await supabase
    .from("units")
    .update({ is_active: next === "true" })
    .eq("id", unitId)
    .eq("organization_id", membership.organization_id);

  if (error) go("error", "Impossible de modifier le statut de l’unité.");

  revalidatePath("/units");
  revalidatePath("/properties");
  revalidatePath("/dashboard");
  go("success", next === "true" ? "L’unité a été réactivée." : "L’unité a été désactivée.");
}

export async function deleteUnitAction(formData: FormData) {
  const { supabase, membership } = await requireAdminOrManager();
  const unitId = requiredText(formData, "unit_id", "L’identifiant de l’unité", 100);

  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("id, name")
    .eq("id", unitId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();
  if (unitError || !unit) go("error", "Cette unité est introuvable dans votre organisation.");

  const [{ count: leaseCount, error: leasesError }, { count: maintenanceCount, error: maintenanceError }] = await Promise.all([
    supabase.from("leases").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).eq("unit_id", unitId),
    supabase.from("maintenance_requests").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).eq("unit_id", unitId),
  ]);

  if (leasesError || maintenanceError) go("error", "Impossible de vérifier les dépendances de cette unité.");
  if ((leaseCount ?? 0) > 0) go("error", "Impossible de supprimer cette unité car elle possède un historique de bail. Désactivez-la plutôt.");
  if ((maintenanceCount ?? 0) > 0) go("error", "Impossible de supprimer cette unité car elle possède un historique de maintenance. Désactivez-la plutôt.");

  const { error } = await supabase
    .from("units")
    .delete()
    .eq("id", unitId)
    .eq("organization_id", membership.organization_id);
  if (error) go("error", "Impossible de supprimer l’unité.");

  revalidatePath("/units");
  revalidatePath("/properties");
  revalidatePath("/dashboard");
  go("success", `${unit.name} a été supprimée définitivement.`);
}
