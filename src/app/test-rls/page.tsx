import { createClient } from "@/lib/supabase/server";

import {
  createTestOwner,
  createTestProperty,
  createTestUnit,
  createTestTenant,
  createTestLease,
  createTestRentSchedule,
  createTestPayment,
  createTestReceipt,
  testAtomicLeaseOverlap,
  testAtomicLeaseValid,
  testTerminateLeaseEarly,
  testQuittanceUnpaidSchedule,
  createPaidScheduleQuittance,
  testCreatePaymentRefundRpc,
  testDirectRefundInsertBlocked,
  testCreatePaymentRpc,
  testDirectPaymentInsertBlocked,
  testDirectLeaseInsertBlocked,
} from "./actions";

function ResultBlock({
  title,
  data,
}: {
  title: string;
  data: unknown;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">
        {title}
      </h2>

      <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-100">
        {JSON.stringify(data, null, 2)}
      </pre>
    </section>
  );
}

export default async function TestRlsPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*");

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("*");

  const { data: organizations } = await supabase
    .from("organizations")
    .select("*");

  const { data: owners } = await supabase
    .from("owners")
    .select("*");

  const { data: properties } = await supabase
    .from("properties")
    .select("*");

  const { data: units } = await supabase
    .from("units")
    .select("*");

  const { data: tenants } = await supabase
    .from("tenants")
    .select("*");

  const { data: leases } = await supabase
    .from("leases")
    .select("*");

  const { data: rentSchedules } = await supabase
    .from("rent_schedules")
    .select("*")
    .order("due_date", { ascending: true });

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .order("payment_date", { ascending: true });

  const { data: paymentRefunds } = await supabase
    .from("payment_refunds")
    .select("*")
    .order("refund_date", { ascending: true });

  const { data: receipts } = await supabase
    .from("receipts")
    .select("*")
    .order("issued_at", { ascending: true });

  const { data: quittances } = await supabase
    .from("rent_quittances")
    .select("*")
    .order("issued_at", { ascending: true });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Test RLS Alteract
          </h1>

          <p className="mt-2 text-slate-600">
            Page temporaire de validation des accès et des relations
            multi-tenant.
          </p>
        </div>

        <div className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <form action={createTestOwner}>
            <button
              type="submit"
              className="w-full rounded-xl bg-red-500 px-5 py-4 font-semibold text-white transition hover:bg-red-600"
            >
              1. Créer le propriétaire test
            </button>
          </form>

          <form action={createTestProperty}>
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-800 px-5 py-4 font-semibold text-white transition hover:bg-slate-900"
            >
              2. Créer le bien test
            </button>
          </form>

          <form action={createTestUnit}>
            <button
              type="submit"
              className="w-full rounded-xl bg-green-600 px-5 py-4 font-semibold text-white transition hover:bg-green-700"
            >
              3. Créer l&apos;unité test
            </button>
          </form>

          <form action={createTestTenant}>
            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-5 py-4 font-semibold text-white transition hover:bg-blue-700"
            >
              4. Créer le locataire test
            </button>
          </form>

          <form action={createTestLease}>
            <button
              type="submit"
              className="w-full rounded-xl bg-violet-600 px-5 py-4 font-semibold text-white transition hover:bg-violet-700"
            >
              5. Créer le bail test
            </button>
          </form>

          <form action={createTestRentSchedule}>
            <button
              type="submit"
              className="w-full rounded-xl bg-amber-500 px-5 py-4 font-semibold text-white transition hover:bg-amber-600"
            >
              6. Créer l&apos;échéance test
            </button>
          </form>

          <form action={createTestPayment}>
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 px-5 py-4 font-semibold text-white transition hover:bg-emerald-700"
            >
              7. Créer le paiement partiel
            </button>
          </form>

          <form action={createTestReceipt}>
            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 px-5 py-4 font-semibold text-white transition hover:bg-indigo-700"
            >
              8. Créer le reçu test
            </button>
          </form>

          <form action={testAtomicLeaseOverlap}>
            <button
              type="submit"
              className="w-full rounded-xl bg-rose-700 px-5 py-4 font-semibold text-white transition hover:bg-rose-800"
            >
              9. Tester le bail atomique en chevauchement
            </button>
          </form>

          <form action={testAtomicLeaseValid}>
            <button
              type="submit"
              className="w-full rounded-xl bg-cyan-700 px-5 py-4 font-semibold text-white transition hover:bg-cyan-800"
            >
              10. Tester la création atomique valide
            </button>
          </form>

          <form action={testTerminateLeaseEarly}>
            <button
              type="submit"
              className="w-full rounded-xl bg-orange-700 px-5 py-4 font-semibold text-white transition hover:bg-orange-800"
            >
              11. Tester la résiliation anticipée
            </button>
          </form>

          <form action={testQuittanceUnpaidSchedule}>
            <button
              type="submit"
              className="w-full rounded-xl bg-fuchsia-700 px-5 py-4 font-semibold text-white transition hover:bg-fuchsia-800"
            >
              12. Tester la quittance non soldée
            </button>
          </form>

          <form action={createPaidScheduleQuittance}>
            <button
              type="submit"
              className="w-full rounded-xl bg-teal-700 px-5 py-4 font-semibold text-white transition hover:bg-teal-800"
            >
              13. Créer la quittance sur échéance soldée
            </button>
          </form>

          <form action={testCreatePaymentRefundRpc}>
            <button
              type="submit"
              className="w-full rounded-xl bg-purple-700 px-5 py-4 font-semibold text-white transition hover:bg-purple-800"
            >
              14. Tester le remboursement via RPC
            </button>
          </form>

          <form action={testDirectRefundInsertBlocked}>
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-700 px-5 py-4 font-semibold text-white transition hover:bg-slate-800"
            >
              15. Tester l&apos;INSERT direct de remboursement
            </button>
          </form>

          <form action={testCreatePaymentRpc}>
            <button
              type="submit"
              className="w-full rounded-xl bg-blue-700 px-5 py-4 font-semibold text-white transition hover:bg-blue-800"
            >
              16. Tester la création de paiement via RPC
            </button>
          </form>

          <form action={testDirectPaymentInsertBlocked}>
            <button
              type="submit"
              className="w-full rounded-xl bg-red-700 px-5 py-4 font-semibold text-white transition hover:bg-red-800"
            >
              17. Tester l&apos;INSERT direct de paiement
            </button>
          </form>

          <form action={testDirectLeaseInsertBlocked}>
            <button
              type="submit"
              className="w-full rounded-xl bg-rose-800 px-5 py-4 font-semibold text-white transition hover:bg-rose-900"
            >
              18. Tester l&apos;INSERT direct de bail
            </button>
          </form>
        </div>

        <div className="grid gap-6">
          <ResultBlock title="Profiles" data={profiles} />
          <ResultBlock title="Organization Members" data={memberships} />
          <ResultBlock title="Organizations" data={organizations} />
          <ResultBlock title="Owners" data={owners} />
          <ResultBlock title="Properties" data={properties} />
          <ResultBlock title="Units" data={units} />
          <ResultBlock title="Tenants" data={tenants} />
          <ResultBlock title="Leases" data={leases} />
          <ResultBlock title="Rent Schedules" data={rentSchedules} />
          <ResultBlock title="Payments" data={payments} />
          <ResultBlock title="Payment Refunds" data={paymentRefunds} />
          <ResultBlock title="Receipts" data={receipts} />
          <ResultBlock title="Rent Quittances" data={quittances} />
        </div>
      </div>
    </main>
  );
}
