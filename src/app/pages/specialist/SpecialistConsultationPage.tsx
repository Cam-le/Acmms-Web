import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  SlidersHorizontal,
  Bug,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { api, type ReportResponse } from "../../../api/client";
import { mockConsultationRequests } from "../../../data/mockSpecialistData";

const PAGE_SIZE = 5;

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

function parseSeverityFromReport(r: ReportResponse): string {
  if (r.aiResultsJson) {
    try {
      const ai = JSON.parse(r.aiResultsJson);
      if (ai.confidence !== undefined) {
        const c: number = ai.confidence;
        if (c >= 0.9) return "CRITICAL";
        if (c >= 0.75) return "HIGH";
        if (c >= 0.5) return "MEDIUM";
        return "LOW";
      }
    } catch {
      // ignore
    }
  }
  return "UNKNOWN";
}

function severityLabel(s: string) {
  if (s === "CRITICAL") return "Nghiêm trọng";
  if (s === "HIGH") return "Cao";
  if (s === "MEDIUM") return "Trung bình";
  if (s === "LOW") return "Thấp";
  return "Không xác định";
}

function severityBadge(s: string) {
  const base =
    "text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1";
  if (s === "CRITICAL") return `${base} bg-red-50 text-red-600`;
  if (s === "HIGH") return `${base} bg-orange-50 text-orange-600`;
  if (s === "MEDIUM") return `${base} bg-yellow-50 text-yellow-700`;
  return `${base} bg-green-50 text-green-700`;
}

function cardIconStyle(s: string) {
  if (s === "CRITICAL") return { bg: "bg-red-100", color: "text-red-500" };
  if (s === "HIGH") return { bg: "bg-orange-100", color: "text-orange-500" };
  if (s === "MEDIUM") return { bg: "bg-amber-100", color: "text-amber-600" };
  return { bg: "bg-green-100", color: "text-green-600" };
}

function reportTypeLabel(t: string) {
  if (t === "DISEASE" || t === "Diseases") return "Bệnh cây";
  if (t === "ENVIRONMENT") return "Môi trường";
  return t;
}

function mockToReport(m: (typeof mockConsultationRequests)[0]): ReportResponse {
  return {
    reportId: m.id,
    reportNo: m.requestCode,
    createdBy: "",
    creatorName: m.farmName,
    ownerId: "",
    ownerName: m.farmName,
    title: `${m.aiDiagnosis} trên ${m.crop}`,
    description: m.symptomDescription,
    reportType: "DISEASE",
    plotId: "",
    bedId: "",
    seasonId: "",
    status: "ASSIGNED_FOR_DIAGNOSIS",
    createdAt: m.submittedAt,
    submitDate: m.submittedAt,
    aiResultsJson: JSON.stringify({
      diseaseName: m.aiDiagnosis,
      confidence: m.aiConfidence / 100,
      symptoms: m.aiSymptoms,
      treatment: [m.aiRecommendation],
      isHealthy: false,
    }),
  };
}

export function SpecialistConsultationPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMockData, setIsMockData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [sortByHighest, setSortByHighest] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const severityOrder: Record<string, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  async function loadReports() {
    setLoading(true);
    setError(null);
    try {
      const all = await api.getReports();
      setReports(all.filter((r) => r.status === "ASSIGNED_FOR_DIAGNOSIS"));
      setIsMockData(false);
    } catch {
      setReports(
        mockConsultationRequests
          .filter((m) => m.detectionStatus !== "Đã phản hồi")
          .map(mockToReport),
      );
      setIsMockData(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterSeverity, sortByHighest]);

  const filtered = reports
    .filter((r) => {
      const q = search.toLowerCase();
      const sev = parseSeverityFromReport(r);
      const matchSearch =
        !q ||
        r.reportNo.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.creatorName.toLowerCase().includes(q) ||
        r.ownerName.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q);
      const matchSeverity = filterSeverity === "all" || sev === filterSeverity;
      return matchSearch && matchSeverity;
    })
    .sort((a, b) =>
      sortByHighest
        ? (severityOrder[parseSeverityFromReport(b)] ?? 0) -
          (severityOrder[parseSeverityFromReport(a)] ?? 0)
        : 0,
    );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Danh sách báo cáo cần tư vấn
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tiếp nhận và chẩn đoán các báo cáo bệnh cây từ nông trại.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isMockData && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
              Dữ liệu mẫu
            </span>
          )}
          <button
            onClick={loadReports}
            disabled={loading}
            title="Tải lại"
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã báo cáo, tiêu đề, người tạo..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009689]/30 bg-white"
          />
        </div>

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]/30 text-slate-600"
        >
          <option value="all">Mức độ nghiêm trọng</option>
          <option value="CRITICAL">Nghiêm trọng</option>
          <option value="HIGH">Cao</option>
          <option value="MEDIUM">Trung bình</option>
          <option value="LOW">Thấp</option>
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">Đang tải báo cáo...</span>
        </div>
      )}

      {/* Cards */}
      {!loading && (
        <div className="space-y-4">
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center text-slate-400 text-sm border border-slate-100">
              Không có báo cáo nào đang chờ chẩn đoán.
            </div>
          )}

          {paginated.map((report) => {
            const sev = parseSeverityFromReport(report);
            const icon = cardIconStyle(sev);
            let aiDiseaseName = "";
            let aiConfidence = 0;
            if (report.aiResultsJson) {
              try {
                const ai = JSON.parse(report.aiResultsJson);
                aiDiseaseName = ai.diseaseName ?? "";
                aiConfidence = Math.round((ai.confidence ?? 0) * 100);
              } catch {
                /* ignore */
              }
            }

            return (
              <div
                key={report.reportId}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl ${icon.bg} flex items-center justify-center shrink-0`}
                    >
                      <Bug className={`w-5 h-5 ${icon.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-[15px]">
                        {report.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(report.submitDate).toLocaleString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                    Chờ chẩn đoán
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">
                      Mã báo cáo
                    </p>
                    <p className="text-slate-700 font-medium font-mono text-xs">
                      {report.reportNo}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">
                      Người tạo
                    </p>
                    <p className="text-slate-700 font-medium">
                      {report.creatorName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">
                      Loại báo cáo
                    </p>
                    <p className="text-slate-700 font-medium">
                      {reportTypeLabel(report.reportType)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">
                      Mức độ (AI)
                    </p>
                    <span className={severityBadge(sev)}>
                      {severityLabel(sev)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <p className="text-sm text-slate-500 flex-1 min-w-0 truncate italic">
                    {report.description}
                  </p>
                  {aiDiseaseName && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-[#009689]/10 text-[#009689] font-semibold shrink-0">
                      AI: {aiDiseaseName} ({aiConfidence}%)
                    </span>
                  )}
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() =>
                      navigate(`/specialist/consultations/${report.reportId}`)
                    }
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#009689] text-white text-sm font-semibold rounded-xl hover:bg-[#007f73] transition-colors"
                  >
                    <Bug className="w-4 h-4" />
                    Xem &amp; chẩn đoán
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, filtered.length)} /{" "}
            {filtered.length} báo cáo
          </p>
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
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:border-[#009689] hover:text-[#009689] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
