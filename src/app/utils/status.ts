/**
 * Per-domain status → BadgeTone + display label mappings.
 *
 * Centralises status normalisation that was previously scattered across pages.
 * Each domain has 2 helpers: `xxxStatusTone()` and `xxxStatusLabel()`.
 *
 * Convention: backend stores English enum values ("Active"/"Inactive",
 * "SENT_TO_OWNER", etc). This file produces (a) a tone for visual styling
 * and (b) a Vietnamese label for display. Pages should use these — never
 * hardcode tone or label per-row.
 */

import type { BadgeTone } from "../components/ui/StatusBadge";

// ─── Generic helpers ──────────────────────────────────────────────────────

/**
 * Normalise an enum-like string for case-insensitive comparison.
 * Defensive against API inconsistency — backend may return "Active",
 * "active", "ACTIVE", "đang sử dụng", etc.
 */
export function normaliseEnum(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

// ─── Active / Inactive (Farm, Crop, Worker, IoT, Plot, Bed, Soil) ─────────

const ACTIVE_TONE: BadgeTone = "success";
const INACTIVE_TONE: BadgeTone = "danger";

function isActive(s: string | null | undefined): boolean {
  const n = normaliseEnum(s);
  return n === "active" || n === "đang sử dụng" || n === "hoạt động";
}

export function farmStatusTone(s: string | null | undefined): BadgeTone {
  return isActive(s) ? ACTIVE_TONE : INACTIVE_TONE;
}
export function farmStatusLabel(s: string | null | undefined): string {
  return isActive(s) ? "Hoạt động" : "Không hoạt động";
}

export function cropStatusTone(s: string | null | undefined): BadgeTone {
  return isActive(s) ? ACTIVE_TONE : INACTIVE_TONE;
}
export function cropStatusLabel(s: string | null | undefined): string {
  return isActive(s) ? "Đang sử dụng" : "Không sử dụng";
}

export function workerStatusTone(s: string | null | undefined): BadgeTone {
  return isActive(s) ? ACTIVE_TONE : INACTIVE_TONE;
}
export function workerStatusLabel(s: string | null | undefined): string {
  return isActive(s) ? "Hoạt động" : "Không hoạt động";
}

export function iotStatusTone(s: string | null | undefined): BadgeTone {
  switch (normaliseEnum(s)) {
    case "active":
      return "success";
    case "maintenance":
      return "warning";
    default:
      return "danger";
  }
}
export function iotStatusLabel(s: string | null | undefined): string {
  switch (normaliseEnum(s)) {
    case "active":
      return "Hoạt động";
    case "maintenance":
      return "Bảo trì";
    default:
      return "Không hoạt động";
  }
}

export function plotStatusTone(s: string | null | undefined): BadgeTone {
  return isActive(s) ? ACTIVE_TONE : INACTIVE_TONE;
}
export function plotStatusLabel(s: string | null | undefined): string {
  return isActive(s) ? "Hoạt động" : "Không hoạt động";
}

export function bedStatusTone(s: string | null | undefined): BadgeTone {
  return isActive(s) ? ACTIVE_TONE : INACTIVE_TONE;
}
export function bedStatusLabel(s: string | null | undefined): string {
  return isActive(s) ? "Hoạt động" : "Không hoạt động";
}

// ─── Report status (Advisory) ─────────────────────────────────────────────
// Backend values: SENT_TO_OWNER, ASSIGNED_FOR_DIAGNOSIS, DIAGNOSED, CLOSED

export function reportStatusTone(s: string | null | undefined): BadgeTone {
  switch (normaliseEnum(s)) {
    case "sent_to_owner":
      return "warning";
    case "assigned_for_diagnosis":
      return "info";
    case "diagnosed":
      return "success";
    case "closed":
      return "neutral";
    default:
      return "neutral";
  }
}

export function reportStatusLabel(s: string | null | undefined): string {
  switch (normaliseEnum(s)) {
    case "sent_to_owner":
      return "Chờ xử lý";
    case "assigned_for_diagnosis":
      return "Đã gửi chuyên gia";
    case "diagnosed":
      return "Đã chẩn đoán";
    case "closed":
      return "Đã đóng";
    default:
      return s ?? "—";
  }
}

// ─── Severity (AI diagnosis) ──────────────────────────────────────────────
// Backend values: LOW, MEDIUM, HIGH, CRITICAL

export function severityTone(s: string | null | undefined): BadgeTone {
  switch (normaliseEnum(s)) {
    case "low":
      return "success";
    case "medium":
      return "warning";
    case "high":
      return "warning-2";
    case "critical":
      return "danger";
    default:
      return "neutral";
  }
}

export function severityLabel(s: string | null | undefined): string {
  switch (normaliseEnum(s)) {
    case "low":
      return "Nhẹ";
    case "medium":
      return "Trung bình";
    case "high":
      return "Nặng";
    case "critical":
      return "Rất nghiêm trọng";
    default:
      return s ?? "—";
  }
}

// ─── Task status ──────────────────────────────────────────────────────────
// Backend values: Pending, Completed (per TasksPage filter options)

export function taskStatusTone(s: string | null | undefined): BadgeTone {
  switch (normaliseEnum(s)) {
    case "completed":
    case "done":
      return "success";
    case "pending":
    case "in_progress":
    case "active":
      return "info";
    case "overdue":
      return "danger";
    default:
      return "neutral";
  }
}

export function taskStatusLabel(s: string | null | undefined): string {
  switch (normaliseEnum(s)) {
    case "completed":
    case "done":
      return "Đã hoàn thành";
    case "pending":
    case "in_progress":
    case "active":
      return "Đang làm";
    case "overdue":
      return "Quá hạn";
    default:
      return s ?? "—";
  }
}

// ─── Bill / payment status ────────────────────────────────────────────────

export function billStatusTone(paid: boolean): BadgeTone {
  return paid ? "success" : "warning";
}

export function billStatusLabel(paid: boolean): string {
  return paid ? "Đã thanh toán" : "Chờ thanh toán";
}

// ─── Contract status ──────────────────────────────────────────────────────
// Backend values: "active", "terminated"

export function contractStatusTone(s: string | null | undefined): BadgeTone {
  return normaliseEnum(s) === "active" ? "success" : "neutral";
}

export function contractStatusLabel(s: string | null | undefined): string {
  return normaliseEnum(s) === "active" ? "Đang hiệu lực" : "Đã kết thúc";
}

// ─── Pending payment status ───────────────────────────────────────────────
// Derived from PendingPaymentItem.isDue + daysOverdue fields.

export function pendingPaymentStatusTone(isDue: boolean): BadgeTone {
  return isDue ? "danger" : "warning";
}

export function pendingPaymentStatusLabel(
  isDue: boolean,
  daysOverdue?: number,
): string {
  if (isDue) {
    return daysOverdue != null ? `Quá hạn ${daysOverdue} ngày` : "Quá hạn";
  }
  return "Chờ thanh toán";
}

// ─── Season status ────────────────────────────────────────────────────────
// Backend values (per SeasonsPage): Planned, On-Going, Harvested, Closed

export function seasonStatusTone(s: string | null | undefined): BadgeTone {
  switch (normaliseEnum(s)) {
    case "planned":
    case "lên kế hoạch":
      return "info";
    case "on-going":
    case "ongoing":
    case "đang canh tác":
      return "success";
    case "harvested":
    case "đã thu hoạch":
      return "warning";
    case "closed":
    case "đã kết thúc":
      return "neutral";
    default:
      return "neutral";
  }
}

export function seasonStatusLabel(s: string | null | undefined): string {
  switch (normaliseEnum(s)) {
    case "planned":
    case "lên kế hoạch":
      return "Lên kế hoạch";
    case "on-going":
    case "ongoing":
    case "đang canh tác":
      return "Đang canh tác";
    case "harvested":
    case "đã thu hoạch":
      return "Đã thu hoạch";
    case "closed":
    case "đã kết thúc":
      return "Đã kết thúc";
    default:
      return s ?? "—";
  }
}

// ─── Harvest status ───────────────────────────────────────────────────────
// Backend values: planned, growing, harvesting, completed, cancelled

export function harvestStatusTone(s: string | null | undefined): BadgeTone {
  switch (normaliseEnum(s)) {
    case "planned":
      return "neutral";
    case "growing":
      return "info";
    case "harvesting":
      return "warning";
    case "completed":
      return "success";
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}

export function harvestStatusLabel(s: string | null | undefined): string {
  switch (normaliseEnum(s)) {
    case "planned":
      return "Lên kế hoạch";
    case "growing":
      return "Đang trồng";
    case "harvesting":
      return "Đang thu hoạch";
    case "completed":
      return "Đã thu hoạch";
    case "cancelled":
      return "Đã hủy";
    default:
      return s ?? "—";
  }
}

// ─── Severity bar colour (for progress-bar visuals) ──────────────────────

/**
 * Tailwind bg+text classes for an inline severity chip (non-StatusBadge).
 * Use when you need raw class strings rather than a tone-based component.
 */
export function severityBadgeColor(s: string | null | undefined): string {
  switch (normaliseEnum(s)) {
    case "low":
      return "bg-status-success-bg text-status-success-fg";
    case "medium":
      return "bg-status-warning-bg text-status-warning-fg";
    case "high":
      return "bg-[#ffedd5] text-[#9a3412]";
    case "critical":
      return "bg-status-danger-bg text-status-danger-fg";
    default:
      return "bg-status-neutral-bg text-status-neutral-fg";
  }
}

/**
 * Tailwind bg class for the severity progress bar fill.
 * Companion to severityTone / severityLabel.
 */
export function severityBarColor(s: string | null | undefined): string {
  switch (normaliseEnum(s)) {
    case "low":
      return "bg-status-success-fg";
    case "medium":
      return "bg-status-warning-fg";
    case "high":
      return "bg-[#ea580c]";
    case "critical":
      return "bg-status-danger-fg";
    default:
      return "bg-ink-400";
  }
}

// ─── Report type ──────────────────────────────────────────────────────────
// Backend values: DISEASE, PEST, ENVIRONMENT, IRRIGATION, NUTRITION,
//                 MANUAL, IOT_ALERT, Diseases, OTHER
// Note: icons are imported here so AdvisoryPage doesn't need its own mapping.

import {
  Stethoscope,
  AlertTriangle,
  Wind,
  Droplets,
  Sprout,
  ClipboardList,
  Cpu,
  FileText,
  type LucideIcon,
} from "lucide-react";

interface ReportTypeConfig {
  label: string;
  icon: LucideIcon;
  /** Tailwind bg+text classes for the badge chip */
  color: string;
}

const REPORT_TYPE_MAP: Record<string, ReportTypeConfig> = {
  DISEASE: {
    label: "Báo cáo bệnh",
    icon: Stethoscope,
    color: "bg-status-danger-bg text-status-danger-fg",
  },
  Diseases: {
    label: "Báo cáo bệnh",
    icon: Stethoscope,
    color: "bg-status-danger-bg text-status-danger-fg",
  },
  PEST: {
    label: "Sâu bệnh",
    icon: AlertTriangle,
    color: "bg-[#fff7ed] text-[#92400e]",
  },
  ENVIRONMENT: {
    label: "Vấn đề môi trường",
    icon: Wind,
    color: "bg-[#eff6ff] text-status-info-fg",
  },
  IRRIGATION: {
    label: "Tưới tiêu",
    icon: Droplets,
    color: "bg-[#f0f9ff] text-[#0369a1]",
  },
  NUTRITION: {
    label: "Thiếu dinh dưỡng",
    icon: Sprout,
    color: "bg-[#f0fdf4] text-status-success-fg",
  },
  MANUAL: {
    label: "Báo cáo thủ công",
    icon: ClipboardList,
    color: "bg-surface-alt text-ink-700",
  },
  IOT_ALERT: {
    label: "Báo cáo tự động từ IoT",
    icon: Cpu,
    color: "bg-[#faf5ff] text-[#6b21a8]",
  },
  OTHER: {
    label: "Báo cáo khác",
    icon: FileText,
    color: "bg-surface-alt text-ink-700",
  },
};

const REPORT_TYPE_FALLBACK: ReportTypeConfig = {
  label: "",
  icon: FileText,
  color: "bg-surface-alt text-ink-700",
};

function getReportTypeConfig(s: string | null | undefined): ReportTypeConfig {
  if (!s) return REPORT_TYPE_FALLBACK;
  return REPORT_TYPE_MAP[s] ?? { ...REPORT_TYPE_FALLBACK, label: s };
}

export function reportTypeLabel(s: string | null | undefined): string {
  return getReportTypeConfig(s).label || (s ?? "—");
}

export function reportTypeIcon(s: string | null | undefined): LucideIcon {
  return getReportTypeConfig(s).icon;
}

export function reportTypeColor(s: string | null | undefined): string {
  return getReportTypeConfig(s).color;
}

// ─── Soil compatibility ───────────────────────────────────────────────────
// Backend values (per CropsPage): high/medium/low or good/average/poor

export function soilCompatibilityTone(s: string | null | undefined): BadgeTone {
  const n = normaliseEnum(s);
  if (n === "high" || n === "good") return "success";
  if (n === "medium" || n === "average") return "warning";
  return "danger";
}

export function soilCompatibilityLabel(s: string | null | undefined): string {
  const n = normaliseEnum(s);
  if (n === "high" || n === "good") return "Cao";
  if (n === "medium" || n === "average") return "Trung bình";
  return "Thấp";
}

// ─── Form select option arrays ────────────────────────────────────────────
// Single source of truth for status dropdowns across all pages.
// Import these instead of writing inline { value, label } literals so that
// changing a Vietnamese label in this file propagates everywhere automatically.

export const PLOT_STATUS_OPTIONS = [
  { value: "Active", label: plotStatusLabel("Active") },
  { value: "Inactive", label: plotStatusLabel("Inactive") },
] as const;

export const BED_STATUS_OPTIONS = [
  { value: "Active", label: bedStatusLabel("Active") },
  { value: "Inactive", label: bedStatusLabel("Inactive") },
] as const;

export const IOT_STATUS_OPTIONS = [
  { value: "Active", label: iotStatusLabel("Active") },
  { value: "Inactive", label: iotStatusLabel("Inactive") },
  { value: "Maintenance", label: iotStatusLabel("Maintenance") },
] as const;
