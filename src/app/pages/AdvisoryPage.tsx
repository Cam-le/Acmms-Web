import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  Upload,
  Calendar,
  User,
  MessageSquare,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import {
  AdvisoryRequest,
  RequestStatus,
  Priority,
  AdvisoryCropType as CropType,
  mockRequests,
} from "../../data/mockData";

// Mock data with cabbage-related issues
const statusConfig = {
  "Chờ phản hồi": {
    color: "bg-[#fef3c7] text-[#92400e]",
    icon: Clock,
  },
  "Đang xử lý": {
    color: "bg-[#dbeafe] text-[#1e40af]",
    icon: AlertTriangle,
  },
  "Đã phản hồi": {
    color: "bg-[#dcfce7] text-[#008236]",
    icon: CheckCircle,
  },
  Đóng: {
    color: "bg-[#f1f5f9] text-[#475569]",
    icon: XCircle,
  },
};

const priorityConfig = {
  CAO: "bg-[#fee2e2] text-[#991b1b]",
  "TRUNG BÌNH": "bg-[#fef3c7] text-[#92400e]",
  THẤP: "bg-[#f1f5f9] text-[#475569]",
};

export function AdvisoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") || "list";
  const requestId = searchParams.get("id");

  const [requests, setRequests] = useState<AdvisoryRequest[]>(mockRequests);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">(
    "all",
  );

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.crop.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.field.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get selected request for detail view
  const selectedRequest = requests.find((r) => r.id === requestId);

  // Handle create request
  const handleCreateRequest = (
    data: Omit<AdvisoryRequest, "id" | "createdAt">,
  ) => {
    const newRequest: AdvisoryRequest = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toLocaleString("vi-VN"),
    };
    setRequests([newRequest, ...requests]);
    setCreateModalOpen(false);
  };

  if (view === "detail" && selectedRequest) {
    return <DetailView request={selectedRequest} />;
  }

  if (view === "create") {
    return <CreateView onCreate={handleCreateRequest} />;
  }

  // List View (default)
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
        <Link
          to="/advisory?view=create"
          className="bg-[#009689] text-white px-4 py-2 rounded-lg hover:bg-[#007f75] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tạo yêu cầu mới
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#90A1B9]" />
            <input
              type="text"
              placeholder="Tìm kiếm theo cây trồng, chuyên gia, khu đất..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as RequestStatus | "all")
              }
              className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Chờ phản hồi">Chờ phản hồi</option>
              <option value="Đang xử lý">Đang xử lý</option>
              <option value="Đã phản hồi">Đã phản hồi</option>
              <option value="Đóng">Đóng</option>
            </select>
          </div>
        </div>
      </div>

      {/* Request Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredRequests.map((request) => (
          <RequestCard key={request.id} request={request} />
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <div className="text-center py-12 text-[#62748e]">
          Không tìm thấy yêu cầu nào
        </div>
      )}
    </div>
  );
}

// Request Card Component
function RequestCard({ request }: { request: AdvisoryRequest }) {
  const StatusIcon = statusConfig[request.status].icon;

  return (
    <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative h-48 bg-gray-100">
        <img
          src={request.images[0]}
          alt={request.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <span
            className={`px-2.5 py-1 rounded text-xs font-medium ${
              statusConfig[request.status].color
            }`}
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
          className={`absolute top-3 right-3 px-2.5 py-1 rounded text-xs font-medium ${
            priorityConfig[request.priority]
          }`}
        >
          {request.priority}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-[#115e59] mb-1">{request.title}</h3>
          <p className="text-sm text-[#62748e]">{request.field}</p>
        </div>

        {/* Issue Info */}
        <div className="mb-4 p-3 bg-[#fff7ed] border-l-4 border-[#f59e0b] rounded">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[#f59e0b] mt-0.5 shrink-0" />
            <div>
              <div className="font-medium text-sm text-[#92400e]">
                {request.issue}
              </div>
              <div className="text-xs text-[#92400e] mt-1 line-clamp-2">
                {request.description}
              </div>
            </div>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center justify-between text-xs text-[#62748e] mb-4">
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            <span>{request.createdBy}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{request.createdAt}</span>
          </div>
        </div>

        {/* Assigned Expert */}
        {request.assignedTo && (
          <div className="mb-3 p-2 bg-[#f0fdfa] rounded text-xs">
            <span className="text-[#62748e]">Chuyên gia: </span>
            <span className="text-[#009689] font-medium">
              {request.assignedTo}
            </span>
          </div>
        )}

        {/* Action Button */}
        <Link
          to={`/advisory?view=detail&id=${request.id}`}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-[#009689] text-[#009689] rounded-lg hover:bg-[#f0fdfa] transition-colors"
        >
          <span>Xem chi tiết</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

// Detail View Component
function DetailView({ request }: { request: AdvisoryRequest }) {
  const StatusIcon = statusConfig[request.status].icon;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#62748e]">
        <Link to="/advisory" className="hover:text-[#009689]">
          Tư vấn
        </Link>
        <span>/</span>
        <Link to="/advisory" className="hover:text-[#009689]">
          Danh sách tư vấn
        </Link>
        <span>/</span>
        <span className="text-[#115e59]">Chi tiết phản hồi</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[#115e59] text-2xl font-semibold mb-2">
            Phản hồi tư vấn chuyên gia
          </h1>
          <p className="text-[#45556c] text-sm">
            Xem chi tiết chẩn đoán từ chuyên gia và tạo nhiệm vụ xử lý.
          </p>
        </div>
        <Link
          to="/advisory"
          className="flex items-center gap-2 text-[#62748e] hover:text-[#115e59]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Request Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
            <h3 className="text-sm font-bold text-[#62748e] uppercase mb-3">
              📷 HÌNH ẢNH THỰC TẾ
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {request.images.map((img, idx) => (
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

          {/* Farm Info */}
          <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
            <h3 className="text-sm font-bold text-[#62748e] uppercase mb-3">
              🌱 THÔNG TIN CANH TÁC
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#dcfce7] rounded-lg flex items-center justify-center">
                  <span className="text-lg">🥬</span>
                </div>
                <div>
                  <div className="text-xs text-[#62748e]">
                    Đối tượng cây trồng
                  </div>
                  <div className="font-medium text-[#115e59]">
                    {request.crop}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#dbeafe] rounded-lg flex items-center justify-center">
                  <span className="text-lg">📍</span>
                </div>
                <div>
                  <div className="text-xs text-[#62748e]">Khu vực</div>
                  <div className="font-medium text-[#115e59]">
                    {request.field}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#fef3c7] rounded-lg flex items-center justify-center">
                  <span className="text-lg">🌿</span>
                </div>
                <div>
                  <div className="text-xs text-[#62748e]">
                    Vụ Đông Xuân 2024
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Issue Alert */}
          <div className="bg-[#fff7ed] border-l-4 border-[#f59e0b] rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#f59e0b] mt-0.5 shrink-0" />
              <div>
                <div className="font-bold text-sm text-[#92400e] mb-1">
                  VẤN ĐỀ PHÁT HIỆN ({request.priority === "CAO" ? "AI" : ""})
                </div>
                <div className="font-medium text-[#92400e] mb-2">
                  {request.issue}
                </div>
                <div className="text-sm text-[#92400e]">
                  {request.description}
                </div>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-[#62748e] mb-1">Nhân viên gửi</div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#009689] rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {request.createdBy
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <span className="font-medium text-[#115e59]">
                    {request.createdBy}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-[#62748e] mb-1">
                  Thời gian báo cáo
                </div>
                <div className="flex items-center gap-1 text-[#115e59]">
                  <Clock className="w-4 h-4" />
                  <span>{request.createdAt}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Expert Response */}
        <div className="lg:col-span-3 space-y-6">
          {request.response ? (
            <>
              {/* Expert Info */}
              <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
                <h3 className="text-sm font-bold text-[#62748e] uppercase mb-3">
                  💼 PHẢN HỒI TỪ CHUYÊN GIA
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#009689] to-[#115e59] rounded-full flex items-center justify-center text-white font-bold">
                      {request.assignedTo
                        ?.split(" ")
                        .slice(-2)
                        .join(" ")
                        .split("")
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div>
                      <div className="font-bold text-[#115e59]">
                        {request.assignedTo}
                      </div>
                      <div className="text-xs text-[#62748e]">
                        Viện Khoa học Tư nhiên (Viện KHTN)
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

              {/* Diagnosis */}
              <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
                <h3 className="font-bold text-[#115e59] mb-4">
                  📋 Nội dung tư vấn
                </h3>

                <div className="space-y-4">
                  {/* Diagnosis */}
                  <div>
                    <div className="font-semibold text-[#115e59] mb-2">
                      Chẩn đoán:
                    </div>
                    <div className="text-sm text-[#45556c] leading-relaxed">
                      {request.response.diagnosis}
                    </div>
                  </div>

                  {/* Observation */}
                  <div>
                    <div className="font-semibold text-[#115e59] mb-2">
                      Nguyên nhân:
                    </div>
                    <div className="text-sm text-[#45556c] leading-relaxed">
                      {request.response.observation}
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div>
                    <div className="font-semibold text-[#115e59] mb-2">
                      Khuyến nghị chi tiết:
                    </div>
                    <div className="text-sm text-[#45556c] leading-relaxed">
                      {request.response.recommendation}
                    </div>
                  </div>

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

              {/* Action Buttons */}
              <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
                <h3 className="text-sm font-medium text-[#62748e] mb-3">
                  Phương án để xuất
                </h3>
                <div className="flex gap-3">
                  <button className="flex-1 px-4 py-2 bg-white border border-[#cad5e2] text-[#314158] rounded-lg hover:bg-[#f8fafc] transition-colors">
                    Theo dõi thêm
                  </button>
                  <button className="flex-1 px-4 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Xử lý kỹ thuật
                  </button>
                  <button className="flex-1 px-4 py-2 bg-white border border-[#cad5e2] text-[#314158] rounded-lg hover:bg-[#f8fafc] transition-colors">
                    Không cần xử lý
                  </button>
                </div>
              </div>

              {/* Task Creation */}
              <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
                <button className="w-full bg-[#009689] text-white px-6 py-3 rounded-lg hover:bg-[#007f75] transition-colors flex items-center justify-center gap-2 mb-3">
                  <Plus className="w-5 h-5" />
                  Tạo nhiệm vụ từ tư vấn
                </button>
                <div className="flex items-center justify-between text-sm">
                  <button className="text-[#009689] hover:underline flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Đánh dấu đã xem
                  </button>
                  <Link
                    to="/advisory"
                    className="text-[#62748e] hover:underline"
                  >
                    Quay lại danh sách
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-12 text-center">
              <Clock className="w-16 h-16 text-[#cad5e2] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#115e59] mb-2">
                Đang chờ phản hồi từ chuyên gia
              </h3>
              <p className="text-sm text-[#62748e]">
                Yêu cầu của bạn đã được gửi và đang chờ chuyên gia xem xét.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Create View Component
function CreateView({
  onCreate,
}: {
  onCreate: (data: Omit<AdvisoryRequest, "id" | "createdAt">) => void;
}) {
  const [formData, setFormData] = useState({
    title: "",
    crop: "" as CropType,
    field: "",
    status: "Chờ phản hồi" as RequestStatus,
    priority: "TRUNG BÌNH" as Priority,
    issue: "",
    description: "",
    images: [] as string[],
    createdBy: "Mai Thị Hoa",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
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
          Danh sách tư vấn
        </Link>
        <span>/</span>
        <span className="text-[#115e59]">Tạo yêu cầu</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-[#115e59] text-2xl font-semibold mb-2">
          Gửi yêu cầu tư vấn chuyên gia
        </h1>
        <p className="text-[#45556c] text-sm">
          Chuyên tiếp báo cáo tới nhân viên để nhận ý kiến chuyên môn từ các
          chuyên gia.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Current Info */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
            <h3 className="text-sm font-bold text-[#62748e] uppercase mb-3">
              📄 THÔNG TIN BÁO CÁO GỐC
            </h3>

            {/* Mock Images */}
            <div className="mb-4">
              <div className="text-xs text-[#62748e] mb-2">
                HÌNH ẢNH THỰC TẾ
              </div>
              <div className="grid grid-cols-3 gap-2">
                <img
                  src="https://images.unsplash.com/photo-1590682680443-1b0c4b8c3a29?w=200&h=150&fit=crop"
                  alt="Field"
                  className="w-full h-24 object-cover rounded-lg"
                />
                <img
                  src="https://images.unsplash.com/photo-1556801712-76c8d2b88b5b?w=200&h=150&fit=crop"
                  alt="Cabbage"
                  className="w-full h-24 object-cover rounded-lg"
                />
                <div className="relative">
                  <div className="w-full h-24 bg-[#f1f5f9] rounded-lg flex items-center justify-center border-2 border-dashed border-[#cad5e2]">
                    <span className="text-4xl text-[#cad5e2]">+</span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-[#62748e]">
                      +2
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Farm Info */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#dcfce7] rounded-lg flex items-center justify-center">
                  <span className="text-lg">🥬</span>
                </div>
                <div>
                  <div className="text-xs text-[#62748e]">
                    Đối tượng cây trồng
                  </div>
                  <div className="font-medium text-[#115e59]">Cà chua Beef</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#dbeafe] rounded-lg flex items-center justify-center">
                  <span className="text-lg">📍</span>
                </div>
                <div>
                  <div className="text-xs text-[#62748e]">
                    Vụ Đông Xuân 2024
                  </div>
                </div>
              </div>
            </div>

            {/* Issue Alert */}
            <div className="bg-[#fff7ed] border-l-4 border-[#f59e0b] rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#f59e0b] mt-0.5 shrink-0" />
                <div>
                  <div className="font-bold text-xs text-[#92400e] mb-1">
                    VẤN ĐỀ PHÁT HIỆN (AI)
                  </div>
                  <div className="text-sm text-[#92400e] mb-1">
                    Phát hiện đốm trắng nghệ nấm bệnh.
                  </div>
                  <div className="text-xs text-[#92400e]">Độ tin cậy: 92%</div>
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="mt-4 pt-4 border-t border-[#e2e8f0]">
              <div className="flex items-center justify-between text-xs text-[#62748e]">
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  <span>Mai Thị Hoa</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>14:20 - 15/05/2024</span>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Link
                to="/advisory"
                className="text-[#009689] text-sm hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Xem chi tiết báo cáo gốc →
              </Link>
            </div>
          </div>
        </div>

        {/* Right: Create Form */}
        <div className="lg:col-span-3">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6"
          >
            <h3 className="text-sm font-bold text-[#62748e] uppercase mb-4">
              🚀 THIẾT LẬP YÊU CẦU TƯ VẤN
            </h3>
            <p className="text-sm text-[#62748e] mb-6">
              Điền thông tin để gửi cho chuyên gia phù hợp
            </p>

            <div className="space-y-4">
              {/* Expert Selection */}
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Chọn chuyên gia <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                >
                  <option value="">Chọn chuyên gia</option>
                  <option value="1">TS. Nguyễn Văn Minh - Viện KHTN</option>
                  <option value="2">ThS. Hoàng Lan - Viện KHTN</option>
                  <option value="3">PGS.TS Trần Hùng - Viện KHTN</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Lời nhắn cho chuyên gia{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Mô tả chi tiết tình trạng, các triệu chứng đã quan sát hoặc câu hỏi cụ thể cần tư vấn..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs text-[#62748e]">
                    ℹ️ Báo cáo gốc và hình ảnh sẽ được đính kèm tự động trong
                    yêu cầu này.
                  </div>
                  <button
                    type="button"
                    className="text-xs text-[#009689] hover:underline"
                  >
                    Hỗ trợ Markdown
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-[#e2e8f0]">
                <button
                  type="submit"
                  className="w-full bg-[#009689] text-white px-6 py-3 rounded-lg hover:bg-[#007f75] transition-colors flex items-center justify-center gap-2 mb-3"
                >
                  <MessageSquare className="w-5 h-5" />
                  Gửi cho chuyên gia
                </button>
                <div className="flex justify-center">
                  <Link
                    to="/advisory"
                    className="text-[#62748e] text-sm hover:underline"
                  >
                    Hủy bỏ và quay lại
                  </Link>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
