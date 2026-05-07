/**
 * useIotHub — subscribes to real-time IoT data for a farm.
 *
 * Server events (IotRealtimePublisher.cs):
 *   "SensorData"   → payload: sensor reading object (shape from GET /api/sensors/latest)
 *   "DeviceStatus" → payload: { deviceId: string, status: string }
 *
 * Hub methods called on connect:
 *   JoinFarmAsync(farmId)       — joins group "farm:{farmId}"
 *   SubscribeDeviceAsync(id)    — joins group "device:{id}" (optional, per-device)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { createHubConnection, signalR } from "./signalr";

export interface IotSensorPayload {
  // Shape mirrors GET /api/sensors/latest response — extend as needed
  deviceId: string;
  deviceCode: string;
  temperature?: number;
  humidity?: number;
  light?: number;
  soilMoisture?: number;
  isRaining?: boolean;
  isAlert?: boolean;
  recordedAt?: string;
  [key: string]: unknown;
}

export interface IotDeviceStatusPayload {
  deviceId: string;
  status: string;
}

export interface UseIotHubOptions {
  /** Farm UUID — hub group "farm:{farmId}" will be joined */
  farmId: string | null | undefined;
  /**
   * Optional list of device UUIDs to also subscribe to individually.
   * Useful when you want per-device pushes regardless of farm group.
   */
  deviceIds?: string[];
  /** Called each time the server sends a SensorData event */
  onSensorData?: (payload: IotSensorPayload) => void;
  /** Called each time the server sends a DeviceStatus event */
  onDeviceStatus?: (payload: IotDeviceStatusPayload) => void;
  /** Set false to skip connecting (e.g. while farmId is loading) */
  enabled?: boolean;
}

export type HubConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting";

export interface UseIotHubResult {
  connectionState: HubConnectionState;
  /** Most recent SensorData payload received */
  lastSensorData: IotSensorPayload | null;
  /** Most recent DeviceStatus payload received */
  lastDeviceStatus: IotDeviceStatusPayload | null;
}

export function useIotHub({
  farmId,
  deviceIds = [],
  onSensorData,
  onDeviceStatus,
  enabled = true,
}: UseIotHubOptions): UseIotHubResult {
  const [connectionState, setConnectionState] =
    useState<HubConnectionState>("disconnected");
  const [lastSensorData, setLastSensorData] = useState<IotSensorPayload | null>(
    null,
  );
  const [lastDeviceStatus, setLastDeviceStatus] =
    useState<IotDeviceStatusPayload | null>(null);

  // Stable refs so effect doesn't re-run when callbacks change
  const onSensorDataRef = useRef(onSensorData);
  const onDeviceStatusRef = useRef(onDeviceStatus);
  onSensorDataRef.current = onSensorData;
  onDeviceStatusRef.current = onDeviceStatus;

  const connectionRef = useRef<signalR.HubConnection | null>(null);

  // Serialise deviceIds to a stable string for effect dependency
  const deviceIdsKey = deviceIds.join(",");

  useEffect(() => {
    if (!enabled || !farmId) return;

    const conn = createHubConnection("/hubs/iot");
    connectionRef.current = conn;

    // ── State tracking ──────────────────────────────────────────────────
    conn.onreconnecting(() => setConnectionState("reconnecting"));
    conn.onreconnected(async () => {
      setConnectionState("connected");
      // Re-join groups after reconnect — SignalR drops group membership
      await conn.invoke("JoinFarmAsync", farmId).catch(console.error);
      for (const id of deviceIds) {
        await conn.invoke("SubscribeDeviceAsync", id).catch(console.error);
      }
    });
    conn.onclose(() => setConnectionState("disconnected"));

    // ── Event handlers ───────────────────────────────────────────────────
    conn.on("SensorData", (payload: IotSensorPayload) => {
      setLastSensorData(payload);
      onSensorDataRef.current?.(payload);
    });

    conn.on("DeviceStatus", (payload: IotDeviceStatusPayload) => {
      setLastDeviceStatus(payload);
      onDeviceStatusRef.current?.(payload);
    });

    // ── Connect & join groups ────────────────────────────────────────────
    setConnectionState("connecting");
    conn
      .start()
      .then(async () => {
        setConnectionState("connected");
        await conn.invoke("JoinFarmAsync", farmId).catch(console.error);
        // deviceIds available via closure at connect time
        const ids = deviceIdsKey ? deviceIdsKey.split(",") : [];
        for (const id of ids) {
          await conn.invoke("SubscribeDeviceAsync", id).catch(console.error);
        }
      })
      .catch((err) => {
        console.error("[IotHub] connection failed:", err);
        setConnectionState("disconnected");
      });

    return () => {
      conn.stop().catch(console.error);
      connectionRef.current = null;
      setConnectionState("disconnected");
    };
    // Re-connect when farmId or device list changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, farmId, deviceIdsKey]);

  return { connectionState, lastSensorData, lastDeviceStatus };
}

// ── Connection state badge helper (use in UI) ────────────────────────────────
export function iotConnectionLabel(state: HubConnectionState): string {
  switch (state) {
    case "connected":
      return "Trực tiếp";
    case "connecting":
      return "Đang kết nối...";
    case "reconnecting":
      return "Đang kết nối lại...";
    case "disconnected":
      return "Mất kết nối";
  }
}
