import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
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
  Camera,
  Sprout,
  FileText,
  Briefcase,
  ClipboardList,
  Settings2,
  Info,
  ListChecks,
  User,
  Leaf,
  MapPin,
  CalendarDays,
} from "lucide-react";
import {
  AdvisoryRequest,
  RequestStatus,
  Priority,
  AdvisoryCropType as CropType,
  WorkerReport,
  ConsultationHistory,
  Specialist,
  mockRequests,
  mockWorkerReports,
  mockConsultationHistory,
  mockSpecialists,
} from "../../data/mockData";

// ===================== PAYMENT CONFIG =====================
// TODO: replace with real pricing fetched from backend (GET /api/pricing/consultation)
const PLACEHOLDER_PRICE = "Đang cập nhật";

// Session-level paid set (in real app: from backend/localStorage)
// TV-005 pre-seeded as paid to demonstrate the post-payment state
const paidRequests = new Set<string>(["TV-005"]);

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

// Display-only labels — keeps data values unchanged, improves UI copy
const statusLabel: Record<RequestStatus, string> = {
  "Chờ phản hồi": "Chờ phản hồi",
  "Đang xử lý": "Đang xử lý",
  "Đã phản hồi": "Đã phản hồi",
  Đóng: "Đã giải quyết",
};

const priorityConfig: Record<Priority, string> = {
  CAO: "bg-[#fee2e2] text-[#991b1b]",
  "TRUNG BÌNH": "bg-[#fef3c7] text-[#92400e]",
  THẤP: "bg-[#f1f5f9] text-[#475569]",
};

