import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export interface PaginationProps {
  /** 1-indexed current page */
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Show "X-Y / Z item" label on the left */
  showLabel?: boolean;
  /** Total item count, used with showLabel */
  totalItems?: number;
  /** Page size, used with showLabel */
  pageSize?: number;
  /** Item word in Vietnamese — e.g. "báo cáo", "công việc". Default "mục". */
  itemLabel?: string;
}

/**
 * Compute visible page numbers with ellipsis.
 * Total <= 7: show all. Otherwise:
 *   1 ... (cur-1) cur (cur+1) ... last
 */
function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showLabel = false,
  totalItems,
  pageSize,
  itemLabel = "mục",
}: PaginationProps) {
  // Don't render if only 1 page and no label requested
  if (totalPages <= 1 && !showLabel) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  const labelText =
    showLabel && totalItems != null && pageSize
      ? totalItems <= pageSize
        ? `${totalItems} ${itemLabel}`
        : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, totalItems)} / ${totalItems} ${itemLabel}`
      : null;

  return (
    <div className="flex items-center justify-between gap-2 px-1 py-2">
      {labelText ? (
        <p className="text-xs text-ink-500">{labelText}</p>
      ) : (
        <span /> /* spacer for justify-between */
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <PageBtn
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            ariaLabel="Trang trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </PageBtn>

          {pages.map((p, i) =>
            p === "..." ? (
              <span
                key={`ellipsis-${i}`}
                className="w-8 h-8 flex items-center justify-center text-ink-400 text-xs"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === currentPage ? "page" : undefined}
                className={
                  p === currentPage
                    ? "w-8 h-8 text-sm rounded-btn bg-primary text-primary-fg font-semibold"
                    : "w-8 h-8 text-sm rounded-btn text-ink-500 hover:bg-surface-subtle transition-colors"
                }
              >
                {p}
              </button>
            ),
          )}

          <PageBtn
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            ariaLabel="Trang sau"
          >
            <ChevronRight className="w-4 h-4" />
          </PageBtn>
        </div>
      )}
    </div>
  );
}

// ─── Internal ─────────────────────────────────────────────────────────────

function PageBtn({
  onClick,
  disabled,
  children,
  ariaLabel,
}: {
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="w-8 h-8 flex items-center justify-center rounded-btn text-ink-500 hover:bg-surface-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
