-- Alteract Gestion Locative — confirmation/rejet atomique des commandes.
-- IMPORTANT : installer uniquement après revue en environnement de test.
-- Cette fonction ne prouve PAS la réception du paiement : vérification humaine préalable obligatoire.
-- L'API Next.js doit appeler requirePlatformAdmin() (getUser + MFA aal2 + registre admin)
-- et transmettre admin.id, JAMAIS un actor_id fourni par le navigateur.
-- Le service_role contourne RLS : ne jamais exposer sa clé côté client.

BEGIN;

CREATE OR REPLACE FUNCTION public.alteract_admin_decide_subscription_order(
  p_order_id uuid,
  p_actor_id uuid,
  p_decision text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_order public.alteract_subscription_orders%ROWTYPE;
  v_client public.alteract_platform_clients%ROWTYPE;
  v_price public.alteract_subscription_prices%ROWTYPE;
  v_current public.alteract_subscriptions%ROWTYPE;
  v_organization_status text;
  v_now timestamptz;
  v_start timestamptz;
  v_base_expiry timestamptz;
  v_expiry timestamptz;
  v_subscription_id uuid;
  v_previous_plan text;
  v_renewal boolean := false;
BEGIN
  IF p_order_id IS NULL OR p_actor_id IS NULL
     OR p_decision IS NULL OR p_decision NOT IN ('confirm', 'reject') THEN
    RAISE EXCEPTION 'Parametres invalides' USING ERRCODE = '22023';
  END IF;

  -- Vérifie le rôle JWT transmis à PostgREST ; ne remplace PAS le contrôle MFA de l'API.
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Acces reserve au service serveur' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.alteract_platform_admins a WHERE a.user_id = p_actor_id
  ) THEN
    RAISE EXCEPTION 'Administrateur non autorise' USING ERRCODE = '42501';
  END IF;

  -- Verrouillage dans un ordre stable : client, puis commande.
  SELECT o.client_id INTO v_order.client_id
  FROM public.alteract_subscription_orders o
  WHERE o.id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_client
  FROM public.alteract_platform_clients c
  WHERE c.id = v_order.client_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agence introuvable' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_order
  FROM public.alteract_subscription_orders o
  WHERE o.id = p_order_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable' USING ERRCODE = 'P0002';
  END IF;
  IF v_order.client_id IS DISTINCT FROM v_client.id THEN
    RAISE EXCEPTION 'Agence de commande incoherente' USING ERRCODE = '40001';
  END IF;
  IF v_order.status <> 'pending' THEN
    RAISE EXCEPTION 'Commande deja traitee' USING ERRCODE = 'P0001';
  END IF;

  v_now := transaction_timestamp();
  v_previous_plan := v_client.plan;

  IF p_decision = 'reject' THEN
    UPDATE public.alteract_subscription_orders
    SET status = 'rejected'
    WHERE id = p_order_id AND status = 'pending';

    INSERT INTO public.alteract_platform_audit(actor_id, action, target_id, details)
    VALUES (
      p_actor_id, 'subscription_order_rejected', p_order_id,
      pg_catalog.jsonb_build_object(
        'order_id', p_order_id, 'reference', v_order.reference,
        'client_id', v_client.id, 'previous_plan', v_previous_plan
      )
    );
    RETURN pg_catalog.jsonb_build_object('order_id', p_order_id, 'status', 'rejected');
  END IF;

  SELECT * INTO v_price
  FROM public.alteract_subscription_prices p
  WHERE p.id = v_order.price_id;
  IF NOT FOUND OR v_price.plan NOT IN ('silver', 'gold')
     OR v_price.duration_months NOT IN (3, 6, 12)
     OR v_price.amount_xof IS DISTINCT FROM v_order.amount_xof THEN
    RAISE EXCEPTION 'Tarification de commande incoherente' USING ERRCODE = '22023';
  END IF;

  IF v_client.status <> 'active' OR v_client.organization_id IS NULL THEN
    RAISE EXCEPTION 'Client inactif ou sans organisation' USING ERRCODE = 'P0001';
  END IF;

  -- Verifie que l'organisation de gestion locative existe et est active.
  SELECT o.status INTO v_organization_status
  FROM public.organizations o
  WHERE o.id = v_client.organization_id;
  IF NOT FOUND OR v_organization_status IS DISTINCT FROM 'ACTIVE' THEN
    RAISE EXCEPTION 'Organisation suspendue, archivee ou introuvable' USING ERRCODE = 'P0001';
  END IF;

  -- Par prudence, le déclassement Gold -> Silver est interdit ici tant que
  -- le contrôle des quotas côté PostgreSQL n'a pas été intégré et testé.
  -- Ne pas contourner ce contrôle par une simple comparaison des compteurs UI.
  IF v_client.plan = 'gold' AND v_price.plan = 'silver' THEN
    RAISE EXCEPTION 'Passage Gold vers Silver non autorise par cette procedure : verification des quotas requise'
      USING ERRCODE = 'P0001';
  END IF;

  -- Recherche du droit courant ; la mise à jour ci-dessous clôturera TOUS les
  -- droits actifs/grâce/restreints pour éviter deux abonnements simultanés.
  SELECT * INTO v_current
  FROM public.alteract_subscriptions s
  WHERE s.client_id = v_client.id
    AND s.status IN ('active', 'grace', 'restricted')
  ORDER BY s.expires_at DESC, s.created_at DESC
  LIMIT 1 FOR UPDATE;

  v_start := v_now;
  v_base_expiry := v_now;
  IF FOUND AND v_current.plan = v_price.plan AND v_current.expires_at > v_now THEN
    v_base_expiry := v_current.expires_at;
    v_renewal := true;
  END IF;
  v_expiry := v_base_expiry + pg_catalog.make_interval(months => v_price.duration_months);

  UPDATE public.alteract_subscriptions
  SET status = 'cancelled', updated_at = v_now
  WHERE client_id = v_client.id AND status IN ('active', 'grace', 'restricted');

  INSERT INTO public.alteract_subscriptions (
    client_id, plan, duration_months, starts_at, expires_at,
    grace_ends_at, status, last_order_id
  ) VALUES (
    v_client.id, v_price.plan, v_price.duration_months, v_start,
    v_expiry, v_expiry + interval '7 days', 'active', p_order_id
  ) RETURNING id INTO v_subscription_id;

  UPDATE public.alteract_platform_clients
  SET plan = v_price.plan, updated_at = v_now
  WHERE id = v_client.id;

  UPDATE public.alteract_subscription_orders
  SET status = 'confirmed', confirmed_at = v_now, confirmed_by = p_actor_id
  WHERE id = p_order_id AND status = 'pending';

  INSERT INTO public.alteract_platform_audit(actor_id, action, target_id, details)
  VALUES (
    p_actor_id, 'subscription_order_confirmed', p_order_id,
    pg_catalog.jsonb_build_object(
      'order_id', p_order_id, 'reference', v_order.reference,
      'client_id', v_client.id, 'subscription_id', v_subscription_id,
      'previous_plan', v_previous_plan, 'new_plan', v_price.plan,
      'amount_xof', v_order.amount_xof, 'duration_months', v_price.duration_months,
      'starts_at', v_start, 'expires_at', v_expiry,
      'renewal_same_plan', v_renewal,
      'carried_forward_until', CASE WHEN v_renewal THEN v_base_expiry ELSE NULL END
    )
  );

  RETURN pg_catalog.jsonb_build_object(
    'order_id', p_order_id, 'status', 'confirmed',
    'subscription_id', v_subscription_id, 'plan', v_price.plan,
    'starts_at', v_start, 'expires_at', v_expiry
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.alteract_admin_decide_subscription_order(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.alteract_admin_decide_subscription_order(uuid, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.alteract_admin_decide_subscription_order(uuid, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.alteract_admin_decide_subscription_order(uuid, uuid, text) TO service_role;

COMMIT;
