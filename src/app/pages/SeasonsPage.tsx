import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "../../api/queryKeys";
import {
  Plus,
  Calendar,
  ArrowLeft,
  ChevronDown,
  CheckCircle,
  PlusCircle,
  Wheat,
  AlertTriangle,
  Check,
  Thermometer,
  Droplets,
  Sun,
  CloudRain,
  Cpu,
  MapPin,
  Eye,
  Pencil,
  Sprout,
  BarChart2,
  Package,
  TrendingUp,
  Activity,
  Clock,
  User,
  ChevronRight,
  NotebookPen,
} from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import {
  api,
  type SeasonResponse,
  type FarmResponse,
  type PlotResponse,
  type BedResponse,
  type CropResponse,
  type HarvestResponse,
  type HarvestDetailResponse,
  type HarvestRequest,
  type HarvestUpdateRequest,
  type HarvestDetailUpdateRequest,
  type GrowthTrackingResponse,
} from "../../api/client";
import { useToast } from "../components/ui/useToast";
import { ToastContainer } from "../components/ui/ToastContainer";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Pagination } from "../components/ui/Pagination";
import { SearchInput } from "../components/ui/SearchInput";
import { FormField } from "../components/ui/FormField";
import { FormSelect } from "../components/ui/FormSelect";
import { FormTextarea } from "../components/ui/FormTextarea";
import { LoadingState } from "../components/ui/LoadingState";
import { EmptyState } from "../components/ui/EmptyState";
import { RowActions } from "../components/ui/RowActions";
import { usePagination } from "../hooks/usePagination";
import { formatDate } from "../utils/format";
import {
  seasonStatusTone,
  seasonStatusLabel,
  harvestStatusTone,
  harvestStatusLabel,
} from "../utils/status";
import { bedSortTokens, compareTokenArrays } from "../utils/sort";
import type { BadgeTone } from "../components/ui/StatusBadge";

// ─── Types ─────────────────────────────────────────────────────────────────────

type SeasonStatusApi = "Planned" | "On-Going" | "Harvested" | "Closed";

interface Season {
  id: string;
  name: string;
  farm: string;
  farmId: string;
  startDate: string;
  endDate: string;
  description: string;
  seasonNotes: string;
  status: string; // English API value kept in state
  harvestsCount: number;
  tasksCount: number;
}

interface HarvestItem {
  harvestId: string;
  plotId: string;
  plotName: string;
  cropId: string;
  cropName: string;
  expectedDate: string;
  expectedQuantity: number;
  unit: string;
  status: string;
  detailsCount: number;
  harvestedBedsCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "Planned", label: "Lên kế hoạch" },
  { value: "On-Going", label: "Đang canh tác" },
  { value: "Harvested", label: "Đã thu hoạch" },
  { value: "Closed", label: "Đã kết thúc" },
];

function mapSeasonResponse(s: SeasonResponse, farms: FarmResponse[]): Season {
  const farm = farms.find((f) => f.farmId === s.farmId);
  return {
    id: s.seasonId ?? "",
    name: s.seasonName ?? "(Không có tên)",
    farm: farm?.farmName ?? s.farmId ?? "—",
    farmId: s.farmId ?? "",
    startDate: s.seasonStartDate ?? "",
    endDate: s.seasonEndDate ?? "",
    description: s.description ?? "",
    seasonNotes: s.seasonNotes ?? "",
    status: s.status ?? "Planned",
    harvestsCount: (s as any).harvestsCount ?? 0,
    tasksCount: (s as any).tasksCount ?? 0,
  };
}

function bedSortKey(name: string | null | undefined): number[] {
  const tokens = bedSortTokens(name ?? "");
  return tokens.length > 0 ? tokens : [Infinity];
}

function sortBeds<T extends { name: string; area: string }>(beds: T[]): T[] {
  return [...beds].sort((a, b) => {
    const areaCmp = a.area.localeCompare(b.area, "vi");
    if (areaCmp !== 0) return areaCmp;
    return compareTokenArrays(bedSortKey(a.name), bedSortKey(b.name));
  });
}

// ─── Growth Tracking helpers ──────────────────────────────────────────────────

function trackingStatusTone(s: string): BadgeTone {
  const n = s.toLowerCase();
  if (n === "completed") return "success";
  if (n === "in-progress" || n === "in_progress") return "info";
  if (n === "cancelled" || n === "canceled") return "danger";
  return "neutral";
}

function trackingStatusLabel(s: string): string {
  const n = s.toLowerCase();
  if (n === "completed") return "Đã hoàn thành";
  if (n === "in-progress" || n === "in_progress") return "Đang thực hiện";
  if (n === "cancelled" || n === "canceled") return "Đã hủy";
  return s;
}

function healthStatusTone(s: string | undefined): BadgeTone {
  if (!s) return "neutral";
  const n = s.toLowerCase();
  if (n === "good") return "success";
  if (n === "ok") return "success";
  if (n === "average" || n === "medium") return "warning";
  if (n === "bad" || n === "poor") return "danger";
  return "neutral";
}

function healthStatusLabel(s: string | undefined): string {
  if (!s) return "—";
  const n = s.toLowerCase();
  if (n === "good") return "Tốt";
  if (n === "ok") return "Ổn";
  if (n === "average" || n === "medium") return "Trung bình";
  if (n === "bad" || n === "poor") return "Kém";
  return s;
}

// ─── GrowthTrackingModal ──────────────────────────────────────────────────────
// This component has non-standard fetch behavior (fire-and-forget with
// side-effect callback). Kept as useEffect rather than useQuery because
// onFetched needs to report count back to parent — TanStack Query's
// onSuccess was removed in v5. The pattern here is intentional.

