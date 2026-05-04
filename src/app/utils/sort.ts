/**
 * Sort helpers for bed/plot names.
 * Logic:
 * Bed names follow patterns like "Luống 02_Vuông 01_Tây Nam" or "A-05".
 * We extract all numeric tokens left-to-right, then sort lexicographically
 * over the number arrays. This handles multi-level naming correctly:
 *   "Luống 02_Vuông 01"  → [2, 1]
 *   "Luống 09_Vuông 01"  → [9, 1]
 *   "Luống 10_Vuông 01"  → [10, 1]
 *   "A-05"                → [5]
 *   "noNumberHere"        → []
 *
 * For names with no numbers, fall back to locale string compare.
 */

/**
 * Extract all numeric tokens from a bed/plot name, in segment order.
 *
 * @example
 *   bedSortTokens("Luống 02_Vuông 01_Tây Nam") // [2, 1]
 *   bedSortTokens("A-05")                        // [5]
 *   bedSortTokens("plotX")                       // []
 */
export function bedSortTokens(name: string): number[] {
  // Normalise separators to spaces, then tokenise.
  const tokens = name.replace(/[_\-]/g, " ").split(/\s+/);
  return tokens
    .map((t) => (t.match(/^\d+$/) ? parseInt(t, 10) : null))
    .filter((n): n is number => n !== null);
}

/**
 * Compare two numeric token arrays lexicographically.
 * Shorter arrays sort before longer ones at the divergence point.
 */
export function compareTokenArrays(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? Infinity;
    const bv = b[i] ?? Infinity;
    if (av !== bv) return av - bv;
  }
  return 0;
}

/**
 * Compare two bed names by their numeric token sequences.
 * Falls back to locale (vi) string compare if both have no tokens.
 */
export function compareBedNames(a: string, b: string): number {
  const ta = bedSortTokens(a);
  const tb = bedSortTokens(b);
  if (ta.length === 0 && tb.length === 0) {
    return a.localeCompare(b, "vi");
  }
  if (ta.length === 0) return 1;
  if (tb.length === 0) return -1;
  return compareTokenArrays(ta, tb);
}

/**
 * Sort bed items by name only (numeric tokens, then locale fallback).
 * Use this when items are already grouped by area, or when there's no area.
 */
export function sortBedsByName<T extends { name: string }>(beds: T[]): T[] {
  return [...beds].sort((a, b) => compareBedNames(a.name, b.name));
}

/**
 * Sort bed items: primary by area (alphabetical, vi), secondary by bed name.
 * Use this when items span multiple areas (vuông).
 */
export function sortBedsByAreaThenName<
  T extends { name: string; area: string },
>(beds: T[]): T[] {
  return [...beds].sort((a, b) => {
    const areaCmp = a.area.localeCompare(b.area, "vi");
    if (areaCmp !== 0) return areaCmp;
    return compareBedNames(a.name, b.name);
  });
}

/**
 * Convenience: sort items by `bedName` field (TasksPage shape).
 * Replaces TasksPage local sortBeds() at TasksPage.tsx:74.
 */
export function sortBedsByBedName<T extends { bedName: string }>(
  beds: T[],
): T[] {
  return [...beds].sort((a, b) => compareBedNames(a.bedName, b.bedName));
}
