import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  SlidersHorizontal,
  Bug,
  Leaf,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  mockConsultationRequests,
  type Severity,
  type DetectionStatus,
} from "../../../data/mockSpecialistData";

const PAGE_SIZE = 5;

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
function severityBadge(s: Severity) {
  const base =
    "text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1";
  if (s === "Cao" || s === "Nghiêm trọng")
    return `${base} bg-red-50 text-red-600`;
  if (s === "Trung bình") return `${base} bg-orange-50 text-orange-600`;
  return `${base} bg-green-50 text-green-700`;
}

function statusBadge(s: DetectionStatus) {
  if (s === "Chờ phản hồi")
    return "bg-rose-50 text-rose-600 border border-rose-200";
  if (s === "Đã phản hồi")
    return "bg-green-50 text-green-700 border border-green-200";
  return "bg-blue-50 text-blue-600 border border-blue-200";
}

function cardIcon(s: Severity) {
  if (s === "Cao" || s === "Nghiêm trọng")
    return { bg: "bg-red-100", color: "text-red-500" };
  if (s === "Trung bình")
    return { bg: "bg-amber-100", color: "text-amber-600" };
  return { bg: "bg-green-100", color: "text-green-600" };
}

// ── Component ────────────────────────────────────────────────────────────────
export function SpecialistConsultationPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [sortByHighest, setSortByHighest] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const severityOrder: Record<string, number> = {
    "Nghiêm trọng": 4,
    Cao: 3,
    "Trung bình": 2,
    Thấp: 1,
  };

  // Only show pending items on this page — responded items live in Lịch sử
  const pendingOnly = mockConsultationRequests.filter(
    (r) => r.detectionStatus !== "Đã phản hồi",
  );

  const filtered = pendingOnly
    .filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r.requestCode.toLowerCase().includes(q) ||
        r.crop.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.issue.toLowerCase().includes(q) ||
        r.farmName.toLowerCase().includes(q);
      const matchSeverity =
        filterSeverity === "all" || r.severity === filterSeverity;
      return matchSearch && matchSeverity;
    })
    .sort((a, b) =>
      sortByHighest
        ? (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0)
        : 0,
    );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterSeverity, sortByHighest]);

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
          Danh sách báo cáo cần tư vấn
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Tiếp nhận và phản hồi các báo cáo bệnh cây trồng từ trang trại.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên cây / khu vực / mã yêu cầu"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009689]/30 bg-white"
          />
        </div>

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]/30 text-slate-600"
        >
          <option value="all">Mức độ nghiêm trọng</option>
          <option value="Nghiêm trọng">Nghiêm trọng</option>
          <option value="Cao">Cao</option>
          <option value="Trung bình">Trung bình</option>
          <option value="Thấp">Thấp</option>
        </select>

        <button
          onClick={() => setSortByHighest((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm border rounded-xl transition-colors ${
            sortByHighest
              ? "bg-[#009689] text-white border-[#009689]"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Ưu tiên cao nhất
        </button>
      </div>

      {/* Cards List */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center text-slate-400 text-sm border border-slate-100">
            Không tìm thấy yêu cầu phù hợp.
          </div>
        )}

        {paginated.map((req) => {
          const icon = cardIcon(req.severity);
          const isPending = req.detectionStatus === "Chờ phản hồi";

          return (
            <div
              key={req.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow"
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl ${icon.bg} flex items-center justify-center shrink-0`}
                  >
                    <Bug className={`w-5 h-5 ${icon.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-[15px]">
                      {req.aiDiagnosis} trên {req.crop} ({req.requestCode})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Gửi lúc:{" "}
                      {new Date(req.submittedAt).toLocaleDateString(
                        "vi-VN",
                      )} –{" "}
                      {new Date(req.submittedAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusBadge(req.detectionStatus)}`}
                >
                  {req.detectionStatus}
                </span>
              </div>

              {/* Details row */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">
                    Cây trồng
                  </p>
                  <p className="text-slate-700 font-medium flex items-center gap-1">
                    <Leaf className="w-3.5 h-3.5 text-green-500" />
                    {req.crop}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">
                    Nông trại
                  </p>
                  <p className="text-slate-700 font-medium flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#009689]" />
                    {req.farmName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">
                    AI chẩn đoán
                  </p>
                  <p className="text-slate-700 font-medium">
                    {req.aiDiagnosis}{" "}
                    <span className="text-[#009689] font-semibold">
                      ({req.aiConfidence}%)
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">
                    Mức độ nghiêm trọng
                  </p>
                  <span className={severityBadge(req.severity)}>
                    {req.severity === "Cao" && "⚠ "}
                    {req.severity}
                  </span>
                </div>
              </div>

              {/* Action */}
              <div className="mt-4 flex justify-end">
                {isPending ? (
                  <button
                    onClick={() =>
                      navigate(`/specialist/consultations/${req.id}`)
                    }
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#009689] text-white text-sm font-semibold rounded-xl hover:bg-[#007f73] transition-colors"
                  >
                    <Bug className="w-4 h-4" />
                    Xem &amp; phản hồi
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      navigate(`/specialist/consultations/${req.id}`)
                    }
                    className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Xem lại tư vấn
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            {filtered.length <= PAGE_SIZE
              ? `${filtered.length} yêu cầu`
              : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(
                  currentPage * PAGE_SIZE,
                  filtered.length,
                )} / ${filtered.length} yêu cầu`}
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
  );
}
