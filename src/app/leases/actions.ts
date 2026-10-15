"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminOrManager } from "@/lib/auth/access";

const LEASE_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "ENDED",
  "TERMINATED",
  "CANCELLED",
] as const;

function redirectToLeases(
  status: "success" | "error",
  message: string
): never {
  const params = new URLSearchParams({ status, message });
  redirect(`/leases?${params.toString()}`);
}

function requiredText(
  formData: FormData,
  key: string,
  label: string
) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${label} est obligatoire.`);
  return value;
}

function optionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function numberValue(
  formData: FormData,
  key: string,
  label: string,
  options?: { min?: number; max?: number; required?: boolean }
) {
  const raw = String(formData.get(key) ?? "").trim();

  if (!raw) {
    if (options?.required) {
      throw new Error(`${label} est obligatoire.`);
    }
    return null;
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    throw new Error(`${label} n’est pas valide.`);
  }

  if (options?.min !== undefined && value < options.min) {
    throw new Error(`${label} est inférieur à la valeur autorisée.`);
  }

  if (options?.max !== undefined && value > options.max) {
    throw new Error(`${label} dépasse la valeur autorisée.`);
  }

  return value;
}

function normalizeStatus(formData: FormData) {
  const status = requiredText(
    formData,
    "status",
    "Le statut"
  );

  if (
    !LEASE_STATUSES.includes(
      status as (typeof LEASE_STATUSES)[number]
    )
  ) {
    throw new Error("Le statut du bail n’est pas valide.");
  }

  return status;
}

function overlaps(
  startA: string,
  endA: string | null,
  startB: string,
  endB: string | null
) {
  const maxDate = "9999-12-31";
  return (
    startA <= (endB ?? maxDate) &&
    startB <= (endA ?? maxDate)
  );
}

async function validateRelationsAndOverlap(args: {
  supabase: Awaited<ReturnType<typeof requireAdminOrManager>>["supabase"];
  organizationId: string;
  tenantId: string;
  unitId: string;
  startDate: string;
  endDate: string | null;
  status: string;
  excludeLeaseId?: string;
}) {
  const {
    supabase,
    organizationId,
    tenantId,
    unitId,
    startDate,
    endDate,
    status,
    excludeLeaseId,
  } = args;

  const [tenantResult, unitResult] = await Promise.all([
    supabase
      .from("tenants")
      .select("id, is_active")
      .eq("id", tenantId)
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabase
      .from("units")
      .select("id, is_active")
      .eq("id", unitId)
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);

  if (tenantResult.error || !tenantResult.data) {
    throw new Error(
      "Le locataire sélectionné n’appartient pas à votre organisation."
    );
  }

  if (unitResult.error || !unitResult.data) {
    throw new Error(
      "L’unité sélectionnée n’appartient pas à votre organisation."
    );
  }

  if (!tenantResult.data.is_active) {
    throw new Error(
      "Le locataire sélectionné est inactif."
    );
  }

  if (!unitResult.data.is_active) {
    throw new Error(
      "L’unité sélectionnée est inactive."
    );
  }

  if (endDate && endDate < startDate) {
    throw new Error(
      "La date de fin doit être postérieure ou égale à la date de début."
    );
  }

  if (["CANCELLED", "TERMINATED", "ENDED"].includes(status)) {
    return;
  }

  const { data: existingLeases, error } = await supabase
    .from("leases")
    .select(
      "id, status, start_date, end_date, effective_end_date"
    )
    .eq("organization_id", organizationId)
    .eq("unit_id", unitId)
    .in("status", ["DRAFT", "ACTIVE"]);

  if (error) {
    throw new Error(
      "Impossible de vérifier la disponibilité de l’unité."
    );
  }

  const conflictingLease = (existingLeases ?? []).find(
    (lease) => {
      if (excludeLeaseId && lease.id === excludeLeaseId) {
        return false;
      }

      const effectiveEnd =
        lease.effective_end_date ?? lease.end_date;

      return overlaps(
        startDate,
        endDate,
        lease.start_date,
        effectiveEnd
      );
    }
  );

  if (conflictingLease) {
    throw new Error(
      "Cette unité possède déjà un bail brouillon ou actif sur une période qui se chevauche."
    );
  }
}

export async function createLeaseAction(formData: FormData) {
  const { supabase, membership } = await requireAdminOrManager();

  try {
    const tenantId = requiredText(
      formData,
      "tenant_id",
      "Le locataire"
    );
    const unitId = requiredText(
      formData,
      "unit_id",
      "L’unité"
    );
    const startDate = requiredText(
      formData,
      "start_date",
      "La date de début"
    );
    const endDate = optionalText(formData, "end_date");
    const monthlyRent = numberValue(
      formData,
      "monthly_rent",
      "Le loyer mensuel",
      { min: 0, required: true }
    );
    const securityDeposit = numberValue(
      formData,
      "security_deposit",
      "Le dépôt de garantie",
      { min: 0 }
    );
    const paymentDueDay = numberValue(
      formData,
      "payment_due_day",
      "Le jour d’échéance",
      { min: 1, max: 31, required: true }
    );
    const status = normalizeStatus(formData);

    await validateRelationsAndOverlap({
      supabase,
      organizationId: membership.organization_id,
      tenantId,
      unitId,
      startDate,
      endDate,
      status,
    });

    const { error } = await supabase.from("leases").insert({
      organization_id: membership.organization_id,
      tenant_id: tenantId,
      unit_id: unitId,
      status,
      start_date: startDate,
      end_date: endDate,
      effective_end_date: null,
      monthly_rent: monthlyRent,
      currency: "XOF",
      security_deposit: securityDeposit ?? 0,
      payment_due_day: paymentDueDay,
    });

    if (error) {
      console.error("Erreur création bail :", error);
      redirectToLeases(
        "error",
        "Impossible de créer le bail."
      );
    }

    revalidatePath("/leases");
    revalidatePath("/tenants");
    revalidatePath("/units");
    revalidatePath("/dashboard");

    redirectToLeases(
      "success",
      "Le bail a été créé."
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    redirectToLeases(
      "error",
      error instanceof Error
        ? error.message
        : "Impossible de créer le bail."
    );
  }
}

export async function updateLeaseAction(formData: FormData) {
  const { supabase, membership } = await requireAdminOrManager();

  try {
    const leaseId = requiredText(
      formData,
      "lease_id",
      "L’identifiant du bail"
    );
    const tenantId = requiredText(
      formData,
      "tenant_id",
      "Le locataire"
    );
    const unitId = requiredText(
      formData,
      "unit_id",
      "L’unité"
    );
    const startDate = requiredText(
      formData,
      "start_date",
      "La date de début"
    );
    const endDate = optionalText(formData, "end_date");
    const effectiveEndDate = optionalText(
      formData,
      "effective_end_date"
    );
    const monthlyRent = numberValue(
      formData,
      "monthly_rent",
      "Le loyer mensuel",
      { min: 0, required: true }
    );
    const securityDeposit = numberValue(
      formData,
      "security_deposit",
      "Le dépôt de garantie",
      { min: 0 }
    );
    const paymentDueDay = numberValue(
      formData,
      "payment_due_day",
      "Le jour d’échéance",
      { min: 1, max: 31, required: true }
    );
    const status = normalizeStatus(formData);

    const { data: existingLease, error: existingError } =
      await supabase
        .from("leases")
        .select("id")
        .eq("id", leaseId)
        .eq(
          "organization_id",
          membership.organization_id
        )
        .maybeSingle();

    if (existingError || !existingLease) {
      redirectToLeases(
        "error",
        "Ce bail est introuvable dans votre organisation."
      );
    }

    await validateRelationsAndOverlap({
      supabase,
      organizationId: membership.organization_id,
      tenantId,
      unitId,
      startDate,
      endDate: effectiveEndDate ?? endDate,
      status,
      excludeLeaseId: leaseId,
    });

    const { error } = await supabase
      .from("leases")
      .update({
        tenant_id: tenantId,
        unit_id: unitId,
        status,
        start_date: startDate,
        end_date: endDate,
        effective_end_date: effectiveEndDate,
        monthly_rent: monthlyRent,
        currency: "XOF",
        security_deposit: securityDeposit ?? 0,
        payment_due_day: paymentDueDay,
      })
      .eq("id", leaseId)
      .eq(
        "organization_id",
        membership.organization_id
      );

    if (error) {
      console.error("Erreur modification bail :", error);
      redirectToLeases(
        "error",
        "Impossible de modifier le bail."
      );
    }

    revalidatePath("/leases");
    revalidatePath("/tenants");
    revalidatePath("/units");
    revalidatePath("/dashboard");

    redirectToLeases(
      "success",
      "Le bail a été mis à jour."
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    redirectToLeases(
      "error",
      error instanceof Error
        ? error.message
        : "Impossible de modifier le bail."
    );
  }
}

export async function deleteLeaseAction(formData: FormData) {
  const { supabase, membership } = await requireAdminOrManager();

  const leaseId = requiredText(
    formData,
    "lease_id",
    "L’identifiant du bail"
  );

  const { data: lease, error: leaseError } = await supabase
    .from("leases")
    .select("id, status")
    .eq("id", leaseId)
    .eq(
      "organization_id",
      membership.organization_id
    )
    .maybeSingle();

  if (leaseError || !lease) {
    redirectToLeases(
      "error",
      "Ce bail est introuvable dans votre organisation."
    );
  }

  const { count: scheduleCount, error: scheduleError } =
    await supabase
      .from("rent_schedules")
      .select("id", { count: "exact", head: true })
      .eq(
        "organization_id",
        membership.organization_id
      )
      .eq("lease_id", leaseId);

  if (scheduleError) {
    console.error(
      "Erreur vérification échéances du bail :",
      scheduleError
    );
    redirectToLeases(
      "error",
      "Impossible de vérifier l’historique financier du bail."
    );
  }

  if ((scheduleCount ?? 0) > 0) {
    redirectToLeases(
      "error",
      "Impossible de supprimer ce bail car des échéances existent déjà. Passez plutôt son statut à Annulé, Résilié ou Terminé afin de conserver l’historique."
    );
  }

  const { error: deleteError } = await supabase
    .from("leases")
    .delete()
    .eq("id", leaseId)
    .eq(
      "organization_id",
      membership.organization_id
    );

  if (deleteError) {
    console.error("Erreur suppression bail :", deleteError);
    redirectToLeases(
      "error",
      "Impossible de supprimer le bail."
    );
  }

  revalidatePath("/leases");
  revalidatePath("/tenants");
  revalidatePath("/units");
  revalidatePath("/dashboard");

  redirectToLeases(
    "success",
    "Le bail a été supprimé définitivement."
  );
}
