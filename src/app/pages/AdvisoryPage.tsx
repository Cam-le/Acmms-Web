import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import {
  Search,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Cpu,
  Eye,
  ArrowLeft,
  FileText,
  User,
  CalendarDays,
  Send,
  Loader2,
  RefreshCw,
  Leaf,
  Stethoscope,
  FlaskConical,
  Droplets,
  Sprout,
  Wind,
  ClipboardList,
  BadgeCheck,
} from "lucide-react";
import { api } from "../../api/client";

// ===================== TYPES =====================

export interface ReportResponse {
  reportId: string;
  reportNo: string;
  createdBy: string;
  creatorName: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  reportType: string;
  plotId: string;
  bedId: string;
  seasonId: string;
  aiResultsJson?: string;
  status: string;
  createdAt: string;
  submitDate: string;
  updatedAt?: string;
}

export interface AiResult {
  diseaseName?: string;
  description?: string;
  confidence?: number;
  isHealthy?: boolean;
  symptoms?: string[];
  treatment?: string[];
}

export interface DiagnosisResponse {
  id: string;
  reportId: string;
  diagnosedBy: string;
  diagnoserName: string;
  diseaseName: string;
  conclusion: string;
  recommendedAction: string;
  severityLevel: string; // "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  status: string;
  createdAt: string;
}

// ===================== MAPPINGS =====================

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  SENT_TO_OWNER: {
    label: "Chờ xử lý",
    color: "bg-[#fef3c7] text-[#92400e]",
    icon: Clock,
  },
  ASSIGNED_FOR_DIAGNOSIS: {
    label: "Đã gửi chuyên gia",
    color: "bg-[#dbeafe] text-[#1e40af]",
    icon: Send,
  },
  DIAGNOSED: {
    label: "Đã chẩn đoán",
    color: "bg-[#dcfce7] text-[#166534]",
    icon: CheckCircle,
  },
  CLOSED: {
    label: "Đã đóng",
    color: "bg-[#f1f5f9] text-[#475569]",
    icon: XCircle,
  },
};

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status] ?? {
      label: status,
      color: "bg-[#f1f5f9] text-[#475569]",
      icon: Clock,
    }
  );
}

const REPORT_TYPE_MAP: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  DISEASE: {
    label: "Báo cáo bệnh",
    icon: Stethoscope,
    color: "bg-[#fee2e2] text-[#991b1b]",
  },
  PEST: {
    label: "Sâu bệnh",
    icon: AlertTriangle,
    color: "bg-[#fff7ed] text-[#92400e]",
  },
  ENVIRONMENT: {
    label: "Vấn đề môi trường",
    icon: Wind,
    color: "bg-[#eff6ff] text-[#1e40af]",
  },
  IRRIGATION: {
    label: "Tưới tiêu",
    icon: Droplets,
    color: "bg-[#f0f9ff] text-[#0369a1]",
  },
  NUTRITION: {
    label: "Thiếu dinh dưỡng",
    icon: Sprout,
    color: "bg-[#f0fdf4] text-[#166534]",
  },
  MANUAL: {
    label: "Báo cáo thủ công",
    icon: ClipboardList,
    color: "bg-[#f8fafc] text-[#475569]",
  },
  IOT_ALERT: {
    label: "Báo cáo tự động từ IoT",
    icon: Cpu,
    color: "bg-[#faf5ff] text-[#6b21a8]",
  },
  // legacy values that may come from backend
  Diseases: {
    label: "Báo cáo bệnh",
    icon: Stethoscope,
    color: "bg-[#fee2e2] text-[#991b1b]",
  },
};

function getReportType(type: string) {
  return (
    REPORT_TYPE_MAP[type] ?? {
      label: type,
      icon: FileText,
      color: "bg-[#f8fafc] text-[#475569]",
    }
  );
}

const SEVERITY_CONFIG: Record<
  string,
  { label: string; color: string; barColor: string }