function GrowthTrackingModal({
  harvestDetailId,
  bedName,
  onClose,
  onFetched,
}: {
  harvestDetailId: string;
  bedName: string;
  onClose: () => void;
  /** Called once fetch resolves — reports count so caller can update indicator */
  onFetched: (harvestDetailId: string, count: number) => void;
}) {
  const { showToast, toasts, dismissToast } = useToast();
  const [trackings, setTrackings] = React.useState<GrowthTrackingResponse[]>(
    [],
  );
  const [loading, setLoading] = React.useState(true);
  const [selectedTracking, setSelectedTracking] =
    React.useState<GrowthTrackingResponse | null>(null);
  const [staffNames, setStaffNames] = React.useState<Record<string, string>>(
    {},
  );
  const [staffLoading, setStaffLoading] = React.useState(false);

  // Fetch tracking records for this harvest detail
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getGrowthTrackingsByHarvestDetail(harvestDetailId)
      .then((res) => {
        const list = Array.isArray(res) ? res : [];
        if (!cancelled) {
          setTrackings(list);
          onFetched(harvestDetailId, list.length);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          showToast(
            err instanceof Error
              ? err.message
              : "Không thể tải theo dõi sinh trưởng",
            "error",
          );
          // Mark as checked-but-unknown (-1) so indicator doesn't stay neutral
          onFetched(harvestDetailId, -1);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [harvestDetailId]);

  // Batch-resolve staff names for all unique lastUpdatedBy IDs
  React.useEffect(() => {
    const ids = [
      ...new Set(trackings.map((t) => t.lastUpdatedBy).filter(Boolean)),
    ];
    if (ids.length === 0) return;
    setStaffLoading(true);
    Promise.all(
      ids.map((id) =>
        api
          .getStaff(id)
          .then((res) => ({ id, name: res.fullname ?? id }))
          .catch(() => ({ id, name: id })),
      ),
    ).then((results) => {
      const map: Record<string, string> = {};
      results.forEach(({ id, name }) => {
        map[id] = name;
      });
      setStaffNames(map);
      setStaffLoading(false);
    });
  }, [trackings]);

  return (
    <>
      <Modal
        open
        onOpenChange={(o) => !o && onClose()}
        title={`Theo dõi sinh trưởng — ${bedName}`}
        size="2xl"
      >
        {loading ? (
          <LoadingState message="Đang tải dữ liệu sinh trưởng..." />
        ) : trackings.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            message="Chưa có dữ liệu theo dõi sinh trưởng cho luống này."
          />
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-ink-400">
              {trackings.length} bản ghi · bấm vào hàng để xem chi tiết
            </p>
            <div className="overflow-x-auto rounded-btn border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface-alt">
                  <tr>
                    {[
                      "Giai đoạn",
                      "Trạng thái",
                      "Sức khỏe",
                      "Ngày bắt đầu",
                      "Ngày kết thúc",
                      "Quan sát lần cuối",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {trackings.map((t) => (
                    <tr
                      key={t.trackingId}
                      className="hover:bg-surface-alt transition-colors cursor-pointer"
                      onClick={() => setSelectedTracking(t)}
                    >
                      <td className="px-3 py-2.5 font-medium text-ink-800 whitespace-nowrap">
                        {t.stageName}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <StatusBadge
                          label={t.trackingStatus}
                          tone={trackingStatusTone(t.trackingStatus)}
                          size="sm"
                        />
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {t.healthStatus ? (
                          <StatusBadge
                            label={t.healthStatus}
                            tone={healthStatusTone(t.healthStatus)}
                            size="sm"
                          />
                        ) : (
                          <span className="text-ink-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-ink-500 whitespace-nowrap text-xs">
                        {formatDate(t.startDate)}
                      </td>
                      <td className="px-3 py-2.5 text-ink-500 whitespace-nowrap text-xs">
                        {t.endDate ? formatDate(t.endDate) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-ink-500 whitespace-nowrap text-xs">
                        {formatDate(t.lastObservedAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <ChevronRight className="w-4 h-4 text-ink-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Detail drill-down for a single tracking record */}
      {selectedTracking && (
        <Modal
          open
          onOpenChange={(o) => !o && setSelectedTracking(null)}
          title={`Chi tiết — ${selectedTracking.stageName}`}
          size="lg"
          nested
        >
          <div className="space-y-4">
            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                label={selectedTracking.trackingStatus}
                tone={trackingStatusTone(selectedTracking.trackingStatus)}
                icon={Activity}
              />
              {selectedTracking.healthStatus && (
                <StatusBadge
                  label={`Sức khỏe: ${selectedTracking.healthStatus}`}
                  tone={healthStatusTone(selectedTracking.healthStatus)}
                />
              )}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-surface-alt rounded-btn p-3">
                <p className="text-xs text-ink-400 mb-0.5">Cây trồng</p>
                <p className="font-medium text-ink-800">
                  {selectedTracking.cropName}
                </p>
              </div>
              <div className="bg-surface-alt rounded-btn p-3">
                <p className="text-xs text-ink-400 mb-0.5">Luống</p>
                <p className="font-medium text-ink-800 font-mono text-xs">
                  {selectedTracking.bedName}
                </p>
              </div>
              <div className="bg-surface-alt rounded-btn p-3">
                <p className="text-xs text-ink-400 mb-0.5">Ngày bắt đầu</p>
                <p className="font-medium text-ink-800">
                  {formatDate(selectedTracking.startDate)}
                </p>
              </div>
              <div className="bg-surface-alt rounded-btn p-3">
                <p className="text-xs text-ink-400 mb-0.5">Ngày kết thúc</p>
                <p className="font-medium text-ink-800">
                  {selectedTracking.endDate
                    ? formatDate(selectedTracking.endDate)
                    : "—"}
                </p>
              </div>
              {selectedTracking.actualHeight != null &&
                selectedTracking.actualHeight > 0 && (
                  <div className="bg-surface-alt rounded-btn p-3">
                    <p className="text-xs text-ink-400 mb-0.5">
                      Chiều cao thực tế (cm)
                    </p>
                    <p className="font-medium text-ink-800">
                      {selectedTracking.actualHeight}
                    </p>
                  </div>
                )}
              {selectedTracking.actualYield != null &&
                selectedTracking.actualYield > 0 && (
                  <div className="bg-surface-alt rounded-btn p-3">
                    <p className="text-xs text-ink-400 mb-0.5">
                      Sản lượng thực tế
                    </p>
                    <p className="font-medium text-ink-800">
                      {selectedTracking.actualYield}
                    </p>
                  </div>
                )}
              {(selectedTracking.delayDays ?? 0) > 0 && (
                <div className="bg-status-warning-bg rounded-btn p-3">
                  <p className="text-xs text-status-warning-fg mb-0.5">
                    Số ngày trễ
                  </p>
                  <p className="font-medium text-status-warning-fg">
                    {selectedTracking.delayDays} ngày
                  </p>
                </div>
              )}
              {selectedTracking.delayReason &&
                selectedTracking.delayReason !== "string" && (
                  <div className="bg-surface-alt rounded-btn p-3 col-span-2">
                    <p className="text-xs text-ink-400 mb-0.5">Lý do trễ</p>
                    <p className="font-medium text-ink-800">
                      {selectedTracking.delayReason}
                    </p>
                  </div>
                )}
            </div>

            {/* Notes */}
            {selectedTracking.notes && selectedTracking.notes !== "string" && (
              <div className="bg-surface-alt rounded-btn p-3 text-sm">
                <p className="text-xs text-ink-400 mb-1">Ghi chú</p>
                <p className="text-ink-700 leading-relaxed">
                  {selectedTracking.notes}
                </p>
              </div>
            )}

            {/* Footer meta */}
            <div className="border-t border-border pt-3 flex flex-col gap-1.5 text-xs text-ink-400">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Cập nhật bởi:{" "}
                  <span className="text-ink-600 font-medium">
                    {staffLoading
                      ? "Đang tải..."
                      : (staffNames[selectedTracking.lastUpdatedBy] ??
                        selectedTracking.lastUpdatedBy)}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Quan sát lần cuối:{" "}
                  {formatDate(selectedTracking.lastObservedAt)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Tạo lúc: {formatDate(selectedTracking.createdAt)}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

// ─── IoT sensor types (detail view) ───────────────────────────────────────────

interface IotRow {
  sensorDataId: string;
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  bedId: string;
  bedName: string | null;
  recordedAt: string;
  temperature: number;
  humidity: number;
  soilMoisture: number;
  light?: number;
  isRaining: boolean;
  isAlert: boolean;
}

// ─── Season List Page ──────────────────────────────────────────────────────────

const PAGE_SIZE_LIST = 8;

export function SeasonsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") || "list";
  const seasonId = searchParams.get("id");

  const { toasts, showToast, dismissToast } = useToast();
  const queryClient = useQueryClient();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [seasonToDelete, setSeasonToDelete] = useState<Season | null>(null);

  // ── Parallel queries for list data ───────────────────────────────────────
  // Raw data stored in cache; mapped at render time (same pattern as FarmPage).
  const seasonsQuery = useQuery({
    queryKey: qk.seasons.list(),
    queryFn: () => api.getSeasons(),
  });

  const farmsQuery = useQuery({
    queryKey: qk.farms.list(),
    queryFn: () => api.getFarms(),
  });

  const bedsQuery = useQuery({
    queryKey: qk.beds.list(),
    queryFn: () => api.getBeds(),
  });

  const cropsQuery = useQuery({
    queryKey: qk.crops.list(),
    queryFn: () => api.getCrops(),
  });

  const plotsQuery = useQuery({
    queryKey: qk.plots.list(),
    queryFn: () => api.getPlots(),
  });

  // Map + sort at render time so cache always holds raw API data.
  const rawFarms = farmsQuery.data ?? [];
  const farms: FarmResponse[] = Array.isArray(rawFarms) ? rawFarms : [];

  const seasons: Season[] = (() => {
    const raw = seasonsQuery.data;
    if (!Array.isArray(raw)) return [];
    return [...raw]
      .sort((a, b) => {
        const da = a.seasonStartDate ?? "";
        const db = b.seasonStartDate ?? "";
        return db.localeCompare(da); // most recent first
      })
      .map((s) => mapSeasonResponse(s, farms));
  })();

  const beds: BedResponse[] = (() => {
    const raw = bedsQuery.data;
    return Array.isArray(raw) ? raw : [];
  })();

  const crops: CropResponse[] = (() => {
    const raw = cropsQuery.data;
    if (!Array.isArray(raw)) return [];
    return raw.filter((c) => (c.cropStatus ?? "").toLowerCase() !== "inactive");
  })();

  const allPlots: PlotResponse[] = (() => {
    const raw = plotsQuery.data;
    return Array.isArray(raw) ? raw : [];
  })();

  // loading: true until all 5 parallel queries have resolved at least once.
  // Guard: if any is still fetching with no data yet, stay in loading state.
  const loading =
    seasonsQuery.isLoading ||
    farmsQuery.isLoading ||
    bedsQuery.isLoading ||
    cropsQuery.isLoading ||
    plotsQuery.isLoading ||
    // Avoid empty-state flash: if still fetching with no cached data yet
    (seasonsQuery.isFetching && seasonsQuery.data === undefined) ||
    (farmsQuery.isFetching && farmsQuery.data === undefined);

  // Expose fetch error only when we have no cached data to show
  const fetchError =
    seasonsQuery.isError && seasonsQuery.data === undefined
      ? seasonsQuery.error
      : farmsQuery.isError && farmsQuery.data === undefined
        ? farmsQuery.error
        : null;

  // Surface errors as toasts (v5 removed onError from useQuery)
  useEffect(() => {
    if (seasonsQuery.error) {
      showToast(
        seasonsQuery.error instanceof Error
          ? seasonsQuery.error.message
          : "Không thể tải danh sách mùa vụ",
        "error",
      );
    }
  }, [seasonsQuery.error, showToast]);

  useEffect(() => {
    if (farmsQuery.error) {
      showToast(
        farmsQuery.error instanceof Error
          ? farmsQuery.error.message
          : "Không thể tải danh sách trang trại",
        "error",
      );
    }
  }, [farmsQuery.error, showToast]);

  // ── Single-season query (for detail/edit sub-views) ───────────────────────
  // enabled when navigating to detail or edit views with an id.
  const isSubView = !!seasonId && view !== "list" && view !== "create";

  const selectedSeasonQuery = useQuery({
    queryKey: qk.seasons.detail(seasonId ?? ""),
    queryFn: () => api.getSeason(seasonId!),
    enabled: isSubView,
    // Seed cache from list if available — avoids flash when navigating from list
    placeholderData: () => {
      if (!seasonId) return undefined;
      const cached = queryClient.getQueryData<SeasonResponse[]>(
        qk.seasons.list(),
      );
      return cached?.find((s) => s.seasonId === seasonId);
    },
  });

  // Map the selected season using current farms data
  const selectedSeason: Season | null = selectedSeasonQuery.data
    ? mapSeasonResponse(selectedSeasonQuery.data, farms)
    : null;

  const selectedSeasonLoading =
    isSubView && selectedSeasonQuery.isLoading && !selectedSeason;

  // ── Delete mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSeason(id),
    onSuccess: (_data, id) => {
      const name = seasonToDelete?.name ?? "";
      setDeleteDialogOpen(false);
      setSeasonToDelete(null);
      showToast(`Đã xóa mùa vụ "${name}"`, "success");
      // Invalidate seasons AND beds (beds freed after season deletion)
      queryClient.invalidateQueries({ queryKey: qk.seasons.all });
      queryClient.invalidateQueries({ queryKey: qk.beds.all });
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : "Xóa mùa vụ thất bại.",
        "error",
      );
    },
  });

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const handleDelete = (season: Season) => {
    setSeasonToDelete(season);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (seasonToDelete) deleteMutation.mutate(seasonToDelete.id);
  };

  // ── Filter + paginate ──────────────────────────────────────────────────────
  const filtered = seasons.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      s.name.toLowerCase().includes(q) || s.farm.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const { page, setPage, totalPages, pagedItems, reset } = usePagination(
    filtered,
    PAGE_SIZE_LIST,
  );

  useEffect(() => {
    reset();
  }, [searchQuery, filterStatus]);

  // ── Route to sub-views ─────────────────────────────────────────────────────
  if (view === "create")
    return (
      <CreateSeasonView
        farms={farms}
        beds={beds}
        plots={allPlots}
        crops={crops}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: qk.seasons.all });
          queryClient.invalidateQueries({ queryKey: qk.beds.all });
          setSearchParams({ view: "list" });
        }}
        showToast={showToast}
      />
    );

  const subViewLoading =
    selectedSeasonLoading ||
    (isSubView && view !== "list" && view !== "create" && !selectedSeason);

  if ((view === "detail" || view === "edit") && subViewLoading)
    return (
      <div className="flex flex-col gap-6 p-6">
        <LoadingState message="Đang tải mùa vụ..." />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );

  if (view === "detail" && selectedSeason)
    return (
      <DetailSeasonView
        season={selectedSeason}
        beds={beds}
        plots={allPlots}
        crops={crops}
        onRefresh={() =>
          queryClient.invalidateQueries({
            queryKey: qk.seasons.detail(selectedSeason.id),
          })
        }
        showToast={showToast}
      />
    );

  if (view === "edit" && selectedSeason)
    return (
      <EditSeasonView
        key={selectedSeason.id}
        season={selectedSeason}
        farms={farms}
        onUpdated={() => {
          queryClient.invalidateQueries({ queryKey: qk.seasons.all });
          setSearchParams({ view: "list" });
        }}
        showToast={showToast}
      />
    );

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <PageHeader
        icon={Sprout}
        title="Quản Lý Mùa Vụ"
        subtitle="Theo dõi và quản lý các mùa vụ canh tác"
        actions={
          <Link to="/seasons?view=create">
            <Button leadingIcon={Plus}>Mùa vụ mới</Button>
          </Link>
        }
      />

      {/* Search & Filter */}
      <div className="bg-surface rounded-card border border-border shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Tìm tên mùa vụ, trang trại..."
            className="flex-1"
          />
          <div className="flex gap-2 flex-wrap">
            {(
              [{ value: "all", label: "Tất cả" }, ...STATUS_OPTIONS] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilterStatus(opt.value)}
                className={`px-3 py-2 rounded-btn text-sm font-medium transition-colors ${
                  filterStatus === opt.value
                    ? "bg-primary text-primary-fg"
                    : "bg-surface border border-border text-ink-500 hover:bg-surface-alt"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-card border border-border shadow-card overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : fetchError ? (
          <EmptyState
            icon={Calendar}
            title="Không thể tải danh sách mùa vụ"
            message={
              fetchError instanceof Error
                ? fetchError.message
                : "Đã xảy ra lỗi. Vui lòng thử lại."
            }
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  seasonsQuery.refetch();
                  farmsQuery.refetch();
                }}
              >
                Thử lại
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Calendar}
            message={
              searchQuery || filterStatus !== "all"
                ? "Không tìm thấy mùa vụ phù hợp"
                : "Chưa có mùa vụ nào"
            }
            action={
              !searchQuery && filterStatus === "all" ? (
                <Link to="/seasons?view=create">
                  <Button leadingIcon={Plus}>Tạo mùa vụ mới</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-surface-alt border-b border-border">
                  <tr>
                    {[
                      "Tên mùa vụ",
                      "Trang trại",
                      "Thời gian",
                      "Vụ thu hoạch",
                      "Trạng thái",
                      "Thao tác",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-4 text-left text-xs font-bold text-ink-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pagedItems.map((season) => (
                    <tr
                      key={season.id}
                      className="hover:bg-surface-alt transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link
                          to={`/seasons?view=detail&id=${season.id}`}
                          className="text-sm font-semibold text-primary-700 hover:text-primary transition-colors"
                        >
                          {season.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-ink-500">
                        {season.farm}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-ink-500">
                          {formatDate(season.startDate)} →{" "}
                          {formatDate(season.endDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 text-sm text-ink-700">
                          <span className="flex items-center gap-1">
                            <Wheat className="w-3.5 h-3.5 text-ink-400" />
                            {season.harvestsCount} vụ
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge
                          label={seasonStatusLabel(season.status)}
                          tone={seasonStatusTone(season.status)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/seasons?view=detail&id=${season.id}`}
                            className="p-1.5 rounded-btn text-ink-500 hover:text-primary hover:bg-primary-50 transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            to={`/seasons?view=edit&id=${season.id}`}
                            className="p-1.5 rounded-btn text-ink-500 hover:text-primary hover:bg-primary-50 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(season)}
                            className="p-1.5 rounded-btn text-ink-500 hover:text-status-danger-fg hover:bg-status-danger-bg transition-colors"
                            title="Xóa"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                showLabel
                totalItems={filtered.length}
                pageSize={PAGE_SIZE_LIST}
                itemLabel="mùa vụ"
              />
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(o) => {
          if (!o && !deleteMutation.isPending) {
            setDeleteDialogOpen(false);
            setSeasonToDelete(null);
          }
        }}
        title="Xóa mùa vụ"
        description={
          <>
            Bạn có chắc chắn muốn xóa <strong>{seasonToDelete?.name}</strong>?
            Hành động này không thể hoàn tác.
          </>
        }
        confirmLabel="Xóa mùa vụ"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

// ─── Detail Season View ────────────────────────────────────────────────────────

function DetailSeasonView({
  season,
  beds,
  plots,
  crops,
  onRefresh,
  showToast,
}: {
  season: Season;
  beds: BedResponse[];
  plots: PlotResponse[];
  crops: CropResponse[];
  onRefresh: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}) {
  const { toasts, showToast: localToast, dismissToast } = useToast();
  const queryClient = useQueryClient();

  // ── Harvests query ──────────────────────────────────────────────────────────
  const harvestsQuery = useQuery({
    queryKey: qk.seasons.harvests(season.id),
    queryFn: async () => {
      const data = await api.getHarvestsBySeason(season.id);
      return (Array.isArray(data) ? data : []).map(
        (h: HarvestResponse): HarvestItem => ({
          harvestId: h.harvestId,
          plotId: h.plotId,
          plotName: h.plotName,
          cropId: h.cropId,
          cropName: h.cropName,
          expectedDate: h.expectedDate,
          expectedQuantity: h.expectedQuantity,
          unit: h.unit ?? "kg",
          status: h.status,
          detailsCount: h.detailsCount,
          harvestedBedsCount: h.harvestedBedsCount ?? 0,
        }),
      );
    },
  });

  const harvests: HarvestItem[] = harvestsQuery.data ?? [];
  const harvestsLoading =
    harvestsQuery.isLoading ||
    (harvestsQuery.isFetching && harvestsQuery.data === undefined);

  useEffect(() => {
    if (harvestsQuery.error) {
      localToast(
        harvestsQuery.error instanceof Error
          ? harvestsQuery.error.message
          : "Không thể tải danh sách thu hoạch.",
        "error",
      );
    }
  }, [harvestsQuery.error]);

  // ── Harvest detail expand (on-demand) ──────────────────────────────────────
  const [expandedHarvest, setExpandedHarvest] = useState<string | null>(null);

  // Each harvest's details is a separate query, enabled only when expanded.
  // We keep a map of harvestId → cached detail array derived from TQ cache.
  const harvestDetailQuery = useQuery({
    queryKey: qk.seasons.harvestDetails(expandedHarvest ?? ""),
    queryFn: async () => {
      const data = await api.getHarvestDetailsByHarvest(expandedHarvest!);
      return Array.isArray(data) ? data : ([] as HarvestDetailResponse[]);
    },
    enabled: !!expandedHarvest,
  });

  // Map of harvestId → details (drawn from per-harvest caches)
  // We use a local cache map so previously loaded details remain visible
  // while a different harvest is being expanded.
  const [detailsCache, setDetailsCache] = useState<
    Record<string, HarvestDetailResponse[]>
  >({});

  useEffect(() => {
    if (expandedHarvest && harvestDetailQuery.data) {
      setDetailsCache((prev) => ({
        ...prev,
        [expandedHarvest]: harvestDetailQuery.data!,
      }));
    }
  }, [expandedHarvest, harvestDetailQuery.data]);

  const toggleHarvest = (harvestId: string) => {
    if (expandedHarvest === harvestId) {
      setExpandedHarvest(null);
    } else {
      setExpandedHarvest(harvestId);
      // Prefetch if not already cached
      if (!detailsCache[harvestId]) {
        queryClient.prefetchQuery({
          queryKey: qk.seasons.harvestDetails(harvestId),
          queryFn: async () => {
            const data = await api.getHarvestDetailsByHarvest(harvestId);
            return Array.isArray(data) ? data : ([] as HarvestDetailResponse[]);
          },
        });
      }
    }
  };

  // ── Harvest form state ──────────────────────────────────────────────────────
  const [createHarvestOpen, setCreateHarvestOpen] = useState(false);
  const [editHarvest, setEditHarvest] = useState<HarvestItem | null>(null);
  const [deleteHarvest, setDeleteHarvest] = useState<HarvestItem | null>(null);

  const [harvestForm, setHarvestForm] = useState({
    plotId: "",
    cropId: "",
    expectedDate: "",
    expectedQuantity: "",
    unit: "kg",
    status: "planned",
  });

  const openCreateHarvest = () => {
    setHarvestForm({
      plotId: "",
      cropId: "",
      expectedDate: "",
      expectedQuantity: "",
      unit: "kg",
      status: "planned",
    });
    setCreateHarvestOpen(true);
    setEditHarvest(null);
  };

  const openEditHarvest = (h: HarvestItem) => {
    setHarvestForm({
      plotId: h.plotId,
      cropId: h.cropId,
      expectedDate: h.expectedDate,
      expectedQuantity: String(h.expectedQuantity),
      unit: h.unit || "kg",
      status: h.status,
    });
    setEditHarvest(h);
    setCreateHarvestOpen(true);
  };

  // ── Mutation: create harvest ────────────────────────────────────────────────
  const createHarvestMutation = useMutation({
    mutationFn: async () => {
      const body: HarvestRequest = {
        plotId: harvestForm.plotId,
        seasonId: season.id,
        cropId: harvestForm.cropId,
        expectedDate: harvestForm.expectedDate,
        expectedQuantity: parseFloat(harvestForm.expectedQuantity) || 0,
        unit: harvestForm.unit,
        status: harvestForm.status,
        startDate: season.startDate,
        endDate: season.endDate,
      };
      return api.createHarvest(body);
    },
    onSuccess: () => {
      localToast("Thêm thu hoạch thành công.", "success");
      setCreateHarvestOpen(false);
      setEditHarvest(null);
      queryClient.invalidateQueries({
        queryKey: qk.seasons.harvests(season.id),
      });
    },
    onError: (err) => {
      localToast(
        err instanceof Error ? err.message : "Lưu thu hoạch thất bại.",
        "error",
      );
    },
  });

  // ── Mutation: update harvest ────────────────────────────────────────────────
  const updateHarvestMutation = useMutation({
    mutationFn: async () => {
      if (!editHarvest) throw new Error("Không có thu hoạch để cập nhật");
      const body: HarvestUpdateRequest = {
        expectedDate: harvestForm.expectedDate,
        expectedQuantity: parseFloat(harvestForm.expectedQuantity) || 0,
        unit: harvestForm.unit,
        status: harvestForm.status,
      };
      return api.updateHarvest(editHarvest.harvestId, body);
    },
    onSuccess: () => {
      localToast("Cập nhật thu hoạch thành công.", "success");
      setCreateHarvestOpen(false);
      setEditHarvest(null);
      queryClient.invalidateQueries({
        queryKey: qk.seasons.harvests(season.id),
      });
    },
    onError: (err) => {
      localToast(
        err instanceof Error ? err.message : "Lưu thu hoạch thất bại.",
        "error",
      );
    },
  });

  // ── Mutation: delete harvest ────────────────────────────────────────────────
  const deleteHarvestMutation = useMutation({
    mutationFn: (harvestId: string) => api.deleteHarvest(harvestId),
    onSuccess: (_data, harvestId) => {
      setDeleteHarvest(null);
      localToast("Đã xóa thu hoạch.", "success");
      queryClient.invalidateQueries({
        queryKey: qk.seasons.harvests(season.id),
      });
      // Also drop the detail cache for that harvest
      queryClient.removeQueries({
        queryKey: qk.seasons.harvestDetails(harvestId),
      });
      setDetailsCache((prev) => {
        const next = { ...prev };
        delete next[harvestId];
        return next;
      });
    },
    onError: (err) => {
      localToast(
        err instanceof Error ? err.message : "Xóa thu hoạch thất bại.",
        "error",
      );
    },
  });

  const harvestSubmitting =
    createHarvestMutation.isPending || updateHarvestMutation.isPending;

  const handleHarvestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !harvestForm.plotId ||
      !harvestForm.cropId ||
      !harvestForm.expectedDate
    ) {
      localToast("Vui lòng điền đầy đủ thông tin bắt buộc.", "error");
      return;
    }
    if (editHarvest) {
      updateHarvestMutation.mutate();
    } else {
      createHarvestMutation.mutate();
    }
  };

  // ── IoT sensor data (non-critical, keep as useEffect) ─────────────────────
  const [iotRows, setIotRows] = useState<IotRow[]>([]);
  const [iotLoading, setIotLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadIot() {
      setIotLoading(true);
      try {
        const allDevices = await api.getIotDevices();
        const devices = Array.isArray(allDevices) ? allDevices : [];
        const readingResults = await Promise.allSettled(
          devices.map((d) => api.getLatestSensorByDevice(d.deviceCode)),
        );
        if (cancelled) return;
        const rows: IotRow[] = [];
        for (let i = 0; i < devices.length; i++) {
          const device = devices[i];
          const result = readingResults[i];
          if (result.status !== "fulfilled" || !result.value) continue;
          const reading = result.value;
          rows.push({
            sensorDataId: reading.sensorDataId,
            deviceId: device.deviceId,
            deviceCode: device.deviceCode,
            deviceName: device.name,
            bedId: device.bedId,
            bedName: device.name,
            recordedAt: reading.recordedAt,
            temperature: reading.temperature,
            humidity: reading.humidity,
            soilMoisture: reading.soilMoisture,
            light: reading.light,
            isRaining: reading.isRaining,
            isAlert: reading.isAlert,
          });
        }
        setIotRows(rows);
      } catch {
        // IoT is non-critical — silent fail
      } finally {
        if (!cancelled) setIotLoading(false);
      }
    }
    loadIot();
    return () => {
      cancelled = true;
    };
  }, [season.id]);

  // ── Growth tracking indicator ──────────────────────────────────────────────
  const [trackingKnown, setTrackingKnown] = useState<Record<string, boolean>>(
    {},
  );
  const [growthTrackingTarget, setGrowthTrackingTarget] = React.useState<{
    id: string;
    bedName: string;
  } | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const farmPlots = plots.filter((p) => p.farmId === season.farmId);
  const activeCrops = crops;

  const HARVEST_STATUS_OPTIONS = [
    { value: "planned", label: "Lên kế hoạch" },
    { value: "growing", label: "Đang trồng" },
    { value: "harvesting", label: "Đang thu hoạch" },
    { value: "completed", label: "Đã thu hoạch" },
    { value: "cancelled", label: "Đã hủy" },
  ];

  const totalExpected = harvests.reduce(
    (s, h) => s + (h.expectedQuantity ?? 0),
    0,
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            to="/seasons"
            className="p-2 rounded-btn text-ink-500 hover:text-ink-700 hover:bg-surface-alt transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-ink-800">{season.name}</h1>
            <p className="text-sm text-ink-500 mt-0.5">{season.farm}</p>
          </div>
          <StatusBadge
            label={seasonStatusLabel(season.status)}
            tone={seasonStatusTone(season.status)}
          />
        </div>
        <Link to={`/seasons?view=edit&id=${season.id}`}>
          <Button leadingIcon={Pencil} variant="secondary">
            Chỉnh sửa
          </Button>
        </Link>
      </div>

      {/* Season info strip */}
      <div className="bg-surface rounded-card border border-border shadow-card p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-ink-500 uppercase mb-1">
              Trang trại
            </div>
            <div className="font-medium text-ink-800">{season.farm}</div>
          </div>
          <div>
            <div className="text-xs text-ink-500 uppercase mb-1">Thời gian</div>
            <div className="font-medium text-ink-800">
              {formatDate(season.startDate)} – {formatDate(season.endDate)}
            </div>
          </div>
          <div>
            <div className="text-xs text-ink-500 uppercase mb-1">
              Số vụ thu hoạch
            </div>
            <div className="font-medium text-ink-800 flex items-center gap-1">
              <Wheat className="w-4 h-4 text-ink-400" />
              {harvests.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-ink-500 uppercase mb-1">
              Tổng SẢN LƯỢNG DỰ KIẾN
            </div>
            <div className="font-medium text-status-success-fg flex items-center gap-1">
              <Package className="w-4 h-4" />
              {totalExpected > 0
                ? `${totalExpected.toLocaleString("vi-VN")} kg`
                : "—"}
            </div>
          </div>
          {season.description && (
            <div className="col-span-full">
              <div className="text-xs text-ink-500 uppercase mb-1">Mô tả</div>
              <div className="text-sm text-ink-700">{season.description}</div>
            </div>
          )}
          {season.seasonNotes && (
            <div className="col-span-full">
              <div className="text-xs text-ink-500 uppercase mb-1">Ghi chú</div>
              <div className="text-sm text-ink-700">{season.seasonNotes}</div>
            </div>
          )}
        </div>
      </div>

      {/* Harvests section */}
      <div className="bg-surface rounded-card border border-border shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink-500 uppercase flex items-center gap-2">
            <Wheat className="w-4 h-4" /> Danh sách vụ thu hoạch (
            {harvests.length})
          </h3>
          <Button leadingIcon={Plus} size="sm" onClick={openCreateHarvest}>
            Thêm mới
          </Button>
        </div>

        {harvestsLoading ? (
          <LoadingState message="Đang tải thu hoạch..." />
        ) : harvests.length === 0 ? (
          <EmptyState
            icon={Wheat}
            title="Chưa có thu hoạch nào"
            message="Thêm vụ thu hoạch đầu tiên cho mùa vụ này"
            action={
              <Button leadingIcon={Plus} size="sm" onClick={openCreateHarvest}>
                Thêm vụ thu hoạch
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {harvests.map((h) => {
              const isExpanded = expandedHarvest === h.harvestId;
              const details = detailsCache[h.harvestId];
              const isLoadingDetails =
                isExpanded &&
                harvestDetailQuery.isFetching &&
                expandedHarvest === h.harvestId &&
                !details;

              return (
                <div key={h.harvestId}>
                  {/* Harvest row */}
                  <div className="px-6 py-4 hover:bg-surface-alt transition-colors">
                    <div className="flex items-center gap-4">
                      {/* Expand toggle */}
                      <button
                        type="button"
                        onClick={() => toggleHarvest(h.harvestId)}
                        className="p-1 rounded text-ink-400 hover:text-ink-700 transition-colors shrink-0"
                        aria-label={
                          isExpanded ? "Thu gọn" : "Xem chi tiết luống"
                        }
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </button>

                      {/* Plot + crop */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-ink-800">
                            {h.plotName}
                          </span>
                          <span className="text-ink-400 text-xs">·</span>
                          <span className="text-sm text-ink-500">
                            {h.cropName}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-ink-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Dự kiến: {formatDate(h.expectedDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {h.expectedQuantity.toLocaleString("vi-VN")}{" "}
                            {h.unit || "kg"}
                          </span>
                          {h.detailsCount > 0 && (
                            <span className="flex items-center gap-1">
                              <BarChart2 className="w-3 h-3" />
                              {h.harvestedBedsCount}/{h.detailsCount} luống
                            </span>
                          )}
                        </div>
                      </div>

                      <StatusBadge
                        label={harvestStatusLabel(h.status)}
                        tone={harvestStatusTone(h.status)}
                      />

                      <RowActions
                        onEdit={() => openEditHarvest(h)}
                        onDelete={() => setDeleteHarvest(h)}
                      />
                    </div>
                  </div>

                  {/* Expanded: HarvestDetails */}
                  {isExpanded && (
                    <div className="bg-surface-alt border-t border-border px-6 py-4">
                      {isLoadingDetails ? (
                        <LoadingState
                          variant="inline"
                          message="Đang tải chi tiết luống..."
                        />
                      ) : !details || details.length === 0 ? (
                        <p className="text-sm text-ink-400">
                          Chưa có luống nào trong vụ thu hoạch này.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-btn border border-border bg-surface">
                          <table className="w-full text-sm">
                            <thead className="bg-surface-alt">
                              <tr>
                                {/* Luống — takes all remaining space */}
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide w-full">
                                  Luống
                                </th>
                                {/* All other columns — shrink to content */}
                                <th className="px-4 py-2.5 text-center text-xs font-semibold text-ink-500 uppercase tracking-wide whitespace-nowrap">
                                  Số lượng (cây)
                                </th>
                                <th className="px-4 py-2.5 text-center text-xs font-semibold text-ink-500 uppercase tracking-wide whitespace-nowrap">
                                  Ngày bắt đầu
                                </th>
                                <th className="px-4 py-2.5 text-center text-xs font-semibold text-ink-500 uppercase tracking-wide whitespace-nowrap">
                                  Ngày kết thúc
                                </th>
                                <th className="px-4 py-2.5 text-center text-xs font-semibold text-ink-500 uppercase tracking-wide whitespace-nowrap">
                                  Đã thu hoạch
                                </th>
                                <th className="px-4 py-2.5 text-center text-xs font-semibold text-ink-500 uppercase tracking-wide whitespace-nowrap">
                                  Sinh trưởng
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {details
                                .slice()
                                .sort((a, b) =>
                                  compareTokenArrays(
                                    bedSortKey(a.bedName),
                                    bedSortKey(b.bedName),
                                  ),
                                )
                                .map((d) => (
                                  <tr
                                    key={d.harvestDetailId}
                                    className="hover:bg-surface-alt transition-colors"
                                  >
                                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-ink-800 whitespace-nowrap">
                                      {d.bedName}
                                    </td>
                                    <td className="px-4 py-2.5 text-center text-ink-700 whitespace-nowrap">
                                      {d.cropQuantity.toLocaleString("vi-VN")}
                                    </td>
                                    <td className="px-4 py-2.5 text-center text-ink-500 whitespace-nowrap">
                                      {formatDate(d.startDate)}
                                    </td>
                                    <td className="px-4 py-2.5 text-center text-ink-500 whitespace-nowrap">
                                      {formatDate(d.endDate)}
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                      <div className="flex justify-center">
                                        <StatusBadge
                                          label={
                                            d.isHarvested
                                              ? "Đã xong"
                                              : "Chưa xong"
                                          }
                                          tone={
                                            d.isHarvested
                                              ? "success"
                                              : "neutral"
                                          }
                                          size="sm"
                                        />
                                      </div>
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                      <div className="flex items-center justify-center">
                                        <button
                                          type="button"
                                          title={
                                            trackingKnown[d.harvestDetailId] ===
                                            true
                                              ? "Xem theo dõi sinh trưởng"
                                              : trackingKnown[
                                                    d.harvestDetailId
                                                  ] === false
                                                ? "Chưa có dữ liệu sinh trưởng"
                                                : "Xem theo dõi sinh trưởng"
                                          }
                                          aria-label="Xem theo dõi sinh trưởng"
                                          onClick={() =>
                                            setGrowthTrackingTarget({
                                              id: d.harvestDetailId,
                                              bedName: d.bedName,
                                            })
                                          }
                                          className={[
                                            "p-1.5 rounded-btn transition-colors",
                                            trackingKnown[d.harvestDetailId] ===
                                            true
                                              ? "text-primary hover:bg-primary-50"
                                              : trackingKnown[
                                                    d.harvestDetailId
                                                  ] === false
                                                ? "text-ink-300 hover:text-ink-500 hover:bg-surface-alt"
                                                : "text-ink-400 hover:text-primary hover:bg-primary-50",
                                          ].join(" ")}
                                        >
                                          <NotebookPen className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* IoT Sensor Data */}
      <div className="bg-surface rounded-card border border-border shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink-500 uppercase flex items-center gap-2">
            <Cpu className="w-4 h-4" /> Dữ liệu cảm biến IoT
            {iotRows.length > 0 && (
              <span className="font-normal normal-case text-primary">
                · {iotRows.length} thiết bị
              </span>
            )}
          </h3>
          {iotRows.some((r) => r.isAlert) && (
            <StatusBadge
              label="Có cảnh báo"
              tone="danger"
              icon={AlertTriangle}
            />
          )}
        </div>

        {iotLoading ? (
          <LoadingState message="Đang tải dữ liệu cảm biến..." />
        ) : iotRows.length === 0 ? (
          <EmptyState size="sm" message="Chưa có dữ liệu cảm biến" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-surface-alt border-b border-border">
                <tr>
                  {[
                    "Thiết bị",
                    "Thời gian đo",
                    "Nhiệt độ (°C)",
                    "Độ ẩm KK (%)",
                    "Độ ẩm đất (%)",
                    "Ánh sáng",
                    "Trạng thái",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {iotRows.map((row) => (
                  <tr
                    key={row.sensorDataId}
                    className={`hover:bg-surface-alt transition-colors ${row.isAlert ? "bg-status-danger-bg/20" : ""}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-mono text-xs font-semibold text-ink-800">
                        {row.deviceCode}
                      </div>
                      {row.deviceName !== row.deviceCode && (
                        <div className="text-xs text-ink-400">
                          {row.deviceName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-500 whitespace-nowrap text-xs">
                      {new Date(row.recordedAt).toLocaleString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-medium text-orange-600">
                        <Thermometer className="w-3.5 h-3.5" />
                        {row.temperature != null
                          ? row.temperature.toFixed(1)
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-medium text-blue-600">
                        <Droplets className="w-3.5 h-3.5" />
                        {row.humidity ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-medium text-status-success-fg">
                        <Droplets className="w-3.5 h-3.5 opacity-60" />
                        {row.soilMoisture ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-ink-500">
                        <Sun className="w-3.5 h-3.5 text-yellow-500" />
                        {row.light ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center gap-1 text-xs ${row.isRaining ? "font-medium text-blue-600" : "text-ink-500"}`}
                        >
                          <CloudRain className="w-3 h-3" />
                          Mưa: {row.isRaining ? "Có" : "Không"}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-xs ${row.isAlert ? "font-medium text-status-danger-fg" : "text-status-success-fg"}`}
                        >
                          {row.isAlert ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          Sự cố: {row.isAlert ? "Có" : "Không"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Harvest Modal */}
      <Modal
        open={createHarvestOpen}
        onOpenChange={(o) => {
          if (!o && !harvestSubmitting) {
            setCreateHarvestOpen(false);
            setEditHarvest(null);
          }
        }}
        title={editHarvest ? "Chỉnh sửa vụ thu hoạch" : "Thêm vụ thu mới"}
        size="md"
        onSubmit={handleHarvestSubmit}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setCreateHarvestOpen(false);
                setEditHarvest(null);
              }}
              disabled={harvestSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" loading={harvestSubmitting}>
              {editHarvest ? "Lưu thay đổi" : "Thêm thu hoạch"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Plot select */}
          <FormSelect
            label="Vuông đất"
            required
            value={harvestForm.plotId}
            onChange={(v) => setHarvestForm((p) => ({ ...p, plotId: v }))}
            options={farmPlots.map((p) => ({
              value: p.plotId,
              label: p.plotName,
            }))}
            placeholder="Chọn vuông đất"
            disabled={!!editHarvest}
          />

          {/* Crop select */}
          <FormSelect
            label="Cây trồng"
            required
            value={harvestForm.cropId}
            onChange={(v) => setHarvestForm((p) => ({ ...p, cropId: v }))}
            options={activeCrops.map((c) => ({
              value: c.cropId,
              label: c.cropName,
            }))}
            placeholder="Chọn cây trồng"
            disabled={!!editHarvest}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Ngày thu hoạch dự kiến"
              required
              type="date"
              value={harvestForm.expectedDate}
              onChange={(v) =>
                setHarvestForm((p) => ({ ...p, expectedDate: v }))
              }
              inputProps={{
                min: season.startDate,
                max: season.endDate,
              }}
            />
            <FormField
              label="Sản lượng thực tế"
              type="number"
              value={harvestForm.expectedQuantity}
              onChange={(v) =>
                setHarvestForm((p) => ({ ...p, expectedQuantity: v }))
              }
              inputProps={{ min: "0", step: "0.01" }}
              placeholder="0"
            />
          </div>

          <FormSelect
            label="Đơn vị sản lượng"
            value={harvestForm.unit}
            onChange={(v) => setHarvestForm((p) => ({ ...p, unit: v }))}
            options={[
              { value: "kg", label: "kg" },
              { value: "tấn", label: "tấn" },
            ]}
          />

          <FormSelect
            label="Trạng thái"
            value={harvestForm.status}
            onChange={(v) => setHarvestForm((p) => ({ ...p, status: v }))}
            options={HARVEST_STATUS_OPTIONS}
          />
        </div>
      </Modal>

      {/* Growth Tracking Modal */}
      {growthTrackingTarget && (
        <GrowthTrackingModal
          harvestDetailId={growthTrackingTarget.id}
          bedName={growthTrackingTarget.bedName}
          onClose={() => setGrowthTrackingTarget(null)}
          onFetched={(id, count) =>
            setTrackingKnown((prev) => ({ ...prev, [id]: count > 0 }))
          }
        />
      )}

      {/* Delete Harvest Dialog */}
      <ConfirmDialog
        open={deleteHarvest !== null}
        onOpenChange={(o) => {
          if (!o && !deleteHarvestMutation.isPending) setDeleteHarvest(null);
        }}
        title="Xóa thu hoạch"
        description={
          <>
            Bạn có chắc muốn xóa thu hoạch của{" "}
            <strong>{deleteHarvest?.plotName}</strong>? Hành động này không thể
            hoàn tác.
          </>
        }
        confirmLabel="Xóa"
        loading={deleteHarvestMutation.isPending}
        onConfirm={() => {
          if (deleteHarvest)
            deleteHarvestMutation.mutate(deleteHarvest.harvestId);
        }}
      />
    </div>
  );
}

// ─── Create Season View ────────────────────────────────────────────────────────

function CreateSeasonView({
  farms,
  beds,
  plots,
  crops,
  onCreated,
  showToast,
}: {
  farms: FarmResponse[];
  beds: BedResponse[];
  plots: PlotResponse[];
  crops: CropResponse[];
  onCreated: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}) {
  const { toasts, showToast: localToast, dismissToast } = useToast();

  const [step, setStep] = useState(1);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: "",
    farmId: "",
    startDate: "",
    endDate: "",
    description: "",
    seasonNotes: "",
    status: "Planned",
  });

  interface HarvestGroup {
    id: string;
    plotId: string;
    cropId: string;
    expectedDate: string;
    expectedQuantity: string;
    unit: string;
    bedIds: string[];
  }

  const [harvestGroups, setHarvestGroups] = useState<HarvestGroup[]>([
    {
      id: crypto.randomUUID(),
      plotId: "",
      cropId: "",
      expectedDate: "",
      expectedQuantity: "",
      unit: "kg",
      bedIds: [],
    },
  ]);
  const [openPicker, setOpenPicker] = useState<string | null>(null);

  // Beds for the selected farm
  const bedsForFarm = formData.farmId
    ? beds.filter((b) => {
        const plot = plots.find((p) => p.plotId === b.plotId);
        return plot?.farmId === formData.farmId;
      })
    : beds;

  const availableBeds = sortBeds(
    bedsForFarm.map((b) => ({
      id: b.bedId,
      name: b.bedName ?? "",
      area: b.plotName ?? "Không rõ khu",
      size: b.bedArea ? `${b.bedArea} m²` : "—",
    })),
  );

  const farmPlots = plots.filter((p) => p.farmId === formData.farmId);
  const activeCrops = crops;
  const allClaimedBedIds = harvestGroups.flatMap((g) => g.bedIds);

  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Vui lòng nhập tên mùa vụ";
    else if (formData.name.trim().length < 2)
      errors.name = "Tên mùa vụ phải có ít nhất 2 ký tự";
    if (!formData.farmId) errors.farmId = "Vui lòng chọn trang trại";
    if (!formData.startDate) errors.startDate = "Vui lòng chọn ngày bắt đầu";
    if (!formData.endDate) errors.endDate = "Vui lòng chọn ngày kết thúc";
    if (
      formData.startDate &&
      formData.endDate &&
      formData.endDate <= formData.startDate
    )
      errors.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
    return errors;
  };

  // ── Mutation: skip (create season only) ───────────────────────────────────
  const skipMutation = useMutation({
    mutationFn: () =>
      api.createSeason({
        farmId: formData.farmId,
        seasonName: formData.name.trim(),
        seasonStartDate: formData.startDate,
        seasonEndDate: formData.endDate,
        description: formData.description.trim(),
        seasonNotes: formData.seasonNotes.trim(),
        status: formData.status,
      }),
    onSuccess: (created) => {
      const msg =
        (created as any)?.message ||
        `Đã tạo mùa vụ "${formData.name.trim()}" thành công.`;
      localToast(msg, "success");
      setTimeout(onCreated, 800);
    },
    onError: (err) => {
      localToast(
        err instanceof Error ? err.message : "Tạo mùa vụ thất bại.",
        "error",
      );
    },
  });

  // ── Mutation: full create with harvests ────────────────────────────────────
  // Complex orchestrated mutation — kept in one mutationFn to keep the
  // create-then-harvest sequencing atomic from the user's perspective.
  const createWithHarvestsMutation = useMutation({
    mutationFn: async () => {
      const hasInvalid = harvestGroups.some(
        (g) => !g.plotId || !g.cropId || !g.expectedDate,
      );
      if (hasInvalid) {
        throw new Error(
          "Mỗi đợt thu hoạch cần có vuông đất, cây trồng và ngày dự kiến.",
        );
      }

      // Step 1: create the season
      const created = await api.createSeason({
        farmId: formData.farmId,
        seasonName: formData.name.trim(),
        seasonStartDate: formData.startDate,
        seasonEndDate: formData.endDate,
        description: formData.description.trim(),
        seasonNotes: formData.seasonNotes.trim(),
        status: formData.status,
      });

      // Step 2: resolve seasonId from response or re-fetch
      let resolvedSeasonId: string | null = (created as any)?.seasonId ?? null;
      if (!resolvedSeasonId) {
        const allSeasons = await api.getSeasons();
        const match = Array.isArray(allSeasons)
          ? allSeasons.find(
              (s) =>
                s.farmId === formData.farmId &&
                s.seasonName === formData.name.trim() &&
                s.seasonStartDate === formData.startDate,
            )
          : null;
        resolvedSeasonId = match?.seasonId ?? null;
      }

      if (!resolvedSeasonId) {
        return {
          created,
          partialFail: true,
          failedCount: 0,
          total: 0,
        };
      }

      // Step 3: create harvest records
      const harvestsToCreate = harvestGroups.filter(
        (g) => g.plotId && g.cropId && g.expectedDate,
      );

      if (harvestsToCreate.length === 0) {
        return { created, partialFail: false, failedCount: 0, total: 0 };
      }

      const results = await Promise.allSettled(
        harvestsToCreate.map((g) =>
          api.createHarvest({
            plotId: g.plotId,
            seasonId: resolvedSeasonId!,
            cropId: g.cropId,
            expectedDate: g.expectedDate,
            expectedQuantity: parseFloat(g.expectedQuantity) || 0,
            unit: g.unit,
            status: "planned",
            startDate: formData.startDate,
            endDate: formData.endDate,
          }),
        ),
      );

      const failed = results.filter((r) => r.status === "rejected").length;
      return {
        created,
        partialFail: failed > 0,
        failedCount: failed,
        total: harvestsToCreate.length,
      };
    },
    onSuccess: ({ created, partialFail, failedCount, total }) => {
      if ((created as any)?.seasonId === undefined && total === 0) {
        localToast(
          "Tạo mùa vụ thành công nhưng không thể gán thu hoạch. Vui lòng thêm thủ công.",
          "info",
        );
      } else if (partialFail) {
        localToast(
          `Tạo mùa vụ thành công. ${failedCount} đợt thu hoạch tạo thất bại — vui lòng thêm lại trong trang chi tiết.`,
          "info",
        );
      } else {
        const serverMsg =
          (created as any)?.message ||
          `Tạo mùa vụ "${formData.name.trim()}" và ${total} đợt thu hoạch thành công.`;
        localToast(serverMsg, "success");
      }
      setTimeout(onCreated, 900);
    },
    onError: (err) => {
      localToast(
        err instanceof Error ? err.message : "Tạo mùa vụ thất bại.",
        "error",
      );
    },
  });

  const submitting =
    skipMutation.isPending || createWithHarvestsMutation.isPending;

  const handleSkip = () => {
    if (submitting) return;
    skipMutation.mutate();
  };

  const handleStep2Submit = () => {
    if (submitting) return;
    createWithHarvestsMutation.mutate();
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              to="/seasons"
              className="p-2 rounded-btn text-ink-500 hover:text-ink-700 hover:bg-surface-alt transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-ink-800">Tạo Mùa Vụ Mới</h1>
          </div>
          {/* Step indicators */}
          <div className="flex items-center gap-2 ml-12">
            {[
              { n: 1, label: "Thông tin cơ bản" },
              { n: 2, label: "Vụ Thu hoạch" },
            ].map((s, i) => (
              <React.Fragment key={s.n}>
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-pill text-sm font-medium ${
                    step === s.n
                      ? "bg-primary text-primary-fg"
                      : step > s.n
                        ? "bg-status-success-bg text-status-success-fg"
                        : "bg-surface-subtle text-ink-500"
                  }`}
                >
                  {step > s.n ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-xs leading-none">
                      {s.n}
                    </span>
                  )}
                  {s.label}
                </div>
                {i < 1 && <span className="text-ink-300 text-xs">›</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Step 1: Season info */}
      {step === 1 && (
        <div className="bg-surface rounded-card border border-border shadow-card p-6 max-w-2xl">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Tên mùa vụ"
                required
                value={formData.name}
                onChange={(v) => {
                  setFormData((p) => ({ ...p, name: v }));
                  setFormErrors((p) => ({ ...p, name: "" }));
                }}
                placeholder="Vụ Hè 2026"
                error={formErrors.name}
              />
              <FormSelect
                label="Trang trại"
                required
                value={formData.farmId}
                onChange={(v) => {
                  setFormData((p) => ({ ...p, farmId: v }));
                  setFormErrors((p) => ({ ...p, farmId: "" }));
                  // Reset harvest groups when farm changes
                  setHarvestGroups([
                    {
                      id: crypto.randomUUID(),
                      plotId: "",
                      cropId: "",
                      expectedDate: "",
                      expectedQuantity: "",
                      bedIds: [],
                      unit: "",
                    },
                  ]);
                }}
                options={farms.map((f) => ({
                  value: f.farmId,
                  label: f.farmName,
                }))}
                placeholder="Chọn trang trại"
                error={formErrors.farmId}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Ngày bắt đầu"
                required
                type="date"
                value={formData.startDate}
                onChange={(v) => {
                  setFormData((p) => ({ ...p, startDate: v }));
                  setFormErrors((p) => ({
                    ...p,
                    startDate: "",
                    endDate: "",
                  }));
                }}
                error={formErrors.startDate}
              />
              <FormField
                label="Ngày kết thúc"
                required
                type="date"
                value={formData.endDate}
                onChange={(v) => {
                  setFormData((p) => ({ ...p, endDate: v }));
                  setFormErrors((p) => ({ ...p, endDate: "" }));
                }}
                inputProps={{ min: formData.startDate || undefined }}
                error={formErrors.endDate}
              />
            </div>

            <FormSelect
              label="Trạng thái"
              value={formData.status}
              onChange={(v) => setFormData((p) => ({ ...p, status: v }))}
              options={STATUS_OPTIONS}
            />

            <FormTextarea
              label="Mô tả"
              value={formData.description}
              onChange={(v) => setFormData((p) => ({ ...p, description: v }))}
              placeholder="Mô tả mùa vụ..."
              rows={3}
            />

            <FormTextarea
              label="Ghi chú"
              value={formData.seasonNotes}
              onChange={(v) => setFormData((p) => ({ ...p, seasonNotes: v }))}
              placeholder="Ghi chú thêm..."
              rows={2}
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => {
                const errors = validateStep1();
                setFormErrors(errors);
                if (Object.keys(errors).length === 0) setStep(2);
              }}
            >
              Tiếp theo
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Harvest groups */}
      {step === 2 && (
        <div className="bg-surface rounded-card border border-border shadow-card p-6 max-w-3xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-ink-500 uppercase flex items-center gap-2">
              <Wheat className="w-4 h-4" /> Kế hoạch thu hoạch
            </h3>
            <div className="text-xs text-ink-500 bg-primary-50 border border-primary-200 rounded-btn px-3 py-1.5">
              Mùa vụ: {formatDate(formData.startDate)} →{" "}
              {formatDate(formData.endDate)}
            </div>
          </div>

          {!formData.farmId && (
            <div className="mb-4 px-3 py-2 bg-status-warning-bg border border-status-warning-fg/20 rounded-btn text-xs text-status-warning-fg flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Vui lòng quay lại bước 1 và chọn trang trại.
            </div>
          )}

          <div className="space-y-4">
            {harvestGroups.map((group, idx) => (
              <div
                key={group.id}
                className="border border-border rounded-card overflow-hidden"
              >
                {/* Group header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-surface-alt border-b border-border">
                  <div className="w-6 h-6 rounded-pill bg-primary text-primary-fg text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <span className="text-sm font-medium text-ink-700 flex-1">
                    Đợt thu hoạch {idx + 1}
                  </span>
                  {harvestGroups.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setHarvestGroups((p) =>
                          p.filter((g) => g.id !== group.id),
                        )
                      }
                      className="p-1.5 text-ink-400 hover:text-status-danger-fg hover:bg-status-danger-bg rounded-btn transition-colors"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Group body */}
                <div className="p-4 grid grid-cols-2 gap-4">
                  <FormSelect
                    label="Vuông đất"
                    required
                    value={group.plotId}
                    onChange={(v) =>
                      setHarvestGroups((p) =>
                        p.map((g) =>
                          g.id === group.id ? { ...g, plotId: v } : g,
                        ),
                      )
                    }
                    options={farmPlots.map((p) => ({
                      value: p.plotId,
                      label: p.plotName,
                    }))}
                    placeholder="Chọn vuông đất"
                  />
                  <FormSelect
                    label="Cây trồng"
                    required
                    value={group.cropId}
                    onChange={(v) =>
                      setHarvestGroups((p) =>
                        p.map((g) =>
                          g.id === group.id ? { ...g, cropId: v } : g,
                        ),
                      )
                    }
                    options={activeCrops.map((c) => ({
                      value: c.cropId,
                      label: c.cropName,
                    }))}
                    placeholder="Chọn cây trồng"
                  />
                  <FormField
                    label="Ngày thu hoạch dự kiến"
                    required
                    type="date"
                    value={group.expectedDate}
                    onChange={(v) =>
                      setHarvestGroups((p) =>
                        p.map((g) =>
                          g.id === group.id ? { ...g, expectedDate: v } : g,
                        ),
                      )
                    }
                    inputProps={{
                      min: formData.startDate || undefined,
                      max: formData.endDate || undefined,
                    }}
                  />
                  <FormField
                    label="Sản lượng thực tế"
                    type="number"
                    value={group.expectedQuantity}
                    onChange={(v) =>
                      setHarvestGroups((p) =>
                        p.map((g) =>
                          g.id === group.id ? { ...g, expectedQuantity: v } : g,
                        ),
                      )
                    }
                    inputProps={{ min: "0", step: "0.01" }}
                    placeholder="0"
                  />
                  <FormSelect
                    label="Đơn vị sản lượng"
                    value={group.unit}
                    onChange={(v) =>
                      setHarvestGroups((p) =>
                        p.map((g) =>
                          g.id === group.id ? { ...g, unit: v } : g,
                        ),
                      )
                    }
                    options={[
                      { value: "kg", label: "kg" },
                      { value: "tấn", label: "tấn" },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add another group */}
          <button
            type="button"
            onClick={() =>
              setHarvestGroups((p) => [
                ...p,
                {
                  id: crypto.randomUUID(),
                  plotId: "",
                  cropId: "",
                  expectedDate: "",
                  expectedQuantity: "",
                  unit: "kg",
                  bedIds: [],
                },
              ])
            }
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-primary-200 rounded-card text-sm text-primary font-medium hover:bg-primary-50 transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Thêm đợt thu hoạch khác
          </button>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="secondary"
              leadingIcon={ArrowLeft}
              onClick={() => setStep(1)}
            >
              Quay lại
            </Button>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={handleSkip}
                loading={skipMutation.isPending}
              >
                Bỏ qua (tạo sau)
              </Button>
              <Button
                leadingIcon={CheckCircle}
                loading={createWithHarvestsMutation.isPending}
                onClick={handleStep2Submit}
              >
                Tạo mùa vụ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Edit Season View ──────────────────────────────────────────────────────────

function EditSeasonView({
  season,
  farms,
  onUpdated,
  showToast,
}: {
  season: Season;
  farms: FarmResponse[];
  onUpdated: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}) {
  const { toasts, showToast: localToast, dismissToast } = useToast();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: season.name,
    farmId: season.farmId,
    startDate: season.startDate,
    endDate: season.endDate,
    description: season.description,
    seasonNotes: season.seasonNotes,
    status: season.status,
  });

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Vui lòng nhập tên mùa vụ";
    if (!formData.farmId) errors.farmId = "Vui lòng chọn trang trại";
    if (!formData.startDate) errors.startDate = "Vui lòng chọn ngày bắt đầu";
    if (!formData.endDate) errors.endDate = "Vui lòng chọn ngày kết thúc";
    if (
      formData.startDate &&
      formData.endDate &&
      formData.endDate <= formData.startDate
    )
      errors.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
    return errors;
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateSeason(season.id, {
        farmId: formData.farmId,
        seasonName: formData.name.trim(),
        seasonStartDate: formData.startDate,
        seasonEndDate: formData.endDate,
        description: formData.description.trim(),
        seasonNotes: formData.seasonNotes.trim(),
        status: formData.status,
      }),
    onSuccess: () => {
      localToast("Cập nhật mùa vụ thành công.", "success");
      setTimeout(onUpdated, 600);
    },
    onError: (err) => {
      localToast(
        err instanceof Error ? err.message : "Cập nhật thất bại.",
        "error",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    updateMutation.mutate();
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to={`/seasons?view=detail&id=${season.id}`}
          className="p-2 rounded-btn text-ink-500 hover:text-ink-700 hover:bg-surface-alt transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-ink-800">
            Chỉnh sửa: {season.name}
          </h1>
          <p className="text-sm text-ink-500 mt-0.5">
            Thay đổi thông tin cơ bản của mùa vụ
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="bg-surface rounded-card border border-border shadow-card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Tên mùa vụ"
              required
              value={formData.name}
              onChange={(v) => {
                setFormData((p) => ({ ...p, name: v }));
                setFormErrors((p) => ({ ...p, name: "" }));
              }}
              error={formErrors.name}
            />
            <FormSelect
              label="Trang trại"
              required
              value={formData.farmId}
              onChange={(v) => {
                setFormData((p) => ({ ...p, farmId: v }));
                setFormErrors((p) => ({ ...p, farmId: "" }));
              }}
              options={farms.map((f) => ({
                value: f.farmId,
                label: f.farmName,
              }))}
              error={formErrors.farmId}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Ngày bắt đầu"
              required
              type="date"
              value={formData.startDate}
              onChange={(v) => {
                setFormData((p) => ({ ...p, startDate: v }));
                setFormErrors((p) => ({
                  ...p,
                  startDate: "",
                  endDate: "",
                }));
              }}
              error={formErrors.startDate}
            />
            <FormField
              label="Ngày kết thúc"
              required
              type="date"
              value={formData.endDate}
              onChange={(v) => {
                setFormData((p) => ({ ...p, endDate: v }));
                setFormErrors((p) => ({ ...p, endDate: "" }));
              }}
              inputProps={{ min: formData.startDate || undefined }}
              error={formErrors.endDate}
            />
          </div>

          <FormSelect
            label="Trạng thái"
            value={formData.status}
            onChange={(v) => setFormData((p) => ({ ...p, status: v }))}
            options={STATUS_OPTIONS}
          />

          <FormTextarea
            label="Mô tả"
            value={formData.description}
            onChange={(v) => setFormData((p) => ({ ...p, description: v }))}
            placeholder="Mô tả mùa vụ..."
            rows={3}
          />

          <FormTextarea
            label="Ghi chú"
            value={formData.seasonNotes}
            onChange={(v) => setFormData((p) => ({ ...p, seasonNotes: v }))}
            placeholder="Ghi chú thêm..."
            rows={2}
          />
        </div>

        <div className="flex justify-between mt-4">
          <Link to={`/seasons?view=detail&id=${season.id}`}>
            <Button variant="secondary" leadingIcon={ArrowLeft}>
              Quay lại
            </Button>
          </Link>
          <Button type="submit" loading={updateMutation.isPending}>
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </div>
  );
}
