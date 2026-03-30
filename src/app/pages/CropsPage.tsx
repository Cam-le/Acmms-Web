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
  List,
  Layers,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Select from "@radix-ui/react-select";
import {
  Crop,
  CropStatus,
  mockCrops,
  CropGrowthStage,
  CropGrowthTask,
  mockGrowthStagesByCropId,
} from "../../data/mockData";
import { api, CropResponse, CompatibleSoil } from "../../api/client";

// Local extended type — adds API-only fields on top of the mockData Crop shape
type CropEx = Crop & {
  plantSpacing?: number;
  compatibleSoils?: CompatibleSoil[];
  cropQuantities?: number;
};

// Mock data shaped to CropEx for fallback
const mockCropsEx: CropEx[] = (mockCrops as CropEx[]).map((c) => ({
  ...c,
  plantSpacing: c.plantDistance?.row ?? 0,
  compatibleSoils: [],
  cropQuantities: undefined,
}));

// ---- Status normalisation (defensive: API returns inconsistent casing/language) ----
function normaliseStatus(raw?: string): CropStatus {
  if (!raw) return "Không sử dụng";
  const s = raw.trim().toLowerCase();
  if (s === "active" || s === "đang sử dụng" || s === "hoạt động")
    return "Đang sử dụng";
  return "Không sử dụng";
}

// Map API response → local CropEx shape
function mapCrop(c: CropResponse): CropEx {
  const primarySoil = (c.compatibleSoils ?? [])[0]?.soilName ?? "";
  return {
    id: c.cropId,
    name: c.cropName ?? "",
    scientificName: c.cropScientificName ?? "",
    growthPeriod: c.cropDefaultGrowthDays ?? 0,
    soilType: primarySoil as Crop["soilType"],
    status: normaliseStatus(c.cropStatus),
    image: "",
    description: "",
    // plantSpacing is a single value (cm); store in both row/column for UI compatibility
    plantDistance: {
      row: c.plantSpacing ?? 0,
      column: c.plantSpacing ?? 0,
    },
    // Extended fields
    plantSpacing: c.plantSpacing,
    compatibleSoils: c.compatibleSoils ?? [],
    cropQuantities: c.cropQuantities,
  };
}

const getSoilBadgeColor = () => "bg-[#cbfbf1] text-[#00786f]";
const getCompatibilityBadgeColor = (compat: string) => {
  const c = compat.toLowerCase();
  if (c === "high") return "bg-[#dcfce7] text-[#008236]";
  if (c === "medium") return "bg-[#fef9c3] text-[#a16207]";
  return "bg-[#fee2e2] text-[#991b1b]";
};
const compatibilityLabel = (compat: string) => {
  const c = compat.toLowerCase();
  if (c === "high") return "Cao";
  if (c === "medium") return "Trung bình";
  return "Thấp";
};
const getStatusBadgeColor = (status: CropStatus) =>
  status === "Đang sử dụng"
    ? "bg-[#dcfce7] text-[#008236]"
    : "bg-[#fee2e2] text-[#991b1b]";