> = {
  LOW: {
    label: "Nhẹ",
    color: "bg-[#dcfce7] text-[#166534]",
    barColor: "bg-[#16a34a]",
  },
  MEDIUM: {
    label: "Trung bình",
    color: "bg-[#fef9c3] text-[#854d0e]",
    barColor: "bg-[#ca8a04]",
  },
  HIGH: {
    label: "Nặng",
    color: "bg-[#ffedd5] text-[#9a3412]",
    barColor: "bg-[#ea580c]",
  },
  CRITICAL: {
    label: "Rất nghiêm trọng",
    color: "bg-[#fee2e2] text-[#991b1b]",
    barColor: "bg-[#dc2626]",
  },
};

function getSeverityConfig(level: string) {
  return (
    SEVERITY_CONFIG[level] ?? {
      label: level,
      color: "bg-[#f1f5f9] text-[#475569]",
      barColor: "bg-[#94a3b8]",
    }
  );
}

// ===================== HELPERS =====================

function parseAiResult(json?: string): AiResult | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as AiResult;
  } catch {
    return null;
  }
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

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

// ===================== STATUS BADGE =====================

function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusConfig(status);
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ===================== REPORT TYPE BADGE =====================

function ReportTypeBadge({ type }: { type: string }) {
  const cfg = getReportType(type);
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ===================== LIST VIEW =====================

const PAGE_SIZE = 5;

function ListView() {
  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  async function fetchReports() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReports();
      setReports(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không thể tải danh sách báo cáo.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, []);
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const filtered = reports.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      r.reportNo.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.creatorName.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[#115e59] text-2xl font-semibold mb-1">
            Danh Sách Yêu Cầu Tư Vấn
          </h1>
          <p className="text-[#45556c] text-sm">
            Hiển thị tất cả yêu cầu tư vấn
          </p>
        </div>
        <button
          onClick={fetchReports}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 border border-[#cad5e2] text-[#62748e] rounded-lg hover:bg-[#f8fafc] transition-colors text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#90A1B9]" />
          <input
            type="text"
            placeholder="Tìm theo mã, tiêu đề, tên nhân viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-sm text-[#334155]"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="SENT_TO_OWNER">Chờ xử lý</option>
          <option value="ASSIGNED_FOR_DIAGNOSIS">Đã gửi chuyên gia</option>
          <option value="DIAGNOSED">Đã chẩn đoán</option>
          <option value="CLOSED">Đã đóng</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#62748e]">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Đang tải...
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="w-10 h-10 text-[#f59e0b] mb-3" />
          <p className="text-sm text-[#62748e] mb-4">{error}</p>
          <button
            onClick={fetchReports}
            className="px-4 py-2 bg-[#009689] text-white rounded-lg text-sm hover:bg-[#007f75] transition-colors"
          >
            Thử lại
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#62748e] uppercase tracking-wide w-[130px]">
                    Mã báo cáo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#62748e] uppercase tracking-wide w-[140px]">
                    Nhân viên
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#62748e] uppercase tracking-wide">
                    Tiêu đề
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#62748e] uppercase tracking-wide w-[160px]">
                    Loại báo cáo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#62748e] uppercase tracking-wide w-[140px]">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#62748e] uppercase tracking-wide w-[140px]">
                    Ngày gửi
                  </th>
                  <th className="px-4 py-3 w-[60px]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {paginated.map((r) => (
                  <tr
                    key={r.reportId}
                    className="hover:bg-[#f8fafc] transition-colors align-middle"
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-[#115e59] text-xs whitespace-nowrap">
                      {r.reportNo}
                    </td>
                    <td className="px-4 py-3 text-[#334155] text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-[#009689] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {r.creatorName.split(" ").pop()?.[0] ?? "?"}
                        </div>
                        <span className="truncate max-w-[100px]">
                          {r.creatorName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#334155] text-xs max-w-[200px]">
                      <span className="line-clamp-2">{r.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <ReportTypeBadge type={r.reportType} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-[#62748e] text-xs whitespace-nowrap">
                      {formatDate(r.submitDate)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/advisory?view=detail&id=${r.reportId}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#009689] text-[#009689] hover:bg-[#f0fdfa] transition-colors text-xs font-medium whitespace-nowrap"
                      >
                        <Eye className="w-3 h-3" /> Xem
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {paginated.length === 0 && !loading && (
              <div className="text-center py-12 text-[#62748e]">
                <ClipboardList className="w-10 h-10 text-[#cad5e2] mx-auto mb-3" />
                <p className="text-sm">
                  {reports.length === 0
                    ? "Chưa có báo cáo nào."
                    : "Không có báo cáo phù hợp với bộ lọc."}
                </p>
              </div>
            )}

            {filtered.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#e2e8f0] bg-[#f8fafc]">
                <p className="text-xs text-[#62748e]">
                  {filtered.length <= PAGE_SIZE
                    ? `${filtered.length} báo cáo`
                    : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} / ${filtered.length} báo cáo`}
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="w-7 h-7 flex items-center justify-center rounded border border-[#e2e8f0] text-[#62748e] hover:border-[#009689] hover:text-[#009689] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {getPageNumbers(page, totalPages).map((p, i) =>
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
                          onClick={() => setPage(p as number)}
                          className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium border transition-colors ${
                            page === p
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
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                      className="w-7 h-7 flex items-center justify-center rounded border border-[#e2e8f0] text-[#62748e] hover:border-[#009689] hover:text-[#009689] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ===================== DETAIL VIEW =====================

function DetailView({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Specialist selection
  const [specialists, setSpecialists] = useState<
    import("../../api/client").UserResponse[]
  >([]);
  const [selectedSpecialistId, setSelectedSpecialistId] = useState("");
  const [specialistsLoading, setSpecialistsLoading] = useState(false);

  // Diagnoses — fetched when status is DIAGNOSED
  const [diagnoses, setDiagnoses] = useState<DiagnosisResponse[]>([]);
  const [diagnosesLoading, setDiagnosesLoading] = useState(false);

  useEffect(() => {
    async function fetchReport() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getReport(reportId);
        setReport(data);
        if (data.status !== "SENT_TO_OWNER") {
          setAssignSuccess(true);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không thể tải báo cáo.");
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [reportId]);

  // Fetch specialists only when the report is assignable
  useEffect(() => {
    if (!report || report.status !== "SENT_TO_OWNER") return;
    async function fetchSpecialists() {
      setSpecialistsLoading(true);
      try {
        const all = await api.getStaffs();
        const filtered = all.filter(
          (u) => u.roleName === "Specialist" && u.status === "Active",
        );
        setSpecialists(filtered);
        if (filtered.length > 0) setSelectedSpecialistId(filtered[0].userId);
      } catch {
        // non-critical — user can still see the report; show empty dropdown
      } finally {
        setSpecialistsLoading(false);
      }
    }
    fetchSpecialists();
  }, [report?.status]);

  // Fetch diagnoses when status is DIAGNOSED
  useEffect(() => {
    if (!report || report.status !== "DIAGNOSED") return;
    async function fetchDiagnoses() {
      setDiagnosesLoading(true);
      try {
        const data = await api.getReportDiagnosis(report!.reportId);
        setDiagnoses(data);
      } catch {
        // non-critical — page still renders without diagnosis details
      } finally {
        setDiagnosesLoading(false);
      }
    }
    fetchDiagnoses();
  }, [report?.status]);

  async function handleAssign() {
    if (!report || !selectedSpecialistId) return;
    setAssigning(true);
    setAssignError(null);
    try {
      await api.assignReport(report.reportId, {
        assignedTo: selectedSpecialistId,
        note: "",
      });
      setAssignSuccess(true);
      setReport((r) => (r ? { ...r, status: "ASSIGNED" } : r));
    } catch (e) {
      setAssignError(
        e instanceof Error ? e.message : "Không thể gửi đến chuyên gia.",
      );
    } finally {
      setAssigning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 p-6">
        <Loader2 className="w-6 h-6 animate-spin text-[#009689] mr-2" />
        <span className="text-[#62748e]">Đang tải báo cáo...</span>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-col items-center justify-center py-20 p-6">
        <AlertTriangle className="w-10 h-10 text-[#f59e0b] mb-3" />
        <p className="text-sm text-[#62748e] mb-4">
          {error ?? "Không tìm thấy báo cáo."}
        </p>
        <Link
          to="/advisory"
          className="px-4 py-2 bg-[#009689] text-white rounded-lg text-sm hover:bg-[#007f75] transition-colors"
        >
          Quay lại
        </Link>
      </div>
    );
  }

  const ai = parseAiResult(report.aiResultsJson);
  const statusCfg = getStatusConfig(report.status);
  const StatusIcon = statusCfg.icon;
  const typeCfg = getReportType(report.reportType);
  const TypeIcon = typeCfg.icon;
  const canAssign = report.status === "SENT_TO_OWNER";

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#62748e]">
        <Link to="/advisory" className="hover:text-[#009689]">
          Báo cáo
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[#115e59] font-mono">{report.reportNo}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-[#115e59] text-2xl font-semibold mb-2 leading-tight">
            {report.title}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-[#90a1b9]">
              {report.reportNo}
            </span>
            <StatusBadge status={report.status} />
            <ReportTypeBadge type={report.reportType} />
          </div>
        </div>
        <Link
          to="/advisory"
          className="flex items-center gap-2 text-[#62748e] hover:text-[#115e59] text-sm shrink-0"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left col — metadata */}
        <div className="lg:col-span-2 space-y-4">
          {/* Report info */}
          <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[#62748e] flex items-center gap-2">
              <FileText className="w-4 h-4" /> Thông tin báo cáo
            </h3>
            <div className="space-y-3 text-sm">
              <InfoRow
                icon={User}
                label="Nhân viên báo cáo"
                value={report.creatorName}
              />
              <InfoRow
                icon={CalendarDays}
                label="Ngày gửi"
                value={formatDate(report.submitDate)}
              />
              <InfoRow
                icon={TypeIcon}
                label="Loại báo cáo"
                value={typeCfg.label}
              />
              {report.updatedAt && (
                <InfoRow
                  icon={RefreshCw}
                  label="Cập nhật lần cuối"
                  value={formatDate(report.updatedAt)}
                />
              )}
            </div>
          </div>

          {/* Description */}
          {report.description && (
            <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
              <h3 className="text-sm font-semibold text-[#62748e] flex items-center gap-2 mb-2">
                <ClipboardList className="w-4 h-4" /> Mô tả từ nhân viên
              </h3>
              <p className="text-sm text-[#334155] leading-relaxed">
                {report.description}
              </p>
            </div>
          )}

          {/* Assign to specialist */}
          <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
            <h3 className="text-sm font-semibold text-[#62748e] flex items-center gap-2 mb-3">
              <Send className="w-4 h-4" /> Gửi đến chuyên gia
            </h3>

            {assignSuccess || !canAssign ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-[#dcfce7] border border-[#86efac] rounded-lg text-sm text-[#166534]">
                <BadgeCheck className="w-4 h-4 shrink-0" />
                <span className="font-medium">
                  {report.status === "DIAGNOSED"
                    ? "Báo cáo đã được chẩn đoán."
                    : "Đã giao cho chuyên gia xử lý."}
                </span>
              </div>
            ) : (
              <>
                <p className="text-xs text-[#62748e] mb-3">
                  Chọn chuyên gia và gửi báo cáo để nhận chẩn đoán và khuyến
                  nghị xử lý.
                </p>

                {/* Specialist dropdown */}
                <div className="mb-3">
                  <label className="block text-xs text-[#62748e] mb-1.5 font-medium">
                    Chuyên gia phụ trách
                  </label>
                  {specialistsLoading ? (
                    <div className="flex items-center gap-2 px-3 py-2 border border-[#cad5e2] rounded-lg text-xs text-[#90a1b9]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Đang tải danh sách chuyên gia...
                    </div>
                  ) : specialists.length === 0 ? (
                    <div className="px-3 py-2 border border-[#cad5e2] rounded-lg text-xs text-[#90a1b9]">
                      Không tìm thấy chuyên gia nào.
                    </div>
                  ) : (
                    <select
                      value={selectedSpecialistId}
                      onChange={(e) => setSelectedSpecialistId(e.target.value)}
                      className="w-full px-3 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-sm text-[#334155]"
                    >
                      {specialists.map((s) => (
                        <option key={s.userId} value={s.userId}>
                          {s.fullname}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {assignError && (
                  <p className="text-xs text-[#dc2626] mb-2">{assignError}</p>
                )}
                <button
                  onClick={handleAssign}
                  disabled={
                    assigning || !selectedSpecialistId || specialistsLoading
                  }
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {assigning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {assigning ? "Đang gửi..." : "Gửi đến chuyên gia"}
                </button>
              </>
            )}
          </div>

          {/* Diagnosis results — fetched from API when status is DIAGNOSED */}
          {report.status === "DIAGNOSED" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#62748e] flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-[#16a34a]" />
                Kết quả chẩn đoán từ chuyên gia
              </h3>

              {diagnosesLoading ? (
                <div className="flex items-center gap-2 py-4 text-[#62748e] text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tải kết quả chẩn đoán...
                </div>
              ) : diagnoses.length === 0 ? (
                <div className="bg-[#f0fdf4] rounded-lg border border-[#86efac] p-4 text-sm text-[#166534]">
                  Chuyên gia đã hoàn thành chẩn đoán nhưng chưa có dữ liệu chi
                  tiết.
                </div>
              ) : (
                diagnoses.map((dx, idx) => {
                  const sev = getSeverityConfig(dx.severityLevel);
                  return (
                    <div
                      key={dx.id}
                      className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm overflow-hidden"
                    >
                      {/* Card header */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-[#f8fafc] border-b border-[#e2e8f0]">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#009689] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {dx.diagnoserName.split(" ").pop()?.[0] ?? "?"}
                          </div>
                          <span className="text-sm font-semibold text-[#115e59]">
                            {dx.diagnoserName}
                          </span>
                          {diagnoses.length > 1 && (
                            <span className="text-xs text-[#90a1b9]">
                              · Chẩn đoán {idx + 1}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${sev.color}`}
                          >
                            {sev.label}
                          </span>
                          <span className="text-xs text-[#90a1b9] whitespace-nowrap">
                            {formatDate(dx.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Card body */}
                      <div className="p-4 space-y-3">
                        {/* Disease name */}
                        <div>
                          <div className="text-xs text-[#62748e] mb-0.5">
                            Tên bệnh
                          </div>
                          <div className="text-sm font-semibold text-[#115e59]">
                            {dx.diseaseName}
                          </div>
                        </div>

                        {/* Conclusion */}
                        <div>
                          <div className="text-xs text-[#62748e] mb-0.5">
                            Kết luận
                          </div>
                          <p className="text-sm text-[#334155] leading-relaxed">
                            {dx.conclusion}
                          </p>
                        </div>

                        {/* Recommended action */}
                        <div className="bg-[#f0fdfa] border border-[#009689]/20 rounded-lg p-3">
                          <div className="text-xs text-[#62748e] mb-1 flex items-center gap-1">
                            <FlaskConical className="w-3 h-3" /> Khuyến nghị xử
                            lý
                          </div>
                          <p className="text-sm text-[#115e59] leading-relaxed">
                            {dx.recommendedAction}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
        <div className="lg:col-span-3 space-y-4">
          {ai ? (
            <>
              {/* AI Summary banner */}
              <div
                className={`rounded-lg border-l-4 p-4 ${ai.isHealthy ? "bg-[#f0fdf4] border-[#16a34a]" : "bg-[#fff7ed] border-[#f59e0b]"}`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className={`w-5 h-5 mt-0.5 shrink-0 ${ai.isHealthy ? "text-[#16a34a]" : "text-[#f59e0b]"}`}
                  />
                  <div className="flex-1">
                    <div
                      className="font-bold text-sm mb-1"
                      style={{ color: ai.isHealthy ? "#166534" : "#92400e" }}
                    >
                      {ai.isHealthy ? "Cây khỏe mạnh" : "Phát hiện vấn đề (AI)"}
                    </div>
                    {ai.diseaseName && (
                      <div
                        className="font-semibold text-base mb-2"
                        style={{ color: ai.isHealthy ? "#166534" : "#92400e" }}
                      >
                        {ai.diseaseName}
                      </div>
                    )}
                    {ai.confidence !== undefined && (
                      <div className="mb-2">
                        <div
                          className="flex items-center justify-between text-xs mb-1"
                          style={{
                            color: ai.isHealthy ? "#166534" : "#92400e",
                          }}
                        >
                          <span className="flex items-center gap-1">
                            <Cpu className="w-3 h-3" /> Độ chắc chắn chẩn đoán
                          </span>
                          <span className="font-bold">
                            {Math.round(ai.confidence * 100)}%
                          </span>
                        </div>
                        <div
                          className={`h-2 rounded-full overflow-hidden ${ai.isHealthy ? "bg-[#bbf7d0]" : "bg-[#fde68a]"}`}
                        >
                          <div
                            className={`h-full rounded-full ${ai.isHealthy ? "bg-[#16a34a]" : "bg-[#f59e0b]"}`}
                            style={{ width: `${ai.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {ai.description && (
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: ai.isHealthy ? "#166534" : "#92400e" }}
                      >
                        {ai.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Symptoms */}
              {ai.symptoms && ai.symptoms.length > 0 && (
                <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-[#62748e] flex items-center gap-2 mb-3">
                    <Stethoscope className="w-4 h-4" /> Triệu chứng phát hiện
                  </h3>
                  <ul className="space-y-2">
                    {ai.symptoms.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-[#334155]"
                      >
                        <span className="w-5 h-5 rounded-full bg-[#fff7ed] border border-[#f59e0b]/40 flex items-center justify-center text-[#f59e0b] text-[10px] font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Treatment */}
              {ai.treatment && ai.treatment.length > 0 && (
                <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-[#62748e] flex items-center gap-2 mb-3">
                    <FlaskConical className="w-4 h-4" /> Khuyến nghị xử lý (AI)
                  </h3>
                  <ul className="space-y-2">
                    {ai.treatment.map((t, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-[#334155]"
                      >
                        <CheckCircle className="w-4 h-4 text-[#009689] shrink-0 mt-0.5" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            /* No AI data */
            <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-8 text-center">
              <Cpu className="w-10 h-10 text-[#cad5e2] mx-auto mb-3" />
              <p className="text-sm font-medium text-[#334155] mb-1">
                Chưa có dữ liệu phân tích AI
              </p>
              <p className="text-xs text-[#62748e]">
                Báo cáo này chưa được phân tích bởi AI hoặc không có hình ảnh
                đính kèm.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===================== INFO ROW =====================

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

// ===================== MAIN PAGE =====================

export function AdvisoryPage() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get("view") || "list";
  const reportId = searchParams.get("id");

  if (view === "detail" && reportId) {
    return <DetailView reportId={reportId} />;
  }

  return <ListView />;
}
