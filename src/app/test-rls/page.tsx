import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import {
  testAtomicLeaseOverlap,
  testDirectRefundInsertBlocked,
  testDirectPaymentInsertBlocked,
  testDirectLeaseInsertBlocked,
} from "./actions";

type CountCardProps = {
  label: string;
  value: number | null;
};

function CountCard({ label, value }: CountCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">
        {value ?? 0}
      </p>
    </div>
  );
}

export default async function TestRlsPage() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } =
    await supabase
      .from("organization_members")
      .select("organization_id, role, is_active")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

  if (
    membershipError ||
    !membership ||
    !["ADMIN_AGENCY", "MANAGER"].includes(membership.role)
  ) {
    redirect("/dashboard");
  }

  const [
    ownersResult,
    propertiesResult,
    unitsResult,
    tenantsResult,
    leasesResult,
    schedulesResult,
    paymentsResult,
    refundsResult,
    receiptsResult,
    quittancesResult,
  ] = await Promise.all([
    supabase
      .from("owners")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("units")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("tenants")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("leases")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("rent_schedules")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("payment_refunds")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("receipts")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("rent_quittances")
      .select("id", { count: "exact", head: true }),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-red-500">
            Développement uniquement
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Contrôles de sécurité Alteract
          </h1>

          <p className="mt-3 max-w-3xl text-slate-600">
            Cette page temporaire conserve uniquement des tests négatifs
            utiles pour vérifier que les écritures directes sensibles restent
            bloquées et que les protections métier principales sont actives.
          </p>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Accès réservé aux rôles ADMIN_AGENCY et MANAGER. Cette page devra
            être supprimée avant la mise en production.
          </div>
        </div>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">
            Tests de sécurité conservés
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <form action={testAtomicLeaseOverlap}>
              <button
                type="submit"
                className="w-full rounded-xl bg-rose-700 px-5 py-4 font-semibold text-white transition hover:bg-rose-800"
              >
                1. Vérifier le blocage des baux en chevauchement
              </button>
            </form>

            <form action={testDirectRefundInsertBlocked}>
              <button
                type="submit"
                className="w-full rounded-xl bg-slate-800 px-5 py-4 font-semibold text-white transition hover:bg-slate-900"
              >
                2. Vérifier l&apos;INSERT direct de remboursement
              </button>
            </form>

            <form action={testDirectPaymentInsertBlocked}>
              <button
                type="submit"
                className="w-full rounded-xl bg-red-700 px-5 py-4 font-semibold text-white transition hover:bg-red-800"
              >
                3. Vérifier l&apos;INSERT direct de paiement
              </button>
            </form>

            <form action={testDirectLeaseInsertBlocked}>
              <button
                type="submit"
                className="w-full rounded-xl bg-orange-700 px-5 py-4 font-semibold text-white transition hover:bg-orange-800"
              >
                4. Vérifier l&apos;INSERT direct de bail
              </button>
            </form>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-slate-900">
            Données visibles via le RLS
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <CountCard label="Propriétaires" value={ownersResult.count} />
            <CountCard label="Biens" value={propertiesResult.count} />
            <CountCard label="Unités" value={unitsResult.count} />
            <CountCard label="Locataires" value={tenantsResult.count} />
            <CountCard label="Baux" value={leasesResult.count} />
            <CountCard label="Échéances" value={schedulesResult.count} />
            <CountCard label="Paiements" value={paymentsResult.count} />
            <CountCard label="Remboursements" value={refundsResult.count} />
            <CountCard label="Reçus" value={receiptsResult.count} />
            <CountCard label="Quittances" value={quittancesResult.count} />
          </div>
        </section>
      </div>
    </main>
  );
}
