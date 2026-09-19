import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";

type ReceiptPdfData = {
  receiptNumber: string;
  issuedAt: string;
  paymentDate: string;

  organizationName: string;
  organizationEmail?: string | null;
  organizationPhone?: string | null;
  organizationAddress?: string | null;
  organizationCity?: string | null;
  organizationCountry?: string | null;

  tenantFirstName: string;
  tenantLastName: string;
  tenantEmail?: string | null;
  tenantPhone?: string | null;

  propertyName: string;
  unitName: string;

  periodStart: string;
  periodEnd: string;

  amount: number;
  currency: string;
  paymentMethod: string;
  paymentReference?: string | null;
};

function normalizePdfText(value: string) {
  return value
    .replace(/\u202F/g, " ")
    .replace(/\u00A0/g, " ");
}

function formatDate(value: string) {
  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));

  return normalizePdfText(formattedDate);
}

function formatAmount(
  amount: number,
  currency: string
) {
  const formattedAmount = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(amount);

  return normalizePdfText(
    `${formattedAmount} ${currency}`
  );
}

function paymentMethodLabel(method: string) {
  const labels: Record<string, string> = {
    CASH: "Espèces",
    BANK_TRANSFER: "Virement bancaire",
    MOBILE_MONEY: "Mobile Money",
    CARD: "Carte",
    CHEQUE: "Chèque",
    OTHER: "Autre",
  };

  return labels[method] ?? method;
}

