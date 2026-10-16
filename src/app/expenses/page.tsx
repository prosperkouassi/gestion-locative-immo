import {
  BadgeDollarSign,
  Bell,
  Building2,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Search,
  WalletCards,
} from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import { requireActiveMembership } from "@/lib/auth/access";

import DeleteExpenseButton from "./DeleteExpenseButton";
import ExpenseCreateButton, {
  type ExpensePropertyOption,
  type ExpenseUnitOption,
} from "./ExpenseCreateButton";
import ExpenseEditButton from "./ExpenseEditButton";

function formatXof(value: number) {
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

function formatCategory(category: string) {
  const labels: Record<string, string> = {
    MAINTENANCE: "Maintenance",
    REPAIR: "Réparation",
    UTILITY: "Charges",
    TAX: "Taxe",
    INSURANCE: "Assurance",
    MANAGEMENT: "Gestion",
    SERVICE: "Prestation",
    OTHER: "Autre",
  };

  return labels[category] ?? category;
}

function getStatus(status: string) {
  switch (status) {
    case "PAID":
      return {
        label: "Payée",
        className:
          "bg-emerald-50 text-emerald-700 ring-emerald-100",
      };

    case "PENDING":
      return {
        label: "En attente",
        className:
          "bg-amber-50 text-amber-700 ring-amber-100",
      };

    case "DRAFT":
      return {
        label: "Brouillon",
        className:
          "bg-blue-50 text-blue-700 ring-blue-100",
      };

    case "CANCELLED":
      return {
        label: "Annulée",
        className:
          "bg-slate-100 text-slate-500 ring-slate-200",
      };

    default:
      return {
        label: status,
        className:
          "bg-slate-100 text-slate-600 ring-slate-200",
      };
  }
}

type ExpensesPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    message?: string;
  }>;
};

