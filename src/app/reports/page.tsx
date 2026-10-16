import {
  BarChart3,
  Building2,
  CalendarDays,
  CreditCard,
  Landmark,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import { requireRoles } from "@/lib/auth/access";

type ReportsPageProps = {
  searchParams?: Promise<{
    months?: string;
    property?: string;
  }>;
};

type PropertyRow = {
  id: string;
  name: string;
  is_active: boolean;
};

type UnitRow = {
  id: string;
  property_id: string;
  name: string;
  is_active: boolean;
};

type LeaseRow = {
  id: string;
  unit_id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  effective_end_date: string | null;
};

type ScheduleRow = {
  id: string;
  lease_id: string;
  amount_due: number | string | null;
  period_start: string;
  due_date: string;
  status: string;
};

type PaymentRow = {
  id: string;
  rent_schedule_id: string;
  amount: number | string | null;
  payment_date: string;
  status: string;
};

type RefundRow = {
  id: string;
  payment_id: string;
  amount: number | string | null;
};

type ExpenseRow = {
  id: string;
  property_id: string | null;
  unit_id: string | null;
  amount: number | string | null;
  expense_date: string;
  status: string;
};

const MONTH_OPTIONS = [3, 6, 12, 24] as const;

function formatXof(value: number) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(Math.round(value))} F CFA`;
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

function parseMonths(value: string | undefined) {
  const parsed = Number(value);

  if (MONTH_OPTIONS.includes(parsed as (typeof MONTH_OPTIONS)[number])) {
    return parsed;
  }

  return 12;
}

function getStartDate(months: number, now: Date) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1)
  );
}

function getMonthKeys(months: number, start: Date) {
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1)
    );

    return date.toISOString().slice(0, 7);
  });
}

function clampPercentage(value: number) {
  return Math.max(0, Math.min(Math.round(value), 100));
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const { supabase } = await requireRoles([
    "ADMIN_AGENCY",
    "MANAGER",
    "OWNER",
  ]);

  const params = (await searchParams) ?? {};
  const monthsCount = parseMonths(params.months);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentMonthKey = now.toISOString().slice(0, 7);
  const start = getStartDate(monthsCount, now);
  const startDate = start.toISOString().slice(0, 10);
  const monthKeys = getMonthKeys(monthsCount, start);

  const [propertiesResult, unitsResult, leasesResult] = await Promise.all([
    supabase
      .from("properties")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true }),

    supabase
      .from("units")
      .select("id, property_id, name, is_active")
      .eq("is_active", true),

    supabase
      .from("leases")
      .select("id, unit_id, status, start_date, end_date, effective_end_date"),
  ]);

  const properties = (propertiesResult.data ?? []) as PropertyRow[];
  const units = (unitsResult.data ?? []) as UnitRow[];
  const leases = (leasesResult.data ?? []) as LeaseRow[];

  const visiblePropertyIds = new Set(
    properties.map((property) => property.id)
  );

  const requestedPropertyId = params.property ?? "";
  const selectedPropertyId =
    requestedPropertyId && visiblePropertyIds.has(requestedPropertyId)
      ? requestedPropertyId
      : "";

  const selectedProperty =
    properties.find((property) => property.id === selectedPropertyId) ?? null;

  const targetUnits = selectedPropertyId
    ? units.filter((unit) => unit.property_id === selectedPropertyId)
    : units;

  const targetUnitIds = new Set(targetUnits.map((unit) => unit.id));

  const targetLeases = leases.filter((lease) =>
    targetUnitIds.has(lease.unit_id)
  );

  const targetLeaseIds = new Set(targetLeases.map((lease) => lease.id));

  const schedulesResult = await supabase
    .from("rent_schedules")
    .select("id, lease_id, amount_due, period_start, due_date, status")
    .gte("period_start", startDate)
    .neq("status", "CANCELLED");

  const schedules = ((schedulesResult.data ?? []) as ScheduleRow[]).filter(
    (schedule) => targetLeaseIds.has(schedule.lease_id)
  );

  const scheduleIds = schedules.map((schedule) => schedule.id);

  const paymentsResult =
    scheduleIds.length > 0
      ? await supabase
          .from("payments")
          .select("id, rent_schedule_id, amount, payment_date, status")
          .in("rent_schedule_id", scheduleIds)
          .eq("status", "COMPLETED")
      : { data: [] as PaymentRow[] };

  const payments = (paymentsResult.data ?? []) as PaymentRow[];
  const paymentIds = payments.map((payment) => payment.id);

  const refundsResult =
    paymentIds.length > 0
      ? await supabase
          .from("payment_refunds")
          .select("id, payment_id, amount")
          .in("payment_id", paymentIds)
      : { data: [] as RefundRow[] };

  const refunds = (refundsResult.data ?? []) as RefundRow[];

  const expensesResult = await supabase
    .from("expenses")
    .select("id, property_id, unit_id, amount, expense_date, status")
    .eq("status", "PAID")
    .gte("expense_date", startDate);

  const allExpenses = (expensesResult.data ?? []) as ExpenseRow[];

  const expenses = selectedPropertyId
    ? allExpenses.filter(
        (expense) =>
          expense.property_id === selectedPropertyId ||
          (expense.unit_id ? targetUnitIds.has(expense.unit_id) : false)
      )
    : allExpenses;

  const refundsByPaymentId = new Map<string, number>();

  for (const refund of refunds) {
    refundsByPaymentId.set(
      refund.payment_id,
      (refundsByPaymentId.get(refund.payment_id) ?? 0) +
        Number(refund.amount ?? 0)
    );
  }

  const netPaidByScheduleId = new Map<string, number>();

  for (const payment of payments) {
    const netAmount = Math.max(
      Number(payment.amount ?? 0) -
        (refundsByPaymentId.get(payment.id) ?? 0),
      0
    );

    netPaidByScheduleId.set(
      payment.rent_schedule_id,
      (netPaidByScheduleId.get(payment.rent_schedule_id) ?? 0) + netAmount
    );
  }

  const reportRows = monthKeys.map((monthKey) => {
    const monthSchedules = schedules.filter(
      (schedule) => formatMonthKey(schedule.period_start) === monthKey
    );

    const expected = monthSchedules.reduce(
      (sum, schedule) => sum + Number(schedule.amount_due ?? 0),
      0
    );

    const monthPayments = payments.filter(
      (payment) => formatMonthKey(payment.payment_date) === monthKey
    );

    const grossCollected = monthPayments.reduce(
      (sum, payment) => sum + Number(payment.amount ?? 0),
      0
    );

    const refunded = monthPayments.reduce(
      (sum, payment) =>
        sum + (refundsByPaymentId.get(payment.id) ?? 0),
      0
    );

    const netCollected = Math.max(grossCollected - refunded, 0);

    const monthExpenses = expenses
      .filter((expense) => formatMonthKey(expense.expense_date) === monthKey)
      .reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);

    const collectionRate =
      expected > 0
        ? clampPercentage((netCollected / expected) * 100)
        : 0;

    return {
      monthKey,
      label: formatMonthLabel(monthKey),
      expected,
      grossCollected,
      refunded,
      netCollected,
      expenses: monthExpenses,
      balance: netCollected - monthExpenses,
      collectionRate,
    };
  });

  const totalExpected = reportRows.reduce((sum, row) => sum + row.expected, 0);
  const totalGrossCollected = reportRows.reduce(
    (sum, row) => sum + row.grossCollected,
    0
  );
  const totalRefunded = reportRows.reduce((sum, row) => sum + row.refunded, 0);
  const totalCollected = reportRows.reduce(
    (sum, row) => sum + row.netCollected,
    0
  );
  const totalExpenses = reportRows.reduce((sum, row) => sum + row.expenses, 0);
  const netBalance = totalCollected - totalExpenses;

  const globalCollectionRate =
    totalExpected > 0
      ? clampPercentage((totalCollected / totalExpected) * 100)
      : 0;

  const occupiedUnitIds = new Set<string>();

  for (const lease of targetLeases) {
    const effectiveEnd = lease.effective_end_date ?? lease.end_date;

    if (
      lease.status === "ACTIVE" &&
      lease.start_date <= today &&
      (!effectiveEnd || effectiveEnd >= today)
    ) {
      occupiedUnitIds.add(lease.unit_id);
    }
  }

  const occupancyRate =
    targetUnits.length > 0
      ? clampPercentage((occupiedUnitIds.size / targetUnits.length) * 100)
      : 0;

  const overdueSchedules = schedules.filter(
    (schedule) =>
      schedule.due_date < today &&
      schedule.status !== "PAID" &&
      schedule.status !== "CANCELLED"
  );

  const overdueAmount = overdueSchedules.reduce((sum, schedule) => {
    const due = Number(schedule.amount_due ?? 0);
    const paid = netPaidByScheduleId.get(schedule.id) ?? 0;

    return sum + Math.max(due - paid, 0);
  }, 0);

  const currentMonth = reportRows.find(
    (row) => row.monthKey === currentMonthKey
  );

  const propertyPerformance = properties
    .map((property) => {
      const propertyUnits = units.filter(
        (unit) => unit.property_id === property.id
      );

      const propertyUnitIds = new Set(propertyUnits.map((unit) => unit.id));

      const propertyLeaseIds = new Set(
        leases
          .filter((lease) => propertyUnitIds.has(lease.unit_id))
          .map((lease) => lease.id)
      );

      const propertySchedules = schedules.filter((schedule) =>
        propertyLeaseIds.has(schedule.lease_id)
      );

      const propertyScheduleIds = new Set(
        propertySchedules.map((schedule) => schedule.id)
      );

      const propertyPayments = payments.filter((payment) =>
        propertyScheduleIds.has(payment.rent_schedule_id)
      );

      const expected = propertySchedules.reduce(
        (sum, schedule) => sum + Number(schedule.amount_due ?? 0),
        0
      );

      const collected = propertyPayments.reduce(
        (sum, payment) =>
          sum +
          Math.max(
            Number(payment.amount ?? 0) -
              (refundsByPaymentId.get(payment.id) ?? 0),
            0
          ),
        0
      );

      return {
        id: property.id,
        name: property.name,
        expected,
        collected,
        rate:
          expected > 0
            ? clampPercentage((collected / expected) * 100)
            : 0,
      };
    })
    .filter((item) => !selectedPropertyId || item.id === selectedPropertyId)
    .sort((a, b) => b.collected - a.collected);

  const chartMaximum = Math.max(
    ...reportRows.flatMap((row) => [row.expected, row.netCollected, row.expenses]),
    1
  );

  return (
    <div className="h-screen overflow-hidden bg-[#F8FAFC]">
      <div className="flex h-screen">
        <AppSidebar />

        <main className="h-screen flex-1 overflow-y-auto">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur md:px-8">
            <div className="flex flex-col gap-1">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-red-500">
                Pilotage
              </p>
              <h1 className="text-[24px] font-extrabold tracking-tight text-[#111827]">
                Rapports
              </h1>
              <p className="text-[12px] text-slate-500">
                Analyse des loyers, encaissements, dépenses, impayés et taux
                d&apos;occupation.
              </p>
            </div>
          </header>

          <div className="space-y-6 p-5 md:p-8">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-[16px] font-extrabold text-slate-900">
                    Filtres d&apos;analyse
                  </h2>
                  <p className="mt-1 text-[12px] text-slate-500">
                    Les résultats tiennent compte de vos droits d&apos;accès et
                    des données visibles pour votre rôle.
                  </p>
                </div>
              </div>

              <form
                method="get"
                className="grid gap-3 md:grid-cols-[180px_minmax(240px,1fr)_auto]"
              >
                <label className="space-y-1.5">
                  <span className="text-[12px] font-semibold text-slate-600">
                    Période
                  </span>
                  <select
                    name="months"
                    defaultValue={String(monthsCount)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-700 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                  >
                    {MONTH_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value} derniers mois
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-[12px] font-semibold text-slate-600">
                    Bien
                  </span>
                  <select
                    name="property"
                    defaultValue={selectedPropertyId}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-700 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                  >
                    <option value="">Tous les biens</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="submit"
                  className="mt-auto h-11 rounded-xl bg-red-500 px-5 text-[13px] font-bold text-white transition hover:bg-red-600"
                >
                  Appliquer
                </button>
              </form>

              <p className="mt-3 text-[11px] text-slate-400">
                Vue actuelle :{" "}
                <span className="font-semibold text-slate-600">
                  {selectedProperty?.name ?? "Tous les biens"}
                </span>{" "}
                · {monthsCount} mois
              </p>
            </section>

            <section>
              <div className="mb-4">
                <h2 className="text-[20px] font-extrabold text-slate-900">
                  Performance locative
                </h2>
                <p className="mt-1 text-[13px] text-slate-500">
                  Synthèse financière sur la période sélectionnée.
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
                    Recouvrement : {globalCollectionRate} %
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Dépenses payées
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
                      netBalance >= 0 ? "text-slate-900" : "text-red-600",
                    ].join(" ")}
                  >
                    {formatXof(netBalance)}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-500">
                      Taux d&apos;occupation
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
                  {occupiedUnitIds.size > 1 ? "s" : ""} sur {targetUnits.length}.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[13px] font-semibold text-slate-500">
                  Échéances en retard
                </p>
                <p className="mt-3 text-[30px] font-extrabold text-red-600">
                  {overdueSchedules.length}
                </p>
                <p className="mt-3 text-[12px] text-slate-400">
                  Montant restant estimé :{" "}
                  <span className="font-semibold text-red-600">
                    {formatXof(overdueAmount)}
                  </span>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[13px] font-semibold text-slate-500">
                  Remboursements
                </p>
                <p className="mt-3 text-[24px] font-extrabold text-slate-900">
                  {formatXof(totalRefunded)}
                </p>
                <p className="mt-3 text-[12px] text-slate-400">
                  Sur {formatXof(totalGrossCollected)} encaissés bruts.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[13px] font-semibold text-slate-500">
                  Mois en cours
                </p>
                <p className="mt-3 text-[24px] font-extrabold text-slate-900">
                  {formatXof(currentMonth?.netCollected ?? 0)}
                </p>
                <p className="mt-3 text-[12px] text-slate-400">
                  Sur {formatXof(currentMonth?.expected ?? 0)} attendu.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[18px] font-extrabold text-slate-900">
                    Évolution mensuelle
                  </h2>
                  <p className="mt-1 text-[12px] text-slate-500">
                    Comparaison visuelle des loyers attendus, encaissés nets et
                    dépenses.
                  </p>
                </div>
                <Landmark className="h-5 w-5 text-slate-400" />
              </div>

              <div className="mt-6 space-y-5">
                {reportRows.map((row) => (
                  <div
                    key={row.monthKey}
                    className="grid gap-2 md:grid-cols-[90px_1fr]"
                  >
                    <div className="text-[12px] font-bold capitalize text-slate-600">
                      {row.label}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-slate-300"
                            style={{
                              width: `${Math.max(
                                (row.expected / chartMaximum) * 100,
                                row.expected > 0 ? 2 : 0
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="w-28 text-right text-[10px] font-semibold text-slate-400">
                          Attendu
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{
                              width: `${Math.max(
                                (row.netCollected / chartMaximum) * 100,
                                row.netCollected > 0 ? 2 : 0
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="w-28 text-right text-[10px] font-semibold text-emerald-600">
                          Encaissé
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-amber-500"
                            style={{
                              width: `${Math.max(
                                (row.expenses / chartMaximum) * 100,
                                row.expenses > 0 ? 2 : 0
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="w-28 text-right text-[10px] font-semibold text-amber-600">
                          Dépenses
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5">
                <h2 className="text-[18px] font-extrabold text-slate-900">
                  Rapport mensuel
                </h2>
                <p className="mt-1 text-[12px] text-slate-500">
                  Détail financier de la période sélectionnée.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">Période</th>
                      <th className="px-5 py-3">Attendu</th>
                      <th className="px-5 py-3">Brut</th>
                      <th className="px-5 py-3">Remboursé</th>
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
                        <td className="px-5 py-4 font-medium text-slate-700">
                          {formatXof(row.grossCollected)}
                        </td>
                        <td className="px-5 py-4 font-medium text-red-600">
                          {formatXof(row.refunded)}
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
                            row.balance >= 0 ? "text-slate-900" : "text-red-600",
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

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5">
                <h2 className="text-[18px] font-extrabold text-slate-900">
                  Performance par bien
                </h2>
                <p className="mt-1 text-[12px] text-slate-500">
                  Loyers attendus et encaissés sur la période sélectionnée.
                </p>
              </div>

              {propertyPerformance.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {propertyPerformance.map((property) => (
                    <div
                      key={property.id}
                      className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center"
                    >
                      <div>
                        <p className="text-[13px] font-bold text-slate-900">
                          {property.name}
                        </p>
                      </div>

                      <div className="text-[12px] text-slate-500">
                        Attendu{" "}
                        <span className="font-bold text-slate-700">
                          {formatXof(property.expected)}
                        </span>
                      </div>

                      <div className="text-[12px] text-slate-500">
                        Encaissé{" "}
                        <span className="font-bold text-emerald-700">
                          {formatXof(property.collected)}
                        </span>
                      </div>

                      <span
                        className={[
                          "w-fit rounded-lg px-2.5 py-1.5 text-[12px] font-bold ring-1 ring-inset",
                          property.rate >= 90
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                            : property.rate > 0
                              ? "bg-amber-50 text-amber-700 ring-amber-100"
                              : "bg-slate-100 text-slate-500 ring-slate-200",
                        ].join(" ")}
                      >
                        {property.rate} %
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-10 text-center text-[13px] text-slate-400">
                  Aucune donnée disponible pour cette sélection.
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
