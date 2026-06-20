import jsPDF from "jspdf";
import QRCode from "qrcode";
import type { IdCardSignatureSetting } from "@mms/shared";
import { idCardTheme } from "@/lib/id-card-theme";

type Rgb = readonly [number, number, number];

export interface IdCardPdfData {
  organizationName: string;
  organizationAddress: string;
  organizationSlogan?: string;
  logoUrl?: string | null;
  photoUrl?: string | null;
  memberName: string;
  designation?: string | null;
  memberId: string;
  dateOfBirth?: string | null;
  phone?: string | null;
  email?: string | null;
  bloodGroup?: string | null;
  address?: string | null;
  joinedAt?: string | null;
  expiresAt?: string | null;
  qrText: string;
  signatures?: IdCardSignatureSetting[];
  fields?: Record<string, boolean>;
}

function rgb(doc: jsPDF, method: "setFillColor" | "setDrawColor" | "setTextColor", color: Rgb) {
  doc[method](color[0], color[1], color[2]);
}

function value(text: string | null | undefined) {
  return text && text.trim() ? text : "-";
}

function imageFormat(dataUrl: string) {
  return dataUrl.includes("image/png") ? "PNG" : "JPEG";
}

function dateValue(text: string | null | undefined) {
  if (!text) return "-";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString("en-GB");
}

function fieldOn(data: IdCardPdfData, key: string) {
  return data.fields?.[key] !== false;
}

function fitText(doc: jsPDF, text: string, maxWidth: number, size: number) {
  doc.setFontSize(size);
  let next = text;
  while (doc.getTextWidth(next) > maxWidth && next.length > 4) {
    next = `${next.slice(0, -4)}...`;
  }
  return next;
}

function wrappedLines(doc: jsPDF, text: string, maxWidth: number, maxLines: number) {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  if (lines.length <= maxLines) return lines;
  const next = lines.slice(0, maxLines);
  let last = next[next.length - 1];
  while (doc.getTextWidth(`${last}...`) > maxWidth && last.length > 4) {
    last = last.slice(0, -1);
  }
  next[next.length - 1] = `${last}...`;
  return next;
}

async function imageDataUrl(url?: string | null) {
  if (!url) return null;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawCardBase(doc: jsPDF, x: number, y: number) {
  const { card, colors } = idCardTheme;
  rgb(doc, "setFillColor", colors.white);
  rgb(doc, "setDrawColor", colors.border);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, card.width, card.height, card.radius, card.radius, "FD");
}

function drawHeader(doc: jsPDF, x: number, y: number, title: string, logoData: string | null) {
  const { card, colors, text } = idCardTheme;
  rgb(doc, "setFillColor", colors.primary);
  doc.roundedRect(x, y, card.width, 12.5, card.radius, card.radius, "F");
  doc.rect(x, y + 9.8, card.width, 3, "F");

  const logoSize = idCardTheme.assets.logoSize;
  const logoX = x + 3;
  const logoY = y + 2.05;
  rgb(doc, "setFillColor", colors.white);
  rgb(doc, "setDrawColor", [255, 225, 208]);
  doc.setLineWidth(0.25);
  doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, "FD");
  if (logoData) {
    doc.addImage(logoData, imageFormat(logoData), logoX + 1.1, logoY + 1.1, logoSize - 2.2, logoSize - 2.2);
  }

  rgb(doc, "setTextColor", colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(text.slogan);
  doc.text("MEMBER ID CARD", x + 13.4, y + 4.25);
  doc.setFontSize(text.organization);
  doc.text(fitText(doc, title, card.width - 18, text.organization), x + 13.4, y + 8.8);
}

