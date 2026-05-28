import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "../../api/queryKeys";
import {
  Users,
  Plus,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  UserCheck,
  CheckCircle,
  Clock,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  api,
  UserResponse,
  RoleResponse,
  UnassignedStaff,
} from "../../api/client";

import { useToast } from "../components/ui/useToast";
import { ToastContainer } from "../components/ui/ToastContainer";
import { useCrudModals } from "../hooks/useCrudModals";
import { usePagination } from "../hooks/usePagination";
import { useTableSort } from "../hooks/useTableSort";
import { workerStatusTone, workerStatusLabel } from "../utils/status";

import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Tabs } from "../components/ui/Tabs";
import { SearchInput } from "../components/ui/SearchInput";
import { FormField } from "../components/ui/FormField";
import { FormSelect } from "../components/ui/FormSelect";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Pagination } from "../components/ui/Pagination";
import { RowActions } from "../components/ui/RowActions";
import { EmptyState } from "../components/ui/EmptyState";
import { QueryState } from "../components/ui/QueryState";

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkerStatus = "Active" | "Inactive";

interface WorkerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: WorkerStatus;
  dateJoined: string;
  dateJoinedRaw: string;
}

const PAGE_SIZE = 5;

const ROLE_LABEL: Record<string, string> = {
  Worker: "Công nhân",
  Specialist: "Chuyên gia",
};
const getRoleLabel = (role: string) => ROLE_LABEL[role] ?? role;

