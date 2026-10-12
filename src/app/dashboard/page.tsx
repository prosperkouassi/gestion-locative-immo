import {



  Bell,



  Building2,



  CalendarDays,



  ChevronDown,



  CreditCard,



  MessageSquareText,



  MoreHorizontal,



  Search,



  TrendingUp,



  UserRound,



} from "lucide-react";







import { requireActiveMembership } from "@/lib/auth/access";



import AppSidebar from "@/components/AppSidebar";







function formatXof(value: number) {



  return `${new Intl.NumberFormat("fr-FR", {



    maximumFractionDigits: 0,



  }).format(value)} F CFA`;



}







function formatMonthLabel(date: Date) {



  const label = new Intl.DateTimeFormat("fr-FR", {



    month: "long",



    year: "numeric",



    timeZone: "UTC",



  }).format(date);







  return label.charAt(0).toUpperCase() + label.slice(1);



}







function formatShortMonth(date: Date) {



  const label = new Intl.DateTimeFormat("fr-FR", {



    month: "short",



    timeZone: "UTC",



  }).format(date);







  return label.charAt(0).toUpperCase() + label.slice(1);



}







type StatusTone = "success" | "warning" | "danger" | "neutral";







function getScheduleStatusPresentation(status: string): {



  label: string;



  tone: StatusTone;



} {



  switch (status) {



    case "PAID":



      return { label: "Payé", tone: "success" };



    case "PARTIALLY_PAID":



      return { label: "Partiel", tone: "warning" };



    case "OVERDUE":



      return { label: "En retard", tone: "danger" };



    case "CANCELLED":



      return { label: "Annulé", tone: "neutral" };



    case "PENDING":



    default:



      return { label: "À venir", tone: "neutral" };



  }



}







function formatSchedulePeriod(periodStart: string) {



  const date = new Date(`${periodStart}T00:00:00Z`);



  return formatMonthLabel(date);



}







function getMaintenancePresentation(



  status: string,



  priority: string



): {



  label: string;



  tone: StatusTone;



} {



  if (status === "COMPLETED") {



    return { label: "Terminé", tone: "success" };



  }







  if (status === "CANCELLED") {



    return { label: "Annulé", tone: "neutral" };



  }







  if (status === "IN_PROGRESS") {



    return { label: "En cours", tone: "warning" };



  }







  if (status === "PLANNED") {



    return { label: "Planifié", tone: "neutral" };



  }







  if (priority === "URGENT") {



    return { label: "Urgent", tone: "danger" };



  }







  if (priority === "HIGH") {



    return { label: "Prioritaire", tone: "warning" };



  }







  return { label: "Ouvert", tone: "neutral" };



}







function formatMaintenanceDate(value: string | null) {



  if (!value) return "—";







  return new Intl.DateTimeFormat("fr-FR", {



    day: "2-digit",



    month: "2-digit",



    year: "numeric",



    timeZone: "UTC",



  }).format(new Date(value));



}







function formatPropertyType(value: string | null) {



  if (!value) return "Bien";







  return value



    .toLowerCase()



    .replace(/_/g, " ")



    .replace(/\b\w/g, (letter) => letter.toUpperCase());



}







function formatDateFr(value: string | null) {



  if (!value) return "—";







  return new Intl.DateTimeFormat("fr-FR", {



    day: "2-digit",



    month: "2-digit",



    year: "numeric",



    timeZone: "UTC",



  }).format(new Date(`${value}T00:00:00Z`));



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



      className={`inline-flex rounded-md px-2 py-1 text-[14px] font-semibold ring-1 ring-inset ${classes[tone]}`}



    >



      {label}



    </span>



  );



}