// Sentence-case display labels for priority badges
const priorityLabel: Record<Priority, string> = {
  CAO: "Cao",
  "TRUNG BÌNH": "Trung bình",
  THẤP: "Thấp",
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
      const ok = Math.random() > 0.35; // DEMO ONLY: 65% success rate — remove in production
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

// Shared pagination helper — used by both list view and HistoryView
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

// ===================== MAIN PAGE =====================
export function AdvisoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") || "list";
  const requestId = searchParams.get("id");

  const [requests, setRequests] = useState<AdvisoryRequest[]>(mockRequests);
  const [history] = useState<ConsultationHistory[]>(mockConsultationHistory);

  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [showAll, setShowAll] = useState(false);

  // Unresolved = statuses that still need owner attention
  const UNRESOLVED: RequestStatus[] = [
    "Chờ phản hồi",
    "Đang xử lý",
    "Đã phản hồi",
  ];

  const filteredRequests = requests.filter((req) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      req.title.toLowerCase().includes(q) ||
      req.crop.toLowerCase().includes(q) ||
      req.issue.toLowerCase().includes(q) ||
      req.field.toLowerCase().includes(q) ||
      req.id.toLowerCase().includes(q);
    const matchesPriority =
      priorityFilter === "all" || req.priority === priorityFilter;
    const matchesResolved = showAll || UNRESOLVED.includes(req.status);
    return matchesSearch && matchesPriority && matchesResolved;
  });

  const LIST_PAGE_SIZE = 8;
  const [listPage, setListPage] = useState(1);
  const totalListPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / LIST_PAGE_SIZE),
  );
  const paginatedRequests = filteredRequests.slice(
    (listPage - 1) * LIST_PAGE_SIZE,
    listPage * LIST_PAGE_SIZE,
  );

  // Reset to page 1 when filters or search change
  useEffect(() => {
    setListPage(1);
  }, [searchQuery, priorityFilter, showAll]);

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
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[#115e59] text-2xl font-semibold mb-1">
            Yêu cầu tư vấn
          </h1>
          <p className="text-[#45556c] text-sm">
            {showAll
              ? "Hiển thị tất cả yêu cầu."
              : "Không hiển thị các yêu cầu đã giải quyết"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSearchParams({ view: "history" })}
            className="flex items-center gap-2 px-3 py-2 border border-[#cad5e2] text-[#62748e] rounded-lg hover:bg-[#f8fafc] transition-colors text-sm"
          >
            <History className="w-4 h-4" />
            Lịch sử
          </button>
          <Link
            to="/advisory?view=create"
            className="bg-[#009689] text-white px-3 py-2 rounded-lg hover:bg-[#007f75] transition-colors flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Tạo yêu cầu
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#90A1B9]" />
          <input
            type="text"
            placeholder="Tìm theo mã, cây trồng, bệnh, khu vực..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm bg-white"
          />
        </div>
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
        <button
          onClick={() => setShowAll((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
            showAll
              ? "bg-[#f1f5f9] border-[#cad5e2] text-[#475569]"
              : "border-[#cad5e2] text-[#62748e] hover:bg-[#f8fafc]"
          }`}
        >
          <History className="w-4 h-4" />
          {showAll ? "Ẩn đã giải quyết" : "Xem tất cả"}
        </button>
      </div>

      {/* Request list */}
      <div className="flex flex-col gap-1.5">
        {paginatedRequests.map((request) => (
          <RequestCard key={request.id} request={request} />
        ))}
      </div>

      {/* Empty state — filter returns nothing */}
      {requests.length > 0 && filteredRequests.length === 0 && (
        <div className="text-center py-12 text-[#62748e]">
          <CheckCircle className="w-10 h-10 text-[#cad5e2] mx-auto mb-3" />
          <p className="font-medium text-[#334155] mb-1">
            {showAll
              ? "Không tìm thấy yêu cầu phù hợp"
              : "Không còn yêu cầu nào đang chờ xử lý"}
          </p>
          <p className="text-sm">
            {showAll
              ? "Thử thay đổi từ khóa hoặc bộ lọc."
              : "Tất cả yêu cầu đã được giải quyết."}
          </p>
        </div>
      )}

      {/* Zero state — no requests at all */}
      {requests.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-[#f0fdfa] rounded-full flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8 text-[#009689]" />
          </div>
          <h3 className="text-lg font-semibold text-[#115e59] mb-2">
            Chưa có yêu cầu tư vấn nào
          </h3>
          <p className="text-sm text-[#62748e] mb-6 max-w-xs">
            Tạo yêu cầu đầu tiên để gửi báo cáo từ nhân viên cho chuyên gia phân
            tích.
          </p>
          <Link
            to="/advisory?view=create"
            className="bg-[#009689] text-white px-6 py-2.5 rounded-lg hover:bg-[#007f75] transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Tạo yêu cầu đầu tiên
          </Link>
        </div>
      )}

      {/* Pagination — always visible when there's data */}
      {filteredRequests.length > 0 && (
        <div className="flex items-center justify-between border-t border-[#e2e8f0] pt-3">
          <p className="text-xs text-[#62748e]">
            {filteredRequests.length <= LIST_PAGE_SIZE
              ? `${filteredRequests.length} yêu cầu`
              : `${(listPage - 1) * LIST_PAGE_SIZE + 1}–${Math.min(listPage * LIST_PAGE_SIZE, filteredRequests.length)} / ${filteredRequests.length} yêu cầu`}
          </p>
          {totalListPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setListPage((p) => Math.max(1, p - 1))}
                disabled={listPage === 1}
                className="w-7 h-7 flex items-center justify-center rounded border border-[#e2e8f0] text-[#62748e] hover:border-[#009689] hover:text-[#009689] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {getPageNumbers(listPage, totalListPages).map((p, i) =>
                p === "..." ? (
                  <span
                    key={`e-${i}`}
                    className="w-7 h-7 flex items-center justify-center text-xs text-[#90a1b9]"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setListPage(p as number)}
                    className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium border transition-colors ${
                      listPage === p
                        ? "bg-[#009689] text-white border-[#009689]"
                        : "border-[#e2e8f0] text-[#62748e] hover:border-[#009689] hover:text-[#009689]"
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                onClick={() =>
                  setListPage((p) => Math.min(totalListPages, p + 1))
                }
                disabled={listPage === totalListPages}
                className="w-7 h-7 flex items-center justify-center rounded border border-[#e2e8f0] text-[#62748e] hover:border-[#009689] hover:text-[#009689] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===================== REQUEST CARD =====================
function RequestCard({ request }: { request: AdvisoryRequest }) {
  const StatusIcon = statusConfig[request.status].icon;
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-lg px-4 py-3 hover:border-[#009689]/50 hover:bg-[#fafffe] transition-all">
      <div className="flex items-start justify-between gap-4">
        {/* Left: all text content */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {/* Row 1: ID + status + priority */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-[#90a1b9]">
              {request.id}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusConfig[request.status].color}`}
            >
              <StatusIcon className="w-3 h-3" />
              {statusLabel[request.status]}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConfig[request.priority]}`}
            >
              {priorityLabel[request.priority]}
            </span>
          </div>

          {/* Row 2: Title + field */}
          <div>
            <h3 className="text-sm font-semibold text-[#115e59] leading-snug line-clamp-1">
              {request.title}
            </h3>
            <p className="text-xs text-[#90a1b9] truncate mt-0.5">
              {request.field}
            </p>
          </div>

          {/* Row 3: AI issue pill */}
          <div className="flex items-center gap-1.5 bg-[#fff7ed] rounded px-2.5 py-1.5 border-l-2 border-[#f59e0b] w-fit max-w-full">
            <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />
            <span className="text-xs text-[#92400e] font-medium truncate">
              {request.issue}
            </span>
            <span className="text-xs text-[#92400e] shrink-0 flex items-center gap-0.5 ml-1 pl-1 border-l border-[#f59e0b]/40">
              <Cpu className="w-3 h-3" />
              {request.aiConfidence}%
            </span>
          </div>

          {/* Row 4: Reporter + specialist */}
          <div className="flex items-center gap-3 text-xs text-[#90a1b9]">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" /> {request.reportCreatedBy}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {request.reportCreatedAt}
            </span>
            {request.assignedTo && (
              <span className="text-[#009689] font-medium truncate">
                · {request.assignedTo}
              </span>
            )}
          </div>
        </div>

        {/* Right: action button */}
        <Link
          to={`/advisory?view=detail&id=${request.id}`}
          className="shrink-0 self-center flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#009689] text-[#009689] hover:bg-[#f0fdfa] transition-colors text-xs font-medium whitespace-nowrap"
        >
          Xem chi tiết <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ===================== DETAIL VIEW =====================
// ─── Task prefill state passed to TasksPage via router state ────────────────
export interface TaskPrefill {
  /** Source advisory request id, for traceability */
  sourceAdvisoryId: string;
  /** Suggested task type — maps to one of TASK_TYPES in TasksPage */
  suggestedTaskType: string;
  /** Pre-filled area extracted from the advisory request's field */
  area: string;
  /** Crop type for template pre-selection */
  crop: string;
  /** Pre-filled notes combining specialist recommendation */
  notes: string;
}

/** Map an issue label to the closest TASK_TYPE value used in TasksPage */
function inferTaskType(issue: string): string {
  const lower = issue.toLowerCase();
  if (
    lower.includes("rệp") ||
    lower.includes("sâu") ||
    lower.includes("phấn") ||
    lower.includes("nấm") ||
    lower.includes("đốm") ||
    lower.includes("than thư") ||
    lower.includes("bệnh")
  ) {
    return "Bảo vệ thực vật";
  }
  if (
    lower.includes("phân") ||
    lower.includes("nitơ") ||
    lower.includes("dinh dưỡng")
  ) {
    return "Bón phân";
  }
  if (lower.includes("tưới") || lower.includes("nước")) {
    return "Tưới nước";
  }
  if (lower.includes("thu hoạch")) {
    return "Thu hoạch";
  }
  return "Kiểm tra";
}

/** Extract the area code (e.g. "Khu C") from a field string like "Khu C - Luống C-3" */
function extractArea(field: string): string {
  const match = field.match(/^(Khu\s+[A-Za-z])/i);
  return match ? match[1] : "";
}

function DetailView({ request }: { request: AdvisoryRequest }) {
  const navigate = useNavigate();
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

  /** Navigate to /tasks with pre-filled data from this advisory request */
  const handleCreateTask = (taskType?: string) => {
    const prefill: TaskPrefill = {
      sourceAdvisoryId: request.id,
      suggestedTaskType: taskType ?? inferTaskType(request.issue),
      area: extractArea(request.field),
      crop: request.crop,
      notes: request.response?.recommendation
        ? `[Từ tư vấn ${request.id}] ${request.response.recommendation}`
        : `[Từ tư vấn ${request.id}] ${request.issue} – ${request.field}`,
    };
    navigate("/tasks", { state: { taskPrefill: prefill } });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {showPaymentModal && (
        <PaymentModal
          requestId={request.id}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPaymentModal(false)}
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
              {statusLabel[request.status]}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConfig[request.priority]}`}
            >
              {priorityLabel[request.priority]}
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
            <h3 className="text-sm font-semibold text-[#62748e] flex items-center gap-2 mb-3">
              <Camera className="w-4 h-4" /> Hình ảnh thực tế
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
            <h3 className="text-sm font-semibold text-[#62748e] flex items-center gap-2 mb-3">
              <Sprout className="w-4 h-4" /> Thông tin canh tác
            </h3>
            <div className="space-y-3 text-sm">
              <InfoRow icon={Leaf} label="Cây trồng" value={request.crop} />
              <InfoRow icon={MapPin} label="Khu vực" value={request.field} />
              <InfoRow
                icon={CalendarDays}
                label="Mùa vụ"
                value={request.season}
              />
              <InfoRow
                icon={Sprout}
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
            <h3 className="text-sm font-semibold text-[#62748e] flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4" /> Thông tin báo cáo gốc
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-[#62748e] mb-1">
                  Nhân viên báo cáo
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
                <h3 className="text-sm font-semibold text-[#62748e] flex items-center gap-2 mb-3">
                  <Briefcase className="w-4 h-4" /> Phản hồi từ chuyên gia
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
                        {request.response?.specialistOrg ??
                          "Chuyên gia nông nghiệp"}
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
                <h3 className="font-semibold text-[#115e59] flex items-center gap-2 mb-4">
                  <ClipboardList className="w-4 h-4" /> Nội dung tư vấn
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
                <h3 className="text-sm font-semibold text-[#62748e] flex items-center gap-2 mb-3">
                  <ListChecks className="w-4 h-4" /> Phương án xử lý
                </h3>
                {/* Origin banner — shows which advisory this was created from */}
                <div className="flex items-center gap-2 px-3 py-2 bg-[#f0fdfa] border border-[#009689]/20 rounded-lg text-xs text-[#115e59] mb-3">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Nhấn vào các nút bên dưới để tạo nhiệm vụ trên trang{" "}
                    <strong>Công việc</strong>. Thông tin tư vấn sẽ được điền
                    sẵn.
                  </span>
                </div>
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => handleCreateTask("Kiểm tra")}
                    className="flex-1 px-4 py-2 bg-white border border-[#cad5e2] text-[#314158] rounded-lg hover:bg-[#f8fafc] transition-colors text-sm flex items-center justify-center gap-1.5"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    Tạo nhiệm vụ theo dõi
                  </button>
                  <button
                    onClick={() => handleCreateTask("Bảo vệ thực vật")}
                    className="flex-1 px-4 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Tạo nhiệm vụ xử lý
                  </button>
                  <button className="flex-1 px-4 py-2 bg-white border border-[#cad5e2] text-[#314158] rounded-lg hover:bg-[#f8fafc] transition-colors text-sm">
                    Đánh dấu đã xử lý
                  </button>
                </div>
                <button
                  onClick={() => handleCreateTask()}
                  className="w-full bg-[#009689] text-white px-6 py-3 rounded-lg hover:bg-[#007f75] transition-colors flex items-center justify-center gap-2"
                >
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
  const [isReportPanelOpen, setIsReportPanelOpen] = useState(true);

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
          Chọn báo cáo từ nhân viên và gửi cho chuyên gia phù hợp.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Chọn báo cáo */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
            <button
              type="button"
              onClick={() => setIsReportPanelOpen((prev) => !prev)}
              className="w-full flex items-center justify-between mb-3 group"
            >
              <h3 className="text-sm font-semibold text-[#62748e] flex items-center gap-2">
                <FileText className="w-4 h-4" /> Chọn báo cáo từ nhân viên
                {selectedReportId && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#009689] text-white text-[10px] font-medium leading-none">
                    ✓
                  </span>
                )}
              </h3>
              <span className="text-[#90a1b9] group-hover:text-[#009689] transition-colors text-xs select-none">
                {isReportPanelOpen ? "Thu gọn ▲" : "Mở rộng ▼"}
              </span>
            </button>
            {isReportPanelOpen && (
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
                        <div className="text-xs text-[#90a1b9]">
                          {report.id}
                        </div>
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
            )}
          </div>

          {selectedReport && (
            <div className="bg-white rounded-lg border border-[#009689] shadow-sm p-4">
              <h3 className="text-sm font-semibold text-[#009689] flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4" /> Báo cáo đã chọn
              </h3>
              <div className="space-y-2 text-sm">
                <InfoRow
                  icon={Leaf}
                  label="Cây trồng"
                  value={selectedReport.crop}
                />
                <InfoRow
                  icon={MapPin}
                  label="Khu vực"
                  value={selectedReport.field}
                />
                <InfoRow
                  icon={CalendarDays}
                  label="Mùa vụ"
                  value={selectedReport.season}
                />
                <InfoRow
                  icon={Sprout}
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
            <h3 className="text-sm font-semibold text-[#62748e] flex items-center gap-2 mb-4">
              <Settings2 className="w-4 h-4" /> Thiết lập yêu cầu tư vấn
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
                  {mockSpecialists.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} – {s.org}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Mức độ ưu tiên
                </label>
                <div className="flex gap-2">
                  {(["THẤP", "TRUNG BÌNH", "CAO"] as Priority[]).map((p) => (
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
                      {priorityLabel[p]}
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
                <p className="text-xs text-[#62748e] mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3 shrink-0" />
                  Báo cáo gốc và hình ảnh sẽ được đính kèm tự động.
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
                <div className="p-3 bg-[#fef3c7] border border-[#f59e0b] rounded-lg text-sm text-[#92400e] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Vui lòng chọn một báo cáo từ danh sách bên trái.
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

  // Paid state: keyed by request id
  const [paidMap, setPaidMap] = useState<Record<string, PaymentState>>(() => {
    const map: Record<string, PaymentState> = {};
    requests.forEach((r) => {
      map[r.id] = paidRequests.has(r.id) ? "paid" : "unpaid";
    });
    return map;
  });
  const [payingRequestId, setPayingRequestId] = useState<string | null>(null);

  // Derive history rows from ALL requests — not just responded ones
  const allRows = requests.map((r) => ({
    id: r.id,
    title: r.title,
    crop: r.crop,
    issue: r.issue,
    priority: r.priority,
    status: r.status,
    assignedTo: r.assignedTo,
    createdAt: r.createdAt,
    responseTime: r.responseTime,
    hasResponse: r.status === "Đã phản hồi" && !!r.response,
  }));

  const filtered = allRows.filter((row) => {
    const q = search.toLowerCase();
    return (
      row.id.toLowerCase().includes(q) ||
      row.title.toLowerCase().includes(q) ||
      row.crop.toLowerCase().includes(q) ||
      row.issue.toLowerCase().includes(q) ||
      (row.assignedTo ?? "").toLowerCase().includes(q)
    );
  });

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

  // Payment column: what to show for each row
  function PaymentCell({ row }: { row: (typeof allRows)[number] }) {
    const payState = paidMap[row.id] ?? "unpaid";

    // Only show a payment action when a formal response (Recommendation) exists
    if (row.hasResponse) {
      if (payState === "paid") {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#dcfce7] text-[#166534] text-xs font-medium whitespace-nowrap">
            <BadgeCheck className="w-3 h-3" /> Đã thanh toán
          </span>
        );
      }
      return (
        <button
          onClick={() => setPayingRequestId(row.id)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#009689] text-white text-xs font-semibold hover:bg-[#007f75] transition-colors whitespace-nowrap"
        >
          <CreditCard className="w-3 h-3" /> Thanh toán
        </button>
      );
    }

    // No formal response exists yet — covers Chờ phản hồi, Đang xử lý,
    // and Đóng cases where the specialist closed without writing a Recommendation
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#f1f5f9] text-[#90a1b9] text-xs font-medium whitespace-nowrap">
        <Clock className="w-3 h-3" /> Chưa phản hồi
      </span>
    );
  }

  // Action column — always show Xem; only unpaid responded entries get the locked variant
  function ActionCell({ row }: { row: (typeof allRows)[number] }) {
    const payState = paidMap[row.id] ?? "unpaid";

    // Responded but not yet paid — prompt payment before revealing content
    if (row.hasResponse && payState !== "paid") {
      return (
        <button
          onClick={() => setPayingRequestId(row.id)}
          title="Cần thanh toán để xem nội dung tư vấn"
          className="flex items-center gap-1 text-[#90a1b9] hover:text-[#62748e] transition-colors text-xs whitespace-nowrap"
        >
          <Lock className="w-3.5 h-3.5" /> Xem
        </button>
      );
    }

    // All other cases: freely viewable
    return (
      <Link
        to={`/advisory?view=detail&id=${row.id}`}
        className="flex items-center gap-1 text-[#009689] hover:underline text-xs whitespace-nowrap"
      >
        <Eye className="w-3.5 h-3.5" /> Xem
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
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
            Toàn bộ yêu cầu tư vấn từ trước đến nay.
          </p>
        </div>
        <Link
          to="/advisory"
          className="flex items-center gap-2 text-[#62748e] hover:text-[#115e59] text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </Link>
      </div>

      {/* Search — full width to match table */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#90A1B9]" />
        <input
          type="text"
          placeholder="Tìm theo mã, tên, cây trồng, bệnh..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm bg-white"
        />
      </div>

      {/* Table — min-w-max + overflow-x-auto: columns size to content, never clip */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm overflow-x-auto">
        <table className="w-full min-w-[780px] text-xs">
          <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-[#62748e] uppercase tracking-wide w-[80px]">
                Mã YC
              </th>
              <th className="px-3 py-3 text-left font-semibold text-[#62748e] uppercase tracking-wide w-[120px]">
                Cây trồng
              </th>
              <th className="px-3 py-3 text-left font-semibold text-[#62748e] uppercase tracking-wide">
                Bệnh / Vấn đề
              </th>
              <th className="px-3 py-3 text-left font-semibold text-[#62748e] uppercase tracking-wide w-[80px]">
                Mức độ
              </th>
              <th className="px-3 py-3 text-left font-semibold text-[#62748e] uppercase tracking-wide w-[120px]">
                Chuyên gia
              </th>
              <th className="px-3 py-3 text-left font-semibold text-[#62748e] uppercase tracking-wide w-[120px]">
                Thời gian
              </th>
              <th className="px-3 py-3 text-left font-semibold text-[#62748e] uppercase tracking-wide w-[130px]">
                Trạng thái
              </th>
              <th className="px-3 py-3 text-left font-semibold text-[#62748e] uppercase tracking-wide w-[130px]">
                Thanh toán
              </th>
              <th className="px-3 py-3 text-left font-semibold text-[#62748e] uppercase tracking-wide w-[60px]">
                Xem
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {paginated.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-[#f8fafc] transition-colors align-middle"
              >
                <td className="px-3 py-3 font-semibold text-[#115e59] whitespace-nowrap">
                  {row.id}
                </td>
                <td className="px-3 py-3 text-[#62748e]">{row.crop}</td>
                <td className="px-3 py-3 text-[#334155]">{row.issue}</td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded font-medium ${priorityConfig[row.priority]}`}
                  >
                    {priorityLabel[row.priority]}
                  </span>
                </td>
                <td className="px-3 py-3 text-[#62748e]">
                  {row.assignedTo ?? <span className="text-[#cad5e2]">—</span>}
                </td>
                <td className="px-3 py-3 text-[#62748e] whitespace-nowrap">
                  {row.createdAt}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusConfig[row.status].color}`}
                  >
                    {statusLabel[row.status]}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <PaymentCell row={row} />
                </td>
                <td className="px-3 py-3">
                  <ActionCell row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-[#62748e]">
            <History className="w-10 h-10 text-[#cad5e2] mx-auto mb-3" />
            <p className="text-sm">Chưa có yêu cầu tư vấn nào.</p>
          </div>
        )}

        {/* Pagination footer */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#e2e8f0] bg-[#f8fafc]">
            <p className="text-xs text-[#62748e]">
              {filtered.length <= PAGE_SIZE
                ? `${filtered.length} yêu cầu`
                : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} / ${filtered.length} yêu cầu`}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-7 h-7 flex items-center justify-center rounded border border-[#e2e8f0] text-[#62748e] hover:border-[#009689] hover:text-[#009689] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {getPageNumbers(currentPage, totalPages).map((p, i) =>
                  p === "..." ? (
                    <span
                      key={`e-${i}`}
                      className="w-7 h-7 flex items-center justify-center text-xs text-[#90a1b9]"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium border transition-colors ${
                        currentPage === p
                          ? "bg-[#009689] text-white border-[#009689]"
                          : "border-[#e2e8f0] text-[#62748e] hover:border-[#009689] hover:text-[#009689]"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded border border-[#e2e8f0] text-[#62748e] hover:border-[#009689] hover:text-[#009689] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-[#90a1b9]">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> Chưa phản hồi — đang chờ chuyên gia
          xem xét
        </span>
        <span className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" /> Cần thanh toán để xem nội dung tư vấn
        </span>
        <span className="flex items-center gap-1.5">
          <BadgeCheck className="w-3.5 h-3.5 text-[#16a34a]" /> Đã thanh toán ·
          Xem không giới hạn
        </span>
      </div>
    </div>
  );
}

// ===================== HELPERS =====================
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 bg-[#f1f5f9] rounded-lg flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-[#62748e]" />
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
