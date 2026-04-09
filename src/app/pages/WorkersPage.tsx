import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  X,
  Loader2,
  Users,
  WifiOff,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  AlertCircle,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { mockWorkers, roles as mockRoles } from "../../data/mockData";
import { api, UserResponse, RoleResponse } from "../../api/client";

// Local row type — status matches API values directly ("Active" | "Inactive")
type WorkerStatus = "Active" | "Inactive";

interface WorkerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: WorkerStatus;
  dateJoined: string;
}

// Map API UserResponse → local WorkerRow shape
function mapUser(u: UserResponse): WorkerRow {
  const s =
    u.status?.charAt(0).toUpperCase() +
    (u.status?.slice(1).toLowerCase() ?? "");
  return {
    id: u.userId,
    name: u.fullname ?? u.email,
    email: u.email,
    phone: u.phoneNumber ?? "",
    role: u.roleName ?? "Worker",
    status: s === "Active" ? "Active" : "Inactive",
    dateJoined: u.createdAt
      ? new Date(u.createdAt).toLocaleDateString("vi-VN")
      : "",
  };
}

// Map legacy mockWorkers (status: "active"/"inactive") → WorkerRow
function mapMockWorker(w: {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  dateJoined: string;
}): WorkerRow {
  return {
    ...w,
    status: w.status?.toLowerCase() === "active" ? "Active" : "Inactive",
  };
}

const getStatusBadgeColor = (status: WorkerStatus) =>
  status === "Active"
    ? "bg-[#dcfce7] text-[#008236]"
    : "bg-[#fee2e2] text-[#991b1b]";

const PAGE_SIZE = 8;

// ── Form validation helpers ──────────────────────────────────────────────────
interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
}

function validateForm(
  formData: { name: string; email: string; phone: string; role: string },
  availableRoles: RoleResponse[],
  usingMock: boolean,
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
    !usingMock &&
    availableRoles.length > 0 &&
    !availableRoles.find((r) => r.roleName === formData.role)
  ) {
    errors.role = "Vai trò không hợp lệ";
  }

  return errors;
}