export async function generateReceiptPdf(
  data: ReceiptPdfData
) {
  const pdfDocument = await PDFDocument.create();

  const page = pdfDocument.addPage([
    595.28,
    841.89,
  ]);

  const regularFont =
    await pdfDocument.embedFont(
      StandardFonts.Helvetica
    );

  const boldFont =
    await pdfDocument.embedFont(
      StandardFonts.HelveticaBold
    );

  const { width, height } = page.getSize();

  const red = rgb(
    239 / 255,
    68 / 255,
    68 / 255
  );

  const dark = rgb(
    17 / 255,
    24 / 255,
    39 / 255
  );

  const muted = rgb(
    104 / 255,
    114 / 255,
    128 / 255
  );

  const border = rgb(
    229 / 255,
    231 / 255,
    235 / 255
  );

  const lightBackground = rgb(
    248 / 255,
    250 / 255,
    252 / 255
  );

  const margin = 50;

  // Bandeau Alteract
  page.drawRectangle({
    x: 0,
    y: height - 12,
    width,
    height: 12,
    color: red,
  });

  // Identité Alteract
  page.drawText("ALTERACT", {
    x: margin,
    y: height - 70,
    size: 22,
    font: boldFont,
    color: red,
  });

  page.drawText("Gestion locative", {
    x: margin,
    y: height - 90,
    size: 10,
    font: regularFont,
    color: muted,
  });

  // Titre
  const title = "REÇU DE PAIEMENT";

  const titleWidth =
    boldFont.widthOfTextAtSize(
      title,
      18
    );

  page.drawText(title, {
    x: width - margin - titleWidth,
    y: height - 70,
    size: 18,
    font: boldFont,
    color: dark,
  });

  const receiptNumberWidth =
    regularFont.widthOfTextAtSize(
      data.receiptNumber,
      10
    );

  page.drawText(
    normalizePdfText(data.receiptNumber),
    {
      x: width - margin - receiptNumberWidth,
      y: height - 90,
      size: 10,
      font: regularFont,
      color: muted,
    }
  );

  // Séparateur
  page.drawLine({
    start: {
      x: margin,
      y: height - 115,
    },
    end: {
      x: width - margin,
      y: height - 115,
    },
    thickness: 1,
    color: border,
  });

  // Organisation
  page.drawText("ÉMIS PAR", {
    x: margin,
    y: height - 150,
    size: 9,
    font: boldFont,
    color: muted,
  });

  page.drawText(
    normalizePdfText(
      data.organizationName
    ),
    {
      x: margin,
      y: height - 172,
      size: 13,
      font: boldFont,
      color: dark,
    }
  );

  let organizationY =
    height - 190;

  const organizationLines = [
    data.organizationAddress,
    data.organizationCity,
    data.organizationCountry,
    data.organizationPhone,
    data.organizationEmail,
  ].filter(Boolean) as string[];

  for (
    const line of organizationLines
  ) {
    page.drawText(
      normalizePdfText(line),
      {
        x: margin,
        y: organizationY,
        size: 9,
        font: regularFont,
        color: muted,
      }
    );

    organizationY -= 15;
  }

  // Locataire
  const rightColumnX = 330;

  page.drawText("REÇU POUR", {
    x: rightColumnX,
    y: height - 150,
    size: 9,
    font: boldFont,
    color: muted,
  });

  page.drawText(
    normalizePdfText(
      `${data.tenantFirstName} ${data.tenantLastName}`
    ),
    {
      x: rightColumnX,
      y: height - 172,
      size: 13,
      font: boldFont,
      color: dark,
    }
  );

  let tenantY =
    height - 190;

  const tenantLines = [
    data.tenantPhone,
    data.tenantEmail,
  ].filter(Boolean) as string[];

  for (
    const line of tenantLines
  ) {
    page.drawText(
      normalizePdfText(line),
      {
        x: rightColumnX,
        y: tenantY,
        size: 9,
        font: regularFont,
        color: muted,
      }
    );

    tenantY -= 15;
  }

  // Encadré montant
  const amountBoxY =
    height - 350;

  page.drawRectangle({
    x: margin,
    y: amountBoxY,
    width: width - margin * 2,
    height: 80,
    color: lightBackground,
    borderColor: border,
    borderWidth: 1,
  });

  page.drawText("MONTANT REÇU", {
    x: margin + 20,
    y: amountBoxY + 50,
    size: 9,
    font: boldFont,
    color: muted,
  });

  page.drawText(
    formatAmount(
      data.amount,
      data.currency
    ),
    {
      x: margin + 20,
      y: amountBoxY + 20,
      size: 22,
      font: boldFont,
      color: dark,
    }
  );

  page.drawText(
    `Payé le ${formatDate(
      data.paymentDate
    )}`,
    {
      x: 350,
      y: amountBoxY + 32,
      size: 10,
      font: regularFont,
      color: muted,
    }
  );

  // Détails
  let detailY =
    amountBoxY - 50;

  page.drawText(
    "DÉTAILS DU PAIEMENT",
    {
      x: margin,
      y: detailY,
      size: 11,
      font: boldFont,
      color: dark,
    }
  );

  detailY -= 30;

  const details = [
    [
      "Bien",
      data.propertyName,
    ],
    [
      "Unité",
      data.unitName,
    ],
    [
      "Période",
      `${formatDate(
        data.periodStart
      )} au ${formatDate(
        data.periodEnd
      )}`,
    ],
    [
      "Mode de paiement",
      paymentMethodLabel(
        data.paymentMethod
      ),
    ],
    [
      "Référence",
      data.paymentReference || "—",
    ],
    [
      "Date d'émission",
      formatDate(data.issuedAt),
    ],
  ];

  for (
    const [label, value] of details
  ) {
    page.drawText(
      normalizePdfText(label),
      {
        x: margin,
        y: detailY,
        size: 9,
        font: boldFont,
        color: muted,
      }
    );

    page.drawText(
      normalizePdfText(value),
      {
        x: 220,
        y: detailY,
        size: 10,
        font: regularFont,
        color: dark,
      }
    );

    page.drawLine({
      start: {
        x: margin,
        y: detailY - 10,
      },
      end: {
        x: width - margin,
        y: detailY - 10,
      },
      thickness: 0.5,
      color: border,
    });

    detailY -= 32;
  }

  // Mention de validation
  const validationY = 155;

  page.drawText(
    "Ce document confirme l'enregistrement du paiement indiqué ci-dessus.",
    {
      x: margin,
      y: validationY,
      size: 9,
      font: regularFont,
      color: muted,
    }
  );

  page.drawText(
    "Conservez ce reçu comme justificatif de paiement.",
    {
      x: margin,
      y: validationY - 17,
      size: 9,
      font: regularFont,
      color: muted,
    }
  );

  // Pied de page
  page.drawLine({
    start: {
      x: margin,
      y: 90,
    },
    end: {
      x: width - margin,
      y: 90,
    },
    thickness: 1,
    color: border,
  });

  page.drawText(
    normalizePdfText(
      `Reçu ${data.receiptNumber}`
    ),
    {
      x: margin,
      y: 65,
      size: 8,
      font: regularFont,
      color: muted,
    }
  );

  const footer =
    "Généré par Alteract";

  const footerWidth =
    regularFont.widthOfTextAtSize(
      footer,
      8
    );

  page.drawText(footer, {
    x: width - margin - footerWidth,
    y: 65,
    size: 8,
    font: regularFont,
    color: muted,
  });

  return pdfDocument.save();
}