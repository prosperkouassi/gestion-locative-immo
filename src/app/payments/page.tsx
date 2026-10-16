import {
  BadgeCheck,
  Bell,
  Building2,
  CalendarDays,
  CreditCard,
  Home,
  ReceiptText,
  Search,
  UserRound,
  WalletCards,
} from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import { requireActiveMembership } from "@/lib/auth/access";

import PaymentCreateButton, {
  type PaymentScheduleOption,
} from "./PaymentCreateButton";
import PaymentEditButton from "./PaymentEditButton";
import RefundPaymentButton from "./RefundPaymentButton";

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

function formatTenantName(firstName: string | null, lastName: string | null) {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "Locataire";
}

function formatPaymentMethod(method: string | null) {
  switch (method) {
    case "CASH":
      return "Espèces";
    case "BANK_TRANSFER":
      return "Virement";
    case "MOBILE_MONEY":
      return "Mobile Money";
    case "CARD":
      return "Carte";
    case "CHEQUE":
      return "Chèque";
    case "OTHER":
      return "Autre";
    default:
      return "—";
  }
}

function paymentStatus(status: string) {
  switch (status) {
    case "COMPLETED":
      return { label: "Complété", className: "bg-emerald-50 text-emerald-700 ring-emerald-100" };
    case "PENDING":
      return { label: "En attente", className: "bg-amber-50 text-amber-700 ring-amber-100" };
    case "CANCELLED":
      return { label: "Annulé", className: "bg-slate-100 text-slate-500 ring-slate-200" };
    case "REFUNDED":
      return { label: "Remboursé", className: "bg-red-50 text-red-600 ring-red-100" };
    case "PARTIALLY_REFUNDED":
      return { label: "Remb. partiel", className: "bg-orange-50 text-orange-700 ring-orange-100" };
    default:
      return { label: status, className: "bg-slate-100 text-slate-600 ring-slate-200" };
  }
}

type PaymentsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    message?: string;
  }>;
};

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
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
  const canManage = ["ADMIN_AGENCY", "MANAGER"].includes(membership.role);

  const { data: payments } = await supabase
    .from("payments")
    .select(
      "id, rent_schedule_id, amount, currency, payment_date, payment_method, status, reference, notes, created_at"
    )
    .eq("organization_id", membership.organization_id)
    .order("payment_date", { ascending: false });

  const paymentRows = payments ?? [];
  const paymentIds = paymentRows.map((payment) => payment.id);
  const scheduleIds = Array.from(new Set(paymentRows.map((payment) => payment.rent_schedule_id)));

  const [refundsResult, schedulesResult] = await Promise.all([
    paymentIds.length
      ? supabase
          .from("payment_refunds")
          .select("id, payment_id, amount, currency, refund_date, reason, reference")
          .eq("organization_id", membership.organization_id)
          .in("payment_id", paymentIds)
      : Promise.resolve({ data: [] }),
    scheduleIds.length
      ? supabase
          .from("rent_schedules")
          .select("id, lease_id, amount_due, currency, status, period_start, period_end, due_date")
          .in("id", scheduleIds)
      : Promise.resolve({ data: [] }),
  ]);

  const refunds = refundsResult.data ?? [];
  const schedules = schedulesResult.data ?? [];

  const refundedByPaymentId = new Map<string, number>();
  for (const refund of refunds) {
    refundedByPaymentId.set(
      refund.payment_id,
      (refundedByPaymentId.get(refund.payment_id) ?? 0) + Number(refund.amount ?? 0)
    );
  }

  const leaseIds = Array.from(new Set(schedules.map((schedule) => schedule.lease_id)));
  const { data: leases } = leaseIds.length
    ? await supabase
        .from("leases")
        .select("id, tenant_id, unit_id")
        .in("id", leaseIds)
    : { data: [] };

  const leaseRows = leases ?? [];
  const tenantIds = Array.from(new Set(leaseRows.map((lease) => lease.tenant_id)));
  const unitIds = Array.from(new Set(leaseRows.map((lease) => lease.unit_id)));

  const [tenantsResult, unitsResult] = await Promise.all([
    tenantIds.length
      ? supabase
          .from("tenants")
          .select("id, first_name, last_name")
          .in("id", tenantIds)
      : Promise.resolve({ data: [] }),
    unitIds.length
      ? supabase
          .from("units")
          .select("id, property_id, name")
          .in("id", unitIds)
      : Promise.resolve({ data: [] }),
  ]);

  const tenants = tenantsResult.data ?? [];
  const units = unitsResult.data ?? [];
  const propertyIds = Array.from(
    new Set(units.map((unit) => unit.property_id).filter((id): id is string => Boolean(id)))
  );

  const { data: properties } = propertyIds.length
    ? await supabase
        .from("properties")
        .select("id, name, address, city")
        .in("id", propertyIds)
    : { data: [] };

  const scheduleMap = new Map(schedules.map((schedule) => [schedule.id, schedule]));
  const leaseMap = new Map(leaseRows.map((lease) => [lease.id, lease]));
  const tenantMap = new Map(tenants.map((tenant) => [tenant.id, tenant]));
  const unitMap = new Map(units.map((unit) => [unit.id, unit]));
  const propertyMap = new Map((properties ?? []).map((property) => [property.id, property]));

  const rows = paymentRows.map((payment) => {
    const schedule = scheduleMap.get(payment.rent_schedule_id);
    const lease = schedule ? leaseMap.get(schedule.lease_id) : undefined;
    const tenant = lease ? tenantMap.get(lease.tenant_id) : undefined;
    const unit = lease ? unitMap.get(lease.unit_id) : undefined;
    const property = unit ? propertyMap.get(unit.property_id) : undefined;

    const grossAmount = Number(payment.amount ?? 0);
    const refundedAmount = refundedByPaymentId.get(payment.id) ?? 0;
    const netAmount = Math.max(0, grossAmount - refundedAmount);

    let displayStatus = payment.status;
    if (payment.status === "COMPLETED" && refundedAmount > 0 && refundedAmount < grossAmount) {
      displayStatus = "PARTIALLY_REFUNDED";
    }
    if (payment.status === "COMPLETED" && refundedAmount >= grossAmount && grossAmount > 0) {
      displayStatus = "REFUNDED";
    }

    return {
      id: payment.id,
      rentScheduleId: payment.rent_schedule_id,
      rawStatus: payment.status,
      displayStatus,
      rawReference: payment.reference,
      reference: payment.reference || payment.id.slice(0, 8).toUpperCase(),
      notes: payment.notes,
      paymentDate: payment.payment_date,
      paymentMethod: payment.payment_method,
      method: formatPaymentMethod(payment.payment_method),
      grossAmount,
      refundedAmount,
      refundableAmount:
        payment.status === "COMPLETED" ? Math.max(0, grossAmount - refundedAmount) : 0,
      netAmount,
      tenantName: tenant
        ? formatTenantName(tenant.first_name, tenant.last_name)
        : "Locataire non renseigné",
      unitName: unit?.name ?? "Unité non renseignée",
      propertyName: property?.name ?? "Bien non renseigné",
      propertyLocation: property?.address || property?.city || "Adresse non renseignée",
      periodStart: schedule?.period_start ?? null,
      periodEnd: schedule?.period_end ?? null,
    };
  });

  const normalizedQuery = query.toLocaleLowerCase("fr");
  const filteredRows = query
    ? rows.filter((payment) =>
        [
          payment.reference,
          payment.tenantName,
          payment.unitName,
          payment.propertyName,
          payment.method,
          payment.displayStatus,
        ]
          .join(" ")
          .toLocaleLowerCase("fr")
          .includes(normalizedQuery)
      )
    : rows;

  const completedPayments = paymentRows.filter((payment) => payment.status === "COMPLETED");
  const pendingCount = paymentRows.filter((payment) => payment.status === "PENDING").length;
  const completedGross = completedPayments.reduce(
    (sum, payment) => sum + Number(payment.amount ?? 0),
    0
  );
  const totalRefunded = refunds.reduce((sum, refund) => sum + Number(refund.amount ?? 0), 0);
  const completedNet = Math.max(0, completedGross - totalRefunded);

  let scheduleOptions: PaymentScheduleOption[] = [];

  if (canManage) {
    const { data: manageableSchedules } = await supabase
      .from("rent_schedules")
      .select("id, lease_id, amount_due, due_date, status")
      .eq("organization_id", membership.organization_id)
      .neq("status", "CANCELLED")
      .order("due_date", { ascending: true });

    const manageable = manageableSchedules ?? [];
    const manageableIds = manageable.map((schedule) => schedule.id);

    const { data: manageablePayments } = manageableIds.length
      ? await supabase
          .from("payments")
          .select("id, rent_schedule_id, amount, status")
          .eq("organization_id", membership.organization_id)
          .in("rent_schedule_id", manageableIds)
      : { data: [] };

    const manageablePaymentIds = (manageablePayments ?? []).map((payment) => payment.id);
    const { data: manageableRefunds } = manageablePaymentIds.length
      ? await supabase
          .from("payment_refunds")
          .select("payment_id, amount")
          .eq("organization_id", membership.organization_id)
          .in("payment_id", manageablePaymentIds)
      : { data: [] };

    const manageableRefundMap = new Map<string, number>();
    for (const refund of manageableRefunds ?? []) {
      manageableRefundMap.set(
        refund.payment_id,
        (manageableRefundMap.get(refund.payment_id) ?? 0) + Number(refund.amount ?? 0)
      );
    }

    const financialBySchedule = new Map<
      string,
      { completedNet: number; pendingGross: number }
    >();

    for (const payment of manageablePayments ?? []) {
      const current = financialBySchedule.get(payment.rent_schedule_id) ?? {
        completedNet: 0,
        pendingGross: 0,
      };

      if (payment.status === "COMPLETED") {
        current.completedNet += Math.max(
          0,
          Number(payment.amount ?? 0) - (manageableRefundMap.get(payment.id) ?? 0)
        );
      }
      if (payment.status === "PENDING") current.pendingGross += Number(payment.amount ?? 0);

      financialBySchedule.set(payment.rent_schedule_id, current);
    }

    const manageLeaseIds = Array.from(new Set(manageable.map((schedule) => schedule.lease_id)));
    const { data: manageLeases } = manageLeaseIds.length
      ? await supabase
          .from("leases")
          .select("id, tenant_id, unit_id")
          .in("id", manageLeaseIds)
      : { data: [] };

    const manageLeaseRows = manageLeases ?? [];
    const manageTenantIds = Array.from(new Set(manageLeaseRows.map((lease) => lease.tenant_id)));
    const manageUnitIds = Array.from(new Set(manageLeaseRows.map((lease) => lease.unit_id)));

    const [manageTenantsResult, manageUnitsResult] = await Promise.all([
      manageTenantIds.length
        ? supabase
            .from("tenants")
            .select("id, first_name, last_name")
            .in("id", manageTenantIds)
        : Promise.resolve({ data: [] }),
      manageUnitIds.length
        ? supabase.from("units").select("id, name").in("id", manageUnitIds)
        : Promise.resolve({ data: [] }),
    ]);

    const manageLeaseMap = new Map(manageLeaseRows.map((lease) => [lease.id, lease]));
    const manageTenantMap = new Map(
      (manageTenantsResult.data ?? []).map((tenant) => [
        tenant.id,
        formatTenantName(tenant.first_name, tenant.last_name),
      ])
    );
    const manageUnitMap = new Map(
      (manageUnitsResult.data ?? []).map((unit) => [unit.id, unit.name])
    );

    scheduleOptions = manageable
      .map((schedule) => {
        const finance = financialBySchedule.get(schedule.id) ?? {
          completedNet: 0,
          pendingGross: 0,
        };
        const remainingAvailable = Math.max(
          0,
          Number(schedule.amount_due ?? 0) - finance.completedNet - finance.pendingGross
        );
        const lease = manageLeaseMap.get(schedule.lease_id);
        const tenantName = lease ? manageTenantMap.get(lease.tenant_id) : undefined;
        const unitName = lease ? manageUnitMap.get(lease.unit_id) : undefined;

        return {
          id: schedule.id,
          label: `${tenantName ?? "Locataire"} — ${unitName ?? "Unité"} — échéance ${formatDate(
            schedule.due_date
          )} — solde ${formatXof(remainingAvailable)}`,
          remainingAvailable,
        };
      })
      .filter((schedule) => schedule.remainingAvailable > 0);
  }

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
                Paiements
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="#search-payments"
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

              {canManage ? <PaymentCreateButton schedules={scheduleOptions} /> : null}
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
                  Suivi des encaissements
                </h2>
                <p className="mt-1 text-[13px] text-slate-500">
                  Consultez les paiements, remboursements et montants nets encaissés.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi label="Paiements" value={String(paymentRows.length)} icon={<CreditCard className="h-5 w-5 text-red-500" />} />
                <Kpi label="En attente" value={String(pendingCount)} icon={<CalendarDays className="h-5 w-5 text-amber-500" />} />
                <Kpi label="Encaissé brut" value={formatXof(completedGross)} icon={<WalletCards className="h-5 w-5 text-emerald-500" />} compact />
                <Kpi
                  label="Encaissé net"
                  value={formatXof(completedNet)}
                  icon={<ReceiptText className="h-5 w-5 text-red-500" />}
                  compact
                  sub={totalRefunded > 0 ? `${formatXof(totalRefunded)} remboursé` : undefined}
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[18px] font-extrabold text-slate-900">Liste des paiements</h2>
                  <p className="mt-1 text-[12px] text-slate-500">
                    {filteredRows.length} paiement{filteredRows.length > 1 ? "s" : ""} trouvé
                    {filteredRows.length > 1 ? "s" : ""}
                  </p>
                </div>

                <form id="search-payments" method="get" className="flex w-full gap-2 sm:w-auto">
                  <div className="relative flex-1 sm:w-[300px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      name="q"
                      type="search"
                      defaultValue={query}
                      placeholder="Rechercher un paiement..."
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </div>
                  <button type="submit" className="h-10 rounded-xl bg-slate-900 px-4 text-[12px] font-bold text-white">
                    Rechercher
                  </button>
                </form>
              </div>

              {filteredRows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-3">Paiement</th>
                        <th className="px-5 py-3">Locataire</th>
                        <th className="px-5 py-3">Logement</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Mode</th>
                        <th className="px-5 py-3">Montant net</th>
                        <th className="px-5 py-3">Statut</th>
                        {canManage ? <th className="px-5 py-3 text-right">Actions</th> : null}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.map((payment) => {
                        const status = paymentStatus(payment.displayStatus);

                        const editOptions = scheduleOptions.some(
                          (option) => option.id === payment.rentScheduleId
                        )
                          ? scheduleOptions
                          : [
                              {
                                id: payment.rentScheduleId,
                                label: "Échéance actuelle",
                                remainingAvailable: payment.grossAmount,
                              },
                              ...scheduleOptions,
                            ];

                        return (
                          <tr key={payment.id} className="text-[13px] text-slate-600 hover:bg-slate-50/70">
                            <td className="px-5 py-4">
                              <p className="font-bold text-slate-900">{payment.reference}</p>
                              {payment.periodStart && payment.periodEnd ? (
                                <p className="mt-1 text-[11px] text-slate-400">
                                  Échéance du {formatDate(payment.periodStart)} au {formatDate(payment.periodEnd)}
                                </p>
                              ) : null}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <UserRound className="h-4 w-4 text-slate-400" />
                                <span className="font-semibold text-slate-800">{payment.tenantName}</span>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-start gap-2">
                                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                <div>
                                  <p className="font-semibold text-slate-800">{payment.propertyName}</p>
                                  <div className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500">
                                    <Home className="h-3.5 w-3.5" />
                                    <span>{payment.unitName}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4 font-medium text-slate-700">{formatDate(payment.paymentDate)}</td>
                            <td className="px-5 py-4">{payment.method}</td>

                            <td className="px-5 py-4">
                              <p className="font-bold text-slate-900">{formatXof(payment.netAmount)}</p>
                              {payment.refundedAmount > 0 ? (
                                <p className="mt-1 text-[11px] font-medium text-red-500">
                                  Remboursé : {formatXof(payment.refundedAmount)}
                                </p>
                              ) : null}
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
                            </td>

                            {canManage ? (
                              <td className="px-5 py-4">
                                <div className="flex flex-wrap justify-end gap-2">
                                  {payment.refundedAmount === 0 ? (
                                    <PaymentEditButton
                                      payment={{
                                        id: payment.id,
                                        rentScheduleId: payment.rentScheduleId,
                                        amount: payment.grossAmount,
                                        paymentDate: payment.paymentDate,
                                        paymentMethod: payment.paymentMethod,
                                        status: payment.rawStatus,
                                        reference: payment.rawReference,
                                        notes: payment.notes,
                                      }}
                                      schedules={editOptions}
                                    />
                                  ) : null}

                                  {payment.rawStatus === "COMPLETED" ? (
                                    <RefundPaymentButton
                                      paymentId={payment.id}
                                      refundableAmount={payment.refundableAmount}
                                    />
                                  ) : null}
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
                    <CreditCard className="h-6 w-6 text-red-500" />
                  </div>
                  <h3 className="mt-4 text-[16px] font-bold text-slate-900">Aucun paiement</h3>
                  <p className="mt-1 max-w-md text-[13px] text-slate-500">
                    Les paiements enregistrés apparaîtront ici.
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

function Kpi({
  label,
  value,
  icon,
  compact = false,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  compact?: boolean;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-slate-500">{label}</p>
        {icon}
      </div>
      <p className={`mt-4 font-extrabold text-slate-900 ${compact ? "text-[22px]" : "text-[30px]"}`}>
        {value}
      </p>
      {sub ? <p className="mt-2 text-[11px] font-medium text-red-500">{sub}</p> : null}
    </div>
  );
}
