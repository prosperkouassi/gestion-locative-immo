import {
  Bell,
  Building2,
  Home,
  MapPin,
  Plus,
  Search,
  UserRound,
} from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import { createClient } from "@/lib/supabase/server";

function formatXof(value: number) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value)} F CFA`;
}

function formatPropertyType(value: string | null) {
  if (!value) return "Bien";

  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatOwnerName(
  firstName: string | null,
  lastName: string | null
) {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "Non renseigné";
}

export default async function PropertiesPage() {
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("properties")
    .select(
      "id, owner_id, name, property_type, address, city, country, is_active, created_at"
    )
    .order("created_at", { ascending: false });

  const propertyRows = properties ?? [];
  const propertyIds = propertyRows.map((property) => property.id);
  const ownerIds = Array.from(
    new Set(
      propertyRows
        .map((property) => property.owner_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const [ownersResult, unitsResult] = await Promise.all([
    ownerIds.length > 0
      ? supabase
          .from("owners")
          .select("id, first_name, last_name")
          .in("id", ownerIds)
      : Promise.resolve({ data: [] }),

    propertyIds.length > 0
      ? supabase
          .from("units")
          .select(
            "id, property_id, name, monthly_rent, currency, is_active"
          )
          .in("property_id", propertyIds)
      : Promise.resolve({ data: [] }),
  ]);

  const owners = ownersResult.data ?? [];
  const units = unitsResult.data ?? [];

  const ownerMap = new Map(
    owners.map((owner) => [owner.id, owner])
  );

  const unitIds = units.map((unit) => unit.id);

  const { data: activeLeases } =
    unitIds.length > 0
      ? await supabase
          .from("leases")
          .select(
            "id, unit_id, status, start_date, end_date, effective_end_date"
          )
          .in("unit_id", unitIds)
          .eq("status", "ACTIVE")
      : { data: [] };

  const today = new Date().toISOString().slice(0, 10);

  const activeLeaseByUnitId = new Map<string, string>();

  for (const lease of activeLeases ?? []) {
    const effectiveEnd =
      lease.effective_end_date ?? lease.end_date;

    const isCurrentlyActive =
      lease.start_date <= today &&
      (!effectiveEnd || effectiveEnd >= today);

    if (isCurrentlyActive) {
      activeLeaseByUnitId.set(lease.unit_id, lease.id);
    }
  }

  const rows = propertyRows.map((property) => {
    const owner = property.owner_id
      ? ownerMap.get(property.owner_id)
      : undefined;

    const propertyUnits = units.filter(
      (unit) => unit.property_id === property.id
    );

    const activeUnits = propertyUnits.filter(
      (unit) => unit.is_active
    );

    const occupiedUnits = activeUnits.filter((unit) =>
      activeLeaseByUnitId.has(unit.id)
    );

    const totalMonthlyRent = activeUnits.reduce(
      (sum, unit) => sum + Number(unit.monthly_rent ?? 0),
      0
    );

    const occupancyRate =
      activeUnits.length > 0
        ? Math.round(
            (occupiedUnits.length / activeUnits.length) * 100
          )
        : 0;

    return {
      id: property.id,
      name: property.name,
      type: formatPropertyType(property.property_type),
      address:
        property.address ||
        property.city ||
        property.country ||
        "Adresse non renseignée",
      ownerName: owner
        ? formatOwnerName(owner.first_name, owner.last_name)
        : "Non renseigné",
      unitCount: activeUnits.length,
      occupiedUnitCount: occupiedUnits.length,
      occupancyRate,
      totalMonthlyRent,
      isActive: property.is_active,
    };
  });

  const totalProperties = propertyRows.length;
  const activeProperties = propertyRows.filter(
    (property) => property.is_active
  ).length;
  const totalUnits = units.filter((unit) => unit.is_active).length;
  const totalMonthlyRent = units
    .filter((unit) => unit.is_active)
    .reduce(
      (sum, unit) => sum + Number(unit.monthly_rent ?? 0),
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
                Biens
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
                Ajouter un bien
              </button>
            </div>
          </header>

          <div className="space-y-6 p-5 md:p-8">
            <section>
              <div className="mb-4">
                <h2 className="text-[20px] font-extrabold text-slate-900">
                  Portefeuille immobilier
                </h2>

                <p className="mt-1 text-[13px] text-slate-500">
                  Consultez vos biens, leurs unités, leurs loyers et leur
                  occupation actuelle.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Biens
                    </p>

                    <Building2 className="h-5 w-5 text-red-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {totalProperties}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Biens actifs
                    </p>

                    <Building2 className="h-5 w-5 text-emerald-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {activeProperties}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Unités actives
                    </p>

                    <Home className="h-5 w-5 text-slate-600" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {totalUnits}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Loyers mensuels
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
                    Liste des biens
                  </h2>

                  <p className="mt-1 text-[12px] text-slate-500">
                    {rows.length} bien{rows.length > 1 ? "s" : ""} enregistré
                    {rows.length > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="relative w-full sm:w-[300px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    placeholder="Rechercher un bien..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {rows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-3">
                          Bien
                        </th>

                        <th className="px-5 py-3">
                          Propriétaire
                        </th>

                        <th className="px-5 py-3">
                          Unités
                        </th>

                        <th className="px-5 py-3">
                          Occupation
                        </th>

                        <th className="px-5 py-3">
                          Loyer mensuel
                        </th>

                        <th className="px-5 py-3 text-right">
                          Statut
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {rows.map((property) => (
                        <tr
                          key={property.id}
                          className="text-[13px] text-slate-600 transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
                                <Building2 className="h-5 w-5 text-red-500" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-bold text-slate-900">
                                  {property.name}
                                </p>

                                <p className="mt-1 text-[12px] text-slate-400">
                                  {property.type}
                                </p>

                                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span className="truncate">
                                    {property.address}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <UserRound className="h-4 w-4 text-slate-400" />
                              <span className="font-medium text-slate-700">
                                {property.ownerName}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="font-bold text-slate-900">
                              {property.unitCount}
                            </span>

                            <span className="ml-1 text-slate-400">
                              unité{property.unitCount > 1 ? "s" : ""}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="min-w-[130px]">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-semibold text-slate-700">
                                  {property.occupancyRate} %
                                </span>

                                <span className="text-[11px] text-slate-400">
                                  {property.occupiedUnitCount}/
                                  {property.unitCount}
                                </span>
                              </div>

                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-red-500"
                                  style={{
                                    width: `${property.occupancyRate}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 font-bold text-slate-900">
                            {formatXof(property.totalMonthlyRent)}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <span
                              className={[
                                "inline-flex rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ring-inset",
                                property.isActive
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                  : "bg-slate-100 text-slate-500 ring-slate-200",
                              ].join(" ")}
                            >
                              {property.isActive ? "Actif" : "Inactif"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center px-5 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
                    <Building2 className="h-6 w-6 text-red-500" />
                  </div>

                  <h3 className="mt-4 text-[16px] font-bold text-slate-900">
                    Aucun bien
                  </h3>

                  <p className="mt-1 max-w-md text-[13px] text-slate-500">
                    Les biens de votre organisation apparaîtront ici.
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
