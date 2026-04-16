import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import {
  Receipt,
  Settings2,
  CreditCard,
  History,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  Pencil,
  Save,
  X,
  QrCode,
  ArrowLeft,
  FileText,
  TrendingUp,
  BadgeDollarSign,
  CalendarDays,
  Stethoscope,
  RefreshCw,
  Info,
  ShieldCheck,
} from "lucide-react";
import { api } from "../../api/client";
import type { ReportResponse, DiagnosisResponse } from "../../api/client";

// ===================== TYPES =====================

interface Invoice {
  invoiceId: string;
  month: string; // "YYYY-MM"
  consultationCount: number;
  pricePerConsult: number;
  totalAmount: number;
  status: "PAID" | "UNPAID" | "OVERDUE";
  paidAt?: string;
  transactionId?: string;
  diagnoses: DiagnosisResponse[];
}

// ===================== CONSTANTS =====================

const DEFAULT_PRICE_PER_CONSULT = 150000; // 150,000 VND
const PAGE_SIZE = 8;

const INVOICE_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  PAID: {
    label: "Đã thanh toán",
    color: "bg-[#dcfce7] text-[#166534]",
    icon: CheckCircle,
  },
  UNPAID: {
    label: "Chưa thanh toán",
    color: "bg-[#fef9c3] text-[#854d0e]",
    icon: Clock,
  },
  OVERDUE: {
    label: "Quá hạn",
    color: "bg-[#fee2e2] text-[#991b1b]",
    icon: XCircle,
  },
};

// ===================== HELPERS =====================

function formatVND(amount: number): string {
  return amount.toLocaleString("vi-VN") + " ₫";
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `Tháng ${parseInt(m)} / ${y}`;
}

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getYearMonth(isoDate: string): string {
  if (!isoDate) return "";
  return isoDate.slice(0, 7); // "YYYY-MM"
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

// ===================== MOCK PAYMENT HISTORY =====================
// Since there's no payment API yet, we build history from diagnoses + localStorage

const STORAGE_KEY_PRICE = "acmms_billing_price_per_consult";
const STORAGE_KEY_PAID = "acmms_billing_paid_months";

function loadPaidMonths(): Record<
  string,
  { paidAt: string; transactionId: string }
> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_PAID) || "{}");
  } catch {
    return {};
  }
}

function savePaidMonth(
  month: string,
  paidAt: string,
  transactionId: string,
): void {
  const data = loadPaidMonths();
  data[month] = { paidAt, transactionId };
  localStorage.setItem(STORAGE_KEY_PAID, JSON.stringify(data));
}

// ===================== QR PAYMENT MODAL =====================

