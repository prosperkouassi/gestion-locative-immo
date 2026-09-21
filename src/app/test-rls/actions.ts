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
// ============================================================
// TESTER LA CRÉATION ATOMIQUE D'UN BAIL EN CHEVAUCHEMENT
// ============================================================

export async function testAtomicLeaseOverlap() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    console.error("Utilisateur non authentifié.");
    return;
  }

  const { data: membership, error: membershipError } =
    await supabase
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

  const { data: property, error: propertyError } =
    await supabase
      .from("properties")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("name", "Résidence Alteract Test")
      .maybeSingle();

  if (propertyError || !property) {
    console.error(
      "Bien test introuvable.",
      propertyError
    );
    return;
  }

  const { data: unit, error: unitError } =
    await supabase
      .from("units")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("property_id", property.id)
      .eq("name", "Appartement A01")
      .maybeSingle();

  if (unitError || !unit) {
    console.error(
      "Unité test introuvable.",
      unitError
    );
    return;
  }

  const { data: tenant, error: tenantError } =
    await supabase
      .from("tenants")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("email", "marie.kone.test@example.com")
      .maybeSingle();

  if (tenantError || !tenant) {
    console.error(
      "Locataire test introuvable.",
      tenantError
    );
    return;
  }

  const { data: lease, error: leaseError } =
    await supabase.rpc(
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
        target_notes:
          "TEST ATOMIC OVERLAP SHOULD FAIL",
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

// ============================================================
// TESTER LA CRÉATION ATOMIQUE D'UN BAIL VALIDE
// ============================================================

export async function testAtomicLeaseValid() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    console.error("Utilisateur non authentifié.");
    return;
  }

  const { data: membership, error: membershipError } =
    await supabase
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

  const { data: property, error: propertyError } =
    await supabase
      .from("properties")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("name", "Résidence Alteract Test")
      .maybeSingle();

  if (propertyError || !property) {
    console.error(
      "Bien test introuvable.",
      propertyError
    );
    return;
  }

  const { data: unit, error: unitError } =
    await supabase
      .from("units")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("property_id", property.id)
      .eq("name", "Appartement A01")
      .maybeSingle();

  if (unitError || !unit) {
    console.error(
      "Unité test introuvable.",
      unitError
    );
    return;
  }

  const { data: tenant, error: tenantError } =
    await supabase
      .from("tenants")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("email", "marie.kone.test@example.com")
      .maybeSingle();

  if (tenantError || !tenant) {
    console.error(
      "Locataire test introuvable.",
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
      .eq("start_date", "2027-10-01")
      .eq("end_date", "2028-09-30")
      .maybeSingle();

  if (existingLeaseError) {
    console.error(
      "Erreur pendant la recherche du bail atomique valide :",
      existingLeaseError
    );
    return;
  }

  if (existingLease) {
    console.log(
      "Le bail atomique valide de test existe déjà :",
      existingLease.id
    );
    return;
  }

  const { data: lease, error: leaseError } =
    await supabase.rpc(
      "create_active_lease_with_schedules",
      {
        target_organization_id: organizationId,
        target_unit_id: unit.id,
        target_tenant_id: tenant.id,
        target_start_date: "2027-10-01",
        target_end_date: "2028-09-30",
        target_monthly_rent: 250000,
        target_currency: "XOF",
        target_security_deposit: 0,
        target_payment_due_day: 5,
        target_notes:
          "TEST ATOMIC VALID ALTERACT",
      }
    );

  if (leaseError) {
    console.error(
      "TEST ÉCHOUÉ : la création atomique valide a été refusée.",
      leaseError
    );
    return;
  }

  console.log(
    "TEST RÉUSSI : bail et échéancier créés atomiquement.",
    lease
  );

  revalidatePath("/test-rls");
}

// ============================================================
// TESTER LA RÉSILIATION ANTICIPÉE D'UN BAIL
// ============================================================

export async function testTerminateLeaseEarly() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    console.error("Utilisateur non authentifié.");
    return;
  }

  const { data: lease, error: leaseError } = await supabase
    .from("leases")
    .select("id, status, start_date, end_date, effective_end_date, notes")
    .eq("id", "c9b8ba99-29d4-4280-9122-9a3e84903c23")
    .maybeSingle();

  if (leaseError || !lease) {
    console.error(
      "Bail temporaire de résiliation introuvable.",
      leaseError
    );
    return;
  }

  if (lease.status !== "ACTIVE") {
    console.error(
      "Le bail temporaire doit être ACTIVE avant le test.",
      lease
    );
    return;
  }

  const { data: terminatedLease, error: terminationError } =
    await supabase.rpc(
      "terminate_lease_early",
      {
        target_lease_id: lease.id,
        target_effective_end_date: "2032-04-15",
      }
    );

  if (terminationError) {
    console.error(
      "TEST ÉCHOUÉ : la résiliation anticipée a été refusée.",
      terminationError
    );
    return;
  }

  console.log(
    "TEST RÉUSSI : le bail a été résilié au 15/04/2032.",
    terminatedLease
  );

  revalidatePath("/test-rls");
}

