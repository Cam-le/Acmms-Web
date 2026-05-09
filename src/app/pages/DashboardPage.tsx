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
        <h1 className="text-2xl font-bold text-primary-800 tracking-tight">
          Tổng quan trang trại
        </h1>
      </div>

      {/* 2 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Reports pending action */}
        <button
          onClick={() => navigate("/advisory")}
          className="group relative overflow-hidden bg-surface rounded-2xl border border-border shadow-card p-6 text-center hover:shadow-md hover:border-primary/30 transition-all duration-200"
        >
          <div
            className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${sentToOwnerReports.length > 0 ? "bg-status-danger-fg" : "bg-primary"}`}
          />

          <div className="flex justify-center mb-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${sentToOwnerReports.length > 0 ? "bg-status-danger-bg" : "bg-primary-50"}`}
            >
              <FileText
                className={`w-5 h-5 ${sentToOwnerReports.length > 0 ? "text-status-danger-fg" : "text-primary"}`}
              />
            </div>
          </div>

          <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
            Báo cáo chờ xử lý
          </div>

          <div
            className={`text-4xl font-extrabold tracking-tight ${sentToOwnerReports.length > 0 ? "text-status-danger-fg" : "text-primary-800"}`}
          >
            {loadingReports ? (
              <span className="text-ink-400 text-2xl font-medium">…</span>
            ) : (
              sentToOwnerReports.length
            )}
          </div>

          <div className="mt-2 text-xs text-ink-400">
            {sentToOwnerReports.length > 0
              ? "Cần xem xét và phản hồi"
              : "Không có báo cáo mới"}
          </div>
        </button>

        {/* Unpaid bills */}
        <button
          onClick={() => navigate("/billing")}
          className="group relative overflow-hidden bg-surface rounded-2xl border border-border shadow-card p-6 text-center hover:shadow-md hover:border-primary/30 transition-all duration-200"
        >
          <div
            className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${unpaidBills.length > 0 ? "bg-status-warning-fg" : "bg-primary"}`}
          />

          <div className="flex justify-center mb-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${unpaidBills.length > 0 ? "bg-status-warning-bg" : "bg-primary-50"}`}
            >
              <Receipt
                className={`w-5 h-5 ${unpaidBills.length > 0 ? "text-status-warning-fg" : "text-primary"}`}
              />
            </div>
          </div>

          <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
            Hóa đơn chưa thanh toán
          </div>

          <div
            className={`text-4xl font-extrabold tracking-tight ${unpaidBills.length > 0 ? "text-status-warning-fg" : "text-primary-800"}`}
          >
            {loadingBills ? (
              <span className="text-ink-400 text-2xl font-medium">…</span>
            ) : (
              unpaidBills.length
            )}
          </div>

          <div className="mt-2 text-xs text-ink-400">
            {unpaidBills.length > 0
              ? "Cần thanh toán cho chuyên gia"
              : "Tất cả hóa đơn đã thanh toán"}
          </div>
        </button>
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
                  <th className="text-left px-6 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider">
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
                    <td className="px-6 py-3.5 font-mono text-xs text-ink-400">
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
                      <StatusBadge label="Chưa thanh toán" tone="danger" />
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
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-border" />
                  <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest px-2">
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-subtle">
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
          : "border-border bg-surface-alt opacity-50"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-primary-800 text-xs truncate">
          {device.name}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ml-2 ${
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
            icon={<Thermometer className="w-3.5 h-3.5 text-[#ef4444]" />}
            label="Nhiệt độ"
            value={
              sensorData.temperature != null
                ? `${sensorData.temperature}°C`
                : "-"
            }
          />
          <SensorItem
            icon={<Droplets className="w-3.5 h-3.5 text-[#3b82f6]" />}
            label="Độ ẩm KK"
            value={
              sensorData.humidity != null ? `${sensorData.humidity}%` : "-"
            }
          />
          <SensorItem
            icon={<Wind className="w-3.5 h-3.5 text-[#0891b2]" />}
            label="Ẩm đất"
            value={
              sensorData.soilMoisture != null
                ? `${sensorData.soilMoisture}%`
                : "-"
            }
          />
          <SensorItem
            icon={<Sun className="w-3.5 h-3.5 text-[#f59e0b]" />}
            label="Ánh sáng"
            value={sensorData.light != null ? `${sensorData.light} lux` : "-"}
          />
          <SensorItem
            icon={<CloudRain className="w-3.5 h-3.5 text-[#2563eb]" />}
            label="Mưa"
            value={
              sensorData.isRaining != null
                ? sensorData.isRaining
                  ? "Có"
                  : "Không"
                : "-"
            }
          />
          <SensorItem
            icon={
              <AlertTriangle className="w-3.5 h-3.5 text-status-danger-fg" />
            }
            label="Sự cố"
            value={
              sensorData.isAlert != null
                ? sensorData.isAlert
                  ? "Có"
                  : "Không"
                : "-"
            }
          />

          <div className="col-span-2 flex items-center gap-1 text-xs text-ink-400 pt-1 border-t border-border mt-1">
            <RefreshCw className="w-3 h-3" />
            {formatDateTime(sensorData.recordedAt)}
          </div>
        </div>
      ) : (
        <p className="text-xs text-ink-400 italic">Chưa có dữ liệu cảm biến</p>
      )}
    </div>
  );
}

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
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-xs text-ink-400">{label}:</span>
      <span className="text-xs font-bold text-primary-800">{value}</span>
    </div>
  );
}
