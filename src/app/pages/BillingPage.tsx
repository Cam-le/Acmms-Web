import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  History,
  CheckCircle,
  AlertTriangle,
  FileText,
  Info,
  UserCheck,
  RefreshCw,
  X,
  Ban,
  Upload,
  Eye,
  Pencil,
  CreditCard,
  FileCheck,
  ChevronRight,
  Stethoscope,
} from "lucide-react";
import { api } from "../../api/client";
import type {
  UserResponse,
  ContractResponse,
  ContractCreateRequest,
  ContractUpdateRequest,
  ContractBillResponse,
  PaymentResponse,
  PendingPaymentItem,
  DiagnosisResponse,
  BillItem,
  PaymentItem,
} from "../../api/client";
import { qk } from "../../api/queryKeys";
import { useToast } from "../components/ui/useToast";
import { ToastContainer } from "../components/ui/ToastContainer";
import { LoadingState } from "../components/ui/LoadingState";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { FormField } from "../components/ui/FormField";
import { FormTextarea } from "../components/ui/FormTextarea";
import { FormSelect } from "../components/ui/FormSelect";
import { SearchInput } from "../components/ui/SearchInput";
import { Pagination } from "../components/ui/Pagination";
import { Tabs } from "../components/ui/Tabs";
import { PageHeader } from "../components/ui/PageHeader";
import { useCrudModals } from "../hooks/useCrudModals";
import { usePagination } from "../hooks/usePagination";
import { formatDate, formatDateTime, formatVND } from "../utils/format";
import {
  severityTone,
  severityLabel,
  contractStatusTone,
  contractStatusLabel,
  pendingPaymentStatusTone,
  pendingPaymentStatusLabel,
} from "../utils/status";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 8;

const CONTRACT_TABS = [
  { value: "active" as const, label: "Đang hiệu lực" },
  { value: "terminated" as const, label: "Đã kết thúc" },
  { value: "payment" as const, label: "Chờ thanh toán" },
  { value: "history" as const, label: "Lịch sử thanh toán" },
] as const;

type TabValue = "active" | "terminated" | "payment" | "history";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMonthISO(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime()) || d.getFullYear() <= 1) return "—";
    return `Tháng ${d.getMonth() + 1} / ${d.getFullYear()}`;
  } catch {
    return "—";
  }
}

/** Format for /api/payment/bill?month= and /api/payment/upload Month field: YYYY-MM-DD */
function monthToBillParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

/**
 * Parse an ISO date string into { year, month } (1-indexed month).
 * Returns null if the string is falsy or unparseable.
 */
function parseYearMonth(
  iso: string | null | undefined,
): { year: number; month: number } | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime()) || d.getFullYear() <= 1) return null;
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  } catch {
    return null;
  }
}

/**
 * Given a year/month selection and optional contract date bounds, return
 * whether the selection is out of bounds and a human-readable reason.
 */
