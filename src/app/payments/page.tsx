import {
  Bell,
  Building2,
  CalendarDays,
  CreditCard,
  Home,
  ReceiptText,
  Search,
  UserRound,
  WalletCards,
} from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import { createClient } from "@/lib/supabase/server";

function formatXof(value: number) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value)} F CFA`;
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatTenantName(
  firstName: string | null,
  lastName: string | null
) {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "Locataire";
}

function formatPaymentMethod(method: string | null) {
  switch (method) {
    case "CASH":
      return "Espèces";
    case "BANK_TRANSFER":
      return "Virement";
    case "MOBILE_MONEY":
      return "Mobile Money";
    case "CARD":
      return "Carte";
    case "CHEQUE":
      return "Chèque";
    case "OTHER":
      return "Autre";
    default:
      return "—";
  }
}

function getPaymentStatus(status: string) {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Complété",
        className:
          "bg-emerald-50 text-emerald-700 ring-emerald-100",
      };

    case "PENDING":
      return {
        label: "En attente",
        className:
          "bg-amber-50 text-amber-700 ring-amber-100",
      };

    case "CANCELLED":
      return {
        label: "Annulé",
        className:
          "bg-slate-100 text-slate-500 ring-slate-200",
      };

    case "REFUNDED":
      return {
        label: "Remboursé",
        className:
          "bg-red-50 text-red-600 ring-red-100",
      };

    default:
      return {
        label: status,
        className:
          "bg-slate-100 text-slate-600 ring-slate-200",
      };
  }
}

export default async function PaymentsPage() {
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select(
      "id, schedule_id, amount, currency, payment_date, method, status, reference, created_at"
    )
    .order("payment_date", { ascending: false });

  const paymentRows = payments ?? [];
  const paymentIds = paymentRows.map((payment) => payment.id);
  const scheduleIds = Array.from(
    new Set(paymentRows.map((payment) => payment.schedule_id))
  );

  const [refundsResult, schedulesResult] = await Promise.all([
    paymentIds.length > 0
      ? supabase
          .from("payment_refunds")
          .select("id, payment_id, amount")
          .in("payment_id", paymentIds)
      : Promise.resolve({ data: [] }),

    scheduleIds.length > 0
      ? supabase
          .from("rent_schedules")
          .select("id, lease_id, period_start, period_end, due_date")
          .in("id", scheduleIds)
      : Promise.resolve({ data: [] }),
  ]);

  const refunds = refundsResult.data ?? [];
  const schedules = schedulesResult.data ?? [];

  const refundedByPaymentId = new Map<string, number>();

  for (const refund of refunds) {
    refundedByPaymentId.set(
      refund.payment_id,
      (refundedByPaymentId.get(refund.payment_id) ?? 0) +
        Number(refund.amount ?? 0)
    );
  }

  const leaseIds = Array.from(
    new Set(schedules.map((schedule) => schedule.lease_id))
  );

  const { data: leases } =
    leaseIds.length > 0
      ? await supabase
          .from("leases")
          .select("id, tenant_id, unit_id")
          .in("id", leaseIds)
      : { data: [] };

  const leaseRows = leases ?? [];
  const tenantIds = Array.from(
    new Set(leaseRows.map((lease) => lease.tenant_id))
  );
  const unitIds = Array.from(
    new Set(leaseRows.map((lease) => lease.unit_id))
  );

  const [tenantsResult, unitsResult] = await Promise.all([
    tenantIds.length > 0
      ? supabase
          .from("tenants")
          .select("id, first_name, last_name")
          .in("id", tenantIds)
      : Promise.resolve({ data: [] }),

    unitIds.length > 0
      ? supabase
          .from("units")
          .select("id, property_id, name")
          .in("id", unitIds)
      : Promise.resolve({ data: [] }),
  ]);

  const tenants = tenantsResult.data ?? [];
  const units = unitsResult.data ?? [];

  const propertyIds = Array.from(
    new Set(
      units
        .map((unit) => unit.property_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const { data: properties } =
    propertyIds.length > 0
      ? await supabase
          .from("properties")
          .select("id, name, address, city")
          .in("id", propertyIds)
      : { data: [] };

  const scheduleMap = new Map(
    schedules.map((schedule) => [schedule.id, schedule])
  );

  const leaseMap = new Map(
    leaseRows.map((lease) => [lease.id, lease])
  );

  const tenantMap = new Map(
    tenants.map((tenant) => [tenant.id, tenant])
  );

  const unitMap = new Map(
    units.map((unit) => [unit.id, unit])
  );

  const propertyMap = new Map(
    (properties ?? []).map((property) => [
      property.id,
      property,
    ])
  );

  const rows = paymentRows.map((payment) => {
    const schedule = scheduleMap.get(payment.schedule_id);
    const lease = schedule
      ? leaseMap.get(schedule.lease_id)
      : undefined;
    const tenant = lease
      ? tenantMap.get(lease.tenant_id)
      : undefined;
    const unit = lease
      ? unitMap.get(lease.unit_id)
      : undefined;
    const property = unit
      ? propertyMap.get(unit.property_id)
      : undefined;

    const refundedAmount =
      refundedByPaymentId.get(payment.id) ?? 0;

    const grossAmount = Number(payment.amount ?? 0);
    const netAmount = Math.max(grossAmount - refundedAmount, 0);

    return {
      id: payment.id,
      reference: payment.reference || payment.id.slice(0, 8).toUpperCase(),
      paymentDate: payment.payment_date,
      method: formatPaymentMethod(payment.method),
      status: payment.status,
      grossAmount,
      refundedAmount,
      netAmount,
      tenantName: tenant
        ? formatTenantName(
            tenant.first_name,
            tenant.last_name
          )
        : "Locataire non renseigné",
      unitName: unit?.name ?? "Unité non renseignée",
      propertyName: property?.name ?? "Bien non renseigné",
      propertyLocation:
        property?.address ||
        property?.city ||
        "Adresse non renseignée",
      periodStart: schedule?.period_start ?? null,
      periodEnd: schedule?.period_end ?? null,
    };
  });

  const completedPayments = paymentRows.filter(
    (payment) => payment.status === "COMPLETED"
  );

  const pendingCount = paymentRows.filter(
    (payment) => payment.status === "PENDING"
  ).length;

  const completedGross = completedPayments.reduce(
    (sum, payment) => sum + Number(payment.amount ?? 0),
    0
  );

  const totalRefunded = refunds.reduce(
    (sum, refund) => sum + Number(refund.amount ?? 0),
    0
  );

  const completedNet = Math.max(
    completedGross - totalRefunded,
    0
  );

  return (
    <div className="h-screen overflow-hidden bg-[#F8FAFC]">
      <div className="flex h-screen">
        <AppSidebar />

        <main className="h-screen flex-1 overflow-y-auto">
          <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur md:px-8">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-red-500">
                Gestion locative
              </p>

              <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-[#111827]">
                Paiements
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
              >
                <Search className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
              </button>
            </div>
          </header>

          <div className="space-y-6 p-5 md:p-8">
            <section>
              <div className="mb-4">
                <h2 className="text-[20px] font-extrabold text-slate-900">
                  Suivi des encaissements
                </h2>

                <p className="mt-1 text-[13px] text-slate-500">
                  Consultez les paiements enregistrés, les remboursements et les montants nets encaissés.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Paiements
                    </p>
                    <CreditCard className="h-5 w-5 text-red-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {paymentRows.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      En attente
                    </p>
                    <CalendarDays className="h-5 w-5 text-amber-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {pendingCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Encaissé brut
                    </p>
                    <WalletCards className="h-5 w-5 text-emerald-500" />
                  </div>

                  <p className="mt-4 text-[22px] font-extrabold text-slate-900">
                    {formatXof(completedGross)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Encaissé net
                    </p>
                    <ReceiptText className="h-5 w-5 text-red-500" />
                  </div>

                  <p className="mt-4 text-[22px] font-extrabold text-slate-900">
                    {formatXof(completedNet)}
                  </p>

                  {totalRefunded > 0 && (
                    <p className="mt-2 text-[11px] font-medium text-red-500">
                      {formatXof(totalRefunded)} remboursé
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[18px] font-extrabold text-slate-900">
                    Liste des paiements
                  </h2>

                  <p className="mt-1 text-[12px] text-slate-500">
                    {rows.length} paiement
                    {rows.length > 1 ? "s" : ""} enregistré
                    {rows.length > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="relative w-full sm:w-[300px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    placeholder="Rechercher un paiement..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {rows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-3">Paiement</th>
                        <th className="px-5 py-3">Locataire</th>
                        <th className="px-5 py-3">Logement</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Mode</th>
                        <th className="px-5 py-3">Montant net</th>
                        <th className="px-5 py-3 text-right">Statut</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {rows.map((payment) => {
                        const status =
                          getPaymentStatus(payment.status);

                        return (
                          <tr
                            key={payment.id}
                            className="text-[13px] text-slate-600 transition hover:bg-slate-50/70"
                          >
                            <td className="px-5 py-4">
                              <p className="font-bold text-slate-900">
                                {payment.reference}
                              </p>

                              {payment.periodStart &&
                                payment.periodEnd && (
                                  <p className="mt-1 text-[11px] text-slate-400">
                                    Échéance du{" "}
                                    {formatDate(payment.periodStart)} au{" "}
                                    {formatDate(payment.periodEnd)}
                                  </p>
                                )}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <UserRound className="h-4 w-4 text-slate-400" />
                                <span className="font-semibold text-slate-800">
                                  {payment.tenantName}
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-start gap-2">
                                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                                <div>
                                  <p className="font-semibold text-slate-800">
                                    {payment.propertyName}
                                  </p>

                                  <div className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500">
                                    <Home className="h-3.5 w-3.5" />
                                    <span>{payment.unitName}</span>
                                  </div>

                                  <p className="mt-1 max-w-[220px] truncate text-[11px] text-slate-400">
                                    {payment.propertyLocation}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4 font-medium text-slate-700">
                              {formatDate(payment.paymentDate)}
                            </td>

                            <td className="px-5 py-4">
                              {payment.method}
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-bold text-slate-900">
                                {formatXof(payment.netAmount)}
                              </p>

                              {payment.refundedAmount > 0 && (
                                <p className="mt-1 text-[11px] text-red-500">
                                  Remboursé :{" "}
                                  {formatXof(payment.refundedAmount)}
                                </p>
                              )}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <span
                                className={[
                                  "inline-flex rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ring-inset",
                                  status.className,
                                ].join(" ")}
                              >
                                {status.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center px-5 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
                    <CreditCard className="h-6 w-6 text-red-500" />
                  </div>

                  <h3 className="mt-4 text-[16px] font-bold text-slate-900">
                    Aucun paiement
                  </h3>

                  <p className="mt-1 max-w-md text-[13px] text-slate-500">
                    Les paiements enregistrés apparaîtront ici.
                  </p>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
