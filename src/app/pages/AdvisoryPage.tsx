import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  Plus,
  Search,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  ArrowLeft,
  ChevronRight,
  History,
  FileText,
  Cpu,
} from "lucide-react";
import {
  AdvisoryRequest,
  RequestStatus,
  Priority,
  AdvisoryCropType as CropType,
  WorkerReport,
  ConsultationHistory,
  mockRequests,
  mockWorkerReports,
  mockConsultationHistory,
} from "../../data/mockData";

// ===================== CONFIG =====================
const statusConfig: Record<
  RequestStatus,
  { color: string; icon: typeof Clock }
> = {
  "Chờ phản hồi": { color: "bg-[#fef3c7] text-[#92400e]", icon: Clock },
  "Đang xử lý": { color: "bg-[#dbeafe] text-[#1e40af]", icon: AlertTriangle },
  "Đã phản hồi": { color: "bg-[#dcfce7] text-[#008236]", icon: CheckCircle },
  Đóng: { color: "bg-[#f1f5f9] text-[#475569]", icon: XCircle },
};

const priorityConfig: Record<Priority, string> = {
  CAO: "bg-[#fee2e2] text-[#991b1b]",
  "TRUNG BÌNH": "bg-[#fef3c7] text-[#92400e]",
  THẤP: "bg-[#f1f5f9] text-[#475569]",
};

// ===================== MAIN PAGE =====================
export function AdvisoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") || "list";
  const requestId = searchParams.get("id");

  const [requests, setRequests] = useState<AdvisoryRequest[]>(mockRequests);
  const [history] = useState<ConsultationHistory[]>(mockConsultationHistory);

  // List filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">(
    "all",
  );
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");

  const filteredRequests = requests.filter((req) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      req.title.toLowerCase().includes(q) ||
      req.crop.toLowerCase().includes(q) ||
      req.issue.toLowerCase().includes(q) ||
      req.field.toLowerCase().includes(q) ||
      req.id.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || req.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const selectedRequest = requests.find((r) => r.id === requestId);

  const handleCreate = (data: Omit<AdvisoryRequest, "id" | "createdAt">) => {
    const newRequest: AdvisoryRequest = {
      ...data,
      id: `TV-${String(requests.length + 1).padStart(3, "0")}`,
      createdAt: new Date().toLocaleString("vi-VN"),
    };
    setRequests([newRequest, ...requests]);
    setSearchParams({ view: "list" });
  };

  if (view === "detail" && selectedRequest) {
    return <DetailView request={selectedRequest} />;
  }
  if (view === "create") {
    return <CreateView onCreate={handleCreate} />;
  }
  if (view === "history") {
    return <HistoryView history={history} />;
  }

  // ==================== LIST VIEW ====================
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[#115e59] text-2xl font-semibold mb-1">
            Danh sách yêu cầu tư vấn
          </h1>
          <p className="text-[#45556c] text-sm">
            Quản lý và theo dõi các vấn đề cần chuyên gia hỗ trợ.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setSearchParams({ view: "history" })}
            className="flex items-center gap-2 px-4 py-2 border border-[#cad5e2] text-[#62748e] rounded-lg hover:bg-[#f8fafc] transition-colors"
          >
            <History className="w-4 h-4" />
            Lịch sử tư vấn
          </button>
          <Link
            to="/advisory?view=create"
            className="bg-[#009689] text-white px-4 py-2 rounded-lg hover:bg-[#007f75] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Tạo yêu cầu mới
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#90A1B9]" />
            <input
              type="text"
              placeholder="Tìm theo mã, cây trồng, bệnh, khu vực..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
            />
          </div>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as RequestStatus | "all")
            }
            className="px-3 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-sm text-[#334155]"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Chờ phản hồi">Chờ phản hồi</option>
            <option value="Đang xử lý">Đang xử lý</option>
            <option value="Đã phản hồi">Đã phản hồi</option>
            <option value="Đóng">Đóng</option>
          </select>
          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value as Priority | "all")
            }
            className="px-3 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-sm text-[#334155]"
          >
            <option value="all">Tất cả mức độ</option>
            <option value="CAO">Cao</option>
            <option value="TRUNG BÌNH">Trung bình</option>
            <option value="THẤP">Thấp</option>
          </select>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredRequests.map((request) => (
          <RequestCard key={request.id} request={request} />
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <div className="text-center py-12 text-[#62748e]">
          Không tìm thấy yêu cầu nào phù hợp
        </div>
      )}
    </div>
  );
}

