import React from 'react';
import { Skeleton } from './Skeleton.jsx';
import { EmptyState } from './EmptyState.jsx';

export const Table = ({
  columns = [],
  data = [],
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There is no data to display currently.',
  emptyIcon,
  className = '',
  tableClassName = '',
  onRowClick
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4 bg-white rounded-xl border border-slate-200">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="py-10 bg-white rounded-xl border border-slate-200">
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
        />
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto bg-white rounded-xl border border-slate-200/90 shadow-subtle ${className}`}>
      <table className={`w-full text-left text-xs border-collapse ${tableClassName}`}>
        <thead>
          <tr className="border-b-2 border-[#D4AF37]/40 bg-[#0B1120] text-[#D4AF37] font-bold uppercase tracking-wider text-[10px]">
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                className={`py-3 px-4 select-none ${
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left'
                } ${col.headerClassName || ''}`}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-800">
          {data.map((row, rowIdx) => (
            <tr
              key={row.id || rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              className={`transition-colors ${
                onRowClick
                  ? 'cursor-pointer hover:bg-[#FAF5E8]/60 active:bg-[#FAF5E8]'
                  : 'hover:bg-[#FAF5E8]/40'
              }`}
            >
              {columns.map((col, colIdx) => (
                <td
                  key={col.key || colIdx}
                  className={`py-3 px-4 ${
                    col.align === 'right'
                      ? 'text-right font-mono'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  } ${col.className || ''}`}
                >
                  {col.render ? col.render(row[col.key], row, rowIdx) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
