import { QueryClient } from "@tanstack/react-query";

function isRetryable(failureCount: number, error: unknown): boolean {
  // Never retry auth/not-found errors — they won't resolve on retry
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("401") ||
      msg.includes("403") ||
      msg.includes("404") ||
      msg.includes("unauthorized") ||
      msg.includes("forbidden")
    ) {
      return false;
    }
  }
  return failureCount < 1;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: isRetryable,
      refetchOnWindowFocus: false,
      // Ensures query.data is always typed correctly —
      // undefined data with isSuccess=true causes render crashes
      throwOnError: false,
    },
    mutations: {
      retry: 0,
      throwOnError: false,
    },
  },
});
