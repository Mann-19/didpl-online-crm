export function exportToCSV(data: any[], filename: string) {
  if (!data || !data.length) {
    alert("No data available to export");
    return;
  }

  // Extract headers
  const headers = Object.keys(data[0]);

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        let cell = row[header];
        if (cell === null || cell === undefined) cell = '';
        // Escape quotes and wrap in quotes to handle commas within text
        cell = String(cell).replace(/"/g, '""');
        return `"${cell}"`;
      }).join(',')
    )
  ].join('\n');

  // Create a Blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
