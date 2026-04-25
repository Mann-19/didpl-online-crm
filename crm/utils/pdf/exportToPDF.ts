import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportConfig {
  title: string;
  filename: string;
  data: any[];
  headers: { label: string; key: string | ((row: any) => string) }[];
}

export function exportToPDF({ title, filename, data, headers }: ExportConfig) {
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

  autoTable(doc, {
    startY: 40,
    head: head,
    body: body,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' }, // Emerald-500
    styles: { fontSize: 9, cellPadding: 3 },
    alternateRowStyles: { fillColor: [249, 250, 251] }, // Gray-50
  });

  doc.save(`${filename}.pdf`);
}
