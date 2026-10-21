
import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/alteract-admin/server";

export async function PATCH() {
  const admin = await requirePlatformAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Accès refusé" },
      { status: 403 }
    );
  }

  return NextResponse.json(
    {
      error:
        "La suspension est temporairement désactivée. " +
        "Les protections RLS et les contrôles d'accès " +
        "doivent être finalisés avant son activation.",
    },
    { status: 409 }
  );
}
