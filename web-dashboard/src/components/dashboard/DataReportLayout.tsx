import { EmptyState } from '@/components/shared/DataDisplay';
import { formatDate, formatDateTime, formatINR, formatPercent, truncate } from '@/lib/utils';
import { isValidElement, type ReactNode } from 'react';

export interface ReportColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  format?: 'text' | 'currency' | 'date' | 'datetime' | 'percent' | 'truncate';
  className?: string;
}

interface DataReportLayoutProps {
  title: string;
  subtitle?: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  emptyMessage?: string;
  /** Optional CSV download (same auth as matching API route). */
  exportHref?: string;
  exportLabel?: string;
}

function cellValue(row: Record<string, unknown>, column: ReportColumn): ReactNode {
  const value = row[column.key];
  if (value === null || value === undefined) return '-';
  if (isValidElement(value)) return value;

  switch (column.format) {
    case 'currency':
      return typeof value === 'number' ? formatINR(value) : '-';
    case 'date':
      return typeof value === 'string' ? formatDate(value) : '-';
    case 'datetime':
      return typeof value === 'string' ? formatDateTime(value) : '-';
    case 'percent':
      return typeof value === 'number' ? formatPercent(value, value % 1 === 0 ? 0 : 1) : '-';
    case 'truncate':
      return typeof value === 'string' ? truncate(value, 16) : String(value);
    default:
      break;
  }

  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function DataReportLayout({
  title,
  subtitle,
  columns,
  rows,
  emptyMessage = 'No records found for the current scope.',
  exportHref,
  exportLabel = 'Download CSV',
}: DataReportLayoutProps) {
  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-headline font-black text-primary">{title}</h1>
          {subtitle && <p className="mt-1 max-w-3xl text-sm text-slate-500">{subtitle}</p>}
        </div>
        {exportHref && rows.length > 0 && (
          <a
            href={exportHref}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            download
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
            {exportLabel}
          </a>
        )}
      </header>
      {rows.length === 0 ? (
        <EmptyState icon="table_rows" message={emptyMessage} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="data-table min-w-[640px] w-full text-left">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={
                      column.align === 'right'
                        ? 'text-right'
                        : column.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                    }
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={[
                        column.align === 'right'
                          ? 'font-mono text-right text-xs'
                          : column.align === 'center'
                            ? 'text-center text-xs'
                            : 'text-xs',
                        column.className || '',
                      ].join(' ')}
                    >
                      {cellValue(row, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
