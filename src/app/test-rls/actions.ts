"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ============================================================
// CRÉER UN PROPRIÉTAIRE TEST
// ============================================================

export async function createTestOwner() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    console.error("Utilisateur non authentifié.");
    return;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    console.error(
      "Impossible de récupérer l'organisation :",
      membershipError
    );
    return;
  }

  const { data: existingOwner } = await supabase
    .from("owners")
    .select("id")
    .eq("organization_id", membership.organization_id)
    .eq("email", "jean.kouassi.test@example.com")
    .maybeSingle();

  if (existingOwner) {
    console.log("Le propriétaire test existe déjà.");
    return;
  }

  const { error: insertError } = await supabase
    .from("owners")
    .insert({
      organization_id: membership.organization_id,
      first_name: "Jean",
      last_name: "Kouassi",
      email: "jean.kouassi.test@example.com",
      phone: "+225 01 02 03 04 05",
      city: "Abidjan",
      country: "Côte d'Ivoire",
      notes: "Propriétaire créé pour les tests Alteract.",
      is_active: true,
    });

  if (insertError) {
    console.error(
      "Insertion du propriétaire refusée :",
      insertError
    );
    return;
  }

  revalidatePath("/test-rls");
}

// ============================================================
// CRÉER UN BIEN IMMOBILIER TEST
// ============================================================

export async function createTestProperty() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    console.error("Utilisateur non authentifié.");
    return;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    console.error(
      "Impossible de récupérer l'organisation :",
      membershipError
    );
    return;
  }

  const { data: owner, error: ownerError } = await supabase
    .from("owners")
    .select("id, organization_id")
    .eq("organization_id", membership.organization_id)
    .eq("email", "jean.kouassi.test@example.com")
    .maybeSingle();

  if (ownerError || !owner) {
    console.error(
      "Créez d'abord le propriétaire test.",
      ownerError
    );
    return;
  }

  const { data: existingProperty } = await supabase
    .from("properties")
    .select("id")
    .eq("organization_id", membership.organization_id)
    .eq("name", "Résidence Alteract Test")
    .maybeSingle();

  if (existingProperty) {
    console.log("Le bien test existe déjà.");
    return;
  }

  const { error: insertError } = await supabase
    .from("properties")
    .insert({
      organization_id: membership.organization_id,
      owner_id: owner.id,
      name: "Résidence Alteract Test",
      property_type: "IMMEUBLE",
      address: "Cocody",
      city: "Abidjan",
      country: "Côte d'Ivoire",
      description:
        "Bien immobilier temporaire créé pour tester le RLS Alteract.",
      is_active: true,
    });

  if (insertError) {
    console.error(
      "Insertion du bien refusée :",
      insertError
    );
    return;
  }

  revalidatePath("/test-rls");
}

// ============================================================
// CRÉER UNE UNITÉ LOCATIVE TEST
// ============================================================

export async function createTestUnit() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    console.error("Utilisateur non authentifié.");
    return;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    console.error(
      "Impossible de récupérer l'organisation :",
      membershipError
    );
    return;
  }

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, organization_id")
    .eq("organization_id", membership.organization_id)
    .eq("name", "Résidence Alteract Test")
    .maybeSingle();

  if (propertyError || !property) {
    console.error(
      "Créez d'abord le propriétaire puis le bien test.",
      propertyError
    );
    return;
  }

  const { data: existingUnit, error: existingUnitError } = await supabase
    .from("units")
    .select("id")
    .eq("organization_id", membership.organization_id)
    .eq("property_id", property.id)
    .eq("name", "Appartement A01")
    .maybeSingle();

  if (existingUnitError) {
    console.error(
      "Erreur pendant la recherche de l'unité :",
      existingUnitError
    );
    return;
  }

  if (existingUnit) {
    console.log("L'unité test existe déjà.");
    return;
  }

  const { error: insertError } = await supabase
    .from("units")
    .insert({
      organization_id: membership.organization_id,
      property_id: property.id,
      name: "Appartement A01",
      unit_type: "APPARTEMENT",
      floor: "1",
      bedrooms: 2,
      bathrooms: 1,
      surface_area: 75,
      monthly_rent: 250000,
      currency: "XOF",
      description:
        "Unité temporaire créée pour tester le RLS Alteract.",
      is_active: true,
    });

  if (insertError) {
    console.error(
      "Insertion de l'unité refusée :",
      insertError
    );
    return;
  }

  revalidatePath("/test-rls");
}

