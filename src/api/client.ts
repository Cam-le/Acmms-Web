/**
 * CMMS API Client
 * Based on: CMMS_API_Integration_Guide.md
 *
 * Two response shapes:
 *  - ApiResponse<T> wrapper: Auth, Farms, Seasons, Workers
 *  - Raw DTO: Tasks, Crops
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

async function request<T>(
  method: string,
  path: string,
  body: unknown = null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Uncomment when auth is enforced:
  // const token = localStorage.getItem("token");
  // if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null as T;

  const data = await res.json();

  // ApiResponse<T> wrapper (Farms, Seasons, Workers, Auth)
  if (data && typeof data === "object" && "success" in data) {
    if (!data.success) throw new Error(data.message ?? "API error");
    return data.data as T;
  }

  // Raw DTO (Tasks, Crops)
  return data as T;
}

// ==================== Response Types ====================

export interface FarmResponse {
  farmId: string;
  farmName: string;
  farmLocation: string;
  farmArea: number;
  farmStatus: string;
  farmCreatedAt: string;
  seasonsCount: number;
}

export interface SeasonResponse {
  seasonId: string;
  farmId: string;
  seasonName: string;
  seasonStartDate: string;
  seasonEndDate: string;
  description: string;
  seasonNotes: string;
  seasonCreatedAt: string;
  status: string;
  seasonsDetailsCount: number;
  tasksCount: number;
  seasonsDetails: SeasonsDetailDto[];
}

export interface SeasonsDetailDto {
  seasonDetailId: string;
  bedId: string;
  cropId: string;
  cropQuantity: number;
  startDate: string;
  endDate: string;
  seasonExpectedHarvestDate: string;
  totalHarvestYield: number;
}

export interface CropResponse {
  cropId: string;
  soilId?: string;
  cropName: string;
  cropScientificName?: string;
  cropDefaultGrowthDays?: number;
  cropQuantities?: number;
  cropStatus?: string;
  soilName?: string;
  soilScienceName?: string;
}

export interface UserResponse {
  userId: string;
  email: string;
  fullname: string;
  phoneNumber: string;
  status: string;
  createdAt: string;
  roleName: string;
}

// ==================== Request Types ====================

export interface FarmRequest {
  farmName?: string;
  farmLocation?: string;
  farmArea?: number;
  farmStatus?: string;
}

export interface SeasonRequest {
  farmId?: string;
  seasonName?: string;
  seasonStartDate?: string;
  seasonEndDate?: string;
  description?: string;
  seasonNotes?: string;
  status?: string;
}

export interface CropRequest {
  soilId?: string;
  cropName: string;
  cropScientificName?: string;
  cropDefaultGrowthDays?: number;
  cropQuantities?: number;
  cropStatus?: string;
}

export interface WorkerRequest {
  email: string;
  password?: string;
  fullname?: string;
  phoneNumber?: string;
  status?: string;
  roleId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ==================== API Methods ====================

export const api = {
  // Auth
  login: (body: LoginRequest) =>
    request<unknown>("POST", "/api/auth/login", body),

  // Crops (raw response)
  getCrops: () => request<CropResponse[]>("GET", "/api/crops"),
  getCrop: (id: string) => request<CropResponse>("GET", `/api/crops/${id}`),
  createCrop: (body: CropRequest) =>
    request<CropResponse>("POST", "/api/crops", body),
  updateCrop: (id: string, body: CropRequest) =>
    request<CropResponse>("PUT", `/api/crops/${id}`, body),
  deleteCrop: (id: string) =>
    request<CropResponse>("DELETE", `/api/crops/${id}`),

  // Farms
  getFarms: () => request<FarmResponse[]>("GET", "/api/farms"),
  getFarm: (id: string) => request<FarmResponse>("GET", `/api/farms/${id}`),
  createFarm: (body: FarmRequest) =>
    request<FarmResponse>("POST", "/api/farms", body),
  updateFarm: (id: string, body: FarmRequest) =>
    request<FarmResponse>("PUT", `/api/farms/${id}`, body),
  deleteFarm: (id: string) => request<unknown>("DELETE", `/api/farms/${id}`),

  // Seasons
  getSeasons: () => request<SeasonResponse[]>("GET", "/api/seasons"),
  getSeason: (id: string) =>
    request<SeasonResponse>("GET", `/api/seasons/${id}`),
  createSeason: (body: SeasonRequest) =>
    request<SeasonResponse>("POST", "/api/seasons", body),
  updateSeason: (id: string, body: SeasonRequest) =>
    request<SeasonResponse>("PUT", `/api/seasons/${id}`, body),
  deleteSeason: (id: string) =>
    request<unknown>("DELETE", `/api/seasons/${id}`),

  // Workers
  getWorkers: () => request<UserResponse[]>("GET", "/api/workers"),
  getWorker: (id: string) => request<UserResponse>("GET", `/api/workers/${id}`),
  createWorker: (body: WorkerRequest) =>
    request<UserResponse>("POST", "/api/workers", body),
  updateWorker: (id: string, body: WorkerRequest) =>
    request<UserResponse>("PUT", `/api/workers/${id}`, body),
  changeWorkerStatus: (id: string, status: string) =>
    request<unknown>("PATCH", `/api/workers/${id}/status?status=${status}`),
  deleteWorker: (id: string) =>
    request<unknown>("DELETE", `/api/workers/${id}`),
};
