"use server";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

export type RentQuittancePdfData = {
  quittanceNumber: string;
  issuedAt: string;

  organizationName: string;

  tenantFirstName: string;
  tenantLastName: string;

  propertyName: string;
  propertyAddress?: string | null;
  propertyCity?: string | null;
  propertyCountry?: string | null;

  unitName: string;

  periodStart: string;
  periodEnd: string;

  amountDue: number;
  currency: string;
};

function normalizePdfText(value: string | null | undefined) {
  return (value ?? "")
    .replace(/\u202f/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-");
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return normalizePdfText(value);
  }

  return normalizePdfText(
    new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(date)
  );
}

function formatAmount(amount: number, currency: string) {
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return normalizePdfText(`${formatted} ${currency}`);
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  options?: {
    bold?: boolean;
    maxWidth?: number;
  }
) {
  const safeText = normalizePdfText(text);
  const maxWidth = options?.maxWidth ?? 500;

  const words = safeText.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - index * (size + 5),
      size,
      font,
      color: rgb(0.12, 0.16, 0.23),
    });
  });

  return y - Math.max(lines.length, 1) * (size + 5);
}

export async function generateRentQuittancePdf(
  data: RentQuittancePdfData
) {
  const pdfDocument = await PDFDocument.create();

  const page = pdfDocument.addPage([595.28, 841.89]);

  const regularFont = await pdfDocument.embedFont(
    StandardFonts.Helvetica
  );

  const boldFont = await pdfDocument.embedFont(
    StandardFonts.HelveticaBold
  );

  const { width, height } = page.getSize();

  const margin = 52;
  const contentWidth = width - margin * 2;

  page.drawRectangle({
    x: 0,
    y: height - 12,
    width,
    height: 12,
    color: rgb(0.937, 0.267, 0.267),
  });

  page.drawText("ALTERACT", {
    x: margin,
    y: height - 65,
    size: 20,
    font: boldFont,
    color: rgb(0.07, 0.09, 0.15),
  });

  page.drawText("Gestion locative", {
    x: margin,
    y: height - 86,
    size: 10,
    font: regularFont,
    color: rgb(0.41, 0.45, 0.5),
  });

  const title = "QUITTANCE DE LOYER";

  const titleWidth = boldFont.widthOfTextAtSize(title, 19);

  page.drawText(title, {
    x: width - margin - titleWidth,
    y: height - 65,
    size: 19,
    font: boldFont,
    color: rgb(0.07, 0.09, 0.15),
  });

  const numberLabel = normalizePdfText(data.quittanceNumber);
  const numberWidth = regularFont.widthOfTextAtSize(
    numberLabel,
    10
  );

  page.drawText(numberLabel, {
    x: width - margin - numberWidth,
    y: height - 86,
    size: 10,
    font: regularFont,
    color: rgb(0.41, 0.45, 0.5),
  });

  page.drawLine({
    start: { x: margin, y: height - 112 },
    end: { x: width - margin, y: height - 112 },
    thickness: 1,
    color: rgb(0.9, 0.91, 0.93),
  });

  let y = height - 150;

  page.drawText("Bailleur / gestionnaire", {
    x: margin,
    y,
    size: 9,
    font: regularFont,
    color: rgb(0.41, 0.45, 0.5),
  });

  y -= 20;

  page.drawText(normalizePdfText(data.organizationName), {
    x: margin,
    y,
    size: 13,
    font: boldFont,
    color: rgb(0.07, 0.09, 0.15),
  });

  y -= 42;

  page.drawRectangle({
    x: margin,
    y: y - 118,
    width: contentWidth,
    height: 118,
    borderWidth: 1,
    borderColor: rgb(0.9, 0.91, 0.93),
    color: rgb(0.98, 0.985, 0.99),
  });

  const leftX = margin + 18;
  const rightX = margin + contentWidth / 2 + 10;
  const boxTop = y - 24;

  page.drawText("Locataire", {
    x: leftX,
    y: boxTop,
    size: 9,
    font: regularFont,
    color: rgb(0.41, 0.45, 0.5),
  });

  page.drawText(
    normalizePdfText(
      `${data.tenantFirstName} ${data.tenantLastName}`
    ),
    {
      x: leftX,
      y: boxTop - 20,
      size: 12,
      font: boldFont,
      color: rgb(0.07, 0.09, 0.15),
    }
  );

  page.drawText("Bien loué", {
    x: rightX,
    y: boxTop,
    size: 9,
    font: regularFont,
    color: rgb(0.41, 0.45, 0.5),
  });

  page.drawText(
    normalizePdfText(
      `${data.propertyName} - ${data.unitName}`
    ),
    {
      x: rightX,
      y: boxTop - 20,
      size: 11,
      font: boldFont,
      color: rgb(0.07, 0.09, 0.15),
      maxWidth: contentWidth / 2 - 28,
    }
  );

  const addressParts = [
    data.propertyAddress,
    data.propertyCity,
    data.propertyCountry,
  ]
    .filter(Boolean)
    .map((part) => normalizePdfText(String(part)));

  if (addressParts.length > 0) {
    page.drawText(addressParts.join(", "), {
      x: rightX,
      y: boxTop - 40,
      size: 9,
      font: regularFont,
      color: rgb(0.41, 0.45, 0.5),
      maxWidth: contentWidth / 2 - 28,
    });
  }

  y -= 152;

  page.drawText("Période concernée", {
    x: margin,
    y,
    size: 9,
    font: regularFont,
    color: rgb(0.41, 0.45, 0.5),
  });

  y -= 20;

  page.drawText(
    normalizePdfText(
      `Du ${formatDate(data.periodStart)} au ${formatDate(
        data.periodEnd
      )}`
    ),
    {
      x: margin,
      y,
      size: 12,
      font: boldFont,
      color: rgb(0.07, 0.09, 0.15),
    }
  );

  y -= 46;

  page.drawRectangle({
    x: margin,
    y: y - 72,
    width: contentWidth,
    height: 72,
    color: rgb(0.98, 0.985, 0.99),
    borderWidth: 1,
    borderColor: rgb(0.9, 0.91, 0.93),
  });

  page.drawText("Montant du loyer soldé", {
    x: margin + 18,
    y: y - 25,
    size: 10,
    font: regularFont,
    color: rgb(0.41, 0.45, 0.5),
  });

  const amountLabel = formatAmount(
    data.amountDue,
    data.currency
  );

  const amountWidth = boldFont.widthOfTextAtSize(
    amountLabel,
    17
  );

  page.drawText(amountLabel, {
    x: width - margin - 18 - amountWidth,
    y: y - 31,
    size: 17,
    font: boldFont,
    color: rgb(0.07, 0.09, 0.15),
  });

  y -= 116;

  y = drawText(
    page,
    `${data.organizationName} certifie avoir reçu le règlement intégral du loyer correspondant à la période indiquée ci-dessus et délivre la présente quittance au locataire.`,
    margin,
    y,
    regularFont,
    11,
    { maxWidth: contentWidth }
  );

  y -= 20;

  y = drawText(
    page,
    "La présente quittance atteste du règlement intégral de cette échéance au moment de son émission.",
    margin,
    y,
    regularFont,
    10,
    { maxWidth: contentWidth }
  );

  y -= 34;

  page.drawText(
    normalizePdfText(
      `Émise le ${formatDate(data.issuedAt)}`
    ),
    {
      x: margin,
      y,
      size: 10,
      font: regularFont,
      color: rgb(0.41, 0.45, 0.5),
    }
  );

  page.drawLine({
    start: { x: margin, y: 78 },
    end: { x: width - margin, y: 78 },
    thickness: 1,
    color: rgb(0.9, 0.91, 0.93),
  });

  const footer =
    "Document généré par Alteract - Gestion locative";

  page.drawText(footer, {
    x: margin,
    y: 55,
    size: 8,
    font: regularFont,
    color: rgb(0.41, 0.45, 0.5),
  });

  return pdfDocument.save();
}
