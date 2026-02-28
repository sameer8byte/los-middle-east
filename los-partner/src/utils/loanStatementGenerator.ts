import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface LoanStatementData {
  loanId: string;
  formattedLoanId: string;
  status: string;
  brand: {
    name: string;
    logoUrl?: string;
    loanAgreementFooter?: string;
    contactEmail?: string;
  };
  user: {
    name: string;
    phoneNumber: string;
    email: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  loanDetails: {
    dueDate: string;
    disbursementDate: string;
  };
  transactions: Array<{
    date: string;
    transactionId: string;
    remarks: string;
    amount: number | null;
    type?: string;
    balance: number;
  }>;
  currentBalance: number;
  loanSummary?: {
    sanctionDate: string;
    sanctionLoanAmount: number;
    disbursedAmount: number;
    loanType: string;
    currentInstallmentAmount: number;
    totalDeductions: number;
    processingFee: number;
    currentRateOfInterest: number;
    totalInterestCharges: number;
    totalTaxes: number;
    annualPercentageRate: number;
    balanceLoanTenureDays: number;
    sanctionLoanTenureDays: number;
    dueDate: string;
    loanStatus: string;
    principalDue: number;
    penaltyDue: number;
    interestDue: number;
    totalDue: number;
    excessAmount: number;
    totalPrincipalPaid: number;
    totalInterestPaid: number;
    totalPenaltiesPaid: number;
  };
}

export const generateLoanStatement = async (
  data: LoanStatementData,
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = 595;
  const PAGE_HEIGHT = 842;
  const MARGIN = 50;
  const TABLE_WIDTH = 495;

  // Helper: wrap text
  const wrapText = (text: string, maxChars: number): string[] => {
    if (text.length <= maxChars) return [text];
    const lines: string[] = [];
    let currentLine = "";
    for (let word of text.split(" ")) {
      if ((currentLine ? currentLine + " " + word : word).length <= maxChars) {
        currentLine = currentLine ? currentLine + " " + word : word;
      } else {
        if (currentLine) lines.push(currentLine);
        while (word.length > maxChars) {
          lines.push(word.substring(0, maxChars));
          word = word.substring(maxChars);
        }
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Helper: format date dd/mm/yyyy
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  };

  // Pre-load logo
  let brandLogo: any = null;
  if (data.brand.logoUrl) {
    try {
      const response = await fetch(data.brand.logoUrl);
      if (response.ok) {
        const logoBytes = await (await response.blob()).arrayBuffer();
        try {
          brandLogo = await pdfDoc.embedPng(logoBytes);
        } catch {
          brandLogo = await pdfDoc.embedJpg(logoBytes);
        }
      }
    } catch (error) {
      console.error("Logo loading failed:", error);
    }
  }

  // ── Layout constants ────────────────────────────────────────────────────────
  // Header: logo + brand name left | document title right | rule below
  const HEADER_H = 70;           // total reserved height at top
  const HEADER_RULE_Y = PAGE_HEIGHT - HEADER_H; // y of the separator rule

  // Footer: rule above | logo + name left | page number right
  const FOOTER_RULE_Y = 62;      // y of the separator rule
  const FOOTER_CONTENT_Y = 44;   // y baseline for footer text/logo

  // Usable content area
  const CONTENT_TOP = HEADER_RULE_Y - 18;
  const CONTENT_BOTTOM = FOOTER_RULE_Y + 18;

  // ── drawHeader ──────────────────────────────────────────────────────────────
  const drawHeader = (pg: any) => {
    const LOGO_MAX_W = 120;
    const LOGO_MAX_H = 42;
    // Center logo/text block vertically in header area
    const blockCenterY = PAGE_HEIGHT - HEADER_H / 2;

    if (brandLogo) {
      const dims = brandLogo.scaleToFit(LOGO_MAX_W, LOGO_MAX_H);
      // Logo vertically centered in header
      pg.drawImage(brandLogo, {
        x: MARGIN,
        y: blockCenterY - dims.height / 2,
        width: dims.width,
        height: dims.height,
      });
      // Brand name to the right of logo, vertically centered
      pg.drawText(data.brand.name, {
        x: MARGIN + dims.width + 10,
        y: blockCenterY - 5,
        size: 13,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
    } else {
      pg.drawText(data.brand.name, {
        x: MARGIN,
        y: blockCenterY - 6,
        size: 16,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
    }

    // Separator rule
    pg.drawLine({
      start: { x: MARGIN, y: HEADER_RULE_Y },
      end: { x: PAGE_WIDTH - MARGIN, y: HEADER_RULE_Y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  };

  // ── drawFooter ──────────────────────────────────────────────────────────────
  const drawFooter = (pg: any, pageNum: number, totalPages: number) => {
    // Separator rule
    pg.drawLine({
      start: { x: MARGIN, y: FOOTER_RULE_Y },
      end: { x: PAGE_WIDTH - MARGIN, y: FOOTER_RULE_Y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Logo + brand name — left
    if (brandLogo) {
      const dims = brandLogo.scaleToFit(65, 20);
      pg.drawImage(brandLogo, {
        x: MARGIN,
        y: FOOTER_CONTENT_Y - dims.height / 2,
        width: dims.width,
        height: dims.height,
      });
      pg.drawText(data.brand.name, {
        x: MARGIN + dims.width + 8,
        y: FOOTER_CONTENT_Y - 5,
        size: 9,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
    } else {
      pg.drawText(data.brand.name, {
        x: MARGIN,
        y: FOOTER_CONTENT_Y - 5,
        size: 9,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
    }

    // Page number — right
    const pageNumberText = `Page ${pageNum} of ${totalPages}`;
    const pageNumberWidth = font.widthOfTextAtSize(pageNumberText, 9);
    pg.drawText(pageNumberText, {
      x: PAGE_WIDTH - MARGIN - pageNumberWidth,
      y: FOOTER_CONTENT_Y - 5,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    });
  };

  // ── Page management ─────────────────────────────────────────────────────────
  const allPages: any[] = [];
  const addPage = () => {
    const pg = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    allPages.push(pg);
    return pg;
  };

  let currentPage = addPage();
  let yPos = CONTENT_TOP - 25;

  // Title — centered, like original
  currentPage.drawText("Loan Account Statement", {
    x: 200,
    y: yPos,
    size: 14,
    font: boldFont,
  });
  yPos -= 40;

  // ── Customer Details (left) + Account Details (right) ──────────────────────
  currentPage.drawText("Customer Details", { x: MARGIN, y: yPos, size: 12, font: boldFont });
  currentPage.drawText("Account Details", { x: 350, y: yPos, size: 12, font: boldFont });
  yPos -= 25;

  // Left column
  let leftY = yPos;
  currentPage.drawText(`Name: ${data.user.name}`, { x: MARGIN, y: leftY, size: 10, font });
  leftY -= 18;
  const addressLines = wrapText(`Address: ${data.user.address}`, 50);
  addressLines.forEach((line, i) => {
    currentPage.drawText(line, { x: MARGIN, y: leftY - i * 18, size: 10, font });
  });
  leftY -= addressLines.length * 18;
  currentPage.drawText(`${data.user.city}, ${data.user.state}`, { x: MARGIN, y: leftY, size: 10, font });
  leftY -= 18;
  currentPage.drawText(`Mobile No: ${data.user.phoneNumber}`, { x: MARGIN, y: leftY, size: 10, font });
  leftY -= 18;
  currentPage.drawText(`Email Id: ${data.user.email}`, { x: MARGIN, y: leftY, size: 10, font });

  // Right column
  let rightY = yPos;
  currentPage.drawText("Account Type: Short Term Personal Loan", { x: 350, y: rightY, size: 10, font });
  rightY -= 18;
  currentPage.drawText(`Loan A/c No.: ${data.formattedLoanId}`, { x: 350, y: rightY, size: 10, font });
  rightY -= 18;
  currentPage.drawText("Currency: INR", { x: 350, y: rightY, size: 10, font });

  yPos = Math.min(leftY, rightY) - 35;

  // ── Statement Details ───────────────────────────────────────────────────────
  currentPage.drawText("Statement Details", { x: MARGIN, y: yPos, size: 12, font: boldFont });
  yPos -= 18;
  const disbursementDate = formatDate(data.loanDetails.disbursementDate);
  const dueDate = formatDate(data.loanDetails.dueDate);
  currentPage.drawText(`Statement Date: ${formatDate(new Date().toISOString())} 00:00hrs`, { x: MARGIN, y: yPos, size: 10, font });
  yPos -= 15;
  currentPage.drawText(`Statement Period: ${disbursementDate} to ${dueDate}`, { x: MARGIN, y: yPos, size: 10, font });

  // ── Loan Summary ────────────────────────────────────────────────────────────
  if (data.loanSummary) {
    yPos -= 30;
    currentPage.drawText("Loan Summary", { x: 250, y: yPos, size: 12, font: boldFont });
    yPos -= 20;

    const summaryData = [
      ["Sanction date", formatDate(data.loanSummary.sanctionDate), "Loan Type", "Short Term Loan"],
      ["Sanction loan amount", data.loanSummary.sanctionLoanAmount.toLocaleString(), "Current rate of interest", String(data.loanSummary.currentRateOfInterest || "0")],
      ["Disbursed Amount", data.loanSummary.disbursedAmount.toLocaleString(), "Balance loan tenure", `${data.loanSummary.balanceLoanTenureDays} Days`],
      ["Current instalment", data.loanSummary.currentInstallmentAmount.toLocaleString(), "Sanction loan tenure", `${data.loanSummary.sanctionLoanTenureDays} Days`],
      ["Total Deductions", data.loanSummary.totalDeductions.toLocaleString(), "Loan status", data.loanSummary.loanStatus],
      ["Processing Fee", data.loanSummary.processingFee.toLocaleString(), "Principal Due", Number(data.loanSummary.principalDue || 0).toFixed(2)],
      ["Total Interest Charges", data.loanSummary.totalInterestCharges.toLocaleString(), "Interest Due", Number(data.loanSummary.interestDue || 0).toFixed(2)],
      ["Total Taxes", Number(data.loanSummary.totalTaxes || 0).toFixed(2), "Penalty Due", Number(data.loanSummary.penaltyDue || 0).toFixed(2)],
      ["Annual Percentage Rate", Number(data.loanSummary.annualPercentageRate || 0).toFixed(2) + "%", "Total Due", Number(data.loanSummary.totalDue || 0).toFixed(2)],
      ["Total Principal Paid", data.loanSummary.totalPrincipalPaid.toLocaleString(), "Excess Amount", Number(data.loanSummary.excessAmount || 0).toFixed(2)],
      ["Repayment Mode", "Payment Gateway/Bank Transfer", "Total Interest Paid", data.loanSummary.totalInterestPaid.toLocaleString()],
    ];

    const rowH = 20;
    const col1X = MARGIN, col2X = 200, col3X = 330, col4X = 460;

    summaryData.forEach((row) => {
      if (yPos - rowH < CONTENT_BOTTOM) {
        currentPage = addPage();
        yPos = CONTENT_TOP;
        currentPage.drawText("Loan Summary (continued)", { x: 250, y: yPos, size: 12, font: boldFont });
        yPos -= 20;
      }
      currentPage.drawRectangle({
        x: col1X, y: yPos - rowH, width: TABLE_WIDTH, height: rowH,
        borderColor: rgb(0, 0, 0), borderWidth: 0.5,
      });
      [col2X, col3X, col4X].forEach(cx => {
        currentPage.drawLine({ start: { x: cx, y: yPos - rowH }, end: { x: cx, y: yPos }, thickness: 0.5, color: rgb(0, 0, 0) });
      });
      currentPage.drawText(row[0], { x: col1X + 5, y: yPos - 14, size: 8, font: boldFont });
      currentPage.drawText(row[1], { x: col2X + 5, y: yPos - 14, size: 8, font });
      currentPage.drawText(row[2], { x: col3X + 5, y: yPos - 14, size: 8, font: boldFont });
      currentPage.drawText(row[3], { x: col4X + 5, y: yPos - 14, size: 8, font });
      yPos -= rowH;
    });
  }

  // ── Transaction Details ─────────────────────────────────────────────────────
  yPos -= 30;
  if (yPos - 60 < CONTENT_BOTTOM) {
    currentPage = addPage();
    yPos = CONTENT_TOP;
  }
  currentPage.drawText("Transaction Details", { x: 250, y: yPos, size: 12, font: boldFont });
  yPos -= 25;

  // Column x positions
  const tDate    = MARGIN;       // Date
  const tTxnId   = MARGIN + 65;  // Transaction ID
  const tRemarks = MARGIN + 205; // Remarks
  const tAmount  = MARGIN + 345; // Amount
  const tBalance = MARGIN + 430; // Balance

  const LINE_H = 13;    // line height for wrapped text
  const ROW_PAD = 10;   // total vertical padding per row (split top/bottom)

  const drawTxnHeader = (pg: any, y: number): number => {
    pg.drawRectangle({ x: MARGIN, y: y - 20, width: TABLE_WIDTH, height: 20, borderColor: rgb(0, 0, 0), borderWidth: 1 });
    [tTxnId, tRemarks, tAmount, tBalance].forEach(cx => {
      pg.drawLine({ start: { x: cx, y: y - 20 }, end: { x: cx, y }, thickness: 1, color: rgb(0, 0, 0) });
    });
    pg.drawText("Date",           { x: tDate + 4,    y: y - 14, size: 9, font: boldFont });
    pg.drawText("Transaction Id", { x: tTxnId + 4,   y: y - 14, size: 9, font: boldFont });
    pg.drawText("Remarks",        { x: tRemarks + 4, y: y - 14, size: 9, font: boldFont });
    pg.drawText("Amount (Rs)",    { x: tAmount + 4,  y: y - 14, size: 9, font: boldFont });
    pg.drawText("Balance (Rs)",   { x: tBalance + 4, y: y - 14, size: 9, font: boldFont });
    return y - 20;
  };

  yPos = drawTxnHeader(currentPage, yPos);

  data.transactions.forEach((txn) => {
    const txnIdLines  = wrapText(txn.transactionId || "", 22);
    const remarksLines = wrapText(txn.remarks || "", 18);
    const maxLines = Math.max(txnIdLines.length, remarksLines.length, 1);
    const rowHeight = maxLines * LINE_H + ROW_PAD;

    if (yPos - rowHeight < CONTENT_BOTTOM) {
      currentPage = addPage();
      yPos = CONTENT_TOP;
      yPos = drawTxnHeader(currentPage, yPos);
    }

    // Row border
    currentPage.drawRectangle({
      x: MARGIN, y: yPos - rowHeight, width: TABLE_WIDTH, height: rowHeight,
      borderColor: rgb(0, 0, 0), borderWidth: 0.5,
    });

    // Column separators
    [tTxnId, tRemarks, tAmount, tBalance].forEach(cx => {
      currentPage.drawLine({
        start: { x: cx, y: yPos - rowHeight },
        end:   { x: cx, y: yPos },
        thickness: 0.5, color: rgb(0, 0, 0),
      });
    });

    // First line of text baseline — top-padded
    const textY = yPos - Math.floor(ROW_PAD / 2) - 9;

    currentPage.drawText(new Date(txn.date).toLocaleDateString(), { x: tDate + 4, y: textY, size: 8, font });

    txnIdLines.forEach((line, li) => {
      currentPage.drawText(line, { x: tTxnId + 4, y: textY - li * LINE_H, size: 8, font });
    });

    remarksLines.forEach((line, li) => {
      currentPage.drawText(line, { x: tRemarks + 4, y: textY - li * LINE_H, size: 8, font });
    });

    if (txn.amount != null) {
      const amtText = txn.type === "DEBIT"
        ? `${txn.amount.toLocaleString()} (D)`
        : `${txn.amount.toLocaleString()} (C)`;
      currentPage.drawText(amtText, { x: tAmount + 4, y: textY, size: 8, font });
    }

    currentPage.drawText(`Rs ${txn.balance.toLocaleString()} Dr`, { x: tBalance + 4, y: textY, size: 8, font });

    yPos -= rowHeight;
  });

  // ── Legend ──────────────────────────────────────────────────────────────────
  yPos -= 25;
  if (yPos - 55 < CONTENT_BOTTOM) {
    currentPage = addPage();
    yPos = CONTENT_TOP;
  }
  currentPage.drawText("Legend", { x: MARGIN, y: yPos, size: 10, font: boldFont });
  yPos -= 14;
  currentPage.drawText("(D)  Debit", { x: MARGIN, y: yPos, size: 9, font });
  yPos -= 13;
  currentPage.drawText("(C)  Credit", { x: MARGIN, y: yPos, size: 9, font });

  // ── Important Notes ─────────────────────────────────────────────────────────
  yPos -= 22;
  if (yPos - 70 < CONTENT_BOTTOM) {
    currentPage = addPage();
    yPos = CONTENT_TOP;
  }
  currentPage.drawText("Important Notes", { x: MARGIN, y: yPos, size: 10, font: boldFont });
  const notes = [
    "1. This statement is generated from system records as on the statement date.",
    "2. All EMI payments are subject to clearance and may reflect after one working day.",
    `3. For discrepancies or clarifications, please email ${data.brand.contactEmail || "info@company.com"}.`,
    "4. This is a computer generated statement and does not require any signature.",
  ];
  notes.forEach((note) => {
    yPos -= 15;
    if (yPos < CONTENT_BOTTOM) {
      currentPage = addPage();
      yPos = CONTENT_TOP;
    }
    currentPage.drawText(note, { x: MARGIN, y: yPos, size: 8, font });
  });

  // ── Stamp header + footer on every page ─────────────────────────────────────
  const totalPages = allPages.length;
  allPages.forEach((pg, i) => {
    drawHeader(pg);
    drawFooter(pg, i + 1, totalPages);
  });

  return await pdfDoc.save();
};