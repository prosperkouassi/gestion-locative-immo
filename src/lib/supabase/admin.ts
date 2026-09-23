import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    },
  });
}