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
  SeasonResponse,
  FarmResponse,
  PriceSettingResponse,
} from "../../api/client";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DeviceWithData {
  device: IotDeviceResponse;
  sensorData: IotDataResponse | null;
  seasonName: string | null;
  farmName: string | null;
  farmId: string | null;
}

interface FarmGroup {
  farmId: string;
  farmName: string;
  seasons: SeasonGroup[];
}

interface SeasonGroup {
  seasonId: string | null;
  seasonName: string;
  devices: DeviceWithData[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMonth(iso: string) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${yyyy}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate();

  // ── State ──
  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [bills, setBills] = useState<PriceSettingResponse[]>([]);
  const [farmGroups, setFarmGroups] = useState<FarmGroup[]>([]);

  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingBills, setLoadingBills] = useState(true);
  const [loadingIot, setLoadingIot] = useState(true);

  const [reportsMock, setReportsMock] = useState(false);
  const [billsMock, setBillsMock] = useState(false);
  const [iotMock, setIotMock] = useState(false);

  // ── Load reports ──
  useEffect(() => {
    api
      .getReports()
      .then((data) => setReports(data ?? []))
      .catch(() => setReportsMock(true))
      .finally(() => setLoadingReports(false));
  }, []);

  // ── Load bills ──
  useEffect(() => {
    api
      .getPriceSettings()
      .then((data) => setBills(data ?? []))
      .catch(() => setBillsMock(true))
      .finally(() => setLoadingBills(false));
  }, []);

  // ── Load IoT → sensors → seasons → farms ──
  useEffect(() => {
    async function loadIot() {
      try {
        const devices = await api.getIotDevices();
        if (!devices?.length) {
          setFarmGroups([]);
          return;
        }

        // Fetch latest sensor data for each device in parallel
        const deviceDataPairs: DeviceWithData[] = await Promise.all(
          devices.map(async (device) => {
            let sensorData: IotDataResponse | null = null;
            try {
              sensorData = await api.getLatestSensorByDevice(device.deviceCode);
            } catch {
              // sensor may have no data yet
            }
            return {
              device,
              sensorData,
              seasonName: null,
              farmName: null,
              farmId: null,
            };
          }),
        );

        // Collect unique seasonIds
        const seasonIds = [
          ...new Set(
            deviceDataPairs
              .map((d) => d.sensorData?.seasonId)
              .filter(Boolean) as string[],
          ),
        ];

        // Fetch each season to get farmId + seasonName
        const seasonMap = new Map<string, SeasonResponse>();
        await Promise.all(
          seasonIds.map(async (id) => {
            try {
              const s = await api.getSeason(id);
              if (s) seasonMap.set(id, s);
            } catch {
              // ignore missing seasons
            }
          }),
        );

        // Collect unique farmIds
        const farmIds = [
          ...new Set(
            [...seasonMap.values()].map((s) => s.farmId).filter(Boolean),
          ),
        ];

        const farmMap = new Map<string, FarmResponse>();
        await Promise.all(
          farmIds.map(async (id) => {
            try {
              const f = await api.getFarm(id);
              if (f) farmMap.set(id, f);
            } catch {
              // ignore missing farms
            }
          }),
        );

        // Enrich each device entry
        const enriched: DeviceWithData[] = deviceDataPairs.map((entry) => {
          const season = entry.sensorData?.seasonId
            ? seasonMap.get(entry.sensorData.seasonId)
            : undefined;
          const farm = season ? farmMap.get(season.farmId) : undefined;
          return {
            ...entry,
            seasonName: season?.seasonName ?? null,
            farmName: farm?.farmName ?? null,
            farmId: farm?.farmId ?? null,
          };
        });

        // Group: farm → season → devices
        const grouped = new Map<string, FarmGroup>();
        for (const entry of enriched) {
          const farmKey = entry.farmId ?? "__unknown__";
          const farmLabel = entry.farmName ?? "Trang trại không xác định";
          const seasonKey = entry.sensorData?.seasonId ?? "__no_season__";
          const seasonLabel = entry.seasonName ?? "Chưa có mùa vụ";

          if (!grouped.has(farmKey)) {
            grouped.set(farmKey, {
              farmId: farmKey,
              farmName: farmLabel,
              seasons: [],
            });
          }
          const farmGroup = grouped.get(farmKey)!;

          let seasonGroup = farmGroup.seasons.find(
            (s) => s.seasonId === seasonKey,
          );
          if (!seasonGroup) {
            seasonGroup = {
              seasonId: seasonKey,
              seasonName: seasonLabel,
              devices: [],
            };
            farmGroup.seasons.push(seasonGroup);
          }
          seasonGroup.devices.push(entry);
        }

        setFarmGroups([...grouped.values()]);
      } catch {
        setIotMock(true);
      } finally {
        setLoadingIot(false);
      }
    }
    loadIot();
  }, []);