function drawInfoRow(doc: jsPDF, label: string, content: string, x: number, y: number, maxWidth = 30) {
  const { colors, text } = idCardTheme;
  rgb(doc, "setTextColor", colors.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(text.label);
  doc.text(label.toUpperCase(), x, y);
  rgb(doc, "setTextColor", colors.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(text.value);
  doc.text(fitText(doc, content, maxWidth, text.value), x + 13, y);
}

function drawBadge(doc: jsPDF, textValue: string, x: number, y: number, width: number, red = false) {
  const { colors } = idCardTheme;
  rgb(doc, "setFillColor", red ? [255, 240, 240] : colors.waveSoft);
  rgb(doc, "setDrawColor", red ? [245, 190, 190] : colors.wave);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, width, 4.5, 2.2, 2.2, "FD");
  rgb(doc, "setTextColor", red ? [193, 18, 31] : colors.primaryDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(2.2);
  doc.text(fitText(doc, textValue, width - 3, 2.2), x + width / 2, y + 3, { align: "center" });
}

function drawFront(
  doc: jsPDF,
  data: IdCardPdfData,
  x: number,
  y: number,
  photoData: string | null,
  logoData: string | null,
  qrData: string,
  signatureImages: Record<string, string | null>
) {
  const { colors, text, assets, card } = idCardTheme;
  drawCardBase(doc, x, y);
  drawHeader(doc, x, y, data.organizationName, logoData);

  if (fieldOn(data, "photo")) {
    const photoX = x + 3.2;
    const photoY = y + 15.5;
    rgb(doc, "setFillColor", colors.white);
    rgb(doc, "setDrawColor", colors.border);
    doc.setLineWidth(0.35);
    doc.roundedRect(photoX, photoY, assets.photoWidth, assets.photoHeight, 1.6, 1.6, "FD");
    if (photoData) {
      doc.addImage(photoData, imageFormat(photoData), photoX + 0.6, photoY + 0.6, assets.photoWidth - 1.2, assets.photoHeight - 1.2);
    } else {
      rgb(doc, "setFillColor", colors.cream);
      doc.roundedRect(photoX + 0.6, photoY + 0.6, assets.photoWidth - 1.2, assets.photoHeight - 1.2, 1.2, 1.2, "F");
    }
    if (fieldOn(data, "approvedSeal")) {
      rgb(doc, "setFillColor", [22, 138, 95]);
      rgb(doc, "setDrawColor", colors.white);
      doc.setLineWidth(0.35);
      doc.circle(photoX + assets.photoWidth - 0.5, photoY + assets.photoHeight - 0.5, 3.1, "FD");
      rgb(doc, "setTextColor", colors.white);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(3.2);
      doc.text("V", photoX + assets.photoWidth - 0.5, photoY + assets.photoHeight + 0.5, { align: "center" });
    }
  }

  const detailsX = fieldOn(data, "photo") ? x + 27.5 : x + 4.2;
  if (fieldOn(data, "memberName")) {
    rgb(doc, "setTextColor", colors.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(text.name);
    doc.text(wrappedLines(doc, data.memberName, card.width - (fieldOn(data, "photo") ? 31 : 9), 2), detailsX, y + 18.8);
  }

  if (fieldOn(data, "memberId")) {
    drawBadge(doc, `ID ${value(data.memberId)}`, detailsX, y + 23.2, 25);
  }
  if (fieldOn(data, "bloodGroup") && data.bloodGroup) {
    drawBadge(doc, data.bloodGroup, detailsX + 26.8, y + 23.2, 14, true);
  }

  let rowY = y + 31.3;
  if (fieldOn(data, "phone") && data.phone) {
    drawInfoRow(doc, "Phone", data.phone, detailsX, rowY, 31);
    rowY += 4.4;
  }
  if (fieldOn(data, "address") && data.address) {
    rgb(doc, "setTextColor", colors.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(text.label);
    doc.text("ADDRESS", detailsX, rowY);
    rgb(doc, "setTextColor", colors.text);
    doc.setFontSize(text.value);
    doc.text(wrappedLines(doc, data.address, 40, 2), detailsX + 13, rowY);
  }

  if (fieldOn(data, "qrCode")) {
    doc.addImage(qrData, "PNG", x + 3.8, y + 41, assets.qrSize, assets.qrSize);
    rgb(doc, "setTextColor", colors.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(1.8);
    doc.text("SCAN TO VERIFY", x + 9.8, y + 52.2, { align: "center" });
  }

  if (fieldOn(data, "approvedSeal")) {
    rgb(doc, "setDrawColor", colors.wave);
    doc.setLineWidth(0.25);
    doc.circle(x + 41.5, y + 47.2, 5.4, "S");
    rgb(doc, "setTextColor", colors.primaryDark);
    doc.setFontSize(1.8);
    doc.text(["APPROVED", "MEMBER"], x + 41.5, y + 46.5, { align: "center" });
  }

  const signature = (data.signatures ?? []).find((item) => item.showOnCard);
  if (fieldOn(data, "signatures") && signature) {
    drawSignatureSlot(doc, signature, x + 70.5, y + 45.2, signatureImages[signature.key] ?? null, 18);
    rgb(doc, "setTextColor", colors.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(1.85);
    doc.text("AUTHORISED", x + 70.5, y + 51.8, { align: "center" });
  }
}

function drawSignatureSlot(
  doc: jsPDF,
  signature: IdCardSignatureSetting,
  x: number,
  y: number,
  imageData: string | null,
  width = 20
) {
  const { colors, text } = idCardTheme;
  if (signature.signatureType === "image" && imageData) {
    doc.addImage(imageData, imageFormat(imageData), x - width / 2, y - 5.2, width, 5.2);
  } else {
    rgb(doc, "setTextColor", colors.primary);
    doc.setFont("times", "italic");
    doc.setFontSize(text.signature);
    doc.text(fitText(doc, signature.text || signature.name || signature.label, width, text.signature), x, y, { align: "center" });
  }
  rgb(doc, "setDrawColor", colors.muted);
  doc.setLineWidth(0.25);
  doc.line(x - width / 2, y + 1.5, x + width / 2, y + 1.5);
  rgb(doc, "setTextColor", colors.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(1.85);
  doc.text(signature.label.toUpperCase(), x, y + 4, { align: "center" });
}

function drawBack(
  doc: jsPDF,
  data: IdCardPdfData,
  x: number,
  y: number,
  logoData: string | null,
  qrData: string,
  signatureImages: Record<string, string | null>
) {
  const { card, colors, text, assets } = idCardTheme;
  drawCardBase(doc, x, y);
  rgb(doc, "setFillColor", colors.cream);
  doc.rect(x, y, card.width, 12.2, "F");
  rgb(doc, "setDrawColor", colors.border);
  doc.setLineWidth(0.25);
  doc.line(x, y + 12.2, x + card.width, y + 12.2);

  const logoSize = assets.logoSize;
  rgb(doc, "setFillColor", colors.white);
  doc.circle(x + 7.2, y + 6.1, logoSize / 2, "F");
  if (logoData) {
    doc.addImage(logoData, imageFormat(logoData), x + 3.8, y + 2.7, logoSize - 1.6, logoSize - 1.6);
  }
  rgb(doc, "setDrawColor", colors.waveSoft);
  doc.setLineWidth(0.35);
  doc.circle(x + 45.5, y + 30.5, 15.5, "S");

  rgb(doc, "setTextColor", colors.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(2.75);
  doc.text(fitText(doc, data.organizationName, card.width - 15, 2.75), x + 13.2, y + 5);
  rgb(doc, "setTextColor", colors.muted);
  doc.setFontSize(2);
  if (fieldOn(data, "organizationAddress")) {
    doc.text(wrappedLines(doc, data.organizationAddress, card.width - 18, 2), x + 13.2, y + 8);
  }

  rgb(doc, "setTextColor", colors.primaryDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(text.heading);
  doc.text("Verification & Return Information", x + 3.2, y + 18.8);
  rgb(doc, "setTextColor", colors.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(text.body);
  if (fieldOn(data, "returnNotice")) {
    doc.text(
      wrappedLines(
        doc,
        "This card is issued to an approved member of the association. If found, please return it to the association office.",
        55,
        3
      ),
      x + 3.2,
      y + 23
    );
  }
  if (fieldOn(data, "organizationAddress")) {
    rgb(doc, "setTextColor", colors.muted);
    doc.setFontSize(2);
    doc.text(wrappedLines(doc, data.organizationAddress, 55, 2), x + 3.2, y + 33);
  }

  if (fieldOn(data, "qrCode")) {
    doc.addImage(qrData, "PNG", x + 68.3, y + 17.2, assets.qrSize, assets.qrSize);
    rgb(doc, "setTextColor", colors.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(1.8);
    doc.text("VERIFY", x + 74.3, y + 31.5, { align: "center" });
  }

  const visibleSignatures = (data.signatures ?? [])
    .filter((signature) => signature.showOnCard)
    .slice(0, 2);
  const signatureXs =
    visibleSignatures.length === 1
      ? [x + card.width / 2]
      : [x + 24, x + 61.5];
  if (fieldOn(data, "signatures")) {
    visibleSignatures.forEach((signature, index) => {
      drawSignatureSlot(
        doc,
        signature,
        signatureXs[index],
        y + 43.5,
        signatureImages[signature.key] ?? null,
        22
      );
    });
  }

  if (fieldOn(data, "returnNotice")) {
    rgb(doc, "setDrawColor", colors.border);
    doc.line(x + 3.2, y + 49.2, x + card.width - 3.2, y + 49.2);
    rgb(doc, "setTextColor", [140, 125, 114]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(1.75);
    doc.text(
      fitText(doc, "This ID card remains the property of the association and must be presented for verification when requested.", card.width - 8, 1.75),
      x + card.width / 2,
      y + 52,
      { align: "center" }
    );
  }
}

export async function downloadIdCardPdf(data: IdCardPdfData) {
  const doc = new jsPDF(idCardTheme.page);
  doc.setDisplayMode("original", "continuous");
  const { card } = idCardTheme;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const startX = (pageWidth - card.width) / 2;
  const startY = (pageHeight - card.height) / 2;

  rgb(doc, "setFillColor", idCardTheme.page.background);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  const [photoData, logoData, qrData] = await Promise.all([
    imageDataUrl(data.photoUrl),
    imageDataUrl(data.logoUrl),
    QRCode.toDataURL(data.qrText, { margin: 1, width: 220, color: { dark: "#15514e", light: "#ffffff" } })
  ]);
  const signatureImages = Object.fromEntries(
    await Promise.all(
      (data.signatures ?? []).map(async (signature) => [
        signature.key,
        signature.signatureType === "image" ? await imageDataUrl(signature.imageUrl) : null
      ])
    )
  ) as Record<string, string | null>;

  drawFront(doc, data, startX, startY, photoData, logoData, qrData, signatureImages);

  doc.addPage(idCardTheme.page.format, idCardTheme.page.orientation);
  rgb(doc, "setFillColor", idCardTheme.page.background);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  drawBack(doc, data, startX, startY, logoData, qrData, signatureImages);

  doc.save(`id-card-${data.memberId || "member"}.pdf`);
}
