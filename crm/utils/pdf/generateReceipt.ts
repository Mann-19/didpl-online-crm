import jsPDF from 'jspdf';
import { formatNumber } from '../formatNumber';

const toIndianWords = (num: number) => {
  if (!num || isNaN(num) || num === 0) return 'zero only.';

  const convertBase = (n_val: number): string => {
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

export const generateReceipt = async (data: any, preview: boolean = false) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let y = 15;

  // --- WATERMARK (Background) ---
  try {
    const watermarkImg = new Image();
    watermarkImg.src = '/DIDPL-LOGO.png'; // Ensure this exists in public folder
    await new Promise((resolve, reject) => {
        watermarkImg.onload = resolve;
        watermarkImg.onerror = () => {
            console.warn("Failed to load logo image");
            resolve(null);
        };
    });

    // Add watermark in center with low opacity
    const wmSize = 80;
    const wmX = (pageWidth - wmSize) / 2;
    const wmY = (pageHeight - wmSize) / 2;
    doc.saveGraphicsState();
    // @ts-ignore
    doc.setGState(new doc.GState({ opacity: 0.1 }));
    doc.addImage(watermarkImg, 'PNG', wmX, wmY, wmSize, wmSize);
    doc.restoreGraphicsState();
    
    // --- LOGO ---
    doc.addImage(watermarkImg, 'PNG', pageWidth / 2 - 15, y, 30, 30);
    y += 38;
  } catch (e) {
    console.warn("Watermark/Logo missing");
    y += 10;
  }

  // --- OUTER BORDER ---
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // --- TITLE ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Payment Acknowledgement Receipt", pageWidth / 2, y, { align: "center" });
  y += 12;

  // --- BOXED INFO SECTION ---
  doc.setLineWidth(0.2);

  // Date Row
  doc.rect(margin, y, contentWidth, 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  
  const receiptDateStr = data.receipt_date
    ? new Date(data.receipt_date).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');

  doc.text(`Date: ${receiptDateStr}`, margin + 2, y + 5.5);

  const paymentDateStr = data.payment_date || data.date
    ? new Date(data.payment_date || data.date).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');
  y += 8;

  // Client Name Row
  doc.rect(margin, y, contentWidth, 8);
  const genderPrefix = data.gender === 'Male' ? 'Mr.' : data.gender === 'Female' ? 'Mrs.' : 'Mr./Mrs.';
  doc.text(`${genderPrefix} ${data.client_name || 'N/A'}`, margin + 2, y + 5.5);
  y += 8;

  // Address Row - Stacked format
  const addressText = data.client_address || 'N/A';
  const city = data.client_city || '';
  const state = data.client_state || '';
  const pincode = data.client_pincode || '';

  const addrParts = [addressText];
  const locationParts = [];
  if (city) locationParts.push(city);
  if (state) locationParts.push(state);

  let line2 = locationParts.join(', ');
  if (pincode) {
    line2 += line2 ? ` - ${pincode}` : `Pincode: ${pincode}`;
  }

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

  // --- PAYMENT DETAILS TABLE ---
  const tableStartY = y;

  // First Table Row (Amount & Words)
  const pureAmount = Number(String(data.amount || 0).replace(/,/g, ''));
  const amountStr = `Amount Rs.${formatNumber(pureAmount)}`;
  const wordsStr = `Rupees in words: ${toIndianWords(pureAmount)}`;
  const wordsLines = doc.splitTextToSize(wordsStr, contentWidth / 2 - 4);
  const row1Height = Math.max(12, wordsLines.length * 5 + 4);

  // Left Cell (Amount in Words)
  doc.rect(margin, y, contentWidth / 2, row1Height);
  doc.setFont("helvetica", "normal");
  doc.text(wordsLines, margin + 2, y + 6);

  // Right Cell (Amount Rs.)
  doc.rect(margin + contentWidth / 2, y, contentWidth / 2, row1Height);
  doc.setFont("helvetica", "bold");
  doc.text(amountStr, margin + contentWidth / 2 + 2, y + 6);

  y += row1Height;

  // Second Table Row (Mode & Project/Plot Details)
  const modeText = `By ${data.payment_mode || 'N/A'}${data.transaction_id ? ` (Ref: ${data.transaction_id})` : ''} on ${paymentDateStr}`;
  const modeLines = doc.splitTextToSize(modeText, contentWidth / 2 - 4);
  
  const projectPlotText = `Towards: Project ${data.project_name || 'N/A'}, Plot No: ${data.plot_number || 'N/A'}`;
  const projectPlotLines = doc.splitTextToSize(projectPlotText, contentWidth / 2 - 4);

  const row2Height = Math.max(12, Math.max(modeLines.length, projectPlotLines.length) * 5 + 4);

  // Left Cell (Mode)
  doc.rect(margin, y, contentWidth / 2, row2Height);
  doc.setFont("helvetica", "normal");
  doc.text(modeLines, margin + 2, y + 6);

  // Right Cell (Towards Project/Plot)
  doc.rect(margin + contentWidth / 2, y, contentWidth / 2, row2Height);
  doc.text(projectPlotLines, margin + contentWidth / 2 + 2, y + 6);

  y += row2Height;

  // --- FOOTER & SIGNATURE ---
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Subject to Realization of Cheque", margin, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Authorized Signatory", pageWidth - margin, y, { align: "right" });
  
  y += 6;
  doc.text("Dholera Infra Development Pvt. Ltd", pageWidth - margin, y, { align: "right" });

  const fileName = `Receipt_${(data.receipt_no || data.id || 'Payment')}.pdf`;

  if (preview) {
    return { doc, fileName };
  } else {
    doc.save(fileName);
    return { doc, fileName };
  }
};
