// =================== MOCK DATA — SPECIALIST (CHUYÊN GIA) ===================
// Crop: Cabbage (Bắp cải) — Trắng, Tím, Xoăn  [team decision]
// Feature refs: FE-16, FE-17, FE-18
//
// Field alignment with Owner's AdvisoryRequest (AdvisoryPage) and ERD:
//   requestCode        ↔  AdvisoryRequest.id              / pest_detection_id (display)
//   crop               ↔  AdvisoryRequest.crop             / Crops table
//   issue              ↔  AdvisoryRequest.issue            / general_label
//   severity           ↔  AdvisoryRequest.priority         / general_severity
//   detectionStatus    ↔  AdvisoryRequest.status           / detection_status
//   aiConfidence       ↔  AdvisoryRequest.aiConfidence     / confidence_source
//   location           ↔  AdvisoryRequest.field            / Fields table
//   submittedAt        ↔  AdvisoryRequest.createdAt        / detected_at
//   aiDiagnosis        ↔  AdvisoryRequest.issue (AI label) / ai_label (ImageAnalysesResult)
//   response.title     ↔  AdvisoryRequest.response.title   / Recommendation.title
//   response.content   ↔  AdvisoryRequest.response.recommendation / Recommendation.content
//   response.diagnosis ↔  AdvisoryRequest.response.diagnosis
//   respondedAt        ↔  AdvisoryRequest.responseTime     / Recommendation.created_at

// ── Severity: matches owner's Priority but sentence-case ────────────────────
// Owner uses: "CAO" | "TRUNG BÌNH" | "THẤP"
// Specialist uses: "Cao" | "Trung bình" | "Thấp" | "Nghiêm trọng"
// When syncing to backend, map: Cao→CAO, Trung bình→TRUNG BÌNH, Thấp→THẤP
export type Severity = "Thấp" | "Trung bình" | "Cao" | "Nghiêm trọng";

// detection_status values — kept aligned with owner's RequestStatus where possible
// Owner:      "Chờ phản hồi" | "Đang xử lý" | "Đã phản hồi" | "Đóng"
// Specialist: "Chờ phản hồi" | "Đã phản hồi" | "Yêu cầu bổ sung"
export type DetectionStatus =
  | "Chờ phản hồi"
  | "Đã phản hồi"
  | "Yêu cầu bổ sung";

// ── Specialist recommendation response — maps to Recommendation table ────────
export interface SpecialistResponse {
  title: string; // Recommendation.title
  diagnosis: string; // specialist's confirmed diagnosis (review_notes)
  content: string; // Recommendation.content — treatment steps
  followUpAdvice: string; // follow-up guidance
  priority: Severity; // priority set by specialist
  attachments: string[]; // filenames
  respondedAt: string; // Recommendation.created_at
}

// ── Pest/disease detection record — maps to Pest_Detections + ImageAnalysesResult ──
export interface ConsultationRequest {
  id: string; // internal key
  requestCode: string; // display ID, e.g. #REQ-2094 — pest_detection_id display
  crop: string; // cabbage variety — aligns with AdvisoryRequest.crop
  farmName: string; // farm name for display
  location: string; // AdvisoryRequest.field — where in the farm
  growthStage: string; // growth stage at time of detection
  issue: string; // AdvisoryRequest.issue — short AI symptom label / general_label
  symptomDescription: string; // full description from worker (AdvisoryRequest detail)
  submittedAt: string; // detected_at / AdvisoryRequest.createdAt
  detectionStatus: DetectionStatus; // detection_status
  severity: Severity; // general_severity
  aiDiagnosis: string; // ImageAnalysesResult.ai_label
  aiConfidence: number; // ImageAnalysesResult.ai_confidence (confidence_source)
  aiSymptoms: string[]; // parsed from ImageAnalysesResult.bounding_box_json / extra_data_json
  aiRecommendation: string; // AI-suggested treatment (pre-specialist)
  temperature?: number; // from SensorData / WeatherData
  humidity?: number;
  response?: SpecialistResponse; // filled once specialist responds — Recommendation row
}

// ── History view row — maps to Recommendation table joined with Pest_Detections ─
export interface ConsultationHistoryRow {
  id: string;
  responseCode: string; // display ID, e.g. #RES-8821
  requestCode: string; // linked pest_detection display ID
  crop: string; // AdvisoryRequest.crop
  issue: string; // disease name / general_label
  priority: Severity; // Recommendation priority
  respondedAt: string; // Recommendation.created_at
  diagnosis: string; // review_notes
  content: string; // Recommendation.content
  followUpAdvice: string;
  attachments: string[];
}

