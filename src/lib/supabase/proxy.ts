import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/manifest.webmanifest",
  "/sw.js",
]);

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/auth/")
  );
}

function redirectToLogin(
  request: NextRequest,
  params?: Record<string, string>
) {
  const loginUrl = request.nextUrl.clone();

  loginUrl.pathname = "/login";
  loginUrl.search = "";

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      loginUrl.searchParams.set(key, value);
    });
  }

  return NextResponse.redirect(loginUrl);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              supabaseResponse.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  /*
   * Les routes publiques restent accessibles sans session complète.
   *
   * /login doit notamment rester accessible pendant l'étape MFA,
   * puisque l'utilisateur possède déjà une session AAL1 à ce moment-là.
   */
  if (isPublicPath(pathname)) {
    await supabase.auth.getClaims();

    return supabaseResponse;
  }

  /*
   * Vérifie cryptographiquement la session et lit directement
   * les claims du JWT Supabase.
   */
  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

  const claims = claimsData?.claims;

  const userId =
    typeof claims?.sub === "string"
      ? claims.sub
      : null;

  /*
   * Supabase encode le niveau d'assurance MFA directement
   * dans le claim "aal" du JWT :
   *
   * aal1 = premier facteur uniquement
   * aal2 = MFA validé
   *
   * Les anciens JWT dépourvus du claim aal sont traités
   * comme AAL1 par sécurité.
   */
  const aal =
    claims &&
    "aal" in claims &&
    claims.aal === "aal2"
      ? "aal2"
      : "aal1";

  /*
   * Aucune session valide.
   */
  if (claimsError || !userId) {
    return redirectToLogin(request);
  }

  /*
   * ================================================================
   * PROTECTION MFA
   * ================================================================
   *
   * Si la session est déjà AAL2, le second facteur a été validé.
   *
   * Si elle est AAL1, on vérifie si le compte possède un facteur
   * MFA TOTP vérifié.
   *
   * Un compte ayant un facteur vérifié ne peut pas accéder aux
   * routes protégées tant que son JWT n'est pas passé en AAL2.
   */
  if (aal !== "aal2") {
    const {
      data: factorsData,
      error: factorsError,
    } = await supabase.auth.mfa.listFactors();

    if (factorsError) {
      return redirectToLogin(request, {
        access: "mfa-check-failed",
      });
    }

    const hasVerifiedTotp =
      factorsData.totp?.some(
        (factor) =>
          factor.status === "verified"
      ) ?? false;

    if (hasVerifiedTotp) {
      return redirectToLogin(request, {
        mfa: "required",
      });
    }
  }

  /*
   * La session Auth ne suffit pas :
   * il faut également une adhésion active à une organisation.
   */
  const {
    data: activeMembership,
    error: membershipError,
  } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  /*
   * Refus d'accès si le membre n'est pas actif.
   */
  if (membershipError || !activeMembership) {
    return redirectToLogin(request, {
      access: "disabled",
    });
  }

  return supabaseResponse;
}