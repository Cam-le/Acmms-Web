import { useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useQueries,
} from "@tanstack/react-query";
import { useToast } from "../components/ui/useToast";
import { ToastContainer } from "../components/ui/ToastContainer";
import {
  Sprout,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  ChevronRight,
  ArrowUpDown,
  X,
  Loader2,
  WifiOff,
  TrendingUp,
  Thermometer,
  Droplets,
  ClipboardList,
  List,
  Layers,
  Edit,
  Trash2,
  Plus,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import {
  api,
  CropResponse,
  CompatibleSoil,
  CropGrowthStageResponse,
  CropGrowthTaskResponse,
} from "../../api/client";
import { qk } from "../../api/queryKeys";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { PageHeader } from "../components/ui/PageHeader";
import { SearchInput } from "../components/ui/SearchInput";
import { Pagination } from "../components/ui/Pagination";
import { LoadingState } from "../components/ui/LoadingState";
import { EmptyState } from "../components/ui/EmptyState";
import { RowActions } from "../components/ui/RowActions";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Tabs } from "../components/ui/Tabs";
import { usePagination } from "../hooks/usePagination";
import {
  cropStatusTone,
  cropStatusLabel,
  soilCompatibilityTone,
  soilCompatibilityLabel,
} from "../utils/status";

// ─── Types ────────────────────────────────────────────────────────────────────

type CropStatus = "Đang sử dụng" | "Không sử dụng";

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

function normaliseStatus(raw?: string): CropStatus {
  if (!raw) return "Không sử dụng";
  const s = raw.trim().toLowerCase();
  if (s === "active" || s === "đang sử dụng" || s === "hoạt động")
    return "Đang sử dụng";
  return "Không sử dụng";
}

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

const PAGE_SIZE = 8;