// ===================== REQUEST CARD =====================
function RequestCard({ request }: { request: AdvisoryRequest }) {
  return (
    <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative h-44 bg-gray-100">
        <img
          src={request.images[0]}
          alt={request.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <span
            className={`px-2.5 py-1 rounded text-xs font-medium ${statusConfig[request.status].color}`}
          >
            {request.status}
          </span>
          {request.images.length > 1 && (
            <span className="px-2.5 py-1 rounded text-xs font-medium bg-black/50 text-white">
              +{request.images.length - 1}
            </span>
          )}
        </div>
        <span
          className={`absolute top-3 right-3 px-2.5 py-1 rounded text-xs font-medium ${priorityConfig[request.priority]}`}
        >
          {request.priority}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* ID + title */}
        <div className="mb-3">
          <div className="text-xs text-[#90a1b9] mb-0.5">{request.id}</div>
          <h3 className="font-semibold text-[#115e59] leading-tight">
            {request.title}
          </h3>
          <p className="text-xs text-[#62748e] mt-0.5">{request.field}</p>
        </div>

        {/* Issue + AI confidence */}
        <div className="mb-3 p-3 bg-[#fff7ed] border-l-4 border-[#f59e0b] rounded">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[#f59e0b] mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-[#92400e]">
                {request.issue}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Cpu className="w-3 h-3 text-[#92400e]" />
                <span className="text-xs text-[#92400e]">
                  AI: {request.aiConfidence}% tin cậy
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-[#62748e] mb-3">
          <span>👤 {request.reportCreatedBy}</span>
          <span>🕐 {request.reportCreatedAt}</span>
        </div>

        {request.assignedTo && (
          <div className="mb-3 p-2 bg-[#f0fdfa] rounded text-xs">
            <span className="text-[#62748e]">Chuyên gia: </span>
            <span className="text-[#009689] font-medium">
              {request.assignedTo}
            </span>
          </div>
        )}

        <Link
          to={`/advisory?view=detail&id=${request.id}`}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-[#009689] text-[#009689] rounded-lg hover:bg-[#f0fdfa] transition-colors text-sm"
        >
          <span>Xem chi tiết</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

// ===================== DETAIL VIEW =====================
function DetailView({ request }: { request: AdvisoryRequest }) {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#62748e]">
        <Link to="/advisory" className="hover:text-[#009689]">
          Tư vấn
        </Link>
        <span>/</span>
        <Link to="/advisory" className="hover:text-[#009689]">
          Danh sách
        </Link>
        <span>/</span>
        <span className="text-[#115e59]">{request.id}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[#115e59] text-2xl font-semibold mb-1">
            {request.title}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-[#90a1b9]">{request.id}</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig[request.status].color}`}
            >
              {request.status}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConfig[request.priority]}`}
            >
              {request.priority}
            </span>
          </div>
        </div>
        <Link
          to="/advisory"
          className="flex items-center gap-2 text-[#62748e] hover:text-[#115e59] text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left col */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
            <h3 className="text-sm font-bold text-[#62748e] uppercase mb-3">
              📷 Hình ảnh thực tế
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {request.images.slice(0, 2).map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`${request.title} ${idx + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
              ))}
              {request.images.length > 2 && (
                <div className="relative">
                  <img
                    src={request.images[2]}
                    alt="More"
                    className="w-full h-32 object-cover rounded-lg opacity-50"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <span className="text-white text-2xl font-bold">
                      +{request.images.length - 2}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Farming info */}
          <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
            <h3 className="text-sm font-bold text-[#62748e] uppercase mb-3">
              🌱 Thông tin canh tác
            </h3>
            <div className="space-y-3 text-sm">
              <InfoRow icon="🥬" label="Cây trồng" value={request.crop} />
              <InfoRow icon="📍" label="Khu vực" value={request.field} />
              <InfoRow icon="🗓️" label="Mùa vụ" value={request.season} />
              <InfoRow
                icon="🌿"
                label="Giai đoạn sinh trưởng"
                value={request.growthStage}
              />
            </div>
          </div>

          {/* AI Detection */}
          <div className="bg-[#fff7ed] border-l-4 border-[#f59e0b] rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#f59e0b] mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="font-bold text-sm text-[#92400e] mb-1">
                  Vấn đề phát hiện (AI)
                </div>
                <div className="font-medium text-[#92400e] mb-2">
                  {request.issue}
                </div>
                {/* AI confidence bar */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs text-[#92400e] mb-1">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> Độ tin cậy AI
                    </span>
                    <span className="font-bold">{request.aiConfidence}%</span>
                  </div>
                  <div className="h-2 bg-[#fde68a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#f59e0b] rounded-full"
                      style={{ width: `${request.aiConfidence}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm text-[#92400e]">
                  {request.description}
                </div>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
            <h3 className="text-sm font-bold text-[#62748e] uppercase mb-3">
              Thông tin báo cáo gốc
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-[#62748e] mb-1">
                  Worker báo cáo
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[#009689] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {request.reportCreatedBy
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <span className="font-medium text-[#115e59] truncate">
                    {request.reportCreatedBy}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-[#62748e] mb-1">
                  Thời gian báo cáo
                </div>
                <div className="flex items-center gap-1 text-[#115e59]">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs">{request.reportCreatedAt}</span>
                </div>
              </div>
            </div>
            {request.ownerMessage && (
              <div className="mt-3 pt-3 border-t border-[#e2e8f0]">
                <div className="text-xs text-[#62748e] mb-1">
                  Lời nhắn của Owner
                </div>
                <div className="text-sm text-[#334155] italic">
                  "{request.ownerMessage}"
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right col */}
        <div className="lg:col-span-3 space-y-6">
          {request.response ? (
            <>
              {/* Expert info */}
              <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
                <h3 className="text-sm font-bold text-[#62748e] uppercase mb-3">
                  💼 Phản hồi từ chuyên gia
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#009689] to-[#115e59] rounded-full flex items-center justify-center text-white font-bold">
                      {(request.assignedTo ?? "")
                        .split(" ")
                        .slice(-2)
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <div className="font-bold text-[#115e59]">
                        {request.assignedTo}
                      </div>
                      <div className="text-xs text-[#62748e]">
                        Viện Khoa học Tự nhiên (Viện KHTN)
                      </div>
                    </div>
                  </div>
                  {request.responseTime && (
                    <div className="flex items-center gap-1 text-xs text-[#62748e]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Phản hồi: {request.responseTime}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Diagnosis content */}
              <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
                <h3 className="font-bold text-[#115e59] mb-4">
                  📋 Nội dung tư vấn
                </h3>
                <div className="space-y-4">
                  <ConsultSection
                    label="Chẩn đoán"
                    value={request.response.diagnosis}
                  />
                  <ConsultSection
                    label="Nguyên nhân"
                    value={request.response.observation}
                  />
                  <ConsultSection
                    label="Khuyến nghị chi tiết"
                    value={request.response.recommendation}
                  />
                  {request.response.treatmentPlan && (
                    <div className="p-3 bg-[#f0fdfa] border border-[#009689] rounded-lg">
                      <div className="text-xs text-[#62748e] mb-1">
                        Kế hoạch xử lý
                      </div>
                      <div className="text-sm text-[#009689] font-medium">
                        {request.response.treatmentPlan}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
                <h3 className="text-sm font-medium text-[#62748e] mb-3">
                  Phương án đề xuất
                </h3>
                <div className="flex gap-3 mb-4">
                  <button className="flex-1 px-4 py-2 bg-white border border-[#cad5e2] text-[#314158] rounded-lg hover:bg-[#f8fafc] transition-colors text-sm">
                    Theo dõi thêm
                  </button>
                  <button className="flex-1 px-4 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors flex items-center justify-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Xử lý kỹ thuật
                  </button>
                  <button className="flex-1 px-4 py-2 bg-white border border-[#cad5e2] text-[#314158] rounded-lg hover:bg-[#f8fafc] transition-colors text-sm">
                    Không cần xử lý
                  </button>
                </div>
                <button className="w-full bg-[#009689] text-white px-6 py-3 rounded-lg hover:bg-[#007f75] transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" />
                  Tạo nhiệm vụ từ tư vấn
                </button>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-12 text-center">
              <Clock className="w-16 h-16 text-[#cad5e2] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#115e59] mb-2">
                Đang chờ phản hồi từ chuyên gia
              </h3>
              <p className="text-sm text-[#62748e]">
                Yêu cầu đã được gửi và đang chờ chuyên gia xem xét.
              </p>
              {request.assignedTo && (
                <div className="mt-4 text-sm text-[#009689]">
                  Đã giao cho: <strong>{request.assignedTo}</strong>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===================== CREATE VIEW =====================
function CreateView({
  onCreate,
}: {
  onCreate: (data: Omit<AdvisoryRequest, "id" | "createdAt">) => void;
}) {
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [specialist, setSpecialist] = useState("");
  const [priority, setPriority] = useState<Priority>("TRUNG BÌNH");
  const [ownerMessage, setOwnerMessage] = useState("");

  const selectedReport = mockWorkerReports.find(
    (r) => r.id === selectedReportId,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    onCreate({
      workerReportId: selectedReport.id,
      title: selectedReport.title,
      crop: selectedReport.crop,
      field: selectedReport.field,
      season: selectedReport.season,
      growthStage: selectedReport.growthStage,
      issue: selectedReport.issue,
      aiConfidence: selectedReport.aiConfidence,
      description: selectedReport.description,
      images: selectedReport.images,
      reportCreatedBy: selectedReport.createdBy,
      reportCreatedAt: selectedReport.createdAt,
      ownerMessage,
      status: "Chờ phản hồi",
      priority,
      assignedTo: specialist || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#62748e]">
        <Link to="/advisory" className="hover:text-[#009689]">
          Tư vấn
        </Link>
        <span>/</span>
        <Link to="/advisory" className="hover:text-[#009689]">
          Danh sách
        </Link>
        <span>/</span>
        <span className="text-[#115e59]">Tạo yêu cầu</span>
      </div>

      <div>
        <h1 className="text-[#115e59] text-2xl font-semibold mb-1">
          Gửi yêu cầu tư vấn chuyên gia
        </h1>
        <p className="text-[#45556c] text-sm">
          Chọn báo cáo từ Worker và gửi cho chuyên gia phù hợp.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Chọn báo cáo */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
            <h3 className="text-sm font-bold text-[#62748e] uppercase mb-3">
              📄 Chọn báo cáo từ Worker
            </h3>
            <div className="space-y-2">
              {mockWorkerReports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReportId(report.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedReportId === report.id
                      ? "border-[#009689] bg-[#f0fdfa]"
                      : "border-[#e2e8f0] hover:bg-[#f8fafc]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-[#90a1b9]">{report.id}</div>
                      <div className="font-medium text-sm text-[#115e59] truncate">
                        {report.title}
                      </div>
                      <div className="text-xs text-[#62748e] mt-0.5">
                        {report.field}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Cpu className="w-3 h-3 text-[#f59e0b]" />
                      <span className="text-xs text-[#92400e] font-medium">
                        {report.aiConfidence}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-[#f59e0b] shrink-0" />
                    <span className="text-xs text-[#92400e]">
                      {report.issue}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#90a1b9]">
                    {report.createdBy} · {report.createdAt}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview báo cáo đã chọn */}
          {selectedReport && (
            <div className="bg-white rounded-lg border border-[#009689] shadow-sm p-4">
              <h3 className="text-sm font-bold text-[#009689] uppercase mb-3">
                ✅ Báo cáo đã chọn
              </h3>
              <div className="space-y-2 text-sm">
                <InfoRow
                  icon="🥬"
                  label="Cây trồng"
                  value={selectedReport.crop}
                />
                <InfoRow
                  icon="📍"
                  label="Khu vực"
                  value={selectedReport.field}
                />
                <InfoRow
                  icon="🗓️"
                  label="Mùa vụ"
                  value={selectedReport.season}
                />
                <InfoRow
                  icon="🌿"
                  label="Giai đoạn"
                  value={selectedReport.growthStage}
                />
              </div>
              <div className="mt-3 p-2 bg-[#fff7ed] border-l-4 border-[#f59e0b] rounded">
                <div className="text-xs font-medium text-[#92400e]">
                  {selectedReport.issue}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Cpu className="w-3 h-3 text-[#f59e0b]" />
                  <span className="text-xs text-[#92400e]">
                    AI: {selectedReport.aiConfidence}% tin cậy
                  </span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {selectedReport.images.slice(0, 2).map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt=""
                    className="w-full h-20 object-cover rounded"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Form gửi */}
        <div className="lg:col-span-3">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6"
          >
            <h3 className="text-sm font-bold text-[#62748e] uppercase mb-4">
              🚀 Thiết lập yêu cầu tư vấn
            </h3>

            <div className="space-y-4">
              {/* Chuyên gia */}
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Chọn chuyên gia <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={specialist}
                  onChange={(e) => setSpecialist(e.target.value)}
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white"
                >
                  <option value="">Chọn chuyên gia</option>
                  <option value="TS. Nguyễn Văn Minh">
                    TS. Nguyễn Văn Minh – Viện KHTN
                  </option>
                  <option value="ThS. Hoàng Lan">
                    ThS. Hoàng Lan – Viện KHTN
                  </option>
                  <option value="PGS.TS Trần Hùng">
                    PGS.TS Trần Hùng – Viện KHTN
                  </option>
                </select>
              </div>

              {/* Mức độ ưu tiên */}
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Mức độ ưu tiên
                </label>
                <div className="flex gap-2">
                  {(["CAO", "TRUNG BÌNH", "THẤP"] as Priority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        priority === p
                          ? priorityConfig[p] + " border-transparent"
                          : "border-[#cad5e2] text-[#62748e] hover:bg-[#f8fafc]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lời nhắn */}
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Lời nhắn cho chuyên gia{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Mô tả chi tiết tình trạng, các triệu chứng đã quan sát hoặc câu hỏi cụ thể cần tư vấn..."
                  value={ownerMessage}
                  onChange={(e) => setOwnerMessage(e.target.value)}
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
                />
                <p className="text-xs text-[#62748e] mt-1">
                  ℹ️ Báo cáo gốc và hình ảnh sẽ được đính kèm tự động.
                </p>
              </div>

              {/* Validation notice */}
              {!selectedReport && (
                <div className="p-3 bg-[#fef3c7] border border-[#f59e0b] rounded-lg text-sm text-[#92400e]">
                  ⚠️ Vui lòng chọn một báo cáo từ danh sách bên trái.
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-[#e2e8f0] flex gap-3">
                <Link
                  to="/advisory"
                  className="flex-1 text-center px-4 py-2.5 border border-[#cad5e2] text-[#62748e] rounded-lg hover:bg-[#f8fafc] transition-colors text-sm"
                >
                  Hủy bỏ
                </Link>
                <button
                  type="submit"
                  disabled={!selectedReport}
                  className="flex-1 bg-[#009689] text-white px-6 py-2.5 rounded-lg hover:bg-[#007f75] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Gửi cho chuyên gia
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ===================== HISTORY VIEW =====================
function HistoryView({ history }: { history: ConsultationHistory[] }) {
  const [search, setSearch] = useState("");

  const filtered = history.filter((h) => {
    const q = search.toLowerCase();
    return (
      h.requestId.toLowerCase().includes(q) ||
      h.responseId.toLowerCase().includes(q) ||
      h.crop.toLowerCase().includes(q) ||
      h.disease.toLowerCase().includes(q) ||
      h.specialist.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#62748e]">
        <Link to="/advisory" className="hover:text-[#009689]">
          Tư vấn
        </Link>
        <span>/</span>
        <span className="text-[#115e59]">Lịch sử tư vấn</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#115e59] text-2xl font-semibold mb-1">
            Lịch sử tư vấn
          </h1>
          <p className="text-[#45556c] text-sm">
            Toàn bộ các yêu cầu đã được chuyên gia phản hồi.
          </p>
        </div>
        <Link
          to="/advisory"
          className="flex items-center gap-2 text-[#62748e] hover:text-[#115e59] text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#90A1B9]" />
          <input
            type="text"
            placeholder="Tìm theo mã, cây trồng, bệnh, chuyên gia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
            <tr>
              {[
                "Mã phản hồi",
                "Mã yêu cầu",
                "Cây trồng",
                "Bệnh / Vấn đề",
                "Mức độ",
                "Chuyên gia",
                "Thời gian phản hồi",
                "Thao tác",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-bold text-[#62748e] uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {filtered.map((item) => (
              <tr
                key={item.responseId}
                className="hover:bg-[#f8fafc] transition-colors"
              >
                <td className="px-4 py-3 text-sm font-medium text-[#115e59]">
                  {item.responseId}
                </td>
                <td className="px-4 py-3 text-sm text-[#62748e]">
                  {item.requestId}
                </td>
                <td className="px-4 py-3 text-sm text-[#62748e]">
                  {item.crop}
                </td>
                <td className="px-4 py-3 text-sm text-[#334155]">
                  {item.disease}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${priorityConfig[item.priority]}`}
                  >
                    {item.priority}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-[#62748e]">
                  {item.specialist}
                </td>
                <td className="px-4 py-3 text-sm text-[#62748e]">
                  {item.respondedAt}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/advisory?view=detail&id=${item.requestId}`}
                    className="flex items-center gap-1 text-[#009689] hover:underline text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    Xem
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-[#62748e]">
            <History className="w-10 h-10 text-[#cad5e2] mx-auto mb-3" />
            <p>Chưa có lịch sử tư vấn nào</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== HELPERS =====================
function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 bg-[#f1f5f9] rounded-lg flex items-center justify-center shrink-0 text-base">
        {icon}
      </div>
      <div>
        <div className="text-xs text-[#62748e]">{label}</div>
        <div className="font-medium text-[#115e59] text-sm">{value}</div>
      </div>
    </div>
  );
}

function ConsultSection({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-semibold text-[#115e59] mb-1 text-sm">{label}:</div>
      <div className="text-sm text-[#45556c] leading-relaxed">{value}</div>
    </div>
  );
}
