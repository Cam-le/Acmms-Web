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
  ChevronLeft,
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
  api,
  CropResponse,
  CompatibleSoil,
  CropGrowthStageResponse,
  CropGrowthTaskResponse,
} from "../../api/client";

// Defined locally — no longer imported from mockData
type CropStatus = "Đang sử dụng" | "Không sử dụng";

// Flat local type — derived purely from API fields, no mock dependency
interface CropEx {
  id: string;
  name: string;
  scientificName: string;
  growthPeriod: number;
  plantSpacing: number;
  bedWidthDefault: number;
  pathWidthDefault: number;
  rowsPerBed: number;
  rowSpacing: number;
  status: CropStatus;
  compatibleSoils: CompatibleSoil[];
}

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
  return {
    id: c.cropId,
    name: c.cropName ?? "",
    scientificName: c.cropScientificName ?? "",
    growthPeriod: c.cropDefaultGrowthDays ?? 0,
    plantSpacing: c.plantSpacing ?? 0,
    bedWidthDefault: c.bedWidthDefault ?? 0,
    pathWidthDefault: c.pathWidthDefault ?? 0,
    rowsPerBed: c.rowsPerBed ?? 0,
    rowSpacing: c.rowSpacing ?? 0,
    status: normaliseStatus(c.cropStatus),
    compatibleSoils: c.compatibleSoils ?? [],
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
  if (c === "good") return "Cao";
  if (c === "medium") return "Trung bình";
  return "Thấp";
};
const getStatusBadgeColor = (status: CropStatus) =>
  status === "Đang sử dụng"
    ? "bg-[#dcfce7] text-[#008236]"
    : "bg-[#fee2e2] text-[#991b1b]";

const PAGE_SIZE = 8;

