import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  ClipboardEdit,
  CheckCircle2,
  ChevronDown,
  Lightbulb,
  Bot,
  AlertTriangle,
  Loader2,
  RefreshCw,
  AlertCircle,
  User,
  Calendar,
  FileText,
} from "lucide-react";
import {
  api,
  type ReportResponse,
  type DiagnosisResponse,
  type AiResultParsed,
} from "../../../api/client";
import { mockConsultationRequests } from "../../../data/mockSpecialistData";

// ── Helpers ───────────────────────────────────────────────────────────────────
function severityLabel(s: string) {
  if (s === "CRITICAL") return "Nghiêm trọng";
  if (s === "HIGH") return "Cao";
  if (s === "MEDIUM") return "Trung bình";
  if (s === "LOW") return "Thấp";
  return s;
}

function severityBadgeCss(s: string) {
  if (s === "CRITICAL") return "bg-red-50 text-red-700 border border-red-200";
  if (s === "HIGH")
    return "bg-orange-50 text-orange-700 border border-orange-200";
  if (s === "MEDIUM")
    return "bg-yellow-50 text-yellow-700 border border-yellow-200";
  return "bg-green-50 text-green-700 border border-green-200";
}

function reportTypeLabel(t: string) {
  if (t === "DISEASE" || t === "Diseases") return "Bệnh cây";
  if (t === "ENVIRONMENT") return "Môi trường";
  return t;
}

function parseAiJson(raw?: string): AiResultParsed | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AiResultParsed;
  } catch {
    return null;
  }
}

// ── Mock fallback builder ─────────────────────────────────────────────────────
function buildMockReport(id: string): ReportResponse | null {
  const m = mockConsultationRequests.find((r) => r.id === id);
  if (!m) return null;
  return {
    reportId: m.id,
    reportNo: m.requestCode,
    createdBy: "",
    creatorName: m.farmName,
    ownerId: "",
    ownerName: m.farmName,
    title: `${m.aiDiagnosis} trên ${m.crop}`,
    description: m.symptomDescription,
    reportType: "DISEASE",
    plotId: "",
    bedId: "",
    seasonId: "",
    status: "ASSIGNED_FOR_DIAGNOSIS",
    createdAt: m.submittedAt,
    submitDate: m.submittedAt,
    aiResultsJson: JSON.stringify({
      diseaseName: m.aiDiagnosis,
      confidence: m.aiConfidence / 100,
      symptoms: m.aiSymptoms,
      treatment: [m.aiRecommendation],
      description: m.symptomDescription,
      isHealthy: false,
    }),
  };
}