// ============================================================
// CRÉER UN LOCATAIRE TEST
// ============================================================

export async function createTestTenant() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    console.error("Utilisateur non authentifié.");
    return;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    console.error(
      "Impossible de récupérer l'organisation :",
      membershipError
    );
    return;
  }

  const { data: existingTenant, error: existingTenantError } =
    await supabase
      .from("tenants")
      .select("id")
      .eq("organization_id", membership.organization_id)
      .eq("email", "marie.kone.test@example.com")
      .maybeSingle();

  if (existingTenantError) {
    console.error(
      "Erreur pendant la recherche du locataire :",
      existingTenantError
    );
    return;
  }

  if (existingTenant) {
    console.log("Le locataire test existe déjà.");
    return;
  }

  const { error: insertError } = await supabase
    .from("tenants")
    .insert({
      organization_id: membership.organization_id,
      first_name: "Marie",
      last_name: "Koné",
      email: "marie.kone.test@example.com",
      phone: "+225 07 08 09 10 11",
      city: "Abidjan",
      country: "Côte d'Ivoire",
      emergency_contact_name: "Paul Koné",
      emergency_contact_phone: "+225 05 06 07 08 09",
      notes:
        "Locataire temporaire créé pour tester le RLS Alteract.",
      is_active: true,
    });

  if (insertError) {
    console.error(
      "Insertion du locataire refusée :",
      insertError
    );
    return;
  }

  revalidatePath("/test-rls");
}

// ============================================================
// CRÉER UN BAIL TEST
// ============================================================

export async function createTestLease() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    console.error("Utilisateur non authentifié.");
    return;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    console.error(
      "Impossible de récupérer l'organisation :",
      membershipError
    );
    return;
  }

  const organizationId = membership.organization_id;

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", "Résidence Alteract Test")
    .maybeSingle();

  if (propertyError || !property) {
    console.error(
      "Créez d'abord le propriétaire puis le bien test.",
      propertyError
    );
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
    console.error(
      "Créez d'abord l'unité Appartement A01.",
      unitError
    );
    return;
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("email", "marie.kone.test@example.com")
    .maybeSingle();

  if (tenantError || !tenant) {
    console.error(
      "Créez d'abord le locataire Marie Koné.",
      tenantError
    );
    return;
  }

  const { data: existingLease, error: existingLeaseError } =
    await supabase
      .from("leases")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("unit_id", unit.id)
      .eq("tenant_id", tenant.id)
      .eq("start_date", "2026-10-01")
      .maybeSingle();

  if (existingLeaseError) {
    console.error(
      "Erreur pendant la recherche du bail :",
      existingLeaseError
    );
    return;
  }

  if (existingLease) {
    console.log("Le bail test existe déjà.");
    return;
  }

  const { error: insertError } = await supabase
    .from("leases")
    .insert({
      organization_id: organizationId,
      unit_id: unit.id,
      tenant_id: tenant.id,
      status: "ACTIVE",
      start_date: "2026-10-01",
      end_date: "2027-09-30",
      monthly_rent: 250000,
      currency: "XOF",
      security_deposit: 500000,
      payment_due_day: 5,
      notes:
        "Bail temporaire créé pour tester les relations et le RLS Alteract.",
    });

  if (insertError) {
    console.error(
      "Insertion du bail refusée :",
      insertError
    );
    return;
  }

  revalidatePath("/test-rls");
}

// ============================================================
// CRÉER UNE ÉCHÉANCE DE LOYER TEST
// ============================================================

