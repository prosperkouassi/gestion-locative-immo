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

function normalizePdfText(
  value: string | null | undefined
) {
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

function formatAmount(
  amount: number,
  currency: string
) {
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return normalizePdfText(
    `${formatted} ${currency}`
  );
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  options?: {
    maxWidth?: number;
    color?: ReturnType<typeof rgb>;
    lineGap?: number;
  }
) {
  const safeText = normalizePdfText(text);
  const maxWidth = options?.maxWidth ?? 500;
  const lineGap = options?.lineGap ?? 5;

  const words = safeText
    .split(/\s+/)
    .filter(Boolean);

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine
      ? `${currentLine} ${word}`
      : word;

    if (
      font.widthOfTextAtSize(candidate, size) <=
      maxWidth
    ) {
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

  if (lines.length === 0) {
    return y;
  }

  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y:
        y -
        index * (size + lineGap),
      size,
      font,
      color:
        options?.color ??
        rgb(0.12, 0.16, 0.23),
    });
  });

  return (
    y -
    lines.length *
      (size + lineGap)
  );
}

export async function generateRentQuittancePdf(
  data: RentQuittancePdfData
) {
  const pdfDocument =
    await PDFDocument.create();

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

  const { width, height } =
    page.getSize();

  const margin = 52;
  const contentWidth =
    width - margin * 2;

  const darkColor = rgb(
    0.07,
    0.09,
    0.15
  );

  const mutedColor = rgb(
    0.41,
    0.45,
    0.5
  );

  const borderColor = rgb(
    0.9,
    0.91,
    0.93
  );

  const lightBackground = rgb(
    0.98,
    0.985,
    0.99
  );

  page.drawRectangle({
    x: 0,
    y: height - 12,
    width,
    height: 12,
    color: rgb(
      0.937,
      0.267,
      0.267
    ),
  });

  page.drawText("ALTERACT", {
    x: margin,
    y: height - 65,
    size: 20,
    font: boldFont,
    color: darkColor,
  });

  page.drawText(
    "Gestion locative",
    {
      x: margin,
      y: height - 86,
      size: 10,
      font: regularFont,
      color: mutedColor,
    }
  );

  const title =
    "QUITTANCE DE LOYER";

  const titleWidth =
    boldFont.widthOfTextAtSize(
      title,
      19
    );

  page.drawText(title, {
    x:
      width -
      margin -
      titleWidth,
    y: height - 65,
    size: 19,
    font: boldFont,
    color: darkColor,
  });

  const numberLabel =
    normalizePdfText(
      data.quittanceNumber
    );

  const numberWidth =
    regularFont.widthOfTextAtSize(
      numberLabel,
      10
    );

  page.drawText(numberLabel, {
    x:
      width -
      margin -
      numberWidth,
    y: height - 86,
    size: 10,
    font: regularFont,
    color: mutedColor,
  });

  page.drawLine({
    start: {
      x: margin,
      y: height - 112,
    },
    end: {
      x: width - margin,
      y: height - 112,
    },
    thickness: 1,
    color: borderColor,
  });

  let y = height - 150;

  page.drawText(
    "Bailleur / gestionnaire",
    {
      x: margin,
      y,
      size: 9,
      font: regularFont,
      color: mutedColor,
    }
  );

  y -= 20;

  page.drawText(
    normalizePdfText(
      data.organizationName
    ),
    {
      x: margin,
      y,
      size: 13,
      font: boldFont,
      color: darkColor,
    }
  );

  y -= 42;

  const identityBoxHeight = 132;

  page.drawRectangle({
    x: margin,
    y:
      y -
      identityBoxHeight,
    width: contentWidth,
    height: identityBoxHeight,
    borderWidth: 1,
    borderColor,
    color: lightBackground,
  });

  const leftX =
    margin + 18;

  const rightX =
    margin +
    contentWidth / 2 +
    10;

  const columnWidth =
    contentWidth / 2 - 28;

  const boxTop = y - 24;

  page.drawText("Locataire", {
    x: leftX,
    y: boxTop,
    size: 9,
    font: regularFont,
    color: mutedColor,
  });

  drawText(
    page,
    `${data.tenantFirstName} ${data.tenantLastName}`,
    leftX,
    boxTop - 20,
    boldFont,
    12,
    {
      maxWidth: columnWidth,
      color: darkColor,
      lineGap: 4,
    }
  );

  page.drawText("Bien loué", {
    x: rightX,
    y: boxTop,
    size: 9,
    font: regularFont,
    color: mutedColor,
  });

  const propertyBottom =
    drawText(
      page,
      `${data.propertyName} - ${data.unitName}`,
      rightX,
      boxTop - 20,
      boldFont,
      11,
      {
        maxWidth: columnWidth,
        color: darkColor,
        lineGap: 4,
      }
    );

  const addressParts = [
    data.propertyAddress,
    data.propertyCity,
    data.propertyCountry,
  ]
    .filter(Boolean)
    .map((part) =>
      normalizePdfText(
        String(part)
      )
    );

  if (
    addressParts.length > 0
  ) {
    drawText(
      page,
      addressParts.join(", "),
      rightX,
      propertyBottom - 3,
      regularFont,
      9,
      {
        maxWidth: columnWidth,
        color: mutedColor,
        lineGap: 3,
      }
    );
  }

  y -=
    identityBoxHeight + 34;

  page.drawText(
    "Période concernée",
    {
      x: margin,
      y,
      size: 9,
      font: regularFont,
      color: mutedColor,
    }
  );

  y -= 20;

  drawText(
    page,
    `Du ${formatDate(
      data.periodStart
    )} au ${formatDate(
      data.periodEnd
    )}`,
    margin,
    y,
    boldFont,
    12,
    {
      maxWidth: contentWidth,
      color: darkColor,
      lineGap: 4,
    }
  );

  y -= 46;

  page.drawRectangle({
    x: margin,
    y: y - 72,
    width: contentWidth,
    height: 72,
    color: lightBackground,
    borderWidth: 1,
    borderColor,
  });

  page.drawText(
    "Montant du loyer soldé",
    {
      x: margin + 18,
      y: y - 25,
      size: 10,
      font: regularFont,
      color: mutedColor,
    }
  );

  const amountLabel =
    formatAmount(
      data.amountDue,
      data.currency
    );

  const amountWidth =
    boldFont.widthOfTextAtSize(
      amountLabel,
      17
    );

  page.drawText(amountLabel, {
    x:
      width -
      margin -
      18 -
      amountWidth,
    y: y - 31,
    size: 17,
    font: boldFont,
    color: darkColor,
  });

  y -= 116;

  y = drawText(
    page,
    `${data.organizationName} certifie avoir reçu le règlement intégral du loyer correspondant à la période indiquée ci-dessus et délivre la présente quittance au locataire.`,
    margin,
    y,
    regularFont,
    11,
    {
      maxWidth: contentWidth,
      color: darkColor,
    }
  );

  y -= 20;

  y = drawText(
    page,
    "La présente quittance atteste du règlement intégral de cette échéance au moment de son émission.",
    margin,
    y,
    regularFont,
    10,
    {
      maxWidth: contentWidth,
      color: darkColor,
    }
  );

  y -= 34;

  page.drawText(
    normalizePdfText(
      `Émise le ${formatDate(
        data.issuedAt
      )}`
    ),
    {
      x: margin,
      y,
      size: 10,
      font: regularFont,
      color: mutedColor,
    }
  );

  page.drawLine({
    start: {
      x: margin,
      y: 78,
    },
    end: {
      x: width - margin,
      y: 78,
    },
    thickness: 1,
    color: borderColor,
  });

  const footer =
    "Document généré par Alteract - Gestion locative";

  page.drawText(footer, {
    x: margin,
    y: 55,
    size: 8,
    font: regularFont,
    color: mutedColor,
  });

  return pdfDocument.save();
}