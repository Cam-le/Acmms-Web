import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { FileDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import {
  mockConsultationHistory,
  type Severity,
} from "../../../data/mockSpecialistData";

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

  const filtered = mockConsultationHistory.filter((row) => {
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Lịch sử Tư vấn Chuyên gia
        </h1>
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
                      <button
                        onClick={() => {
                          // Navigate to the original request detail
                          const reqId = res.requestCode
                            .toLowerCase()
                            .replace("#req-", "req-");
                          navigate(`/specialist/consultations/${reqId}`);
                        }}
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
