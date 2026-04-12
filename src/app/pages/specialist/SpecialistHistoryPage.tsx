import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  ClipboardList,
  Wallet,
  RefreshCw,
  AlertCircle,
  BadgeCheck,
  Receipt,
  ExternalLink,
} from "lucide-react";
import { api, type DiagnosisResponse } from "../../../api/client";
import {
  mockConsultationHistory,
  mockPaymentHistory,
  type PaymentRecord,
} from "../../../data/mockSpecialistData";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 8;

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

function severityLabel(s: string) {
  if (s === "CRITICAL") return "Nghiêm trọng";
  if (s === "HIGH") return "Cao";
  if (s === "MEDIUM") return "Trung bình";
  if (s === "LOW") return "Thấp";
  return s;
}

function severityBadgeCss(s: string) {
  if (s === "CRITICAL") return "bg-red-50 text-red-700 border border-red-200";
  if (s === "HIGH")
    return "bg-orange-50 text-orange-700 border border-orange-200";
  if (s === "MEDIUM")
    return "bg-yellow-50 text-yellow-700 border border-yellow-200";
  return "bg-green-50 text-green-700 border border-green-200";
}

function PaginationBar({
  currentPage,
  totalPages,
  onPage,
}: {
  currentPage: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onPage(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:border-[#009689] hover:text-[#009689] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      {getPageNumbers(currentPage, totalPages).map((p, i) =>
        p === "..." ? (
          <span
            key={`e-${i}`}
            className="w-7 h-7 flex items-center justify-center text-xs text-slate-400"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p as number)}
            className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium border transition-colors ${
              currentPage === p
                ? "bg-[#009689] text-white border-[#009689]"
                : "border-slate-200 text-slate-500 hover:border-[#009689] hover:text-[#009689]"
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onPage(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:border-[#009689] hover:text-[#009689] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT DETAIL MODAL (mock only — unchanged logic)
// ─────────────────────────────────────────────────────────────────────────────
function PaymentDetailModal({
  record,
  onClose,
}: {
  record: PaymentRecord;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-[#009689]/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#009689]/10 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-[#009689]" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">
                Chi tiết thanh toán
              </h3>
              <p className="text-xs text-slate-400">{record.transactionId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-[#f0fdfa] border border-[#009689]/20 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Số tiền nhận được</p>
            <p className="text-3xl font-bold text-[#009689]">
              {record.amount.toLocaleString("vi-VN")}
              <span className="text-base font-medium ml-1 text-[#009689]/70">
                đ
              </span>
            </p>
            <span
              className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold px-3 py-1 rounded-full ${
                record.status === "Đã thanh toán"
                  ? "text-green-700 bg-green-100"
                  : record.status === "Hoàn tiền"
                    ? "text-red-700 bg-red-100"
                    : "text-amber-700 bg-amber-100"
              }`}
            >
              <BadgeCheck className="w-3.5 h-3.5" />
              {record.status}
            </span>
          </div>
          {[
            { label: "Mã phản hồi", value: record.responseCode, mono: true },
            { label: "Mã yêu cầu gốc", value: record.requestCode, mono: true },
            { label: "Mã giao dịch", value: record.transactionId, mono: true },
            { label: "Nông trại", value: record.farmName },
            { label: "Vấn đề tư vấn", value: record.issue },
            {
              label: "Thời gian thanh toán",
              value:
                new Date(record.paidAt).toLocaleDateString("vi-VN") +
                " lúc " +
                new Date(record.paidAt).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
            },
          ].map(({ label, value, mono }) => (
            <div
              key={label}
              className="flex items-start justify-between gap-4 py-2 border-b border-slate-50 last:border-0"
            >
              <span className="text-xs text-slate-400 shrink-0">{label}</span>
              <span
                className={`text-sm text-slate-700 font-medium text-right ${mono ? "font-mono text-xs" : ""}`}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: CONSULTATION HISTORY — real API, filtered by current user
// ─────────────────────────────────────────────────────────────────────────────
function ConsultationHistoryTab() {
  const navigate = useNavigate();
  const [diagnoses, setDiagnoses] = useState<DiagnosisResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMockData, setIsMockData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Get current user ID from localStorage (set at login time)
  const currentUserId = localStorage.getItem("userId") ?? "";

  async function loadDiagnoses() {
    setLoading(true);
    setLoadError(null);
    try {
      // GET /api/Reports/diagnosis returns all diagnoses across all reports
      const all = await api.getAllDiagnoses();
      // Filter to only this specialist's own diagnoses
      const mine = currentUserId
        ? all.filter((d) => d.diagnosedBy === currentUserId)
        : all;
      // Sort newest first
      mine.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setDiagnoses(mine);
      setIsMockData(false);
    } catch {
      // Mock fallback: convert ConsultationHistoryRow shape to DiagnosisResponse shape
      const mockFallback: DiagnosisResponse[] = mockConsultationHistory.map(
        (row) =>
          ({
            id: row.id,
            reportId: row.requestCode, // only code available in mock
            diagnosedBy: currentUserId,
            diagnoserName: "Chuyên gia (mẫu)",
            diseaseName: row.issue,
            conclusion: row.content,
            recommendedAction: row.content,
            severityLevel: (() => {
              if (row.priority === "Nghiêm trọng") return "CRITICAL";
              if (row.priority === "Cao") return "HIGH";
              if (row.priority === "Trung bình") return "MEDIUM";
              return "LOW";
            })(),
            status: "FINAL",
            createdAt: row.respondedAt,
            // Extra fields not in DiagnosisResponse but useful for display — stored separately
            reportNo: row.responseCode,
            reportTitle: row.crop,
          }) as DiagnosisResponse & { reportNo?: string; reportTitle?: string },
      );
      setDiagnoses(mockFallback);
      setIsMockData(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDiagnoses();
  }, []);
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filtered = diagnoses.filter((d) => {
    const q = search.toLowerCase();
    const ext = d as DiagnosisResponse & {
      reportNo?: string;
      reportTitle?: string;
    };
    return (
      !q ||
      d.diseaseName.toLowerCase().includes(q) ||
      d.diagnoserName.toLowerCase().includes(q) ||
      d.reportId.toLowerCase().includes(q) ||
      (ext.reportNo ?? "").toLowerCase().includes(q) ||
      (ext.reportTitle ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 gap-4">
        <div>
          <h2 className="font-semibold text-slate-800">Nhật ký chẩn đoán</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Các chẩn đoán bạn đã cung cấp.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isMockData && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
              Dữ liệu mẫu
            </span>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên bệnh, mã báo cáo..."
              className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]/30 bg-white w-48"
            />
          </div>
          <button
            onClick={loadDiagnoses}
            disabled={loading}
            title="Tải lại"
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {loadError}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Mã báo cáo
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Tiêu đề báo cáo
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Tên bệnh
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Kết luận
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Mức độ
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Ngày chẩn đoán
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading && (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <RefreshCw className="w-5 h-5 animate-spin text-slate-300 mx-auto" />
                </td>
              </tr>
            )}
            {!loading && paginated.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-12 text-sm text-slate-400"
                >
                  Không tìm thấy kết quả phù hợp.
                </td>
              </tr>
            )}
            {!loading &&
              paginated.map((d) => {
                const ext = d as DiagnosisResponse & {
                  reportNo?: string;
                  reportTitle?: string;
                };
                return (
                  <tr
                    key={d.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                        {ext.reportNo ?? d.reportId.slice(0, 8) + "…"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 max-w-[180px] truncate">
                      {ext.reportTitle ?? "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-50 text-orange-700">
                        {d.diseaseName}
                      </span>
                    </td>
                    <td
                      className="px-4 py-4 text-sm text-slate-500 max-w-[220px] truncate"
                      title={d.conclusion}
                    >
                      {d.conclusion}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${severityBadgeCss(d.severityLevel)}`}
                      >
                        {severityLabel(d.severityLevel)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500 whitespace-nowrap">
                      {new Date(d.createdAt).toLocaleDateString("vi-VN")}{" "}
                      {new Date(d.createdAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() =>
                          navigate(`/specialist/consultations/${d.reportId}`)
                        }
                        className="inline-flex items-center gap-1.5 text-sm text-[#009689] font-semibold hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Xem báo cáo
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500">
            {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, filtered.length)} /{" "}
            {filtered.length} mục
          </p>
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            onPage={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: PAYMENT HISTORY — mock only per spec
// ─────────────────────────────────────────────────────────────────────────────
function PaymentHistoryTab() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [detailRecord, setDetailRecord] = useState<PaymentRecord | null>(null);

  const filtered = mockPaymentHistory
    .filter((r) => {
      const q = search.toLowerCase();
      return (
        !q ||
        r.transactionId.toLowerCase().includes(q) ||
        r.responseCode.toLowerCase().includes(q) ||
        r.requestCode.toLowerCase().includes(q) ||
        r.farmName.toLowerCase().includes(q) ||
        r.issue.toLowerCase().includes(q)
      );
    })
    .sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
    );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <>
      {detailRecord && (
        <PaymentDetailModal
          record={detailRecord}
          onClose={() => setDetailRecord(null)}
        />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 gap-4">
          <div>
            <h2 className="font-semibold text-slate-800">Lịch sử thanh toán</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Các khoản thanh toán owner đã thực hiện để xem phản hồi của bạn.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
              Dữ liệu mẫu
            </span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mã giao dịch, nông trại..."
                className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]/30 bg-white w-52"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Mã giao dịch
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Liên kết đơn
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Nông trại
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Số tiền
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Thời gian
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12 text-sm text-slate-400"
                  >
                    Không tìm thấy giao dịch phù hợp.
                  </td>
                </tr>
              ) : (
                paginated.map((rec) => (
                  <tr
                    key={rec.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                        {rec.transactionId}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-slate-500 font-mono">
                          {rec.responseCode}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {rec.requestCode}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700 font-medium">
                      {rec.farmName}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-bold text-[#009689]">
                        {rec.amount.toLocaleString("vi-VN")}đ
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500 whitespace-nowrap">
                      {new Date(rec.paidAt).toLocaleDateString("vi-VN")}{" "}
                      <span className="text-slate-400 text-xs">
                        {new Date(rec.paidAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setDetailRecord(rec)}
                        className="text-sm text-[#009689] font-semibold hover:underline"
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 bg-slate-50">
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              onPage={setCurrentPage}
            />
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
type TabId = "consultations" | "payments";

const TABS: { id: TabId; label: string; icon: typeof ClipboardList }[] = [
  { id: "consultations", label: "Nhật ký chẩn đoán", icon: ClipboardList },
  { id: "payments", label: "Lịch sử thanh toán", icon: Wallet },
];

export function SpecialistHistoryPage() {
  const [activeTab, setActiveTab] = useState<TabId>("consultations");

  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = new Date().toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Lịch sử</h1>
        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
          <span className="opacity-60">📅</span>
          {today} | {timeStr}
        </p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "consultations" ? (
        <ConsultationHistoryTab />
      ) : (
        <PaymentHistoryTab />
      )}
    </div>
  );
}
