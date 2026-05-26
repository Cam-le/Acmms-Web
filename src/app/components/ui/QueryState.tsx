import type { ReactNode } from "react";
import { LoadingState } from "./LoadingState";
import { EmptyState } from "./EmptyState";
import { Button } from "./Button";
import { AlertCircle } from "lucide-react";

/**
 * QueryState — universal loading/error shell for TanStack Query results.
 *
 * Handles the three states every data-fetching block needs:
 *   loading  → <LoadingState>
 *   error    → <EmptyState> with error message + built-in retry button
 *   ready    → renders children
 *
 * Empty-data ("no results") is intentionally NOT handled here — each page
 * renders its own EmptyState inside children since the message, icon, and
 * action (e.g. "Thêm mới" CTA) vary per page.
 *
 * The `query` prop accepts any object with the TanStack Query shape:
 *   { isLoading, isError, isFetching, error, refetch }
 * This keeps the component generic — no direct import of TanStack types needed.
 *
 * loadingMessage — passed through to <LoadingState>. Default "Đang tải..."
 * errorTitle     — bold title line in the error state. Default "Không thể tải dữ liệu"
 * retryLabel     — retry button text. Default "Thử lại"
 */

export interface QueryLike {
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
}

export interface QueryStateProps {
  query: QueryLike;
  children: ReactNode;
  /** Message shown under the spinner. Default "Đang tải..." */
  loadingMessage?: string;
  /** Bold title in the error card. Default "Không thể tải dữ liệu" */
  errorTitle?: string;
  /** Retry button label. Default "Thử lại" */
  retryLabel?: string;
}

export function QueryState({
  query,
  children,
  loadingMessage = "Đang tải...",
  errorTitle = "Không thể tải dữ liệu",
  retryLabel = "Thử lại",
}: QueryStateProps) {
  if (query.isLoading) {
    return <LoadingState message={loadingMessage} />;
  }

  if (query.isError) {
    const message =
      query.error instanceof Error
        ? query.error.message
        : "Đã xảy ra lỗi không xác định";

    return (
      <EmptyState
        icon={AlertCircle}
        title={errorTitle}
        message={message}
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => query.refetch()}
            loading={query.isFetching}
          >
            {retryLabel}
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
