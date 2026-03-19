import { useState, useEffect } from "react";
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
  Loader2,
  WifiOff,
  TrendingUp,
  ChevronRight,
  Thermometer,
  Droplets,
  ClipboardList,
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
  CropGrowthStage,
  mockGrowthStagesByCropId,
} from "../../data/mockData";
import { api, CropResponse } from "../../api/client";

// Map API response → local Crop shape
function mapCrop(c: CropResponse): Crop {
  return {
    id: c.cropId,
    name: c.cropName,
    scientificName: c.cropScientificName ?? "",
    growthPeriod: c.cropDefaultGrowthDays ?? 0,
    soilType: (c.soilName as SoilType) ?? "Đất Thịt",
    status: c.cropStatus === "Active" ? "Đang sử dụng" : "Không sử dụng",
    image: "",
    description: "",
    plantDistance: { row: 0, column: 0 },
  };
}

const getSoilBadgeColor = (_: SoilType) => "bg-[#cbfbf1] text-[#00786f]";
const getStatusBadgeColor = (status: CropStatus) =>
  status === "Đang sử dụng"
    ? "bg-[#dcfce7] text-[#008236]"
    : "bg-[#fee2e2] text-[#991b1b]";

export function CropsPage() {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"growthPeriod" | "status" | null>(
    null,
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [growthTrackingModalOpen, setGrowthTrackingModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [cropToDelete, setCropToDelete] = useState<Crop | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCrops();
  }, []);

  const loadCrops = async () => {
    setLoading(true);
    try {
      const data = await api.getCrops();
      setCrops(data.map(mapCrop));
      setUsingMock(false);
    } catch {
      setCrops([...mockCrops]);
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: "growthPeriod" | "status") => {
    if (sortField === field)
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredCrops = crops
    .filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.scientificName.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      if (!sortField) return 0;
      if (sortField === "growthPeriod") {
        return sortDirection === "asc"
          ? a.growthPeriod - b.growthPeriod
          : b.growthPeriod - a.growthPeriod;
      }
      const order = { "Đang sử dụng": 1, "Không sử dụng": 2 };
      return sortDirection === "asc"
        ? order[a.status] - order[b.status]
        : order[b.status] - order[a.status];
    });

  const handleCreate = async (cropData: Omit<Crop, "id">) => {
    setSubmitting(true);
    try {
      if (usingMock) {
        setCrops((prev) => [
          ...prev,
          { ...cropData, id: Date.now().toString() },
        ]);
      } else {
        await api.createCrop({
          cropName: cropData.name,
          cropScientificName: cropData.scientificName,
          cropDefaultGrowthDays: cropData.growthPeriod,
          cropStatus:
            cropData.status === "Đang sử dụng" ? "Active" : "Inactive",
        });
        await loadCrops();
      }
      setCreateModalOpen(false);
    } catch (err) {
      alert(
        "Không thể tạo cây trồng: " +
          (err instanceof Error ? err.message : "Lỗi"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (updatedCrop: Crop) => {
    setSubmitting(true);
    try {
      if (usingMock) {
        setCrops((prev) =>
          prev.map((c) => (c.id === updatedCrop.id ? updatedCrop : c)),
        );
      } else {
        await api.updateCrop(updatedCrop.id, {
          cropName: updatedCrop.name,
          cropScientificName: updatedCrop.scientificName,
          cropDefaultGrowthDays: updatedCrop.growthPeriod,
          cropStatus:
            updatedCrop.status === "Đang sử dụng" ? "Active" : "Inactive",
        });
        await loadCrops();
      }
      setEditModalOpen(false);
      setSelectedCrop(null);
    } catch (err) {
      alert(
        "Không thể cập nhật: " + (err instanceof Error ? err.message : "Lỗi"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!cropToDelete) return;
    setSubmitting(true);
    try {
      if (!usingMock) await api.deleteCrop(cropToDelete.id);
      setCrops((prev) => prev.filter((c) => c.id !== cropToDelete.id));
      setDeleteDialogOpen(false);
      setCropToDelete(null);
    } catch (err) {
      alert("Không thể xóa: " + (err instanceof Error ? err.message : "Lỗi"));
    } finally {
      setSubmitting(false);
    }
  };

  const SortIcon = ({ field }: { field: "growthPeriod" | "status" }) => {
    if (sortField !== field)
      return <ArrowUpDown className="w-3.5 h-3.5 text-[#94a3b8]" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-[#009689]" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-[#009689]" />
    );
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#009689] rounded-[10px] flex items-center justify-center">
            <Sprout className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#115e59]">Cây Trồng</h1>
            <p className="text-sm text-[#62748e]">Quản lý giống cây trồng</p>
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
          <Plus className="w-4 h-4" /> Thêm cây trồng
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm cây trồng..."
          className="w-full pl-9 pr-4 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#009689]" />
          </div>
        ) : filteredCrops.length === 0 ? (
          <div className="text-center py-16 text-[#62748e]">
            Không tìm thấy cây trồng nào
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
              <tr>
                {/* Column order: Cây trồng → Tên khoa học → Loại đất → Chu kỳ → Trạng thái → Thao tác */}
                <th className="px-6 py-4 text-left text-xs font-bold text-[#62748e] uppercase tracking-wider">
                  Cây trồng
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#62748e] uppercase tracking-wider">
                  Tên khoa học
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#62748e] uppercase tracking-wider">
                  Loại đất
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#62748e] uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("growthPeriod")}
                    className="flex items-center gap-1 hover:text-[#009689]"
                  >
                    Chu kỳ <SortIcon field="growthPeriod" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#62748e] uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("status")}
                    className="flex items-center gap-1 hover:text-[#009689]"
                  >
                    Trạng thái <SortIcon field="status" />
                  </button>
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
                  {/* Cây trồng */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {crop.image ? (
                        <img
                          src={crop.image}
                          alt={crop.name}
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-[#f0fdf9] rounded-lg flex items-center justify-center shrink-0">
                          <ImageIcon className="w-5 h-5 text-[#009689]" />
                        </div>
                      )}
                      <span className="font-medium text-[#115e59] text-sm">
                        {crop.name}
                      </span>
                    </div>
                  </td>
                  {/* Tên khoa học */}
                  <td className="px-6 py-4 text-sm text-[#62748e] italic">
                    {crop.scientificName || "—"}
                  </td>
                  {/* Loại đất — whitespace-nowrap prevents wrapping */}
                  <td className="px-6 py-4">
                    {crop.soilType ? (
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getSoilBadgeColor(crop.soilType)}`}
                      >
                        {crop.soilType}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  {/* Chu kỳ */}
                  <td className="px-6 py-4 text-sm text-[#62748e] whitespace-nowrap">
                    {crop.growthPeriod > 0 ? `${crop.growthPeriod} ngày` : "—"}
                  </td>
                  {/* Trạng thái — whitespace-nowrap prevents wrapping */}
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadgeColor(crop.status)}`}
                    >
                      {crop.status}
                    </span>
                  </td>
                  {/* Thao tác */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedCrop(crop);
                          setViewModalOpen(true);
                        }}
                        className="p-1.5 text-[#62748e] hover:text-[#009689] hover:bg-[#f0fdf9] rounded transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCrop(crop);
                          setEditModalOpen(true);
                        }}
                        className="p-1.5 text-[#62748e] hover:text-[#009689] hover:bg-[#f0fdf9] rounded transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setCropToDelete(crop);
                          setDeleteDialogOpen(true);
                        }}
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

      {/* View Modal */}
      {selectedCrop && (
        <Dialog.Root
          open={viewModalOpen}
          onOpenChange={(o) => {
            setViewModalOpen(o);
            if (!o) setSelectedCrop(null);
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-full max-w-lg z-50 p-6">
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className="text-lg font-bold text-[#115e59]">
                  {selectedCrop.name}
                </Dialog.Title>
                <Dialog.Close className="text-[#94a3b8] hover:text-[#62748e]">
                  <X className="w-5 h-5" />
                </Dialog.Close>
              </div>
              <Dialog.Description className="sr-only">
                Chi tiết cây trồng
              </Dialog.Description>
              <div className="flex items-center gap-4 mb-4">
                {selectedCrop.image ? (
                  <img
                    src={selectedCrop.image}
                    alt={selectedCrop.name}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-[#f0fdf9] rounded-xl flex items-center justify-center">
                    <Sprout className="w-8 h-8 text-[#009689]" />
                  </div>
                )}
                <div>
                  <div className="italic text-sm text-[#62748e]">
                    {selectedCrop.scientificName || "—"}
                  </div>
                  <span
                    className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadgeColor(selectedCrop.status)}`}
                  >
                    {selectedCrop.status}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  {
                    label: "Chu kỳ sinh trưởng",
                    value:
                      selectedCrop.growthPeriod > 0
                        ? `${selectedCrop.growthPeriod} ngày`
                        : "—",
                  },
                  { label: "Loại đất", value: selectedCrop.soilType || "—" },
                  {
                    label: "Khoảng cách hàng",
                    value:
                      selectedCrop.plantDistance.row > 0
                        ? `${selectedCrop.plantDistance.row} cm`
                        : "—",
                  },
                  {
                    label: "Khoảng cách cột",
                    value:
                      selectedCrop.plantDistance.column > 0
                        ? `${selectedCrop.plantDistance.column} cm`
                        : "—",
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between py-2 border-b border-[#f1f5f9]"
                  >
                    <span className="text-sm text-[#62748e]">{label}</span>
                    <span className="text-sm font-medium text-[#115e59]">
                      {value}
                    </span>
                  </div>
                ))}
                {selectedCrop.description && (
                  <div className="pt-2">
                    <div className="text-xs text-[#62748e] mb-1">Mô tả</div>
                    <p className="text-sm text-[#334155]">
                      {selectedCrop.description}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-between items-center">
                <button
                  onClick={() => {
                    setViewModalOpen(false);
                    setGrowthTrackingModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#f0fdf9] text-[#009689] border border-[#009689] rounded-lg text-sm font-medium hover:bg-[#ccfbf1] transition-colors"
                >
                  <TrendingUp className="w-4 h-4" />
                  Theo dõi sinh trưởng
                </button>
                <Dialog.Close className="px-4 py-2 bg-[#f1f5f9] text-[#314158] rounded-lg text-sm hover:bg-[#e2e8f0]">
                  Đóng
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {/* Growth Tracking Modal */}
      {selectedCrop && (
        <GrowthTrackingModal
          crop={selectedCrop}
          open={growthTrackingModalOpen}
          onClose={() => {
            setGrowthTrackingModalOpen(false);
            setSelectedCrop(null);
          }}
          onBack={() => {
            setGrowthTrackingModalOpen(false);
            setViewModalOpen(true);
          }}
        />
      )}

      {/* Create Modal */}
      <CreateCropModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreate}
        submitting={submitting}
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
              Xóa cây trồng
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-[#62748e] mb-6">
              Bạn có chắc muốn xóa <strong>{cropToDelete?.name}</strong>? Hành
              động này không thể hoàn tác.
            </AlertDialog.Description>
            <div className="flex justify-end gap-3">
              <AlertDialog.Cancel className="px-4 py-2 text-sm text-[#62748e] hover:text-[#334155]">
                Hủy
              </AlertDialog.Cancel>
              <AlertDialog.Action
                onClick={handleDelete}
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

// ===================== GROWTH TRACKING MODAL =====================

function GrowthTrackingModal({
  crop,
  open,
  onClose,
  onBack,
}: {
  crop: Crop;
  open: boolean;
  onClose: () => void;
  onBack: () => void;
}) {
  const stages: CropGrowthStage[] = mockGrowthStagesByCropId[crop.id] ?? [];
  const [activeStageId, setActiveStageId] = useState<string | null>(
    stages[0]?.stageId ?? null,
  );
  const [activeTab, setActiveTab] = useState<"overview" | "tasks">("overview");

  const activeStage = stages.find((s) => s.stageId === activeStageId);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="text-[#94a3b8] hover:text-[#62748e] p-1 rounded transition-colors"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <div className="w-8 h-8 bg-[#f0fdf9] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#009689]" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-[#115e59] leading-tight">
                  Giai đoạn sinh trưởng
                </Dialog.Title>
                <p className="text-xs text-[#62748e]">{crop.name}</p>
              </div>
            </div>
            <Dialog.Close className="text-[#94a3b8] hover:text-[#62748e]">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Giai đoạn sinh trưởng cho {crop.name}
          </Dialog.Description>

          {stages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#94a3b8]">
              <TrendingUp className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Chưa có dữ liệu giai đoạn sinh trưởng</p>
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden">
              {/* Stage sidebar */}
              <div className="w-48 shrink-0 border-r border-[#e2e8f0] overflow-y-auto bg-[#f8fafc]">
                <div className="p-3">
                  <p className="text-xs font-semibold text-[#62748e] uppercase tracking-wider mb-2 px-1">
                    Giai đoạn
                  </p>
                  <div className="space-y-1">
                    {stages.map((stage) => {
                      const isActive = activeStageId === stage.stageId;
                      return (
                        <button
                          key={stage.stageId}
                          onClick={() => {
                            setActiveStageId(stage.stageId);
                            setActiveTab("overview");
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${isActive ? "bg-[#009689] text-white" : "hover:bg-white text-[#334155]"}`}
                        >
                          <p
                            className={`text-xs font-medium truncate ${isActive ? "text-white" : "text-[#115e59]"}`}
                          >
                            {stage.stageOrder}. {stage.stageName}
                          </p>
                          <p
                            className={`text-[10px] mt-0.5 ${isActive ? "text-[#ccfbf1]" : "text-[#94a3b8]"}`}
                          >
                            {stage.expectedDurationDays} ngày
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Main content */}
              {activeStage && (
                <div className="flex-1 overflow-y-auto">
                  <div className="p-5">
                    {/* Stage title */}
                    <div className="mb-4">
                      <h3 className="text-base font-bold text-[#115e59]">
                        Giai đoạn {activeStage.stageOrder}:{" "}
                        {activeStage.stageName}
                      </h3>
                      <p className="text-xs text-[#62748e] mt-0.5">
                        {activeStage.stageDescription}
                      </p>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mb-4 bg-[#f1f5f9] rounded-lg p-1">
                      {(["overview", "tasks"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === tab ? "bg-white text-[#115e59] shadow-sm" : "text-[#62748e] hover:text-[#334155]"}`}
                        >
                          {tab === "overview"
                            ? "Tổng quan"
                            : `Công việc (${activeStage.tasks.length})`}
                        </button>
                      ))}
                    </div>

                    {activeTab === "overview" && (
                      <div className="space-y-4">
                        {/* Environmental requirements */}
                        <div className="bg-[#f8fafc] rounded-xl p-4">
                          <p className="text-xs font-semibold text-[#62748e] uppercase tracking-wider mb-3">
                            Yêu cầu môi trường
                          </p>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white rounded-lg p-3 border border-[#e2e8f0]">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                                <span className="text-[10px] text-[#62748e] font-medium">
                                  Nhiệt độ
                                </span>
                              </div>
                              <p className="text-sm font-bold text-[#115e59]">
                                {activeStage.temperatureMin}–
                                {activeStage.temperatureMax}°C
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-[#e2e8f0]">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-[10px] text-[#62748e] font-medium">
                                  Độ ẩm KK
                                </span>
                              </div>
                              <p className="text-sm font-bold text-[#115e59]">
                                {activeStage.humidityMin}–
                                {activeStage.humidityMax}%
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-[#e2e8f0]">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Droplets className="w-3.5 h-3.5 text-teal-500" />
                                <span className="text-[10px] text-[#62748e] font-medium">
                                  Ẩm đất
                                </span>
                              </div>
                              <p className="text-sm font-bold text-[#115e59]">
                                {activeStage.soilMoistureMin}–
                                {activeStage.soilMoistureMax}%
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Growth indicators & diseases */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-[#f0fdf9] rounded-xl p-4 border border-[#ccfbf1]">
                            <p className="text-xs font-semibold text-[#009689] mb-1.5">
                              Chỉ số sinh trưởng
                            </p>
                            <p className="text-xs text-[#334155] leading-relaxed">
                              {activeStage.growthIndicators}
                            </p>
                          </div>
                          <div className="bg-[#fff7ed] rounded-xl p-4 border border-[#fed7aa]">
                            <p className="text-xs font-semibold text-orange-500 mb-1.5">
                              Bệnh thường gặp
                            </p>
                            <p className="text-xs text-[#334155] leading-relaxed">
                              {activeStage.commonDiseases}
                            </p>
                          </div>
                        </div>

                        {activeStage.notes && (
                          <div className="bg-[#f1f5f9] rounded-xl px-4 py-3 text-xs text-[#62748e]">
                            <span className="font-semibold text-[#334155]">
                              Lưu ý:{" "}
                            </span>
                            {activeStage.notes}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "tasks" && (
                      <div className="space-y-3">
                        {activeStage.tasks.length === 0 ? (
                          <p className="text-sm text-[#94a3b8] text-center py-8">
                            Không có công việc
                          </p>
                        ) : (
                          activeStage.tasks.map((task) => (
                            <div
                              key={task.growthTaskId}
                              className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4"
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <ClipboardList className="w-4 h-4 text-[#009689] shrink-0" />
                                  <p className="text-sm font-semibold text-[#115e59]">
                                    {task.taskName}
                                  </p>
                                </div>
                                {task.isMandatory && (
                                  <span className="shrink-0 px-2 py-0.5 bg-[#fee2e2] text-[#b91c1c] text-[10px] font-medium rounded-full">
                                    Bắt buộc
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#62748e] mb-3 leading-relaxed">
                                {task.taskDescription}
                              </p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-[#94a3b8]">
                                    Tần suất
                                  </span>
                                  <span className="font-medium text-[#334155]">
                                    {task.frequency}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[#94a3b8]">
                                    Thời gian
                                  </span>
                                  <span className="font-medium text-[#334155]">
                                    {task.durationMinutes} phút
                                  </span>
                                </div>
                                {task.quantityPerUnit > 0 && (
                                  <div className="flex justify-between col-span-2">
                                    <span className="text-[#94a3b8]">
                                      Định lượng
                                    </span>
                                    <span className="font-medium text-[#334155]">
                                      {task.quantityPerUnit} {task.quantityUnit}
                                    </span>
                                  </div>
                                )}
                                {task.requiredTools && (
                                  <div className="flex justify-between col-span-2">
                                    <span className="text-[#94a3b8]">
                                      Dụng cụ
                                    </span>
                                    <span className="font-medium text-[#334155] text-right">
                                      {task.requiredTools}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ===================== CROP FORM =====================
function CropFormFields({
  formData,
  setFormData,
}: {
  formData: {
    name: string;
    scientificName: string;
    growthPeriod: string;
    soilType: SoilType | "";
    status: CropStatus;
    image: string;
    description: string;
    plantDistanceRow: string;
    plantDistanceColumn: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#45556c] mb-1">
            Tên cây trồng <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={formData.name}
            onChange={(e) =>
              setFormData((p) => ({ ...p, name: e.target.value }))
            }
            className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
            placeholder="Bắp Cải Trắng"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#45556c] mb-1">
            Tên khoa học
          </label>
          <input
            value={formData.scientificName}
            onChange={(e) =>
              setFormData((p) => ({ ...p, scientificName: e.target.value }))
            }
            className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155] italic"
            placeholder="Brassica oleracea"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#45556c] mb-1">
            Loại đất
          </label>
          <select
            value={formData.soilType}
            onChange={(e) =>
              setFormData((p) => ({
                ...p,
                soilType: e.target.value as SoilType,
              }))
            }
            className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155]"
          >
            <option value="">Chọn loại đất</option>
            {soilTypes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#45556c] mb-1">
            Chu kỳ sinh trưởng (ngày)
          </label>
          <input
            type="number"
            value={formData.growthPeriod}
            onChange={(e) =>
              setFormData((p) => ({ ...p, growthPeriod: e.target.value }))
            }
            className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
            placeholder="90"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#45556c] mb-1">
            Khoảng cách hàng (cm)
          </label>
          <input
            type="number"
            value={formData.plantDistanceRow}
            onChange={(e) =>
              setFormData((p) => ({ ...p, plantDistanceRow: e.target.value }))
            }
            className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
            placeholder="40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#45556c] mb-1">
            Khoảng cách cột (cm)
          </label>
          <input
            type="number"
            value={formData.plantDistanceColumn}
            onChange={(e) =>
              setFormData((p) => ({
                ...p,
                plantDistanceColumn: e.target.value,
              }))
            }
            className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
            placeholder="35"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#45556c] mb-1">
          Trạng thái
        </label>
        <select
          value={formData.status}
          onChange={(e) =>
            setFormData((p) => ({ ...p, status: e.target.value as CropStatus }))
          }
          className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155]"
        >
          <option value="Đang sử dụng">Đang sử dụng</option>
          <option value="Không sử dụng">Không sử dụng</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#45556c] mb-1">
          Mô tả
        </label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData((p) => ({ ...p, description: e.target.value }))
          }
          rows={2}
          className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155] resize-none"
          placeholder="Mô tả cây trồng..."
        />
      </div>
    </div>
  );
}

const defaultFormData = {
  name: "",
  scientificName: "",
  growthPeriod: "",
  soilType: "" as SoilType | "",
  status: "Đang sử dụng" as CropStatus,
  image: "",
  description: "",
  plantDistanceRow: "",
  plantDistanceColumn: "",
};

function CreateCropModal({
  open,
  onClose,
  onCreate,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (c: Omit<Crop, "id">) => void;
  submitting: boolean;
}) {
  const [formData, setFormData] = useState(defaultFormData);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      name: formData.name,
      scientificName: formData.scientificName,
      growthPeriod: parseInt(formData.growthPeriod) || 0,
      soilType: (formData.soilType as SoilType) || "Đất Thịt",
      status: formData.status,
      image: formData.image,
      description: formData.description,
      plantDistance: {
        row: parseInt(formData.plantDistanceRow) || 0,
        column: parseInt(formData.plantDistanceColumn) || 0,
      },
    });
    setFormData(defaultFormData);
  };
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sprout className="w-5 h-5 text-[#009689]" />
                <Dialog.Title className="text-lg font-bold text-[#115e59]">
                  Thêm giống cây mới
                </Dialog.Title>
              </div>
              <Dialog.Close className="text-[#94a3b8] hover:text-[#62748e] text-2xl">
                &times;
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Form thêm giống cây mới
            </Dialog.Description>
            <CropFormFields formData={formData} setFormData={setFormData} />
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
                cây trồng
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EditCropModal({
  crop,
  open,
  onClose,
  onUpdate,
  submitting,
}: {
  crop: Crop;
  open: boolean;
  onClose: () => void;
  onUpdate: (c: Crop) => void;
  submitting: boolean;
}) {
  const [formData, setFormData] = useState<{
    name: string;
    scientificName: string;
    growthPeriod: string;
    soilType: SoilType | "";
    status: CropStatus;
    image: string;
    description: string;
    plantDistanceRow: string;
    plantDistanceColumn: string;
  }>({
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
      growthPeriod: parseInt(formData.growthPeriod) || 0,
      soilType: formData.soilType as SoilType,
      status: formData.status,
      image: formData.image,
      description: formData.description,
      plantDistance: {
        row: parseInt(formData.plantDistanceRow) || 0,
        column: parseInt(formData.plantDistanceColumn) || 0,
      },
    });
  };
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sprout className="w-5 h-5 text-[#009689]" />
                <Dialog.Title className="text-lg font-bold text-[#115e59]">
                  Chỉnh sửa cây trồng
                </Dialog.Title>
              </div>
              <Dialog.Close className="text-[#94a3b8] hover:text-[#62748e] text-2xl">
                &times;
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Form chỉnh sửa cây trồng {crop.name}
            </Dialog.Description>
            <CropFormFields formData={formData} setFormData={setFormData} />
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
