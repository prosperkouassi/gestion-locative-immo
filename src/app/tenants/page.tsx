import {
  Bell,
  Building2,
  CalendarDays,
  Home,
  Phone,
  Plus,
  Search,
  UserRound,
} from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import { createClient } from "@/lib/supabase/server";

function formatTenantName(
  firstName: string | null,
  lastName: string | null
) {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "Locataire";
}

function formatInitials(
  firstName: string | null,
  lastName: string | null
) {
  const first = firstName?.trim()?.[0] ?? "";
  const last = lastName?.trim()?.[0] ?? "";

  return `${first}${last}`.toUpperCase() || "LC";
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

function formatLeaseStatus(status: string | null) {
  switch (status) {
    case "ACTIVE":
      return {
        label: "Bail actif",
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
        label: "Sans bail",
        className:
          "bg-slate-100 text-slate-500 ring-slate-200",
      };
  }
}

export default async function TenantsPage() {
  const supabase = await createClient();

  const { data: tenants } = await supabase
    .from("tenants")
    .select(
      "id, first_name, last_name, phone, is_active, created_at"
    )
    .order("created_at", { ascending: false });

  const tenantRows = tenants ?? [];
  const tenantIds = tenantRows.map((tenant) => tenant.id);

  const { data: leases } =
    tenantIds.length > 0
      ? await supabase
          .from("leases")
          .select(
            "id, tenant_id, unit_id, status, start_date, end_date, effective_end_date"
          )
          .in("tenant_id", tenantIds)
          .order("start_date", { ascending: false })
      : { data: [] };

  const leaseRows = leases ?? [];
  const today = new Date().toISOString().slice(0, 10);

  const leaseByTenantId = new Map<
    string,
    {
      id: string;
      tenant_id: string;
      unit_id: string;
      status: string;
      start_date: string;
      end_date: string | null;
      effective_end_date: string | null;
    }
  >();

  for (const lease of leaseRows) {
    const existing = leaseByTenantId.get(lease.tenant_id);

    if (!existing) {
      leaseByTenantId.set(lease.tenant_id, lease);
      continue;
    }

    const existingIsCurrent =
      existing.status === "ACTIVE" &&
      existing.start_date <= today &&
      (!existing.effective_end_date ||
        existing.effective_end_date >= today);

    const leaseIsCurrent =
      lease.status === "ACTIVE" &&
      lease.start_date <= today &&
      (!lease.effective_end_date ||
        lease.effective_end_date >= today);

    if (leaseIsCurrent && !existingIsCurrent) {
      leaseByTenantId.set(lease.tenant_id, lease);
    }
  }

  const unitIds = Array.from(
    new Set(
      Array.from(leaseByTenantId.values()).map(
        (lease) => lease.unit_id
      )
    )
  );

  const { data: units } =
    unitIds.length > 0
      ? await supabase
          .from("units")
          .select("id, property_id, name")
          .in("id", unitIds)
      : { data: [] };

  const unitRows = units ?? [];

  const propertyIds = Array.from(
    new Set(
      unitRows
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

  const propertyRows = properties ?? [];

  const unitMap = new Map(
    unitRows.map((unit) => [unit.id, unit])
  );

  const propertyMap = new Map(
    propertyRows.map((property) => [property.id, property])
  );

  const rows = tenantRows.map((tenant) => {
    const lease = leaseByTenantId.get(tenant.id);
    const unit = lease ? unitMap.get(lease.unit_id) : undefined;
    const property = unit
      ? propertyMap.get(unit.property_id)
      : undefined;

    const effectiveEnd =
      lease?.effective_end_date ?? lease?.end_date ?? null;

    const isCurrentlyOccupied =
      lease?.status === "ACTIVE" &&
      lease.start_date <= today &&
      (!effectiveEnd || effectiveEnd >= today);

    return {
      id: tenant.id,
      name: formatTenantName(
        tenant.first_name,
        tenant.last_name
      ),
      initials: formatInitials(
        tenant.first_name,
        tenant.last_name
      ),
      phone: tenant.phone || "Téléphone non renseigné",
      isActive: tenant.is_active,
      leaseStatus: lease?.status ?? null,
      leaseStart: lease?.start_date ?? null,
      leaseEnd: effectiveEnd,
      unitName: unit?.name ?? "Aucune unité",
      propertyName: property?.name ?? "Aucun bien",
      propertyLocation:
        property?.address ||
        property?.city ||
        "Adresse non renseignée",
      isCurrentlyOccupied,
    };
  });

  const activeTenants = tenantRows.filter(
    (tenant) => tenant.is_active
  ).length;

  const occupiedTenants = rows.filter(
    (tenant) => tenant.isCurrentlyOccupied
  ).length;

  const tenantsWithLease = rows.filter(
    (tenant) => tenant.leaseStatus !== null
  ).length;

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
                Locataires
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

              <button
                type="button"
                className="flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-[13px] font-bold text-white shadow-sm transition hover:bg-red-600"
              >
                <Plus className="h-4 w-4" />
                Ajouter un locataire
              </button>
            </div>
          </header>

          <div className="space-y-6 p-5 md:p-8">
            <section>
              <div className="mb-4">
                <h2 className="text-[20px] font-extrabold text-slate-900">
                  Portefeuille locataires
                </h2>

                <p className="mt-1 text-[13px] text-slate-500">
                  Consultez vos locataires, leur logement et la
                  situation de leur bail.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Locataires
                    </p>

                    <UserRound className="h-5 w-5 text-red-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {tenantRows.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Actifs
                    </p>

                    <UserRound className="h-5 w-5 text-emerald-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {activeTenants}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Occupants actuels
                    </p>

                    <Home className="h-5 w-5 text-emerald-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {occupiedTenants}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Avec bail
                    </p>

                    <CalendarDays className="h-5 w-5 text-slate-600" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {tenantsWithLease}
                  </p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[18px] font-extrabold text-slate-900">
                    Liste des locataires
                  </h2>

                  <p className="mt-1 text-[12px] text-slate-500">
                    {rows.length} locataire
                    {rows.length > 1 ? "s" : ""} enregistré
                    {rows.length > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="relative w-full sm:w-[300px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    placeholder="Rechercher un locataire..."
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
                        <th className="px-5 py-3">Bail</th>
                        <th className="px-5 py-3">Occupation</th>
                        <th className="px-5 py-3 text-right">Statut</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {rows.map((tenant) => {
                        const leasePresentation =
                          formatLeaseStatus(
                            tenant.leaseStatus
                          );

                        return (
                          <tr
                            key={tenant.id}
                            className="text-[13px] text-slate-600 transition hover:bg-slate-50/70"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-[13px] font-extrabold text-red-500">
                                  {tenant.initials}
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-bold text-slate-900">
                                    {tenant.name}
                                  </p>

                                  <div className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-400">
                                    <Phone className="h-3.5 w-3.5" />
                                    <span>
                                      {tenant.phone}
                                    </span>
                                  </div>

                                  <p className="mt-1 text-[11px] text-slate-400">
                                    Réf.{" "}
                                    {tenant.id
                                      .slice(0, 8)
                                      .toUpperCase()}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-start gap-2">
                                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                                <div>
                                  <p className="font-semibold text-slate-800">
                                    {tenant.propertyName}
                                  </p>

                                  <p className="mt-1 text-[12px] text-slate-500">
                                    {tenant.unitName}
                                  </p>

                                  <p className="mt-1 max-w-[220px] truncate text-[11px] text-slate-400">
                                    {tenant.propertyLocation}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={[
                                  "inline-flex rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ring-inset",
                                  leasePresentation.className,
                                ].join(" ")}
                              >
                                {leasePresentation.label}
                              </span>

                              {tenant.leaseStatus !== null && (
                                <div className="mt-2 space-y-1 text-[11px] text-slate-400">
                                  <p>
                                    Début :{" "}
                                    {formatDate(
                                      tenant.leaseStart
                                    )}
                                  </p>

                                  <p>
                                    Fin :{" "}
                                    {formatDate(
                                      tenant.leaseEnd
                                    )}
                                  </p>
                                </div>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={[
                                  "inline-flex rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ring-inset",
                                  tenant.isCurrentlyOccupied
                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                    : "bg-amber-50 text-amber-700 ring-amber-100",
                                ].join(" ")}
                              >
                                {tenant.isCurrentlyOccupied
                                  ? "Occupant"
                                  : "Non occupant"}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right">
                              <span
                                className={[
                                  "inline-flex rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ring-inset",
                                  tenant.isActive
                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                    : "bg-slate-100 text-slate-500 ring-slate-200",
                                ].join(" ")}
                              >
                                {tenant.isActive
                                  ? "Actif"
                                  : "Inactif"}
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
                    <UserRound className="h-6 w-6 text-red-500" />
                  </div>

                  <h3 className="mt-4 text-[16px] font-bold text-slate-900">
                    Aucun locataire
                  </h3>

                  <p className="mt-1 max-w-md text-[13px] text-slate-500">
                    Les locataires de votre organisation
                    apparaîtront ici.
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
