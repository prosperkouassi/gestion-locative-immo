import {
  Bell,
  BedDouble,
  Building2,
  Home,
  Plus,
  Ruler,
  Search,
  ShowerHead,
} from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import { createClient } from "@/lib/supabase/server";

function formatXof(value: number) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value)} F CFA`;
}

function formatUnitType(value: string | null) {
  if (!value) return "Unité";

  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function UnitsPage() {
  const supabase = await createClient();

  const { data: units } = await supabase
    .from("units")
    .select(
      "id, property_id, name, unit_type, floor, bedrooms, bathrooms, surface_area, monthly_rent, currency, is_active, created_at"
    )
    .order("created_at", { ascending: false });

  const unitRows = units ?? [];
  const propertyIds = Array.from(
    new Set(
      unitRows
        .map((unit) => unit.property_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const unitIds = unitRows.map((unit) => unit.id);

  const [propertiesResult, leasesResult] = await Promise.all([
    propertyIds.length > 0
      ? supabase
          .from("properties")
          .select("id, name, address, city")
          .in("id", propertyIds)
      : Promise.resolve({ data: [] }),

    unitIds.length > 0
      ? supabase
          .from("leases")
          .select(
            "id, unit_id, status, start_date, end_date, effective_end_date"
          )
          .in("unit_id", unitIds)
          .eq("status", "ACTIVE")
      : Promise.resolve({ data: [] }),
  ]);

  const properties = propertiesResult.data ?? [];
  const leases = leasesResult.data ?? [];

  const propertyMap = new Map(
    properties.map((property) => [property.id, property])
  );

  const today = new Date().toISOString().slice(0, 10);

  const occupiedUnitIds = new Set<string>();

  for (const lease of leases) {
    const effectiveEnd =
      lease.effective_end_date ?? lease.end_date;

    const isCurrentlyActive =
      lease.start_date <= today &&
      (!effectiveEnd || effectiveEnd >= today);

    if (isCurrentlyActive) {
      occupiedUnitIds.add(lease.unit_id);
    }
  }

  const rows = unitRows.map((unit) => {
    const property = propertyMap.get(unit.property_id);

    const isOccupied = occupiedUnitIds.has(unit.id);

    return {
      id: unit.id,
      name: unit.name,
      type: formatUnitType(unit.unit_type),
      floor: unit.floor,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      surfaceArea: unit.surface_area,
      monthlyRent: Number(unit.monthly_rent ?? 0),
      isActive: unit.is_active,
      isOccupied,
      propertyName: property?.name ?? "Bien non renseigné",
      propertyLocation:
        property?.address ||
        property?.city ||
        "Adresse non renseignée",
    };
  });

  const activeUnits = unitRows.filter((unit) => unit.is_active);
  const occupiedActiveUnits = activeUnits.filter((unit) =>
    occupiedUnitIds.has(unit.id)
  );

  const vacantActiveUnits =
    activeUnits.length - occupiedActiveUnits.length;

  const totalMonthlyRent = activeUnits.reduce(
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
                Unités
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
                Ajouter une unité
              </button>
            </div>
          </header>

          <div className="space-y-6 p-5 md:p-8">
            <section>
              <div className="mb-4">
                <h2 className="text-[20px] font-extrabold text-slate-900">
                  Parc locatif
                </h2>

                <p className="mt-1 text-[13px] text-slate-500">
                  Consultez les unités de vos biens et leur occupation actuelle.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Unités actives
                    </p>

                    <Home className="h-5 w-5 text-red-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {activeUnits.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Occupées
                    </p>

                    <Building2 className="h-5 w-5 text-emerald-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {occupiedActiveUnits.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Vacantes
                    </p>

                    <Home className="h-5 w-5 text-amber-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {vacantActiveUnits}
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
                    Liste des unités
                  </h2>

                  <p className="mt-1 text-[12px] text-slate-500">
                    {rows.length} unité{rows.length > 1 ? "s" : ""} enregistrée
                    {rows.length > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="relative w-full sm:w-[300px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    placeholder="Rechercher une unité..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {rows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-3">Unité</th>
                        <th className="px-5 py-3">Bien</th>
                        <th className="px-5 py-3">Caractéristiques</th>
                        <th className="px-5 py-3">Loyer</th>
                        <th className="px-5 py-3">Occupation</th>
                        <th className="px-5 py-3 text-right">Statut</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {rows.map((unit) => (
                        <tr
                          key={unit.id}
                          className="text-[13px] text-slate-600 transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
                                <Home className="h-5 w-5 text-red-500" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-bold text-slate-900">
                                  {unit.name}
                                </p>

                                <p className="mt-1 text-[12px] text-slate-400">
                                  {unit.type}
                                </p>

                                <p className="mt-1 text-[11px] text-slate-400">
                                  Réf. {unit.id.slice(0, 8).toUpperCase()}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800">
                              {unit.propertyName}
                            </p>

                            <p className="mt-1 max-w-[220px] truncate text-[12px] text-slate-400">
                              {unit.propertyLocation}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-2">
                              {unit.bedrooms !== null && (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                                  <BedDouble className="h-3.5 w-3.5" />
                                  {unit.bedrooms}
                                </span>
                              )}

                              {unit.bathrooms !== null && (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                                  <ShowerHead className="h-3.5 w-3.5" />
                                  {unit.bathrooms}
                                </span>
                              )}

                              {unit.surfaceArea !== null && (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                                  <Ruler className="h-3.5 w-3.5" />
                                  {unit.surfaceArea} m²
                                </span>
                              )}
                            </div>

                            <p className="mt-2 text-[11px] text-slate-400">
                              Étage : {unit.floor ?? "—"}
                            </p>
                          </td>

                          <td className="px-5 py-4 font-bold text-slate-900">
                            {formatXof(unit.monthlyRent)}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={[
                                "inline-flex rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ring-inset",
                                unit.isOccupied
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                  : "bg-amber-50 text-amber-700 ring-amber-100",
                              ].join(" ")}
                            >
                              {unit.isOccupied ? "Occupée" : "Vacante"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <span
                              className={[
                                "inline-flex rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ring-inset",
                                unit.isActive
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                  : "bg-slate-100 text-slate-500 ring-slate-200",
                              ].join(" ")}
                            >
                              {unit.isActive ? "Active" : "Inactive"}
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
                    <Home className="h-6 w-6 text-red-500" />
                  </div>

                  <h3 className="mt-4 text-[16px] font-bold text-slate-900">
                    Aucune unité
                  </h3>

                  <p className="mt-1 max-w-md text-[13px] text-slate-500">
                    Les unités de vos biens apparaîtront ici.
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