const CROP_TABS = [
  { value: "list" as const, label: "Danh sách cây trồng", icon: List },
  { value: "growth" as const, label: "Hướng dẫn theo dõi", icon: TrendingUp },
] as const;

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CropsPage() {
  const { toasts, showToast, dismissToast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"list" | "growth">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"growthPeriod" | "status" | null>(
    null,
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<CropEx | null>(null);
  const [cropToDelete, setCropToDelete] = useState<CropEx | null>(null);

  // ── Read: crop list ──
  const cropsQuery = useQuery({
    queryKey: qk.crops.list(),
    queryFn: () => api.getCrops(),
  });

  // Map + filter at render time so we always work from raw cache data.
  const crops = (cropsQuery.data ?? [])
    .filter((c) => c != null && c.cropId)
    .map(mapCrop);
  const loading =
    cropsQuery.isLoading ||
    (cropsQuery.isFetching && cropsQuery.data === undefined);
  // Expose fetch error only when we have no cached data to show
  const fetchError =
    cropsQuery.isError && cropsQuery.data === undefined
      ? cropsQuery.error
      : null;
  useEffect(() => {
    if (cropsQuery.error) {
      showToast(
        cropsQuery.error instanceof Error
          ? cropsQuery.error.message
          : "Không thể tải danh sách cây trồng",
        "error",
      );
    }
  }, [cropsQuery.error, showToast]);

  // ── Mutation: create ──
  const createMutation = useMutation({
    mutationFn: (cropData: Omit<CropEx, "id">) =>
      api.createCrop({
        cropName: cropData.name,
        cropScientificName: cropData.scientificName || undefined,
        cropDefaultGrowthDays: cropData.growthPeriod || undefined,
        plantSpacing: cropData.plantSpacing || undefined,
        bedWidthDefault: cropData.bedWidthDefault || undefined,
        pathWidthDefault: cropData.pathWidthDefault || undefined,
        rowsPerBed: cropData.rowsPerBed || undefined,
        rowSpacing: cropData.rowSpacing || undefined,
        cropStatus: cropData.status === "Đang sử dụng" ? "Active" : "Inactive",
      }),
    onSuccess: () => {
      setCreateModalOpen(false);
      showToast("Tạo cây trồng thành công", "success");
      queryClient.invalidateQueries({ queryKey: qk.crops.all });
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : "Không thể tạo cây trồng",
        "error",
      );
    },
  });

  // ── Mutation: update ──
  const updateMutation = useMutation({
    mutationFn: (updatedCrop: CropEx) =>
      api.updateCrop(updatedCrop.id, {
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
      }),
    onSuccess: () => {
      setEditModalOpen(false);
      setSelectedCrop(null);
      showToast("Cập nhật cây trồng thành công", "success");
      queryClient.invalidateQueries({ queryKey: qk.crops.all });
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : "Không thể cập nhật cây trồng",
        "error",
      );
    },
  });

  // ── Mutation: delete ──
  const deleteMutation = useMutation({
    mutationFn: (cropId: string) => api.deleteCrop(cropId),
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setCropToDelete(null);
      showToast("Xóa cây trồng thành công", "success");
      queryClient.invalidateQueries({ queryKey: qk.crops.all });
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : "Không thể xóa cây trồng",
        "error",
      );
    },
  });

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
        (c.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.scientificName ?? "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
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

  const {
    page,
    setPage,
    reset,
    totalPages,
    pagedItems: pagedCrops,
  } = usePagination(filteredCrops, PAGE_SIZE);

  useEffect(() => {
    reset();
  }, [searchQuery]);

  const SortIcon = ({ field }: { field: "growthPeriod" | "status" }) => {
    if (sortField !== field)
      return <ArrowUpDown className="w-3.5 h-3.5 text-ink-400" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-primary" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-primary" />
    );
  };

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <PageHeader
        icon={Sprout}
        title="Cây Trồng"
        subtitle="Quản lý giống cây trồng"
        actions={
          activeTab === "list" ? (
            <Button leadingIcon={Plus} onClick={() => setCreateModalOpen(true)}>
              Thêm cây trồng
            </Button>
          ) : undefined
        }
      />

      <Tabs value={activeTab} onChange={setActiveTab} tabs={CROP_TABS} />

      {activeTab === "growth" && (
        <GrowthStagesTab crops={crops} loading={loading} />
      )}

      {activeTab === "list" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SearchInput
              value={searchQuery}
              onChange={(v) => setSearchQuery(v)}
              placeholder="Tìm kiếm theo tên cây trồng..."
              className="flex-1 min-w-[200px]"
            />
            <Button
              variant="secondary"
              leadingIcon={RefreshCw}
              onClick={() => cropsQuery.refetch()}
              loading={cropsQuery.isFetching}
            >
              Cập nhật
            </Button>
          </div>

          <div className="bg-surface rounded-card border border-border shadow-card overflow-hidden">
            {loading ? (
              <LoadingState />
            ) : fetchError ? (
              <EmptyState
                icon={Sprout}
                title="Không thể tải danh sách cây trồng"
                message={
                  fetchError instanceof Error
                    ? fetchError.message
                    : "Đã xảy ra lỗi. Vui lòng thử lại."
                }
                action={
                  <Button
                    variant="secondary"
                    onClick={() => cropsQuery.refetch()}
                  >
                    Thử lại
                  </Button>
                }
              />
            ) : filteredCrops.length === 0 ? (
              <EmptyState
                icon={Sprout}
                message="Không tìm thấy cây trồng nào"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-surface-alt border-b border-border">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-ink-500 uppercase tracking-wider">
                        Cây trồng
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-ink-500 uppercase tracking-wider">
                        Tên khoa học
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-ink-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort("growthPeriod")}
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          Chu kỳ <SortIcon field="growthPeriod" />
                        </button>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-ink-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort("status")}
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          Trạng thái <SortIcon field="status" />
                        </button>
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-ink-500 uppercase tracking-wider">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pagedCrops.map((crop) => (
                      <tr
                        key={crop.id}
                        className="hover:bg-surface-alt transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-50 rounded-btn flex items-center justify-center shrink-0">
                              <ImageIcon className="w-5 h-5 text-primary" />
                            </div>
                            <span className="font-medium text-primary-700 text-sm">
                              {crop.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-ink-500 italic">
                          {crop.scientificName || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-ink-500 whitespace-nowrap">
                          {crop.growthPeriod > 0
                            ? `${crop.growthPeriod} ngày`
                            : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge
                            label={crop.status}
                            tone={cropStatusTone(crop.status)}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <RowActions
                            align="center"
                            onView={() => {
                              setSelectedCrop(crop);
                              setViewModalOpen(true);
                            }}
                            onEdit={() => {
                              setSelectedCrop(crop);
                              setEditModalOpen(true);
                            }}
                            onDelete={() => {
                              setCropToDelete(crop);
                              setDeleteDialogOpen(true);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {filteredCrops.length > 0 && (
              <div className="border-t border-border px-4">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  showLabel
                  totalItems={filteredCrops.length}
                  pageSize={PAGE_SIZE}
                  itemLabel="cây trồng"
                />
              </div>
            )}
          </div>

          {/* View Modal */}
          {selectedCrop && (
            <Modal
              open={viewModalOpen}
              onOpenChange={(o) => {
                setViewModalOpen(o);
                if (!o) setSelectedCrop(null);
              }}
              title={selectedCrop.name}
              size="lg"
              footer={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setViewModalOpen(false);
                    setSelectedCrop(null);
                  }}
                >
                  Đóng
                </Button>
              }
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-primary-50 rounded-card flex items-center justify-center shrink-0">
                  <Sprout className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <div className="italic text-sm text-ink-500">
                    {selectedCrop.scientificName || "—"}
                  </div>
                  <StatusBadge
                    label={selectedCrop.status}
                    tone={cropStatusTone(selectedCrop.status)}
                    className="mt-1"
                  />
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
                    label: "Số hàng trên luống",
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
                    className="flex justify-between py-2 border-b border-surface-subtle"
                  >
                    <span className="text-sm text-ink-500">{label}</span>
                    <span className="text-sm font-medium text-primary-700">
                      {value}
                    </span>
                  </div>
                ))}
                <div className="py-2 border-b border-surface-subtle">
                  <span className="text-sm text-ink-500">Loại đất phù hợp</span>
                  {(selectedCrop.compatibleSoils ?? []).length === 0 ? (
                    <span className="block text-sm font-medium text-primary-700 mt-0.5">
                      —
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {(selectedCrop.compatibleSoils ?? []).map(
                        (s: CompatibleSoil) => (
                          <StatusBadge
                            key={s.soilId}
                            label={`${s.soilName} · ${soilCompatibilityLabel(s.compatibility)}`}
                            tone={soilCompatibilityTone(s.compatibility)}
                            size="sm"
                          />
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Modal>
          )}

          {/* Create Modal */}
          <CreateCropModal
            open={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            onCreate={(cropData) => createMutation.mutate(cropData)}
            submitting={createMutation.isPending}
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
              onUpdate={(updatedCrop) => updateMutation.mutate(updatedCrop)}
              submitting={updateMutation.isPending}
            />
          )}

          {/* Delete Dialog */}
          <ConfirmDialog
            open={deleteDialogOpen}
            onOpenChange={(o) => {
              setDeleteDialogOpen(o);
              if (!o) setCropToDelete(null);
            }}
            title="Xóa cây trồng"
            description={
              <>
                Bạn có chắc muốn xóa <strong>{cropToDelete?.name}</strong>? Hành
                động này không thể hoàn tác.
              </>
            }
            loading={deleteMutation.isPending}
            onConfirm={() => {
              if (cropToDelete) deleteMutation.mutate(cropToDelete.id);
            }}
          />
        </>
      )}
    </div>
  );
}

// ─── GrowthStagesTab ──────────────────────────────────────────────────────────

function GrowthStagesTab({
  crops,
  loading,
}: {
  crops: CropEx[];
  loading: boolean;
}) {
  const { toasts, showToast, dismissToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);

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

  // ── Read: stages for selected crop ──
  const stagesQuery = useQuery({
    queryKey: qk.crops.stages(selectedCropId ?? ""),
    queryFn: () => api.getCropGrowthStagesByCrop(selectedCropId!),
    enabled: !!selectedCropId,
  });

  const stages = stagesQuery.data ?? [];
  const stagesLoading = stagesQuery.isLoading;
  const stagesError = !!stagesQuery.error;

  // ── Read: tasks for each stage (parallel) ──
  const taskQueries = useQueries({
    queries: stages.map((s) => ({
      queryKey: qk.crops.stageTasks(s.stageId),
      queryFn: () => api.getCropGrowthTasksByStage(s.stageId),
      // Keep previous task data when stages change, to avoid flash
      placeholderData: [] as CropGrowthTaskResponse[],
    })),
  });

  // Build the same tasksMap shape the UI already uses
  const tasksMap: Record<string, CropGrowthTaskResponse[]> = Object.fromEntries(
    stages.map((s, i) => [s.stageId, taskQueries[i]?.data ?? []]),
  );

  // ── Stage mutations ──
  const createStageMutation = useMutation({
    mutationFn: (data: StageFormData) =>
      api.createCropGrowthStage({
        cropId: selectedCropId!,
        stageName: data.stageName,
        stageDescription: data.stageDescription || undefined,
        temperatureMin: data.temperatureMin,
        humidityMin: data.humidityMin,
        soilMoistureMin: data.soilMoistureMin,
        growthIndicators: data.growthIndicators || undefined,
        commonDiseases: data.commonDiseases || undefined,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      setCreateStageOpen(false);
      showToast("Tạo giai đoạn thành công", "success");
      queryClient.invalidateQueries({
        queryKey: qk.crops.stages(selectedCropId!),
      });
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : "Không thể tạo giai đoạn",
        "error",
      );
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: (data: StageFormData) =>
      api.updateCropGrowthStage(selectedStage!.stageId, {
        cropId: selectedStage!.cropId,
        stageName: data.stageName,
        stageDescription: data.stageDescription || undefined,
        temperatureMin: data.temperatureMin,
        humidityMin: data.humidityMin,
        soilMoistureMin: data.soilMoistureMin,
        growthIndicators: data.growthIndicators || undefined,
        commonDiseases: data.commonDiseases || undefined,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      setEditStageOpen(false);
      setSelectedStage(null);
      showToast("Cập nhật giai đoạn thành công", "success");
      queryClient.invalidateQueries({
        queryKey: qk.crops.stages(selectedCropId!),
      });
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : "Không thể cập nhật giai đoạn",
        "error",
      );
    },
  });

  const deleteStageMutation = useMutation({
    mutationFn: (stageId: string) => api.deleteCropGrowthStage(stageId),
    onSuccess: (_data, stageId) => {
      setDeleteStageOpen(false);
      setSelectedStage(null);
      showToast("Xóa giai đoạn thành công", "success");
      queryClient.invalidateQueries({
        queryKey: qk.crops.stages(selectedCropId!),
      });
      // Also remove the now-orphaned task cache entry
      queryClient.removeQueries({ queryKey: qk.crops.stageTasks(stageId) });
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : "Không thể xóa giai đoạn",
        "error",
      );
    },
  });

  // ── Task mutations ──
  const createTaskMutation = useMutation({
    mutationFn: ({ stageId, data }: { stageId: string; data: TaskFormData }) =>
      api.createCropGrowthTask({
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
      }),
    onSuccess: (_data, variables) => {
      setCreateTaskOpen(false);
      showToast("Tạo nhiệm vụ thành công", "success");
      queryClient.invalidateQueries({
        queryKey: qk.crops.stageTasks(variables.stageId),
      });
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : "Không thể tạo nhiệm vụ",
        "error",
      );
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: (data: TaskFormData) =>
      api.updateCropGrowthTask(selectedTask!.growthTaskId, {
        stageId: selectedTask!.stageId,
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
      }),
    onSuccess: () => {
      setEditTaskOpen(false);
      setSelectedTask(null);
      showToast("Cập nhật nhiệm vụ thành công", "success");
      if (selectedTask) {
        queryClient.invalidateQueries({
          queryKey: qk.crops.stageTasks(selectedTask.stageId),
        });
      }
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : "Không thể cập nhật nhiệm vụ",
        "error",
      );
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: ({ taskId, stageId }: { taskId: string; stageId: string }) =>
      api.deleteCropGrowthTask(taskId),
    onSuccess: (_data, variables) => {
      setDeleteTaskOpen(false);
      setSelectedTask(null);
      showToast("Xóa nhiệm vụ thành công", "success");
      queryClient.invalidateQueries({
        queryKey: qk.crops.stageTasks(variables.stageId),
      });
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : "Không thể xóa nhiệm vụ",
        "error",
      );
    },
  });

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
              onClick={() =>
                queryClient.invalidateQueries({
                  queryKey: qk.crops.stages(selectedCropId!),
                })
              }
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
          onSubmit={(data) => createStageMutation.mutate(data)}
          submitting={createStageMutation.isPending}
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
          onSubmit={(data) => updateStageMutation.mutate(data)}
          submitting={updateStageMutation.isPending}
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
                onClick={(e) => {
                  e.preventDefault();
                  if (selectedStage)
                    deleteStageMutation.mutate(selectedStage.stageId);
                }}
                disabled={deleteStageMutation.isPending}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 flex items-center gap-2 disabled:opacity-50"
              >
                {deleteStageMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
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
          onSubmit={(data) =>
            createTaskMutation.mutate({ stageId: taskParentStageId, data })
          }
          submitting={createTaskMutation.isPending}
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
          onSubmit={(data) => updateTaskMutation.mutate(data)}
          submitting={updateTaskMutation.isPending}
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
                onClick={(e) => {
                  e.preventDefault();
                  if (selectedTask)
                    deleteTaskMutation.mutate({
                      taskId: selectedTask.growthTaskId,
                      stageId: selectedTask.stageId,
                    });
                }}
                disabled={deleteTaskMutation.isPending}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 flex items-center gap-2 disabled:opacity-50"
              >
                {deleteTaskMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Xóa
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
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
  priority: number;
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink-600 mb-1.5">
            Tên cây trồng <span className="text-status-danger-fg">*</span>
          </label>
          <input
            value={formData.name}
            onChange={(e) =>
              setFormData((p) => ({ ...p, name: e.target.value }))
            }
            className={`w-full px-3 py-2.5 border rounded-btn text-sm focus:outline-none focus:ring-2 focus:ring-primary text-ink-700 bg-surface ${errors.name ? "border-status-danger-fg/40 bg-status-danger-bg/30" : "border-border-strong"}`}
            placeholder="Bắp Cải Trắng"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-status-danger-fg">{errors.name}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-600 mb-1.5">
            Tên khoa học
          </label>
          <input
            value={formData.scientificName}
            onChange={(e) =>
              setFormData((p) => ({ ...p, scientificName: e.target.value }))
            }
            className={`w-full px-3 py-2.5 border rounded-btn text-sm focus:outline-none focus:ring-2 focus:ring-primary text-ink-700 italic bg-surface ${errors.scientificName ? "border-status-danger-fg/40 bg-status-danger-bg/30" : "border-border-strong"}`}
            placeholder="Brassica oleracea"
          />
          {errors.scientificName && (
            <p className="mt-1 text-xs text-status-danger-fg">
              {errors.scientificName}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink-600 mb-1.5">
            Chu kỳ sinh trưởng (ngày)
          </label>
          <input
            type="number"
            min={1}
            value={formData.growthPeriod}
            onChange={(e) =>
              setFormData((p) => ({ ...p, growthPeriod: e.target.value }))
            }
            className={`w-full px-3 py-2.5 border rounded-btn text-sm focus:outline-none focus:ring-2 focus:ring-primary text-ink-700 bg-surface ${errors.growthPeriod ? "border-status-danger-fg/40 bg-status-danger-bg/30" : "border-border-strong"}`}
            placeholder="105"
          />
          {errors.growthPeriod && (
            <p className="mt-1 text-xs text-status-danger-fg">
              {errors.growthPeriod}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-600 mb-1.5">
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
            className={`w-full px-3 py-2.5 border rounded-btn text-sm focus:outline-none focus:ring-2 focus:ring-primary text-ink-700 bg-surface ${errors.plantSpacing ? "border-status-danger-fg/40 bg-status-danger-bg/30" : "border-border-strong"}`}
            placeholder="0.45"
          />
          {errors.plantSpacing && (
            <p className="mt-1 text-xs text-status-danger-fg">
              {errors.plantSpacing}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink-600 mb-1.5">
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
            className="w-full px-3 py-2.5 border border-border-strong rounded-btn text-sm focus:outline-none focus:ring-2 focus:ring-primary text-ink-700 bg-surface"
            placeholder="0.7"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-600 mb-1.5">
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
            className="w-full px-3 py-2.5 border border-border-strong rounded-btn text-sm focus:outline-none focus:ring-2 focus:ring-primary text-ink-700 bg-surface"
            placeholder="0.5"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink-600 mb-1.5">
            Số hàng trên luống
          </label>
          <input
            type="number"
            min={1}
            value={formData.rowsPerBed}
            onChange={(e) =>
              setFormData((p) => ({ ...p, rowsPerBed: e.target.value }))
            }
            className="w-full px-3 py-2.5 border border-border-strong rounded-btn text-sm focus:outline-none focus:ring-2 focus:ring-primary text-ink-700 bg-surface"
            placeholder="1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-600 mb-1.5">
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
            className="w-full px-3 py-2.5 border border-border-strong rounded-btn text-sm focus:outline-none focus:ring-2 focus:ring-primary text-ink-700 bg-surface"
            placeholder="0.55"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-ink-600 mb-1.5">
          Trạng thái
        </label>
        <select
          value={formData.status}
          onChange={(e) =>
            setFormData((p) => ({ ...p, status: e.target.value as CropStatus }))
          }
          className="w-full px-3 py-2.5 border border-border-strong rounded-btn text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface text-ink-700"
        >
          <option value="Đang sử dụng">Đang sử dụng</option>
          <option value="Không sử dụng">Không sử dụng</option>
        </select>
      </div>
    </div>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateCropForm(formData: {
  name: string;
  scientificName: string;
  growthPeriod: string;
  plantSpacing: string;
}): CropFormErrors {
  const errors: CropFormErrors = {};
  if (!formData.name.trim()) errors.name = "Vui lòng nhập tên cây trồng";
  else if (formData.name.trim().length < 2)
    errors.name = "Tên cây trồng phải có ít nhất 2 ký tự";
  else if (formData.name.trim().length > 200)
    errors.name = "Tên cây trồng không được quá 200 ký tự";
  if (formData.scientificName.trim().length > 500)
    errors.scientificName = "Tên khoa học không được quá 500 ký tự";
  if (formData.growthPeriod.trim()) {
    const gp = parseInt(formData.growthPeriod);
    if (isNaN(gp) || gp < 1)
      errors.growthPeriod = "Chu kỳ sinh trưởng phải là số dương";
    else if (gp > 365)
      errors.growthPeriod = "Chu kỳ sinh trưởng không nên quá 365 ngày";
  }
  if (formData.plantSpacing.trim()) {
    const ps = parseFloat(formData.plantSpacing);
    if (isNaN(ps) || ps < 0)
      errors.plantSpacing = "Khoảng cách trồng phải là số không âm";
    else if (ps > 500)
      errors.plantSpacing = "Khoảng cách trồng không nên quá 500 cm";
  }
  return errors;
}

const defaultFormData: CropFormData = {
  name: "",
  scientificName: "",
  growthPeriod: "",
  plantSpacing: "",
  bedWidthDefault: "",
  pathWidthDefault: "",
  rowsPerBed: "",
  rowSpacing: "",
  status: "Đang sử dụng",
};

// ─── Create Crop Modal ────────────────────────────────────────────────────────

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
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Thêm giống cây mới"
      size="2xl"
      onSubmit={handleSubmit}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={submitting} leadingIcon={Sprout}>
            Tạo cây trồng
          </Button>
        </>
      }
    >
      <CropFormFields
        formData={formData}
        setFormData={(updater) => {
          setFormData((prev) => updater(prev));
          setFormErrors({});
        }}
        errors={formErrors}
      />
    </Modal>
  );
}

// ─── Edit Crop Modal ──────────────────────────────────────────────────────────

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
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Chỉnh sửa cây trồng"
      size="2xl"
      onSubmit={handleSubmit}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={submitting}>
            Lưu thay đổi
          </Button>
        </>
      }
    >
      <CropFormFields
        formData={formData}
        setFormData={(updater) => {
          setFormData((prev) => updater(prev));
          setFormErrors({});
        }}
        errors={formErrors}
      />
    </Modal>
  );
}