function getMonthOutOfBoundsReason(
  selectedYear: number,
  selectedMonth: number,
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string | null {
  const sel = selectedYear * 12 + selectedMonth;

  const start = parseYearMonth(startDate);
  if (start !== null) {
    const startFlat = start.year * 12 + start.month;
    if (sel < startFlat) {
      return `Tháng này trước ngày bắt đầu hợp đồng (${start.month}/${start.year}).`;
    }
  }

  const end = parseYearMonth(endDate);
  if (end !== null) {
    const endFlat = end.year * 12 + end.month;
    if (sel > endFlat) {
      return `Tháng này sau ngày kết thúc hợp đồng (${end.month}/${end.year}).`;
    }
  }

  return null;
}

// ─── MonthSelect — constrained by contract date bounds ───────────────────────

function MonthSelect({
  year,
  month,
  onChange,
  label,
  startDate,
  endDate,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  label?: string;
  /** ISO date string — months before this are disabled */
  startDate?: string | null;
  /** ISO date string — months after this are disabled */
  endDate?: string | null;
}) {
  const now = new Date();

  // Build year range: always include the contract start/end years so the
  // user isn't left with an empty dropdown.
  const parsedStart = parseYearMonth(startDate);
  const parsedEnd = parseYearMonth(endDate);

  const rangeMin = parsedStart ? parsedStart.year : now.getFullYear() - 2;
  const rangeMax = parsedEnd ? parsedEnd.year : now.getFullYear() + 2;

  // Ensure we show at least a 1-year window around "now", but always honour
  // the contract bounds when they're narrower.
  const yearMin = Math.min(rangeMin, now.getFullYear() - 2);
  const yearMax = Math.max(rangeMax, now.getFullYear() + 2);
  const years = Array.from(
    { length: yearMax - yearMin + 1 },
    (_, i) => yearMin + i,
  );

  // Determine which months are disabled for the currently selected year.
  function isMonthDisabled(m: number): boolean {
    const flat = year * 12 + m;
    if (
      parsedStart !== null &&
      flat < parsedStart.year * 12 + parsedStart.month
    )
      return true;
    if (parsedEnd !== null && flat > parsedEnd.year * 12 + parsedEnd.month)
      return true;
    return false;
  }

  // Determine which years are entirely out of bounds (all 12 months disabled).
  function isYearDisabled(y: number): boolean {
    if (parsedStart !== null && y < parsedStart.year) return true;
    if (parsedEnd !== null && y > parsedEnd.year) return true;
    return false;
  }

  // When the user changes year, clamp the month to a valid value for that year.
  function handleYearChange(newYear: number) {
    let newMonth = month;
    const flat = newYear * 12 + newMonth;
    if (parsedStart !== null) {
      const startFlat = parsedStart.year * 12 + parsedStart.month;
      if (flat < startFlat) newMonth = parsedStart.month;
    }
    if (parsedEnd !== null) {
      const endFlat = parsedEnd.year * 12 + parsedEnd.month;
      if (newYear * 12 + newMonth > endFlat) newMonth = parsedEnd.month;
    }
    onChange(newYear, newMonth);
  }

  // When the user changes month, just propagate directly (month options are
  // disabled so invalid values can't be selected natively, but guard anyway).
  function handleMonthChange(newMonth: number) {
    if (!isMonthDisabled(newMonth)) onChange(year, newMonth);
  }

  const outOfBoundsReason = getMonthOutOfBoundsReason(
    year,
    month,
    startDate,
    endDate,
  );

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-ink-600 mb-1.5">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <select
          value={month}
          onChange={(e) => handleMonthChange(Number(e.target.value))}
          className="flex-1 px-3 py-2.5 border border-border-strong rounded-btn text-sm text-ink-700 bg-surface focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
        >
          {Array.from({ length: 12 }, (_, i) => {
            const m = i + 1;
            const disabled = isMonthDisabled(m);
            return (
              <option key={m} value={m} disabled={disabled}>
                Tháng {m}
              </option>
            );
          })}
        </select>
        <select
          value={year}
          onChange={(e) => handleYearChange(Number(e.target.value))}
          className="w-24 px-3 py-2.5 border border-border-strong rounded-btn text-sm text-ink-700 bg-surface focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
        >
          {years.map((y) => (
            <option key={y} value={y} disabled={isYearDisabled(y)}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Out-of-bounds warning (safety net for edge cases) */}
      {outOfBoundsReason && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-status-warning-fg bg-status-warning-bg rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{outOfBoundsReason}</span>
        </div>
      )}
    </div>
  );
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-3 text-sm">
      <span className="text-ink-500 shrink-0">{label}</span>
      <span
        className={`text-ink-700 font-medium text-right ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── DiagnosisDetailPanel ─────────────────────────────────────────────────────
// Fetches and shows full diagnosis info for a single diagnosis item.

function DiagnosisDetailPanel({
  diagnosisId,
  onClose,
}: {
  diagnosisId: string;
  onClose: () => void;
}) {
  const diagnosisQuery = useQuery({
    queryKey: ["diagnosis", diagnosisId],
    queryFn: () =>
      api.getDiagnosisById(diagnosisId) as Promise<DiagnosisResponse>,
    staleTime: 5 * 60_000,
  });

  const d = diagnosisQuery.data;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-2 pb-3 border-b border-border mb-3">
        <div className="flex items-center gap-1.5">
          <Stethoscope className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-semibold text-ink-700">
            Chi tiết chẩn đoán
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-btn text-ink-400 hover:text-ink-700 hover:bg-surface-subtle transition-colors shrink-0"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Report badge */}
      {!diagnosisQuery.isLoading && d?.reportNo && (
        <div className="shrink-0 mb-3 px-3 py-2 rounded-btn border border-border bg-surface-subtle">
          <span className="text-sm font-mono font-semibold text-ink-800">
            {d.reportNo}
          </span>
        </div>
      )}

      {/* Panel body — scrollable */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {diagnosisQuery.isLoading ? (
          <LoadingState message="Đang tải..." />
        ) : diagnosisQuery.isError ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-7 h-7 text-ink-300 mx-auto mb-2" />
            <p className="text-sm text-ink-500">Không thể tải thông tin.</p>
          </div>
        ) : d ? (
          <>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-ink-800 leading-snug">
                {d.reportTitle ?? "—"}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <StatusBadge
                label={severityLabel(d.severityLevel)}
                tone={severityTone(d.severityLevel)}
              />
              <span className="text-xs text-ink-400">
                {d.createdAt ? formatDateTime(d.createdAt) : "—"}
              </span>
            </div>

            <div className="space-y-0.5">
              <p className="text-xs text-ink-400">Chuyên gia</p>
              <p className="text-sm text-ink-700">{d.diagnoserName ?? "—"}</p>
            </div>

            <div className="border-t border-border pt-2.5 space-y-1">
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide">
                Tên bệnh
              </p>
              <p className="text-sm font-medium text-ink-800">
                {d.diseaseName ?? "—"}
              </p>
            </div>

            <div className="border-t border-border pt-2.5 space-y-1">
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide">
                Kết luận
              </p>
              <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">
                {d.conclusion || "—"}
              </p>
            </div>

            <div className="border-t border-border pt-2.5 space-y-1">
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide">
                Hướng xử lý
              </p>
              <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">
                {d.recommendedAction || "—"}
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ─── BillPreviewPanel ─────────────────────────────────────────────────────────

function BillPreviewPanel({
  specialistId,
  expertName,
  startDate,
  endDate,
  fixedMonth,
  qrUrl,
  onClose,
}: {
  specialistId: string;
  expertName: string;
  /** ISO date string for contract start — used to constrain month picker */
  startDate: string | null | undefined;
  /** ISO date string for contract end — used to constrain month picker */
  endDate: string | null | undefined;
  /**
   * When provided the month picker is hidden and this month is used directly.
   * Format: ISO date string, e.g. "2026-04-01T00:00:00"
   */
  fixedMonth?: string | null;
  /** Pre-fetched QR code URL from pending payment — shown above upload */
  qrUrl?: string | null;
  onClose: () => void;
}) {
  const { toasts, showToast, dismissToast } = useToast();
  const queryClient = useQueryClient();

  // If fixedMonth is provided, derive year/month from it. Otherwise default
  // to current month clamped to the contract's valid range.
  function resolveInitialMonth(): { year: number; month: number } {
    if (fixedMonth) {
      try {
        const d = new Date(fixedMonth);
        if (!isNaN(d.getTime()) && d.getFullYear() > 1) {
          return { year: d.getFullYear(), month: d.getMonth() + 1 };
        }
      } catch {
        /* fall through */
      }
    }
    const now = new Date();
    const parsedStart = parseYearMonth(startDate);
    const parsedEnd = parseYearMonth(endDate);
    let y = now.getFullYear();
    let m = now.getMonth() + 1;
    const flat = y * 12 + m;
    if (parsedStart !== null) {
      const sf = parsedStart.year * 12 + parsedStart.month;
      if (flat < sf) {
        y = parsedStart.year;
        m = parsedStart.month;
      }
    }
    if (parsedEnd !== null) {
      const ef = parsedEnd.year * 12 + parsedEnd.month;
      if (y * 12 + m > ef) {
        y = parsedEnd.year;
        m = parsedEnd.month;
      }
    }
    return { year: y, month: m };
  }

  const initial = resolveInitialMonth();
  const [selectedYear, setSelectedYear] = useState(initial.year);
  const [selectedMonth, setSelectedMonth] = useState(initial.month);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<BillItem | null>(
    null,
  );

  const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  const outOfBounds = fixedMonth
    ? null
    : getMonthOutOfBoundsReason(
        selectedYear,
        selectedMonth,
        startDate,
        endDate,
      );

  const billQuery = useQuery({
    queryKey: qk.contracts.bill(specialistId, monthKey),
    queryFn: () =>
      api.getPaymentBill(
        specialistId,
        monthToBillParam(selectedYear, selectedMonth),
      ) as Promise<ContractBillResponse>,
    retry: 1,
    enabled: outOfBounds === null,
  });

  useEffect(() => {
    if (billQuery.error)
      showToast(
        billQuery.error instanceof Error
          ? billQuery.error.message
          : "Không thể tải thông tin hóa đơn",
        "error",
      );
  }, [billQuery.error, showToast]);

  const uploadMutation = useMutation({
    mutationFn: (f: File) =>
      api.uploadPayment({
        specialistId,
        month: monthToBillParam(selectedYear, selectedMonth),
        file: f,
      }),
    onSuccess: () => {
      showToast("Tải lên hóa đơn thành công", "success");
      queryClient.invalidateQueries({
        queryKey: qk.contracts.bill(specialistId, monthKey),
      });
      queryClient.invalidateQueries({ queryKey: qk.payments.all });
      queryClient.invalidateQueries({ queryKey: ["payments", "pending"] });
      setFile(null);
      setSelectedDiagnosis(null);
    },
    onError: (err) =>
      showToast(
        err instanceof Error ? err.message : "Tải lên thất bại",
        "error",
      ),
  });

  const bill = billQuery.data;

  const paymentsQuery = useQuery({
    queryKey: qk.payments.list(),
    queryFn: api.getPayments as () => Promise<PaymentResponse[]>,
    enabled: bill?.isPaid === true,
    staleTime: 60_000,
  });

  const matchedPayment: PaymentResponse | null = React.useMemo(() => {
    if (!bill?.isPaid || !paymentsQuery.data) return null;
    const billMonth = bill.month ? bill.month.slice(0, 7) : null;
    return (
      paymentsQuery.data.find((p) => {
        const pMonth = p.month ? p.month.slice(0, 7) : null;
        return p.specialistId === specialistId && pMonth === billMonth;
      }) ?? null
    );
  }, [bill, paymentsQuery.data, specialistId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > 5 * 1024 * 1024) {
      showToast("File không được vượt quá 5MB", "error");
      return;
    }
    if (f && !f.type.startsWith("image/")) {
      showToast("Chỉ chấp nhận file hình ảnh", "error");
      return;
    }
    setFile(f);
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Thanh toán"
      description={expertName}
      size={selectedDiagnosis ? "3xl" : "md"}
      footer={
        bill?.isPaid ? (
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={uploadMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              loading={uploadMutation.isPending}
              disabled={!file || !bill || !!outOfBounds}
              onClick={() => file && uploadMutation.mutate(file)}
              leadingIcon={Upload}
            >
              Xác nhận thanh toán
            </Button>
          </>
        )
      }
    >
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className={`flex gap-5 ${selectedDiagnosis ? "min-h-[440px]" : ""}`}>
        {/* Left pane — always visible */}
        <div
          className={`space-y-4 ${selectedDiagnosis ? "w-[52%] overflow-y-auto" : "w-full"}`}
        >
          {/* Month picker — only shown when month is not fixed */}
          {!fixedMonth && (
            <MonthSelect
              year={selectedYear}
              month={selectedMonth}
              onChange={(y, m) => {
                setSelectedYear(y);
                setSelectedMonth(m);
                setFile(null);
              }}
              label="Chọn tháng thanh toán"
              startDate={startDate}
              endDate={endDate}
            />
          )}

          {/* Only show bill panel when month is in bounds */}
          {outOfBounds ? null : billQuery.isLoading ? (
            <LoadingState message="Đang tải hóa đơn..." />
          ) : bill?.isPaid ? (
            /* ── Paid state ── */
            <div className="rounded-xl border border-status-success-fg/20 bg-status-success-bg overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 bg-status-success-fg/10 border-b border-status-success-fg/15">
                <CheckCircle className="w-5 h-5 text-status-success-fg shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-status-success-fg">
                    Đã thanh toán
                  </p>
                  <p className="text-xs text-status-success-fg/70">
                    {formatMonthISO(bill.month)} · {bill.specialistName ?? "—"}
                  </p>
                </div>
                <span className="ml-auto text-base font-bold text-status-success-fg shrink-0">
                  {formatVND(matchedPayment?.amount ?? bill.totalAmount ?? 0)}
                </span>
              </div>
              <div className="px-4 py-3 space-y-2">
                <InfoRow
                  label="Số chẩn đoán"
                  value={`${matchedPayment?.totalDiagnoses ?? bill.totalDiagnoses ?? 0} lượt`}
                />
                {matchedPayment?.paidAt && (
                  <InfoRow
                    label="Ngày thanh toán"
                    value={formatDateTime(matchedPayment.paidAt)}
                  />
                )}
                <InfoRow label="Ngân hàng" value={bill.bankName ?? "—"} />
                <InfoRow
                  label="Số tài khoản"
                  value={bill.bankAccount ?? "—"}
                  mono
                />
                <InfoRow
                  label="Chủ tài khoản"
                  value={bill.accountHolder ?? "—"}
                />
              </div>
              {(bill.items ?? []).length > 0 && (
                <div className="px-4 pb-3 pt-0 border-t border-status-success-fg/15 mt-0">
                  <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2 pt-3">
                    Chẩn đoán ({(bill.items ?? []).length} lượt)
                  </p>
                  <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                    {(bill.items ?? []).map((item, idx) => {
                      const isActive =
                        selectedDiagnosis?.diagnosisResultId ===
                        item.diagnosisResultId;
                      return (
                        <button
                          key={item.diagnosisResultId}
                          type="button"
                          onClick={() =>
                            isActive
                              ? setSelectedDiagnosis(null)
                              : setSelectedDiagnosis(item)
                          }
                          className={`w-full flex items-center justify-between gap-2 text-xs rounded-lg px-2 py-1.5 transition-colors group text-left ${
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-primary/10 text-ink-700"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-ink-400 shrink-0 w-4 text-center">
                              {idx + 1}.
                            </span>
                            <span className="font-mono truncate">
                              {item.reportNo ??
                                item.reportId?.slice(-8).toUpperCase() ??
                                "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="font-mono">
                              {formatVND(item.unitPrice ?? 0)}
                            </span>
                            <ChevronRight
                              className={`w-3 h-3 transition-colors ${isActive ? "text-primary" : "text-ink-300 group-hover:text-primary"}`}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : bill ? (
            /* ── Unpaid state ── */
            <div className="bg-primary-50 rounded-xl border border-primary/20 p-4 space-y-2.5">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-ink-800">
                  Thông tin hóa đơn
                </h4>
              </div>
              <InfoRow label="Chuyên gia" value={bill.specialistName ?? "—"} />
              <InfoRow
                label="Kỳ thanh toán"
                value={formatMonthISO(bill.month)}
              />
              <InfoRow
                label="Số chẩn đoán"
                value={`${bill.totalDiagnoses ?? 0} lượt`}
              />
              <div className="border-t border-primary/20 pt-2 flex justify-between items-center">
                <span className="text-sm font-semibold text-ink-800">
                  Tổng cộng
                </span>
                <span className="text-base font-bold text-primary">
                  {formatVND(bill.totalAmount ?? 0)}
                </span>
              </div>
              <div className="pt-2 border-t border-primary/20 space-y-1.5">
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">
                  Thông tin chuyển khoản
                </p>
                <InfoRow label="Ngân hàng" value={bill.bankName ?? "—"} />
                <InfoRow
                  label="Số tài khoản"
                  value={bill.bankAccount ?? "—"}
                  mono
                />
                <InfoRow
                  label="Chủ tài khoản"
                  value={bill.accountHolder ?? "—"}
                />
              </div>
              {(bill.items ?? []).length > 0 && (
                <div className="pt-2 border-t border-primary/20">
                  <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
                    Chẩn đoán ({(bill.items ?? []).length} lượt)
                  </p>
                  <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                    {(bill.items ?? []).map((item, idx) => {
                      const isActive =
                        selectedDiagnosis?.diagnosisResultId ===
                        item.diagnosisResultId;
                      return (
                        <button
                          key={item.diagnosisResultId}
                          type="button"
                          onClick={() =>
                            isActive
                              ? setSelectedDiagnosis(null)
                              : setSelectedDiagnosis(item)
                          }
                          className={`w-full flex items-center justify-between gap-2 text-xs rounded-lg px-2 py-1.5 transition-colors group text-left ${
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-primary/10 text-ink-700"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-ink-400 shrink-0 w-4 text-center">
                              {idx + 1}.
                            </span>
                            <span className="font-mono truncate">
                              {item.reportNo ??
                                item.reportId?.slice(-8).toUpperCase() ??
                                "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="font-mono">
                              {formatVND(item.unitPrice ?? 0)}
                            </span>
                            <ChevronRight
                              className={`w-3 h-3 transition-colors ${isActive ? "text-primary" : "text-ink-300 group-hover:text-primary"}`}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {bill && !bill.isPaid && !outOfBounds && (
            <>
              {/* QR code — shown above the upload drop zone when available */}
              {qrUrl && (
                <div className="rounded-xl border border-border bg-surface-alt p-3 flex flex-col items-center gap-2">
                  <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">
                    Mã QR chuyển khoản
                  </p>
                  <img
                    src={qrUrl}
                    alt="QR chuyển khoản"
                    className="w-48 h-48 object-contain rounded-lg"
                  />
                  <p className="text-xs text-ink-400 text-center">
                    Quét mã để chuyển khoản, sau đó tải lên biên lai bên dưới.
                  </p>
                </div>
              )}

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                  file
                    ? "border-primary bg-primary-50"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {file ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs text-ink-800 font-medium truncate">
                        {file.name}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="text-ink-400 hover:text-status-danger-fg shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-6 h-6 text-ink-400 mx-auto" />
                    <p className="text-xs text-ink-500">
                      Nhấn để chọn ảnh hóa đơn (≤ 5MB)
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex items-start gap-2 text-xs text-ink-500 bg-surface-subtle rounded-lg p-3 border border-border">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                <span>
                  Chụp ảnh biên lai hoặc screenshot giao dịch ngân hàng rồi tải
                  lên để xác nhận thanh toán.
                </span>
              </div>
            </>
          )}
        </div>
        {/* end left pane */}

        {/* Right pane — slides in when a diagnosis is selected */}
        {selectedDiagnosis && (
          <>
            <div className="w-px bg-border shrink-0" />
            <div className="w-[48%] flex flex-col min-h-0">
              <DiagnosisDetailPanel
                diagnosisId={selectedDiagnosis.diagnosisResultId}
                onClose={() => setSelectedDiagnosis(null)}
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── CreateContractModal ──────────────────────────────────────────────────────

function CreateContractModal({ onClose }: { onClose: () => void }) {
  const { toasts, showToast, dismissToast } = useToast();
  const queryClient = useQueryClient();

  const staffsQuery = useQuery({
    queryKey: qk.staffs.list(),
    queryFn: api.getStaffs,
  });

  useEffect(() => {
    if (staffsQuery.error)
      showToast("Không thể tải danh sách chuyên gia", "error");
  }, [staffsQuery.error, showToast]);

  const expertOptions = (staffsQuery.data ?? [])
    .filter((s: UserResponse) => s.roleName === "Specialist")
    .map((s: UserResponse) => ({ value: s.userId, label: s.fullname }));

  const defaultStartDate = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    expertId: "",
    bankAccount: "",
    bankName: "",
    bankBin: "",
    accountHolder: "",
    pricePerDiagnosis: "",
    startDate: defaultStartDate,
    endDate: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  const createMutation = useMutation({
    mutationFn: (body: ContractCreateRequest) =>
      api.createContract(body) as Promise<ContractResponse>,
    onSuccess: () => {
      showToast("Tạo hợp đồng thành công", "success");
      queryClient.invalidateQueries({ queryKey: qk.contracts.all });
      onClose();
    },
    onError: (err) =>
      showToast(
        err instanceof Error ? err.message : "Tạo hợp đồng thất bại",
        "error",
      ),
  });

  function validate(): boolean {
    const e: Partial<typeof form> = {};
    if (!form.expertId) e.expertId = "Vui lòng chọn chuyên gia";
    if (!form.bankAccount.trim()) e.bankAccount = "Vui lòng nhập số tài khoản";
    if (!form.bankName.trim()) e.bankName = "Vui lòng nhập tên ngân hàng";
    if (!form.bankBin.trim()) e.bankBin = "Vui lòng nhập mã BIN ngân hàng";
    if (!form.accountHolder.trim())
      e.accountHolder = "Vui lòng nhập chủ tài khoản";
    const price = parseFloat(form.pricePerDiagnosis);
    if (isNaN(price) || price <= 0)
      e.pricePerDiagnosis = "Đơn giá phải lớn hơn 0";
    if (!form.startDate) e.startDate = "Vui lòng chọn ngày bắt đầu";
    if (form.endDate && form.startDate && form.endDate <= form.startDate)
      e.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    createMutation.mutate({
      expertId: form.expertId,
      bankAccount: form.bankAccount.trim(),
      bankName: form.bankName.trim(),
      bankBin: form.bankBin.trim(),
      accountHolder: form.accountHolder.trim(),
      pricePerDiagnosis: parseFloat(form.pricePerDiagnosis),
      startDate: `${form.startDate}T00:00:00.000Z`,
      endDate: form.endDate ? `${form.endDate}T00:00:00.000Z` : undefined,
      notes: form.notes.trim() || undefined,
    });
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Tạo hợp đồng"
      size="lg"
      onSubmit={handleSubmit}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={createMutation.isPending}
          >
            Hủy
          </Button>
          <Button type="submit" loading={createMutation.isPending}>
            Tạo hợp đồng
          </Button>
        </>
      }
    >
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {staffsQuery.isLoading ? (
        <LoadingState message="Đang tải..." />
      ) : (
        <div className="space-y-4">
          <FormSelect
            label="Chuyên gia"
            required
            value={form.expertId}
            onChange={(v) => setForm((f) => ({ ...f, expertId: v }))}
            options={expertOptions}
            placeholder="— Chọn chuyên gia —"
            error={errors.expertId}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Số tài khoản"
              required
              value={form.bankAccount}
              onChange={(v) => setForm((f) => ({ ...f, bankAccount: v }))}
              placeholder="Nhập số tài khoản"
              error={errors.bankAccount}
            />
            <FormField
              label="Ngân hàng"
              required
              value={form.bankName}
              onChange={(v) => setForm((f) => ({ ...f, bankName: v }))}
              placeholder="VD: Vietcombank"
              error={errors.bankName}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Mã BIN ngân hàng"
              required
              value={form.bankBin}
              onChange={(v) => setForm((f) => ({ ...f, bankBin: v }))}
              placeholder="VD: 970436"
              hint="Mã BIN 6 chữ số của ngân hàng"
              error={errors.bankBin}
            />
            <FormField
              label="Chủ tài khoản"
              required
              value={form.accountHolder}
              onChange={(v) => setForm((f) => ({ ...f, accountHolder: v }))}
              placeholder="NGUYEN VAN A"
              error={errors.accountHolder}
            />
          </div>
          <FormField
            label="Đơn giá / chẩn đoán (₫)"
            required
            type="number"
            value={form.pricePerDiagnosis}
            onChange={(v) => setForm((f) => ({ ...f, pricePerDiagnosis: v }))}
            placeholder="50000"
            inputProps={{ min: "1", step: "1" }}
            error={errors.pricePerDiagnosis}
            hint={
              form.pricePerDiagnosis &&
              !isNaN(parseFloat(form.pricePerDiagnosis))
                ? `= ${formatVND(parseFloat(form.pricePerDiagnosis))}`
                : undefined
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Ngày bắt đầu"
              required
              type="date"
              value={form.startDate}
              onChange={(v) => setForm((f) => ({ ...f, startDate: v }))}
              error={errors.startDate}
            />
            <FormField
              label="Ngày kết thúc (tùy chọn)"
              type="date"
              value={form.endDate}
              onChange={(v) => setForm((f) => ({ ...f, endDate: v }))}
              inputProps={{ min: form.startDate }}
              error={errors.endDate}
            />
          </div>
          <FormTextarea
            label="Ghi chú"
            value={form.notes}
            onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
            placeholder="Ghi chú thêm (không bắt buộc)"
            rows={2}
          />
        </div>
      )}
    </Modal>
  );
}

// ─── EditContractModal ────────────────────────────────────────────────────────

function EditContractModal({
  contract,
  onClose,
}: {
  contract: ContractResponse;
  onClose: () => void;
}) {
  const { toasts, showToast, dismissToast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    bankAccount: contract.bankAccount,
    bankName: contract.bankName,
    bankBin: contract.bankBin ?? "",
    accountHolder: contract.accountHolder,
    endDate: contract.endDate ? contract.endDate.slice(0, 10) : "",
    notes: contract.notes ?? "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  const updateMutation = useMutation({
    mutationFn: (body: ContractUpdateRequest) =>
      api.updateContract(contract.id, body) as Promise<ContractResponse>,
    onSuccess: () => {
      showToast("Cập nhật hợp đồng thành công", "success");
      queryClient.invalidateQueries({ queryKey: qk.contracts.all });
      onClose();
    },
    onError: (err) =>
      showToast(
        err instanceof Error ? err.message : "Cập nhật thất bại",
        "error",
      ),
  });

  function validate(): boolean {
    const e: Partial<typeof form> = {};
    if (!form.bankAccount.trim()) e.bankAccount = "Bắt buộc";
    if (!form.bankName.trim()) e.bankName = "Bắt buộc";
    if (!form.bankBin.trim()) e.bankBin = "Bắt buộc";
    if (!form.accountHolder.trim()) e.accountHolder = "Bắt buộc";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    updateMutation.mutate({
      bankAccount: form.bankAccount.trim(),
      bankName: form.bankName.trim(),
      bankBin: form.bankBin.trim(),
      accountHolder: form.accountHolder.trim(),
      endDate: form.endDate ? `${form.endDate}T00:00:00.000Z` : undefined,
      notes: form.notes.trim() || undefined,
    });
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Chỉnh sửa hợp đồng"
      description={contract.contractCode}
      size="lg"
      onSubmit={handleSubmit}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={updateMutation.isPending}
          >
            Hủy
          </Button>
          <Button type="submit" loading={updateMutation.isPending}>
            Lưu thay đổi
          </Button>
        </>
      }
    >
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Số tài khoản"
            required
            value={form.bankAccount}
            onChange={(v) => setForm((f) => ({ ...f, bankAccount: v }))}
            error={errors.bankAccount}
          />
          <FormField
            label="Ngân hàng"
            required
            value={form.bankName}
            onChange={(v) => setForm((f) => ({ ...f, bankName: v }))}
            error={errors.bankName}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Mã BIN ngân hàng"
            required
            value={form.bankBin}
            onChange={(v) => setForm((f) => ({ ...f, bankBin: v }))}
            placeholder="VD: 970436"
            hint="Mã BIN 6 chữ số của ngân hàng"
            error={errors.bankBin}
          />
          <FormField
            label="Chủ tài khoản"
            required
            value={form.accountHolder}
            onChange={(v) => setForm((f) => ({ ...f, accountHolder: v }))}
            error={errors.accountHolder}
          />
        </div>
        <FormField
          label="Ngày kết thúc (tùy chọn)"
          type="date"
          value={form.endDate}
          onChange={(v) => setForm((f) => ({ ...f, endDate: v }))}
        />
        <FormTextarea
          label="Ghi chú"
          value={form.notes}
          onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
          rows={2}
        />
      </div>
    </Modal>
  );
}

// ─── ViewContractModal ────────────────────────────────────────────────────────

function ViewContractModal({
  contract,
  onClose,
}: {
  contract: ContractResponse;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Chi tiết hợp đồng"
      description={contract.contractCode}
      size="md"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink-700">Trạng thái</span>
          <StatusBadge
            label={contractStatusLabel(contract.status)}
            tone={contractStatusTone(contract.status)}
          />
        </div>
        <div className="bg-surface-alt rounded-xl border border-border p-4 space-y-2.5">
          <InfoRow
            label="Mã hợp đồng"
            value={contract.contractCode ?? "—"}
            mono
          />
          <InfoRow label="Chuyên gia" value={contract.expertName ?? "—"} />
          <InfoRow
            label="Đơn giá / chẩn đoán"
            value={formatVND(contract.pricePerDiagnosis ?? 0)}
          />
          <InfoRow
            label="Ngày bắt đầu"
            value={formatDate(contract.startDate)}
          />
          <InfoRow
            label="Ngày kết thúc"
            value={
              contract.endDate ? formatDate(contract.endDate) : "Không giới hạn"
            }
          />
          {contract.notes && <InfoRow label="Ghi chú" value={contract.notes} />}
        </div>
        <div className="bg-surface-alt rounded-xl border border-border p-4 space-y-2.5">
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-1">
            Thông tin ngân hàng
          </p>
          <InfoRow label="Ngân hàng" value={contract.bankName ?? "—"} />
          <InfoRow label="Mã BIN" value={contract.bankBin ?? "—"} mono />
          <InfoRow
            label="Số tài khoản"
            value={contract.bankAccount ?? "—"}
            mono
          />
          <InfoRow
            label="Chủ tài khoản"
            value={contract.accountHolder ?? "—"}
          />
        </div>
      </div>
    </Modal>
  );
}

// ─── ContractRow ──────────────────────────────────────────────────────────────

function ContractRow({
  contract,
  onView,
  onEdit,
  onTerminate,
  terminatingId,
}: {
  contract: ContractResponse;
  onView: (c: ContractResponse) => void;
  onEdit: (c: ContractResponse) => void;
  onTerminate: (c: ContractResponse) => void;
  terminatingId: string | null;
}) {
  const isActive = contract.status === "active";
  const isTerminating = terminatingId === contract.id;

  return (
    <tr className="hover:bg-surface-alt transition-colors">
      <td className="px-4 py-3">
        <span className="text-xs font-mono text-ink-500">
          {contract.contractCode}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <UserCheck className="w-3.5 h-3.5 text-ink-400 shrink-0" />
          <span className="text-sm text-ink-700">{contract.expertName}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-ink-500 whitespace-nowrap">
        {contract.bankName}
      </td>
      <td className="px-4 py-3 text-sm font-mono text-ink-700 whitespace-nowrap">
        {formatVND(contract.pricePerDiagnosis ?? 0)}
      </td>
      <td className="px-4 py-3 text-sm text-ink-700 whitespace-nowrap">
        {formatDate(contract.startDate)}
      </td>
      <td className="px-4 py-3 text-sm text-ink-700 whitespace-nowrap hidden sm:table-cell">
        {contract.endDate ? formatDate(contract.endDate) : "—"}
      </td>

      {/* Fixed-width actions cell */}
      <td className="px-4 py-3 w-[100px]">
        <div className="flex items-center justify-end gap-0.5">
          {/* Slot 1: View (always shown) */}
          <button
            type="button"
            onClick={() => onView(contract)}
            title="Xem"
            aria-label="Xem"
            className="p-1.5 rounded-btn text-ink-500 hover:text-primary hover:bg-primary-50 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Slot 2: Edit (active only) */}
          {isActive ? (
            <button
              type="button"
              onClick={() => onEdit(contract)}
              title="Chỉnh sửa"
              aria-label="Chỉnh sửa"
              className="p-1.5 rounded-btn text-ink-500 hover:text-primary hover:bg-primary-50 transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
          ) : (
            <span className="w-7 shrink-0" />
          )}

          {/* Slot 3: Terminate (active only) */}
          {isActive ? (
            <button
              type="button"
              onClick={() => onTerminate(contract)}
              disabled={isTerminating}
              title="Kết thúc hợp đồng"
              aria-label="Kết thúc hợp đồng"
              className="p-1.5 rounded-btn text-ink-500 hover:text-status-danger-fg hover:bg-status-danger-bg transition-colors disabled:opacity-40"
            >
              {isTerminating ? (
                <div className="w-4 h-4 border-2 border-status-danger-fg border-t-transparent rounded-full animate-spin" />
              ) : (
                <Ban className="w-4 h-4" />
              )}
            </button>
          ) : (
            <span className="w-7 shrink-0" />
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── PaymentDetailModal ───────────────────────────────────────────────────────

function PaymentDetailModal({
  payment,
  onClose,
}: {
  payment: PaymentResponse;
  onClose: () => void;
}) {
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [selectedDiagnosis, setSelectedDiagnosis] =
    useState<PaymentItem | null>(null);

  // Radix Dialog detects "clicked outside" via a capture-phase pointerdown
  // listener on document and closes the modal when default is not prevented.
  // While the lightbox is open we intercept in the capture phase first and
  // call preventDefault(), telling Radix not to dismiss. The lightbox's own
  // onClick still fires so backdrop-click-to-close and the X button both work.
  useEffect(() => {
    if (!previewImg) return;
    function suppressRadixDismiss(e: PointerEvent) {
      e.preventDefault();
    }
    document.addEventListener("pointerdown", suppressRadixDismiss, {
      capture: true,
    });
    return () => {
      document.removeEventListener("pointerdown", suppressRadixDismiss, {
        capture: true,
      });
    };
  }, [previewImg]);

  return (
    <>
      <Modal
        open
        onOpenChange={(o) => !o && onClose()}
        title="Chi tiết thanh toán"
        description={`${payment.specialistName} — ${formatMonthISO(payment.month)}`}
        size="2xl"
        footer={
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        }
      >
        <div
          className={`flex gap-0 ${selectedDiagnosis ? "min-h-[480px]" : ""}`}
        >
          {/* Left pane */}
          <div
            className={`space-y-4 ${selectedDiagnosis ? "w-[55%] overflow-y-auto pr-4" : "w-full"}`}
          >
            {/* Summary */}
            <div className="bg-surface-alt rounded-xl border border-border p-4 space-y-2.5">
              <InfoRow
                label="Chuyên gia"
                value={payment.specialistName ?? "—"}
              />
              <InfoRow
                label="Kỳ thanh toán"
                value={formatMonthISO(payment.month)}
              />
              <InfoRow
                label="Số chẩn đoán"
                value={`${payment.totalDiagnoses ?? 0} lượt`}
              />
              <div className="border-t border-border pt-2 flex justify-between items-center">
                <span className="text-sm text-ink-500 shrink-0">Tổng tiền</span>
                <span className="text-base font-bold text-primary">
                  {formatVND(payment.amount ?? 0)}
                </span>
              </div>
            </div>

            {/* Bill image */}
            {payment.billImageUrl && (
              <div>
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
                  Ảnh hóa đơn
                </p>
                <button
                  onClick={() => setPreviewImg(payment.billImageUrl)}
                  className="block w-full"
                >
                  <img
                    src={payment.billImageUrl}
                    alt="Hóa đơn"
                    className="w-full max-h-40 object-cover rounded-lg border border-border hover:opacity-90 transition-opacity"
                  />
                </button>
                <p className="text-xs text-ink-400 mt-1 text-center">
                  Nhấn để xem toàn màn hình
                </p>
              </div>
            )}

            {/* Diagnosis items */}
            <div>
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
                Chẩn đoán ({(payment.items ?? []).length} lượt)
              </p>
              {(payment.items ?? []).length === 0 ? (
                <EmptyState message="Không có dữ liệu chi tiết." size="sm" />
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  {(payment.items ?? []).map((item, idx) => {
                    const isActive =
                      selectedDiagnosis?.diagnosisResultId ===
                      item.diagnosisResultId;
                    return (
                      <button
                        key={item.id ?? item.diagnosisResultId ?? idx}
                        type="button"
                        onClick={() =>
                          isActive
                            ? setSelectedDiagnosis(null)
                            : setSelectedDiagnosis(item)
                        }
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors group text-left border-b border-border last:border-b-0 ${
                          isActive ? "bg-primary/10" : "hover:bg-surface-alt"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-ink-400 text-xs shrink-0 w-5 text-right">
                            {idx + 1}.
                          </span>
                          <span
                            className={`text-xs font-mono ${isActive ? "text-primary font-semibold" : "text-ink-600"}`}
                          >
                            {item.reportNo ??
                              item.reportId?.slice(-8).toUpperCase() ??
                              "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-mono text-ink-700">
                            {formatVND(item.unitPrice ?? 0)}
                          </span>
                          <ChevronRight
                            className={`w-3.5 h-3.5 transition-colors ${isActive ? "text-primary" : "text-ink-300 group-hover:text-primary"}`}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          {/* end left pane */}

          {/* Right pane */}
          {selectedDiagnosis && (
            <div className="w-[45%] -my-5 -mr-6 flex flex-col">
              <DiagnosisDetailPanel
                diagnosisId={selectedDiagnosis.diagnosisResultId}
                onClose={() => setSelectedDiagnosis(null)}
              />
            </div>
          )}
        </div>
      </Modal>
      {previewImg &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreviewImg(null)}
          >
            <div
              className="relative max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewImg}
                alt="Hóa đơn"
                className="w-full rounded-xl shadow-2xl object-contain max-h-[85vh]"
              />
              <button
                type="button"
                onClick={() => setPreviewImg(null)}
                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                aria-label="Đóng ảnh"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

// ─── PaymentPendingTab ────────────────────────────────────────────────────────

function PaymentPendingTab() {
  const { toasts, showToast, dismissToast } = useToast();
  const [dueOnly, setDueOnly] = useState(false);
  const [pendingSearch, setPendingSearch] = useState("");
  const [payItem, setPayItem] = useState<PendingPaymentItem | null>(null);

  const pendingQuery = useQuery({
    queryKey: ["payments", "pending", { dueOnly }],
    queryFn: () => api.getPendingPayments({ dueOnly: dueOnly || undefined }),
  });

  useEffect(() => {
    if (pendingQuery.error)
      showToast("Không thể tải danh sách chờ thanh toán", "error");
  }, [pendingQuery.error, showToast]);

  const allItems: PendingPaymentItem[] = pendingQuery.data ?? [];

  const filtered = allItems.filter((item) => {
    const q = pendingSearch.toLowerCase();
    return !q || (item.specialistName ?? "").toLowerCase().includes(q);
  });

  const { page, totalPages, pagedItems, setPage, reset } = usePagination(
    filtered,
    PAGE_SIZE,
  );

  useEffect(() => {
    reset();
  }, [pendingSearch, dueOnly, reset]);

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {/* Filter bar */}
      <div className="p-4 border-b border-border flex flex-wrap gap-2 items-center">
        <SearchInput
          value={pendingSearch}
          onChange={setPendingSearch}
          placeholder="Tìm theo tên chuyên gia..."
          className="flex-1 min-w-[180px]"
        />
        <label className="flex items-center gap-2 text-sm text-ink-600 cursor-pointer select-none shrink-0">
          <input
            type="checkbox"
            checked={dueOnly}
            onChange={(e) => setDueOnly(e.target.checked)}
            className="w-4 h-4 rounded accent-primary"
          />
          Chỉ hiện quá hạn
        </label>
      </div>

      {pendingQuery.isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title={
            pendingSearch || dueOnly
              ? "Không tìm thấy kết quả"
              : "Không có khoản chờ thanh toán"
          }
          message={
            pendingSearch
              ? "Thử thay đổi từ khoá tìm kiếm."
              : dueOnly
                ? "Không có khoản nào quá hạn."
                : "Tất cả các chuyên gia đã được thanh toán."
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface-alt border-b border-border">
                <tr>
                  {[
                    "Chuyên gia",
                    "Tháng",
                    "Chẩn đoán",
                    "Số tiền",
                    "Trạng thái",
                    "Thao tác",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pagedItems.map((item) => (
                  <tr
                    key={`${item.specialistId}-${item.month}`}
                    className="hover:bg-surface-alt transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-ink-800">
                      {item.specialistName}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-700 whitespace-nowrap">
                      {formatMonthISO(item.month)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-ink-700">
                      {item.totalDiagnoses}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-bold text-ink-800 whitespace-nowrap">
                      {formatVND(item.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        tone={pendingPaymentStatusTone(item.isDue)}
                        label={pendingPaymentStatusLabel(
                          item.isDue,
                          item.daysOverdue,
                        )}
                        icon={item.isDue ? AlertTriangle : undefined}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="primary"
                        leadingIcon={CreditCard}
                        onClick={() => setPayItem(item)}
                      >
                        Thanh toán
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            showLabel
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            itemLabel="khoản"
          />
        </>
      )}

      {payItem && (
        <BillPreviewPanel
          specialistId={payItem.specialistId}
          expertName={payItem.specialistName}
          startDate={null}
          endDate={null}
          fixedMonth={payItem.month}
          qrUrl={payItem.qrUrl}
          onClose={() => setPayItem(null)}
        />
      )}
    </>
  );
}

// ─── PaymentHistoryTab ────────────────────────────────────────────────────────

function PaymentHistoryTab() {
  const { toasts, showToast, dismissToast } = useToast();
  const [detailPayment, setDetailPayment] = useState<PaymentResponse | null>(
    null,
  );
  const [historySearch, setHistorySearch] = useState("");
  const [filterYear, setFilterYear] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<string>("");

  const paymentsQuery = useQuery({
    queryKey: qk.payments.list(),
    queryFn: api.getPayments as () => Promise<PaymentResponse[]>,
  });

  useEffect(() => {
    if (paymentsQuery.error)
      showToast("Không thể tải lịch sử thanh toán", "error");
  }, [paymentsQuery.error, showToast]);

  const allPayments = paymentsQuery.data ?? [];

  // Build year options from actual data
  const availableYears = Array.from(
    new Set(
      allPayments
        .map((p) => {
          try {
            return new Date(p.month).getFullYear();
          } catch {
            return null;
          }
        })
        .filter((y): y is number => y !== null),
    ),
  ).sort((a, b) => b - a);

  const payments = allPayments.filter((p) => {
    const q = historySearch.toLowerCase();
    const matchSearch =
      !q || (p.specialistName ?? "").toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (filterYear || filterMonth) {
      try {
        const d = new Date(p.month);
        if (filterYear && d.getFullYear() !== parseInt(filterYear))
          return false;
        if (filterMonth && d.getMonth() + 1 !== parseInt(filterMonth))
          return false;
      } catch {
        return false;
      }
    }
    return true;
  });

  const { page, totalPages, pagedItems, setPage, reset } = usePagination(
    payments,
    PAGE_SIZE,
  );

  useEffect(() => {
    reset();
  }, [historySearch, filterYear, filterMonth, reset]);

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {/* Filter bar */}
      <div className="p-4 border-b border-border flex flex-wrap gap-2 items-center">
        <SearchInput
          value={historySearch}
          onChange={setHistorySearch}
          placeholder="Tìm theo tên chuyên gia..."
          className="flex-1 min-w-[180px]"
        />
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="h-10 px-3 border border-border-strong rounded-btn text-sm text-ink-700 bg-surface focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
        >
          <option value="">Tất cả tháng</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              Tháng {m}
            </option>
          ))}
        </select>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="h-10 px-3 border border-border-strong rounded-btn text-sm text-ink-700 bg-surface focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
        >
          <option value="">Tất cả năm</option>
          {availableYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {paymentsQuery.isLoading ? (
        <LoadingState />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={History}
          title={
            historySearch || filterYear || filterMonth
              ? "Không tìm thấy kết quả"
              : "Chưa có lịch sử thanh toán"
          }
          message={
            historySearch || filterYear || filterMonth
              ? "Thử thay đổi bộ lọc."
              : "Các hóa đơn đã xác nhận sẽ xuất hiện ở đây."
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-surface-alt border-b border-border">
                <tr>
                  {[
                    "Chuyên gia",
                    "Tháng",
                    "Chẩn đoán",
                    "Số tiền",
                    "Ngày tạo",
                    "Chi tiết",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pagedItems.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-surface-alt transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-ink-800">
                      {p.specialistName}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-700 whitespace-nowrap">
                      {formatMonthISO(p.month)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-ink-700">
                      {p.totalDiagnoses}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-bold text-ink-800 whitespace-nowrap">
                      {formatVND(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-500 whitespace-nowrap">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDetailPayment(p)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            showLabel
            totalItems={payments.length}
            pageSize={PAGE_SIZE}
            itemLabel="thanh toán"
          />
        </>
      )}

      {detailPayment && (
        <PaymentDetailModal
          payment={detailPayment}
          onClose={() => setDetailPayment(null)}
        />
      )}
    </>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export function BillingPage() {
  const { toasts, showToast, dismissToast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabValue>("active");
  const [search, setSearch] = useState("");

  const modals = useCrudModals<ContractResponse>();
  const [terminatingId, setTerminatingId] = useState<string | null>(null);
  const [confirmTerminate, setConfirmTerminate] =
    useState<ContractResponse | null>(null);

  // ── Query ─────────────────────────────────────────────────────────────────

  const contractsQuery = useQuery({
    queryKey: qk.contracts.list(),
    queryFn: api.getContracts as () => Promise<ContractResponse[]>,
    retry: 1,
  });

  useEffect(() => {
    if (contractsQuery.error)
      showToast(
        contractsQuery.error instanceof Error
          ? contractsQuery.error.message
          : "Không thể tải danh sách hợp đồng",
        "error",
      );
  }, [contractsQuery.error, showToast]);

  // ── Mutation ──────────────────────────────────────────────────────────────

  const terminateMutation = useMutation({
    mutationFn: (id: string) => api.terminateContract(id) as Promise<unknown>,
    onMutate: (id) => setTerminatingId(id),
    onSuccess: () => {
      showToast("Đã kết thúc hợp đồng", "success");
      queryClient.invalidateQueries({ queryKey: qk.contracts.all });
      setConfirmTerminate(null);
    },
    onError: (err) =>
      showToast(
        err instanceof Error ? err.message : "Kết thúc hợp đồng thất bại",
        "error",
      ),
    onSettled: () => setTerminatingId(null),
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  const contracts: ContractResponse[] = contractsQuery.data ?? [];

  const filtered = contractsQuery.isLoading
    ? []
    : contracts
        .filter((c) => {
          if (activeTab === "history" || activeTab === "payment") return true; // handled by sub-tabs
          const q = search.toLowerCase();
          const matchSearch =
            (c.expertName ?? "").toLowerCase().includes(q) ||
            (c.contractCode ?? "").toLowerCase().includes(q) ||
            (c.bankName ?? "").toLowerCase().includes(q);
          const matchTab = c.status === activeTab;
          return matchSearch && matchTab;
        })
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  const { page, totalPages, pagedItems, setPage, reset } = usePagination(
    filtered,
    PAGE_SIZE,
  );

  useEffect(() => {
    reset();
  }, [search, activeTab, reset]);

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <PageHeader
        icon={CreditCard}
        title="Hợp đồng & Thanh toán"
        subtitle="Quản lý hợp đồng với chuyên gia và theo dõi lịch sử thanh toán"
        actions={
          <Button
            variant="primary"
            leadingIcon={Plus}
            onClick={modals.openCreate}
          >
            Tạo hợp đồng
          </Button>
        }
      />

      <Tabs value={activeTab} onChange={setActiveTab} tabs={CONTRACT_TABS} />

      {/* Contracts tabs (active / terminated) */}
      {(activeTab === "active" || activeTab === "terminated") && (
        <>
          <div className="flex flex-wrap gap-2">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Tìm chuyên gia, mã HĐ, ngân hàng..."
              className="flex-1 min-w-[200px]"
            />
            <Button
              variant="secondary"
              leadingIcon={RefreshCw}
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: qk.contracts.all })
              }
            >
              Cập nhật
            </Button>
          </div>

          <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden">
            {contractsQuery.isLoading ? (
              <LoadingState />
            ) : contractsQuery.isError && contracts.length === 0 ? (
              <div className="text-center py-16 text-ink-500">
                <AlertTriangle className="w-10 h-10 text-ink-300 mx-auto mb-3" />
                <p className="text-sm font-medium">Không thể tải dữ liệu</p>
                <Button
                  variant="primary"
                  className="mt-4"
                  onClick={() =>
                    queryClient.invalidateQueries({
                      queryKey: qk.contracts.all,
                    })
                  }
                >
                  Thử lại
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px] text-sm">
                    <thead className="bg-surface-alt border-b border-border">
                      <tr>
                        {[
                          "Mã HĐ",
                          "Chuyên gia",
                          "Ngân hàng",
                          "Đơn giá",
                          "Bắt đầu",
                          "Kết thúc",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                        {/* Fixed-width header for the actions column */}
                        <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide whitespace-nowrap w-[100px]">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pagedItems.map((c) => (
                        <ContractRow
                          key={c.id}
                          contract={c}
                          onView={modals.openView}
                          onEdit={modals.openEdit}
                          onTerminate={setConfirmTerminate}
                          terminatingId={terminatingId}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {pagedItems.length === 0 && (
                  <EmptyState
                    icon={FileText}
                    title={
                      search
                        ? "Không tìm thấy kết quả"
                        : activeTab === "active"
                          ? "Chưa có hợp đồng đang hiệu lực"
                          : "Chưa có hợp đồng đã kết thúc"
                    }
                    message={
                      search
                        ? "Thử thay đổi từ khoá tìm kiếm."
                        : activeTab === "active"
                          ? "Tạo hợp đồng đầu tiên để bắt đầu."
                          : "Các hợp đồng đã kết thúc sẽ xuất hiện ở đây."
                    }
                    action={
                      !search && activeTab === "active" ? (
                        <Button leadingIcon={Plus} onClick={modals.openCreate}>
                          Tạo hợp đồng
                        </Button>
                      ) : undefined
                    }
                    size="md"
                  />
                )}

                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  showLabel
                  totalItems={filtered.length}
                  pageSize={PAGE_SIZE}
                  itemLabel="hợp đồng"
                />
              </>
            )}
          </div>
        </>
      )}

      {/* History tab */}
      {activeTab === "history" && (
        <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden">
          <PaymentHistoryTab />
        </div>
      )}

      {/* Payment (pending) tab */}
      {activeTab === "payment" && (
        <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden">
          <PaymentPendingTab />
        </div>
      )}

      {/* Modals */}
      {modals.createOpen && (
        <CreateContractModal onClose={modals.closeCreate} />
      )}
      {modals.viewItem && (
        <ViewContractModal
          contract={modals.viewItem}
          onClose={modals.closeView}
        />
      )}
      {modals.editItem && (
        <EditContractModal
          contract={modals.editItem}
          onClose={modals.closeEdit}
        />
      )}
      <ConfirmDialog
        open={!!confirmTerminate}
        onOpenChange={(o) => !o && setConfirmTerminate(null)}
        tone="warning"
        title="Kết thúc hợp đồng"
        description={
          <>
            Bạn có chắc muốn kết thúc hợp đồng{" "}
            <strong>{confirmTerminate?.contractCode}</strong>? Hành động này
            không thể hoàn tác.
          </>
        }
        confirmLabel="Kết thúc"
        loading={terminateMutation.isPending}
        onConfirm={() => {
          if (confirmTerminate) terminateMutation.mutate(confirmTerminate.id);
        }}
      />
    </div>
  );
}
