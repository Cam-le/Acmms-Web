// Mock Data for Vietnamese Farm Management App

// =================== WORKERS PAGE ===================
export interface Worker {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: "active" | "inactive";
  dateJoined: string;
  password?: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconBg: string;
  area: string;
  plot: string;
  status: "pending" | "in-progress" | "completed";
  assignee: string;
  date?: string;
  time?: string;
}

export interface Staff {
  id: string;
  name: string;
  initials: string;
  color: string;
  status: "available" | "busy" | "off";
}

// Workers Mock Data
export const mockWorkers: Worker[] = [
  {
    id: "1",
    name: "Maria Garcia",
    email: "maria.garcia@farm.com",
    phone: "0909993399",
    role: "Công Nhân",
    status: "active",
    dateJoined: "15/03/2024",
  },
  {
    id: "2",
    name: "James Wilson",
    email: "james.wilson@farm.com",
    phone: "0909883399",
    role: "Chuyên Gia",
    status: "active",
    dateJoined: "22/07/2024",
  },
  {
    id: "3",
    name: "David Brown",
    email: "david.brown@farm.com",
    phone: "0909773399",
    role: "Công Nhân",
    status: "inactive",
    dateJoined: "10/01/2024",
  },
];

// Tasks Mock Data
export const mockTasks: Task[] = [
  {
    id: "1",
    name: "Kiểm tra và vận hành hệ thống tưới nhỏ giọt",
    description: "Định kỳ hàng ngày",
    icon: "Tưới nước",
    iconBg: "#D1FAE5",
    area: "Khu A",
    plot: "Luống 01",
    status: "pending",
    assignee: "Phạm Văn D",
    date: "20/12/2023",
    time: "07:00 - 11:00",
  },
  {
    id: "2",
    name: "Kiểm tra cây bắp cải có dấu hiệu bệnh đốm lá",
    description: "Phải tiến hơi trước AI-02",
    icon: "Khác",
    iconBg: "#FED7AA",
    area: "Khu C",
    plot: "Luống 12",
    status: "pending",
    assignee: "Lê Văn C",
  },
  {
    id: "3",
    name: "Ghi nhận tình trạng sinh trưởng cây trồng tuần 12",
    description: "Yêu cầu kỹ thuật Nguyễn Văn Nam",
    icon: "Khác",
    iconBg: "#DBEAFE",
    area: "Khu D",
    plot: "Luống 08",
    status: "in-progress",
    assignee: "Hoàng Thị E",
    date: "20/12/2023",
    time: "13:00 - 17:00",
  },
  {
    id: "4",
    name: "Kiểm tra và xử lý nhiệt độ nhà màng 2",
    description: "Cảm biến T-102 - Nhà màng 2",
    icon: "Khác",
    iconBg: "#FEE2E2",
    area: "Khu B",
    plot: "Luống 05",
    status: "pending",
    assignee: "Mai Thị Hoa",
  },
  {
    id: "5",
    name: "Bón phân NPK đợt 3 cho khu B – bắp cải trắng",
    description: "Theo lịch mùa vụ",
    icon: "Bón phân",
    iconBg: "#D1FAE5",
    area: "Khu B",
    plot: "Luống 15",
    status: "in-progress",
    assignee: "Trần Dũng",
  },
  {
    id: "6",
    name: "Thu hoạch bắp cải Kale – lô số 5",
    description: "Đã nhập kho lạnh",
    icon: "Khác",
    iconBg: "#E0E7FF",
    area: "Khu E",
    plot: "Luống 05",
    status: "completed",
    assignee: "Nguyễn Văn B",
  },
];

// Staff Mock Data
export const mockStaff: Staff[] = [
  {
    id: "1",
    name: "Trần Văn E",
    initials: "TV",
    color: "#DBEAFE",
    status: "available",
  },
  {
    id: "2",
    name: "Lê Thị F",
    initials: "LF",
    color: "#FEF3C7",
    status: "available",
  },
  {
    id: "3",
    name: "Nguyễn Văn G",
    initials: "NG",
    color: "#E9D5FF",
    status: "available",
  },
  {
    id: "4",
    name: "Hoàng Thị H",
    initials: "HH",
    color: "#F3F4F6",
    status: "busy",
  },
  {
    id: "5",
    name: "Vũ Văn I",
    initials: "VI",
    color: "#D1FAE5",
    status: "available",
  },
  {
    id: "6",
    name: "Bùi Văn L",
    initials: "BL",
    color: "#FECACA",
    status: "available",
  },
  {
    id: "7",
    name: "Đặng Thị M",
    initials: "DM",
    color: "#DDD6FE",
    status: "available",
  },
  {
    id: "8",
    name: "Đỗ Thị K",
    initials: "DK",
    color: "#F3F4F6",
    status: "off",
  },
  {
    id: "9",
    name: "Phan Văn N",
    initials: "PN",
    color: "#F3F4F6",
    status: "busy",
  },
];

// Roles
export const roles = ["Công Nhân", "Chuyên Gia"];

// =================== CROPS PAGE ===================
export type CropSoilType =
  | "Đất Pha Cát"
  | "Đất Thịt"
  | "Đất Sét"
  | "Đất Phù Sa";
export type CropStatus = "Đang sử dụng" | "Không sử dụng";

export interface Crop {
  id: string;
  name: string;
  scientificName: string;
  growthPeriod: number;
  soilType: CropSoilType;
  status: CropStatus;
  image: string;
  description: string;
  plantDistance: { row: number; column: number };
}

export const cropSoilTypes: CropSoilType[] = [
  "Đất Pha Cát",
  "Đất Thịt",
  "Đất Sét",
  "Đất Phù Sa",
];

export const mockCrops: Crop[] = [
  {
    id: "1",
    name: "Bắp Cải Trắng",
    scientificName: "Brassica oleracea var. capitata alba",
    growthPeriod: 70,
    soilType: "Đất Pha Cát",
    status: "Đang sử dụng",
    image:
      "https://product.hstatic.net/1000354044/product/20230708_164750_b39eed30bb6448f3974767426d74ec7d_large.jpg",
    description:
      "Bắp cải trắng là loại phổ biến nhất, có lá màu xanh nhạt đến trắng, giòn ngọt, thích hợp cho nhiều món ăn.",
    plantDistance: { row: 40, column: 40 },
  },
  {
    id: "2",
    name: "Bắp Cải Tím",
    scientificName: "Brassica oleracea var. capitata rubra",
    growthPeriod: 85,
    soilType: "Đất Thịt",
    status: "Đang sử dụng",
    image:
      "https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=100&h=100&fit=crop",
    description:
      "Bắp cải tím có màu đỏ tím đặc trưng, giàu chất chống oxy hóa, thích hợp làm salad và muối chua.",
    plantDistance: { row: 45, column: 45 },
  },
  {
    id: "3",
    name: "Bắp Cải Xoăn (Kale)",
    scientificName: "Brassica oleracea var. sabellica",
    growthPeriod: 55,
    soilType: "Đất Phù Sa",
    status: "Đang sử dụng",
    image:
      "https://images.unsplash.com/photo-1524179091875-bf99a9a6af57?w=100&h=100&fit=crop",
    description:
      "Bắp cải xoăn có lá xoăn đặc trưng, giàu dinh dưỡng, thích hợp cho nước ép và salad.",
    plantDistance: { row: 35, column: 35 },
  },
  {
    id: "4",
    name: "Bắp Cải Bruxen",
    scientificName: "Brassica oleracea var. gemmifera",
    growthPeriod: 90,
    soilType: "Đất Sét",
    status: "Không sử dụng",
    image:
      "https://images.unsplash.com/photo-1438118907704-7718ee9a191a?w=100&h=100&fit=crop",
    description:
      "Bắp cải Bruxen (Brussels sprouts) mọc thành từng búp nhỏ trên thân, có vị đắng nhẹ, thích hợp nướng hoặc luộc.",
    plantDistance: { row: 50, column: 50 },
  },
  {
    id: "5",
    name: "Bắp Cải Thảo",
    scientificName: "Brassica rapa subsp. pekinensis",
    growthPeriod: 60,
    soilType: "Đất Pha Cát",
    status: "Đang sử dụng",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/a/ab/ChineseCabbage.jpg",
    description:
      "Bắp cải thảo (Napa cabbage) có hình dạng dài, lá mềm, ngọt, thích hợp làm kim chi và các món xào.",
    plantDistance: { row: 30, column: 30 },
  },
  {
    id: "6",
    name: "Bắp Cải Súp Lơ Xanh",
    scientificName: "Brassica oleracea var. italica",
    growthPeriod: 65,
    soilType: "Đất Thịt",
    status: "Đang sử dụng",
    image:
      "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=100&h=100&fit=crop",
    description:
      "Súp lơ xanh (Broccoli) có cụm hoa màu xanh đậm, giàu vitamin C và chất xơ, thích hợp hấp hoặc xào.",
    plantDistance: { row: 45, column: 40 },
  },
  {
    id: "7",
    name: "Bắp Cải Súp Lơ Trắng",
    scientificName: "Brassica oleracea var. botrytis",
    growthPeriod: 75,
    soilType: "Đất Phù Sa",
    status: "Không sử dụng",
    image:
      "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=100&h=100&fit=crop",
    description:
      "Súp lơ trắng (Cauliflower) có cụm hoa màu trắng ngà, mềm mịn, thích hợp cho nhiều món ăn từ hấp đến chiên.",
    plantDistance: { row: 50, column: 45 },
  },
];

// =================== SEASONS PAGE ===================
export type SeasonStatus = "Đang hoạt động" | "Đã kết thúc" | "Sắp diễn ra";
export type SeasonCropType = "Bắp Cải Trắng" | "Bắp Cải Tím" | "Bắp Cải Xoăn";

// Per-plot status inside a season (separate from SeasonStatus)
// Convention: "Đang trồng" | "Đã thu hoạch"
export type SeasonPlotStatus = "Đang trồng" | "Đã thu hoạch";

