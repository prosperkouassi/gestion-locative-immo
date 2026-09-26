import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  MessageSquareText,
  Plus,
  Search,
  Wrench,
} from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import { requireActiveMembership } from "@/lib/auth/access";

import { createMaintenanceRequest } from "./actions";

type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "neutral";

type MaintenancePageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

function formatXof(value: number | null) {
  if (value === null) return "—";

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
  }).format(new Date(value));
}

function formatPriority(priority: string) {
  switch (priority) {
    case "URGENT":
      return {
        label: "Urgente",
        tone: "danger" as const,
      };

    case "HIGH":
      return {
        label: "Haute",
        tone: "warning" as const,
      };

    case "LOW":
      return {
        label: "Faible",
        tone: "neutral" as const,
      };

    case "MEDIUM":
    default:
      return {
        label: "Moyenne",
        tone: "neutral" as const,
      };
  }
}

function formatStatus(status: string) {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Terminée",
        tone: "success" as const,
      };

    case "IN_PROGRESS":
      return {
        label: "En cours",
        tone: "warning" as const,
      };

    case "PLANNED":
      return {
        label: "Planifiée",
        tone: "neutral" as const,
      };

    case "CANCELLED":
      return {
        label: "Annulée",
        tone: "neutral" as const,
      };

    case "OPEN":
    default:
      return {
        label: "Ouverte",
        tone: "danger" as const,
      };
  }
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: StatusTone;
}) {
  const classes: Record<StatusTone, string> = {
    success:
      "bg-emerald-50 text-emerald-700 ring-emerald-100",
    warning:
      "bg-amber-50 text-amber-700 ring-amber-100",
    danger:
      "bg-red-50 text-red-600 ring-red-100",
    neutral:
      "bg-slate-100 text-slate-600 ring-slate-200",
  };

  return (
    <span
      className={`inline-flex rounded-lg px-2.5 py-1.5 text-[13px] font-semibold ring-1 ring-inset ${classes[tone]}`}
    >
      {label}
    </span>
  );
}

