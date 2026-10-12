'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1 && !onPerPageChange) return null;

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className={cn('flex items-center justify-between gap-4 flex-wrap', className)}>
      <div className="flex items-center gap-3 text-xs text-muted">
        <span>
          {start}–{end} sur {totalItems}
        </span>
        {onPerPageChange && (
          <select
            value={perPage}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            className="rounded-md border border-border bg-white px-2 py-1 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <NavButton onClick={() => onPageChange(1)} disabled={page === 1} title="Première page">
            <ChevronsLeft size={14} />
          </NavButton>
          <NavButton onClick={() => onPageChange(page - 1)} disabled={page === 1} title="Page précédente">
            <ChevronLeft size={14} />
          </NavButton>

          {getPageNumbers().map((p, i) =>
            p === '...' ? (
              <span key={`e${i}`} className="px-1.5 text-xs text-muted/50">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={cn(
                  'min-w-[28px] h-7 rounded-md text-xs font-medium transition-colors',
                  p === page
                    ? 'bg-navy text-parchment shadow-sm'
                    : 'text-muted hover:bg-parchment-dark/50 hover:text-navy'
                )}
              >
                {p}
              </button>
            )
          )}

          <NavButton onClick={() => onPageChange(page + 1)} disabled={page === totalPages} title="Page suivante">
            <ChevronRight size={14} />
          </NavButton>
          <NavButton onClick={() => onPageChange(totalPages)} disabled={page === totalPages} title="Dernière page">
            <ChevronsRight size={14} />
          </NavButton>
        </div>
      )}
    </div>
  );
}

function NavButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'h-7 w-7 rounded-md flex items-center justify-center transition-colors text-muted',
        disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-parchment-dark/50 hover:text-navy'
      )}
    >
      {children}
    </button>
  );
}
