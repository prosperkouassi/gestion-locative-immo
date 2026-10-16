"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminOrManager } from "@/lib/auth/access";

// Page temporaire de tests de sécurité.
// Aucun flux métier normal de l'application ne doit dépendre de ce fichier.

async function requireTestRlsAccess() {
  if (process.env.NODE_ENV === "production") {
    redirect("/dashboard");
  }

  return requireAdminOrManager();
}

export async function testAtomicLeaseOverlap() {
  const { supabase, membership } = await requireTestRlsAccess();
  const organizationId = membership.organization_id;

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", "Résidence Alteract Test")
    .maybeSingle();

  if (propertyError || !property) {
    console.error("Bien test introuvable.", propertyError);
    return;
  }

  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("property_id", property.id)
    .eq("name", "Appartement A01")
    .maybeSingle();

  if (unitError || !unit) {
    console.error("Unité test introuvable.", unitError);
    return;
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("email", "marie.kone.test@example.com")
    .maybeSingle();

  if (tenantError || !tenant) {
    console.error("Locataire test introuvable.", tenantError);
    return;
  }

  const { data: lease, error: leaseError } = await supabase.rpc(
    "create_active_lease_with_schedules",
    {
      target_organization_id: organizationId,
      target_unit_id: unit.id,
      target_tenant_id: tenant.id,
      target_start_date: "2027-01-01",
      target_end_date: "2027-12-31",
      target_monthly_rent: 250000,
      target_currency: "XOF",
      target_security_deposit: 0,
      target_payment_due_day: 5,
      target_notes: "TEST ATOMIC OVERLAP SHOULD FAIL",
    }
  );

  if (leaseError) {
    console.log(
      "TEST RÉUSSI : le bail en chevauchement a été refusé.",
      leaseError
    );
    return;
  }

  console.error(
    "TEST ÉCHOUÉ : un bail en chevauchement a été créé.",
    lease
  );

  revalidatePath("/test-rls");
}

export async function testDirectRefundInsertBlocked() {
  const { supabase } = await requireTestRlsAccess();

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("id, organization_id, amount, currency, status, reference")
    .eq("reference", "ALTERACT-TEST-PAYMENT-BALANCE-001")
    .maybeSingle();

  if (paymentError || !payment) {
    console.error(
      "TEST ÉCHOUÉ : paiement de solde introuvable.",
      paymentError
    );
    return;
  }

  const testReference = "ALTERACT-TEST-DIRECT-REFUND-BLOCKED-001";

  const { data: existingRefund, error: existingRefundError } =
    await supabase
      .from("payment_refunds")
      .select("id, reference")
      .eq("reference", testReference)
      .maybeSingle();

  if (existingRefundError) {
    console.error(
      "TEST ÉCHOUÉ : impossible de vérifier l'existence du remboursement de test.",
      existingRefundError
    );
    return;
  }

  if (existingRefund) {
    console.error(
      "TEST À NETTOYER : un remboursement de test existe déjà.",
      existingRefund
    );
    return;
  }

  const { data: insertedRefund, error: insertError } = await supabase
    .from("payment_refunds")
    .insert({
      organization_id: payment.organization_id,
      payment_id: payment.id,
      amount: 1000,
      currency: payment.currency,
      refund_date: "2026-10-14",
      reason: "Test : cet INSERT direct doit être bloqué par le RLS.",
      reference: testReference,
    })
    .select()
    .maybeSingle();

  if (insertError) {
    console.log(
      "TEST RÉUSSI : l'INSERT direct de remboursement a été bloqué par le RLS.",
      insertError
    );
    return;
  }

  console.error(
    "TEST ÉCHOUÉ : l'INSERT direct a été autorisé alors qu'il devrait être bloqué.",
    insertedRefund
  );

  revalidatePath("/test-rls");
}

export async function testDirectPaymentInsertBlocked() {
  const { supabase, membership } = await requireTestRlsAccess();
  const organizationId = membership.organization_id;

  const { data: lease, error: leaseError } = await supabase
    .from("leases")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("start_date", "2026-10-01")
    .eq("end_date", "2027-09-30")
    .maybeSingle();

  if (leaseError || !lease) {
    console.error("TEST ÉCHOUÉ : bail principal introuvable.", leaseError);
    return;
  }

  const { data: schedule, error: scheduleError } = await supabase
    .from("rent_schedules")
    .select("id, organization_id, currency, status")
    .eq("organization_id", organizationId)
    .eq("lease_id", lease.id)
    .eq("period_start", "2026-12-01")
    .maybeSingle();

  if (scheduleError || !schedule) {
    console.error(
      "TEST ÉCHOUÉ : échéance de décembre 2026 introuvable.",
      scheduleError
    );
    return;
  }

  if (schedule.status === "CANCELLED") {
    console.error(
      "TEST ÉCHOUÉ : l'échéance de décembre est annulée.",
      schedule
    );
    return;
  }

  const testReference = "ALTERACT-TEST-DIRECT-PAYMENT-BLOCKED-001";

  const { data: existingPayment, error: existingPaymentError } =
    await supabase
      .from("payments")
      .select("id, reference")
      .eq("organization_id", organizationId)
      .eq("reference", testReference)
      .maybeSingle();

  if (existingPaymentError) {
    console.error(
      "TEST ÉCHOUÉ : impossible de vérifier le paiement de test.",
      existingPaymentError
    );
    return;
  }

  if (existingPayment) {
    console.error(
      "TEST À NETTOYER : un paiement de test existe déjà.",
      existingPayment
    );
    return;
  }

  const { data: insertedPayment, error: insertError } = await supabase
    .from("payments")
    .insert({
      organization_id: schedule.organization_id,
      rent_schedule_id: schedule.id,
      amount: 1000,
      currency: schedule.currency,
      payment_date: "2026-12-02",
      payment_method: "BANK_TRANSFER",
      status: "PENDING",
      reference: testReference,
      notes: "Test : cet INSERT direct doit être bloqué par le RLS.",
    })
    .select()
    .maybeSingle();

  if (insertError) {
    console.log(
      "TEST RÉUSSI : l'INSERT direct de paiement a été bloqué par le RLS.",
      insertError
    );
    return;
  }

  console.error(
    "TEST ÉCHOUÉ : l'INSERT direct de paiement a été autorisé alors qu'il devrait être bloqué.",
    insertedPayment
  );

  revalidatePath("/test-rls");
}

export async function testDirectLeaseInsertBlocked() {
  const { supabase, membership } = await requireTestRlsAccess();
  const organizationId = membership.organization_id;

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", "Résidence Alteract Test")
    .maybeSingle();

  if (propertyError || !property) {
    console.error("TEST ÉCHOUÉ : bien test introuvable.", propertyError);
    return;
  }

  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("property_id", property.id)
    .eq("name", "Appartement A01")
    .maybeSingle();

  if (unitError || !unit) {
    console.error("TEST ÉCHOUÉ : unité test introuvable.", unitError);
    return;
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("email", "marie.kone.test@example.com")
    .maybeSingle();

  if (tenantError || !tenant) {
    console.error("TEST ÉCHOUÉ : locataire test introuvable.", tenantError);
    return;
  }

  const testNote = "ALTERACT-TEST-DIRECT-LEASE-BLOCKED-001";

  const { data: existingLease, error: existingLeaseError } = await supabase
    .from("leases")
    .select("id, notes")
    .eq("organization_id", organizationId)
    .eq("notes", testNote)
    .maybeSingle();

  if (existingLeaseError) {
    console.error(
      "TEST ÉCHOUÉ : impossible de vérifier le bail direct de test.",
      existingLeaseError
    );
    return;
  }

  if (existingLease) {
    console.error(
      "TEST À NETTOYER : un bail direct de test existe déjà.",
      existingLease
    );
    return;
  }

  const { data: insertedLease, error: insertError } = await supabase
    .from("leases")
    .insert({
      organization_id: organizationId,
      unit_id: unit.id,
      tenant_id: tenant.id,
      status: "ACTIVE",
      start_date: "2028-10-01",
      end_date: "2029-09-30",
      monthly_rent: 250000,
      currency: "XOF",
      security_deposit: 0,
      payment_due_day: 5,
      notes: testNote,
    })
    .select()
    .maybeSingle();

  if (insertError) {
    console.log(
      "TEST RÉUSSI : l'INSERT direct de bail a été bloqué par le RLS.",
      insertError
    );
    return;
  }

  console.error(
    "TEST ÉCHOUÉ : l'INSERT direct de bail a été autorisé alors qu'il devrait être bloqué.",
    insertedLease
  );

  revalidatePath("/test-rls");
}
