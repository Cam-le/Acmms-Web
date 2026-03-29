import { useState } from "react";
import type { ElementType } from "react";
import {
  LandPlot,
  Sprout,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  Calendar,
  Eye,
  ShieldAlert,
  Bug,
  Wrench,
  Wheat,
  MapPin,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { yieldData, recentAlerts } from "../../data/mockData";

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertType = "disease" | "maintenance" | "harvest";
type AlertSeverity = "CAO" | "TRUNG BÌNH" | "THẤP";

interface Alert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  crop: string;
  location: string;
  severity: AlertSeverity;
  time: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const alertTypeConfig: Record<
  AlertType,
  {
    icon: ElementType;
    iconColor: string;
    iconBg: string;
    label: string;
    badgeColor: string;
  }
> = {
  disease: {
    icon: Bug,
    iconColor: "text-[#991b1b]",
    iconBg: "bg-[#fee2e2]",
    label: "PHÁT HIỆN BỆNH",
    badgeColor: "bg-[#fee2e2] text-[#991b1b]",
  },
  maintenance: {
    icon: Wrench,
    iconColor: "text-[#1e40af]",
    iconBg: "bg-[#dbeafe]",
    label: "BẢO DƯỠNG",
    badgeColor: "bg-[#dbeafe] text-[#1e40af]",
  },
  harvest: {
    icon: Wheat,
    iconColor: "text-[#008236]",
    iconBg: "bg-[#dcfce7]",
    label: "THU HOẠCH",
    badgeColor: "bg-[#dcfce7] text-[#008236]",
  },
};

// Keys match the uppercase severity strings in mockData.ts
const severityConfig: Record<AlertSeverity, { color: string; dot: string }> = {
  CAO: { color: "text-[#991b1b]", dot: "bg-[#ef4444]" },
  "TRUNG BÌNH": { color: "text-[#92400e]", dot: "bg-[#f59e0b]" },
  THẤP: { color: "text-[#065f46]", dot: "bg-[#10b981]" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [selectedYear, setSelectedYear] = useState("2024");
  const [selectedSeason, setSelectedSeason] = useState("Vụ Đông Xuân");

  const alerts = recentAlerts as Alert[];
  const diseaseAlerts = alerts.filter((a) => a.type === "disease");
  const otherAlerts = alerts.filter((a) => a.type !== "disease");
  const unresolvedCount = diseaseAlerts.length;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-[#115e59] text-2xl font-semibold">
          Tổng quan trang trại
        </h1>
        <div className="flex gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm"
          >
            <option value="2024">Năm 2024</option>
            <option value="2023">Năm 2023</option>
            <option value="2022">Năm 2022</option>
          </select>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm"
          >
            <option value="Vụ Đông Xuân">Vụ Đông Xuân</option>
            <option value="Vụ Hè Thu">Vụ Hè Thu</option>
            <option value="Vụ Thu Đông">Vụ Thu Đông</option>
          </select>
          <button className="px-4 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4" />
            Báo cáo
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Total Area */}
        <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 bg-[#dbeafe] rounded-lg flex items-center justify-center shrink-0">
              <LandPlot className="w-5 h-5 text-[#1e40af]" />
            </div>
            <div className="text-sm text-[#62748e]">Tổng diện tích</div>
          </div>
          <div className="text-2xl font-bold text-[#115e59]">
            120.5{" "}
            <span className="text-base font-normal text-[#62748e]">ha</span>
          </div>
          <div className="mt-2 text-xs text-[#62748e]">
            Diện tích canh tác thực tế
          </div>
        </div>

        {/* Estimated Yield */}
        <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 bg-[#dcfce7] rounded-lg flex items-center justify-center shrink-0">
              <Sprout className="w-5 h-5 text-[#008236]" />
            </div>
            <div className="text-sm text-[#62748e]">Sản lượng dự kiến</div>
          </div>
          <div className="text-2xl font-bold text-[#115e59]">
            850{" "}
            <span className="text-base font-normal text-[#62748e]">tấn</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-[#008236]">
            <TrendingUp className="w-3 h-3" />
            +12% so với vụ trước
          </div>
        </div>

        {/* Total Staff */}
        <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 bg-[#f8f5ff] rounded-lg flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-[#7c3aed]" />
            </div>
            <div className="text-sm text-[#62748e]">Tổng nhân viên</div>
          </div>
          <div className="text-2xl font-bold text-[#115e59]">
            24{" "}
            <span className="text-base font-normal text-[#62748e]">người</span>
          </div>
          <div className="mt-2 text-xs text-[#62748e]">Đang hoạt động</div>
        </div>

        {/* Unresolved AI Detections */}
        <div
          className={`rounded-lg border shadow-sm p-6 ${
            unresolvedCount > 0
              ? "bg-[#fff7f7] border-[#fecaca]"
              : "bg-white border-[#e2e8f0]"
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
                unresolvedCount > 0 ? "bg-[#fee2e2]" : "bg-[#f1f5f9]"
              }`}
            >
              <ShieldAlert
                className={`w-5 h-5 ${
                  unresolvedCount > 0 ? "text-[#dc2626]" : "text-[#64748b]"
                }`}
              />
            </div>
            <div className="text-sm text-[#62748e]">
              Phát hiện bệnh chưa xử lý
            </div>
          </div>
          <div
            className={`text-2xl font-bold ${
              unresolvedCount > 0 ? "text-[#dc2626]" : "text-[#115e59]"
            }`}
          >
            {unresolvedCount}{" "}
            <span className="text-base font-normal text-[#62748e]">
              cảnh báo
            </span>
          </div>
          <div className="mt-2 text-xs text-[#62748e]">
            {unresolvedCount > 0
              ? "Cần xem xét và xử lý ngay"
              : "Không có cảnh báo mới"}
          </div>
        </div>
      </div>

      {/* ── Yield Chart ── */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#115e59] mb-2">
            Năng suất bắp cải theo mùa vụ và biến thể (tấn/ha)
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#86efac] rounded" />
              <span className="text-[#62748e]">Bắp Cải Trắng</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#14b8a6] rounded" />
              <span className="text-[#62748e]">Bắp Cải Tím</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#115e59] rounded" />
              <span className="text-[#62748e]">Bắp Cải Xoăn</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={380}>
          <BarChart
            data={yieldData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="season"
              tick={{ fill: "#62748e", fontSize: 12 }}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <YAxis
              tick={{ fill: "#62748e", fontSize: 12 }}
              axisLine={{ stroke: "#e2e8f0" }}
              label={{
                value: "Tấn/ha",
                angle: -90,
                position: "insideLeft",
                style: { fill: "#62748e", fontSize: 12 },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#115e59", fontWeight: "bold" }}
              formatter={(value, name) => {
                const labels: Record<string, string> = {
                  bapcaitrang: "Bắp Cải Trắng",
                  bapcaitim: "Bắp Cải Tím",
                  bapcaixoan: "Bắp Cải Xoăn",
                };
                return [value, labels[name as string] ?? name];
              }}
            />
            <Bar
              dataKey="bapcaitrang"
              name="Bắp Cải Trắng"
              fill="#86efac"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="bapcaitim"
              name="Bắp Cải Tím"
              fill="#14b8a6"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="bapcaixoan"
              name="Bắp Cải Xoăn"
              fill="#115e59"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 flex items-start gap-2 text-sm text-[#62748e] p-4 bg-[#f8fafc] rounded-lg">
          <span>ℹ️</span>
          <p>
            Biểu đồ thể hiện năng suất trung bình trên mỗi hecta của từng biến
            thể bắp cải theo mùa vụ, giúp đánh giá hiệu quả thực hiện so với kế
            hoạch.
          </p>
        </div>
      </div>

      {/* ── AI Alerts ── */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#115e59] mb-1">
              Báo cáo AI mới nhất
            </h2>
            <p className="text-sm text-[#62748e]">
              Phát hiện bệnh & khuyến nghị xử lý
            </p>
          </div>
          <button className="text-[#009689] text-sm hover:underline font-medium">
            Xem tất cả →
          </button>
        </div>

        {/* Disease alerts — urgent tier */}
        {diseaseAlerts.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-[#dc2626]" />
              <span className="text-sm font-semibold text-[#dc2626]">
                Cần xử lý ngay ({diseaseAlerts.length})
              </span>
            </div>
            <div className="space-y-3">
              {diseaseAlerts.map((alert) => (
                <AlertRow key={alert.id} alert={alert} urgent />
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        {diseaseAlerts.length > 0 && otherAlerts.length > 0 && (
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[#e2e8f0]" />
            <span className="text-xs text-[#94a3b8] font-medium">
              THÔNG TIN KHÁC
            </span>
            <div className="flex-1 h-px bg-[#e2e8f0]" />
          </div>
        )}

        {/* Maintenance / harvest — informational tier */}
        {otherAlerts.length > 0 && (
          <div className="space-y-3">
            {otherAlerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} urgent={false} />
            ))}
          </div>
        )}

        {alerts.length === 0 && (
          <div className="text-center py-10 text-[#94a3b8] text-sm">
            Không có báo cáo mới
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AlertRow sub-component ───────────────────────────────────────────────────

function AlertRow({ alert, urgent }: { alert: Alert; urgent: boolean }) {
  const config = alertTypeConfig[alert.type];
  const sev = severityConfig[alert.severity];

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${
        urgent
          ? "bg-[#fff7f7] border border-[#fecaca] hover:bg-[#fee2e2]"
          : "bg-[#f8fafc] hover:bg-[#f1f5f9]"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${config.iconBg}`}
      >
        <config.icon className={`w-5 h-5 ${config.iconColor}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-semibold text-[#115e59] text-sm">
            {alert.title}
          </h3>
          <span
            className={`px-2.5 py-0.5 rounded text-xs font-medium shrink-0 ${config.badgeColor}`}
          >
            {config.label}
          </span>
        </div>
        <p className="text-sm text-[#62748e] mb-2">{alert.description}</p>
        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-[#62748e]">
          <span className="flex items-center gap-1">
            <Sprout className="w-3.5 h-3.5" /> {alert.crop}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> {alert.location}
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
            <span className={sev.color}>Mức độ: {alert.severity}</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {alert.time}
          </span>
        </div>
      </div>

      <button
        className={`p-2 rounded-lg transition-colors shrink-0 ${
          urgent
            ? "text-[#dc2626] hover:bg-[#fee2e2]"
            : "text-[#009689] hover:bg-[#f0fdf9]"
        }`}
        title="Xem chi tiết"
      >
        <Eye className="w-5 h-5" />
      </button>
    </div>
  );
}
