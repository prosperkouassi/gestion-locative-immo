import {
  BadgeCheck,
  Bell,
  Building2,
  CalendarDays,
  FileText,
  Home,
  Search,
  UserRound,
} from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import { requireActiveMembership } from "@/lib/auth/access";

import { deleteLeaseAction } from "./actions";
import DeleteLeaseButton from "./DeleteLeaseButton";
import LeaseCreateButton from "./LeaseCreateButton";
import LeaseEditButton from "./LeaseEditButton";

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

type LeasesPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    message?: string;
  }>;
};

export default async function LeasesPage({
  searchParams,
}: LeasesPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const feedbackStatus =
    params.status === "success"
      ? "success"
      : params.status === "error"
        ? "error"
        : null;
  const feedbackMessage = params.message?.trim() || null;

  const { supabase, membership } =
    await requireActiveMembership();

  const canManageLeases = [
    "ADMIN_AGENCY",
    "MANAGER",
  ].includes(membership.role);

  const { data: leases, error: leasesError } = await supabase
    .from("leases")
    .select(
      "id, tenant_id, unit_id, status, start_date, end_date, effective_end_date, monthly_rent, currency, security_deposit, payment_due_day, created_at"
    )
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });

  if (leasesError) {
    console.error("Erreur chargement baux :", leasesError);
  }

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
      tenantId: lease.tenant_id,
      unitId: lease.unit_id,
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
      contractEndDate: lease.end_date,
      effectiveEndDate: lease.effective_end_date,
      endDate: effectiveEnd,
      monthlyRent: Number(lease.monthly_rent ?? 0),
      depositAmount: Number(lease.security_deposit ?? 0),
      dueDay: lease.payment_due_day,
      isCurrent,
    };
  });

  const filteredRows = query
    ? rows.filter((lease) => {
        const haystack = [
          lease.tenantName,
          lease.unitName,
          lease.propertyName,
          lease.status,
        ]
          .join(" ")
          .toLocaleLowerCase("fr");

        return haystack.includes(
          query.toLocaleLowerCase("fr")
        );
      })
    : rows;

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

  const manageableTenants =
    canManageLeases
      ? (
          await supabase
            .from("tenants")
            .select(
              "id, first_name, last_name, is_active"
            )
            .eq(
              "organization_id",
              membership.organization_id
            )
            .order("last_name", {
              ascending: true,
            })
        ).data ?? []
      : [];

  const manageableUnits =
    canManageLeases
      ? (
          await supabase
            .from("units")
            .select(
              "id, property_id, name, monthly_rent, is_active"
            )
            .eq(
              "organization_id",
              membership.organization_id
            )
            .order("name", {
              ascending: true,
            })
        ).data ?? []
      : [];

  const manageablePropertyIds = Array.from(
    new Set(
      manageableUnits.map((unit) => unit.property_id)
    )
  );

  const manageableProperties =
    canManageLeases && manageablePropertyIds.length > 0
      ? (
          await supabase
            .from("properties")
            .select("id, name")
            .in("id", manageablePropertyIds)
        ).data ?? []
      : [];

  const manageablePropertyMap = new Map(
    manageableProperties.map((property) => [
      property.id,
      property.name,
    ])
  );

  const tenantOptions = manageableTenants
    .filter((tenant) => tenant.is_active)
    .map((tenant) => ({
      id: tenant.id,
      name: formatTenantName(
        tenant.first_name,
        tenant.last_name
      ),
    }));

  const unitOptions = manageableUnits
    .filter((unit) => unit.is_active)
    .map((unit) => ({
      id: unit.id,
      name: unit.name,
      propertyName:
        manageablePropertyMap.get(unit.property_id) ??
        "Bien",
      monthlyRent: Number(unit.monthly_rent ?? 0),
    }));

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
              <a
                href="#search-leases"
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

              {canManageLeases ? (
                <LeaseCreateButton
                  tenants={tenantOptions}
                  units={unitOptions}
                />
              ) : null}
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
                  Suivi des baux
                </h2>
                <p className="mt-1 text-[13px] text-slate-500">
                  Consultez les contrats de location, leurs périodes et les loyers associés.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Baux actifs", activeCount, FileText, "text-red-500"],
                  ["En cours aujourd’hui", currentCount, CalendarDays, "text-emerald-500"],
                  ["Brouillons", draftCount, FileText, "text-slate-500"],
                ].map(([label, value, Icon, color], index) => {
                  const C = Icon as typeof FileText;
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
                    {filteredRows.length} bail
                    {filteredRows.length > 1 ? "x" : ""} affiché
                    {filteredRows.length > 1 ? "s" : ""}
                  </p>
                </div>

                <form
                  id="search-leases"
                  method="get"
                  className="flex w-full gap-2 sm:w-auto"
                >
                  <div className="relative flex-1 sm:w-[300px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      name="q"
                      type="search"
                      defaultValue={query}
                      placeholder="Rechercher un bail..."
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
                      href="/leases"
                      className="flex h-10 items-center rounded-xl border border-slate-200 px-3 text-[12px] font-semibold text-slate-600"
                    >
                      Effacer
                    </a>
                  ) : null}
                </form>
              </div>

              {filteredRows.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {filteredRows.map((lease) => {
                    const status = formatLeaseStatus(lease.status);

                    return (
                      <div
                        key={lease.id}
                        className="px-5 py-5 transition hover:bg-slate-50/70"
                      >
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_170px_150px_130px_120px_100px_auto] xl:items-center">
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
                            </div>
                          </div>

                          <div>
                            <p className="font-medium text-slate-700">
                              {formatDate(lease.startDate)}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              au {formatDate(lease.endDate)}
                            </p>
                          </div>

                          <div className="font-bold text-slate-900">
                            {formatXof(lease.monthlyRent)}
                          </div>

                          <div className="font-medium text-slate-700">
                            {formatXof(lease.depositAmount)}
                          </div>

                          <div className="font-semibold text-slate-700">
                            Jour {lease.dueDay}
                          </div>

                          <div>
                            <span
                              className={[
                                "inline-flex rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ring-inset",
                                status.className,
                              ].join(" ")}
                            >
                              {status.label}
                            </span>
                            {lease.isCurrent ? (
                              <p className="mt-1 text-[10px] font-semibold text-emerald-600">
                                En cours
                              </p>
                            ) : null}
                          </div>

                          {canManageLeases ? (
                            <div className="flex flex-wrap gap-2 xl:justify-end">
                              <LeaseEditButton
                                lease={{
                                  id: lease.id,
                                  tenant_id: lease.tenantId,
                                  unit_id: lease.unitId,
                                  status: lease.status,
                                  start_date: lease.startDate,
                                  end_date: lease.contractEndDate,
                                  effective_end_date: lease.effectiveEndDate,
                                  monthly_rent: lease.monthlyRent,
                                  security_deposit: lease.depositAmount,
                                  payment_due_day: lease.dueDay,
                                }}
                                tenants={tenantOptions}
                                units={unitOptions}
                              />

                              <form action={deleteLeaseAction}>
                                <input
                                  type="hidden"
                                  name="lease_id"
                                  value={lease.id}
                                />
                                <DeleteLeaseButton />
                              </form>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center px-5 text-center">
                  <FileText className="h-7 w-7 text-red-500" />
                  <h3 className="mt-4 text-[16px] font-bold text-slate-900">
                    Aucun bail
                  </h3>
                  <p className="mt-1 text-[13px] text-slate-500">
                    {query
                      ? "Aucun bail ne correspond à votre recherche."
                      : "Les baux de votre organisation apparaîtront ici."}
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
