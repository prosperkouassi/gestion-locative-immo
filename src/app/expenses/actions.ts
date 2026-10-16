"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminOrManager } from "@/lib/auth/access";

const EXPENSE_CATEGORIES = [
  "MAINTENANCE",
  "REPAIR",
  "UTILITY",
  "TAX",
  "INSURANCE",
  "MANAGEMENT",
  "SERVICE",
  "OTHER",
] as const;

const EXPENSE_STATUSES = [
  "DRAFT",
  "PENDING",
  "PAID",
  "CANCELLED",
] as const;

function redirectToExpenses(
  status: "success" | "error",
  message: string
): never {
  const params = new URLSearchParams({ status, message });
  redirect(`/expenses?${params.toString()}`);
}

function requiredText(
  formData: FormData,
  key: string,
  label: string,
  maxLength = 500
) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    redirectToExpenses("error", `${label} est obligatoire.`);
  }

  if (value.length > maxLength) {
    redirectToExpenses("error", `${label} est trop long.`);
  }

  return value;
}

function optionalText(
  formData: FormData,
  key: string,
  maxLength: number
) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    return null;
  }

  if (value.length > maxLength) {
    redirectToExpenses("error", `Le champ ${key} est trop long.`);
  }

  return value;
}

function positiveAmount(
  formData: FormData,
  key: string,
  label: string
) {
  const raw = String(formData.get(key) ?? "").trim();
  const value = Number(raw);

  if (!raw || !Number.isFinite(value) || value <= 0) {
    redirectToExpenses(
      "error",
      `${label} doit être supérieur à zéro.`
    );
  }

  return value;
}

async function resolvePropertyAndUnit(
  supabase: Awaited<
    ReturnType<typeof requireAdminOrManager>
  >["supabase"],
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
      redirectToExpenses(
        "error",
        "Le bien sélectionné est introuvable dans votre organisation."
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
      redirectToExpenses(
        "error",
        "L’unité sélectionnée est introuvable dans votre organisation."
      );
    }

    if (propertyId && unit.property_id !== propertyId) {
      redirectToExpenses(
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

function parseExpensePayload(formData: FormData) {
  const title = requiredText(formData, "title", "Le titre", 160);
  const category = requiredText(
    formData,
    "category",
    "La catégorie",
    40
  );
  const status = requiredText(
    formData,
    "status",
    "Le statut",
    40
  );
  const amount = positiveAmount(formData, "amount", "Le montant");
  const expenseDate = requiredText(
    formData,
    "expense_date",
    "La date de dépense",
    20
  );

  const propertyId =
    String(formData.get("property_id") ?? "").trim() || null;

  const unitId =
    String(formData.get("unit_id") ?? "").trim() || null;

  const description = optionalText(formData, "description", 1500);
  const providerName = optionalText(formData, "provider_name", 160);
  const reference = optionalText(formData, "reference", 160);
  const notes = optionalText(formData, "notes", 1500);

  if (
    !EXPENSE_CATEGORIES.includes(
      category as (typeof EXPENSE_CATEGORIES)[number]
    )
  ) {
    redirectToExpenses("error", "La catégorie est invalide.");
  }

  if (
    !EXPENSE_STATUSES.includes(
      status as (typeof EXPENSE_STATUSES)[number]
    )
  ) {
    redirectToExpenses("error", "Le statut est invalide.");
  }

  return {
    title,
    category,
    status,
    amount,
    expenseDate,
    propertyId,
    unitId,
    description,
    providerName,
    reference,
    notes,
  };
}

export async function createExpenseAction(formData: FormData) {
  const { supabase, membership } = await requireAdminOrManager();

  const payload = parseExpensePayload(formData);

  const resolved = await resolvePropertyAndUnit(
    supabase,
    membership.organization_id,
    payload.propertyId,
    payload.unitId
  );

  const nowIso = new Date().toISOString();

  const { error } = await supabase.from("expenses").insert({
    organization_id: membership.organization_id,
    property_id: resolved.propertyId,
    unit_id: resolved.unitId,
    category: payload.category,
    status: payload.status,
    title: payload.title,
    description: payload.description,
    amount: payload.amount,
    currency: "XOF",
    expense_date: payload.expenseDate,
    paid_at: payload.status === "PAID" ? nowIso : null,
    provider_name: payload.providerName,
    reference: payload.reference,
    notes: payload.notes,
    updated_at: nowIso,
  });

  if (error) {
    console.error("Erreur création dépense :", error);

    redirectToExpenses(
      "error",
      "Impossible d’enregistrer la dépense."
    );
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  redirectToExpenses("success", "La dépense a été créée.");
}

export async function updateExpenseAction(formData: FormData) {
  const { supabase, membership } = await requireAdminOrManager();

  const expenseId = requiredText(
    formData,
    "expense_id",
    "La dépense",
    80
  );

  const payload = parseExpensePayload(formData);

  const { data: existing, error: existingError } = await supabase
    .from("expenses")
    .select("id, status, paid_at")
    .eq("id", expenseId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (existingError || !existing) {
    redirectToExpenses(
      "error",
      "Cette dépense est introuvable dans votre organisation."
    );
  }

  const resolved = await resolvePropertyAndUnit(
    supabase,
    membership.organization_id,
    payload.propertyId,
    payload.unitId
  );

  const nowIso = new Date().toISOString();

  let paidAt = existing.paid_at;

  if (payload.status === "PAID" && !paidAt) {
    paidAt = nowIso;
  }

  if (payload.status !== "PAID") {
    paidAt = null;
  }

  const { error } = await supabase
    .from("expenses")
    .update({
      property_id: resolved.propertyId,
      unit_id: resolved.unitId,
      category: payload.category,
      status: payload.status,
      title: payload.title,
      description: payload.description,
      amount: payload.amount,
      currency: "XOF",
      expense_date: payload.expenseDate,
      paid_at: paidAt,
      provider_name: payload.providerName,
      reference: payload.reference,
      notes: payload.notes,
      updated_at: nowIso,
    })
    .eq("id", expenseId)
    .eq("organization_id", membership.organization_id);

  if (error) {
    console.error("Erreur modification dépense :", error);

    redirectToExpenses(
      "error",
      "Impossible de modifier la dépense."
    );
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  redirectToExpenses("success", "La dépense a été mise à jour.");
}

export async function deleteExpenseAction(formData: FormData) {
  const { supabase, membership } = await requireAdminOrManager();

  const expenseId = requiredText(
    formData,
    "expense_id",
    "La dépense",
    80
  );

  const { data: existing, error: existingError } = await supabase
    .from("expenses")
    .select("id, status")
    .eq("id", expenseId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (existingError || !existing) {
    redirectToExpenses(
      "error",
      "Cette dépense est introuvable dans votre organisation."
    );
  }

  if (existing.status === "PAID") {
    redirectToExpenses(
      "error",
      "Une dépense payée ne peut pas être supprimée. Passez-la en brouillon, en attente ou annulée avant suppression."
    );
  }

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("organization_id", membership.organization_id);

  if (error) {
    console.error("Erreur suppression dépense :", error);

    redirectToExpenses(
      "error",
      "Impossible de supprimer la dépense."
    );
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  redirectToExpenses("success", "La dépense a été supprimée.");
}
