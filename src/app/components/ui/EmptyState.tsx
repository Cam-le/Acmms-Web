import type { ElementType, ReactNode } from "react";

export type EmptyStateSize = "sm" | "md" | "lg";

export interface EmptyStateProps {
  /** Optional Lucide icon shown above message */
  icon?: ElementType;
  /** Optional bold title above message */
  title?: string;
  /** Main message text */
  message: string;
  /** Optional CTA — e.g. <Button>Tạo mới</Button> */
  action?: ReactNode;
  /** Vertical padding — default "lg" (py-16) */
  size?: EmptyStateSize;
}

const SIZE_CLASS: Record<EmptyStateSize, string> = {
  sm: "py-8",
  md: "py-12",
  lg: "py-16",
};

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  size = "lg",
}: EmptyStateProps) {
  return (
    <div className={`text-center ${SIZE_CLASS[size]}`}>
      {Icon && (
        <Icon
          className="w-10 h-10 text-ink-300 mx-auto mb-3"
          strokeWidth={1.5}
        />
      )}
      {title && (
        <p className="text-sm font-semibold text-ink-700 mb-1">{title}</p>
      )}
      <p className="text-sm text-ink-500">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
