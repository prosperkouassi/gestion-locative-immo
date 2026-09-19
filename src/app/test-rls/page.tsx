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

  const { data: receipts } = await supabase
    .from("receipts")
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
        </div>

        <div className="grid gap-6">
          <ResultBlock
            title="Profiles"
            data={profiles}
          />

          <ResultBlock
            title="Organization Members"
            data={memberships}
          />

          <ResultBlock
            title="Organizations"
            data={organizations}
          />

          <ResultBlock
            title="Owners"
            data={owners}
          />

          <ResultBlock
            title="Properties"
            data={properties}
          />

          <ResultBlock
            title="Units"
            data={units}
          />

          <ResultBlock
            title="Tenants"
            data={tenants}
          />

          <ResultBlock
            title="Leases"
            data={leases}
          />

          <ResultBlock
            title="Rent Schedules"
            data={rentSchedules}
          />

          <ResultBlock
            title="Payments"
            data={payments}
          />

          <ResultBlock
            title="Receipts"
            data={receipts}
          />
        </div>
      </div>
    </main>
  );
}