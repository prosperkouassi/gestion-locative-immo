
import "server-only";

import { NextResponse } from "next/server";
import { requireActiveMembership } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Plan = "silver" | "gold";
type Duration = 3 | 6 | 12;

type PaymentMethod =
  | "orange_money"
  | "wave"
  | "mtn_momo";

type OrderRequest = {
  plan?: unknown;
  duration_months?: unknown;
  payment_method?: unknown;
  idempotency_key?: unknown;
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  orange_money: "Orange Money",
  wave: "Wave",
  mtn_momo: "MTN MoMo",
};

function isPlan(value: unknown): value is Plan {
  return value === "silver" || value === "gold";
}

function isDuration(value: unknown): value is Duration {
  return value === 3 || value === 6 || value === 12;
}

function isPaymentMethod(
  value: unknown
): value is PaymentMethod {
  return (
    value === "orange_money" ||
    value === "wave" ||
    value === "mtn_momo"
  );
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

function createReference() {
  return `ALT-${crypto
    .randomUUID()
    .replaceAll("-", "")
    .slice(0, 20)
    .toUpperCase()}`;
}

function checkRequestOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");

  // Les appels POST du formulaire navigateur doivent
  // transmettre une origine explicite.
  if (!origin) {
    return false;
  }

  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);

    // Même origine : protocole + domaine + port.
    return originUrl.origin === requestUrl.origin;
  } catch {
    return false;
  }
}

function getWhatsappNumber(): string {
  const raw =
    process.env.ALTERACT_BILLING_WHATSAPP_NUMBER ??
    "2250501688181";

  const number = raw.replace(/\D/g, "");

  if (!/^\d{8,15}$/.test(number)) {
    throw new Error("Numéro WhatsApp invalide.");
  }

  return number;
}

function buildWhatsappUrl(params: {
  reference: string;
  plan: Plan;
  duration: Duration;
  amount: number;
  paymentMethod: PaymentMethod;
}): string {
  const formattedAmount = new Intl.NumberFormat(
    "fr-FR"
  ).format(params.amount);

  const message = [
    "Bonjour Alteract,",
    "",
    "Je souhaite souscrire à un abonnement.",
    "",
    `Référence : ${params.reference}`,
    `Formule : ${params.plan.toUpperCase()}`,
    `Durée : ${params.duration} mois`,
    `Montant : ${formattedAmount} FCFA`,
    `Moyen de paiement : ${
      PAYMENT_LABELS[params.paymentMethod]
    }`,
    "",
    "Merci de m'indiquer la procédure de paiement.",
  ].join("\n");

  return (
    `https://wa.me/${getWhatsappNumber()}` +
    `?text=${encodeURIComponent(message)}`
  );
}

