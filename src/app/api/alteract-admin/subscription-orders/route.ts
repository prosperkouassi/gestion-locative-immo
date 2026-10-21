
import "server-only";

import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/alteract-admin/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ClientRow = {
  id: string;
  name: string;
};

type PriceRow = {
  id: string;
  plan: string;
  duration_months: number;
};

export async function GET() {
  try {
    const admin = await requirePlatformAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }

    const { data: orders, error: ordersError } =
      await admin.db
        .from("alteract_subscription_orders")
        .select(
          "id,client_id,price_id,reference,payment_method,amount_xof,status,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(100);

    if (ordersError) {
      console.error(
        "Erreur chargement commandes :",
        ordersError.message
      );

      return NextResponse.json(
        { error: "Impossible de charger les commandes" },
        { status: 500 }
      );
    }

    const clientIds = [
      ...new Set(
        (orders ?? []).map((order) => order.client_id)
      ),
    ];

    const priceIds = [
      ...new Set(
        (orders ?? []).map((order) => order.price_id)
      ),
    ];

    const [clientsResult, pricesResult] =
      await Promise.all([
        clientIds.length > 0
          ? admin.db
              .from("alteract_platform_clients")
              .select("id,name")
              .in("id", clientIds)
          : Promise.resolve({
              data: [] as ClientRow[],
              error: null,
            }),

        priceIds.length > 0
          ? admin.db
              .from("alteract_subscription_prices")
              .select("id,plan,duration_months")
              .in("id", priceIds)
          : Promise.resolve({
              data: [] as PriceRow[],
              error: null,
            }),
      ]);

    if (clientsResult.error || pricesResult.error) {
      console.error(
        "Erreur chargement informations commandes :",
        clientsResult.error?.message ??
          pricesResult.error?.message
      );

      return NextResponse.json(
        {
          error:
            "Impossible de charger les détails des commandes",
        },
        { status: 500 }
      );
    }

    const clientMap = new Map(
      (clientsResult.data ?? []).map((client) => [
        client.id,
        client.name,
      ])
    );

    const priceMap = new Map(
      (pricesResult.data ?? []).map((price) => [
        price.id,
        {
          plan: price.plan,
          duration_months: price.duration_months,
        },
      ])
    );

    const result = (orders ?? []).map((order) => {
      const price = priceMap.get(order.price_id);

      return {
        id: order.id,
        reference: order.reference,
        agency_name:
          clientMap.get(order.client_id) ??
          "Agence inconnue",
        plan: price?.plan ?? "inconnu",
        duration_months:
          price?.duration_months ?? null,
        payment_method: order.payment_method,
        amount_xof: order.amount_xof,
        status: order.status,
        created_at: order.created_at,
      };
    });

    return NextResponse.json(
      { orders: result },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Erreur API commandes Super Admin :",
      error
    );

    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
