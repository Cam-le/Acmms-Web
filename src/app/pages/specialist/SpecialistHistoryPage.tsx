import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  FileDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  X,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Receipt,
  ClipboardList,
  Wallet,
  BadgeCheck,
} from "lucide-react";
import {
  mockConsultationHistory,
  mockConsultationRequests,
  mockPaymentHistory,
  type ConsultationHistoryRow,
  type PaymentRecord,
  type Severity,
} from "../../../data/mockSpecialistData";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://localhost:7093";

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT DETAIL MODAL
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
        {/* Header */}
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

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Amount — hero */}
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

          {/* Detail rows */}
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
// EDIT RESPONSE MODAL (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
function EditResponseModal({
  row,
  onClose,
  onSaved,
}: {
  row: ConsultationHistoryRow;
  onClose: () => void;
  onSaved: (updated: Partial<ConsultationHistoryRow>) => void;
}) {
  const [title, setTitle] = useState(row.title);
  const [content, setContent] = useState(row.content);
  const [priority, setPriority] = useState<Severity>(row.priority);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setError("");

    const severityMap: Record<Severity, string> = {
      Thấp: "Low",
      "Trung bình": "Medium",
      Cao: "High",
      "Nghiêm trọng": "Critical",
    };

    try {
      const res = await fetch(
        `${BASE_URL}/api/Recommendations/${row.recommendationId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            content,
            pestSeverity: severityMap[priority],
          }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      const isNetworkError =
        err instanceof TypeError && err.message.includes("fetch");
      if (!isNetworkError) {
        setSaving(false);
        setError(
          err instanceof Error
            ? `Lỗi lưu phản hồi: ${err.message}`
            : "Có lỗi xảy ra, vui lòng thử lại.",
        );
        return;
      }
      // Network unreachable → apply local update silently (mock mode)
    }

    onSaved({ content, priority });
    setSaving(false);
    setSaved(true);
  };

  if (saved) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Đã lưu thay đổi!</h3>
          <p className="text-sm text-slate-500">
            Phản hồi đã được cập nhật thành công.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#009689] text-white rounded-xl text-sm font-semibold hover:bg-[#007f73] transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800">Chỉnh sửa phản hồi</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {row.responseCode} · {row.requestCode}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tiêu đề
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Nội dung điều trị <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]/30 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Mức độ ưu tiên
            </label>
            <div className="relative">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Severity)}
                className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]/30 bg-white text-slate-700"
              >
                <option value="Thấp">Thấp</option>
                <option value="Trung bình">Trung bình</option>
                <option value="Cao">Cao</option>
                <option value="Nghiêm trọng">Nghiêm trọng</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !content.trim()}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#009689] text-white hover:bg-[#007f73] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4" />
                Lưu thay đổi
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HELPERS
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

function priorityDot(p: Severity) {
  if (p === "Cao" || p === "Nghiêm trọng") return "bg-red-500";
  if (p === "Trung bình") return "bg-orange-400";
  return "bg-green-500";
}

function priorityText(p: Severity) {
  if (p === "Cao" || p === "Nghiêm trọng") return "text-red-600 font-semibold";
  if (p === "Trung bình") return "text-orange-500 font-semibold";
  return "text-green-600 font-semibold";
}

function diseaseBadgeColor(name: string) {
  const map: Record<string, string> = {
    "Sâu tơ": "bg-orange-100 text-orange-700",
    "Sương mai": "bg-blue-100 text-blue-700",
    "Đạo ôn lá": "bg-yellow-100 text-yellow-700",
    "Sâu keo mùa thu": "bg-rose-100 text-rose-700",
    "Mốc sương": "bg-purple-100 text-purple-700",
    "Đốm vòng": "bg-amber-100 text-amber-700",
  };
  return map[name] ?? "bg-gray-100 text-gray-700";
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: CONSULTATION HISTORY (extracted from original SpecialistHistoryPage)
// ─────────────────────────────────────────────────────────────────────────────
function ConsultationHistoryTab() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingRow, setEditingRow] = useState<ConsultationHistoryRow | null>(
    null,
  );
  const [localEdits, setLocalEdits] = useState<
    Record<string, Partial<ConsultationHistoryRow>>
  >({});

  // Set of responseCode values that have a matching payment record
  // Used to show payment status badge — lets specialist cross-check with invoices
  const paidResponseCodes = new Set(
    mockPaymentHistory.map((p) => p.responseCode),
  );

  const handleSaved = (
    id: string,
    updated: Partial<ConsultationHistoryRow>,
  ) => {
    setLocalEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...updated } }));
    setEditingRow(null);
  };

  const history = mockConsultationHistory.map((row) =>
    localEdits[row.id] ? { ...row, ...localEdits[row.id] } : row,
  );

  const filtered = history.filter((row) => {
    const q = search.toLowerCase();
    return (
      !q ||
      row.responseCode.toLowerCase().includes(q) ||
      row.requestCode.toLowerCase().includes(q) ||
      row.crop.toLowerCase().includes(q) ||
      row.issue.toLowerCase().includes(q)
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

  return (
    <>
      {editingRow && (
        <EditResponseModal
          row={editingRow}
          onClose={() => setEditingRow(null)}
          onSaved={(updated) => handleSaved(editingRow.id, updated)}
        />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 gap-4">
          <div>
            <h2 className="font-semibold text-slate-800">Nhật ký phản hồi</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Lịch sử tất cả các phản hồi chính thức được chuyên gia cung cấp.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mã, cây, bệnh..."
                className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]/30 bg-white w-44"
              />
            </div>

            <button className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 text-sm font-semibold rounded-xl hover:bg-rose-100 transition-colors border border-rose-100">
              <FileDown className="w-4 h-4" />
              Xuất PDF
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Mã phản hồi
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Mã yêu cầu gốc
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Loại cây
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Tên bệnh
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Độ ưu tiên
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Thanh toán
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Ngày phản hồi
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
                    colSpan={8}
                    className="text-center py-12 text-sm text-slate-400"
                  >
                    Không tìm thấy kết quả phù hợp.
                  </td>
                </tr>
              ) : (
                paginated.map((res) => (
                  <tr
                    key={res.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                      {res.responseCode}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {res.requestCode}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                        {res.crop}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${diseaseBadgeColor(res.issue)}`}
                      >
                        {res.issue}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`flex items-center gap-1.5 text-sm ${priorityText(res.priority)}`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${priorityDot(res.priority)}`}
                        />
                        {res.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {paidResponseCodes.has(res.responseCode) ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                          <BadgeCheck className="w-3.5 h-3.5" />
                          Đã thanh toán
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                          Chưa thanh toán
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500 whitespace-nowrap">
                      {new Date(res.respondedAt).toLocaleDateString("vi-VN")}{" "}
                      {new Date(res.respondedAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => {
                            const match = mockConsultationRequests.find(
                              (r) => r.requestCode === res.requestCode,
                            );
                            if (match) {
                              navigate(`/specialist/consultations/${match.id}`);
                            }
                          }}
                          className="text-sm text-[#009689] font-semibold hover:underline"
                        >
                          Xem chi tiết
                        </button>
                        <button
                          onClick={() => setEditingRow(res)}
                          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium border border-slate-200 rounded-lg px-2.5 py-1 hover:bg-slate-50 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Sửa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-500">
              {filtered.length <= PAGE_SIZE
                ? `${filtered.length} phản hồi`
                : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(
                    currentPage * PAGE_SIZE,
                    filtered.length,
                  )} / ${filtered.length} phản hồi`}
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                      onClick={() => setCurrentPage(p as number)}
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
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:border-[#009689] hover:text-[#009689] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: PAYMENT HISTORY
// ─────────────────────────────────────────────────────────────────────────────
function PaymentHistoryTab() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [detailRecord, setDetailRecord] = useState<PaymentRecord | null>(null);

  // ── filter + sort by most recent first ────────────────────────────────────
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

      <div className="space-y-4">
        {/* Table card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Card header + search */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 gap-4">
            <div>
              <h2 className="font-semibold text-slate-800">
                Lịch sử thanh toán
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Các khoản thanh toán owner đã thực hiện để xem phản hồi của bạn.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm mã giao dịch, nông trại..."
                  className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]/30 bg-white w-52"
                />
              </div>
              {/* TODO: wire up real PDF export — GET /api/payments/specialist/export */}
              <button className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 text-sm font-semibold rounded-xl hover:bg-rose-100 transition-colors border border-rose-100 shrink-0">
                <FileDown className="w-4 h-4" />
                Xuất PDF
              </button>
            </div>
          </div>

          {/* Table */}
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
                      {/* Transaction ID */}
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                          {rec.transactionId}
                        </span>
                      </td>

                      {/* Linked codes */}
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

                      {/* Farm — name only */}
                      <td className="px-4 py-4">
                        <p className="text-sm text-slate-700 font-medium">
                          {rec.farmName}
                        </p>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-4">
                        <span className="text-sm font-bold text-[#009689]">
                          {rec.amount.toLocaleString("vi-VN")}đ
                        </span>
                      </td>

                      {/* Paid at */}
                      <td className="px-4 py-4 text-sm text-slate-500 whitespace-nowrap">
                        {new Date(rec.paidAt).toLocaleDateString("vi-VN")}{" "}
                        <span className="text-slate-400 text-xs">
                          {new Date(rec.paidAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>

                      {/* Action */}
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

          {/* Pagination footer */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-500">
                {filtered.length <= PAGE_SIZE
                  ? `${filtered.length} giao dịch`
                  : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(
                      currentPage * PAGE_SIZE,
                      filtered.length,
                    )} / ${filtered.length} giao dịch`}
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                        onClick={() => setCurrentPage(p as number)}
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
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:border-[#009689] hover:text-[#009689] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
type TabId = "consultations" | "payments";

const TABS: { id: TabId; label: string; icon: typeof ClipboardList }[] = [
  { id: "consultations", label: "Nhật ký phản hồi", icon: ClipboardList },
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
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Lịch sử</h1>
        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
          <span className="opacity-60">📅</span>
          {today} | {timeStr}
        </p>
      </div>

      {/* Tab bar */}
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

      {/* Tab content */}
      {activeTab === "consultations" ? (
        <ConsultationHistoryTab />
      ) : (
        <PaymentHistoryTab />
      )}
    </div>
  );
}
