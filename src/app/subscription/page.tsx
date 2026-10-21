import "server-only";

import AppSidebar from "@/components/AppSidebar";
import SubscriptionForm from "@/components/subscription/SubscriptionForm";
import { requireActiveMembership } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  CreditCard,
  Gift,
  ShieldCheck,
  Users,
} from "lucide-react";

type Plan = "free" | "silver" | "gold";

type PriceRow = {
  id: string;
  plan: string;
  duration_months: number;
  amount_xof: number;
  is_active: boolean;
};

type ClientRow = {
  id: string;
  name: string;
  plan: string;
  status: string;
};

type SubscriptionRow = {
  id: string;
  plan: string;
  duration_months: number;
  starts_at: string;
  expires_at: string;
  grace_ends_at: string;
  status: string;
  created_at: string;
};

type Offer = {
  plan: Plan;
  name: string;
  subtitle: string;
  units: string;
  collaborators: string;
  highlight: boolean;
};

const PLAN_DETAILS = {
  free: {
    label: "Free",
    units: "5 logements",
    collaborators: "2 collaborateurs actifs",
  },
  silver: {
    label: "Silver",
    units: "50 logements",
    collaborators: "10 collaborateurs actifs",
  },
  gold: {
    label: "Gold",
    units: "Logements illimités",
    collaborators: "Collaborateurs illimités",
  },
};

const OFFERS: Offer[] = [
  {
    plan: "free",
    name: "Free",
    subtitle: "Pour découvrir Alteract gratuitement",
    units: "Jusqu'à 5 logements",
    collaborators: "2 collaborateurs actifs",
    highlight: false,
  },
  {
    plan: "silver",
    name: "Silver",
    subtitle: "Pour les agences en croissance",
    units: "Jusqu'à 50 logements",
    collaborators: "10 collaborateurs actifs",
    highlight: false,
  },
  {
    plan: "gold",
    name: "Gold",
    subtitle: "Pour les agences à grande capacité",
    units: "Logements illimités",
    collaborators: "Collaborateurs illimités",
    highlight: true,
  },
];

function formatAmount(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount);
}

function getPlan(value: string): Plan {
  if (value === "silver" || value === "gold") {
    return value;
  }

  return "free";
}

function formatSubscriptionDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date indisponible";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Abidjan",
  }).format(date);
}

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  grace: "Délai de grâce",
  restricted: "Restreint",
  cancelled: "Annulé",
};

