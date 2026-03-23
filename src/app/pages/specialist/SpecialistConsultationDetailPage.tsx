import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  ClipboardEdit,
  MapPin,
  Thermometer,
  Droplets,
  CheckCircle2,
  ChevronDown,
  Upload,
  X,
  Lightbulb,
  Bot,
} from "lucide-react";
import {
  mockConsultationRequests,
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
  requestCode,
  onBack,
}: {
  requestCode: string;
  onBack: () => void;
}) {
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [priority, setPriority] = useState<Severity>("Trung bình");
  const [followUp, setFollowUp] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachments((prev) => [...prev, ...Array.from(e.target.files ?? [])]);
  };

  const handleSubmit = () => {
    if (!diagnosis.trim() || !treatment.trim()) return;
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
    <div className="space-y-6">
      {/* Context banner */}
      <div className="flex items-start gap-3 bg-[#f0fdf9] border border-[#009689]/20 rounded-xl p-4">
        <div className="w-8 h-8 bg-[#009689]/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
          <ClipboardEdit className="w-4 h-4 text-[#009689]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">
            Yêu cầu tư vấn: {requestCode}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Vui lòng điền đầy đủ thông tin chuyên môn để phản hồi cho nông dân.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-slate-800 mb-1">
            Nội dung tư vấn &amp; Điều trị
          </h3>
          <p className="text-sm text-slate-500">
            Vui lòng điền đầy đủ thông tin chuyên môn để phản hồi cho nông dân.
          </p>
        </div>

        {/* Diagnosis — maps to Recommendation.content + review_notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Chẩn đoán của chuyên gia <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <textarea
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              rows={4}
              placeholder="Nhập chi tiết chẩn đoán bệnh, nguyên nhân và tình trạng hiện tại..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]/30 resize-none"
            />
            <ClipboardEdit className="absolute right-3 top-3 w-4 h-4 text-slate-300" />
          </div>
        </div>

        {/* Treatment — maps to Recommendation.content */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Phương pháp điều trị khuyến nghị{" "}
            <span className="text-red-500">*</span>
          </label>
          <textarea
            value={treatment}
            onChange={(e) => setTreatment(e.target.value)}
            rows={5}
            placeholder="Liệt kê các bước xử lý, loại thuốc cần dùng, liều lượng và cách thức thực hiện..."
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]/30 resize-none"
          />
        </div>

        {/* Priority + Attachments */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Mức độ ưu tiên
            </label>
            <div className="relative">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Severity)}
                className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]/30 bg-white text-slate-700"
              >
                <option value="Thấp">Thấp</option>
                <option value="Trung bình">Trung bình</option>
                <option value="Cao">Cao</option>
                <option value="Nghiêm trọng">Nghiêm trọng</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tải lên tài liệu đính kèm
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-[#009689]/40 hover:bg-[#f0fdf9] transition-colors"
            >
              <Upload className="w-6 h-6 text-slate-400" />
              <span className="text-xs text-slate-400">
                Chọn hoặc kéo thả file tài liệu
              </span>
              <span className="text-xs text-slate-300">(PDF, JPG, PNG...)</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={handleFileChange}
            />
            {attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {attachments.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-1.5 text-xs text-slate-600"
                  >
                    <span className="truncate">{f.name}</span>
                    <button
                      onClick={() =>
                        setAttachments((prev) => prev.filter((_, j) => j !== i))
                      }
                    >
                      <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Follow-up advice */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Lời khuyên theo dõi
          </label>
          <textarea
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            rows={3}
            placeholder="Hướng dẫn nông dân cách theo dõi sau khi xử lý, các dấu hiệu cần lưu ý..."
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]/30 resize-none"
          />
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
            disabled={!diagnosis.trim() || !treatment.trim()}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#009689] text-white hover:bg-[#007f73] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ClipboardEdit className="w-4 h-4" />
            Gửi phản hồi chuyên gia
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
          requestCode={req.requestCode}
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
            Tạo phản hồi chuyên gia
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
              Phản hồi chuyên gia
            </h3>
            <span className="text-xs text-slate-400 ml-auto">
              {new Date(req.response.respondedAt).toLocaleDateString("vi-VN")}
            </span>
          </div>
          <div className="space-y-4 text-sm text-slate-600">
            <div>
              <p className="font-semibold text-slate-700 mb-1">Chẩn đoán</p>
              <p className="leading-relaxed">{req.response.diagnosis}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 mb-1">Điều trị</p>
              <pre className="whitespace-pre-wrap leading-relaxed font-sans">
                {req.response.content}
              </pre>
            </div>
            {req.response.followUpAdvice && (
              <div>
                <p className="font-semibold text-slate-700 mb-1">
                  Lời khuyên theo dõi
                </p>
                <p className="leading-relaxed">{req.response.followUpAdvice}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
