import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Droplets,
  Wind,
  Sun,
  CloudRain,
  AlertTriangle,
  Cloud,
  ChevronRight,
  RefreshCw,
  MapPin,
  Eye,
  Gauge,
  Sunrise,
  Sunset,
  Waves,
  BarChart2,
  TrendingUp,
  Layers,
  MapPinned,
  Search,
  Sprout,
  CheckCircle2,
  Award,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { api } from "../../api/client";
import type {
  ReportResponse,
  FarmResponse,
  WeatherCurrentResponse,
  WeatherForecastDayResponse,
  YieldStatisticsParams,
  YieldSummaryResponse,
  YieldByCropResponse,
  YieldBySeasonResponse,
  YieldByPlotResponse,
} from "../../api/client";
import { qk } from "../../api/queryKeys";
import { LoadingState } from "../components/ui/LoadingState";
import { EmptyState } from "../components/ui/EmptyState";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useToast } from "../components/ui/useToast";
import { ToastContainer } from "../components/ui/ToastContainer";
import { formatDate } from "../utils/format";

// ─── Types ────────────────────────────────────────────────────────────────────

type ForecastDays = 1 | 3 | 7;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function weatherIcon(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith("//") ? `https:${url}` : url;
}

function uvLabel(uv: number | undefined): string {
  if (uv == null) return "—";
  if (uv < 3) return "Thấp";
  if (uv < 6) return "Trung bình";
  if (uv < 8) return "Cao";
  if (uv < 11) return "Rất cao";
  return "Cực cao";
}

function uvTone(
  uv: number | undefined,
): "success" | "warning" | "warning-2" | "danger" {
  if (uv == null || uv < 3) return "success";
  if (uv < 6) return "warning";
  if (uv < 8) return "warning-2";
  return "danger";
}

function rainLabel(chance: number | undefined): string {
  if (chance == null) return "—";
  return `${chance}%`;
}

