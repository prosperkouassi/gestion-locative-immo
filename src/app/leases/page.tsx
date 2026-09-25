import {
  Bell,
  Building2,
  CalendarDays,
  FileText,
  Home,
  Plus,
  Search,
  UserRound,
} from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import { requireActiveMembership } from "@/lib/auth/access";

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

function formatLeaseStatus(status: string) {
  switch (status) {
    case "ACTIVE":
      return {
        label: "Actif",
        className:
          "bg-emerald-50 text-emerald-700 ring-emerald-100",
      };

    case "DRAFT":
      return {
        label: "Brouillon",
        className:
          "bg-slate-100 text-slate-600 ring-slate-200",
      };

    case "ENDED":
      return {
        label: "Terminé",
        className:
          "bg-slate-100 text-slate-600 ring-slate-200",
      };

    case "TERMINATED":
      return {
        label: "Résilié",
        className:
          "bg-amber-50 text-amber-700 ring-amber-100",
      };

    case "CANCELLED":
      return {
        label: "Annulé",
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

export default async function LeasesPage() {
  const { supabase, membership } =
    await requireActiveMembership();

  const canManageLeases = [
    "ADMIN_AGENCY",
    "MANAGER",
  ].includes(membership.role);

  const { data: leases } = await supabase
    .from("leases")
    .select(
      "id, tenant_id, unit_id, status, start_date, end_date, effective_end_date, monthly_rent, currency, security_deposit, payment_due_day, created_at"
    )
    .order("created_at", { ascending: false });

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

  const today = new Date().toISOString().slice(0, 10);

  const rows = leaseRows.map((lease) => {
    const tenant = tenantMap.get(lease.tenant_id);
    const unit = unitMap.get(lease.unit_id);
    const property = unit
      ? propertyMap.get(unit.property_id)
      : undefined;

    const effectiveEnd =
      lease.effective_end_date ?? lease.end_date;

    const isCurrent =
      lease.status === "ACTIVE" &&
      lease.start_date <= today &&
      (!effectiveEnd || effectiveEnd >= today);

    return {
      id: lease.id,
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
      status: lease.status,
      startDate: lease.start_date,
      endDate: effectiveEnd,
      monthlyRent: Number(lease.monthly_rent ?? 0),
      depositAmount: Number(lease.security_deposit ?? 0),
      dueDay: lease.payment_due_day,
      isCurrent,
    };
  });

  const activeCount = leaseRows.filter(
    (lease) => lease.status === "ACTIVE"
  ).length;

  const currentCount = rows.filter(
    (lease) => lease.isCurrent
  ).length;

  const draftCount = leaseRows.filter(
    (lease) => lease.status === "DRAFT"
  ).length;

  const totalMonthlyRent = rows
    .filter((lease) => lease.isCurrent)
    .reduce(
      (sum, lease) => sum + lease.monthlyRent,
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
                Baux
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

              {canManageLeases ? (
                <button
                  type="button"
                  className="flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-[13px] font-bold text-white shadow-sm transition hover:bg-red-600"
                >
                  <Plus className="h-4 w-4" />
                  Créer un bail
                </button>
              ) : null}
            </div>
          </header>

          <div className="space-y-6 p-5 md:p-8">
            <section>
              <div className="mb-4">
                <h2 className="text-[20px] font-extrabold text-slate-900">
                  Suivi des baux
                </h2>

                <p className="mt-1 text-[13px] text-slate-500">
                  Consultez les contrats de location, leurs périodes et les loyers associés.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Baux actifs
                    </p>

                    <FileText className="h-5 w-5 text-red-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {activeCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      En cours aujourd’hui
                    </p>

                    <CalendarDays className="h-5 w-5 text-emerald-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {currentCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Brouillons
                    </p>

                    <FileText className="h-5 w-5 text-slate-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {draftCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Loyers mensuels actifs
                    </p>

                    <span className="text-[12px] font-bold text-red-500">
                      F CFA
                    </span>
                  </div>

                  <p className="mt-4 text-[22px] font-extrabold text-slate-900">
                    {formatXof(totalMonthlyRent)}
                  </p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[18px] font-extrabold text-slate-900">
                    Liste des baux
                  </h2>

                  <p className="mt-1 text-[12px] text-slate-500">
                    {rows.length} bail{rows.length > 1 ? "x" : ""} enregistré
                    {rows.length > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="relative w-full sm:w-[300px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    placeholder="Rechercher un bail..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {rows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-3">Locataire</th>
                        <th className="px-5 py-3">Logement</th>
                        <th className="px-5 py-3">Période</th>
                        <th className="px-5 py-3">Loyer</th>
                        <th className="px-5 py-3">Dépôt</th>
                        <th className="px-5 py-3">Échéance</th>
                        <th className="px-5 py-3 text-right">Statut</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {rows.map((lease) => {
                        const status =
                          formatLeaseStatus(lease.status);

                        return (
                          <tr
                            key={lease.id}
                            className="text-[13px] text-slate-600 transition hover:bg-slate-50/70"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <UserRound className="h-4 w-4 text-slate-400" />

                                <div>
                                  <p className="font-bold text-slate-900">
                                    {lease.tenantName}
                                  </p>

                                  <p className="mt-1 text-[11px] text-slate-400">
                                    Réf. {lease.id.slice(0, 8).toUpperCase()}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-start gap-2">
                                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                                <div>
                                  <p className="font-semibold text-slate-800">
                                    {lease.propertyName}
                                  </p>

                                  <div className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500">
                                    <Home className="h-3.5 w-3.5" />
                                    <span>{lease.unitName}</span>
                                  </div>

                                  <p className="mt-1 max-w-[220px] truncate text-[11px] text-slate-400">
                                    {lease.propertyLocation}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="space-y-1">
                                <p className="font-medium text-slate-700">
                                  {formatDate(lease.startDate)}
                                </p>

                                <p className="text-[11px] text-slate-400">
                                  au {formatDate(lease.endDate)}
                                </p>
                              </div>
                            </td>

                            <td className="px-5 py-4 font-bold text-slate-900">
                              {formatXof(lease.monthlyRent)}
                            </td>

                            <td className="px-5 py-4 font-medium text-slate-700">
                              {formatXof(lease.depositAmount)}
                            </td>

                            <td className="px-5 py-4">
                              <span className="font-semibold text-slate-700">
                                Jour {lease.dueDay}
                              </span>
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

                              {lease.isCurrent && (
                                <p className="mt-1 text-[10px] font-semibold text-emerald-600">
                                  En cours
                                </p>
                              )}
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
                    <FileText className="h-6 w-6 text-red-500" />
                  </div>

                  <h3 className="mt-4 text-[16px] font-bold text-slate-900">
                    Aucun bail
                  </h3>

                  <p className="mt-1 max-w-md text-[13px] text-slate-500">
                    Les baux de votre organisation apparaîtront ici.
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
