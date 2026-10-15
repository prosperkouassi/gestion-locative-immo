import {
  BadgeCheck,
  BedDouble,
  Bell,
  Building2,
  Home,
  Plus,
  Ruler,
  Search,
  ShowerHead,
} from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import { requireActiveMembership } from "@/lib/auth/access";

import {
  createUnitAction,
  deleteUnitAction,
  toggleUnitActiveAction,
} from "./actions";
import DeleteUnitButton from "./DeleteUnitButton";
import UnitEditButton from "./UnitEditButton";
import UnitSubmitButton from "./UnitSubmitButton";

function formatXof(value: number) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} F CFA`;
}

function formatUnitType(value: string | null) {
  if (!value) return "Unité";
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type Props = { searchParams: Promise<{ q?: string; status?: string; message?: string }> };

export default async function UnitsPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const feedbackStatus = params.status === "success" ? "success" : params.status === "error" ? "error" : null;
  const feedbackMessage = params.message?.trim() || null;

  const { supabase, membership } = await requireActiveMembership();
  const canManageUnits = membership.role === "ADMIN_AGENCY" || membership.role === "MANAGER";

  const { data: units, error: unitsError } = await supabase
    .from("units")
    .select("id, property_id, name, unit_type, floor, bedrooms, bathrooms, surface_area, monthly_rent, currency, is_active, created_at")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });
  if (unitsError) console.error("Erreur chargement unités :", unitsError);

  const unitRows = units ?? [];
  const propertyIds = Array.from(new Set(unitRows.map((unit) => unit.property_id).filter((id): id is string => Boolean(id))));
  const unitIds = unitRows.map((unit) => unit.id);

  const [propertiesResult, leasesResult, manageablePropertiesResult] = await Promise.all([
    propertyIds.length ? supabase.from("properties").select("id, name, address, city").eq("organization_id", membership.organization_id).in("id", propertyIds) : Promise.resolve({ data: [] }),
    unitIds.length ? supabase.from("leases").select("id, unit_id, status, start_date, end_date, effective_end_date").eq("organization_id", membership.organization_id).in("unit_id", unitIds).eq("status", "ACTIVE") : Promise.resolve({ data: [] }),
    canManageUnits ? supabase.from("properties").select("id, name, is_active").eq("organization_id", membership.organization_id).order("name", { ascending: true }) : Promise.resolve({ data: [] }),
  ]);

  const properties = propertiesResult.data ?? [];
  const leases = leasesResult.data ?? [];
  const manageableProperties = manageablePropertiesResult.data ?? [];
  const propertyMap = new Map(properties.map((property) => [property.id, property]));
  const today = new Date().toISOString().slice(0, 10);
  const occupiedUnitIds = new Set<string>();
  for (const lease of leases) {
    const end = lease.effective_end_date ?? lease.end_date;
    if (lease.start_date <= today && (!end || end >= today)) occupiedUnitIds.add(lease.unit_id);
  }

  const rows = unitRows.map((unit) => {
    const property = propertyMap.get(unit.property_id);
    return {
      ...unit,
      typeLabel: formatUnitType(unit.unit_type),
      monthlyRent: Number(unit.monthly_rent ?? 0),
      isOccupied: occupiedUnitIds.has(unit.id),
      propertyName: property?.name ?? "Bien non renseigné",
      propertyLocation: property?.address || property?.city || "Adresse non renseignée",
    };
  });

  const filteredRows = query ? rows.filter((unit) => [unit.name, unit.typeLabel, unit.propertyName, unit.propertyLocation].join(" ").toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr"))) : rows;
  const activeUnits = unitRows.filter((unit) => unit.is_active);
  const occupiedActiveUnits = activeUnits.filter((unit) => occupiedUnitIds.has(unit.id));
  const vacantActiveUnits = activeUnits.length - occupiedActiveUnits.length;
  const totalMonthlyRent = activeUnits.reduce((sum, unit) => sum + Number(unit.monthly_rent ?? 0), 0);

  return (
    <div className="h-screen overflow-hidden bg-[#F8FAFC]">
      <div className="flex h-screen"><AppSidebar /><main className="h-screen flex-1 overflow-y-auto">
        <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur md:px-8"><div><p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-red-500">Gestion locative</p><h1 className="mt-1 text-[24px] font-extrabold text-[#111827]">Unités</h1></div><div className="flex items-center gap-2"><a href="#search-units" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"><Search className="h-4 w-4" /></a><button type="button" className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"><Bell className="h-4 w-4" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" /></button>{canManageUnits ? <a href="#new-unit" className="flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-[13px] font-bold text-white hover:bg-red-600"><Plus className="h-4 w-4" />Ajouter une unité</a> : null}</div></header>

        <div className="space-y-6 p-5 md:p-8">
          {feedbackMessage && feedbackStatus ? <div className={["flex items-start gap-3 rounded-2xl border p-4 text-[13px] font-semibold", feedbackStatus === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"].join(" ")}><BadgeCheck className="h-5 w-5" /><p>{feedbackMessage}</p></div> : null}

          <section><div className="mb-4"><h2 className="text-[20px] font-extrabold text-slate-900">Parc locatif</h2><p className="mt-1 text-[13px] text-slate-500">Consultez les unités de vos biens et leur occupation actuelle.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Unités actives" value={activeUnits.length} icon={<Home className="h-5 w-5 text-red-500" />} /><Stat label="Occupées" value={occupiedActiveUnits.length} icon={<Building2 className="h-5 w-5 text-emerald-500" />} /><Stat label="Vacantes" value={vacantActiveUnits} icon={<Home className="h-5 w-5 text-amber-500" />} /><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-[13px] font-semibold text-slate-500">Loyers mensuels</p><span className="text-[12px] font-bold text-red-500">F CFA</span></div><p className="mt-4 text-[22px] font-extrabold text-slate-900">{formatXof(totalMonthlyRent)}</p></div></div></section>

          {canManageUnits ? <section id="new-unit" className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-5"><h2 className="text-[18px] font-extrabold text-slate-900">Ajouter une unité</h2><p className="mt-1 text-[12px] text-slate-500">Rattachez l’unité à un bien de votre organisation.</p></div><form action={createUnitAction} className="space-y-5 p-5"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Field label="Bien *"><select name="property_id" required className="field"><option value="">Sélectionner un bien</option>{manageableProperties.map((property) => <option key={property.id} value={property.id}>{property.name}{property.is_active ? "" : " — inactif"}</option>)}</select></Field><Field label="Nom de l’unité *"><input name="name" required maxLength={180} className="field" /></Field><Field label="Type"><input name="unit_type" placeholder="Appartement, studio..." className="field" /></Field><Field label="Étage"><input name="floor" type="number" min="0" step="1" className="field" /></Field><Field label="Chambres"><input name="bedrooms" type="number" min="0" step="1" className="field" /></Field><Field label="Salles d’eau"><input name="bathrooms" type="number" min="0" step="1" className="field" /></Field><Field label="Superficie (m²)"><input name="surface_area" type="number" min="0" step="0.01" className="field" /></Field><Field label="Loyer mensuel *"><input name="monthly_rent" type="number" min="0" step="1" required className="field" /></Field><input type="hidden" name="currency" value="XOF" /></div><div className="flex justify-end border-t border-slate-100 pt-5"><UnitSubmitButton /></div></form></section> : null}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-[18px] font-extrabold text-slate-900">Liste des unités</h2><p className="mt-1 text-[12px] text-slate-500">{filteredRows.length} unité{filteredRows.length > 1 ? "s" : ""} affichée{filteredRows.length > 1 ? "s" : ""}</p></div><form id="search-units" method="get" className="flex w-full gap-2 sm:w-auto"><div className="relative flex-1 sm:w-[300px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="q" type="search" defaultValue={query} placeholder="Rechercher une unité..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] outline-none" /></div><button className="h-10 rounded-xl bg-slate-900 px-4 text-[12px] font-bold text-white">Rechercher</button>{query ? <a href="/units" className="flex h-10 items-center rounded-xl border border-slate-200 px-3 text-[12px] font-semibold text-slate-600">Effacer</a> : null}</form></div>

            {filteredRows.length ? <div className="divide-y divide-slate-100">{filteredRows.map((unit) => <div key={unit.id} className="p-5 hover:bg-slate-50/70"><div className="grid gap-4 xl:grid-cols-[1.1fr_1fr_1.2fr_150px_110px_100px] xl:items-center"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50"><Home className="h-5 w-5 text-red-500" /></div><div><p className="font-bold text-slate-900">{unit.name}</p><p className="mt-1 text-[12px] text-slate-400">{unit.typeLabel}</p><p className="mt-1 text-[11px] text-slate-400">Réf. {unit.id.slice(0, 8).toUpperCase()}</p></div></div><div><p className="font-semibold text-slate-800">{unit.propertyName}</p><p className="mt-1 truncate text-[12px] text-slate-400">{unit.propertyLocation}</p></div><div><div className="flex flex-wrap gap-2">{unit.bedrooms !== null ? <Badge icon={<BedDouble className="h-3.5 w-3.5" />} value={unit.bedrooms} /> : null}{unit.bathrooms !== null ? <Badge icon={<ShowerHead className="h-3.5 w-3.5" />} value={unit.bathrooms} /> : null}{unit.surface_area !== null ? <Badge icon={<Ruler className="h-3.5 w-3.5" />} value={`${unit.surface_area} m²`} /> : null}</div><p className="mt-2 text-[11px] text-slate-400">Étage : {unit.floor ?? "—"}</p></div><div className="font-bold text-slate-900">{formatXof(unit.monthlyRent)}</div><span className={["w-fit rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ring-inset", unit.isOccupied ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-amber-50 text-amber-700 ring-amber-100"].join(" ")}>{unit.isOccupied ? "Occupée" : "Vacante"}</span><span className={["w-fit rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ring-inset", unit.is_active ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-slate-100 text-slate-500 ring-slate-200"].join(" ")}>{unit.is_active ? "Active" : "Inactive"}</span></div>

              {canManageUnits ? <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4"><UnitEditButton
                  unit={{
                    id: unit.id,
                    property_id: unit.property_id,
                    name: unit.name,
                    unit_type: unit.unit_type,
                    floor: unit.floor,
                    bedrooms: unit.bedrooms,
                    bathrooms: unit.bathrooms,
                    surface_area: unit.surface_area,
                    monthly_rent: unit.monthly_rent,
                    currency: unit.currency,
                  }}
                  properties={manageableProperties.map((property) => ({
                    id: property.id,
                    name: property.name,
                    is_active: property.is_active,
                  }))}
                /><form action={toggleUnitActiveAction}><input type="hidden" name="unit_id" value={unit.id} /><input type="hidden" name="next_is_active" value={unit.is_active ? "false" : "true"} /><button className={unit.is_active ? "rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600" : "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700"}>{unit.is_active ? "Désactiver" : "Réactiver"}</button></form><form action={deleteUnitAction}><input type="hidden" name="unit_id" value={unit.id} /><DeleteUnitButton unitName={unit.name} /></form></div> : null}
            </div>)}</div> : <div className="flex min-h-[300px] flex-col items-center justify-center px-5 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50"><Home className="h-6 w-6 text-red-500" /></div><h3 className="mt-4 text-[16px] font-bold text-slate-900">Aucune unité</h3><p className="mt-1 text-[13px] text-slate-500">{query ? "Aucune unité ne correspond à votre recherche." : "Les unités de vos biens apparaîtront ici."}</p></div>}
          </section>
        </div>
      </main></div>
      <style>{`.field{height:2.75rem;width:100%;border-radius:.75rem;border:1px solid #e2e8f0;background:white;padding:0 .875rem;font-size:.8125rem;outline:none}.field:focus{border-color:#fca5a5;box-shadow:0 0 0 4px #fef2f2}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-1.5"><span className="text-[12px] font-semibold text-slate-600">{label}</span>{children}</label>; }
function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-[13px] font-semibold text-slate-500">{label}</p>{icon}</div><p className="mt-4 text-[30px] font-extrabold text-slate-900">{value}</p></div>; }
function Badge({ icon, value }: { icon: React.ReactNode; value: React.ReactNode }) { return <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{icon}{value}</span>; }
