const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function request<T>(
  method: string,
  path: string,
  body: unknown = null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Attach Bearer token when available (set by API login flow)
  const token = localStorage.getItem("authToken");
  if (token) headers["Authorization"] = `Bearer ${token}`;

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

async function requestForm<T>(
  method: string,
  path: string,
  body: FormData,
): Promise<T> {
  // Do NOT set Content-Type — browser sets it automatically with the correct
  // multipart boundary when body is FormData.
  const headers: Record<string, string> = {};
  const token = localStorage.getItem("authToken");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body });

  if (res.status === 204) return null as T;

  const data = await res.json();

  if (data && typeof data === "object" && "success" in data) {
    if (!data.success) throw new Error(data.message ?? "API error");
    return data.data as T;
  }

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
  latitude?: number;
  longitude?: number;
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

export interface CompatibleSoil {
  soilId: string;
  soilName: string;
  compatibility: string; // "High" | "Medium" | "Low"
}

export interface CropResponse {
  cropId: string;
  cropName: string;
  cropScientificName?: string;
  cropDefaultGrowthDays?: number;
  plantSpacing?: number;
  bedWidthDefault?: number;
  pathWidthDefault?: number;
  rowsPerBed?: number;
  rowSpacing?: number;
  cropQuantities?: number;
  cropStatus?: string;
  compatibleSoils?: CompatibleSoil[];
}

export interface SoilResponse {
  soilId: string;
  name: string;
  scienceName: string;
  cropsCount: number;
  plotsCount: number;
}

export interface PlotResponse {
  plotId: string;
  farmId: string;
  soilId: string;
  plotName: string;
  plotArea: number;
  plotLength: number;
  plotWidth: number;
  plotMarginLength: number;
  plotMarginWidth: number;
  plotStatus: string;
  plotCreatedAt: string;
  farmName: string;
  soilName: string;
  bedsCount: number;
}

export interface PlotRequest {
  farmId: string;
  soilId: string;
  plotName: string;
  plotArea: number;
  plotLength: number;
  plotWidth: number;
  plotMarginLength: number;
  plotMarginWidth: number;
  plotStatus: string;
}

export interface BedResponse {
  bedId: string;
  plotId: string;
  bedName: string;
  bedArea: number;
  bedStatus: string; // "Active" | "Empty" | "Inactive"
  bedCreatedAt: string;
  cropQuantities: number;
  cropId?: string;
  bedWidth?: number;
  bedLength?: number;
  pathWidth?: number;
  plantCount?: number;
  rowCount?: number;
  plotName: string;
  cropName?: string;
  seasonsDetailsCount: number;
}

export interface BedRequest {
  plotId: string;
  bedName: string;
  bedArea: number;
  bedStatus: string;
  cropQuantities: number;
  cropId?: string;
  bedWidth?: number;
  bedLength?: number;
  pathWidth?: number;
  plantCount?: number;
  rowCount?: number;
}

// Auto-allocate beds
export interface AutoAllocatePreviewRequest {
  plotId: string;
  cropId: string;
  bedWidth: number;
  pathWidth: number;
  rowsPerBed: number;
  bedNamePrefix: string;
}

export interface AutoAllocateBedItem {
  bedName: string;
  bedLength: number;
  bedWidth: number;
  bedArea: number;
  pathWidth: number;
  plantCount: number;
  rowCount: number;
  cropId: string;
}

export interface AutoAllocatePreviewResponse {
  plotId: string;
  cropId: string;
  bedCount: number;
  bedLength: number;
  bedWidth: number;
  bedArea: number;
  plantCount: number;
  widthRemain: number;
  beds: AutoAllocateBedItem[];
}

export interface AutoAllocateConfirmRequest {
  plotId: string;
  cropId: string;
  beds: AutoAllocateBedItem[];
}

export interface SoilRequest {
  name: string;
  scienceName: string;
}

export interface SoilCropCompatibilityResponse {
  comptId: string;
  soilId: string;
  soilName: string;
  cropId: string;
  cropName: string;
  compatibility: string; // "good" | "average" | "poor"
  note: string;
}

