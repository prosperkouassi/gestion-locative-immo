
import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Crée un client Supabase disposant des privilèges
 * de service_role.
 *
 * ATTENTION :
 * Ce client contourne les politiques RLS.
 * Il doit être utilisé exclusivement côté serveur,
 * après une vérification explicite des autorisations.
 */
export function createAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const secretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "La variable NEXT_PUBLIC_SUPABASE_URL est manquante."
    );
  }

  if (!secretKey) {
    throw new Error(
      "La variable SUPABASE_SERVICE_ROLE_KEY est manquante."
    );
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