export interface PlotAssignment {
  plotId: string;
  // Naming convention: [KhuVực]-[NN]  e.g. "A-01", "B-12"
  plotName: string;
  area: string;
  crop: SeasonCropType;
  sowingDate: string;
  harvestDate: string;
  // --- Quantity fields ---
  plannedQuantity: number; // Số lượng trồng dự kiến (cây)
  actualPlanted: number; // Số lượng trồng thực tế (cây) — khóa khi mùa vụ "Đã kết thúc"
  harvestQuantity: number; // Sản lượng thu hoạch (kg) — mở khóa khi qua harvestDate
  status: SeasonPlotStatus; // Per-plot status (không dùng SeasonStatus)
}

export interface Season {
  id: string;
  code: string;
  name: string;
  farm: string;
  startDate: string;
  endDate: string;
  status: SeasonStatus;
  description: string;
  plots: PlotAssignment[];
}

export const mockSeasons: Season[] = [
  {
    id: "1",
    code: "MV001",
    name: "Vụ Xuân 2026",
    farm: "Trang trại Thung lũng Xanh",
    startDate: "2026-02-01",
    endDate: "2026-05-30",
    status: "Đang hoạt động",
    description: "Vụ mùa chính trồng bắp cải trắng và bắp cải tím.",
    plots: [
      {
        plotId: "A-01",
        plotName: "A-01",
        area: "Khu A (Phía Bắc)",
        crop: "Bắp Cải Trắng",
        sowingDate: "2026-02-05",
        harvestDate: "2026-04-20",
        plannedQuantity: 150,
        actualPlanted: 145,
        harvestQuantity: 0,
        status: "Đang trồng",
      },
      {
        plotId: "A-02",
        plotName: "A-02",
        area: "Khu A (Phía Bắc)",
        crop: "Bắp Cải Trắng",
        sowingDate: "2026-02-08",
        harvestDate: "2026-04-25",
        plannedQuantity: 150,
        actualPlanted: 148,
        harvestQuantity: 0,
        status: "Đang trồng",
      },
      {
        plotId: "B-01",
        plotName: "B-01",
        area: "Khu B (Phía Nam)",
        crop: "Bắp Cải Tím",
        sowingDate: "2026-02-10",
        harvestDate: "2026-05-15",
        plannedQuantity: 120,
        actualPlanted: 118,
        harvestQuantity: 0,
        status: "Đang trồng",
      },
    ],
  },
  {
    id: "2",
    code: "MV002",
    name: "Vụ bắp cải xoăn Q1/2026",
    farm: "Trang trại Nắng Hạ",
    startDate: "2026-01-10",
    endDate: "2026-04-20",
    status: "Đang hoạt động",
    description: "",
    plots: [
      {
        plotId: "C-01",
        plotName: "C-01",
        area: "Khu C",
        crop: "Bắp Cải Xoăn",
        sowingDate: "2026-01-15",
        harvestDate: "2026-03-10",
        plannedQuantity: 100,
        actualPlanted: 97,
        harvestQuantity: 0,
        status: "Đang trồng",
      },
      {
        plotId: "C-02",
        plotName: "C-02",
        area: "Khu C",
        crop: "Bắp Cải Xoăn",
        sowingDate: "2026-01-18",
        harvestDate: "2026-03-05",
        plannedQuantity: 80,
        actualPlanted: 78,
        harvestQuantity: 312,
        status: "Đã thu hoạch",
      },
    ],
  },
  {
    id: "3",
    code: "MV003",
    name: "Vụ Đông 2025",
    farm: "Trang trại Thung lũng Xanh",
    startDate: "2025-10-01",
    endDate: "2026-01-31",
    status: "Đã kết thúc",
    description: "Mùa vụ đông đã hoàn thành.",
    plots: [],
  },
];

// =================== DASHBOARD PAGE ===================
export const yieldData = [
  {
    id: "1",
    season: "ĐÔNG XUÂN",
    bapcaitrang: 14.5,
    bapcaitim: 19.2,
    bapcaixoan: 15.5,
  },
  {
    id: "2",
    season: "HÈ THU",
    bapcaitrang: 11.5,
    bapcaitim: 13.8,
    bapcaixoan: 12.0,
  },
  {
    id: "3",
    season: "THU ĐÔNG",
    bapcaitrang: 15.0,
    bapcaitim: 15.8,
    bapcaixoan: 14.2,
  },
];

export const recentAlerts = [
  {
    id: "1",
    type: "disease",
    title: "Phát hiện bệnh & khuyến nghị xử lý",
    description: "Bệnh phấn trắng phát hiện ở Khu B - Cần xử lý ngay",
    time: "2 giờ trước",
    crop: "Bắp Cải Tím",
    location: "Khu B",
    severity: "CAO",
  },
  {
    id: "2",
    type: "maintenance",
    title: "Bảo dưỡng hệ thống tưới định kỳ",
    description: "Hệ thống tưới Khu A cần kiểm tra và bảo dưỡng",
    time: "5 giờ trước",
    crop: "Bắp Cải Trắng",
    location: "Khu A",
    severity: "TRUNG BÌNH",
  },
  {
    id: "3",
    type: "harvest",
    title: "Chuẩn bị thu hoạch",
    description: "Bắp cải xoăn tại Khu C sắp đến thời điểm thu hoạch",
    time: "1 ngày trước",
    crop: "Bắp Cải Xoăn",
    location: "Khu C",
    severity: "THẤP",
  },
];

// =================== FARM PAGE ===================
export type FarmStatus = "Hoạt động" | "Không hoạt động";
export type FarmSoilType = "Đất thịt" | "Đất cát" | "Đất pha cát" | "Đất sét";

export interface FarmPlot {
  id: string;
  name: string;
  area: number;
  soilType: FarmSoilType;
  plotCount: number;
  status: FarmStatus;
}

export interface Farm {
  id: string;
  name: string;
  location: string;
  status: FarmStatus;
  area: number;
  description: string;
  image: string;
  createdAt: string;
  plots: FarmPlot[];
}

export const farmSoilTypes: FarmSoilType[] = [
  "Đất thịt",
  "Đất cát",
  "Đất pha cát",
  "Đất sét",
];

export const mockFarms: Farm[] = [
  {
    id: "1",
    name: "Trang trại Thung lũng Xanh",
    location: "Quận Sonoma, CA",
    status: "Hoạt động",
    area: 8500,
    description:
      "Trang trại chuyên canh các loại Bắp Cải theo tiêu chuẩn hữu cơ. Hệ thống tưới tiêu tự động và giám sát môi trường 24/7.",
    image:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&h=400&fit=crop&auto=format",
    createdAt: "10/6/2023",
    plots: [
      {
        id: "1",
        name: "Cánh đồng phía Bắc",
        area: 5000,
        soilType: "Đất thịt",
        plotCount: 12,
        status: "Hoạt động",
      },
      {
        id: "2",
        name: "Cánh đồng phía Nam",
        area: 3500,
        soilType: "Đất cát",
        plotCount: 8,
        status: "Hoạt động",
      },
    ],
  },
  {
    id: "2",
    name: "Trang trại Nắng Hạ",
    location: "Quận Sonoma, CA",
    status: "Hoạt động",
    area: 6000,
    description:
      "Trang trại trồng bắp cải hữu cơ với hệ thống nhà kính hiện đại.",
    image:
      "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&h=400&fit=crop&auto=format",
    createdAt: "8/15/2023",
    plots: [
      {
        id: "3",
        name: "Khu đất phía Đông",
        area: 4000,
        soilType: "Đất pha cát",
        plotCount: 10,
        status: "Hoạt động",
      },
    ],
  },
  {
    id: "3",
    name: "Trang trại Sông Nội",
    location: "Quận Sonoma, CA",
    status: "Không hoạt động",
    area: 5000,
    description: "Trang trại đang trong giai đoạn tái cấu trúc.",
    image:
      "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&h=400&fit=crop&auto=format",
    createdAt: "5/20/2023",
    plots: [],
  },
];

// =================== ADVISORY PAGE ===================

// ---------------------------------------------------------------------------
// ERD-aligned types
// ERD tables involved:
//   Image_Analyses_Result  → image_analysis_result_id, ai_label, ai_confidence,
//                            ai_severity, bounding_box_json, extra_data_json
//   Pest_Detections        → pest_detection_id, season_id, specialist_id,
//                            image_analysis_result_id, general_label,
//                            general_severity, confidence_source,
//                            detection_status, review_notes, detected_at
//   Recommendation         → recommendation_id, season_id, pest_detection_id,
//                            title, content, created_at, updated_at
// ---------------------------------------------------------------------------

export type RequestStatus =
  | "Chờ phản hồi" // Pest_Detection created, no specialist assigned yet
  | "Đang xử lý" // specialist_id assigned, detection_status = TODO: confirm enum
  | "Đã phản hồi" // Recommendation row exists for this pest_detection_id
  | "Đóng"; // detection_status = TODO: confirm enum — displays as "Đã giải quyết"

export type Priority = "CAO" | "TRUNG BÌNH" | "THẤP";
export type AdvisoryCropType = "Bắp Cải Trắng" | "Bắp Cải Tím" | "Bắp Cải Xoăn";

// TODO: replace with actual enum values from backend once confirmed
// Mirrors Pest_Detections.detection_status
export type DetectionStatus =
  | "PENDING" // chờ xử lý  — maps to UI "Chờ phản hồi"
  | "REVIEWING" // đang xử lý — maps to UI "Đang xử lý"
  | "REVIEWED" // đã phản hồi — maps to UI "Đã phản hồi"
  | "CLOSED"; // đóng        — maps to UI "Đóng"

