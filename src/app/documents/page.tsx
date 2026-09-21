import Link from "next/link";
import {
  Bell,
  Download,
  FileText,
  ReceiptText,
  Search,
  UserRound,
  WalletCards,
} from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import { createClient } from "@/lib/supabase/server";

function formatXof(value: number) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value)} F CFA`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const normalized = value.length === 10 ? `${value}T00:00:00Z` : value;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(normalized));
}

function formatTenantName(
  firstName: string | null | undefined,
  lastName: string | null | undefined
) {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "Locataire";
}

type DocumentRow = {
  id: string;
  type: "RECEIPT" | "QUITTANCE";
  number: string;
  tenantName: string;
  amount: number;
  date: string | null;
  pdfHref: string;
};

export default async function DocumentsPage() {
  const supabase = await createClient();

  const [receiptsResult, quittancesResult] = await Promise.all([
    supabase
      .from("receipts")
      .select("*")
      .order("created_at", { ascending: false }),

    supabase
      .from("rent_quittances")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const receipts = receiptsResult.data ?? [];
  const quittances = quittancesResult.data ?? [];

  const paymentIds = Array.from(
    new Set(
      receipts
        .map((receipt) => receipt.payment_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const quittanceScheduleIds = Array.from(
    new Set(
      quittances
        .map((quittance) => quittance.schedule_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const { data: payments } =
    paymentIds.length > 0
      ? await supabase
          .from("payments")
          .select("id, schedule_id")
          .in("id", paymentIds)
      : { data: [] };

  const receiptScheduleIds = Array.from(
    new Set(
      (payments ?? [])
        .map((payment) => payment.schedule_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const allScheduleIds = Array.from(
    new Set([...receiptScheduleIds, ...quittanceScheduleIds])
  );

  const { data: schedules } =
    allScheduleIds.length > 0
      ? await supabase
          .from("rent_schedules")
          .select("id, lease_id")
          .in("id", allScheduleIds)
      : { data: [] };

  const leaseIds = Array.from(
    new Set(
      (schedules ?? [])
        .map((schedule) => schedule.lease_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const { data: leases } =
    leaseIds.length > 0
      ? await supabase
          .from("leases")
          .select("id, tenant_id")
          .in("id", leaseIds)
      : { data: [] };

  const tenantIds = Array.from(
    new Set(
      (leases ?? [])
        .map((lease) => lease.tenant_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const { data: tenants } =
    tenantIds.length > 0
      ? await supabase
          .from("tenants")
          .select("id, first_name, last_name")
          .in("id", tenantIds)
      : { data: [] };

  const paymentMap = new Map(
    (payments ?? []).map((payment) => [payment.id, payment])
  );

  const scheduleMap = new Map(
    (schedules ?? []).map((schedule) => [schedule.id, schedule])
  );

  const leaseMap = new Map(
    (leases ?? []).map((lease) => [lease.id, lease])
  );

  const tenantMap = new Map(
    (tenants ?? []).map((tenant) => [tenant.id, tenant])
  );

  function tenantNameFromSchedule(scheduleId: string | null | undefined) {
    if (!scheduleId) return "Locataire non renseigné";

    const schedule = scheduleMap.get(scheduleId);
    if (!schedule) return "Locataire non renseigné";

    const lease = leaseMap.get(schedule.lease_id);
    if (!lease) return "Locataire non renseigné";

    const tenant = tenantMap.get(lease.tenant_id);
    if (!tenant) return "Locataire non renseigné";

    return formatTenantName(
      tenant.first_name,
      tenant.last_name
    );
  }

  const receiptRows: DocumentRow[] = receipts.map((receipt) => {
    const payment = paymentMap.get(receipt.payment_id);

    return {
      id: receipt.id,
      type: "RECEIPT",
      number:
        receipt.receipt_number ??
        receipt.number ??
        receipt.id.slice(0, 8).toUpperCase(),
      tenantName: tenantNameFromSchedule(payment?.schedule_id),
      amount: Number(receipt.amount ?? 0),
      date:
        receipt.issued_at ??
        receipt.created_at ??
        null,
      pdfHref: `/api/receipts/${receipt.id}/pdf`,
    };
  });

  const quittanceRows: DocumentRow[] = quittances.map((quittance) => ({
    id: quittance.id,
    type: "QUITTANCE",
    number:
      quittance.quittance_number ??
      quittance.number ??
      quittance.id.slice(0, 8).toUpperCase(),
    tenantName: tenantNameFromSchedule(quittance.schedule_id),
    amount: Number(quittance.amount ?? 0),
    date:
      quittance.issued_at ??
      quittance.created_at ??
      null,
    pdfHref: `/api/quittances/${quittance.id}/pdf`,
  }));

  const documents = [...receiptRows, ...quittanceRows].sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;

    return bTime - aTime;
  });

  const totalReceipts = receiptRows.length;
  const totalQuittances = quittanceRows.length;
  const totalDocumentAmount = documents.reduce(
    (sum, document) => sum + document.amount,
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
                Documents
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
                  Documents locatifs
                </h2>

                <p className="mt-1 text-[13px] text-slate-500">
                  Retrouvez les reçus de paiement et quittances générés par Alteract.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Documents
                    </p>
                    <FileText className="h-5 w-5 text-red-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {documents.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Reçus
                    </p>
                    <ReceiptText className="h-5 w-5 text-emerald-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {totalReceipts}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Quittances
                    </p>
                    <WalletCards className="h-5 w-5 text-slate-600" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {totalQuittances}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Montants documentés
                    </p>
                    <WalletCards className="h-5 w-5 text-red-500" />
                  </div>

                  <p className="mt-4 text-[22px] font-extrabold text-slate-900">
                    {formatXof(totalDocumentAmount)}
                  </p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[18px] font-extrabold text-slate-900">
                    Bibliothèque documentaire
                  </h2>

                  <p className="mt-1 text-[12px] text-slate-500">
                    {documents.length} document
                    {documents.length > 1 ? "s" : ""} disponible
                    {documents.length > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="relative w-full sm:w-[300px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    placeholder="Rechercher un document..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {documents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-3">Document</th>
                        <th className="px-5 py-3">Numéro</th>
                        <th className="px-5 py-3">Locataire</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Montant</th>
                        <th className="px-5 py-3 text-right">PDF</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {documents.map((document) => (
                        <tr
                          key={`${document.type}-${document.id}`}
                          className="text-[13px] text-slate-600 transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={[
                                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                  document.type === "RECEIPT"
                                    ? "bg-emerald-50"
                                    : "bg-red-50",
                                ].join(" ")}
                              >
                                {document.type === "RECEIPT" ? (
                                  <ReceiptText className="h-5 w-5 text-emerald-600" />
                                ) : (
                                  <FileText className="h-5 w-5 text-red-500" />
                                )}
                              </div>

                              <div>
                                <p className="font-bold text-slate-900">
                                  {document.type === "RECEIPT"
                                    ? "Reçu de paiement"
                                    : "Quittance de loyer"}
                                </p>

                                <p className="mt-1 text-[11px] text-slate-400">
                                  Document sécurisé
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 font-semibold text-slate-800">
                            {document.number}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <UserRound className="h-4 w-4 text-slate-400" />
                              <span className="font-semibold text-slate-800">
                                {document.tenantName}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4 font-medium text-slate-700">
                            {formatDate(document.date)}
                          </td>

                          <td className="px-5 py-4 font-bold text-slate-900">
                            {formatXof(document.amount)}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <Link
                              href={document.pdfHref}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            >
                              <Download className="h-4 w-4" />
                              Ouvrir
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center px-5 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
                    <FileText className="h-6 w-6 text-red-500" />
                  </div>

                  <h3 className="mt-4 text-[16px] font-bold text-slate-900">
                    Aucun document
                  </h3>

                  <p className="mt-1 max-w-md text-[13px] text-slate-500">
                    Les reçus et quittances générés apparaîtront ici.
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