// ============================================================
// TESTER LA QUITTANCE SUR UNE ÉCHÉANCE NON SOLDÉE
// ============================================================

export async function testQuittanceUnpaidSchedule() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    console.error("Utilisateur non authentifié.");
    return;
  }

  const { data: quittance, error: quittanceError } =
    await supabase.rpc(
      "create_quittance_for_schedule",
      {
        target_schedule_id:
          "1a0b135d-4856-43cc-91e6-0d30ecd4c107",
      }
    );

  if (quittanceError) {
    if (
      quittanceError.message?.includes(
        "quittance interdite : échéance non soldée"
      )
    ) {
      console.log(
        "TEST RÉUSSI : la quittance a été refusée car l'échéance n'est pas soldée.",
        quittanceError
      );
      return;
    }

    console.error(
      "TEST ÉCHOUÉ : une erreur inattendue est survenue.",
      quittanceError
    );
    return;
  }

  console.error(
    "TEST ÉCHOUÉ : une quittance a été créée alors que l'échéance n'est pas soldée.",
    quittance
  );

  revalidatePath("/test-rls");
}

// ============================================================
// CRÉER LA QUITTANCE SUR UNE ÉCHÉANCE SOLDÉE
// ============================================================

export async function createPaidScheduleQuittance() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    console.error("Utilisateur non authentifié.");
    return;
  }

  const { data: quittance, error: quittanceError } =
    await supabase.rpc(
      "create_quittance_for_schedule",
      {
        target_schedule_id:
          "1a0b135d-4856-43cc-91e6-0d30ecd4c107",
      }
    );

  if (quittanceError) {
    console.error(
      "TEST ÉCHOUÉ : impossible de créer la quittance sur l'échéance soldée.",
      quittanceError
    );
    return;
  }

  console.log(
    "TEST RÉUSSI : quittance créée sur l'échéance soldée.",
    quittance
  );

  revalidatePath("/test-rls");
}

// ============================================================
// TESTER LA CRÉATION D'UN REMBOURSEMENT VIA LE RPC MÉTIER
// ============================================================

export async function testCreatePaymentRefundRpc() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    console.error("Utilisateur non authentifié.");
    return;
  }

  const { data: payment, error: paymentError } =
    await supabase
      .from("payments")
      .select("id, amount, currency, status, reference")
      .eq("reference", "ALTERACT-TEST-PAYMENT-BALANCE-001")
      .maybeSingle();

  if (paymentError || !payment) {
    console.error(
      "TEST ÉCHOUÉ : paiement de solde introuvable.",
      paymentError
    );
    return;
  }

  if (payment.status !== "COMPLETED") {
    console.error(
      "TEST ÉCHOUÉ : le paiement doit être COMPLETED avant le remboursement.",
      payment
    );
    return;
  }

  const testReference =
    "ALTERACT-TEST-REFUND-RPC-001";

  const { data: existingRefund, error: existingRefundError } =
    await supabase
      .from("payment_refunds")
      .select("id, amount, reference")
      .eq("payment_id", payment.id)
      .eq("reference", testReference)
      .maybeSingle();

  if (existingRefundError) {
    console.error(
      "TEST ÉCHOUÉ : impossible de vérifier le remboursement de test.",
      existingRefundError
    );
    return;
  }

  if (existingRefund) {
    console.log(
      "TEST DÉJÀ EFFECTUÉ : le remboursement RPC existe déjà.",
      existingRefund
    );
    return;
  }

  const { data: refund, error: refundError } =
    await supabase.rpc(
      "create_payment_refund",
      {
        target_payment_id: payment.id,
        target_amount: 1000,
        target_refund_date: "2026-10-13",
        target_reason:
          "Test du remboursement contrôlé via RPC Alteract.",
        target_reference: testReference,
      }
    );

  if (refundError) {
    console.error(
      "TEST ÉCHOUÉ : le remboursement via RPC a été refusé.",
      refundError
    );
    return;
  }

  console.log(
    "TEST RÉUSSI : remboursement de 1 000 XOF créé via le RPC métier.",
    refund
  );

  revalidatePath("/test-rls");
}

