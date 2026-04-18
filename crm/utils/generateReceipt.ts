import jsPDF from 'jspdf';
import { formatNumber } from './formatNumber';

const toIndianWords = (num: number): string => {
  if (!num || isNaN(num) || num === 0) return 'zero only.';

  const convertBase = (n_val: number) => {
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty ', 'thirty ', 'forty ', 'fifty ', 'sixty ', 'seventy ', 'eighty ', 'ninety '];

    const match = ('000000000' + Math.floor(n_val)).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!match) return '';
    let str = '';
    str += (Number(match[1]) !== 0) ? (a[Number(match[1])] || b[Number(match[1][0])] + a[Number(match[1][1])]) + 'crore ' : '';
    str += (Number(match[2]) !== 0) ? (a[Number(match[2])] || b[Number(match[2][0])] + a[Number(match[2][1])]) + 'lac ' : '';
    str += (Number(match[3]) !== 0) ? (a[Number(match[3])] || b[Number(match[3][0])] + a[Number(match[3][1])]) + 'thousand ' : '';
    str += (Number(match[4]) !== 0) ? (a[Number(match[4])] || b[Number(match[4][0])] + a[Number(match[4][1])]) + 'hundred ' : '';
    str += (Number(match[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(match[5])] || b[Number(match[5][0])] + a[Number(match[5][1])]) : '';
    return str.trim();
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let result = convertBase(rupees);
  if (paise > 0) {
    if (result) result += ' and ';
    result += convertBase(paise) + 'paise';
  }

  return (result || 'zero') + ' only.';
};

export interface ReceiptData {
  receipt_date?: string;
  date?: string;
  client_name?: string;
  gender?: string;
  client_address?: string;
  client_city?: string;
  client_state?: string;
  client_pincode?: string;
  amount: number;
  transaction_id?: string;
  payment_mode?: string;
}

export const generateReceipt = (data: ReceiptData, preview = false) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let y = 15;

  // Watermark
  try {
    const wmSize = 80;
    const wmX = (pageWidth - wmSize) / 2;
    const wmY = (pageHeight - wmSize) / 2;
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
    doc.addImage('/DIDPL-LOGO.png', 'PNG', wmX, wmY, wmSize, wmSize);
    doc.restoreGraphicsState();
  } catch (e) {
    console.warn("Watermark logo missing", e);
  }

  // Outer Border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Logo
  try {
    doc.addImage('/DIDPL-LOGO.png', 'PNG', pageWidth / 2 - 15, y, 30, 30);
    y += 38;
  } catch (e) {
    y += 10;
  }

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Payment Acknowledgement Receipt", pageWidth / 2, y, { align: "center" });
  y += 12;

  // Boxed Info Section
  doc.setLineWidth(0.2);

  // Date Row
  doc.rect(margin, y, contentWidth, 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const receiptDateStr = data.receipt_date ? new Date(data.receipt_date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
  doc.text(`Date: ${receiptDateStr}`, margin + 2, y + 5.5);
  y += 8;

  // Client Name Row
  doc.rect(margin, y, contentWidth, 8);
  const genderPrefix = data.gender === 'Male' ? 'Mr.' : data.gender === 'Female' ? 'Mrs.' : 'Mr./Mrs.';
  doc.text(`${genderPrefix} ${data.client_name || 'N/A'}`, margin + 2, y + 5.5);
  y += 8;

  // Address Row
  const addressText = data.client_address || 'N/A';
  const locationParts = [];
  if (data.client_city) locationParts.push(data.client_city);
  if (data.client_state) locationParts.push(data.client_state);

  let line2 = locationParts.join(', ');
  if (data.client_pincode) {
    line2 += line2 ? ` - ${data.client_pincode}` : `Pincode: ${data.client_pincode}`;
  }
  
  const addrParts = [addressText];
  if (line2) addrParts.push(line2);

  const fullAddress = `Address : ${addrParts.join('\n')}`;
  const addressLines = doc.splitTextToSize(fullAddress, contentWidth - 4);
  const addressHeight = Math.max(12, addressLines.length * 6 + 6);

  doc.rect(margin, y, contentWidth, addressHeight);
  doc.setFont("helvetica", "normal");
  doc.text(addressLines, margin + 2, y + 6);
  y += addressHeight;

  // Payment Details Header Row
  doc.rect(margin, y, contentWidth, 8);
  doc.setFont("helvetica", "bold");
  doc.text("Payment Details", pageWidth / 2, y + 5.5, { align: "center" });
  y += 8;

  // Payment Details Table - Row 1
  const pureAmount = data.amount || 0;
  const amountStr = `Amount Rs.${formatNumber(pureAmount)}`;
  const wordsStr = `Rupees in words: ${toIndianWords(pureAmount)}`;
  const wordsLines = doc.splitTextToSize(wordsStr, contentWidth / 2 - 4);
  const row1Height = Math.max(12, wordsLines.length * 5 + 4);

  doc.rect(margin, y, contentWidth, row1Height);
  doc.line(pageWidth / 2 + 10, y, pageWidth / 2 + 10, y + row1Height);

  doc.text(amountStr, margin + 2, y + 7);
  doc.setFont("helvetica", "normal");
  doc.text(wordsLines, pageWidth / 2 + 12, y + 7);
  y += row1Height;

  // Payment Details Table - Row 2
  const row2Height = 15;
  doc.rect(margin, y, contentWidth, row2Height);
  const col2X = margin + (contentWidth * 0.45);
  const col3X = margin + (contentWidth * 0.75);
  doc.line(col2X, y, col2X, y + row2Height);
  doc.line(col3X, y, col3X, y + row2Height);

  doc.setFont("helvetica", "bold");
  doc.text("Cheque / Txn No. UPI", margin + 2, y + 5);
  doc.setFont("helvetica", "normal");
  doc.text(data.transaction_id || "N/A", margin + 2, y + 10);

  doc.setFont("helvetica", "bold");
  doc.text("Date:", col2X + 2, y + 5);
  doc.setFont("helvetica", "normal");
  const paymentDateStr = data.date ? new Date(data.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
  doc.text(paymentDateStr, col2X + 15, y + 5);

  doc.setFont("helvetica", "bold");
  doc.text("Bank Name:", col3X + 2, y + 5);
  doc.setFont("helvetica", "normal");
  doc.text("SBI", col3X + 25, y + 5);
  y += row2Height;

  // Payment Details Table - Row 3
  doc.rect(margin, y, contentWidth, 8);
  doc.setFont("helvetica", "bold");
  doc.text(`Payment Mode: ${(data.payment_mode || "UPI").toUpperCase()}`, margin + 2, y + 5.5);
  y += 15;

  // Contact Section
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("For Any Further Queries Contact:", pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 51, 153);
  doc.text("Dholera Infra Development Pvt.Ltd", pageWidth / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Tele: (+91) 8866909600 | Email: info@didpl.com | www.didpl.com", pageWidth / 2, y, { align: "center" });
  y += 8;

  // Terms & Conditions
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("Terms & Conditions:", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const terms = [
    "1. THIS RECEIPT DOESN'T CREATE OR ESTABLISH ANY RIGHT OF TITLE INTEREST ON THE PLOT/PROPERTY.",
    "2. ANY PAYMENT RECEIVED WILL BE TREATED AS NON REFUNDABLE DEPOSIT.",
    "3. IN CASE OF DISPUTES, ALL RIGHT ARE RESERVED BY THE MANAGEMENT.",
    "4. CHEQUE RETURN CHARGES SHALL BE LEVIED RS.500 PER CHEQUE PER TRANSACTION.",
    "5. THE COMPANY RESERVES ALL RIGHT TO FORFEIT ENTIRE AMOUNT SO PAID, IN CASE OF CANCELLATION/TERMINATION OF BOOKING.",
    "6. ANY DISPUTE ARISES SHALL BE SUBJECT TO VADODARA JURISDICTION ONLY.",
    "7. CHEQUES ARE SUBJECT TO REALISATION.",
    "8. FINAL RECEIPT WILL BE ISSUED AFTER VERIFIED BY ACCOUNT DEPARTMENT.",
    "9. THIS IS TEMPORARY ACKNOWLEDGEMENT TILL VERIFICATION.",
    "10. THIS IS COMPUTER GENERATED RECEIPT REFLECTING ENTRY WITHOUT VERIFICATION, SIGNATURE IS NOT REQUIRED."
  ];

  terms.forEach((term) => {
    const lines = doc.splitTextToSize(term, contentWidth - 4);
    doc.text(lines, margin, y);
    y += lines.length * 3.5;
  });

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  y += 40
  doc.setFontSize(25);
  doc.text("Thank You", pageWidth / 2, y, { align: "center" });

  const fileName = `Receipt_${(data.client_name || 'Client').replace(/\s+/g, '_')}_${receiptDateStr.replace(/\//g, '-')}.pdf`;

  if (preview) {
    return { doc, fileName };
  }

  doc.save(fileName);
};