export default async function SubscriptionPage() {
  const { membership } = await requireActiveMembership();

  if (membership.role !== "ADMIN_AGENCY") {
    redirect("/dashboard");
  }

  const organizationId = membership.organization_id;

  if (!organizationId) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();

  const [clientResult, pricesResult] = await Promise.all([
    admin
      .from("alteract_platform_clients")
      .select("id, name, plan, status")
      .eq("organization_id", organizationId)
      .maybeSingle(),

    admin
      .from("alteract_subscription_prices")
      .select(
        "id, plan, duration_months, amount_xof, is_active"
      )
      .eq("is_active", true)
      .order("duration_months", {
        ascending: true,
      }),
  ]);

  const client = clientResult.data as ClientRow | null;

  const prices = (pricesResult.data ?? []) as PriceRow[];

  const hasError =
    Boolean(clientResult.error) ||
    Boolean(pricesResult.error);

  // Lecture limitée au dossier client de l'organisation authentifiée.
  // Aucun accès direct à cette table n'est accordé au navigateur.
  const subscriptionResult = client
    ? await admin
        .from("alteract_subscriptions")
        .select(
          "id, plan, duration_months, starts_at, expires_at, grace_ends_at, status, created_at"
        )
        .eq("client_id", client.id)
        .in("status", ["active", "grace", "restricted"])
        .order("created_at", { ascending: false })
        .limit(20)
    : null;

  const subscriptions = (subscriptionResult?.data ?? []) as SubscriptionRow[];

  // La formule de référence reste celle du registre client.
  // Un abonnement historique d'une autre formule ne doit pas être
  // affiché comme l'abonnement actuel.
  const currentSubscription =
    subscriptions.find((item) => item.plan === client?.plan) ?? null;

  const subscriptionError = Boolean(subscriptionResult?.error);

  const currentPlan = client
    ? getPlan(client.plan)
    : null;

  const currentPlanDetails = currentPlan
    ? PLAN_DETAILS[currentPlan]
    : null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <AppSidebar />

      <main className="h-screen flex-1 overflow-y-auto">
        <header className="border-b border-slate-200 bg-white px-5 py-6 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-500">
            Gestion des abonnements
          </p>

          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            Abonnement et facturation
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Consultez votre abonnement et comparez les
            formules disponibles pour votre agence.
          </p>
        </header>

        <div className="space-y-7 p-5 md:p-8">
          {hasError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              Impossible de charger toutes les informations
              d'abonnement. Vérifiez la connexion à Supabase.
            </div>
          )}

          {!client && !clientResult.error && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Aucun dossier client Alteract n'est encore
              associé à cette agence.
            </div>
          )}

          {/* ABONNEMENT ACTUEL */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
                  <BadgeCheck className="h-6 w-6 text-red-500" />
                </div>

                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Mon abonnement actuel
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Offre associée à votre agence
                  </p>
                </div>
              </div>

              {currentPlanDetails ? (
                <span className="rounded-full bg-red-50 px-4 py-2 text-sm font-extrabold text-red-600 ring-1 ring-red-100">
                  {currentPlanDetails.label}
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
                  Non disponible
                </span>
              )}
            </div>

            {client && currentPlanDetails && (
              <>
                <p className="mt-5 text-sm font-semibold text-slate-800">
                  {client.name}
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Building2 className="h-4 w-4" />
                      <span className="text-xs font-semibold">
                        Capacité de logements
                      </span>
                    </div>

                    <p className="mt-2 text-base font-extrabold text-slate-900">
                      {currentPlanDetails.units}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Users className="h-4 w-4" />
                      <span className="text-xs font-semibold">
                        Collaborateurs
                      </span>
                    </div>

                    <p className="mt-2 text-base font-extrabold text-slate-900">
                      {currentPlanDetails.collaborators}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs text-slate-500">
                  Statut du dossier client :{" "}
                  <span className="font-bold">
                    {client.status}
                  </span>
                </p>

                {subscriptionError && (
                  <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    Les dates de votre abonnement sont temporairement indisponibles.
                  </p>
                )}

                {!subscriptionError && currentSubscription && (
                  <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Période de souscription
                      </h3>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        {SUBSCRIPTION_STATUS_LABELS[currentSubscription.status] ??
                          currentSubscription.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold text-slate-500">Durée souscrite</p>
                        <p className="mt-2 text-sm font-extrabold text-slate-900">
                          {currentSubscription.duration_months} mois
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold text-slate-500">Début</p>
                        <p className="mt-2 text-sm font-extrabold text-slate-900">
                          {formatSubscriptionDate(currentSubscription.starts_at)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold text-slate-500">Expiration</p>
                        <p className="mt-2 text-sm font-extrabold text-slate-900">
                          {formatSubscriptionDate(currentSubscription.expires_at)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold text-slate-500">Fin du délai de grâce</p>
                        <p className="mt-2 text-sm font-extrabold text-slate-900">
                          {formatSubscriptionDate(currentSubscription.grace_ends_at)}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Ces dates proviennent de votre abonnement enregistré par Alteract.
                      Le délai de grâce est informatif ; son application automatique
                      sera activée ultérieurement.
                    </p>
                  </div>
                )}

                {!subscriptionError &&
                  !currentSubscription &&
                  currentPlan !== "free" && (
                    <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                      Aucune période de souscription active n'est enregistrée
                      pour cette formule. Contactez l'administration Alteract
                      si vous avez déjà réglé votre abonnement.
                    </p>
                  )}
              </>
            )}
          </section>

          {/* LES TROIS FORMULES */}

          <section>
            <div className="mb-5">
              <h2 className="text-xl font-extrabold text-slate-900">
                Nos formules
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Commencez gratuitement ou choisissez une
                formule adaptée à la taille de votre agence.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {OFFERS.map((offer) => {
                const isFree = offer.plan === "free";

                const isCurrent =
                  currentPlan === offer.plan;

                const offerPrices = prices.filter(
                  (price) => price.plan === offer.plan
                );

                return (
                  <article
                    key={offer.plan}
                    className={[
                      "flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm",
                      offer.highlight
                        ? "border-red-200"
                        : "border-slate-200",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "border-b p-6",
                        offer.highlight
                          ? "border-red-100 bg-red-50/50"
                          : "border-slate-100",
                      ].join(" ")}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-2xl font-extrabold text-slate-900">
                          {offer.name}
                        </h3>

                        {isCurrent ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                            Votre offre actuelle
                          </span>
                        ) : isFree ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            Gratuit
                          </span>
                        ) : offer.highlight ? (
                          <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                            Premium
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        {offer.subtitle}
                      </p>

                      {isFree && (
                        <div className="mt-5 flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold text-slate-900">
                            0 FCFA
                          </span>

                          <span className="text-xs text-slate-500">
                            Sans frais d'abonnement
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col space-y-6 p-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Check className="h-4 w-4 shrink-0 text-emerald-600" />

                          <span className="text-sm font-medium text-slate-700">
                            {offer.units}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <Check className="h-4 w-4 shrink-0 text-emerald-600" />

                          <span className="text-sm font-medium text-slate-700">
                            {offer.collaborators}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <Check className="h-4 w-4 shrink-0 text-emerald-600" />

                          <span className="text-sm font-medium text-slate-700">
                            Gestion locative Alteract
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-5">
                        {isFree ? (
                          <div className="rounded-xl bg-slate-50 p-4">
                            <div className="flex items-center gap-2">
                              <Gift className="h-5 w-5 text-emerald-600" />

                              <p className="text-sm font-bold text-slate-800">
                                Offre gratuite
                              </p>
                            </div>

                            <p className="mt-3 text-sm leading-6 text-slate-600">
                              Accédez aux fonctionnalités
                              de gestion locative dans la
                              limite de 5 logements et
                              2 collaborateurs actifs.
                            </p>

                            <p className="mt-3 text-xs text-slate-500">
                              Aucun paiement requis.
                            </p>
                          </div>
                        ) : (
                          <>
                            <p className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                              Durée de souscription
                            </p>

                            <div className="space-y-3">
                              {[3, 6, 12].map((duration) => {
                                const price = offerPrices.find(
                                  (item) =>
                                    item.duration_months ===
                                    duration
                                );

                                return (
                                  <div
                                    key={duration}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-4"
                                  >
                                    <div className="flex items-center gap-2">
                                      <CalendarDays className="h-4 w-4 shrink-0 text-red-500" />

                                      <span className="text-sm font-semibold text-slate-700">
                                        {duration} mois
                                      </span>
                                    </div>

                                    <span className="text-sm font-extrabold text-slate-900">
                                      {price
                                        ? `${formatAmount(
                                            price.amount_xof
                                          )} FCFA`
                                        : "Indisponible"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="mt-auto space-y-4 pt-2">
                        {!isFree && (
                          <div className="rounded-xl bg-slate-50 p-4">
                            <div className="flex items-center gap-2">
                              <Clock3 className="h-4 w-4 text-slate-500" />

                              <p className="text-xs font-bold text-slate-700">
                                Paiement sécurisé
                              </p>
                            </div>

                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              Une commande sera créée avant
                              toute demande de paiement.
                              L'activation sera effectuée
                              après vérification par
                              l'administration Alteract.
                            </p>
                          </div>
                        )}


{isFree ? (
  <button
    type="button"
    disabled
    className={[
      "flex h-12 w-full cursor-not-allowed items-center justify-center rounded-xl px-4 text-center text-sm font-bold",
      isCurrent
        ? "bg-emerald-50 text-emerald-700"
        : "bg-slate-100 text-slate-600",
    ].join(" ")}
  >
    {isCurrent
      ? "Votre formule actuelle"
      : "Offre gratuite"}
  </button>
) : (
  <SubscriptionForm
    plan={offer.plan === "silver" ? "silver" : "gold"}
    prices={offerPrices.map((price) => ({
      duration_months: price.duration_months,
      amount_xof: price.amount_xof,
    }))}
    disabled={!client || hasError}
  />
)}


                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* MOYENS DE PAIEMENT */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-red-500" />

              <h2 className="text-lg font-extrabold text-slate-900">
                Moyens de paiement
              </h2>
            </div>

            <p className="mt-3 text-sm text-slate-600">
              Les souscriptions payantes pourront être
              réglées via les moyens suivants :
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {[
                "Orange Money",
                "Wave",
                "MTN MoMo",
              ].map((method) => (
                <span
                  key={method}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"
                >
                  {method}
                </span>
              ))}
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-xl bg-amber-50 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

              <p className="text-xs leading-5 text-amber-800">
                Les paiements seront effectués en dehors
                de l'application. Un abonnement Silver ou
                Gold ne sera activé qu'après vérification
                et confirmation du paiement par le
                Super Administrateur Alteract.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
