import { useState, useEffect } from "react";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  MapPin,
  ChevronDown,
  ChevronUp,
  Home,
  Tractor,
  Loader2,
  WifiOff,
  Globe,
  Clock,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Collapsible from "@radix-ui/react-collapsible";
import {
  Farm,
  FarmStatus,
  FarmSoilType as SoilType,
  FarmPlot as Plot,
  farmSoilTypes as soilTypes,
  mockFarms,
} from "../../data/mockData";
import { api, FarmResponse } from "../../api/client";

// ===================== MAP PICKER MODAL (Google Maps – coming soon) =====================
function MapPickerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (location: string) => void;
  initialLocation?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[60]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-full max-w-sm z-[60] p-6 text-center">
          <Dialog.Title className="sr-only">Bản đồ</Dialog.Title>
          <Dialog.Description className="sr-only">
            Tính năng bản đồ sắp ra mắt
          </Dialog.Description>

          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-[#f0fdf9] flex items-center justify-center">
            <Globe className="w-8 h-8 text-[#009689]" />
          </div>

          <h3 className="text-base font-bold text-[#115e59] mb-1">
            Tính năng sắp ra mắt
          </h3>
          <p className="text-sm text-[#62748e] mb-1">
            Chọn vị trí bằng <span className="font-medium">Google Maps</span>{" "}
            đang được phát triển.
          </p>
          <p className="text-xs text-[#94a3b8] mb-5">
            Vui lòng nhập địa chỉ thủ công vào ô vị trí trong thời gian này.
          </p>

          <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Google Maps API integration — coming soon</span>
          </div>

          <Dialog.Close className="w-full px-4 py-2 bg-[#009689] text-white text-sm rounded-lg hover:bg-[#007f75] transition-colors">
            Đã hiểu
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Map API response → local Farm shape
function mapFarm(f: FarmResponse): Farm {
  return {
    id: f.farmId,
    name: f.farmName ?? "",
    location: f.farmLocation ?? "",
    status: f.farmStatus === "Active" ? "Hoạt động" : "Không hoạt động",
    area: f.farmArea ?? 0,
    description: "",
    image: "",
    createdAt: f.farmCreatedAt
      ? new Date(f.farmCreatedAt).toLocaleDateString("vi-VN")
      : "",
    plots: [],
  };
}

const getStatusBadgeColor = (status: FarmStatus) =>
  status === "Hoạt động"
    ? "bg-[#dcfce7] text-[#008236]"
    : "bg-[#fee2e2] text-[#991b1b]";

const plotStatusColor = (status: FarmStatus) =>
  status === "Hoạt động"
    ? "bg-[#dcfce7] text-[#008236]"
    : "bg-[#fee2e2] text-[#991b1b]";

export function FarmPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [farmToDelete, setFarmToDelete] = useState<Farm | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadFarms();
  }, []);

  const loadFarms = async () => {
    setLoading(true);
    try {
      const data = await api.getFarms();
      setFarms(
        data
          .sort(
            (a, b) =>
              new Date(a.farmCreatedAt ?? 0).getTime() -
              new Date(b.farmCreatedAt ?? 0).getTime(),
          )
          .map(mapFarm),
      );
      setUsingMock(false);
    } catch {
      setFarms([...mockFarms]);
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (farm: Farm) => {
    setSelectedFarm(farm);
    setViewModalOpen(true);
  };
  const handleEdit = (farm: Farm) => {
    setSelectedFarm(farm);
    setEditModalOpen(true);
  };
  const handleDelete = (farm: Farm) => {
    setFarmToDelete(farm);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!farmToDelete) return;
    setSubmitting(true);
    try {
      if (!usingMock) await api.deleteFarm(farmToDelete.id);
      setFarms((prev) => prev.filter((f) => f.id !== farmToDelete.id));
      setDeleteDialogOpen(false);
      setFarmToDelete(null);
    } catch (err) {
      alert(
        "Không thể xóa trang trại: " +
          (err instanceof Error ? err.message : "Lỗi"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async (
    farm: Omit<Farm, "id" | "plots" | "createdAt">,
  ) => {
    setSubmitting(true);
    try {
      if (usingMock) {
        setFarms((prev) => [
          ...prev,
          {
            ...farm,
            id: Date.now().toString(),
            plots: [],
            createdAt: new Date().toLocaleDateString("vi-VN"),
          },
        ]);
      } else {
        await api.createFarm({
          farmName: farm.name,
          farmLocation: farm.location,
          farmArea: farm.area,
          farmStatus: farm.status === "Hoạt động" ? "Active" : "Inactive",
        });
        await loadFarms();
      }
      setCreateModalOpen(false);
    } catch (err) {
      alert(
        "Không thể tạo trang trại: " +
          (err instanceof Error ? err.message : "Lỗi"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (updatedFarm: Farm) => {
    setSubmitting(true);
    try {
      if (usingMock) {
        setFarms((prev) =>
          prev.map((f) => (f.id === updatedFarm.id ? updatedFarm : f)),
        );
      } else {
        await api.updateFarm(updatedFarm.id, {
          farmName: updatedFarm.name,
          farmLocation: updatedFarm.location,
          farmArea: updatedFarm.area,
          farmStatus:
            updatedFarm.status === "Hoạt động" ? "Active" : "Inactive",
        });
        await loadFarms();
      }
      setEditModalOpen(false);
      setSelectedFarm(null);
    } catch (err) {
      alert(
        "Không thể cập nhật trang trại: " +
          (err instanceof Error ? err.message : "Lỗi"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPlot = (farmId: string, plot: Omit<Plot, "id">) => {
    setFarms((prev) =>
      prev.map((f) =>
        f.id === farmId
          ? {
              ...f,
              plots: [...f.plots, { ...plot, id: Date.now().toString() }],
            }
          : f,
      ),
    );
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#009689] rounded-[10px] flex items-center justify-center">
            <Tractor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#115e59]">Trang Trại</h1>
            <p className="text-sm text-[#62748e]">
              Quản lý danh sách trang trại
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
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Thêm trang trại
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#009689]" />
        </div>
      ) : farms.length === 0 ? (
        <div className="text-center py-20 text-[#62748e]">
          Chưa có trang trại nào
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {farms.map((farm) => (
            <FarmCard
              key={farm.id}
              farm={farm}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* View Modal */}
      {selectedFarm && (
        <ViewFarmModal
          farm={selectedFarm}
          open={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedFarm(null);
          }}
        />
      )}

      {/* Create Modal */}
      <CreateFarmModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreate}
        submitting={submitting}
      />

      {/* Edit Modal */}
      {selectedFarm && (
        <EditFarmModal
          farm={selectedFarm}
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedFarm(null);
          }}
          onUpdate={handleUpdate}
          submitting={submitting}
        />
      )}

      {/* Delete Dialog */}
      <AlertDialog.Root
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-full max-w-sm z-50 p-6">
            <AlertDialog.Title className="text-lg font-bold text-[#115e59] mb-2">
              Xóa trang trại
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-[#62748e] mb-6">
              Bạn có chắc muốn xóa trang trại{" "}
              <strong>{farmToDelete?.name}</strong>? Hành động này không thể
              hoàn tác.
            </AlertDialog.Description>
            <div className="flex justify-end gap-3">
              <AlertDialog.Cancel className="px-4 py-2 text-sm text-[#62748e] hover:text-[#334155]">
                Hủy
              </AlertDialog.Cancel>
              <AlertDialog.Action
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Xóa
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

// ===================== FARM CARD =====================
function FarmCard({
  farm,
  onView,
  onEdit,
  onDelete,
}: {
  farm: Farm;
  onView: (f: Farm) => void;
  onEdit: (f: Farm) => void;
  onDelete: (f: Farm) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#f0fdf9] rounded-xl flex items-center justify-center shrink-0">
              <Home className="w-6 h-6 text-[#009689]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#115e59]">{farm.name}</h3>
              <div className="flex items-center gap-1 text-sm text-[#62748e] mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                <span className="max-w-xs truncate">{farm.location}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(farm.status)}`}
            >
              {farm.status}
            </span>
            <span className="text-sm text-[#62748e]">
              {farm.area.toLocaleString()} m²
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onView(farm)}
                className="p-1.5 text-[#62748e] hover:text-[#009689] hover:bg-[#f0fdf9] rounded transition-colors"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => onEdit(farm)}
                className="p-1.5 text-[#62748e] hover:text-[#009689] hover:bg-[#f0fdf9] rounded transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(farm)}
                className="p-1.5 text-[#62748e] hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <Collapsible.Trigger className="p-1.5 text-[#62748e] hover:text-[#115e59] transition-colors">
              {open ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Collapsible.Trigger>
          </div>
        </div>

        <Collapsible.Content>
          <div className="border-t border-[#f1f5f9] p-5">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-[#94a3b8] uppercase mb-1">
                  Diện tích
                </div>
                <div className="font-medium text-[#115e59]">
                  {farm.area.toLocaleString()} m²
                </div>
              </div>
              <div>
                <div className="text-xs text-[#94a3b8] uppercase mb-1">
                  Ngày tạo
                </div>
                <div className="font-medium text-[#115e59]">
                  {farm.createdAt || "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#94a3b8] uppercase mb-1">
                  Khu đất
                </div>
                <div className="font-medium text-[#115e59]">
                  {farm.plots.length} khu
                </div>
              </div>
            </div>
          </div>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
}

// ===================== FARM FORM FIELDS =====================
function FarmFormFields({
  formData,
  setFormData,
}: {
  formData: {
    name: string;
    location: string;
    status: FarmStatus;
    area: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
}) {
  const [mapOpen, setMapOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#45556c] mb-1">
            Tên trang trại
          </label>
          <input
            value={formData.name}
            onChange={(e) =>
              setFormData((p) => ({ ...p, name: e.target.value }))
            }
            className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
            placeholder="Trang trại Thung lũng Xanh"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#45556c] mb-1">
            Vị trí
          </label>
          <div className="flex gap-2">
            <input
              value={formData.location}
              onChange={(e) =>
                setFormData((p) => ({ ...p, location: e.target.value }))
              }
              className="flex-1 min-w-0 px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
              placeholder="Hà Nội, Việt Nam"
            />
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              title="Chọn vị trí trên bản đồ"
              className="px-2.5 py-2 border border-[#e2e8f0] rounded-lg text-[#009689] hover:bg-[#f0fdf9] hover:border-[#009689] transition-colors shrink-0"
            >
              <Globe className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#45556c] mb-1">
            Diện tích (m²)
          </label>
          <input
            type="number"
            value={formData.area}
            onChange={(e) =>
              setFormData((p) => ({ ...p, area: e.target.value }))
            }
            className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
            placeholder="5000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#45556c] mb-1">
            Trạng thái
          </label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData((p) => ({
                ...p,
                status: e.target.value as FarmStatus,
              }))
            }
            className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155]"
          >
            <option value="Hoạt động">Hoạt động</option>
            <option value="Không hoạt động">Không hoạt động</option>
          </select>
        </div>
      </div>

      {/* Map Picker Modal — rendered outside the form z-stack */}
      <MapPickerModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        onSelect={(address) => {
          setFormData((p) => ({ ...p, location: address }));
          setMapOpen(false);
        }}
        initialLocation={formData.location}
      />
    </div>
  );
}

// ===================== VIEW MODAL =====================
function ViewFarmModal({
  farm,
  open,
  onClose,
}: {
  farm: Farm;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-full max-w-lg z-50 p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-bold text-[#115e59]">
              {farm.name}
            </Dialog.Title>
            <Dialog.Close className="text-[#94a3b8] hover:text-[#62748e] text-2xl leading-none">
              &times;
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Chi tiết trang trại
          </Dialog.Description>

          <div className="space-y-2">
            {[
              { label: "Vị trí", value: farm.location },
              { label: "Diện tích", value: `${farm.area.toLocaleString()} m²` },
              { label: "Trạng thái", value: farm.status },
              { label: "Ngày tạo", value: farm.createdAt },
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

            {/* Plots summary */}
            <div className="py-2 border-b border-[#f1f5f9]">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-[#62748e]">Số khu đất</span>
                <span className="text-sm font-medium text-[#115e59]">
                  {farm.plots.length} khu
                </span>
              </div>

              {farm.plots.length > 0 && (
                <div className="mt-2 space-y-2">
                  {farm.plots.map((plot) => (
                    <div
                      key={plot.id}
                      className="flex items-center justify-between bg-[#f8fafc] rounded-lg px-3 py-2.5 border border-[#e2e8f0]"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-[#e0f2fe] rounded-md flex items-center justify-center shrink-0">
                          <Home className="w-3.5 h-3.5 text-[#0369a1]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#115e59] leading-tight">
                            {plot.name}
                          </p>
                          <p className="text-xs text-[#94a3b8] mt-0.5">
                            {plot.soilType} • {plot.area.toLocaleString()} m² •{" "}
                            {plot.plotCount} luống
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${plotStatusColor(plot.status)}`}
                      >
                        {plot.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Dialog.Close className="px-4 py-2 bg-[#f1f5f9] text-[#314158] rounded-lg hover:bg-[#e2e8f0] text-sm">
              Đóng
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ===================== CREATE MODAL =====================
function CreateFarmModal({
  open,
  onClose,
  onCreate,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (farm: Omit<Farm, "id" | "plots" | "createdAt">) => void;
  submitting: boolean;
}) {
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    status: "Hoạt động" as FarmStatus,
    area: "",
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        name: "",
        location: "",
        status: "Hoạt động",
        area: "",
      });
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      ...formData,
      area: parseInt(formData.area) || 0,
      image: "",
      description: "",
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-full max-w-lg z-50 max-h-[92vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-bold text-[#115e59]">
                Thêm trang trại mới
              </Dialog.Title>
              <Dialog.Close className="text-[#94a3b8] hover:text-[#62748e] text-2xl leading-none">
                &times;
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Form thêm trang trại mới
            </Dialog.Description>
            <FarmFormFields formData={formData} setFormData={setFormData} />
            <div className="flex justify-end gap-3 mt-6">
              <Dialog.Close className="px-4 py-2 text-sm text-[#62748e] hover:text-[#334155]">
                Hủy
              </Dialog.Close>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-[#009689] text-white text-sm rounded-lg hover:bg-[#007f75] flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Tạo
                trang trại
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ===================== EDIT MODAL =====================
function EditFarmModal({
  farm,
  open,
  onClose,
  onUpdate,
  submitting,
}: {
  farm: Farm;
  open: boolean;
  onClose: () => void;
  onUpdate: (farm: Farm) => void;
  submitting: boolean;
}) {
  const [formData, setFormData] = useState({
    name: farm.name,
    location: farm.location,
    status: farm.status,
    area: farm.area.toString(),
  });

  // Sync when farm changes (e.g. different farm opened)
  useEffect(() => {
    setFormData({
      name: farm.name,
      location: farm.location,
      status: farm.status,
      area: farm.area.toString(),
    });
  }, [farm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ ...farm, ...formData, area: parseInt(formData.area) || 0 });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-full max-w-lg z-50 max-h-[92vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-bold text-[#115e59]">
                Chỉnh sửa trang trại
              </Dialog.Title>
              <Dialog.Close className="text-[#94a3b8] hover:text-[#62748e] text-2xl leading-none">
                &times;
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Form chỉnh sửa thông tin trang trại
            </Dialog.Description>
            <FarmFormFields formData={formData} setFormData={setFormData} />
            <div className="flex justify-end gap-3 mt-6">
              <Dialog.Close className="px-4 py-2 text-sm text-[#62748e] hover:text-[#334155]">
                Hủy
              </Dialog.Close>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-[#009689] text-white text-sm rounded-lg hover:bg-[#007f75] flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Lưu
                thay đổi
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
