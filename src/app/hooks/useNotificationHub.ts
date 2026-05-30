/**
 * useNotificationHub — receives real-time notifications for the logged-in user.
 *
 * Server event (NotificationRealtimePublisher.cs):
 *   "Notification" → payload: NotificationResponse (same shape as REST API)
 *
 * The hub auto-joins group "user:{userId}" on connect (NotificationHub.cs
 * OnConnectedAsync), so no extra group-join call is needed from the client.
 *
 * NOTE: This hook intentionally does NOT maintain its own in-memory list
 * anymore. The notification list is owned by TanStack Query (NotificationPanel).
 * This hook only fires the onNotification callback so callers can invalidate
 * the relevant queries.
 */

import { useEffect, useRef, useState } from "react";
import { createHubConnection } from "./signalr";
import type { HubConnectionState } from "./useIotHub";

/** Must stay in sync with NotificationResponse in client.ts */
export interface RealtimeNotificationPayload {
  noteId?: string;
  reportId?: string;
  diagnosisId?: string;
  noteType?: string;
  noteTitle?: string;
  noteMessage?: string;
  noteStatus?: string;
  noteCreatedAt?: string;
  [key: string]: unknown;
}

export interface UseNotificationHubOptions {
  /** Called each time a new notification arrives from SignalR */
  onNotification?: (notification: RealtimeNotificationPayload) => void;
  /** Set false to skip connecting (e.g. user not logged in yet). Default true. */
  enabled?: boolean;
}

export interface UseNotificationHubResult {
  connectionState: HubConnectionState;
}

export function useNotificationHub({
  onNotification,
  enabled = true,
}: UseNotificationHubOptions = {}): UseNotificationHubResult {
  const [connectionState, setConnectionState] =
    useState<HubConnectionState>("disconnected");

  // Stable ref so the effect closure always calls the latest callback
  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;

  useEffect(() => {
    // Guard: only connect when there's a valid auth token.
    // Token key must match STORAGE_KEYS.token in auth.ts ("authToken").
    if (!enabled || !localStorage.getItem("authToken")) return;

    const conn = createHubConnection("/hubs/notifications");

    conn.onreconnecting(() => setConnectionState("reconnecting"));
    conn.onreconnected(() => setConnectionState("connected"));
    conn.onclose(() => setConnectionState("disconnected"));

    conn.on("Notification", (payload: RealtimeNotificationPayload) => {
      onNotificationRef.current?.(payload);
    });

    setConnectionState("connecting");
    conn
      .start()
      .then(() => setConnectionState("connected"))
      .catch((err) => {
        console.error("[NotificationHub] connection failed:", err);
        setConnectionState("disconnected");
      });

    return () => {
      conn.stop().catch(console.error);
      setConnectionState("disconnected");
    };
  }, [enabled]);

  return { connectionState };
}
