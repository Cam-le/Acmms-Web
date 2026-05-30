/**
 * Data strategy:
 *   - Unread count: TanStack Query, refetchInterval 30s + invalidated on SignalR push
 *   - Notification list: fetched once on popover open (enabled: panelOpen),
 *     refreshed via query invalidation on real-time push
 *   - Tab "Chưa đọc" / "Tất cả": client-side filter on a single cached list
 *
 * Mutations:
 *   - Mark single read: optimistic local update → PUT /api/Notifications/{id}/read
 *   - Mark all read:    PUT /api/Notifications/read-all, invalidates both queries
 */

import { useState, useCallback } from "react";
import {
  Bell,
  BellRing,
  CheckCheck,
  FileText,
  MailOpen,
  AlertTriangle,
  Info,
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../api/client";
import type { NotificationResponse } from "../../../api/client";
import { qk } from "../../../api/queryKeys";
import { formatDateTime } from "../../utils/format";
import { useNotificationHub } from "../../hooks/useNotificationHub";
import { Tabs } from "./Tabs";
import { Button } from "./Button";
import { LoadingState } from "./LoadingState";
import { EmptyState } from "./EmptyState";
import { Spinner } from "./Spinner";

// ── Tab type ──────────────────────────────────────────────────────────────────
type NoteTab = "unread" | "all";

const NOTE_TABS = [
  { value: "unread" as NoteTab, label: "Chưa đọc" },
  { value: "all" as NoteTab, label: "Tất cả" },
] as const;

// ── Note type icon ────────────────────────────────────────────────────────────
function NoteTypeIcon({ type }: { type: string }) {
  if (type === "diagnosis_completed")
    return (
      <FileText className="w-4 h-4 text-status-warning-fg shrink-0 mt-0.5" />
    );
  if (type === "sensor_alert")
    return (
      <AlertTriangle className="w-4 h-4 text-status-danger-fg shrink-0 mt-0.5" />
    );
  if (type === "email_new_report")
    return <MailOpen className="w-4 h-4 text-status-info-fg shrink-0 mt-0.5" />;
  return <Info className="w-4 h-4 text-ink-400 shrink-0 mt-0.5" />;
}

// ── Single notification row ───────────────────────────────────────────────────
interface NoteRowProps {
  note: NotificationResponse;
  onMarkRead: (id: string) => void;
  isMarkingRead: boolean;
}

function NoteRow({ note, onMarkRead, isMarkingRead }: NoteRowProps) {
  const isUnread = note.noteStatus?.toLowerCase() === "unread";

  return (
    <button
      type="button"
      onClick={() => {
        if (isUnread) onMarkRead(note.noteId);
      }}
      className={[
        "w-full text-left px-4 py-3 flex items-start gap-3 transition-colors",
        "hover:bg-surface-subtle focus-visible:outline-none focus-visible:bg-surface-subtle",
        isUnread ? "bg-primary-50/60" : "",
      ].join(" ")}
    >
      <NoteTypeIcon type={note.noteType} />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-snug ${
            isUnread ? "font-semibold text-ink-800" : "text-ink-700"
          }`}
        >
          {note.noteTitle}
        </p>
        <p className="text-xs text-ink-500 mt-0.5 leading-relaxed line-clamp-2">
          {note.noteMessage}
        </p>
        <p className="text-[11px] text-ink-400 mt-1">
          {formatDateTime(note.noteCreatedAt)}
        </p>
      </div>
      {isUnread && !isMarkingRead && (
        <span
          className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5"
          aria-label="Chưa đọc"
        />
      )}
      {isMarkingRead && <Spinner size="xs" className="shrink-0 mt-1" />}
    </button>
  );
}

// ── Safe array extractor ──────────────────────────────────────────────────────
/**
 * Defensively extracts NotificationResponse[] from whatever the API returns.
 * Handles:
 *   - Plain array (expected after request() unwraps ApiResponse)
 *   - Paginated wrapper { data: [...] } or { items: [...] } (defensive)
 *   - undefined / null / other → []
 */
function extractNotes(raw: unknown): NotificationResponse[] {
  if (Array.isArray(raw)) return raw as NotificationResponse[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj["data"]))
      return obj["data"] as NotificationResponse[];
    if (Array.isArray(obj["items"]))
      return obj["items"] as NotificationResponse[];
  }
  return [];
}

// ── Main component ────────────────────────────────────────────────────────────
export function NotificationPanel() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [tab, setTab] = useState<NoteTab>("unread");
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // ── Unread count (always fetching, 30s poll) ──────────────────────────
  const countQuery = useQuery({
    queryKey: qk.notifications.unreadCount(),
    queryFn: api.getNotificationUnreadCount,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const unreadCount = typeof countQuery.data === "number" ? countQuery.data : 0;

  // ── Notification list (enabled once panel opens) ──────────────────────
  const listQuery = useQuery({
    queryKey: qk.notifications.list(),
    queryFn: () => api.getNotifications({ page: 1, pageSize: 50 }),
    enabled: panelOpen,
    staleTime: 15_000,
  });

  // Defensive extraction — handles both flat array and paginated wrappers.
  // The `request()` function should unwrap ApiResponse<T[]> to T[], but we
  // guard against runtime surprises (e.g. double-wrapping, paginated shape).
  const allNotes = extractNotes(listQuery.data);

  const displayedNotes =
    tab === "unread"
      ? allNotes.filter((n) => n.noteStatus?.toLowerCase() === "unread")
      : allNotes;

  // TQ v5 `isLoading` = `isPending && isFetching`. When `enabled` just flipped
  // true, there's a render tick where `isPending` is true but `isFetching` is
  // still false (fetch hasn't dispatched yet) — `isLoading` would be false,
  // causing the empty-state to flash. We treat that state as "loading" too.
  const isListLoading =
    listQuery.isLoading || (panelOpen && listQuery.isPending);

  // ── Mark single read ──────────────────────────────────────────────────
  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onMutate: async (id) => {
      setMarkingReadId(id);
      await queryClient.cancelQueries({ queryKey: qk.notifications.list() });
      // getQueryData returns the raw API value (may be a paginated wrapper).
      // extractNotes normalises it to a plain array — same as the render path.
      const prevRaw = queryClient.getQueryData(qk.notifications.list());
      const prevNotes = extractNotes(prevRaw);
      queryClient.setQueryData(
        qk.notifications.list(),
        prevNotes.map((n) =>
          n.noteId === id ? { ...n, noteStatus: "read" } : n,
        ),
      );
      return { prevNotes };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prevNotes) {
        queryClient.setQueryData(qk.notifications.list(), ctx.prevNotes);
      }
      console.error("[markNotificationRead] failed:", _err);
    },
    onSuccess: () => {
      queryClient.setQueryData<number>(qk.notifications.unreadCount(), (c) =>
        Math.max(0, (typeof c === "number" ? c : 1) - 1),
      );
    },
    onSettled: () => {
      setMarkingReadId(null);
      queryClient.invalidateQueries({
        queryKey: qk.notifications.unreadCount(),
      });
    },
  });

  // ── Mark all read ─────────────────────────────────────────────────────
  const markAllMutation = useMutation({
    mutationFn: api.markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: qk.notifications.list() });
      const prevRaw = queryClient.getQueryData(qk.notifications.list());
      const prevNotes = extractNotes(prevRaw);
      queryClient.setQueryData(
        qk.notifications.list(),
        prevNotes.map((n) => ({ ...n, noteStatus: "read" })),
      );
      queryClient.setQueryData<number>(qk.notifications.unreadCount(), 0);
      return { prevNotes };
    },
    onError: (_err, _v, ctx) => {
      if (ctx?.prevNotes) {
        queryClient.setQueryData(qk.notifications.list(), ctx.prevNotes);
      }
      console.error("[markAllNotificationsRead] failed:", _err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: qk.notifications.unreadCount(),
      });
      queryClient.invalidateQueries({ queryKey: qk.notifications.list() });
    },
  });

  // ── SignalR: invalidate on real-time push ─────────────────────────────
  const handleRealTimeNotification = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: qk.notifications.unreadCount(),
    });
    if (panelOpen) {
      queryClient.invalidateQueries({ queryKey: qk.notifications.list() });
    }
  }, [queryClient, panelOpen]);

  useNotificationHub({
    onNotification: handleRealTimeNotification,
    enabled: true,
  });

  // ── Derived ───────────────────────────────────────────────────────────
  const hasUnread = unreadCount > 0;
  const countDisplay = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <Popover.Root open={panelOpen} onOpenChange={setPanelOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Thông báo${hasUnread ? ` (${countDisplay} chưa đọc)` : ""}`}
          className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
        >
          {hasUnread ? (
            <BellRing className="w-5 h-5" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          {hasUnread && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 border-2 border-white text-white text-[9px] font-bold leading-none px-0.5">
              {countDisplay}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-[380px] max-w-[calc(100vw-1rem)] bg-surface rounded-modal shadow-modal border border-border flex flex-col"
          style={{ maxHeight: "min(520px, calc(100vh - 80px))" }}
          sideOffset={8}
          align="end"
          collisionPadding={8}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm text-ink-800">
                Thông báo
              </span>
              {hasUnread && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-pill bg-red-500 text-white leading-none">
                  {countDisplay}
                </span>
              )}
            </div>
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                leadingIcon={CheckCheck}
                loading={markAllMutation.isPending}
                onClick={() => markAllMutation.mutate()}
              >
                Đọc tất cả
              </Button>
            )}
          </div>

          {/* Tabs */}
          <div className="px-4 pt-3 pb-2 shrink-0">
            <Tabs value={tab} onChange={setTab} tabs={NOTE_TABS} />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border min-h-0">
            {isListLoading ? (
              <div className="py-8">
                <LoadingState message="Đang tải thông báo..." />
              </div>
            ) : listQuery.isError ? (
              <div className="py-8">
                <EmptyState
                  icon={AlertTriangle}
                  message="Không thể tải thông báo"
                  size="sm"
                />
              </div>
            ) : displayedNotes.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={Bell}
                  message={
                    tab === "unread"
                      ? "Không có thông báo chưa đọc"
                      : "Chưa có thông báo nào"
                  }
                  size="sm"
                />
              </div>
            ) : (
              displayedNotes.map((note) => (
                <NoteRow
                  key={note.noteId}
                  note={note}
                  onMarkRead={(id) => markReadMutation.mutate(id)}
                  isMarkingRead={
                    markingReadId === note.noteId && markReadMutation.isPending
                  }
                />
              ))
            )}
          </div>

          {/* Footer */}
          {allNotes.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border shrink-0">
              <p className="text-xs text-ink-400 text-center">
                Hiển thị {allNotes.length} thông báo gần nhất
              </p>
            </div>
          )}

          <Popover.Arrow className="fill-surface" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
