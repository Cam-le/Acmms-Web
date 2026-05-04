import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
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
  status: string;
  detailsCount: number;
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

function bedSortKey(name: string): number[] {
  const tokens = bedSortTokens(name);
  return tokens.length > 0 ? tokens : [Infinity];
}

function sortBeds<T extends { name: string; area: string }>(beds: T[]): T[] {
  return [...beds].sort((a, b) => {
    const areaCmp = a.area.localeCompare(b.area, "vi");
    if (areaCmp !== 0) return areaCmp;
    return compareTokenArrays(bedSortKey(a.name), bedSortKey(b.name));
  });
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

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [farms, setFarms] = useState<FarmResponse[]>([]);
  const [allPlots, setAllPlots] = useState<PlotResponse[]>([]);
  const [beds, setBeds] = useState<BedResponse[]>([]);
  const [crops, setCrops] = useState<CropResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [seasonToDelete, setSeasonToDelete] = useState<Season | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Load all data ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [apiSeasons, apiFarms, apiBeds, apiCrops, apiPlots] =
        await Promise.all([
          api.getSeasons(),
          api.getFarms(),
          api.getBeds(),
          api.getCrops(),
          api.getPlots(),
        ]);
      const safeFarms = Array.isArray(apiFarms) ? apiFarms : [];
      const safeBeds = Array.isArray(apiBeds) ? apiBeds : [];
      const safePlots = Array.isArray(apiPlots) ? apiPlots : [];
      const safeCrops = Array.isArray(apiCrops)
        ? apiCrops.filter(
            (c) => (c.cropStatus ?? "").toLowerCase() !== "inactive",
          )
        : [];
      const safeSeasons = Array.isArray(apiSeasons) ? apiSeasons : [];

      setFarms(safeFarms);
      setBeds(safeBeds);
      setAllPlots(safePlots);
      setCrops(safeCrops);
      setSeasons(
        [...safeSeasons]
          .sort((a, b) => {
            const da = a.seasonStartDate ?? "";
            const db = b.seasonStartDate ?? "";
            return db.localeCompare(da); // most recent first
          })
          .map((s) => mapSeasonResponse(s, safeFarms)),
      );
    } catch (err) {
      showToast("Không thể tải dữ liệu. Vui lòng thử lại.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const handleDelete = (season: Season) => {
    setSeasonToDelete(season);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!seasonToDelete) return;
    setDeleting(true);
    try {
      await api.deleteSeason(seasonToDelete.id);
      setDeleteDialogOpen(false);
      setSeasonToDelete(null);
      showToast(`Đã xóa mùa vụ "${seasonToDelete.name}"`, "success");
      await loadData();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Xóa mùa vụ thất bại.",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  // ── Route to sub-views ─────────────────────────────────────────────────────
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [selectedSeasonLoading, setSelectedSeasonLoading] = useState(false);

  useEffect(() => {
    if (!seasonId || view === "list" || view === "create") {
      setSelectedSeason(null);
      return;
    }
    setSelectedSeasonLoading(true);
    api
      .getSeason(seasonId)
      .then((apiSeason) => {
        setSelectedSeason(mapSeasonResponse(apiSeason, farms));
      })
      .catch(() => {
        setSelectedSeason(seasons.find((s) => s.id === seasonId) ?? null);
      })
      .finally(() => setSelectedSeasonLoading(false));
  }, [seasonId, view, farms, seasons]);

  if (view === "create")
    return (
      <CreateSeasonView
        farms={farms}
        beds={beds}
        plots={allPlots}
        crops={crops}
        onCreated={() => {
          loadData();
          setSearchParams({ view: "list" });
        }}
        showToast={showToast}
      />
    );

  const subViewLoading =
    selectedSeasonLoading ||
    (!!seasonId && view !== "list" && view !== "create" && !selectedSeason);

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
          api
            .getSeason(selectedSeason.id)
            .then((s) => setSelectedSeason(mapSeasonResponse(s, farms)))
            .catch(() => {})
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
          loadData();
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
              <table className="w-full">
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
          if (!o && !deleting) {
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
        loading={deleting}
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

  // ── Harvests ────────────────────────────────────────────────────────────────
  const [harvests, setHarvests] = useState<HarvestItem[]>([]);
  const [harvestsLoading, setHarvestsLoading] = useState(true);
  const [expandedHarvest, setExpandedHarvest] = useState<string | null>(null);
  const [harvestDetails, setHarvestDetails] = useState<
    Record<string, HarvestDetailResponse[]>
  >({});
  const [detailsLoading, setDetailsLoading] = useState<Record<string, boolean>>(
    {},
  );

  // Create harvest modal
  const [createHarvestOpen, setCreateHarvestOpen] = useState(false);
  const [editHarvest, setEditHarvest] = useState<HarvestItem | null>(null);
  const [deleteHarvest, setDeleteHarvest] = useState<HarvestItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingHarvest, setDeletingHarvest] = useState(false);

  // Harvest form
  const [harvestForm, setHarvestForm] = useState({
    plotId: "",
    cropId: "",
    expectedDate: "",
    expectedQuantity: "",
    status: "planned",
  });

  const loadHarvests = useCallback(async () => {
    setHarvestsLoading(true);
    try {
      const data = await api.getHarvestsBySeason(season.id);
      setHarvests(
        (Array.isArray(data) ? data : []).map((h: HarvestResponse) => ({
          harvestId: h.harvestId,
          plotId: h.plotId,
          plotName: h.plotName,
          cropId: h.cropId,
          cropName: h.cropName,
          expectedDate: h.expectedDate,
          expectedQuantity: h.expectedQuantity,
          status: h.status,
          detailsCount: h.detailsCount,
        })),
      );
    } catch {
      localToast("Không thể tải danh sách thu hoạch.", "error");
    } finally {
      setHarvestsLoading(false);
    }
  }, [season.id]);

  useEffect(() => {
    loadHarvests();
  }, [loadHarvests]);

  const toggleHarvest = async (harvestId: string) => {
    if (expandedHarvest === harvestId) {
      setExpandedHarvest(null);
      return;
    }
    setExpandedHarvest(harvestId);
    if (harvestDetails[harvestId]) return; // already loaded
    setDetailsLoading((p) => ({ ...p, [harvestId]: true }));
    try {
      const data = await api.getHarvestDetailsByHarvest(harvestId);
      setHarvestDetails((p) => ({
        ...p,
        [harvestId]: Array.isArray(data) ? data : [],
      }));
    } catch {
      localToast("Không thể tải chi tiết thu hoạch.", "error");
    } finally {
      setDetailsLoading((p) => ({ ...p, [harvestId]: false }));
    }
  };

  // ── Create/Edit harvest ─────────────────────────────────────────────────────
  const openCreateHarvest = () => {
    setHarvestForm({
      plotId: "",
      cropId: "",
      expectedDate: "",
      expectedQuantity: "",
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
      status: h.status,
    });
    setEditHarvest(h);
    setCreateHarvestOpen(true);
  };

  const handleHarvestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !harvestForm.plotId ||
      !harvestForm.cropId ||
      !harvestForm.expectedDate
    ) {
      localToast("Vui lòng điền đầy đủ thông tin bắt buộc.", "error");
      return;
    }
    setSubmitting(true);
    try {
      if (editHarvest) {
        const body: HarvestUpdateRequest = {
          expectedDate: harvestForm.expectedDate,
          expectedQuantity: parseFloat(harvestForm.expectedQuantity) || 0,
          status: harvestForm.status,
        };
        await api.updateHarvest(editHarvest.harvestId, body);
        localToast("Cập nhật thu hoạch thành công.", "success");
      } else {
        const body: HarvestRequest = {
          plotId: harvestForm.plotId,
          seasonId: season.id,
          cropId: harvestForm.cropId,
          expectedDate: harvestForm.expectedDate,
          expectedQuantity: parseFloat(harvestForm.expectedQuantity) || 0,
          status: harvestForm.status,
          startDate: season.startDate,
          endDate: season.endDate,
        };
        await api.createHarvest(body);
        localToast("Thêm thu hoạch thành công.", "success");
      }
      setCreateHarvestOpen(false);
      setEditHarvest(null);
      await loadHarvests();
    } catch (err) {
      localToast(
        err instanceof Error ? err.message : "Lưu thu hoạch thất bại.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteHarvest = async () => {
    if (!deleteHarvest) return;
    setDeletingHarvest(true);
    try {
      await api.deleteHarvest(deleteHarvest.harvestId);
      setDeleteHarvest(null);
      localToast("Đã xóa thu hoạch.", "success");
      await loadHarvests();
    } catch (err) {
      localToast(
        err instanceof Error ? err.message : "Xóa thu hoạch thất bại.",
        "error",
      );
    } finally {
      setDeletingHarvest(false);
    }
  };

  // ── IoT sensor data ─────────────────────────────────────────────────────────
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

  // ── Plots for this season's farm ────────────────────────────────────────────
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
      <div className="flex items-center justify-between gap-4">
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
              const details = harvestDetails[h.harvestId];
              const isLoadingDetails = detailsLoading[h.harvestId];

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
                            {h.expectedQuantity.toLocaleString("vi-VN")} cây
                          </span>
                          {h.detailsCount > 0 && (
                            <span className="flex items-center gap-1">
                              <BarChart2 className="w-3 h-3" />
                              {h.detailsCount} luống
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
                                {[
                                  "Luống",
                                  "Số lượng (cây)",
                                  "Ngày bắt đầu",
                                  "Ngày kết thúc",
                                ].map((h) => (
                                  <th
                                    key={h}
                                    className="px-4 py-2.5 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide whitespace-nowrap"
                                  >
                                    {h}
                                  </th>
                                ))}
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
                                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-ink-800">
                                      {d.bedName}
                                    </td>
                                    <td className="px-4 py-2.5 text-ink-700">
                                      {d.cropQuantity.toLocaleString("vi-VN")}
                                    </td>
                                    <td className="px-4 py-2.5 text-ink-500 whitespace-nowrap">
                                      {formatDate(d.startDate)}
                                    </td>
                                    <td className="px-4 py-2.5 text-ink-500 whitespace-nowrap">
                                      {formatDate(d.endDate)}
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
            <table className="w-full text-sm">
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
          if (!o && !submitting) {
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
              disabled={submitting}
            >
              Hủy
            </Button>
            <Button type="submit" loading={submitting}>
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
              label="Sản lượng dự kiến (kg)"
              type="number"
              value={harvestForm.expectedQuantity}
              onChange={(v) =>
                setHarvestForm((p) => ({ ...p, expectedQuantity: v }))
              }
              inputProps={{ min: "0" }}
              placeholder="0"
            />
          </div>

          <FormSelect
            label="Trạng thái"
            value={harvestForm.status}
            onChange={(v) => setHarvestForm((p) => ({ ...p, status: v }))}
            options={HARVEST_STATUS_OPTIONS}
          />
        </div>
      </Modal>

      {/* Delete Harvest Dialog */}
      <ConfirmDialog
        open={deleteHarvest !== null}
        onOpenChange={(o) => {
          if (!o && !deletingHarvest) setDeleteHarvest(null);
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
        loading={deletingHarvest}
        onConfirm={confirmDeleteHarvest}
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
  const [submitting, setSubmitting] = useState(false);
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

  // Harvest groups: each group = one harvest record (one plot+crop+date)
  interface HarvestGroup {
    id: string;
    plotId: string;
    cropId: string;
    expectedDate: string;
    expectedQuantity: string;
    // Which beds to assign to this harvest (for UI display; actual HarvestDetails are auto-created by backend)
    bedIds: string[];
  }

  const [harvestGroups, setHarvestGroups] = useState<HarvestGroup[]>([
    {
      id: crypto.randomUUID(),
      plotId: "",
      cropId: "",
      expectedDate: "",
      expectedQuantity: "",
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
      name: b.bedName,
      area: b.plotName ?? "Không rõ khu",
      size: b.bedArea ? `${b.bedArea} m²` : "—",
    })),
  );

  const farmPlots = plots.filter((p) => p.farmId === formData.farmId);
  const activeCrops = crops;

  // All bed IDs claimed across all groups
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

  // Bỏ qua: create season only, no harvests, then navigate
  const handleSkip = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const created = await api.createSeason({
        farmId: formData.farmId,
        seasonName: formData.name.trim(),
        seasonStartDate: formData.startDate,
        seasonEndDate: formData.endDate,
        description: formData.description.trim(),
        seasonNotes: formData.seasonNotes.trim(),
        status: formData.status,
      });
      const msg =
        (created as any)?.message ||
        `Đã tạo mùa vụ "${formData.name.trim()}" thành công.`;
      localToast(msg, "success");
      setTimeout(onCreated, 800);
    } catch (err) {
      localToast(
        err instanceof Error ? err.message : "Tạo mùa vụ thất bại.",
        "error",
      );
      setSubmitting(false);
    }
  };

  const handleStep2Submit = async () => {
    if (submitting) return; // guard against double-click

    const hasInvalid = harvestGroups.some(
      (g) => !g.plotId || !g.cropId || !g.expectedDate,
    );
    if (hasInvalid) {
      localToast(
        "Mỗi đợt thu hoạch cần có vuông đất, cây trồng và ngày dự kiến.",
        "error",
      );
      return;
    }

    setSubmitting(true);
    try {
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
        localToast(
          "Tạo mùa vụ thành công nhưng không thể gán thu hoạch. Vui lòng thêm thủ công.",
          "info",
        );
        setTimeout(onCreated, 800);
        return;
      }

      // Step 3: create harvest records
      const harvestsToCreate = harvestGroups.filter(
        (g) => g.plotId && g.cropId && g.expectedDate,
      );

      if (harvestsToCreate.length > 0) {
        const results = await Promise.allSettled(
          harvestsToCreate.map((g) =>
            api.createHarvest({
              plotId: g.plotId,
              seasonId: resolvedSeasonId!,
              cropId: g.cropId,
              expectedDate: g.expectedDate,
              expectedQuantity: parseFloat(g.expectedQuantity) || 0,
              status: "planned",
              startDate: formData.startDate,
              endDate: formData.endDate,
            }),
          ),
        );
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0) {
          localToast(
            `Tạo mùa vụ thành công. ${failed} đợt thu hoạch tạo thất bại — vui lòng thêm lại trong trang chi tiết.`,
            "info",
          );
        } else {
          const serverMsg =
            (created as any)?.message ||
            `Tạo mùa vụ "${formData.name.trim()}" và ${harvestsToCreate.length} đợt thu hoạch thành công.`;
          localToast(serverMsg, "success");
        }
      } else {
        const serverMsg =
          (created as any)?.message ||
          `Đã tạo mùa vụ "${formData.name.trim()}" thành công.`;
        localToast(serverMsg, "success");
      }

      setTimeout(onCreated, 900);
    } catch (err) {
      localToast(
        err instanceof Error ? err.message : "Tạo mùa vụ thất bại.",
        "error",
      );
      setSubmitting(false); // re-enable only on error so user can retry
    }
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
                    label="Số lượng dự kiến (cây)"
                    type="number"
                    value={group.expectedQuantity}
                    onChange={(v) =>
                      setHarvestGroups((p) =>
                        p.map((g) =>
                          g.id === group.id ? { ...g, expectedQuantity: v } : g,
                        ),
                      )
                    }
                    inputProps={{ min: "0" }}
                    placeholder="0"
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
              <Button variant="ghost" onClick={handleSkip} loading={submitting}>
                Bỏ qua (tạo sau)
              </Button>
              <Button
                leadingIcon={CheckCircle}
                loading={submitting}
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
  const [submitting, setSubmitting] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await api.updateSeason(season.id, {
        farmId: formData.farmId,
        seasonName: formData.name.trim(),
        seasonStartDate: formData.startDate,
        seasonEndDate: formData.endDate,
        description: formData.description.trim(),
        seasonNotes: formData.seasonNotes.trim(),
        status: formData.status,
      });
      localToast("Cập nhật mùa vụ thành công.", "success");
      setTimeout(onUpdated, 600);
    } catch (err) {
      localToast(
        err instanceof Error ? err.message : "Cập nhật thất bại.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
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
          <Button type="submit" loading={submitting}>
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </div>
  );
}