// ── Diagnosis Form ────────────────────────────────────────────────────────────
function DiagnosisForm({
  report,
  ai,
  isMockData,
  onSuccess,
  onCancel,
}: {
  report: ReportResponse;
  ai: AiResultParsed | null;
  isMockData: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [diseaseName, setDiseaseName] = useState(ai?.diseaseName ?? "");
  const [conclusion, setConclusion] = useState("");
  const [recommendedAction, setRecommendedAction] = useState("");
  const [severityLevel, setSeverityLevel] = useState("HIGH");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit =
    diseaseName.trim() &&
    conclusion.trim() &&
    recommendedAction.trim() &&
    severityLevel;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (!isMockData) {
        await api.createDiagnosis(report.reportId, {
          diseaseName: diseaseName.trim(),
          conclusion: conclusion.trim(),
          recommendedAction: recommendedAction.trim(),
          severityLevel,
        });
      } else {
        // Mock: simulate latency
        await new Promise((r) => setTimeout(r, 600));
      }
      setDone(true);
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Gửi chẩn đoán thất bại.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Chẩn đoán đã gửi!</h2>
        <p className="text-sm text-slate-500 max-w-xs">
          Chủ nông trại sẽ nhận được kết quả chẩn đoán và khuyến nghị điều trị
          từ bạn.
        </p>
        <button
          onClick={onSuccess}
          className="mt-2 px-6 py-2.5 bg-[#009689] text-white rounded-xl text-sm font-semibold hover:bg-[#007f73] transition-colors"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Left: AI context for reference */}
      <div className="space-y-4">
        {ai && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#009689]" />
                  <h3 className="font-semibold text-slate-800 text-sm">
                    Phân tích từ AI
                  </h3>
                </div>
                {ai.confidence !== undefined && (
                  <span className="text-xs bg-[#009689]/10 text-[#009689] font-semibold px-2 py-0.5 rounded-full">
                    {Math.round(ai.confidence * 100)}% tin cậy
                  </span>
                )}
              </div>
              {ai.diseaseName && (
                <div className="bg-[#f0fdf9] rounded-xl p-3 border border-[#009689]/10 mb-3">
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">
                    Dự đoán bệnh
                  </p>
                  <p className="text-base font-bold text-slate-800">
                    {ai.diseaseName}
                  </p>
                </div>
              )}
              {ai.description && (
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  {ai.description}
                </p>
              )}
              {ai.symptoms && ai.symptoms.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">
                    📋 Triệu chứng phát hiện:
                  </p>
                  <ul className="space-y-1.5">
                    {ai.symptoms.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-slate-600"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#009689] shrink-0 mt-0.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {ai.treatment && ai.treatment.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">
                    Khuyến nghị từ AI
                  </h3>
                </div>
                <ul className="space-y-1.5 bg-yellow-50 rounded-xl p-3 border border-yellow-100">
                  {ai.treatment.map((t, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-slate-600"
                    >
                      <span className="text-yellow-500 shrink-0 font-bold">
                        {i + 1}.
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-slate-400 mt-2">
                  * Gợi ý từ AI — chuyên gia vui lòng xác nhận theo kinh nghiệm
                  thực tế.
                </p>
              </div>
            )}
          </>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <h3 className="font-semibold text-slate-800 text-sm">
              Mô tả từ nông trại
            </h3>
          </div>
          <p className="text-sm text-slate-600 italic leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">
            "{report.description}"
          </p>
        </div>
      </div>

      {/* Right: diagnosis form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
        <div>
          <h3 className="font-semibold text-slate-800 mb-0.5">
            Kết quả chẩn đoán chuyên gia
          </h3>
          <p className="text-xs text-slate-400">
            Điền đầy đủ thông tin chuyên môn để gửi kết quả cho chủ nông trại.
          </p>
        </div>

        {submitError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {submitError}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Tên bệnh <span className="text-red-500">*</span>
          </label>
          <input
            value={diseaseName}
            onChange={(e) => setDiseaseName(e.target.value)}
            placeholder="Ví dụ: Bệnh úng rễ (Soft-rot)"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]/30"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Kết luận chẩn đoán <span className="text-red-500">*</span>
          </label>
          <textarea
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
            rows={4}
            placeholder="Mô tả kết luận chuyên môn về tình trạng bệnh..."
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]/30 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Biện pháp xử lý đề xuất <span className="text-red-500">*</span>
          </label>
          <textarea
            value={recommendedAction}
            onChange={(e) => setRecommendedAction(e.target.value)}
            rows={4}
            placeholder="Nêu rõ thuốc, phương pháp, lịch trình xử lý cụ thể..."
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]/30 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Mức độ nghiêm trọng <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={severityLevel}
              onChange={(e) => setSeverityLevel(e.target.value)}
              className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]/30 bg-white text-slate-700"
            >
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
              <option value="CRITICAL">Nghiêm trọng</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#009689] text-white hover:bg-[#007f73] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <ClipboardEdit className="w-4 h-4" />
                Gửi chẩn đoán
              </>
            )}
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

  const [report, setReport] = useState<ReportResponse | null>(null);
  const [existingDiagnoses, setExistingDiagnoses] = useState<
    DiagnosisResponse[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [isMockData, setIsMockData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function loadData() {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [r, diags] = await Promise.all([
        api.getReport(id),
        api.getReportDiagnosis(id).catch(() => [] as DiagnosisResponse[]),
      ]);
      setReport(r);
      setExistingDiagnoses(diags);
      setIsMockData(false);
    } catch {
      const mock = buildMockReport(id);
      if (mock) {
        setReport(mock);
        setExistingDiagnoses([]);
        setIsMockData(true);
      } else {
        setLoadError("Không tìm thấy báo cáo.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm">Đang tải báo cáo...</span>
      </div>
    );
  }

  if (loadError || !report) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm">{loadError ?? "Không tìm thấy báo cáo."}</p>
        <button
          onClick={() => navigate("/specialist/consultations")}
          className="text-sm text-[#009689] hover:underline"
        >
          ← Quay lại danh sách
        </button>
      </div>
    );
  }

  const ai = parseAiJson(report.aiResultsJson);
  const aiConfidence =
    ai?.confidence !== undefined ? Math.round(ai.confidence * 100) : null;

  if (showForm) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setShowForm(false)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại {report.reportNo}
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Tạo chẩn đoán</h1>
        {isMockData && (
          <span className="inline-flex text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
            Dữ liệu mẫu — POST sẽ không thực sự được gửi
          </span>
        )}
        <DiagnosisForm
          report={report}
          ai={ai}
          isMockData={isMockData}
          onSuccess={() => navigate("/specialist/consultations")}
          onCancel={() => setShowForm(false)}
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
        <div className="flex items-center gap-2">
          {isMockData && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
              Dữ liệu mẫu
            </span>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#009689] text-white text-sm font-semibold rounded-xl hover:bg-[#007f73] transition-colors"
          >
            <ClipboardEdit className="w-4 h-4" />
            Tạo chẩn đoán
          </button>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">{report.title}</h1>
        <p className="text-sm font-mono text-slate-400 mt-0.5">
          {report.reportNo}
        </p>
      </div>

      {/* Report Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-[#009689]" />
          <h2 className="font-semibold text-slate-800">Thông tin báo cáo</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
          <div>
            <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
              <User className="w-3 h-3" /> Người tạo
            </p>
            <p className="font-semibold text-slate-700">{report.creatorName}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
              <User className="w-3 h-3" /> Chủ nông trại
            </p>
            <p className="font-semibold text-slate-700">{report.ownerName}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Ngày gửi
            </p>
            <p className="font-semibold text-slate-700">
              {new Date(report.submitDate).toLocaleString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">Loại báo cáo</p>
            <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
              {reportTypeLabel(report.reportType)}
            </span>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <p className="text-slate-400 text-xs mb-1">
            Mô tả triệu chứng từ nông trại
          </p>
          <p className="text-sm text-slate-600 italic leading-relaxed">
            "{report.description}"
          </p>
        </div>
      </div>

      {/* AI Analysis */}
      {ai && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AI diagnosis summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#009689]" />
                <h3 className="font-semibold text-slate-800">
                  Phân tích từ AI
                </h3>
              </div>
              {aiConfidence !== null && (
                <span className="text-xs bg-[#009689]/10 text-[#009689] font-semibold px-2.5 py-1 rounded-full">
                  {aiConfidence}% tin cậy
                </span>
              )}
            </div>

            {ai.diseaseName && (
              <div className="bg-[#f0fdf9] rounded-xl p-4 border border-[#009689]/10 mb-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                  Dự đoán bệnh
                </p>
                <p className="text-xl font-bold text-slate-800">
                  {ai.diseaseName}
                </p>
                <span
                  className={`inline-block mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    ai.isHealthy
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {ai.isHealthy ? "Cây khỏe mạnh" : "Phát hiện bệnh"}
                </span>
              </div>
            )}

            {ai.description && (
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                {ai.description}
              </p>
            )}

            {ai.symptoms && ai.symptoms.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-1.5">
                  📋 Triệu chứng phát hiện:
                </p>
                <ul className="space-y-2">
                  {ai.symptoms.map((symptom, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-slate-600"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#009689] shrink-0 mt-0.5" />
                      {symptom}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* AI treatment */}
          {ai.treatment && ai.treatment.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold text-slate-800">
                  Khuyến nghị từ AI
                </h3>
              </div>
              <ul className="space-y-2.5">
                {ai.treatment.map((t, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-slate-600 bg-yellow-50 rounded-xl p-3 border border-yellow-100"
                  >
                    <span className="font-bold text-yellow-600 shrink-0">
                      {i + 1}.
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400 mt-3">
                * Đây là gợi ý từ AI. Chuyên gia vui lòng xác nhận và bổ sung
                theo kinh nghiệm thực tế.
              </p>
            </div>
          )}
        </div>
      )}

      {/* No AI data notice */}
      {!ai && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <h3 className="font-semibold text-slate-800">
              Không có dữ liệu AI
            </h3>
          </div>
          <p className="text-sm text-slate-500">
            Báo cáo này không có kết quả phân tích từ AI. Vui lòng chẩn đoán dựa
            trên mô tả của nông trại.
          </p>
        </div>
      )}

      {/* Existing diagnoses */}
      {existingDiagnoses.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <ClipboardEdit className="w-4 h-4 text-[#009689]" />
            Chẩn đoán đã có ({existingDiagnoses.length})
          </h2>
          {existingDiagnoses.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-2xl shadow-sm border border-[#009689]/20 p-6"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-800">
                    {d.diseaseName}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Bởi: {d.diagnoserName} ·{" "}
                    {new Date(d.createdAt).toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${severityBadgeCss(d.severityLevel)}`}
                >
                  {severityLabel(d.severityLevel)}
                </span>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">
                    Kết luận
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {d.conclusion}
                  </p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                  <p className="text-xs text-green-600 mb-1 font-medium uppercase tracking-wide">
                    Biện pháp xử lý
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {d.recommendedAction}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
