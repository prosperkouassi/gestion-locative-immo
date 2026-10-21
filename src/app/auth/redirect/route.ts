
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function redirectTo(
  request: Request,
  path: string
) {
  return NextResponse.redirect(
    new URL(path, request.url),
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(request: Request) {
  const supabase = await createClient();

  // 1. Vérifier l'utilisateur authentifié.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return redirectTo(
      request,
      "/login?access=unauthenticated"
    );
  }

  // 2. Vérifier le rôle Super Admin côté serveur.
  // Le client privilégié ne doit jamais être
  // exposé au navigateur.
  const adminDb = createAdminClient();

  const {
    data: platformAdmin,
    error: platformError,
  } = await adminDb
    .from("alteract_platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (platformError) {
    console.error(
      "Erreur vérification Super Admin :",
      platformError.message
    );

    return redirectTo(
      request,
      "/login?access=check-failed"
    );
  }

  // 3. Un Super Admin doit obligatoirement
  // avoir validé le second facteur MFA.
  if (platformAdmin) {
    const {
      data: aalData,
      error: aalError,
    } =
      await supabase.auth.mfa
        .getAuthenticatorAssuranceLevel();

    if (
      aalError ||
      aalData?.currentLevel !== "aal2"
    ) {
      return redirectTo(
        request,
        "/login?mfa=required"
      );
    }

    return redirectTo(
      request,
      "/alteract-admin"
    );
  }

  // 4. Pour les autres utilisateurs,
  // vérifier une adhésion active à une agence.
  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error(
      "Erreur vérification adhésion :",
      membershipError.message
    );

    return redirectTo(
      request,
      "/login?access=check-failed"
    );
  }

  if (!membership) {
    return redirectTo(
      request,
      "/login?access=disabled"
    );
  }

  // 5. Le proxy et les fonctions métier
  // continueront à vérifier les autorisations.
  return redirectTo(
    request,
    "/dashboard"
  );
}