export interface SoilCropCompatibilityRequest {
  soilId: string;
  cropId: string;
  compatibility: string; // "good" | "average" | "poor"
  note: string;
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

export interface UnassignedStaff {
  userId: string;
  email: string;
  fullname: string;
  phoneNumber: string;
  status: string;
  createdAt: string;
  requestedRole?: string;
}

export interface ReportAttachment {
  id: string;
  objectType: string;
  objectId: string;
  attachmentType: string; // e.g. "report_image"
  fileName: string;
  fileUrl: string;
  secureUrl: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

export interface ReportEnvironmentSnapshot {
  temperature: number;
  humidity: number;
  soilMoisture: number;
  rainfall: number;
  lightIntensity: number;
  recordedAt: string;
  sourceDeviceId: string;
}

export interface ReportResponse {
  reportId: string;
  reportNo: string;
  workerId: string;
  workerName: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  reportType: string;
  plotId: string;
  bedId: string;
  seasonId?: string;
  aiResultsJson?: string;
  status: string;
  createdAt: string;
  submitDate: string;
  updatedAt?: string;
  attachments: ReportAttachment[];
  environmentSnapshots: ReportEnvironmentSnapshot[];
}

// ==================== Request Types ====================

export interface FarmRequest {
  farmName?: string;
  farmLocation?: string;
  farmArea?: number;
  farmStatus?: string;
  latitude?: number;
  longitude?: number;
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
  cropName: string;
  cropScientificName?: string;
  cropDefaultGrowthDays?: number;
  plantSpacing?: number;
  bedWidthDefault?: number;
  pathWidthDefault?: number;
  rowsPerBed?: number;
  rowSpacing?: number;
  cropStatus?: string;
}

export interface RoleResponse {
  roleId: string;
  roleName: string;
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

export interface SeasonDetailResponse {
  seasonDetailId: string;
  seasonId: string;
  bedId: string;
  cropId: string;
  cropQuantity: number;
  startDate: string;
  endDate: string;
  seasonExpectedHarvestDate: string;
  totalHarvestYield: number;
  seasonName: string;
  bedName: string;
  cropName: string;
  photosCount: number;
}

export interface SeasonDetailRequest {
  seasonId: string;
  bedId: string;
  cropId: string;
  cropQuantity: number;
  startDate: string;
  endDate: string;
  seasonExpectedHarvestDate: string;
  totalHarvestYield: number;
}

export interface CropGrowthStageResponse {
  stageId: string;
  cropId: string;
  cropName: string;
  stageName: string;
  stageDescription: string;
  temperatureMin: number;
  humidityMin: number;
  soilMoistureMin: number;
  growthIndicators: string;
  commonDiseases: string;
  notes: string;
  createdAt: string;
}

export interface CropGrowthStageRequest {
  cropId: string;
  stageName: string;
  stageDescription?: string;
  temperatureMin?: number;
  humidityMin?: number;
  soilMoistureMin?: number;
  growthIndicators?: string;
  commonDiseases?: string;
  notes?: string;
}

export interface CropGrowthTaskResponse {
  growthTaskId: string;
  stageId: string;
  stageName: string;
  /** Present on records created after the taskId migration; absent on legacy records. */
  taskId?: string;
  taskDescription: string;
  frequency: string;
  durationMinutes: number;
  requiredTools: string;
  requiredMaterials: string;
  quantityPerUnit: number;
  quantityUnit: string;
  priority: number;
  isMandatory: boolean;
  notes: string;
  createdAt: string;
}

export interface CropGrowthTaskRequest {
  stageId: string;
  /** Required for new records — references an existing Task. */
  taskId: string;
  taskDescription?: string;
  frequency?: string;
  durationMinutes?: number;
  requiredTools?: string;
  requiredMaterials?: string;
  quantityPerUnit?: number;
  quantityUnit?: string;
  priority?: number;
  isMandatory?: boolean;
  notes?: string;
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export interface TaskResponse {
  taskId: string;
  taskTitle: string;
  taskStatus: string; // "Active" | "active" | "Inactive" — normalise before use
  taskNotes: string;
  taskCreatedAt: string;
  taskDetailsCount: number;
}

export interface TaskRequest {
  taskTitle: string;
  taskStatus: string;
  taskNotes?: string;
  taskType?: string;
}

// ── Task Details ─────────────────────────────────────────────────────────────

export interface TaskDetailResponse {
  taskDetailId: string;
  taskId: string;
  taskTitle: string;
  seasonId: string;
  farmId?: string;
  assignedToWorkerIds: string[];
  bedIds: string[];
  plotIds: string[];
  startDate: string; // ISO datetime
  endDate: string; // ISO datetime
  notes: string;
  status?: string;
}

export interface TaskDetailRequest {
  taskId: string;
  seasonId: string;
  farmId: string;
  assignedToWorkerIds: string[]; // always 1 element
  bedIds: string[];
  plotIds: string[];
  startDate: string; // ISO datetime
  endDate: string;
  notes?: string;
  status?: string;
}

// ── Reports ───────────────────────────────────────────────────────────────────

export interface ReportAssignRequest {
  assignedTo: string; // specialist userId
  note?: string;
}

export interface DiagnosisResponse {
  id: string;
  reportId: string;
  // Present on GET /api/Reports/diagnosis (all) but not on GET /api/Reports/{id}/diagnosis
  reportNo?: string;
  reportTitle?: string;
  diagnosedBy: string;
  diagnoserName: string;
  diseaseName: string;
  conclusion: string;
  recommendedAction: string;
  severityLevel: string; // "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  status: string;
  createdAt: string;
}

export interface DiagnosisRequest {
  diseaseName: string;
  conclusion: string;
  recommendedAction: string;
  severityLevel: string; // "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}

export interface RecommendationResponse {
  recommendationId: string;
  seasonId: string;
  diagnosisId: string;
  title: string;
  content: string;
  createdAt: string;
  /** Denormalized disease name from the parent diagnosis */
  diagnosisDiseaseName: string;
  /** Severity from the parent diagnosis — "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" */
  diagnosisSeverity: string;
}

// Parsed shape of ReportResponse.aiResultsJson
export interface AiResultParsed {
  diseaseName?: string;
  description?: string;
  confidence?: number;
  symptoms?: string[];
  treatment?: string[];
  isHealthy?: boolean;
}

// ── Contracts ─────────────────────────────────────────────────────────────────

export interface ContractResponse {
  id: string;
  contractCode: string;
  expertId: string;
  expertName: string;
  bankAccount: string;
  bankName: string;
  accountHolder: string;
  pricePerDiagnosis: number;
  startDate: string;
  endDate?: string;
  status: string; // "active" | "terminated"
  notes?: string;
  createdAt: string;
}

export interface ContractCreateRequest {
  expertId: string;
  bankAccount: string;
  bankName: string;
  accountHolder: string;
  pricePerDiagnosis: number;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface ContractUpdateRequest {
  bankAccount: string;
  bankName: string;
  accountHolder: string;
  endDate?: string;
  notes?: string;
}

export interface PaymentItem {
  id?: string;
  diagnosisResultId: string;
  diseaseName?: string;
  diagnosedAt?: string;
  reportId?: string;
  reportNo?: string;
  contractId?: string;
  contractCode?: string;
  unitPrice?: number;
  farmId?: string;
  farmName?: string;
}

export interface BillItem {
  diagnosisResultId: string;
  diseaseName?: string;
  diagnosedAt?: string;
  reportId?: string;
  reportNo?: string;
  contractId?: string;
  contractCode?: string;
  unitPrice?: number;
  farmId?: string;
  farmName?: string;
}

export interface ContractBillResponse {
  specialistId: string;
  specialistName: string;
  month: string;
  bankAccount: string;
  bankName: string;
  accountHolder: string;
  totalDiagnoses: number;
  totalAmount: number;
  isPaid: boolean;
  items: BillItem[];
}

// ── Payments ──────────────────────────────────────────────────────────────────

export interface PendingPaymentItem {
  specialistId: string;
  specialistName: string;
  month: string;
  totalDiagnoses: number;
  totalAmount: number;
  isDue: boolean;
  daysOverdue: number;
  bankAccount: string;
  bankName: string;
  bankBin: string;
  accountHolder: string;
  qrUrl: string;
}

export interface PaymentResponse {
  id: string;
  specialistId: string;
  specialistName: string;
  month: string;
  totalDiagnoses: number;
  amount: number;
  billImageUrl: string;
  status: string; // "paid"
  createdAt: string;
  paidAt: string;
  items: PaymentItem[];
}

// ── Attachments ───────────────────────────────────────────────────────────────

export interface AttachmentResponse {
  id: string;
  objectType: string;
  objectId: string;
  attachmentType: string; // e.g. "report_image"
  fileName: string;
  fileUrl: string;
  secureUrl: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

// ── IoT Devices ───────────────────────────────────────────────────────────────

export interface IotDeviceResponse {
  deviceId: string;
  bedId: string;
  deviceCode: string;
  name: string;
  type: string;
  status: string;
  installationDate: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  lastActiveAt: string;
}

export interface IotDeviceRequest {
  bedId: string;
  deviceCode: string;
  name: string;
  type: string;
  status: string;
  installationDate: string; // ISO datetime
  latitude: number;
  longitude: number;
}

export interface IotDataResponse {
  sensorDataId: string;
  deviceId: string;
  recordedAt: string;
  temperature: number;
  humidity: number;
  soilMoisture: number;
  light?: number;
  isRaining: boolean;
  isAlert: boolean;
  createdAt: string;
}

// ─── Harvest / HarvestDetail ─────────────────────────────────────────────────

export interface HarvestResponse {
  harvestId: string;
  plotId: string;
  plotName: string;
  cropId: string;
  cropName: string;
  seasonId: string;
  seasonName: string;
  expectedDate: string;
  /**
   * Despite the field name, this stores the *actual* yield entered by the user.
   * The POST /api/harvests docs label this as "actual yield".
   */
  expectedQuantity: number;
  /** Unit of yield — "kg" or "tấn" */
  unit?: string;
  status: string;
  detailsCount: number;
  harvestedBedsCount: number;
  recordsCount: number;
  harvestDetails?: HarvestDetailResponse[];
  totalHarvestedQuantity?: number;
  totalSoldQuantity?: number;
  totalRevenue?: number;
  createdAt?: string;
}

export interface HarvestDetailResponse {
  harvestDetailId: string;
  harvestId: string;
  bedId: string;
  bedName: string;
  cropQuantity: number;
  startDate: string;
  endDate: string;
  /** Whether this specific bed has been harvested */
  isHarvested: boolean;
  cropId?: string;
  cropName?: string;
  plotId?: string;
  plotName?: string;
  seasonId?: string;
  seasonName?: string;
}

export interface HarvestRequest {
  plotId: string;
  seasonId: string;
  cropId: string;
  expectedDate: string;
  expectedQuantity: number;
  unit?: string;
  status?: string;
  notes?: string;
  startDate?: string;
  endDate?: string;
}

export interface HarvestUpdateRequest {
  expectedDate: string;
  expectedQuantity: number;
  unit?: string;
  status?: string;
  notes?: string;
}

export interface HarvestDetailUpdateRequest {
  cropQuantity: number;
  startDate: string;
  endDate: string;
}

// ── Growth Trackings ──────────────────────────────────────────────────────────

export interface GrowthTrackingResponse {
  trackingId: string;
  harvestDetailId: string;
  stageId: string;
  stageName: string;
  cropName: string;
  bedName: string;
  startDate: string;
  endDate?: string;
  /** "In-Progress" | "Completed" | "Cancelled" */
  trackingStatus: string;
  healthStatus?: string;
  actualHeight?: number;
  actualYield?: number;
  delayDays?: number;
  delayReason?: string;
  /** userId — resolve to fullname via api.getStaff() */
  lastUpdatedBy: string;
  lastObservedAt: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Maps / Geocoding ──────────────────────────────────────────────────────────

export interface GeocodeResultResponse {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  locationType?: string;
}

export interface UpdateFarmCoordinatesRequest {
  address?: string;
  latitude?: number;
  longitude?: number;
}

// ── Weather ───────────────────────────────────────────────────────────────────

export interface WeatherLocationResponse {
  name?: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
  localTime?: string;
}

export interface WeatherConditionResponse {
  text?: string;
  /** URL from WeatherAPI — prepend "https:" if starts with "//" */
  icon?: string;
  code: number;
}

export interface WeatherCurrentResponse {
  location: WeatherLocationResponse;
  lastUpdated: string;
  tempC: number;
  feelsLikeC: number;
  humidity: number;
  windKph: number;
  windDir?: string;
  gustKph: number;
  precipMm: number;
  pressureMb: number;
  cloud: number;
  uv: number;
  visKm: number;
  isDay: boolean;
  condition: WeatherConditionResponse;
}

export interface WeatherForecastDayResponse {
  date: string;
  maxTempC: number;
  minTempC: number;
  avgTempC: number;
  totalPrecipMm: number;
  avgHumidity: number;
  maxWindKph: number;
  uv: number;
  chanceOfRain: number;
  condition: WeatherConditionResponse;
  sunrise?: string;
  sunset?: string;
}

export interface WeatherForecastResponse {
  location: WeatherLocationResponse;
  current: WeatherCurrentResponse;
  forecast: WeatherForecastDayResponse[];
}

// ── Statistics — Yield ────────────────────────────────────────────────────────

export interface YieldStatisticsParams {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  farmId?: string;
  cropId?: string;
  seasonId?: string;
}

export interface YieldSummaryResponse {
  totalHarvests: number;
  completedHarvests: number;
  ongoingHarvests: number;
  totalActualWeightKg: number;
  totalExpectedQuantity: number;
  overallFulfillmentRate: number;
  cropsCount: number;
  seasonsCount: number;
  plotsCount: number;
  topCropId: string | null;
  topCropName: string | null;
  topCropWeightKg: number;
}

export interface YieldByCropResponse {
  cropId: string;
  cropName: string;
  harvestCount: number;
  completedDetailsCount: number;
  totalActualWeightKg: number;
  totalActualQuantity: number;
  totalExpectedQuantity: number;
  avgWeightKgPerHarvest: number;
  fulfillmentRate: number;
  seasonsCovered: number;
}

export interface YieldBySeasonResponse {
  seasonId: string;
  seasonName: string;
  seasonStartDate: string;
  seasonEndDate: string;
  harvestCount: number;
  totalActualWeightKg: number;
  totalActualQuantity: number;
  totalExpectedQuantity: number;
  fulfillmentRate: number;
  cropsCovered: number;
  plotsCovered: number;
}

export interface YieldByPlotResponse {
  plotId: string;
  plotName: string;
  plotArea: number;
  harvestCount: number;
  totalActualWeightKg: number;
  yieldPerAreaKg: number;
  cropsCovered: number;
}

/** Build query string for yield statistics endpoints, omitting empty params */
function buildYieldQuery(path: string, params: YieldStatisticsParams): string {
  const q = new URLSearchParams();
  if (params.from) q.set("From", params.from);
  if (params.to) q.set("To", params.to);
  if (params.farmId) q.set("FarmId", params.farmId);
  if (params.cropId) q.set("CropId", params.cropId);
  if (params.seasonId) q.set("SeasonId", params.seasonId);
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}

// ==================== API Methods ====================

export const api = {
  // Auth
  login: (body: LoginRequest) =>
    request<unknown>("POST", "/api/auth/login", body),
  getRoles: () => request<RoleResponse[]>("GET", "/api/Auth/roles"),

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

  // Plots
  getPlots: () => request<PlotResponse[]>("GET", "/api/Plots"),
  getPlot: (id: string) => request<PlotResponse>("GET", `/api/Plots/${id}`),
  createPlot: (body: PlotRequest) =>
    request<PlotResponse>("POST", "/api/Plots", body),
  updatePlot: (id: string, body: PlotRequest) =>
    request<PlotResponse>("PUT", `/api/Plots/${id}`, body),
  deletePlot: (id: string) => request<unknown>("DELETE", `/api/Plots/${id}`),

  // Beds
  getBeds: () => request<BedResponse[]>("GET", "/api/Beds"),
  getBed: (id: string) => request<BedResponse>("GET", `/api/Beds/${id}`),
  createBed: (body: BedRequest) =>
    request<BedResponse>("POST", "/api/Beds", body),
  updateBed: (id: string, body: BedRequest) =>
    request<BedResponse>("PUT", `/api/Beds/${id}`, body),
  deleteBed: (id: string) => request<unknown>("DELETE", `/api/Beds/${id}`),
  autoAllocatePreview: (body: AutoAllocatePreviewRequest) =>
    request<AutoAllocatePreviewResponse>(
      "POST",
      "/api/Beds/auto-allocate/preview",
      body,
    ),
  autoAllocateConfirm: (body: AutoAllocateConfirmRequest) =>
    request<unknown>("POST", "/api/Beds/auto-allocate/confirm", body),

  // Soils
  getSoils: () => request<SoilResponse[]>("GET", "/api/Soils"),
  createSoil: (body: SoilRequest) =>
    request<SoilResponse>("POST", "/api/Soils", body),
  updateSoil: (id: string, body: SoilRequest) =>
    request<SoilResponse>("PUT", `/api/Soils/${id}`, body),
  deleteSoil: (id: string) => request<unknown>("DELETE", `/api/Soils/${id}`),

  // Soil-Crop Compatibilities
  getSoilCropCompatibilities: () =>
    request<SoilCropCompatibilityResponse[]>(
      "GET",
      "/api/SoilCropCompatibilities",
    ),
  getSoilCropCompatibility: (id: string) =>
    request<SoilCropCompatibilityResponse>(
      "GET",
      `/api/SoilCropCompatibilities/${id}`,
    ),
  createSoilCropCompatibility: (body: SoilCropCompatibilityRequest) =>
    request<SoilCropCompatibilityResponse>(
      "POST",
      "/api/SoilCropCompatibilities",
      body,
    ),
  updateSoilCropCompatibility: (
    id: string,
    body: SoilCropCompatibilityRequest,
  ) =>
    request<SoilCropCompatibilityResponse>(
      "PUT",
      `/api/SoilCropCompatibilities/${id}`,
      body,
    ),
  deleteSoilCropCompatibility: (id: string) =>
    request<unknown>("DELETE", `/api/SoilCropCompatibilities/${id}`),

  // Seasons Details
  getSeasonsDetails: () =>
    request<SeasonDetailResponse[]>("GET", "/api/seasons-details"),
  getSeasonDetail: (id: string) =>
    request<SeasonDetailResponse>("GET", `/api/seasons-details/${id}`),
  createSeasonDetail: (body: SeasonDetailRequest) =>
    request<SeasonDetailResponse>("POST", "/api/seasons-details", body),
  updateSeasonDetail: (id: string, body: SeasonDetailRequest) =>
    request<SeasonDetailResponse>("PUT", `/api/seasons-details/${id}`, body),
  deleteSeasonDetail: (id: string) =>
    request<unknown>("DELETE", `/api/seasons-details/${id}`),

  // Staffs
  getUnassignedStaffs: () =>
    request<UnassignedStaff[]>("GET", "/api/Staffs/unassigned-role"),
  getStaffs: () => request<UserResponse[]>("GET", "/api/Staffs"),
  getStaff: (id: string) => request<UserResponse>("GET", `/api/Staffs/${id}`),
  createStaff: (body: WorkerRequest, roleName: string) =>
    request<UserResponse>(
      "POST",
      `/api/Staffs?role=${encodeURIComponent(roleName)}`,
      body,
    ),
  updateStaff: (id: string, body: Omit<WorkerRequest, "roleId">) =>
    request<UserResponse>("PUT", `/api/Staffs/${id}`, body),
  assignStaffRole: (id: string, roleName: string) =>
    request<unknown>(
      "PATCH",
      `/api/Staffs/${id}/assign-role?roleName=${encodeURIComponent(roleName)}`,
    ),
  deleteStaff: (id: string) => request<unknown>("DELETE", `/api/Staffs/${id}`),

  // Crop Growth Stages
  getCropGrowthStages: () =>
    request<CropGrowthStageResponse[]>("GET", "/api/CropGrowthStages"),
  getCropGrowthStagesByCrop: (cropId: string) =>
    request<CropGrowthStageResponse[]>(
      "GET",
      `/api/CropGrowthStages/crop/${cropId}`,
    ),
  getCropGrowthStage: (id: string) =>
    request<CropGrowthStageResponse>("GET", `/api/CropGrowthStages/${id}`),
  createCropGrowthStage: (body: CropGrowthStageRequest) =>
    request<unknown>("POST", "/api/CropGrowthStages", body),
  updateCropGrowthStage: (id: string, body: CropGrowthStageRequest) =>
    request<unknown>("PUT", `/api/CropGrowthStages/${id}`, body),
  deleteCropGrowthStage: (id: string) =>
    request<unknown>("DELETE", `/api/CropGrowthStages/${id}`),

  // Tasks
  getTasks: () => request<TaskResponse[]>("GET", "/api/Tasks"),
  getTask: (id: string) => request<TaskResponse>("GET", `/api/Tasks/${id}`),
  createTask: (body: TaskRequest) =>
    request<unknown>("POST", "/api/Tasks", body),
  updateTask: (id: string, body: TaskRequest) =>
    request<unknown>("PUT", `/api/Tasks/${id}`, body),
  deleteTask: (id: string) => request<unknown>("DELETE", `/api/Tasks/${id}`),

  // Task Details
  getTaskDetails: () =>
    request<TaskDetailResponse[]>("GET", "/api/TaskDetails"),
  getTaskDetail: (id: string) =>
    request<TaskDetailResponse>("GET", `/api/TaskDetails/${id}`),
  getTaskDetailsBySeason: (seasonId: string) =>
    request<TaskDetailResponse[]>("GET", `/api/TaskDetails/season/${seasonId}`),
  getTaskDetailsByWorker: (workerId: string) =>
    request<TaskDetailResponse[]>("GET", `/api/TaskDetails/worker/${workerId}`),
  createTaskDetail: (body: TaskDetailRequest) =>
    request<unknown>("POST", "/api/TaskDetails", body),
  updateTaskDetail: (id: string, body: TaskDetailRequest) =>
    request<unknown>("PUT", `/api/TaskDetails/${id}`, body),
  deleteTaskDetail: (id: string) =>
    request<unknown>("DELETE", `/api/TaskDetails/${id}`),

  // Crop Growth Tasks
  getCropGrowthTasksByStage: (stageId: string) =>
    request<CropGrowthTaskResponse[]>(
      "GET",
      `/api/CropGrowthTask/stage/${stageId}`,
    ),
  getCropGrowthTask: (id: string) =>
    request<CropGrowthTaskResponse>("GET", `/api/CropGrowthTask/${id}`),
  createCropGrowthTask: (body: CropGrowthTaskRequest) =>
    request<unknown>("POST", "/api/CropGrowthTask", body),
  updateCropGrowthTask: (id: string, body: CropGrowthTaskRequest) =>
    request<unknown>("PUT", `/api/CropGrowthTask/${id}`, body),
  deleteCropGrowthTask: (id: string) =>
    request<unknown>("DELETE", `/api/CropGrowthTask/${id}`),

  // IoT Data
  getIotDatas: () => request<IotDataResponse[]>("GET", "/api/IotDatas"),
  getLatestSensorByDevice: (deviceCode: string) =>
    request<IotDataResponse>(
      "GET",
      `/api/sensors/latest?deviceCode=${encodeURIComponent(deviceCode)}`,
    ),

  // IoT Devices
  getIotDevices: () => request<IotDeviceResponse[]>("GET", "/api/IotDevices"),
  getIotDevice: (id: string) =>
    request<IotDeviceResponse>("GET", `/api/IotDevices/${id}`),
  createIotDevice: (body: IotDeviceRequest) =>
    request<IotDeviceResponse>("POST", "/api/IotDevices", body),
  updateIotDevice: (id: string, body: IotDeviceRequest) =>
    request<IotDeviceResponse>("PUT", `/api/IotDevices/${id}`, body),
  deleteIotDevice: (id: string) =>
    request<unknown>("DELETE", `/api/IotDevices/${id}`),

  // Reports
  getReports: () => request<ReportResponse[]>("GET", "/api/Reports"),
  getReport: (id: string) =>
    request<ReportResponse>("GET", `/api/Reports/${id}`),
  deleteReport: (id: string) =>
    request<unknown>("DELETE", `/api/Reports/${id}`),
  assignReport: (reportId: string, body: ReportAssignRequest) =>
    request<unknown>("POST", `/api/Reports/${reportId}/assign`, body),
  getReportDiagnosis: (reportId: string) =>
    request<DiagnosisResponse[]>("GET", `/api/Reports/${reportId}/diagnosis`),
  getAllDiagnoses: () =>
    request<DiagnosisResponse[]>("GET", "/api/Reports/diagnosis"),
  getDiagnosisById: (diagnosisId: string) =>
    request<DiagnosisResponse>("GET", `/api/Reports/diagnosis/${diagnosisId}`),
  getRecommendationsByDiagnosis: (diagnosisId: string) =>
    request<RecommendationResponse[]>(
      "GET",
      `/api/Recommendations/diagnosis/${diagnosisId}`,
    ),
  createDiagnosis: (reportId: string, body: DiagnosisRequest) =>
    request<DiagnosisResponse>(
      "POST",
      `/api/Reports/${reportId}/diagnosis`,
      body,
    ),

  // Attachments
  getAttachments: (objectType: string, objectId: string) =>
    request<AttachmentResponse[]>(
      "GET",
      `/api/Attachments?objectType=${encodeURIComponent(objectType)}&objectId=${encodeURIComponent(objectId)}`,
    ),

  // Contracts
  getContracts: () => request<ContractResponse[]>("GET", "/api/contract/all"),
  getContract: (id: string) =>
    request<ContractResponse>("GET", `/api/contract/${id}`),
  createContract: (body: ContractCreateRequest) =>
    request<ContractResponse>("POST", "/api/contract", body),
  updateContract: (id: string, body: ContractUpdateRequest) =>
    request<ContractResponse>("PUT", `/api/contract/${id}`, body),
  terminateContract: (id: string) =>
    request<unknown>("POST", `/api/contract/${id}/terminate`),
  // O6: GET /api/payment/bill?specialistId=&month=
  // month should be formatted as "DD-MM-YYYY" per the API sample
  getPaymentBill: (specialistId: string, month: string) =>
    request<ContractBillResponse>(
      "GET",
      `/api/payment/bill?specialistId=${encodeURIComponent(specialistId)}&month=${encodeURIComponent(month)}`,
    ),

  // Payments
  // GET /api/payment/pending — list unpaid specialist payment summaries.
  // Both filters are optional.
  getPendingPayments: (opts?: { specialistId?: string; dueOnly?: boolean }) => {
    const params = new URLSearchParams();
    if (opts?.specialistId) params.set("specialistId", opts.specialistId);
    if (opts?.dueOnly != null) params.set("dueOnly", String(opts.dueOnly));
    const qs = params.toString();
    return request<PendingPaymentItem[]>(
      "GET",
      `/api/payment/pending${qs ? `?${qs}` : ""}`,
    );
  },
  getPayments: () => request<PaymentResponse[]>("GET", "/api/payment/my"),
  getPayment: (id: string) =>
    request<PaymentResponse>("GET", `/api/payment/${id}`),
  uploadPayment: (params: {
    specialistId: string;
    month: string;
    file: File;
  }) => {
    const form = new FormData();
    form.append("SpecialistId", params.specialistId);
    form.append("Month", params.month);
    form.append("BillFile", params.file);
    return requestForm<PaymentResponse>("POST", "/api/payment/upload", form);
  },
  // Harvests
  getHarvests: () => request<HarvestResponse[]>("GET", "/api/harvests"),
  getHarvest: (id: string) =>
    request<HarvestResponse>("GET", `/api/harvests/${id}`),
  getHarvestsBySeason: (seasonId: string) =>
    request<HarvestResponse[]>("GET", `/api/harvests/season/${seasonId}`),
  getHarvestsByPlot: (plotId: string) =>
    request<HarvestResponse[]>("GET", `/api/harvests/plot/${plotId}`),
  createHarvest: (body: HarvestRequest) =>
    request<HarvestResponse>("POST", "/api/harvests", body),
  updateHarvest: (id: string, body: HarvestUpdateRequest) =>
    request<HarvestResponse>("PUT", `/api/harvests/${id}`, body),
  deleteHarvest: (id: string) =>
    request<unknown>("DELETE", `/api/harvests/${id}`),

  // HarvestDetails
  getHarvestDetailsByHarvest: (harvestId: string) =>
    request<HarvestDetailResponse[]>(
      "GET",
      `/api/harvest-details/harvest/${harvestId}`,
    ),
  getHarvestDetail: (id: string) =>
    request<HarvestDetailResponse>("GET", `/api/harvest-details/${id}`),
  updateHarvestDetail: (id: string, body: HarvestDetailUpdateRequest) =>
    request<HarvestDetailResponse>("PUT", `/api/harvest-details/${id}`, body),
  deleteHarvestDetail: (id: string) =>
    request<unknown>("DELETE", `/api/harvest-details/${id}`),

  // Growth Trackings
  getGrowthTrackings: () =>
    request<GrowthTrackingResponse[]>("GET", "/api/growth-trackings"),
  getGrowthTracking: (id: string) =>
    request<GrowthTrackingResponse>("GET", `/api/growth-trackings/${id}`),
  getGrowthTrackingsByHarvestDetail: (harvestDetailId: string) =>
    request<GrowthTrackingResponse[]>(
      "GET",
      `/api/growth-trackings/harvest-detail/${harvestDetailId}`,
    ),

  // Statistics — Yield
  getYieldSummary: (params: YieldStatisticsParams) =>
    request<YieldSummaryResponse>(
      "GET",
      buildYieldQuery("/api/statistics/yield/summary", params),
    ),
  getYieldByCrop: (params: YieldStatisticsParams) =>
    request<YieldByCropResponse[]>(
      "GET",
      buildYieldQuery("/api/statistics/yield/by-crop", params),
    ),
  getYieldBySeason: (params: YieldStatisticsParams) =>
    request<YieldBySeasonResponse[]>(
      "GET",
      buildYieldQuery("/api/statistics/yield/by-season", params),
    ),
  getYieldByPlot: (params: YieldStatisticsParams) =>
    request<YieldByPlotResponse[]>(
      "GET",
      buildYieldQuery("/api/statistics/yield/by-plot", params),
    ),

  // Maps / Geocoding
  geocodeAddress: (address: string) =>
    request<GeocodeResultResponse>(
      "GET",
      `/api/Maps/geocode?address=${encodeURIComponent(address)}`,
    ),
  reverseGeocode: (lat: number, lng: number) =>
    request<GeocodeResultResponse>(
      "GET",
      `/api/Maps/reverse?lat=${lat}&lng=${lng}`,
    ),
  updateFarmCoordinates: (farmId: string, body: UpdateFarmCoordinatesRequest) =>
    request<unknown>("PUT", `/api/Maps/farm/${farmId}/coordinates`, body),

  // Weather
  getWeatherCurrent: (lat: number, lng: number) =>
    request<WeatherCurrentResponse>(
      "GET",
      `/api/Weather/current?lat=${lat}&lng=${lng}`,
    ),
  getWeatherForecast: (lat: number, lng: number, days = 3) =>
    request<WeatherForecastResponse>(
      "GET",
      `/api/Weather/forecast?lat=${lat}&lng=${lng}&days=${days}`,
    ),
  getWeatherCurrentByFarm: (farmId: string) =>
    request<WeatherCurrentResponse>(
      "GET",
      `/api/Weather/farm/${farmId}/current`,
    ),
  getWeatherForecastByFarm: (farmId: string, days = 3) =>
    request<WeatherForecastResponse>(
      "GET",
      `/api/Weather/farm/${farmId}/forecast?days=${days}`,
    ),
};