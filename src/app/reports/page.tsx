import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CreditCard,
  Search,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import { createClient } from "@/lib/supabase/server";

function formatXof(value: number) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value)} F CFA`;
}

function formatMonthKey(value: string) {
  return value.slice(0, 7);
}

function formatMonthLabel(monthKey: string) {
  const date = new Date(`${monthKey}-01T00:00:00Z`);

  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export default async function ReportsPage() {
  const supabase = await createClient();

  const now = new Date();
  const currentMonthKey = now.toISOString().slice(0, 7);

  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1)
  );

  const startDate = start.toISOString().slice(0, 10);

  const [
    paymentsResult,
    refundsResult,
    expensesResult,
    schedulesResult,
    propertiesResult,
    unitsResult,
    leasesResult,
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("id, amount, payment_date, status")
      .eq("status", "COMPLETED")
      .gte("payment_date", startDate),

    supabase
      .from("payment_refunds")
      .select("id, payment_id, amount"),

    supabase
      .from("expenses")
      .select("id, amount, expense_date, status")
      .eq("status", "PAID")
      .gte("expense_date", startDate),

    supabase
      .from("rent_schedules")
      .select("id, amount_due, period_start, status")
      .gte("period_start", startDate)
      .neq("status", "CANCELLED"),

    supabase
      .from("properties")
      .select("id, is_active")
      .eq("is_active", true),

    supabase
      .from("units")
      .select("id, is_active")
      .eq("is_active", true),

    supabase
      .from("leases")
      .select(
        "id, unit_id, status, start_date, end_date, effective_end_date"
      )
      .eq("status", "ACTIVE"),
  ]);

  const payments = paymentsResult.data ?? [];
  const refunds = refundsResult.data ?? [];
  const expenses = expensesResult.data ?? [];
  const schedules = schedulesResult.data ?? [];
  const activeProperties = propertiesResult.data ?? [];
  const activeUnits = unitsResult.data ?? [];
  const activeLeases = leasesResult.data ?? [];

  const refundedByPaymentId = new Map<string, number>();

  for (const refund of refunds) {
    refundedByPaymentId.set(
      refund.payment_id,
      (refundedByPaymentId.get(refund.payment_id) ?? 0) +
        Number(refund.amount ?? 0)
    );
  }

  const months: string[] = [];

  for (let offset = 0; offset < 12; offset += 1) {
    const date = new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth() + offset,
        1
      )
    );

    months.push(date.toISOString().slice(0, 7));
  }

  const reportRows = months.map((monthKey) => {
    const monthPayments = payments.filter(
      (payment) => formatMonthKey(payment.payment_date) === monthKey
    );

    const grossCollected = monthPayments.reduce(
      (sum, payment) => sum + Number(payment.amount ?? 0),
      0
    );

    const refunded = monthPayments.reduce(
      (sum, payment) =>
        sum + (refundedByPaymentId.get(payment.id) ?? 0),
      0
    );

    const netCollected = Math.max(grossCollected - refunded, 0);

    const monthExpenses = expenses
      .filter(
        (expense) => formatMonthKey(expense.expense_date) === monthKey
      )
      .reduce(
        (sum, expense) => sum + Number(expense.amount ?? 0),
        0
      );

    const expected = schedules
      .filter(
        (schedule) => formatMonthKey(schedule.period_start) === monthKey
      )
      .reduce(
        (sum, schedule) => sum + Number(schedule.amount_due ?? 0),
        0
      );

    const collectionRate =
      expected > 0
        ? Math.min(Math.round((netCollected / expected) * 100), 100)
        : 0;

    return {
      monthKey,
      label: formatMonthLabel(monthKey),
      expected,
      netCollected,
      expenses: monthExpenses,
      balance: netCollected - monthExpenses,
      collectionRate,
    };
  });

  const totalExpected = reportRows.reduce(
    (sum, row) => sum + row.expected,
    0
  );

  const totalCollected = reportRows.reduce(
    (sum, row) => sum + row.netCollected,
    0
  );

  const totalExpenses = reportRows.reduce(
    (sum, row) => sum + row.expenses,
    0
  );

  const netBalance = totalCollected - totalExpenses;

  const globalCollectionRate =
    totalExpected > 0
      ? Math.min(
          Math.round((totalCollected / totalExpected) * 100),
          100
        )
      : 0;

  const today = now.toISOString().slice(0, 10);

  const occupiedUnitIds = new Set<string>();

  for (const lease of activeLeases) {
    const effectiveEnd =
      lease.effective_end_date ?? lease.end_date;

    if (
      lease.start_date <= today &&
      (!effectiveEnd || effectiveEnd >= today)
    ) {
      occupiedUnitIds.add(lease.unit_id);
    }
  }

  const occupancyRate =
    activeUnits.length > 0
      ? Math.round(
          (occupiedUnitIds.size / activeUnits.length) * 100
        )
      : 0;

  const currentMonth = reportRows.find(
    (row) => row.monthKey === currentMonthKey
  );

  return (
    <div className="h-screen overflow-hidden bg-[#F8FAFC]">
      <div className="flex h-screen">
        <AppSidebar />

        <main className="h-screen flex-1 overflow-y-auto">
          <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur md:px-8">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-red-500">
                Analyse
              </p>

              <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-[#111827]">
                Rapports
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
                  Performance locative
                </h2>

                <p className="mt-1 text-[13px] text-slate-500">
                  Vue consolidée des 12 derniers mois : loyers attendus, encaissements, dépenses et occupation.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Loyers attendus
                    </p>
                    <CalendarDays className="h-5 w-5 text-red-500" />
                  </div>

                  <p className="mt-4 text-[22px] font-extrabold text-slate-900">
                    {formatXof(totalExpected)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Encaissé net
                    </p>
                    <CreditCard className="h-5 w-5 text-emerald-500" />
                  </div>

                  <p className="mt-4 text-[22px] font-extrabold text-slate-900">
                    {formatXof(totalCollected)}
                  </p>

                  <p className="mt-2 text-[11px] font-semibold text-emerald-600">
                    Taux de recouvrement : {globalCollectionRate} %
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Dépenses
                    </p>
                    <WalletCards className="h-5 w-5 text-amber-500" />
                  </div>

                  <p className="mt-4 text-[22px] font-extrabold text-slate-900">
                    {formatXof(totalExpenses)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Solde net
                    </p>

                    {netBalance >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    )}
                  </div>

                  <p
                    className={[
                      "mt-4 text-[22px] font-extrabold",
                      netBalance >= 0
                        ? "text-slate-900"
                        : "text-red-600",
                    ].join(" ")}
                  >
                    {formatXof(netBalance)}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-500">
                      Taux d’occupation actuel
                    </p>

                    <p className="mt-3 text-[30px] font-extrabold text-slate-900">
                      {occupancyRate} %
                    </p>
                  </div>

                  <Building2 className="h-6 w-6 text-red-500" />
                </div>

                <p className="mt-3 text-[12px] text-slate-400">
                  {occupiedUnitIds.size} unité
                  {occupiedUnitIds.size > 1 ? "s" : ""} occupée
                  {occupiedUnitIds.size > 1 ? "s" : ""} sur{" "}
                  {activeUnits.length}.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[13px] font-semibold text-slate-500">
                  Biens actifs
                </p>

                <p className="mt-3 text-[30px] font-extrabold text-slate-900">
                  {activeProperties.length}
                </p>

                <p className="mt-3 text-[12px] text-slate-400">
                  Patrimoine actuellement actif dans Alteract.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[13px] font-semibold text-slate-500">
                  Mois en cours
                </p>

                <p className="mt-3 text-[22px] font-extrabold text-slate-900">
                  {currentMonth
                    ? formatXof(currentMonth.netCollected)
                    : formatXof(0)}
                </p>

                <p className="mt-3 text-[12px] text-slate-400">
                  Encaissé net sur{" "}
                  {currentMonth
                    ? formatXof(currentMonth.expected)
                    : formatXof(0)}{" "}
                  attendu.
                </p>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5">
                <h2 className="text-[18px] font-extrabold text-slate-900">
                  Rapport mensuel
                </h2>

                <p className="mt-1 text-[12px] text-slate-500">
                  Comparatif des 12 derniers mois.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">Période</th>
                      <th className="px-5 py-3">Attendu</th>
                      <th className="px-5 py-3">Encaissé net</th>
                      <th className="px-5 py-3">Dépenses</th>
                      <th className="px-5 py-3">Solde</th>
                      <th className="px-5 py-3 text-right">Recouvrement</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {[...reportRows].reverse().map((row) => (
                      <tr
                        key={row.monthKey}
                        className="text-[13px] text-slate-600 transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4 font-bold capitalize text-slate-900">
                          {row.label}
                        </td>

                        <td className="px-5 py-4 font-medium text-slate-700">
                          {formatXof(row.expected)}
                        </td>

                        <td className="px-5 py-4 font-semibold text-emerald-700">
                          {formatXof(row.netCollected)}
                        </td>

                        <td className="px-5 py-4 font-medium text-amber-700">
                          {formatXof(row.expenses)}
                        </td>

                        <td
                          className={[
                            "px-5 py-4 font-bold",
                            row.balance >= 0
                              ? "text-slate-900"
                              : "text-red-600",
                          ].join(" ")}
                        >
                          {formatXof(row.balance)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span
                            className={[
                              "inline-flex rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ring-inset",
                              row.collectionRate >= 90
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                : row.collectionRate > 0
                                  ? "bg-amber-50 text-amber-700 ring-amber-100"
                                  : "bg-slate-100 text-slate-500 ring-slate-200",
                            ].join(" ")}
                          >
                            {row.collectionRate} %
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
