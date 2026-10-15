import {
  BadgeCheck,
  Bell,
  Building2,
  CalendarDays,
  Home,
  Phone,
  Search,
  UserRound,
} from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import { requireAdminOrManager } from "@/lib/auth/access";

import {
  deleteTenantAction,
  toggleTenantActiveAction,
} from "./actions";
import DeleteTenantButton from "./DeleteTenantButton";
import TenantCreateButton from "./TenantCreateButton";
import TenantEditButton from "./TenantEditButton";

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

type TenantsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    message?: string;
  }>;
};

export default async function TenantsPage({
  searchParams,
}: TenantsPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const feedbackStatus =
    params.status === "success"
      ? "success"
      : params.status === "error"
        ? "error"
        : null;
  const feedbackMessage = params.message?.trim() || null;

  const { supabase, membership } = await requireAdminOrManager();

  const { data: tenants, error: tenantsError } = await supabase
    .from("tenants")
    .select(
      "id, first_name, last_name, phone, is_active, created_at"
    )
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });

  if (tenantsError) {
    console.error("Erreur chargement locataires :", tenantsError);
  }

  const tenantRows = tenants ?? [];
  const tenantIds = tenantRows.map((tenant) => tenant.id);

  const { data: leases } =
    tenantIds.length > 0
      ? await supabase
          .from("leases")
          .select(
            "id, tenant_id, unit_id, status, start_date, end_date, effective_end_date"
          )
          .eq("organization_id", membership.organization_id)
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

    const existingEnd =
      existing.effective_end_date ?? existing.end_date;
    const leaseEnd =
      lease.effective_end_date ?? lease.end_date;

    const existingIsCurrent =
      existing.status === "ACTIVE" &&
      existing.start_date <= today &&
      (!existingEnd || existingEnd >= today);

    const leaseIsCurrent =
      lease.status === "ACTIVE" &&
      lease.start_date <= today &&
      (!leaseEnd || leaseEnd >= today);

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

  const unitMap = new Map(
    unitRows.map((unit) => [unit.id, unit])
  );

  const propertyMap = new Map(
    (properties ?? []).map((property) => [
      property.id,
      property,
    ])
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
      firstName: tenant.first_name,
      lastName: tenant.last_name,
      phoneRaw: tenant.phone,
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

  const filteredRows = query
    ? rows.filter((tenant) => {
        const haystack = [
          tenant.name,
          tenant.phone,
          tenant.propertyName,
          tenant.unitName,
        ]
          .join(" ")
          .toLocaleLowerCase("fr");

        return haystack.includes(
          query.toLocaleLowerCase("fr")
        );
      })
    : rows;

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
              <a
                href="#search-tenants"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
                aria-label="Rechercher"
              >
                <Search className="h-4 w-4" />
              </a>

              <button
                type="button"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
              </button>

              <TenantCreateButton />
            </div>
          </header>

          <div className="space-y-6 p-5 md:p-8">
            {feedbackMessage && feedbackStatus ? (
              <div
                className={[
                  "flex items-start gap-3 rounded-2xl border p-4 text-[13px] font-semibold shadow-sm",
                  feedbackStatus === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700",
                ].join(" ")}
              >
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{feedbackMessage}</p>
              </div>
            ) : null}

            <section>
              <div className="mb-4">
                <h2 className="text-[20px] font-extrabold text-slate-900">
                  Portefeuille locataires
                </h2>
                <p className="mt-1 text-[13px] text-slate-500">
                  Consultez vos locataires, leur logement et la situation de leur bail.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Locataires", tenantRows.length, UserRound, "text-red-500"],
                  ["Actifs", activeTenants, UserRound, "text-emerald-500"],
                  ["Occupants actuels", occupiedTenants, Home, "text-emerald-500"],
                  ["Avec bail", tenantsWithLease, CalendarDays, "text-slate-600"],
                ].map(([label, value, Icon, color], index) => {
                  const C = Icon as typeof UserRound;
                  return (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-slate-500">
                          {label as string}
                        </p>
                        <C className={`h-5 w-5 ${color as string}`} />
                      </div>
                      <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                        {value as number}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[18px] font-extrabold text-slate-900">
                    Liste des locataires
                  </h2>
                  <p className="mt-1 text-[12px] text-slate-500">
                    {filteredRows.length} locataire
                    {filteredRows.length > 1 ? "s" : ""} affiché
                    {filteredRows.length > 1 ? "s" : ""}
                  </p>
                </div>

                <form
                  id="search-tenants"
                  method="get"
                  className="flex w-full gap-2 sm:w-auto"
                >
                  <div className="relative flex-1 sm:w-[300px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      name="q"
                      type="search"
                      defaultValue={query}
                      placeholder="Rechercher un locataire..."
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] outline-none placeholder:text-slate-400 focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-10 rounded-xl bg-slate-900 px-4 text-[12px] font-bold text-white"
                  >
                    Rechercher
                  </button>
                  {query ? (
                    <a
                      href="/tenants"
                      className="flex h-10 items-center rounded-xl border border-slate-200 px-3 text-[12px] font-semibold text-slate-600"
                    >
                      Effacer
                    </a>
                  ) : null}
                </form>
              </div>

              {filteredRows.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {filteredRows.map((tenant) => {
                    const leasePresentation =
                      formatLeaseStatus(tenant.leaseStatus);

                    return (
                      <div
                        key={tenant.id}
                        className="px-5 py-5 transition hover:bg-slate-50/70"
                      >
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_170px_130px_110px_auto] xl:items-center">
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
                                <span>{tenant.phone}</span>
                              </div>
                              <p className="mt-1 text-[11px] text-slate-400">
                                Réf. {tenant.id.slice(0, 8).toUpperCase()}
                              </p>
                            </div>
                          </div>

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

                          <div>
                            <span
                              className={[
                                "inline-flex rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ring-inset",
                                leasePresentation.className,
                              ].join(" ")}
                            >
                              {leasePresentation.label}
                            </span>
                            {tenant.leaseStatus !== null ? (
                              <div className="mt-2 space-y-1 text-[11px] text-slate-400">
                                <p>Début : {formatDate(tenant.leaseStart)}</p>
                                <p>Fin : {formatDate(tenant.leaseEnd)}</p>
                              </div>
                            ) : null}
                          </div>

                          <div>
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
                          </div>

                          <div>
                            <span
                              className={[
                                "inline-flex rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ring-inset",
                                tenant.isActive
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                  : "bg-slate-100 text-slate-500 ring-slate-200",
                              ].join(" ")}
                            >
                              {tenant.isActive ? "Actif" : "Inactif"}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 xl:justify-end">
                            <TenantEditButton
                              tenant={{
                                id: tenant.id,
                                first_name: tenant.firstName,
                                last_name: tenant.lastName,
                                phone: tenant.phoneRaw,
                              }}
                            />

                            <form action={toggleTenantActiveAction}>
                              <input
                                type="hidden"
                                name="tenant_id"
                                value={tenant.id}
                              />
                              <input
                                type="hidden"
                                name="next_is_active"
                                value={tenant.isActive ? "false" : "true"}
                              />
                              <button
                                type="submit"
                                className={[
                                  "rounded-xl border px-3 py-2 text-[12px] font-semibold transition",
                                  tenant.isActive
                                    ? "border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                                ].join(" ")}
                              >
                                {tenant.isActive
                                  ? "Désactiver"
                                  : "Réactiver"}
                              </button>
                            </form>

                            <form action={deleteTenantAction}>
                              <input
                                type="hidden"
                                name="tenant_id"
                                value={tenant.id}
                              />
                              <DeleteTenantButton
                                tenantName={tenant.name}
                              />
                            </form>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center px-5 text-center">
                  <UserRound className="h-7 w-7 text-red-500" />
                  <h3 className="mt-4 text-[16px] font-bold text-slate-900">
                    Aucun locataire
                  </h3>
                  <p className="mt-1 text-[13px] text-slate-500">
                    {query
                      ? "Aucun locataire ne correspond à votre recherche."
                      : "Les locataires de votre organisation apparaîtront ici."}
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
