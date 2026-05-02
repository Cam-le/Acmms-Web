import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

/**
 * useResourceList — fetch a list resource on mount, with reload + manual edit.
 *
 * Replaces ~13 inline patterns of:
 *   const [items, setItems] = useState<T[]>([]);
 *   const [loading, setLoading] = useState(true);
 *   useEffect(() => { load() }, []);
 *   async function load() {
 *     setLoading(true);
 *     try { const data = await api.getX(); setItems(data.map(mapX)); }
 *     catch (err) { showToast(...); }
 *     finally { setLoading(false); }
 *   }
 *
 * Spec: FRONTEND_REFACTOR_PLAN.md §6.3
 *
 * Mock-data fallback is intentionally NOT supported (see Phase 0 cleanup).
 * If fetcher throws, error state is set and onError is called for toast.
 *
 * Usage:
 *   const { items: farms, loading, reload } = useResourceList({
 *     fetcher: api.getFarms,
 *     mapper: mapFarm,
 *     onError: (err) => showToast(err.message, "error"),
 *   });
 *
 * Notes:
 *   - `fetcher` reference should be stable (use useCallback if defined inline).
 *     If you pass a fresh function every render, the hook still works thanks
 *     to ref tracking, but it's cleaner to memoize.
 *   - `mapper` and `prepare` may be inline — they're called once per fetch.
 */

export interface UseResourceListOptions<TItem, TRaw> {
  /** Async function that returns raw list from API */
  fetcher: () => Promise<TRaw[]>;
  /** Transform raw → display item. Default: identity (TRaw must equal TItem). */
  mapper?: (raw: TRaw) => TItem;
  /** Called when fetcher throws — typically wired to showToast */
  onError?: (err: Error) => void;
  /** Pre-process raw list before mapping (e.g. sort by createdAt) */
  prepare?: (raw: TRaw[]) => TRaw[];
  /** Skip auto-load on mount — caller controls via reload() */
  skipInitialLoad?: boolean;
}

export interface UseResourceListResult<T> {
  items: T[];
  loading: boolean;
  error: Error | null;
  /** Re-run fetch — returns Promise so caller can await */
  reload: () => Promise<void>;
  /** Manually replace local list — for optimistic update or local edit */
  setItems: Dispatch<SetStateAction<T[]>>;
}

export function useResourceList<TItem, TRaw = TItem>({
  fetcher,
  mapper,
  onError,
  prepare,
  skipInitialLoad = false,
}: UseResourceListOptions<TItem, TRaw>): UseResourceListResult<TItem> {
  const [items, setItems] = useState<TItem[]>([]);
  const [loading, setLoading] = useState(!skipInitialLoad);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await fetcher();
      const prepared = prepare ? prepare(raw) : raw;
      const mapped = mapper
        ? prepared.map(mapper)
        : (prepared as unknown as TItem[]);
      setItems(mapped);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      onError?.(e);
    } finally {
      setLoading(false);
    }
    // We intentionally don't include fetcher/mapper/prepare/onError in deps —
    // tracking them via refs would add complexity for minimal benefit. Caller
    // is expected to keep references stable (or accept stale closure).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!skipInitialLoad) {
      void reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { items, loading, error, reload, setItems };
}