export default async function DashboardPage() {



  const {

    supabase,

    membership,

    user,

  } = await requireActiveMembership();



  if (membership.role === "TENANT") {

    const now = new Date();

    const today = now.toISOString().slice(0, 10);



    const [

      tenantResult,

      leasesResult,

      schedulesResult,

      paymentsResult,

      maintenanceResult,

      maintenanceOpenCountResult,

      documentsResult,

      receiptsResult,

      quittancesResult,

    ] = await Promise.all([

      supabase

        .from("tenants")

        .select("id, first_name, last_name, phone")

        .eq("auth_user_id", user.id)

        .maybeSingle(),



      supabase

        .from("leases")

        .select(

          "id, unit_id, status, start_date, end_date, effective_end_date, monthly_rent, currency"

        )

        .order("start_date", { ascending: true }),



      supabase

        .from("rent_schedules")

        .select(

          "id, lease_id, amount_due, status, period_start, period_end, due_date"

        )

        .order("due_date", { ascending: true }),



      supabase

        .from("payments")

        .select(

          "id, rent_schedule_id, amount, payment_date, payment_method, status, reference"

        )

        .order("payment_date", { ascending: false }),



      supabase

        .from("maintenance_requests")

        .select(

          "id, property_id, unit_id, title, priority, status, reported_at, scheduled_for"

        )

        .order("reported_at", { ascending: false })

        .limit(4),

      supabase
        .from("maintenance_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["OPEN", "IN_PROGRESS", "PLANNED"]),



      supabase

        .from("documents")

        .select("id", { count: "exact", head: true }),



      supabase

        .from("receipts")

        .select("id", { count: "exact", head: true }),



      supabase

        .from("rent_quittances")

        .select("id", { count: "exact", head: true }),

    ]);



    const tenant = tenantResult.data;

    const tenantLeases = leasesResult.data ?? [];

    const tenantSchedules = schedulesResult.data ?? [];

    const tenantPayments = paymentsResult.data ?? [];

    const tenantMaintenance = maintenanceResult.data ?? [];



    const unitIds = Array.from(

      new Set(

        tenantLeases

          .map((lease) => lease.unit_id)

          .filter((id): id is string => Boolean(id))

      )

    );



    const { data: units } =

      unitIds.length > 0

        ? await supabase

            .from("units")

            .select("id, property_id, name")

            .in("id", unitIds)

        : { data: [] };



    const propertyIds = Array.from(

      new Set(

        (units ?? [])

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

      (units ?? []).map((unit) => [unit.id, unit])

    );



    const propertyMap = new Map(

      (properties ?? []).map((property) => [

        property.id,

        property,

      ])

    );



    const currentLease =

      tenantLeases.find((lease) => {

        const effectiveEnd =

          lease.effective_end_date ?? lease.end_date;



        return (

          lease.status === "ACTIVE" &&

          lease.start_date <= today &&

          (!effectiveEnd || effectiveEnd >= today)

        );

      }) ??

      tenantLeases.find(

        (lease) =>

          lease.status === "ACTIVE" &&

          lease.start_date > today

      ) ??

      tenantLeases.find(

        (lease) => lease.status === "ACTIVE"

      ) ??

      tenantLeases[0];



    const currentUnit = currentLease

      ? unitMap.get(currentLease.unit_id)

      : undefined;



    const currentProperty = currentUnit

      ? propertyMap.get(currentUnit.property_id)

      : undefined;



    const nextSchedule =

      tenantSchedules.find(

        (schedule) =>

          schedule.due_date >= today &&

          !["PAID", "CANCELLED"].includes(

            schedule.status

          )

      ) ?? null;



    const completedPayments =

      tenantPayments.filter(

        (payment) =>

          payment.status === "COMPLETED"

      );



    const totalPaid =

      completedPayments.reduce(

        (sum, payment) =>

          sum + Number(payment.amount ?? 0),

        0

      );



    const openMaintenanceCount =

      maintenanceOpenCountResult.count ?? 0;



    const totalDocuments =

      (documentsResult.count ?? 0) +

      (receiptsResult.count ?? 0) +

      (quittancesResult.count ?? 0);



    const displayName =

      `${tenant?.first_name ?? ""} ${

        tenant?.last_name ?? ""

      }`.trim() ||

      user.email ||

      "Locataire";



    const upcomingSchedules =

      tenantSchedules

        .filter(

          (schedule) =>

            schedule.due_date >= today &&

            !["PAID", "CANCELLED"].includes(

              schedule.status

            )

        )

        .slice(0, 5);



    return (

      <div className="h-screen overflow-hidden bg-[#F8FAFC]">

        <div className="flex h-screen">

          <AppSidebar />



          <main className="h-screen min-w-0 flex-1 overflow-y-auto">

            <header className="border-b border-slate-200 bg-white px-5 py-5 lg:px-7">

              <h1 className="text-[28px] font-extrabold tracking-tight text-slate-950">

                Tableau de bord

              </h1>

              <p className="mt-1 text-[14px] text-slate-500">

                Bonjour {displayName}. Voici l’essentiel de votre location.

              </p>

            </header>



            <div className="space-y-6 p-5 lg:p-7">

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                  <div className="flex items-center justify-between">

                    <p className="text-[13px] font-semibold text-slate-500">

                      Mon logement

                    </p>

                    <Building2 className="h-5 w-5 text-red-500" />

                  </div>

                  <p className="mt-4 text-[20px] font-extrabold text-slate-950">

                    {currentUnit?.name ?? "Non renseigné"}

                  </p>

                  <p className="mt-1 text-[12px] text-slate-500">

                    {currentProperty?.name ?? "Aucun bien associé"}

                  </p>

                </article>



                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                  <div className="flex items-center justify-between">

                    <p className="text-[13px] font-semibold text-slate-500">

                      Prochaine échéance

                    </p>

                    <CalendarDays className="h-5 w-5 text-red-500" />

                  </div>

                  <p className="mt-4 text-[22px] font-extrabold text-slate-950">

                    {nextSchedule

                      ? formatXof(

                          Number(

                            nextSchedule.amount_due ?? 0

                          )

                        )

                      : "Aucune"}

                  </p>

                  <p className="mt-1 text-[12px] text-slate-500">

                    {nextSchedule

                      ? formatDateFr(

                          nextSchedule.due_date

                        )

                      : "Pas d’échéance à venir"}

                  </p>

                </article>



                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                  <div className="flex items-center justify-between">

                    <p className="text-[13px] font-semibold text-slate-500">

                      Paiements effectués

                    </p>

                    <CreditCard className="h-5 w-5 text-emerald-500" />

                  </div>

                  <p className="mt-4 text-[22px] font-extrabold text-slate-950">

                    {formatXof(totalPaid)}

                  </p>

                  <p className="mt-1 text-[12px] text-slate-500">

                    {completedPayments.length} paiement

                    {completedPayments.length > 1 ? "s" : ""} complété

                    {completedPayments.length > 1 ? "s" : ""}

                  </p>

                </article>



                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                  <div className="flex items-center justify-between">

                    <p className="text-[13px] font-semibold text-slate-500">

                      Maintenance

                    </p>

                    <MessageSquareText className="h-5 w-5 text-amber-500" />

                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-950">

                    {openMaintenanceCount}

                  </p>

                  <p className="mt-1 text-[12px] text-slate-500">

                    demande

                    {openMaintenanceCount > 1 ? "s" : ""} en cours

                  </p>

                </article>

              </section>



              <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">

                <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

                    <div>

                      <h2 className="text-[17px] font-bold text-slate-900">

                        Mon bail

                      </h2>

                      <p className="mt-1 text-[12px] text-slate-500">

                        Informations principales de votre location

                      </p>

                    </div>

                  </div>



                  <div className="grid gap-4 p-5 sm:grid-cols-2">

                    <div>

                      <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">

                        Bien

                      </p>

                      <p className="mt-1 font-bold text-slate-900">

                        {currentProperty?.name ?? "—"}

                      </p>

                      <p className="mt-1 text-[12px] text-slate-500">

                        {currentProperty?.address ||

                          currentProperty?.city ||

                          "Adresse non renseignée"}

                      </p>

                    </div>



                    <div>

                      <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">

                        Logement

                      </p>

                      <p className="mt-1 font-bold text-slate-900">

                        {currentUnit?.name ?? "—"}

                      </p>

                    </div>



                    <div>

                      <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">

                        Loyer mensuel

                      </p>

                      <p className="mt-1 font-bold text-slate-900">

                        {currentLease

                          ? formatXof(

                              Number(

                                currentLease.monthly_rent ?? 0

                              )

                            )

                          : "—"}

                      </p>

                    </div>



                    <div>

                      <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">

                        Période

                      </p>

                      <p className="mt-1 font-bold text-slate-900">

                        {currentLease

                          ? `${formatDateFr(

                              currentLease.start_date

                            )} → ${formatDateFr(

                              currentLease.effective_end_date ??

                                currentLease.end_date

                            )}`

                          : "—"}

                      </p>

                    </div>

                  </div>

                </article>



                <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                  <div className="border-b border-slate-100 px-5 py-4">

                    <h2 className="text-[17px] font-bold text-slate-900">

                      Accès rapides

                    </h2>

                  </div>



                  <div className="grid gap-2 p-4 sm:grid-cols-2">

                    <a

                      href="/leases"

                      className="rounded-xl border border-slate-200 px-4 py-3 text-[13px] font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"

                    >

                      Mes baux

                    </a>

                    <a

                      href="/schedules"

                      className="rounded-xl border border-slate-200 px-4 py-3 text-[13px] font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"

                    >

                      Mes échéances

                    </a>

                    <a

                      href="/payments"

                      className="rounded-xl border border-slate-200 px-4 py-3 text-[13px] font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"

                    >

                      Mes paiements

                    </a>

                    <a

                      href="/maintenance"

                      className="rounded-xl border border-slate-200 px-4 py-3 text-[13px] font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"

                    >

                      Maintenance

                    </a>

                    <a

                      href="/documents"

                      className="rounded-xl border border-slate-200 px-4 py-3 text-[13px] font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 sm:col-span-2"

                    >

                      Mes documents ({totalDocuments})

                    </a>

                  </div>

                </article>

              </section>



              <section className="grid gap-4 xl:grid-cols-2">

                <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

                    <h2 className="text-[17px] font-bold text-slate-900">

                      Prochaines échéances

                    </h2>

                    <a

                      href="/schedules"

                      className="text-[12px] font-semibold text-red-500"

                    >

                      Voir tout

                    </a>

                  </div>



                  <div className="divide-y divide-slate-100">

                    {upcomingSchedules.length > 0 ? (

                      upcomingSchedules.map((schedule) => {

                        const presentation =

                          getScheduleStatusPresentation(

                            schedule.status

                          );



                        return (

                          <div

                            key={schedule.id}

                            className="flex items-center justify-between gap-4 px-5 py-4"

                          >

                            <div>

                              <p className="font-semibold text-slate-900">

                                {formatSchedulePeriod(

                                  schedule.period_start

                                )}

                              </p>

                              <p className="mt-1 text-[12px] text-slate-500">

                                Échéance le{" "}

                                {formatDateFr(

                                  schedule.due_date

                                )}

                              </p>

                            </div>



                            <div className="text-right">

                              <p className="font-bold text-slate-900">

                                {formatXof(

                                  Number(

                                    schedule.amount_due ?? 0

                                  )

                                )}

                              </p>

                              <div className="mt-1">

                                <StatusBadge

                                  label={

                                    presentation.label

                                  }

                                  tone={

                                    presentation.tone

                                  }

                                />

                              </div>

                            </div>

                          </div>

                        );

                      })

                    ) : (

                      <div className="px-5 py-8 text-center text-[13px] text-slate-500">

                        Aucune échéance à venir.

                      </div>

                    )}

                  </div>

                </article>



                <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

                    <h2 className="text-[17px] font-bold text-slate-900">

                      Interventions récentes

                    </h2>

                    <a

                      href="/maintenance"

                      className="text-[12px] font-semibold text-red-500"

                    >

                      Voir tout

                    </a>

                  </div>



                  <div className="divide-y divide-slate-100">

                    {tenantMaintenance.length > 0 ? (

                      tenantMaintenance.map((request) => {

                        const presentation =

                          getMaintenancePresentation(

                            request.status,

                            request.priority

                          );



                        return (

                          <div

                            key={request.id}

                            className="flex items-start justify-between gap-4 px-5 py-4"

                          >

                            <div>

                              <p className="font-semibold text-slate-900">

                                {request.title}

                              </p>

                              <p className="mt-1 text-[12px] text-slate-500">

                                {formatMaintenanceDate(

                                  request.scheduled_for ??

                                    request.reported_at

                                )}

                              </p>

                            </div>



                            <StatusBadge

                              label={presentation.label}

                              tone={presentation.tone}

                            />

                          </div>

                        );

                      })

                    ) : (

                      <div className="px-5 py-8 text-center text-[13px] text-slate-500">

                        Aucune intervention récente.

                      </div>

                    )}

                  </div>

                </article>

              </section>

            </div>

          </main>

        </div>

      </div>

    );

  }










  if (membership.role === "OWNER") {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const monthStartDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );
    const nextMonthStartDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
    );

    const monthStart = monthStartDate.toISOString().slice(0, 10);
    const nextMonthStart = nextMonthStartDate.toISOString().slice(0, 10);
    const currentMonthLabel = formatMonthLabel(monthStartDate);

    const [
      ownerResult,
      propertiesResult,
      unitsResult,
      leasesResult,
      schedulesResult,
      paymentsResult,
      tenantsResult,
      maintenanceResult,
      documentsResult,
      receiptsResult,
      quittancesResult,
    ] = await Promise.all([
      supabase
        .from("owners")
        .select("id, first_name, last_name")
        .eq("auth_user_id", user.id)
        .maybeSingle(),

      supabase
        .from("properties")
        .select("id, name, property_type, address, city, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: true }),

      supabase
        .from("units")
        .select("id, property_id, name, monthly_rent, currency, is_active")
        .eq("is_active", true),

      supabase
        .from("leases")
        .select(
          "id, tenant_id, unit_id, status, start_date, end_date, effective_end_date, monthly_rent, currency"
        )
        .order("start_date", { ascending: true }),

      supabase
        .from("rent_schedules")
        .select(
          "id, lease_id, amount_due, status, period_start, period_end, due_date"
        )
        .order("due_date", { ascending: true }),

      supabase
        .from("payments")
        .select(
          "id, rent_schedule_id, amount, payment_date, payment_method, status, reference"
        )
        .order("payment_date", { ascending: false }),

      supabase
        .from("tenants")
        .select("id, first_name, last_name, phone, is_active")
        .eq("is_active", true),

      supabase
        .from("maintenance_requests")
        .select(
          "id, property_id, unit_id, title, priority, status, reported_at, scheduled_for, completed_at"
        )
        .order("reported_at", { ascending: false })
        .limit(5),

      supabase
        .from("documents")
        .select("id", { count: "exact", head: true }),

      supabase
        .from("receipts")
        .select("id", { count: "exact", head: true }),

      supabase
        .from("rent_quittances")
        .select("id", { count: "exact", head: true }),
    ]);

    const owner = ownerResult.data;
    const ownerProperties = propertiesResult.data ?? [];
    const ownerUnits = unitsResult.data ?? [];
    const ownerLeases = leasesResult.data ?? [];
    const ownerSchedules = schedulesResult.data ?? [];
    const ownerPayments = paymentsResult.data ?? [];
    const ownerTenants = tenantsResult.data ?? [];
    const ownerMaintenance = maintenanceResult.data ?? [];

    const activeLeases = ownerLeases.filter((lease) => {
      if (lease.status !== "ACTIVE") return false;

      const effectiveEnd =
        lease.effective_end_date ?? lease.end_date;

      return (
        lease.start_date <= today &&
        (!effectiveEnd || effectiveEnd >= today)
      );
    });

    const occupiedUnitIds = new Set(
      activeLeases.map((lease) => lease.unit_id)
    );

    const occupiedUnits = occupiedUnitIds.size;
    const totalUnits = ownerUnits.length;
    const occupancyRate =
      totalUnits > 0
        ? Math.round((occupiedUnits / totalUnits) * 100)
        : 0;

    const currentMonthSchedules = ownerSchedules.filter(
      (schedule) =>
        schedule.period_start >= monthStart &&
        schedule.period_start < nextMonthStart &&
        schedule.status !== "CANCELLED"
    );

    const expectedRent = currentMonthSchedules.reduce(
      (sum, schedule) =>
        sum + Number(schedule.amount_due ?? 0),
      0
    );

    const currentMonthPayments = ownerPayments.filter(
      (payment) =>
        payment.status === "COMPLETED" &&
        payment.payment_date >= monthStart &&
        payment.payment_date < nextMonthStart
    );

    const collectedThisMonth =
      currentMonthPayments.reduce(
        (sum, payment) =>
          sum + Number(payment.amount ?? 0),
        0
      );

    const totalDocuments =
      (documentsResult.count ?? 0) +
      (receiptsResult.count ?? 0) +
      (quittancesResult.count ?? 0);

    const openMaintenanceCount =
      ownerMaintenance.filter(
        (request) =>
          !["COMPLETED", "CANCELLED"].includes(
            request.status
          )
      ).length;

    const ownerName =
      `${owner?.first_name ?? ""} ${
        owner?.last_name ?? ""
      }`.trim() ||
      user.email ||
      "Propriétaire";

    const unitMap = new Map(
      ownerUnits.map((unit) => [unit.id, unit])
    );

    const propertyMap = new Map(
      ownerProperties.map((property) => [
        property.id,
        property,
      ])
    );

    const leaseMap = new Map(
      ownerLeases.map((lease) => [lease.id, lease])
    );

    const tenantMap = new Map(
      ownerTenants.map((tenant) => [tenant.id, tenant])
    );

    const scheduleMap = new Map(
      ownerSchedules.map((schedule) => [
        schedule.id,
        schedule,
      ])
    );

    const ownerPropertyRows = ownerProperties.map(
      (property) => {
        const propertyUnits = ownerUnits.filter(
          (unit) =>
            unit.property_id === property.id
        );

        const occupiedForProperty =
          propertyUnits.filter((unit) =>
            occupiedUnitIds.has(unit.id)
          ).length;

        const monthlyRent =
          propertyUnits.reduce(
            (sum, unit) =>
              sum + Number(unit.monthly_rent ?? 0),
            0
          );

        const propertyLeaseIds = activeLeases
          .filter((lease) =>
            propertyUnits.some(
              (unit) => unit.id === lease.unit_id
            )
          )
          .map((lease) => lease.id);

        const nextDueDate = ownerSchedules
          .filter(
            (schedule) =>
              propertyLeaseIds.includes(
                schedule.lease_id
              ) &&
              schedule.due_date >= today &&
              !["PAID", "CANCELLED"].includes(
                schedule.status
              )
          )
          .map((schedule) => schedule.due_date)
          .sort()[0];

        let occupancy = "Vacant";
        let occupancyTone: StatusTone = "neutral";

        if (
          propertyUnits.length > 0 &&
          occupiedForProperty === propertyUnits.length
        ) {
          occupancy = "Loué";
          occupancyTone = "success";
        } else if (occupiedForProperty > 0) {
          occupancy = "Partiel";
          occupancyTone = "warning";
        }

        return {
          id: property.id,
          name: property.name,
          type: formatPropertyType(
            property.property_type
          ),
          location:
            property.address ||
            property.city ||
            "—",
          units: propertyUnits.length,
          monthlyRent,
          occupancy,
          occupancyTone,
          nextPayment: nextDueDate ?? null,
        };
      }
    );

    const recentPayments = ownerPayments
      .filter(
        (payment) =>
          payment.status === "COMPLETED"
      )
      .slice(0, 5)
      .map((payment) => {
        const schedule = payment.rent_schedule_id
          ? scheduleMap.get(
              payment.rent_schedule_id
            )
          : undefined;

        const lease = schedule
          ? leaseMap.get(schedule.lease_id)
          : undefined;

        const tenant = lease
          ? tenantMap.get(lease.tenant_id)
          : undefined;

        const unit = lease
          ? unitMap.get(lease.unit_id)
          : undefined;

        return {
          id: payment.id,
          amount: Number(payment.amount ?? 0),
          date: payment.payment_date,
          tenantName: tenant
            ? `${tenant.first_name} ${tenant.last_name}`.trim()
            : "Locataire",
          unitName: unit?.name ?? "Unité",
        };
      });

    const upcomingSchedules = ownerSchedules
      .filter(
        (schedule) =>
          schedule.due_date >= today &&
          schedule.status !== "CANCELLED"
      )
      .slice(0, 5)
      .map((schedule) => {
        const lease = leaseMap.get(
          schedule.lease_id
        );

        const tenant = lease
          ? tenantMap.get(lease.tenant_id)
          : undefined;

        const unit = lease
          ? unitMap.get(lease.unit_id)
          : undefined;

        return {
          ...schedule,
          tenantName: tenant
            ? `${tenant.first_name} ${tenant.last_name}`.trim()
            : "Locataire",
          unitName: unit?.name ?? "Unité",
        };
      });

    return (
      <div className="h-screen overflow-hidden bg-[#F8FAFC]">
        <div className="flex h-screen">
          <AppSidebar />

          <main className="h-screen min-w-0 flex-1 overflow-y-auto">
            <header className="border-b border-slate-200 bg-white px-5 py-5 lg:px-7">
              <h1 className="text-[28px] font-extrabold tracking-tight text-slate-950">
                Tableau de bord
              </h1>
              <p className="mt-1 text-[14px] text-slate-500">
                Bonjour {ownerName}. Voici la situation de votre patrimoine locatif.
              </p>
            </header>

            <div className="space-y-6 p-5 lg:p-7">
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Mes biens
                    </p>
                    <Building2 className="h-5 w-5 text-red-500" />
                  </div>
                  <p className="mt-4 text-[30px] font-extrabold text-slate-950">
                    {ownerProperties.length}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500">
                    {totalUnits} unité
                    {totalUnits > 1 ? "s" : ""} active
                    {totalUnits > 1 ? "s" : ""}
                  </p>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Taux d’occupation
                    </p>
                    <UserRound className="h-5 w-5 text-red-500" />
                  </div>
                  <p className="mt-4 text-[30px] font-extrabold text-slate-950">
                    {occupancyRate}%
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500">
                    {occupiedUnits} / {totalUnits} unité
                    {totalUnits > 1 ? "s" : ""} occupée
                    {occupiedUnits > 1 ? "s" : ""}
                  </p>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Loyers encaissés
                    </p>
                    <CreditCard className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="mt-4 text-[22px] font-extrabold text-slate-950">
                    {formatXof(collectedThisMonth)}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500">
                    {currentMonthLabel}
                  </p>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Revenus attendus
                    </p>
                    <TrendingUp className="h-5 w-5 text-red-500" />
                  </div>
                  <p className="mt-4 text-[22px] font-extrabold text-slate-950">
                    {formatXof(expectedRent)}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500">
                    {currentMonthLabel}
                  </p>
                </article>
              </section>

              <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                      <h2 className="text-[17px] font-bold text-slate-900">
                        Mes biens
                      </h2>
                      <p className="mt-1 text-[12px] text-slate-500">
                        Vue d’ensemble de votre patrimoine
                      </p>
                    </div>
                    <a
                      href="/properties"
                      className="text-[12px] font-semibold text-red-500"
                    >
                      Voir tout
                    </a>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[760px] w-full">
                      <thead>
                        <tr className="border-b border-slate-100 text-left">
                          <th className="px-5 py-3 text-[12px] font-medium text-slate-400">
                            Bien
                          </th>
                          <th className="px-5 py-3 text-[12px] font-medium text-slate-400">
                            Unités
                          </th>
                          <th className="px-5 py-3 text-[12px] font-medium text-slate-400">
                            Loyer mensuel
                          </th>
                          <th className="px-5 py-3 text-[12px] font-medium text-slate-400">
                            Occupation
                          </th>
                          <th className="px-5 py-3 text-[12px] font-medium text-slate-400">
                            Prochaine échéance
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {ownerPropertyRows.length > 0 ? (
                          ownerPropertyRows
                            .slice(0, 5)
                            .map((property) => (
                              <tr key={property.id}>
                                <td className="px-5 py-4">
                                  <p className="font-semibold text-slate-900">
                                    {property.name}
                                  </p>
                                  <p className="mt-1 text-[12px] text-slate-500">
                                    {property.location}
                                  </p>
                                </td>
                                <td className="px-5 py-4 text-[13px] text-slate-600">
                                  {property.units}
                                </td>
                                <td className="px-5 py-4 text-[13px] font-semibold text-slate-900">
                                  {formatXof(
                                    property.monthlyRent
                                  )}
                                </td>
                                <td className="px-5 py-4">
                                  <StatusBadge
                                    label={
                                      property.occupancy
                                    }
                                    tone={
                                      property.occupancyTone
                                    }
                                  />
                                </td>
                                <td className="px-5 py-4 text-[13px] text-slate-600">
                                  {formatDateFr(
                                    property.nextPayment
                                  )}
                                </td>
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-5 py-8 text-center text-[13px] text-slate-500"
                            >
                              Aucun bien à afficher.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>

                <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-4">
                    <h2 className="text-[17px] font-bold text-slate-900">
                      Accès rapides
                    </h2>
                  </div>

                  <div className="grid gap-2 p-4 sm:grid-cols-2">
                    <a
                      href="/properties"
                      className="rounded-xl border border-slate-200 px-4 py-3 text-[13px] font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      Mes biens
                    </a>
                    <a
                      href="/units"
                      className="rounded-xl border border-slate-200 px-4 py-3 text-[13px] font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      Mes unités
                    </a>
                    <a
                      href="/leases"
                      className="rounded-xl border border-slate-200 px-4 py-3 text-[13px] font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      Mes baux
                    </a>
                    <a
                      href="/payments"
                      className="rounded-xl border border-slate-200 px-4 py-3 text-[13px] font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      Mes paiements
                    </a>
                    <a
                      href="/maintenance"
                      className="rounded-xl border border-slate-200 px-4 py-3 text-[13px] font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      Maintenance ({openMaintenanceCount})
                    </a>
                    <a
                      href="/documents"
                      className="rounded-xl border border-slate-200 px-4 py-3 text-[13px] font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      Documents ({totalDocuments})
                    </a>
                  </div>
                </article>
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <h2 className="text-[17px] font-bold text-slate-900">
                      Prochaines échéances
                    </h2>
                    <a
                      href="/schedules"
                      className="text-[12px] font-semibold text-red-500"
                    >
                      Voir tout
                    </a>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {upcomingSchedules.length > 0 ? (
                      upcomingSchedules.map((schedule) => {
                        const presentation =
                          getScheduleStatusPresentation(
                            schedule.status
                          );

                        return (
                          <div
                            key={schedule.id}
                            className="flex items-center justify-between gap-4 px-5 py-4"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">
                                {schedule.tenantName} —{" "}
                                {schedule.unitName}
                              </p>
                              <p className="mt-1 text-[12px] text-slate-500">
                                Échéance le{" "}
                                {formatDateFr(
                                  schedule.due_date
                                )}
                              </p>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="font-bold text-slate-900">
                                {formatXof(
                                  Number(
                                    schedule.amount_due ?? 0
                                  )
                                )}
                              </p>
                              <div className="mt-1">
                                <StatusBadge
                                  label={
                                    presentation.label
                                  }
                                  tone={
                                    presentation.tone
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-5 py-8 text-center text-[13px] text-slate-500">
                        Aucune échéance à venir.
                      </div>
                    )}
                  </div>
                </article>

                <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <h2 className="text-[17px] font-bold text-slate-900">
                      Paiements récents
                    </h2>
                    <a
                      href="/payments"
                      className="text-[12px] font-semibold text-red-500"
                    >
                      Voir tout
                    </a>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {recentPayments.length > 0 ? (
                      recentPayments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between gap-4 px-5 py-4"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {payment.tenantName} —{" "}
                              {payment.unitName}
                            </p>
                            <p className="mt-1 text-[12px] text-slate-500">
                              {formatDateFr(
                                payment.date
                              )}
                            </p>
                          </div>

                          <p className="shrink-0 font-bold text-emerald-600">
                            {formatXof(payment.amount)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="px-5 py-8 text-center text-[13px] text-slate-500">
                        Aucun paiement récent.
                      </div>
                    )}
                  </div>
                </article>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <h2 className="text-[17px] font-bold text-slate-900">
                    Interventions récentes
                  </h2>
                  <a
                    href="/maintenance"
                    className="text-[12px] font-semibold text-red-500"
                  >
                    Voir tout
                  </a>
                </div>

                <div className="divide-y divide-slate-100">
                  {ownerMaintenance.length > 0 ? (
                    ownerMaintenance.map((request) => {
                      const presentation =
                        getMaintenancePresentation(
                          request.status,
                          request.priority
                        );

                      const unit = request.unit_id
                        ? unitMap.get(request.unit_id)
                        : undefined;

                      const property = request.property_id
                        ? propertyMap.get(
                            request.property_id
                          )
                        : undefined;

                      return (
                        <div
                          key={request.id}
                          className="flex items-center justify-between gap-4 px-5 py-4"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {request.title}
                            </p>
                            <p className="mt-1 truncate text-[12px] text-slate-500">
                              {unit?.name ??
                                property?.name ??
                                "Bien"}
                              {" · "}
                              {formatMaintenanceDate(
                                request.scheduled_for ??
                                  request.reported_at
                              )}
                            </p>
                          </div>

                          <StatusBadge
                            label={presentation.label}
                            tone={presentation.tone}
                          />
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-5 py-8 text-center text-[13px] text-slate-500">
                      Aucune intervention récente.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const now = new Date();



  const today = now.toISOString().slice(0, 10);







  const monthStartDate = new Date(



    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)



  );



  const nextMonthStartDate = new Date(



    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)



  );







  const monthStart = monthStartDate.toISOString().slice(0, 10);



  const nextMonthStart = nextMonthStartDate.toISOString().slice(0, 10);



  const currentMonthLabel = formatMonthLabel(monthStartDate);







  const chartStartDate = new Date(



    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1)



  );



  const chartStart = chartStartDate.toISOString().slice(0, 10);







  const [



    propertiesCountResult,



    unitsCountResult,



    activeLeasesResult,



    currentMonthSchedulesResult,



    last12MonthsPaymentsResult,



    paymentTrackingSchedulesResult,



    dashboardPropertiesResult,



    dashboardUnitsResult,



    dashboardTenantsResult,



    maintenanceRequestsResult,



  ] = await Promise.all([



    supabase



      .from("properties")



      .select("id", { count: "exact", head: true })



      .eq("is_active", true),







    supabase



      .from("units")



      .select("id", { count: "exact", head: true })



      .eq("is_active", true),







    supabase



      .from("leases")



      .select("unit_id, start_date, end_date, effective_end_date")



      .eq("status", "ACTIVE")



      .lte("start_date", today),







    supabase



      .from("rent_schedules")



      .select("amount_due")



      .gte("period_start", monthStart)



      .lt("period_start", nextMonthStart)



      .neq("status", "CANCELLED"),







    supabase



      .from("payments")



      .select("id, amount, payment_date")



      .eq("status", "COMPLETED")



      .gte("payment_date", chartStart)



      .lt("payment_date", nextMonthStart),







    supabase



      .from("rent_schedules")



      .select(



        "id, lease_id, amount_due, currency, status, period_start, due_date"



      )



      .gte("period_start", monthStart)



      .order("due_date", { ascending: true })



      .limit(5),







    supabase



      .from("properties")



      .select("id, name, property_type, address, city, is_active")



      .eq("is_active", true)



      .order("created_at", { ascending: true })



      .limit(5),







    supabase



      .from("units")



      .select("id, property_id, name, monthly_rent, currency, is_active")



      .eq("is_active", true),







    supabase



      .from("tenants")



      .select("id, first_name, last_name, phone, is_active")



      .eq("is_active", true)



      .order("created_at", { ascending: true })



      .limit(4),







    supabase



      .from("maintenance_requests")



      .select(



        "id, property_id, unit_id, title, priority, status, reported_at, scheduled_for, completed_at"



      )



      .order("reported_at", { ascending: false })



      .limit(4),



  ]);







  const totalProperties = propertiesCountResult.count ?? 0;



  const totalUnits = unitsCountResult.count ?? 0;







  const occupiedUnitIds = new Set(



    (activeLeasesResult.data ?? [])



      .filter((lease) => {



        const effectiveEnd = lease.effective_end_date ?? lease.end_date;



        return !effectiveEnd || effectiveEnd >= today;



      })



      .map((lease) => lease.unit_id)



  );







  const occupiedUnits = occupiedUnitIds.size;



  const occupancyRate =



    totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;







  const expectedRent = (currentMonthSchedulesResult.data ?? []).reduce(



    (sum, schedule) => sum + Number(schedule.amount_due ?? 0),



    0



  );







  const last12MonthsPayments = last12MonthsPaymentsResult.data ?? [];



  const paymentIds = last12MonthsPayments.map((payment) => payment.id);







  const refundsByPaymentId = new Map<string, number>();







  if (paymentIds.length > 0) {



    const { data: refunds } = await supabase



      .from("payment_refunds")



      .select("payment_id, amount")



      .in("payment_id", paymentIds);







    for (const refund of refunds ?? []) {



      refundsByPaymentId.set(



        refund.payment_id,



        (refundsByPaymentId.get(refund.payment_id) ?? 0) +



          Number(refund.amount ?? 0)



      );



    }



  }







  const currentMonthPayments = last12MonthsPayments.filter(



    (payment) =>



      payment.payment_date >= monthStart &&



      payment.payment_date < nextMonthStart



  );







  const netCollected = currentMonthPayments.reduce(



    (sum, payment) =>



      sum +



      Math.max(



        0,



        Number(payment.amount ?? 0) -



          (refundsByPaymentId.get(payment.id) ?? 0)



      ),



    0



  );







  const monthlyTotals = new Map<string, number>();







  for (const payment of last12MonthsPayments) {



    const key = payment.payment_date.slice(0, 7);



    const netAmount = Math.max(



      0,



      Number(payment.amount ?? 0) -



        (refundsByPaymentId.get(payment.id) ?? 0)



    );







    monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + netAmount);



  }







  const monthlyBars = Array.from({ length: 12 }, (_, index) => {



    const date = new Date(



      Date.UTC(



        chartStartDate.getUTCFullYear(),



        chartStartDate.getUTCMonth() + index,



        1



      )



    );



    const key = date.toISOString().slice(0, 7);







    return {



      month: formatShortMonth(date),



      amount: monthlyTotals.get(key) ?? 0,



    };



  });







  const maxMonthlyCollected = Math.max(



    1,



    ...monthlyBars.map((item) => item.amount)



  );







  const monthlyBarsWithHeight = monthlyBars.map((item) => ({



    ...item,



    value:



      item.amount > 0



        ? Math.max(8, Math.round((item.amount / maxMonthlyCollected) * 100))



        : 0,



  }));







  const paymentTrackingSchedules =



    paymentTrackingSchedulesResult.data ?? [];







  const paymentTrackingLeaseIds = Array.from(



    new Set(paymentTrackingSchedules.map((schedule) => schedule.lease_id))



  );







  const { data: paymentTrackingLeases } =



    paymentTrackingLeaseIds.length > 0



      ? await supabase



          .from("leases")



          .select("id, tenant_id, unit_id")



          .in("id", paymentTrackingLeaseIds)



      : { data: [] };







  const tenantIds = Array.from(



    new Set((paymentTrackingLeases ?? []).map((lease) => lease.tenant_id))



  );



  const unitIds = Array.from(



    new Set((paymentTrackingLeases ?? []).map((lease) => lease.unit_id))



  );







  const [paymentTrackingTenantsResult, paymentTrackingUnitsResult] =



    await Promise.all([



      tenantIds.length > 0



        ? supabase



            .from("tenants")



            .select("id, first_name, last_name")



            .in("id", tenantIds)



        : Promise.resolve({ data: [] }),



      unitIds.length > 0



        ? supabase



            .from("units")



            .select("id, name")



            .in("id", unitIds)



        : Promise.resolve({ data: [] }),



    ]);







  const paymentTrackingLeaseMap = new Map(



    (paymentTrackingLeases ?? []).map((lease) => [lease.id, lease])



  );



  const paymentTrackingTenantMap = new Map(



    (paymentTrackingTenantsResult.data ?? []).map((tenant) => [



      tenant.id,



      tenant,



    ])



  );



  const paymentTrackingUnitMap = new Map(



    (paymentTrackingUnitsResult.data ?? []).map((unit) => [unit.id, unit])



  );







  const paymentTracking = paymentTrackingSchedules.map((schedule) => {



    const lease = paymentTrackingLeaseMap.get(schedule.lease_id);



    const tenant = lease



      ? paymentTrackingTenantMap.get(lease.tenant_id)



      : undefined;



    const unit = lease ? paymentTrackingUnitMap.get(lease.unit_id) : undefined;



    const presentation = getScheduleStatusPresentation(schedule.status);







    const tenantName = tenant



      ? `${tenant.first_name} ${tenant.last_name}`



      : "Locataire";



    const unitName = unit?.name ?? "Unité";







    return {



      label: `${tenantName} — ${unitName}`,



      period: formatSchedulePeriod(schedule.period_start),



      amount: formatXof(Number(schedule.amount_due ?? 0)),



      status: presentation.label,



      tone: presentation.tone,



    };



  });







  const dashboardProperties = dashboardPropertiesResult.data ?? [];



  const dashboardUnits = dashboardUnitsResult.data ?? [];







  const dashboardPropertyUnitIds = dashboardUnits.map((unit) => unit.id);







  const [



    dashboardPropertyLeasesResult,



    dashboardPropertySchedulesResult,



  ] = await Promise.all([



    dashboardPropertyUnitIds.length > 0



      ? supabase



          .from("leases")



          .select(



            "id, unit_id, status, start_date, end_date, effective_end_date"



          )



          .in("unit_id", dashboardPropertyUnitIds)



          .eq("status", "ACTIVE")



      : Promise.resolve({ data: [] }),



    dashboardPropertyUnitIds.length > 0



      ? supabase



          .from("rent_schedules")



          .select("lease_id, due_date, status")



          .gte("due_date", today)



          .neq("status", "CANCELLED")



          .order("due_date", { ascending: true })



      : Promise.resolve({ data: [] }),



  ]);







  const dashboardPropertyLeases =



    dashboardPropertyLeasesResult.data ?? [];



  const dashboardPropertySchedules =



    dashboardPropertySchedulesResult.data ?? [];







  const activeLeaseByUnitId = new Map<



    string,



    { id: string; unit_id: string }



  >();







  for (const lease of dashboardPropertyLeases) {



    const effectiveEnd = lease.effective_end_date ?? lease.end_date;







    if (



      lease.start_date <= today &&



      (!effectiveEnd || effectiveEnd >= today)



    ) {



      activeLeaseByUnitId.set(lease.unit_id, {



        id: lease.id,



        unit_id: lease.unit_id,



      });



    }



  }







  const nextDueDateByLeaseId = new Map<string, string>();







  for (const schedule of dashboardPropertySchedules) {



    if (!nextDueDateByLeaseId.has(schedule.lease_id)) {



      nextDueDateByLeaseId.set(schedule.lease_id, schedule.due_date);



    }



  }







  const properties = dashboardProperties.map((property) => {



    const propertyUnits = dashboardUnits.filter(



      (unit) => unit.property_id === property.id



    );







    const occupiedPropertyUnits = propertyUnits.filter((unit) =>



      activeLeaseByUnitId.has(unit.id)



    );







    const totalMonthlyRent = propertyUnits.reduce(



      (sum, unit) => sum + Number(unit.monthly_rent ?? 0),



      0



    );







    let occupancy = "Vacant";



    let occupancyTone: StatusTone = "neutral";







    if (



      propertyUnits.length > 0 &&



      occupiedPropertyUnits.length === propertyUnits.length



    ) {



      occupancy = "Loué";



      occupancyTone = "success";



    } else if (occupiedPropertyUnits.length > 0) {



      occupancy = "Partiel";



      occupancyTone = "warning";



    }







    const nextDueDates = occupiedPropertyUnits



      .map((unit) => activeLeaseByUnitId.get(unit.id))



      .filter(



        (



          lease



        ): lease is {



          id: string;



          unit_id: string;



        } => Boolean(lease)



      )



      .map((lease) => nextDueDateByLeaseId.get(lease.id))



      .filter((date): date is string => Boolean(date))



      .sort();







    return {



      id: property.id,



      name: property.name,



      type: formatPropertyType(property.property_type),



      location: property.address || property.city || "—",



      rent: formatXof(totalMonthlyRent),



      occupancy,



      occupancyTone,



      nextPayment: formatDateFr(nextDueDates[0] ?? null),



    };



  });







  const dashboardTenants = dashboardTenantsResult.data ?? [];



  const dashboardTenantIds = dashboardTenants.map((tenant) => tenant.id);







  const { data: dashboardTenantLeases } =



    dashboardTenantIds.length > 0



      ? await supabase



          .from("leases")



          .select("id, tenant_id, unit_id, status, start_date, end_date")



          .in("tenant_id", dashboardTenantIds)



          .in("status", ["ACTIVE", "DRAFT"])



          .order("start_date", { ascending: true })



      : { data: [] };







  const tenantLeaseByTenantId = new Map<



    string,



    {



      id: string;



      tenant_id: string;



      unit_id: string;



      status: string;



      start_date: string;



      end_date: string | null;



    }



  >();







  for (const lease of dashboardTenantLeases ?? []) {



    if (!tenantLeaseByTenantId.has(lease.tenant_id)) {



      tenantLeaseByTenantId.set(lease.tenant_id, lease);



    }



  }







  const tenantUnitIds = Array.from(



    new Set(



      Array.from(tenantLeaseByTenantId.values()).map((lease) => lease.unit_id)



    )



  );







  const { data: tenantUnits } =



    tenantUnitIds.length > 0



      ? await supabase



          .from("units")



          .select("id, property_id, name")



          .in("id", tenantUnitIds)



      : { data: [] };







  const tenantPropertyIds = Array.from(



    new Set((tenantUnits ?? []).map((unit) => unit.property_id))



  );







  const { data: tenantProperties } =



    tenantPropertyIds.length > 0



      ? await supabase



          .from("properties")



          .select("id, name, address, city")



          .in("id", tenantPropertyIds)



      : { data: [] };







  const tenantUnitMap = new Map(



    (tenantUnits ?? []).map((unit) => [unit.id, unit])



  );







  const tenantPropertyMap = new Map(



    (tenantProperties ?? []).map((property) => [property.id, property])



  );







  const tenants = dashboardTenants.map((tenant) => {



    const lease = tenantLeaseByTenantId.get(tenant.id);



    const unit = lease ? tenantUnitMap.get(lease.unit_id) : undefined;



    const property = unit



      ? tenantPropertyMap.get(unit.property_id)



      : undefined;







    const initials = `${tenant.first_name?.[0] ?? ""}${



      tenant.last_name?.[0] ?? ""



    }`.toUpperCase();







    const location =



      property?.address || property?.city || property?.name || "Sans bien";







    return {



      id: tenant.id,



      initials: initials || "—",



      name: `${tenant.first_name} ${tenant.last_name}`.trim(),



      property: unit ? `${unit.name} — ${location}` : "Aucune unité associée",



      phone: tenant.phone || "—",



    };



  });







  const maintenanceRequests = maintenanceRequestsResult.data ?? [];







  const maintenancePropertyIds = Array.from(



    new Set(



      maintenanceRequests



        .map((request) => request.property_id)



        .filter((id): id is string => Boolean(id))



    )



  );







  const maintenanceUnitIds = Array.from(



    new Set(



      maintenanceRequests



        .map((request) => request.unit_id)



        .filter((id): id is string => Boolean(id))



    )



  );







  const [maintenancePropertiesResult, maintenanceUnitsResult] =



    await Promise.all([



      maintenancePropertyIds.length > 0



        ? supabase



            .from("properties")



            .select("id, name, address, city")



            .in("id", maintenancePropertyIds)



        : Promise.resolve({ data: [] }),



      maintenanceUnitIds.length > 0



        ? supabase



            .from("units")



            .select("id, name")



            .in("id", maintenanceUnitIds)



        : Promise.resolve({ data: [] }),



    ]);







  const maintenancePropertyMap = new Map(



    (maintenancePropertiesResult.data ?? []).map((property) => [



      property.id,



      property,



    ])



  );







  const maintenanceUnitMap = new Map(



    (maintenanceUnitsResult.data ?? []).map((unit) => [unit.id, unit])



  );







  const maintenanceItems = maintenanceRequests.map((request) => {



    const property = request.property_id



      ? maintenancePropertyMap.get(request.property_id)



      : undefined;



    const unit = request.unit_id



      ? maintenanceUnitMap.get(request.unit_id)



      : undefined;







    const presentation = getMaintenancePresentation(



      request.status,



      request.priority



    );







    const subtitleParts = [



      unit?.name,



      property?.address || property?.city || property?.name,



    ].filter(Boolean);







    const displayDate =



      request.completed_at ??



      request.scheduled_for ??



      request.reported_at;







    return {



      id: request.id,



      title: request.title,



      subtitle: subtitleParts.join(" — ") || "Bien non renseigné",



      status: presentation.label,



      date: formatMaintenanceDate(displayDate),



      tone: presentation.tone,



    };



  });







  const kpis = [



    {



      label: "Biens",



      value: String(totalProperties),



      meta: "Actifs",



      note: `${totalUnits} unité${totalUnits > 1 ? "s" : ""} gérée${



        totalUnits > 1 ? "s" : ""



      }`,



      icon: Building2,



    },



    {



      label: "Taux d’occupation",



      value: `${occupancyRate}%`,



      meta: `${occupiedUnits} / ${totalUnits} unités occupées`,



      note: "",



      icon: UserRound,



    },



    {



      label: "Loyers encaissés",



      value: formatXof(netCollected),



      meta: currentMonthLabel,



      note: "",



      icon: CreditCard,



    },



    {



      label: "Revenus",



      value: formatXof(expectedRent),



      meta: `Attendus · ${currentMonthLabel}`,



      note: "",



      icon: TrendingUp,



    },



  ];







  return (



    <div className="h-screen overflow-hidden bg-white">



      <div className="flex h-screen w-full overflow-hidden bg-white">



        <AppSidebar />







        <main className="h-screen min-w-0 flex-1 overflow-y-auto bg-white">



          <header className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 md:flex-row md:items-center md:justify-between lg:px-7">



            <div>



              <h1 className="text-[30px] font-extrabold tracking-tight text-slate-950">



                Tableau de bord



              </h1>



              <p className="mt-0.5 text-base text-slate-400">



                Vue d’ensemble de votre activité



              </p>



            </div>







            <div className="flex flex-wrap items-center gap-3">



              <div className="relative hidden xl:block">



                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />



                <input



                  type="search"



                  placeholder="Rechercher..."



                  className="h-10 w-52 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-base outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"



                />



              </div>







              <button



                type="button"



                className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-700 shadow-sm"



              >



                <CalendarDays className="h-4 w-4" />



                {currentMonthLabel}



                <ChevronDown className="h-3.5 w-3.5" />



              </button>







              <a
                href="/properties"
                className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-[#ff5d4d] px-4 text-base font-semibold text-white shadow-[0_8px_22px_rgba(239,68,68,0.23)]"
              >
                <span className="text-base leading-none">+</span>
                Ajouter
              </a>







              <button



                type="button"



                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 xl:hidden"



                aria-label="Notifications"



              >



                <Bell className="h-4 w-4" />



              </button>



            </div>



          </header>







          <div className="space-y-5 px-5 py-5 lg:px-7">



            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">



              {kpis.map((kpi) => {



                const Icon = kpi.icon;







                return (



                  <article



                    key={kpi.label}



                    className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_6px_20px_rgba(15,23,42,0.05)]"



                  >



                    <div className="flex items-start gap-4">



                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 ring-1 ring-red-100">



                        <Icon className="h-5 w-5" />



                      </div>







                      <div className="min-w-0">



                        <p className="text-[14px] font-semibold text-slate-700">



                          {kpi.label}



                        </p>



                        <p className="mt-1 truncate text-[30px] font-extrabold tracking-tight text-slate-950">



                          {kpi.value}



                        </p>







                        {kpi.label === "Biens" ? (



                          <>



                            <p className="mt-0.5 text-[14px] text-slate-400">



                              {kpi.meta}



                            </p>



                            <p className="mt-1 flex items-center gap-1 text-[14px] text-slate-400">



                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />



                              {kpi.note}



                            </p>



                          </>



                        ) : (



                          <p



                            className={[



                              "mt-2 text-[14px] font-semibold",



                              kpi.meta.startsWith("+")



                              ? "text-emerald-600"



                              : "text-slate-400",



                            ].join(" ")}



                          >



                            {kpi.meta}



                          </p>



                        )}



                      </div>



                    </div>



                  </article>



                );



              })}



            </section>







            <section className="grid gap-4 2xl:grid-cols-[1.42fr_0.86fr_0.82fr]">



              <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_6px_20px_rgba(15,23,42,0.04)]">



                <div className="flex items-center justify-between gap-3">



                  <div>



                    <h2 className="text-[17px] font-bold text-slate-900">



                      Loyers encaissés



                    </h2>



                    <p className="mt-1 text-[14px] text-slate-400">



                      Évolution mensuelle des encaissements



                    </p>



                  </div>







                  <button



                    type="button"



                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-[14px] font-medium text-slate-600"



                  >



                    12 derniers mois



                    <ChevronDown className="h-3 w-3" />



                  </button>



                </div>







                <div className="mt-5 grid h-[235px] grid-cols-12 items-end gap-2 border-b border-dashed border-slate-200 pb-5">



                  {monthlyBarsWithHeight.map((item, index) => (



                    <div



                      key={`${item.month}-${index}`}



                      className="flex h-full flex-col items-center justify-end gap-2"



                      title={`${item.month} : ${formatXof(item.amount)}`}



                    >



                      <div



                        className={[



                          "w-full max-w-8 rounded-t-md transition-all",



                          index === monthlyBarsWithHeight.length - 1



                            ? "bg-red-600"



                            : "bg-gradient-to-t from-red-400 to-red-300",



                        ].join(" ")}



                        style={{ height: `${item.value}%` }}



                      />



                      <span className="text-[12px] text-slate-400">



                        {item.month}



                      </span>



                    </div>



                  ))}



                </div>



              </article>







              <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.04)]">



                <div className="border-b border-slate-100 px-4 py-4">



                  <h2 className="text-[17px] font-bold text-slate-900">



                    Suivi des paiements



                  </h2>



                </div>







                <div className="divide-y divide-slate-100">



                  {paymentTracking.length > 0 ? (



                    paymentTracking.map((item) => (



                      <div



                        key={`${item.label}-${item.period}`}



                        className="flex items-center gap-3 px-4 py-3"



                      >



                        <div



                          className={[



                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[14px] font-bold ring-1",



                            item.tone === "success"



                              ? "bg-emerald-50 text-emerald-600 ring-emerald-200"



                              : item.tone === "warning"



                                ? "bg-amber-50 text-amber-600 ring-amber-200"



                                : item.tone === "danger"



                                  ? "bg-red-50 text-red-500 ring-red-200"



                                  : "bg-slate-50 text-slate-500 ring-slate-200",



                          ].join(" ")}



                        >



                          {item.tone === "success"



                            ? "✓"



                            : item.tone === "danger"



                              ? "!"



                              : "•"}



                        </div>







                        <div className="min-w-0 flex-1">



                          <p className="truncate text-[14px] font-semibold text-slate-800">



                            {item.label}



                          </p>



                          <p className="mt-0.5 text-[12px] text-slate-400">



                            {item.period}



                          </p>



                        </div>







                        <div className="text-right">



                          <p className="text-[14px] font-bold text-slate-800">



                            {item.amount}



                          </p>



                          <div className="mt-1">



                            <StatusBadge



                              label={item.status}



                              tone={item.tone}



                            />



                          </div>



                        </div>



                      </div>



                    ))



                  ) : (



                    <div className="px-4 py-8 text-center">



                      <p className="text-base font-medium text-slate-500">



                        Aucune échéance à afficher.



                      </p>



                    </div>



                  )}



                </div>







                <a
                  href="/payments"
                  className="block w-full border-t border-slate-100 px-4 py-3 text-left text-[14px] font-semibold text-red-500 transition hover:bg-red-50"
                >
                  Voir tous les paiements
                </a>



              </article>







              <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.04)]">



                <div className="border-b border-slate-100 px-4 py-4">



                  <h2 className="text-[17px] font-bold text-slate-900">



                    Interventions récentes



                  </h2>



                </div>







                <div className="divide-y divide-slate-100">



                  {maintenanceItems.length > 0 ? (



                    maintenanceItems.map((item) => (



                      <div



                        key={item.id}



                        className="flex items-start gap-3 px-4 py-3"



                      >



                        <div



                          className={[



                            "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",



                            item.tone === "danger"



                              ? "bg-red-500"



                              : item.tone === "warning"



                                ? "bg-amber-500"



                                : item.tone === "success"



                                  ? "bg-emerald-500"



                                  : "bg-slate-400",



                          ].join(" ")}



                        />







                        <div className="min-w-0 flex-1">



                          <p className="truncate text-[14px] font-semibold text-slate-800">



                            {item.title}



                          </p>



                          <p className="mt-0.5 text-[12px] text-slate-400">



                            {item.subtitle}



                          </p>



                        </div>







                        <div className="text-right">



                          <StatusBadge



                            label={item.status}



                            tone={item.tone}



                          />



                          <p className="mt-1.5 text-[11px] text-slate-400">



                            {item.date}



                          </p>



                        </div>



                      </div>



                    ))



                  ) : (



                    <div className="px-4 py-8 text-center text-sm text-slate-500">



                      Aucune intervention récente.



                    </div>



                  )}



                </div>







                <a
                  href="/maintenance"
                  className="block w-full border-t border-slate-100 px-4 py-3 text-left text-[14px] font-semibold text-red-500 transition hover:bg-red-50"
                >
                  Voir toutes les interventions
                </a>



              </article>



            </section>







            <section className="grid gap-4 2xl:grid-cols-[1.65fr_0.65fr]">



              <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.04)]">



                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">



                  <h2 className="text-[17px] font-bold text-slate-900">



                    Mes biens



                  </h2>







                  <a
                    href="/properties"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-[14px] font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    Voir tous les biens
                  </a>



                </div>







                <div className="overflow-x-auto">



                  <table className="min-w-[860px] w-full">



                    <thead>



                      <tr className="border-b border-slate-100 text-left">



                        <th className="px-4 py-3 text-[12px] font-medium text-slate-400">



                          Bien



                        </th>



                        <th className="px-4 py-3 text-[12px] font-medium text-slate-400">



                          Type



                        </th>



                        <th className="px-4 py-3 text-[12px] font-medium text-slate-400">



                          Localisation



                        </th>



                        <th className="px-4 py-3 text-[12px] font-medium text-slate-400">



                          Loyer mensuel



                        </th>



                        <th className="px-4 py-3 text-[12px] font-medium text-slate-400">



                          Occupation



                        </th>



                        <th className="px-4 py-3 text-[12px] font-medium text-slate-400">



                          Prochain paiement



                        </th>



                        <th className="px-4 py-3" />



                      </tr>



                    </thead>







                    <tbody className="divide-y divide-slate-100">



                      {properties.length > 0 ? (



                        properties.map((property, index) => (



                        <tr key={property.id}>



                          <td className="px-4 py-3">



                            <div className="flex items-center gap-3">



                              <div



                                className={[



                                  "h-9 w-12 rounded-lg bg-gradient-to-br",



                                  index % 2 === 0



                                    ? "from-slate-200 to-slate-100"



                                    : "from-red-100 to-slate-100",



                                ].join(" ")}



                              />



                              <div>



                                <p className="text-[14px] font-semibold text-slate-800">



                                  {property.name}



                                </p>



                                <p className="mt-0.5 text-[12px] text-slate-400">



                                  Réf. ALT-{property.id.slice(0, 6).toUpperCase()}



                                </p>



                              </div>



                            </div>



                          </td>



                          <td className="px-4 py-3 text-[14px] text-slate-600">



                            {property.type}



                          </td>



                          <td className="px-4 py-3 text-[14px] text-slate-600">



                            {property.location}



                          </td>



                          <td className="px-4 py-3 text-[14px] font-semibold text-slate-800">



                            {property.rent}



                          </td>



                          <td className="px-4 py-3">



                            <StatusBadge



                              label={property.occupancy}



                              tone={property.occupancyTone}



                            />



                          </td>



                          <td className="px-4 py-3 text-[14px] text-slate-600">



                            {property.nextPayment}



                          </td>



                          <td className="px-4 py-3 text-right">



                            <MoreHorizontal className="ml-auto h-4 w-4 text-slate-400" />



                          </td>



                        </tr>



                        ))



                      ) : (



                        <tr>



                          <td



                            colSpan={7}



                            className="px-4 py-8 text-center text-base text-slate-500"



                          >



                            Aucun bien actif à afficher.



                          </td>



                        </tr>



                      )}



                    </tbody>



                  </table>



                </div>



              </article>







              <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.04)]">



                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">



                  <h2 className="text-[17px] font-bold text-slate-900">



                    Locataires



                  </h2>







                  <a
                    href="/tenants"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-[14px] font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    Voir tous
                  </a>



                </div>







                <div className="divide-y divide-slate-100">



                  {tenants.length > 0 ? (



                    tenants.map((tenant) => (



                      <div



                        key={tenant.id}



                        className="flex items-center gap-3 px-4 py-4"



                      >



                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-[14px] font-bold text-red-500">



                          {tenant.initials}



                        </div>







                        <div className="min-w-0 flex-1">



                          <p className="truncate text-[14px] font-semibold text-slate-800">



                            {tenant.name}



                          </p>



                          <p className="mt-0.5 truncate text-[12px] text-slate-400">



                            {tenant.property}



                          </p>



                        </div>







                        <p className="hidden text-[12px] text-slate-500 sm:block">



                          {tenant.phone}



                        </p>







                        <MessageSquareText className="h-4 w-4 shrink-0 text-slate-400" />



                      </div>



                    ))



                  ) : (



                    <div className="px-4 py-8 text-center text-base text-slate-500">



                      Aucun locataire actif à afficher.



                    </div>



                  )}



                </div>







                <a
                  href="/tenants"
                  className="block w-full border-t border-slate-100 px-4 py-3 text-left text-[14px] font-semibold text-red-500 transition hover:bg-red-50"
                >
                  Voir tous les locataires
                </a>



              </article>



            </section>



          </div>



        </main>



      </div>



    </div>



  );



}
