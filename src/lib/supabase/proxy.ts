
import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

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

function isApiPath(pathname: string) {
  return (
    pathname === "/api" ||
    pathname.startsWith("/api/")
  );
}

function isPlatformAdminPath(pathname: string) {
  return (
    pathname === "/alteract-admin" ||
    pathname.startsWith("/alteract-admin/") ||
    pathname === "/api/alteract-admin" ||
    pathname.startsWith("/api/alteract-admin/")
  );
}

/**
 * Refuse l'accès :
 * - API : réponse JSON avec code HTTP.
 * - Page : redirection vers /login.
 */
function denyAccess(
  request: NextRequest,
  status: 401 | 403,
  params?: Record<string, string>
) {
  if (isApiPath(request.nextUrl.pathname)) {
    return NextResponse.json(
      {
        error:
          status === 401
            ? "Authentification requise"
            : "Accès refusé",
      },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const loginUrl = request.nextUrl.clone();

  loginUrl.pathname = "/login";
  loginUrl.search = "";

  if (params) {
    Object.entries(params).forEach(
      ([key, value]) => {
        loginUrl.searchParams.set(key, value);
      }
    );
  }

  return NextResponse.redirect(loginUrl);
}

/**
 * Actualise la session Supabase et contrôle
 * les accès aux routes privées.
 */
export async function updateSession(
  request: NextRequest
) {
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
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(name, value);
            }
          );

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
   * 1. ROUTES PUBLIQUES
   *
   * /login reste accessible pendant
   * l'authentification MFA.
   */
  if (isPublicPath(pathname)) {
    await supabase.auth.getClaims();

    return supabaseResponse;
  }

  /*
   * 2. VÉRIFICATION DE LA SESSION
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

  if (claimsError || !userId) {
    return denyAccess(request, 401);
  }

  /*
   * 3. NIVEAU MFA
   *
   * aal1 : premier facteur.
   * aal2 : deuxième facteur validé.
   */
  const aal =
    claims?.aal === "aal2"
      ? "aal2"
      : "aal1";

  /*
   * 4. ROUTES SUPER ADMIN
   *
   * Le Super Admin n'a pas besoin
   * d'être membre d'une organisation.
   *
   * Son rôle plateforme est vérifié
   * dans requirePlatformAdmin().
   */
  if (isPlatformAdminPath(pathname)) {
    if (aal !== "aal2") {
      return denyAccess(request, 403, {
        mfa: "required",
      });
    }

    return supabaseResponse;
  }

  /*
   * 5. MFA DES UTILISATEURS D'AGENCE
   *
   * On conserve la logique actuelle :
   * si un facteur TOTP vérifié existe,
   * le niveau aal2 est obligatoire.
   */
  if (aal !== "aal2") {
    const {
      data: factorsData,
      error: factorsError,
    } = await supabase.auth.mfa.listFactors();

    if (factorsError) {
      return denyAccess(request, 403, {
        access: "mfa-check-failed",
      });
    }

    const hasVerifiedTotp =
      factorsData.totp?.some(
        (factor) =>
          factor.status === "verified"
      ) ?? false;

    if (hasVerifiedTotp) {
      return denyAccess(request, 403, {
        mfa: "required",
      });
    }
  }

  /*
   * 6. ADHÉSION ACTIVE À UNE AGENCE
   *
   * Cette vérification ne concerne
   * pas les routes Super Admin.
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

  if (membershipError || !activeMembership) {
    return denyAccess(request, 403, {
      access: "disabled",
    });
  }

  return supabaseResponse;
}
