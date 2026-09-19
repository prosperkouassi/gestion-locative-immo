import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            /*
             * setAll peut être appelé depuis un Server Component.
             * Dans ce contexte, l'écriture des cookies peut être impossible.
             * Le Proxy d'authentification que nous ajouterons ensuite
             * se chargera du rafraîchissement de session.
             */
          }
        },
      },
    }
  );
}