import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/alteract-admin/server";

export const dynamic = "force-dynamic";

/**
 * Changement manuel de formule temporairement désactivé.
 *
 * Les abonnements SILVER et GOLD sont activés par le circuit
 * de confirmation des paiements.
 *
 * Cette route reste protégée par l'authentification Super Admin
 * et la vérification MFA aal2 de requirePlatformAdmin().
 */
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
        "Le changement manuel de formule est temporairement désactivé.",
    },
    {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