export default async function MaintenancePage({
  searchParams,
}: MaintenancePageProps) {
  const params = await searchParams;

  const { supabase, membership } =
    await requireActiveMembership();

  const canCreate = [
    "ADMIN_AGENCY",
    "MANAGER",
    "TENANT",
  ].includes(membership.role);

  const { data: requests } = await supabase
    .from("maintenance_requests")
    .select(
      "id, property_id, unit_id, title, description, priority, status, reported_at, scheduled_for, completed_at, estimated_cost, actual_cost, currency, provider_name"
    )
    .order("reported_at", {
      ascending: false,
    });

  const maintenanceRequests = requests ?? [];

  const propertyIds = Array.from(
    new Set(
      maintenanceRequests
        .map((request) => request.property_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const unitIds = Array.from(
    new Set(
      maintenanceRequests
        .map((request) => request.unit_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const [
    propertiesResult,
    unitsResult,
    creatableUnitsResult,
  ] = await Promise.all([
    propertyIds.length > 0
      ? supabase
          .from("properties")
          .select("id, name, address, city")
          .in("id", propertyIds)
      : Promise.resolve({ data: [] }),

    unitIds.length > 0
      ? supabase
          .from("units")
          .select("id, name")
          .in("id", unitIds)
      : Promise.resolve({ data: [] }),

    canCreate
      ? supabase
          .from("units")
          .select("id, property_id, name")
          .order("name", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const propertyMap = new Map(
    (propertiesResult.data ?? []).map((property) => [
      property.id,
      property,
    ])
  );

  const unitMap = new Map(
    (unitsResult.data ?? []).map((unit) => [
      unit.id,
      unit,
    ])
  );

  const creatableUnits =
    creatableUnitsResult.data ?? [];

  const creatablePropertyIds =
    Array.from(
      new Set(
        creatableUnits
          .map((unit) => unit.property_id)
          .filter(
            (id): id is string => Boolean(id)
          )
      )
    );

  const { data: creatableProperties } =
    creatablePropertyIds.length > 0
      ? await supabase
          .from("properties")
          .select("id, name")
          .in("id", creatablePropertyIds)
      : { data: [] };

  const creatablePropertyMap = new Map(
    (creatableProperties ?? []).map((property) => [
      property.id,
      property,
    ])
  );

  const items = maintenanceRequests.map(
    (request) => {
      const property = request.property_id
        ? propertyMap.get(request.property_id)
        : undefined;

      const unit = request.unit_id
        ? unitMap.get(request.unit_id)
        : undefined;

      return {
        ...request,
        propertyName:
          property?.name ??
          "Bien non renseigné",
        propertyLocation:
          property?.address ||
          property?.city ||
          "—",
        unitName:
          unit?.name ??
          "—",
        statusPresentation:
          formatStatus(request.status),
        priorityPresentation:
          formatPriority(request.priority),
      };
    }
  );

  const openCount = maintenanceRequests.filter(
    (request) => request.status === "OPEN"
  ).length;

  const inProgressCount =
    maintenanceRequests.filter(
      (request) =>
        request.status === "IN_PROGRESS"
    ).length;

  const plannedCount = maintenanceRequests.filter(
    (request) => request.status === "PLANNED"
  ).length;

  const completedCount =
    maintenanceRequests.filter(
      (request) =>
        request.status === "COMPLETED"
    ).length;

  const estimatedTotal =
    maintenanceRequests.reduce(
      (sum, request) =>
        sum +
        Number(
          request.estimated_cost ?? 0
        ),
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
            {params.success && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-700">
                {params.success}
              </div>
            )}

            {params.error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">
                {params.error}
              </div>
            )}

            {canCreate && (
              <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <h2 className="text-[17px] font-extrabold text-slate-900">
                      Nouvelle intervention
                    </h2>

                    <p className="mt-1 text-[12px] text-slate-500">
                      {membership.role === "TENANT"
                        ? "Signalez un problème concernant votre logement."
                        : "Enregistrez une nouvelle demande de maintenance."}
                    </p>
                  </div>

                  <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-[13px] font-bold text-white">
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </span>
                </summary>

                <form
                  action={createMaintenanceRequest}
                  className="grid gap-4 border-t border-slate-100 p-5 md:grid-cols-2"
                >
                  <div className="md:col-span-2">
                    <label
                      htmlFor="unit_id"
                      className="mb-2 block text-[13px] font-semibold text-slate-700"
                    >
                      Logement
                    </label>

                    <select
                      id="unit_id"
                      name="unit_id"
                      required
                      defaultValue=""
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-red-400"
                    >
                      <option value="" disabled>
                        Sélectionner un logement
                      </option>

                      {creatableUnits.map((unit) => (
                        <option
                          key={unit.id}
                          value={unit.id}
                        >
                          {creatablePropertyMap.get(
                            unit.property_id
                          )?.name ?? "Bien"}{" "}
                          — {unit.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="title"
                      className="mb-2 block text-[13px] font-semibold text-slate-700"
                    >
                      Problème signalé
                    </label>

                    <input
                      id="title"
                      name="title"
                      type="text"
                      required
                      minLength={3}
                      maxLength={160}
                      placeholder="Ex. Fuite d’eau dans la salle de bain"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-red-400"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="priority"
                      className="mb-2 block text-[13px] font-semibold text-slate-700"
                    >
                      Priorité
                    </label>

                    <select
                      id="priority"
                      name="priority"
                      defaultValue="MEDIUM"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-red-400"
                    >
                      <option value="LOW">
                        Faible
                      </option>
                      <option value="MEDIUM">
                        Moyenne
                      </option>
                      <option value="HIGH">
                        Haute
                      </option>
                      <option value="URGENT">
                        Urgente
                      </option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="description"
                      className="mb-2 block text-[13px] font-semibold text-slate-700"
                    >
                      Description
                    </label>

                    <textarea
                      id="description"
                      name="description"
                      rows={4}
                      maxLength={3000}
                      placeholder="Décrivez le problème avec les informations utiles."
                      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-red-400"
                    />
                  </div>

                  <div className="flex justify-end md:col-span-2">
                    <button
                      type="submit"
                      disabled={creatableUnits.length === 0}
                      className="inline-flex h-11 items-center gap-2 rounded-xl bg-red-500 px-5 text-[13px] font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      Enregistrer la demande
                    </button>
                  </div>

                  {creatableUnits.length === 0 && (
                    <p className="md:col-span-2 text-[12px] font-medium text-amber-600">
                      Aucun logement accessible n’est disponible pour créer une demande.
                    </p>
                  )}
                </form>
              </details>
            )}

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
                    {maintenanceRequests.length} intervention
                    {maintenanceRequests.length > 1 ? "s" : ""} enregistrée
                    {maintenanceRequests.length > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="relative w-full sm:w-[280px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher une intervention..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-3">
                          Intervention
                        </th>
                        <th className="px-5 py-3">
                          Bien / unité
                        </th>
                        <th className="px-5 py-3">
                          Priorité
                        </th>
                        <th className="px-5 py-3">
                          Statut
                        </th>
                        <th className="px-5 py-3">
                          Planifiée
                        </th>
                        <th className="px-5 py-3">
                          Prestataire
                        </th>
                        <th className="px-5 py-3 text-right">
                          Coût estimé
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {items.map((item) => (
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
                                {item.description ||
                                  "Aucune description"}
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
                              label={
                                item.priorityPresentation.label
                              }
                              tone={
                                item.priorityPresentation.tone
                              }
                            />
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              label={
                                item.statusPresentation.label
                              }
                              tone={
                                item.statusPresentation.tone
                              }
                            />
                          </td>

                          <td className="px-5 py-4 font-medium text-slate-700">
                            {formatDate(item.scheduled_for)}
                          </td>

                          <td className="px-5 py-4">
                            {item.provider_name || "—"}
                          </td>

                          <td className="px-5 py-4 text-right font-bold text-slate-900">
                            {formatXof(
                              item.estimated_cost === null
                                ? null
                                : Number(item.estimated_cost)
                            )}
                          </td>
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
                    Les demandes de maintenance accessibles avec votre compte apparaîtront ici.
                  </p>
                </div>
              )}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                    <Wrench className="h-5 w-5 text-red-500" />
                  </div>

                  <div>
                    <h3 className="text-[15px] font-bold text-slate-900">
                      Gestion des prestataires
                    </h3>

                    <p className="mt-0.5 text-[12px] text-slate-500">
                      Les coordonnées enregistrées sont visibles dans chaque intervention.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <MessageSquareText className="h-5 w-5 text-slate-600" />
                  </div>

                  <div>
                    <h3 className="text-[15px] font-bold text-slate-900">
                      Historique et communications
                    </h3>

                    <p className="mt-0.5 text-[12px] text-slate-500">
                      Le suivi détaillé sera ajouté lors de la prochaine étape du module maintenance.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