export default async function ExpensesPage({
  searchParams,
}: ExpensesPageProps) {
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

  const [
    expensesResult,
    propertiesResult,
    unitsResult,
  ] = await Promise.all([
    supabase
      .from("expenses")
      .select(
        "id, property_id, unit_id, category, status, title, description, amount, currency, expense_date, paid_at, provider_name, reference, notes, created_at, updated_at"
      )
      .eq("organization_id", membership.organization_id)
      .order("expense_date", { ascending: false }),

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

  const expenses = expensesResult.data ?? [];
  const properties = propertiesResult.data ?? [];
  const units = unitsResult.data ?? [];

  const propertyMap = new Map(
    properties.map((property) => [property.id, property])
  );

  const unitMap = new Map(units.map((unit) => [unit.id, unit]));

  const propertyOptions: ExpensePropertyOption[] = properties.map(
    (property) => ({
      id: property.id,
      name: property.name,
    })
  );

  const unitOptions: ExpenseUnitOption[] = units.map((unit) => ({
    id: unit.id,
    propertyId: unit.property_id,
    name: unit.name,
  }));

  const rows = expenses.map((expense) => {
    const property = expense.property_id
      ? propertyMap.get(expense.property_id)
      : undefined;

    const unit = expense.unit_id
      ? unitMap.get(expense.unit_id)
      : undefined;

    return {
      ...expense,
      amountNumber: Number(expense.amount ?? 0),
      propertyName: property?.name ?? "Dépense générale",
      propertyLocation:
        property?.address || property?.city || "—",
      unitName: unit?.name ?? null,
    };
  });

  const normalizedQuery = query.toLocaleLowerCase("fr");

  const filteredRows = query
    ? rows.filter((expense) =>
        [
          expense.title,
          expense.reference,
          expense.provider_name,
          expense.propertyName,
          expense.unitName,
          formatCategory(expense.category),
          expense.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("fr")
          .includes(normalizedQuery)
      )
    : rows;

  const paidExpenses = rows.filter(
    (expense) => expense.status === "PAID"
  );

  const pendingExpenses = rows.filter(
    (expense) => expense.status === "PENDING"
  );

  const draftExpenses = rows.filter(
    (expense) => expense.status === "DRAFT"
  );

  const totalPaid = paidExpenses.reduce(
    (sum, expense) => sum + expense.amountNumber,
    0
  );

  const totalPending = pendingExpenses.reduce(
    (sum, expense) => sum + expense.amountNumber,
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
                Dépenses
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="#search-expenses"
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

              {canManage ? (
                <ExpenseCreateButton
                  properties={propertyOptions}
                  units={unitOptions}
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
                  Suivi des charges
                </h2>

                <p className="mt-1 text-[13px] text-slate-500">
                  Centralisez les dépenses générales, les charges par bien et les coûts par unité.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Dépenses
                    </p>

                    <FileText className="h-5 w-5 text-red-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {rows.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Payées
                    </p>

                    <BadgeDollarSign className="h-5 w-5 text-emerald-500" />
                  </div>

                  <p className="mt-4 text-[22px] font-extrabold text-slate-900">
                    {formatXof(totalPaid)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      En attente
                    </p>

                    <CalendarDays className="h-5 w-5 text-amber-500" />
                  </div>

                  <p className="mt-4 text-[22px] font-extrabold text-slate-900">
                    {formatXof(totalPending)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Brouillons
                    </p>

                    <WalletCards className="h-5 w-5 text-blue-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {draftExpenses.length}
                  </p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[18px] font-extrabold text-slate-900">
                    Liste des dépenses
                  </h2>

                  <p className="mt-1 text-[12px] text-slate-500">
                    {filteredRows.length} dépense
                    {filteredRows.length > 1 ? "s" : ""} trouvée
                    {filteredRows.length > 1 ? "s" : ""}
                  </p>
                </div>

                <form
                  id="search-expenses"
                  method="get"
                  className="flex w-full gap-2 sm:w-auto"
                >
                  <div className="relative flex-1 sm:w-[300px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      name="q"
                      type="search"
                      defaultValue={query}
                      placeholder="Rechercher une dépense..."
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

              {filteredRows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-3">Dépense</th>
                        <th className="px-5 py-3">Bien / unité</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Catégorie</th>
                        <th className="px-5 py-3">Montant</th>
                        <th className="px-5 py-3">Statut</th>
                        {canManage ? (
                          <th className="px-5 py-3 text-right">Actions</th>
                        ) : null}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.map((expense) => {
                        const status = getStatus(expense.status);

                        return (
                          <tr
                            key={expense.id}
                            className="text-[13px] text-slate-600 transition hover:bg-slate-50/70"
                          >
                            <td className="px-5 py-4">
                              <p className="font-bold text-slate-900">
                                {expense.title}
                              </p>

                              <div className="mt-1 space-y-0.5 text-[11px] text-slate-400">
                                {expense.provider_name ? (
                                  <p>Prestataire : {expense.provider_name}</p>
                                ) : null}

                                {expense.reference ? (
                                  <p>Réf. : {expense.reference}</p>
                                ) : null}
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-start gap-2">
                                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                                <div>
                                  <p className="font-semibold text-slate-800">
                                    {expense.propertyName}
                                  </p>

                                  {expense.unitName ? (
                                    <p className="mt-1 text-[12px] text-slate-500">
                                      {expense.unitName}
                                    </p>
                                  ) : null}

                                  <p className="mt-1 max-w-[220px] truncate text-[11px] text-slate-400">
                                    {expense.propertyLocation}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4 font-medium text-slate-700">
                              {formatDate(expense.expense_date)}
                            </td>

                            <td className="px-5 py-4">
                              {formatCategory(expense.category)}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <CircleDollarSign className="h-4 w-4 text-slate-400" />

                                <span className="font-bold text-slate-900">
                                  {formatXof(expense.amountNumber)}
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={[
                                  "inline-flex rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ring-inset",
                                  status.className,
                                ].join(" ")}
                              >
                                {status.label}
                              </span>

                              {expense.status === "PAID" && expense.paid_at ? (
                                <p className="mt-1 text-[10px] text-slate-400">
                                  Payée le {formatDate(expense.paid_at)}
                                </p>
                              ) : null}
                            </td>

                            {canManage ? (
                              <td className="px-5 py-4">
                                <div className="flex flex-wrap justify-end gap-2">
                                  <ExpenseEditButton
                                    expense={{
                                      id: expense.id,
                                      propertyId: expense.property_id,
                                      unitId: expense.unit_id,
                                      category: expense.category,
                                      status: expense.status,
                                      title: expense.title,
                                      description: expense.description,
                                      amount: expense.amountNumber,
                                      expenseDate: expense.expense_date,
                                      providerName: expense.provider_name,
                                      reference: expense.reference,
                                      notes: expense.notes,
                                    }}
                                    properties={propertyOptions}
                                    units={unitOptions}
                                  />

                                  <DeleteExpenseButton
                                    expenseId={expense.id}
                                    status={expense.status}
                                  />
                                </div>
                              </td>
                            ) : null}
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
                    Aucune dépense
                  </h3>

                  <p className="mt-1 max-w-md text-[13px] text-slate-500">
                    Les dépenses enregistrées apparaîtront ici.
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
