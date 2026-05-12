import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  FileText,
  Receipt,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  CloudRain,
  AlertTriangle,
  Cpu,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { api } from "../../api/client";
import type {
  ReportResponse,
  IotDeviceResponse,
  IotDataResponse,
  SeasonDetailResponse,
  PriceSettingResponse,
} from "../../api/client";
import { LoadingState } from "../components/ui/LoadingState";
import { EmptyState } from "../components/ui/EmptyState";
import { StatusBadge } from "../components/ui/StatusBadge";
import { formatDate, formatMonth, formatDateTime } from "../utils/format";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeviceWithData {
  device: IotDeviceResponse;
  sensorData: IotDataResponse | null;
  seasonName: string | null;
  bedName: string | null;
}

interface SeasonGroup {
  seasonName: string;
  devices: DeviceWithData[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate();

  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [bills, setBills] = useState<PriceSettingResponse[]>([]);
  const [seasonGroups, setSeasonGroups] = useState<SeasonGroup[]>([]);

  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingBills, setLoadingBills] = useState(true);
  const [loadingIot, setLoadingIot] = useState(true);

  // Load reports
  useEffect(() => {
    api
      .getReports()
      .then((data) => setReports(data ?? []))
      .catch(() => setReports([]))
      .finally(() => setLoadingReports(false));
  }, []);

  // Load bills
  useEffect(() => {
    api
      .getPriceSettings()
      .then((data) => setBills(data ?? []))
      .catch(() => setBills([]))
      .finally(() => setLoadingBills(false));
  }, []);

  // Load IoT
  useEffect(() => {
    async function loadIot() {
      try {
        const [devices, seasonDetails] = await Promise.all([
          api.getIotDevices(),
          api.getSeasonsDetails(),
        ]);

        if (!devices?.length) {
          setSeasonGroups([]);
          return;
        }

        const bedMap = new Map<
          string,
          Pick<SeasonDetailResponse, "seasonName" | "bedName">
        >();
        for (const sd of seasonDetails ?? []) {
          if (sd.bedId)
            bedMap.set(sd.bedId, {
              seasonName: sd.seasonName,
              bedName: sd.bedName,
            });
        }

        const enriched: DeviceWithData[] = await Promise.all(
          devices.map(async (device) => {
            let sensorData: IotDataResponse | null = null;
            try {
              sensorData = await api.getLatestSensorByDevice(device.deviceCode);
            } catch {
              // device may have no readings yet
            }
            const bedInfo = bedMap.get(device.bedId);
            return {
              device,
              sensorData,
              seasonName: bedInfo?.seasonName ?? null,
              bedName: bedInfo?.bedName ?? null,
            };
          }),
        );

        const grouped = new Map<string, SeasonGroup>();
        for (const entry of enriched) {
          const key = entry.seasonName ?? "Chưa có mùa vụ";
          if (!grouped.has(key)) {
            grouped.set(key, { seasonName: key, devices: [] });
          }
          grouped.get(key)!.devices.push(entry);
        }

        setSeasonGroups([...grouped.values()]);
      } catch {
        setSeasonGroups([]);
      } finally {
        setLoadingIot(false);
      }
    }
    loadIot();
  }, []);

  const sentToOwnerReports = reports.filter(
    (r) => r.status.toUpperCase() === "SENT_TO_OWNER",
  );
  const unpaidBills = bills.filter((b) => !b.isPaid);

  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 bg-surface-page min-h-screen">
      {/* Page Header */}
      <div>
        <p className="text-xs font-medium text-primary uppercase tracking-widest mb-1">
          {today}
        </p>
        <h1 className="text-xl sm:text-2xl font-bold text-primary-800 tracking-tight">
          Tổng quan trang trại
        </h1>
      </div>

      {/* 2 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Reports pending action */}
        <SummaryCard
          icon={FileText}
          label="Báo cáo chờ xử lý"
          count={loadingReports ? null : sentToOwnerReports.length}
          hint={
            sentToOwnerReports.length > 0
              ? "Cần xem xét và phản hồi"
              : "Không có báo cáo mới"
          }
          tone={sentToOwnerReports.length > 0 ? "danger" : "primary"}
          onClick={() => navigate("/advisory")}
        />

        {/* Unpaid bills */}
        <SummaryCard
          icon={Receipt}
          label="Hóa đơn chưa thanh toán"
          count={loadingBills ? null : unpaidBills.length}
          hint={
            unpaidBills.length > 0
              ? "Cần thanh toán cho chuyên gia"
              : "Tất cả hóa đơn đã thanh toán"
          }
          tone={unpaidBills.length > 0 ? "warning" : "primary"}
          onClick={() => navigate("/billing")}
        />
      </div>

