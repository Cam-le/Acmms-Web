import { useNavigate } from "react-router";
import {
  Mail,
  Bug,
  AlertTriangle,
  TrendingUp,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import {
  mockConsultationRequests,
  mockSpecialistStats,
  type Severity,
  type DetectionStatus,
} from "../../../data/mockSpecialistData";

function severityColor(s: Severity) {
  if (s === "Cao" || s === "Nghiêm trọng") return "text-red-600";
  if (s === "Trung bình") return "text-orange-500";
  return "text-green-600";
}

function statusDot(s: DetectionStatus) {
  if (s === "Chờ phản hồi") return "bg-yellow-400";
  if (s === "Đã phản hồi") return "bg-green-500";
  return "bg-blue-400";
}

function symptomBadgeColor(label: string) {
  const map: Record<string, string> = {
    "Đốm nâu": "bg-amber-100 text-amber-800",
    "Héo muộn": "bg-rose-100 text-rose-700",
    "Sâu đục lá": "bg-orange-100 text-orange-700",
    "Khảm lá": "bg-lime-100 text-lime-800",
    "Phấn trắng": "bg-slate-100 text-slate-700",
    "Đạo ôn lá": "bg-yellow-100 text-yellow-700",
    "Sâu keo": "bg-red-100 text-red-700",
    "Mốc sương": "bg-purple-100 text-purple-700",
  };
  return map[label] ?? "bg-gray-100 text-gray-700";
}

export function SpecialistDashboardPage() {
  const navigate = useNavigate();
  const stats = mockSpecialistStats;

  const pending = mockConsultationRequests
    .filter((r) => r.detectionStatus === "Chờ phản hồi")
    .slice(0, 5);

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
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Bảng điều khiển Chuyên gia
        </h1>
        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
          <span className="inline-block opacity-60">📅</span>
          {today} | {timeStr}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">
                Yêu cầu chờ phản hồi
              </p>
              <p className="text-4xl font-bold text-slate-800 mt-2">
                {stats.pendingCount}
              </p>
              <p className="text-xs text-[#009689] font-medium mt-2 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />+{stats.pendingNew} mới
              </p>
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
                Số ca phát hiện sâu bệnh
              </p>
              <p className="text-4xl font-bold text-slate-800 mt-2">
                {stats.totalDiseaseCases}
              </p>
              <p className="text-xs text-rose-500 font-medium mt-2 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Tăng {stats.diseaseCasesChangePercent}% tuần này
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
                {stats.urgentCount}
              </p>
              <p className="text-xs text-red-600 font-medium mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />! Cần xử lý gấp
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
            Yêu cầu tư vấn chưa xử lý
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
                  "Mã yêu cầu",
                  "Loại bắp cải",
                  "Tóm tắt AI",
                  "Mức độ",
                  "Ngày yêu cầu",
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
              {pending.map((req) => (
                <tr
                  key={req.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-slate-700">
                    {req.requestCode}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                      {req.crop}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${symptomBadgeColor(req.issue)}`}
                    >
                      {req.issue}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-4 text-sm font-semibold ${severityColor(req.severity)}`}
                  >
                    {req.severity}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-500">
                    {new Date(req.submittedAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-1.5 text-sm text-slate-500">
                      <span
                        className={`w-2 h-2 rounded-full ${statusDot(req.detectionStatus)}`}
                      />
                      {req.detectionStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() =>
                        navigate(`/specialist/consultations/${req.id}`)
                      }
                      className="px-4 py-2 bg-[#009689] text-white text-xs font-semibold rounded-lg hover:bg-[#007f73] transition-colors"
                    >
                      Xem Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
