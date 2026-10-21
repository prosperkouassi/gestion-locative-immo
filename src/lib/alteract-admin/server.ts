
import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Client Supabase privilégié.
 *
 * IMPORTANT :
 * - Utilisation exclusivement côté serveur.
 * - Ne jamais exposer ce client au navigateur.
 * - Les opérations utilisant ce client contournent les RLS.
 * - Chaque opération doit vérifier les autorisations.
 */
export function serviceClient() {
  return createAdminClient();
}

/**
 * Vérifie que l'utilisateur courant possède
 * les autorisations Super Admin Alteract.
 *
 * Conditions obligatoires :
 * 1. Utilisateur authentifié par Supabase Auth.
 * 2. Session MFA au niveau aal2.
 * 3. Utilisateur inscrit dans alteract_platform_admins.
 *
 * Retourne null si une condition échoue.
 */
export async function requirePlatformAdmin() {
  // 1. Créer le client Supabase lié à la session.
  const supabase = await createClient();

  // 2. Vérifier l'identité auprès de Supabase Auth.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  // 3. Vérifier le niveau MFA de la session actuelle.
  const { data: aalData, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (
    aalError ||
    !aalData ||
    aalData.currentLevel !== "aal2"
  ) {
    return null;
  }

  // 4. Créer le client privilégié uniquement
  // après validation de l'identité et du MFA.
  const db = serviceClient();

  // 5. Vérifier l'appartenance au registre Super Admin.
  const { data: admin, error: roleError } = await db
    .from("alteract_platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleError || !admin) {
    return null;
  }

  // 6. Retourner le contexte autorisé.
  return {
    id: user.id,
    db,
  };
}
