import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";

/**
 * Pagination — page number navigator with prev/next buttons.
 * Behavior:
 *   - Always renders (even when totalPages <= 1).
 *   - Uses ellipsis ("...") when totalPages > 7 to avoid overwhelming users with too many page buttons.
 *   - Shows "Trang X / Y" label and a jump-to-page input on the right.
 *
 */

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
  const [jumpValue, setJumpValue] = useState("");

  const safeTotalPages = Math.max(1, totalPages);

  const pages = getPageNumbers(currentPage, safeTotalPages);

  const labelText =
    showLabel && totalItems != null && pageSize
      ? totalItems <= pageSize
        ? `${totalItems} ${itemLabel}`
        : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, totalItems)} / ${totalItems} ${itemLabel}`
      : null;

  function handleJump() {
    const parsed = parseInt(jumpValue, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= safeTotalPages) {
      onPageChange(parsed);
    }
    setJumpValue("");
  }

  function handleJumpKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleJump();
  }

  return (
    <div className="flex items-center justify-between gap-2 px-1 py-2 flex-wrap">
      {/* Left: item label */}
      {labelText ? (
        <p className="text-xs text-ink-500">{labelText}</p>
      ) : (
        <span />
      )}

      {/* Center: page buttons */}
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
          onClick={() =>
            onPageChange(Math.min(safeTotalPages, currentPage + 1))
          }
          disabled={currentPage === safeTotalPages}
          ariaLabel="Trang sau"
        >
          <ChevronRight className="w-4 h-4" />
        </PageBtn>
      </div>

      {/* Right: page X / Y + jump input */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-500 whitespace-nowrap">
          Trang {currentPage} / {safeTotalPages}
        </span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={safeTotalPages}
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value)}
            onKeyDown={handleJumpKeyDown}
            placeholder="Đến"
            className="w-14 h-8 text-xs text-center rounded-btn border border-border bg-surface px-1 text-ink-700 placeholder:text-ink-400 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="button"
            onClick={handleJump}
            className="h-8 px-2 text-xs rounded-btn bg-surface border border-border text-ink-600 hover:bg-surface-subtle transition-colors"
          >
            Đi
          </button>
        </div>
      </div>
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
