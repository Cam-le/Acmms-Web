import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import {
  Receipt,
  Plus,
  History,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  QrCode,
  ArrowLeft,
  FileText,
  CalendarDays,
  Info,
  ShieldCheck,
  Building2,
  UserCheck,
  RefreshCw,
  X,
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:7093";

// ===================== TYPES =====================

interface PriceSetting {
  priceSettingId: string;
  farmName: string;
  expertName: string;
  month: string; // ISO date string
  pricePerDiagnosis: number;
  totalDiagnoses: number;
  totalAmount: number;
  isPaid: boolean;
}

interface FarmOption {
  farmId: string;
  farmName: string;
  farmStatus: string;
}

interface StaffOption {
  userId: string;
  fullname: string;
  roleName: string;
  status: string;
}

interface CreatePriceSettingBody {
  farmId: string;
  expertId: string;
  month: string;
  pricePerDiagnosis: number;
  notes: string;
}

// ===================== HELPERS =====================

function formatVND(amount: number): string {
  return amount.toLocaleString("vi-VN") + " ₫";
}

function formatMonthFromISO(iso: string): string {
  try {
    const d = new Date(iso);
    return `Tháng ${d.getMonth() + 1} / ${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

function toMonthInputValue(iso: string): string {
  // "2026-04-01T00:00:00" → "2026-04"
  return iso.slice(0, 7);
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

const PAGE_SIZE = 8;

// ===================== API =====================

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("authToken");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (data && typeof data === "object" && "success" in data) {
    if (!data.success) throw new Error(data.message ?? "API error");
    return data.data as T;
  }
  return data as T;
}

// ===================== STATUS CONFIG =====================

const STATUS_CONFIG: Record<
  "paid" | "unpaid",
  { label: string; color: string; icon: React.ElementType }
> = {
  paid: {
    label: "Đã thanh toán",
    color: "bg-[#dcfce7] text-[#166534]",
    icon: CheckCircle,
  },
  unpaid: {
    label: "Chờ thanh toán",
    color: "bg-[#fef9c3] text-[#854d0e]",
    icon: Clock,
  },
};

// ===================== QR PAYMENT MODAL =====================

function QrPaymentModal({
  setting,
  onClose,
  onSuccess,
}: {
  setting: PriceSetting;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<
    "confirm" | "processing" | "success" | "error"
  >("confirm");
  const [errorMsg, setErrorMsg] = useState("");

  async function handlePay() {
    setStep("processing");
    try {
      await apiFetch("/api/payment/create", {
        method: "POST",
        body: JSON.stringify({
          priceSettingId: setting.priceSettingId,
          provider: "Vnpay",
        }),
      });
      setStep("success");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi xảy ra");
      setStep("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#009689] to-[#00b4a6] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base leading-tight">
                Thanh toán VNPay
              </h3>
              <p className="text-white/70 text-xs">
                {formatMonthFromISO(setting.month)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step: Confirm */}
        {step === "confirm" && (
          <div className="p-6 space-y-5">
            <div className="bg-[#f0fdfa] rounded-xl border border-[#009689]/20 p-4 space-y-3">
              <h4 className="text-sm font-semibold text-[#115e59]">
                Chi tiết thanh toán
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-[#334155]">
                  <span>Trang trại</span>
                  <span className="font-medium">{setting.farmName}</span>
                </div>
                <div className="flex justify-between text-[#334155]">
                  <span>Chuyên gia</span>
                  <span className="font-medium">{setting.expertName}</span>
                </div>
                <div className="flex justify-between text-[#334155]">
                  <span>Kỳ thanh toán</span>
                  <span className="font-medium">
                    {formatMonthFromISO(setting.month)}
                  </span>
                </div>
                <div className="flex justify-between text-[#334155]">
                  <span>Số chẩn đoán</span>
                  <span className="font-medium">
                    {setting.totalDiagnoses} lượt
                  </span>
                </div>
                <div className="flex justify-between text-[#334155]">
                  <span>Đơn giá / lượt</span>
                  <span className="font-medium">
                    {formatVND(setting.pricePerDiagnosis)}
                  </span>
                </div>
                <div className="h-px bg-[#e2e8f0] my-1" />
                <div className="flex justify-between text-[#115e59] font-bold text-base">
                  <span>Tổng cộng</span>
                  <span className="text-[#009689]">
                    {formatVND(setting.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs text-[#62748e] bg-[#f8fafc] rounded-lg p-3 border border-[#e2e8f0]">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#009689]" />
              Sau khi xác nhận, hệ thống sẽ khởi tạo giao dịch VNPay. Vui lòng
              không tắt trang trong quá trình thanh toán.
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-[#e2e8f0] text-[#62748e] text-sm font-medium hover:bg-[#f8fafc] transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handlePay}
                className="flex-1 py-2.5 rounded-xl bg-[#009689] text-white text-sm font-semibold hover:bg-[#007f75] transition-colors"
              >
                Tiến hành thanh toán
              </button>
            </div>
          </div>
        )}

        {/* Step: Processing */}
        {step === "processing" && (
          <div className="p-10 flex flex-col items-center gap-5 text-center">
            <div className="w-16 h-16 border-4 border-[#009689] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-[#115e59]">
              Đang khởi tạo giao dịch...
            </p>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="p-6 flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 bg-[#dcfce7] rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-[#16a34a]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-[#115e59]">
                Khởi tạo thành công!
              </h4>
              <p className="text-sm text-[#62748e]">
                Giao dịch VNPay đã được ghi nhận cho{" "}
                {formatMonthFromISO(setting.month)}.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#166534]">
              <ShieldCheck className="w-4 h-4 text-[#16a34a]" />
              Giao dịch được bảo mật bởi VNPay
            </div>
            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-[#009689] text-white font-semibold text-sm hover:bg-[#007f75] transition-colors"
            >
              Hoàn tất
            </button>
          </div>
        )}

        {/* Step: Error */}
        {step === "error" && (
          <div className="p-6 flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 bg-[#fee2e2] rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-[#dc2626]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-[#115e59]">
                Thanh toán thất bại
              </h4>
              <p className="text-sm text-[#62748e]">{errorMsg}</p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-[#e2e8f0] text-[#62748e] text-sm font-medium hover:bg-[#f8fafc] transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={() => setStep("confirm")}
                className="flex-1 py-2.5 rounded-xl bg-[#009689] text-white text-sm font-semibold hover:bg-[#007f75] transition-colors"
              >
                Thử lại
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== CREATE PRICE SETTING MODAL =====================

function CreatePriceSettingModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [experts, setExperts] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [form, setForm] = useState<{
    farmId: string;
    expertId: string;
    month: string;
    pricePerDiagnosis: string;
    notes: string;
  }>({
    farmId: "",
    expertId: "",
    month: defaultMonth,
    pricePerDiagnosis: "150",
    notes: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const [farmsData, staffData] = await Promise.all([
          apiFetch<FarmOption[]>("/api/Farms"),
          apiFetch<StaffOption[]>("/api/Staffs"),
        ]);
        setFarms(farmsData.filter((f) => f.farmStatus === "Active"));
        setExperts(staffData.filter((s) => s.roleName === "Specialist"));
      } catch {
        setError("Không thể tải dữ liệu. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSubmit() {
    if (!form.farmId) {
      setError("Vui lòng chọn trang trại.");
      return;
    }
    if (!form.expertId) {
      setError("Vui lòng chọn chuyên gia.");
      return;
    }
    if (!form.month) {
      setError("Vui lòng chọn tháng.");
      return;
    }
    const price = parseFloat(form.pricePerDiagnosis) * 1000;
    if (isNaN(price) || price < 1000) {
      setError("Đơn giá tối thiểu là 1.000 ₫.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const body: CreatePriceSettingBody = {
        farmId: form.farmId,
        expertId: form.expertId,
        month: `${form.month}-01T00:00:00.000Z`,
        pricePerDiagnosis: Math.round(price),
        notes: form.notes,
      };
      await apiFetch("/api/payment/price-setting", {
        method: "POST",
        body: JSON.stringify(body),
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Có lỗi xảy ra khi tạo đơn giá.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function Field({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[#62748e] block">
          {label}
        </label>
        {children}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#009689] to-[#00b4a6] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-white font-semibold text-base">Tạo đơn giá</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-8 h-8 border-2 border-[#009689] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Trang trại *">
                  <select
                    value={form.farmId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, farmId: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-[#cad5e2] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155]"
                  >
                    <option value="">— Chọn trang trại —</option>
                    {farms.map((farm) => (
                      <option key={farm.farmId} value={farm.farmId}>
                        {farm.farmName}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Chuyên gia *">
                  <select
                    value={form.expertId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, expertId: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-[#cad5e2] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155]"
                  >
                    <option value="">— Chọn chuyên gia —</option>
                    {experts.map((ex) => (
                      <option key={ex.userId} value={ex.userId}>
                        {ex.fullname}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Tháng áp dụng *">
                  <div className="flex gap-1.5">
                    <select
                      value={form.month ? form.month.split("-")[1] : ""}
                      onChange={(e) => {
                        const [year] = form.month.split("-");
                        setForm((f) => ({
                          ...f,
                          month: `${year}-${e.target.value}`,
                        }));
                      }}
                      className="flex-1 px-2 py-2 border border-[#cad5e2] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155]"
                    >
                      {Array.from({ length: 12 }, (_, i) => {
                        const m = String(i + 1).padStart(2, "0");
                        return (
                          <option key={m} value={m}>
                            Tháng {i + 1}
                          </option>
                        );
                      })}
                    </select>
                    <select
                      value={form.month ? form.month.split("-")[0] : ""}
                      onChange={(e) => {
                        const month =
                          form.month.split("-")[1] ??
                          String(new Date().getMonth() + 1).padStart(2, "0");
                        setForm((f) => ({
                          ...f,
                          month: `${e.target.value}-${month}`,
                        }));
                      }}
                      className="w-[80px] px-2 py-2 border border-[#cad5e2] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155]"
                    >
                      {Array.from({ length: 5 }, (_, i) => {
                        const y = new Date().getFullYear() - 1 + i;
                        return (
                          <option key={y} value={String(y)}>
                            {y}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </Field>

                <Field label="Đơn giá / chẩn đoán (nghìn đồng) *">
                  <div className="relative">
                    <input
                      type="number"
                      value={form.pricePerDiagnosis}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          pricePerDiagnosis: e.target.value,
                        }))
                      }
                      min="1"
                      step="10"
                      className="w-full px-3 py-2 pr-14 border border-[#cad5e2] rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#009689]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#62748e]">
                      nghìn
                    </span>
                  </div>
                  {form.pricePerDiagnosis &&
                    !isNaN(parseFloat(form.pricePerDiagnosis)) && (
                      <p className="text-xs text-[#62748e] mt-1">
                        ≈ {formatVND(parseFloat(form.pricePerDiagnosis) * 1000)}
                      </p>
                    )}
                </Field>
              </div>

              <Field label="Ghi chú">
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={2}
                  placeholder="Ghi chú thêm (không bắt buộc)"
                  className="w-full px-3 py-2 border border-[#cad5e2] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
                />
              </Field>

              {error && (
                <div className="flex items-center gap-2 text-xs text-[#991b1b] bg-[#fee2e2] border border-[#fca5a5] rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-[#e2e8f0] text-[#62748e] text-sm font-medium hover:bg-[#f8fafc] transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#009689] text-white text-sm font-semibold hover:bg-[#007f75] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Tạo đơn giá
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ===================== PRICE SETTING ROW =====================

function PriceSettingRow({
  setting,
  onPay,
}: {
  setting: PriceSetting;
  onPay: (s: PriceSetting) => void;
}) {
  const isPaid = setting.isPaid;
  const cfg = isPaid ? STATUS_CONFIG.paid : STATUS_CONFIG.unpaid;
  const Icon = cfg.icon;

  return (
    <tr className="hover:bg-[#f8fafc] transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-[#009689] shrink-0" />
          <span className="text-sm font-medium text-[#115e59]">
            {setting.farmName}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <UserCheck className="w-3.5 h-3.5 text-[#62748e] shrink-0" />
          <span className="text-sm text-[#334155]">{setting.expertName}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-[#334155]">
        {formatMonthFromISO(setting.month)}
      </td>
      <td className="px-4 py-3 text-right text-sm font-mono text-[#334155]">
        {setting.totalDiagnoses}
      </td>
      <td className="px-4 py-3 text-right text-sm font-mono text-[#334155]">
        {formatVND(setting.pricePerDiagnosis)}
      </td>
      <td className="px-4 py-3 text-right font-bold font-mono text-[#115e59] text-sm">
        {formatVND(setting.totalAmount)}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}
        >
          <Icon className="w-3 h-3" />
          {cfg.label}
        </span>
      </td>
      <td className="px-4 py-3">
        {!isPaid ? (
          <button
            onClick={() => onPay(setting)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#009689] hover:bg-[#007f75] text-white rounded-lg text-xs font-medium transition-colors"
          >
            <QrCode className="w-3.5 h-3.5" />
            Thanh toán
          </button>
        ) : (
          <span className="flex items-center gap-1 text-xs text-[#166534]">
            <CheckCircle className="w-3.5 h-3.5" />
            Đã TT
          </span>
        )}
      </td>
    </tr>
  );
}

// ===================== MAIN PAGE =====================

export function BillingPage() {
  const [settings, setSettings] = useState<PriceSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMockData, setIsMockData] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">(
    "all",
  );
  const [page, setPage] = useState(1);

  const [payingSetting, setPayingSetting] = useState<PriceSetting | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    setIsMockData(false);
    try {
      const data = await apiFetch<PriceSetting[]>(
        "/api/payment/price-settings",
      );
      setSettings(data ?? []);
    } catch {
      setIsMockData(true);
      setSettings([]);
      setError("Không thể tải dữ liệu. Hiển thị chế độ ngoại tuyến.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Derived stats
  const totalPaid = settings.filter((s) => s.isPaid).length;
  const totalUnpaid = settings.filter((s) => !s.isPaid).length;
  const totalAmountUnpaid = settings
    .filter((s) => !s.isPaid)
    .reduce((sum, s) => sum + s.totalAmount, 0);

  // Filtered list
  const filtered = settings
    .filter((s) => {
      const matchSearch =
        s.farmName.toLowerCase().includes(search.toLowerCase()) ||
        s.expertName.toLowerCase().includes(search.toLowerCase()) ||
        formatMonthFromISO(s.month)
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "paid"
            ? s.isPaid
            : !s.isPaid;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => b.month.localeCompare(a.month));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto">
      {/* Breadcrumb + Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link
            to="/advisory"
            className="flex items-center gap-1 text-xs text-[#62748e] hover:text-[#009689] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Tư vấn
          </Link>
          <span className="text-xs text-[#cad5e2]">/</span>
          <span className="text-xs text-[#009689] font-medium">Thanh toán</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[#115e59] text-2xl font-bold">
              Quản lý thanh toán
            </h1>
            <p className="text-[#62748e] text-sm mt-1">
              Tạo đơn giá và theo dõi trạng thái thanh toán cho từng chuyên gia
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#009689] hover:bg-[#007f75] text-white rounded-xl text-sm font-semibold transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Tạo đơn giá
          </button>
        </div>
      </div>

      {/* Mock data warning */}
      {isMockData && (
        <div className="flex items-center gap-2 px-4 py-3 bg-[#fffbeb] border border-[#fde68a] rounded-xl text-sm text-[#854d0e]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Dữ liệu mẫu — không thể kết nối máy chủ.</span>
          <button
            onClick={fetchSettings}
            className="ml-auto flex items-center gap-1 text-xs font-medium hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Thử lại
          </button>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#90a1b9]" />
          <input
            type="text"
            placeholder="Tìm trang trại, chuyên gia, tháng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | "paid" | "unpaid")
          }
          className="px-3 py-2 border border-[#cad5e2] rounded-lg text-sm bg-white text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#009689]"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="paid">Đã thanh toán</option>
          <option value="unpaid">Chờ thanh toán</option>
        </select>
        <button
          onClick={fetchSettings}
          className="flex items-center gap-2 px-3 py-2 border border-[#cad5e2] rounded-lg text-sm text-[#62748e] hover:border-[#009689] hover:text-[#009689] transition-colors bg-white"
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#009689] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error && settings.length === 0 ? (
          <div className="text-center py-16 text-[#62748e]">
            <AlertTriangle className="w-10 h-10 text-[#cad5e2] mx-auto mb-3" />
            <p className="text-sm font-medium">Không thể tải dữ liệu</p>
            <p className="text-xs mt-1">{error}</p>
            <button
              onClick={fetchSettings}
              className="mt-4 px-4 py-2 bg-[#009689] text-white rounded-lg text-sm font-medium hover:bg-[#007f75] transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#62748e] uppercase tracking-wide">
                      Trang trại
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#62748e] uppercase tracking-wide">
                      Chuyên gia
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#62748e] uppercase tracking-wide">
                      Tháng
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#62748e] uppercase tracking-wide">
                      Chẩn đoán
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#62748e] uppercase tracking-wide">
                      Đơn giá
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#62748e] uppercase tracking-wide">
                      Tổng tiền
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#62748e] uppercase tracking-wide">
                      Trạng thái
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#62748e] uppercase tracking-wide">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {paginated.map((s) => (
                    <PriceSettingRow
                      key={s.priceSettingId}
                      setting={s}
                      onPay={setPayingSetting}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {paginated.length === 0 && (
              <div className="text-center py-14 text-[#62748e]">
                <History className="w-10 h-10 text-[#cad5e2] mx-auto mb-3" />
                <p className="text-sm font-medium">
                  {search || statusFilter !== "all"
                    ? "Không tìm thấy kết quả phù hợp."
                    : "Chưa có đơn giá nào."}
                </p>
                {!search && statusFilter === "all" && (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="mt-3 flex items-center gap-2 px-4 py-2 bg-[#009689] text-white rounded-lg text-sm font-medium hover:bg-[#007f75] transition-colors mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Tạo đơn giá đầu tiên
                  </button>
                )}
              </div>
            )}

            {filtered.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#e2e8f0] bg-[#f8fafc]">
                <p className="text-xs text-[#62748e]">
                  {filtered.length} đơn giá
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="w-7 h-7 flex items-center justify-center rounded border border-[#e2e8f0] text-[#62748e] hover:border-[#009689] hover:text-[#009689] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {getPageNumbers(page, totalPages).map((p, i) =>
                      p === "..." ? (
                        <span
                          key={`e-${i}`}
                          className="w-7 h-7 flex items-center justify-center text-[#62748e] text-xs"
                        >
                          ···
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p as number)}
                          className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium border transition-colors ${
                            page === p
                              ? "bg-[#009689] text-white border-[#009689]"
                              : "border-[#e2e8f0] text-[#62748e] hover:border-[#009689] hover:text-[#009689]"
                          }`}
                        >
                          {p}
                        </button>
                      ),
                    )}
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                      className="w-7 h-7 flex items-center justify-center rounded border border-[#e2e8f0] text-[#62748e] hover:border-[#009689] hover:text-[#009689] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Payment Modal */}
      {payingSetting && (
        <QrPaymentModal
          setting={payingSetting}
          onClose={() => setPayingSetting(null)}
          onSuccess={fetchSettings}
        />
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreatePriceSettingModal
          onClose={() => setShowCreate(false)}
          onSuccess={fetchSettings}
        />
      )}
    </div>
  );
}
