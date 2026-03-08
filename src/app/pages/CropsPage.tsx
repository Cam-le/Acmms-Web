import { useState } from "react";
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Sprout,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  X,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Select from "@radix-ui/react-select";
import {
  Crop,
  CropSoilType as SoilType,
  CropStatus,
  cropSoilTypes as soilTypes,
  mockCrops,
} from "../../data/mockData";

// Mock data
const getSoilBadgeColor = (soilType: SoilType) => {
  return "bg-[#cbfbf1] text-[#00786f]";
};

const getStatusBadgeColor = (status: CropStatus) => {
  return status === "Đang sử dụng"
    ? "bg-[#dcfce7] text-[#008236]"
    : "bg-[#fee2e2] text-[#991b1b]";
};

export function CropsPage() {
  const [crops, setCrops] = useState<Crop[]>(mockCrops);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"growthPeriod" | "status" | null>(
    null,
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [cropToDelete, setCropToDelete] = useState<Crop | null>(null);

  // Handle sorting
  const handleSort = (field: "growthPeriod" | "status") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filtered and sorted crops
  const filteredCrops = crops
    .filter((crop) => {
      const matchesSearch =
        crop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        crop.scientificName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      if (!sortField) return 0;

      if (sortField === "growthPeriod") {
        const comparison = a.growthPeriod - b.growthPeriod;
        return sortDirection === "asc" ? comparison : -comparison;
      } else if (sortField === "status") {
        const statusOrder = { "Đang sử dụng": 1, "Không sử dụng": 2 };
        const comparison = statusOrder[a.status] - statusOrder[b.status];
        return sortDirection === "asc" ? comparison : -comparison;
      }
      return 0;
    });

  // View crop
  const handleView = (crop: Crop) => {
    setSelectedCrop(crop);
    setViewModalOpen(true);
  };

  // Edit crop
  const handleEdit = (crop: Crop) => {
    setSelectedCrop(crop);
    setEditModalOpen(true);
  };

  // Delete crop
  const handleDelete = (crop: Crop) => {
    setCropToDelete(crop);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (cropToDelete) {
      setCrops(crops.filter((c) => c.id !== cropToDelete.id));
      setCropToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  // Create crop
  const handleCreate = (crop: Omit<Crop, "id">) => {
    const newCrop = { ...crop, id: Date.now().toString() };
    setCrops([...crops, newCrop]);
    setCreateModalOpen(false);
  };

  // Update crop
  const handleUpdate = (updatedCrop: Crop) => {
    setCrops(crops.map((c) => (c.id === updatedCrop.id ? updatedCrop : c)));
    setEditModalOpen(false);
    setSelectedCrop(null);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[#115e59] text-2xl">Quản Lý cây trồng</h1>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="bg-[#009689] text-white px-4 py-2 rounded-lg hover:bg-[#007f75] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Thêm Cây
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#90A1B9]" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#62748e] uppercase tracking-wider">
                Tên cây
              </th>
              <th
                onClick={() => handleSort("growthPeriod")}
                className="px-6 py-4 text-left text-xs font-bold text-[#62748e] uppercase tracking-wider cursor-pointer hover:bg-[#f1f5f9] transition-colors select-none"
              >
                <div className="flex items-center gap-2">
                  <span>Thời kỳ sinh trưởng</span>
                  {sortField === "growthPeriod" ? (
                    sortDirection === "asc" ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#90A1B9]" />
                  )}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#62748e] uppercase tracking-wider">
                Đất tương thích
              </th>
              <th
                onClick={() => handleSort("status")}
                className="px-6 py-4 text-left text-xs font-bold text-[#62748e] uppercase tracking-wider cursor-pointer hover:bg-[#f1f5f9] transition-colors select-none"
              >
                <div className="flex items-center gap-2">
                  <span>Trạng thái</span>
                  {sortField === "status" ? (
                    sortDirection === "asc" ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#90A1B9]" />
                  )}
                </div>
              </th>
              <th className="px-6 py-4 text-center text-xs font-bold text-[#62748e] uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {filteredCrops.map((crop) => (
              <tr
                key={crop.id}
                className="hover:bg-[#f8fafc] transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#e0f2f1] flex items-center justify-center overflow-hidden">
                      {crop.image ? (
                        <img
                          src={crop.image}
                          alt={crop.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Sprout className="w-5 h-5 text-[#009689]" />
                      )}
                    </div>
                    <span className="text-[#0f766e] text-sm">{crop.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[#009689] text-sm">
                    {crop.growthPeriod} Ngày
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs ${getSoilBadgeColor(
                      crop.soilType,
                    )}`}
                  >
                    {crop.soilType}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs ${getStatusBadgeColor(
                      crop.status,
                    )}`}
                  >
                    {crop.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleView(crop)}
                      className="p-2 hover:bg-[#e0f2f1] rounded-lg transition-colors"
                      title="Xem"
                    >
                      <Eye className="w-4 h-4 text-[#009689]" />
                    </button>
                    <button
                      onClick={() => handleEdit(crop)}
                      className="p-2 hover:bg-[#dbeafe] rounded-lg transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit className="w-4 h-4 text-[#00A6F4]" />
                    </button>
                    <button
                      onClick={() => handleDelete(crop)}
                      className="p-2 hover:bg-[#fee2e2] rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4 text-[#FB2C36]" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCrops.length === 0 && (
          <div className="flex flex-col items-center py-16 text-[#62748e] gap-3">
            <Sprout className="w-12 h-12 text-[#cad5e2]" />
            <p>
              {searchQuery
                ? "Không tìm thấy cây trồng phù hợp"
                : "Chưa có cây trồng nào"}
            </p>
          </div>
        )}
      </div>

      {/* View Modal */}
      {selectedCrop && (
        <ViewCropModal
          crop={selectedCrop}
          open={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedCrop(null);
          }}
        />
      )}

      {/* Create Modal */}
      <CreateCropModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreate}
      />

      {/* Edit Modal */}
      {selectedCrop && (
        <EditCropModal
          crop={selectedCrop}
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedCrop(null);
          }}
          onUpdate={handleUpdate}
        />
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
              Xác nhận xóa cây trồng
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-slate-600 mb-6">
              Bạn có chắc chắn muốn xóa{" "}
              <span className="font-semibold">{cropToDelete?.name}</span>? Hành
              động này không thể hoàn tác.
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
                  Xóa cây trồng
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

// View Modal Component
function ViewCropModal({
  crop,
  open,
  onClose,
}: {
  crop: Crop;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-50">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <Sprout className="w-6 h-6 text-[#009689]" />
                <Dialog.Title className="text-xl font-bold text-[#115e59]">
                  {crop.name}
                </Dialog.Title>
              </div>
              <Dialog.Close className="text-[#62748e] hover:text-[#115e59] transition-colors">
                <span className="text-2xl">&times;</span>
              </Dialog.Close>
            </div>

            <Dialog.Description className="sr-only">
              Xem chi tiết thông tin cây trồng {crop.name}
            </Dialog.Description>

            {/* Content */}
            <div className="space-y-6">
              {/* Details Section */}
              <div>
                <h3 className="text-sm font-bold text-[#62748e] uppercase mb-4">
                  📋 Thông tin chi tiết
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex">
                    <span className="text-[#62748e] w-48">• Tên cây:</span>
                    <span className="text-[#115e59] font-medium">
                      {crop.name}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="text-[#62748e] w-48">• Tên khoa học:</span>
                    <span className="text-[#115e59] italic">
                      {crop.scientificName}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="text-[#62748e] w-48">
                      • Loại đất tương thích:
                    </span>
                    <span className="text-[#115e59]">{crop.soilType}</span>
                  </div>
                  <div className="flex">
                    <span className="text-[#62748e] w-48">
                      • Thời kỳ sinh trưởng:
                    </span>
                    <span className="text-[#115e59]">
                      {crop.growthPeriod} ngày
                    </span>
                  </div>
                  <div className="flex">
                    <span className="text-[#62748e] w-48">
                      • Khoảng cách giữa các cây:
                    </span>
                    <span className="text-[#115e59]">
                      {crop.plantDistance.row}x{crop.plantDistance.column} cm
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-[#62748e] w-48">• Trạng thái:</span>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs ${getStatusBadgeColor(
                        crop.status,
                      )}`}
                    >
                      {crop.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Image Section */}
              {crop.image && (
                <div>
                  <h3 className="text-sm font-bold text-[#62748e] uppercase mb-4">
                    🖼️ Hình ảnh
                  </h3>
                  <div className="rounded-lg overflow-hidden">
                    <img
                      src={crop.image}
                      alt={crop.name}
                      className="w-full h-64 object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Description Section */}
              {crop.description && (
                <div>
                  <h3 className="text-sm font-bold text-[#62748e] uppercase mb-4">
                    📝 Mô tả / Ghi chú
                  </h3>
                  <p className="text-sm text-[#115e59] leading-relaxed">
                    {crop.description}
                  </p>
                </div>
              )}
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

// Create Modal Component
function CreateCropModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (crop: Omit<Crop, "id">) => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    scientificName: "",
    growthPeriod: "",
    soilType: "" as SoilType,
    status: "Đang sử dụng" as CropStatus,
    image: "",
    description: "",
    plantDistanceRow: "",
    plantDistanceColumn: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      name: formData.name,
      scientificName: formData.scientificName,
      growthPeriod: parseInt(formData.growthPeriod),
      soilType: formData.soilType,
      status: formData.status,
      image: formData.image,
      description: formData.description,
      plantDistance: {
        row: parseInt(formData.plantDistanceRow),
        column: parseInt(formData.plantDistanceColumn),
      },
    });
    // Reset form
    setFormData({
      name: "",
      scientificName: "",
      growthPeriod: "",
      soilType: "" as SoilType,
      status: "Đang sử dụng",
      image: "",
      description: "",
      plantDistanceRow: "",
      plantDistanceColumn: "",
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
              <div className="flex items-center gap-3">
                <Sprout className="w-6 h-6 text-[#009689]" />
                <Dialog.Title className="text-xl font-bold text-[#115e59]">
                  Thêm Giống Cây Mới
                </Dialog.Title>
              </div>
              <Dialog.Close className="text-[#62748e] hover:text-[#115e59] transition-colors">
                <span className="text-2xl">&times;</span>
              </Dialog.Close>
            </div>

            <Dialog.Description className="sr-only">
              Form thêm giống cây trồng mới vào hệ thống
            </Dialog.Description>

            {/* Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Crop Name */}
                <div>
                  <label className="block text-sm font-medium text-[#115e59] mb-2">
                    Tên cây <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Lúa 0838"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  />
                </div>

                {/* Growth Period */}
                <div>
                  <label className="block text-sm font-medium text-[#115e59] mb-2">
                    Thời gian sinh trưởng (ngày){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="60"
                    value={formData.growthPeriod}
                    onChange={(e) =>
                      setFormData({ ...formData, growthPeriod: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  />
                </div>
              </div>

              {/* Scientific Name */}
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Tên khoa học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Solanum lycopersicum"
                  value={formData.scientificName}
                  onChange={(e) =>
                    setFormData({ ...formData, scientificName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>

              {/* Soil Type */}
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Loại đất tương thích <span className="text-red-500">*</span>
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
                  <option value="">Chọn loại đất</option>
                  {soilTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Trạng thái
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as CropStatus,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                >
                  <option value="Đang sử dụng">Đang sử dụng</option>
                  <option value="Không sử dụng">Không sử dụng</option>
                </select>
              </div>

              {/* Plant Distance */}
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Khoảng cách giữa các cây{" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    required
                    placeholder="10"
                    value={formData.plantDistanceRow}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        plantDistanceRow: e.target.value,
                      })
                    }
                    className="w-24 px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  />
                  <span className="text-[#62748e]">x</span>
                  <input
                    type="number"
                    required
                    placeholder="15"
                    value={formData.plantDistanceColumn}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        plantDistanceColumn: e.target.value,
                      })
                    }
                    className="w-24 px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  />
                  <span className="text-[#62748e]">cm</span>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Hình ảnh
                </label>
                <div className="border-2 border-dashed border-[#cad5e2] rounded-lg p-6 text-center">
                  <ImageIcon className="w-8 h-8 text-[#90A1B9] mx-auto mb-2" />
                  <p className="text-sm text-[#62748e] mb-2">
                    Nhấn để tải ảnh lên
                  </p>
                  <p className="text-xs text-[#90A1B9]">PNG, JPG tối đa 5MB</p>
                  <input
                    type="text"
                    placeholder="URL hình ảnh (tạm thời)"
                    value={formData.image}
                    onChange={(e) =>
                      setFormData({ ...formData, image: e.target.value })
                    }
                    className="w-full mt-4 px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Mô tả / Ghi chú
                </label>
                <textarea
                  rows={4}
                  placeholder="Nhập thêm thông tin chi tiết về giống cây..."
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
                Tạo Cây Trồng
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Edit Modal Component
function EditCropModal({
  crop,
  open,
  onClose,
  onUpdate,
}: {
  crop: Crop;
  open: boolean;
  onClose: () => void;
  onUpdate: (crop: Crop) => void;
}) {
  const [formData, setFormData] = useState({
    name: crop.name,
    scientificName: crop.scientificName,
    growthPeriod: crop.growthPeriod.toString(),
    soilType: crop.soilType,
    status: crop.status,
    image: crop.image,
    description: crop.description,
    plantDistanceRow: crop.plantDistance.row.toString(),
    plantDistanceColumn: crop.plantDistance.column.toString(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      ...crop,
      name: formData.name,
      scientificName: formData.scientificName,
      growthPeriod: parseInt(formData.growthPeriod),
      soilType: formData.soilType,
      status: formData.status,
      image: formData.image,
      description: formData.description,
      plantDistance: {
        row: parseInt(formData.plantDistanceRow),
        column: parseInt(formData.plantDistanceColumn),
      },
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
              <div className="flex items-center gap-3">
                <Sprout className="w-6 h-6 text-[#009689]" />
                <Dialog.Title className="text-xl font-bold text-[#115e59]">
                  Chỉnh Sửa Cây Trồng
                </Dialog.Title>
              </div>
              <Dialog.Close className="text-[#62748e] hover:text-[#115e59] transition-colors">
                <span className="text-2xl">&times;</span>
              </Dialog.Close>
            </div>

            <Dialog.Description className="sr-only">
              Form chỉnh sửa thông tin cây trồng {crop.name}
            </Dialog.Description>

            {/* Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Crop Name */}
                <div>
                  <label className="block text-sm font-medium text-[#115e59] mb-2">
                    Tên cây <span className="text-red-500">*</span>
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

                {/* Growth Period */}
                <div>
                  <label className="block text-sm font-medium text-[#115e59] mb-2">
                    Thời gian sinh trưởng (ngày){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.growthPeriod}
                    onChange={(e) =>
                      setFormData({ ...formData, growthPeriod: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  />
                </div>
              </div>

              {/* Scientific Name */}
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Tên khoa học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.scientificName}
                  onChange={(e) =>
                    setFormData({ ...formData, scientificName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>

              {/* Soil Type */}
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Loại đất tương thích <span className="text-red-500">*</span>
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
                  {soilTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Trạng thái
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as CropStatus,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                >
                  <option value="Đang sử dụng">Đang sử dụng</option>
                  <option value="Không sử dụng">Không sử dụng</option>
                </select>
              </div>

              {/* Plant Distance */}
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Khoảng cách giữa các cây{" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    required
                    value={formData.plantDistanceRow}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        plantDistanceRow: e.target.value,
                      })
                    }
                    className="w-24 px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  />
                  <span className="text-[#62748e]">x</span>
                  <input
                    type="number"
                    required
                    value={formData.plantDistanceColumn}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        plantDistanceColumn: e.target.value,
                      })
                    }
                    className="w-24 px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  />
                  <span className="text-[#62748e]">cm</span>
                </div>
              </div>

              {/* Image Preview and Update */}
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Hình ảnh
                </label>
                {formData.image && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}
                <div className="border-2 border-dashed border-[#cad5e2] rounded-lg p-6 text-center">
                  <ImageIcon className="w-8 h-8 text-[#90A1B9] mx-auto mb-2" />
                  <p className="text-sm text-[#62748e] mb-2">
                    Nhấn để tải ảnh lên
                  </p>
                  <p className="text-xs text-[#90A1B9]">PNG, JPG tối đa 5MB</p>
                  <input
                    type="text"
                    placeholder="URL hình ảnh (tạm thời)"
                    value={formData.image}
                    onChange={(e) =>
                      setFormData({ ...formData, image: e.target.value })
                    }
                    className="w-full mt-4 px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm"
                  />
                </div>
              </div>

              {/* Description */}
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
                Cập nhật
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
