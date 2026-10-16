"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminOrManager } from "@/lib/auth/access";

const PAYMENT_STATUSES = ["COMPLETED", "PENDING", "CANCELLED"] as const;
const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "MOBILE_MONEY",
  "CARD",
  "CHEQUE",
  "OTHER",
] as const;

function redirectToPayments(status: "success" | "error", message: string): never {
  const params = new URLSearchParams({ status, message });
  redirect(`/payments?${params.toString()}`);
}

function requiredText(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    redirectToPayments("error", `${label} est obligatoire.`);
  }

  return value;
}

function optionalText(formData: FormData, key: string, maxLength: number) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    return null;
  }

  if (value.length > maxLength) {
    redirectToPayments("error", `Le champ ${key} est trop long.`);
  }

  return value;
}

function positiveAmount(formData: FormData, key: string, label: string) {
  const raw = String(formData.get(key) ?? "").trim();
  const amount = Number(raw);

  if (!raw || !Number.isFinite(amount) || amount <= 0) {
    redirectToPayments("error", `${label} doit être supérieur à zéro.`);
  }

  return amount;
}

type FinanceSupabase = Awaited<
  ReturnType<typeof requireAdminOrManager>
>["supabase"];

async function getScheduleFinancialState({
  supabase,
  organizationId,
  scheduleId,
  excludePaymentId,
}: {
  supabase: FinanceSupabase;
  organizationId: string;
  scheduleId: string;
  excludePaymentId?: string;
}) {
  const { data: schedule, error: scheduleError } = await supabase
    .from("rent_schedules")
    .select("id, amount_due, currency, due_date, status")
    .eq("id", scheduleId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (scheduleError || !schedule) {
    redirectToPayments("error", "L’échéance sélectionnée est introuvable.");
  }

  if (schedule.status === "CANCELLED") {
    redirectToPayments(
      "error",
      "Aucun paiement ne peut être enregistré sur une échéance annulée."
    );
  }

  let paymentsQuery = supabase
    .from("payments")
    .select("id, amount, status")
    .eq("organization_id", organizationId)
    .eq("rent_schedule_id", scheduleId);

  if (excludePaymentId) {
    paymentsQuery = paymentsQuery.neq("id", excludePaymentId);
  }

  const { data: payments, error: paymentsError } = await paymentsQuery;

  if (paymentsError) {
    console.error("Erreur lecture paiements :", paymentsError);
    redirectToPayments("error", "Impossible de calculer le solde de l’échéance.");
  }

  const relevantPayments = payments ?? [];
  const paymentIds = relevantPayments.map((payment) => payment.id);

  const { data: refunds } =
    paymentIds.length > 0
      ? await supabase
          .from("payment_refunds")
          .select("payment_id, amount")
          .eq("organization_id", organizationId)
          .in("payment_id", paymentIds)
      : { data: [] };

  const refundedByPaymentId = new Map<string, number>();

  for (const refund of refunds ?? []) {
    refundedByPaymentId.set(
      refund.payment_id,
      (refundedByPaymentId.get(refund.payment_id) ?? 0) +
        Number(refund.amount ?? 0)
    );
  }

  let completedNet = 0;
  let pendingGross = 0;

  for (const payment of relevantPayments) {
    const amount = Number(payment.amount ?? 0);

    if (payment.status === "COMPLETED") {
      completedNet += Math.max(
        0,
        amount - (refundedByPaymentId.get(payment.id) ?? 0)
      );
    }

    if (payment.status === "PENDING") {
      pendingGross += amount;
    }
  }

  const amountDue = Number(schedule.amount_due ?? 0);

  return {
    schedule,
    amountDue,
    completedNet,
    pendingGross,
    remainingCollected: Math.max(0, amountDue - completedNet),
    remainingAvailable: Math.max(0, amountDue - completedNet - pendingGross),
  };
}

async function recalculateScheduleStatus(
  supabase: FinanceSupabase,
  organizationId: string,
  scheduleId: string
) {
  const state = await getScheduleFinancialState({
    supabase,
    organizationId,
    scheduleId,
  });

  const today = new Date().toISOString().slice(0, 10);

  let nextStatus = "PENDING";

  if (state.amountDue > 0 && state.completedNet >= state.amountDue) {
    nextStatus = "PAID";
  } else if (state.schedule.due_date < today) {
    nextStatus = "OVERDUE";
  } else if (state.completedNet > 0) {
    nextStatus = "PARTIALLY_PAID";
  }

  const { error } = await supabase
    .from("rent_schedules")
    .update({ status: nextStatus })
    .eq("id", scheduleId)
    .eq("organization_id", organizationId);

  if (error) {
    console.error("Erreur recalcul statut échéance :", error);
    redirectToPayments(
      "error",
      "Le paiement a été enregistré, mais le statut de l’échéance n’a pas pu être recalculé."
    );
  }
}

export async function createPaymentAction(formData: FormData) {
  const { supabase, membership } = await requireAdminOrManager();

  const scheduleId = requiredText(
    formData,
    "rent_schedule_id",
    "L’échéance"
  );

  const amount = positiveAmount(formData, "amount", "Le montant");
  const paymentDate = requiredText(
    formData,
    "payment_date",
    "La date de paiement"
  );
  const paymentMethod = requiredText(
    formData,
    "payment_method",
    "Le mode de paiement"
  );
  const status = requiredText(formData, "status", "Le statut");
  const reference = optionalText(formData, "reference", 120);
  const notes = optionalText(formData, "notes", 700);

  if (
    !PAYMENT_METHODS.includes(
      paymentMethod as (typeof PAYMENT_METHODS)[number]
    )
  ) {
    redirectToPayments("error", "Le mode de paiement est invalide.");
  }

  if (
    !PAYMENT_STATUSES.includes(status as (typeof PAYMENT_STATUSES)[number])
  ) {
    redirectToPayments("error", "Le statut du paiement est invalide.");
  }

  const state = await getScheduleFinancialState({
    supabase,
    organizationId: membership.organization_id,
    scheduleId,
  });

  if (status !== "CANCELLED" && amount > state.remainingAvailable) {
    redirectToPayments(
      "error",
      `Le montant dépasse le solde disponible de ${new Intl.NumberFormat(
        "fr-FR"
      ).format(state.remainingAvailable)} F CFA.`
    );
  }

  const { error } = await supabase.from("payments").insert({
    organization_id: membership.organization_id,
    rent_schedule_id: scheduleId,
    amount,
    currency: state.schedule.currency ?? "XOF",
    payment_date: paymentDate,
    payment_method: paymentMethod,
    status,
    reference,
    notes,
  });

  if (error) {
    console.error("Erreur création paiement :", error);
    redirectToPayments("error", "Impossible d’enregistrer le paiement.");
  }

  await recalculateScheduleStatus(
    supabase,
    membership.organization_id,
    scheduleId
  );

  revalidatePath("/payments");
  revalidatePath("/schedules");
  revalidatePath("/documents");
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  redirectToPayments("success", "Le paiement a été enregistré.");
}

export async function updatePaymentAction(formData: FormData) {
  const { supabase, membership } = await requireAdminOrManager();

  const paymentId = requiredText(formData, "payment_id", "Le paiement");
  const scheduleId = requiredText(
    formData,
    "rent_schedule_id",
    "L’échéance"
  );
  const amount = positiveAmount(formData, "amount", "Le montant");
  const paymentDate = requiredText(
    formData,
    "payment_date",
    "La date de paiement"
  );
  const paymentMethod = requiredText(
    formData,
    "payment_method",
    "Le mode de paiement"
  );
  const status = requiredText(formData, "status", "Le statut");
  const reference = optionalText(formData, "reference", 120);
  const notes = optionalText(formData, "notes", 700);

  if (
    !PAYMENT_METHODS.includes(
      paymentMethod as (typeof PAYMENT_METHODS)[number]
    ) ||
    !PAYMENT_STATUSES.includes(status as (typeof PAYMENT_STATUSES)[number])
  ) {
    redirectToPayments("error", "Les données du paiement sont invalides.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("payments")
    .select("id, rent_schedule_id")
    .eq("id", paymentId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (existingError || !existing) {
    redirectToPayments(
      "error",
      "Ce paiement est introuvable dans votre organisation."
    );
  }

  const { data: paymentRefunds, error: refundError } = await supabase
    .from("payment_refunds")
    .select("id")
    .eq("organization_id", membership.organization_id)
    .eq("payment_id", paymentId)
    .limit(1);

  if (refundError) {
    console.error("Erreur vérification remboursements :", refundError);
    redirectToPayments(
      "error",
      "Impossible de vérifier les remboursements du paiement."
    );
  }

  if ((paymentRefunds ?? []).length > 0) {
    redirectToPayments(
      "error",
      "Un paiement déjà remboursé partiellement ou totalement ne peut plus être modifié."
    );
  }

  const state = await getScheduleFinancialState({
    supabase,
    organizationId: membership.organization_id,
    scheduleId,
    excludePaymentId: paymentId,
  });

  if (status !== "CANCELLED" && amount > state.remainingAvailable) {
    redirectToPayments(
      "error",
      `Le montant dépasse le solde disponible de ${new Intl.NumberFormat(
        "fr-FR"
      ).format(state.remainingAvailable)} F CFA.`
    );
  }

  const { error } = await supabase
    .from("payments")
    .update({
      rent_schedule_id: scheduleId,
      amount,
      currency: state.schedule.currency ?? "XOF",
      payment_date: paymentDate,
      payment_method: paymentMethod,
      status,
      reference,
      notes,
    })
    .eq("id", paymentId)
    .eq("organization_id", membership.organization_id);

  if (error) {
    console.error("Erreur modification paiement :", error);
    redirectToPayments("error", "Impossible de modifier le paiement.");
  }

  await recalculateScheduleStatus(
    supabase,
    membership.organization_id,
    existing.rent_schedule_id
  );

  if (existing.rent_schedule_id !== scheduleId) {
    await recalculateScheduleStatus(
      supabase,
      membership.organization_id,
      scheduleId
    );
  }

  revalidatePath("/payments");
  revalidatePath("/schedules");
  revalidatePath("/documents");
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  redirectToPayments("success", "Le paiement a été mis à jour.");
}

export async function refundPaymentAction(formData: FormData) {
  const { supabase, membership } = await requireAdminOrManager();

  const paymentId = requiredText(formData, "payment_id", "Le paiement");
  const amount = positiveAmount(
    formData,
    "refund_amount",
    "Le montant du remboursement"
  );
  const refundDate = requiredText(
    formData,
    "refund_date",
    "La date de remboursement"
  );
  const reason = optionalText(formData, "reason", 500);
  const reference = optionalText(formData, "reference", 120);

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("id, rent_schedule_id, amount, currency, status")
    .eq("id", paymentId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (paymentError || !payment) {
    redirectToPayments(
      "error",
      "Ce paiement est introuvable dans votre organisation."
    );
  }

  if (payment.status !== "COMPLETED") {
    redirectToPayments(
      "error",
      "Seul un paiement complété peut être remboursé."
    );
  }

  const { data: existingRefunds, error: existingRefundsError } =
    await supabase
      .from("payment_refunds")
      .select("amount")
      .eq("organization_id", membership.organization_id)
      .eq("payment_id", paymentId);

  if (existingRefundsError) {
    console.error("Erreur lecture remboursements :", existingRefundsError);
    redirectToPayments(
      "error",
      "Impossible de calculer le montant remboursable."
    );
  }

  const alreadyRefunded = (existingRefunds ?? []).reduce(
    (sum, refund) => sum + Number(refund.amount ?? 0),
    0
  );

  const refundable = Math.max(0, Number(payment.amount ?? 0) - alreadyRefunded);

  if (amount > refundable) {
    redirectToPayments(
      "error",
      `Le remboursement dépasse le montant encore remboursable de ${new Intl.NumberFormat(
        "fr-FR"
      ).format(refundable)} F CFA.`
    );
  }

  const { error } = await supabase.from("payment_refunds").insert({
    organization_id: membership.organization_id,
    payment_id: paymentId,
    amount,
    currency: payment.currency ?? "XOF",
    refund_date: refundDate,
    reason,
    reference,
  });

  if (error) {
    console.error("Erreur remboursement paiement :", error);
    redirectToPayments("error", "Impossible d’enregistrer le remboursement.");
  }

  await recalculateScheduleStatus(
    supabase,
    membership.organization_id,
    payment.rent_schedule_id
  );

  revalidatePath("/payments");
  revalidatePath("/schedules");
  revalidatePath("/documents");
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  redirectToPayments("success", "Le remboursement a été enregistré.");
}
