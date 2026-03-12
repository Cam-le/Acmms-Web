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
    icon: "💧",
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
    icon: "🥬",
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
    icon: "📋",
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
    icon: "🌡️",
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
    icon: "🌱",
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
    icon: "🥬",
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

export interface PlotAssignment {
  plotId: string;
  plotName: string;
  area: string;
  crop: SeasonCropType;
  sowingDate: string;
  harvestDate: string;
  quantity: number;
  status: SeasonStatus;
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
    name: "Mùa Hè 2025",
    farm: "Trang trại Thung lũng Xanh",
    startDate: "01-06-2025",
    endDate: "30-09-2025",
    status: "Đang hoạt động",
    description: "Vụ mùa chính trồng bắp cải trắng và bắp cải tím.",
    plots: [
      {
        plotId: "A-1",
        plotName: "Luống A-1",
        area: "Khu A (Phía Bắc)",
        crop: "Bắp Cải Trắng",
        sowingDate: "05/06/2025",
        harvestDate: "15/08/2025",
        quantity: 120,
        status: "Đang hoạt động",
      },
      {
        plotId: "A-2",
        plotName: "Luống A-2",
        area: "Khu A (Phía Bắc)",
        crop: "Bắp Cải Trắng",
        sowingDate: "06/06/2025",
        harvestDate: "15/08/2025",
        quantity: 120,
        status: "Đang hoạt động",
      },
      {
        plotId: "B-1",
        plotName: "Luống B-1",
        area: "Khu B (Phía Nam)",
        crop: "Bắp Cải Tím",
        sowingDate: "10/06/2025",
        harvestDate: "01/09/2025",
        quantity: 100,
        status: "Đang hoạt động",
      },
    ],
  },
  {
    id: "2",
    code: "MV002",
    name: "Vụ bắp cải xoăn Q2",
    farm: "Trang trại Nắng Hạ",
    startDate: "15-05-2025",
    endDate: "15-10-2025",
    status: "Đang hoạt động",
    description: "",
    plots: [
      {
        plotId: "C-1",
        plotName: "Luống C-1",
        area: "Khu C",
        crop: "Bắp Cải Xoăn",
        sowingDate: "20/05/2025",
        harvestDate: "10/10/2025",
        quantity: 80,
        status: "Đang hoạt động",
      },
    ],
  },
  {
    id: "3",
    code: "MV003",
    name: "Mùa Đông 2024",
    farm: "Trang trại Thung lũng Xanh",
    startDate: "01-11-2024",
    endDate: "28-02-2025",
    status: "Đã kết thúc",
    description: "Mùa vụ đông",
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
export type RequestStatus =
  | "Chờ phản hồi"
  | "Đang xử lý"
  | "Đã phản hồi"
  | "Đóng";
export type Priority = "CAO" | "TRUNG BÌNH" | "THẤP";
export type AdvisoryCropType = "Bắp Cải Trắng" | "Bắp Cải Tím" | "Bắp Cải Xoăn";

export interface AdvisoryRequest {
  id: string;
  title: string;
  crop: AdvisoryCropType;
  field: string;
  status: RequestStatus;
  priority: Priority;
  issue: string;
  description: string;
  images: string[];
  createdBy: string;
  createdAt: string;
  assignedTo?: string;
  responseTime?: string;
  response?: {
    diagnosis: string;
    observation: string;
    recommendation: string;
    treatmentPlan?: string;
  };
}

export const mockRequests: AdvisoryRequest[] = [
  {
    id: "1",
    title: "Bắp Cải Trắng",
    crop: "Bắp Cải Trắng",
    field: "Khu C",
    status: "Chờ phản hồi",
    priority: "CAO",
    issue: "Đốm lá nấm (Septoria)",
    description:
      "Phát hiện đốm trắng nghi ngờ nấm bệnh. Độ tin cậy: 92%. Lá bắp cải xuất hiện các đốm tròn màu nâu với viền vàng, có thể là triệu chứng của bệnh đốm lá do nấm.",
    images: [
      "https://kingbio.vn/wp-content/uploads/2026/02/Benh-Dom-Den-Nam-Septoria-Tren-Hoa-Giay.jpg",
      "https://kingbio.vn/wp-content/uploads/2026/02/Benh-Dom-Den-Nam-Septoria-Tren-Hoa-Giay.jpg",
    ],
    createdBy: "Mai Thị Hoa",
    createdAt: "14:20 - 15/05/2024",
  },
  {
    id: "2",
    title: "Bắp Cải Tím",
    crop: "Bắp Cải Tím",
    field: "Khu B (Nhà kính 1)",
    status: "Đang xử lý",
    priority: "TRUNG BÌNH",
    issue: "Phấn trắng (Powdery Mildew)",
    description:
      "Phát hiện lớp bột trắng trên lá bắp cải tím. Có thể là dấu hiệu của bệnh phấn trắng, cần xử lý ngay để tránh lây lan.",
    images: [
      "https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=400&h=300&fit=crop",
    ],
    createdBy: "Hoàng Lan",
    createdAt: "10:30 - 14/05/2024",
    assignedTo: "ThS. Hoàng Lan",
    response: {
      diagnosis: "Bệnh phấn trắng do nấm",
      observation:
        "Do độ ẩm không khí cao trong những ngày qua tại Khu C kết hợp với nhiệt độ thấp vào ban đêm, tạo điều kiện cho nấm phát triển.",
      recommendation:
        "Cần cách ly ngay các luống bị bệnh. Sử dụng thuốc bảo vệ thực vật có hoạt chất Metalaxyl hoặc Mancozeb để phun phòng trị. Lưu ý phun vét đều hai mặt lá.",
    },
  },
  {
    id: "3",
    title: "Bắp Cải Xoăn",
    crop: "Bắp Cải Xoăn",
    field: "Khu C (Ngoài trời)",
    status: "Đã phản hồi",
    priority: "CAO",
    issue: "Than thư (Anthracnose)",
    description:
      "Lá bắp cải xoăn có các vết đen, khô và cuộn lại. Nghi ngờ bệnh than thư hoặc thiếu dinh dưỡng.",
    images: [
      "https://images.unsplash.com/photo-1524179091875-bf99a9a6af57?w=400&h=300&fit=crop",
    ],
    createdBy: "Trần Hùng",
    createdAt: "08:15 - 13/05/2024",
    assignedTo: "PGS.TS Trần Hùng",
    responseTime: "2 giờ trước",
    response: {
      diagnosis: "Thiếu Nitơ và bệnh nấm than thư nhẹ",
      observation:
        "Dựa trên hình ảnh là có các đốm trắng lan rộng và viền lá bị cháy, đây là biểu hiện điển hình của Bệnh Sương Mai (Late Blight) giai đoạn đầu.",
      recommendation:
        "Cần cách ly ngay các luống bị bệnh. Sử dụng thuốc bảo vệ thực vật có hoạt chất Metalaxyl hoặc Mancozeb để phun phòng trị. Lưu ý phun vét đều hai mặt lá. Bổ sung phân đạm để cải thiện sức đề kháng.",
      treatmentPlan: "Xử lý trong vòng 3-5 ngày, theo dõi hàng ngày",
    },
  },
  {
    id: "4",
    title: "Bắp Cải Trắng",
    crop: "Bắp Cải Trắng",
    field: "Khu D (Nhà kính 3)",
    status: "Đóng",
    priority: "THẤP",
    issue: "Rệp trắng",
    description:
      "Xuất hiện rệp trắng trên mặt dưới lá bắp cải. Số lượng chưa nhiều nhưng cần kiểm soát sớm.",
    images: [
      "https://cdn.eva.vn/upload/1-2023/images/2023-01-08/cay-bi-rep-trang-tan-cong-hay-tuoi-thu-nuoc-than-nay-sau-1-dem-se-het-sach-3-1673132796-984-width780height488.jpg",
    ],
    createdBy: "Văn Minh",
    createdAt: "16:45 - 10/05/2024",
    assignedTo: "TS. Nguyễn Văn Minh",
    responseTime: "5 ngày trước",
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
  crop: string; // empty string = applies to all crops
  icon: string;
  iconBg: string;
}

export interface TaskAssignment {
  id: string;
  templateId: string;
  taskName: string; // denormalized from template for display
  taskIcon: string;
  taskIconBg: string;
  area: string;
  plot: string;
  date: string; // ISO YYYY-MM-DD
  displayDate: string; // DD/MM/YYYY
  time: string;
  workerIds: string[];
  workerNames: string[];
  status: "pending" | "in-progress" | "completed";
  notes: string;
}

export const mockTaskTemplates: TaskTemplate[] = [
  {
    id: "tpl-1",
    name: "Tưới nước",
    type: "Tưới nước",
    description: "Tưới nước định kỳ theo lịch",
    crop: "",
    icon: "💧",
    iconBg: "#dbeafe",
  },
  {
    id: "tpl-2",
    name: "Bón phân NPK",
    type: "Bón phân",
    description: "Bón phân NPK giai đoạn phát triển",
    crop: "Bắp Cải Trắng",
    icon: "🌱",
    iconBg: "#dcfce7",
  },
  {
    id: "tpl-3",
    name: "Phun thuốc trừ sâu",
    type: "Bảo vệ thực vật",
    description: "Phun thuốc phòng ngừa sâu hại",
    crop: "",
    icon: "🛡️",
    iconBg: "#fef9c3",
  },
  {
    id: "tpl-4",
    name: "Kiểm tra sức khoẻ cây",
    type: "Kiểm tra",
    description: "Quan sát và ghi nhận tình trạng cây trồng",
    crop: "",
    icon: "🔍",
    iconBg: "#f3e8ff",
  },
  {
    id: "tpl-5",
    name: "Thu hoạch",
    type: "Thu hoạch",
    description: "Thu hoạch bắp cải đạt tiêu chuẩn",
    crop: "",
    icon: "🌾",
    iconBg: "#f0fdf4",
  },
];

export const mockTaskAssignments: TaskAssignment[] = [
  {
    id: "asgn-1",
    templateId: "tpl-1",
    taskName: "Tưới nước",
    taskIcon: "💧",
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
    taskIcon: "🌱",
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
    taskIcon: "🛡️",
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
];
