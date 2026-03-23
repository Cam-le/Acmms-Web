/**
 * Auth API
 * Endpoints: /api/Auth/login, /api/Auth/register
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

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

export interface LoginData {
  userId: string;
  email: string;
  roleName?: string; // e.g. "Owner" | "Specialist" | "Admin"
  fullname?: string;
}

export interface AuthApiResponse<T = null> {
  success: boolean;
  message: string;
  data?: T;
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
