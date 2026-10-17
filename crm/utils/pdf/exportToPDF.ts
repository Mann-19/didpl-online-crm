import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportConfig {
  title: string;
  filename: string;
  data: any[];
  headers: { label: string; key: string | ((row: any) => string) }[];
  /** Optional total amount to display as a summary footer row (e.g. sum of payments) */
  totalAmount?: number;
}

export function exportToPDF({ title, filename, data, headers, totalAmount }: ExportConfig) {
  if (!data || data.length === 0) {
    alert("No data available to export");
    return;
  }

  const doc = new jsPDF('landscape'); // Landscape is usually better for tables
  
  // Header Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Dholera Infra Development Pvt. Ltd.", 14, 20);
  
  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text(title, 14, 28);
  
  // Generated Date
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 34);

  // Table Data
  const head = [headers.map(h => h.label)];
  const body = data.map(row => 
    headers.map(h => {
      if (typeof h.key === 'function') {
        return h.key(row) || '';
      }
      return row[h.key] || '';
    })
  );

  // Build footer row if totalAmount is provided
  const colCount = headers.length;
  const foot = totalAmount !== undefined
    ? [[
        {
          content: `${data.length} record${data.length !== 1 ? 's' : ''} | Total Payment: Rs. ${totalAmount.toLocaleString('en-IN')}`,
          colSpan: colCount,
          styles: {
            halign: 'right' as const,
            fontStyle: 'bold' as const,
            fillColor: [6, 95, 70] as [number, number, number],
            textColor: 255,
            fontSize: 10,
          }
        }
      ]]
    : undefined;

  autoTable(doc, {
    startY: 40,
    head: head,
    body: body,
    foot: foot,
    showFoot: 'lastPage',
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' }, // Emerald-500
    styles: { fontSize: 9, cellPadding: 3 },
    alternateRowStyles: { fillColor: [249, 250, 251] }, // Gray-50
  });

  doc.save(`${filename}.pdf`);
}