// Mirrors Image_Analyses_Result
export interface ImageAnalysisResult {
  /** PK — image_analysis_result_id */
  imageAnalysisResultId: string;
  /** FK — image_analysis_id (the raw upload) */
  imageAnalysisId: string;
  aiLabel: string;
  aiConfidence: number; // 0–100
  aiSeverity: string;
  // boundingBoxJson and extraDataJson omitted from UI layer for now
  createdAt: string;
}

// Mirrors Pest_Detections
export interface PestDetection {
  /** PK — pest_detection_id */
  pestDetectionId: string;
  /** FK — season_id */
  seasonId: string;
  /** FK — specialist_id (null until assigned) */
  specialistId?: string;
  /** FK — image_analysis_result_id */
  imageAnalysisResultId: string;
  // Denormalised fields for display convenience
  generalLabel: string; // = Pest_Detections.general_label
  generalSeverity: string; // = Pest_Detections.general_severity
  confidenceSource: string; // e.g. "AI" | "SPECIALIST" | "COMBINED"
  detectionStatus: DetectionStatus;
  reviewNotes?: string; // specialist's raw notes before writing Recommendation
  detectedAt: string;
  createdAt: string;
}

// Mirrors Recommendation
export interface Recommendation {
  /** PK — recommendation_id */
  recommendationId: string;
  /** FK — season_id */
  seasonId: string;
  /** FK — pest_detection_id */
  pestDetectionId: string;
  title: string;
  content: string; // full rich text from specialist
  // Parsed convenience fields derived from content for UI display
  diagnosis?: string;
  observation?: string;
  treatmentPlan?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * AdvisoryRequest — composite UI model.
 * Combines Pest_Detection + Recommendation + Image_Analyses_Result
 * into one object used by AdvisoryPage.tsx.
 *
 * TODO: when integrating with real API, this should be built in the
 * API layer (or a React Query selector) rather than stored as-is.
 */
export interface AdvisoryRequest {
  // ── UI identity ──────────────────────────────────────────────────────────
  /** UI-facing ID. Maps to Pest_Detections.pest_detection_id in production */
  id: string;

  // ── ERD foreign keys (for future API integration) ─────────────────────
  /** Pest_Detections.pest_detection_id */
  pestDetectionId?: string;
  /** Recommendation.recommendation_id — present only when specialist responded */
  recommendationId?: string;
  /** Image_Analyses_Result.image_analysis_result_id */
  imageAnalysisResultId?: string;
  /** Pest_Detections.season_id */
  seasonId?: string;
  /** Pest_Detections.specialist_id */
  specialistId?: string;

  // ── Detection status (mirrors Pest_Detections.detection_status) ────────
  /** Raw DB enum — TODO: confirm values with backend */
  detectionStatus?: DetectionStatus;

  // ── Worker report fields (from Image_Analyses_Result + worker upload) ──
  workerReportId: string;
  title: string;
  crop: AdvisoryCropType;
  field: string;
  season: string;
  growthStage: string;
  /** Pest_Detections.general_label */
  issue: string;
  /** Image_Analyses_Result.ai_confidence */
  aiConfidence: number;
  description: string;
  images: string[];
  reportCreatedBy: string;
  reportCreatedAt: string;

  // ── Owner-side fields ───────────────────────────────────────────────────
  ownerMessage: string;
  /** UI status derived from detectionStatus + recommendationId presence */
  status: RequestStatus;
  priority: Priority;
  /** Display name of assigned specialist (from specialist_id lookup) */
  assignedTo?: string;
  createdAt: string;
  responseTime?: string;

