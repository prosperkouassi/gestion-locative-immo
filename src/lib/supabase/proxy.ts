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

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  /*
   * Les routes publiques doivent rester accessibles sans compte actif.
   * Les routes /auth/* sont publiques afin que les liens d'activation,
   * de confirmation et de récupération puissent établir une session.
   */
  if (isPublicPath(pathname)) {
    await supabase.auth.getClaims();
    return supabaseResponse;
  }

  /*
   * Vérifie la session Supabase et récupère l'identifiant de l'utilisateur
   * directement depuis les claims du JWT.
   */
  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  /*
   * Aucune session valide :
   * toutes les routes non publiques sont renvoyées vers /login.
   */
  if (claimsError || !userId) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";

    return NextResponse.redirect(loginUrl);
  }

  /*
   * Une session Auth valide ne suffit pas.
   * L'utilisateur doit aussi posséder un accès ACTIF dans
   * organization_members.
   *
   * Cette vérification empêche notamment un membre désactivé
   * de continuer à naviguer avec une ancienne session encore valide.
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
   * En cas d'absence d'accès actif — ou si la vérification échoue —
   * on refuse l'accès à la route protégée.
   *
   * On ne détruit pas ici la session Supabase :
   * si l'administrateur réactive le membre, son accès peut être
   * restauré sans manipulation supplémentaire de son compte Auth.
   */
  if (membershipError || !activeMembership) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("access", "disabled");

    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