function QrPaymentModal({
  invoice,
  onClose,
  onSuccess,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSuccess: (transactionId: string) => void;
}) {
  const [step, setStep] = useState<"confirm" | "qr" | "success">("confirm");
  const [countdown, setCountdown] = useState(300); // 5 min
  const [polling, setPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fake transaction ID
  const txnId = useRef("VNP" + Date.now().toString().slice(-10).toUpperCase());

  // Countdown when on QR step
  useEffect(() => {
    if (step !== "qr") return;
    intervalRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [step]);

  // Simulate payment polling: auto-succeed after ~6s for demo
  function startPolling() {
    setPolling(true);
    pollRef.current = setTimeout(() => {
      setPolling(false);
      setStep("success");
      onSuccess(txnId.current);
    }, 6000);
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  function formatCountdown(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // Generate a simple SVG QR-like pattern for visual purposes
  // (Not a real QR code — just a visual placeholder consistent with VNPay UI)
  function FakeQr() {
    // 8x8 deterministic pattern from txnId
    const cells: boolean[] = Array.from({ length: 64 }, (_, i) => {
      const code = txnId.current.charCodeAt(i % txnId.current.length);
      return (code + i * 7) % 3 !== 0;
    });
    return (
      <div className="p-3 bg-white rounded-xl border-2 border-[#e2e8f0] inline-block">
        <div className="grid grid-cols-8 gap-[2px]">
          {cells.map((filled, i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-[2px] ${filled ? "bg-[#1a1a2e]" : "bg-white"}`}
            />
          ))}
        </div>
      </div>
    );
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
                {formatMonthLabel(invoice.month)}
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
                  <span>Kỳ thanh toán</span>
                  <span className="font-medium">
                    {formatMonthLabel(invoice.month)}
                  </span>
                </div>
                <div className="flex justify-between text-[#334155]">
                  <span>Số lượt tư vấn</span>
                  <span className="font-medium">
                    {invoice.consultationCount} lượt
                  </span>
                </div>
                <div className="flex justify-between text-[#334155]">
                  <span>Đơn giá / lượt</span>
                  <span className="font-medium">
                    {formatVND(invoice.pricePerConsult)}
                  </span>
                </div>
                <div className="h-px bg-[#e2e8f0] my-1" />
                <div className="flex justify-between text-[#115e59] font-bold text-base">
                  <span>Tổng cộng</span>
                  <span className="text-[#009689]">
                    {formatVND(invoice.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs text-[#62748e] bg-[#f8fafc] rounded-lg p-3 border border-[#e2e8f0]">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#009689]" />
              Sau khi xác nhận, mã QR VNPay sẽ được hiển thị. Vui lòng quét
              trong vòng 5 phút.
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-[#e2e8f0] text-[#62748e] text-sm font-medium hover:bg-[#f8fafc] transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setStep("qr");
                  // Start polling after a short delay
                  setTimeout(() => startPolling(), 500);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#009689] text-white text-sm font-semibold hover:bg-[#007f75] transition-colors"
              >
                Tiến hành thanh toán
              </button>
            </div>
          </div>
        )}

        {/* Step: QR */}
        {step === "qr" && (
          <div className="p-6 flex flex-col items-center gap-5">
            {/* VNPay branding strip */}
            <div className="w-full flex items-center justify-between bg-[#f8fafc] rounded-xl px-4 py-2 border border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#005baa] rounded-lg flex items-center justify-center">
                  <span className="text-white text-[9px] font-black leading-none">
                    VN
                    <br />
                    PAY
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#334155]">
                  Thanh toán qua VNPay
                </span>
              </div>
              <span className="text-xs font-mono font-semibold text-[#009689]">
                {formatVND(invoice.totalAmount)}
              </span>
            </div>

            <FakeQr />

            <div className="text-center space-y-1">
              <p className="text-sm text-[#334155] font-medium">
                Quét mã QR bằng ứng dụng ngân hàng
              </p>
              <p className="text-xs text-[#62748e]">
                Mã giao dịch:{" "}
                <span className="font-mono font-semibold text-[#115e59]">
                  {txnId.current}
                </span>
              </p>
            </div>

            {/* Countdown */}
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${
                countdown > 60
                  ? "bg-[#f0fdfa] border-[#009689]/30 text-[#115e59]"
                  : "bg-[#fee2e2] border-[#fca5a5] text-[#991b1b]"
              }`}
            >
              <Clock className="w-4 h-4" />
              {countdown > 0 ? (
                <>Hết hạn sau {formatCountdown(countdown)}</>
              ) : (
                <>Mã QR đã hết hạn</>
              )}
            </div>

            {/* Polling indicator */}
            {polling && (
              <div className="flex items-center gap-2 text-xs text-[#62748e]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang chờ xác nhận thanh toán...
              </div>
            )}

            <div className="w-full flex items-start gap-2 text-xs text-[#62748e] bg-[#fffbeb] rounded-lg p-3 border border-[#fde68a]">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#f59e0b]" />
              Không tắt trang này khi đang thanh toán. Hệ thống sẽ tự động cập
              nhật khi nhận được xác nhận.
            </div>

            <button
              onClick={onClose}
              className="text-xs text-[#62748e] hover:text-[#334155] transition-colors underline underline-offset-2"
            >
              Hủy thanh toán
            </button>
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
                Thanh toán thành công!
              </h4>
              <p className="text-sm text-[#62748e]">
                Kỳ {formatMonthLabel(invoice.month)} đã được ghi nhận.
              </p>
            </div>
            <div className="w-full bg-[#f0fdfa] rounded-xl border border-[#009689]/20 p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between text-[#334155]">
                <span>Mã giao dịch</span>
                <span className="font-mono font-semibold text-[#009689] text-xs">
                  {txnId.current}
                </span>
              </div>
              <div className="flex justify-between text-[#334155]">
                <span>Số tiền</span>
                <span className="font-bold text-[#115e59]">
                  {formatVND(invoice.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between text-[#334155]">
                <span>Thời gian</span>
                <span>{new Date().toLocaleString("vi-VN")}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#166534]">
              <ShieldCheck className="w-4 h-4 text-[#16a34a]" />
              Giao dịch được bảo mật bởi VNPay
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-[#009689] text-white font-semibold text-sm hover:bg-[#007f75] transition-colors"
            >
              Hoàn tất
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== PRICE SETTINGS CARD =====================

function PriceSettingsCard({
  pricePerConsult,
  onSave,
}: {
  pricePerConsult: number;
  onSave: (newPrice: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(
    String(pricePerConsult / 1000), // display in thousands
  );
  const [error, setError] = useState("");

  function handleSave() {
    const num = parseFloat(inputVal) * 1000;
    if (isNaN(num) || num < 10000) {
      setError("Giá tối thiểu là 10.000 ₫");
      return;
    }
    if (num > 10000000) {
      setError("Giá tối đa là 10.000.000 ₫");
      return;
    }
    onSave(Math.round(num));
    setEditing(false);
    setError("");
  }

  function handleCancel() {
    setInputVal(String(pricePerConsult / 1000));
    setEditing(false);
    setError("");
  }

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 bg-[#f0fdfa] rounded-xl flex items-center justify-center">
          <Settings2 className="w-4.5 h-4.5 text-[#009689]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#115e59]">
            Đơn giá tư vấn
          </h3>
          <p className="text-xs text-[#62748e]">
            Áp dụng cho tất cả lượt tư vấn đã được chẩn đoán
          </p>
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[#62748e] block mb-1.5">
              Đơn giá (nghìn đồng / lượt)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  value={inputVal}
                  onChange={(e) => {
                    setInputVal(e.target.value);
                    setError("");
                  }}
                  className="w-full px-3 py-2 pr-14 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm font-mono"
                  min="10"
                  max="10000"
                  step="10"
                  placeholder="150"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#62748e] font-medium">
                  nghìn
                </span>
              </div>
            </div>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            <p className="text-xs text-[#62748e] mt-1">
              Tương đương:{" "}
              <span className="font-semibold text-[#115e59]">
                {formatVND(
                  isNaN(parseFloat(inputVal)) ? 0 : parseFloat(inputVal) * 1000,
                )}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#009689] text-white rounded-lg text-xs font-medium hover:bg-[#007f75] transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Lưu
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e2e8f0] text-[#62748e] rounded-lg text-xs font-medium hover:bg-[#f8fafc] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Hủy
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold text-[#009689] font-mono">
              {formatVND(pricePerConsult)}
            </div>
            <div className="text-xs text-[#62748e] mt-0.5">mỗi lượt tư vấn</div>
          </div>
          <button
            onClick={() => {
              setInputVal(String(pricePerConsult / 1000));
              setEditing(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#009689] text-[#009689] rounded-lg text-xs font-medium hover:bg-[#f0fdfa] transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Chỉnh sửa
          </button>
        </div>
      )}
    </div>
  );
}

// ===================== STAT CARD =====================

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border shadow-sm p-4 ${
        accent
          ? "bg-gradient-to-br from-[#009689] to-[#007f73] border-[#007f73]"
          : "bg-white border-[#e2e8f0]"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            accent ? "bg-white/20" : "bg-[#f0fdfa]"
          }`}
        >
          <Icon
            className={`w-4.5 h-4.5 ${accent ? "text-white" : "text-[#009689]"}`}
          />
        </div>
      </div>
      <div
        className={`text-2xl font-bold font-mono mb-0.5 ${accent ? "text-white" : "text-[#115e59]"}`}
      >
        {value}
      </div>
      <div
        className={`text-xs font-medium ${accent ? "text-white/80" : "text-[#62748e]"}`}
      >
        {label}
      </div>
      {sub && (
        <div
          className={`text-[11px] mt-1 ${accent ? "text-white/60" : "text-[#90a1b9]"}`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ===================== CURRENT MONTH INVOICE =====================

function CurrentMonthCard({
  invoice,
  onPay,
}: {
  invoice: Invoice | null;
  onPay: () => void;
}) {
  const ym = getCurrentYearMonth();

  if (!invoice) {
    return (
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-[#f0fdfa] rounded-xl flex items-center justify-center">
            <Receipt className="w-4.5 h-4.5 text-[#009689]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#115e59]">
              Hóa đơn tháng hiện tại
            </h3>
            <p className="text-xs text-[#62748e]">{formatMonthLabel(ym)}</p>
          </div>
        </div>
        <div className="text-center py-8">
          <Stethoscope className="w-10 h-10 text-[#cad5e2] mx-auto mb-3" />
          <p className="text-sm text-[#62748e]">
            Chưa có lượt tư vấn nào được chẩn đoán trong tháng này.
          </p>
        </div>
      </div>
    );
  }

  const isPaid = invoice.status === "PAID";

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f0fdfa] rounded-xl flex items-center justify-center">
            <Receipt className="w-4.5 h-4.5 text-[#009689]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#115e59]">
              Hóa đơn tháng hiện tại
            </h3>
            <p className="text-xs text-[#62748e]">
              {formatMonthLabel(invoice.month)}
            </p>
          </div>
        </div>
        {isPaid ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#dcfce7] text-[#166534] text-xs font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            Đã thanh toán
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fef9c3] text-[#854d0e] text-xs font-medium">
            <Clock className="w-3.5 h-3.5" />
            Chưa thanh toán
          </span>
        )}
      </div>

      {/* Breakdown */}
      <div className="bg-[#f8fafc] rounded-xl border border-[#e2e8f0] p-4 mb-4 space-y-2.5">
        <div className="flex justify-between text-sm text-[#334155]">
          <span>Số lượt tư vấn (DIAGNOSED)</span>
          <span className="font-semibold">
            {invoice.consultationCount} lượt
          </span>
        </div>
        <div className="flex justify-between text-sm text-[#334155]">
          <span>Đơn giá mỗi lượt</span>
          <span className="font-semibold">
            {formatVND(invoice.pricePerConsult)}
          </span>
        </div>
        <div className="h-px bg-[#e2e8f0]" />
        <div className="flex justify-between text-base font-bold text-[#115e59]">
          <span>Tổng cộng</span>
          <span className="text-[#009689] text-lg">
            {formatVND(invoice.totalAmount)}
          </span>
        </div>
      </div>

      {/* Consultations list - condensed */}
      {invoice.diagnoses.length > 0 && (
        <details className="group mb-4">
          <summary className="flex items-center justify-between cursor-pointer text-xs font-medium text-[#62748e] hover:text-[#115e59] transition-colors list-none select-none">
            <span>Chi tiết {invoice.diagnoses.length} lượt chẩn đoán</span>
            <ChevronRight className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" />
          </summary>
          <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {invoice.diagnoses.map((dx, i) => (
              <div
                key={dx.id}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-[#f0fdfa] rounded-lg text-xs text-[#334155]"
              >
                <span className="w-4 h-4 rounded-full bg-[#009689] text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 truncate font-medium">
                  {dx.diseaseName}
                </span>
                <span className="text-[#62748e] whitespace-nowrap">
                  {formatDate(dx.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {isPaid ? (
        <div className="flex items-center gap-2 text-xs text-[#166534] bg-[#f0fdf4] rounded-lg px-3 py-2 border border-[#bbf7d0]">
          <CheckCircle className="w-3.5 h-3.5" />
          Đã thanh toán lúc{" "}
          {invoice.paidAt
            ? new Date(invoice.paidAt).toLocaleString("vi-VN")
            : "—"}
        </div>
      ) : (
        <button
          onClick={onPay}
          className="w-full py-2.5 rounded-xl bg-[#009689] text-white font-semibold text-sm hover:bg-[#007f75] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <QrCode className="w-4 h-4" />
          Thanh toán qua VNPay
        </button>
      )}
    </div>
  );
}

// ===================== HISTORY TAB =====================

function HistoryTab({ invoices }: { invoices: Invoice[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = invoices
    .filter((inv) => {
      const matchSearch = formatMonthLabel(inv.month)
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => b.month.localeCompare(a.month));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#90a1b9]" />
          <input
            type="text"
            placeholder="Tìm theo tháng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-[#cad5e2] rounded-lg text-sm bg-white text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#009689]"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="PAID">Đã thanh toán</option>
          <option value="UNPAID">Chưa thanh toán</option>
          <option value="OVERDUE">Quá hạn</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#62748e] uppercase tracking-wide">
                Kỳ thanh toán
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#62748e] uppercase tracking-wide">
                Số lượt
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
                Ngày thanh toán
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#62748e] uppercase tracking-wide">
                Mã giao dịch
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {paginated.map((inv) => {
              const cfg =
                INVOICE_STATUS_CONFIG[inv.status] ??
                INVOICE_STATUS_CONFIG.UNPAID;
              const Icon = cfg.icon;
              return (
                <tr
                  key={inv.invoiceId}
                  className="hover:bg-[#f8fafc] transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-[#115e59]">
                    {formatMonthLabel(inv.month)}
                  </td>
                  <td className="px-4 py-3 text-right text-[#334155] font-mono">
                    {inv.consultationCount}
                  </td>
                  <td className="px-4 py-3 text-right text-[#334155] font-mono text-xs">
                    {formatVND(inv.pricePerConsult)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-[#115e59]">
                    {formatVND(inv.totalAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}
                    >
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#62748e] text-xs">
                    {inv.paidAt ? formatDate(inv.paidAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-[#62748e] font-mono text-xs">
                    {inv.transactionId ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {paginated.length === 0 && (
          <div className="text-center py-12 text-[#62748e]">
            <History className="w-10 h-10 text-[#cad5e2] mx-auto mb-3" />
            <p className="text-sm">Chưa có lịch sử thanh toán.</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#e2e8f0] bg-[#f8fafc]">
            <p className="text-xs text-[#62748e]">
              {filtered.length} kỳ thanh toán
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded border border-[#e2e8f0] text-[#62748e] hover:border-[#009689] hover:text-[#009689] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== MAIN PAGE =====================

export function BillingPage() {
  const [diagnoses, setDiagnoses] = useState<DiagnosisResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "history">(
    "overview",
  );
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [paidMonths, setPaidMonths] =
    useState<Record<string, { paidAt: string; transactionId: string }>>(
      loadPaidMonths(),
    );

  // Price per consult — persisted in localStorage
  const [pricePerConsult, setPricePerConsult] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_PRICE);
    return stored ? parseInt(stored) : DEFAULT_PRICE_PER_CONSULT;
  });

  function handleSavePrice(newPrice: number) {
    setPricePerConsult(newPrice);
    localStorage.setItem(STORAGE_KEY_PRICE, String(newPrice));
  }

  async function fetchDiagnoses() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAllDiagnoses();
      setDiagnoses(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không thể tải dữ liệu chẩn đoán.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDiagnoses();
  }, []);

  // Build invoices grouped by month from diagnoses
  const invoicesByMonth: Record<string, DiagnosisResponse[]> = {};
  for (const dx of diagnoses) {
    const ym = getYearMonth(dx.createdAt);
    if (!ym) continue;
    if (!invoicesByMonth[ym]) invoicesByMonth[ym] = [];
    invoicesByMonth[ym].push(dx);
  }

  const allInvoices: Invoice[] = Object.entries(invoicesByMonth).map(
    ([ym, dxs]) => {
      const paid = paidMonths[ym];
      return {
        invoiceId: `INV-${ym}`,
        month: ym,
        consultationCount: dxs.length,
        pricePerConsult,
        totalAmount: dxs.length * pricePerConsult,
        status: paid
          ? "PAID"
          : ym < getCurrentYearMonth()
            ? "OVERDUE"
            : "UNPAID",
        paidAt: paid?.paidAt,
        transactionId: paid?.transactionId,
        diagnoses: dxs,
      };
    },
  );

  const currentYM = getCurrentYearMonth();
  const currentInvoice =
    allInvoices.find((inv) => inv.month === currentYM) ?? null;

  // Stats
  const totalPaid = allInvoices
    .filter((i) => i.status === "PAID")
    .reduce((s, i) => s + i.totalAmount, 0);
  const totalPending = allInvoices
    .filter((i) => i.status !== "PAID")
    .reduce((s, i) => s + i.totalAmount, 0);
  const totalDiagnosed = diagnoses.length;
  const paidCount = allInvoices.filter((i) => i.status === "PAID").length;

  function handlePaymentSuccess(transactionId: string) {
    if (!payingInvoice) return;
    const now = new Date().toISOString();
    savePaidMonth(payingInvoice.month, now, transactionId);
    setPaidMonths((prev) => ({
      ...prev,
      [payingInvoice.month]: { paidAt: now, transactionId },
    }));
    setPayingInvoice(null);
  }

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
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
            <span className="text-xs text-[#009689] font-medium">
              Thanh toán
            </span>
          </div>
          <h1 className="text-[#115e59] text-2xl font-bold">
            Quản lý thanh toán
          </h1>
          <p className="text-[#62748e] text-sm mt-1">
            Theo dõi chi phí tư vấn chuyên gia và thanh toán hàng tháng
          </p>
        </div>
        <button
          onClick={fetchDiagnoses}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 border border-[#cad5e2] text-[#62748e] rounded-lg hover:bg-[#f8fafc] transition-colors text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </div>

      {/* Loading / Error state */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-[#62748e]">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Đang tải dữ liệu...
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="w-10 h-10 text-[#f59e0b] mb-3" />
          <p className="text-sm text-[#62748e] mb-4">{error}</p>
          <button
            onClick={fetchDiagnoses}
            className="px-4 py-2 bg-[#009689] text-white rounded-lg text-sm hover:bg-[#007f75] transition-colors"
          >
            Thử lại
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={BadgeDollarSign}
              label="Tổng chi phí chưa TT"
              value={formatVND(totalPending)}
              sub={`${allInvoices.filter((i) => i.status !== "PAID").length} kỳ chưa thanh toán`}
              accent={totalPending > 0}
            />
            <StatCard
              icon={CheckCircle}
              label="Đã thanh toán"
              value={formatVND(totalPaid)}
              sub={`${paidCount} kỳ đã thanh toán`}
            />
            <StatCard
              icon={Stethoscope}
              label="Tổng lượt chẩn đoán"
              value={String(totalDiagnosed)}
              sub="Kể từ khi bắt đầu sử dụng"
            />
            <StatCard
              icon={TrendingUp}
              label="Tháng hiện tại"
              value={
                currentInvoice ? formatVND(currentInvoice.totalAmount) : "0 ₫"
              }
              sub={
                currentInvoice
                  ? `${currentInvoice.consultationCount} lượt`
                  : "Chưa có lượt nào"
              }
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-[#e2e8f0]">
            {(
              [
                {
                  key: "overview",
                  label: "Tổng quan tháng",
                  icon: CalendarDays,
                },
                { key: "history", label: "Lịch sử thanh toán", icon: History },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === tab.key
                    ? "border-[#009689] text-[#009689]"
                    : "border-transparent text-[#62748e] hover:text-[#334155]"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <CurrentMonthCard
                  invoice={currentInvoice}
                  onPay={() => setPayingInvoice(currentInvoice)}
                />

                {/* Overdue invoices */}
                {allInvoices.filter((i) => i.status === "OVERDUE").length >
                  0 && (
                  <div className="bg-white rounded-xl border border-[#fca5a5] shadow-sm p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-[#fee2e2] rounded-xl flex items-center justify-center">
                        <AlertTriangle className="w-4.5 h-4.5 text-[#dc2626]" />
                      </div>
                      <h3 className="text-sm font-semibold text-[#991b1b]">
                        Hóa đơn quá hạn
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {allInvoices
                        .filter((i) => i.status === "OVERDUE")
                        .map((inv) => (
                          <div
                            key={inv.invoiceId}
                            className="flex items-center justify-between bg-[#fff5f5] rounded-lg px-3 py-2.5 border border-[#fecaca]"
                          >
                            <div>
                              <div className="text-sm font-medium text-[#991b1b]">
                                {formatMonthLabel(inv.month)}
                              </div>
                              <div className="text-xs text-[#dc2626]">
                                {inv.consultationCount} lượt ·{" "}
                                {formatVND(inv.totalAmount)}
                              </div>
                            </div>
                            <button
                              onClick={() => setPayingInvoice(inv)}
                              className="px-3 py-1.5 bg-[#dc2626] text-white rounded-lg text-xs font-semibold hover:bg-[#b91c1c] transition-colors flex items-center gap-1.5"
                            >
                              <QrCode className="w-3 h-3" />
                              Thanh toán
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <PriceSettingsCard
                  pricePerConsult={pricePerConsult}
                  onSave={handleSavePrice}
                />

                {/* Recent history quick view */}
                <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-[#115e59] mb-3 flex items-center gap-2">
                    <History className="w-4 h-4 text-[#009689]" />
                    Gần đây
                  </h3>
                  {allInvoices.length === 0 ? (
                    <p className="text-xs text-[#62748e] text-center py-4">
                      Chưa có dữ liệu.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {allInvoices
                        .sort((a, b) => b.month.localeCompare(a.month))
                        .slice(0, 4)
                        .map((inv) => {
                          const cfg =
                            INVOICE_STATUS_CONFIG[inv.status] ??
                            INVOICE_STATUS_CONFIG.UNPAID;
                          const Icon = cfg.icon;
                          return (
                            <div
                              key={inv.invoiceId}
                              className="flex items-center justify-between"
                            >
                              <div>
                                <div className="text-xs font-medium text-[#334155]">
                                  {formatMonthLabel(inv.month)}
                                </div>
                                <div className="text-xs text-[#62748e] font-mono">
                                  {formatVND(inv.totalAmount)}
                                </div>
                              </div>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${cfg.color}`}
                              >
                                <Icon className="w-2.5 h-2.5" />
                                {cfg.label}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                  <button
                    onClick={() => setActiveTab("history")}
                    className="w-full mt-3 text-xs text-[#009689] font-medium hover:underline"
                  >
                    Xem tất cả →
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "history" && <HistoryTab invoices={allInvoices} />}
        </>
      )}

      {/* Payment QR Modal */}
      {payingInvoice && (
        <QrPaymentModal
          invoice={payingInvoice}
          onClose={() => setPayingInvoice(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