// ============================================================
// TESTER QUE L'INSERT DIRECT D'UN REMBOURSEMENT EST BLOQUÉ PAR RLS
// ============================================================

export async function testDirectRefundInsertBlocked() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    console.error("Utilisateur non authentifié.");
    return;
  }

  const { data: payment, error: paymentError } =
    await supabase
      .from("payments")
      .select(
        "id, organization_id, amount, currency, status, reference"
      )
      .eq(
        "reference",
        "ALTERACT-TEST-PAYMENT-BALANCE-001"
      )
      .maybeSingle();

  if (paymentError || !payment) {
    console.error(
      "TEST ÉCHOUÉ : paiement de solde introuvable.",
      paymentError
    );
    return;
  }

  const testReference =
    "ALTERACT-TEST-DIRECT-REFUND-BLOCKED-001";

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

  const { data: insertedRefund, error: insertError } =
    await supabase
      .from("payment_refunds")
      .insert({
        organization_id: payment.organization_id,
        payment_id: payment.id,
        amount: 1000,
        currency: payment.currency,
        refund_date: "2026-10-14",
        reason:
          "Test : cet INSERT direct doit être bloqué par le RLS.",
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

// ============================================================
// TESTER LA CRÉATION D'UN PAIEMENT VIA LE RPC MÉTIER
// ============================================================

export async function testCreatePaymentRpc() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    console.error("Utilisateur non authentifié.");
    return;
  }

  const { data: membership, error: membershipError } =
    await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

  if (membershipError || !membership) {
    console.error(
      "TEST ÉCHOUÉ : organisation active introuvable.",
      membershipError
    );
    return;
  }

  const { data: lease, error: leaseError } =
    await supabase
      .from("leases")
      .select("id")
      .eq("organization_id", membership.organization_id)
      .eq("start_date", "2026-10-01")
      .eq("end_date", "2027-09-30")
      .maybeSingle();

  if (leaseError || !lease) {
    console.error(
      "TEST ÉCHOUÉ : bail principal introuvable.",
      leaseError
    );
    return;
  }

  const { data: schedule, error: scheduleError } =
    await supabase
      .from("rent_schedules")
      .select("id, status, amount_due, currency")
      .eq("organization_id", membership.organization_id)
      .eq("lease_id", lease.id)
      .eq("period_start", "2026-11-01")
      .maybeSingle();

  if (scheduleError || !schedule) {
    console.error(
      "TEST ÉCHOUÉ : échéance de novembre 2026 introuvable.",
      scheduleError
    );
    return;
  }

  if (schedule.status === "CANCELLED") {
    console.error(
      "TEST ÉCHOUÉ : l'échéance de novembre est annulée.",
      schedule
    );
    return;
  }

  const testReference = "ALTERACT-TEST-PAYMENT-RPC-001";

  const { data: existingPayment, error: existingPaymentError } =
    await supabase
      .from("payments")
      .select("id, amount, status, reference")
      .eq("organization_id", membership.organization_id)
      .eq("reference", testReference)
      .maybeSingle();

  if (existingPaymentError) {
    console.error(
      "TEST ÉCHOUÉ : impossible de vérifier le paiement RPC de test.",
      existingPaymentError
    );
    return;
  }

  if (existingPayment) {
    console.log(
      "TEST DÉJÀ EFFECTUÉ : le paiement RPC existe déjà.",
      existingPayment
    );
    return;
  }

  const { data: payment, error: paymentError } =
    await supabase.rpc(
      "create_payment",
      {
        target_rent_schedule_id: schedule.id,
        target_amount: 1000,
        target_payment_date: "2026-11-02",
        target_payment_method: "BANK_TRANSFER",
        target_status: "PENDING",
        target_reference: testReference,
        target_notes:
          "Paiement temporaire PENDING créé pour tester le RPC métier Alteract.",
      }
    );

  if (paymentError) {
    console.error(
      "TEST ÉCHOUÉ : la création du paiement via RPC a été refusée.",
      paymentError
    );
    return;
  }

  console.log(
    "TEST RÉUSSI : paiement PENDING de 1 000 XOF créé via le RPC métier.",
    payment
  );

  revalidatePath("/test-rls");
}



