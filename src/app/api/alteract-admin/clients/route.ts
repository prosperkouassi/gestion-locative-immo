
import {
  NextRequest,
  NextResponse,
} from "next/server";

import { requirePlatformAdmin } from "@/lib/alteract-admin/server";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_KINDS = [
  "agency",
  "landlord",
  "company",
] as const;

// Correction TS2552 : ALLOWED_KINDS
type ClientKind = (typeof ALLOWED_KINDS)[number];

type ClientUsage = {
  organization_id: string;
  logements_utilises: number;
  collaborateurs_actifs: number;
};

function isClientKind(value: unknown): value is ClientKind {
  return (
    typeof value === "string" &&
    ALLOWED_KINDS.some((kind) => kind === value)
  );
}

/**
 * GET : récupérer les organisations clientes,
 * leurs abonnements et leur consommation de quotas.
 *
 * Accès réservé aux Super Admins Alteract.
 */
export async function GET() {
  const admin = await requirePlatformAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Accès refusé" },
      { status: 403 }
    );
  }

  // 1. Charger les organisations.
  const { data: organizations, error: orgError } =
    await admin.db
      .from("organizations")
      .select("id,name,email,status,created_at")
      .order("created_at", { ascending: false })
      .limit(200);

  if (orgError) {
    console.error(
      "Erreur chargement organisations :",
      orgError.message
    );

    return NextResponse.json(
      { error: "Impossible de charger les organisations" },
      { status: 500 }
    );
  }

  // 2. Charger le registre des clients Alteract.
  const { data: clients, error: clientError } =
    await admin.db
      .from("alteract_platform_clients")
      .select(
        "id,organization_id,name,contact_email,kind,status,plan,created_at"
      )
      .limit(1000);

  if (clientError) {
    console.error(
      "Erreur chargement clients :",
      clientError.message
    );

    return NextResponse.json(
      { error: "Impossible de charger les clients" },
      { status: 500 }
    );
  }

  // 3. Charger les compteurs réels depuis Supabase.
  // Cette RPC est réservée au service_role.
  const { data: usageData, error: usageError } =
    await admin.db.rpc("alteract_admin_client_usage");

  if (usageError) {
    console.error(
      "Erreur chargement quotas Alteract :",
      usageError.message
    );

    return NextResponse.json(
      {
        error:
          "Impossible de charger les statistiques des quotas",
      },
      { status: 500 }
    );
  }

  // 4. Indexer les clients par organisation.
  const clientMap = new Map(
    (clients ?? [])
      .filter((client) => client.organization_id !== null)
      .map((client) => [
        client.organization_id,
        client,
      ])
  );

  // 5. Indexer les statistiques par organisation.
  const usageMap = new Map<string, ClientUsage>(
    ((usageData ?? []) as ClientUsage[]).map((usage) => [
      usage.organization_id,
      usage,
    ])
  );

  // 6. Construire la réponse de l'API.
  const result = (organizations ?? []).map((organization) => {
    const client = clientMap.get(organization.id);
    const usage = usageMap.get(organization.id);

    return {
      id: client?.id ?? null,
      organization_id: organization.id,
      name: organization.name,
      contact_email: organization.email,
      kind: client?.kind ?? "agency",
      status: organization.status,
      is_active: organization.status === "ACTIVE",
      plan: client?.plan ?? "free",
      linked: Boolean(client),
      created_at: organization.created_at,

      // Nouveaux compteurs.
      logements_utilises: Number(
        usage?.logements_utilises ?? 0
      ),
      collaborateurs_actifs: Number(
        usage?.collaborateurs_actifs ?? 0
      ),
    };
  });

  return NextResponse.json(
    { clients: result },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

/**
 * POST : rattacher une organisation existante
 * au registre Super Admin Alteract.
 *
 * La création et l'audit sont exécutés
 * dans une seule transaction PostgreSQL.
 */
export async function POST(request: NextRequest) {
  const admin = await requirePlatformAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Accès refusé" },
      { status: 403 }
    );
  }

  // Vérifier l'origine des requêtes navigateur.
  const origin = request.headers.get("origin");

  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json(
      { error: "Origine non autorisée" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);

  const organizationId = body?.organization_id;
  const kind: unknown = body?.kind ?? "agency";

  if (
    typeof organizationId !== "string" ||
    !UUID_REGEX.test(organizationId) ||
    !isClientKind(kind)
  ) {
    return NextResponse.json(
      { error: "Données invalides" },
      { status: 400 }
    );
  }

  // RPC sécurisée :
  // rattachement + journal d'audit.
  const { data: client, error } = await admin.db.rpc(
    "alteract_link_platform_client",
    {
      p_organization_id: organizationId,
      p_kind: kind,
      p_actor_id: admin.id,
    }
  );

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        {
          error:
            "Cette organisation est déjà rattachée",
        },
        { status: 409 }
      );
    }

    if (error.code === "P0002") {
      return NextResponse.json(
        { error: "Organisation introuvable" },
        { status: 404 }
      );
    }

    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }

    console.error(
      "Erreur rattachement Super Admin :",
      error.message
    );

    return NextResponse.json(
      {
        error:
          "Impossible de rattacher l'organisation",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { client },
    {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
