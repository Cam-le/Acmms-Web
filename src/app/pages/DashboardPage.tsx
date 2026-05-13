import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  FileText,
  Receipt,
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
} from "lucide-react";
import { api } from "../../api/client";
import type {
  ReportResponse,
  PriceSettingResponse,
  FarmResponse,
  WeatherCurrentResponse,
  WeatherForecastDayResponse,
} from "../../api/client";
import { LoadingState } from "../components/ui/LoadingState";
import { EmptyState } from "../components/ui/EmptyState";
import { StatusBadge } from "../components/ui/StatusBadge";
import { formatDate, formatMonth } from "../utils/format";

// ─── Types ────────────────────────────────────────────────────────────────────

type ForecastDays = 1 | 3 | 7;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Prepend https: to WeatherAPI icon URLs that start with // */
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

  // ── Summary data ─────────────────────────────────────────────────────────
  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [bills, setBills] = useState<PriceSettingResponse[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingBills, setLoadingBills] = useState(true);

  // ── Farm / weather ────────────────────────────────────────────────────────
  const [farms, setFarms] = useState<FarmResponse[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [forecastDays, setForecastDays] = useState<ForecastDays>(3);

  // Current weather — auto-fetches when farm changes
  const [currentWeather, setCurrentWeather] =
    useState<WeatherCurrentResponse | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [currentError, setCurrentError] = useState<string | null>(null);

  // Forecast — only fetched when user explicitly clicks "Xem dự báo"
  const [forecast, setForecast] = useState<WeatherForecastDayResponse[]>([]);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [forecastLoaded, setForecastLoaded] = useState(false);

  // Separate ref counters to guard stale responses for each fetch type
  const currentFetchId = useRef(0);
  const forecastFetchId = useRef(0);

  // ── Load reports ─────────────────────────────────────────────────────────
  useEffect(() => {
    api
      .getReports()
      .then((data) => setReports(data ?? []))
      .catch(() => setReports([]))
      .finally(() => setLoadingReports(false));
  }, []);

  // ── Load bills ───────────────────────────────────────────────────────────
  useEffect(() => {
    api
      .getPriceSettings()
      .then((data) => setBills(data ?? []))
      .catch(() => setBills([]))
      .finally(() => setLoadingBills(false));
  }, []);

  // ── Load farms once ───────────────────────────────────────────────────────
  useEffect(() => {
    api
      .getFarms()
      .then((data) => {
        const list = data ?? [];
        setFarms(list);
        if (list.length > 0) setSelectedFarmId(list[0].farmId);
      })
      .catch(() => setFarms([]))
      .finally(() => setLoadingFarms(false));
  }, []);

  // ── Auto-fetch current weather when farm changes ──────────────────────────
  useEffect(() => {
    if (!selectedFarmId) {
      setCurrentWeather(null);
      setCurrentError(null);
      // Also clear any previously loaded forecast when farm switches
      setForecast([]);
      setForecastError(null);
      setForecastLoaded(false);
      return;
    }

    const fetchId = ++currentFetchId.current;
    setLoadingCurrent(true);
    setCurrentError(null);
    setCurrentWeather(null);
    // Clear stale forecast from previous farm
    setForecast([]);
    setForecastError(null);
    setForecastLoaded(false);

    api
      .getWeatherCurrentByFarm(selectedFarmId)
      .then((data: WeatherCurrentResponse) => {
        if (fetchId !== currentFetchId.current) return;
        setCurrentWeather(data ?? null);
      })
      .catch((err: unknown) => {
        if (fetchId !== currentFetchId.current) return;
        setCurrentError(
          err instanceof Error
            ? err.message
            : "Không thể tải dữ liệu thời tiết.",
        );
      })
      .finally(() => {
        if (fetchId !== currentFetchId.current) return;
        setLoadingCurrent(false);
      });
  }, [selectedFarmId]);

  // ── Manual forecast fetch — called only when user clicks the button ───────
  function loadForecast() {
    if (!selectedFarmId || loadingForecast) return;

    const fetchId = ++forecastFetchId.current;
    setLoadingForecast(true);
    setForecastError(null);
    setForecast([]);

    api
      .getWeatherForecastByFarm(selectedFarmId, forecastDays)
      .then((data) => {
        if (fetchId !== forecastFetchId.current) return;
        setForecast(data?.forecast ?? []);
        setForecastLoaded(true);
      })
      .catch((err: unknown) => {
        if (fetchId !== forecastFetchId.current) return;
        setForecastError(
          err instanceof Error
            ? err.message
            : "Không thể tải dự báo thời tiết.",
        );
      })
      .finally(() => {
        if (fetchId !== forecastFetchId.current) return;
        setLoadingForecast(false);
      });
  }

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

  const selectedFarm = farms.find((f) => f.farmId === selectedFarmId) ?? null;

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

          {/* Controls: farm selector */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Farm picker */}
            {loadingFarms ? (
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
          {farms.length === 0 && !loadingFarms ? (
            <EmptyState
              icon={MapPin}
              message="Chưa có trang trại nào. Hãy tạo trang trại trước."
            />
          ) : loadingCurrent ? (
            <LoadingState message="Đang tải dữ liệu thời tiết..." />
          ) : currentError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="w-10 h-10 rounded-card bg-status-warning-bg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-status-warning-fg" />
              </div>
              <p className="text-sm text-ink-500 max-w-xs">{currentError}</p>
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
                {!forecastLoaded && !loadingForecast ? (
                  /* Prompt row */
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-ink-400"></p>
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
                ) : loadingForecast ? (
                  <LoadingState message="Đang tải dự báo..." variant="inline" />
                ) : forecastError ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-status-danger-fg">
                      {forecastError}
                    </p>
                    <button
                      type="button"
                      onClick={loadForecast}
                      className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : forecast.length > 0 ? (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest">
                        Dự báo {forecastDays} ngày tới
                      </p>
                      {/* Allow reloading with a different day count */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-btn">
                          {([1, 3, 7] as ForecastDays[]).map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => {
                                setForecastDays(d);
                                setForecastLoaded(false);
                                setForecast([]);
                              }}
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
                      <StatusBadge label="Chưa thanh toán" tone="warning" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
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

      {/* High / low */}
      <div className="flex items-center gap-2 text-xs font-semibold">
        <span className="text-red-500">
          {day.maxTempC != null ? `${Math.round(day.maxTempC)}°` : "—"}
        </span>
        <span className="text-ink-300">/</span>
        <span className="text-blue-500">
          {day.minTempC != null ? `${Math.round(day.minTempC)}°` : "—"}
        </span>
      </div>

      {/* Rain chance */}
      <div className="flex items-center gap-1 text-xs text-ink-500">
        <Waves className="w-3 h-3 text-blue-400 shrink-0" />
        <span>{rainLabel(day.chanceOfRain)} mưa</span>
      </div>

      {/* Humidity */}
      <div className="flex items-center gap-1 text-xs text-ink-500">
        <Droplets className="w-3 h-3 text-blue-500 shrink-0" />
        <span>{day.avgHumidity != null ? `${day.avgHumidity}%` : "—"}</span>
      </div>

      {/* Sunrise / sunset if available */}
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
