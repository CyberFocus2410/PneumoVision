import React from 'react';

/**
 * DataTable Component
 * Data-dense clinical audit and access registry table adhering to PneumoVision tokens.
 */
export function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  variant = 'light',
  dense = false,
  emptyMessage = 'No records registered in ledger state.',
  onRowClick,
  className = '',
}) {
  const isDark = variant === 'pacs' || variant === 'dark';

  const tableWrapperClasses = isDark
    ? 'border border-dicom-border bg-dicom-surface text-dicom-text-primary'
    : 'border border-border-grid bg-surface-card text-text-primary';

  const headerRowClasses = isDark
    ? 'bg-dicom-canvas text-dicom-text-secondary border-b border-dicom-border'
    : 'bg-surface-nested text-text-secondary border-b border-border-grid';

  const bodyRowClasses = isDark
    ? 'hover:bg-dicom-canvas/60 transition-colors border-b border-dicom-border/60'
    : 'hover:bg-surface-base transition-colors border-b border-border-grid/70';

  const cellPadding = dense ? 'py-2 px-space-sm' : 'py-3 px-space-md';

  return (
    <div className={`w-full overflow-x-auto rounded-lg shadow-sm ${tableWrapperClasses} ${className}`}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className={`${headerRowClasses} font-headline-sm text-[11px] uppercase tracking-wider`}>
            {columns.map((col) => {
              const alignClass =
                col.align === 'right'
                  ? 'text-right'
                  : col.align === 'center'
                  ? 'text-center'
                  : 'text-left';
              return (
                <th
                  key={col.key || col.label}
                  style={col.width ? { width: col.width } : undefined}
                  className={`${cellPadding} font-semibold ${alignClass} ${col.headerClassName || ''}`}
                >
                  {col.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className={`divide-y ${isDark ? 'divide-dicom-border/50' : 'divide-border-grid/50'} font-body-md text-body-md`}>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-8 text-center text-text-muted font-body-sm text-body-sm italic"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => {
              const rowKey = row[keyField] || rowIndex;
              return (
                <tr
                  key={rowKey}
                  onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
                  className={`${bodyRowClasses} ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => {
                    const alignClass =
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left';

                    const cellContent = col.render
                      ? col.render(row[col.key], row, rowIndex)
                      : row[col.key];

                    return (
                      <td
                        key={`${rowKey}-${col.key}`}
                        className={`${cellPadding} ${alignClass} ${col.className || ''}`}
                      >
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
