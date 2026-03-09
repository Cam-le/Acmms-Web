import { useState } from "react";
import {
  Droplets,
  Sprout,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  Calendar,
  Eye,
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

const alertTypeConfig = {
  disease: {
    icon: "🦠",
    color: "bg-[#fee2e2] text-[#991b1b]",
    label: "BỆNH NGHỆ NGÕ",
  },
  maintenance: {
    icon: "🔧",
    color: "bg-[#dbeafe] text-[#1e40af]",
    label: "BẢO DƯỠNG",
  },
  harvest: {
    icon: "🌾",
    color: "bg-[#dcfce7] text-[#008236]",
    label: "THU HOẠCH",
  },
};

export function DashboardPage() {
  const [selectedYear, setSelectedYear] = useState("2024");
  const [selectedSeason, setSelectedSeason] = useState("Vụ Đông Xuân");

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
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

          <button className="px-4 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Báo cáo
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Area */}
        <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#dbeafe] rounded-lg flex items-center justify-center">
                <Droplets className="w-6 h-6 text-[#1e40af]" />
              </div>
              <div>
                <div className="text-sm text-[#62748e]">Tổng diện tích</div>
                <div className="text-2xl font-bold text-[#115e59]">
                  120.5 <span className="text-base font-normal">ha</span>
                </div>
              </div>
            </div>
            <div className="px-2.5 py-1 bg-[#f1f5f9] text-[#62748e] rounded text-xs font-medium">
              Thực tế
            </div>
          </div>
        </div>

        {/* Available Plots */}
        <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#dcfce7] rounded-lg flex items-center justify-center">
                <Sprout className="w-6 h-6 text-[#008236]" />
              </div>
              <div>
                <div className="text-sm text-[#62748e]">Sản lượng dự kiến</div>
                <div className="text-2xl font-bold text-[#115e59]">
                  850 <span className="text-base font-normal">tấn</span>
                </div>
              </div>
            </div>
            <div className="px-2.5 py-1 bg-[#dcfce7] text-[#008236] rounded text-xs font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +12%
            </div>
          </div>
        </div>

        {/* Total Workers */}
        <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#f8f5ff] rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-[#7c3aed]" />
              </div>
              <div>
                <div className="text-sm text-[#62748e]">Tổng số nhân viên</div>
                <div className="text-2xl font-bold text-[#115e59]">
                  24 <span className="text-base font-normal">nhân viên</span>
                </div>
              </div>
            </div>
            <div className="px-2.5 py-1 bg-[#f1f5f9] text-[#62748e] rounded text-xs font-medium">
              Nhân sự
            </div>
          </div>
        </div>
      </div>

      {/* Yield Chart */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#115e59] mb-2">
            Năng suất bắp cải theo mùa vụ và biến thể (tấn/ha)
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#86efac] rounded"></div>
              <span className="text-[#62748e]">Bắp Cải Trắng</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#14b8a6] rounded"></div>
              <span className="text-[#62748e]">Bắp Cải Tím</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#115e59] rounded"></div>
              <span className="text-[#62748e]">Bắp Cải Xoăn</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
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
              id="bar-bapcaitrang"
              dataKey="bapcaitrang"
              name="Bắp Cải Trắng"
              fill="#86efac"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              id="bar-bapcaitim"
              dataKey="bapcaitim"
              name="Bắp Cải Tím"
              fill="#14b8a6"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              id="bar-bapcaixoan"
              dataKey="bapcaixoan"
              name="Bắp Cải Xoăn"
              fill="#115e59"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 flex items-start gap-2 text-sm text-[#62748e] p-4 bg-[#f8fafc] rounded-lg">
          <div className="w-5 h-5 shrink-0 mt-0.5">ℹ️</div>
          <p>
            Biểu đồ thể hiện năng suất trung bình trên mỗi hecta của từng biến
            thể bắp cải theo mùa vụ, giúp đánh giá hiệu quả thực hiện so với kế
            hoạch.
          </p>
        </div>
      </div>

      {/* Recent Alerts */}
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

        {/* Alert List */}
        <div className="space-y-4">
          {recentAlerts.map((alert) => {
            const config =
              alertTypeConfig[alert.type as keyof typeof alertTypeConfig];
            return (
              <div
                key={alert.id}
                className="flex items-start gap-4 p-4 bg-[#f8fafc] rounded-lg hover:bg-[#f1f5f9] transition-colors"
              >
                {/* Icon */}
                <div className="text-3xl">{config.icon}</div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-[#115e59] mb-1">
                        {alert.title}
                      </h3>
                      <p className="text-sm text-[#62748e]">
                        {alert.description}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-medium ${config.color}`}
                    >
                      {config.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#62748e]">
                    <div className="flex items-center gap-1">
                      <Sprout className="w-3.5 h-3.5" />
                      <span>{alert.crop}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>📍</span>
                      <span>{alert.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Mức độ: {alert.severity}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{alert.time}</span>
                    </div>
                  </div>
                </div>

                {/* Action */}
                <button className="p-2 text-[#009689] hover:bg-[#f0fdf9] rounded-lg transition-colors">
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
