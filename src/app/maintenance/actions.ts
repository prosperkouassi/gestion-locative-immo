"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  requireActiveMembership,
  requireAdminOrManager,
} from "@/lib/auth/access";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "PLANNED",
  "COMPLETED",
  "CANCELLED",
] as const;

function redirectToMaintenance(
  status: "success" | "error",
  message: string
): never {
  const params = new URLSearchParams({ status, message });
  redirect(`/maintenance?${params.toString()}`);
}

function requiredText(
  formData: FormData,
  key: string,
  label: string,
  maxLength = 500
) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    redirectToMaintenance("error", `${label} est obligatoire.`);
  }

  if (value.length > maxLength) {
    redirectToMaintenance("error", `${label} est trop long.`);
  }

  return value;
}

function optionalText(
  formData: FormData,
  key: string,
  maxLength: number
) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) return null;

  if (value.length > maxLength) {
    redirectToMaintenance("error", `Le champ ${key} est trop long.`);
  }

  return value;
}

function optionalAmount(
  formData: FormData,
  key: string,
  label: string
) {
  const raw = String(formData.get(key) ?? "").trim();

  if (!raw) return null;

  const value = Number(raw);

  if (!Number.isFinite(value) || value < 0) {
    redirectToMaintenance(
      "error",
      `${label} doit être un montant positif ou nul.`
    );
  }

  return value;
}

type SessionSupabase = Awaited<
  ReturnType<typeof requireActiveMembership>
>["supabase"];

async function validatePropertyAndUnit(
  supabase: SessionSupabase,
  organizationId: string,
  propertyId: string | null,
  unitId: string | null
) {
  let resolvedPropertyId = propertyId;

  if (propertyId) {
    const { data: property, error } = await supabase
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error || !property) {
      redirectToMaintenance(
        "error",
        "Le bien sélectionné n’est pas accessible."
      );
    }
  }

  if (unitId) {
    const { data: unit, error } = await supabase
      .from("units")
      .select("id, property_id")
      .eq("id", unitId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error || !unit) {
      redirectToMaintenance(
        "error",
        "L’unité sélectionnée n’est pas accessible."
      );
    }

    if (propertyId && unit.property_id !== propertyId) {
      redirectToMaintenance(
        "error",
        "L’unité sélectionnée n’appartient pas au bien choisi."
      );
    }

    resolvedPropertyId = unit.property_id;
  }

  return {
    propertyId: resolvedPropertyId,
    unitId,
  };
}

export async function createMaintenanceRequestAction(
  formData: FormData
) {
  const { supabase, membership } = await requireActiveMembership();

  if (
    !["ADMIN_AGENCY", "MANAGER", "TENANT"].includes(membership.role)
  ) {
    redirectToMaintenance(
      "error",
      "Votre rôle ne permet pas de créer une demande de maintenance."
    );
  }

  const title = requiredText(formData, "title", "Le titre", 180);
  const description = optionalText(formData, "description", 2000);

  const priorityRaw = requiredText(
    formData,
    "priority",
    "La priorité",
    30
  );

  if (
    !PRIORITIES.includes(priorityRaw as (typeof PRIORITIES)[number])
  ) {
    redirectToMaintenance("error", "La priorité est invalide.");
  }

  const propertyId =
    String(formData.get("property_id") ?? "").trim() || null;

  const unitId =
    String(formData.get("unit_id") ?? "").trim() || null;

  const resolved = await validatePropertyAndUnit(
    supabase,
    membership.organization_id,
    propertyId,
    unitId
  );

  if (membership.role === "TENANT" && !resolved.unitId) {
    redirectToMaintenance(
      "error",
      "Un locataire doit rattacher sa demande à son logement."
    );
  }

  const canManage = ["ADMIN_AGENCY", "MANAGER"].includes(
    membership.role
  );

  const requestedStatus = canManage
    ? String(formData.get("status") ?? "OPEN").trim()
    : "OPEN";

  if (
    !STATUSES.includes(requestedStatus as (typeof STATUSES)[number])
  ) {
    redirectToMaintenance("error", "Le statut est invalide.");
  }

  const scheduledFor = canManage
    ? optionalText(formData, "scheduled_for", 20)
    : null;

  const estimatedCost = canManage
    ? optionalAmount(formData, "estimated_cost", "Le coût estimé")
    : null;

  const actualCost = canManage
    ? optionalAmount(formData, "actual_cost", "Le coût réel")
    : null;

  const providerName = canManage
    ? optionalText(formData, "provider_name", 180)
    : null;

  const providerPhone = canManage
    ? optionalText(formData, "provider_phone", 80)
    : null;

  const notes = canManage
    ? optionalText(formData, "notes", 2000)
    : null;

  const nowIso = new Date().toISOString();

  const { error } = await supabase.from("maintenance_requests").insert({
    organization_id: membership.organization_id,
    property_id: resolved.propertyId,
    unit_id: resolved.unitId,
    title,
    description,
    priority: priorityRaw,
    status: requestedStatus,
    scheduled_for: scheduledFor,
    completed_at:
      requestedStatus === "COMPLETED" ? nowIso : null,
    estimated_cost: estimatedCost,
    actual_cost: actualCost,
    currency: "XOF",
    provider_name: providerName,
    provider_phone: providerPhone,
    notes,
    updated_at: nowIso,
  });

  if (error) {
    console.error("Erreur création maintenance :", error);

    redirectToMaintenance(
      "error",
      "Impossible d’enregistrer la demande de maintenance."
    );
  }

  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  redirectToMaintenance(
    "success",
    membership.role === "TENANT"
      ? "Votre demande de maintenance a été transmise."
      : "L’intervention a été créée."
  );
}