// ── Consultation requests (pending + responded) ──────────────────────────────
export const mockConsultationRequests: ConsultationRequest[] = [
  {
    id: "req-2094",
    requestCode: "#REQ-2094",
    crop: "Bắp cải Trắng",
    farmName: "Nông trại Xanh",
    location: "Khu vực A2, Nhà màng số 4, Luống 12",
    growthStage: "Ra cuộn",
    issue: "Đốm nâu",
    symptomDescription:
      "Lá già phía dưới xuất hiện nhiều vết đốm màu nâu, có vòng đồng tâm. Các vết này lan dần lên các lá trên. Cây có hiện tượng vàng lá và rụng lá sớm. Tôi đã thử giảm lượng nước tưới nhưng tình trạng không thuyên giảm.",
    submittedAt: "2024-05-15T14:20:00",
    detectionStatus: "Chờ phản hồi",
    severity: "Cao",
    aiDiagnosis: "Bệnh đốm vòng (Alternaria)",
    aiConfidence: 94.5,
    aiSymptoms: [
      "Đốm nâu hình tròn đồng tâm",
      "Viền vàng (Chlorotic halo)",
      "Tổn thương lá già",
    ],
    aiRecommendation:
      "Phun thuốc diệt nấm gốc Mancozeb hoặc Chlorothalonil. Loại bỏ lá bệnh, tránh tưới nước lên lá buổi chiều.",
    temperature: 28,
    humidity: 82,
  },
  {
    id: "req-2093",
    requestCode: "#REQ-2093",
    crop: "Bắp cải Tím",
    farmName: "Nông trại Xanh",
    location: "Khu vực B1, Nhà màng số 2, Luống 5",
    growthStage: "Cây con",
    issue: "Héo muộn",
    symptomDescription:
      "Cây héo rũ vào buổi chiều, phục hồi ban đêm nhưng ngày càng kém hơn. Gốc thân có vết thâm nhũn.",
    submittedAt: "2024-05-14T09:15:00",
    detectionStatus: "Chờ phản hồi",
    severity: "Trung bình",
    aiDiagnosis: "Bệnh héo rũ (Fusarium wilt)",
    aiConfidence: 88.2,
    aiSymptoms: [
      "Héo chiều, phục hồi đêm",
      "Gốc thân thâm nhũn",
      "Lá dưới vàng không đều",
    ],
    aiRecommendation:
      "Xử lý đất bằng Trichoderma. Nhổ bỏ cây bệnh nặng, tránh lây lan.",
    temperature: 30,
    humidity: 75,
  },
  {
    id: "req-2088",
    requestCode: "#REQ-2088",
    crop: "Bắp cải Xoăn",
    farmName: "Nông trại Bình Minh",
    location: "Khu vực C, Nhà kính C1, Luống 3",
    growthStage: "Trưởng thành",
    issue: "Sâu đục lá",
    symptomDescription:
      "Lá có nhiều lỗ nhỏ li ti, mặt dưới lá thấy trứng và sâu non màu xanh nhạt.",
    submittedAt: "2024-05-14T09:15:00",
    detectionStatus: "Đã phản hồi",
    severity: "Thấp",
    aiDiagnosis: "Sâu tơ (Plutella xylostella)",
    aiConfidence: 92.0,
    aiSymptoms: [
      "Lỗ thủng mặt lá",
      "Sâu non xanh nhạt mặt dưới lá",
      "Phân sâu nhỏ li ti",
    ],
    aiRecommendation:
      "Phun Spinosad hoặc Bacillus thuringiensis (Bt). Đặt bẫy pheromone.",
    response: {
      title: "Phản hồi: Sâu tơ trên Bắp cải Xoăn (#REQ-2088)",
      diagnosis:
        "Xác nhận sâu tơ (Plutella xylostella). Mức độ gây hại nhẹ, chưa ảnh hưởng năng suất nếu xử lý kịp thời.",
      content:
        "1. Phun Spinosad 25SC liều 0.5ml/lít nước, 7 ngày/lần trong 2 tuần.\n2. Đặt bẫy pheromone để theo dõi mật độ sâu trưởng thành.\n3. Loại bỏ lá bị hại nặng để giảm nguồn sâu.",
      followUpAdvice:
        "Kiểm tra mặt dưới lá mỗi 3 ngày. Nếu mật độ tăng trở lại sau 2 tuần, chuyển sang Emamectin benzoate.",
      priority: "Thấp",
      attachments: [],
      respondedAt: "2023-10-24T08:30:00",
    },
  },
  {
    id: "req-2087",
    requestCode: "#REQ-2087",
    crop: "Bắp cải Trắng",
    farmName: "Nông trại Xanh",
    location: "Khu vực A1, Nhà màng số 1, Luống 8",
    growthStage: "Ra cuộn",
    issue: "Khảm lá",
    symptomDescription:
      "Lá xuất hiện các vùng xanh đậm xen kẽ xanh nhạt tạo thành hoa văn khảm. Cây còi cọc, lá biến dạng.",
    submittedAt: "2024-05-13T16:00:00",
    detectionStatus: "Chờ phản hồi",
    severity: "Trung bình",
    aiDiagnosis: "Virus khảm cải (TuMV)",
    aiConfidence: 86.7,
    aiSymptoms: ["Khảm xanh đậm/nhạt", "Lá biến dạng, cuốn", "Cây còi cọc"],
    aiRecommendation:
      "Không có thuốc đặc trị virus. Nhổ bỏ cây bệnh, kiểm soát rệp muội — vector lây bệnh.",
    temperature: 26,
    humidity: 70,
  },
  {
    id: "req-2086",
    requestCode: "#REQ-2086",
    crop: "Bắp cải Tím",
    farmName: "Nông trại Bình Minh",
    location: "Khu vực B2, Luống 10",
    growthStage: "Trưởng thành",
    issue: "Phấn trắng",
    symptomDescription:
      "Lớp phấn trắng xám phủ bề mặt lá, lá vàng dần từ dưới lên. Xuất hiện khi thời tiết ẩm ướt.",
    submittedAt: "2024-05-12T10:30:00",
    detectionStatus: "Chờ phản hồi",
    severity: "Cao",
    aiDiagnosis: "Bệnh sương mai (Downy Mildew)",
    aiConfidence: 91.3,
    aiSymptoms: [
      "Phấn trắng xám mặt lá",
      "Vùng vàng mặt trên lá",
      "Xuất hiện điều kiện ẩm",
    ],
    aiRecommendation:
      "Phun Metalaxyl + Mancozeb. Cải thiện thông thoáng, tránh tưới buổi chiều.",
    temperature: 22,
    humidity: 91,
  },
  {
    id: "req-2079",
    requestCode: "#REQ-2079",
    crop: "Bắp cải Xoăn",
    farmName: "Nông trại Xanh",
    location: "Khu vực A3, Luống 2",
    growthStage: "Cây con",
    issue: "Đạo ôn lá",
    symptomDescription: "Đốm hình thoi nâu xám trên lá, viền nâu đỏ.",
    submittedAt: "2024-05-11T08:00:00",
    detectionStatus: "Đã phản hồi",
    severity: "Trung bình",
    aiDiagnosis: "Bệnh đạo ôn lá (Alternaria brassicae)",
    aiConfidence: 83.5,
    aiSymptoms: ["Đốm hình thoi nâu xám", "Viền đốm nâu đỏ", "Lá già bị trước"],
    aiRecommendation: "Phun Propiconazole. Tăng khoảng cách trồng.",
    response: {
      title: "Phản hồi: Đạo ôn lá trên Bắp cải Xoăn (#REQ-2079)",
      diagnosis:
        "Bệnh đốm lá do Alternaria brassicae. Thường xuất hiện khi có sương mù kéo dài và nhiệt độ thấp.",
      content:
        "1. Phun Propiconazole 25EC (Tilt) liều 0.5ml/lít.\n2. Nhổ bỏ lá già bệnh nặng.\n3. Bón bổ sung Kali để tăng sức đề kháng.",
      followUpAdvice:
        "Đánh giá lại sau 10 ngày. Luân canh với rau họ khác vụ tới.",
      priority: "Trung bình",
      attachments: [],
      respondedAt: "2023-10-23T14:00:00",
    },
  },
  // Extra entries to demonstrate pagination
  {
    id: "req-2075",
    requestCode: "#REQ-2075",
    crop: "Bắp cải Trắng",
    farmName: "Nông trại Xanh",
    location: "Khu vực A4, Luống 6",
    growthStage: "Ra cuộn",
    issue: "Sâu keo",
    symptomDescription:
      "Sâu keo mùa thu cắn phá mạnh, cuộn lá và đục vào lõi bắp.",
    submittedAt: "2024-05-10T07:30:00",
    detectionStatus: "Đã phản hồi",
    severity: "Cao",
    aiDiagnosis: "Sâu keo mùa thu (Spodoptera frugiperda)",
    aiConfidence: 90.1,
    aiSymptoms: ["Cuộn lá", "Đục lõi bắp", "Phân dạng hạt"],
    aiRecommendation:
      "Phun Chlorfenapyr 240SC liều 1ml/lít, buổi chiều mát. Đặt bẫy bả protein.",
    response: {
      title: "Phản hồi: Sâu keo mùa thu (#REQ-2075)",
      diagnosis:
        "Sâu keo mùa thu (Spodoptera frugiperda). Gây hại nghiêm trọng giai đoạn ra cuộn.",
      content:
        "1. Phun Chlorfenapyr 240SC liều 1ml/lít buổi chiều.\n2. Đặt bẫy bả protein thủy phân.\n3. Kiểm tra và diệt ổ trứng thủ công.",
      followUpAdvice:
        "Phun nhắc lại sau 5 ngày nếu còn sâu non. Báo cáo ngay nếu >3 con/cây.",
      priority: "Cao",
      attachments: ["bao_cao_sau_keo.pdf"],
      respondedAt: "2023-10-22T09:10:00",
    },
  },
  {
    id: "req-2070",
    requestCode: "#REQ-2070",
    crop: "Bắp cải Tím",
    farmName: "Nông trại Bình Minh",
    location: "Khu vực B3, Luống 1",
    growthStage: "Trưởng thành",
    issue: "Mốc sương",
    symptomDescription:
      "Mốc xám phủ thân và lá già sau đợt mưa liên tục 3 ngày.",
    submittedAt: "2024-05-09T14:00:00",
    detectionStatus: "Đã phản hồi",
    severity: "Trung bình",
    aiDiagnosis: "Bệnh mốc sương (Botrytis cinerea)",
    aiConfidence: 87.4,
    aiSymptoms: ["Mốc xám trên lá", "Thân mềm nhũn", "Bào tử phát tán"],
    aiRecommendation:
      "Phun Iprodione 50WP liều 1.5g/lít. Cắt tỉa lá già, tăng thông thoáng.",
    response: {
      title: "Phản hồi: Mốc sương trên Bắp cải Tím (#REQ-2070)",
      diagnosis:
        "Bệnh mốc sương do Botrytis cinerea. Bùng phát sau mưa liên tục, ẩm độ >90%.",
      content:
        "1. Phun Iprodione 50WP liều 1.5g/lít.\n2. Cắt tỉa lá già, lá sát mặt đất.\n3. Tăng lưu thông không khí.",
      followUpAdvice: "Phun phòng định kỳ 2 tuần/lần mùa mưa.",
      priority: "Trung bình",
      attachments: [],
      respondedAt: "2023-10-21T11:45:00",
    },
  },
];

