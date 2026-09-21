import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { generateRentQuittancePdf } from "@/lib/pdf/quittance";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  const { id } = await context.params;

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    return NextResponse.json(
      {
        error: "Non authentifié.",
      },
      {
        status: 401,
      }
    );
  }

  const { data: quittance, error: quittanceError } =
    await supabase
      .from("rent_quittances")
      .select(
        "id, organization_id, rent_schedule_id, quittance_number, issued_at, amount_due, currency"
      )
      .eq("id", id)
      .maybeSingle();

  if (quittanceError) {
    console.error(
      "Erreur lecture quittance :",
      quittanceError
    );

    return NextResponse.json(
      {
        error: "Impossible de charger la quittance.",
      },
      {
        status: 500,
      }
    );
  }

  if (!quittance) {
    return NextResponse.json(
      {
        error: "Quittance introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  const { data: schedule, error: scheduleError } =
    await supabase
      .from("rent_schedules")
      .select(
        "id, organization_id, lease_id, period_start, period_end, amount_due, currency, status"
      )
      .eq("id", quittance.rent_schedule_id)
      .eq(
        "organization_id",
        quittance.organization_id
      )
      .maybeSingle();

  if (scheduleError || !schedule) {
    console.error(
      "Erreur lecture échéance de la quittance :",
      scheduleError
    );

    return NextResponse.json(
      {
        error: "Échéance introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  const { data: payments, error: paymentsError } =
    await supabase
      .from("payments")
      .select("id, amount, status")
      .eq(
        "organization_id",
        quittance.organization_id
      )
      .eq("rent_schedule_id", schedule.id)
      .eq("status", "COMPLETED");

  if (paymentsError) {
    console.error(
      "Erreur lecture paiements de la quittance :",
      paymentsError
    );

    return NextResponse.json(
      {
        error:
          "Impossible de vérifier le règlement de l'échéance.",
      },
      {
        status: 500,
      }
    );
  }

  const paymentIds = (payments ?? []).map(
    (payment) => payment.id
  );

  const refundedByPayment =
    new Map<string, number>();

  if (paymentIds.length > 0) {
    const { data: refunds, error: refundsError } =
      await supabase
        .from("payment_refunds")
        .select("payment_id, amount")
        .eq(
          "organization_id",
          quittance.organization_id
        )
        .in("payment_id", paymentIds);

    if (refundsError) {
      console.error(
        "Erreur lecture remboursements de la quittance :",
        refundsError
      );

      return NextResponse.json(
        {
          error:
            "Impossible de vérifier les remboursements.",
        },
        {
          status: 500,
        }
      );
    }

    for (const refund of refunds ?? []) {
      const previous =
        refundedByPayment.get(refund.payment_id) ?? 0;

      refundedByPayment.set(
        refund.payment_id,
        previous + Number(refund.amount)
      );
    }
  }

  const totalNetPaid = (payments ?? []).reduce(
    (total, payment) => {
      const refunded =
        refundedByPayment.get(payment.id) ?? 0;

      return (
        total +
        Number(payment.amount) -
        refunded
      );
    },
    0
  );

  if (totalNetPaid < Number(schedule.amount_due)) {
    return NextResponse.json(
      {
        error:
          "Cette quittance n'est plus téléchargeable car l'échéance n'est plus entièrement soldée.",
      },
      {
        status: 409,
      }
    );
  }

  const { data: lease, error: leaseError } =
    await supabase
      .from("leases")
      .select(
        "id, organization_id, tenant_id, unit_id"
      )
      .eq("id", schedule.lease_id)
      .eq(
        "organization_id",
        quittance.organization_id
      )
      .maybeSingle();

  if (leaseError || !lease) {
    console.error(
      "Erreur lecture bail de la quittance :",
      leaseError
    );

    return NextResponse.json(
      {
        error: "Bail introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  const [
    organizationResult,
    tenantResult,
    unitResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name")
      .eq("id", quittance.organization_id)
      .maybeSingle(),

    supabase
      .from("tenants")
      .select(
        "id, first_name, last_name"
      )
      .eq("id", lease.tenant_id)
      .eq(
        "organization_id",
        quittance.organization_id
      )
      .maybeSingle(),

    supabase
      .from("units")
      .select(
        "id, property_id, name"
      )
      .eq("id", lease.unit_id)
      .eq(
        "organization_id",
        quittance.organization_id
      )
      .maybeSingle(),
  ]);

  if (
    organizationResult.error ||
    !organizationResult.data
  ) {
    console.error(
      "Erreur lecture organisation :",
      organizationResult.error
    );

    return NextResponse.json(
      {
        error: "Organisation introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  if (
    tenantResult.error ||
    !tenantResult.data
  ) {
    console.error(
      "Erreur lecture locataire :",
      tenantResult.error
    );

    return NextResponse.json(
      {
        error: "Locataire introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  if (unitResult.error || !unitResult.data) {
    console.error(
      "Erreur lecture unité :",
      unitResult.error
    );

    return NextResponse.json(
      {
        error: "Unité introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  const { data: property, error: propertyError } =
    await supabase
      .from("properties")
      .select(
        "id, name, address, city, country"
      )
      .eq("id", unitResult.data.property_id)
      .eq(
        "organization_id",
        quittance.organization_id
      )
      .maybeSingle();

  if (propertyError || !property) {
    console.error(
      "Erreur lecture bien :",
      propertyError
    );

    return NextResponse.json(
      {
        error: "Bien immobilier introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  const pdfBytes =
    await generateRentQuittancePdf({
      quittanceNumber:
        quittance.quittance_number,
      issuedAt: quittance.issued_at,

      organizationName:
        organizationResult.data.name,

      tenantFirstName:
        tenantResult.data.first_name,
      tenantLastName:
        tenantResult.data.last_name,

      propertyName: property.name,
      propertyAddress: property.address,
      propertyCity: property.city,
      propertyCountry: property.country,

      unitName: unitResult.data.name,

      periodStart: schedule.period_start,
      periodEnd: schedule.period_end,

      amountDue: Number(
        quittance.amount_due
      ),
      currency: quittance.currency,
    });

  const safeNumber =
    quittance.quittance_number.replace(
      /[^a-zA-Z0-9_-]/g,
      "_"
    );

  return new Response(
    Buffer.from(pdfBytes),
    {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          `inline; filename="${safeNumber}.pdf"`,
        "Cache-Control":
          "private, no-store, max-age=0",
      },
    }
  );
}
