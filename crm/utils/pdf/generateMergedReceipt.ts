import jsPDF from 'jspdf';
import { formatNumber } from '../formatNumber';

const toIndianWords = (num: number): string => {
  if (!num || isNaN(num) || num === 0) return 'zero only.';

  const convertBase = (n_val: number) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];

    const match = ('000000000' + Math.floor(n_val)).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!match) return '';
    let str = '';
    str += (Number(match[1]) !== 0) ? (a[Number(match[1])] || b[Number(match[1][0])] + a[Number(match[1][1])]) + 'Crore ' : '';
    str += (Number(match[2]) !== 0) ? (a[Number(match[2])] || b[Number(match[2][0])] + a[Number(match[2][1])]) + 'Lakh ' : '';
    str += (Number(match[3]) !== 0) ? (a[Number(match[3])] || b[Number(match[3][0])] + a[Number(match[3][1])]) + 'Thousand ' : '';
    str += (Number(match[4]) !== 0) ? (a[Number(match[4])] || b[Number(match[4][0])] + a[Number(match[4][1])]) + 'Hundred ' : '';
    str += (Number(match[5]) !== 0) ? ((str !== '') ? 'And ' : '') + (a[Number(match[5])] || b[Number(match[5][0])] + a[Number(match[5][1])]) : '';
    return str.trim();
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let result = convertBase(rupees);
  if (paise > 0) {
    if (result) result += ' And ';
    result += convertBase(paise) + ' Paise';
  }

  return (result || 'Zero') + ' Only.';
};

