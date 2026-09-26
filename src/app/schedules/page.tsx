import Link from "next/link";
import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Home,
  Search,
  UserRound,
  WalletCards,
} from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 10;

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

function formatPeriod(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);

  const formatter = new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  const startLabel = formatter.format(startDate);
  const endLabel = formatter.format(endDate);

  return startLabel === endLabel
    ? startLabel
    : `${startLabel} → ${endLabel}`;
}

function formatTenantName(
  firstName: string | null,
  lastName: string | null
) {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "Locataire";
}

function getScheduleStatus(status: string) {
  switch (status) {
    case "PAID":
      return {
        label: "Payée",
        className:
          "bg-emerald-50 text-emerald-700 ring-emerald-100",
      };

    case "PARTIALLY_PAID":
      return {
        label: "Partielle",
        className:
          "bg-amber-50 text-amber-700 ring-amber-100",
      };

    case "OVERDUE":
      return {
        label: "En retard",
        className:
          "bg-red-50 text-red-600 ring-red-100",
      };

    case "CANCELLED":
      return {
        label: "Annulée",
        className:
          "bg-slate-100 text-slate-500 ring-slate-200",
      };

    case "PENDING":
    default:
      return {
        label: "À venir",
        className:
          "bg-slate-100 text-slate-600 ring-slate-200",
      };
  }
}

type SchedulesPageProps = {
  searchParams: Promise<{
    page?: string;
  }>;
};

export default async function SchedulesPage({
  searchParams,
}: SchedulesPageProps) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);

  const supabase = await createClient();

  const { data: schedules } = await supabase
    .from("rent_schedules")
    .select(
      "id, lease_id, amount_due, currency, status, period_start, period_end, due_date"
    )
    .order("due_date", { ascending: true });

  const scheduleRows = schedules ?? [];

  const leaseIds = Array.from(
    new Set(scheduleRows.map((schedule) => schedule.lease_id))
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

  const rows = scheduleRows.map((schedule) => {
    const lease = leaseMap.get(schedule.lease_id);
    const tenant = lease
      ? tenantMap.get(lease.tenant_id)
      : undefined;
    const unit = lease
      ? unitMap.get(lease.unit_id)
      : undefined;
    const property = unit
      ? propertyMap.get(unit.property_id)
      : undefined;

    return {
      id: schedule.id,
      amountDue: Number(schedule.amount_due ?? 0),
      status: schedule.status,
      periodStart: schedule.period_start,
      periodEnd: schedule.period_end,
      dueDate: schedule.due_date,
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
    };
  });

  const pendingCount = scheduleRows.filter(
    (schedule) => schedule.status === "PENDING"
  ).length;

  const paidCount = scheduleRows.filter(
    (schedule) => schedule.status === "PAID"
  ).length;

  const overdueCount = scheduleRows.filter(
    (schedule) => schedule.status === "OVERDUE"
  ).length;

  const totalDue = scheduleRows
    .filter((schedule) => schedule.status !== "CANCELLED")
    .reduce(
      (sum, schedule) => sum + Number(schedule.amount_due ?? 0),
      0
    );

  const totalPages = Math.max(
    1,
    Math.ceil(rows.length / PAGE_SIZE)
  );

  const normalizedRequestedPage = Number.isFinite(requestedPage)
    ? requestedPage
    : 1;

  const currentPage = Math.min(
    Math.max(normalizedRequestedPage, 1),
    totalPages
  );

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;

  const paginatedRows = rows.slice(startIndex, endIndex);

  const firstVisibleItem =
    rows.length === 0 ? 0 : startIndex + 1;

  const lastVisibleItem = Math.min(endIndex, rows.length);

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
                Échéances
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
                  Calendrier des loyers
                </h2>

                <p className="mt-1 text-[13px] text-slate-500">
                  Consultez les échéances générées par les baux et leur état de paiement.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      À venir
                    </p>
                    <Clock3 className="h-5 w-5 text-slate-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {pendingCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Payées
                    </p>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {paidCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      En retard
                    </p>
                    <CalendarDays className="h-5 w-5 text-red-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {overdueCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Montant planifié
                    </p>
                    <WalletCards className="h-5 w-5 text-red-500" />
                  </div>

                  <p className="mt-4 text-[22px] font-extrabold text-slate-900">
                    {formatXof(totalDue)}
                  </p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[18px] font-extrabold text-slate-900">
                    Liste des échéances
                  </h2>

                  <p className="mt-1 text-[12px] text-slate-500">
                    {rows.length} échéance
                    {rows.length > 1 ? "s" : ""} enregistrée
                    {rows.length > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="relative w-full sm:w-[300px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    placeholder="Rechercher une échéance..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {rows.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                          <th className="px-5 py-3">Locataire</th>
                          <th className="px-5 py-3">Logement</th>
                          <th className="px-5 py-3">Période</th>
                          <th className="px-5 py-3">Échéance</th>
                          <th className="px-5 py-3">Montant</th>
                          <th className="px-5 py-3 text-right">Statut</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {paginatedRows.map((schedule) => {
                          const status =
                            getScheduleStatus(schedule.status);

                          return (
                            <tr
                              key={schedule.id}
                              className="text-[13px] text-slate-600 transition hover:bg-slate-50/70"
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <UserRound className="h-4 w-4 text-slate-400" />
                                  <span className="font-bold text-slate-900">
                                    {schedule.tenantName}
                                  </span>
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex items-start gap-2">
                                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                                  <div>
                                    <p className="font-semibold text-slate-800">
                                      {schedule.propertyName}
                                    </p>

                                    <div className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500">
                                      <Home className="h-3.5 w-3.5" />
                                      <span>{schedule.unitName}</span>
                                    </div>

                                    <p className="mt-1 max-w-[220px] truncate text-[11px] text-slate-400">
                                      {schedule.propertyLocation}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-4 font-medium text-slate-700">
                                {formatPeriod(
                                  schedule.periodStart,
                                  schedule.periodEnd
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <CalendarDays className="h-4 w-4 text-slate-400" />
                                  <span className="font-semibold text-slate-700">
                                    {formatDate(schedule.dueDate)}
                                  </span>
                                </div>
                              </td>

                              <td className="px-5 py-4 font-bold text-slate-900">
                                {formatXof(schedule.amountDue)}
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

                  <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[12px] text-slate-500">
                      Affichage de {firstVisibleItem} à {lastVisibleItem} sur{" "}
                      {rows.length} échéance
                      {rows.length > 1 ? "s" : ""}
                    </p>

                    <div className="flex items-center gap-2">
                      {currentPage > 1 ? (
                        <Link
                          href={`/schedules?page=${currentPage - 1}`}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Précédent
                        </Link>
                      ) : (
                        <span className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[12px] font-semibold text-slate-400">
                          <ChevronLeft className="h-4 w-4" />
                          Précédent
                        </span>
                      )}

                      <span className="min-w-[92px] text-center text-[12px] font-semibold text-slate-600">
                        Page {currentPage} / {totalPages}
                      </span>

                      {currentPage < totalPages ? (
                        <Link
                          href={`/schedules?page=${currentPage + 1}`}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Suivant
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        <span className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[12px] font-semibold text-slate-400">
                          Suivant
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center px-5 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
                    <CalendarDays className="h-6 w-6 text-red-500" />
                  </div>

                  <h3 className="mt-4 text-[16px] font-bold text-slate-900">
                    Aucune échéance
                  </h3>

                  <p className="mt-1 max-w-md text-[13px] text-slate-500">
                    Les échéances générées par vos baux apparaîtront ici.
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