function shortDay(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString("vi-VN", {
      weekday: "short",
      day: "numeric",
      month: "numeric",
    });
  } catch {
    return isoDate.slice(0, 10);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toasts, showToast, dismissToast } = useToast();

  // ── UI state ─────────────────────────────────────────────────────────────
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [forecastDays, setForecastDays] = useState<ForecastDays>(3);
  // Forecast is opt-in: only fetched after user clicks "Xem dự báo"
  const [forecastEnabled, setForecastEnabled] = useState(false);

  // ── Reports query ─────────────────────────────────────────────────────────
  // Store raw ReportResponse[] in cache — no mapper, so no type-mismatch risk
  // when other pages populate this same key.
  const reportsQuery = useQuery({
    queryKey: qk.reports.list(),
    queryFn: (): Promise<ReportResponse[]> => api.getReports(),
  });

  useEffect(() => {
    if (reportsQuery.error) {
      showToast(
        reportsQuery.error instanceof Error
          ? reportsQuery.error.message
          : "Không thể tải danh sách báo cáo",
        "error",
      );
    }
  }, [reportsQuery.error, showToast]);

  // ── Farms query — default selectedFarmId to first farm ───────────────────
  // Store raw FarmResponse[] in cache — mapping to display type happens at
  // render time below. This prevents the stale-cache type-mismatch bug where
  // another page (PlotsPage, SeasonsPage, etc.) writes raw FarmResponse[] to
  // ["farms","list"] and this page receives it while expecting a different shape.
  const farmsQuery = useQuery({
    queryKey: qk.farms.list(),
    queryFn: (): Promise<FarmResponse[]> => api.getFarms(),
  });

  useEffect(() => {
    if (farmsQuery.error) {
      showToast(
        farmsQuery.error instanceof Error
          ? farmsQuery.error.message
          : "Không thể tải danh sách trang trại",
        "error",
      );
    }
  }, [farmsQuery.error, showToast]);

  // Default to first farm once data arrives, but don't override user selection
  useEffect(() => {
    if (farmsQuery.data && farmsQuery.data.length > 0 && !selectedFarmId) {
      setSelectedFarmId(farmsQuery.data[0].farmId);
    }
  }, [farmsQuery.data, selectedFarmId]);

  // ── Current weather — auto-fetches when farm changes ─────────────────────
  const currentWeatherQuery = useQuery({
    queryKey: qk.weather.current(selectedFarmId),
    queryFn: (): Promise<WeatherCurrentResponse> =>
      api.getWeatherCurrentByFarm(selectedFarmId),
    enabled: !!selectedFarmId,
    // 5-minute stale time — weather doesn't change second-by-second
    staleTime: 5 * 60_000,
  });

  // Clear forecast whenever farm changes
  useEffect(() => {
    setForecastEnabled(false);
  }, [selectedFarmId]);

  // ── Forecast — only when user explicitly enables ──────────────────────────
  const forecastQuery = useQuery({
    queryKey: qk.weather.forecast(selectedFarmId, forecastDays),
    queryFn: (): Promise<{ forecast: WeatherForecastDayResponse[] }> =>
      api.getWeatherForecastByFarm(selectedFarmId, forecastDays),
    enabled: forecastEnabled && !!selectedFarmId,
    staleTime: 5 * 60_000,
  });

  // When forecastDays changes while forecast is shown, reset so user re-triggers
  function handleForecastDaysChange(d: ForecastDays) {
    setForecastDays(d);
    setForecastEnabled(false);
  }

  function loadForecast() {
    if (!selectedFarmId) return;
    if (forecastEnabled) {
      // Already enabled — invalidate to force a fresh fetch
      queryClient.invalidateQueries({
        queryKey: qk.weather.forecast(selectedFarmId, forecastDays),
      });
    } else {
      setForecastEnabled(true);
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────
  // Raw data straight from cache — no mapping needed on this page
  const reports = reportsQuery.data ?? [];
  const farms = farmsQuery.data ?? [];

  // isLoading: true only on first load (no cached data at all)
  // Guard against empty-state flash while first fetch is in flight
  const reportsLoading =
    reportsQuery.isLoading ||
    (reportsQuery.isFetching && reportsQuery.data === undefined);
  const farmsLoading =
    farmsQuery.isLoading ||
    (farmsQuery.isFetching && farmsQuery.data === undefined);

  const sentToOwnerReports = reports.filter(
    (r) => r.status.toUpperCase() === "SENT_TO_OWNER",
  );

  const currentWeather = currentWeatherQuery.data ?? null;
  const forecast = forecastQuery.data?.forecast ?? [];
  const forecastLoaded =
    forecastEnabled &&
    !forecastQuery.isLoading &&
    !forecastQuery.isError &&
    forecast.length > 0;

  const selectedFarm = farms.find((f) => f.farmId === selectedFarmId) ?? null;

  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 bg-surface-page min-h-screen">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Page Header */}
      <div>
        <p className="text-xs font-medium text-primary uppercase tracking-widest mb-1">
          {today}
        </p>
        <h1 className="text-xl sm:text-2xl font-bold text-primary-800 tracking-tight">
          Tổng quan trang trại
        </h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SummaryCard
          icon={FileText}
          label="Báo cáo chờ xử lý"
          count={reportsLoading ? null : sentToOwnerReports.length}
          hint={
            sentToOwnerReports.length > 0
              ? "Cần xem xét và phản hồi"
              : "Không có báo cáo mới"
          }
          tone={sentToOwnerReports.length > 0 ? "danger" : "primary"}
          onClick={() => navigate("/advisory")}
        />
        <SummaryCard
          icon={FileText}
          label="Tổng trang trại"
          count={farmsLoading ? null : farms.length}
          hint={
            farms.length > 0
              ? `${farms.filter((f) => f.farmStatus === "Active").length} đang hoạt động`
              : "Chưa có trang trại nào"
          }
          tone="primary"
          onClick={() => navigate("/farms")}
        />
      </div>

      {/* ── Weather Section ────────────────────────────────────────────────── */}
      <div className="bg-surface rounded-2xl border border-border shadow-card overflow-hidden">
        {/* Section header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
              <Cloud className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-primary-800 truncate">
                Thời tiết trang trại
              </h2>
              <p className="text-xs text-ink-400 mt-0.5 truncate">
                Thời tiết hiện tại và dự báo theo trang trại
              </p>
            </div>
          </div>

          {/* Farm picker */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {farmsLoading ? (
              <div className="h-9 w-44 rounded-btn bg-surface-subtle animate-pulse" />
            ) : farms.length === 0 ? null : (
              <select
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
                className="h-9 px-3 text-sm border border-border-strong rounded-btn bg-surface text-ink-700 focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer min-w-0 max-w-[180px] sm:max-w-xs truncate"
              >
                {farms.map((f) => (
                  <option key={f.farmId} value={f.farmId}>
                    {f.farmName}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {farms.length === 0 && !farmsLoading ? (
            <EmptyState
              icon={MapPin}
              message="Chưa có trang trại nào. Hãy tạo trang trại trước."
            />
          ) : currentWeatherQuery.isLoading ? (
            <LoadingState message="Đang tải dữ liệu thời tiết..." />
          ) : currentWeatherQuery.isError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="w-10 h-10 rounded-card bg-status-warning-bg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-status-warning-fg" />
              </div>
              <p className="text-sm text-ink-500 max-w-xs">
                {currentWeatherQuery.error instanceof Error
                  ? currentWeatherQuery.error.message
                  : "Không thể tải dữ liệu thời tiết."}
              </p>
              {selectedFarm && (
                <button
                  type="button"
                  onClick={() => navigate("/farms")}
                  className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
                >
                  Cập nhật toạ độ trang trại →
                </button>
              )}
            </div>
          ) : currentWeather ? (
            <div className="flex flex-col gap-5">
              {/* Location row */}
              {currentWeather.location?.name && (
                <div className="flex items-center gap-1.5 text-xs text-ink-400">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {[
                      currentWeather.location.name,
                      currentWeather.location.region,
                      currentWeather.location.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                  {currentWeather.location.localTime && (
                    <span className="ml-auto shrink-0 whitespace-nowrap">
                      {currentWeather.location.localTime}
                    </span>
                  )}
                </div>
              )}

              {/* Current weather hero */}
              <div className="flex flex-wrap items-start gap-6">
                {/* Temp + condition */}
                <div className="flex items-center gap-3 min-w-0">
                  {weatherIcon(currentWeather.condition?.icon) && (
                    <img
                      src={weatherIcon(currentWeather.condition.icon)}
                      alt={currentWeather.condition?.text ?? ""}
                      className="w-14 h-14 shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-4xl font-extrabold text-primary-800 leading-none">
                      {currentWeather.tempC != null
                        ? `${Math.round(currentWeather.tempC)}°C`
                        : "—"}
                    </div>
                    <div className="text-sm text-ink-500 mt-1 truncate">
                      {currentWeather.condition?.text ?? ""}
                    </div>
                    {currentWeather.feelsLikeC != null && (
                      <div className="text-xs text-ink-400 mt-0.5">
                        Cảm giác như {Math.round(currentWeather.feelsLikeC)}°C
                      </div>
                    )}
                  </div>
                </div>

                {/* Detail grid */}
                <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <WeatherDetail
                    icon={<Droplets className="w-4 h-4 text-blue-500" />}
                    label="Độ ẩm"
                    value={
                      currentWeather.humidity != null
                        ? `${currentWeather.humidity}%`
                        : "—"
                    }
                  />
                  <WeatherDetail
                    icon={<Wind className="w-4 h-4 text-cyan-600" />}
                    label="Gió"
                    value={
                      currentWeather.windKph != null
                        ? `${currentWeather.windKph} km/h${currentWeather.windDir ? ` ${currentWeather.windDir}` : ""}`
                        : "—"
                    }
                  />
                  <WeatherDetail
                    icon={<CloudRain className="w-4 h-4 text-blue-600" />}
                    label="Lượng mưa"
                    value={
                      currentWeather.precipMm != null
                        ? `${currentWeather.precipMm} mm`
                        : "—"
                    }
                  />
                  <WeatherDetail
                    icon={<Sun className="w-4 h-4 text-amber-500" />}
                    label="Chỉ số UV"
                    value={
                      currentWeather.uv != null
                        ? `${currentWeather.uv} — ${uvLabel(currentWeather.uv)}`
                        : "—"
                    }
                    tone={uvTone(currentWeather.uv)}
                  />
                  <WeatherDetail
                    icon={<Eye className="w-4 h-4 text-ink-400" />}
                    label="Tầm nhìn"
                    value={
                      currentWeather.visKm != null
                        ? `${currentWeather.visKm} km`
                        : "—"
                    }
                  />
                  <WeatherDetail
                    icon={<Gauge className="w-4 h-4 text-ink-400" />}
                    label="Áp suất"
                    value={
                      currentWeather.pressureMb != null
                        ? `${currentWeather.pressureMb} mb`
                        : "—"
                    }
                  />
                </div>
              </div>

              {/* Last updated */}
              {currentWeather.lastUpdated && (
                <div className="flex items-center gap-1 text-xs text-ink-400">
                  <RefreshCw className="w-3 h-3 shrink-0" />
                  <span>
                    Cập nhật lúc{" "}
                    {new Date(currentWeather.lastUpdated).toLocaleString(
                      "vi-VN",
                      {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </span>
                </div>
              )}

              {/* ── Forecast panel — opt-in ──────────────────────────────────── */}
              <div className="border-t border-border pt-4">
                {!forecastEnabled && !forecastQuery.isLoading ? (
                  /* Prompt row */
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-ink-400" />
                    <div className="flex items-center gap-2">
                      {/* Days selector */}
                      <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-btn">
                        {([1, 3, 7] as ForecastDays[]).map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setForecastDays(d)}
                            className={[
                              "px-2.5 py-1 text-xs font-medium rounded-btn transition-colors",
                              forecastDays === d
                                ? "bg-surface text-ink-800 shadow-card"
                                : "text-ink-500 hover:text-ink-700",
                            ].join(" ")}
                          >
                            {d} ngày
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={loadForecast}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-btn bg-primary text-primary-fg hover:bg-primary-hover transition-colors"
                      >
                        <Cloud className="w-3.5 h-3.5" />
                        Xem dự báo
                      </button>
                    </div>
                  </div>
                ) : forecastQuery.isLoading ? (
                  <LoadingState message="Đang tải dự báo..." variant="inline" />
                ) : forecastQuery.isError ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-status-danger-fg">
                      {forecastQuery.error instanceof Error
                        ? forecastQuery.error.message
                        : "Không thể tải dự báo thời tiết."}
                    </p>
                    <button
                      type="button"
                      onClick={loadForecast}
                      className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : forecastLoaded ? (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest">
                        Dự báo {forecastDays} ngày tới
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-btn">
                          {([1, 3, 7] as ForecastDays[]).map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => handleForecastDaysChange(d)}
                              className={[
                                "px-2.5 py-1 text-xs font-medium rounded-btn transition-colors",
                                forecastDays === d
                                  ? "bg-surface text-ink-800 shadow-card"
                                  : "text-ink-500 hover:text-ink-700",
                              ].join(" ")}
                            >
                              {d} ngày
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={loadForecast}
                          className="inline-flex items-center gap-1 text-xs text-ink-400 hover:text-primary transition-colors"
                          title="Tải lại dự báo"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Tải lại
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {forecast.map((day) => (
                        <ForecastCard key={day.date} day={day} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <EmptyState message="Chọn một trang trại để xem thời tiết." />
          )}
        </div>
      </div>

      {/* Reports table */}
      <SectionCard
        icon={<AlertTriangle className="w-4 h-4 text-status-warning-fg" />}
        iconBg="bg-status-warning-bg"
        title="Báo cáo chờ xử lý"
        subtitle="Các báo cáo từ nhân viên đang chờ tư vấn chuyên gia"
        onViewAll={() => navigate("/advisory")}
      >
        {reportsLoading ? (
          <LoadingState />
        ) : reportsQuery.isError && reports.length === 0 ? (
          // Show error state only when there's no cached data to fall back on
          <EmptyState
            icon={AlertTriangle}
            message={
              reportsQuery.error instanceof Error
                ? reportsQuery.error.message
                : "Không thể tải báo cáo"
            }
          />
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

      {/* ── Yield Statistics ──────────────────────────────────────────────── */}
      <YieldStatisticsSection farms={farms} farmsLoading={farmsLoading} />
    </div>
  );
}

// ─── WeatherDetail ────────────────────────────────────────────────────────────

function WeatherDetail({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "success" | "warning" | "warning-2" | "danger";
}) {
  const valueCls = tone
    ? {
        success: "text-status-success-fg",
        warning: "text-status-warning-fg",
        "warning-2": "text-status-warning-fg-2",
        danger: "text-status-danger-fg",
      }[tone]
    : "text-primary-800";

  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className="shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-ink-400">{label}</p>
        <p className={`text-xs font-semibold truncate ${valueCls}`}>{value}</p>
      </div>
    </div>
  );
}

// ─── ForecastCard ─────────────────────────────────────────────────────────────

function ForecastCard({ day }: { day: WeatherForecastDayResponse }) {
  return (
    <div className="flex flex-col items-center gap-2 bg-surface-alt rounded-xl border border-border px-4 py-3 shrink-0 min-w-[130px]">
      <p className="text-xs font-semibold text-ink-500 whitespace-nowrap">
        {shortDay(day.date)}
      </p>

      {weatherIcon(day.condition?.icon) ? (
        <img
          src={weatherIcon(day.condition.icon)}
          alt={day.condition?.text ?? ""}
          className="w-10 h-10"
        />
      ) : (
        <Cloud className="w-10 h-10 text-ink-300" />
      )}

      <p className="text-xs text-ink-500 text-center leading-snug line-clamp-2">
        {day.condition?.text ?? "—"}
      </p>

      <div className="flex items-center gap-2 text-xs font-semibold">
        <span className="text-red-500">
          {day.maxTempC != null ? `${Math.round(day.maxTempC)}°` : "—"}
        </span>
        <span className="text-ink-300">/</span>
        <span className="text-blue-500">
          {day.minTempC != null ? `${Math.round(day.minTempC)}°` : "—"}
        </span>
      </div>

      <div className="flex items-center gap-1 text-xs text-ink-500">
        <Waves className="w-3 h-3 text-blue-400 shrink-0" />
        <span>{rainLabel(day.chanceOfRain)} mưa</span>
      </div>

      <div className="flex items-center gap-1 text-xs text-ink-500">
        <Droplets className="w-3 h-3 text-blue-500 shrink-0" />
        <span>{day.avgHumidity != null ? `${day.avgHumidity}%` : "—"}</span>
      </div>

      {(day.sunrise || day.sunset) && (
        <div className="flex flex-col gap-0.5 w-full border-t border-border pt-2 mt-1">
          {day.sunrise && (
            <div className="flex items-center gap-1 text-[10px] text-ink-400">
              <Sunrise className="w-3 h-3 shrink-0 text-amber-400" />
              <span>{day.sunrise}</span>
            </div>
          )}
          {day.sunset && (
            <div className="flex items-center gap-1 text-[10px] text-ink-400">
              <Sunset className="w-3 h-3 shrink-0 text-orange-400" />
              <span>{day.sunset}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────

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
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${SUMMARY_STRIPE[tone]}`}
      />
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${SUMMARY_ICON_BG[tone]}`}
        >
          <Icon className={`w-5 h-5 ${SUMMARY_ICON_FG[tone]}`} />
        </div>
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

// ─── YieldStatisticsSection ───────────────────────────────────────────────────

type StatTab = "summary" | "by-crop" | "by-season" | "by-plot";

const STAT_TABS: { value: StatTab; label: string; icon: React.ElementType }[] =
  [
    { value: "summary", label: "Tổng quan", icon: BarChart2 },
    { value: "by-crop", label: "Theo cây trồng", icon: Sprout },
    { value: "by-season", label: "Theo vụ mùa", icon: TrendingUp },
    { value: "by-plot", label: "Theo khu đất", icon: MapPinned },
  ];

const CHART_COLORS = [
  "#009689",
  "#0ea5e9",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
  "#f97316",
];

/** Serialize filter params to a stable cache key (omit empty values) */
function paramsToKey(p: YieldStatisticsParams): Record<string, string> {
  const out: Record<string, string> = {};
  if (p.from) out.from = p.from;
  if (p.to) out.to = p.to;
  if (p.farmId) out.farmId = p.farmId;
  if (p.cropId) out.cropId = p.cropId;
  if (p.seasonId) out.seasonId = p.seasonId;
  return out;
}

function fmt(n: number, decimals = 1): string {
  return n.toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function YieldStatisticsSection({
  farms,
  farmsLoading,
}: {
  farms: FarmResponse[];
  farmsLoading: boolean;
}) {
  const { showToast } = useToast();

  // ── Filter state ───────────────────────────────────────────────────────
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [farmId, setFarmId] = useState("");
  // cropId / seasonId are text inputs (no full list loaded here)
  // We intentionally omit crop/season pickers to avoid extra API calls.
  // Users can still filter by pasting IDs — advanced use only.
  const [activeTab, setActiveTab] = useState<StatTab>("summary");

  // Applied params — only set when user hits "Xem thống kê"
  const [appliedParams, setAppliedParams] =
    useState<YieldStatisticsParams | null>(null);

  const paramKey = appliedParams ? paramsToKey(appliedParams) : null;

  // ── TanStack queries — all disabled until user triggers ────────────────
  const summaryQuery = useQuery({
    queryKey: qk.statistics.yieldSummary(paramKey ?? {}),
    queryFn: () => api.getYieldSummary(appliedParams!),
    enabled: !!appliedParams && activeTab === "summary",
    staleTime: 60_000,
  });

  const byCropQuery = useQuery({
    queryKey: qk.statistics.yieldByCrop(paramKey ?? {}),
    queryFn: () => api.getYieldByCrop(appliedParams!),
    enabled: !!appliedParams && activeTab === "by-crop",
    staleTime: 60_000,
  });

  const bySeasonQuery = useQuery({
    queryKey: qk.statistics.yieldBySeason(paramKey ?? {}),
    queryFn: () => api.getYieldBySeason(appliedParams!),
    enabled: !!appliedParams && activeTab === "by-season",
    staleTime: 60_000,
  });

  const byPlotQuery = useQuery({
    queryKey: qk.statistics.yieldByPlot(paramKey ?? {}),
    queryFn: () => api.getYieldByPlot(appliedParams!),
    enabled: !!appliedParams && activeTab === "by-plot",
    staleTime: 60_000,
  });

  // Surface errors
  useEffect(() => {
    const q =
      activeTab === "summary"
        ? summaryQuery
        : activeTab === "by-crop"
          ? byCropQuery
          : activeTab === "by-season"
            ? bySeasonQuery
            : byPlotQuery;
    if (q.error) {
      showToast(
        q.error instanceof Error ? q.error.message : "Không thể tải thống kê",
        "error",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    summaryQuery.error,
    byCropQuery.error,
    bySeasonQuery.error,
    byPlotQuery.error,
  ]);

  function handleApply() {
    // Basic date validation
    if (from && to && from > to) {
      showToast("Ngày bắt đầu phải trước ngày kết thúc", "error");
      return;
    }
    setAppliedParams({
      from: from || undefined,
      to: to || undefined,
      farmId: farmId || undefined,
    });
  }

  function handleReset() {
    setFrom("");
    setTo("");
    setFarmId("");
    setAppliedParams(null);
  }

  const activeQuery =
    activeTab === "summary"
      ? summaryQuery
      : activeTab === "by-crop"
        ? byCropQuery
        : activeTab === "by-season"
          ? bySeasonQuery
          : byPlotQuery;

  const isLoading = activeQuery.isLoading && !!appliedParams;

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <BarChart2 className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-primary-800 truncate">
              Thống kê năng suất
            </h2>
            <p className="text-xs text-ink-400 mt-0.5">
              Phân tích sản lượng thu hoạch theo cây trồng, vụ mùa và khu đất
            </p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-6 py-4 border-b border-border bg-surface-alt">
        <div className="flex flex-wrap items-end gap-3">
          {/* From */}
          <div className="flex flex-col gap-1 min-w-[130px]">
            <label className="text-xs font-medium text-ink-500">Từ ngày</label>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 px-3 text-sm border border-border-strong rounded-btn bg-surface text-ink-700 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {/* To */}
          <div className="flex flex-col gap-1 min-w-[130px]">
            <label className="text-xs font-medium text-ink-500">Đến ngày</label>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 px-3 text-sm border border-border-strong rounded-btn bg-surface text-ink-700 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {/* Farm picker */}
          <div className="flex flex-col gap-1 min-w-[150px] max-w-[220px]">
            <label className="text-xs font-medium text-ink-500">
              Trang trại
            </label>
            {farmsLoading ? (
              <div className="h-9 w-full rounded-btn bg-surface-subtle animate-pulse" />
            ) : (
              <select
                value={farmId}
                onChange={(e) => setFarmId(e.target.value)}
                className="h-9 px-3 text-sm border border-border-strong rounded-btn bg-surface text-ink-700 focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
              >
                <option value="">Tất cả trang trại</option>
                {farms.map((f) => (
                  <option key={f.farmId} value={f.farmId}>
                    {f.farmName}
                  </option>
                ))}
              </select>
            )}
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2 pb-0.5">
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-semibold rounded-btn bg-primary text-primary-fg hover:bg-primary-hover transition-colors"
            >
              <Search className="w-4 h-4" />
              Xem thống kê
            </button>
            {appliedParams && (
              <button
                type="button"
                onClick={handleReset}
                className="h-9 px-3 text-sm font-medium rounded-btn text-ink-500 hover:text-ink-700 hover:bg-surface-subtle border border-border transition-colors"
              >
                Xoá bộ lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4 flex flex-wrap gap-1 bg-surface border-b border-border pb-0">
        {STAT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={[
                "inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-ink-500 hover:text-ink-700",
              ].join(" ")}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="p-6">
        {!appliedParams ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
              <BarChart2 className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-semibold text-ink-700">
              Chưa có dữ liệu thống kê
            </p>
            <p className="text-xs text-ink-400 max-w-xs">
              Chọn bộ lọc phù hợp và nhấn{" "}
              <span className="font-semibold text-primary">Xem thống kê</span>{" "}
              để tải dữ liệu.
            </p>
          </div>
        ) : isLoading ? (
          <LoadingState message="Đang tải thống kê..." />
        ) : activeQuery.isError ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertTriangle className="w-8 h-8 text-status-warning-fg" />
            <p className="text-sm text-ink-500">
              {activeQuery.error instanceof Error
                ? activeQuery.error.message
                : "Không thể tải thống kê"}
            </p>
          </div>
        ) : activeTab === "summary" ? (
          <SummaryTab data={summaryQuery.data ?? null} />
        ) : activeTab === "by-crop" ? (
          <ByCropTab data={byCropQuery.data ?? []} />
        ) : activeTab === "by-season" ? (
          <BySeasonTab data={bySeasonQuery.data ?? []} />
        ) : (
          <ByPlotTab data={byPlotQuery.data ?? []} />
        )}
      </div>
    </div>
  );
}

// ─── SummaryTab ────────────────────────────────────────────────────────────────

function SummaryTab({ data }: { data: YieldSummaryResponse | null }) {
  if (!data) return <EmptyState message="Không có dữ liệu tổng quan" />;

  const fulfillmentTone =
    data.overallFulfillmentRate >= 80
      ? "success"
      : data.overallFulfillmentRate >= 50
        ? "warning"
        : "danger";

  const fulfillmentBg =
    fulfillmentTone === "success"
      ? "bg-status-success-bg"
      : fulfillmentTone === "warning"
        ? "bg-status-warning-bg"
        : "bg-status-danger-bg";
  const fulfillmentFg =
    fulfillmentTone === "success"
      ? "text-status-success-fg"
      : fulfillmentTone === "warning"
        ? "text-status-warning-fg"
        : "text-status-danger-fg";

  return (
    <div className="flex flex-col gap-5">
      {/* Row 1: harvests + weight — each a horizontal card, side-by-side on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Tổng lượt thu hoạch */}
        <div className="bg-surface-alt rounded-xl border border-border p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
            <BarChart2 className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-ink-400">Tổng lượt thu hoạch</p>
            <p className="text-2xl font-extrabold text-primary-800 leading-tight mt-0.5">
              {data.totalHarvests}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
              <span className="text-xs text-status-success-fg font-medium">
                ✓ {data.completedHarvests} hoàn thành
              </span>
              <span className="text-xs text-status-warning-fg font-medium">
                ◌ {data.ongoingHarvests} đang diễn ra
              </span>
            </div>
          </div>
        </div>

        {/* Sản lượng thực tế */}
        <div className="bg-surface-alt rounded-xl border border-border p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-ink-400">Sản lượng thực tế</p>
            <p className="text-2xl font-extrabold text-primary-800 leading-tight mt-0.5">
              {fmt(data.totalActualWeightKg)}{" "}
              <span className="text-sm font-semibold text-ink-500">kg</span>
            </p>
            <p className="text-xs text-ink-400 mt-1">
              Kỳ vọng: {data.totalExpectedQuantity.toLocaleString("vi-VN")}
            </p>
          </div>
        </div>
      </div>

      {/* Row 2: fulfillment rate + scope */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Tỷ lệ hoàn thành */}
        <div className="bg-surface-alt rounded-xl border border-border p-4 flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${fulfillmentBg}`}
          >
            <TrendingUp className={`w-4 h-4 ${fulfillmentFg}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-ink-400">Tỷ lệ hoàn thành</p>
            <p
              className={`text-2xl font-extrabold leading-tight mt-0.5 ${fulfillmentFg}`}
            >
              {fmt(data.overallFulfillmentRate)}%
            </p>
            <p className={`text-xs mt-1 font-medium ${fulfillmentFg}`}>
              {data.overallFulfillmentRate >= 80
                ? "Đạt mục tiêu"
                : data.overallFulfillmentRate >= 50
                  ? "Gần đạt mục tiêu"
                  : "Dưới mục tiêu"}
            </p>
          </div>
        </div>

        {/* Phạm vi */}
        <div className="bg-surface-alt rounded-xl border border-border p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-ink-400 mb-2">Phạm vi thống kê</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <div>
                <span className="text-lg font-bold text-primary-800">
                  {data.cropsCount}
                </span>
                <span className="text-xs text-ink-500 ml-1">loại cây</span>
              </div>
              <div>
                <span className="text-lg font-bold text-primary-800">
                  {data.seasonsCount}
                </span>
                <span className="text-xs text-ink-500 ml-1">vụ mùa</span>
              </div>
              <div>
                <span className="text-lg font-bold text-primary-800">
                  {data.plotsCount}
                </span>
                <span className="text-xs text-ink-500 ml-1">khu đất</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top crop callout */}
      {data.topCropName && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary/20">
          <Award className="w-5 h-5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-ink-500">
              Cây trồng đạt sản lượng cao nhất
            </p>
            <p className="text-sm font-bold text-primary-800 mt-0.5">
              {data.topCropName}{" "}
              <span className="text-primary font-semibold">
                — {fmt(data.topCropWeightKg)} kg
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ByCropTab ─────────────────────────────────────────────────────────────────

function ByCropTab({ data }: { data: YieldByCropResponse[] }) {
  const [view, setView] = useState<"chart" | "table">("chart");

  if (data.length === 0)
    return <EmptyState message="Không có dữ liệu theo cây trồng" />;

  const chartData = [...data]
    .sort((a, b) => b.totalActualWeightKg - a.totalActualWeightKg)
    .slice(0, 10)
    .map((d) => ({
      name: d.cropName,
      kg: d.totalActualWeightKg,
      rate: d.fulfillmentRate,
    }));

  return (
    <div className="flex flex-col gap-4">
      {/* View toggle */}
      <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-btn w-fit">
        {(["chart", "table"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={[
              "px-3 py-1.5 text-xs font-medium rounded-btn transition-colors",
              view === v
                ? "bg-surface text-ink-800 shadow-card"
                : "text-ink-500 hover:text-ink-700",
            ].join(" ")}
          >
            {v === "chart" ? "Biểu đồ" : "Bảng chi tiết"}
          </button>
        ))}
      </div>

      {view === "chart" ? (
        <div className="w-full overflow-x-auto">
          <div style={{ minWidth: Math.max(400, chartData.length * 80) }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 16, left: 0, bottom: 40 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--color-ink-500)" }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-ink-500)" }}
                  unit=" kg"
                  width={60}
                />
                <Tooltip
                  formatter={(val: number) => [`${fmt(val)} kg`, "Sản lượng"]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                  }}
                />
                <Bar dataKey="kg" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="bg-surface-alt border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider">
                  Cây trồng
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider">
                  Sản lượng (kg)
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider">
                  Số lượng thực tế
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider">
                  Kỳ vọng
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider">
                  Tỷ lệ hoàn thành
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider hidden sm:table-cell">
                  Lượt thu hoạch
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider hidden md:table-cell">
                  Số vụ
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr
                  key={row.cropId}
                  className={i % 2 === 0 ? "bg-surface" : "bg-surface-alt"}
                >
                  <td className="px-4 py-3 font-semibold text-ink-700">
                    {row.cropName}
                  </td>
                  <td className="px-4 py-3 text-left text-primary-800 font-semibold">
                    {fmt(row.totalActualWeightKg)}
                  </td>
                  <td className="px-4 py-3 text-left text-ink-600">
                    {row.totalActualQuantity.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3 text-left text-ink-500">
                    {row.totalExpectedQuantity.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3 text-left">
                    <span
                      className={[
                        "inline-block px-2 py-0.5 rounded-pill text-xs font-semibold",
                        row.fulfillmentRate >= 80
                          ? "bg-status-success-bg text-status-success-fg"
                          : row.fulfillmentRate >= 50
                            ? "bg-status-warning-bg text-status-warning-fg"
                            : "bg-status-danger-bg text-status-danger-fg",
                      ].join(" ")}
                    >
                      {fmt(row.fulfillmentRate)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-left text-ink-500 hidden sm:table-cell">
                    {row.harvestCount}
                  </td>
                  <td className="px-4 py-3 text-left text-ink-500 hidden md:table-cell">
                    {row.seasonsCovered}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── BySeasonTab ───────────────────────────────────────────────────────────────

function BySeasonTab({ data }: { data: YieldBySeasonResponse[] }) {
  if (data.length === 0)
    return <EmptyState message="Không có dữ liệu theo vụ mùa" />;

  const sorted = [...data].sort((a, b) =>
    a.seasonStartDate.localeCompare(b.seasonStartDate),
  );

  const chartData = sorted.map((d) => ({
    name: d.seasonName,
    actual: d.totalActualWeightKg,
    expected: d.totalExpectedQuantity,
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Bar chart */}
      <div className="w-full overflow-x-auto">
        <div style={{ minWidth: Math.max(400, chartData.length * 120) }}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 16, left: 0, bottom: 48 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "var(--color-ink-500)" }}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-ink-500)" }}
                unit=" kg"
                width={65}
              />
              <Tooltip
                formatter={(val: number, name: string) => [
                  `${fmt(val)} kg`,
                  name === "actual" ? "Thực tế" : "Kỳ vọng",
                ]}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                }}
              />
              <Bar
                dataKey="expected"
                fill="#e2e8f0"
                radius={[4, 4, 0, 0]}
                name="expected"
              />
              <Bar
                dataKey="actual"
                fill="#009689"
                radius={[4, 4, 0, 0]}
                name="actual"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <p className="text-xs text-ink-400 text-center -mt-2">
        <span className="inline-block w-3 h-3 rounded bg-[#e2e8f0] mr-1 align-middle" />
        Kỳ vọng&nbsp;&nbsp;
        <span className="inline-block w-3 h-3 rounded bg-primary mr-1 align-middle" />
        Thực tế
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="bg-surface-alt border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider">
                Vụ mùa
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider hidden sm:table-cell">
                Thời gian
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider">
                Sản lượng (kg)
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider">
                Tỷ lệ hoàn thành
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider hidden md:table-cell">
                Loại cây trồng
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider hidden md:table-cell">
                Số khu đất
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={row.seasonId}
                className={i % 2 === 0 ? "bg-surface" : "bg-surface-alt"}
              >
                <td className="px-4 py-3 font-semibold text-ink-700 max-w-[180px] truncate">
                  {row.seasonName}
                </td>
                <td className="px-4 py-3 text-ink-500 text-xs hidden sm:table-cell whitespace-nowrap">
                  {row.seasonStartDate} → {row.seasonEndDate}
                </td>
                <td className="px-4 py-3 text-left text-primary-800 font-semibold">
                  {fmt(row.totalActualWeightKg)}
                </td>
                <td className="px-4 py-3 text-left">
                  <span
                    className={[
                      "inline-block px-2 py-0.5 rounded-pill text-xs font-semibold",
                      row.fulfillmentRate >= 80
                        ? "bg-status-success-bg text-status-success-fg"
                        : row.fulfillmentRate >= 50
                          ? "bg-status-warning-bg text-status-warning-fg"
                          : "bg-status-danger-bg text-status-danger-fg",
                    ].join(" ")}
                  >
                    {fmt(row.fulfillmentRate)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-left text-ink-500 hidden md:table-cell">
                  {row.cropsCovered}
                </td>
                <td className="px-4 py-3 text-left text-ink-500 hidden md:table-cell">
                  {row.plotsCovered}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ByPlotTab ─────────────────────────────────────────────────────────────────

function ByPlotTab({ data }: { data: YieldByPlotResponse[] }) {
  const [sortField, setSortField] = useState<
    "totalActualWeightKg" | "yieldPerAreaKg"
  >("totalActualWeightKg");

  if (data.length === 0)
    return <EmptyState message="Không có dữ liệu theo khu đất" />;

  const sorted = [...data].sort((a, b) => b[sortField] - a[sortField]);

  const maxYield = Math.max(...sorted.map((d) => d.totalActualWeightKg), 1);

  return (
    <div className="flex flex-col gap-4">
      {/* Sort control */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-ink-500">Sắp xếp theo:</span>
        <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-btn">
          {(["totalActualWeightKg", "yieldPerAreaKg"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setSortField(f)}
              className={[
                "px-3 py-1.5 text-xs font-medium rounded-btn transition-colors",
                sortField === f
                  ? "bg-surface text-ink-800 shadow-card"
                  : "text-ink-500 hover:text-ink-700",
              ].join(" ")}
            >
              {f === "totalActualWeightKg"
                ? "Tổng sản lượng"
                : "Sản lượng / m²"}
            </button>
          ))}
        </div>
      </div>

      {/* Heatmap-style bars */}
      <div className="flex flex-col gap-2">
        {sorted.map((row) => {
          const pct = (row.totalActualWeightKg / maxYield) * 100;
          return (
            <div key={row.plotId} className="flex items-center gap-3 min-w-0">
              <span className="w-24 shrink-0 text-xs font-semibold text-ink-600 truncate text-right">
                {row.plotName}
              </span>
              <div className="flex-1 min-w-0 h-7 bg-surface-alt rounded-btn overflow-hidden relative border border-border">
                <div
                  className="absolute inset-y-0 left-0 bg-primary/80 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
                <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-primary-800 mix-blend-multiply">
                  {fmt(row.totalActualWeightKg)} kg
                </span>
              </div>
              <span className="shrink-0 text-xs text-ink-400 w-20 text-right">
                {fmt(row.yieldPerAreaKg, 2)} kg/m²
              </span>
            </div>
          );
        })}
      </div>

      {/* Sortable table */}
      <div className="overflow-x-auto rounded-xl border border-border mt-2">
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr className="bg-surface-alt border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider">
                Khu đất
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider">
                Diện tích (m²)
              </th>
              <th
                className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors select-none"
                onClick={() => setSortField("totalActualWeightKg")}
              >
                Tổng (kg) {sortField === "totalActualWeightKg" && "↓"}
              </th>
              <th
                className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors select-none"
                onClick={() => setSortField("yieldPerAreaKg")}
              >
                kg/m² {sortField === "yieldPerAreaKg" && "↓"}
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider hidden sm:table-cell">
                Lượt thu hoạch
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider hidden sm:table-cell">
                Cây trồng
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={row.plotId}
                className={i % 2 === 0 ? "bg-surface" : "bg-surface-alt"}
              >
                <td className="px-4 py-3 font-semibold text-ink-700">
                  {row.plotName}
                </td>
                <td className="px-4 py-3 text-left text-ink-500">
                  {row.plotArea.toLocaleString("vi-VN")}
                </td>
                <td className="px-4 py-3 text-left text-primary-800 font-semibold">
                  {fmt(row.totalActualWeightKg)}
                </td>
                <td className="px-4 py-3 text-left text-ink-600">
                  {fmt(row.yieldPerAreaKg, 2)}
                </td>
                <td className="px-4 py-3 text-left text-ink-500 hidden sm:table-cell">
                  {row.harvestCount}
                </td>
                <td className="px-4 py-3 text-left text-ink-500 hidden sm:table-cell">
                  {row.cropsCovered}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
