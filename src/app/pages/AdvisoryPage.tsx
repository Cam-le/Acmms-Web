import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import {
  CheckCircle,
  AlertTriangle,
  Cpu,
  Eye,
  ArrowLeft,
  FileText,
  User,
  CalendarDays,
  Send,
  RefreshCw,
  Leaf,
  Stethoscope,
  FlaskConical,
  Droplets,
  Sprout,
  Wind,
  ClipboardList,
  BadgeCheck,
  PlusCircle,
  Thermometer,
  Droplet,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "../../api/queryKeys";
import { api } from "../../api/client";
import type { ReportAttachment } from "../../api/client";
import { useToast } from "../components/ui/useToast";
import { ToastContainer } from "../components/ui/ToastContainer";
import { SearchInput } from "../components/ui/SearchInput";
import { Pagination } from "../components/ui/Pagination";
import { LoadingState } from "../components/ui/LoadingState";
import { EmptyState } from "../components/ui/EmptyState";
import { StatusBadge } from "../components/ui/StatusBadge";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { usePagination } from "../hooks/usePagination";
import { reportStatusTone, reportStatusLabel } from "../utils/status";
import { formatDateTime } from "../utils/format";

// ===================== TYPES =====================

export interface ReportResponse {
  reportId: string;
  reportNo: string;
  workerId: string;
  workerName: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  reportType: string;
  plotId: string;
  bedId: string;
  seasonId?: string;
  aiResultsJson?: string;
  status: string;
  createdAt: string;
  submitDate: string;
  updatedAt?: string;
  attachments: ReportAttachment[];
  environmentSnapshots: {
    temperature: number;
    humidity: number;
    soilMoisture: number;
    rainfall: number;
    lightIntensity: number;
    recordedAt: string;
    sourceDeviceId: string;
  }[];
}

export interface AiResult {
  diseaseName?: string;
  description?: string;
  confidence?: number;
  isHealthy?: boolean;
  symptoms?: string[];
  treatment?: string[];
  severity?: string;
  warning?: string;
}

export interface DiagnosisResponse {
  id: string;
  reportId: string;
  diagnosedBy: string;
  diagnoserName: string;
  diseaseName: string;
  conclusion: string;
  recommendedAction: string;
  severityLevel: string;
  status: string;
  createdAt: string;
}

// ===================== MAPPINGS =====================

const REPORT_TYPE_MAP: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  DISEASE: {
    label: "Báo cáo bệnh",
    icon: Stethoscope,
    color: "bg-status-danger-bg text-status-danger-fg",
  },
  PEST: {
    label: "Sâu bệnh",
    icon: AlertTriangle,
    color: "bg-[#fff7ed] text-[#92400e]",
  },
  ENVIRONMENT: {
    label: "Vấn đề môi trường",
    icon: Wind,
    color: "bg-[#eff6ff] text-status-info-fg",
  },
  IRRIGATION: {
    label: "Tưới tiêu",
    icon: Droplets,
    color: "bg-[#f0f9ff] text-[#0369a1]",
  },
  NUTRITION: {
    label: "Thiếu dinh dưỡng",
    icon: Sprout,
    color: "bg-[#f0fdf4] text-status-success-fg",
  },
  MANUAL: {
    label: "Báo cáo thủ công",
    icon: ClipboardList,
    color: "bg-surface-alt text-ink-700",
  },
  IOT_ALERT: {
    label: "Báo cáo tự động từ IoT",
    icon: Cpu,
    color: "bg-[#faf5ff] text-[#6b21a8]",
  },
  Diseases: {
    label: "Báo cáo bệnh",
    icon: Stethoscope,
    color: "bg-status-danger-bg text-status-danger-fg",
  },
  OTHER: {
    label: "Báo cáo khác",
    icon: FileText,
    color: "bg-surface-alt text-ink-700",
  },
};