export const generateMergedReceipt = async (data: any, preview: boolean = false) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let y = 15;

  // Watermark / Logo
  const logoSrc = data.company_logo || '/DIDPL-LOGO.png';
  try {
    const watermarkImg = new Image();
    watermarkImg.src = logoSrc;
    await new Promise((resolve) => {
        watermarkImg.onload = resolve;
        watermarkImg.onerror = () => {
            console.warn("Failed to load logo image");
            resolve(null);
        };
    });
    doc.addImage(watermarkImg, 'PNG', pageWidth / 2 - 15, y, 30, 30);
    y += 38;
  } catch (e) {
    console.warn("Watermark logo missing", e);
    y += 10;
  }

  // Outer Border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Merged Payment Acknowledgement Receipt", pageWidth / 2, y, { align: "center" });
  y += 12;

  // Boxed Info Section
  doc.setLineWidth(0.2);

  // Date Row
  doc.rect(margin, y, contentWidth, 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const receiptDateStr = new Date().toLocaleDateString('en-GB');
  doc.text(`Date: ${receiptDateStr}`, margin + 2, y + 5.5);
  y += 8;

  // Client Name Row
  doc.rect(margin, y, contentWidth, 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const genderPrefix = data.gender === 'Male' ? 'Mr.' : data.gender === 'Female' ? 'Mrs.' : 'Mr./Mrs.';
  doc.text(`${genderPrefix} ${data.client_name || 'N/A'}`, margin + 2, y + 5.5);
  y += 8;

  // Address Row
  const addressText = data.residential_address || 'N/A';
  const locationParts = [];
  if (data.client_city) locationParts.push(data.client_city);
  if (data.client_state) locationParts.push(data.client_state);

  let line2 = locationParts.join(', ');
  if (data.client_pincode) {
    line2 += line2 ? ` - ${data.client_pincode}` : `Pincode: ${data.client_pincode}`;
  }
  
  const addrParts = [addressText];
  if (line2) addrParts.push(line2);

  const fullAddress = addrParts.join(', ').replace(/\n/g, ', ');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const labelWidth = doc.getTextWidth("Address: ");
  
  doc.setFont("helvetica", "normal");
  const addressLines = doc.splitTextToSize(fullAddress, contentWidth - 6 - labelWidth);
  const addressHeight = Math.max(12, addressLines.length * 6 + 6);

  doc.rect(margin, y, contentWidth, addressHeight);
  doc.setFont("helvetica", "bold");
  doc.text("Address:", margin + 2, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(addressLines, margin + 2 + labelWidth + 2, y + 6);
  y += addressHeight;

  // Payment Details Header Row
  doc.rect(margin, y, contentWidth, 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Payment Details", pageWidth / 2, y + 5.5, { align: "center" });
  y += 8;

  const plotTotal = Number(data.plot_payment_total) || 0;
  const legalTotal = Number(data.legal_fees_total) || 0;
  const grandTotal = plotTotal + legalTotal;

  // Payment Details Table - Row 1
  const wordsStr = toIndianWords(grandTotal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  
  const leftColWidth = contentWidth * 0.35;
  const rightColWidth = contentWidth * 0.65;
  const splitLineX = margin + leftColWidth;
  
  doc.setFont("helvetica", "normal");
  const wordsPrefixWidth = doc.getTextWidth("Rupees in words: ");
  doc.setFont("helvetica", "bold");
  const wordsLines = doc.splitTextToSize(wordsStr, rightColWidth - wordsPrefixWidth - 6);
  const row1Height = Math.max(20, wordsLines.length * 6 + 10);

  doc.rect(margin, y, contentWidth, row1Height);
  doc.line(splitLineX, y, splitLineX, y + row1Height);

  doc.setFont("helvetica", "normal");
  doc.text("Plot payment: ", margin + 2, y + 7);
  const pWidth = doc.getTextWidth("Plot payment: ");
  doc.setFont("helvetica", "bold");
  doc.text(`Rs.${formatNumber(plotTotal)}`, margin + 2 + pWidth, y + 7);

  doc.setFont("helvetica", "normal");
  doc.text("Legal fees: ", margin + 2, y + 14);
  const lWidth = doc.getTextWidth("Legal fees: ");
  doc.setFont("helvetica", "bold");
  doc.text(`Rs.${formatNumber(legalTotal)}`, margin + 2 + lWidth, y + 14);

  doc.setFont("helvetica", "normal");
  doc.text("Grand Total: ", splitLineX + 2, y + 7);
  const gWidth = doc.getTextWidth("Grand Total: ");
  doc.setFont("helvetica", "bold");
  doc.text(`Rs.${formatNumber(grandTotal)}`, splitLineX + 2 + gWidth, y + 7);

  doc.setFont("helvetica", "normal");
  doc.text("Rupees in words: ", splitLineX + 2, y + 14);
  doc.setFont("helvetica", "bold");
  doc.text(wordsLines, splitLineX + 2 + wordsPrefixWidth, y + 14);
  y += row1Height;

  // Payment Details Table - Row 2
  const row2Height = 15;
  doc.rect(margin, y, contentWidth, row2Height);
  const col2X = margin + (contentWidth * 0.45);
  const col3X = margin + (contentWidth * 0.75);
  doc.line(col2X, y, col2X, y + row2Height);
  doc.line(col3X, y, col3X, y + row2Height);

  doc.setFont("helvetica", "normal");
  doc.text("Cheque / Txn No. / Mode", margin + 2, y + 5);
  doc.setFont("helvetica", "bold");
  doc.text("Multiple (Merged)", margin + 2, y + 10);

  doc.setFont("helvetica", "normal");
  doc.text("Date: ", col2X + 2, y + 5);
  const dateLabelWidth = doc.getTextWidth("Date: ");
  doc.setFont("helvetica", "bold");
  doc.text(receiptDateStr, col2X + 2 + dateLabelWidth, y + 5);
  y += row2Height;

  y += 15;

  // Contact Section — dynamic company info
  const companyDisplayName = data.company_display_name || data.company_name || 'Dholera Infra Development Pvt.Ltd';
  const companyPhone = data.company_phone || '(+91) 8866909600';
  const companyEmail = data.company_email || 'info@didpl.com';
  const companyWebsite = data.company_email
    ? `www.${data.company_email.split('@')[1] || 'didpl.com'}`
    : 'www.didpl.com';

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("For Any Further Queries Contact:", pageWidth / 2, y, { align: "center" });
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(companyDisplayName, pageWidth / 2, y, { align: "center" });
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  
  const contactText1 = `Tele: ${companyPhone} | Email: `;
  const emailText = companyEmail;
  const contactText2 = ` | ${companyWebsite}`;
  
  const w1 = doc.getTextWidth(contactText1);
  const wEmail = doc.getTextWidth(emailText);
  const w2 = doc.getTextWidth(contactText2);
  const totalW = w1 + wEmail + w2;
  
  let currentX = (pageWidth - totalW) / 2;
  
  doc.text(contactText1, currentX, y);
  currentX += w1;
  doc.setTextColor(0, 51, 153);
  doc.text(emailText, currentX, y);
  doc.setTextColor(0, 0, 0);
  currentX += wEmail;
  doc.text(contactText2, currentX, y);
  
  y += 12;

  // Terms & Conditions
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Terms & Conditions:", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const terms = [
    "1. THIS RECEIPT DOESN'T CREAT OR ESTABLISH ANY RIGHT OF TITLE INTEREST ON THE PLOT/PROPERTY.",
    "2. ANY PAYMENT RECEIVED WILL BE TREATED AS NON REFUNDABLE DEPOSIT.",
    "3. IN CASE OF DISPUTES, ALL RIGHT ARE RESERVED BY THE MANAGEMENT.",
    "4. CHEQUE RETURN CHARGES SHALL BE LEVIED RS.500 PER CHEQUE PER TRANSACTION.",
    "5. THE COMPANY RESERVES ALL RIGHT TO FORFEIT ENTIRE AMOUNT SO PAID, IN CASE OF",
    "CANCELLATION/TERMINATION OF BOOKING.",
    "6. ANY DISPUTE ARISES SHALL BE SUBJECT TO VADODARA JURISDICTION ONLY.",
    "7. CHEQUES ARE SUBJECT TO REALISATION.",
    "8. FINAL RECEIPT WILL BE ISSUED AFTER VERIFIED BY ACCOUNT DEPARTMENT.",
    "9. THIS IS TEMPORARY ACKNOWLEDGEMENT TILL VERIFICATION.",
    "10. THIS IS COMPUTER GENERATED RECEIPT REFLECTING ENTRY WITHOUT VERIFICATION, SIGNATURE IS NOT",
    "REQUIRED."
  ];

  terms.forEach((term) => {
    doc.text(term, margin, y);
    y += 4.5;
  });

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Thank You", pageWidth / 2, y, { align: "center" });

  const fileName = `Merged_Receipt_${new Date().getTime()}.pdf`;

  if (preview) {
    return { doc, fileName };
  }

  doc.save(fileName);
  return { doc, fileName };
};
