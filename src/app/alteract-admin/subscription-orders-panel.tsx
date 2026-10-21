
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

type SubscriptionOrder = {
  id: string;
  reference: string;
  agency_name: string;
  plan: string;
  duration_months: number | null;
  payment_method: string;
  amount_xof: number;
  status: string;
  created_at: string;
};

type Decision = "confirm" | "reject";

type DecisionResponse = {
  success?: boolean;
  error?: string;
  result?: {
    status?: string;
  };
};

const paymentLabels: Record<string, string> = {
  orange_money: "Orange Money",
  wave: "Wave",
  mtn_momo: "MTN MoMo",
};

const statusLabels: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  rejected: "Rejetée",
  cancelled: "Annulée",
};

function formatAmount(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Africa/Abidjan",
  }).format(date);
}

export function SubscriptionOrdersPanel() {
  const [orders, setOrders] = useState<SubscriptionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedOrder, setSelectedOrder] =
    useState<SubscriptionOrder | null>(null);

  const [decision, setDecision] = useState<Decision | null>(null);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [processing, setProcessing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/alteract-admin/subscription-orders",
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Impossible de charger les demandes d'abonnement."
        );
      }

      const result: { orders?: SubscriptionOrder[] } =
        await response.json();

      if (!Array.isArray(result.orders)) {
        throw new Error("Réponse invalide du serveur.");
      }

      setOrders(result.orders);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erreur de chargement."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function openDecision(
    order: SubscriptionOrder,
    nextDecision: Decision
  ) {
    if (processing || order.status !== "pending") {
      return;
    }

    setSelectedOrder(order);
    setDecision(nextDecision);
    setPaymentVerified(false);
    setError("");
    setSuccess("");
  }

  function closeDecision() {
    if (processing) {
      return;
    }

    setSelectedOrder(null);
    setDecision(null);
    setPaymentVerified(false);
  }

  async function submitDecision() {
    if (
      !selectedOrder ||
      !decision ||
      processing ||
      (decision === "confirm" && !paymentVerified)
    ) {
      return;
    }

    const order = selectedOrder;
    const action = decision;

    setProcessing(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "/api/alteract-admin/subscription-orders/decide",
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order_id: order.id,
            decision: action,
          }),
        }
      );

      const result: DecisionResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ??
            "Impossible d'enregistrer la décision."
        );
      }

      setSelectedOrder(null);
      setDecision(null);
      setPaymentVerified(false);

      setSuccess(
        action === "confirm"
          ? `Commande ${order.reference} confirmée. L'abonnement a été mis à jour.`
          : `Commande ${order.reference} rejetée. L'abonnement reste inchangé.`
      );

      await refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erreur pendant le traitement."
      );
    } finally {
      setProcessing(false);
    }
  }

  const pendingCount = orders.filter(
    (order) => order.status === "pending"
  ).length;

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50">
              <CreditCard className="h-5 w-5 text-red-500" />
            </div>

            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Demandes d&apos;abonnement
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {pendingCount} demande
                {pendingCount > 1 ? "s" : ""} en attente parmi les{" "}
                {orders.length} dernières commandes chargées.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading || processing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading ? "animate-spin" : ""
              }`}
            />
            Actualiser
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {success && (
          <p
            role="status"
            className="m-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            {success}
          </p>
        )}

        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Chargement des commandes...
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {[
                    "Référence",
                    "Agence",
                    "Formule",
                    "Durée",
                    "Montant",
                    "Paiement",
                    "Statut",
                    "Date",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="border-b border-slate-200 px-4 py-4 font-bold uppercase"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-4 font-bold text-slate-900">
                      {order.reference}
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {order.agency_name}
                    </td>

                    <td className="px-4 py-4 font-bold uppercase text-slate-800">
                      {order.plan}
                    </td>

                    <td className="px-4 py-4">
                      {order.duration_months === null
                        ? "—"
                        : `${order.duration_months} mois`}
                    </td>

                    <td className="px-4 py-4 font-bold">
                      {formatAmount(order.amount_xof)} FCFA
                    </td>

                    <td className="px-4 py-4">
                      {paymentLabels[order.payment_method] ??
                        order.payment_method}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 font-bold ${
                          order.status === "pending"
                            ? "bg-amber-50 text-amber-700"
                            : order.status === "confirmed"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {statusLabels[order.status] ??
                          order.status}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                      {formatDate(order.created_at)}
                    </td>

                    <td className="px-4 py-4">
                      {order.status === "pending" ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openDecision(order, "confirm")
                            }
                            disabled={processing}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Confirmer
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openDecision(order, "reject")
                            }
                            disabled={processing}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Rejeter
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400">
                          Traitée
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {orders.length === 0 && (
              <p className="p-8 text-center text-sm text-slate-500">
                Aucune demande d&apos;abonnement enregistrée.
              </p>
            )}
          </div>
        )}

        <div className="flex items-start gap-3 border-t border-slate-100 bg-slate-50 p-5">
          <ShieldCheck className="h-5 w-5 shrink-0 text-slate-500" />

          <p className="text-xs leading-5 text-slate-600">
            Les commandes en attente ne modifient pas les abonnements.
            Toute confirmation doit être précédée d&apos;une
            vérification indépendante de la réception du paiement.
            Les décisions sont réservées au Super Administrateur
            avec MFA et enregistrées dans le journal d&apos;audit.
          </p>
        </div>
      </section>

      {selectedOrder && decision && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="subscription-decision-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  decision === "confirm"
                    ? "bg-emerald-50"
                    : "bg-red-50"
                }`}
              >
                {decision === "confirm" ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                )}
              </div>

              <div>
                <h3
                  id="subscription-decision-title"
                  className="text-lg font-extrabold text-slate-900"
                >
                  {decision === "confirm"
                    ? "Confirmer le paiement"
                    : "Rejeter la commande"}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Vérifie les informations avant de poursuivre.
                </p>
              </div>
            </div>

            <dl className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
              <div>
                <dt className="text-slate-500">Référence</dt>
                <dd className="font-bold text-slate-900">
                  {selectedOrder.reference}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500">Agence</dt>
                <dd className="font-bold text-slate-900">
                  {selectedOrder.agency_name}
                </dd>
              </div>

              <div className="flex justify-between gap-3">
                <div>
                  <dt className="text-slate-500">Formule</dt>
                  <dd className="font-bold uppercase text-slate-900">
                    {selectedOrder.plan} —{" "}
                    {selectedOrder.duration_months ?? "?"} mois
                  </dd>
                </div>

                <div className="text-right">
                  <dt className="text-slate-500">Montant</dt>
                  <dd className="font-bold text-slate-900">
                    {formatAmount(selectedOrder.amount_xof)} FCFA
                  </dd>
                </div>
              </div>

              <div>
                <dt className="text-slate-500">
                  Moyen de paiement déclaré
                </dt>
                <dd className="font-bold text-slate-900">
                  {paymentLabels[selectedOrder.payment_method] ??
                    selectedOrder.payment_method}
                </dd>
              </div>
            </dl>

            {decision === "confirm" ? (
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <input
                  type="checkbox"
                  checked={paymentVerified}
                  onChange={(event) =>
                    setPaymentVerified(event.target.checked)
                  }
                  disabled={processing}
                  className="mt-1 h-4 w-4 shrink-0"
                />

                <span>
                  <strong>
                    J&apos;atteste avoir vérifié indépendamment
                    la réception effective du paiement.
                  </strong>
                  <span className="mt-1 block text-xs">
                    La commande WhatsApp ou une capture
                    d&apos;écran ne suffit pas comme preuve.
                    Cette action activera immédiatement
                    l&apos;abonnement et sera auditée.
                  </span>
                </span>
              </label>
            ) : (
              <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                Cette action marquera la commande comme rejetée.
                Elle ne modifiera pas la formule de l&apos;agence.
              </p>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeDecision}
                disabled={processing}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={() => void submitDecision()}
                disabled={
                  processing ||
                  (decision === "confirm" && !paymentVerified)
                }
                className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                  decision === "confirm"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {processing
                  ? "Traitement..."
                  : decision === "confirm"
                    ? "Confirmer définitivement"
                    : "Rejeter définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