function getReportType(type: string) {
  return (
    REPORT_TYPE_MAP[type] ?? {
      label: type,
      icon: FileText,
      color: "bg-surface-alt text-ink-700",
    }
  );
}

const SEVERITY_CONFIG: Record<
  string,
  { label: string; color: string; barColor: string }
> = {
  LOW: {
    label: "Nhẹ",
    color: "bg-status-success-bg text-status-success-fg",
    barColor: "bg-status-success-fg",
  },
  MEDIUM: {
    label: "Trung bình",
    color: "bg-status-warning-bg text-status-warning-fg",
    barColor: "bg-status-warning-fg",
  },
  HIGH: {
    label: "Nặng",
    color: "bg-[#ffedd5] text-[#9a3412]",
    barColor: "bg-[#ea580c]",
  },
  CRITICAL: {
    label: "Rất nghiêm trọng",
    color: "bg-status-danger-bg text-status-danger-fg",
    barColor: "bg-status-danger-fg",
  },
};

function getSeverityConfig(level: string) {
  return (
    SEVERITY_CONFIG[level?.toUpperCase()] ?? {
      label: level,
      color: "bg-status-neutral-bg text-status-neutral-fg",
      barColor: "bg-ink-400",
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

function getReportImageUrl(attachments: ReportAttachment[]): string | null {
  const img = attachments.find((a) => a.attachmentType === "report_image");
  if (!img) return null;
  return img.secureUrl || img.fileUrl || null;
}

// ===================== INTERNAL BADGES =====================

function ReportTypeBadge({ type }: { type: string }) {
  const { label, color, icon: Icon } = getReportType(type);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${color}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {label}
    </span>
  );
}

// ===================== LIST VIEW =====================

const PAGE_SIZE = 5;

function ListView() {
  const { toasts, showToast, dismissToast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("SENT_TO_OWNER");

  // ── Read: reports list ────────────────────────────────────────────────────
  const reportsQuery = useQuery({
    queryKey: qk.reports.list(),
    queryFn: () => api.getReports(),
  });

  const reports: ReportResponse[] = reportsQuery.data ?? [];
  const loading =
    reportsQuery.isLoading ||
    (reportsQuery.isFetching && reportsQuery.data === undefined);
  const fetchError =
    reportsQuery.isError && reportsQuery.data === undefined
      ? reportsQuery.error
      : null;

  useEffect(() => {
    if (reportsQuery.error) {
      showToast(
        reportsQuery.error instanceof Error
          ? reportsQuery.error.message
          : "Không thể tải danh sách báo cáo.",
        "error",
      );
    }
  }, [reportsQuery.error, showToast]);

  const filtered = reports
    .filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        r.reportNo.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.workerName.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort(
      (a, b) =>
        new Date(b.submitDate).getTime() - new Date(a.submitDate).getTime(),
    );

  const { page, setPage, reset, totalPages, pagedItems } = usePagination(
    filtered,
    PAGE_SIZE,
  );

  useEffect(() => {
    reset();
  }, [search, statusFilter]);

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <PageHeader
        icon={ClipboardList}
        title="Danh Sách Yêu Cầu Tư Vấn"
        subtitle="Hiển thị tất cả yêu cầu tư vấn"
        actions={
          <Button
            variant="secondary"
            leadingIcon={RefreshCw}
            loading={reportsQuery.isFetching}
            onClick={() => {
              reportsQuery.refetch().then((result) => {
                if (result.status === "success")
                  showToast("Đã làm mới danh sách.", "success");
              });
            }}
          >
            Làm mới
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm theo mã, tiêu đề, tên nhân viên..."
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-border-strong rounded-btn focus:outline-none focus:ring-2 focus:ring-primary bg-surface text-sm text-ink-700"
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
        <LoadingState />
      ) : fetchError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="w-10 h-10 text-status-warning-fg mb-3" />
          <p className="text-sm text-ink-500 mb-4">
            {fetchError instanceof Error
              ? fetchError.message
              : "Đã xảy ra lỗi. Vui lòng thử lại."}
          </p>
          <Button onClick={() => reportsQuery.refetch()}>Thử lại</Button>
        </div>
      ) : (
        <div className="bg-surface rounded-card border border-border shadow-card overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-surface-alt border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide w-[130px]">
                  Mã báo cáo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide w-[140px]">
                  Nhân viên
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide">
                  Tiêu đề
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide w-[160px]">
                  Loại báo cáo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide w-[140px]">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide w-[140px]">
                  Ngày gửi
                </th>
                <th className="px-4 py-3 w-[60px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagedItems.map((r) => (
                <tr
                  key={r.reportId}
                  className="hover:bg-surface-alt transition-colors align-middle"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-ink-800 text-xs whitespace-nowrap">
                    {r.reportNo}
                  </td>
                  <td className="px-4 py-3 text-ink-700 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-fg text-[10px] font-bold shrink-0">
                        {r.workerName.split(" ").pop()?.[0] ?? "?"}
                      </div>
                      <span className="truncate max-w-[100px]">
                        {r.workerName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-700 text-xs max-w-[200px]">
                    <span className="line-clamp-2">{r.title}</span>
                  </td>
                  <td className="px-4 py-3">
                    <ReportTypeBadge type={r.reportType} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={reportStatusLabel(r.status)}
                      tone={reportStatusTone(r.status)}
                    />
                  </td>
                  <td className="px-4 py-3 text-ink-500 text-xs whitespace-nowrap">
                    {formatDateTime(r.submitDate)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/advisory?view=detail&id=${r.reportId}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-btn border border-primary text-primary hover:bg-primary-50 transition-colors text-xs font-medium whitespace-nowrap"
                    >
                      <Eye className="w-3 h-3" /> Xem
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagedItems.length === 0 && (
            <EmptyState
              icon={ClipboardList}
              message={
                reports.length === 0
                  ? "Chưa có báo cáo nào."
                  : "Không có báo cáo phù hợp với bộ lọc."
              }
              size="md"
            />
          )}

          {filtered.length > 0 && (
            <div className="border-t border-border bg-surface-alt px-4">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                showLabel
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                itemLabel="báo cáo"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===================== DETAIL VIEW =====================

function DetailView({ reportId }: { reportId: string }) {
  const navigate = useNavigate();
  const { toasts, showToast, dismissToast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSpecialistId, setSelectedSpecialistId] = useState("");
  const [assignSuccess, setAssignSuccess] = useState(false);

  // ── Read: report detail ────────────────────────────────────────────────────
  const reportQuery = useQuery({
    queryKey: qk.reports.detail(reportId),
    queryFn: () => api.getReport(reportId),
  });

  const report: ReportResponse | undefined = reportQuery.data;
  const loading =
    reportQuery.isLoading ||
    (reportQuery.isFetching && reportQuery.data === undefined);
  const fetchError =
    reportQuery.isError && reportQuery.data === undefined
      ? reportQuery.error
      : null;

  // Derive assignSuccess from loaded report status
  useEffect(() => {
    if (report && report.status !== "SENT_TO_OWNER") {
      setAssignSuccess(true);
    }
  }, [report?.status]);

  // ── Read: specialists (only when report is SENT_TO_OWNER) ─────────────────
  const specialistsQuery = useQuery({
    queryKey: qk.staffs.list(),
    queryFn: () => api.getStaffs(),
    enabled: !!report && report.status === "SENT_TO_OWNER" && !assignSuccess,
  });

  const specialists = (specialistsQuery.data ?? []).filter(
    (u) => u.roleName === "Specialist" && u.status === "Active",
  );

  // Default-select first specialist when list loads
  useEffect(() => {
    if (specialists.length > 0 && !selectedSpecialistId) {
      setSelectedSpecialistId(specialists[0].userId);
    }
  }, [specialists, selectedSpecialistId]);

  // ── Read: diagnoses (only when DIAGNOSED) ─────────────────────────────────
  const diagnosesQuery = useQuery({
    queryKey: qk.reports.diagnosis(reportId),
    queryFn: () => api.getReportDiagnosis(reportId),
    enabled: !!report && report.status === "DIAGNOSED",
  });

  const diagnoses: DiagnosisResponse[] = diagnosesQuery.data ?? [];

  // ── Mutation: assign specialist ───────────────────────────────────────────
  const assignMutation = useMutation({
    mutationFn: (specialistId: string) =>
      api.assignReport(reportId, { assignedTo: specialistId, note: "" }),
    onSuccess: () => {
      setAssignSuccess(true);
      showToast("Đã gửi báo cáo đến chuyên gia thành công.", "success");
      // Invalidate both list and this report's detail so status refreshes
      queryClient.invalidateQueries({ queryKey: qk.reports.all });
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : "Không thể gửi đến chuyên gia.",
        "error",
      );
    },
  });

  const reportImageUrl = report ? getReportImageUrl(report.attachments) : null;

  if (loading)
    return (
      <div className="p-6">
        <LoadingState message="Đang tải báo cáo..." />
      </div>
    );

  if (fetchError || !report) {
    return (
      <div className="flex flex-col items-center justify-center py-20 p-6">
        <AlertTriangle className="w-10 h-10 text-status-warning-fg mb-3" />
        <p className="text-sm text-ink-500 mb-4">
          {fetchError instanceof Error
            ? fetchError.message
            : "Không tìm thấy báo cáo."}
        </p>
        <Link
          to="/advisory"
          className="px-4 py-2 bg-primary text-primary-fg rounded-btn text-sm hover:bg-primary-hover transition-colors"
        >
          Quay lại
        </Link>
      </div>
    );
  }

  const ai = parseAiResult(report.aiResultsJson);

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 max-w-screen-xl">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Back + header */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          to="/advisory"
          className="p-1.5 text-ink-500 hover:text-primary hover:bg-primary-50 rounded transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <PageHeader
            icon={ClipboardList}
            title={report.title}
            subtitle={`${report.reportNo} · Gửi lúc ${formatDateTime(report.submitDate)}`}
          >
            <StatusBadge
              label={reportStatusLabel(report.status)}
              tone={reportStatusTone(report.status)}
            />
          </PageHeader>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Meta info */}
          <div className="bg-surface rounded-card border border-border shadow-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-ink-700 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Thông tin báo cáo
            </h2>
            <InfoRow
              icon={User}
              label="Nhân viên báo cáo"
              value={report.workerName}
            />
            <InfoRow
              icon={Leaf}
              label="Loại báo cáo"
              value={getReportType(report.reportType).label}
            />
            <InfoRow
              icon={CalendarDays}
              label="Ngày gửi"
              value={formatDateTime(report.submitDate)}
            />
            {report.updatedAt && (
              <InfoRow
                icon={RefreshCw}
                label="Cập nhật lần cuối"
                value={formatDateTime(report.updatedAt)}
              />
            )}
          </div>

          {/* Description */}
          <div className="bg-surface rounded-card border border-border shadow-card p-4">
            <h2 className="text-sm font-semibold text-ink-700 flex items-center gap-2 mb-2">
              <ClipboardList className="w-4 h-4" /> Mô tả sự cố
            </h2>
            <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-line">
              {report.description}
            </p>
          </div>

          {/* Environment snapshots */}
          {report.environmentSnapshots?.length > 0 && (
            <div className="bg-surface rounded-card border border-border shadow-card p-4">
              <h2 className="text-sm font-semibold text-ink-700 flex items-center gap-2 mb-3">
                <Thermometer className="w-4 h-4" /> Dữ liệu môi trường
              </h2>
              {report.environmentSnapshots.map((snap, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-ink-600">
                    <Thermometer className="w-3 h-3" /> Nhiệt độ:{" "}
                    <span className="font-medium text-ink-800 ml-1">
                      {snap.temperature}°C
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-ink-600">
                    <Droplet className="w-3 h-3" /> Độ ẩm:{" "}
                    <span className="font-medium text-ink-800 ml-1">
                      {snap.humidity}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-ink-600">
                    <Droplets className="w-3 h-3" /> Ẩm đất:{" "}
                    <span className="font-medium text-ink-800 ml-1">
                      {snap.soilMoisture}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-ink-600">
                    Lượng mưa:{" "}
                    <span className="font-medium text-ink-800 ml-1">
                      {snap.rainfall} mm
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Assign panel */}
          {report.status === "SENT_TO_OWNER" && !assignSuccess && (
            <div className="bg-surface rounded-card border border-border shadow-card p-4 space-y-3">
              <h2 className="text-sm font-semibold text-ink-700 flex items-center gap-2">
                <Send className="w-4 h-4" /> Gửi đến chuyên gia
              </h2>
              {specialistsQuery.isLoading ? (
                <LoadingState
                  message="Đang tải danh sách chuyên gia..."
                  variant="inline"
                />
              ) : specialists.length === 0 ? (
                <p className="text-xs text-ink-500">
                  Không có chuyên gia khả dụng.
                </p>
              ) : (
                <>
                  <select
                    value={selectedSpecialistId}
                    onChange={(e) => setSelectedSpecialistId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border-strong rounded-btn text-sm text-ink-700 bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {specialists.map((s) => (
                      <option key={s.userId} value={s.userId}>
                        {s.fullname}
                      </option>
                    ))}
                  </select>
                  <Button
                    fullWidth
                    leadingIcon={Send}
                    loading={assignMutation.isPending}
                    onClick={() => {
                      if (selectedSpecialistId)
                        assignMutation.mutate(selectedSpecialistId);
                    }}
                  >
                    Gửi đến chuyên gia
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Assigned success */}
          {assignSuccess && report.status !== "DIAGNOSED" && (
            <div className="bg-status-success-bg border border-[#86efac] rounded-card p-4 flex items-center gap-3">
              <BadgeCheck className="w-5 h-5 text-status-success-fg shrink-0" />
              <p className="text-sm text-status-success-fg font-medium">
                Đã gửi đến chuyên gia để chẩn đoán.
              </p>
            </div>
          )}

          {/* Diagnoses */}
          {report.status === "DIAGNOSED" && (
            <>
              <h2 className="text-sm font-semibold text-ink-700 flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-primary" /> Kết quả chẩn
                đoán chuyên gia
              </h2>
              <div className="space-y-3">
                {diagnosesQuery.isLoading ? (
                  <LoadingState message="Đang tải kết quả..." />
                ) : diagnoses.length === 0 ? (
                  <EmptyState message="Chưa có kết quả chẩn đoán." size="sm" />
                ) : (
                  diagnoses.map((dx, idx) => {
                    const sev = getSeverityConfig(dx.severityLevel);
                    return (
                      <div
                        key={dx.id}
                        className="bg-surface rounded-card border border-border shadow-card overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-4 py-3 bg-surface-alt border-b border-border flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center text-ink-800 text-xs font-bold">
                              {idx + 1}
                            </div>
                            <span className="text-xs font-semibold text-ink-700">
                              {dx.diagnoserName}
                            </span>
                            {diagnoses.length > 1 && (
                              <span className="text-xs text-ink-400">
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
                            <span className="text-xs text-ink-400 whitespace-nowrap">
                              {formatDateTime(dx.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          <div>
                            <div className="text-xs text-ink-500 mb-0.5">
                              Tên bệnh
                            </div>
                            <div className="text-sm font-semibold text-ink-800">
                              {dx.diseaseName}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-ink-500 mb-0.5">
                              Kết luận
                            </div>
                            <p className="text-sm text-ink-700 leading-relaxed">
                              {dx.conclusion}
                            </p>
                          </div>
                          <div className="bg-primary-50 border border-primary/20 rounded-btn p-3">
                            <div className="text-xs text-ink-500 mb-1 flex items-center gap-1">
                              <FlaskConical className="w-3 h-3" /> Khuyến nghị
                              xử lý
                            </div>
                            <p className="text-sm text-ink-800 leading-relaxed">
                              {dx.recommendedAction}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {!diagnosesQuery.isLoading && diagnoses.length > 0 && (
                <Button
                  fullWidth
                  leadingIcon={PlusCircle}
                  className="bg-primary-700 hover:bg-primary-800"
                  onClick={() => {
                    const description = diagnoses[0]?.recommendedAction ?? "";
                    showToast("Đang chuyển đến trang tạo công việc...", "info");
                    navigate(
                      `/tasks?openCreateTask=true&description=${encodeURIComponent(description)}`,
                    );
                  }}
                >
                  Tạo công việc từ báo cáo
                </Button>
              )}
            </>
          )}
        </div>

        {/* Right column — image + AI */}
        <div className="lg:col-span-3 space-y-4">
          {reportImageUrl && (
            <div className="bg-surface rounded-card border border-border shadow-card overflow-hidden">
              <div
                className="w-full"
                style={{ aspectRatio: "16/9", maxHeight: "288px" }}
              >
                <img
                  src={reportImageUrl}
                  alt="Hình ảnh báo cáo"
                  className="w-full h-full object-contain bg-surface-alt"
                />
              </div>
            </div>
          )}

          {ai ? (
            <>
              <div
                className={`rounded-card border-l-4 p-4 ${ai.isHealthy ? "bg-status-success-bg border-status-success-fg" : "bg-[#fff7ed] border-status-warning-fg"}`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className={`w-5 h-5 mt-0.5 shrink-0 ${ai.isHealthy ? "text-status-success-fg" : "text-status-warning-fg"}`}
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
                            className={`h-full rounded-full ${ai.isHealthy ? "bg-status-success-fg" : "bg-status-warning-fg"}`}
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

              {ai.symptoms && ai.symptoms.length > 0 && (
                <div className="bg-surface rounded-card border border-border shadow-card p-4">
                  <h3 className="text-sm font-semibold text-ink-500 flex items-center gap-2 mb-3">
                    <Stethoscope className="w-4 h-4" /> Triệu chứng phát hiện
                  </h3>
                  <ul className="space-y-2">
                    {ai.symptoms.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-ink-700"
                      >
                        <span className="w-5 h-5 rounded-full bg-[#fff7ed] border border-status-warning-fg/40 flex items-center justify-center text-status-warning-fg text-[10px] font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {ai.treatment && ai.treatment.length > 0 && (
                <div className="bg-surface rounded-card border border-border shadow-card p-4">
                  <h3 className="text-sm font-semibold text-ink-500 flex items-center gap-2 mb-3">
                    <FlaskConical className="w-4 h-4" /> Khuyến nghị xử lý (AI)
                  </h3>
                  <ul className="space-y-2">
                    {ai.treatment.map((t, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-ink-700"
                      >
                        <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="bg-surface rounded-card border border-border shadow-card p-8 text-center">
              <Cpu className="w-10 h-10 text-ink-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-ink-700 mb-1">
                Chưa có dữ liệu phân tích AI
              </p>
              <p className="text-xs text-ink-500">
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
      <div className="w-7 h-7 bg-surface-subtle rounded-btn flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-ink-500" />
      </div>
      <div>
        <div className="text-xs text-ink-500">{label}</div>
        <div className="font-medium text-ink-800 text-sm">{value}</div>
      </div>
    </div>
  );
}

// ===================== MAIN PAGE =====================

export function AdvisoryPage() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get("view") || "list";
  const reportId = searchParams.get("id");

  if (view === "detail" && reportId) return <DetailView reportId={reportId} />;
  return <ListView />;
}
