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
} from "lucide-react";
import {
  mockConsultationHistory,
  type ConsultationHistoryRow,
  type Severity,
} from "../../../data/mockSpecialistData";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ── Edit Modal ────────────────────────────────────────────────────────────────
// Calls PUT /api/Recommendations/{recommendationId}
// Falls back to updating local state when API is unreachable
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
    } catch {
      // API unreachable — local update only (mock mode)
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
        {/* Header */}
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

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Title — maps to Recommendation.title */}
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

          {/* Content — maps to Recommendation.content */}
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

          {/* Priority — maps to Recommendation.pestSeverity */}
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

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !content.trim()}
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

const PAGE_SIZE = 8;

// ── Pagination helper (matches AdvisoryPage pattern) ─────────────────────────
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

// ── Helpers ──────────────────────────────────────────────────────────────────
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

// ── Component ────────────────────────────────────────────────────────────────
export function SpecialistHistoryPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingRow, setEditingRow] = useState<ConsultationHistoryRow | null>(
    null,
  );

  // Local overrides: keyed by row.id — applied on top of mock data
  const [localEdits, setLocalEdits] = useState<
    Record<string, Partial<ConsultationHistoryRow>>
  >({});

  const handleSaved = (
    id: string,
    updated: Partial<ConsultationHistoryRow>,
  ) => {
    setLocalEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...updated } }));
    setEditingRow(null);
  };

  // Merge local edits into the history list
  const history = mockConsultationHistory.map((row) =>
    localEdits[row.id] ? { ...row, ...localEdits[row.id] } : row,
  );

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

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      {/* Edit modal */}
      {editingRow && (
        <EditResponseModal
          row={editingRow}
          onClose={() => setEditingRow(null)}
          onSaved={(updated) => handleSaved(editingRow.id, updated)}
        />
      )}
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Lịch sử tư vấn</h1>
        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
          <span className="opacity-60">📅</span>
          {today} | {timeStr}
        </p>
      </div>

      {/* Table Card */}
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
            {/* Search */}
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
          <table className="w-full min-w-[700px]">
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
                    colSpan={7}
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
                            const reqId = res.requestCode
                              .toLowerCase()
                              .replace("#req-", "req-");
                            navigate(`/specialist/consultations/${reqId}`);
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
    </div>
  );
}
