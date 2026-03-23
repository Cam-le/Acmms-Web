import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  ClipboardEdit,
  MapPin,
  Thermometer,
  Droplets,
  CheckCircle2,
  ChevronDown,
  Lightbulb,
  Bot,
  AlertTriangle,
} from "lucide-react";
import {
  mockConsultationRequests,
  type ConsultationRequest,
  type Severity,
} from "../../../data/mockSpecialistData";

function severityBadgeCss(s: string) {
  if (s === "Cao" || s === "Nghiêm trọng")
    return "bg-orange-100 text-orange-700 border border-orange-200";
  if (s === "Trung bình")
    return "bg-orange-50 text-orange-500 border border-orange-100";
  return "bg-green-50 text-green-700 border border-green-200";
}

// ── Response Form ─────────────────────────────────────────────────────────────
function ResponseForm({
  req,
  onBack,
}: {
  req: ConsultationRequest;
  onBack: () => void;
}) {
  const [title, setTitle] = useState(`Phản hồi tư vấn ${req.requestCode}`);
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<Severity>("Trung bình");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">
          Phản hồi đã được gửi!
        </h2>
        <p className="text-sm text-slate-500 max-w-xs">
          Chủ nông trại sẽ nhận được phản hồi của bạn và xử lý theo khuyến nghị.
        </p>
        <button
          onClick={onBack}
          className="mt-2 px-6 py-2.5 bg-[#009689] text-white rounded-xl text-sm font-semibold hover:bg-[#007f73] transition-colors"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* ── Left: disease context (read-only reference) ── */}
      <div className="space-y-4">
        {/* AI Analysis */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#009689]" />
              <h3 className="font-semibold text-slate-800 text-sm">
                Phân tích từ AI
              </h3>
            </div>
            <span className="text-xs bg-[#009689]/10 text-[#009689] font-semibold px-2 py-0.5 rounded-full">
              {req.aiConfidence}% tin cậy
            </span>
          </div>

          <div className="bg-[#f0fdf9] rounded-xl p-3 border border-[#009689]/10 mb-3">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">
              Dự đoán bệnh
            </p>
            <p className="text-lg font-bold text-slate-800">
              {req.aiDiagnosis}
            </p>
            <span
              className={`inline-block mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${severityBadgeCss(req.severity)}`}
            >
              {req.severity}
            </span>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
              📋 Triệu chứng phát hiện:
            </p>
            <ul className="space-y-1.5">
              {req.aiSymptoms.map((s, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-sm text-slate-600"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#009689] shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* AI Recommendation */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            <h3 className="font-semibold text-slate-800 text-sm">
              Khuyến nghị từ AI
            </h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed bg-yellow-50 rounded-xl p-3 border border-yellow-100">
            {req.aiRecommendation}
          </p>
        </div>

        {/* Symptom description from farm */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <h3 className="font-semibold text-slate-800 text-sm">
              Mô tả từ nông trại
            </h3>
          </div>
          <div className="space-y-2 text-xs text-slate-500 mb-3">
            <p className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-red-400 shrink-0" />
              {req.location}
            </p>
            <p className="flex items-center gap-1.5">
              🌱 {req.crop} · Giai đoạn: {req.growthStage}
            </p>
            {req.temperature && (
              <p className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Thermometer className="w-3 h-3" />
                  {req.temperature}°C
                </span>
                <span className="flex items-center gap-1">
                  <Droplets className="w-3 h-3" />
                  {req.humidity}%
                </span>
              </p>
            )}
          </div>
          <p className="text-sm text-slate-600 italic leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">
            "{req.symptomDescription}"
          </p>
        </div>
      </div>

      {/* ── Right: write response ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
        <div>
          <h3 className="font-semibold text-slate-800 mb-0.5">
            Nội dung tư vấn &amp; Điều trị
          </h3>
          <p className="text-xs text-slate-400">
            Vui lòng điền đầy đủ thông tin chuyên môn để phản hồi cho nông dân.
          </p>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Tiêu đề <span className="text-red-500">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]/30"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Nội dung tư vấn <span className="text-red-500">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            placeholder="Nhập chẩn đoán, phương pháp điều trị và lời khuyên theo dõi..."
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]/30 resize-none"
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Mức độ ưu tiên
          </label>
          <div className="relative">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Severity)}
              className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]/30 bg-white text-slate-700"
            >
              <option value="Thấp">Thấp</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Cao">Cao</option>
              <option value="Nghiêm trọng">Nghiêm trọng</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim()}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#009689] text-white hover:bg-[#007f73] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ClipboardEdit className="w-4 h-4" />
            Gửi phản hồi
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function SpecialistConsultationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showResponseForm, setShowResponseForm] = useState(false);

  const req = mockConsultationRequests.find((r) => r.id === id);

  if (!req) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
        <p className="text-lg font-medium">Không tìm thấy yêu cầu tư vấn.</p>
        <button
          onClick={() => navigate("/specialist/consultations")}
          className="text-sm text-[#009689] hover:underline"
        >
          ← Quay lại danh sách
        </button>
      </div>
    );
  }

  if (showResponseForm) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setShowResponseForm(false)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại yêu cầu {req.requestCode}
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Tạo phản hồi</h1>
        <ResponseForm
          req={req}
          onBack={() => navigate("/specialist/consultations")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/specialist/consultations")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </button>
        {req.detectionStatus === "Chờ phản hồi" && (
          <button
            onClick={() => setShowResponseForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#009689] text-white text-sm font-semibold rounded-xl hover:bg-[#007f73] transition-colors"
          >
            <ClipboardEdit className="w-4 h-4" />
            Tạo phản hồi
          </button>
        )}
      </div>

      <h1 className="text-2xl font-bold text-slate-800">
        Chi tiết tư vấn {req.requestCode}
      </h1>

      {/* Farm Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-[#009689]/10 flex items-center justify-center text-sm">
            👤
          </div>
          <h2 className="font-semibold text-slate-800">
            Thông tin từ chủ nông trại
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
          <div>
            <p className="text-slate-400 text-xs mb-1">Mã yêu cầu</p>
            <p className="font-semibold text-slate-700">{req.requestCode}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">Thời gian gửi</p>
            <p className="font-semibold text-slate-700">
              {new Date(req.submittedAt).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              -{" "}
              {new Date(req.submittedAt).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
              })}
            </p>
          </div>
          <div>
            {/* crop aligns with AdvisoryRequest.crop */}
            <p className="text-slate-400 text-xs mb-1">Loại cây trồng</p>
            <p className="font-semibold text-slate-700">{req.crop}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">Giai đoạn</p>
            <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
              {req.growthStage}
            </span>
          </div>
        </div>

        <div className="mb-4">
          {/* location aligns with AdvisoryRequest.field */}
          <p className="text-slate-400 text-xs mb-1">Vị trí</p>
          <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-red-500" />
            {req.location}
          </p>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <p className="text-slate-400 text-xs mb-2">Mô tả triệu chứng</p>
          {/* symptomDescription aligns with AdvisoryRequest detail description */}
          <p className="text-sm text-slate-600 italic leading-relaxed">
            "{req.symptomDescription}"
          </p>
        </div>
      </div>

      {/* Image + AI Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Image placeholder */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="relative bg-slate-900 h-72 flex items-center justify-center">
            <div className="text-slate-500 text-center">
              <div className="w-16 h-16 bg-slate-700 rounded-xl mx-auto mb-3 flex items-center justify-center">
                <span className="text-2xl">📸</span>
              </div>
              <p className="text-sm">Ảnh gốc từ nông trại</p>
              {req.temperature && (
                <span className="flex items-center justify-center gap-3 mt-2 text-slate-400 text-xs">
                  <span className="flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5" /> {req.temperature}°C
                  </span>
                  <span className="flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5" /> {req.humidity}%
                  </span>
                </span>
              )}
            </div>
            <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-lg">
              📸 Ảnh gốc
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 py-3 border-t border-slate-100">
            {["🔍+", "🔍-", "↺", "↻"].map((icon, i) => (
              <button
                key={i}
                className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-sm text-slate-500 hover:bg-slate-50"
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* AI Analysis — maps to ImageAnalysesResult */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#009689]" />
              <h3 className="font-semibold text-slate-800">Phân tích từ AI</h3>
            </div>
            <span className="text-xs bg-[#009689]/10 text-[#009689] font-semibold px-2.5 py-1 rounded-full">
              Model v2.4
            </span>
          </div>

          <div className="bg-[#f0fdf9] rounded-xl p-4 border border-[#009689]/10 mb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Dự đoán bệnh
              </p>
              {/* aiConfidence ↔ ImageAnalysesResult.ai_confidence */}
              <span className="text-sm font-bold text-[#009689]">
                {req.aiConfidence}% Tin cậy
              </span>
            </div>
            {/* aiDiagnosis ↔ ImageAnalysesResult.ai_label */}
            <p className="text-xl font-bold text-slate-800 mt-1">
              {req.aiDiagnosis}
            </p>
          </div>

          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">Trạng thái</p>
            {/* severity ↔ Pest_Detections.general_severity */}
            <span
              className={`text-sm font-semibold px-3 py-1 rounded-full ${severityBadgeCss(req.severity)}`}
            >
              {req.severity === "Cao" ? "Cao (Level 2)" : req.severity}
            </span>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-1.5">
              📋 Triệu chứng phát hiện:
            </p>
            <ul className="space-y-2">
              {req.aiSymptoms.map((symptom, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-sm text-slate-600"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#009689] shrink-0" />
                  {symptom}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* AI Recommendation */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          <h3 className="font-semibold text-slate-800">Khuyến nghị từ AI</h3>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed bg-yellow-50 rounded-xl p-4 border border-yellow-100">
          {req.aiRecommendation}
        </p>
        <p className="text-xs text-slate-400 mt-3">
          * Đây là gợi ý từ AI. Chuyên gia vui lòng xác nhận và bổ sung theo
          kinh nghiệm thực tế.
        </p>
      </div>

      {/* Existing specialist response (if already responded) */}
      {req.response && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#009689]/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardEdit className="w-5 h-5 text-[#009689]" />
            <h3 className="font-semibold text-slate-800">
              {req.response.title}
            </h3>
            <span className="text-xs text-slate-400 ml-auto">
              {new Date(req.response.respondedAt).toLocaleDateString("vi-VN")}
            </span>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-slate-600 leading-relaxed font-sans">
            {req.response.content}
          </pre>
        </div>
      )}
    </div>
  );
}
