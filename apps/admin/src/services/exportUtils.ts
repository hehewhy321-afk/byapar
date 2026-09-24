/**
 * CSV Export Utilities for Admin Console
 * Provides one-click data export for any admin table.
 */

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
}

/**
 * Export an array of data objects to a CSV file and trigger a download.
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns: ExportColumn[]
): void {
  if (data.length === 0) return;

  // Header row
  const header = columns.map((c) => `"${c.label}"`).join(',');

  // Data rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const raw = row[col.key];
        const val = col.format ? col.format(raw) : String(raw ?? '');
        // Escape double quotes inside values
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel compatibility
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format a number as NPR currency string for export.
 */
export function formatNprExport(val: number): string {
  return `NPR ${val.toLocaleString('en-NP', { maximumFractionDigits: 2 })}`;
}
