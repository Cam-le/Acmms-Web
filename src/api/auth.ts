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

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
  targetRole: string;
}

/** Shape of GET /api/Staffs/me response data */
export interface StaffMeResponse {
  userId: string;
  email: string;
  fullname: string;
  phoneNumber: string;
  status: string;
  createdAt: string;
  roleName: string;
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

// ==================== Session Storage ====================

const STORAGE_KEYS = {
  token: "authToken",
  userId: "userId",
  userEmail: "userEmail",
  userRole: "userRole",
  authMode: "authMode",
  isAuthenticated: "isAuthenticated",
} as const;

/** Store only the token immediately after a successful login response. */
export function saveApiSession(token: string) {
  localStorage.setItem(STORAGE_KEYS.isAuthenticated, "true");
  localStorage.setItem(STORAGE_KEYS.token, token);
  localStorage.setItem(STORAGE_KEYS.authMode, "api");
}

/**
 * Call GET /api/Staffs/me and persist userId, email, fullname, and role
 * into localStorage. Must be called after saveApiSession (token must be stored).
 *
 * Returns the staff data on success, or null on failure.
 * Login should be aborted if this call fails — unlike the old fetchAndSaveFullname,
 * this is not a silent fallback because we need userId and roleName for the app to work.
 */
export async function fetchAndSaveUserInfo(): Promise<StaffMeResponse | null> {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  if (!token) return null;

  const res = await fetch(`${BASE_URL}/api/Staffs/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;

  const body: { success: boolean; data: StaffMeResponse } = await res.json();
  if (!body.success || !body.data) return null;

  const { userId, email, fullname, roleName } = body.data;
  localStorage.setItem(STORAGE_KEYS.userId, userId);
  localStorage.setItem(STORAGE_KEYS.userEmail, email);
  localStorage.setItem(STORAGE_KEYS.userRole, roleName);
  localStorage.setItem("userName", fullname.trim() || email.split("@")[0]);

  return body.data;
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
