import {
  Bell,
  Building2,
  CalendarDays,
  Home,
  ReceiptText,
  Search,
  WalletCards,
} from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import { createClient } from "@/lib/supabase/server";

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

function formatCategory(category: string) {
  switch (category) {
    case "MAINTENANCE":
      return "Maintenance";
    case "REPAIR":
      return "Réparation";
    case "UTILITY":
      return "Charges";
    case "TAX":
      return "Taxe";
    case "INSURANCE":
      return "Assurance";
    case "MANAGEMENT":
      return "Gestion";
    case "SERVICE":
      return "Service";
    case "OTHER":
    default:
      return "Autre";
  }
}

function getExpenseStatus(status: string) {
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
          "bg-slate-100 text-slate-600 ring-slate-200",
      };

    case "CANCELLED":
      return {
        label: "Annulée",
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

export default async function ExpensesPage() {
  const supabase = await createClient();

  const { data: expenses } = await supabase
    .from("expenses")
    .select(
      "id, property_id, unit_id, category, status, title, description, amount, currency, expense_date, paid_at, provider_name, reference, created_at"
    )
    .order("expense_date", { ascending: false });

  const expenseRows = expenses ?? [];

  const propertyIds = Array.from(
    new Set(
      expenseRows
        .map((expense) => expense.property_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const unitIds = Array.from(
    new Set(
      expenseRows
        .map((expense) => expense.unit_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const [propertiesResult, unitsResult] = await Promise.all([
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

  const rows = expenseRows.map((expense) => {
    const property = expense.property_id
      ? propertyMap.get(expense.property_id)
      : undefined;

    const unit = expense.unit_id
      ? unitMap.get(expense.unit_id)
      : undefined;

    return {
      id: expense.id,
      title: expense.title,
      description: expense.description,
      category: formatCategory(expense.category),
      status: expense.status,
      amount: Number(expense.amount ?? 0),
      expenseDate: expense.expense_date,
      providerName: expense.provider_name || "—",
      reference:
        expense.reference || expense.id.slice(0, 8).toUpperCase(),
      propertyName: property?.name ?? "Bien non renseigné",
      propertyLocation:
        property?.address ||
        property?.city ||
        "Adresse non renseignée",
      unitName: unit?.name ?? "—",
    };
  });

  const paidExpenses = expenseRows.filter(
    (expense) => expense.status === "PAID"
  );

  const pendingExpenses = expenseRows.filter(
    (expense) => expense.status === "PENDING"
  );

  const totalPaid = paidExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount ?? 0),
    0
  );

  const totalPending = pendingExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount ?? 0),
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
            <section>
              <div className="mb-4">
                <h2 className="text-[20px] font-extrabold text-slate-900">
                  Suivi des dépenses
                </h2>

                <p className="mt-1 text-[13px] text-slate-500">
                  Consultez les dépenses liées à vos biens, unités et prestataires.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Dépenses
                    </p>
                    <WalletCards className="h-5 w-5 text-red-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {expenseRows.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Payées
                    </p>
                    <ReceiptText className="h-5 w-5 text-emerald-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {paidExpenses.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Total payé
                    </p>
                    <WalletCards className="h-5 w-5 text-emerald-500" />
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
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[18px] font-extrabold text-slate-900">
                    Liste des dépenses
                  </h2>

                  <p className="mt-1 text-[12px] text-slate-500">
                    {rows.length} dépense
                    {rows.length > 1 ? "s" : ""} enregistrée
                    {rows.length > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="relative w-full sm:w-[300px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    placeholder="Rechercher une dépense..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {rows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-3">Dépense</th>
                        <th className="px-5 py-3">Bien / unité</th>
                        <th className="px-5 py-3">Catégorie</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Prestataire</th>
                        <th className="px-5 py-3">Montant</th>
                        <th className="px-5 py-3 text-right">Statut</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {rows.map((expense) => {
                        const status =
                          getExpenseStatus(expense.status);

                        return (
                          <tr
                            key={expense.id}
                            className="text-[13px] text-slate-600 transition hover:bg-slate-50/70"
                          >
                            <td className="px-5 py-4">
                              <p className="font-bold text-slate-900">
                                {expense.title}
                              </p>

                              <p className="mt-1 text-[11px] text-slate-400">
                                Réf. {expense.reference}
                              </p>

                              {expense.description && (
                                <p className="mt-1 max-w-[280px] truncate text-[11px] text-slate-400">
                                  {expense.description}
                                </p>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-start gap-2">
                                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                                <div>
                                  <p className="font-semibold text-slate-800">
                                    {expense.propertyName}
                                  </p>

                                  <div className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500">
                                    <Home className="h-3.5 w-3.5" />
                                    <span>{expense.unitName}</span>
                                  </div>

                                  <p className="mt-1 max-w-[220px] truncate text-[11px] text-slate-400">
                                    {expense.propertyLocation}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4 font-medium text-slate-700">
                              {expense.category}
                            </td>

                            <td className="px-5 py-4 font-medium text-slate-700">
                              {formatDate(expense.expenseDate)}
                            </td>

                            <td className="px-5 py-4">
                              {expense.providerName}
                            </td>

                            <td className="px-5 py-4 font-bold text-slate-900">
                              {formatXof(expense.amount)}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <span
                                className={[
                                  "inline-flex rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ring-inset",
                                  status.className,
                                ].join(" ")}
                              >
                                {status.label}
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
                    <WalletCards className="h-6 w-6 text-red-500" />
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
