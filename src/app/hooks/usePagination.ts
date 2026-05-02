import { useCallback, useMemo, useState } from "react";

/**
 * usePagination — manage page state for a list, with auto-clamp and reset.
 *
 * Replaces 7 inline patterns:
 *   const [page, setPage] = useState(1);
 *   const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
 *   const currentPage = Math.min(page, totalPages);
 *   const pagedItems = filtered.slice(...);
 *
 * Spec: FRONTEND_REFACTOR_PLAN.md §6.1
 *
 * Notes:
 *   - `page` auto-clamps between 1 and totalPages (so when filter shrinks
 *     the list, you don't get stuck on a page that no longer exists).
 *   - Call `reset()` when filter/search changes — it sets page to 1.
 *   - Use `setPage` for explicit page navigation (from <Pagination>).
 */

export interface UsePaginationResult<T> {
  /** Current page, 1-indexed and clamped to [1, totalPages] */
  page: number;
  /** Total number of pages — at least 1 */
  totalPages: number;
  /** Items on current page */
  pagedItems: T[];
  /** Set page directly (will be clamped) */
  setPage: (page: number) => void;
  /** Reset to page 1 — call when filter/search changes */
  reset: () => void;
}

export function usePagination<T>(
  items: T[],
  pageSize: number,
): UsePaginationResult<T> {
  const [rawPage, setRawPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, rawPage), totalPages);

  const pagedItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  const reset = useCallback(() => setRawPage(1), []);

  const setPage = useCallback((p: number) => {
    setRawPage(p);
  }, []);

  return { page, totalPages, pagedItems, setPage, reset };
}
