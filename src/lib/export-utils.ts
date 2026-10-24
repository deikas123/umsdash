import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// CSV Export
export function exportToCSV(data: Record<string, unknown>[], filename: string, columns: { key: string; header: string }[]) {
  const headers = columns.map(c => c.header);
  const rows = data.map(item => 
    columns.map(c => {
      const value = item[c.key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    })
  );
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

// PDF Export
export function exportToPDF(
  data: Record<string, unknown>[], 
  filename: string, 
  columns: { key: string; header: string }[],
  title: string
) {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
  
  // Prepare table data
  const headers = columns.map(c => c.header);
  const rows = data.map(item => 
    columns.map(c => {
      const value = item[c.key];
      if (value === null || value === undefined) return '-';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    })
  );
  
  // Generate table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 35,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  });
  
  doc.save(`${filename}.pdf`);
}

// Excel Export
export function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
  columns: { key: string; header: string }[]
) {
  const rows = data.map(item =>
    Object.fromEntries(columns.map(c => [c.header, item[c.key] ?? '']))
  );
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// Helper function to download blob
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Document export columns
export const documentExportColumns = [
  { key: 'title', header: 'Title' },
  { key: 'customer_name', header: 'Customer' },
  { key: 'category_name', header: 'Category' },
  { key: 'status', header: 'Status' },
  { key: 'file_type', header: 'File Type' },
  { key: 'created_at', header: 'Created At' },
];

// Audit log export columns
export const auditLogExportColumns = [
  { key: 'created_at', header: 'Timestamp' },
  { key: 'user_name', header: 'User' },
  { key: 'user_role', header: 'Role' },
  { key: 'action', header: 'Action' },
  { key: 'entity_type', header: 'Entity Type' },
  { key: 'entity_id', header: 'Entity ID' },
  { key: 'ip_address', header: 'IP' },
  { key: 'details', header: 'Details' },
];

// Activity feed export columns (aliases audit_logs shape)
export const activityLogExportColumns = auditLogExportColumns;
