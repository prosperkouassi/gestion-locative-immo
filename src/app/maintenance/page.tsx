import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Search,
  Wrench,
} from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import { requireActiveMembership } from "@/lib/auth/access";

import DeleteMaintenanceButton from "./DeleteMaintenanceButton";
import MaintenanceCreateButton, {
  type MaintenancePropertyOption,
  type MaintenanceUnitOption,
} from "./MaintenanceCreateButton";
import MaintenanceEditButton from "./MaintenanceEditButton";

type StatusTone = "success" | "warning" | "danger" | "neutral";

function formatXof(value: number | null) {
  if (value === null) return "—";

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value)} F CFA`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const normalized = value.slice(0, 10);

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${normalized}T00:00:00Z`));
}

function formatPriority(priority: string) {
  switch (priority) {
    case "URGENT":
      return { label: "Urgente", tone: "danger" as const };
    case "HIGH":
      return { label: "Haute", tone: "warning" as const };
    case "LOW":
      return { label: "Faible", tone: "neutral" as const };
    case "MEDIUM":
    default:
      return { label: "Moyenne", tone: "neutral" as const };
  }
}

function formatStatus(status: string) {
  switch (status) {
    case "COMPLETED":
      return { label: "Terminée", tone: "success" as const };
    case "IN_PROGRESS":
      return { label: "En cours", tone: "warning" as const };
    case "PLANNED":
      return { label: "Planifiée", tone: "neutral" as const };
    case "CANCELLED":
      return { label: "Annulée", tone: "neutral" as const };
    case "OPEN":
    default:
      return { label: "Ouverte", tone: "danger" as const };
  }
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: StatusTone;
}) {
  const classes = {
    success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    warning: "bg-amber-50 text-amber-700 ring-amber-100",
    danger: "bg-red-50 text-red-600 ring-red-100",
    neutral: "bg-slate-100 text-slate-600 ring-slate-200",
  };

  return (
    <span
      className={`inline-flex rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ring-inset ${classes[tone]}`}
    >
      {label}
    </span>
  );
}

type MaintenancePageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    message?: string;
  }>;
};

