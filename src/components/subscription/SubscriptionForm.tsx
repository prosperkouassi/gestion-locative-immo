
"use client";

import { useRef, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

type Plan = "silver" | "gold";
type Duration = 3 | 6 | 12;

type PaymentMethod =
  | "orange_money"
  | "wave"
  | "mtn_momo";

type Price = {
  duration_months: number;
  amount_xof: number;
};

type Props = {
  plan: Plan;
  prices: Price[];
  disabled?: boolean;
};

type ApiResponse = {
  success?: boolean;
  error?: string;
  whatsapp_url?: string;
  order?: {
    reference: string;
    status: string;
  };
};

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
}[] = [
  { value: "orange_money", label: "Orange Money" },
  { value: "wave", label: "Wave" },
  { value: "mtn_momo", label: "MTN MoMo" },
];

function formatAmount(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default function SubscriptionForm({
  plan,
  prices,
  disabled = false,
}: Props) {
  const [duration, setDuration] = useState<Duration>(12);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("wave");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");

  // Une même tentative conserve la même clé,
  // y compris en cas de nouvelle tentative réseau.
  const idempotencyKeyRef = useRef<string | null>(null);

  const selectedPrice = prices.find(
    (price) => price.duration_months === duration
  );

  function resetAttempt() {
    idempotencyKeyRef.current = null;
    setError("");
    setReference("");
    setWhatsappUrl("");
  }

  async function handleSubmit() {
    if (loading || disabled || !selectedPrice) {
      return;
    }

    setLoading(true);
    setError("");

    // Ouverture immédiate pendant le clic utilisateur :
    // cela limite les blocages de fenêtres après le fetch.
    const whatsappWindow = window.open(
      "",
      "_blank"
    );

    try {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = crypto.randomUUID();
      }

      const response = await fetch(
        "/api/subscription/orders",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan,
            duration_months: duration,
            payment_method: paymentMethod,
            idempotency_key:
              idempotencyKeyRef.current,
          }),
        }
      );

      const result =
        (await response.json()) as ApiResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.whatsapp_url ||
        !result.order?.reference
      ) {
        throw new Error(
          result.error ??
            "Impossible de créer la demande."
        );
      }

      // Ne jamais accepter une URL arbitraire
      // comme destination de redirection.
      const destination = new URL(
        result.whatsapp_url
      );

      if (
        destination.protocol !== "https:" ||
        destination.hostname !== "wa.me"
      ) {
        throw new Error(
          "Lien WhatsApp invalide."
        );
      }

      setReference(result.order.reference);
      setWhatsappUrl(destination.toString());

      if (whatsappWindow && !whatsappWindow.closed) {
        whatsappWindow.location.href =
          destination.toString();
      }
    } catch (caught) {
      if (whatsappWindow && !whatsappWindow.closed) {
        whatsappWindow.close();
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor={`duration-${plan}`}
          className="mb-2 block text-xs font-bold text-slate-700"
        >
          Durée souhaitée
        </label>

        <select
          id={`duration-${plan}`}
          value={duration}
          disabled={loading || disabled}
          onChange={(event) => {
            setDuration(
              Number(event.target.value) as Duration
            );
            resetAttempt();
          }}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"
        >
          <option value={3}>3 mois</option>
          <option value={6}>6 mois</option>
          <option value={12}>12 mois</option>
        </select>
      </div>

      <div>
        <label
          htmlFor={`payment-${plan}`}
          className="mb-2 block text-xs font-bold text-slate-700"
        >
          Moyen de paiement
        </label>

        <select
          id={`payment-${plan}`}
          value={paymentMethod}
          disabled={loading || disabled}
          onChange={(event) => {
            setPaymentMethod(
              event.target.value as PaymentMethod
            );
            resetAttempt();
          }}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"
        >
          {PAYMENT_METHODS.map((method) => (
            <option
              key={method.value}
              value={method.value}
            >
              {method.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-red-100 bg-red-50 p-4">
        <p className="text-xs font-semibold text-red-700">
          Montant de la demande
        </p>

        <p className="mt-1 text-xl font-extrabold text-slate-900">
          {selectedPrice
            ? `${formatAmount(
                selectedPrice.amount_xof
              )} FCFA`
            : "Tarif indisponible"}
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"
        >
          {error}
        </p>
      )}

      {reference && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3"
        >
          <p className="text-xs font-bold text-amber-900">
            Demande enregistrée
          </p>

          <p className="mt-1 break-all text-xs text-amber-800">
            Référence : {reference}
          </p>

          <p className="mt-2 text-xs text-amber-800">
            Paiement en attente de vérification.
          </p>

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-red-600 underline"
            >
              Ouvrir WhatsApp
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={
          loading ||
          disabled ||
          !selectedPrice
        }
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-4 text-sm font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enregistrement...
          </>
        ) : reference ? (
          <>
            <ExternalLink className="h-4 w-4" />
            Rouvrir la demande WhatsApp
          </>
        ) : (
          <>
            <ExternalLink className="h-4 w-4" />
            Demander cet abonnement
          </>
        )}
      </button>

      <p className="text-center text-xs leading-5 text-slate-500">
        La demande sera enregistrée avant
        l'ouverture de WhatsApp. Le paiement
        et l'activation restent soumis à
        vérification par Alteract.
      </p>
    </div>
  );
}
