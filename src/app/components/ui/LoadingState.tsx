import { Spinner } from "./Spinner";

export interface LoadingStateProps {
  /** Optional message under spinner. Default Vietnamese "Đang tải...". */
  message?: string;
  /** "block" = py-16 centered. "inline" = inline-flex. Default "block". */
  variant?: "block" | "inline";
  /** Hide the message text — show only spinner */
  hideMessage?: boolean;
}

export function LoadingState({
  message = "Đang tải...",
  variant = "block",
  hideMessage = false,
}: LoadingStateProps) {
  if (variant === "inline") {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-ink-500">
        <Spinner size="sm" />
        {!hideMessage && <span>{message}</span>}
      </span>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-500">
      <Spinner size="md" />
      {!hideMessage && <span>{message}</span>}
    </div>
  );
}
