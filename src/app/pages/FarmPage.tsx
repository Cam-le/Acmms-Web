import { useState } from "react";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  MapPin,
  ChevronDown,
  ChevronUp,
  Home,
  Globe,
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

// Mock data
const getStatusBadgeColor = (status: FarmStatus) => {
  return status === "Hoạt động"
    ? "bg-[#dcfce7] text-[#008236]"
    : "bg-[#fee2e2] text-[#991b1b]";
};

export function FarmPage() {
  const [farms, setFarms] = useState<Farm[]>(mockFarms);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addPlotModalOpen, setAddPlotModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [farmToDelete, setFarmToDelete] = useState<Farm | null>(null);

  // View farm
  const handleView = (farm: Farm) => {
    setSelectedFarm(farm);
    setViewModalOpen(true);
  };

  // Edit farm
  const handleEdit = (farm: Farm) => {
    setSelectedFarm(farm);
    setEditModalOpen(true);
  };

  // Delete farm
  const handleDelete = (farm: Farm) => {
    setFarmToDelete(farm);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (farmToDelete) {
      setFarms(farms.filter((f) => f.id !== farmToDelete.id));
      setFarmToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  // Create farm
  const handleCreate = (farm: Omit<Farm, "id" | "plots" | "createdAt">) => {
    const newFarm: Farm = {
      ...farm,
      id: Date.now().toString(),
      plots: [],
      createdAt: new Date().toLocaleDateString("en-GB"),
    };
    setFarms([...farms, newFarm]);
    setCreateModalOpen(false);
  };

  // Update farm
  const handleUpdate = (updatedFarm: Farm) => {
    setFarms(farms.map((f) => (f.id === updatedFarm.id ? updatedFarm : f)));
    setEditModalOpen(false);
    setSelectedFarm(null);
  };

  // Add plot to farm
  const handleAddPlot = (farmId: string, plot: Omit<Plot, "id">) => {
    setFarms(
      farms.map((f) =>
        f.id === farmId
          ? {
              ...f,
              plots: [...f.plots, { ...plot, id: Date.now().toString() }],
            }
          : f,
      ),
    );
    setAddPlotModalOpen(false);
    setSelectedFarm(null);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[#115e59] text-2xl font-semibold mb-1">
            Quản lý trang trại
          </h1>
          <p className="text-[#45556c] text-sm">
            Quản lý vị trí và hoạt động trang trại của bạn
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="bg-[#009689] text-white px-4 py-2 rounded-lg hover:bg-[#007f75] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Thêm trang trại
        </button>
      </div>

      {/* Farm Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {farms.length === 0 ? (
          <div className="col-span-2 flex flex-col items-center py-16 text-[#62748e] gap-3 bg-white rounded-lg border border-[#e2e8f0]">
            <Home className="w-12 h-12 text-[#cad5e2]" />
            <p>Chưa có trang trại nào</p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="text-[#009689] hover:underline text-sm font-medium"
            >
              + Thêm trang trại đầu tiên
            </button>
          </div>
        ) : (
          farms.map((farm) => (
            <FarmCard
              key={farm.id}
              farm={farm}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={(id) => {
                const farm = farms.find((f) => f.id === id);
                if (farm) handleDelete(farm);
              }}
              onAddPlot={(farm) => {
                setSelectedFarm(farm);
                setAddPlotModalOpen(true);
              }}
            />
          ))
        )}
      </div>

      {/* Modals */}
      {selectedFarm && (
        <ViewFarmModal
          farm={selectedFarm}
          open={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedFarm(null);
          }}
          onAddPlot={() => {
            setViewModalOpen(false);
            setAddPlotModalOpen(true);
          }}
        />
      )}

      <CreateFarmModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreate}
      />

      {selectedFarm && (
        <>
          <EditFarmModal
            farm={selectedFarm}
            open={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedFarm(null);
            }}
            onUpdate={handleUpdate}
          />

          <AddPlotModal
            farmId={selectedFarm.id}
            farmName={selectedFarm.name}
            open={addPlotModalOpen}
            onClose={() => {
              setAddPlotModalOpen(false);
              setSelectedFarm(null);
            }}
            onAdd={handleAddPlot}
          />
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog.Root
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <AlertDialog.Title className="text-lg font-semibold text-slate-900 mb-2">
              Xác nhận xóa trang trại
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-slate-600 mb-6">
              Bạn có chắc chắn muốn xóa trang trại{" "}
              <span className="font-semibold">{farmToDelete?.name}</span>? Tất
              cả dữ liệu khu đất sẽ bị xóa và không thể hoàn tác.
            </AlertDialog.Description>
            <div className="flex gap-3 justify-end">
              <AlertDialog.Cancel asChild>
                <button className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
                  Hủy bỏ
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Xóa trang trại
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

// Farm Card Component
function FarmCard({
  farm,
  onView,
  onEdit,
  onDelete,
  onAddPlot,
}: {
  farm: Farm;
  onView: (farm: Farm) => void;
  onEdit: (farm: Farm) => void;
  onDelete: (id: string) => void;
  onAddPlot: (farm: Farm) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate stats
  const activePlots = farm.plots.filter((p) => p.status === "Hoạt động").length;
  const totalPlots = farm.plots.length;
  const totalPlotArea = farm.plots.reduce((sum, p) => sum + p.area, 0);
  const utilizationPercent =
    farm.area > 0 ? Math.round((totalPlotArea / farm.area) * 100) : 0;
  const totalPlotCount = farm.plots.reduce((sum, p) => sum + p.plotCount, 0);

  return (
    <div className="bg-[#009689] rounded-lg overflow-hidden shadow-md">
      {/* Card Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Home className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-medium text-lg">{farm.name}</h3>
            <div className="flex items-center gap-1 text-white/80 text-sm">
              <MapPin className="w-3.5 h-3.5" />
              <span>{farm.location}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded text-xs font-medium ${getStatusBadgeColor(
              farm.status,
            )}`}
          >
            {farm.status}
          </span>
          <button
            onClick={() => onView(farm)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Xem"
          >
            <Eye className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => onEdit(farm)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Chỉnh sửa"
          >
            <Edit className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => onDelete(farm.id)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Xóa"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="bg-white p-4">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#009689]">
              {activePlots}/{totalPlots}
            </div>
            <div className="text-xs text-[#62748e]">Khu hoạt động</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#009689]">
              {totalPlotCount}
            </div>
            <div className="text-xs text-[#62748e]">Tổng số luống</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#009689]">
              {farm.status === "Hoạt động" ? 4 : 0}
            </div>
            <div className="text-xs text-[#62748e]">Mùa hoạt động</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#009689]">
              {utilizationPercent}%
            </div>
            <div className="text-xs text-[#62748e]">Diện tích đã dùng</div>
          </div>
        </div>

        {/* Collapsible Plot List */}
        {farm.plots.length > 0 && (
          <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
            <Collapsible.Trigger className="w-full flex items-center justify-center gap-2 py-2 text-[#009689] hover:bg-[#f8fafc] rounded-lg transition-colors">
              <span className="text-sm font-medium">
                {isOpen ? "Thu gọn" : "Xem Khu đất"}
              </span>
              {isOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Collapsible.Trigger>

            <Collapsible.Content className="mt-3 space-y-2">
              {farm.plots.map((plot) => (
                <div
                  key={plot.id}
                  className="flex items-center justify-between p-3 bg-[#f8fafc] rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-[#115e59] text-sm">
                      {plot.name}
                    </div>
                    <div className="text-xs text-[#62748e]">
                      {plot.area}m² • {plot.soilType}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[#009689]">
                      {plot.plotCount} Luống
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${getStatusBadgeColor(
                        plot.status,
                      )}`}
                    >
                      {plot.status}
                    </span>
                  </div>
                </div>
              ))}
            </Collapsible.Content>
          </Collapsible.Root>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-xs text-[#62748e]">
          <span>Thành lập {farm.createdAt}</span>
          {farm.plots.length > 0 && isOpen && (
            <button
              onClick={() => onAddPlot(farm)}
              className="text-[#009689] hover:underline font-medium"
            >
              + Thêm khu đất
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// View Farm Modal
function ViewFarmModal({
  farm,
  open,
  onClose,
  onAddPlot,
}: {
  farm: Farm;
  open: boolean;
  onClose: () => void;
  onAddPlot: () => void;
}) {
  const totalPlotArea = farm.plots.reduce((sum, p) => sum + p.area, 0);
  const totalPlotCount = farm.plots.reduce((sum, p) => sum + p.plotCount, 0);
  const activePlots = farm.plots.filter((p) => p.status === "Hoạt động").length;
  const inactivePlots = farm.plots.length - activePlots;

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto z-50">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <Dialog.Title className="text-xl font-bold text-[#115e59] mb-1">
                  {farm.name}
                </Dialog.Title>
                <span
                  className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${getStatusBadgeColor(
                    farm.status,
                  )}`}
                >
                  {farm.status}
                </span>
              </div>
              <Dialog.Close className="text-[#62748e] hover:text-[#115e59] transition-colors">
                <span className="text-2xl">&times;</span>
              </Dialog.Close>
            </div>

            <Dialog.Description className="sr-only">
              Xem chi tiết thông tin trang trại {farm.name}
            </Dialog.Description>

            {/* Content */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-[#62748e] mb-1">Địa điểm</div>
                  <div className="flex items-center gap-2 text-[#115e59]">
                    <MapPin className="w-4 h-4" />
                    <span>{farm.location}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[#62748e] mb-1">Ngày lập</div>
                  <div className="text-[#115e59]">{farm.createdAt}</div>
                </div>
              </div>

              {/* Stats */}
              <div>
                <h3 className="text-sm font-bold text-[#62748e] uppercase mb-3">
                  ⚡ Tổng quan
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-[#f8fafc] p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-[#009689]">
                      {farm.plots.length}
                    </div>
                    <div className="text-xs text-[#62748e]">Tổng khu đất</div>
                  </div>
                  <div className="bg-[#f8fafc] p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-[#009689]">
                      {totalPlotArea}m²
                    </div>
                    <div className="text-xs text-[#62748e]">Tổng diện tích</div>
                  </div>
                  <div className="bg-[#f8fafc] p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-[#009689]">
                      {activePlots}
                    </div>
                    <div className="text-xs text-[#62748e]">Khu hoạt động</div>
                  </div>
                  <div className="bg-[#f8fafc] p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-[#009689]">
                      {inactivePlots}
                    </div>
                    <div className="text-xs text-[#62748e]">
                      Khu không hoạt động
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {farm.description && (
                <div>
                  <h3 className="text-sm font-bold text-[#62748e] uppercase mb-3">
                    📝 Mô tả
                  </h3>
                  <p className="text-sm text-[#115e59] leading-relaxed">
                    {farm.description}
                  </p>
                </div>
              )}

              {/* Plot List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-[#62748e] uppercase">
                    🌾 Danh sách khu đất
                  </h3>
                  <button
                    onClick={onAddPlot}
                    className="text-[#009689] text-sm hover:underline font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm khu đất
                  </button>
                </div>

                {farm.plots.length > 0 ? (
                  <div className="space-y-2">
                    {farm.plots.map((plot) => (
                      <div
                        key={plot.id}
                        className="flex items-center justify-between p-4 bg-[#f8fafc] rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-[#115e59] mb-1">
                            {plot.name}
                          </div>
                          <div className="text-sm text-[#62748e]">
                            {plot.area}m² • {plot.soilType} • {plot.plotCount}{" "}
                            luống
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-medium ${getStatusBadgeColor(
                            plot.status,
                          )}`}
                        >
                          {plot.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#62748e] text-sm">
                    Chưa có khu đất nào
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-[#f1f5f9] text-[#314158] rounded-lg hover:bg-[#e2e8f0] transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Create Farm Modal
function CreateFarmModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (farm: Omit<Farm, "id" | "plots" | "createdAt">) => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    status: "Hoạt động" as FarmStatus,
    area: "",
    description: "",
    image: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      name: formData.name,
      location: formData.location,
      status: formData.status,
      area: parseInt(formData.area),
      description: formData.description,
      image: formData.image,
    });
    // Reset form
    setFormData({
      name: "",
      location: "",
      status: "Hoạt động",
      area: "",
      description: "",
      image: "",
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-50">
          <form onSubmit={handleSubmit} className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <Dialog.Title className="text-xl font-bold text-[#115e59]">
                Tạo trang trại mới
              </Dialog.Title>
              <Dialog.Close className="text-[#62748e] hover:text-[#115e59] transition-colors">
                <span className="text-2xl">&times;</span>
              </Dialog.Close>
            </div>

            <Dialog.Description className="text-sm text-[#62748e] mb-6">
              Nhập thông tin chi tiết cho trang trại mới của bạn.
            </Dialog.Description>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Tên trang trại <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Trang trại Thung lũng Xanh"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Địa điểm <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#90A1B9]" />
                  <input
                    type="text"
                    required
                    placeholder="Nhập địa chỉ"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <Globe className="w-5 h-5 text-[#009689]" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#115e59] mb-2">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as FarmStatus,
                      })
                    }
                    className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  >
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Không hoạt động">Không hoạt động</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#115e59] mb-2">
                    Diện Tích (m²) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="5000"
                    value={formData.area}
                    onChange={(e) =>
                      setFormData({ ...formData, area: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Mô tả / Ghi chú
                </label>
                <textarea
                  rows={4}
                  placeholder="Nhập mô tả về trang trại..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Hình ảnh trang trại
                </label>
                <div className="border-2 border-dashed border-[#cad5e2] rounded-lg p-6 text-center">
                  <div className="text-4xl mb-2">🖼️</div>
                  <p className="text-sm text-[#62748e] mb-2">
                    Nhấn để tải ảnh lên
                  </p>
                  <input
                    type="text"
                    placeholder="URL hình ảnh"
                    value={formData.image}
                    onChange={(e) =>
                      setFormData({ ...formData, image: e.target.value })
                    }
                    className="w-full mt-4 px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-[#f1f5f9] text-[#314158] rounded-lg hover:bg-[#e2e8f0] transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors"
              >
                Tạo trang trại
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Edit Farm Modal (similar to Create, but pre-filled)
function EditFarmModal({
  farm,
  open,
  onClose,
  onUpdate,
}: {
  farm: Farm;
  open: boolean;
  onClose: () => void;
  onUpdate: (farm: Farm) => void;
}) {
  const [formData, setFormData] = useState({
    name: farm.name,
    location: farm.location,
    status: farm.status,
    area: farm.area.toString(),
    description: farm.description,
    image: farm.image,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      ...farm,
      name: formData.name,
      location: formData.location,
      status: formData.status,
      area: parseInt(formData.area),
      description: formData.description,
      image: formData.image,
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-50">
          <form onSubmit={handleSubmit} className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <Dialog.Title className="text-xl font-bold text-[#115e59]">
                Chỉnh sửa thông tin trang trại
              </Dialog.Title>
              <Dialog.Close className="text-[#62748e] hover:text-[#115e59] transition-colors">
                <span className="text-2xl">&times;</span>
              </Dialog.Close>
            </div>

            <Dialog.Description className="text-sm text-[#62748e] mb-6">
              Cập nhật thông tin cho trang trại {farm.name}.
            </Dialog.Description>

            {/* Form - Same fields as Create */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Tên trang trại <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Địa điểm <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#90A1B9]" />
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#115e59] mb-2">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as FarmStatus,
                      })
                    }
                    className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  >
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Không hoạt động">Không hoạt động</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#115e59] mb-2">
                    Tổng diện tích (m²) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.area}
                    onChange={(e) =>
                      setFormData({ ...formData, area: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Mô tả / Ghi chú
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-[#f1f5f9] text-[#314158] rounded-lg hover:bg-[#e2e8f0] transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors"
              >
                Lưu thay đổi
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Add Plot Modal
function AddPlotModal({
  farmId,
  farmName,
  open,
  onClose,
  onAdd,
}: {
  farmId: string;
  farmName: string;
  open: boolean;
  onClose: () => void;
  onAdd: (farmId: string, plot: Omit<Plot, "id">) => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    area: "",
    soilType: "" as SoilType,
    plotCount: "",
    status: "Hoạt động" as FarmStatus,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(farmId, {
      name: formData.name,
      area: parseInt(formData.area),
      soilType: formData.soilType,
      plotCount: parseInt(formData.plotCount),
      status: formData.status,
    });
    // Reset form
    setFormData({
      name: "",
      area: "",
      soilType: "" as SoilType,
      plotCount: "",
      status: "Hoạt động",
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto z-50">
          <form onSubmit={handleSubmit} className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <Dialog.Title className="text-xl font-bold text-[#115e59] mb-1">
                  Thêm Khu Đất Mới vào {farmName}
                </Dialog.Title>
              </div>
              <Dialog.Close className="text-[#62748e] hover:text-[#115e59] transition-colors">
                <span className="text-2xl">&times;</span>
              </Dialog.Close>
            </div>

            <Dialog.Description className="sr-only">
              Form thêm khu đất mới vào trang trại {farmName}
            </Dialog.Description>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Tên Khu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Khu Đất phía Đông"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Diện tích (m²) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  placeholder="5000"
                  value={formData.area}
                  onChange={(e) =>
                    setFormData({ ...formData, area: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Loại đất <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.soilType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      soilType: e.target.value as SoilType,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                >
                  <option value="">Chọn Loại đất</option>
                  {soilTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#115e59] mb-2">
                    Số lượng luống
                  </label>
                  <input
                    type="number"
                    placeholder="12"
                    value={formData.plotCount}
                    onChange={(e) =>
                      setFormData({ ...formData, plotCount: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#115e59] mb-2">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as FarmStatus,
                      })
                    }
                    className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  >
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Không hoạt động">Không hoạt động</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Ghi chú
                </label>
                <textarea
                  rows={3}
                  placeholder="Thêm ghi chú về khu đất..."
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-[#f1f5f9] text-[#314158] rounded-lg hover:bg-[#e2e8f0] transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors"
              >
                Tạo mới
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
