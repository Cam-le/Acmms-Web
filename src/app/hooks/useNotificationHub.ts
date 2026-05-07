/**
 * useNotificationHub — receives real-time notifications for the logged-in user.
 *
 * Server event (NotificationRealtimePublisher.cs):
 *   "Notification" → payload: notification object (shape TBD by backend)
 *
 * The hub auto-joins group "user:{userId}" on connect (NotificationHub.cs
 * OnConnectedAsync), so no extra group-join call is needed from the client.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { createHubConnection, signalR } from "./signalr";
import type { HubConnectionState } from "./useIotHub";

export interface AppNotification {
  // Extend this interface once you know the exact backend payload shape.
  // The fields below are reasonable defaults — adjust to match actual API.
  id?: string;
  title?: string;
  message: string;
  type?: string; // e.g. "pest_alert", "task_update", "weather_warning"
  createdAt?: string;
  isRead?: boolean;
  [key: string]: unknown;
}

export interface UseNotificationHubOptions {
  /** Called each time a new notification arrives */
  onNotification?: (notification: AppNotification) => void;
  /**
   * Max notifications to keep in memory.
   * Oldest are dropped when limit is exceeded. Default 50.
   */
  maxHistory?: number;
  /** Set false to skip connecting (e.g. user not logged in yet) */
  enabled?: boolean;
}

export interface UseNotificationHubResult {
  connectionState: HubConnectionState;
  /** In-memory list, newest first */
  notifications: AppNotification[];
  unreadCount: number;
  /** Mark all in-memory notifications as read */
  markAllRead: () => void;
  /** Remove a single notification from local list by index */
  dismiss: (index: number) => void;
}

export function useNotificationHub({
  onNotification,
  maxHistory = 50,
  enabled = true,
}: UseNotificationHubOptions = {}): UseNotificationHubResult {
  const [connectionState, setConnectionState] =
    useState<HubConnectionState>("disconnected");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;

  useEffect(() => {
    // Only connect if there's a token — guard against unauthenticated renders
    if (!enabled || !localStorage.getItem("token")) return;

    const conn = createHubConnection("/hubs/notifications");

    conn.onreconnecting(() => setConnectionState("reconnecting"));
    conn.onreconnected(() => setConnectionState("connected"));
    conn.onclose(() => setConnectionState("disconnected"));

    conn.on("Notification", (payload: AppNotification) => {
      setNotifications((prev) => {
        const next = [{ ...payload, isRead: false }, ...prev];
        return next.length > maxHistory ? next.slice(0, maxHistory) : next;
      });
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
  }, [enabled, maxHistory]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const dismiss = useCallback((index: number) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return { connectionState, notifications, unreadCount, markAllRead, dismiss };
}
