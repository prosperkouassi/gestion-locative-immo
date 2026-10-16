import Link from "next/link";
import {
  Bell,
  Download,
  Eye,
  FileText,
  FolderOpen,
  ReceiptText,
  Search,
  UserRound,
  WalletCards,
} from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import { requireActiveMembership } from "@/lib/auth/access";

import DeleteDocumentButton from "./DeleteDocumentButton";
import DocumentUploadButton, {
  type DocumentEntityOption,
  type DocumentUnitOption,
} from "./DocumentUploadButton";

function formatXof(value: number) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value)} F CFA`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const normalized =
    value.length === 10 ? `${value}T00:00:00Z` : value;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(normalized));
}

function formatFileSize(value: number | null) {
  if (value === null || value < 0) return "—";
  if (value < 1024) return `${value} o`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} Ko`;
  return `${(value / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDocumentType(type: string) {
  const labels: Record<string, string> = {
    LEASE: "Bail",
    RECEIPT: "Reçu",
    QUITTANCE: "Quittance",
    INVOICE: "Facture",
    IDENTITY: "Identité",
    PROPERTY: "Bien",
    MAINTENANCE: "Maintenance",
    OTHER: "Autre",
  };

  return labels[type] ?? "Autre";
}

type GeneratedDocumentRow = {
  id: string;
  type: "RECEIPT" | "QUITTANCE";
  number: string;
  tenantName: string;
  amount: number;
  date: string | null;
  pdfHref: string;
};

type DocumentsPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function DocumentsPage({
  searchParams,
}: DocumentsPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const normalizedQuery = query.toLocaleLowerCase("fr");

  const { supabase, membership } = await requireActiveMembership();

  const canManageDocuments = ["ADMIN_AGENCY", "MANAGER"].includes(
    membership.role
  );

  const [
    sharedDocumentsResult,
    receiptsResult,
    quittancesResult,
    ownersResult,
    tenantsResult,
    propertiesResult,
    unitsResult,
    leasesResult,
  ] = await Promise.all([
    supabase
      .from("documents")
      .select(
        "id, owner_id, tenant_id, property_id, unit_id, lease_id, title, document_type, storage_path, mime_type, file_size, is_visible_to_owner, is_visible_to_tenant, created_at"
      )
      .eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: false }),

    supabase.from("receipts").select("*").order("created_at", {
      ascending: false,
    }),

    supabase.from("rent_quittances").select("*").order("created_at", {
      ascending: false,
    }),

    supabase
      .from("owners")
      .select("id, first_name, last_name")
      .eq("organization_id", membership.organization_id)
      .order("last_name", { ascending: true }),

    supabase
      .from("tenants")
      .select("id, first_name, last_name")
      .eq("organization_id", membership.organization_id)
      .order("last_name", { ascending: true }),

    supabase
      .from("properties")
      .select("id, name")
      .eq("organization_id", membership.organization_id)
      .order("name", { ascending: true }),

    supabase
      .from("units")
      .select("id, property_id, name")
      .eq("organization_id", membership.organization_id)
      .order("name", { ascending: true }),

    supabase
      .from("leases")
      .select("id, tenant_id, unit_id, status, start_date, end_date")
      .eq("organization_id", membership.organization_id)
      .order("start_date", { ascending: false }),
  ]);

  const owners = ownersResult.data ?? [];
  const tenants = tenantsResult.data ?? [];
  const properties = propertiesResult.data ?? [];
  const units = unitsResult.data ?? [];
  const leases = leasesResult.data ?? [];

  const ownerMap = new Map(owners.map((item) => [item.id, item]));
  const tenantMap = new Map(tenants.map((item) => [item.id, item]));
  const propertyMap = new Map(properties.map((item) => [item.id, item]));
  const unitMap = new Map(units.map((item) => [item.id, item]));

  const ownerOptions: DocumentEntityOption[] = owners.map((item) => ({
    id: item.id,
    label:
      `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim() ||
      "Propriétaire",
  }));

  const tenantOptions: DocumentEntityOption[] = tenants.map((item) => ({
    id: item.id,
    label:
      `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim() ||
      "Locataire",
  }));

  const propertyOptions: DocumentEntityOption[] = properties.map((item) => ({
    id: item.id,
    label: item.name,
  }));

  const unitOptions: DocumentUnitOption[] = units.map((item) => ({
    id: item.id,
    propertyId: item.property_id,
    label: item.name,
  }));

  const leaseOptions: DocumentEntityOption[] = leases.map((lease) => {
    const tenant = tenantMap.get(lease.tenant_id);
    const unit = unitMap.get(lease.unit_id);

    const tenantName = tenant
      ? `${tenant.first_name ?? ""} ${tenant.last_name ?? ""}`.trim()
      : "Locataire";

    return {
      id: lease.id,
      label: `${tenantName} — ${unit?.name ?? "Unité"} — ${lease.status}`,
    };
  });

  const sharedDocuments = sharedDocumentsResult.data ?? [];

  const sharedRows = await Promise.all(
    sharedDocuments.map(async (document) => {
      const { data: signedData } = await supabase.storage
        .from("documents")
        .createSignedUrl(document.storage_path, 60 * 5);

      const owner = document.owner_id
        ? ownerMap.get(document.owner_id)
        : undefined;
      const tenant = document.tenant_id
        ? tenantMap.get(document.tenant_id)
        : undefined;
      const property = document.property_id
        ? propertyMap.get(document.property_id)
        : undefined;
      const unit = document.unit_id
        ? unitMap.get(document.unit_id)
        : undefined;

      return {
        id: document.id,
        title: document.title,
        documentType: document.document_type,
        fileSize:
          document.file_size === null ? null : Number(document.file_size),
        createdAt: document.created_at,
        ownerVisible: document.is_visible_to_owner,
        tenantVisible: document.is_visible_to_tenant,
        signedUrl: signedData?.signedUrl ?? null,
        ownerName: owner
          ? `${owner.first_name ?? ""} ${owner.last_name ?? ""}`.trim()
          : null,
        tenantName: tenant
          ? `${tenant.first_name ?? ""} ${tenant.last_name ?? ""}`.trim()
          : null,
        propertyName: property?.name ?? null,
        unitName: unit?.name ?? null,
      };
    })
  );

  const filteredSharedRows = query
    ? sharedRows.filter((document) =>
        [
          document.title,
          formatDocumentType(document.documentType),
          document.ownerName,
          document.tenantName,
          document.propertyName,
          document.unitName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("fr")
          .includes(normalizedQuery)
      )
    : sharedRows;

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
        .map((quittance) => quittance.rent_schedule_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const { data: payments } =
    paymentIds.length > 0
      ? await supabase
          .from("payments")
          .select("id, rent_schedule_id")
          .in("id", paymentIds)
      : { data: [] };

  const receiptScheduleIds = Array.from(
    new Set(
      (payments ?? [])
        .map((payment) => payment.rent_schedule_id)
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

  const generatedLeaseIds = Array.from(
    new Set(
      (schedules ?? [])
        .map((schedule) => schedule.lease_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const { data: generatedLeases } =
    generatedLeaseIds.length > 0
      ? await supabase
          .from("leases")
          .select("id, tenant_id")
          .in("id", generatedLeaseIds)
      : { data: [] };

  const paymentMap = new Map(
    (payments ?? []).map((payment) => [payment.id, payment])
  );
  const scheduleMap = new Map(
    (schedules ?? []).map((schedule) => [schedule.id, schedule])
  );
  const generatedLeaseMap = new Map(
    (generatedLeases ?? []).map((lease) => [lease.id, lease])
  );

  function tenantNameFromSchedule(scheduleId: string | null | undefined) {
    if (!scheduleId) return "Locataire non renseigné";

    const schedule = scheduleMap.get(scheduleId);
    const lease = schedule
      ? generatedLeaseMap.get(schedule.lease_id)
      : undefined;
    const tenant = lease ? tenantMap.get(lease.tenant_id) : undefined;

    return tenant
      ? `${tenant.first_name ?? ""} ${tenant.last_name ?? ""}`.trim()
      : "Locataire non renseigné";
  }

  const receiptRows: GeneratedDocumentRow[] = receipts.map((receipt) => {
    const payment = paymentMap.get(receipt.payment_id);

    return {
      id: receipt.id,
      type: "RECEIPT",
      number:
        receipt.receipt_number ??
        receipt.number ??
        receipt.id.slice(0, 8).toUpperCase(),
      tenantName: tenantNameFromSchedule(payment?.rent_schedule_id),
      amount: Number(receipt.amount ?? 0),
      date: receipt.issued_at ?? receipt.created_at ?? null,
      pdfHref: `/api/receipts/${receipt.id}/pdf`,
    };
  });

  const quittanceRows: GeneratedDocumentRow[] = quittances.map((quittance) => ({
    id: quittance.id,
    type: "QUITTANCE",
    number:
      quittance.quittance_number ??
      quittance.number ??
      quittance.id.slice(0, 8).toUpperCase(),
    tenantName: tenantNameFromSchedule(quittance.rent_schedule_id),
    amount: Number(quittance.amount_due ?? 0),
    date: quittance.issued_at ?? quittance.created_at ?? null,
    pdfHref: `/api/quittances/${quittance.id}/pdf`,
  }));

  const generatedDocuments = [...receiptRows, ...quittanceRows].sort(
    (a, b) =>
      (b.date ? new Date(b.date).getTime() : 0) -
      (a.date ? new Date(a.date).getTime() : 0)
  );

  const filteredGeneratedDocuments = query
    ? generatedDocuments.filter((document) =>
        [
          document.number,
          document.tenantName,
          document.type === "RECEIPT" ? "reçu paiement" : "quittance loyer",
        ]
          .join(" ")
          .toLocaleLowerCase("fr")
          .includes(normalizedQuery)
      )
    : generatedDocuments;

  const totalDocumentAmount = generatedDocuments.reduce(
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
              <a
                href="#document-search"
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

              {canManageDocuments ? (
                <DocumentUploadButton
                  options={{
                    owners: ownerOptions,
                    tenants: tenantOptions,
                    properties: propertyOptions,
                    units: unitOptions,
                    leases: leaseOptions,
                  }}
                />
              ) : null}
            </div>
          </header>

          <div className="space-y-6 p-5 md:p-8">
            <section>
              <div className="mb-4">
                <h2 className="text-[20px] font-extrabold text-slate-900">
                  Bibliothèque documentaire
                </h2>
                <p className="mt-1 text-[13px] text-slate-500">
                  Centralisez les pièces privées et les justificatifs générés par Alteract.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[13px] font-semibold text-slate-500">
                    Fichiers partagés
                  </p>
                  <div className="mt-3 flex items-end justify-between">
                    <p className="text-[30px] font-extrabold text-slate-900">
                      {sharedRows.length}
                    </p>
                    <FolderOpen className="h-5 w-5 text-red-500" />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[13px] font-semibold text-slate-500">
                    Reçus
                  </p>
                  <div className="mt-3 flex items-end justify-between">
                    <p className="text-[30px] font-extrabold text-slate-900">
                      {receiptRows.length}
                    </p>
                    <ReceiptText className="h-5 w-5 text-emerald-500" />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[13px] font-semibold text-slate-500">
                    Quittances
                  </p>
                  <div className="mt-3 flex items-end justify-between">
                    <p className="text-[30px] font-extrabold text-slate-900">
                      {quittanceRows.length}
                    </p>
                    <WalletCards className="h-5 w-5 text-slate-600" />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[13px] font-semibold text-slate-500">
                    Montants documentés
                  </p>
                  <p className="mt-3 text-[22px] font-extrabold text-slate-900">
                    {formatXof(totalDocumentAmount)}
                  </p>
                </div>
              </div>
            </section>

            <form
              id="document-search"
              method="get"
              className="flex max-w-xl gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  name="q"
                  type="search"
                  defaultValue={query}
                  placeholder="Titre, type, locataire, bien..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[13px] outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"
                />
              </div>

              <button
                type="submit"
                className="h-11 rounded-xl bg-slate-900 px-4 text-[12px] font-bold text-white"
              >
                Rechercher
              </button>
            </form>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5">
                <h2 className="text-[18px] font-extrabold text-slate-900">
                  Fichiers partagés
                </h2>
                <p className="mt-1 text-[12px] text-slate-500">
                  {filteredSharedRows.length} fichier
                  {filteredSharedRows.length > 1 ? "s" : ""} accessible
                  {filteredSharedRows.length > 1 ? "s" : ""}
                </p>
              </div>

              {filteredSharedRows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-3">Document</th>
                        <th className="px-5 py-3">Rattachement</th>
                        <th className="px-5 py-3">Visibilité</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Taille</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredSharedRows.map((document) => (
                        <tr key={document.id} className="text-[13px] text-slate-600">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                                <FileText className="h-5 w-5 text-red-500" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">
                                  {document.title}
                                </p>
                                <p className="mt-1 text-[11px] text-slate-400">
                                  {formatDocumentType(document.documentType)}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="space-y-1 text-[12px]">
                              {document.propertyName ? (
                                <p className="font-semibold text-slate-700">
                                  {document.propertyName}
                                  {document.unitName ? ` — ${document.unitName}` : ""}
                                </p>
                              ) : null}
                              {document.ownerName ? (
                                <p>Propriétaire : {document.ownerName}</p>
                              ) : null}
                              {document.tenantName ? (
                                <p>Locataire : {document.tenantName}</p>
                              ) : null}
                              {!document.propertyName &&
                              !document.ownerName &&
                              !document.tenantName ? (
                                <p className="text-slate-400">Document général</p>
                              ) : null}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {document.ownerVisible ? (
                                <span className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                                  Propriétaire
                                </span>
                              ) : null}
                              {document.tenantVisible ? (
                                <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                  Locataire
                                </span>
                              ) : null}
                              {!document.ownerVisible && !document.tenantVisible ? (
                                <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                                  Interne
                                </span>
                              ) : null}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {formatDate(document.createdAt)}
                          </td>

                          <td className="px-5 py-4">
                            {formatFileSize(document.fileSize)}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              {document.signedUrl ? (
                                <Link
                                  href={document.signedUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Ouvrir
                                </Link>
                              ) : null}

                              {canManageDocuments ? (
                                <DeleteDocumentButton documentId={document.id} />
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center">
                  <FolderOpen className="h-7 w-7 text-red-500" />
                  <h3 className="mt-3 text-[16px] font-bold text-slate-900">
                    Aucun fichier partagé
                  </h3>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5">
                <h2 className="text-[18px] font-extrabold text-slate-900">
                  Justificatifs générés
                </h2>
                <p className="mt-1 text-[12px] text-slate-500">
                  Reçus et quittances générés automatiquement.
                </p>
              </div>

              {filteredGeneratedDocuments.length > 0 ? (
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
                      {filteredGeneratedDocuments.map((document) => (
                        <tr
                          key={`${document.type}-${document.id}`}
                          className="text-[13px] text-slate-600"
                        >
                          <td className="px-5 py-4 font-bold text-slate-900">
                            {document.type === "RECEIPT"
                              ? "Reçu de paiement"
                              : "Quittance de loyer"}
                          </td>

                          <td className="px-5 py-4 font-semibold text-slate-800">
                            {document.number}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <UserRound className="h-4 w-4 text-slate-400" />
                              {document.tenantName}
                            </div>
                          </td>

                          <td className="px-5 py-4">
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
                              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Ouvrir
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center">
                  <FileText className="h-7 w-7 text-red-500" />
                  <h3 className="mt-3 text-[16px] font-bold text-slate-900">
                    Aucun justificatif
                  </h3>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
