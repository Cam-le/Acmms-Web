import React, { useState, useEffect, useRef } from "react";
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
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { FormField } from "../components/ui/FormField";
import { FormTextarea } from "../components/ui/FormTextarea";
import { FormSelect } from "../components/ui/FormSelect";
import { SearchInput } from "../components/ui/SearchInput";
import { Pagination } from "../components/ui/Pagination";
import { Tabs } from "../components/ui/Tabs";
import { PageHeader } from "../components/ui/PageHeader";
import { RowActions } from "../components/ui/RowActions";
import { useCrudModals } from "../hooks/useCrudModals";
import { usePagination } from "../hooks/usePagination";
import { formatDate, formatVND } from "../utils/format";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 8;

const CONTRACT_TABS = [
  { value: "active" as const, label: "Đang hiệu lực" },
  { value: "terminated" as const, label: "Đã kết thúc" },
  { value: "history" as const, label: "Lịch sử thanh toán" },
] as const;

type TabValue = "active" | "terminated" | "history";

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

function monthToISO(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01T00:00:00.000Z`;
}

function contractStatusTone(s: string | null | undefined): BadgeTone {
  return s?.toLowerCase() === "active" ? "success" : "neutral";
}

function contractStatusLabel(s: string | null | undefined): string {
  return s?.toLowerCase() === "active" ? "Đang hiệu lực" : "Đã kết thúc";
}

// ─── MonthSelect — two native dropdowns, fully Vietnamese ────────────────────

function MonthSelect({
  year,
  month,
  onChange,
  label,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  label?: string;
}) {
  const now = new Date();
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

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
          onChange={(e) => onChange(year, Number(e.target.value))}
          className="flex-1 px-3 py-2.5 border border-border-strong rounded-btn text-sm text-ink-700 bg-surface focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              Tháng {i + 1}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => onChange(Number(e.target.value), month)}
          className="w-24 px-3 py-2.5 border border-border-strong rounded-btn text-sm text-ink-700 bg-surface focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
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

// ─── BillPreviewPanel ─────────────────────────────────────────────────────────

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
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  const billQuery = useQuery({
    queryKey: qk.contracts.bill(contractId, monthKey),
    queryFn: () =>
      api.getContractBill(
        contractId,
        monthToISO(selectedYear, selectedMonth),
      ) as Promise<ContractBillResponse>,
    retry: 1,
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
        contractId,
        month: monthToISO(selectedYear, selectedMonth),
        file: f,
      }),
    onSuccess: () => {
      showToast("Tải lên hóa đơn thành công", "success");
      queryClient.invalidateQueries({
        queryKey: qk.contracts.bill(contractId, monthKey),
      });
      queryClient.invalidateQueries({ queryKey: qk.payments.all });
      setFile(null);
    },
    onError: (err) =>
      showToast(
        err instanceof Error ? err.message : "Tải lên thất bại",
        "error",
      ),
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
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Thanh toán hợp đồng"
      description={contractCode}
      size="md"
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
              disabled={!file || !bill}
              onClick={() => file && uploadMutation.mutate(file)}
              leadingIcon={Upload}
            >
              Xác nhận thanh toán
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        <MonthSelect
          year={selectedYear}
          month={selectedMonth}
          onChange={(y, m) => {
            setSelectedYear(y);
            setSelectedMonth(m);
          }}
          label="Chọn tháng thanh toán"
        />

        {billQuery.isLoading ? (
          <LoadingState message="Đang tải hóa đơn..." />
        ) : bill ? (
          <div className="bg-primary-50 rounded-xl border border-primary/20 p-4 space-y-2.5">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-ink-800">
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
            <InfoRow label="Kỳ thanh toán" value={formatMonthISO(bill.month)} />
            <InfoRow
              label="Số chẩn đoán"
              value={`${bill.totalDiagnoses} lượt`}
            />
            <InfoRow
              label="Đơn giá / lượt"
              value={formatVND(bill.pricePerDiagnosis)}
            />
            <div className="border-t border-primary/20 pt-2 flex justify-between items-center">
              <span className="text-sm font-semibold text-ink-800">
                Tổng cộng
              </span>
              <span className="text-base font-bold text-primary">
                {formatVND(bill.totalAmount)}
              </span>
            </div>
            <div className="pt-2 border-t border-primary/20 space-y-1.5">
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">
                Thông tin chuyển khoản
              </p>
              <InfoRow label="Ngân hàng" value={bill.bankName} />
              <InfoRow label="Số tài khoản" value={bill.bankAccount} mono />
              <InfoRow label="Chủ tài khoản" value={bill.accountHolder} />
            </div>
          </div>
        ) : null}

        {bill && !bill.isPaid && (
          <>
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
    </Modal>
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

  const farmOptions = (farmsQuery.data ?? [])
    .filter((f: FarmResponse) => f.farmStatus === "Active")
    .map((f: FarmResponse) => ({ value: f.farmId, label: f.farmName }));

  const expertOptions = (staffsQuery.data ?? [])
    .filter((s: UserResponse) => s.roleName === "Specialist")
    .map((s: UserResponse) => ({ value: s.userId, label: s.fullname }));

  const defaultStartDate = new Date().toISOString().slice(0, 10);
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
    onError: (err) =>
      showToast(
        err instanceof Error ? err.message : "Tạo hợp đồng thất bại",
        "error",
      ),
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
      farmId: form.farmId,
      expertId: form.expertId,
      bankAccount: form.bankAccount.trim(),
      bankName: form.bankName.trim(),
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
      {farmsQuery.isLoading || staffsQuery.isLoading ? (
        <LoadingState message="Đang tải..." />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect
              label="Trang trại"
              required
              value={form.farmId}
              onChange={(v) => setForm((f) => ({ ...f, farmId: v }))}
              options={farmOptions}
              placeholder="— Chọn trang trại —"
              error={errors.farmId}
            />
            <FormSelect
              label="Chuyên gia"
              required
              value={form.expertId}
              onChange={(v) => setForm((f) => ({ ...f, expertId: v }))}
              options={expertOptions}
              placeholder="— Chọn chuyên gia —"
              error={errors.expertId}
            />
          </div>
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
              label="Chủ tài khoản"
              required
              value={form.accountHolder}
              onChange={(v) => setForm((f) => ({ ...f, accountHolder: v }))}
              placeholder="NGUYEN VAN A"
              error={errors.accountHolder}
            />
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
          </div>
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
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    bankAccount: contract.bankAccount,
    bankName: contract.bankName,
    accountHolder: contract.accountHolder,
    pricePerDiagnosis: String(contract.pricePerDiagnosis),
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
    if (!form.accountHolder.trim()) e.accountHolder = "Bắt buộc";
    const price = parseFloat(form.pricePerDiagnosis);
    if (isNaN(price) || price <= 0) e.pricePerDiagnosis = "Đơn giá phải > 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
            label="Chủ tài khoản"
            required
            value={form.accountHolder}
            onChange={(v) => setForm((f) => ({ ...f, accountHolder: v }))}
            error={errors.accountHolder}
          />
          <FormField
            label="Đơn giá / chẩn đoán (₫)"
            required
            type="number"
            value={form.pricePerDiagnosis}
            onChange={(v) => setForm((f) => ({ ...f, pricePerDiagnosis: v }))}
            inputProps={{ min: "1", step: "1" }}
            error={errors.pricePerDiagnosis}
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
  onPay,
}: {
  contract: ContractResponse;
  onClose: () => void;
  onPay: (c: ContractResponse) => void;
}) {
  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Chi tiết hợp đồng"
      description={contract.contractCode}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          {contract.status === "active" && (
            <Button
              variant="primary"
              leadingIcon={CreditCard}
              onClick={() => {
                onClose();
                onPay(contract);
              }}
            >
              Thanh toán
            </Button>
          )}
        </>
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
              contract.endDate ? formatDate(contract.endDate) : "Không giới hạn"
            }
          />
          {contract.notes && <InfoRow label="Ghi chú" value={contract.notes} />}
        </div>
        <div className="bg-surface-alt rounded-xl border border-border p-4 space-y-2.5">
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-1">
            Thông tin ngân hàng
          </p>
          <InfoRow label="Ngân hàng" value={contract.bankName} />
          <InfoRow label="Số tài khoản" value={contract.bankAccount} mono />
          <InfoRow label="Chủ tài khoản" value={contract.accountHolder} />
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
    <tr className="hover:bg-surface-alt transition-colors">
      <td className="px-4 py-3">
        <span className="text-xs font-mono text-ink-500">
          {contract.contractCode}
        </span>
      </td>
      <td className="px-4 py-3 text-sm font-medium text-ink-800">
        {contract.farmName}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <UserCheck className="w-3.5 h-3.5 text-ink-400 shrink-0" />
          <span className="text-sm text-ink-700">{contract.expertName}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-mono text-ink-700">
        {formatVND(contract.pricePerDiagnosis)}
      </td>
      <td className="px-4 py-3 text-sm text-ink-700">
        {formatDate(contract.startDate)}
      </td>
      <td className="px-4 py-3 text-sm text-ink-700 hidden sm:table-cell">
        {contract.endDate ? formatDate(contract.endDate) : "—"}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <RowActions
            onView={() => onView(contract)}
            onEdit={isActive ? () => onEdit(contract) : undefined}
          />
          {isActive && (
            <>
              <button
                onClick={() => onPay(contract)}
                title="Thanh toán"
                className="p-1.5 rounded-btn text-ink-500 hover:text-primary hover:bg-primary-50 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
              </button>
              <button
                onClick={() => onTerminate(contract)}
                disabled={isTerminating}
                title="Kết thúc hợp đồng"
                className="p-1.5 rounded-btn text-ink-500 hover:text-status-danger-fg hover:bg-status-danger-bg transition-colors disabled:opacity-40"
              >
                {isTerminating ? (
                  <div className="w-4 h-4 border-2 border-status-danger-fg border-t-transparent rounded-full animate-spin" />
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
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const paymentsQuery = useQuery({
    queryKey: qk.payments.list(),
    queryFn: api.getPayments as () => Promise<PaymentResponse[]>,
  });

  useEffect(() => {
    if (paymentsQuery.error)
      showToast("Không thể tải lịch sử thanh toán", "error");
  }, [paymentsQuery.error, showToast]);

  const payments = paymentsQuery.data ?? [];

  if (paymentsQuery.isLoading) return <LoadingState />;
  if (payments.length === 0)
    return (
      <EmptyState
        icon={History}
        title="Chưa có lịch sử thanh toán"
        message="Các hóa đơn đã xác nhận sẽ xuất hiện ở đây."
      />
    );

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-surface-alt border-b border-border">
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
                  className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-surface-alt transition-colors">
                <td className="px-4 py-3">
                  <span className="text-xs font-mono text-ink-500">
                    {p.contractCode}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-ink-700">{p.farmName}</td>
                <td className="px-4 py-3 text-sm text-ink-700">
                  {p.expertName}
                </td>
                <td className="px-4 py-3 text-sm text-ink-700">
                  {formatMonthISO(p.month)}
                </td>
                <td className="px-4 py-3 text-sm font-mono text-ink-700 text-right">
                  {p.totalDiagnoses}
                </td>
                <td className="px-4 py-3 text-sm font-mono font-bold text-ink-800 text-right">
                  {formatVND(p.amount)}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setPreviewImg(p.billImageUrl)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
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

export function BillingPage() {
  const { toasts, showToast, dismissToast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabValue>("active");
  const [search, setSearch] = useState("");

  const modals = useCrudModals<ContractResponse>();
  const [payContract, setPayContract] = useState<ContractResponse | null>(null);
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

  const contracts = contractsQuery.data ?? [];

  const filtered = contracts
    .filter((c) => {
      if (activeTab === "history") return true; // handled by PaymentHistoryTab
      const q = search.toLowerCase();
      const matchSearch =
        c.farmName.toLowerCase().includes(q) ||
        c.expertName.toLowerCase().includes(q) ||
        c.contractCode.toLowerCase().includes(q);
      const matchTab = c.status === activeTab;
      return matchSearch && matchTab;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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
              placeholder="Tìm trang trại, chuyên gia, mã HĐ..."
              className="flex-1 min-w-[200px]"
            />
            <Button
              variant="secondary"
              leadingIcon={RefreshCw}
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: qk.contracts.all })
              }
            >
              Làm mới
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
                  <table className="w-full min-w-[860px] text-sm">
                    <thead className="bg-surface-alt border-b border-border">
                      <tr>
                        {[
                          "Mã HĐ",
                          "Trang trại",
                          "Chuyên gia",
                          "Đơn giá",
                          "Bắt đầu",
                          "Kết thúc",
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
                      {pagedItems.map((c) => (
                        <ContractRow
                          key={c.id}
                          contract={c}
                          onView={modals.openView}
                          onEdit={modals.openEdit}
                          onTerminate={setConfirmTerminate}
                          onPay={setPayContract}
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

      {/* Modals */}
      {modals.createOpen && (
        <CreateContractModal onClose={modals.closeCreate} />
      )}
      {modals.viewItem && (
        <ViewContractModal
          contract={modals.viewItem}
          onClose={modals.closeView}
          onPay={(c) => {
            modals.closeView();
            setPayContract(c);
          }}
        />
      )}
      {modals.editItem && (
        <EditContractModal
          contract={modals.editItem}
          onClose={modals.closeEdit}
        />
      )}
      {payContract && (
        <BillPreviewPanel
          contractId={payContract.id}
          contractCode={payContract.contractCode}
          onClose={() => setPayContract(null)}
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