// ============================================================
// TESTER QUE L'INSERT DIRECT D'UN PAIEMENT EST BLOQUÉ PAR RLS
// ============================================================

export async function testDirectPaymentInsertBlocked() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    console.error("Utilisateur non authentifié.");
    return;
  }

  const { data: membership, error: membershipError } =
    await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

  if (membershipError || !membership) {
    console.error(
      "TEST ÉCHOUÉ : organisation active introuvable.",
      membershipError
    );
    return;
  }

  const { data: lease, error: leaseError } =
    await supabase
      .from("leases")
      .select("id")
      .eq("organization_id", membership.organization_id)
      .eq("start_date", "2026-10-01")
      .eq("end_date", "2027-09-30")
      .maybeSingle();

  if (leaseError || !lease) {
    console.error(
      "TEST ÉCHOUÉ : bail principal introuvable.",
      leaseError
    );
    return;
  }

  const { data: schedule, error: scheduleError } =
    await supabase
      .from("rent_schedules")
      .select("id, organization_id, currency, status")
      .eq("organization_id", membership.organization_id)
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

  const testReference =
    "ALTERACT-TEST-DIRECT-PAYMENT-BLOCKED-001";

  const { data: existingPayment, error: existingPaymentError } =
    await supabase
      .from("payments")
      .select("id, reference")
      .eq("organization_id", membership.organization_id)
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

  const { data: insertedPayment, error: insertError } =
    await supabase
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
        notes:
          "Test : cet INSERT direct doit être bloqué par le RLS.",
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

// ============================================================
// TESTER QUE L'INSERT DIRECT D'UN BAIL EST BLOQUÉ PAR RLS
// ============================================================

export async function testDirectLeaseInsertBlocked() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    console.error("Utilisateur non authentifié.");
    return;
  }

  const { data: membership, error: membershipError } =
    await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

  if (membershipError || !membership) {
    console.error(
      "TEST ÉCHOUÉ : organisation active introuvable.",
      membershipError
    );
    return;
  }

  const organizationId = membership.organization_id;

  const { data: property, error: propertyError } =
    await supabase
      .from("properties")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("name", "Résidence Alteract Test")
      .maybeSingle();

  if (propertyError || !property) {
    console.error(
      "TEST ÉCHOUÉ : bien test introuvable.",
      propertyError
    );
    return;
  }

  const { data: unit, error: unitError } =
    await supabase
      .from("units")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("property_id", property.id)
      .eq("name", "Appartement A01")
      .maybeSingle();

  if (unitError || !unit) {
    console.error(
      "TEST ÉCHOUÉ : unité test introuvable.",
      unitError
    );
    return;
  }

  const { data: tenant, error: tenantError } =
    await supabase
      .from("tenants")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("email", "marie.kone.test@example.com")
      .maybeSingle();

  if (tenantError || !tenant) {
    console.error(
      "TEST ÉCHOUÉ : locataire test introuvable.",
      tenantError
    );
    return;
  }

  const testNote = "ALTERACT-TEST-DIRECT-LEASE-BLOCKED-001";

  const { data: existingLease, error: existingLeaseError } =
    await supabase
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

  const { data: insertedLease, error: insertError } =
    await supabase
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

