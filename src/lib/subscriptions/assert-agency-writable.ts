import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function assertAgencyWritable(
  organizationId: string
): Promise<void> {
  if (!organizationId) {
    throw new Error("Organisation manquante.");
  }

  const admin = createAdminClient();

  const { data: client, error: clientError } = await admin
    .from("alteract_platform_clients")
    .select("id, plan, status")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (clientError || !client || client.status !== "active") {
    throw new Error("Agence inactive ou sans abonnement Alteract.");
  }

  if (client.plan === "free") {
    return;
  }

  if (client.plan !== "silver" && client.plan !== "gold") {
    throw new Error("Formule Alteract inconnue.");
  }

  const { data: subscriptions, error: subscriptionError } = await admin
    .from("alteract_subscriptions")
    .select("starts_at, expires_at, grace_ends_at")
    .eq("client_id", client.id)
    .eq("plan", client.plan)
    .in("status", ["active", "grace", "restricted"])
    .order("expires_at", { ascending: false });

  if (subscriptionError || !subscriptions) {
    throw new Error("Impossible de vérifier l'abonnement.");
  }

  const now = Date.now();

  const writable = subscriptions.some((subscription) => {
    const startsAt = Date.parse(subscription.starts_at);
    const expiresAt = Date.parse(subscription.expires_at);

    const graceEndsAt = subscription.grace_ends_at
      ? Date.parse(subscription.grace_ends_at)
      : expiresAt + 7 * 24 * 60 * 60 * 1000;

    return (
      Number.isFinite(startsAt) &&
      Number.isFinite(graceEndsAt) &&
      startsAt <= now &&
      now <= graceEndsAt
    );
  });

  if (!writable) {
    throw new Error(
      "Abonnement expire : consultation uniquement. Renouvelez votre abonnement."
    );
  }
}
