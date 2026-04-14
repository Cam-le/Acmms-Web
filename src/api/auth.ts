/**
 * Auth API
 * Endpoints: /api/Auth/login, /api/Auth/register
 *
 * Login flow:
 *  1. POST /api/Auth/login → { success, message, data: { token } }
 *  2. Decode JWT payload client-side to extract userId, email, role
 *  3. Store token + decoded fields in localStorage
 *  4. Reject if role is not Owner | Specialist | Admin
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:7093";

// ==================== Types ====================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullname: string;
  phoneNumber: string;
}

/** Fields decoded from the JWT payload */
export interface JwtPayload {
  nameid: string; // userId
  email: string;
  role: string; // "Owner" | "Specialist" | "Worker" | "Admin"
  exp: number; // expiry unix timestamp
  iat: number;
  nbf: number;
}

export interface LoginData {
  token: string;
}

export interface AuthApiResponse<T = null> {
  success: boolean;
  message: string;
  data?: T;
}

// Roles permitted to use the web app (Worker = mobile only, Admin = not in scope)
export const ALLOWED_WEB_ROLES = ["Owner", "Specialist"] as const;
export type AllowedWebRole = (typeof ALLOWED_WEB_ROLES)[number];

// ==================== JWT Helper ====================

/**
 * Decode the payload segment of a JWT without verifying the signature.
 * Signature verification is the backend's responsibility.
 * Returns null if the token is malformed.
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Base64url → Base64 → JSON
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    // atob is available in all modern browsers
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

// ==================== Session Storage ====================

const STORAGE_KEYS = {
  token: "authToken",
  userId: "userId",
  userEmail: "userEmail",
  userRole: "userRole",
  authMode: "authMode",
  isAuthenticated: "isAuthenticated",
} as const;

export function saveApiSession(token: string, payload: JwtPayload) {
  // Store email-derived name as initial fallback; overwritten by fetchAndSaveFullname if successful
  const displayName = payload.email.split("@")[0];

  localStorage.setItem(STORAGE_KEYS.isAuthenticated, "true");
  localStorage.setItem(STORAGE_KEYS.token, token);
  localStorage.setItem(STORAGE_KEYS.userId, payload.nameid);
  localStorage.setItem(STORAGE_KEYS.userEmail, payload.email);
  localStorage.setItem(STORAGE_KEYS.userRole, payload.role);
  localStorage.setItem(STORAGE_KEYS.authMode, "api");
  localStorage.setItem("userName", displayName);
}

/**
 * Fetch the user's full name from GET /api/Staffs/{userId} and overwrite
 * the "userName" key in localStorage.
 *
 * Must be called AFTER saveApiSession (token must already be stored).
 * Fails silently — login succeeds regardless of whether this call succeeds.
 */
export async function fetchAndSaveFullname(userId: string): Promise<void> {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const res = await fetch(`${BASE_URL}/api/Staffs/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return;

    const data = await res.json();

    // Response shape: { success, message, data: { fullname, ... } }
    const fullname: string | undefined = data?.data?.fullname;
    if (fullname && fullname.trim()) {
      localStorage.setItem("userName", fullname.trim());
    }
  } catch {
    // Silent failure — the email-derived fallback set by saveApiSession remains
  }
}

export function clearSession() {
  Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
}

export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.token);
}

export function getStoredRole(): string | null {
  return localStorage.getItem(STORAGE_KEYS.userRole);
}

// ==================== Route Helper ====================

export function dashboardByRole(role?: string | null): string {
  if (role === "Specialist") return "/specialist/dashboard";
  return "/dashboard"; // Owner (and mock fallback)
}

// ==================== API Calls ====================

export async function apiLogin(
  body: LoginRequest,
): Promise<AuthApiResponse<LoginData>> {
  const res = await fetch(`${BASE_URL}/api/Auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data: AuthApiResponse<LoginData> = await res.json();
  return data;
}

export async function apiRegister(
  body: RegisterRequest,
): Promise<AuthApiResponse> {
  const res = await fetch(`${BASE_URL}/api/Auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data: AuthApiResponse = await res.json();
  return data;
}
