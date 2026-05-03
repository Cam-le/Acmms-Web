/**
 * Per-domain status → BadgeTone + display label mappings.
 *
 * Centralises status normalisation that was previously scattered across pages.
 * Each domain has 2 helpers: `xxxStatusTone()` and `xxxStatusLabel()`.
 *
 * Spec: FRONTEND_REFACTOR_PLAN.md §6.6
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
  return isActive(s) ? ACTIVE_TONE : INACTIVE_TONE;
}
export function iotStatusLabel(s: string | null | undefined): string {
  return isActive(s) ? "Hoạt động" : "Không hoạt động";
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
