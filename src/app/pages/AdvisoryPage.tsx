import { useState, useEffect, useRef } from "react";
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
  ChevronLeft,
  History,
  Cpu,
  CreditCard,
  QrCode,
  X,
  Loader2,
  Ban,
  Lock,
  Unlock,
  Receipt,
  BadgeCheck,
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

// ===================== PAYMENT CONFIG =====================
// Placeholder — replace with real pricing from backend
const PLACEHOLDER_PRICE = "XXX.XXXđ";

// Session-level paid set (in real app: from backend/localStorage)
const paidRequests = new Set<string>();

// ===================== PAYMENT STATUS =====================
type PaymentStatus = "idle" | "waiting" | "success" | "failed";
type ModalStep = "confirm" | "qr"; // declared here, used inside PaymentModal
type PaymentState = "unpaid" | "paid";

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

// ===================== PAYMENT MODAL =====================
// Flow: confirm (step 1) → QR shown (step 2) → waiting → success | failed
// QR is only shown AFTER user clicks confirm — mirrors real VNPay/banking flow
// where QR is generated on-demand from backend (amount + order_id + checksum).
// The QR below is a placeholder; replace src with API-generated URL in production.

function PaymentModal({
  requestId,
  onSuccess,
  onClose,
}: {
  requestId: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<ModalStep>("confirm");
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [countdown, setCountdown] = useState(10);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // TODO: replace with API call → GET /api/payments/qr?requestId=...
  // Real VNPay QR requires backend to sign: amount + orderId + returnUrl + checksum
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    `CMMS|${requestId}|CONSULTING_FEE`,
  )}&color=009689&bgcolor=ffffff`;

  function handleConfirm() {
    setStep("qr");
  }

  function startPolling() {
    setStatus("waiting");
    // TODO: replace with real webhook / GET /api/payments/status?requestId=...
    timerRef.current = setTimeout(() => {
      const ok = Math.random() > 0.35; // 65% success for demo
      if (ok) {
        setStatus("success");
        setTimeout(onSuccess, 1400);
      } else {
        setStatus("failed");
        let c = 10;
        setCountdown(10);
        countRef.current = setInterval(() => {
          c -= 1;
          setCountdown(c);
          if (c <= 0) {
            clearInterval(countRef.current!);
            onClose();
          }
        }, 1000);
      }
    }, 4000);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countRef.current) clearInterval(countRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      {/* Bottom-sheet on mobile, centered dialog on sm+ */}
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header — compact */}
        <div className="bg-gradient-to-r from-[#009689] to-[#115e59] px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 opacity-80" />
            <span className="font-semibold text-sm">Thanh toán phí tư vấn</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator (only show during idle flow) */}
        {status === "idle" && (
          <div className="flex border-b border-[#e2e8f0]">
            {(["confirm", "qr"] as ModalStep[]).map((s, i) => (
              <div
                key={s}
                className={`flex-1 py-2 text-center text-xs font-medium border-b-2 transition-colors ${
                  step === s
                    ? "border-[#009689] text-[#009689]"
                    : step === "qr" && s === "confirm"
                      ? "border-transparent text-[#009689]/50"
                      : "border-transparent text-[#90a1b9]"
                }`}
              >
                {i + 1}. {s === "confirm" ? "Xác nhận" : "Quét QR"}
              </div>
            ))}
          </div>
        )}

        <div className="p-4">
          {/* ── STEP 1: Confirm order info ── */}
          {status === "idle" && step === "confirm" && (
            <>
              {/* Order summary */}
              <div className="bg-[#f0fdfa] border border-[#009689]/20 rounded-xl p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#62748e]">
                    Mã yêu cầu tư vấn
                  </span>
                  <span className="font-mono text-xs font-bold text-[#115e59]">
                    {requestId}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#62748e]">Phí tư vấn</span>
                  <span className="font-bold text-[#009689]">
                    {PLACEHOLDER_PRICE}
                  </span>
                </div>
              </div>

              {/* Bank info — compact */}
              <div className="bg-[#f8fafc] rounded-xl p-3 text-xs mb-3 space-y-1.5">
                <p className="font-bold text-[#90a1b9] uppercase tracking-wide text-[10px] mb-2">
                  Thông tin chuyển khoản
                </p>
                {[
                  { label: "Ngân hàng", value: "Vietcombank (VCB)" },
                  { label: "Số TK", value: "1234 5678 9012", mono: true },
                  { label: "Chủ TK", value: "CMMS FARM SYSTEM" },
                  {
                    label: "Nội dung CK",
                    value: requestId,
                    mono: true,
                    highlight: true,
                  },
                ].map(({ label, value, mono, highlight }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-[#62748e] shrink-0">{label}</span>
                    <span
                      className={`font-semibold text-right truncate max-w-[180px] ${mono ? "font-mono" : ""} ${highlight ? "text-[#009689]" : "text-[#115e59]"}`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-[#cad5e2] text-[#62748e] rounded-xl text-sm hover:bg-[#f8fafc] transition-colors"
                >
                  Huỷ
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-2.5 bg-[#009689] text-white rounded-xl text-sm font-semibold hover:bg-[#007f75] transition-colors flex items-center justify-center gap-1.5"
                >
                  <QrCode className="w-4 h-4" />
                  Hiển thị mã QR
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: QR shown ── */}
          {status === "idle" && step === "qr" && (
            <>
              <p className="text-xs text-[#62748e] text-center mb-3">
                Mở app ngân hàng → Quét QR hoặc chuyển khoản theo thông tin trên
              </p>

              {/* QR — compact */}
              <div className="flex justify-center mb-3">
                <div className="p-2.5 border-2 border-dashed border-[#009689] rounded-xl bg-white shadow-sm inline-block">
                  <img
                    src={qrUrl}
                    alt="VNPay QR"
                    className="w-36 h-36 object-contain rounded"
                  />
                  <p className="text-center text-[10px] font-bold text-[#009689] tracking-widest mt-1.5">
                    VNPAY
                  </p>
                </div>
              </div>

              {/* Amount reminder pill */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-xs text-[#62748e]">Số tiền:</span>
                <span className="font-bold text-[#009689]">
                  {PLACEHOLDER_PRICE}
                </span>
                <span className="text-[#cad5e2]">·</span>
                <span className="font-mono text-xs text-[#115e59] font-semibold">
                  {requestId}
                </span>
              </div>

              <button
                onClick={startPolling}
                className="w-full bg-[#009689] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#007f75] transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Tôi đã chuyển khoản xong
              </button>
              <p className="text-[10px] text-center text-[#90a1b9] mt-1.5">
                Hệ thống sẽ xác nhận tự động
              </p>
            </>
          )}

          {/* ── WAITING ── */}
          {status === "waiting" && (
            <div className="py-8 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#f0fdfa] border-2 border-[#009689]/30 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-[#009689] animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-[#115e59] text-sm mb-0.5">
                  Đang xác nhận thanh toán...
                </p>
                <p className="text-xs text-[#62748e]">
                  Vui lòng không đóng cửa sổ này
                </p>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[#009689] animate-bounce"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {status === "success" && (
            <div className="py-8 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#dcfce7] flex items-center justify-center">
                <BadgeCheck className="w-7 h-7 text-[#16a34a]" />
              </div>
              <div className="text-center">
                <p className="font-bold text-[#115e59] text-sm mb-0.5">
                  Thanh toán thành công!
                </p>
                <p className="text-xs text-[#62748e]">
                  Đang mở nội dung tư vấn...
                </p>
              </div>
            </div>
          )}

          {/* ── FAILED ── */}
          {status === "failed" && (
            <div className="py-6 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#fee2e2] flex items-center justify-center">
                <Ban className="w-6 h-6 text-[#dc2626]" />
              </div>
              <div className="text-center">
                <p className="font-bold text-[#991b1b] text-sm mb-1">
                  Không xác nhận được thanh toán
                </p>
                <p className="text-xs text-[#62748e] mb-2">
                  Kiểm tra lại nội dung chuyển khoản và thử lại.
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#fee2e2] rounded-full text-xs text-[#dc2626] font-medium">
                  <Clock className="w-3 h-3" />
                  Tự quay lại sau {countdown}s
                </div>
              </div>
              <div className="flex gap-2 w-full mt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 border border-[#cad5e2] text-[#62748e] rounded-xl text-sm hover:bg-[#f8fafc] transition-colors"
                >
                  Quay lại
                </button>
                <button
                  onClick={() => {
                    if (countRef.current) clearInterval(countRef.current);
                    setStep("qr");
                    setStatus("idle");
                  }}
                  className="flex-1 py-2 bg-[#009689] text-white rounded-xl text-sm font-medium hover:bg-[#007f75] transition-colors"
                >
                  Thử lại
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===================== MAIN PAGE =====================
export function AdvisoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") || "list";
  const requestId = searchParams.get("id");

  const [requests, setRequests] = useState<AdvisoryRequest[]>(mockRequests);
  const [history] = useState<ConsultationHistory[]>(mockConsultationHistory);

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
    return <HistoryView history={history} requests={requests} />;
  }

  // ==================== LIST VIEW ====================
  return (
    <div className="flex flex-col gap-6 p-6">
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

      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
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

      <div className="p-4">
        <div className="mb-3">
          <div className="text-xs text-[#90a1b9] mb-0.5">{request.id}</div>
          <h3 className="font-semibold text-[#115e59] leading-tight">
            {request.title}
          </h3>
          <p className="text-xs text-[#62748e] mt-0.5">{request.field}</p>
        </div>

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
  const hasResponse = request.status === "Đã phản hồi" && !!request.response;
  const [isPaid, setIsPaid] = useState(() => paidRequests.has(request.id));
  const [showPaymentModal, setShowPaymentModal] = useState(
    hasResponse && !isPaid,
  );

  const handlePaymentSuccess = () => {
    paidRequests.add(request.id);
    setIsPaid(true);
    setShowPaymentModal(false);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {showPaymentModal && (
        <PaymentModal
          requestId={request.id}
          onSuccess={handlePaymentSuccess}
          onClose={() => {
            setShowPaymentModal(false);
            window.history.back();
          }}
        />
      )}

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
            {hasResponse && (
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
                  isPaid
                    ? "bg-[#dcfce7] text-[#166534]"
                    : "bg-[#fff7ed] text-[#92400e]"
                }`}
              >
                {isPaid ? (
                  <Unlock className="w-3 h-3" />
                ) : (
                  <Lock className="w-3 h-3" />
                )}
                {isPaid ? "Đã thanh toán" : "Chờ thanh toán"}
              </span>
            )}
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
          {hasResponse && !isPaid ? (
            /* ── LOCKED: blurred preview + payment CTA ── */
            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
              <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#92400e]" />
                <span className="text-sm font-medium text-[#92400e]">
                  Chuyên gia đã phản hồi — thanh toán để xem nội dung
                </span>
              </div>
              <div className="relative">
                {/* Blurred fake content */}
                <div className="filter blur-sm pointer-events-none p-6 space-y-5 select-none">
                  <div className="space-y-2">
                    <div className="h-3 bg-[#e2e8f0] rounded-full w-1/3" />
                    <div className="h-4 bg-[#e2e8f0] rounded-full w-full" />
                    <div className="h-4 bg-[#e2e8f0] rounded-full w-5/6" />
                    <div className="h-4 bg-[#e2e8f0] rounded-full w-4/6" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-[#e2e8f0] rounded-full w-1/4" />
                    <div className="h-4 bg-[#e2e8f0] rounded-full w-full" />
                    <div className="h-4 bg-[#e2e8f0] rounded-full w-3/4" />
                  </div>
                  <div className="h-24 bg-[#f0fdfa] rounded-xl border border-[#009689]/20" />
                  <div className="space-y-2">
                    <div className="h-3 bg-[#e2e8f0] rounded-full w-1/3" />
                    <div className="h-4 bg-[#e2e8f0] rounded-full w-full" />
                    <div className="h-4 bg-[#e2e8f0] rounded-full w-2/3" />
                  </div>
                </div>
                {/* Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/88 backdrop-blur-[1px] py-8">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#009689] to-[#115e59] flex items-center justify-center text-white text-xl font-bold mb-3 shadow-lg">
                    {(request.assignedTo ?? "")
                      .split(" ")
                      .slice(-2)
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="font-bold text-[#115e59] mb-0.5">
                    {request.assignedTo}
                  </div>
                  <div className="text-xs text-[#62748e] mb-6">
                    đã hoàn thành tư vấn cho yêu cầu này
                  </div>

                  <div className="text-center mb-6 px-8">
                    <div className="text-3xl font-extrabold text-[#009689] mb-1">
                      {PLACEHOLDER_PRICE}
                    </div>
                    <div className="text-xs text-[#90a1b9]">
                      Phí tư vấn · Thanh toán một lần · Xem không giới hạn
                    </div>
                  </div>

                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="bg-[#009689] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#007f75] transition-all hover:shadow-lg flex items-center gap-2 shadow-md"
                  >
                    <CreditCard className="w-5 h-5" />
                    Thanh toán để xem nội dung
                  </button>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-[#90a1b9]">
                    <QrCode className="w-3.5 h-3.5" />
                    Chuyển khoản qua VNPay · Xác nhận tự động
                  </div>
                </div>
              </div>
            </div>
          ) : hasResponse && isPaid ? (
            /* ── UNLOCKED ── */
            <>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#dcfce7] border border-[#86efac] rounded-lg text-sm text-[#166534]">
                <BadgeCheck className="w-4 h-4" />
                <span className="font-medium">
                  Đã thanh toán · Nội dung được mở khóa
                </span>
              </div>

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

              <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
                <h3 className="font-bold text-[#115e59] mb-4">
                  📋 Nội dung tư vấn
                </h3>
                <div className="space-y-4">
                  <ConsultSection
                    label="Chẩn đoán"
                    value={request.response!.diagnosis}
                  />
                  <ConsultSection
                    label="Nguyên nhân"
                    value={request.response!.observation}
                  />
                  <ConsultSection
                    label="Khuyến nghị chi tiết"
                    value={request.response!.recommendation}
                  />
                  {request.response!.treatmentPlan && (
                    <div className="p-3 bg-[#f0fdfa] border border-[#009689] rounded-lg">
                      <div className="text-xs text-[#62748e] mb-1">
                        Kế hoạch xử lý
                      </div>
                      <div className="text-sm text-[#009689] font-medium">
                        {request.response!.treatmentPlan}
                      </div>
                    </div>
                  )}
                </div>
              </div>

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
            /* ── No response yet ── */
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

        {/* Right: Form */}
        <div className="lg:col-span-3">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6"
          >
            <h3 className="text-sm font-bold text-[#62748e] uppercase mb-4">
              🚀 Thiết lập yêu cầu tư vấn
            </h3>

            <div className="space-y-4">
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

              {/* Fee notice */}
              <div className="p-3 bg-[#f0fdfa] border border-[#009689]/30 rounded-lg flex items-start gap-2.5">
                <Receipt className="w-4 h-4 text-[#009689] mt-0.5 shrink-0" />
                <div className="text-xs text-[#115e59] leading-relaxed">
                  <span className="font-semibold">
                    Phí tư vấn: {PLACEHOLDER_PRICE}
                  </span>
                  <span className="text-[#62748e]">
                    {" "}
                    · Thanh toán sau khi chuyên gia phản hồi. Vào{" "}
                    <strong>Lịch sử tư vấn</strong> để thanh toán và xem nội
                    dung.
                  </span>
                </div>
              </div>

              {!selectedReport && (
                <div className="p-3 bg-[#fef3c7] border border-[#f59e0b] rounded-lg text-sm text-[#92400e]">
                  ⚠️ Vui lòng chọn một báo cáo từ danh sách bên trái.
                </div>
              )}

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
function HistoryView({
  history,
  requests,
}: {
  history: ConsultationHistory[];
  requests: AdvisoryRequest[];
}) {
  const PAGE_SIZE = 10;

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [paidMap, setPaidMap] = useState<Record<string, PaymentState>>(() => {
    const map: Record<string, PaymentState> = {};
    history.forEach((h) => {
      map[h.requestId] = paidRequests.has(h.requestId) ? "paid" : "unpaid";
    });
    return map;
  });
  const [payingRequestId, setPayingRequestId] = useState<string | null>(null);

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

  // Reset to page 1 whenever search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handlePaymentSuccess = (requestId: string) => {
    paidRequests.add(requestId);
    setPaidMap((prev) => ({ ...prev, [requestId]: "paid" }));
    setPayingRequestId(null);
  };

  // Build page number array with ellipsis: [1, …, 4, 5, 6, …, 12]
  function getPageNumbers(current: number, total: number): (number | "...")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (current > 3) pages.push("...");
    for (
      let i = Math.max(2, current - 1);
      i <= Math.min(total - 1, current + 1);
      i++
    ) {
      pages.push(i);
    }
    if (current < total - 2) pages.push("...");
    pages.push(total);
    return pages;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {payingRequestId && (
        <PaymentModal
          requestId={payingRequestId}
          onSuccess={() => handlePaymentSuccess(payingRequestId)}
          onClose={() => setPayingRequestId(null)}
        />
      )}

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
                "Thời gian",
                "Thanh toán",
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
            {paginated.map((item) => {
              const payState = paidMap[item.requestId] ?? "unpaid";
              return (
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

                  {/* Payment column */}
                  <td className="px-4 py-3">
                    {payState === "paid" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#dcfce7] text-[#166534] text-xs font-medium whitespace-nowrap">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        Đã thanh toán
                      </span>
                    ) : (
                      <button
                        onClick={() => setPayingRequestId(item.requestId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#009689] text-white text-xs font-semibold hover:bg-[#007f75] transition-colors shadow-sm whitespace-nowrap"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Thanh toán
                      </button>
                    )}
                  </td>

                  {/* View action */}
                  <td className="px-4 py-3">
                    {payState === "paid" ? (
                      <Link
                        to={`/advisory?view=detail&id=${item.requestId}`}
                        className="flex items-center gap-1 text-[#009689] hover:underline text-sm whitespace-nowrap"
                      >
                        <Eye className="w-4 h-4" />
                        Xem
                      </Link>
                    ) : (
                      <button
                        onClick={() => setPayingRequestId(item.requestId)}
                        title="Cần thanh toán để xem"
                        className="flex items-center gap-1 text-[#90a1b9] hover:text-[#62748e] transition-colors text-sm whitespace-nowrap"
                      >
                        <Lock className="w-4 h-4" />
                        Xem
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-[#62748e]">
            <History className="w-10 h-10 text-[#cad5e2] mx-auto mb-3" />
            <p>Chưa có lịch sử tư vấn nào</p>
          </div>
        )}

        {/* Pagination footer — only show when there's data */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#e2e8f0] bg-[#f8fafc]">
            {/* Result count */}
            <p className="text-xs text-[#62748e]">
              {filtered.length === 0
                ? "Không có kết quả"
                : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} / ${filtered.length} kết quả`}
            </p>

            {/* Page controls */}
            <div className="flex items-center gap-1">
              {/* Prev */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#62748e] hover:bg-white hover:border-[#009689] hover:text-[#009689] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page numbers */}
              {getPageNumbers(currentPage, totalPages).map((p, i) =>
                p === "..." ? (
                  <span
                    key={`ellipsis-${i}`}
                    className="w-8 h-8 flex items-center justify-center text-xs text-[#90a1b9]"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors border ${
                      currentPage === p
                        ? "bg-[#009689] text-white border-[#009689]"
                        : "border-[#e2e8f0] text-[#62748e] hover:bg-white hover:border-[#009689] hover:text-[#009689]"
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}

              {/* Next */}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#62748e] hover:bg-white hover:border-[#009689] hover:text-[#009689] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-[#90a1b9]">
        <span className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          Cần thanh toán để xem nội dung tư vấn
        </span>
        <span className="flex items-center gap-1.5">
          <BadgeCheck className="w-3.5 h-3.5 text-[#16a34a]" />
          Đã thanh toán · Xem không giới hạn
        </span>
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