function mapUser(u: UserResponse): WorkerRow {
  const rawStatus = u.status ?? "";
  const s = rawStatus
    ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase()
    : "";
  return {
    id: u.userId ?? "",
    name: u.fullname || u.email || "—",
    email: u.email ?? "",
    phone: u.phoneNumber ?? "",
    role: u.roleName ?? "Worker",
    status: s === "Active" ? "Active" : "Inactive",
    dateJoined: u.createdAt
      ? new Date(u.createdAt).toLocaleDateString("vi-VN")
      : "",
    dateJoinedRaw: u.createdAt ?? "",
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
}

function validateForm(
  formData: { name: string; email: string; phone: string; role: string },
  availableRoles: RoleResponse[],
): FormErrors {
  const errors: FormErrors = {};
  if (!formData.name.trim()) {
    errors.name = "Vui lòng nhập họ và tên";
  } else if (formData.name.trim().length > 255) {
    errors.name = "Họ và tên không được quá 255 ký tự";
  }
  if (!formData.email.trim()) {
    errors.email = "Vui lòng nhập email";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
    errors.email = "Email không hợp lệ";
  } else if (formData.email.trim().length > 255) {
    errors.email = "Email không được quá 255 ký tự";
  }
  if (!formData.phone.trim()) {
    errors.phone = "Vui lòng nhập số điện thoại";
  } else if (!/^0\d{9}$/.test(formData.phone.trim())) {
    errors.phone = "Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0";
  }
  if (!formData.role) {
    errors.role = "Vui lòng chọn vai trò";
  } else if (
    availableRoles.length > 0 &&
    !availableRoles.find((r) => r.roleName === formData.role)
  ) {
    errors.role = "Vai trò không hợp lệ";
  }
  return errors;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WorkersPage() {
  const { toasts, showToast, dismissToast } = useToast();
  const queryClient = useQueryClient();

  // ── UI-only state ──
  const [activeTab, setActiveTab] = useState<"staff" | "pending">("staff");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<UnassignedStaff | null>(
    null,
  );
  const [pendingRowError, setPendingRowError] = useState<
    Record<string, string>
  >({});
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const modals = useCrudModals<WorkerRow>();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    status: "Active" as WorkerStatus,
  });

  // ── Read: roles ────────────────────────────────────────────────────────────
  const rolesQuery = useQuery({
    queryKey: qk.staffs.roles(),
    queryFn: async () => {
      const data = await api.getRoles();
      return (data ?? []).filter((r) => r.roleName.toLowerCase() !== "owner");
    },
  });

  const apiRoles: RoleResponse[] = rolesQuery.data ?? [];
  const rolesLoaded = !rolesQuery.isLoading;
  const availableRoleNames = apiRoles.map((r) => r.roleName);
  const getRoleId = (roleName: string) =>
    apiRoles.find((r) => r.roleName === roleName)?.roleId;

  // ── Read: staff list ───────────────────────────────────────────────────────
  const staffsQuery = useQuery({
    queryKey: qk.staffs.list(),
    queryFn: async () => {
      const data = await api.getStaffs();
      return (data ?? [])
        .filter((u): u is UserResponse => u != null && !!u.userId)
        .map(mapUser);
    },
  });

  const workers: WorkerRow[] = staffsQuery.data ?? [];

  // ── Read: pending (unassigned) ─────────────────────────────────────────────
  const pendingQuery = useQuery({
    queryKey: qk.staffs.unassigned(),
    queryFn: async () => {
      const data = await api.getUnassignedStaffs();
      return (data ?? []).filter(
        (s): s is UnassignedStaff => s != null && !!s.userId,
      );
    },
  });

  const pending: UnassignedStaff[] = pendingQuery.data ?? [];

  // ── Sort ───────────────────────────────────────────────────────────────────
  const sort = useTableSort(workers, {
    dateJoined: {
      compare: (a, b) => {
        // Use raw ISO string for reliable comparison; fall back to 0 if missing
        const toMs = (row: WorkerRow) =>
          row.dateJoinedRaw ? new Date(row.dateJoinedRaw).getTime() : 0;
        return toMs(a) - toMs(b);
      },
    },
    status: {
      compare: (a, b) => {
        const order: Record<WorkerStatus, number> = { Active: 1, Inactive: 2 };
        return (order[a.status] ?? 99) - (order[b.status] ?? 99);
      },
    },
  });

  const filteredWorkers = sort.sortedItems.filter((w) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      (w.name ?? "").toLowerCase().includes(term) ||
      (w.email ?? "").toLowerCase().includes(term) ||
      (w.phone ?? "").includes(searchTerm) ||
      (w.role ?? "").toLowerCase().includes(term);
    const matchRole = filterRole === "all" || w.role === filterRole;
    return matchSearch && matchRole;
  });

  const pagination = usePagination(filteredWorkers, PAGE_SIZE);
  const pendingPagination = usePagination(pending, PAGE_SIZE);

  // ── Form helpers ───────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: apiRoles[0]?.roleName ?? "",
      status: "Active",
    });
    setFormErrors({});
    setApiError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiRoles]);

  // ── Mutation: create staff ─────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async () => {
      const roleId = getRoleId(formData.role);
      if (!roleId)
        throw new Error(
          "Không tìm thấy ID vai trò. Vui lòng thử tải lại trang.",
        );
      await api.createStaff(
        {
          email: formData.email.trim(),
          password: "123456",
          fullname: formData.name.trim(),
          phoneNumber: formData.phone.trim(),
          status: "Active",
          roleId,
        },
        formData.role,
      );
    },
    onSuccess: () => {
      modals.closeCreate();
      resetForm();
      showToast("Thêm nhân viên thành công", "success");
      queryClient.invalidateQueries({ queryKey: qk.staffs.all });
    },
    onError: (err) => {
      setApiError(
        "Không thể tạo nhân viên: " +
          (err instanceof Error ? err.message : "Đã xảy ra lỗi"),
      );
    },
  });

  // ── Mutation: update staff ─────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!modals.editItem) return;
      const roleChanged = formData.role !== modals.editItem.role;
      const infoChanged =
        formData.name.trim() !== modals.editItem.name ||
        formData.email.trim() !== modals.editItem.email ||
        formData.phone.trim() !== modals.editItem.phone ||
        formData.status !== modals.editItem.status;

      if (!roleChanged && !infoChanged) return;

      if (infoChanged) {
        await api.updateStaff(modals.editItem.id, {
          email: formData.email.trim(),
          fullname: formData.name.trim(),
          phoneNumber: formData.phone.trim(),
          status: formData.status,
        });
      }
      if (roleChanged) {
        await api.assignStaffRole(modals.editItem.id, formData.role);
      }
    },
    onSuccess: () => {
      modals.closeEdit();
      resetForm();
      showToast("Cập nhật nhân viên thành công", "success");
      queryClient.invalidateQueries({ queryKey: qk.staffs.all });
    },
    onError: (err) => {
      setApiError(
        "Không thể cập nhật: " +
          (err instanceof Error ? err.message : "Đã xảy ra lỗi"),
      );
    },
  });

  // ── Mutation: delete staff ─────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (workerId: string) => api.deleteStaff(workerId),
    onSuccess: () => {
      modals.closeDelete();
      showToast("Xóa nhân viên thành công", "success");
      queryClient.invalidateQueries({ queryKey: qk.staffs.all });
    },
    onError: (err) => {
      showToast(
        "Không thể xóa: " +
          (err instanceof Error ? err.message : "Đã xảy ra lỗi"),
        "error",
      );
    },
  });

  // ── Mutation: reject pending ───────────────────────────────────────────────
  const rejectMutation = useMutation({
    mutationFn: (userId: string) => api.deleteStaff(userId),
    onSuccess: () => {
      setRejectTarget(null);
      showToast("Đã từ chối tài khoản", "success");
      queryClient.invalidateQueries({ queryKey: qk.staffs.unassigned() });
    },
    onError: (err) => {
      if (rejectTarget) {
        setPendingRowError((p) => ({
          ...p,
          [rejectTarget.userId]:
            err instanceof Error ? err.message : "Xóa thất bại",
        }));
      }
    },
  });

  // ── Handlers: form submissions ─────────────────────────────────────────────
  const handleAddWorker = () => {
    setApiError(null);
    const errors = validateForm(formData, apiRoles);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    createMutation.mutate();
  };

  const handleEditWorker = () => {
    if (!modals.editItem) return;
    setApiError(null);
    const errors = validateForm(formData, apiRoles);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    updateMutation.mutate();
  };

  const handleDeleteWorker = () => {
    if (modals.deleteItem) deleteMutation.mutate(modals.deleteItem.id);
  };

  // ── Handler: approve pending (per-row loading — keep local state) ──────────
  const handleApprovePending = async (staff: UnassignedStaff) => {
    if (!staff.userId) return;
    if (!staff.requestedRole) {
      setPendingRowError((p) => ({
        ...p,
        [staff.userId]: "Chưa có vai trò đăng ký",
      }));
      return;
    }
    setApprovingId(staff.userId);
    setPendingRowError((p) => {
      const n = { ...p };
      delete n[staff.userId];
      return n;
    });
    try {
      await api.assignStaffRole(staff.userId, staff.requestedRole);
      // Invalidate both lists — approved user moves from pending → staff
      queryClient.invalidateQueries({ queryKey: qk.staffs.all });
      showToast("Duyệt tài khoản thành công", "success");
    } catch (err) {
      setPendingRowError((p) => ({
        ...p,
        [staff.userId]:
          err instanceof Error ? err.message : "Cấp quyền thất bại",
      }));
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectPending = () => {
    if (rejectTarget) rejectMutation.mutate(rejectTarget.userId);
  };

  // ── Sort header helper ─────────────────────────────────────────────────────
  type SortKey = "dateJoined" | "status";
  function SortIcon({ field }: { field: SortKey }) {
    if (sort.sortField !== field)
      return <ArrowUpDown className="w-3.5 h-3.5 text-ink-400" />;
    return sort.sortDirection === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-primary" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-primary" />
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 flex flex-col gap-6">
      <PageHeader
        icon={Users}
        title="Nhân Viên"
        subtitle="Quản lý danh sách nhân viên"
        actions={
          <Button
            leadingIcon={Plus}
            onClick={() => {
              resetForm();
              modals.openCreate();
            }}
          >
            Thêm nhân viên
          </Button>
        }
      />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { value: "staff", label: "Nhân viên", icon: Users },
          {
            value: "pending",
            label: "Chờ duyệt",
            icon: UserCheck,
            badge: pending.length > 0 ? pending.length : undefined,
          },
        ]}
      />

      {/* ===== STAFF TAB ===== */}
      {activeTab === "staff" ? (
        <div className="flex flex-col gap-3">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <SearchInput
              value={searchTerm}
              onChange={(v) => {
                setSearchTerm(v);
                pagination.reset();
              }}
              placeholder="Tìm kiếm nhân viên..."
              className="flex-1 min-w-[160px]"
            />
            <div className="shrink-0">
              <select
                value={filterRole}
                onChange={(e) => {
                  setFilterRole(e.target.value);
                  pagination.reset();
                }}
                className="h-[42px] pl-3 pr-9 py-2.5 border border-border-strong rounded-btn text-sm text-ink-700 bg-surface focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2362748e'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 0.625rem center",
                  backgroundSize: "1rem 1rem",
                }}
              >
                <option value="all">Tất cả vai trò</option>
                {availableRoleNames.map((r) => (
                  <option key={r} value={r}>
                    {getRoleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-surface rounded-card border border-border shadow-card">
            <QueryState
              query={staffsQuery}
              errorTitle="Không thể tải danh sách nhân viên"
            >
              {filteredWorkers.length === 0 ? (
                <EmptyState message="Không tìm thấy nhân viên nào" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-surface-alt border-b border-border">
                      <tr>
                        {["Nhân viên", "Email", "SĐT", "Vai trò"].map((h) => (
                          <th
                            key={h}
                            className="px-6 py-4 text-left text-xs font-bold text-ink-500 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                        <th className="px-6 py-4 text-left text-xs font-bold text-ink-500 uppercase tracking-wider">
                          <button
                            onClick={() => sort.toggle("dateJoined")}
                            className="flex items-center gap-1 hover:text-primary"
                          >
                            Ngày tham gia <SortIcon field="dateJoined" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-ink-500 uppercase tracking-wider">
                          <button
                            onClick={() => sort.toggle("status")}
                            className="flex items-center gap-1 hover:text-primary"
                          >
                            Trạng thái <SortIcon field="status" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-ink-500 uppercase tracking-wider">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pagination.pagedItems.map((worker) => (
                        <tr
                          key={worker.id}
                          className="hover:bg-surface-alt transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-primary rounded-pill flex items-center justify-center text-primary-fg text-sm font-bold shrink-0">
                                {(worker.name || "?").charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-ink-800 text-sm">
                                {worker.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-ink-500">
                            {worker.email}
                          </td>
                          <td className="px-6 py-4 text-sm text-ink-500">
                            {worker.phone}
                          </td>
                          <td className="px-6 py-4 text-sm text-ink-500">
                            {getRoleLabel(worker.role)}
                          </td>
                          <td className="px-6 py-4 text-sm text-ink-500">
                            {worker.dateJoined}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge
                              label={workerStatusLabel(worker.status)}
                              tone={workerStatusTone(worker.status)}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <RowActions
                              onView={() => modals.openView(worker)}
                              onEdit={() => {
                                setFormData({
                                  name: worker.name,
                                  email: worker.email,
                                  phone: worker.phone,
                                  role: worker.role,
                                  status: worker.status,
                                });
                                setFormErrors({});
                                setApiError(null);
                                modals.openEdit(worker);
                              }}
                              onDelete={() => modals.openDelete(worker)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </QueryState>
            {/* Pagination — only when data is loaded and there are results */}
            {!staffsQuery.isLoading &&
              !staffsQuery.isError &&
              filteredWorkers.length > 0 && (
                <div className="border-t border-border px-5 py-2">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={pagination.setPage}
                    showLabel
                    totalItems={filteredWorkers.length}
                    pageSize={PAGE_SIZE}
                    itemLabel="nhân viên"
                  />
                </div>
              )}
          </div>
        </div>
      ) : (
        /* ===== PENDING TAB ===== */
        <div className="bg-surface rounded-card border border-border shadow-card">
          <QueryState
            query={pendingQuery}
            errorTitle="Không thể tải danh sách chờ duyệt"
          >
            {pending.length === 0 ? (
              <EmptyState
                icon={CheckCircle}
                message="Không có tài khoản nào đang chờ duyệt"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="bg-surface-alt border-b border-border">
                    <tr>
                      {[
                        "Họ và tên",
                        "Email",
                        "SĐT",
                        "Vai trò đăng ký",
                        "Ngày đăng ký",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-6 py-4 text-left text-xs font-bold text-ink-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                      <th className="px-6 py-4 text-left text-xs font-bold text-ink-500 uppercase tracking-wider">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pendingPagination.pagedItems.map((s) => (
                      <tr
                        key={s.userId}
                        className="hover:bg-surface-alt transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-primary rounded-pill flex items-center justify-center text-primary-fg text-sm font-bold shrink-0">
                              {(s.fullname || s.email || "?")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <span className="font-medium text-ink-800 text-sm">
                              {s.fullname || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-ink-500">
                          {s.email}
                        </td>
                        <td className="px-6 py-4 text-sm text-ink-500">
                          {s.phoneNumber || "—"}
                        </td>
                        <td className="px-6 py-4">
                          {s.requestedRole ? (
                            <StatusBadge
                              label={getRoleLabel(s.requestedRole)}
                              tone={
                                s.requestedRole === "Specialist"
                                  ? "info"
                                  : "success"
                              }
                            />
                          ) : (
                            <StatusBadge label="Chưa xác định" tone="neutral" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-ink-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            {s.createdAt
                              ? new Date(s.createdAt).toLocaleDateString(
                                  "vi-VN",
                                )
                              : "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {pendingRowError[s.userId] && (
                              <span className="text-xs text-status-danger-fg max-w-[120px] leading-tight">
                                {pendingRowError[s.userId]}
                              </span>
                            )}
                            <button
                              onClick={() => handleApprovePending(s)}
                              disabled={
                                approvingId === s.userId || !s.requestedRole
                              }
                              title={
                                !s.requestedRole
                                  ? "Chưa có vai trò đăng ký"
                                  : `Duyệt vai trò ${getRoleLabel(s.requestedRole)}`
                              }
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-fg rounded-btn text-xs font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              {approvingId === s.userId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5" />
                              )}
                              Duyệt
                            </button>
                            <button
                              onClick={() => setRejectTarget(s)}
                              disabled={approvingId === s.userId}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-status-danger-fg/40 text-status-danger-fg rounded-btn text-xs font-medium hover:bg-status-danger-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Từ chối
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {pending.length > 0 && (
              <div className="border-t border-border px-5 py-2">
                <Pagination
                  currentPage={pendingPagination.page}
                  totalPages={pendingPagination.totalPages}
                  onPageChange={pendingPagination.setPage}
                  showLabel
                  totalItems={pending.length}
                  pageSize={PAGE_SIZE}
                  itemLabel="tài khoản"
                />
              </div>
            )}
          </QueryState>
        </div>
      )}

      {/* ===== VIEW MODAL ===== */}
      <Modal
        open={!!modals.viewItem}
        onOpenChange={(o) => !o && modals.closeView()}
        title="Chi tiết nhân viên"
        size="md"
      >
        {modals.viewItem && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary rounded-pill flex items-center justify-center text-primary-fg text-xl font-bold">
                {(modals.viewItem.name || "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-ink-800 text-lg">
                  {modals.viewItem.name}
                </div>
                <StatusBadge
                  label={workerStatusLabel(modals.viewItem.status)}
                  tone={workerStatusTone(modals.viewItem.status)}
                />
              </div>
            </div>
            {[
              { label: "Email", value: modals.viewItem.email },
              { label: "Số điện thoại", value: modals.viewItem.phone },
              { label: "Vai trò", value: getRoleLabel(modals.viewItem.role) },
              { label: "Ngày tham gia", value: modals.viewItem.dateJoined },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex justify-between py-2 border-b border-surface-subtle"
              >
                <span className="text-sm text-ink-500">{label}</span>
                <span className="text-sm font-medium text-ink-800">
                  {value || "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ===== CREATE MODAL ===== */}
      <Modal
        open={modals.createOpen}
        onOpenChange={(o) => {
          if (!o) {
            modals.closeCreate();
            resetForm();
          }
        }}
        title="Thêm nhân viên mới"
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                modals.closeCreate();
                resetForm();
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={handleAddWorker}
              loading={createMutation.isPending}
            >
              Thêm nhân viên
            </Button>
          </>
        }
      >
        {apiError && (
          <div className="flex items-start gap-2 p-3 mb-4 bg-status-danger-bg border border-status-danger-fg/20 rounded-btn">
            <AlertCircle className="w-4 h-4 text-status-danger-fg mt-0.5 shrink-0" />
            <p className="text-sm text-status-danger-fg">{apiError}</p>
          </div>
        )}
        <WorkerForm
          formData={formData}
          setFormData={(updater) => {
            setFormData(updater);
            setFormErrors({});
            setApiError(null);
          }}
          errors={formErrors}
          apiRoles={apiRoles}
          rolesLoaded={rolesLoaded}
        />
        <p className="mt-3 text-xs text-ink-400">
          Mật khẩu mặc định: <span className="font-mono">123456</span> — nhân
          viên sẽ tự đổi sau khi đăng nhập.
        </p>
      </Modal>

      {/* ===== EDIT MODAL ===== */}
      <Modal
        open={!!modals.editItem}
        onOpenChange={(o) => {
          if (!o) {
            modals.closeEdit();
            resetForm();
          }
        }}
        title="Chỉnh sửa nhân viên"
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                modals.closeEdit();
                resetForm();
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={handleEditWorker}
              loading={updateMutation.isPending}
            >
              Lưu thay đổi
            </Button>
          </>
        }
      >
        {apiError && (
          <div className="flex items-start gap-2 p-3 mb-4 bg-status-danger-bg border border-status-danger-fg/20 rounded-btn">
            <AlertCircle className="w-4 h-4 text-status-danger-fg mt-0.5 shrink-0" />
            <p className="text-sm text-status-danger-fg">{apiError}</p>
          </div>
        )}
        <WorkerForm
          formData={formData}
          setFormData={(updater) => {
            setFormData(updater);
            setFormErrors({});
            setApiError(null);
          }}
          errors={formErrors}
          apiRoles={apiRoles}
          rolesLoaded={rolesLoaded}
          showStatus
        />
      </Modal>

      {/* ===== DELETE CONFIRM ===== */}
      <ConfirmDialog
        open={!!modals.deleteItem}
        onOpenChange={(o) => !o && modals.closeDelete()}
        title="Xóa nhân viên"
        description={
          <>
            Bạn có chắc muốn xóa <strong>{modals.deleteItem?.name}</strong>?
            Hành động này không thể hoàn tác.
          </>
        }
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteWorker}
      />

      {/* ===== REJECT PENDING CONFIRM ===== */}
      <ConfirmDialog
        open={!!rejectTarget}
        onOpenChange={(o) => !o && setRejectTarget(null)}
        title="Từ chối tài khoản"
        description={
          <>
            Bạn có chắc muốn từ chối và xóa tài khoản của{" "}
            <strong>{rejectTarget?.fullname || rejectTarget?.email}</strong>?
            Hành động này không thể hoàn tác.
          </>
        }
        confirmLabel="Xóa tài khoản"
        loading={rejectMutation.isPending}
        onConfirm={handleRejectPending}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

// ─── WorkerForm ───────────────────────────────────────────────────────────────

function WorkerForm({
  formData,
  setFormData,
  errors,
  apiRoles,
  rolesLoaded,
  showStatus = false,
}: {
  formData: {
    name: string;
    email: string;
    phone: string;
    role: string;
    status: WorkerStatus;
  };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  errors: FormErrors;
  apiRoles: RoleResponse[];
  rolesLoaded: boolean;
  showStatus?: boolean;
}) {
  const roleOptions = apiRoles.map((r) => r.roleName);

  return (
    <div className="space-y-4">
      <FormField
        label="Họ và tên"
        required
        value={formData.name}
        onChange={(v) => setFormData((p) => ({ ...p, name: v }))}
        placeholder="Nguyễn Văn A"
        error={errors.name}
      />
      <FormField
        label="Email"
        required
        type="email"
        value={formData.email}
        onChange={(v) => setFormData((p) => ({ ...p, email: v }))}
        placeholder="nhanvien@farm.com"
        error={errors.email}
      />
      <FormField
        label="Số điện thoại"
        required
        type="tel"
        value={formData.phone}
        onChange={(v) => setFormData((p) => ({ ...p, phone: v }))}
        placeholder="0901234567"
        error={errors.phone}
      />

      {!rolesLoaded ? (
        <div className="flex items-center gap-2 px-3 py-2.5 border border-border rounded-btn text-sm text-ink-400">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Đang tải vai trò...
        </div>
      ) : roleOptions.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-2.5 border border-status-warning-bg-2 bg-status-warning-bg rounded-btn text-sm text-status-warning-fg">
          <AlertCircle className="w-4 h-4" />
          Không tải được danh sách vai trò
        </div>
      ) : (
        <FormSelect
          label="Vai trò"
          required
          value={formData.role}
          onChange={(v) => setFormData((p) => ({ ...p, role: v }))}
          options={roleOptions.map((r) => ({
            value: r,
            label: getRoleLabel(r),
          }))}
          placeholder="— Chọn vai trò —"
          error={errors.role}
        />
      )}

      {showStatus && (
        <FormSelect
          label="Trạng thái"
          value={formData.status}
          onChange={(v) =>
            setFormData((p) => ({ ...p, status: v as WorkerStatus }))
          }
          options={[
            { value: "Active", label: "Hoạt động" },
            { value: "Inactive", label: "Không hoạt động" },
          ]}
        />
      )}
    </div>
  );
}