  // ── Derived counts ──
  const sentToOwnerReports = reports.filter(
    (r) => r.status.toUpperCase() === "SENT_TO_OWNER",
  );
  const unpaidBills = bills.filter((b) => !b.isPaid);

  // ─── Render ───────────────────────────────────────────────────────────────

  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-6 p-6 bg-[#f4f7f6] min-h-screen">
      {/* ── Page Header ── */}
      <div>
        <p className="text-xs font-medium text-[#009689] uppercase tracking-widest mb-1">
          {today}
        </p>
        <h1 className="text-2xl font-bold text-[#0d3330] tracking-tight">
          Tổng quan trang trại
        </h1>
      </div>

      {/* ── 2 Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reports pending action */}
        <button
          onClick={() => navigate("/advisory")}
          className="group relative overflow-hidden bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 text-center hover:shadow-md hover:border-[#009689]/30 transition-all duration-200"
        >
          {/* Accent bar */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${sentToOwnerReports.length > 0 ? "bg-[#dc2626]" : "bg-[#009689]"}`}
          />

          <div className="flex justify-center mb-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${sentToOwnerReports.length > 0 ? "bg-[#fee2e2]" : "bg-[#ecfdf5]"}`}
            >
              <FileText
                className={`w-5 h-5 ${sentToOwnerReports.length > 0 ? "text-[#dc2626]" : "text-[#009689]"}`}
              />
            </div>
          </div>

          <div className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1">
            Báo cáo chờ xử lý
          </div>

          <div
            className={`text-4xl font-extrabold tracking-tight ${sentToOwnerReports.length > 0 ? "text-[#dc2626]" : "text-[#0d3330]"}`}
          >
            {loadingReports ? (
              <span className="text-[#94a3b8] text-2xl font-medium">…</span>
            ) : (
              sentToOwnerReports.length
            )}
          </div>

          <div className="mt-2 text-xs text-[#94a3b8]">
            {sentToOwnerReports.length > 0
              ? "Cần xem xét và phản hồi"
              : "Không có báo cáo mới"}
          </div>
          {reportsMock && (
            <div className="mt-3 flex justify-center">
              <MockBadge />
            </div>
          )}
        </button>

        {/* Unpaid bills */}
        <button
          onClick={() => navigate("/billing")}
          className="group relative overflow-hidden bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 text-center hover:shadow-md hover:border-[#009689]/30 transition-all duration-200"
        >
          <div
            className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${unpaidBills.length > 0 ? "bg-[#d97706]" : "bg-[#009689]"}`}
          />

          <div className="flex justify-center mb-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${unpaidBills.length > 0 ? "bg-[#fef3c7]" : "bg-[#ecfdf5]"}`}
            >
              <Receipt
                className={`w-5 h-5 ${unpaidBills.length > 0 ? "text-[#d97706]" : "text-[#009689]"}`}
              />
            </div>
          </div>

          <div className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1">
            Hóa đơn chưa thanh toán
          </div>

          <div
            className={`text-4xl font-extrabold tracking-tight ${unpaidBills.length > 0 ? "text-[#d97706]" : "text-[#0d3330]"}`}
          >
            {loadingBills ? (
              <span className="text-[#94a3b8] text-2xl font-medium">…</span>
            ) : (
              unpaidBills.length
            )}
          </div>

