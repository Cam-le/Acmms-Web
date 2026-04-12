import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Mail,
  Bug,
  AlertTriangle,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { api, type ReportResponse } from "../../../api/client";
import {
  mockConsultationRequests,
  mockSpecialistStats,
} from "../../../data/mockSpecialistData";

// ── Helpers ───────────────────────────────────────────────────────────────────
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
      /* ignore */
    }
  }
  return "UNKNOWN";
}

function severityColor(s: string) {
  if (s === "CRITICAL") return "text-red-600 font-semibold";
  if (s === "HIGH") return "text-orange-500 font-semibold";
  if (s === "MEDIUM") return "text-yellow-600 font-semibold";
  return "text-green-600 font-semibold";
}

function severityLabel(s: string) {
  if (s === "CRITICAL") return "Nghiêm trọng";
  if (s === "HIGH") return "Cao";
  if (s === "MEDIUM") return "Trung bình";
  if (s === "LOW") return "Thấp";
  return "Không xác định";
}

function statusDot(s: string) {
  if (s === "ASSIGNED_FOR_DIAGNOSIS") return "bg-yellow-400";
  if (s === "DIAGNOSED") return "bg-green-500";
  return "bg-blue-400";
}

function statusLabel(s: string) {
  if (s === "ASSIGNED_FOR_DIAGNOSIS") return "Chờ chẩn đoán";
  if (s === "DIAGNOSED") return "Đã chẩn đoán";
  if (s === "SENT_TO_OWNER") return "Đã gửi";
  return s;
}

function reportTypeLabel(t: string) {
  if (t === "DISEASE" || t === "Diseases") return "Bệnh cây";
  if (t === "ENVIRONMENT") return "Môi trường";
  return t;
}

export function SpecialistDashboardPage() {
  const navigate = useNavigate();

  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMockData, setIsMockData] = useState(false);

  async function loadReports() {
    setLoading(true);
    try {
      const all = await api.getReports();
      setReports(all.filter((r) => r.status === "ASSIGNED_FOR_DIAGNOSIS"));
      setIsMockData(false);
    } catch {
      // Fall back to mock — convert to ReportResponse shape
      setReports(
        mockConsultationRequests
          .filter((m) => m.detectionStatus !== "Đã phản hồi")
          .map((m) => ({
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
              isHealthy: false,
            }),
          })),
      );
      setIsMockData(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  const pendingReports = reports.slice(0, 5);

  // Stats derived from real data when available, mock stats as fallback
  const pendingCount = isMockData
    ? mockSpecialistStats.pendingCount
    : reports.length;
  const urgentCount = isMockData
    ? mockSpecialistStats.urgentCount
    : reports.filter((r) => parseSeverityFromReport(r) === "CRITICAL").length;

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Dashboard Chuyên gia
          </h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="inline-block opacity-60">📅</span>
            {today} | {timeStr}
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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">
                Báo cáo chờ chẩn đoán
              </p>
              <p className="text-4xl font-bold text-slate-800 mt-2">
                {loading ? "—" : pendingCount}
              </p>

              {isMockData && (
                <p className="text-xs text-[#009689] font-medium mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />+
                  {mockSpecialistStats.pendingNew} mới
                </p>
              )}
            </div>
            <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">
                Tổng số ca phát hiện sâu bệnh
              </p>
              <p className="text-4xl font-bold text-slate-800 mt-2">
                {loading
                  ? "—"
                  : isMockData
                    ? mockSpecialistStats.totalDiseaseCases
                    : reports.length}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <Bug className="w-5 h-5 text-red-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">
                Trường hợp nghiêm trọng
              </p>
              <p className="text-4xl font-bold text-slate-800 mt-2">
                {loading ? "—" : urgentCount}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">
            Báo cáo chờ chẩn đoán
          </h2>
          <button
            onClick={() => navigate("/specialist/consultations")}
            className="text-sm text-[#009689] font-medium hover:underline flex items-center gap-1"
          >
            Xem tất cả <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {[
                  "Mã báo cáo",
                  "Tiêu đề",
                  "Loại báo cáo",
                  "Mức độ (AI)",
                  "Ngày gửi",
                  "Trạng thái",
                  "Hành động",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide first:px-6 last:px-6 last:text-right"
                  >
                    {h}
                  </th>
                ))}
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
              {!loading && pendingReports.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-12 text-sm text-slate-400"
                  >
                    Không có báo cáo nào đang chờ xử lý.
                  </td>
                </tr>
              )}
              {!loading &&
                pendingReports.map((report) => {
                  const sev = parseSeverityFromReport(report);
                  let aiDiseaseName = "";
                  if (report.aiResultsJson) {
                    try {
                      aiDiseaseName =
                        JSON.parse(report.aiResultsJson).diseaseName ?? "";
                    } catch {
                      /* ignore */
                    }
                  }

                  return (
                    <tr
                      key={report.reportId}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-mono font-medium text-slate-700">
                        {report.reportNo}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 max-w-[200px] truncate">
                        {report.title}
                      </td>
                      <td className="px-4 py-4">
                        {aiDiseaseName ? (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
                            {aiDiseaseName}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {reportTypeLabel(report.reportType)}
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-4 text-sm ${severityColor(sev)}`}>
                        {severityLabel(sev)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500">
                        {new Date(report.submitDate).toLocaleDateString(
                          "vi-VN",
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="flex items-center gap-1.5 text-sm text-slate-500">
                          <span
                            className={`w-2 h-2 rounded-full ${statusDot(report.status)}`}
                          />
                          {statusLabel(report.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() =>
                            navigate(
                              `/specialist/consultations/${report.reportId}`,
                            )
                          }
                          className="px-4 py-2 bg-[#009689] text-white text-xs font-semibold rounded-lg hover:bg-[#007f73] transition-colors"
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
