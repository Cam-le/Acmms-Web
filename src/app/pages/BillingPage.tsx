import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  History,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Info,
  Building2,
  UserCheck,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Ban,
  Upload,
  Eye,
  CreditCard,
  FileCheck,
} from "lucide-react";
import { api } from "../../api/client";
import type {
  FarmResponse,
  UserResponse,
  ContractResponse,
  ContractCreateRequest,
  ContractUpdateRequest,
  ContractBillResponse,
  PaymentResponse,
} from "../../api/client";
import { qk } from "../../api/queryKeys";
import { useToast } from "../components/ui/useToast";
import { ToastContainer } from "../components/ui/ToastContainer";
import { LoadingState } from "../components/ui/LoadingState";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/StatusBadge";
import type { BadgeTone } from "../components/ui/StatusBadge";
import { formatDate, formatVND } from "../utils/format";

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

function monthToISO(yearMonth: string): string {
  // "2026-05" → "2026-05-01T00:00:00.000Z"
  return `${yearMonth}-01T00:00:00.000Z`;
}

function isoToMonthInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 7);
}

function contractStatusTone(s: string | null | undefined): BadgeTone {
  return s?.toLowerCase() === "active" ? "success" : "neutral";
}

function contractStatusLabel(s: string | null | undefined): string {
  return s?.toLowerCase() === "active" ? "Đang hiệu lực" : "Đã kết thúc";
}

const PAGE_SIZE = 8;

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

// ─── ContractStatusBadge ─────────────────────────────────────────────────────

function ContractStatusBadge({ status }: { status: string }) {
  return (
    <StatusBadge
      label={contractStatusLabel(status)}
      tone={contractStatusTone(status)}
    />
  );
}

// ─── BillPreviewPanel ────────────────────────────────────────────────────────