export function CropsPage() {
  const [activeTab, setActiveTab] = useState<"list" | "growth">("list");
  const [crops, setCrops] = useState<CropEx[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
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
    setLoadError(false);
    try {
      const data = await api.getCrops();
      setCrops(data.map(mapCrop));
    } catch {
      setLoadError(true);
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
    setPage(1);
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

  const totalPages = Math.max(1, Math.ceil(filteredCrops.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedCrops = filteredCrops.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handleCreate = async (cropData: Omit<CropEx, "id">) => {
    setSubmitting(true);
    try {
      await api.createCrop({
        cropName: cropData.name,
        cropScientificName: cropData.scientificName || undefined,
        cropDefaultGrowthDays: cropData.growthPeriod || undefined,
        plantSpacing: cropData.plantSpacing || undefined,
        bedWidthDefault: cropData.bedWidthDefault || undefined,
        pathWidthDefault: cropData.pathWidthDefault || undefined,
        rowsPerBed: cropData.rowsPerBed || undefined,
        rowSpacing: cropData.rowSpacing || undefined,
        cropStatus: cropData.status === "Đang sử dụng" ? "Active" : "Inactive",
      });
      await loadCrops();
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
      await api.updateCrop(updatedCrop.id, {
        cropName: updatedCrop.name,
        cropScientificName: updatedCrop.scientificName || undefined,
        cropDefaultGrowthDays: updatedCrop.growthPeriod || undefined,
        plantSpacing: updatedCrop.plantSpacing || undefined,
        bedWidthDefault: updatedCrop.bedWidthDefault || undefined,
        pathWidthDefault: updatedCrop.pathWidthDefault || undefined,
        rowsPerBed: updatedCrop.rowsPerBed || undefined,
        rowSpacing: updatedCrop.rowSpacing || undefined,
        cropStatus:
          updatedCrop.status === "Đang sử dụng" ? "Active" : "Inactive",
      });
      await loadCrops();
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
      await api.deleteCrop(cropToDelete.id);
      await loadCrops();
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
          {loadError && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-full">
              <WifiOff className="w-3 h-3 text-red-500" />
              <span className="text-xs text-red-600">
                Không thể tải dữ liệu
              </span>
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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
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
                    {/* Column order: Cây trồng → Tên khoa học → Chu kỳ → Trạng thái → Thao tác */}
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#62748e] uppercase tracking-wider">
                      Cây trồng
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#62748e] uppercase tracking-wider">
                      Tên khoa học
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
                  {pagedCrops.map((crop) => (
                    <tr
                      key={crop.id}
                      className="hover:bg-[#f8fafc] transition-colors"
                    >
                      {/* Cây trồng */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#f0fdf9] rounded-lg flex items-center justify-center shrink-0">
                            <ImageIcon className="w-5 h-5 text-[#009689]" />
                          </div>
                          <span className="font-medium text-[#115e59] text-sm">
                            {crop.name}
                          </span>
                        </div>
                      </td>
                      {/* Tên khoa học */}
                      <td className="px-6 py-4 text-sm text-[#62748e] italic">
                        {crop.scientificName || "—"}
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
            {/* pagination */}
            <div className="flex items-center justify-end px-5 py-4 border-t border-[#e2e8f0]">
              <div className="flex items-center gap-1">
                <CropPaginationBtn
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </CropPaginationBtn>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
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
                  ),
                )}
                <CropPaginationBtn
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </CropPaginationBtn>
              </div>
            </div>
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
                    <div className="w-16 h-16 bg-[#f0fdf9] rounded-xl flex items-center justify-center">
                      <Sprout className="w-8 h-8 text-[#009689]" />
                    </div>
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
                          selectedCrop.plantSpacing > 0
                            ? `${selectedCrop.plantSpacing} m`
                            : "—",
                      },
                      {
                        label: "Chiều rộng luống (tối thiểu)",
                        value:
                          selectedCrop.bedWidthDefault > 0
                            ? `${selectedCrop.bedWidthDefault} m`
                            : "—",
                      },
                      {
                        label: "Khoảng cách lối đi giữa các luống",
                        value:
                          selectedCrop.pathWidthDefault > 0
                            ? `${selectedCrop.pathWidthDefault} m`
                            : "—",
                      },
                      {
                        label: "Hàng / luống",
                        value:
                          selectedCrop.rowsPerBed > 0
                            ? `${selectedCrop.rowsPerBed}`
                            : "—",
                      },
                      {
                        label: "Khoảng cách hàng",
                        value:
                          selectedCrop.rowSpacing > 0
                            ? `${selectedCrop.rowSpacing} m`
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

  // API-driven state
  const [stages, setStages] = useState<CropGrowthStageResponse[]>([]);
  const [tasksMap, setTasksMap] = useState<
    Record<string, CropGrowthTaskResponse[]>
  >({});
  const [stagesLoading, setStagesLoading] = useState(false);
  const [stagesError, setStagesError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Stage modal state
  const [createStageOpen, setCreateStageOpen] = useState(false);
  const [editStageOpen, setEditStageOpen] = useState(false);
  const [deleteStageOpen, setDeleteStageOpen] = useState(false);
  const [selectedStage, setSelectedStage] =
    useState<CropGrowthStageResponse | null>(null);

  // Task modal state
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [deleteTaskOpen, setDeleteTaskOpen] = useState(false);
  const [taskParentStageId, setTaskParentStageId] = useState<string | null>(
    null,
  );
  const [selectedTask, setSelectedTask] =
    useState<CropGrowthTaskResponse | null>(null);

  const selectedCrop = crops.find((c) => c.id === selectedCropId) ?? null;

  // Load stages + tasks when crop selection changes
  useEffect(() => {
    if (!selectedCropId) {
      setStages([]);
      setTasksMap({});
      return;
    }
    loadStagesForCrop(selectedCropId);
  }, [selectedCropId]);

  const loadStagesForCrop = async (cropId: string) => {
    setStagesLoading(true);
    setStagesError(false);
    try {
      const stageList = await api.getCropGrowthStagesByCrop(cropId);
      setStages(stageList);
      // Load tasks for all stages in parallel
      const entries = await Promise.all(
        stageList.map(async (s) => {
          try {
            const tasks = await api.getCropGrowthTasksByStage(s.stageId);
            return [s.stageId, tasks] as [string, CropGrowthTaskResponse[]];
          } catch {
            return [s.stageId, []] as [string, CropGrowthTaskResponse[]];
          }
        }),
      );
      setTasksMap(Object.fromEntries(entries));
    } catch {
      setStagesError(true);
      setStages([]);
      setTasksMap({});
    } finally {
      setStagesLoading(false);
    }
  };

  const reloadStages = () => {
    if (selectedCropId) loadStagesForCrop(selectedCropId);
  };

  // ---- Stage CRUD ----
  const handleCreateStage = async (data: StageFormData) => {
    if (!selectedCropId) return;
    setSubmitting(true);
    try {
      await api.createCropGrowthStage({
        cropId: selectedCropId,
        stageName: data.stageName,
        stageDescription: data.stageDescription || undefined,
        temperatureMin: data.temperatureMin,
        humidityMin: data.humidityMin,
        soilMoistureMin: data.soilMoistureMin,
        growthIndicators: data.growthIndicators || undefined,
        commonDiseases: data.commonDiseases || undefined,
        notes: data.notes || undefined,
      });
      setCreateStageOpen(false);
      reloadStages();
    } catch (err) {
      alert(
        "Không thể tạo giai đoạn: " +
          (err instanceof Error ? err.message : "Lỗi"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStage = async (data: StageFormData) => {
    if (!selectedStage) return;
    setSubmitting(true);
    try {
      await api.updateCropGrowthStage(selectedStage.stageId, {
        cropId: selectedStage.cropId,
        stageName: data.stageName,
        stageDescription: data.stageDescription || undefined,
        temperatureMin: data.temperatureMin,
        humidityMin: data.humidityMin,
        soilMoistureMin: data.soilMoistureMin,
        growthIndicators: data.growthIndicators || undefined,
        commonDiseases: data.commonDiseases || undefined,
        notes: data.notes || undefined,
      });
      setEditStageOpen(false);
      setSelectedStage(null);
      reloadStages();
    } catch (err) {
      alert(
        "Không thể cập nhật giai đoạn: " +
          (err instanceof Error ? err.message : "Lỗi"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStage = async () => {
    if (!selectedStage) return;
    setSubmitting(true);
    try {
      await api.deleteCropGrowthStage(selectedStage.stageId);
      setDeleteStageOpen(false);
      setSelectedStage(null);
      reloadStages();
    } catch (err) {
      alert(
        "Không thể xóa giai đoạn: " +
          (err instanceof Error ? err.message : "Lỗi"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Task CRUD ----
  const handleCreateTask = async (stageId: string, data: TaskFormData) => {
    setSubmitting(true);
    try {
      await api.createCropGrowthTask({
        stageId,
        taskName: data.taskName,
        taskDescription: data.taskDescription || undefined,
        frequency: data.frequency || undefined,
        durationMinutes: data.durationMinutes,
        requiredTools: data.requiredTools || undefined,
        requiredMaterials: data.requiredMaterials || undefined,
        quantityPerUnit: data.quantityPerUnit,
        quantityUnit: data.quantityUnit || undefined,
        priority: data.priority,
        isMandatory: data.isMandatory,
        notes: data.notes || undefined,
      });
      setCreateTaskOpen(false);
      reloadStages();
    } catch (err) {
      alert(
        "Không thể tạo nhiệm vụ: " +
          (err instanceof Error ? err.message : "Lỗi"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTask = async (data: TaskFormData) => {
    if (!selectedTask) return;
    setSubmitting(true);
    try {
      await api.updateCropGrowthTask(selectedTask.growthTaskId, {
        stageId: selectedTask.stageId,
        taskName: data.taskName,
        taskDescription: data.taskDescription || undefined,
        frequency: data.frequency || undefined,
        durationMinutes: data.durationMinutes,
        requiredTools: data.requiredTools || undefined,
        requiredMaterials: data.requiredMaterials || undefined,
        quantityPerUnit: data.quantityPerUnit,
        quantityUnit: data.quantityUnit || undefined,
        priority: data.priority,
        isMandatory: data.isMandatory,
        notes: data.notes || undefined,
      });
      setEditTaskOpen(false);
      setSelectedTask(null);
      reloadStages();
    } catch (err) {
      alert(
        "Không thể cập nhật nhiệm vụ: " +
          (err instanceof Error ? err.message : "Lỗi"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    setSubmitting(true);
    try {
      await api.deleteCropGrowthTask(selectedTask.growthTaskId);
      setDeleteTaskOpen(false);
      setSelectedTask(null);
      reloadStages();
    } catch (err) {
      alert(
        "Không thể xóa nhiệm vụ: " +
          (err instanceof Error ? err.message : "Lỗi"),
      );
    } finally {
      setSubmitting(false);
    }
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
            const isSelected = selectedCropId === crop.id;
            const stageCount = isSelected ? stages.length : "—";
            return (
              <button
                key={crop.id}
                onClick={() => setSelectedCropId(crop.id)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${isSelected ? "bg-[#f0fdf9]" : "hover:bg-[#f8fafc]"}`}
              >
                <div className="w-9 h-9 bg-[#f0fdf9] rounded-lg flex items-center justify-center shrink-0">
                  <Sprout className="w-4 h-4 text-[#009689]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${isSelected ? "text-[#009689]" : "text-[#115e59]"}`}
                  >
                    {crop.name}
                  </p>
                  <p className="text-[10px] text-[#94a3b8]">
                    {isSelected ? `${stageCount} giai đoạn` : ""}
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
        ) : stagesLoading ? (
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-[#009689]" />
          </div>
        ) : stagesError ? (
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col items-center justify-center py-24 gap-3 text-[#94a3b8]">
            <WifiOff className="w-8 h-8 opacity-40" />
            <p className="text-sm">Không thể tải dữ liệu giai đoạn</p>
            <button
              onClick={reloadStages}
              className="px-3 py-1.5 bg-[#f1f5f9] text-[#62748e] rounded-lg text-xs hover:bg-[#e2e8f0]"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Crop header */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm px-5 py-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-[#f0fdf9] rounded-xl flex items-center justify-center">
                <Sprout className="w-6 h-6 text-[#009689]" />
              </div>
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
                    tasks={tasksMap[stage.stageId] ?? []}
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
          onClose={() => setCreateStageOpen(false)}
          onSubmit={handleCreateStage}
          submitting={submitting}
        />
      )}
      {selectedStage && (
        <StageFormModal
          open={editStageOpen}
          mode="edit"
          initial={selectedStage}
          onClose={() => {
            setEditStageOpen(false);
            setSelectedStage(null);
          }}
          onSubmit={handleUpdateStage}
          submitting={submitting}
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
                disabled={submitting}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
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
          onClose={() => {
            setCreateTaskOpen(false);
            setTaskParentStageId(null);
          }}
          onSubmit={(data) => handleCreateTask(taskParentStageId, data)}
          submitting={submitting}
        />
      )}
      {selectedTask && (
        <TaskFormModal
          open={editTaskOpen}
          mode="edit"
          stageId={selectedTask.stageId}
          initial={selectedTask}
          onClose={() => {
            setEditTaskOpen(false);
            setSelectedTask(null);
          }}
          onSubmit={handleUpdateTask}
          submitting={submitting}
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
                disabled={submitting}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 flex items-center gap-2 disabled:opacity-50"
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

// ---- StageCard ----
function StageCard({
  stage,
  tasks,
  onEditStage,
  onDeleteStage,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: {
  stage: CropGrowthStageResponse;
  tasks: CropGrowthTaskResponse[];
  onEditStage: () => void;
  onDeleteStage: () => void;
  onAddTask: () => void;
  onEditTask: (t: CropGrowthTaskResponse) => void;
  onDeleteTask: (t: CropGrowthTaskResponse) => void;
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

          {(stage.growthIndicators || stage.commonDiseases) && (
            <div className="grid grid-cols-2 gap-3">
              {stage.growthIndicators && (
                <div className="bg-[#f0fdf9] rounded-lg p-3 border border-[#ccfbf1]">
                  <p className="text-[10px] font-semibold text-[#009689] mb-1">
                    Chỉ số sinh trưởng
                  </p>
                  <p className="text-xs text-[#334155]">
                    {stage.growthIndicators}
                  </p>
                </div>
              )}
              {stage.commonDiseases && (
                <div className="bg-[#fff7ed] rounded-lg p-3 border border-[#fed7aa]">
                  <p className="text-[10px] font-semibold text-orange-500 mb-1">
                    Bệnh thường gặp
                  </p>
                  <p className="text-xs text-[#334155]">
                    {stage.commonDiseases}
                  </p>
                </div>
              )}
            </div>
          )}

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
                Nhiệm vụ gợi ý ({tasks.length})
              </p>
              <button
                onClick={onAddTask}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#f0fdf9] text-[#009689] border border-[#009689] rounded-lg text-xs font-medium hover:bg-[#ccfbf1] transition-colors"
              >
                <Plus className="w-3 h-3" /> Thêm nhiệm vụ
              </button>
            </div>
            {tasks.length === 0 ? (
              <p className="text-xs text-[#94a3b8] text-center py-4">
                Chưa có nhiệm vụ nào
              </p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
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
                        {task.priority === 5 && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-medium rounded-full shrink-0">
                            Rất cao
                          </span>
                        )}
                        {task.priority === 4 && (
                          <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 text-[9px] font-medium rounded-full shrink-0">
                            Cao
                          </span>
                        )}
                        {task.priority === 3 && (
                          <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[9px] font-medium rounded-full shrink-0">
                            Trung bình
                          </span>
                        )}
                        {task.priority === 2 && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-medium rounded-full shrink-0">
                            Thấp
                          </span>
                        )}
                        {task.priority === 1 && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 text-[9px] font-medium rounded-full shrink-0">
                            Rất thấp
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
// ---- StageFormData ----
interface StageFormData {
  stageName: string;
  stageDescription: string;
  temperatureMin: number;
  humidityMin: number;
  soilMoistureMin: number;
  growthIndicators: string;
  commonDiseases: string;
  notes: string;
}

// ---- StageFormModal ----
function StageFormModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: CropGrowthStageResponse;
  onClose: () => void;
  onSubmit: (data: StageFormData) => void;
  submitting: boolean;
}) {
  const defaultForm: StageFormData = {
    stageName: "",
    stageDescription: "",
    temperatureMin: 15,
    humidityMin: 60,
    soilMoistureMin: 50,
    growthIndicators: "",
    commonDiseases: "",
    notes: "",
  };

  const [form, setForm] = useState<StageFormData>(
    initial
      ? {
          stageName: initial.stageName,
          stageDescription: initial.stageDescription,
          temperatureMin: initial.temperatureMin,
          humidityMin: initial.humidityMin,
          soilMoistureMin: initial.soilMoistureMin,
          growthIndicators: initial.growthIndicators,
          commonDiseases: initial.commonDiseases,
          notes: initial.notes,
        }
      : defaultForm,
  );

  useEffect(() => {
    setForm(
      initial
        ? {
            stageName: initial.stageName,
            stageDescription: initial.stageDescription,
            temperatureMin: initial.temperatureMin,
            humidityMin: initial.humidityMin,
            soilMoistureMin: initial.soilMoistureMin,
            growthIndicators: initial.growthIndicators,
            commonDiseases: initial.commonDiseases,
            notes: initial.notes,
          }
        : defaultForm,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const f = (key: keyof StageFormData, val: string | number) =>
    setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const numField = (label: string, key: keyof StageFormData, unit?: string) => (
    <div>
      <label className="block text-xs font-medium text-[#45556c] mb-1">
        {label}
        {unit && <span className="text-[#94a3b8] ml-1">({unit})</span>}
      </label>
      <input
        type="number"
        value={form[key] as number}
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
                disabled={submitting}
                className="px-4 py-2 bg-[#009689] text-white text-sm rounded-lg hover:bg-[#007f75] flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === "create" ? "Thêm giai đoạn" : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
// ---- TaskFormData ----
interface TaskFormData {
  taskName: string;
  taskDescription: string;
  frequency: string;
  durationMinutes: number;
  requiredTools: string;
  requiredMaterials: string;
  quantityPerUnit: number;
  quantityUnit: string;
  priority: number; // 1 = High, 2 = Medium, 3 = Low
  isMandatory: boolean;
  notes: string;
}

// ---- TaskFormModal ----
function TaskFormModal({
  open,
  mode,
  stageId,
  initial,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  mode: "create" | "edit";
  stageId: string;
  initial?: CropGrowthTaskResponse;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
  submitting: boolean;
}) {
  const defaultForm: TaskFormData = {
    taskName: "",
    taskDescription: "",
    frequency: "Hàng ngày",
    durationMinutes: 30,
    requiredTools: "",
    requiredMaterials: "",
    quantityPerUnit: 0,
    quantityUnit: "",
    priority: 3,
    isMandatory: false,
    notes: "",
  };

  const [form, setForm] = useState<TaskFormData>(
    initial
      ? {
          taskName: initial.taskName,
          taskDescription: initial.taskDescription,
          frequency: initial.frequency,
          durationMinutes: initial.durationMinutes,
          requiredTools: initial.requiredTools,
          requiredMaterials: initial.requiredMaterials,
          quantityPerUnit: initial.quantityPerUnit,
          quantityUnit: initial.quantityUnit,
          priority: initial.priority,
          isMandatory: initial.isMandatory,
          notes: initial.notes,
        }
      : defaultForm,
  );

  useEffect(() => {
    setForm(
      initial
        ? {
            taskName: initial.taskName,
            taskDescription: initial.taskDescription,
            frequency: initial.frequency,
            durationMinutes: initial.durationMinutes,
            requiredTools: initial.requiredTools,
            requiredMaterials: initial.requiredMaterials,
            quantityPerUnit: initial.quantityPerUnit,
            quantityUnit: initial.quantityUnit,
            priority: initial.priority,
            isMandatory: initial.isMandatory,
            notes: initial.notes,
          }
        : defaultForm,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const f = (key: keyof TaskFormData, val: string | number | boolean) =>
    setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  // stageId is passed in props but not needed in form state (caller handles it)
  void stageId;

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
                <option>Mỗi 2 ngày</option>
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
                onChange={(e) => f("priority", parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155]"
              >
                <option value={5}>5 – Rất cao</option>
                <option value={4}>4 – Cao</option>
                <option value={3}>3 – Trung bình</option>
                <option value={2}>2 – Thấp</option>
                <option value={1}>1 – Rất thấp</option>
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
                disabled={submitting}
                className="px-4 py-2 bg-[#009689] text-white text-sm rounded-lg hover:bg-[#007f75] flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === "create" ? "Thêm nhiệm vụ" : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Crop form validation ─────────────────────────────────────────────────────
interface CropFormErrors {
  name?: string;
  scientificName?: string;
  growthPeriod?: string;
  plantSpacing?: string;
}

function validateCropForm(formData: {
  name: string;
  scientificName: string;
  growthPeriod: string;
  plantSpacing: string;
}): CropFormErrors {
  const errors: CropFormErrors = {};
  if (!formData.name.trim()) {
    errors.name = "Vui lòng nhập tên cây trồng";
  } else if (formData.name.trim().length < 2) {
    errors.name = "Tên cây trồng phải có ít nhất 2 ký tự";
  } else if (formData.name.trim().length > 200) {
    errors.name = "Tên cây trồng không được quá 200 ký tự";
  }
  if (formData.scientificName.trim().length > 500) {
    errors.scientificName = "Tên khoa học không được quá 500 ký tự";
  }
  if (formData.growthPeriod.trim()) {
    const gp = parseInt(formData.growthPeriod);
    if (isNaN(gp) || gp < 1) {
      errors.growthPeriod = "Chu kỳ sinh trưởng phải là số dương";
    } else if (gp > 365) {
      errors.growthPeriod = "Chu kỳ sinh trưởng không nên quá 365 ngày";
    }
  }
  if (formData.plantSpacing.trim()) {
    const ps = parseFloat(formData.plantSpacing);
    if (isNaN(ps) || ps < 0) {
      errors.plantSpacing = "Khoảng cách trồng phải là số không âm";
    } else if (ps > 500) {
      errors.plantSpacing = "Khoảng cách trồng không nên quá 500 cm";
    }
  }
  return errors;
}

// Shared form data type — mirrors API fields only (no image/description)
type CropFormData = {
  name: string;
  scientificName: string;
  growthPeriod: string;
  plantSpacing: string;
  bedWidthDefault: string;
  pathWidthDefault: string;
  rowsPerBed: string;
  rowSpacing: string;
  status: CropStatus;
};

function CropFormFields({
  formData,
  setFormData,
  errors = {},
}: {
  formData: CropFormData;
  setFormData: (updater: (prev: CropFormData) => CropFormData) => void;
  errors?: CropFormErrors;
}) {
  return (
    <div className="space-y-4">
      {/* Row 1: Tên cây trồng + Tên khoa học */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#45556c] mb-1">
            Tên cây trồng <span className="text-red-400">*</span>
          </label>
          <input
            value={formData.name}
            onChange={(e) =>
              setFormData((p) => ({ ...p, name: e.target.value }))
            }
            className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155] ${errors.name ? "border-red-300 bg-red-50" : "border-[#e2e8f0]"}`}
            placeholder="Bắp Cải Trắng"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-500">{errors.name}</p>
          )}
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
            className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155] italic ${errors.scientificName ? "border-red-300 bg-red-50" : "border-[#e2e8f0]"}`}
            placeholder="Brassica oleracea"
          />
          {errors.scientificName && (
            <p className="mt-1 text-xs text-red-500">{errors.scientificName}</p>
          )}
        </div>
      </div>
      {/* Row 2: Chu kỳ sinh trưởng + Khoảng cách trồng */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#45556c] mb-1">
            Chu kỳ sinh trưởng (ngày)
          </label>
          <input
            type="number"
            min={1}
            value={formData.growthPeriod}
            onChange={(e) =>
              setFormData((p) => ({ ...p, growthPeriod: e.target.value }))
            }
            className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155] ${errors.growthPeriod ? "border-red-300 bg-red-50" : "border-[#e2e8f0]"}`}
            placeholder="105"
          />
          {errors.growthPeriod && (
            <p className="mt-1 text-xs text-red-500">{errors.growthPeriod}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-[#45556c] mb-1">
            Khoảng cách trồng (m)
          </label>
          <input
            type="number"
            step="0.01"
            min={0}
            value={formData.plantSpacing}
            onChange={(e) =>
              setFormData((p) => ({ ...p, plantSpacing: e.target.value }))
            }
            className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155] ${errors.plantSpacing ? "border-red-300 bg-red-50" : "border-[#e2e8f0]"}`}
            placeholder="0.45"
          />
          {errors.plantSpacing && (
            <p className="mt-1 text-xs text-red-500">{errors.plantSpacing}</p>
          )}
        </div>
      </div>
      {/* Row 3: Rộng luống + Rộng lối đi */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#45556c] mb-1">
            Chiều rộng luống (tối thiểu) (m)
          </label>
          <input
            type="number"
            step="0.01"
            min={0}
            value={formData.bedWidthDefault}
            onChange={(e) =>
              setFormData((p) => ({ ...p, bedWidthDefault: e.target.value }))
            }
            className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
            placeholder="0.7"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#45556c] mb-1">
            Khoảng cách lối đi giữa các luống (m)
          </label>
          <input
            type="number"
            step="0.01"
            min={0}
            value={formData.pathWidthDefault}
            onChange={(e) =>
              setFormData((p) => ({ ...p, pathWidthDefault: e.target.value }))
            }
            className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
            placeholder="0.5"
          />
        </div>
      </div>
      {/* Row 4: Hàng / luống + Khoảng cách hàng */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#45556c] mb-1">
            Hàng / luống
          </label>
          <input
            type="number"
            min={1}
            value={formData.rowsPerBed}
            onChange={(e) =>
              setFormData((p) => ({ ...p, rowsPerBed: e.target.value }))
            }
            className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
            placeholder="1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#45556c] mb-1">
            Khoảng cách hàng (m)
          </label>
          <input
            type="number"
            step="0.01"
            min={0}
            value={formData.rowSpacing}
            onChange={(e) =>
              setFormData((p) => ({ ...p, rowSpacing: e.target.value }))
            }
            className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] text-[#334155]"
            placeholder="0.55"
          />
        </div>
      </div>
      {/* Row 5: Trạng thái */}
      <div>
        <label className="block text-sm font-medium text-[#45556c] mb-1">
          Trạng thái
        </label>
        <select
          value={formData.status}
          onChange={(e) =>
            setFormData((p) => ({
              ...p,
              status: e.target.value as CropStatus,
            }))
          }
          className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155]"
        >
          <option value="Đang sử dụng">Đang sử dụng</option>
          <option value="Không sử dụng">Không sử dụng</option>
        </select>
      </div>
    </div>
  );
}

const defaultFormData = {
  name: "",
  scientificName: "",
  growthPeriod: "",
  plantSpacing: "",
  bedWidthDefault: "",
  pathWidthDefault: "",
  rowsPerBed: "",
  rowSpacing: "",
  status: "Đang sử dụng" as CropStatus,
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
  const [formErrors, setFormErrors] = useState<CropFormErrors>({});
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateCropForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onCreate({
      name: formData.name.trim(),
      scientificName: formData.scientificName.trim(),
      growthPeriod: parseInt(formData.growthPeriod) || 0,
      plantSpacing: parseFloat(formData.plantSpacing) || 0,
      bedWidthDefault: parseFloat(formData.bedWidthDefault) || 0,
      pathWidthDefault: parseFloat(formData.pathWidthDefault) || 0,
      rowsPerBed: parseInt(formData.rowsPerBed) || 0,
      rowSpacing: parseFloat(formData.rowSpacing) || 0,
      status: formData.status,
      compatibleSoils: [],
    });
    setFormData(defaultFormData);
    setFormErrors({});
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
            <CropFormFields
              formData={formData}
              setFormData={(updater) => {
                setFormData((prev) => updater(prev));
                setFormErrors({});
              }}
              errors={formErrors}
            />
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
  const [formData, setFormData] = useState<CropFormData>({
    name: crop.name,
    scientificName: crop.scientificName,
    growthPeriod: crop.growthPeriod.toString(),
    plantSpacing: crop.plantSpacing.toString(),
    bedWidthDefault: crop.bedWidthDefault.toString(),
    pathWidthDefault: crop.pathWidthDefault.toString(),
    rowsPerBed: crop.rowsPerBed.toString(),
    rowSpacing: crop.rowSpacing.toString(),
    status: crop.status,
  });
  const [formErrors, setFormErrors] = useState<CropFormErrors>({});
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateCropForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onUpdate({
      ...crop,
      name: formData.name.trim(),
      scientificName: formData.scientificName.trim(),
      growthPeriod: parseInt(formData.growthPeriod) || 0,
      plantSpacing: parseFloat(formData.plantSpacing) || 0,
      bedWidthDefault: parseFloat(formData.bedWidthDefault) || 0,
      pathWidthDefault: parseFloat(formData.pathWidthDefault) || 0,
      rowsPerBed: parseInt(formData.rowsPerBed) || 0,
      rowSpacing: parseFloat(formData.rowSpacing) || 0,
      status: formData.status,
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
            <CropFormFields
              formData={formData}
              setFormData={(updater) => {
                setFormData((prev) => updater(prev));
                setFormErrors({});
              }}
              errors={formErrors}
            />
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

// ── Pagination Button ─────────────────────────────────────────────────────────
function CropPaginationBtn({
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
