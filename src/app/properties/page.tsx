import {
  BadgeCheck,
  Bell,
  Building2,
  Home,
  MapPin,
  Plus,
  Search,
  UserRound,
} from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import { requireActiveMembership } from "@/lib/auth/access";

import {
  createPropertyAction,
  deletePropertyAction,
  togglePropertyActiveAction,
} from "./actions";
import DeletePropertyButton from "./DeletePropertyButton";
import PropertyEditButton from "./PropertyEditButton";
import PropertySubmitButton from "./PropertySubmitButton";

function formatXof(value: number) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} F CFA`;
}

function formatPropertyType(value: string | null) {
  if (!value) return "Bien";
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatOwnerName(firstName: string | null, lastName: string | null) {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "Non renseigné";
}

type Props = {
  searchParams: Promise<{ q?: string; status?: string; message?: string }>;
};

export default async function PropertiesPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const feedbackStatus = params.status === "success" ? "success" : params.status === "error" ? "error" : null;
  const feedbackMessage = params.message?.trim() || null;

  const { supabase, membership } = await requireActiveMembership();
  const canManageProperties = membership.role === "ADMIN_AGENCY" || membership.role === "MANAGER";

  const { data: properties, error: propertiesError } = await supabase
    .from("properties")
    .select("id, owner_id, name, property_type, address, city, country, is_active, created_at")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });

  if (propertiesError) console.error("Erreur chargement biens :", propertiesError);

  const propertyRows = properties ?? [];
  const propertyIds = propertyRows.map((property) => property.id);
  const ownerIds = Array.from(new Set(propertyRows.map((property) => property.owner_id).filter((id): id is string => Boolean(id))));

  const [linkedOwnersResult, unitsResult, manageableOwnersResult] = await Promise.all([
    ownerIds.length > 0
      ? supabase.from("owners").select("id, first_name, last_name").eq("organization_id", membership.organization_id).in("id", ownerIds)
      : Promise.resolve({ data: [] }),
    propertyIds.length > 0
      ? supabase.from("units").select("id, property_id, monthly_rent, is_active").eq("organization_id", membership.organization_id).in("property_id", propertyIds)
      : Promise.resolve({ data: [] }),
    canManageProperties
      ? supabase.from("owners").select("id, first_name, last_name, is_active").eq("organization_id", membership.organization_id).order("last_name", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const linkedOwners = linkedOwnersResult.data ?? [];
  const units = unitsResult.data ?? [];
  const manageableOwners = manageableOwnersResult.data ?? [];
  const ownerMap = new Map(linkedOwners.map((owner) => [owner.id, owner]));
  const unitIds = units.map((unit) => unit.id);

  const { data: activeLeases } = unitIds.length > 0
    ? await supabase
        .from("leases")
        .select("id, unit_id, status, start_date, end_date, effective_end_date")
        .eq("organization_id", membership.organization_id)
        .in("unit_id", unitIds)
        .eq("status", "ACTIVE")
    : { data: [] };

  const today = new Date().toISOString().slice(0, 10);
  const occupiedUnitIds = new Set<string>();
  for (const lease of activeLeases ?? []) {
    const end = lease.effective_end_date ?? lease.end_date;
    if (lease.start_date <= today && (!end || end >= today)) occupiedUnitIds.add(lease.unit_id);
  }

  const rows = propertyRows.map((property) => {
    const propertyUnits = units.filter((unit) => unit.property_id === property.id);
    const activeUnits = propertyUnits.filter((unit) => unit.is_active);
    const occupiedUnits = activeUnits.filter((unit) => occupiedUnitIds.has(unit.id));
    const totalMonthlyRent = activeUnits.reduce((sum, unit) => sum + Number(unit.monthly_rent ?? 0), 0);
    const owner = property.owner_id ? ownerMap.get(property.owner_id) : undefined;

    return {
      ...property,
      typeLabel: formatPropertyType(property.property_type),
      location: property.address || property.city || property.country || "Adresse non renseignée",
      ownerName: owner ? formatOwnerName(owner.first_name, owner.last_name) : "Non renseigné",
      unitCount: activeUnits.length,
      occupiedUnitCount: occupiedUnits.length,
      occupancyRate: activeUnits.length ? Math.round((occupiedUnits.length / activeUnits.length) * 100) : 0,
      totalMonthlyRent,
    };
  });

  const filteredRows = query
    ? rows.filter((property) => [property.name, property.typeLabel, property.location, property.ownerName].join(" ").toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")))
    : rows;

  const totalProperties = propertyRows.length;
  const activeProperties = propertyRows.filter((property) => property.is_active).length;
  const totalUnits = units.filter((unit) => unit.is_active).length;
  const totalMonthlyRent = units.filter((unit) => unit.is_active).reduce((sum, unit) => sum + Number(unit.monthly_rent ?? 0), 0);

  return (
    <div className="h-screen overflow-hidden bg-[#F8FAFC]">
      <div className="flex h-screen">
        <AppSidebar />
        <main className="h-screen flex-1 overflow-y-auto">
          <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur md:px-8">
            <div><p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-red-500">Gestion locative</p><h1 className="mt-1 text-[24px] font-extrabold text-[#111827]">Biens</h1></div>
            <div className="flex items-center gap-2">
              <a href="#search-properties" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500" aria-label="Rechercher"><Search className="h-4 w-4" /></a>
              <button type="button" className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500" aria-label="Notifications"><Bell className="h-4 w-4" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" /></button>
              {canManageProperties ? <a href="#new-property" className="flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-[13px] font-bold text-white hover:bg-red-600"><Plus className="h-4 w-4" />Ajouter un bien</a> : null}
            </div>
          </header>

          <div className="space-y-6 p-5 md:p-8">
            {feedbackMessage && feedbackStatus ? <div className={["flex items-start gap-3 rounded-2xl border p-4 text-[13px] font-semibold", feedbackStatus === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"].join(" ")}><BadgeCheck className="h-5 w-5 shrink-0" /><p>{feedbackMessage}</p></div> : null}

            <section>
              <div className="mb-4"><h2 className="text-[20px] font-extrabold text-slate-900">Portefeuille immobilier</h2><p className="mt-1 text-[13px] text-slate-500">Consultez vos biens, leurs unités, leurs loyers et leur occupation actuelle.</p></div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Biens", totalProperties, <Building2 key="a" className="h-5 w-5 text-red-500" />],
                  ["Biens actifs", activeProperties, <Building2 key="b" className="h-5 w-5 text-emerald-500" />],
                  ["Unités actives", totalUnits, <Home key="c" className="h-5 w-5 text-slate-600" />],
                ].map(([label, value, icon]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-[13px] font-semibold text-slate-500">{label}</p>{icon}</div><p className="mt-4 text-[30px] font-extrabold text-slate-900">{value}</p></div>)}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-[13px] font-semibold text-slate-500">Loyers mensuels</p><span className="text-[12px] font-bold text-red-500">F CFA</span></div><p className="mt-4 text-[22px] font-extrabold text-slate-900">{formatXof(totalMonthlyRent)}</p></div>
              </div>
            </section>

            {canManageProperties ? (
              <section id="new-property" className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-5"><h2 className="text-[18px] font-extrabold text-slate-900">Ajouter un bien</h2><p className="mt-1 text-[12px] text-slate-500">Créez un bien et rattachez-le à un propriétaire de l’organisation.</p></div>
                <form action={createPropertyAction} className="space-y-5 p-5">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Nom du bien *"><input name="name" required maxLength={180} className="field" /></Field>
                    <Field label="Type"><input name="property_type" maxLength={100} placeholder="Résidence, immeuble, villa..." className="field" /></Field>
                    <Field label="Propriétaire"><select name="owner_id" className="field"><option value="">Aucun propriétaire</option>{manageableOwners.map((owner) => <option key={owner.id} value={owner.id}>{formatOwnerName(owner.first_name, owner.last_name)}{owner.is_active ? "" : " — inactif"}</option>)}</select></Field>
                    <Field label="Adresse"><input name="address" maxLength={240} className="field" /></Field>
                    <Field label="Ville"><input name="city" maxLength={120} className="field" /></Field>
                    <Field label="Pays"><input name="country" maxLength={120} defaultValue="Côte d'Ivoire" className="field" /></Field>
                  </div>
                  <div className="flex justify-end border-t border-slate-100 pt-5"><PropertySubmitButton /></div>
                </form>
              </section>
            ) : null}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div><h2 className="text-[18px] font-extrabold text-slate-900">Liste des biens</h2><p className="mt-1 text-[12px] text-slate-500">{filteredRows.length} bien{filteredRows.length > 1 ? "s" : ""} affiché{filteredRows.length > 1 ? "s" : ""}</p></div>
                <form id="search-properties" method="get" className="flex w-full gap-2 sm:w-auto"><div className="relative flex-1 sm:w-[300px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="q" type="search" defaultValue={query} placeholder="Rechercher un bien..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] outline-none" /></div><button type="submit" className="h-10 rounded-xl bg-slate-900 px-4 text-[12px] font-bold text-white">Rechercher</button>{query ? <a href="/properties" className="flex h-10 items-center rounded-xl border border-slate-200 px-3 text-[12px] font-semibold text-slate-600">Effacer</a> : null}</form>
              </div>

              {filteredRows.length ? <div className="divide-y divide-slate-100">{filteredRows.map((property) => (
                <div key={property.id} className="p-5 hover:bg-slate-50/70">
                  <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_110px_150px_140px_auto] xl:items-center">
                    <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50"><Building2 className="h-5 w-5 text-red-500" /></div><div className="min-w-0"><p className="truncate font-bold text-slate-900">{property.name}</p><p className="mt-1 text-[12px] text-slate-400">{property.typeLabel}</p><div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400"><MapPin className="h-3.5 w-3.5" /><span className="truncate">{property.location}</span></div></div></div>
                    <div className="flex items-center gap-2 text-[13px] text-slate-700"><UserRound className="h-4 w-4 text-slate-400" /><span>{property.ownerName}</span></div>
                    <div className="text-[13px]"><strong className="text-slate-900">{property.unitCount}</strong> <span className="text-slate-400">unité{property.unitCount > 1 ? "s" : ""}</span></div>
                    <div><div className="flex justify-between text-[12px]"><span className="font-semibold">{property.occupancyRate} %</span><span className="text-slate-400">{property.occupiedUnitCount}/{property.unitCount}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-red-500" style={{ width: `${property.occupancyRate}%` }} /></div></div>
                    <div className="font-bold text-slate-900">{formatXof(property.totalMonthlyRent)}</div>
                    <div className="flex flex-wrap justify-end gap-2"><span className={["inline-flex rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ring-inset", property.is_active ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-slate-100 text-slate-500 ring-slate-200"].join(" ")}>{property.is_active ? "Actif" : "Inactif"}</span></div>
                  </div>

                  {canManageProperties ? <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                    <PropertyEditButton
                      property={{
                        id: property.id,
                        name: property.name,
                        property_type: property.property_type,
                        owner_id: property.owner_id,
                        address: property.address,
                        city: property.city,
                        country: property.country,
                      }}
                      owners={manageableOwners.map((owner) => ({
                        id: owner.id,
                        first_name: owner.first_name,
                        last_name: owner.last_name,
                        is_active: owner.is_active,
                      }))}
                    />
                    <form action={togglePropertyActiveAction}><input type="hidden" name="property_id" value={property.id} /><input type="hidden" name="next_is_active" value={property.is_active ? "false" : "true"} /><button type="submit" className={property.is_active ? "rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600" : "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700"}>{property.is_active ? "Désactiver" : "Réactiver"}</button></form>
                    <form action={deletePropertyAction}><input type="hidden" name="property_id" value={property.id} /><DeletePropertyButton propertyName={property.name} /></form>
                  </div> : null}
                </div>
              ))}</div> : <EmptyState query={query} />}
            </section>
          </div>
        </main>
      </div>
      <style>{`.field{height:2.75rem;width:100%;border-radius:.75rem;border:1px solid #e2e8f0;background:white;padding:0 .875rem;font-size:.8125rem;outline:none}.field:focus{border-color:#fca5a5;box-shadow:0 0 0 4px #fef2f2}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1.5"><span className="text-[12px] font-semibold text-slate-600">{label}</span>{children}</label>;
}

function EmptyState({ query }: { query: string }) {
  return <div className="flex min-h-[300px] flex-col items-center justify-center px-5 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50"><Building2 className="h-6 w-6 text-red-500" /></div><h3 className="mt-4 text-[16px] font-bold text-slate-900">Aucun bien</h3><p className="mt-1 text-[13px] text-slate-500">{query ? "Aucun bien ne correspond à votre recherche." : "Les biens de votre organisation apparaîtront ici."}</p></div>;
}