      {/* Reports table (SENT_TO_OWNER) */}
      <SectionCard
        icon={<AlertTriangle className="w-4 h-4 text-status-warning-fg" />}
        iconBg="bg-status-warning-bg"
        title="Báo cáo chờ xử lý"
        subtitle="Các báo cáo từ nhân viên đang chờ tư vấn chuyên gia"
        onViewAll={() => navigate("/advisory")}
      >
        {loadingReports ? (
          <LoadingState />
        ) : sentToOwnerReports.length === 0 ? (
          <EmptyState message="Không có báo cáo chờ xử lý" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="bg-surface-alt">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider w-28">
                    Mã báo cáo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider">
                    Tiêu đề
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider hidden sm:table-cell">
                    Người tạo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider hidden md:table-cell">
                    Ngày gửi
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sentToOwnerReports.slice(0, 5).map((r, i) => (
                  <tr
                    key={r.reportId}
                    className={`cursor-pointer hover:bg-primary-50 transition-colors ${i % 2 === 0 ? "bg-surface" : "bg-surface-alt"}`}
                    onClick={() => navigate("/advisory")}
                  >
                    <td className="px-6 py-3.5 font-mono text-xs text-ink-400 max-w-[7rem] truncate">
                      {r.reportNo}
                    </td>
                    <td className="px-4 py-3.5 text-primary-800 font-semibold max-w-[220px] truncate">
                      {r.title}
                    </td>
                    <td className="px-4 py-3.5 text-ink-500 hidden sm:table-cell">
                      {r.workerName}
                    </td>
                    <td className="px-4 py-3.5 text-ink-500 hidden md:table-cell">
                      {formatDate(r.submitDate)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge
                        label="Chờ xử lý"
                        tone="warning"
                        icon={AlertTriangle}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Unpaid bills table */}
      <SectionCard
        icon={<Receipt className="w-4 h-4 text-status-warning-fg" />}
        iconBg="bg-status-warning-bg"
        title="Hóa đơn chưa thanh toán"
        subtitle="Phí tư vấn chuyên gia chưa được thanh toán"
        onViewAll={() => navigate("/billing")}
      >
        {loadingBills ? (
          <LoadingState />
        ) : unpaidBills.length === 0 ? (
          <EmptyState message="Tất cả hóa đơn đã được thanh toán" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-sm">
              <thead>
                <tr className="bg-surface-alt">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider">
                    Trang trại
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider">
                    Chuyên gia
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider hidden sm:table-cell">
                    Tháng
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {unpaidBills.slice(0, 5).map((b, i) => (
                  <tr
                    key={b.priceSettingId}
                    className={`cursor-pointer hover:bg-primary-50 transition-colors ${i % 2 === 0 ? "bg-surface" : "bg-surface-alt"}`}
                    onClick={() => navigate("/billing")}
                  >
                    <td className="px-6 py-3.5 text-primary-800 font-semibold">
                      {b.farmName}
                    </td>
                    <td className="px-4 py-3.5 text-ink-500">{b.expertName}</td>
                    <td className="px-4 py-3.5 text-ink-500 hidden sm:table-cell">
                      {formatMonth(b.month)}
                    </td>
                    <td className="px-4 py-3.5">
                      {/* Bills dashboard: use "warning" to match summary card tone */}
                      <StatusBadge label="Chưa thanh toán" tone="warning" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* IoT Environment Section */}
      <SectionCard
        icon={<Cpu className="w-4 h-4 text-primary" />}
        iconBg="bg-primary-50"
        title="Dữ liệu môi trường IoT"
        subtitle="Thông số mới nhất từ các thiết bị cảm biến"
        onViewAll={() => navigate("/iot")}
        viewAllLabel="Quản lý thiết bị"
      >
        {loadingIot ? (
          <LoadingState />
        ) : seasonGroups.length === 0 ? (
          <EmptyState message="Không có thiết bị IoT nào được cài đặt" />
        ) : (
          <div className="divide-y divide-border">
            {seasonGroups.map((season) => (
              <div key={season.seasonName} className="px-6 py-5">
                {/* Season label divider */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-border" />
                  <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest px-2 shrink-0">
                    {season.seasonName}
                  </p>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {season.devices.map((entry) => (
                    <DeviceCard key={entry.device.deviceId} entry={entry} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────

/**
 * Extracted from the two inline <button> blocks. Removes ~70 lines of
 * repeated markup; all conditional colour logic lives here.
 */
type SummaryTone = "primary" | "danger" | "warning";

const SUMMARY_STRIPE: Record<SummaryTone, string> = {
  primary: "bg-primary",
  danger: "bg-status-danger-fg",
  warning: "bg-status-warning-fg",
};
const SUMMARY_ICON_BG: Record<SummaryTone, string> = {
  primary: "bg-primary-50",
  danger: "bg-status-danger-bg",
  warning: "bg-status-warning-bg",
};
const SUMMARY_ICON_FG: Record<SummaryTone, string> = {
  primary: "text-primary",
  danger: "text-status-danger-fg",
  warning: "text-status-warning-fg",
};
const SUMMARY_COUNT_FG: Record<SummaryTone, string> = {
  primary: "text-primary-800",
  danger: "text-status-danger-fg",
  warning: "text-status-warning-fg",
};

function SummaryCard({
  icon: Icon,
  label,
  count,
  hint,
  tone,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  /** null = loading */
  count: number | null;
  hint: string;
  tone: SummaryTone;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden bg-surface rounded-2xl border border-border shadow-card p-6 text-left w-full hover:shadow-md hover:border-primary/30 transition-all duration-200"
    >
      {/* Left accent stripe */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${SUMMARY_STRIPE[tone]}`}
      />

      <div className="flex items-center gap-4">
        {/* Icon box */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${SUMMARY_ICON_BG[tone]}`}
        >
          <Icon className={`w-5 h-5 ${SUMMARY_ICON_FG[tone]}`} />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-0.5">
            {label}
          </div>
          <div
            className={`text-3xl font-extrabold tracking-tight leading-none ${SUMMARY_COUNT_FG[tone]}`}
          >
            {count === null ? (
              <span className="text-ink-400 text-xl font-medium">…</span>
            ) : (
              count
            )}
          </div>
          <div className="mt-1 text-xs text-ink-400">{hint}</div>
        </div>

        {/* Navigate affordance */}
        <ChevronRight className="w-4 h-4 text-ink-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
    </button>
  );
}

// ─── SectionCard ──────────────────────────────────────────────────────────────

function SectionCard({
  icon,
  iconBg,
  title,
  subtitle,
  onViewAll,
  viewAllLabel = "Xem tất cả",
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  onViewAll: () => void;
  viewAllLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface rounded-2xl border border-border shadow-card overflow-hidden">
      {/* Header — border-b border-border (was border-surface-subtle, too faint) */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-primary-800 truncate">
              {title}
            </h2>
            <p className="text-xs text-ink-400 mt-0.5 truncate">{subtitle}</p>
          </div>
        </div>
        <button
          onClick={onViewAll}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition-colors shrink-0 ml-4"
        >
          {viewAllLabel} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

// ─── DeviceCard ───────────────────────────────────────────────────────────────

function DeviceCard({ entry }: { entry: DeviceWithData }) {
  const { device, sensorData, bedName } = entry;
  const isActive = device.status === "Active";

  return (
    <div
      className={`rounded-xl border p-4 text-sm transition-opacity ${
        isActive
          ? "border-primary-200 bg-primary-50"
          : "border-border bg-surface-alt opacity-60"
      }`}
    >
      {/* Device header */}
      <div className="flex items-center justify-between mb-1 gap-2">
        <span className="font-bold text-primary-800 text-xs truncate min-w-0">
          {device.name}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 whitespace-nowrap ${
            isActive
              ? "bg-status-success-bg text-status-success-fg"
              : "bg-status-neutral-bg text-status-neutral-fg"
          }`}
        >
          {isActive ? "● Hoạt động" : "○ Tắt"}
        </span>
      </div>

      {bedName && (
        <p className="text-xs text-ink-400 mb-3 truncate">{bedName}</p>
      )}

      {sensorData ? (
        <div className="grid grid-cols-2 gap-y-2 gap-x-3">
          <SensorItem
            icon={<Thermometer className="w-3.5 h-3.5 text-red-500" />}
            label="Nhiệt độ"
            value={
              sensorData.temperature != null
                ? `${sensorData.temperature}°C`
                : "—"
            }
          />
          <SensorItem
            icon={<Droplets className="w-3.5 h-3.5 text-blue-500" />}
            label="Độ ẩm KK"
            value={
              sensorData.humidity != null ? `${sensorData.humidity}%` : "—"
            }
          />
          <SensorItem
            icon={<Wind className="w-3.5 h-3.5 text-cyan-600" />}
            label="Ẩm đất"
            value={
              sensorData.soilMoisture != null
                ? `${sensorData.soilMoisture}%`
                : "—"
            }
          />
          <SensorItem
            icon={<Sun className="w-3.5 h-3.5 text-amber-500" />}
            label="Ánh sáng"
            value={sensorData.light != null ? `${sensorData.light} lux` : "—"}
          />
          <SensorItem
            icon={<CloudRain className="w-3.5 h-3.5 text-blue-600" />}
            label="Mưa"
            value={
              sensorData.isRaining != null
                ? sensorData.isRaining
                  ? "Có"
                  : "Không"
                : "—"
            }
          />
          {/* isAlert is not in the confirmed IotSensorPayload shape —
              guard with optional chaining and only render when present */}
          {"isAlert" in sensorData && (
            <SensorItem
              icon={
                <AlertTriangle className="w-3.5 h-3.5 text-status-danger-fg" />
              }
              label="Sự cố"
              value={
                (sensorData as { isAlert?: boolean | null }).isAlert != null
                  ? (sensorData as { isAlert?: boolean }).isAlert
                    ? "Có"
                    : "Không"
                  : "—"
              }
            />
          )}

          <div className="col-span-2 flex items-center gap-1 text-xs text-ink-400 pt-1 border-t border-border mt-1">
            <RefreshCw className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {formatDateTime(sensorData.recordedAt)}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-ink-400 italic">Chưa có dữ liệu cảm biến</p>
      )}
    </div>
  );
}

// ─── SensorItem ───────────────────────────────────────────────────────────────

function SensorItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="shrink-0">{icon}</span>
      <span className="text-xs text-ink-400 shrink-0">{label}:</span>
      <span className="text-xs font-bold text-primary-800 truncate">
        {value}
      </span>
    </div>
  );
}