          <div className="mt-2 text-xs text-[#94a3b8]">
            {unpaidBills.length > 0
              ? "Cần thanh toán cho chuyên gia"
              : "Tất cả hóa đơn đã thanh toán"}
          </div>
          {billsMock && (
            <div className="mt-3 flex justify-center">
              <MockBadge />
            </div>
          )}
        </button>
      </div>

      {/* ── Reports table (SENT_TO_OWNER) ── */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1f5f9]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#fef3c7] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-[#d97706]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0d3330]">
                Báo cáo chờ xử lý
              </h2>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                Các báo cáo từ nhân viên đang chờ tư vấn chuyên gia
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/advisory")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#009689] hover:text-[#007a6e] transition-colors"
          >
            Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingReports ? (
          <LoadingRows />
        ) : sentToOwnerReports.length === 0 ? (
          <EmptyState text="Không có báo cáo chờ xử lý" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                    Mã báo cáo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                    Tiêu đề
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                    Người tạo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                    Ngày gửi
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sentToOwnerReports.slice(0, 5).map((r, i) => (
                  <tr
                    key={r.reportId}
                    className={`cursor-pointer hover:bg-[#f0fdf9] transition-colors ${i % 2 === 0 ? "bg-white" : "bg-[#fafafa]"}`}
                    onClick={() => navigate("/advisory")}
                  >
                    <td className="px-6 py-3.5 font-mono text-xs text-[#94a3b8]">
                      {r.reportNo}
                    </td>
                    <td className="px-4 py-3.5 text-[#0d3330] font-semibold max-w-[220px] truncate">
                      {r.title}
                    </td>
                    <td className="px-4 py-3.5 text-[#64748b]">
                      {r.creatorName}
                    </td>
                    <td className="px-4 py-3.5 text-[#64748b]">
                      {formatDate(r.submitDate)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#fef9c3] text-[#854d0e]">
                        <AlertTriangle className="w-3 h-3" /> Chờ xử lý
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Unpaid bills table ── */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1f5f9]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#fef3c7] flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4 text-[#d97706]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0d3330]">
                Hóa đơn chưa thanh toán
              </h2>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                Phí tư vấn chuyên gia chưa được thanh toán
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/billing")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#009689] hover:text-[#007a6e] transition-colors"
          >
            Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingBills ? (
          <LoadingRows />
        ) : unpaidBills.length === 0 ? (
          <EmptyState text="Tất cả hóa đơn đã được thanh toán" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                    Trang trại
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                    Chuyên gia
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                    Tháng
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {unpaidBills.slice(0, 5).map((b, i) => (
                  <tr
                    key={b.priceSettingId}
                    className={`cursor-pointer hover:bg-[#f0fdf9] transition-colors ${i % 2 === 0 ? "bg-white" : "bg-[#fafafa]"}`}
                    onClick={() => navigate("/billing")}
                  >
                    <td className="px-6 py-3.5 text-[#0d3330] font-semibold">
                      {b.farmName}
                    </td>
                    <td className="px-4 py-3.5 text-[#64748b]">
                      {b.expertName}
                    </td>
                    <td className="px-4 py-3.5 text-[#64748b]">
                      {formatMonth(b.month)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-[#fee2e2] text-[#991b1b]">
                        Chưa thanh toán
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {billsMock && (
          <div className="px-6 pb-4">
            <MockBadge />
          </div>
        )}
      </div>

      {/* ── IoT Environment Section ── */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1f5f9]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#ecfdf5] flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4 text-[#009689]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0d3330]">
                Dữ liệu môi trường IoT
              </h2>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                Thông số mới nhất từ các thiết bị cảm biến
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/iot")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#009689] hover:text-[#007a6e] transition-colors"
          >
            Quản lý thiết bị <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingIot ? (
          <LoadingRows />
        ) : farmGroups.length === 0 ? (
          <EmptyState text="Không có thiết bị IoT nào được cài đặt" />
        ) : (
          <div className="divide-y divide-[#f1f5f9]">
            {farmGroups.map((farm) => (
              <div key={farm.farmId} className="px-6 py-5">
                {/* Farm header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-md bg-[#ecfdf5] flex items-center justify-center">
                    <Cpu className="w-3.5 h-3.5 text-[#009689]" />
                  </div>
                  <h3 className="font-bold text-[#0d3330] text-sm">
                    {farm.farmName}
                  </h3>
                </div>

                {/* Seasons inside this farm */}
                <div className="space-y-5 pl-8">
                  {farm.seasons.map((season) => (
                    <div key={season.seasonId ?? "no-season"}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-px flex-1 bg-[#f1f5f9]" />
                        <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-widest px-2">
                          {season.seasonName}
                        </p>
                        <div className="h-px flex-1 bg-[#f1f5f9]" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {season.devices.map((entry) => (
                          <DeviceCard
                            key={entry.device.deviceId}
                            entry={entry}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {iotMock && (
          <div className="px-6 pb-4">
            <MockBadge />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DeviceCard ───────────────────────────────────────────────────────────────

function DeviceCard({ entry }: { entry: DeviceWithData }) {
  const { device, sensorData } = entry;
  const isActive = device.status === "Active";

  return (
    <div
      className={`rounded-xl border p-4 text-sm transition-opacity ${
        isActive
          ? "border-[#d1fae5] bg-[#f0fdf9]"
          : "border-[#e2e8f0] bg-[#f8fafc] opacity-50"
      }`}
    >
      {/* Device header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-[#0d3330] text-xs truncate">
          {device.name}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
            isActive
              ? "bg-[#dcfce7] text-[#166534]"
              : "bg-[#f1f5f9] text-[#94a3b8]"
          }`}
        >
          {isActive ? "● Hoạt động" : "○ Tắt"}
        </span>
      </div>

      {sensorData ? (
        <div className="grid grid-cols-2 gap-y-2 gap-x-3">
          <SensorItem
            icon={<Thermometer className="w-3.5 h-3.5 text-[#ef4444]" />}
            label="Nhiệt độ"
            value={`${sensorData.temperature}°C`}
          />
          <SensorItem
            icon={<Droplets className="w-3.5 h-3.5 text-[#3b82f6]" />}
            label="Độ ẩm KK"
            value={`${sensorData.humidity}%`}
          />
          <SensorItem
            icon={<Wind className="w-3.5 h-3.5 text-[#0891b2]" />}
            label="Ẩm đất"
            value={`${sensorData.soilMoisture}%`}
          />
          <SensorItem
            icon={<Sun className="w-3.5 h-3.5 text-[#f59e0b]" />}
            label="Ánh sáng"
            value={`${sensorData.light} lux`}
          />

          {(sensorData.isRaining || sensorData.isAlert) && (
            <div className="col-span-2 flex items-center gap-2 pt-1">
              {sensorData.isRaining && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#2563eb] bg-[#eff6ff] px-2 py-0.5 rounded-full">
                  <CloudRain className="w-3 h-3" /> Đang mưa
                </span>
              )}
              {sensorData.isAlert && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#dc2626] bg-[#fee2e2] px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" /> Cảnh báo
                </span>
              )}
            </div>
          )}

          <div className="col-span-2 flex items-center gap-1 text-xs text-[#94a3b8] pt-1 border-t border-[#e2e8f0] mt-1">
            <RefreshCw className="w-3 h-3" />
            {formatTime(sensorData.recordedAt)}
          </div>
        </div>
      ) : (
        <p className="text-xs text-[#94a3b8] italic">
          Chưa có dữ liệu cảm biến
        </p>
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
      <span className="text-xs text-[#94a3b8]">{label}:</span>
      <span className="text-xs font-bold text-[#0d3330]">{value}</span>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function MockBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200 mt-2">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      Dữ liệu mẫu
    </span>
  );
}

function LoadingRows() {
  return (
    <div className="px-6 py-10 flex items-center justify-center gap-2 text-[#94a3b8] text-sm">
      <RefreshCw className="w-4 h-4 animate-spin text-[#009689]" />
      <span>Đang tải...</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="px-6 py-10 text-center text-[#94a3b8] text-sm">{text}</div>
  );
}
