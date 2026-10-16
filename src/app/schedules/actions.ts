"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminOrManager } from "@/lib/auth/access";

function redirectToSchedules(
  status: "success" | "error",
  message: string
): never {
  const params = new URLSearchParams({ status, message });
  redirect(`/schedules?${params.toString()}`);
}

function requiredText(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    redirectToSchedules("error", `${label} est obligatoire.`);
  }

  return value;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1));
}

function endOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0));
}

function clampedDate(year: number, month: number, requestedDay: number) {
  const maxDay = endOfMonth(year, month).getUTCDate();

  return new Date(
    Date.UTC(year, month, Math.min(requestedDay, maxDay))
  );
}

async function recalculateSchedule(
  supabase: Awaited<
    ReturnType<typeof requireAdminOrManager>
  >["supabase"],
  organizationId: string,
  scheduleId: string
) {
  const { data: schedule, error: scheduleError } = await supabase
    .from("rent_schedules")
    .select("id, amount_due, due_date, status")
    .eq("id", scheduleId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (
    scheduleError ||
    !schedule ||
    schedule.status === "CANCELLED"
  ) {
    return;
  }

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("id, amount, status")
    .eq("organization_id", organizationId)
    .eq("rent_schedule_id", scheduleId);

  if (paymentsError) {
    console.error(
      "Erreur lecture paiements pour recalcul échéance :",
      paymentsError
    );
    return;
  }

  const completedPayments = (payments ?? []).filter(
    (payment) => payment.status === "COMPLETED"
  );

  const paymentIds = completedPayments.map(
    (payment) => payment.id
  );

  const { data: refunds } =
    paymentIds.length > 0
      ? await supabase
          .from("payment_refunds")
          .select("payment_id, amount")
          .in("payment_id", paymentIds)
      : { data: [] };

  const grossPaid = completedPayments.reduce(
    (sum, payment) => sum + Number(payment.amount ?? 0),
    0
  );

  const refunded = (refunds ?? []).reduce(
    (sum, refund) => sum + Number(refund.amount ?? 0),
    0
  );

  const netPaid = Math.max(0, grossPaid - refunded);
  const amountDue = Number(schedule.amount_due ?? 0);
  const today = new Date().toISOString().slice(0, 10);

  let nextStatus = "PENDING";

  if (amountDue > 0 && netPaid >= amountDue) {
    nextStatus = "PAID";
  } else if (schedule.due_date < today) {
    nextStatus = "OVERDUE";
  } else if (netPaid > 0) {
    nextStatus = "PARTIALLY_PAID";
  }

  if (nextStatus !== schedule.status) {
    const { error } = await supabase
      .from("rent_schedules")
      .update({ status: nextStatus })
      .eq("id", scheduleId)
      .eq("organization_id", organizationId);

    if (error) {
      console.error(
        "Erreur mise à jour statut échéance :",
        error
      );
    }
  }
}

export async function generateLeaseSchedulesAction(
  formData: FormData
) {
  const { supabase, membership } = await requireAdminOrManager();

  const leaseId = requiredText(
    formData,
    "lease_id",
    "Le bail"
  );

  const { data: lease, error: leaseError } = await supabase
    .from("leases")
    .select(
      "id, status, start_date, end_date, effective_end_date, monthly_rent, currency, payment_due_day"
    )
    .eq("id", leaseId)
    .eq(
      "organization_id",
      membership.organization_id
    )
    .maybeSingle();

  if (leaseError || !lease) {
    redirectToSchedules(
      "error",
      "Ce bail est introuvable dans votre organisation."
    );
  }

  if (lease.status !== "ACTIVE") {
    redirectToSchedules(
      "error",
      "Les échéances ne peuvent être générées que pour un bail actif."
    );
  }

  const finalEndDate =
    lease.effective_end_date ?? lease.end_date;

  if (!finalEndDate) {
    redirectToSchedules(
      "error",
      "Ajoutez une date de fin au bail avant de générer les échéances."
    );
  }

  const start = new Date(`${lease.start_date}T00:00:00Z`);
  const end = new Date(`${finalEndDate}T00:00:00Z`);

  if (end < start) {
    redirectToSchedules(
      "error",
      "La période du bail n’est pas valide."
    );
  }

  const { data: existingSchedules, error: existingError } =
    await supabase
      .from("rent_schedules")
      .select("period_start")
      .eq(
        "organization_id",
        membership.organization_id
      )
      .eq("lease_id", leaseId);

  if (existingError) {
    console.error(
      "Erreur lecture échéances existantes :",
      existingError
    );

    redirectToSchedules(
      "error",
      "Impossible de vérifier les échéances existantes."
    );
  }

  const existingStarts = new Set(
    (existingSchedules ?? []).map(
      (schedule) => schedule.period_start
    )
  );

  const rows: Array<{
    organization_id: string;
    lease_id: string;
    period_start: string;
    period_end: string;
    due_date: string;
    amount_due: number;
    currency: string;
    status: string;
  }> = [];

  let cursor = startOfMonth(
    start.getUTCFullYear(),
    start.getUTCMonth()
  );

  const today = new Date().toISOString().slice(0, 10);

  while (cursor <= end) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();

    const rawStart = startOfMonth(year, month);
    const rawEnd = endOfMonth(year, month);

    const periodStart =
      rawStart < start ? start : rawStart;
    const periodEnd =
      rawEnd > end ? end : rawEnd;

    const periodStartValue = isoDate(periodStart);

    if (!existingStarts.has(periodStartValue)) {
      let dueDate = clampedDate(
        year,
        month,
        Number(lease.payment_due_day ?? 1)
      );

      if (dueDate < periodStart) {
        dueDate = periodStart;
      }

      if (dueDate > periodEnd) {
        dueDate = periodEnd;
      }

      const dueDateValue = isoDate(dueDate);

      rows.push({
        organization_id:
          membership.organization_id,
        lease_id: leaseId,
        period_start: periodStartValue,
        period_end: isoDate(periodEnd),
        due_date: dueDateValue,
        amount_due: Number(lease.monthly_rent ?? 0),
        currency: lease.currency ?? "XOF",
        status:
          dueDateValue < today
            ? "OVERDUE"
            : "PENDING",
      });
    }

    cursor = startOfMonth(year, month + 1);
  }

  if (rows.length === 0) {
    redirectToSchedules(
      "success",
      "Toutes les échéances de ce bail existent déjà."
    );
  }

  const { error: insertError } = await supabase
    .from("rent_schedules")
    .insert(rows);

  if (insertError) {
    console.error(
      "Erreur génération échéances :",
      insertError
    );

    redirectToSchedules(
      "error",
      "Impossible de générer les échéances."
    );
  }

  revalidatePath("/schedules");
  revalidatePath("/payments");
  revalidatePath("/dashboard");

  redirectToSchedules(
    "success",
    `${rows.length} échéance${
      rows.length > 1 ? "s" : ""
    } générée${rows.length > 1 ? "s" : ""}.`
  );
}

export async function refreshScheduleStatusesAction() {
  const { supabase, membership } =
    await requireAdminOrManager();

  const { data: schedules, error } = await supabase
    .from("rent_schedules")
    .select("id")
    .eq(
      "organization_id",
      membership.organization_id
    )
    .neq("status", "CANCELLED");

  if (error) {
    console.error(
      "Erreur lecture échéances :",
      error
    );

    redirectToSchedules(
      "error",
      "Impossible de recalculer les statuts."
    );
  }

  for (const schedule of schedules ?? []) {
    await recalculateSchedule(
      supabase,
      membership.organization_id,
      schedule.id
    );
  }

  revalidatePath("/schedules");
  revalidatePath("/payments");
  revalidatePath("/dashboard");

  redirectToSchedules(
    "success",
    "Les statuts des échéances ont été recalculés."
  );
}
