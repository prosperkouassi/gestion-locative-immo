
import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/alteract-admin/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Decision = "confirm" | "reject";

type DecisionBody = {
  order_id?: unknown;
  decision?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function isValidDecision(value: unknown): value is Decision {
  return value === "confirm" || value === "reject";
}

function getRequestOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");

  if (!origin) {
    return null;
  }

  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Protection CSRF : seules les requêtes issues de notre
    // application sont acceptées.
    const requestOrigin = getRequestOrigin(request);
    const applicationOrigin = request.nextUrl.origin;

    if (!requestOrigin || requestOrigin !== applicationOrigin) {
      return jsonError("Origine de la requête non autorisée", 403);
    }

    // requirePlatformAdmin() vérifie :
    // - la session Supabase avec getUser()
    // - le niveau MFA aal2
    // - l'appartenance au registre des Super Administrateurs.
    const admin = await requirePlatformAdmin();

    if (!admin) {
      return jsonError(
        "Accès réservé au Super Administrateur avec MFA",
        403
      );
    }

    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().includes("application/json")) {
      return jsonError("Format JSON requis", 415);
    }

    const rawBody = await request.text();

    if (rawBody.length > 4096) {
      return jsonError("Requête trop volumineuse", 413);
    }

    let body: DecisionBody;

    try {
      const parsed: unknown = JSON.parse(rawBody);

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        return jsonError("Corps de requête invalide", 400);
      }

      body = parsed as DecisionBody;
    } catch {
      return jsonError("JSON invalide", 400);
    }

    if (
      typeof body.order_id !== "string" ||
      !UUID_PATTERN.test(body.order_id)
    ) {
      return jsonError("Identifiant de commande invalide", 400);
    }

    if (!isValidDecision(body.decision)) {
      return jsonError("Décision invalide", 400);
    }

    // IMPORTANT :
    // L'identité de l'acteur provient exclusivement de la session
    // vérifiée côté serveur. Elle n'est jamais acceptée du navigateur.
    //
    // La fonction PostgreSQL effectue dans une transaction :
    // - le verrouillage des lignes concernées
    // - la vérification du statut pending
    // - la confirmation ou le rejet
    // - l'activation de l'abonnement si confirmation
    // - l'écriture du journal d'audit.
    const { data, error } = await admin.db.rpc(
      "alteract_admin_decide_subscription_order",
      {
        p_order_id: body.order_id,
        p_actor_id: admin.id,
        p_decision: body.decision,
      }
    );

    if (error) {
      console.error("Décision abonnement refusée :", {
        code: error.code,
        message: error.message,
      });

      if (error.code === "P0002") {
        return jsonError("Commande ou agence introuvable", 404);
      }

      if (error.code === "42501") {
        return jsonError("Opération non autorisée", 403);
      }

      if (
        error.code === "P0001" ||
        error.code === "40001" ||
        error.code === "23505"
      ) {
        return jsonError(
          "Impossible de traiter cette commande : elle est déjà traitée ou une règle de gestion bloque l'opération.",
          409
        );
      }

      if (error.code === "22023") {
        return jsonError(
          "Données de commande ou tarification incohérentes",
          422
        );
      }

      return jsonError(
        "La décision n'a pas pu être enregistrée",
        500
      );
    }

    return NextResponse.json(
      {
        success: true,
        result: data,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Erreur API décision abonnement Super Admin :",
      error
    );

    return jsonError("Erreur interne du serveur", 500);
  }
}