export async function POST(request: Request) {
  try {
    // 1. Protection contre les requêtes intersites.
    if (!checkRequestOrigin(request)) {
      return errorResponse(
        "Origine de la requête non autorisée.",
        403
      );
    }

    const contentType =
      request.headers.get("content-type") ?? "";

    if (
      !contentType
        .toLowerCase()
        .includes("application/json")
    ) {
      return errorResponse(
        "Le contenu doit être au format JSON.",
        415
      );
    }

    // 2. Vérifier l'administrateur de l'agence.
    const { membership } =
      await requireActiveMembership();

    if (membership.role !== "ADMIN_AGENCY") {
      return errorResponse(
        "Accès réservé à l'administrateur d'agence.",
        403
      );
    }

    const organizationId = membership.organization_id;

    if (!organizationId) {
      return errorResponse(
        "Aucune agence associée à cet utilisateur.",
        403
      );
    }

    // 3. Valider les données.
    let body: OrderRequest;

    try {
      const parsed: unknown = await request.json();

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return errorResponse(
          "Données de souscription invalides.",
          400
        );
      }

      body = parsed as OrderRequest;
    } catch {
      return errorResponse(
        "Requête JSON invalide.",
        400
      );
    }

    const {
      plan,
      duration_months,
      payment_method,
      idempotency_key,
    } = body;

    if (
      !isPlan(plan) ||
      !isDuration(duration_months) ||
      !isPaymentMethod(payment_method)
    ) {
      return errorResponse(
        "Formule, durée ou moyen de paiement invalide.",
        400
      );
    }

    if (!isUuid(idempotency_key)) {
      return errorResponse(
        "Identifiant de demande invalide.",
        400
      );
    }

    const admin = createAdminClient();

    // 4. Retrouver le client de l'agence.
    const { data: client, error: clientError } =
      await admin
        .from("alteract_platform_clients")
        .select("id")
        .eq("organization_id", organizationId)
        .maybeSingle();

    if (clientError) {
      console.error(
        "Erreur recherche client :",
        clientError
      );

      return errorResponse(
        "Impossible de vérifier le dossier client.",
        500
      );
    }

    if (!client) {
      return errorResponse(
        "Aucun dossier client trouvé pour cette agence.",
        404
      );
    }

    // 5. Lire le prix officiel.
    const { data: price, error: priceError } =
      await admin
        .from("alteract_subscription_prices")
        .select("id, amount_xof")
        .eq("plan", plan)
        .eq("duration_months", duration_months)
        .eq("is_active", true)
        .maybeSingle();

    if (priceError || !price) {
      return errorResponse(
        "Tarif indisponible.",
        404
      );
    }

    if (
      !Number.isSafeInteger(price.amount_xof) ||
      price.amount_xof <= 0
    ) {
      return errorResponse(
        "Montant officiel invalide.",
        500
      );
    }

    // 6. Préparer WhatsApp avant toute écriture.
    getWhatsappNumber();

    // 7. Vérifier si cette demande existe déjà.
    const { data: existing, error: existingError } =
      await admin
        .from("alteract_subscription_orders")
        .select(
          "id, reference, price_id, amount_xof, payment_method, status"
        )
        .eq("client_id", client.id)
        .eq("idempotency_key", idempotency_key)
        .maybeSingle();

    if (existingError) {
      console.error(
        "Erreur vérification doublon :",
        existingError
      );

      return errorResponse(
        "Impossible de vérifier la demande.",
        500
      );
    }

    if (existing) {
      if (
        existing.price_id !== price.id ||
        existing.payment_method !== payment_method
      ) {
        return errorResponse(
          "Cet identifiant a déjà été utilisé pour une autre demande.",
          409
        );
      }

      return NextResponse.json({
        success: true,
        reused: true,
        order: existing,
        whatsapp_url: buildWhatsappUrl({
          reference: existing.reference,
          plan,
          duration: duration_months,
          amount: existing.amount_xof,
          paymentMethod: payment_method,
        }),
      });
    }

    // 8. Créer une commande en attente.
    const { data: inserted, error: insertError } =
      await admin
        .from("alteract_subscription_orders")
        .insert({
          client_id: client.id,
          price_id: price.id,
          payment_method,
          amount_xof: price.amount_xof,
          status: "pending",
          reference: createReference(),
          idempotency_key,
        })
        .select(
          "id, reference, price_id, amount_xof, payment_method, status"
        )
        .single();

    if (insertError || !inserted) {
      // Une requête concurrente peut avoir créé
      // la commande entre le SELECT et l'INSERT.
      if (insertError?.code === "23505") {
        const { data: concurrentOrder } = await admin
          .from("alteract_subscription_orders")
          .select(
            "id, reference, price_id, amount_xof, payment_method, status"
          )
          .eq("client_id", client.id)
          .eq("idempotency_key", idempotency_key)
          .maybeSingle();

        if (
          concurrentOrder &&
          concurrentOrder.price_id === price.id &&
          concurrentOrder.payment_method ===
            payment_method
        ) {
          return NextResponse.json({
            success: true,
            reused: true,
            order: concurrentOrder,
            whatsapp_url: buildWhatsappUrl({
              reference: concurrentOrder.reference,
              plan,
              duration: duration_months,
              amount: concurrentOrder.amount_xof,
              paymentMethod: payment_method,
            }),
          });
        }
      }

      console.error(
        "Erreur création commande :",
        insertError
      );

      return errorResponse(
        "Impossible de créer la commande.",
        500
      );
    }

    // 9. Retourner le lien WhatsApp.
    // Aucun paiement n'est validé ici.
    return NextResponse.json(
      {
        success: true,
        reused: false,
        order: inserted,
        whatsapp_url: buildWhatsappUrl({
          reference: inserted.reference,
          plan,
          duration: duration_months,
          amount: inserted.amount_xof,
          paymentMethod: payment_method,
        }),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Erreur API souscription :",
      error
    );

    return errorResponse(
      "Impossible de traiter la demande de souscription.",
      500
    );
  }
}