export function WorkersPage() {
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [sortField, setSortField] = useState<"dateJoined" | "status" | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<WorkerRow | null>(null);
  const [workerToDelete, setWorkerToDelete] = useState<WorkerRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // Roles fetched from API (non-Owner only)
  const [apiRoles, setApiRoles] = useState<RoleResponse[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    status: "Active" as WorkerStatus,
  });

  // Derive display role names for filter & form (non-Owner)
  const availableRoleNames: string[] = usingMock
    ? mockRoles.filter((r) => r !== "Chủ trang trại")
    : apiRoles.map((r) => r.roleName);

  // ── Load roles ──
  const loadRoles = useCallback(async () => {
    try {
      const data = await api.getRoles();
      // Filter out Owner role — this page only manages non-owner accounts
      const nonOwner = (data ?? []).filter(
        (r) => r.roleName.toLowerCase() !== "owner",
      );
      setApiRoles(nonOwner);
    } catch {
      // If roles API fails, we'll rely on mock roles as fallback for display
    } finally {
      setRolesLoaded(true);
    }
  }, []);

  // ── Load workers ──
  const loadWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getWorkers();
      setWorkers((data ?? []).filter(Boolean).map(mapUser));
      setUsingMock(false);
    } catch {
      setWorkers(mockWorkers.map(mapMockWorker));
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
    loadWorkers();
  }, [loadRoles, loadWorkers]);

  // ── Helpers ──
  const getRoleId = (roleName: string): string | undefined => {
    return apiRoles.find((r) => r.roleName === roleName)?.roleId;
  };

  const handleSort = (field: "dateJoined" | "status") => {
    if (sortField === field)
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDirection("asc");
    }
    setPage(1);
  };

  const filteredWorkers = workers
    .filter((w) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        w.name.toLowerCase().includes(term) ||
        w.email.toLowerCase().includes(term) ||
        w.phone.includes(searchTerm) ||
        w.role.toLowerCase().includes(term);
      const matchRole = filterRole === "all" || w.role === filterRole;
      return matchSearch && matchRole;
    })
    .sort((a, b) => {
      // Parse dd/MM/yyyy → timestamp
      const parseDate = (d: string) =>
        d ? new Date(d.split("/").reverse().join("-")).getTime() : 0;

      // When user explicitly sorts by status
      if (sortField === "status") {
        const order: Record<WorkerStatus, number> = { Active: 1, Inactive: 2 };
        return sortDirection === "asc"
          ? order[a.status] - order[b.status]
          : order[b.status] - order[a.status];
      }

      // Default (no explicit sort) or explicit dateJoined sort:
      // newest at bottom = ascending by date
      const da = parseDate(a.dateJoined);
      const db = parseDate(b.dateJoined);
      const dir = sortField === "dateJoined" ? sortDirection : "asc";
      return dir === "asc" ? da - db : db - da;
    });

  const totalPages = Math.max(1, Math.ceil(filteredWorkers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedWorkers = filteredWorkers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const defaultRole = availableRoleNames[0] ?? "";

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: defaultRole,
      status: "Active",
    });
    setFormErrors({});
    setApiError(null);
  };

  // --- ADD ---
  const handleAddWorker = async () => {
    setApiError(null);
    const errors = validateForm(formData, apiRoles, usingMock);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      if (usingMock) {
        const newWorker: WorkerRow = {
          id: Date.now().toString(),
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          role: formData.role,
          status: "Active",
          dateJoined: new Date().toLocaleDateString("vi-VN"),
        };
        setWorkers((prev) => [...prev, newWorker]);
      } else {
        const roleId = getRoleId(formData.role);
        if (!roleId) {
          setApiError("Không tìm thấy ID vai trò. Vui lòng thử tải lại trang.");
          setSubmitting(false);
          return;
        }
        await api.createWorker({
          email: formData.email.trim(),
          password: "123456",
          fullname: formData.name.trim(),
          phoneNumber: formData.phone.trim(),
          status: "Active",
          roleId,
        });
        await loadWorkers();
      }
      setIsAddModalOpen(false);
      resetForm();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định";
      setApiError("Không thể tạo nhân viên: " + msg);
    } finally {
      setSubmitting(false);
    }
  };

  // --- EDIT ---
  const handleEditWorker = async () => {
    if (!selectedWorker) return;
    setApiError(null);
    const errors = validateForm(formData, apiRoles, usingMock);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      if (usingMock) {
        setWorkers((prev) =>
          prev.map((w) =>
            w.id === selectedWorker.id
              ? {
                  ...w,
                  name: formData.name.trim(),
                  email: formData.email.trim(),
                  phone: formData.phone.trim(),
                  role: formData.role,
                  status: formData.status,
                }
              : w,
          ),
        );
      } else {
        // Detect which fields changed compared to selectedWorker (snapshot at modal open)
        const statusChanged = formData.status !== selectedWorker.status;
        const infoChanged =
          formData.name.trim() !== selectedWorker.name ||
          formData.email.trim() !== selectedWorker.email ||
          formData.phone.trim() !== selectedWorker.phone ||
          formData.role !== selectedWorker.role;

        if (!statusChanged && !infoChanged) {
          // Nothing changed — just close
          setIsEditModalOpen(false);
          resetForm();
          setSubmitting(false);
          return;
        }

        // If info fields changed → PUT
        if (infoChanged) {
          const roleId = getRoleId(formData.role);
          if (!roleId) {
            setApiError(
              "Không tìm thấy ID vai trò. Vui lòng thử tải lại trang.",
            );
            setSubmitting(false);
            return;
          }
          await api.updateWorker(selectedWorker.id, {
            email: formData.email.trim(),
            fullname: formData.name.trim(),
            phoneNumber: formData.phone.trim(),
            status: formData.status,
            roleId,
          });
        }

        // If status changed → PATCH
        if (statusChanged) {
          await api.changeWorkerStatus(selectedWorker.id, formData.status);
        }

        await loadWorkers();
      }
      setIsEditModalOpen(false);
      resetForm();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định";
      setApiError("Không thể cập nhật: " + msg);
    } finally {
      setSubmitting(false);
    }
  };

  // --- DELETE ---
  const handleDeleteWorker = async () => {
    if (!workerToDelete) return;
    setSubmitting(true);
    try {
      if (!usingMock) await api.deleteWorker(workerToDelete.id);
      setWorkers((prev) => prev.filter((w) => w.id !== workerToDelete.id));
      setIsDeleteDialogOpen(false);
      setWorkerToDelete(null);
    } catch (err) {
      alert(
        "Không thể xóa: " +
          (err instanceof Error ? err.message : "Đã xảy ra lỗi"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openViewModal = (w: WorkerRow) => {
    setSelectedWorker(w);
    setIsViewModalOpen(true);
  };
  const openEditModal = (w: WorkerRow) => {
    setSelectedWorker(w);
    setFormData({
      name: w.name,
      email: w.email,
      phone: w.phone,
      role: w.role,
      status: w.status,
    });
    setFormErrors({});
    setApiError(null);
    setIsEditModalOpen(true);
  };
  const openDeleteDialog = (w: WorkerRow) => {
    setWorkerToDelete(w);
    setIsDeleteDialogOpen(true);
  };

  // ==================== RENDER ====================
  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#009689] rounded-[10px] flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#115e59]">Nhân Viên</h1>
            <p className="text-sm text-[#62748e]">
              Quản lý danh sách nhân viên
            </p>
          </div>
          {usingMock && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full">
              <WifiOff className="w-3 h-3 text-amber-500" />
              <span className="text-xs text-amber-600">Dữ liệu mẫu</span>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Thêm nhân viên
        </button>
      </div>

      {/* Table + Filters */}
      <div className="flex flex-col gap-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm kiếm nhân viên..."
              className="w-full pl-9 pr-4 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155] shrink-0"
          >
            <option value="all">Tất cả vai trò</option>
            {availableRoleNames.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#009689]" />
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="text-center py-16 text-[#62748e]">
              Không tìm thấy nhân viên nào
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <tr>
                  {["Nhân viên", "Email", "SĐT", "Vai trò"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-left text-xs font-bold text-[#62748e] uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#62748e] uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("dateJoined")}
                      className="flex items-center gap-1 hover:text-[#009689]"
                    >
                      Ngày tham gia{" "}
                      {sortField !== "dateJoined" ? (
                        <ArrowUpDown className="w-3.5 h-3.5 text-[#94a3b8]" />
                      ) : sortDirection === "asc" ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[#009689]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[#009689]" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#62748e] uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("status")}
                      className="flex items-center gap-1 hover:text-[#009689]"
                    >
                      Trạng thái{" "}
                      {sortField !== "status" ? (
                        <ArrowUpDown className="w-3.5 h-3.5 text-[#94a3b8]" />
                      ) : sortDirection === "asc" ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[#009689]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[#009689]" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#62748e] uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {pagedWorkers.map((worker) => (
                  <tr
                    key={worker.id}
                    className="hover:bg-[#f8fafc] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#009689] rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {worker.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-[#115e59] text-sm">
                          {worker.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#62748e]">
                      {worker.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#62748e]">
                      {worker.phone}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#62748e]">
                      {worker.role}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#62748e]">
                      {worker.dateJoined}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadgeColor(worker.status)}`}
                      >
                        {worker.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openViewModal(worker)}
                          className="p-1.5 text-[#62748e] hover:text-[#009689] hover:bg-[#f0fdf9] rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(worker)}
                          className="p-1.5 text-[#62748e] hover:text-[#009689] hover:bg-[#f0fdf9] rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteDialog(worker)}
                          className="p-1.5 text-[#62748e] hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {/* pagination */}
          <div className="flex items-center justify-end px-5 py-4 border-t border-[#e2e8f0]">
            <div className="flex items-center gap-1">
              <PaginationBtn
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </PaginationBtn>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                    p === currentPage
                      ? "bg-[#009689] text-white font-semibold"
                      : "text-[#62748e] hover:bg-[#f1f5f9]"
                  }`}
                >
                  {p}
                </button>
              ))}
              <PaginationBtn
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </PaginationBtn>
            </div>
          </div>
        </div>
      </div>
      {/* end filters+table wrapper */}

      {/* ===== VIEW MODAL ===== */}
      <Dialog.Root open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-full max-w-md z-50 p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-lg font-bold text-[#115e59]">
                Chi tiết nhân viên
              </Dialog.Title>
              <Dialog.Close className="text-[#94a3b8] hover:text-[#62748e]">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Thông tin chi tiết nhân viên
            </Dialog.Description>
            {selectedWorker && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#009689] rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {selectedWorker.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-[#115e59] text-lg">
                      {selectedWorker.name}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadgeColor(selectedWorker.status)}`}
                    >
                      {selectedWorker.status}
                    </span>
                  </div>
                </div>
                {[
                  { label: "Email", value: selectedWorker.email },
                  { label: "Số điện thoại", value: selectedWorker.phone },
                  { label: "Vai trò", value: selectedWorker.role },
                  { label: "Ngày tham gia", value: selectedWorker.dateJoined },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between py-2 border-b border-[#f1f5f9]"
                  >
                    <span className="text-sm text-[#62748e]">{label}</span>
                    <span className="text-sm font-medium text-[#115e59]">
                      {value || "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ===== ADD MODAL ===== */}
      <Dialog.Root
        open={isAddModalOpen}
        onOpenChange={(o) => {
          setIsAddModalOpen(o);
          if (!o) resetForm();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-full max-w-md z-50 p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-lg font-bold text-[#115e59]">
                Thêm nhân viên mới
              </Dialog.Title>
              <Dialog.Close className="text-[#94a3b8] hover:text-[#62748e]">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Form thêm nhân viên mới
            </Dialog.Description>

            {apiError && (
              <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600">{apiError}</p>
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
              roleOptions={availableRoleNames}
              rolesLoading={!rolesLoaded}
            />

            <p className="mt-3 text-xs text-[#94a3b8]">
              Mật khẩu mặc định: <span className="font-mono">123456</span> —
              nhân viên sẽ tự đổi sau khi đăng nhập.
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <Dialog.Close className="px-4 py-2 text-sm text-[#62748e] hover:text-[#334155] transition-colors">
                Hủy
              </Dialog.Close>
              <button
                onClick={handleAddWorker}
                disabled={submitting}
                className="px-4 py-2 bg-[#009689] text-white text-sm rounded-lg hover:bg-[#007f75] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Thêm nhân viên
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ===== EDIT MODAL ===== */}
      <Dialog.Root
        open={isEditModalOpen}
        onOpenChange={(o) => {
          setIsEditModalOpen(o);
          if (!o) resetForm();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-full max-w-md z-50 p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-lg font-bold text-[#115e59]">
                Chỉnh sửa nhân viên
              </Dialog.Title>
              <Dialog.Close className="text-[#94a3b8] hover:text-[#62748e]">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Form chỉnh sửa thông tin nhân viên
            </Dialog.Description>

            {apiError && (
              <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600">{apiError}</p>
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
              roleOptions={availableRoleNames}
              rolesLoading={!rolesLoaded}
              showStatus
            />

            <div className="flex justify-end gap-3 mt-6">
              <Dialog.Close className="px-4 py-2 text-sm text-[#62748e] hover:text-[#334155] transition-colors">
                Hủy
              </Dialog.Close>
              <button
                onClick={handleEditWorker}
                disabled={submitting}
                className="px-4 py-2 bg-[#009689] text-white text-sm rounded-lg hover:bg-[#007f75] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Lưu thay đổi
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ===== DELETE DIALOG ===== */}
      <AlertDialog.Root
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-full max-w-sm z-50 p-6">
            <AlertDialog.Title className="text-lg font-bold text-[#115e59] mb-2">
              Xóa nhân viên
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-[#62748e] mb-6">
              Bạn có chắc muốn xóa <strong>{workerToDelete?.name}</strong>? Hành
              động này không thể hoàn tác.
            </AlertDialog.Description>
            <div className="flex justify-end gap-3">
              <AlertDialog.Cancel className="px-4 py-2 text-sm text-[#62748e] hover:text-[#334155] transition-colors">
                Hủy
              </AlertDialog.Cancel>
              <AlertDialog.Action
                onClick={handleDeleteWorker}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Xóa
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

// ── Shared form component ────────────────────────────────────────────────────
function WorkerForm({
  formData,
  setFormData,
  errors,
  roleOptions,
  rolesLoading,
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
  roleOptions: string[];
  rolesLoading: boolean;
  showStatus?: boolean;
}) {
  const fields: {
    key: "name" | "email" | "phone";
    label: string;
    type?: string;
    placeholder?: string;
  }[] = [
    { key: "name", label: "Họ và tên", placeholder: "Nguyễn Văn A" },
    {
      key: "email",
      label: "Email",
      type: "email",
      placeholder: "nhanvien@farm.com",
    },
    { key: "phone", label: "Số điện thoại", placeholder: "0901234567" },
  ];

  return (
    <div className="space-y-4">
      {fields.map(({ key, label, type = "text", placeholder }) => (
        <div key={key}>
          <label className="block text-sm font-medium text-[#45556c] mb-1">
            {label} <span className="text-red-400">*</span>
          </label>
          <input
            type={type}
            value={formData[key]}
            onChange={(e) =>
              setFormData((p) => ({ ...p, [key]: e.target.value }))
            }
            placeholder={placeholder}
            className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155] ${
              errors[key as keyof FormErrors]
                ? "border-red-300 bg-red-50"
                : "border-[#e2e8f0]"
            }`}
          />
          {errors[key as keyof FormErrors] && (
            <p className="mt-1 text-xs text-red-500">
              {errors[key as keyof FormErrors]}
            </p>
          )}
        </div>
      ))}
      <div>
        <label className="block text-sm font-medium text-[#45556c] mb-1">
          Vai trò <span className="text-red-400">*</span>
        </label>
        {rolesLoading ? (
          <div className="flex items-center gap-2 px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm text-[#94a3b8]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang tải vai trò...
          </div>
        ) : roleOptions.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-2.5 border border-amber-200 bg-amber-50 rounded-lg text-sm text-amber-600">
            <AlertCircle className="w-4 h-4" />
            Không tải được danh sách vai trò
          </div>
        ) : (
          <select
            value={formData.role}
            onChange={(e) =>
              setFormData((p) => ({ ...p, role: e.target.value }))
            }
            className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155] ${
              errors.role ? "border-red-300 bg-red-50" : "border-[#e2e8f0]"
            }`}
          >
            <option value="">— Chọn vai trò —</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}
        {errors.role && (
          <p className="mt-1 text-xs text-red-500">{errors.role}</p>
        )}
      </div>
      {showStatus && (
        <div>
          <label className="block text-sm font-medium text-[#45556c] mb-1">
            Trạng thái
          </label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData((p) => ({
                ...p,
                status: e.target.value as WorkerStatus,
              }))
            }
            className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155]"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      )}
    </div>
  );
}

// ── Pagination Button ─────────────────────────────────────────────────────────
function PaginationBtn({
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
      className="w-8 h-8 flex items-center justify-center rounded-lg text-[#62748e] hover:bg-[#f1f5f9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