  // ── Recommendation fields (Recommendation table) ────────────────────────
  /**
   * Present when Recommendation row exists for this pest_detection_id.
   * Payment gate: Owner must pay before viewing this object.
   * TODO: link to recommendationId above once payment table is designed.
   */
  response?: {
    /** Recommendation.title */
    title?: string;
    /** Parsed from Recommendation.content */
    diagnosis: string;
    observation: string;
    recommendation: string;
    treatmentPlan?: string;
    /** Recommendation.created_at */
    createdAt?: string;
    /** Recommendation.updated_at */
    updatedAt?: string;
    /**
     * Display name of the specialist's organisation.
     * TODO: derive from specialist profile lookup once Users table is integrated.
     */
    specialistOrg?: string;
  };
}

/** Lịch sử tư vấn đã hoàn thành (FE-9) */
export interface ConsultationHistory {
  /** Recommendation.recommendation_id */
  responseId: string;
  /** Pest_Detections.pest_detection_id (UI: TV-XXX) */
  requestId: string;
  crop: AdvisoryCropType;
  /** Pest_Detections.general_label */
  disease: string;
  priority: Priority;
  /** Specialist display name */
  specialist: string;
  respondedAt: string;
  /**
   * Payment status for this recommendation.
   * TODO: add payment_id / payment_status FK once payment table is designed.
   * For now tracked client-side via paidRequests Set in AdvisoryPage.tsx.
   */
  paymentStatus?: "UNPAID" | "PAID";
}

/**
 * WorkerReport — mirrors worker's mobile upload (FE-14).
 * In the DB this corresponds to the Image_Analyses table (the raw upload)
 * + Image_Analyses_Result (the AI output).
 * Worker creates this; Owner picks one to send to a specialist.
 */
export interface WorkerReport {
  /** UI id. Maps to Image_Analyses_Result.image_analysis_id in production */
  id: string;
  /** Image_Analyses_Result.image_analysis_result_id — present after AI processing */
  imageAnalysisResultId?: string;
  title: string;
  crop: AdvisoryCropType;
  field: string;
  season: string;
  growthStage: string;
  /** Image_Analyses_Result.ai_label */
  issue: string;
  /** Image_Analyses_Result.ai_confidence */
  aiConfidence: number;
  /** Image_Analyses_Result.ai_severity */
  aiSeverity?: string;
  description: string;
  images: string[];
  createdBy: string;
  createdAt: string;
}

export const mockWorkerReports: WorkerReport[] = [
  {
    id: "RPT-001",
    imageAnalysisResultId: "IAR-001", // Image_Analyses_Result.image_analysis_result_id
    title: "Phát hiện đốm lá trên bắp cải trắng",
    crop: "Bắp Cải Trắng",
    field: "Khu C - Luống C-3",
    season: "Mùa Hè 2025",
    growthStage: "Tuần 4 – Giai đoạn cuộn đầu",
    issue: "Đốm lá nấm (Septoria)", // ai_label
    aiConfidence: 92, // ai_confidence
    aiSeverity: "MEDIUM", // ai_severity — TODO confirm enum
    description:
      "Lá bắp cải xuất hiện các đốm tròn màu nâu với viền vàng, tập trung ở lá già phía dưới.",
    images: [
      "https://kingbio.vn/wp-content/uploads/2026/02/Benh-Dom-Den-Nam-Septoria-Tren-Hoa-Giay.jpg",
      "https://kingbio.vn/wp-content/uploads/2026/02/Benh-Dom-Den-Nam-Septoria-Tren-Hoa-Giay.jpg",
    ],
    createdBy: "Mai Thị Hoa",
    createdAt: "14:20 - 15/05/2024",
  },
  {
    id: "RPT-002",
    imageAnalysisResultId: "IAR-002",
    title: "Lớp bột trắng xuất hiện trên bắp cải tím",
    crop: "Bắp Cải Tím",
    field: "Khu B - Nhà kính 1",
    season: "Mùa Hè 2025",
    growthStage: "Tuần 6 – Giai đoạn phát triển lá",
    issue: "Phấn trắng (Powdery Mildew)",
    aiConfidence: 87,
    aiSeverity: "HIGH",
    description:
      "Phát hiện lớp bột trắng trên lá bắp cải tím. Có thể là dấu hiệu của bệnh phấn trắng, cần xử lý ngay để tránh lây lan.",
    images: [
      "https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=400&h=300&fit=crop",
    ],
    createdBy: "Nguyễn Văn B",
    createdAt: "10:30 - 14/05/2024",
  },
  {
    id: "RPT-003",
    imageAnalysisResultId: "IAR-003",
    title: "Vết đen trên lá bắp cải xoăn",
    crop: "Bắp Cải Xoăn",
    field: "Khu C - Ngoài trời",
    season: "Vụ bắp cải xoăn Q2",
    growthStage: "Tuần 3 – Giai đoạn ra lá mới",
    issue: "Than thư (Anthracnose)",
    aiConfidence: 78,
    aiSeverity: "HIGH",
    description:
      "Lá bắp cải xoăn có các vết đen, khô và cuộn lại. Nghi ngờ bệnh than thư hoặc thiếu dinh dưỡng.",
    images: [
      "https://images.unsplash.com/photo-1524179091875-bf99a9a6af57?w=400&h=300&fit=crop",
    ],
    createdBy: "Trần Văn E",
    createdAt: "08:15 - 13/05/2024",
  },
  {
    id: "RPT-004",
    imageAnalysisResultId: "IAR-004",
    title: "Rệp trắng mặt dưới lá bắp cải trắng",
    crop: "Bắp Cải Trắng",
    field: "Khu D - Nhà kính 3",
    season: "Mùa Hè 2025",
    growthStage: "Tuần 2 – Giai đoạn cây con",
    issue: "Rệp trắng",
    aiConfidence: 95,
    aiSeverity: "LOW",
    description:
      "Xuất hiện rệp trắng trên mặt dưới lá bắp cải. Số lượng chưa nhiều nhưng cần kiểm soát sớm.",
    images: [
      "https://cdn.eva.vn/upload/1-2023/images/2023-01-08/cay-bi-rep-trang-tan-cong-hay-tuoi-thu-nuoc-than-nay-sau-1-dem-se-het-sach-3-1673132796-984-width780height488.jpg",
    ],
    createdBy: "Lê Thị F",
    createdAt: "16:45 - 10/05/2024",
  },
  {
    // RPT-005: bệnh sương mai trên bắp cải tím — linked to TV-005 (PAID demo)
    id: "RPT-005",
    imageAnalysisResultId: "IAR-005",
    title: "Đốm nâu lan rộng trên lá bắp cải tím khu A",
    crop: "Bắp Cải Tím",
    field: "Khu A - Luống A-2",
    season: "Vụ Xuân 2026",
    growthStage: "Tuần 5 – Giai đoạn cuộn đầu sớm",
    issue: "Sương mai (Late Blight)",
    aiConfidence: 89,
    aiSeverity: "HIGH",
    description:
      "Lá xuất hiện các đốm nâu viền vàng lan nhanh từ mép lá vào trong. Mặt dưới lá có lớp mốc trắng mỏng vào buổi sáng sớm.",
    images: [
      "https://images.unsplash.com/photo-1592921870789-04563d55041c?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=400&h=300&fit=crop",
    ],
    createdBy: "Nguyễn Văn G",
    createdAt: "07:30 - 02/03/2026",
  },
  {
    // RPT-006: thiếu dinh dưỡng bắp cải xoăn khu B — linked to TV-006 (UNPAID demo)
    id: "RPT-006",
    imageAnalysisResultId: "IAR-006",
    title: "Lá bắp cải xoăn vàng nhạt, mép lá cháy",
    crop: "Bắp Cải Xoăn",
    field: "Khu B - Luống B-1",
    season: "Vụ bắp cải xoăn Q1/2026",
    growthStage: "Tuần 4 – Giai đoạn phát triển lá",
    issue: "Thiếu Kali (Potassium deficiency)",
    aiConfidence: 76,
    aiSeverity: "MEDIUM",
    description:
      "Lá già phía dưới bắp cải xoăn có màu vàng nhạt, mép lá chuyển nâu và khô dần. Cây sinh trưởng chậm hơn bình thường.",
    images: [
      "https://images.unsplash.com/photo-1524179091875-bf99a9a6af57?w=400&h=300&fit=crop",
    ],
    createdBy: "Trần Văn E",
    createdAt: "09:15 - 05/03/2026",
  },
];

export const mockRequests: AdvisoryRequest[] = [
  {
    // ── UI identity ──────────────────────────────────────────────────
    id: "TV-001",
    // ── ERD keys (TODO: populate from API response) ──────────────────
    pestDetectionId: "PD-001", // Pest_Detections.pest_detection_id
    recommendationId: undefined, // no Recommendation yet
    imageAnalysisResultId: "IAR-001", // Image_Analyses_Result.image_analysis_result_id
    seasonId: "season-2025-summer", // Pest_Detections.season_id
    specialistId: undefined, // not yet assigned
    detectionStatus: "PENDING", // Pest_Detections.detection_status
    // ── Worker report ────────────────────────────────────────────────
    workerReportId: "RPT-001",
    title: "Phát hiện đốm lá trên bắp cải trắng",
    crop: "Bắp Cải Trắng",
    field: "Khu C - Luống C-3",
    season: "Mùa Hè 2025",
    growthStage: "Tuần 4 – Giai đoạn cuộn đầu",
    issue: "Đốm lá nấm (Septoria)", // general_label
    aiConfidence: 92,
    description:
      "Lá bắp cải xuất hiện các đốm tròn màu nâu với viền vàng, tập trung ở lá già phía dưới.",
    images: [
      "https://kingbio.vn/wp-content/uploads/2026/02/Benh-Dom-Den-Nam-Septoria-Tren-Hoa-Giay.jpg",
      "https://kingbio.vn/wp-content/uploads/2026/02/Benh-Dom-Den-Nam-Septoria-Tren-Hoa-Giay.jpg",
    ],
    reportCreatedBy: "Mai Thị Hoa",
    reportCreatedAt: "14:20 - 15/05/2024",
    ownerMessage: "Nhờ chuyên gia xác nhận loại nấm và hướng xử lý phù hợp.",
    status: "Chờ phản hồi",
    priority: "CAO",
    createdAt: "15:00 - 15/05/2024",
    // response: undefined — no Recommendation row yet
  },
  {
    id: "TV-002",
    pestDetectionId: "PD-002",
    recommendationId: undefined, // Recommendation exists but payment-gated
    imageAnalysisResultId: "IAR-002",
    seasonId: "season-2025-summer",
    specialistId: "SP-002", // ThS. Hoàng Lan
    detectionStatus: "REVIEWING", // specialist assigned, still reviewing
    workerReportId: "RPT-002",
    title: "Lớp bột trắng xuất hiện trên bắp cải tím",
    crop: "Bắp Cải Tím",
    field: "Khu B - Nhà kính 1",
    season: "Mùa Hè 2025",
    growthStage: "Tuần 6 – Giai đoạn phát triển lá",
    issue: "Phấn trắng (Powdery Mildew)",
    aiConfidence: 87,
    description:
      "Phát hiện lớp bột trắng trên lá bắp cải tím. Có thể là dấu hiệu của bệnh phấn trắng, cần xử lý ngay để tránh lây lan.",
    images: [
      "https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=400&h=300&fit=crop",
    ],
    reportCreatedBy: "Nguyễn Văn B",
    reportCreatedAt: "10:30 - 14/05/2024",
    ownerMessage: "Khu nhà kính 1 có nguy cơ lây lan cao, cần xử lý gấp.",
    status: "Đang xử lý",
    priority: "TRUNG BÌNH",
    assignedTo: "ThS. Hoàng Lan",
    createdAt: "11:00 - 14/05/2024",
    response: {
      // Recommendation.recommendation_id = "REC-002" (payment gate applies)
      title: "Xử lý bệnh phấn trắng nhà kính 1",
      diagnosis: "Bệnh phấn trắng do nấm",
      observation:
        "Do độ ẩm không khí cao trong những ngày qua tại Khu C kết hợp với nhiệt độ thấp vào ban đêm, tạo điều kiện cho nấm phát triển.",
      recommendation:
        "Cần cách ly ngay các luống bị bệnh. Sử dụng thuốc bảo vệ thực vật có hoạt chất Metalaxyl hoặc Mancozeb để phun phòng trị. Lưu ý phun vét đều hai mặt lá.",
      specialistOrg: "Viện Khoa học Tự nhiên (Viện KHTN)",
      createdAt: "13:00 - 14/05/2024",
      updatedAt: "13:00 - 14/05/2024",
    },
  },
  {
    id: "TV-003",
    pestDetectionId: "PD-003",
    recommendationId: "REC-003", // Recommendation exists — payment gate active
    imageAnalysisResultId: "IAR-003",
    seasonId: "season-2025-q2-kale",
    specialistId: "SP-003", // PGS.TS Trần Hùng
    detectionStatus: "REVIEWED", // Recommendation written and delivered
    workerReportId: "RPT-003",
    title: "Vết đen trên lá bắp cải xoăn",
    crop: "Bắp Cải Xoăn",
    field: "Khu C - Ngoài trời",
    season: "Vụ bắp cải xoăn Q2",
    growthStage: "Tuần 3 – Giai đoạn ra lá mới",
    issue: "Than thư (Anthracnose)",
    aiConfidence: 78,
    description:
      "Lá bắp cải xoăn có các vết đen, khô và cuộn lại. Nghi ngờ bệnh than thư hoặc thiếu dinh dưỡng.",
    images: [
      "https://images.unsplash.com/photo-1524179091875-bf99a9a6af57?w=400&h=300&fit=crop",
    ],
    reportCreatedBy: "Trần Văn E",
    reportCreatedAt: "08:15 - 13/05/2024",
    ownerMessage:
      "Vui lòng xem xét có phải thiếu dinh dưỡng không để điều chỉnh lịch bón phân.",
    status: "Đã phản hồi",
    priority: "CAO",
    assignedTo: "PGS.TS Trần Hùng",
    createdAt: "09:00 - 13/05/2024",
    responseTime: "2 giờ trước",
    response: {
      // Recommendation row: recommendation_id = "REC-003"
      // Content below is payment-gated — Owner sees blurred until paid
      title: "Kết quả chẩn đoán than thư + khuyến nghị dinh dưỡng",
      diagnosis: "Thiếu Nitơ và bệnh nấm than thư nhẹ",
      observation:
        "Dựa trên hình ảnh là có các đốm trắng lan rộng và viền lá bị cháy, đây là biểu hiện điển hình của Bệnh Sương Mai (Late Blight) giai đoạn đầu.",
      recommendation:
        "Cần cách ly ngay các luống bị bệnh. Sử dụng thuốc bảo vệ thực vật có hoạt chất Metalaxyl hoặc Mancozeb để phun phòng trị. Lưu ý phun vét đều hai mặt lá. Bổ sung phân đạm để cải thiện sức đề kháng.",
      treatmentPlan: "Xử lý trong vòng 3-5 ngày, theo dõi hàng ngày",
      specialistOrg: "Viện Khoa học Tự nhiên (Viện KHTN)",
      createdAt: "11:00 - 13/05/2024",
      updatedAt: "11:00 - 13/05/2024",
    },
  },
  {
    id: "TV-004",
    pestDetectionId: "PD-004",
    recommendationId: "REC-004", // Recommendation exists
    imageAnalysisResultId: "IAR-004",
    seasonId: "season-2025-summer",
    specialistId: "SP-001", // TS. Nguyễn Văn Minh
    detectionStatus: "CLOSED", // case closed
    workerReportId: "RPT-004",
    title: "Rệp trắng mặt dưới lá bắp cải trắng",
    crop: "Bắp Cải Trắng",
    field: "Khu D - Nhà kính 3",
    season: "Mùa Hè 2025",
    growthStage: "Tuần 2 – Giai đoạn cây con",
    issue: "Rệp trắng",
    aiConfidence: 95,
    description:
      "Xuất hiện rệp trắng trên mặt dưới lá bắp cải. Số lượng chưa nhiều nhưng cần kiểm soát sớm.",
    images: [
      "https://cdn.eva.vn/upload/1-2023/images/2023-01-08/cay-bi-rep-trang-tan-cong-hay-tuoi-thu-nuoc-than-nay-sau-1-dem-se-het-sach-3-1673132796-984-width780height488.jpg",
    ],
    reportCreatedBy: "Lê Thị F",
    reportCreatedAt: "16:45 - 10/05/2024",
    ownerMessage:
      "Khu cây con dễ bị tổn thương, cần hướng dẫn phòng trừ an toàn.",
    status: "Đóng",
    priority: "THẤP",
    assignedTo: "TS. Nguyễn Văn Minh",
    createdAt: "17:00 - 10/05/2024",
    responseTime: "5 ngày trước",
    // No response object — this case was closed without a formal Recommendation
    // (e.g. specialist handled via reviewNotes only)
  },
  {
    // ── TV-005: PAID demo ─────────────────────────────────────────────────────
    // Pre-seeded in paidRequests Set in AdvisoryPage.tsx → unlocked on first load.
    // Use this to demo the full "Phương án xử lý" section with all three task buttons.
    id: "TV-005",
    pestDetectionId: "PD-005",
    recommendationId: "REC-005",
    imageAnalysisResultId: "IAR-005",
    seasonId: "season-2026-spring",
    specialistId: "SP-002", // ThS. Hoàng Lan
    detectionStatus: "REVIEWED",
    workerReportId: "RPT-005",
    title: "Đốm nâu lan rộng trên lá bắp cải tím khu A",
    crop: "Bắp Cải Tím",
    field: "Khu A - Luống A-2",
    season: "Vụ Xuân 2026",
    growthStage: "Tuần 5 – Giai đoạn cuộn đầu sớm",
    issue: "Sương mai (Late Blight)",
    aiConfidence: 89,
    description:
      "Lá xuất hiện các đốm nâu viền vàng lan nhanh từ mép lá vào trong. Mặt dưới lá có lớp mốc trắng mỏng vào buổi sáng sớm.",
    images: [
      "https://images.unsplash.com/photo-1592921870789-04563d55041c?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=400&h=300&fit=crop",
    ],
    reportCreatedBy: "Nguyễn Văn G",
    reportCreatedAt: "07:30 - 02/03/2026",
    ownerMessage:
      "Bệnh đang lan sang luống A-3, nhờ chuyên gia tư vấn thuốc đặc trị và liều lượng phun.",
    status: "Đã phản hồi",
    priority: "CAO",
    assignedTo: "ThS. Hoàng Lan",
    createdAt: "08:00 - 02/03/2026",
    responseTime: "3 giờ trước",
    response: {
      // Recommendation.recommendation_id = "REC-005"
      // TV-005 is pre-seeded as PAID → content visible without payment modal
      title: "Xử lý bệnh sương mai bắp cải tím – Khu A",
      diagnosis: "Bệnh sương mai (Late Blight) do nấm Phytophthora infestans",
      observation:
        "Điều kiện thời tiết những ngày gần đây tại Khu A có độ ẩm cao trên 85% và nhiệt độ ban đêm xuống dưới 18°C — đây là môi trường lý tưởng cho Phytophthora phát triển. Bào tử lây lan qua gió và nước tưới nhỏ giọt bị bắn lên lá.",
      recommendation:
        "1. Cách ly ngay luống A-2 và A-3, tạm dừng tưới phun sương. Chuyển sang tưới nhỏ giọt gốc để hạn chế ẩm trên lá.\n2. Phun thuốc đặc trị có hoạt chất Metalaxyl-M + Mancozeb (ví dụ: Ridomil Gold MZ 68WG), liều 25g/10 lít nước, phun đều hai mặt lá vào buổi sáng sớm khi trời khô.\n3. Sau 3 ngày kiểm tra lại; nếu lan sang luống kế tiếp, thu gom và tiêu huỷ lá bệnh trước khi phun đợt 2.\n4. Bổ sung Kali (K2O) để tăng sức đề kháng thành tế bào, giúp cây chống chịu tốt hơn.",
      treatmentPlan:
        "Phun thuốc đợt 1 trong vòng 24 giờ · Kiểm tra sau 3 ngày · Phun đợt 2 nếu cần · Theo dõi thêm 7 ngày",
      specialistOrg: "Viện Khoa học Tự nhiên (Viện KHTN)",
      createdAt: "11:00 - 02/03/2026",
      updatedAt: "11:00 - 02/03/2026",
    },
  },
  {
    // ── TV-006: UNPAID demo ───────────────────────────────────────────────────
    // Status "Đã phản hồi" but NOT in paidRequests → shows the payment-locked state.
    // Use this to demo the blurred overlay + payment CTA flow.
    id: "TV-006",
    pestDetectionId: "PD-006",
    recommendationId: "REC-006",
    imageAnalysisResultId: "IAR-006",
    seasonId: "season-2026-kale-q1",
    specialistId: "SP-003", // PGS.TS Trần Hùng
    detectionStatus: "REVIEWED",
    workerReportId: "RPT-006",
    title: "Lá bắp cải xoăn vàng nhạt, mép lá cháy",
    crop: "Bắp Cải Xoăn",
    field: "Khu B - Luống B-1",
    season: "Vụ bắp cải xoăn Q1/2026",
    growthStage: "Tuần 4 – Giai đoạn phát triển lá",
    issue: "Thiếu Kali (Potassium deficiency)",
    aiConfidence: 76,
    description:
      "Lá già phía dưới bắp cải xoăn có màu vàng nhạt, mép lá chuyển nâu và khô dần. Cây sinh trưởng chậm hơn bình thường.",
    images: [
      "https://images.unsplash.com/photo-1524179091875-bf99a9a6af57?w=400&h=300&fit=crop",
    ],
    reportCreatedBy: "Trần Văn E",
    reportCreatedAt: "09:15 - 05/03/2026",
    ownerMessage:
      "Nhờ chuyên gia xác nhận có phải thiếu dinh dưỡng không và tư vấn loại phân bù phù hợp.",
    status: "Đã phản hồi",
    priority: "TRUNG BÌNH",
    assignedTo: "PGS.TS Trần Hùng",
    createdAt: "10:00 - 05/03/2026",
    responseTime: "1 giờ trước",
    response: {
      // Recommendation.recommendation_id = "REC-006"
      // TV-006 is NOT pre-seeded as paid → content is payment-gated (blurred)
      title: "Chẩn đoán thiếu Kali – bắp cải xoăn Khu B",
      diagnosis: "Thiếu Kali (K) điển hình kết hợp stress nhiệt nhẹ",
      observation:
        "Triệu chứng vàng lá từ mép vào trong ở lá già là dấu hiệu kinh điển của thiếu Kali. pH đất Khu B hiện dao động 6.8–7.1, hơi cao, làm giảm khả năng hấp thu K của rễ dù hàm lượng trong đất đủ.",
      recommendation:
        "Bón bổ sung Kali Sulphate (K2SO4) với liều 15–20 kg/1000m², chia 2 lần bón cách nhau 10 ngày. Kết hợp tưới nhỏ giọt để đưa dinh dưỡng trực tiếp vào vùng rễ. Không sử dụng KCl vì Clo ảnh hưởng xấu đến chất lượng bắp cải xoăn.",
      treatmentPlan:
        "Bón phân đợt 1 trong 2 ngày · Kiểm tra màu lá sau 7 ngày · Bón đợt 2 nếu triệu chứng còn",
      specialistOrg: "Viện Khoa học Tự nhiên (Viện KHTN)",
      createdAt: "11:30 - 05/03/2026",
      updatedAt: "11:30 - 05/03/2026",
    },
  },
];

export const mockConsultationHistory: ConsultationHistory[] = [
  {
    // Mirrors: Recommendation.recommendation_id = "REC-003"
    // linked to Pest_Detections.pest_detection_id = "PD-003"
    responseId: "REC-003", // Recommendation.recommendation_id
    requestId: "TV-003", // UI id of AdvisoryRequest (= PD-003)
    crop: "Bắp Cải Xoăn",
    disease: "Than thư (Anthracnose)", // Pest_Detections.general_label
    priority: "CAO",
    specialist: "PGS.TS Trần Hùng",
    respondedAt: "11:00 - 13/05/2024", // Recommendation.created_at
    paymentStatus: "UNPAID", // TODO: replace with backend payment status
  },
  {
    // Mirrors: Recommendation.recommendation_id = "REC-002"
    responseId: "REC-002",
    requestId: "TV-002",
    crop: "Bắp Cải Tím",
    disease: "Phấn trắng (Powdery Mildew)",
    priority: "TRUNG BÌNH",
    specialist: "ThS. Hoàng Lan",
    respondedAt: "13:00 - 14/05/2024",
    paymentStatus: "UNPAID",
  },
  {
    // Mirrors: Recommendation.recommendation_id = "REC-005"
    // TV-005 is pre-seeded as PAID in AdvisoryPage.tsx
    responseId: "REC-005",
    requestId: "TV-005",
    crop: "Bắp Cải Tím",
    disease: "Sương mai (Late Blight)",
    priority: "CAO",
    specialist: "ThS. Hoàng Lan",
    respondedAt: "11:00 - 02/03/2026",
    paymentStatus: "PAID",
  },
  {
    // Mirrors: Recommendation.recommendation_id = "REC-006"
    // TV-006 is NOT pre-seeded as paid → payment-gated
    responseId: "REC-006",
    requestId: "TV-006",
    crop: "Bắp Cải Xoăn",
    disease: "Thiếu Kali (Potassium deficiency)",
    priority: "TRUNG BÌNH",
    specialist: "PGS.TS Trần Hùng",
    respondedAt: "11:30 - 05/03/2026",
    paymentStatus: "UNPAID",
  },
];

/**
 * Specialist — mirrors the specialist subset of the Users table.
 * TODO: replace with real API response from GET /api/specialists
 */
export interface Specialist {
  /** Maps to Users.user_id */
  id: string;
  /** Full display name including academic title */
  name: string;
  /** Organisation / institution name */
  org: string;
}

export const mockSpecialists: Specialist[] = [
  {
    id: "SP-001",
    name: "TS. Nguyễn Văn Minh",
    org: "Viện Khoa học Tự nhiên (Viện KHTN)",
  },
  {
    id: "SP-002",
    name: "ThS. Hoàng Lan",
    org: "Viện Khoa học Tự nhiên (Viện KHTN)",
  },
  {
    id: "SP-003",
    name: "PGS.TS Trần Hùng",
    org: "Viện Khoa học Tự nhiên (Viện KHTN)",
  },
];

// =================== PLOTS / LANDS PAGE ===================
export type LandStatus = "Hoạt động" | "Không hoạt động";
export type PlotStatus = "Đang sử dụng" | "Khả dụng" | "Không khả dụng";

export interface LandPlot {
  id: string;
  name: string;
  area: number;
  crop?: string;
  season?: string;
  status: PlotStatus;
  plantedDate?: string;
  actualCrops?: number;
}

export interface LandArea {
  id: string;
  name: string;
  farm: string;
  totalArea: number;
  usedArea: number;
  remainingArea: number;
  landType: string;
  status: LandStatus;
  plots: LandPlot[];
  description?: string;
  createdDate: string;
}

export const mockLands: LandArea[] = [
  {
    id: "1",
    name: "Khu đất phía Bắc",
    farm: "Nông trại xanh",
    totalArea: 5000,
    usedArea: 3500,
    remainingArea: 1500,
    landType: "Đất Thịt",
    status: "Hoạt động",
    createdDate: "12/01/2023",
    description: "Không có mô tả thêm.",
    plots: [
      {
        id: "A1",
        name: "Luống A1",
        area: 50,
        crop: "Bắp Cải Trắng",
        season: "Mùa Xuân 2026",
        status: "Đang sử dụng",
        plantedDate: "15/01/2026",
        actualCrops: 7,
      },
      {
        id: "A2",
        name: "Luống A2",
        area: 50,
        crop: "Bắp Cải Trắng",
        season: "Mùa Xuân 2026",
        status: "Đang sử dụng",
        plantedDate: "15/01/2026",
        actualCrops: 7,
      },
      {
        id: "A3",
        name: "Luống A3",
        area: 50,
        crop: "Bắp Cải Tím",
        season: "Mùa Xuân 2026",
        status: "Đang sử dụng",
        plantedDate: "15/01/2026",
        actualCrops: 7,
      },
    ],
  },
  {
    id: "2",
    name: "Khu đất phía Nam",
    farm: "Nông trại xanh",
    totalArea: 3500,
    usedArea: 0,
    remainingArea: 3500,
    landType: "Đất pha sét",
    status: "Hoạt động",
    createdDate: "12/01/2023",
    plots: [
      {
        id: "B1",
        name: "Luống B1",
        area: 70,
        crop: "Bắp Cải Xoăn",
        season: "Mùa Xuân 2025",
        status: "Đang sử dụng",
        plantedDate: "20/01/2025",
        actualCrops: 7,
      },
      { id: "B2", name: "Luống B2", area: 70, status: "Khả dụng" },
    ],
  },
];

// =================== TASKS PAGE ===================

export interface TaskTemplate {
  id: string;
  name: string;
  type: string;
  description: string;
  crop: string;
  icon: string;
  iconBg: string;
}

export interface TaskAssignment {
  id: string;
  templateId: string;
  taskName: string;
  taskIcon: string;
  taskIconBg: string;
  area: string;
  plot: string;
  date: string;
  displayDate: string;
  time: string;
  workerIds: string[];
  workerNames: string[];
  status: "pending" | "in-progress" | "completed";
  notes: string;
  seasonId?: string;
}

export const mockTaskTemplates: TaskTemplate[] = [
  {
    id: "tpl-1",
    name: "Tưới nước",
    type: "Tưới nước",
    description: "Tưới nước định kỳ theo lịch",
    crop: "",
    icon: "Tưới nước",
    iconBg: "#dbeafe",
  },
  {
    id: "tpl-2",
    name: "Bón phân NPK",
    type: "Bón phân",
    description: "Bón phân NPK giai đoạn phát triển",
    crop: "Bắp Cải Trắng",
    icon: "Bón phân",
    iconBg: "#dcfce7",
  },
  {
    id: "tpl-3",
    name: "Phun thuốc trừ sâu",
    type: "Bảo vệ thực vật",
    description: "Phun thuốc phòng ngừa sâu hại",
    crop: "",
    icon: "Bảo vệ thực vật",
    iconBg: "#fef9c3",
  },
  {
    id: "tpl-4",
    name: "Kiểm tra sức khoẻ cây",
    type: "Kiểm tra",
    description: "Quan sát và ghi nhận tình trạng cây trồng",
    crop: "",
    icon: "Kiểm tra",
    iconBg: "#f3e8ff",
  },
  {
    id: "tpl-5",
    name: "Thu hoạch",
    type: "Thu hoạch",
    description: "Thu hoạch bắp cải đạt tiêu chuẩn",
    crop: "",
    icon: "Thu hoạch",
    iconBg: "#f0fdf4",
  },
];

// =================== GROWTH TRACKING ===================

export interface CropGrowthTask {
  growthTaskId: string;
  stageId: string;
  taskName: string;
  taskDescription: string;
  frequency: string;
  durationMinutes: number;
  requiredTools: string;
  requiredMaterials: string;
  quantityPerUnit: number;
  quantityUnit: string;
  priority: string;
  isMandatory: boolean;
  notes: string;
}

export interface CropGrowthStage {
  stageId: string;
  cropId: string;
  stageName: string;
  stageDescription: string;
  expectedDurationDays: number;
  temperatureMin: number;
  humidityMin: number;
  soilMoistureMin: number;
  growthIndicators: string;
  commonDiseases: string;
  notes: string;
  tasks: CropGrowthTask[];
}

// Growth stages for crop id "1" (Bắp Cải Trắng)
export const mockGrowthStagesBapCaiTrang: CropGrowthStage[] = [
  {
    stageId: "gs-1-1",
    cropId: "1",
    stageName: "Nảy mầm",
    stageDescription:
      "Hạt giống hút nước và nảy mầm, rễ mầm xuất hiện trước tiên.",
    expectedDurationDays: 7,
    temperatureMin: 18,
    humidityMin: 70,
    soilMoistureMin: 60,
    growthIndicators: "Hạt nứt vỏ, rễ mầm dài 1–2 cm, lá mầm xuất hiện",
    commonDiseases: "Thối rễ mầm (Pythium), Lở cổ rễ",
    notes: "Giữ ẩm đất liên tục, tránh để khô hoặc ngập úng.",
    tasks: [
      {
        growthTaskId: "gt-1-1-1",
        stageId: "gs-1-1",
        taskName: "Gieo hạt",
        taskDescription: "Gieo hạt ở độ sâu 0.5–1 cm, khoảng cách 5 cm.",
        frequency: "Một lần",
        durationMinutes: 60,
        requiredTools: "Khay ươm, bình tưới",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 3,
        quantityUnit: "hạt/ô",
        isMandatory: true,
        notes: "",
      },
      {
        growthTaskId: "gt-1-1-2",
        stageId: "gs-1-1",
        taskName: "Tưới nước mầm",
        taskDescription: "Tưới nhẹ 2 lần/ngày để duy trì độ ẩm khay ươm.",
        frequency: "Hàng ngày",
        durationMinutes: 15,
        requiredTools: "Bình tưới phun sương",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 0.5,
        quantityUnit: "lít/m²",
        isMandatory: true,
        notes: "",
      },
    ],
  },
  {
    stageId: "gs-1-2",
    cropId: "1",
    stageName: "Cây con",
    stageDescription: "Cây phát triển 2–4 lá thật, rễ bắt đầu lan rộng.",
    expectedDurationDays: 14,
    temperatureMin: 15,
    humidityMin: 65,
    soilMoistureMin: 55,
    growthIndicators: "4 lá thật, chiều cao 8–12 cm, thân thẳng",
    commonDiseases: "Sâu tơ, Bọ nhảy, Bệnh chết rạp cây con",
    notes: "Giai đoạn tỉa cây giữ mật độ tối ưu 40×40 cm.",
    tasks: [
      {
        growthTaskId: "gt-1-2-1",
        stageId: "gs-1-2",
        taskName: "Tỉa cây yếu",
        taskDescription: "Loại bỏ cây còi cọc, giữ 1 cây/hốc.",
        frequency: "Một lần",
        durationMinutes: 45,
        requiredTools: "Kéo cắt, găng tay",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 1,
        quantityUnit: "cây/hốc",
        isMandatory: true,
        notes: "",
      },
      {
        growthTaskId: "gt-1-2-2",
        stageId: "gs-1-2",
        taskName: "Bón phân lót NPK",
        taskDescription: "Bón NPK 16-16-8 lót quanh gốc, không tiếp xúc rễ.",
        frequency: "Một lần",
        durationMinutes: 60,
        requiredTools: "Xẻng nhỏ, bảo hộ lao động",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 20,
        quantityUnit: "g/cây",
        isMandatory: true,
        notes: "",
      },
      {
        growthTaskId: "gt-1-2-3",
        stageId: "gs-1-2",
        taskName: "Kiểm tra sâu bệnh",
        taskDescription: "Quan sát mặt dưới lá, phát hiện sâu tơ và bọ nhảy.",
        frequency: "3 ngày/lần",
        durationMinutes: 30,
        requiredTools: "Kính lúp, sổ ghi chép",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 0,
        quantityUnit: "",
        isMandatory: false,
        notes: "",
      },
    ],
  },
  {
    stageId: "gs-1-3",
    cropId: "1",
    stageName: "Phát triển lá",
    stageDescription: "Giai đoạn tăng sinh khối lá nhanh, cây mở rộng tán.",
    expectedDurationDays: 21,
    temperatureMin: 13,
    humidityMin: 60,
    soilMoistureMin: 50,
    growthIndicators: "12–16 lá, tán rộng 25–35 cm, lá màu xanh đậm",
    commonDiseases: "Sâu tơ Plutella, Bệnh đốm vòng Alternaria",
    notes: "Tăng cường Kali để lá cứng và chống đổ ngã.",
    tasks: [
      {
        growthTaskId: "gt-1-3-1",
        stageId: "gs-1-3",
        taskName: "Bón thúc lần 1",
        taskDescription:
          "Bón Ure 46% kết hợp KCl xung quanh gốc bán kính 10 cm.",
        frequency: "Một lần",
        durationMinutes: 75,
        requiredTools: "Xô, cân tiểu ly",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 15,
        quantityUnit: "g/cây",
        isMandatory: true,
        notes: "",
      },
      {
        growthTaskId: "gt-1-3-2",
        stageId: "gs-1-3",
        taskName: "Tưới nhỏ giọt",
        taskDescription: "Duy trì hệ thống tưới nhỏ giọt 2 lần/ngày.",
        frequency: "Hàng ngày",
        durationMinutes: 10,
        requiredTools: "Hệ thống tưới nhỏ giọt",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 1.5,
        quantityUnit: "lít/cây/ngày",
        isMandatory: true,
        notes: "",
      },
    ],
  },
  {
    stageId: "gs-1-4",
    cropId: "1",
    stageName: "Cuộn bắp",
    stageDescription: "Lá trong bắt đầu cuộn chặt tạo thành bắp cải.",
    expectedDurationDays: 21,
    temperatureMin: 10,
    humidityMin: 55,
    soilMoistureMin: 50,
    growthIndicators: "Bắp hình cầu đường kính 8–15 cm, chắc tay",
    commonDiseases: "Sâu xanh bướm trắng, Thối nhũn vi khuẩn",
    notes: "Giảm tưới 20% để bắp chắc, tránh nứt bắp.",
    tasks: [
      {
        growthTaskId: "gt-1-4-1",
        stageId: "gs-1-4",
        taskName: "Bón thúc lần 2",
        taskDescription: "Bón NPK 15-5-20 giàu Kali hỗ trợ cuộn bắp.",
        frequency: "Một lần",
        durationMinutes: 60,
        requiredTools: "Xô, bảo hộ lao động",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 25,
        quantityUnit: "g/cây",
        isMandatory: true,
        notes: "",
      },
      {
        growthTaskId: "gt-1-4-2",
        stageId: "gs-1-4",
        taskName: "Phun phòng bệnh thối nhũn",
        taskDescription: "Phun Copper Hydroxide 77% để phòng vi khuẩn.",
        frequency: "7 ngày/lần",
        durationMinutes: 40,
        requiredTools: "Bình phun, bảo hộ hóa chất",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 30,
        quantityUnit: "ml/10L nước",
        isMandatory: false,
        notes: "",
      },
    ],
  },
  {
    stageId: "gs-1-5",
    cropId: "1",
    stageName: "Thu hoạch",
    stageDescription: "Bắp cải đạt độ chín, sẵn sàng thu hoạch.",
    expectedDurationDays: 7,
    temperatureMin: 10,
    humidityMin: 50,
    soilMoistureMin: 40,
    growthIndicators: "Bắp chắc, nặng 1–2 kg, lá ngoài màu xanh bóng",
    commonDiseases: "Nứt bắp do mưa lớn",
    notes:
      "Thu hoạch vào buổi sáng sớm khi nhiệt độ thấp để bảo quản tươi lâu.",
    tasks: [
      {
        growthTaskId: "gt-1-5-1",
        stageId: "gs-1-5",
        taskName: "Kiểm tra độ chín",
        taskDescription: "Bóp nhẹ bắp, nếu chắc tay và không xốp là đạt.",
        frequency: "Hàng ngày",
        durationMinutes: 20,
        requiredTools: "Cân đồng hồ",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 0,
        quantityUnit: "",
        isMandatory: true,
        notes: "",
      },
      {
        growthTaskId: "gt-1-5-2",
        stageId: "gs-1-5",
        taskName: "Thu hoạch và phân loại",
        taskDescription: "Cắt bắp, loại bỏ lá già, phân loại theo kích thước.",
        frequency: "Một lần",
        durationMinutes: 120,
        requiredTools: "Dao thu hoạch, thùng nhựa, cân",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 0,
        quantityUnit: "",
        isMandatory: true,
        notes: "",
      },
    ],
  },
];

// Growth stages for crop id "3" (Bắp Cải Xoăn / Kale)
export const mockGrowthStagesBapCaiXoan: CropGrowthStage[] = [
  {
    stageId: "gs-3-1",
    cropId: "3",
    stageName: "Nảy mầm",
    stageDescription: "Hạt giống nảy mầm trong điều kiện nhiệt độ mát.",
    expectedDurationDays: 5,
    temperatureMin: 15,
    humidityMin: 70,
    soilMoistureMin: 65,
    growthIndicators: "Hạt nứt vỏ sau 3–5 ngày, lá mầm xanh nhạt",
    commonDiseases: "Lở cổ rễ, thối hạt",
    notes: "Kale cần nhiệt độ mát hơn bắp cải thông thường.",
    tasks: [
      {
        growthTaskId: "gt-3-1-1",
        stageId: "gs-3-1",
        taskName: "Gieo hạt trong khay",
        taskDescription: "Gieo 2 hạt/ô ở độ sâu 0.5 cm.",
        frequency: "Một lần",
        durationMinutes: 45,
        requiredTools: "Khay ươm 50 ô, bình phun",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 2,
        quantityUnit: "hạt/ô",
        isMandatory: true,
        notes: "",
      },
    ],
  },
  {
    stageId: "gs-3-2",
    cropId: "3",
    stageName: "Cây con & Ra lá xoăn",
    stageDescription: "Lá đặc trưng xoăn bắt đầu xuất hiện từ lá thật thứ 3.",
    expectedDurationDays: 20,
    temperatureMin: 13,
    humidityMin: 60,
    soilMoistureMin: 55,
    growthIndicators: "5–7 lá xoăn, màu xanh đậm, chiều cao 15 cm",
    commonDiseases: "Sâu tơ, rệp xanh",
    notes: "Kale cần ánh sáng đầy đủ để lá xoăn đặc trưng hình thành.",
    tasks: [
      {
        growthTaskId: "gt-3-2-1",
        stageId: "gs-3-2",
        taskName: "Cấy chuyển ra luống",
        taskDescription: "Cấy cây con ra luống khoảng cách 35×35 cm.",
        frequency: "Một lần",
        durationMinutes: 90,
        requiredTools: "Bay cấy, thước đo khoảng cách",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 1,
        quantityUnit: "cây/hốc",
        isMandatory: true,
        notes: "",
      },
      {
        growthTaskId: "gt-3-2-2",
        stageId: "gs-3-2",
        taskName: "Bón phân lót",
        taskDescription: "Bón phân hữu cơ vi sinh 500 g/m² trước cấy.",
        frequency: "Một lần",
        durationMinutes: 50,
        requiredTools: "Xẻng, bảo hộ",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 500,
        quantityUnit: "g/m²",
        isMandatory: true,
        notes: "",
      },
    ],
  },
  {
    stageId: "gs-3-3",
    cropId: "3",
    stageName: "Phát triển & Thu hoạch liên tục",
    stageDescription: "Kale trưởng thành, có thể thu hoạch lá ngoài liên tục.",
    expectedDurationDays: 30,
    temperatureMin: 10,
    humidityMin: 55,
    soilMoistureMin: 50,
    growthIndicators: "Cây cao 40–60 cm, lá ngoài đủ kích thước thu hoạch",
    commonDiseases: "Bệnh đốm lá Alternaria, rệp",
    notes: "Thu hoạch lá ngoài để kích thích lá trong tiếp tục phát triển.",
    tasks: [
      {
        growthTaskId: "gt-3-3-1",
        stageId: "gs-3-3",
        taskName: "Thu hoạch lá ngoài",
        taskDescription: "Cắt 3–5 lá ngoài cùng, để lại lá trong và chồi ngọn.",
        frequency: "7 ngày/lần",
        durationMinutes: 60,
        requiredTools: "Dao sắc, giỏ thu hoạch",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 5,
        quantityUnit: "lá/cây",
        isMandatory: true,
        notes: "",
      },
      {
        growthTaskId: "gt-3-3-2",
        stageId: "gs-3-3",
        taskName: "Bón thúc Đạm",
        taskDescription:
          "Bón Ure 46% hòa loãng tưới gốc sau mỗi lần thu hoạch.",
        frequency: "7 ngày/lần",
        durationMinutes: 30,
        requiredTools: "Thùng pha phân, bình tưới",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 10,
        quantityUnit: "g/cây",
        isMandatory: false,
        notes: "",
      },
    ],
  },
];

// Growth stages for crop id "2" (Bắp Cải Tím)
export const mockGrowthStagesBapCaiTim: CropGrowthStage[] = [
  {
    stageId: "gs-2-1",
    cropId: "2",
    stageName: "Nảy mầm",
    stageDescription:
      "Hạt giống hút nước và nảy mầm, lá mầm tím nhạt xuất hiện.",
    expectedDurationDays: 8,
    temperatureMin: 16,
    humidityMin: 70,
    soilMoistureMin: 60,
    growthIndicators: "Hạt nứt vỏ, lá mầm tím nhạt, rễ mầm dài 1–2 cm",
    commonDiseases: "Thối rễ mầm (Pythium), Lở cổ rễ",
    notes: "Giữ ẩm liên tục, che sáng nhẹ 30% để tránh mầm bị héo.",
    tasks: [
      {
        growthTaskId: "gt-2-1-1",
        stageId: "gs-2-1",
        taskName: "Gieo hạt",
        taskDescription: "Gieo hạt ở độ sâu 0.5–1 cm trong khay ươm.",
        frequency: "Một lần",
        durationMinutes: 60,
        requiredTools: "Khay ươm, bình tưới phun sương",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 3,
        quantityUnit: "hạt/ô",
        isMandatory: true,
        notes: "",
      },
      {
        growthTaskId: "gt-2-1-2",
        stageId: "gs-2-1",
        taskName: "Tưới dưỡng mầm",
        taskDescription: "Tưới nhẹ 2 lần/ngày giữ ẩm khay ươm.",
        frequency: "Hàng ngày",
        durationMinutes: 15,
        requiredTools: "Bình phun sương",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 0.5,
        quantityUnit: "lít/m²",
        isMandatory: true,
        notes: "",
      },
    ],
  },
  {
    stageId: "gs-2-2",
    cropId: "2",
    stageName: "Cây con",
    stageDescription:
      "Cây phát triển 3–5 lá thật với sắc tím đặc trưng bắt đầu xuất hiện.",
    expectedDurationDays: 16,
    temperatureMin: 14,
    humidityMin: 65,
    soilMoistureMin: 55,
    growthIndicators: "4–5 lá thật màu xanh tím, chiều cao 10–14 cm",
    commonDiseases: "Sâu tơ, Bọ nhảy, Bệnh chết rạp cây con",
    notes:
      "Bắp cải tím cần ánh sáng đủ để phát triển màu sắc anthocyanin đặc trưng.",
    tasks: [
      {
        growthTaskId: "gt-2-2-1",
        stageId: "gs-2-2",
        taskName: "Tỉa cây yếu",
        taskDescription: "Loại bỏ cây còi cọc, giữ 1 cây/hốc.",
        frequency: "Một lần",
        durationMinutes: 45,
        requiredTools: "Kéo cắt nhỏ, găng tay",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 1,
        quantityUnit: "cây/hốc",
        isMandatory: true,
        notes: "",
      },
      {
        growthTaskId: "gt-2-2-2",
        stageId: "gs-2-2",
        taskName: "Bón phân lót NPK",
        taskDescription: "Bón NPK 16-16-8 lót quanh gốc, không tiếp xúc rễ.",
        frequency: "Một lần",
        durationMinutes: 60,
        requiredTools: "Xẻng nhỏ, bảo hộ lao động",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 20,
        quantityUnit: "g/cây",
        isMandatory: true,
        notes: "",
      },
    ],
  },
  {
    stageId: "gs-2-3",
    cropId: "2",
    stageName: "Phát triển lá",
    stageDescription:
      "Lá phát triển mạnh, màu tím đậm dần, cây tích lũy anthocyanin.",
    expectedDurationDays: 25,
    temperatureMin: 12,
    humidityMin: 60,
    soilMoistureMin: 50,
    growthIndicators: "14–18 lá màu tím đặc trưng, tán rộng 28–38 cm",
    commonDiseases: "Sâu tơ Plutella, Bệnh đốm vòng Alternaria, Rệp cải",
    notes:
      "Bắp cải tím cần nhiệt độ mát và ánh sáng nhiều để màu tím đẹp nhất.",
    tasks: [
      {
        growthTaskId: "gt-2-3-1",
        stageId: "gs-2-3",
        taskName: "Bón thúc lần 1",
        taskDescription: "Bón NPK 20-10-10 giàu đạm hỗ trợ phát triển lá.",
        frequency: "Một lần",
        durationMinutes: 75,
        requiredTools: "Xô, cân tiểu ly",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 15,
        quantityUnit: "g/cây",
        isMandatory: true,
        notes: "",
      },
      {
        growthTaskId: "gt-2-3-2",
        stageId: "gs-2-3",
        taskName: "Phun phòng sâu tơ",
        taskDescription:
          "Phun Bacillus thuringiensis (Bt) phòng trừ sâu tơ sinh học.",
        frequency: "7 ngày/lần",
        durationMinutes: 40,
        requiredTools: "Bình phun 16L, bảo hộ lao động",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 20,
        quantityUnit: "ml/10L nước",
        isMandatory: false,
        notes: "",
      },
    ],
  },
  {
    stageId: "gs-2-4",
    cropId: "2",
    stageName: "Cuộn bắp",
    stageDescription:
      "Lá trong cuộn chặt tạo thành bắp tím chắc, màu sắc đậm nhất.",
    expectedDurationDays: 25,
    temperatureMin: 10,
    humidityMin: 55,
    soilMoistureMin: 48,
    growthIndicators:
      "Bắp hình cầu đường kính 10–16 cm, màu tím đỏ đậm, chắc tay",
    commonDiseases: "Sâu xanh bướm trắng, Thối nhũn vi khuẩn",
    notes:
      "Giảm tưới 20% để bắp chắc. Không bón đạm giai đoạn này để giữ màu tím.",
    tasks: [
      {
        growthTaskId: "gt-2-4-1",
        stageId: "gs-2-4",
        taskName: "Bón thúc Kali",
        taskDescription: "Bón K2SO4 hỗ trợ cuộn bắp và tăng màu anthocyanin.",
        frequency: "Một lần",
        durationMinutes: 60,
        requiredTools: "Xô, bảo hộ lao động",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 20,
        quantityUnit: "g/cây",
        isMandatory: true,
        notes: "",
      },
    ],
  },
  {
    stageId: "gs-2-5",
    cropId: "2",
    stageName: "Thu hoạch",
    stageDescription:
      "Bắp cải tím đạt độ chín, màu tím đỏ đặc trưng, sẵn sàng thu hoạch.",
    expectedDurationDays: 11,
    temperatureMin: 8,
    humidityMin: 50,
    soilMoistureMin: 40,
    growthIndicators:
      "Bắp chắc nặng 1.5–2.5 kg, màu tím đỏ đồng đều, lá ngoài bóng",
    commonDiseases: "Nứt bắp do tưới không đều",
    notes:
      "Thu hoạch sáng sớm để giữ màu tím tươi. Tránh va đập làm phai màu anthocyanin.",
    tasks: [
      {
        growthTaskId: "gt-2-5-1",
        stageId: "gs-2-5",
        taskName: "Kiểm tra độ chín",
        taskDescription: "Bóp nhẹ bắp, màu tím đồng đều là đạt.",
        frequency: "Hàng ngày",
        durationMinutes: 20,
        requiredTools: "Cân đồng hồ",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 0,
        quantityUnit: "",
        isMandatory: true,
        notes: "",
      },
      {
        growthTaskId: "gt-2-5-2",
        stageId: "gs-2-5",
        taskName: "Thu hoạch và phân loại",
        taskDescription:
          "Cắt bắp, giữ 2–3 lá bọc ngoài bảo vệ màu, phân loại theo kích thước.",
        frequency: "Một lần",
        durationMinutes: 120,
        requiredTools: "Dao thu hoạch, thùng nhựa tối màu, cân",
        requiredMaterials: "",
        priority: "MEDIUM",
        quantityPerUnit: 0,
        quantityUnit: "",
        isMandatory: true,
        notes: "",
      },
    ],
  },
];

// Map cropId → growth stages
export const mockGrowthStagesByCropId: Record<string, CropGrowthStage[]> = {
  "1": mockGrowthStagesBapCaiTrang,
  "2": mockGrowthStagesBapCaiTim,
  "3": mockGrowthStagesBapCaiXoan,
};

export const mockTaskAssignments: TaskAssignment[] = [
  {
    id: "asgn-1",
    templateId: "tpl-1",
    taskName: "Tưới nước",
    taskIcon: "Tưới nước",
    taskIconBg: "#dbeafe",
    area: "Khu A",
    plot: "Luống 01",
    date: "2023-12-20",
    displayDate: "20/12/2023",
    time: "07:00 - 09:00",
    workerIds: ["1", "2"],
    workerNames: ["Trần Văn E", "Lê Thị F"],
    status: "in-progress",
    notes: "",
  },
  {
    id: "asgn-2",
    templateId: "tpl-2",
    taskName: "Bón phân NPK",
    taskIcon: "Bón phân",
    taskIconBg: "#dcfce7",
    area: "Khu B",
    plot: "Luống 03",
    date: "2023-12-20",
    displayDate: "20/12/2023",
    time: "08:00 - 10:00",
    workerIds: ["3"],
    workerNames: ["Nguyễn Văn G"],
    status: "completed",
    notes: "Đã hoàn thành. Cây hấp thu tốt.",
  },
  {
    id: "asgn-3",
    templateId: "tpl-3",
    taskName: "Phun thuốc trừ sâu",
    taskIcon: "Bảo vệ thực vật",
    taskIconBg: "#fef9c3",
    area: "Khu C",
    plot: "Luống 05",
    date: "2023-12-22",
    displayDate: "22/12/2023",
    time: "14:00 - 16:00",
    workerIds: ["1"],
    workerNames: ["Trần Văn E"],
    status: "pending",
    notes: "",
  },
  {
    id: "asgn-4",
    templateId: "tpl-4",
    taskName: "Kiểm tra sức khoẻ cây",
    taskIcon: "Kiểm tra",
    taskIconBg: "#f3e8ff",
    area: "Khu A",
    // plot is a summary string; full group detail is in bedGroupsMap in TasksPage
    plot: "Nhóm 1: Luống 01, Luống 02, Luống 03 | Nhóm 2: Luống 04, Luống 05, Luống 06",
    date: "2023-12-18",
    displayDate: "18/12/2023",
    time: "06:00 - 08:00",
    workerIds: ["1", "2", "5", "6"],
    workerNames: ["Trần Văn E", "Lê Thị F", "Vũ Văn I", "Bùi Văn L"],
    status: "pending",
    notes: "Kiểm tra kỹ dấu hiệu đốm lá và sâu cuốn lá.",
    seasonId: "1",
  },
];