function BillPreviewPanel({
  contractId,
  contractCode,
  onClose,
}: {
  contractId: string;
  contractCode: string;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const billQuery = useQuery({
    queryKey: qk.contracts.bill(contractId, selectedMonth),
    queryFn: () =>
      api.getContractBill(
        contractId,
        monthToISO(selectedMonth),
      ) as Promise<ContractBillResponse>,
    retry: 1,
  });

  useEffect(() => {
    if (billQuery.error) {
      showToast(
        billQuery.error instanceof Error
          ? billQuery.error.message
          : "Không thể tải thông tin hóa đơn",
        "error",
      );
    }
  }, [billQuery.error, showToast]);

  const uploadMutation = useMutation({
    mutationFn: (f: File) =>
      api.uploadPayment({
        contractId,
        month: monthToISO(selectedMonth),
        file: f,
      }),
    onSuccess: () => {
      showToast("Tải lên hóa đơn thành công", "success");
      queryClient.invalidateQueries({
        queryKey: qk.contracts.bill(contractId, selectedMonth),
      });
      queryClient.invalidateQueries({ queryKey: qk.payments.all });
      setFile(null);
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : "Tải lên thất bại",
        "error",
      );
    },
  });

  const bill = billQuery.data;

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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#009689] to-[#00b4a6] px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm leading-tight">
                Thanh toán hợp đồng
              </h3>
              <p className="text-white/70 text-xs">{contractCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Month picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#62748e] block">
              Chọn tháng thanh toán
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-[#cad5e2] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155]"
            />
          </div>

          {/* Bill info */}
          {billQuery.isLoading ? (
            <LoadingState message="Đang tải hóa đơn..." />
          ) : bill ? (
            <div className="bg-[#f0fdfa] rounded-xl border border-[#009689]/20 p-4 space-y-2.5">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-[#115e59]">
                  Thông tin hóa đơn
                </h4>
                {bill.isPaid && (
                  <StatusBadge
                    label="Đã thanh toán"
                    tone="success"
                    icon={CheckCircle}
                    size="sm"
                  />
                )}
              </div>
              <InfoRow label="Trang trại" value={bill.farmName} />
              <InfoRow label="Chuyên gia" value={bill.expertName} />
              <InfoRow
                label="Kỳ thanh toán"
                value={formatMonthISO(bill.month)}
              />
              <InfoRow
                label="Số chẩn đoán"
                value={`${bill.totalDiagnoses} lượt`}
              />
              <InfoRow
                label="Đơn giá / lượt"
                value={formatVND(bill.pricePerDiagnosis)}
              />
              <div className="border-t border-[#009689]/20 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-[#115e59]">
                    Tổng cộng
                  </span>
                  <span className="text-base font-bold text-[#009689]">
                    {formatVND(bill.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Bank details */}
              <div className="mt-3 pt-3 border-t border-[#009689]/20 space-y-1.5">
                <p className="text-xs font-semibold text-[#62748e] uppercase tracking-wide">
                  Thông tin chuyển khoản
                </p>
                <InfoRow label="Ngân hàng" value={bill.bankName} />
                <InfoRow label="Số tài khoản" value={bill.bankAccount} mono />
                <InfoRow label="Chủ tài khoản" value={bill.accountHolder} />
              </div>
            </div>
          ) : null}

          {/* Upload section */}
          {bill && !bill.isPaid && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#62748e] block">
                Tải lên ảnh hóa đơn <span className="text-[#dc2626]">*</span>
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                  file
                    ? "border-[#009689] bg-[#f0fdfa]"
                    : "border-[#cad5e2] hover:border-[#009689]/50"
                }`}
              >
                {file ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck className="w-4 h-4 text-[#009689] shrink-0" />
                      <span className="text-xs text-[#115e59] font-medium truncate">
                        {file.name}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="text-[#62748e] hover:text-[#dc2626] shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-6 h-6 text-[#94a3b8] mx-auto" />
                    <p className="text-xs text-[#62748e]">
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

              <div className="flex items-start gap-2 text-xs text-[#62748e] bg-[#f8fafc] rounded-lg p-3 border border-[#e2e8f0]">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#009689]" />
                <span>
                  Chụp ảnh biên lai hoặc screenshot giao dịch ngân hàng rồi tải
                  lên để xác nhận thanh toán.
                </span>
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="ghost" onClick={onClose} className="flex-1">
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  loading={uploadMutation.isPending}
                  disabled={!file}
                  onClick={() => file && uploadMutation.mutate(file)}
                  className="flex-1"
                  leadingIcon={Upload}
                >
                  Xác nhận thanh toán
                </Button>
              </div>
            </div>
          )}

          {bill?.isPaid && (
            <div className="flex gap-3 pt-1">
              <Button variant="secondary" onClick={onClose} fullWidth>
                Đóng
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
      <span className="text-[#62748e] shrink-0">{label}</span>
      <span
        className={`text-[#334155] font-medium text-right ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── CreateContractModal ──────────────────────────────────────────────────────

function CreateContractModal({ onClose }: { onClose: () => void }) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const farmsQuery = useQuery({
    queryKey: qk.farms.list(),
    queryFn: api.getFarms,
  });

  const staffsQuery = useQuery({
    queryKey: qk.staffs.list(),
    queryFn: api.getStaffs,
  });

  useEffect(() => {
    if (farmsQuery.error)
      showToast("Không thể tải danh sách trang trại", "error");
  }, [farmsQuery.error, showToast]);

  useEffect(() => {
    if (staffsQuery.error)
      showToast("Không thể tải danh sách chuyên gia", "error");
  }, [staffsQuery.error, showToast]);

  const farms = (farmsQuery.data ?? []).filter(
    (f: FarmResponse) => f.farmStatus === "Active",
  );
  const experts = (staffsQuery.data ?? []).filter(
    (s: UserResponse) => s.roleName === "Specialist",
  );

  const now = new Date();
  const defaultStartDate = now.toISOString().slice(0, 10);

  const [form, setForm] = useState({
    farmId: "",
    expertId: "",
    bankAccount: "",
    bankName: "",
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
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : "Tạo hợp đồng thất bại",
        "error",
      );
    },
  });

  function validate(): boolean {
    const e: Partial<typeof form> = {};
    if (!form.farmId) e.farmId = "Vui lòng chọn trang trại";
    if (!form.expertId) e.expertId = "Vui lòng chọn chuyên gia";
    if (!form.bankAccount.trim()) e.bankAccount = "Vui lòng nhập số tài khoản";
    if (!form.bankName.trim()) e.bankName = "Vui lòng nhập tên ngân hàng";
    if (!form.accountHolder.trim())
      e.accountHolder = "Vui lòng nhập chủ tài khoản";
    const price = parseFloat(form.pricePerDiagnosis);
    if (isNaN(price) || price < 0.01)
      e.pricePerDiagnosis = "Đơn giá phải lớn hơn 0";
    if (!form.startDate) e.startDate = "Vui lòng chọn ngày bắt đầu";
    if (form.endDate && form.startDate && form.endDate <= form.startDate)
      e.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const body: ContractCreateRequest = {
      farmId: form.farmId,
      expertId: form.expertId,
      bankAccount: form.bankAccount.trim(),
      bankName: form.bankName.trim(),
      accountHolder: form.accountHolder.trim(),
      pricePerDiagnosis: parseFloat(form.pricePerDiagnosis),
      startDate: `${form.startDate}T00:00:00.000Z`,
      endDate: form.endDate ? `${form.endDate}T00:00:00.000Z` : undefined,
      notes: form.notes.trim() || undefined,
    };
    createMutation.mutate(body);
  }

  const isLoadingDropdowns = farmsQuery.isLoading || staffsQuery.isLoading;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#009689] to-[#00b4a6] px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-white font-semibold text-base">Tạo hợp đồng</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {isLoadingDropdowns ? (
            <LoadingState message="Đang tải..." />
          ) : (
            <div className="space-y-4">
              {/* Farm + Expert */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ModalField label="Trang trại *" error={errors.farmId}>
                  <select
                    value={form.farmId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, farmId: e.target.value }))
                    }
                    className={selectCls(!!errors.farmId)}
                  >
                    <option value="">— Chọn trang trại —</option>
                    {farms.map((farm: FarmResponse) => (
                      <option key={farm.farmId} value={farm.farmId}>
                        {farm.farmName}
                      </option>
                    ))}
                  </select>
                </ModalField>

                <ModalField label="Chuyên gia *" error={errors.expertId}>
                  <select
                    value={form.expertId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, expertId: e.target.value }))
                    }
                    className={selectCls(!!errors.expertId)}
                  >
                    <option value="">— Chọn chuyên gia —</option>
                    {experts.map((ex: UserResponse) => (
                      <option key={ex.userId} value={ex.userId}>
                        {ex.fullname}
                      </option>
                    ))}
                  </select>
                </ModalField>
              </div>

              {/* Bank info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ModalField label="Số tài khoản *" error={errors.bankAccount}>
                  <input
                    type="text"
                    value={form.bankAccount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bankAccount: e.target.value }))
                    }
                    placeholder="Nhập số tài khoản"
                    className={inputCls(!!errors.bankAccount)}
                  />
                </ModalField>
                <ModalField label="Ngân hàng *" error={errors.bankName}>
                  <input
                    type="text"
                    value={form.bankName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bankName: e.target.value }))
                    }
                    placeholder="VD: Vietcombank"
                    className={inputCls(!!errors.bankName)}
                  />
                </ModalField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ModalField
                  label="Chủ tài khoản *"
                  error={errors.accountHolder}
                >
                  <input
                    type="text"
                    value={form.accountHolder}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, accountHolder: e.target.value }))
                    }
                    placeholder="NGUYEN VAN A"
                    className={inputCls(!!errors.accountHolder)}
                  />
                </ModalField>
                <ModalField
                  label="Đơn giá / chẩn đoán (₫) *"
                  error={errors.pricePerDiagnosis}
                >
                  <input
                    type="number"
                    value={form.pricePerDiagnosis}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        pricePerDiagnosis: e.target.value,
                      }))
                    }
                    min="0.01"
                    step="1000"
                    placeholder="50000"
                    className={inputCls(!!errors.pricePerDiagnosis)}
                  />
                  {form.pricePerDiagnosis &&
                    !isNaN(parseFloat(form.pricePerDiagnosis)) && (
                      <p className="text-xs text-[#62748e] mt-1">
                        = {formatVND(parseFloat(form.pricePerDiagnosis))}
                      </p>
                    )}
                </ModalField>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ModalField label="Ngày bắt đầu *" error={errors.startDate}>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, startDate: e.target.value }))
                    }
                    className={inputCls(!!errors.startDate)}
                  />
                </ModalField>
                <ModalField
                  label="Ngày kết thúc (tùy chọn)"
                  error={errors.endDate}
                >
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, endDate: e.target.value }))
                    }
                    className={inputCls(!!errors.endDate)}
                  />
                </ModalField>
              </div>

              {/* Notes */}
              <ModalField label="Ghi chú">
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={2}
                  placeholder="Ghi chú thêm (không bắt buộc)"
                  className="w-full px-3 py-2 border border-[#cad5e2] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
                />
              </ModalField>

              <div className="flex gap-3 pt-1">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="flex-1"
                  disabled={createMutation.isPending}
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  loading={createMutation.isPending}
                  onClick={handleSubmit}
                  className="flex-1"
                >
                  Tạo hợp đồng
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
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
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    bankAccount: contract.bankAccount,
    bankName: contract.bankName,
    accountHolder: contract.accountHolder,
    pricePerDiagnosis: String(contract.pricePerDiagnosis),
    endDate: contract.endDate
      ? isoToMonthInput(contract.endDate).slice(0, 10)
      : "",
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
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : "Cập nhật thất bại",
        "error",
      );
    },
  });

  function validate(): boolean {
    const e: Partial<typeof form> = {};
    if (!form.bankAccount.trim()) e.bankAccount = "Bắt buộc";
    if (!form.bankName.trim()) e.bankName = "Bắt buộc";
    if (!form.accountHolder.trim()) e.accountHolder = "Bắt buộc";
    const price = parseFloat(form.pricePerDiagnosis);
    if (isNaN(price) || price < 0.01) e.pricePerDiagnosis = "Đơn giá phải > 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    updateMutation.mutate({
      bankAccount: form.bankAccount.trim(),
      bankName: form.bankName.trim(),
      accountHolder: form.accountHolder.trim(),
      pricePerDiagnosis: parseFloat(form.pricePerDiagnosis),
      endDate: form.endDate ? `${form.endDate}T00:00:00.000Z` : undefined,
      notes: form.notes.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#009689] to-[#00b4a6] px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Pencil className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">
                Chỉnh sửa hợp đồng
              </h3>
              <p className="text-white/70 text-xs">{contract.contractCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ModalField label="Số tài khoản *" error={errors.bankAccount}>
              <input
                type="text"
                value={form.bankAccount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bankAccount: e.target.value }))
                }
                className={inputCls(!!errors.bankAccount)}
              />
            </ModalField>
            <ModalField label="Ngân hàng *" error={errors.bankName}>
              <input
                type="text"
                value={form.bankName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bankName: e.target.value }))
                }
                className={inputCls(!!errors.bankName)}
              />
            </ModalField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ModalField label="Chủ tài khoản *" error={errors.accountHolder}>
              <input
                type="text"
                value={form.accountHolder}
                onChange={(e) =>
                  setForm((f) => ({ ...f, accountHolder: e.target.value }))
                }
                className={inputCls(!!errors.accountHolder)}
              />
            </ModalField>
            <ModalField
              label="Đơn giá / chẩn đoán (₫) *"
              error={errors.pricePerDiagnosis}
            >
              <input
                type="number"
                value={form.pricePerDiagnosis}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    pricePerDiagnosis: e.target.value,
                  }))
                }
                min="0.01"
                step="1000"
                className={inputCls(!!errors.pricePerDiagnosis)}
              />
            </ModalField>
          </div>

          <ModalField label="Ngày kết thúc (tùy chọn)">
            <input
              type="date"
              value={form.endDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, endDate: e.target.value }))
              }
              className={inputCls(false)}
            />
          </ModalField>

          <ModalField label="Ghi chú">
            <textarea
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={2}
              className="w-full px-3 py-2 border border-[#cad5e2] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
            />
          </ModalField>

          <div className="flex gap-3 pt-1">
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1"
              disabled={updateMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              loading={updateMutation.isPending}
              onClick={handleSubmit}
              className="flex-1"
            >
              Lưu thay đổi
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ViewContractModal ────────────────────────────────────────────────────────

function ViewContractModal({
  contract,
  onClose,
  onPay,
}: {
  contract: ContractResponse;
  onClose: () => void;
  onPay: (c: ContractResponse) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#009689] to-[#00b4a6] px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">
                Chi tiết hợp đồng
              </h3>
              <p className="text-white/70 text-xs">{contract.contractCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#115e59]">
              Trạng thái
            </span>
            <ContractStatusBadge status={contract.status} />
          </div>

          <div className="bg-[#f8fafc] rounded-xl border border-[#e2e8f0] p-4 space-y-2.5">
            <InfoRow label="Mã hợp đồng" value={contract.contractCode} mono />
            <InfoRow label="Trang trại" value={contract.farmName} />
            <InfoRow label="Chuyên gia" value={contract.expertName} />
            <InfoRow
              label="Đơn giá / chẩn đoán"
              value={formatVND(contract.pricePerDiagnosis)}
            />
            <InfoRow
              label="Ngày bắt đầu"
              value={formatDate(contract.startDate)}
            />
            <InfoRow
              label="Ngày kết thúc"
              value={
                contract.endDate
                  ? formatDate(contract.endDate)
                  : "Không giới hạn"
              }
            />
            {contract.notes && (
              <InfoRow label="Ghi chú" value={contract.notes} />
            )}
          </div>

          <div className="bg-[#f8fafc] rounded-xl border border-[#e2e8f0] p-4 space-y-2.5">
            <p className="text-xs font-semibold text-[#62748e] uppercase tracking-wide mb-1">
              Thông tin ngân hàng
            </p>
            <InfoRow label="Ngân hàng" value={contract.bankName} />
            <InfoRow label="Số tài khoản" value={contract.bankAccount} mono />
            <InfoRow label="Chủ tài khoản" value={contract.accountHolder} />
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Đóng
            </Button>
            {contract.status === "active" && (
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  onPay(contract);
                }}
                className="flex-1"
                leadingIcon={CreditCard}
              >
                Thanh toán
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Small field helpers ──────────────────────────────────────────────────────

function ModalField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#62748e] block">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-[#dc2626]">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return [
    "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155]",
    hasError ? "border-[#fca5a5] bg-[#fff5f5]" : "border-[#cad5e2]",
  ].join(" ");
}

function selectCls(hasError: boolean) {
  return [
    "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155] appearance-none cursor-pointer",
    hasError ? "border-[#fca5a5] bg-[#fff5f5]" : "border-[#cad5e2]",
  ].join(" ");
}

// ─── ContractRow ──────────────────────────────────────────────────────────────

function ContractRow({
  contract,
  onView,
  onEdit,
  onTerminate,
  onPay,
  terminatingId,
}: {
  contract: ContractResponse;
  onView: (c: ContractResponse) => void;
  onEdit: (c: ContractResponse) => void;
  onTerminate: (c: ContractResponse) => void;
  onPay: (c: ContractResponse) => void;
  terminatingId: string | null;
}) {
  const isActive = contract.status === "active";
  const isTerminating = terminatingId === contract.id;

  return (
    <tr className="hover:bg-[#f8fafc] transition-colors">
      <td className="px-4 py-3">
        <span className="text-xs font-mono text-[#62748e]">
          {contract.contractCode}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-[#009689] shrink-0" />
          <span className="text-sm font-medium text-[#115e59]">
            {contract.farmName}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <UserCheck className="w-3.5 h-3.5 text-[#62748e] shrink-0" />
          <span className="text-sm text-[#334155]">{contract.expertName}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-mono text-[#334155]">
        {formatVND(contract.pricePerDiagnosis)}
      </td>
      <td className="px-4 py-3 text-sm text-[#334155]">
        {formatDate(contract.startDate)}
      </td>
      <td className="px-4 py-3 text-sm text-[#334155]">
        {contract.endDate ? formatDate(contract.endDate) : "—"}
      </td>
      <td className="px-4 py-3">
        <ContractStatusBadge status={contract.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => onView(contract)}
            title="Xem chi tiết"
            className="p-1.5 rounded-lg text-[#62748e] hover:text-[#009689] hover:bg-[#f0fdfa] transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          {isActive && (
            <>
              <button
                onClick={() => onEdit(contract)}
                title="Chỉnh sửa"
                className="p-1.5 rounded-lg text-[#62748e] hover:text-[#009689] hover:bg-[#f0fdfa] transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPay(contract)}
                title="Thanh toán"
                className="p-1.5 rounded-lg text-[#62748e] hover:text-[#009689] hover:bg-[#f0fdfa] transition-colors"
              >
                <CreditCard className="w-4 h-4" />
              </button>
              <button
                onClick={() => onTerminate(contract)}
                disabled={isTerminating}
                title="Kết thúc hợp đồng"
                className="p-1.5 rounded-lg text-[#62748e] hover:text-[#dc2626] hover:bg-[#fee2e2] transition-colors disabled:opacity-40"
              >
                {isTerminating ? (
                  <div className="w-4 h-4 border-2 border-[#dc2626] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Ban className="w-4 h-4" />
                )}
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── PaymentHistoryTab ────────────────────────────────────────────────────────

function PaymentHistoryTab() {
  const { showToast } = useToast();

  const paymentsQuery = useQuery({
    queryKey: qk.payments.list(),
    queryFn: api.getPayments as () => Promise<PaymentResponse[]>,
  });

  useEffect(() => {
    if (paymentsQuery.error) {
      showToast("Không thể tải lịch sử thanh toán", "error");
    }
  }, [paymentsQuery.error, showToast]);

  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const payments = paymentsQuery.data ?? [];

  if (paymentsQuery.isLoading) return <LoadingState />;

  if (payments.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Chưa có lịch sử thanh toán"
        message="Các hóa đơn đã xác nhận sẽ xuất hiện ở đây."
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
            <tr>
              {[
                "Hợp đồng",
                "Trang trại",
                "Chuyên gia",
                "Tháng",
                "Chẩn đoán",
                "Số tiền",
                "Hóa đơn",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-[#62748e] uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-[#f8fafc] transition-colors">
                <td className="px-4 py-3">
                  <span className="text-xs font-mono text-[#62748e]">
                    {p.contractCode}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-[#334155]">
                  {p.farmName}
                </td>
                <td className="px-4 py-3 text-sm text-[#334155]">
                  {p.expertName}
                </td>
                <td className="px-4 py-3 text-sm text-[#334155]">
                  {formatMonthISO(p.month)}
                </td>
                <td className="px-4 py-3 text-sm font-mono text-[#334155] text-right">
                  {p.totalDiagnoses}
                </td>
                <td className="px-4 py-3 text-sm font-mono font-bold text-[#115e59] text-right">
                  {formatVND(p.amount)}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setPreviewImg(p.billImageUrl)}
                    className="flex items-center gap-1 text-xs text-[#009689] hover:underline"
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

      {previewImg && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreviewImg(null)}
        >
          <div
            className="relative max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImg}
              alt="Hóa đơn"
              className="w-full rounded-xl shadow-2xl object-contain max-h-[80vh]"
            />
            <button
              onClick={() => setPreviewImg(null)}
              className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

type TabValue = "contracts" | "history";

export function BillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toasts, showToast, dismissToast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabValue>("contracts");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "terminated"
  >("all");
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [viewContract, setViewContract] = useState<ContractResponse | null>(
    null,
  );
  const [editContract, setEditContract] = useState<ContractResponse | null>(
    null,
  );
  const [payContract, setPayContract] = useState<ContractResponse | null>(null);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);

  // PayOS callback banner (kept for backward compat if needed)
  type PayosCallback = "success" | "cancelled" | null;
  const [payosCallback, setPayosCallback] = useState<PayosCallback>(null);
  useEffect(() => {
    const status = searchParams.get("status");
    const cancel = searchParams.get("cancel");
    const code = searchParams.get("code");
    if (status || cancel || code) {
      if (cancel === "true" || status === "CANCELLED")
        setPayosCallback("cancelled");
      else if (code === "00" && status === "PAID") setPayosCallback("success");
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Queries ──

  const contractsQuery = useQuery({
    queryKey: qk.contracts.list(),
    queryFn: api.getContracts as () => Promise<ContractResponse[]>,
    retry: 1,
  });

  useEffect(() => {
    if (contractsQuery.error) {
      showToast(
        contractsQuery.error instanceof Error
          ? contractsQuery.error.message
          : "Không thể tải danh sách hợp đồng",
        "error",
      );
    }
  }, [contractsQuery.error, showToast]);

  // ── Mutations ──

  const terminateMutation = useMutation({
    mutationFn: (id: string) => api.terminateContract(id) as Promise<unknown>,
    onMutate: (id) => setTerminatingId(id),
    onSuccess: () => {
      showToast("Đã kết thúc hợp đồng", "success");
      queryClient.invalidateQueries({ queryKey: qk.contracts.all });
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : "Kết thúc hợp đồng thất bại",
        "error",
      );
    },
    onSettled: () => setTerminatingId(null),
  });

  // ── Derived data ──

  const contracts = contractsQuery.data ?? [];
  const activeCount = contracts.filter((c) => c.status === "active").length;
  const terminatedCount = contracts.filter(
    (c) => c.status === "terminated",
  ).length;
  const totalActivePrice = contracts
    .filter((c) => c.status === "active")
    .reduce((s, c) => s + c.pricePerDiagnosis, 0);

  const filtered = contracts
    .filter((c) => {
      const matchSearch =
        c.farmName.toLowerCase().includes(search.toLowerCase()) ||
        c.expertName.toLowerCase().includes(search.toLowerCase()) ||
        c.contractCode.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-[#62748e]">Hệ thống</span>
            <span className="text-xs text-[#cad5e2]">/</span>
            <span className="text-xs text-[#009689] font-medium">
              Quản lý hợp đồng & thanh toán
            </span>
          </div>
          <h1 className="text-[#115e59] text-2xl font-bold">
            Hợp đồng & Thanh toán
          </h1>
          <p className="text-[#62748e] text-sm mt-1">
            Quản lý hợp đồng với chuyên gia và theo dõi lịch sử thanh toán
          </p>
        </div>
        <Button
          variant="primary"
          leadingIcon={Plus}
          onClick={() => setShowCreate(true)}
        >
          Tạo hợp đồng
        </Button>
      </div>

      {/* PayOS callback banners */}
      {payosCallback === "cancelled" && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[#fff7ed] border border-[#fed7aa] rounded-xl text-sm text-[#9a3412]">
          <XCircle className="w-4 h-4 shrink-0 text-[#ea580c]" />
          <span>
            Giao dịch đã bị <strong>huỷ</strong>.
          </span>
          <button onClick={() => setPayosCallback(null)} className="ml-auto">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {payosCallback === "success" && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl text-sm text-[#166534]">
          <CheckCircle className="w-4 h-4 shrink-0 text-[#16a34a]" />
          <span>
            Thanh toán <strong>thành công</strong>!
          </span>
          <button onClick={() => setPayosCallback(null)} className="ml-auto">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={FileText}
          label="Đang hiệu lực"
          value={String(activeCount)}
          tone="success"
        />
        <SummaryCard
          icon={History}
          label="Đã kết thúc"
          value={String(terminatedCount)}
          tone="neutral"
        />
        <SummaryCard
          icon={CreditCard}
          label="Tổng đơn giá (active)"
          value={formatVND(totalActivePrice)}
          tone="info"
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-[#f1f5f9] p-1 rounded-lg w-fit">
        {(
          [
            { value: "contracts" as const, label: "Hợp đồng" },
            { value: "history" as const, label: "Lịch sử thanh toán" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={[
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === tab.value
                ? "bg-white text-[#115e59] shadow-sm"
                : "text-[#62748e] hover:text-[#334155]",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contracts tab */}
      {activeTab === "contracts" && (
        <>
          {/* Filter bar */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8] pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm trang trại, chuyên gia, mã HĐ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[#cad5e2] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "all" | "active" | "terminated",
                )
              }
              className="px-3 py-2 border border-[#cad5e2] rounded-lg text-sm bg-white text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#009689]"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hiệu lực</option>
              <option value="terminated">Đã kết thúc</option>
            </select>
            <button
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: qk.contracts.all })
              }
              className="flex items-center gap-2 px-3 py-2 border border-[#cad5e2] rounded-lg text-sm text-[#62748e] hover:border-[#009689] hover:text-[#009689] transition-colors bg-white"
            >
              <RefreshCw className="w-4 h-4" />
              Làm mới
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
            {contractsQuery.isLoading ? (
              <LoadingState />
            ) : contractsQuery.isError && contracts.length === 0 ? (
              <div className="text-center py-16 text-[#62748e]">
                <AlertTriangle className="w-10 h-10 text-[#cad5e2] mx-auto mb-3" />
                <p className="text-sm font-medium">Không thể tải dữ liệu</p>
                <button
                  onClick={() =>
                    queryClient.invalidateQueries({
                      queryKey: qk.contracts.all,
                    })
                  }
                  className="mt-4 px-4 py-2 bg-[#009689] text-white rounded-lg text-sm font-medium hover:bg-[#007f75]"
                >
                  Thử lại
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                      <tr>
                        {[
                          "Mã HĐ",
                          "Trang trại",
                          "Chuyên gia",
                          "Đơn giá",
                          "Bắt đầu",
                          "Kết thúc",
                          "Trạng thái",
                          "Thao tác",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold text-[#62748e] uppercase tracking-wide whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {paginated.map((c) => (
                        <ContractRow
                          key={c.id}
                          contract={c}
                          onView={setViewContract}
                          onEdit={setEditContract}
                          onTerminate={(c) => terminateMutation.mutate(c.id)}
                          onPay={setPayContract}
                          terminatingId={terminatingId}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {paginated.length === 0 && (
                  <EmptyState
                    icon={FileText}
                    title={
                      search || statusFilter !== "all"
                        ? "Không tìm thấy kết quả"
                        : "Chưa có hợp đồng"
                    }
                    message={
                      !search && statusFilter === "all"
                        ? "Tạo hợp đồng đầu tiên để bắt đầu."
                        : "Thử thay đổi bộ lọc."
                    }
                    action={
                      !search && statusFilter === "all" ? (
                        <Button
                          leadingIcon={Plus}
                          onClick={() => setShowCreate(true)}
                        >
                          Tạo hợp đồng
                        </Button>
                      ) : undefined
                    }
                    size="md"
                  />
                )}

                {filtered.length > 0 && (
                  <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-[#e2e8f0] bg-[#f8fafc]">
                    <p className="text-xs text-[#62748e]">
                      {filtered.length} hợp đồng
                    </p>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1">
                        <PageBtn
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </PageBtn>
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
                        <PageBtn
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={page === totalPages}
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </PageBtn>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* History tab */}
      {activeTab === "history" && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <PaymentHistoryTab />
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateContractModal onClose={() => setShowCreate(false)} />
      )}
      {viewContract && (
        <ViewContractModal
          contract={viewContract}
          onClose={() => setViewContract(null)}
          onPay={(c) => {
            setViewContract(null);
            setPayContract(c);
          }}
        />
      )}
      {editContract && (
        <EditContractModal
          contract={editContract}
          onClose={() => setEditContract(null)}
        />
      )}
      {payContract && (
        <BillPreviewPanel
          contractId={payContract.id}
          contractCode={payContract.contractCode}
          onClose={() => setPayContract(null)}
        />
      )}
    </div>
  );
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: "success" | "neutral" | "info" | "warning";
}) {
  const toneStyles: Record<string, string> = {
    success: "bg-[#f0fdfa] border-[#009689]/20 text-[#009689]",
    neutral: "bg-[#f8fafc] border-[#e2e8f0] text-[#62748e]",
    info: "bg-[#eff6ff] border-[#bfdbfe] text-[#2563eb]",
    warning: "bg-[#fffbeb] border-[#fde68a] text-[#d97706]",
  };
  return (
    <div
      className={`rounded-xl border p-4 flex items-center gap-3 ${toneStyles[tone]}`}
    >
      <div className="w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[#62748e]">{label}</p>
        <p className="text-lg font-bold text-[#115e59] truncate">{value}</p>
      </div>
    </div>
  );
}

function PageBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 flex items-center justify-center rounded border border-[#e2e8f0] text-[#62748e] hover:border-[#009689] hover:text-[#009689] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
