/**
 * signalr.ts — shared SignalR connection factory
 *
 * Creates one HubConnection per hub URL. Each call to `createHubConnection`
 * returns a NEW connection instance — callers (hooks) own the lifecycle.
 *
 * Auth: reads JWT from localStorage using the same key as auth.ts (STORAGE_KEYS.token = "authToken").
 * Reconnect: automatic with default backoff (0, 2, 10, 30 s).
 */

import * as signalR from "@microsoft/signalr";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

/** Must match STORAGE_KEYS.token in auth.ts */
const TOKEN_KEY = "authToken";

export function createHubConnection(path: string): signalR.HubConnection {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${BASE_URL}${path}`, {
      // Bearer JWT — same key used by auth.ts saveApiSession()
      accessTokenFactory: () => localStorage.getItem(TOKEN_KEY) ?? "",
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
