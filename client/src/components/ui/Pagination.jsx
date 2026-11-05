import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button.jsx';

export const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange
}) => {
  if (totalPages <= 1) return null;

  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-slate-100 text-xs text-slate-500 bg-white">
      <div>
        Showing <strong className="text-[#0B1120] font-bold">{startItem}</strong> to{' '}
        <strong className="text-[#0B1120] font-bold">{endItem}</strong> of{' '}
        <strong className="text-[#0B1120] font-bold">{totalItems}</strong> entries
      </div>

      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          icon={ChevronLeft}
        >
          Previous
        </Button>

        <span className="px-2.5 py-1 rounded-md bg-[#FAF5E8] border border-[#D4AF37]/30 font-bold text-[#0B1120] text-xs">
          Page {currentPage} of {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