export async function createTestRentSchedule() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    console.error("Utilisateur non authentifié.");
    return;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    console.error(
      "Impossible de récupérer l'organisation :",
      membershipError
    );
    return;
  }

  const organizationId = membership.organization_id;

  const { data: lease, error: leaseError } = await supabase
    .from("leases")
    .select(
      "id, organization_id, monthly_rent, currency, payment_due_day"
    )
    .eq("organization_id", organizationId)
    .eq("start_date", "2026-10-01")
    .eq("end_date", "2027-09-30")
    .maybeSingle();

  if (leaseError || !lease) {
    console.error(
      "Créez d'abord le bail test.",
      leaseError
    );
    return;
  }

  const { data: existingSchedule, error: existingScheduleError } =
    await supabase
      .from("rent_schedules")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("lease_id", lease.id)
      .eq("period_start", "2026-10-01")
      .maybeSingle();

  if (existingScheduleError) {
    console.error(
      "Erreur pendant la recherche de l'échéance :",
      existingScheduleError
    );
    return;
  }

  if (existingSchedule) {
    console.log("L'échéance test existe déjà.");
    return;
  }

  const { error: insertError } = await supabase
    .from("rent_schedules")
    .insert({
      organization_id: organizationId,
      lease_id: lease.id,
      period_start: "2026-10-01",
      period_end: "2026-10-31",
      due_date: "2026-10-05",
      amount_due: lease.monthly_rent,
      currency: lease.currency,
      status: "PENDING",
      notes:
        "Échéance temporaire d'octobre 2026 créée pour tester Alteract.",
    });

  if (insertError) {
    console.error(
      "Insertion de l'échéance refusée :",
      insertError
    );
    return;
  }

  revalidatePath("/test-rls");
}

// ============================================================
// CRÉER UN PAIEMENT PARTIEL TEST
// ============================================================

export async function createTestPayment() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    console.error("Utilisateur non authentifié.");
    return;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    console.error(
      "Impossible de récupérer l'organisation :",
      membershipError
    );
    return;
  }

  const organizationId = membership.organization_id;

  const { data: lease, error: leaseError } = await supabase
    .from("leases")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("start_date", "2026-10-01")
    .eq("end_date", "2027-09-30")
    .maybeSingle();

  if (leaseError || !lease) {
    console.error(
      "Créez d'abord le bail test.",
      leaseError
    );
    return;
  }

  const { data: schedule, error: scheduleError } = await supabase
    .from("rent_schedules")
    .select("id, amount_due, currency")
    .eq("organization_id", organizationId)
    .eq("lease_id", lease.id)
    .eq("period_start", "2026-10-01")
    .maybeSingle();

  if (scheduleError || !schedule) {
    console.error(
      "Créez d'abord l'échéance test.",
      scheduleError
    );
    return;
  }

  const { data: existingPayment, error: existingPaymentError } =
    await supabase
      .from("payments")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("rent_schedule_id", schedule.id)
      .eq("reference", "ALTERACT-TEST-PAYMENT-001")
      .maybeSingle();

  if (existingPaymentError) {
    console.error(
      "Erreur pendant la recherche du paiement :",
      existingPaymentError
    );
    return;
  }

  if (existingPayment) {
    console.log("Le paiement test existe déjà.");
    return;
  }

  const { error: insertError } = await supabase
    .from("payments")
    .insert({
      organization_id: organizationId,
      rent_schedule_id: schedule.id,
      amount: 100000,
      currency: schedule.currency,
      payment_date: "2026-10-05",
      payment_method: "MOBILE_MONEY",
      status: "COMPLETED",
      reference: "ALTERACT-TEST-PAYMENT-001",
      notes:
        "Paiement partiel temporaire de 100 000 XOF créé pour tester Alteract.",
    });

  if (insertError) {
    console.error(
      "Insertion du paiement refusée :",
      insertError
    );
    return;
  }

  revalidatePath("/test-rls");
}

// ============================================================
// CRÉER UN REÇU POUR LE PAIEMENT TEST
// ============================================================

export async function createTestReceipt() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    console.error("Utilisateur non authentifié.");
    return;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    console.error(
      "Impossible de récupérer l'organisation :",
      membershipError
    );
    return;
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("id, status, amount, currency")
    .eq("organization_id", membership.organization_id)
    .eq("reference", "ALTERACT-TEST-PAYMENT-001")
    .maybeSingle();

  if (paymentError || !payment) {
    console.error(
      "Créez d'abord le paiement test.",
      paymentError
    );
    return;
  }

  if (payment.status !== "COMPLETED") {
    console.error(
      "Le paiement test doit être COMPLETED avant de créer son reçu."
    );
    return;
  }

  const { data: receipt, error: receiptError } = await supabase.rpc(
    "create_receipt_for_payment",
    {
      target_payment_id: payment.id,
    }
  );

  if (receiptError) {
    console.error(
      "Impossible de créer le reçu :",
      receiptError
    );
    return;
  }

  console.log(
    "Reçu créé :",
    receipt
  );

  revalidatePath("/test-rls");
}