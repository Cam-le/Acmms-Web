import { useState, useEffect } from "react";
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
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Worker, mockWorkers, roles } from "../../data/mockData";
import { api, UserResponse } from "../../api/client";

// Map API UserResponse → local Worker shape
function mapUser(u: UserResponse): Worker {
  return {
    id: u.userId,
    name: u.fullname ?? u.email,
    email: u.email,
    phone: u.phoneNumber ?? "",
    role: u.roleName ?? "Công Nhân",
    status: u.status?.toLowerCase() === "active" ? "active" : "inactive",
    dateJoined: u.createdAt
      ? new Date(u.createdAt).toLocaleDateString("vi-VN")
      : "",
  };
}

const getStatusBadgeColor = (status: "active" | "inactive") =>
  status === "active"
    ? "bg-[#dcfce7] text-[#008236]"
    : "bg-[#fee2e2] text-[#991b1b]";

const getStatusLabel = (status: "active" | "inactive") =>
  status === "active" ? "Đang làm việc" : "Ngừng làm việc";

export function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "Công Nhân",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    setLoading(true);
    try {
      const data = await api.getWorkers();
      setWorkers(data.map(mapUser));
      setUsingMock(false);
    } catch {
      setWorkers([...mockWorkers]);
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkers = workers.filter((w) => {
    const matchSearch =
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.phone.includes(searchTerm) ||
      w.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "all" || w.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const resetForm = () =>
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "Công Nhân",
      password: "",
      confirmPassword: "",
    });

  // --- ADD ---
  const handleAddWorker = async () => {
    if (formData.password !== formData.confirmPassword) {
      alert("Mật khẩu không khớp!");
      return;
    }
    setSubmitting(true);
    try {
      if (usingMock) {
        const newWorker: Worker = {
          id: Date.now().toString(),
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          status: "active",
          dateJoined: new Date().toLocaleDateString("vi-VN"),
        };
        setWorkers((prev) => [...prev, newWorker]);
      } else {
        const created = await api.createWorker({
          email: formData.email,
          password: formData.password,
          fullname: formData.name,
          phoneNumber: formData.phone,
          status: "Active",
        });
        setWorkers((prev) => [...prev, mapUser(created)]);
      }
      setIsAddModalOpen(false);
      resetForm();
    } catch (err) {
      alert(
        "Không thể tạo nhân viên: " +
          (err instanceof Error ? err.message : "Lỗi"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // --- EDIT ---
  const handleEditWorker = async () => {
    if (!selectedWorker) return;
    setSubmitting(true);
    try {
      if (usingMock) {
        setWorkers((prev) =>
          prev.map((w) =>
            w.id === selectedWorker.id
              ? {
                  ...w,
                  name: formData.name,
                  email: formData.email,
                  phone: formData.phone,
                  role: formData.role,
                }
              : w,
          ),
        );
      } else {
        const updated = await api.updateWorker(selectedWorker.id, {
          email: formData.email,
          fullname: formData.name,
          phoneNumber: formData.phone,
        });
        setWorkers((prev) =>
          prev.map((w) => (w.id === selectedWorker.id ? mapUser(updated) : w)),
        );
      }
      setIsEditModalOpen(false);
      resetForm();
    } catch (err) {
      alert(
        "Không thể cập nhật: " + (err instanceof Error ? err.message : "Lỗi"),
      );
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
      alert("Không thể xóa: " + (err instanceof Error ? err.message : "Lỗi"));
    } finally {
      setSubmitting(false);
    }
  };

  const openViewModal = (w: Worker) => {
    setSelectedWorker(w);
    setIsViewModalOpen(true);
  };
  const openEditModal = (w: Worker) => {
    setSelectedWorker(w);
    setFormData({
      name: w.name,
      email: w.email,
      phone: w.phone,
      role: w.role,
      password: "",
      confirmPassword: "",
    });
    setIsEditModalOpen(true);
  };
  const openDeleteDialog = (w: Worker) => {
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

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm nhân viên..."
            className="w-full pl-9 pr-4 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value as "all" | "active" | "inactive")
          }
          className="px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155]"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang làm việc</option>
          <option value="inactive">Ngừng làm việc</option>
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
                {[
                  "Nhân viên",
                  "Email",
                  "SĐT",
                  "Vai trò",
                  "Trạng thái",
                  "Ngày tham gia",
                  "Thao tác",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-left text-xs font-bold text-[#62748e] uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {filteredWorkers.map((worker) => (
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
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadgeColor(worker.status)}`}
                    >
                      {getStatusLabel(worker.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#62748e]">
                    {worker.dateJoined}
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
      </div>

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
                      {getStatusLabel(selectedWorker.status)}
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
            <WorkerForm
              formData={formData}
              setFormData={setFormData}
              showPassword
            />
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
            <WorkerForm
              formData={formData}
              setFormData={setFormData}
              showPassword={false}
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

// Shared form component
function WorkerForm({
  formData,
  setFormData,
  showPassword,
}: {
  formData: {
    name: string;
    email: string;
    phone: string;
    role: string;
    password: string;
    confirmPassword: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  showPassword: boolean;
}) {
  const fields: {
    key: keyof typeof formData;
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
            {label}
          </label>
          <input
            type={type}
            value={formData[key]}
            onChange={(e) =>
              setFormData((p) => ({ ...p, [key]: e.target.value }))
            }
            placeholder={placeholder}
            className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
          />
        </div>
      ))}
      <div>
        <label className="block text-sm font-medium text-[#45556c] mb-1">
          Vai trò
        </label>
        <select
          value={formData.role}
          onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))}
          className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155]"
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      {showPassword && (
        <>
          <div>
            <label className="block text-sm font-medium text-[#45556c] mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData((p) => ({ ...p, password: e.target.value }))
              }
              className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#45556c] mb-1">
              Xác nhận mật khẩu
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData((p) => ({ ...p, confirmPassword: e.target.value }))
              }
              className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
            />
          </div>
        </>
      )}
    </div>
  );
}
