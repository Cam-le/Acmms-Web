import { useCallback, useMemo, useState } from "react";

/**
 * useTableSort — manage column-based sort state for tables.
 *
 * Usage:
 *   const sort = useTableSort(filteredWorkers, {
 *     dateJoined: { compare: (a, b) => a.dateJoined.localeCompare(b.dateJoined) },
 *     status:     { compare: (a, b) => statusOrder[a.status] - statusOrder[b.status] },
 *   });
 *
 *   <th onClick={() => sort.toggle("dateJoined")}>...</th>
 *   {sort.sortedItems.map(...)}
 */

export interface SortConfig<T> {
  /** Comparator — return negative for a<b, positive for a>b */
  compare: (a: T, b: T) => number;
}

export interface UseTableSortResult<T, K extends string> {
  sortedItems: T[];
  sortField: K | null;
  sortDirection: "asc" | "desc";
  /** Toggle direction if same field, else set field with asc */
  toggle: (field: K) => void;
  /** Set field + direction explicitly */
  set: (field: K | null, direction?: "asc" | "desc") => void;
}

export function useTableSort<T, K extends string>(
  items: T[],
  configs: Record<K, SortConfig<T>>,
): UseTableSortResult<T, K> {
  const [sortField, setSortField] = useState<K | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Note: toggle has `sortField` in its dep, so its reference changes when
  // sortField changes. This is intentional — avoids the React anti-pattern
  // of calling setState inside another setState's updater function.
  const toggle = useCallback(
    (field: K) => {
      if (sortField === field) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField],
  );

  const set = useCallback(
    (field: K | null, direction: "asc" | "desc" = "asc") => {
      setSortField(field);
      setSortDirection(direction);
    },
    [],
  );

  const sortedItems = useMemo(() => {
    if (!sortField) return items;
    const cfg = configs[sortField];
    if (!cfg) return items;
    const sign = sortDirection === "asc" ? 1 : -1;
    return [...items].sort((a, b) => sign * cfg.compare(a, b));
    // configs ref typically inline-fresh each render, but compare results
    // are stable; including configs in deps would re-sort every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sortField, sortDirection]);

  return { sortedItems, sortField, sortDirection, toggle, set };
}