export function CropsPage() {
  const [activeTab, setActiveTab] = useState<"list" | "growth">("list");
  const [crops, setCrops] = useState<CropEx[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"growthPeriod" | "status" | null>(
    null,
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<CropEx | null>(null);
  const [cropToDelete, setCropToDelete] = useState<CropEx | null>(null);
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
      setCrops([...mockCropsEx]);
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

  const handleCreate = async (cropData: Omit<CropEx, "id">) => {
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
          cropScientificName: cropData.scientificName || undefined,
          cropDefaultGrowthDays: cropData.growthPeriod || undefined,
          plantSpacing:
            (cropData as CropEx).plantSpacing ||
            cropData.plantDistance.row ||
            undefined,
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

  const handleUpdate = async (updatedCrop: CropEx) => {
    setSubmitting(true);
    try {
      if (usingMock) {
        setCrops((prev) =>
          prev.map((c) => (c.id === updatedCrop.id ? updatedCrop : c)),
        );
      } else {
        await api.updateCrop(updatedCrop.id, {
          cropName: updatedCrop.name,
          cropScientificName: updatedCrop.scientificName || undefined,
          cropDefaultGrowthDays: updatedCrop.growthPeriod || undefined,
          plantSpacing:
            updatedCrop.plantSpacing ||
            updatedCrop.plantDistance.row ||
            undefined,
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
        {activeTab === "list" ? (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Thêm cây trồng
          </button>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f1f5f9] rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("list")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "list" ? "bg-white text-[#115e59] shadow-sm" : "text-[#62748e] hover:text-[#334155]"}`}
        >
          <List className="w-4 h-4" />
          Danh sách cây trồng
        </button>
        <button
          onClick={() => setActiveTab("growth")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "growth" ? "bg-white text-[#115e59] shadow-sm" : "text-[#62748e] hover:text-[#334155]"}`}
        >
          <TrendingUp className="w-4 h-4" />
          Hướng dẫn theo dõi
        </button>
      </div>

      {activeTab === "growth" && (
        <GrowthStagesTab crops={crops} loading={loading} />
      )}

      {activeTab === "list" && (
        <>
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
                      {/* Loại đất */}
                      <td className="px-6 py-4">
                        {crop.soilType ? (
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getSoilBadgeColor()}`}
                          >
                            {crop.soilType}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      {/* Chu kỳ */}
                      <td className="px-6 py-4 text-sm text-[#62748e] whitespace-nowrap">
                        {crop.growthPeriod > 0
                          ? `${crop.growthPeriod} ngày`
                          : "—"}
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
                      {
                        label: "Khoảng cách trồng",
                        value:
                          (selectedCrop.plantSpacing ??
                            selectedCrop.plantDistance.row) > 0
                            ? `${selectedCrop.plantSpacing ?? selectedCrop.plantDistance.row} cm`
                            : "—",
                      },
                      {
                        label: "Số lượng cây",
                        value:
                          selectedCrop.cropQuantities != null
                            ? selectedCrop.cropQuantities.toString()
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
                    {/* Compatible soils list */}
                    <div className="py-2 border-b border-[#f1f5f9]">
                      <span className="text-sm text-[#62748e]">
                        Loại đất phù hợp
                      </span>
                      {(selectedCrop.compatibleSoils ?? []).length === 0 ? (
                        <span className="block text-sm font-medium text-[#115e59] mt-0.5">
                          —
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {(selectedCrop.compatibleSoils ?? []).map(
                            (s: CompatibleSoil) => (
                              <span
                                key={s.soilId}
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCompatibilityBadgeColor(s.compatibility)}`}
                                title={`Độ tương thích: ${compatibilityLabel(s.compatibility)}`}
                              >
                                {s.soilName} ·{" "}
                                {compatibilityLabel(s.compatibility)}
                              </span>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                    {selectedCrop.description && (
                      <div className="pt-2">
                        <div className="text-xs text-[#62748e] mb-1">Mô tả</div>
                        <p className="text-sm text-[#334155]">
                          {selectedCrop.description}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Dialog.Close className="px-4 py-2 bg-[#f1f5f9] text-[#314158] rounded-lg text-sm hover:bg-[#e2e8f0]">
                      Đóng
                    </Dialog.Close>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
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
                  Bạn có chắc muốn xóa <strong>{cropToDelete?.name}</strong>?
                  Hành động này không thể hoàn tác.
                </AlertDialog.Description>
                <div className="flex justify-end gap-3">
                  <AlertDialog.Cancel className="px-4 py-2 text-sm text-[#62748e] hover:text-[#334155]">
                    Hủy
                  </AlertDialog.Cancel>
                  <AlertDialog.Action
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 flex items-center gap-2"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
                    Xóa
                  </AlertDialog.Action>
                </div>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        </>
      )}
    </div>
  );
}

// ===================== GROWTH STAGES TAB =====================

function GrowthStagesTab({
  crops,
  loading,
}: {
  crops: CropEx[];
  loading: boolean;
}) {
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);

  // stage state
  const [stagesMap, setStagesMap] = useState<Record<string, CropGrowthStage[]>>(
    () => JSON.parse(JSON.stringify(mockGrowthStagesByCropId)),
  );
  const [createStageOpen, setCreateStageOpen] = useState(false);
  const [editStageOpen, setEditStageOpen] = useState(false);
  const [deleteStageOpen, setDeleteStageOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<CropGrowthStage | null>(
    null,
  );

  // task state
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [deleteTaskOpen, setDeleteTaskOpen] = useState(false);
  const [taskParentStageId, setTaskParentStageId] = useState<string | null>(
    null,
  );
  const [selectedTask, setSelectedTask] = useState<CropGrowthTask | null>(null);

  const selectedCrop = crops.find((c) => c.id === selectedCropId) ?? null;
  const stages = selectedCropId ? (stagesMap[selectedCropId] ?? []) : [];

  // ---- Stage CRUD ----
  const handleCreateStage = (
    data: Omit<CropGrowthStage, "stageId" | "tasks">,
  ) => {
    if (!selectedCropId) return;
    const existing = stagesMap[selectedCropId] ?? [];
    const newStage: CropGrowthStage = {
      ...data,
      stageId: `gs-${selectedCropId}-${Date.now()}`,
      tasks: [],
    };
    setStagesMap((prev) => ({
      ...prev,
      [selectedCropId]: [...existing, newStage],
    }));
    setCreateStageOpen(false);
  };

  const handleUpdateStage = (updated: CropGrowthStage) => {
    if (!selectedCropId) return;
    setStagesMap((prev) => ({
      ...prev,
      [selectedCropId]: (prev[selectedCropId] ?? []).map((s) =>
        s.stageId === updated.stageId ? updated : s,
      ),
    }));
    setEditStageOpen(false);
    setSelectedStage(null);
  };

  const handleDeleteStage = () => {
    if (!selectedCropId || !selectedStage) return;
    setStagesMap((prev) => ({
      ...prev,
      [selectedCropId]: (prev[selectedCropId] ?? []).filter(
        (s) => s.stageId !== selectedStage.stageId,
      ),
    }));
    setDeleteStageOpen(false);
    setSelectedStage(null);
  };

  // ---- Task CRUD ----
  const handleCreateTask = (
    stageId: string,
    data: Omit<CropGrowthTask, "growthTaskId" | "stageId">,
  ) => {
    if (!selectedCropId) return;
    const newTask: CropGrowthTask = {
      ...data,
      growthTaskId: `gt-${stageId}-${Date.now()}`,
      stageId,
    };
    setStagesMap((prev) => ({
      ...prev,
      [selectedCropId]: (prev[selectedCropId] ?? []).map((s) =>
        s.stageId === stageId ? { ...s, tasks: [...s.tasks, newTask] } : s,
      ),
    }));
    setCreateTaskOpen(false);
  };

  const handleUpdateTask = (updated: CropGrowthTask) => {
    if (!selectedCropId) return;
    setStagesMap((prev) => ({
      ...prev,
      [selectedCropId]: (prev[selectedCropId] ?? []).map((s) =>
        s.stageId === updated.stageId
          ? {
              ...s,
              tasks: s.tasks.map((t) =>
                t.growthTaskId === updated.growthTaskId ? updated : t,
              ),
            }
          : s,
      ),
    }));
    setEditTaskOpen(false);
    setSelectedTask(null);
  };

  const handleDeleteTask = () => {
    if (!selectedCropId || !selectedTask) return;
    setStagesMap((prev) => ({
      ...prev,
      [selectedCropId]: (prev[selectedCropId] ?? []).map((s) =>
        s.stageId === selectedTask.stageId
          ? {
              ...s,
              tasks: s.tasks.filter(
                (t) => t.growthTaskId !== selectedTask.growthTaskId,
              ),
            }
          : s,
      ),
    }));
    setDeleteTaskOpen(false);
    setSelectedTask(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#009689]" />
      </div>
    );
  }

  return (
    <div className="flex gap-5 min-h-[600px]">
      {/* LEFT: Crop list */}
      <div className="w-56 shrink-0 bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-[#e2e8f0] bg-[#f8fafc]">
          <p className="text-xs font-semibold text-[#62748e] uppercase tracking-wider">
            Chọn cây trồng
          </p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[#f1f5f9]">
          {crops.map((crop) => {
            const stageCount = (stagesMap[crop.id] ?? []).length;
            const isSelected = selectedCropId === crop.id;
            return (
              <button
                key={crop.id}
                onClick={() => setSelectedCropId(crop.id)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${isSelected ? "bg-[#f0fdf9]" : "hover:bg-[#f8fafc]"}`}
              >
                {crop.image ? (
                  <img
                    src={crop.image}
                    alt={crop.name}
                    className="w-9 h-9 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 bg-[#f0fdf9] rounded-lg flex items-center justify-center shrink-0">
                    <Sprout className="w-4 h-4 text-[#009689]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${isSelected ? "text-[#009689]" : "text-[#115e59]"}`}
                  >
                    {crop.name}
                  </p>
                  <p className="text-[10px] text-[#94a3b8]">
                    {stageCount} giai đoạn
                  </p>
                </div>
                {isSelected && (
                  <ChevronRight className="w-3.5 h-3.5 text-[#009689] shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Content */}
      <div className="flex-1 min-w-0">
        {!selectedCrop ? (
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col items-center justify-center py-24 gap-3 text-[#94a3b8]">
            <Layers className="w-10 h-10 opacity-40" />
            <p className="text-sm">
              Chọn cây trồng để xem giai đoạn sinh trưởng
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Crop header */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm px-5 py-4 flex items-center gap-4">
              {selectedCrop.image ? (
                <img
                  src={selectedCrop.image}
                  alt={selectedCrop.name}
                  className="w-12 h-12 rounded-xl object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-[#f0fdf9] rounded-xl flex items-center justify-center">
                  <Sprout className="w-6 h-6 text-[#009689]" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-base font-bold text-[#115e59]">
                  {selectedCrop.name}
                </h2>
                <p className="text-xs italic text-[#62748e]">
                  {selectedCrop.scientificName || "—"}
                </p>
              </div>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 bg-[#f0fdf9] text-[#009689] rounded-full text-xs font-medium">
                  {stages.length} giai đoạn
                </span>
                <span className="px-2.5 py-1 bg-[#f1f5f9] text-[#62748e] rounded-full text-xs font-medium">
                  {selectedCrop.growthPeriod} ngày
                </span>
              </div>
            </div>

            {/* Actions bar */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#62748e]">
                Cấu hình các giai đoạn sinh trưởng chuẩn của giống cây
              </p>
              <button
                onClick={() => setCreateStageOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-[#009689] text-white rounded-lg text-sm font-medium hover:bg-[#007f75] transition-colors"
              >
                <Plus className="w-4 h-4" /> Thêm giai đoạn
              </button>
            </div>

            {stages.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col items-center justify-center py-16 gap-3 text-[#94a3b8]">
                <Layers className="w-8 h-8 opacity-40" />
                <p className="text-sm">
                  Chưa có giai đoạn nào. Thêm giai đoạn đầu tiên.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {stages.map((stage) => (
                  <StageCard
                    key={stage.stageId}
                    stage={stage}
                    onEditStage={() => {
                      setSelectedStage(stage);
                      setEditStageOpen(true);
                    }}
                    onDeleteStage={() => {
                      setSelectedStage(stage);
                      setDeleteStageOpen(true);
                    }}
                    onAddTask={() => {
                      setTaskParentStageId(stage.stageId);
                      setCreateTaskOpen(true);
                    }}
                    onEditTask={(task) => {
                      setSelectedTask(task);
                      setEditTaskOpen(true);
                    }}
                    onDeleteTask={(task) => {
                      setSelectedTask(task);
                      setDeleteTaskOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== STAGE CRUD MODALS ===== */}
      {selectedCropId && (
        <StageFormModal
          open={createStageOpen}
          mode="create"
          cropId={selectedCropId}
          stageCount={stages.length}
          onClose={() => setCreateStageOpen(false)}
          onSubmit={handleCreateStage}
        />
      )}
      {selectedStage && (
        <StageFormModal
          open={editStageOpen}
          mode="edit"
          cropId={selectedStage.cropId}
          stageCount={stages.length}
          initial={selectedStage}
          onClose={() => {
            setEditStageOpen(false);
            setSelectedStage(null);
          }}
          onSubmit={(data) => handleUpdateStage({ ...selectedStage, ...data })}
        />
      )}
      <AlertDialog.Root
        open={deleteStageOpen}
        onOpenChange={setDeleteStageOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-full max-w-sm z-50 p-6">
            <AlertDialog.Title className="text-base font-bold text-[#115e59] mb-2">
              Xóa giai đoạn
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-[#62748e] mb-6">
              Xóa <strong>{selectedStage?.stageName}</strong>? Tất cả nhiệm vụ
              trong giai đoạn này cũng sẽ bị xóa.
            </AlertDialog.Description>
            <div className="flex justify-end gap-3">
              <AlertDialog.Cancel className="px-4 py-2 text-sm text-[#62748e] hover:text-[#334155]">
                Hủy
              </AlertDialog.Cancel>
              <AlertDialog.Action
                onClick={handleDeleteStage}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600"
              >
                Xóa
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* ===== TASK CRUD MODALS ===== */}
      {taskParentStageId && (
        <TaskFormModal
          open={createTaskOpen}
          mode="create"
          stageId={taskParentStageId}
          taskCount={
            (stages.find((s) => s.stageId === taskParentStageId)?.tasks ?? [])
              .length
          }
          onClose={() => setCreateTaskOpen(false)}
          onSubmit={(data) => handleCreateTask(taskParentStageId, data)}
        />
      )}
      {selectedTask && (
        <TaskFormModal
          open={editTaskOpen}
          mode="edit"
          stageId={selectedTask.stageId}
          taskCount={0}
          initial={selectedTask}
          onClose={() => {
            setEditTaskOpen(false);
            setSelectedTask(null);
          }}
          onSubmit={(data) => handleUpdateTask({ ...selectedTask, ...data })}
        />
      )}
      <AlertDialog.Root open={deleteTaskOpen} onOpenChange={setDeleteTaskOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-full max-w-sm z-50 p-6">
            <AlertDialog.Title className="text-base font-bold text-[#115e59] mb-2">
              Xóa nhiệm vụ
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-[#62748e] mb-6">
              Xóa nhiệm vụ <strong>{selectedTask?.taskName}</strong>?
            </AlertDialog.Description>
            <div className="flex justify-end gap-3">
              <AlertDialog.Cancel className="px-4 py-2 text-sm text-[#62748e] hover:text-[#334155]">
                Hủy
              </AlertDialog.Cancel>
              <AlertDialog.Action
                onClick={handleDeleteTask}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600"
              >
                Xóa
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

// ---- StageCard ----
function StageCard({
  stage,
  onEditStage,
  onDeleteStage,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: {
  stage: CropGrowthStage;
  onEditStage: () => void;
  onDeleteStage: () => void;
  onAddTask: () => void;
  onEditTask: (t: CropGrowthTask) => void;
  onDeleteTask: (t: CropGrowthTask) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
      {/* Stage header */}
      <div className="px-5 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#009689] text-white rounded-lg flex items-center justify-center shrink-0">
          <Layers className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[#115e59]">
              {stage.stageName}
            </p>
            <span className="px-2 py-0.5 bg-[#f0fdf9] text-[#009689] text-[10px] rounded-full font-medium shrink-0">
              {stage.expectedDurationDays} ngày
            </span>
          </div>
          <p className="text-xs text-[#62748e] truncate">
            {stage.stageDescription}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 text-[#62748e] hover:text-[#009689] hover:bg-[#f0fdf9] rounded transition-colors"
            title="Mở rộng"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onEditStage}
            className="p-1.5 text-[#62748e] hover:text-[#009689] hover:bg-[#f0fdf9] rounded transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDeleteStage}
            className="p-1.5 text-[#62748e] hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#f1f5f9] px-5 py-4 space-y-4">
          {/* Env requirements */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#fff7ed] rounded-lg p-3 border border-[#fed7aa]">
              <div className="flex items-center gap-1.5 mb-1">
                <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-[10px] text-[#62748e] font-medium">
                  Nhiệt độ
                </span>
              </div>
              <p className="text-sm font-bold text-[#115e59]">
                ≥ {stage.temperatureMin}°C
              </p>
            </div>
            <div className="bg-[#eff6ff] rounded-lg p-3 border border-[#bfdbfe]">
              <div className="flex items-center gap-1.5 mb-1">
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] text-[#62748e] font-medium">
                  Độ ẩm KK
                </span>
              </div>
              <p className="text-sm font-bold text-[#115e59]">
                ≥ {stage.humidityMin}%
              </p>
            </div>
            <div className="bg-[#f0fdf9] rounded-lg p-3 border border-[#ccfbf1]">
              <div className="flex items-center gap-1.5 mb-1">
                <Droplets className="w-3.5 h-3.5 text-teal-500" />
                <span className="text-[10px] text-[#62748e] font-medium">
                  Ẩm đất
                </span>
              </div>
              <p className="text-sm font-bold text-[#115e59]">
                ≥ {stage.soilMoistureMin}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#f0fdf9] rounded-lg p-3 border border-[#ccfbf1]">
              <p className="text-[10px] font-semibold text-[#009689] mb-1">
                Chỉ số sinh trưởng
              </p>
              <p className="text-xs text-[#334155]">{stage.growthIndicators}</p>
            </div>
            <div className="bg-[#fff7ed] rounded-lg p-3 border border-[#fed7aa]">
              <p className="text-[10px] font-semibold text-orange-500 mb-1">
                Bệnh thường gặp
              </p>
              <p className="text-xs text-[#334155]">{stage.commonDiseases}</p>
            </div>
          </div>

          {stage.notes && (
            <div className="bg-[#f8fafc] rounded-lg px-3 py-2 text-xs text-[#62748e]">
              <span className="font-semibold text-[#334155]">Lưu ý: </span>
              {stage.notes}
            </div>
          )}

          {/* Tasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-[#62748e] uppercase tracking-wider">
                Nhiệm vụ gợi ý ({stage.tasks.length})
              </p>
              <button
                onClick={onAddTask}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#f0fdf9] text-[#009689] border border-[#009689] rounded-lg text-xs font-medium hover:bg-[#ccfbf1] transition-colors"
              >
                <Plus className="w-3 h-3" /> Thêm nhiệm vụ
              </button>
            </div>
            {stage.tasks.length === 0 ? (
              <p className="text-xs text-[#94a3b8] text-center py-4">
                Chưa có nhiệm vụ nào
              </p>
            ) : (
              <div className="space-y-2">
                {stage.tasks.map((task) => (
                  <div
                    key={task.growthTaskId}
                    className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-4 py-3 flex items-start gap-3"
                  >
                    <ClipboardList className="w-4 h-4 text-[#009689] mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-semibold text-[#115e59]">
                          {task.taskName}
                        </p>
                        {task.isMandatory && (
                          <span className="px-1.5 py-0.5 bg-[#fee2e2] text-[#b91c1c] text-[9px] font-medium rounded-full shrink-0">
                            Bắt buộc
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#62748e] mb-2">
                        {task.taskDescription}
                      </p>
                      <div className="flex flex-wrap gap-3 text-[10px] text-[#94a3b8]">
                        <span>
                          <span className="font-medium text-[#334155]">
                            {task.frequency}
                          </span>{" "}
                          · {task.durationMinutes} phút
                        </span>
                        {task.quantityPerUnit > 0 && (
                          <span>
                            {task.quantityPerUnit} {task.quantityUnit}
                          </span>
                        )}
                        {task.requiredTools && (
                          <span className="text-[#009689]">
                            {task.requiredTools}
                          </span>
                        )}
                        {task.requiredMaterials && (
                          <span className="text-purple-600">
                            {task.requiredMaterials}
                          </span>
                        )}
                        {task.priority && task.priority !== "MEDIUM" && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${task.priority === "HIGH" ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}
                          >
                            {task.priority === "HIGH" ? "Ưu tiên cao" : "Thấp"}
                          </span>
                        )}
                      </div>
                      {task.notes && (
                        <p className="text-[10px] text-[#94a3b8] mt-1 italic">
                          {task.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onEditTask(task)}
                        className="p-1 text-[#94a3b8] hover:text-[#009689] hover:bg-[#f0fdf9] rounded transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteTask(task)}
                        className="p-1 text-[#94a3b8] hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
// ---- StageFormModal ----
function StageFormModal({
  open,
  mode,
  cropId,
  stageCount,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  cropId: string;
  stageCount: number;
  initial?: CropGrowthStage;
  onClose: () => void;
  onSubmit: (data: Omit<CropGrowthStage, "stageId" | "tasks">) => void;
}) {
  const defaultForm = {
    cropId,
    stageName: "",
    stageDescription: "",
    expectedDurationDays: 14,
    temperatureMin: 15,
    humidityMin: 60,
    soilMoistureMin: 50,
    growthIndicators: "",
    commonDiseases: "",
    notes: "",
  };

  const [form, setForm] = useState(initial ? { ...initial } : defaultForm);

  useEffect(() => {
    setForm(initial ? { ...initial } : defaultForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const f = (key: string, val: string | number) =>
    setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...form, cropId });
  };

  const numField = (label: string, key: string, unit?: string) => (
    <div>
      <label className="block text-xs font-medium text-[#45556c] mb-1">
        {label}
        {unit && <span className="text-[#94a3b8] ml-1">({unit})</span>}
      </label>
      <input
        type="number"
        value={(form as Record<string, unknown>)[key] as number}
        onChange={(e) => f(key, parseFloat(e.target.value) || 0)}
        className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
      />
    </div>
  );

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#009689]" />
                <Dialog.Title className="text-base font-bold text-[#115e59]">
                  {mode === "create"
                    ? "Thêm giai đoạn sinh trưởng"
                    : "Chỉnh sửa giai đoạn"}
                </Dialog.Title>
              </div>
              <Dialog.Close className="text-[#94a3b8] hover:text-[#62748e]">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Form giai đoạn sinh trưởng
            </Dialog.Description>

            <div>
              <label className="block text-xs font-medium text-[#45556c] mb-1">
                Tên giai đoạn <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.stageName}
                onChange={(e) => f("stageName", e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
                placeholder="Nảy mầm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#45556c] mb-1">
                Mô tả giai đoạn
              </label>
              <textarea
                value={form.stageDescription}
                onChange={(e) => f("stageDescription", e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155] resize-none"
                placeholder="Mô tả ngắn gọn về giai đoạn này..."
              />
            </div>

            {numField("Thời gian dự kiến", "expectedDurationDays", "ngày")}

            <p className="text-xs font-semibold text-[#62748e] uppercase tracking-wider pt-1">
              Môi trường lý tưởng
            </p>
            <div className="grid grid-cols-3 gap-4">
              {numField("Nhiệt độ min (°C)", "temperatureMin")}
              {numField("Độ ẩm KK min (%)", "humidityMin")}
              {numField("Ẩm đất min (%)", "soilMoistureMin")}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#45556c] mb-1">
                Chỉ số sinh trưởng
              </label>
              <input
                value={form.growthIndicators}
                onChange={(e) => f("growthIndicators", e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
                placeholder="Hạt nứt vỏ, rễ mầm dài 1–2 cm..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#45556c] mb-1">
                Bệnh thường gặp
              </label>
              <input
                value={form.commonDiseases}
                onChange={(e) => f("commonDiseases", e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
                placeholder="Thối rễ mầm (Pythium)..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#45556c] mb-1">
                Lưu ý
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => f("notes", e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155] resize-none"
                placeholder="Lưu ý đặc biệt..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close className="px-4 py-2 text-sm text-[#62748e] hover:text-[#334155]">
                Hủy
              </Dialog.Close>
              <button
                type="submit"
                className="px-4 py-2 bg-[#009689] text-white text-sm rounded-lg hover:bg-[#007f75]"
              >
                {mode === "create" ? "Thêm giai đoạn" : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
// ---- TaskFormModal ----
function TaskFormModal({
  open,
  mode,
  stageId,
  taskCount,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  stageId: string;
  taskCount: number;
  initial?: CropGrowthTask;
  onClose: () => void;
  onSubmit: (data: Omit<CropGrowthTask, "growthTaskId" | "stageId">) => void;
}) {
  const defaultForm = {
    taskName: "",
    taskDescription: "",
    frequency: "Hàng ngày",
    durationMinutes: 30,
    requiredTools: "",
    requiredMaterials: "",
    quantityPerUnit: 0,
    quantityUnit: "",
    priority: "MEDIUM",
    isMandatory: false,
    notes: "",
  };

  const [form, setForm] = useState(initial ? { ...initial } : defaultForm);

  useEffect(() => {
    setForm(initial ? { ...initial } : defaultForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const f = (key: string, val: string | number | boolean) =>
    setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      taskName: form.taskName,
      taskDescription: form.taskDescription,
      frequency: form.frequency,
      durationMinutes: form.durationMinutes,
      requiredTools: form.requiredTools,
      requiredMaterials: form.requiredMaterials,
      quantityPerUnit: form.quantityPerUnit,
      quantityUnit: form.quantityUnit,
      priority: form.priority,
      isMandatory: form.isMandatory,
      notes: form.notes,
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-50">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#009689]" />
                <Dialog.Title className="text-base font-bold text-[#115e59]">
                  {mode === "create" ? "Thêm nhiệm vụ" : "Chỉnh sửa nhiệm vụ"}
                </Dialog.Title>
              </div>
              <Dialog.Close className="text-[#94a3b8] hover:text-[#62748e]">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Form nhiệm vụ giai đoạn
            </Dialog.Description>

            <div>
              <label className="block text-xs font-medium text-[#45556c] mb-1">
                Tên nhiệm vụ <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.taskName}
                onChange={(e) => f("taskName", e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
                placeholder="Tưới nước"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#45556c] mb-1">
                Mô tả
              </label>
              <textarea
                value={form.taskDescription}
                onChange={(e) => f("taskDescription", e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155] resize-none"
                placeholder="Chi tiết cách thực hiện..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#45556c] mb-1">
                Thời gian thực hiện (phút)
              </label>
              <input
                type="number"
                value={form.durationMinutes}
                onChange={(e) =>
                  f("durationMinutes", parseInt(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#45556c] mb-1">
                Tần suất
              </label>
              <select
                value={form.frequency}
                onChange={(e) => f("frequency", e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155]"
              >
                <option>Một lần</option>
                <option>Hàng ngày</option>
                <option>3 ngày/lần</option>
                <option>7 ngày/lần</option>
                <option>Hàng tuần</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#45556c] mb-1">
                  Định lượng
                </label>
                <input
                  type="number"
                  value={form.quantityPerUnit}
                  onChange={(e) =>
                    f("quantityPerUnit", parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#45556c] mb-1">
                  Đơn vị
                </label>
                <input
                  value={form.quantityUnit}
                  onChange={(e) => f("quantityUnit", e.target.value)}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
                  placeholder="g/cây, lít/m²..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#45556c] mb-1">
                Dụng cụ cần thiết
              </label>
              <input
                value={form.requiredTools}
                onChange={(e) => f("requiredTools", e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
                placeholder="Bình tưới, kéo..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#45556c] mb-1">
                Vật tư cần thiết
              </label>
              <input
                value={form.requiredMaterials}
                onChange={(e) => f("requiredMaterials", e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
                placeholder="Phân NPK, thuốc Bt..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#45556c] mb-1">
                Độ ưu tiên
              </label>
              <select
                value={form.priority}
                onChange={(e) => f("priority", e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155]"
              >
                <option value="HIGH">Cao</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="LOW">Thấp</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#45556c] mb-1">
                Ghi chú
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => f("notes", e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155] resize-none"
                placeholder="Lưu ý khi thực hiện..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isMandatory"
                checked={form.isMandatory}
                onChange={(e) => f("isMandatory", e.target.checked)}
                className="w-4 h-4 accent-[#009689]"
              />
              <label htmlFor="isMandatory" className="text-sm text-[#334155]">
                Nhiệm vụ bắt buộc
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close className="px-4 py-2 text-sm text-[#62748e] hover:text-[#334155]">
                Hủy
              </Dialog.Close>
              <button
                type="submit"
                className="px-4 py-2 bg-[#009689] text-white text-sm rounded-lg hover:bg-[#007f75]"
              >
                {mode === "create" ? "Thêm nhiệm vụ" : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CropFormFields({
  formData,
  setFormData,
}: {
  formData: {
    name: string;
    scientificName: string;
    growthPeriod: string;
    status: CropStatus;
    image: string;
    description: string;
    plantSpacing: string;
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
        <div>
          <label className="block text-sm font-medium text-[#45556c] mb-1">
            Khoảng cách trồng (cm)
          </label>
          <input
            type="number"
            value={formData.plantSpacing}
            onChange={(e) =>
              setFormData((p) => ({ ...p, plantSpacing: e.target.value }))
            }
            className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
            placeholder="50"
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
  status: "Đang sử dụng" as CropStatus,
  image: "",
  description: "",
  plantSpacing: "",
};

function CreateCropModal({
  open,
  onClose,
  onCreate,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (c: Omit<CropEx, "id">) => void;
  submitting: boolean;
}) {
  const [formData, setFormData] = useState(defaultFormData);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      name: formData.name,
      scientificName: formData.scientificName,
      growthPeriod: parseInt(formData.growthPeriod) || 0,
      soilType: "" as Crop["soilType"],
      status: formData.status,
      image: formData.image,
      description: formData.description,
      plantDistance: {
        row: parseInt(formData.plantSpacing) || 0,
        column: parseInt(formData.plantSpacing) || 0,
      },
      plantSpacing: parseInt(formData.plantSpacing) || undefined,
      compatibleSoils: [],
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
  crop: CropEx;
  open: boolean;
  onClose: () => void;
  onUpdate: (c: CropEx) => void;
  submitting: boolean;
}) {
  const [formData, setFormData] = useState<{
    name: string;
    scientificName: string;
    growthPeriod: string;
    status: CropStatus;
    image: string;
    description: string;
    plantSpacing: string;
  }>({
    name: crop.name,
    scientificName: crop.scientificName,
    growthPeriod: crop.growthPeriod.toString(),
    status: crop.status,
    image: crop.image,
    description: crop.description,
    plantSpacing: (crop.plantSpacing ?? crop.plantDistance.row ?? 0).toString(),
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      ...crop,
      name: formData.name,
      scientificName: formData.scientificName,
      growthPeriod: parseInt(formData.growthPeriod) || 0,
      status: formData.status,
      image: formData.image,
      description: formData.description,
      plantDistance: {
        row: parseInt(formData.plantSpacing) || 0,
        column: parseInt(formData.plantSpacing) || 0,
      },
      plantSpacing: parseInt(formData.plantSpacing) || undefined,
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