export async function updateMaintenanceRequestAction(
  formData: FormData
) {
  const { supabase, membership } = await requireAdminOrManager();

  const requestId = requiredText(
    formData,
    "request_id",
    "L’intervention",
    80
  );

  const title = requiredText(formData, "title", "Le titre", 180);
  const description = optionalText(formData, "description", 2000);

  const priority = requiredText(
    formData,
    "priority",
    "La priorité",
    30
  );

  const status = requiredText(formData, "status", "Le statut", 30);

  if (!PRIORITIES.includes(priority as (typeof PRIORITIES)[number])) {
    redirectToMaintenance("error", "La priorité est invalide.");
  }

  if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
    redirectToMaintenance("error", "Le statut est invalide.");
  }

  const propertyId =
    String(formData.get("property_id") ?? "").trim() || null;

  const unitId =
    String(formData.get("unit_id") ?? "").trim() || null;

  const scheduledFor = optionalText(formData, "scheduled_for", 20);
  const estimatedCost = optionalAmount(
    formData,
    "estimated_cost",
    "Le coût estimé"
  );
  const actualCost = optionalAmount(
    formData,
    "actual_cost",
    "Le coût réel"
  );
  const providerName = optionalText(formData, "provider_name", 180);
  const providerPhone = optionalText(formData, "provider_phone", 80);
  const notes = optionalText(formData, "notes", 2000);

  const { data: existing, error: existingError } = await supabase
    .from("maintenance_requests")
    .select("id, completed_at")
    .eq("id", requestId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (existingError || !existing) {
    redirectToMaintenance(
      "error",
      "Cette intervention est introuvable dans votre organisation."
    );
  }

  const resolved = await validatePropertyAndUnit(
    supabase,
    membership.organization_id,
    propertyId,
    unitId
  );

  const nowIso = new Date().toISOString();

  let completedAt = existing.completed_at;

  if (status === "COMPLETED" && !completedAt) {
    completedAt = nowIso;
  }

  if (status !== "COMPLETED") {
    completedAt = null;
  }

  const { error } = await supabase
    .from("maintenance_requests")
    .update({
      property_id: resolved.propertyId,
      unit_id: resolved.unitId,
      title,
      description,
      priority,
      status,
      scheduled_for: scheduledFor,
      completed_at: completedAt,
      estimated_cost: estimatedCost,
      actual_cost: actualCost,
      currency: "XOF",
      provider_name: providerName,
      provider_phone: providerPhone,
      notes,
      updated_at: nowIso,
    })
    .eq("id", requestId)
    .eq("organization_id", membership.organization_id);

  if (error) {
    console.error("Erreur modification maintenance :", error);

    redirectToMaintenance(
      "error",
      "Impossible de modifier l’intervention."
    );
  }

  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  redirectToMaintenance(
    "success",
    "L’intervention a été mise à jour."
  );
}

export async function deleteMaintenanceRequestAction(
  formData: FormData
) {
  const { supabase, membership } = await requireAdminOrManager();

  const requestId = requiredText(
    formData,
    "request_id",
    "L’intervention",
    80
  );

  const { data: existing, error: existingError } = await supabase
    .from("maintenance_requests")
    .select("id, status")
    .eq("id", requestId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (existingError || !existing) {
    redirectToMaintenance(
      "error",
      "Cette intervention est introuvable dans votre organisation."
    );
  }

  if (existing.status === "COMPLETED") {
    redirectToMaintenance(
      "error",
      "Une intervention terminée ne peut pas être supprimée. Annulez-la ou repassez-la dans un statut actif avant suppression."
    );
  }

  const { error } = await supabase
    .from("maintenance_requests")
    .delete()
    .eq("id", requestId)
    .eq("organization_id", membership.organization_id);

  if (error) {
    console.error("Erreur suppression maintenance :", error);

    redirectToMaintenance(
      "error",
      "Impossible de supprimer l’intervention."
    );
  }

  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  redirectToMaintenance(
    "success",
    "L’intervention a été supprimée."
  );
}
