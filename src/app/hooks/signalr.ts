/**
 * signalr.ts — shared SignalR connection factory
 *
 * Creates one HubConnection per hub URL. Each call to `createHubConnection`
 * returns a NEW connection instance — callers (hooks) own the lifecycle.
 *
 * Auth: reads JWT from localStorage (same key used by auth.ts).
 * Reconnect: automatic with default backoff (0, 2, 10, 30 s).
 */

import * as signalR from "@microsoft/signalr";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export function createHubConnection(path: string): signalR.HubConnection {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${BASE_URL}${path}`, {
      // Bearer JWT — same token stored by auth.ts login flow
      accessTokenFactory: () => localStorage.getItem("token") ?? "",
    })
    .withAutomaticReconnect()
    .configureLogging(
      import.meta.env.DEV
        ? signalR.LogLevel.Information
        : signalR.LogLevel.Warning,
    )
    .build();
}

export { signalR };
