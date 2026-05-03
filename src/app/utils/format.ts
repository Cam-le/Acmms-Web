/**
 * Formatting utilities for dates, currency, and time.
 *
 * Replaces local definitions in DashboardPage, IoTPage, PlotsPage, SeasonsPage,
 * AdvisoryPage, BillingPage. See FRONTEND_REFACTOR_PLAN.md §6.5.
 *
 * Two families of date functions:
 *   - locale-aware: formatDate, formatDateTime, formatMonth — for server
 *     timestamps that should be displayed in user's locale (createdAt, etc).
 *   - raw-parse:    isoDate, isoTime, formatDateTimeRaw — for wall-clock
 *     times the user entered (task start/end times). Backend stores these
 *     as UTC strings but the digits are literal local times the user
 *     entered, so we read raw digits instead of letting Date apply tz shift.
 *
 * DON'T "simplify" raw-parse functions to use new Date().toLocaleString() —
 * they're intentionally raw. See TasksPage.tsx for the use case.
 */

// ─── Locale-aware (for server timestamps) ─────────────────────────────────

/**
 * Format ISO date string to vi-VN short date.
 * "2026-04-13T07:00:00Z" → "13/04/2026"
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * Format ISO datetime to vi-VN with time.
 * "2026-04-13T07:00:00Z" → "13/04/2026 14:00" (browser-tz adjusted)
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * Format ISO date to "MM/YYYY".
 * "2026-04-13T..." → "04/2026"
 */
export function formatMonth(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${mm}/${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

/**
 * Format ISO date to "Tháng M / YYYY" (longer form for billing UIs).
 * "2026-04-13T..." → "Tháng 4 / 2026"
 */
export function formatMonthLong(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return `Tháng ${d.getMonth() + 1} / ${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

// ─── Currency ─────────────────────────────────────────────────────────────

/**
 * Format a VND amount with thousand separators.
 * 1_500_000 → "1.500.000 ₫"
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

// ─── Raw-parse (for wall-clock times entered by user) ─────────────────────

/**
 * Extract HH:MM directly from an ISO datetime, no timezone shift.
 * Backend stores user-entered local times as "Z" UTC strings but the digits
 * are literal local times. Reading raw avoids browser-tz adjustment.
 *
 * "2026-04-13T07:00:00.000Z" → "07:00"
 */
export function isoTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = iso.indexOf("T");
  if (t === -1) return "";
  return iso.slice(t + 1, t + 6);
}

/**
 * Extract DD/MM/YYYY directly from an ISO datetime, no timezone shift.
 * "2026-04-13T07:00:00.000Z" → "13/04/2026"
 */
export function isoDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const ymd = iso.slice(0, 10).split("-");
  if (ymd.length !== 3) return "";
  const [y, m, d] = ymd;
  return `${d}/${m}/${y}`;
}

/**
 * Combine isoDate + isoTime — raw-parse equivalent of formatDateTime.
 * "2026-04-13T07:00:00.000Z" → "13/04/2026 07:00"
 */
export function formatDateTimeRaw(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = isoDate(iso);
  const time = isoTime(iso);
  if (!date) return "—";
  return time ? `${date} ${time}` : date;
}

// ─── Misc ─────────────────────────────────────────────────────────────────

/**
 * Convert ISO date to <input type="month"> value.
 * "2026-04-01T00:00:00" → "2026-04"
 */
export function toMonthInputValue(iso: string): string {
  return iso.slice(0, 7);
}