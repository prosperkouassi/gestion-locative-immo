
import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/alteract-admin/server";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  // Vérification des droits Super Admin côté serveur.
  const admin = await requirePlatformAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Accès refusé" },
      { status: 403 }
    );
  }

  // L'organisation doit être explicitement sélectionnée.
  const organizationId =
    request.nextUrl.searchParams.get("organization_id");

  if (!organizationId || !UUID_REGEX.test(organizationId)) {
    return NextResponse.json(
      { error: "Identifiant d'organisation invalide" },
      { status: 400 }
    );
  }

  // Vérifier que l'organisation existe.
  const { data: organization, error: orgError } =
    await admin.db
      .from("organizations")
      .select("id,name")
      .eq("id", organizationId)
      .maybeSingle();

  if (orgError) {
    console.error(
      "Erreur de vérification de l'organisation :",
      orgError.message
    );

    return NextResponse.json(
      { error: "Erreur de vérification" },
      { status: 500 }
    );
  }

  if (!organization) {
    return NextResponse.json(
      { error: "Organisation introuvable" },
      { status: 404 }
    );
  }

  // Filtrage directement dans Supabase.
  // Aucun membre d'une autre organisation n'est renvoyé.
  const { data: members, error: membersError } =
    await admin.db
      .from("organization_members")
      .select(
        "id,organization_id,user_id,role,is_active,created_at"
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(200);

  if (membersError) {
    console.error(
      "Erreur de lecture des membres :",
      membersError.message
    );

    return NextResponse.json(
      { error: "Impossible de charger les utilisateurs" },
      { status: 500 }
    );
  }

  const users = (members ?? []).map((member) => ({
    id: member.id,
    user_id: member.user_id,
    organization_id: member.organization_id,
    organization_name: organization.name,
    role: member.role,
    is_active: member.is_active,
    created_at: member.created_at,
  }));

  return NextResponse.json(
    { users },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