export default async function MaintenancePage({
  searchParams,
}: MaintenancePageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";

  const feedbackStatus =
    params.status === "success"
      ? "success"
      : params.status === "error"
        ? "error"
        : null;

  const feedbackMessage = params.message?.trim() || null;

  const { supabase, membership } = await requireActiveMembership();

  const canManage = ["ADMIN_AGENCY", "MANAGER"].includes(
    membership.role
  );

  const canCreate = canManage || membership.role === "TENANT";

  const [requestsResult, propertiesResult, unitsResult] =
    await Promise.all([
      supabase
        .from("maintenance_requests")
        .select(
          "id, property_id, unit_id, title, description, priority, status, reported_at, scheduled_for, completed_at, estimated_cost, actual_cost, currency, provider_name, provider_phone, notes, created_at, updated_at"
        )
        .eq("organization_id", membership.organization_id)
        .order("reported_at", { ascending: false }),

      supabase
        .from("properties")
        .select("id, name, address, city")
        .eq("organization_id", membership.organization_id)
        .order("name", { ascending: true }),

      supabase
        .from("units")
        .select("id, property_id, name")
        .eq("organization_id", membership.organization_id)
        .order("name", { ascending: true }),
    ]);

  const maintenanceRequests = requestsResult.data ?? [];
  const properties = propertiesResult.data ?? [];
  const units = unitsResult.data ?? [];

  const propertyMap = new Map(
    properties.map((property) => [property.id, property])
  );

  const unitMap = new Map(units.map((unit) => [unit.id, unit]));

  const propertyOptions: MaintenancePropertyOption[] = properties.map(
    (property) => ({
      id: property.id,
      name: property.name,
    })
  );

  const unitOptions: MaintenanceUnitOption[] = units.map((unit) => ({
    id: unit.id,
    propertyId: unit.property_id,
    name: unit.name,
  }));

  const items = maintenanceRequests.map((request) => {
    const property = request.property_id
      ? propertyMap.get(request.property_id)
      : undefined;

    const unit = request.unit_id
      ? unitMap.get(request.unit_id)
      : undefined;

    return {
      ...request,
      propertyName: property?.name ?? "Bien non renseigné",
      propertyLocation: property?.address || property?.city || "—",
      unitName: unit?.name ?? "—",
      statusPresentation: formatStatus(request.status),
      priorityPresentation: formatPriority(request.priority),
    };
  });

  const normalizedQuery = query.toLocaleLowerCase("fr");

  const filteredItems = query
    ? items.filter((item) =>
        [
          item.title,
          item.description,
          item.propertyName,
          item.unitName,
          item.provider_name,
          item.provider_phone,
          item.priorityPresentation.label,
          item.statusPresentation.label,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("fr")
          .includes(normalizedQuery)
      )
    : items;

  const openCount = maintenanceRequests.filter(
    (request) => request.status === "OPEN"
  ).length;

  const inProgressCount = maintenanceRequests.filter(
    (request) => request.status === "IN_PROGRESS"
  ).length;

  const plannedCount = maintenanceRequests.filter(
    (request) => request.status === "PLANNED"
  ).length;

  const completedCount = maintenanceRequests.filter(
    (request) => request.status === "COMPLETED"
  ).length;

  const estimatedTotal = maintenanceRequests.reduce(
    (sum, request) => sum + Number(request.estimated_cost ?? 0),
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
                Gestion technique
              </p>
              <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-[#111827]">
                Maintenance
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="#search-maintenance"
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

              {canCreate ? (
                <MaintenanceCreateButton
                  properties={propertyOptions}
                  units={unitOptions}
                  canManage={canManage}
                />
              ) : null}
            </div>
          </header>

          <div className="space-y-6 p-5 md:p-8">
            {feedbackMessage && feedbackStatus ? (
              <div
                className={[
                  "rounded-2xl border p-4 text-[13px] font-semibold shadow-sm",
                  feedbackStatus === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700",
                ].join(" ")}
              >
                {feedbackMessage}
              </div>
            ) : null}

            <section>
              <div className="mb-4">
                <h2 className="text-[20px] font-extrabold text-slate-900">
                  Suivi des interventions
                </h2>
                <p className="mt-1 text-[13px] text-slate-500">
                  Visualisez les demandes techniques et leur état d’avancement.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Ouvertes
                    </p>
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {openCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      En cours
                    </p>
                    <Clock3 className="h-5 w-5 text-amber-500" />
                  </div>
                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {inProgressCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Planifiées
                    </p>
                    <CalendarDays className="h-5 w-5 text-slate-500" />
                  </div>
                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {plannedCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Terminées
                    </p>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {completedCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Coût estimé
                    </p>
                    <CircleDollarSign className="h-5 w-5 text-red-500" />
                  </div>
                  <p className="mt-4 text-[22px] font-extrabold text-slate-900">
                    {formatXof(estimatedTotal)}
                  </p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[18px] font-extrabold text-slate-900">
                    Interventions
                  </h2>
                  <p className="mt-1 text-[12px] text-slate-500">
                    {filteredItems.length} intervention
                    {filteredItems.length > 1 ? "s" : ""} trouvée
                    {filteredItems.length > 1 ? "s" : ""}
                  </p>
                </div>

                <form
                  id="search-maintenance"
                  method="get"
                  className="flex w-full gap-2 sm:w-auto"
                >
                  <div className="relative flex-1 sm:w-[300px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      name="q"
                      type="search"
                      defaultValue={query}
                      placeholder="Rechercher une intervention..."
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] outline-none placeholder:text-slate-400 focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </div>

                  <button
                    type="submit"
                    className="h-10 rounded-xl bg-slate-900 px-4 text-[12px] font-bold text-white"
                  >
                    Rechercher
                  </button>
                </form>
              </div>

              {filteredItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-3">Intervention</th>
                        <th className="px-5 py-3">Bien / unité</th>
                        <th className="px-5 py-3">Priorité</th>
                        <th className="px-5 py-3">Statut</th>
                        <th className="px-5 py-3">Planifiée</th>
                        <th className="px-5 py-3">Prestataire</th>
                        <th className="px-5 py-3 text-right">Coût</th>
                        {canManage ? (
                          <th className="px-5 py-3 text-right">Actions</th>
                        ) : null}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.map((item) => (
                        <tr
                          key={item.id}
                          className="text-[13px] text-slate-600 transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <div className="max-w-[300px]">
                              <p className="font-bold text-slate-900">
                                {item.title}
                              </p>
                              <p className="mt-1 line-clamp-2 text-[12px] text-slate-400">
                                {item.description || "Aucune description"}
                              </p>
                              <p className="mt-1 text-[10px] text-slate-400">
                                Signalée le {formatDate(item.reported_at)}
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800">
                              {item.unitName}
                            </p>
                            <p className="mt-1 text-[12px] text-slate-400">
                              {item.propertyName}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              label={item.priorityPresentation.label}
                              tone={item.priorityPresentation.tone}
                            />
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              label={item.statusPresentation.label}
                              tone={item.statusPresentation.tone}
                            />
                            {item.completed_at ? (
                              <p className="mt-1 text-[10px] text-slate-400">
                                {formatDate(item.completed_at)}
                              </p>
                            ) : null}
                          </td>

                          <td className="px-5 py-4 font-medium text-slate-700">
                            {formatDate(item.scheduled_for)}
                          </td>

                          <td className="px-5 py-4">
                            <p>{item.provider_name || "—"}</p>
                            {item.provider_phone ? (
                              <p className="mt-1 text-[11px] text-slate-400">
                                {item.provider_phone}
                              </p>
                            ) : null}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <p className="font-bold text-slate-900">
                              {formatXof(
                                item.actual_cost === null
                                  ? item.estimated_cost === null
                                    ? null
                                    : Number(item.estimated_cost)
                                  : Number(item.actual_cost)
                              )}
                            </p>
                            {item.actual_cost !== null ? (
                              <p className="mt-1 text-[10px] text-slate-400">
                                Réel
                              </p>
                            ) : item.estimated_cost !== null ? (
                              <p className="mt-1 text-[10px] text-slate-400">
                                Estimé
                              </p>
                            ) : null}
                          </td>

                          {canManage ? (
                            <td className="px-5 py-4">
                              <div className="flex flex-wrap justify-end gap-2">
                                <MaintenanceEditButton
                                  request={{
                                    id: item.id,
                                    propertyId: item.property_id,
                                    unitId: item.unit_id,
                                    title: item.title,
                                    description: item.description,
                                    priority: item.priority,
                                    status: item.status,
                                    scheduledFor: item.scheduled_for,
                                    estimatedCost:
                                      item.estimated_cost === null
                                        ? null
                                        : Number(item.estimated_cost),
                                    actualCost:
                                      item.actual_cost === null
                                        ? null
                                        : Number(item.actual_cost),
                                    providerName: item.provider_name,
                                    providerPhone: item.provider_phone,
                                    notes: item.notes,
                                  }}
                                  properties={propertyOptions}
                                  units={unitOptions}
                                />

                                <DeleteMaintenanceButton
                                  requestId={item.id}
                                  status={item.status}
                                />
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center px-5 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
                    <Wrench className="h-6 w-6 text-red-500" />
                  </div>
                  <h3 className="mt-4 text-[16px] font-bold text-slate-900">
                    Aucune intervention
                  </h3>
                  <p className="mt-1 max-w-md text-[13px] text-slate-500">
                    Les demandes de maintenance accessibles à votre compte apparaîtront ici.
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
