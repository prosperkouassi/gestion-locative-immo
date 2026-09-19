import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { generateReceiptPdf } from "@/lib/pdf/receipt";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
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

  const { data: receipt, error: receiptError } = await supabase
    .from("receipts")
    .select(`
      id,
      receipt_number,
      issued_at,
      amount,
      currency,
      organization_id,
      payment_id
    `)
    .eq("id", id)
    .maybeSingle();

  if (receiptError) {
    console.error(
      "Erreur pendant la récupération du reçu :",
      receiptError
    );

    return NextResponse.json(
      {
        error: "Impossible de récupérer le reçu.",
      },
      {
        status: 500,
      }
    );
  }

  if (!receipt) {
    return NextResponse.json(
      {
        error: "Reçu introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select(`
      id,
      rent_schedule_id,
      amount,
      currency,
      payment_date,
      payment_method,
      reference
    `)
    .eq("organization_id", receipt.organization_id)
    .eq("id", receipt.payment_id)
    .maybeSingle();

  if (paymentError || !payment) {
    console.error(
      "Impossible de récupérer le paiement :",
      paymentError
    );

    return NextResponse.json(
      {
        error: "Paiement introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  const { data: schedule, error: scheduleError } = await supabase
    .from("rent_schedules")
    .select(`
      id,
      lease_id,
      period_start,
      period_end
    `)
    .eq("organization_id", receipt.organization_id)
    .eq("id", payment.rent_schedule_id)
    .maybeSingle();

  if (scheduleError || !schedule) {
    console.error(
      "Impossible de récupérer l'échéance :",
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

  const { data: lease, error: leaseError } = await supabase
    .from("leases")
    .select(`
      id,
      tenant_id,
      unit_id
    `)
    .eq("organization_id", receipt.organization_id)
    .eq("id", schedule.lease_id)
    .maybeSingle();

  if (leaseError || !lease) {
    console.error(
      "Impossible de récupérer le bail :",
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
    tenantResult,
    unitResult,
    organizationResult,
  ] = await Promise.all([
    supabase
      .from("tenants")
      .select(`
        first_name,
        last_name,
        email,
        phone
      `)
      .eq("organization_id", receipt.organization_id)
      .eq("id", lease.tenant_id)
      .maybeSingle(),

    supabase
      .from("units")
      .select(`
        id,
        property_id,
        name
      `)
      .eq("organization_id", receipt.organization_id)
      .eq("id", lease.unit_id)
      .maybeSingle(),

    supabase
      .from("organizations")
      .select(`
        name,
        email,
        phone,
        address,
        city,
        country
      `)
      .eq("id", receipt.organization_id)
      .maybeSingle(),
  ]);

  if (tenantResult.error || !tenantResult.data) {
    console.error(
      "Impossible de récupérer le locataire :",
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
      "Impossible de récupérer l'unité :",
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

  if (
    organizationResult.error ||
    !organizationResult.data
  ) {
    console.error(
      "Impossible de récupérer l'organisation :",
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

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("name")
    .eq("organization_id", receipt.organization_id)
    .eq("id", unitResult.data.property_id)
    .maybeSingle();

  if (propertyError || !property) {
    console.error(
      "Impossible de récupérer le bien :",
      propertyError
    );

    return NextResponse.json(
      {
        error: "Bien introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  const pdfBytes = await generateReceiptPdf({
    receiptNumber: receipt.receipt_number,
    issuedAt: receipt.issued_at,
    paymentDate: payment.payment_date,

    organizationName:
      organizationResult.data.name,
    organizationEmail:
      organizationResult.data.email,
    organizationPhone:
      organizationResult.data.phone,
    organizationAddress:
      organizationResult.data.address,
    organizationCity:
      organizationResult.data.city,
    organizationCountry:
      organizationResult.data.country,

    tenantFirstName:
      tenantResult.data.first_name,
    tenantLastName:
      tenantResult.data.last_name,
    tenantEmail:
      tenantResult.data.email,
    tenantPhone:
      tenantResult.data.phone,

    propertyName: property.name,
    unitName: unitResult.data.name,

    periodStart: schedule.period_start,
    periodEnd: schedule.period_end,

    amount: Number(receipt.amount),
    currency: receipt.currency,
    paymentMethod: payment.payment_method,
    paymentReference: payment.reference,
  });

  const pdfBuffer = Buffer.from(pdfBytes);

  const safeReceiptNumber =
    receipt.receipt_number.replace(
      /[^a-zA-Z0-9-_]/g,
      "-"
    );

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        `inline; filename="${safeReceiptNumber}.pdf"`,
      "Cache-Control":
        "private, no-store, max-age=0",
    },
  });
}