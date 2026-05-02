import type { ElementType, ReactNode } from "react";

/**
 * StatusBadge — canonical pill-shaped badge for status displays.
 *
 * Replaces:
 *   - 4 local `getStatusBadgeColor()` definitions (Farm/Crops/Workers/IoT/Plots)
 *   - ~25 inline `<span className="px-2.5 py-1 rounded-full ...">` patterns
 *
 * Spec: FRONTEND_REFACTOR_PLAN.md §5.5
 *
 * Per-domain status→tone mapping lives in src/app/utils/status.ts so this
 * component stays domain-agnostic.
 */

export type BadgeTone =
  | "success"
  | "warning"
  | "warning-2" // alt warning (lighter, e.g. "pending review")
  | "danger"
  | "info"
  | "neutral";

export type BadgeSize = "sm" | "md";

export interface StatusBadgeProps {
  /** Display text — typically Vietnamese */
  label: string;
  tone: BadgeTone;
  size?: BadgeSize;
  /** Optional Lucide icon component to show before label */
  icon?: ElementType;
  /** Layout-only overrides (margin, etc) — DO NOT use to override colors */
  className?: string;
  /** Optional extra content after label */
  children?: ReactNode;
}

const TONE_CLASS: Record<BadgeTone, string> = {
  success: "bg-status-success-bg text-status-success-fg",
  warning: "bg-status-warning-bg text-status-warning-fg",
  "warning-2": "bg-status-warning-bg-2 text-status-warning-fg-2",
  danger: "bg-status-danger-bg text-status-danger-fg",
  info: "bg-status-info-bg text-status-info-fg",
  neutral: "bg-status-neutral-bg text-status-neutral-fg",
};

const SIZE_CLASS: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
};

const ICON_SIZE_CLASS: Record<BadgeSize, string> = {
  sm: "w-3 h-3",
  md: "w-3 h-3",
};

export function StatusBadge({
  label,
  tone,
  size = "md",
  icon: Icon,
  className = "",
  children,
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill font-medium whitespace-nowrap ${TONE_CLASS[tone]} ${SIZE_CLASS[size]} ${className}`}
    >
      {Icon && <Icon className={ICON_SIZE_CLASS[size]} />}
      {label}
      {children}
    </span>
  );
}