// ── Flat history rows (derived view — maps to Recommendation JOIN Pest_Detections) ──
// responseCode format: #RES-XXXX  — maps to recommendation_id display
export const mockConsultationHistory: ConsultationHistoryRow[] =
  mockConsultationRequests
    .filter((r) => r.detectionStatus === "Đã phản hồi" && !!r.response)
    .map((r, idx) => ({
      id: `res-${8821 - idx * 6}`,
      responseCode: `#RES-${8821 - idx * 6}`,
      requestCode: r.requestCode,
      crop: r.crop,
      issue:
        r.response!.title.split(":")[1]?.trim().split(" trên")[0] ?? r.issue,
      priority: r.response!.priority,
      respondedAt: r.response!.respondedAt,
      diagnosis: r.response!.diagnosis,
      content: r.response!.content,
      followUpAdvice: r.response!.followUpAdvice,
      attachments: r.response!.attachments,
    }));

// ── Dashboard summary stats ──────────────────────────────────────────────────
export const mockSpecialistStats = {
  pendingCount: mockConsultationRequests.filter(
    (r) => r.detectionStatus === "Chờ phản hồi",
  ).length,
  pendingNew: 3,
  totalDiseaseCases: mockConsultationRequests.length,
  diseaseCasesChangePercent: 12,
  urgentCount: mockConsultationRequests.filter((r) => r.severity === "Cao")
    .length,
};
