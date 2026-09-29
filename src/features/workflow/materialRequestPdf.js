import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const LOGO_URL = "/api/v1/brand/logo";

const COMPANY = {
  lines: ["Prince Majid Road", "As Safa Dist.", "Jeddah, KSA", "Phone : +966 55 330 3906", "E-mail : info@daamfm.com"],
};

const NAVY = [14, 42, 68];
const TEAL = [4, 167, 147];
const SLATE = [100, 116, 139];
const INK = [30, 41, 59];
const LINE = [226, 232, 240];
const PAPER = [248, 250, 252];

function money(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toLocaleString() : "0";
}

async function loadLogo() {
  try {
    const response = await fetch(LOGO_URL);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function statusColor(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("reject") || value.includes("discrep")) return [185, 28, 28];
  if (value.includes("approv") || value.includes("closed") || value.includes("paid")) return [4, 120, 87];
  if (value.includes("draft") || value.includes("return")) return [71, 85, 105];
  return TEAL;
}

function drawHeader(doc, logo) {
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, 210, 3.2, "F");
  doc.setFillColor(...NAVY);
  doc.rect(0, 3.2, 210, 1.1, "F");

  if (logo) {
    doc.addImage(logo, "PNG", 14, 10, 58, 16);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...NAVY);
    doc.text("SERVHUB", 14, 21);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE);
  COMPANY.lines.forEach((line, index) => {
    doc.text(line, 196, 11 + index * 3.4, { align: "right" });
  });

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(14, 32, 196, 32);
}

function drawMeta(doc, pairs, y) {
  const rowH = 8.2;
  const height = pairs.length * rowH + 3;
  doc.setFillColor(...PAPER);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.roundedRect(14, y, 182, height, 2.2, 2.2, "FD");

  pairs.forEach((pair, index) => {
    const rowY = y + 6.2 + index * rowH;
    if (index % 2 === 0) {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15.2, rowY - 4.4, 179.6, rowH, 1, 1, "F");
    }
    pair.forEach((cell, column) => {
      const x = column === 0 ? 18 : 108;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...SLATE);
      doc.text(String(cell[0] || ""), x, rowY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...INK);
      const value = doc.splitTextToSize(String(cell[1] || "—"), 46);
      doc.text(value[0] || "—", x + 34, rowY);
    });
  });

  return y + height;
}

function drawRequest(doc, record, departmentName, logo) {
  drawHeader(doc, logo);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...TEAL);
  doc.text("MATERIAL REQUEST", 14, 48);

  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text(String(record.id || record.mrNo || "Material request"), 14, 56);

  const status = String(record.status || "—");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const badgeWidth = Math.max(36, doc.getTextWidth(status) + 12);
  const badgeX = 196 - badgeWidth;
  doc.setFillColor(...statusColor(status));
  doc.roundedRect(badgeX, 46, badgeWidth, 9, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(status, badgeX + badgeWidth / 2, 51.8, { align: "center" });

  const cursorAfterMeta = drawMeta(
    doc,
    [
      [
        ["Status", record.status || "—"],
        ["Payment", record.paymentStatus || "Not started"],
      ],
      [
        ["Project", record.project || "—"],
        ["Department", departmentName || record.department || "—"],
      ],
      [
        ["Created by", record.createdBy || "—"],
        ["Created for", record.requestedBy || "—"],
      ],
      [
        ["Manager", record.assignedTo || "—"],
        ["Amount", money(record.amount)],
      ],
      [
        ["Supplier", record.supplier || "—"],
        ["Date", record.date || "—"],
      ],
    ],
    62
  );

  let cursor = cursorAfterMeta + 8;
  const justification = doc.splitTextToSize(String(record.justification || "—"), 168);
  const noteHeight = 12 + justification.length * 4.2;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...LINE);
  doc.roundedRect(14, cursor, 182, noteHeight, 2.2, 2.2, "S");
  doc.setFillColor(...TEAL);
  doc.rect(14, cursor, 1.4, noteHeight, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text("WHY THIS IS NEEDED", 20, cursor + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(justification, 20, cursor + 12);
  cursor += noteHeight + 8;

  const products = Array.isArray(record.products) ? record.products : [];
  if (products.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    doc.text("MATERIALS", 14, cursor);
    autoTable(doc, {
      startY: cursor + 3,
      margin: { left: 14, right: 14 },
      head: [["P. id", "Material", "Qty", "Amount"]],
      body: products.map((item) => [
        item.productId || "—",
        item.name || "—",
        `${item.quantity || ""}${item.unit ? ` ${item.unit}` : ""}`.trim() || "—",
        money(item.amount),
      ]),
      styles: { fontSize: 9, textColor: INK, cellPadding: 3, lineColor: LINE, lineWidth: 0.1 },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold", cellPadding: 3.4 },
      alternateRowStyles: { fillColor: PAPER },
      columnStyles: {
        0: { cellWidth: 36 },
        2: { halign: "center", cellWidth: 28 },
        3: { halign: "right", cellWidth: 32 },
      },
    });
    cursor = doc.lastAutoTable.finalY + 8;
  }

  if (record.quotation) {
    if (cursor > 250) {
      doc.addPage();
      drawHeader(doc, logo);
      cursor = 46;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("QUOTATION", 14, cursor);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...NAVY);
    const quote = doc.splitTextToSize(String(record.quotation), 182);
    doc.text(quote, 14, cursor + 5);
  }
}

export async function downloadMaterialRequestPdf(input) {
  const items = (Array.isArray(input) ? input : [input]).filter(Boolean);
  if (!items.length) return;

  const preview = window.open("", "_blank");
  try {
    const logo = await loadLogo();
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    items.forEach((item, index) => {
      if (index > 0) doc.addPage();
      const record = item.record || item;
      const departmentName = item.departmentName || record.department || "—";
      drawRequest(doc, record, departmentName, logo);
    });

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(...TEAL);
      doc.setLineWidth(0.4);
      doc.line(14, 284, 196, 284);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...SLATE);
      doc.text("ServHub", 14, 289);
      doc.text(`Page ${page} of ${pageCount}`, 196, 289, { align: "right" });
    }

    const first = items[0].record || items[0];
    const filename = items.length === 1 ? `${first.id || first.mrNo || "material-request"}.pdf` : "material-requests.pdf";
    const file = new File([doc.output("blob")], filename, { type: "application/pdf" });
    const url = URL.createObjectURL(file);
    const target = preview && !preview.closed ? preview : window.open("", "_blank");
    if (target) target.location.href = url;
  } catch (error) {
    if (preview && !preview.closed) preview.close();
    throw error;
  }
}
