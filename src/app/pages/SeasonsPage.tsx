import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  Sprout,
  ArrowLeft,
  ChevronDown,
  CheckCircle,
  Lock,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Wheat,
  Info,
  FileText,
  AlertTriangle,
  Check,
} from "lucide-react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Collapsible from "@radix-ui/react-collapsible";
import {
  api,
  SeasonResponse,
  SeasonDetailResponse,
  FarmResponse,
  PlotResponse,
  BedResponse,
  CropResponse,
} from "../../api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Real API season status values:
 *   Planned    → dùng khi phân luống trước khi bắt đầu mùa mới
 *   On-Going   → đang canh tác
 *   Harvested  → đã thu hoạch
 *   Closed     → kết thúc mùa vụ
 */
type SeasonStatus =
  | "Lên kế hoạch"
  | "Đang canh tác"
  | "Đã thu hoạch"
  | "Đã kết thúc";

/** Per-plot (bed) status inside a season */
type SeasonPlotStatus =
  | "Chưa trồng"
  | "Đang trồng"
  | "Đã thu hoạch"
  | "Cảnh báo";

type CropType = string;

interface PlotAssignment {
  plotId: string;
  plotName: string;
  area: string;
  crop: CropType;
  sowingDate: string;
  harvestDate: string;
  plannedQuantity: number;
  actualPlanted: number;
  harvestQuantity: number;
  status: SeasonStatus | SeasonPlotStatus | string;
  [key: string]: any; // _seasonDetailId, _bedId, _cropId
}

interface Season {
  id: string;
  name: string;
  farm: string;
  farmId: string;
  startDate: string;
  endDate: string;
  description: string;
  seasonNotes: string;
  status: SeasonStatus;
  plots: PlotAssignment[];
}

/** PlotAssignment with narrowed plot status type */
interface PlotAssignmentV2 extends Omit<PlotAssignment, "status"> {
  status: SeasonPlotStatus;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const seasonStatusConfig: Record<SeasonStatus, string> = {
  "Lên kế hoạch": "bg-[#dbeafe] text-[#1e40af]",
  "Đang canh tác": "bg-[#dcfce7] text-[#008236]",
  "Đã thu hoạch": "bg-[#fef9c3] text-[#854d0e]",
  "Đã kết thúc": "bg-[#f1f5f9] text-[#475569]",
};

const plotStatusConfig: Record<
  SeasonPlotStatus,
  { badge: string; dot: string }
> = {
  "Chưa trồng": {
    badge: "bg-[#f1f5f9] text-[#475569] border border-[#cbd5e1]",
    dot: "bg-[#94a3b8]",
  },
  "Đang trồng": {
    badge: "bg-[#fef9c3] text-[#854d0e] border border-[#fde68a]",
    dot: "bg-[#f59e0b]",
  },
  "Đã thu hoạch": {
    badge: "bg-[#dcfce7] text-[#008236] border border-[#86efac]",
    dot: "bg-[#22c55e]",
  },
  "Cảnh báo": {
    badge: "bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5]",
    dot: "bg-[#ef4444]",
  },
};

/**
 * Naming convention: "[KhuVực]-[NN]"
 * e.g. area prefix "A" + sequence 3 → "A-03"
 * Derive prefix from the area label: take the first word that is a single letter A-Z,
 * fallback to first char of area.
 */
export function derivePlotPrefix(areaLabel: string): string {
  const match = areaLabel.match(/\b([A-Z])\b/);
  if (match) return match[1];
  return (areaLabel.trim()[0] || "X").toUpperCase();
}

export function formatPlotName(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(2, "0")}`;
}

/** Extract leading numeric part from "Luống N_..." pattern, then fallback to
 *  trailing number after last '_' or '-'.
 *  e.g. "Luống 05_Vuông 01_Tây Nam" → 5, "A-05" → 5, "plotX" → Infinity */
function bedSortKey(name: string): number {
  // Primary: "Luống N" prefix (handles the real API naming convention)
  const luong = name.match(/^Luống\s+(\d+)/i);
  if (luong) return parseInt(luong[1], 10);
  // Fallback: trailing number after last '_' or '-'
  const m = name.match(/[_\-](\d+)$/);
  return m ? parseInt(m[1], 10) : Infinity;
}

/** Sort bed items: primary by area (alphabetical), secondary by numeric suffix of bed name. */
function sortBeds<T extends { name: string; area: string }>(beds: T[]): T[] {
  return [...beds].sort((a, b) => {
    const areaCmp = a.area.localeCompare(b.area, "vi");
    if (areaCmp !== 0) return areaCmp;
    return bedSortKey(a.name) - bedSortKey(b.name);
  });
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const dmy = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) return new Date(`${dmy[3]}-${dmy[2]}-${dmy[1]}`);
  const ymd = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
  if (ymd) return new Date(dateStr);
  return null;
}

function isHarvestUnlocked(harvestDate: string): boolean {
  const d = parseDate(harvestDate);
  if (!d) return false;
  return new Date() >= d;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const ymd = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return `${ymd[3]}/${ymd[2]}/${ymd[1]}`;
  return dateStr;
}

/**
 * Snaps a harvest date to the Monday of its ISO week.
 * Returns "UNSET" for missing/invalid dates so those luống
 * are bucketed together at the bottom of each khu.
 */
export function getHarvestWeekKey(harvestDate: string): string {
  const d = parseDate(harvestDate);
  if (!d) return "__unset__";
  // ISO week Monday: subtract (weekday + 6) % 7 days
  const day = d.getDay(); // 0 = Sun
  const diff = (day + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  return monday.toISOString().slice(0, 10);
}

/** Human-readable label for a week bucket, e.g. "20/04 – 26/04/2026" */
export function formatWeekRange(mondayKey: string): string {
  if (mondayKey === "__unset__") return "Chưa có ngày thu hoạch";
  const mon = new Date(mondayKey);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  const year = sun.getFullYear();
  return `${fmt(mon)} – ${fmt(sun)}/${year}`;
}

/**
 * Groups plots within a khu into harvest-week buckets (±7 days = same Monday).
 * Returns entries sorted by week key so the earliest harvest comes first.
 */
export function groupByHarvestWeek(
  plots: PlotAssignmentV2[],
): [string, PlotAssignmentV2[]][] {
  const map: Record<string, PlotAssignmentV2[]> = {};
  for (const p of plots) {
    const key = getHarvestWeekKey(p.harvestDate);
    if (!map[key]) map[key] = [];
    map[key].push(p);
  }
  return Object.entries(map).sort(([a], [b]) => {
    if (a === "__unset__") return 1;
    if (b === "__unset__") return -1;
    return a < b ? -1 : 1;
  });
}

/** Cast legacy PlotAssignment status to SeasonPlotStatus */
function toV2(plot: PlotAssignment): PlotAssignmentV2 {
  const legacyMap: Record<string, SeasonPlotStatus> = {
    // Legacy mock values
    "Đang hoạt động": "Đang trồng",
    "Sắp diễn ra": "Chưa trồng",
    // New real API season statuses (map to closest plot status)
    "Lên kế hoạch": "Chưa trồng",
    "Đang canh tác": "Đang trồng",
    // Bed statuses from API
    Planted: "Đang trồng",
    Empty: "Chưa trồng",
    Warning: "Cảnh báo",
    // Already-correct values
    "Chưa trồng": "Chưa trồng",
    "Đang trồng": "Đang trồng",
    "Đã thu hoạch": "Đã thu hoạch",
    "Đã kết thúc": "Đã thu hoạch",
  };
  return {
    ...plot,
    status: legacyMap[plot.status as string] ?? "Chưa trồng",
  };
}

// ─── Pagination component ─────────────────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: PaginationProps) {
  if (totalPages <= 1) return null;
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("…");
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    )
      pages.push(i);
    if (currentPage < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-[#e2e8f0]">
      <span className="text-sm text-[#62748e]">
        Hiển thị {start}–{end} / {totalItems} mùa vụ
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg text-[#62748e] hover:bg-[#f0fdfa] hover:text-[#009689] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-2 text-[#90a1b9] text-sm">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                currentPage === p
                  ? "bg-[#009689] text-white"
                  : "text-[#62748e] hover:bg-[#f0fdfa] hover:text-[#009689]"
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg text-[#62748e] hover:bg-[#f0fdfa] hover:text-[#009689] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Farm Select ──────────────────────────────────────────────────────────────

function FarmSelect({
  value,
  onChange,
  placeholder,
  className,
  farms,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  farms: FarmResponse[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155] ${className ?? ""}`}
    >
      <option value="">{placeholder ?? "Chọn trang trại"}</option>
      {farms.map((f) => (
        <option key={f.farmId} value={f.farmId}>
          {f.farmName}
        </option>
      ))}
    </select>
  );
}

// ─── API Status Mapping ───────────────────────────────────────────────────────

/**
 * API trả về status: "Planned" / "On-Going" / "Harvested" / "Closed"
 * (có thể lowercase hoặc có dấu gạch ngang khác nhau).
 * Normalize về SeasonStatus (Vietnamese) để dùng trong UI.
 */
function normalizeSeasonStatus(raw: string | undefined): SeasonStatus {
  const s = (raw ?? "").toLowerCase().replace(/[-_\s]/g, "");
  if (s === "planned") return "Lên kế hoạch";
  if (s === "ongoing" || s === "active") return "Đang canh tác";
  if (s === "harvested") return "Đã thu hoạch";
  if (s === "closed" || s === "inactive" || s === "ended") return "Đã kết thúc";
  return "Lên kế hoạch"; // safe default
}

/** Reverse: SeasonStatus → API string */
function toApiStatus(status: SeasonStatus): string {
  if (status === "Lên kế hoạch") return "Planned";
  if (status === "Đang canh tác") return "On-Going";
  if (status === "Đã thu hoạch") return "Harvested";
  return "Closed";
}

/**
 * Map SeasonResponse + FarmResponse[] + SeasonDetailResponse[] → Season (UI type).
 * Defensive: mọi field có thể undefined/null đều được guard.
 */
function mapApiSeasonToUi(
  s: SeasonResponse,
  farms: FarmResponse[],
  details: SeasonDetailResponse[],
  beds: BedResponse[] = [],
): Season {
  const farm = farms.find((f) => f.farmId === s.farmId);
  const seasonDetails = details.filter((d) => d.seasonId === s.seasonId);

  const plots: PlotAssignment[] = seasonDetails.map((d) => {
    const bed = beds.find((b) => b.bedId === d.bedId);
    // Map API bedStatus → SeasonPlotStatus
    const bedStatusMap: Record<string, string> = {
      Planted: "Đang trồng",
      Empty: "Chưa trồng",
      Warning: "Cảnh báo",
      Active: "Đang trồng", // legacy fallback
    };
    const plotStatus = bedStatusMap[bed?.bedStatus ?? ""] ?? "Chưa trồng";
    return {
      plotId: d.seasonDetailId,
      plotName: d.bedName ?? d.bedId ?? "—",
      area: bed?.plotName ?? "Không rõ khu",
      crop: (d.cropName ?? "Bắp Cải Trắng") as CropType,
      sowingDate: d.startDate ?? "",
      harvestDate: d.seasonExpectedHarvestDate ?? "",
      plannedQuantity: d.cropQuantity ?? 0,
      // actualPlanted comes from bed.cropQuantities (how many plants are in the bed)
      actualPlanted: bed?.cropQuantities ?? 0,
      harvestQuantity: d.totalHarvestYield ?? 0,
      status: plotStatus as any,
      _seasonDetailId: d.seasonDetailId,
      _bedId: d.bedId,
      _cropId: d.cropId,
    } as any as PlotAssignment;
  });

  return {
    id: s.seasonId ?? "",
    name: s.seasonName ?? "(Không có tên)",
    farm: farm?.farmName ?? s.farmId ?? "—",
    farmId: s.farmId ?? "",
    startDate: s.seasonStartDate ?? "",
    endDate: s.seasonEndDate ?? "",
    description: s.description ?? "",
    seasonNotes: s.seasonNotes ?? "",
    status: normalizeSeasonStatus(s.status),
    plots,
  };
}

// ─── Seasons Page (List) ──────────────────────────────────────────────────────

const PAGE_SIZE_LIST = 8;
const PAGE_SIZE_DETAIL_PLOTS = 10;

export function SeasonsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") || "list";
  const seasonId = searchParams.get("id");

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [farms, setFarms] = useState<FarmResponse[]>([]);
  const [allDetails, setAllDetails] = useState<SeasonDetailResponse[]>([]);
  const [allPlots, setAllPlots] = useState<PlotResponse[]>([]);
  const [beds, setBeds] = useState<BedResponse[]>([]);
  const [crops, setCrops] = useState<CropResponse[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<SeasonStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [seasonToDelete, setSeasonToDelete] = useState<Season | null>(null);

  // ── Load all data ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [apiSeasons, apiDetails, apiFarms, apiBeds, apiCrops, apiPlots] =
        await Promise.all([
          api.getSeasons(),
          api.getSeasonsDetails(),
          api.getFarms(),
          api.getBeds(),
          api.getCrops(),
          api.getPlots(),
        ]);
      const safeSeasons = Array.isArray(apiSeasons) ? apiSeasons : [];
      const safeDetails = Array.isArray(apiDetails) ? apiDetails : [];
      const safeFarms = Array.isArray(apiFarms) ? apiFarms : [];
      const safeBeds = Array.isArray(apiBeds) ? apiBeds : [];
      const safePlots = Array.isArray(apiPlots) ? apiPlots : [];
      const safeCrops = Array.isArray(apiCrops)
        ? apiCrops.filter(
            (c) => (c.cropStatus ?? "").toLowerCase() !== "inactive",
          )
        : [];

      setFarms(safeFarms);
      setAllDetails(safeDetails);
      setBeds(safeBeds);
      setAllPlots(safePlots);
      setCrops(safeCrops);
      setSeasons(
        safeSeasons.map((s) =>
          mapApiSeasonToUi(s, safeFarms, safeDetails, safeBeds),
        ),
      );
    } catch (err) {
      setLoadError("Không thể tải dữ liệu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Filtered + paginated ───────────────────────────────────────────────────
  const filteredSeasons = seasons.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      (s.name ?? "").toLowerCase().includes(q) ||
      (s.farm ?? "").toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSeasons.length / PAGE_SIZE_LIST),
  );
  const paginated = filteredSeasons.slice(
    (currentPage - 1) * PAGE_SIZE_LIST,
    currentPage * PAGE_SIZE_LIST,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const handleDelete = (season: Season) => {
    setSeasonToDelete(season);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!seasonToDelete) return;
    try {
      await api.deleteSeason(seasonToDelete.id);
      await loadData();
    } catch {
      setLoadError("Xóa mùa vụ thất bại. Vui lòng thử lại.");
    }
    setSeasonToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleCreate = async (
    seasonData: Omit<Season, "id">,
    detailsToCreate: Array<{
      bedId: string;
      cropId: string;
      cropQuantity: number;
      startDate: string;
      endDate: string;
      harvestDate: string;
    }>,
  ) => {
    const farmId =
      (seasonData as any).farmId ||
      farms.find((f) => f.farmName === seasonData.farm)?.farmId ||
      "";
    const created = await api.createSeason({
      farmId,
      seasonName: seasonData.name,
      seasonStartDate: seasonData.startDate,
      seasonEndDate: seasonData.endDate,
      description: seasonData.description,
      seasonNotes: (seasonData as any).seasonNotes ?? "",
      status: toApiStatus(seasonData.status),
    });
    if (created?.seasonId && detailsToCreate.length > 0) {
      await Promise.allSettled(
        detailsToCreate.map((d) =>
          api.createSeasonDetail({
            seasonId: created.seasonId,
            bedId: d.bedId,
            cropId: d.cropId,
            cropQuantity: d.cropQuantity,
            startDate: d.startDate || seasonData.startDate,
            endDate: d.endDate || seasonData.endDate,
            seasonExpectedHarvestDate: d.harvestDate || seasonData.endDate,
            totalHarvestYield: 0,
          }),
        ),
      );
    }
    await loadData();
    setSearchParams({ view: "list" });
  };

  const handleUpdate = async (
    updatedSeason: Season,
    detailOps?: {
      toAdd: Array<{
        bedId: string;
        cropId: string;
        cropQuantity: number;
        startDate: string;
        endDate: string;
        harvestDate: string;
      }>;
      toDelete: string[];
      toUpdate: Array<{
        seasonDetailId: string;
        bedId: string;
        cropId: string;
        cropQuantity: number;
        startDate: string;
        endDate: string;
        harvestDate: string;
        totalHarvestYield: number;
      }>;
    },
  ) => {
    const farmId =
      (updatedSeason as any).farmId ||
      farms.find((f) => f.farmName === updatedSeason.farm)?.farmId ||
      farms[0]?.farmId ||
      "";
    await api.updateSeason(updatedSeason.id, {
      farmId,
      seasonName: updatedSeason.name,
      seasonStartDate: updatedSeason.startDate,
      seasonEndDate: updatedSeason.endDate,
      description: updatedSeason.description,
      seasonNotes: (updatedSeason as any).seasonNotes ?? "",
      status: toApiStatus(updatedSeason.status),
    });
    if (detailOps) {
      await Promise.allSettled([
        ...detailOps.toDelete.map((id) => api.deleteSeasonDetail(id)),
        ...detailOps.toAdd.map((d) =>
          api.createSeasonDetail({
            seasonId: updatedSeason.id,
            bedId: d.bedId,
            cropId: d.cropId,
            cropQuantity: d.cropQuantity,
            startDate: d.startDate || updatedSeason.startDate,
            endDate: d.endDate || updatedSeason.endDate,
            seasonExpectedHarvestDate: d.harvestDate || updatedSeason.endDate,
            totalHarvestYield: 0,
          }),
        ),
        ...(detailOps.toUpdate ?? []).map((d) =>
          api.updateSeasonDetail(d.seasonDetailId, {
            seasonId: updatedSeason.id,
            bedId: d.bedId,
            cropId: d.cropId,
            cropQuantity: d.cropQuantity,
            startDate: d.startDate || updatedSeason.startDate,
            endDate: d.endDate || updatedSeason.endDate,
            seasonExpectedHarvestDate: d.harvestDate || updatedSeason.endDate,
            totalHarvestYield: d.totalHarvestYield,
          }),
        ),
      ]);
    }
    await loadData();
    setSearchParams({ view: "list" });
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
    Promise.all([api.getSeason(seasonId), api.getSeasonsDetails()])
      .then(([apiSeason, apiDetails]) => {
        const safeDetails = Array.isArray(apiDetails) ? apiDetails : [];
        setSelectedSeason(
          mapApiSeasonToUi(apiSeason, farms, safeDetails, beds),
        );
      })
      .catch(() => {
        // Fall back to already-loaded list data if detail fetch fails
        setSelectedSeason(seasons.find((s) => s.id === seasonId) ?? null);
      })
      .finally(() => setSelectedSeasonLoading(false));
  }, [seasonId, view, farms, seasons, beds]);

  if (view === "create")
    return (
      <CreateSeasonView
        farms={farms}
        beds={beds}
        plots={allPlots}
        crops={crops}
        onCreate={handleCreate}
      />
    );

  const subViewLoading =
    selectedSeasonLoading ||
    (!!seasonId && view !== "list" && view !== "create" && !selectedSeason);

  if ((view === "detail" || view === "edit") && subViewLoading)
    return (
      <div className="flex items-center justify-center py-32 text-[#62748e]">
        <div className="w-6 h-6 border-2 border-[#009689] border-t-transparent rounded-full animate-spin mr-3" />
        Đang tải mùa vụ...
      </div>
    );

  if (view === "detail" && selectedSeason)
    return <DetailSeasonView season={selectedSeason} />;
  if (view === "edit" && selectedSeason)
    return (
      <EditSeasonView
        key={selectedSeason.id}
        season={selectedSeason}
        farms={farms}
        beds={beds}
        plots={allPlots}
        crops={crops}
        onUpdate={handleUpdate}
      />
    );

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[#115e59] text-2xl font-semibold">
            Quản Lý Mùa Vụ
          </h1>
        </div>
        <Link
          to="/seasons?view=create"
          className="bg-[#009689] text-white px-4 py-2 rounded-lg hover:bg-[#007f75] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Mùa vụ mới
        </Link>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{loadError}</span>
          <button
            onClick={() => {
              setLoadError(null);
              loadData();
            }}
            className="ml-auto text-red-600 hover:text-red-800 font-medium underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#90A1B9]" />
            <input
              type="text"
              placeholder="Tìm kiếm mùa vụ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(
              [
                "all",
                "Lên kế hoạch",
                "Đang canh tác",
                "Đã thu hoạch",
                "Đã kết thúc",
              ] as const
            ).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === s
                    ? "bg-[#009689] text-white"
                    : "bg-white border border-[#cad5e2] text-[#62748e] hover:bg-[#f8fafc]"
                }`}
              >
                {s === "all" ? "Tất cả" : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#62748e]">
            <div className="w-6 h-6 border-2 border-[#009689] border-t-transparent rounded-full animate-spin mr-3" />
            Đang tải dữ liệu...
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
              <tr>
                {[
                  "Tên mùa vụ",
                  "Trang trại",
                  "Thời gian",
                  "Số luống",
                  "Trạng thái",
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
              {paginated.map((season) => (
                <tr
                  key={season.id}
                  className="hover:bg-[#f8fafc] transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-[#115e59]">
                    {season.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#62748e]">
                    {season.farm}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-[#62748e]">
                      Bắt đầu: {formatDate(season.startDate)}
                    </div>
                    <div className="text-xs text-[#62748e]">
                      Kết thúc: {formatDate(season.endDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#115e59] font-medium">
                    {season.plots?.length ?? 0}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${seasonStatusConfig[season.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {season.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        to={`/seasons?view=detail&id=${season.id}`}
                        className="p-2 text-[#009689] hover:bg-[#f0fdfa] rounded-lg transition-colors"
                        title="Xem"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/seasons?view=edit&id=${season.id}`}
                        className="p-2 text-[#009689] hover:bg-[#f0fdfa] rounded-lg transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(season)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa"
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

        {!loading && filteredSeasons.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-[#62748e] gap-3">
            <Calendar className="w-12 h-12 text-[#cad5e2]" />
            <p>
              {searchQuery || filterStatus !== "all"
                ? "Không tìm thấy mùa vụ phù hợp"
                : "Chưa có mùa vụ nào"}
            </p>
          </div>
        ) : (
          !loading && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredSeasons.length}
              pageSize={PAGE_SIZE_LIST}
            />
          )
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog.Root
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
            <AlertDialog.Title className="text-lg font-semibold text-slate-900 mb-2">
              Xác nhận xóa mùa vụ
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-slate-600 mb-6">
              Bạn có chắc chắn muốn xóa{" "}
              <span className="font-semibold">{seasonToDelete?.name}</span>?
              Hành động này không thể hoàn tác.
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
                  Xóa mùa vụ
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

// ─── Detail View ──────────────────────────────────────────────────────────────

function DetailSeasonView({ season }: { season: Season }) {
  const v2Plots = season.plots.map(toV2);

  // Two-level grouping: khu → harvest week buckets
  const plotsByArea = v2Plots.reduce(
    (acc, plot) => {
      if (!acc[plot.area]) acc[plot.area] = [];
      acc[plot.area].push(plot);
      return acc;
    },
    {} as Record<string, PlotAssignmentV2[]>,
  );

  // Pagination keyed by "area::weekKey"
  const [areaPages, setAreaPages] = useState<Record<string, number>>({});
  const getPage = (key: string) => areaPages[key] ?? 1;
  const setPage = (key: string, page: number) =>
    setAreaPages((p) => ({ ...p, [key]: page }));

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/seasons"
            className="p-2 text-[#62748e] hover:text-[#115e59] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-[#115e59] text-2xl font-semibold">
              {season.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${seasonStatusConfig[season.status]}`}
              >
                {season.status}
              </span>
            </div>
          </div>
        </div>
        <Link
          to={`/seasons?view=edit&id=${season.id}`}
          className="flex items-center gap-2 px-4 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors"
        >
          <Edit className="w-4 h-4" /> Chỉnh sửa
        </Link>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
        <h3 className="text-sm font-bold text-[#62748e] uppercase mb-4 flex items-center gap-2">
          <Sprout className="w-4 h-4" /> Thông tin chung
        </h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#dbeafe] rounded-lg flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-[#1e40af]" />
            </div>
            <div>
              <div className="text-xs text-[#62748e] mb-1">TRANG TRẠI</div>
              <div className="font-medium text-[#115e59]">{season.farm}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#fef3c7] rounded-lg flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-[#92400e]" />
            </div>
            <div>
              <div className="text-xs text-[#62748e] mb-1">THỜI GIAN</div>
              <div className="font-medium text-[#115e59]">
                {formatDate(season.startDate)} – {formatDate(season.endDate)}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#dcfce7] rounded-lg flex items-center justify-center shrink-0">
              <Sprout className="w-5 h-5 text-[#008236]" />
            </div>
            <div>
              <div className="text-xs text-[#62748e] mb-1">MÔ TẢ</div>
              <div className="font-medium text-[#115e59]">
                {season.description || "Vụ mùa chính trồng bắp cải."}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plots grouped by area */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#62748e] uppercase">
            Thông tin chi tiết luống
          </h3>
          {(() => {
            const totalKg = v2Plots.reduce(
              (s, p) => s + (p.harvestQuantity ?? 0),
              0,
            );
            const harvestedPlots = v2Plots.filter(
              (p) => p.status === "Đã thu hoạch",
            ).length;
            return (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f0fdfa] border border-[#99f6e4] rounded-lg">
                <Wheat className="w-4 h-4 text-[#008236]" />
                <span className="text-xs text-[#62748e]">
                  Tổng sản lượng thu hoạch:
                </span>
                <span className="text-sm font-semibold text-[#008236]">
                  {totalKg > 0 ? `${totalKg.toLocaleString("vi-VN")} kg` : "—"}
                </span>
                {harvestedPlots > 0 && (
                  <span className="text-xs text-[#62748e]">
                    ({harvestedPlots}/{v2Plots.length} luống)
                  </span>
                )}
              </div>
            );
          })()}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-xs text-[#62748e]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[#fbbf24]" />{" "}
            Đang trồng
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[#22c55e]" />{" "}
            Đã thu hoạch
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-xs">
              Tên luống: [Khu]-[NN] — ví dụ A-01, B-12
            </span>
          </span>
        </div>

        {Object.entries(plotsByArea).map(([areaLabel, areaPlots]) => {
          const areaHarvested = areaPlots.filter(
            (p) => p.status === "Đã thu hoạch",
          ).length;
          const weekBuckets = groupByHarvestWeek(areaPlots);

          return (
            <Collapsible.Root key={areaLabel} defaultOpen className="mb-4">
              {/* ── Khu header ── */}
              <Collapsible.Trigger className="flex items-center justify-between w-full py-3 px-4 bg-[#f0fdfa] rounded-lg border border-[#99f6e4] hover:bg-[#ccfbf1] transition-colors">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-[#115e59]">
                    {areaLabel}
                  </span>
                  <span className="text-xs text-[#62748e]">
                    {areaPlots.length} luống · {areaHarvested}/
                    {areaPlots.length} đã thu hoạch
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-[#62748e]" />
              </Collapsible.Trigger>

              <Collapsible.Content>
                <div className="mt-2 space-y-3 pl-3 border-l-2 border-[#99f6e4]">
                  {weekBuckets.map(([weekKey, weekPlots]) => {
                    const paginationKey = `${areaLabel}::${weekKey}`;
                    const page = getPage(paginationKey);
                    const total = weekPlots.length;
                    const tPages = Math.max(
                      1,
                      Math.ceil(total / PAGE_SIZE_DETAIL_PLOTS),
                    );
                    const paged = weekPlots.slice(
                      (page - 1) * PAGE_SIZE_DETAIL_PLOTS,
                      page * PAGE_SIZE_DETAIL_PLOTS,
                    );
                    const weekHarvested = weekPlots.filter(
                      (p) => p.status === "Đã thu hoạch",
                    ).length;
                    const allDone = weekHarvested === total;
                    const cropLabels = [
                      ...new Set(weekPlots.map((p) => p.crop)),
                    ];

                    return (
                      <div
                        key={weekKey}
                        className="rounded-lg border border-[#e2e8f0] overflow-hidden"
                      >
                        {/* Week sub-header */}
                        <div className="flex items-center justify-between px-4 py-2 bg-[#f8fafc] border-b border-[#e2e8f0]">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-xs font-semibold text-[#475569]">
                              <Calendar className="w-3.5 h-3.5" /> Thu hoạch:{" "}
                              {formatWeekRange(weekKey)}
                            </span>
                            <div className="flex gap-1">
                              {cropLabels.map((c) => (
                                <span
                                  key={c}
                                  className="text-xs px-1.5 py-0.5 bg-white border border-[#e2e8f0] rounded text-[#62748e]"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#62748e]">
                              {weekHarvested}/{total} đã thu
                            </span>
                            {allDone && (
                              <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-[#008236] bg-[#dcfce7] rounded-full">
                                <Check className="w-3 h-3" /> Xong
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Plot table */}
                        <table className="w-full">
                          <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                            <tr>
                              {[
                                "Luống",
                                "Cây trồng",
                                "Ngày gieo",
                                "Thu hoạch",
                                "SL dự kiến",
                                "SL thực tế",
                                "Sản lượng (kg)",
                                "Trạng thái",
                              ].map((h) => (
                                <th
                                  key={h}
                                  className="px-4 py-2.5 text-left text-xs font-medium text-[#62748e] uppercase"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e2e8f0]">
                            {paged.map((plot) => {
                              const harvestUnlocked = isHarvestUnlocked(
                                plot.harvestDate,
                              );
                              return (
                                <tr
                                  key={plot.plotId}
                                  className="hover:bg-[#f8fafc] transition-colors"
                                >
                                  <td className="px-4 py-2.5 text-sm font-mono font-medium text-[#115e59]">
                                    {plot.plotName}
                                  </td>
                                  <td className="px-4 py-2.5 text-sm text-[#62748e]">
                                    {plot.crop}
                                  </td>
                                  <td className="px-4 py-2.5 text-sm text-[#62748e]">
                                    {formatDate(plot.sowingDate)}
                                  </td>
                                  <td className="px-4 py-2.5 text-sm text-[#62748e]">
                                    {formatDate(plot.harvestDate)}
                                  </td>
                                  <td className="px-4 py-2.5 text-sm text-[#62748e]">
                                    {plot.plannedQuantity ?? 0}
                                  </td>
                                  <td className="px-4 py-2.5 text-sm text-[#62748e]">
                                    {plot.actualPlanted ?? 0}
                                  </td>
                                  <td className="px-4 py-2.5 text-sm text-[#62748e]">
                                    {harvestUnlocked ? (
                                      plot.harvestQuantity ? (
                                        `${plot.harvestQuantity} kg`
                                      ) : (
                                        <span className="text-[#90a1b9]">
                                          —
                                        </span>
                                      )
                                    ) : (
                                      <span className="flex items-center gap-1 text-[#90a1b9]">
                                        <Lock className="w-3 h-3" /> Chưa thu
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span
                                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${plotStatusConfig[plot.status]?.badge ?? ""}`}
                                    >
                                      {plot.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {tPages > 1 && (
                          <Pagination
                            currentPage={page}
                            totalPages={tPages}
                            onPageChange={(p) => setPage(paginationKey, p)}
                            totalItems={total}
                            pageSize={PAGE_SIZE_DETAIL_PLOTS}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Collapsible.Content>
            </Collapsible.Root>
          );
        })}

        {season.plots.length === 0 && (
          <div className="text-center py-8 text-[#62748e]">
            Chưa có luống nào được gán cho mùa vụ này
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create View ──────────────────────────────────────────────────────────────

function CreateSeasonView({
  farms,
  beds,
  crops,
  plots,
  onCreate,
}: {
  farms: FarmResponse[];
  beds: BedResponse[];
  plots: PlotResponse[];
  crops: CropResponse[];
  onCreate: (
    season: Omit<Season, "id">,
    detailsToCreate: Array<{
      bedId: string;
      cropId: string;
      cropQuantity: number;
      startDate: string;
      endDate: string;
      harvestDate: string;
    }>,
  ) => void;
}) {
  const [step, setStep] = useState(1);
  const [seasonFormErrors, setSeasonFormErrors] = useState<
    Record<string, string>
  >({});
  const [formData, setFormData] = useState({
    name: "",
    farm: "",
    farmId: "",
    startDate: "",
    endDate: "",
    description: "",
    seasonNotes: "",
    status: "Lên kế hoạch" as SeasonStatus,
    plots: [] as PlotAssignment[],
  });
  const [selectedPlots, setSelectedPlots] = useState<string[]>([]);
  const [plotDetails, setPlotDetails] = useState<
    Record<
      string,
      {
        crop: CropType;
        cropId: string;
        cropQuantity: number;
        sowingDate: string;
        harvestDate: string;
      }
    >
  >({});

  // Filter beds theo farm đang chọn (qua plotId → farmId)
  const bedsForFarm = formData.farmId
    ? beds.filter((b) => {
        const plot = plots.find((p) => p.plotId === b.plotId);
        return plot?.farmId === formData.farmId;
      })
    : beds;

  // Beds filtered by selected farm
  const availableBeds = sortBeds(
    bedsForFarm.map((b) => ({
      id: b.bedId,
      name: b.bedName,
      area: b.plotName ?? "Không rõ khu",
      size: b.bedArea ? `${b.bedArea} m²` : "—",
    })),
  );

  // Dùng crops từ API; mỗi option có cropId thực
  const firstCropId = crops[0]?.cropId ?? "";
  const firstCropName = (crops[0]?.cropName ?? "Bắp Cải Trắng") as CropType;

  const defaultDetail = {
    crop: firstCropName,
    cropId: firstCropId,
    cropQuantity: 0,
    sowingDate: "",
    harvestDate: "",
  };

  const handleStep2Submit = () => {
    const plots: PlotAssignment[] = selectedPlots.map((plotId) => {
      const plot = availableBeds.find((p) => p.id === plotId)!;
      const details = plotDetails[plotId] || defaultDetail;
      return {
        plotId,
        plotName: plot.name,
        area: plot.area,
        crop: details.crop,
        sowingDate: details.sowingDate,
        harvestDate: details.harvestDate,
        plannedQuantity: details.cropQuantity,
        actualPlanted: 0,
        harvestQuantity: 0,
        status: "Chưa trồng" as any,
      };
    });

    const detailsToCreate = selectedPlots.map((plotId) => {
      const details = plotDetails[plotId] || defaultDetail;
      return {
        bedId: plotId,
        cropId: details.cropId || firstCropId,
        cropQuantity: details.cropQuantity,
        startDate: details.sowingDate || formData.startDate,
        endDate: formData.endDate,
        harvestDate: details.harvestDate || formData.endDate,
      };
    });

    onCreate({ ...formData, plots }, detailsToCreate);
  };

  const togglePlot = async (id: string) => {
    if (selectedPlots.includes(id)) {
      setSelectedPlots((p) => p.filter((x) => x !== id));
      return;
    }
    setSelectedPlots((p) => [...p, id]);
    // Fetch real cropQuantities from API when bed is selected
    try {
      const bed = await api.getBed(id);
      if (
        bed &&
        typeof bed.cropQuantities === "number" &&
        bed.cropQuantities > 0
      ) {
        setPlotDetails((p) => ({
          ...p,
          [id]: {
            ...(p[id] || defaultDetail),
            cropQuantity: bed.cropQuantities,
          },
        }));
      }
    } catch {
      // silently ignore — user can enter manually
    }
  };
  const updatePlotDetail = (
    id: string,
    field: keyof typeof defaultDetail,
    value: any,
  ) =>
    setPlotDetails((p) => ({
      ...p,
      [id]: { ...(p[id] || defaultDetail), [field]: value },
    }));
  const applyToAll = (sourceId: string) => {
    const src = plotDetails[sourceId] || defaultDetail;
    const n: typeof plotDetails = {};
    selectedPlots.forEach((id) => {
      n[id] = { ...src };
    });
    setPlotDetails(n);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#115e59] text-2xl font-semibold mb-2">
            Tạo Mùa Vụ Mới
          </h1>
          <div className="flex items-center gap-2">
            {[
              { n: 1, label: "Bước 1: Thông tin" },
              { n: 2, label: "Bước 2: Chọn luống" },
            ].map((s) => (
              <span
                key={s.n}
                className={`px-3 py-1 rounded text-sm font-medium ${step === s.n ? "bg-[#009689] text-white" : "bg-[#f1f5f9] text-[#62748e]"}`}
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>
        <Link
          to="/seasons"
          className="px-4 py-2 bg-[#f1f5f9] text-[#314158] rounded-lg hover:bg-[#e2e8f0] transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </Link>
      </div>

      {step === 1 && (
        <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6 max-w-2xl">
          <h3 className="text-sm font-bold text-[#62748e] uppercase mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Thông tin mùa vụ
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Tên mùa vụ <span className="text-red-400">*</span>
                </label>
                <input
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, name: e.target.value }));
                    setSeasonFormErrors((p) => ({ ...p, name: "" }));
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] ${seasonFormErrors.name ? "border-red-300 bg-red-50" : "border-[#cad5e2]"}`}
                  placeholder="Mùa Hè 2025"
                />
                {seasonFormErrors.name && (
                  <p className="mt-1 text-xs text-red-500">
                    {seasonFormErrors.name}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Trang trại <span className="text-red-400">*</span>
                </label>
                <FarmSelect
                  value={formData.farmId}
                  onChange={(id) => {
                    const f = farms.find((x) => x.farmId === id);
                    setFormData((p) => ({
                      ...p,
                      farmId: id,
                      farm: f?.farmName ?? id,
                    }));
                    setSeasonFormErrors((p) => ({ ...p, farmId: "" }));
                    // Reset bed selection khi đổi farm
                    setSelectedPlots([]);
                    setPlotDetails({});
                  }}
                  farms={farms}
                />
                {seasonFormErrors.farmId && (
                  <p className="mt-1 text-xs text-red-500">
                    {seasonFormErrors.farmId}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Ngày bắt đầu <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, startDate: e.target.value }));
                    setSeasonFormErrors((p) => ({
                      ...p,
                      startDate: "",
                      endDate: "",
                    }));
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] ${seasonFormErrors.startDate ? "border-red-300 bg-red-50" : "border-[#cad5e2]"}`}
                />
                {seasonFormErrors.startDate && (
                  <p className="mt-1 text-xs text-red-500">
                    {seasonFormErrors.startDate}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Ngày kết thúc <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, endDate: e.target.value }));
                    setSeasonFormErrors((p) => ({ ...p, endDate: "" }));
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] ${seasonFormErrors.endDate ? "border-red-300 bg-red-50" : "border-[#cad5e2]"}`}
                />
                {seasonFormErrors.endDate && (
                  <p className="mt-1 text-xs text-red-500">
                    {seasonFormErrors.endDate}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Trạng thái
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    status: e.target.value as SeasonStatus,
                  }))
                }
                className="w-full px-3 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white"
              >
                <option value="Lên kế hoạch">Lên kế hoạch</option>
                <option value="Đang canh tác">Đang canh tác</option>
                <option value="Đã thu hoạch">Đã thu hoạch</option>
                <option value="Đã kết thúc">Đã kết thúc</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Mô tả
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, description: e.target.value }))
                }
                rows={3}
                className="w-full px-3 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
                placeholder="Mô tả mùa vụ..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Ghi chú
              </label>
              <textarea
                value={formData.seasonNotes}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, seasonNotes: e.target.value }))
                }
                rows={2}
                className="w-full px-3 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
                placeholder="Ghi chú thêm về mùa vụ..."
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                const errors: Record<string, string> = {};
                if (!formData.name.trim())
                  errors.name = "Vui lòng nhập tên mùa vụ";
                else if (formData.name.trim().length < 2)
                  errors.name = "Tên mùa vụ phải có ít nhất 2 ký tự";
                else if (formData.name.trim().length > 200)
                  errors.name = "Tên mùa vụ không được quá 200 ký tự";
                if (!formData.farmId)
                  errors.farmId = "Vui lòng chọn trang trại";
                if (!formData.startDate)
                  errors.startDate = "Vui lòng chọn ngày bắt đầu";
                if (!formData.endDate)
                  errors.endDate = "Vui lòng chọn ngày kết thúc";
                if (
                  formData.startDate &&
                  formData.endDate &&
                  formData.endDate <= formData.startDate
                ) {
                  errors.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
                }
                setSeasonFormErrors(errors);
                if (Object.keys(errors).length > 0) return;
                setStep(2);
              }}
              className="px-6 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors"
            >
              Tiếp theo
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
          <h3 className="text-sm font-bold text-[#62748e] uppercase mb-2 flex items-center gap-2">
            <Sprout className="w-4 h-4" /> Chọn luống
          </h3>
          {availableBeds.length === 0 && (
            <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {formData.farmId
                ? "Trang trại này chưa có luống nào. Vui lòng tạo luống trong trang Quản lý Khu đất."
                : "Vui lòng chọn trang trại ở bước 1 để xem danh sách luống."}
            </div>
          )}

          <div className="space-y-3">
            {availableBeds.map((plot) => {
              const isSelected = selectedPlots.includes(plot.id);
              const details = plotDetails[plot.id] || defaultDetail;
              return (
                <div
                  key={plot.id}
                  className={`border rounded-lg p-4 ${isSelected ? "border-[#009689] bg-[#f0fdfa]" : "border-[#e2e8f0]"}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => togglePlot(plot.id)}
                      className="w-4 h-4 accent-[#009689]"
                    />
                    <div>
                      <div className="font-mono font-semibold text-[#115e59]">
                        {plot.name}
                      </div>
                      <div className="text-xs text-[#62748e]">
                        {plot.area} • {plot.size}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pl-7">
                      <div>
                        <label className="block text-xs text-[#62748e] mb-1">
                          Cây trồng
                        </label>
                        <select
                          value={details.cropId}
                          onChange={(e) => {
                            const selected = crops.find(
                              (c) => c.cropId === e.target.value,
                            );
                            if (!selected) return;
                            setPlotDetails((p) => ({
                              ...p,
                              [plot.id]: {
                                ...(p[plot.id] || defaultDetail),
                                cropId: selected.cropId,
                                crop: selected.cropName as CropType,
                              },
                            }));
                          }}
                          className="w-full px-2 py-1.5 text-sm border border-[#cad5e2] rounded focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white"
                        >
                          {crops.map((c) => (
                            <option key={c.cropId} value={c.cropId}>
                              {c.cropName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-[#62748e] mb-1">
                          Số lượng cây
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={details.cropQuantity || ""}
                          onChange={(e) =>
                            updatePlotDetail(
                              plot.id,
                              "cropQuantity",
                              parseInt(e.target.value) || 0,
                            )
                          }
                          placeholder="0"
                          className="w-full px-2 py-1.5 text-sm border border-[#cad5e2] rounded focus:outline-none focus:ring-2 focus:ring-[#009689]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#62748e] mb-1">
                          Ngày gieo
                        </label>
                        <input
                          type="date"
                          value={details.sowingDate}
                          onChange={(e) =>
                            updatePlotDetail(
                              plot.id,
                              "sowingDate",
                              e.target.value,
                            )
                          }
                          className="w-full px-2 py-1.5 text-sm border border-[#cad5e2] rounded focus:outline-none focus:ring-2 focus:ring-[#009689]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#62748e] mb-1">
                          Ngày thu hoạch
                        </label>
                        <input
                          type="date"
                          value={details.harvestDate}
                          onChange={(e) =>
                            updatePlotDetail(
                              plot.id,
                              "harvestDate",
                              e.target.value,
                            )
                          }
                          className="w-full px-2 py-1.5 text-sm border border-[#cad5e2] rounded focus:outline-none focus:ring-2 focus:ring-[#009689]"
                        />
                      </div>
                      {selectedPlots.length > 1 && (
                        <div className="col-span-full">
                          <button
                            onClick={() => applyToAll(plot.id)}
                            className="text-xs text-[#009689] hover:underline"
                          >
                            Áp dụng cho tất cả luống
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2 bg-[#f1f5f9] text-[#314158] rounded-lg hover:bg-[#e2e8f0] transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại
            </button>
            <div className="flex items-center gap-3">
              {selectedPlots.length === 0 && (
                <span className="text-xs text-amber-600">
                  Vui lòng chọn ít nhất 1 luống
                </span>
              )}
              <button
                onClick={handleStep2Submit}
                disabled={selectedPlots.length === 0}
                className="px-6 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Tạo mùa vụ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Edit View ────────────────────────────────────────────────────────────────

function EditSeasonView({
  season,
  farms,
  beds,
  plots: allPlots,
  crops,
  onUpdate,
}: {
  season: Season;
  farms: FarmResponse[];
  beds: BedResponse[];
  plots: PlotResponse[];
  crops: CropResponse[];
  onUpdate: (
    s: Season,
    detailOps?: {
      toAdd: Array<{
        bedId: string;
        cropId: string;
        cropQuantity: number;
        startDate: string;
        endDate: string;
        harvestDate: string;
      }>;
      toDelete: string[];
      toUpdate: Array<{
        seasonDetailId: string;
        bedId: string;
        cropId: string;
        cropQuantity: number;
        startDate: string;
        endDate: string;
        harvestDate: string;
        totalHarvestYield: number;
      }>;
    },
  ) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const seasonFarmId = (season as any).farmId ?? "";

  // Filter beds theo farmId của season (qua plotId → farmId)
  const bedsForFarm = seasonFarmId
    ? beds.filter((b) => {
        const plot = allPlots.find((p) => p.plotId === b.plotId);
        return plot?.farmId === seasonFarmId;
      })
    : beds;

  // Beds for this season's farm
  const availablePlotsForFarm = sortBeds(
    bedsForFarm.map((b) => ({
      id: b.bedId,
      name: b.bedName,
      area: b.plotName ?? "Không rõ khu",
      size: b.bedArea ? `${b.bedArea} m²` : "—",
    })),
  );

  const [formData, setFormData] = useState({
    name: season.name,
    farm: season.farm,
    farmId: seasonFarmId,
    startDate: season.startDate,
    endDate: season.endDate,
    status: season.status,
    description: season.description,
    seasonNotes: (season as any).seasonNotes ?? "",
  });
  const [plots, setPlots] = useState<PlotAssignmentV2[]>(
    season.plots.map(toV2),
  );
  const [deletePlotDialogOpen, setDeletePlotDialogOpen] = useState(false);
  const [plotToDelete, setPlotToDelete] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [plotErrors, setPlotErrors] = useState<
    Record<string, Record<string, string>>
  >({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [addPlotOpen, setAddPlotOpen] = useState(false);
  const [selectedNewPlots, setSelectedNewPlots] = useState<string[]>([]);
  const [newPlotDetails, setNewPlotDetails] = useState<
    Record<
      string,
      {
        crop: CropType;
        cropId: string;
        sowingDate: string;
        harvestDate: string;
      }
    >
  >({});

  // Bulk-mark area as harvested
  const [bulkConfirmArea, setBulkConfirmArea] = useState<string | null>(null);

  useEffect(() => {
    setFormData({
      name: season.name,
      farm: season.farm,
      farmId: (season as any).farmId ?? "",
      startDate: season.startDate,
      endDate: season.endDate,
      status: season.status,
      description: season.description,
      seasonNotes: (season as any).seasonNotes ?? "",
    });
    setPlots(season.plots.map(toV2));
    setFormErrors({});
    setPlotErrors({});
    setSubmitAttempted(false);
  }, [season.id]);

  const isSeasonEnded =
    formData.status === "Đã kết thúc" || formData.status === "Đã thu hoạch";

  const toDate = (s: string) => (s ? new Date(s) : null);

  const validateForm = (
    data: typeof formData,
    currentPlots: PlotAssignmentV2[],
  ) => {
    const errors: Record<string, string> = {};
    const pErrors: Record<string, Record<string, string>> = {};
    if (!data.name.trim()) errors.name = "Tên mùa vụ không được để trống";
    const start = toDate(data.startDate);
    const end = toDate(data.endDate);
    if (!data.startDate) errors.startDate = "Vui lòng chọn ngày bắt đầu";
    if (!data.endDate) errors.endDate = "Vui lòng chọn ngày kết thúc";
    else if (start && end && end <= start)
      errors.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
    if (data.status === "Đang canh tác" && start && start > today)
      errors.startDate =
        "Mùa đang canh tác: ngày bắt đầu không thể ở tương lai";
    if (data.status === "Lên kế hoạch" && start && start < today)
      errors.status =
        'Ngày bắt đầu đã qua — không thể để trạng thái "Lên kế hoạch"';
    if (data.status === "Đã kết thúc" && end && end > today)
      errors.status =
        'Ngày kết thúc chưa đến — không thể đánh dấu "Đã kết thúc"';
    if (end)
      currentPlots.forEach((plot) => {
        const hd = toDate(plot.harvestDate);
        if (hd && hd > end)
          errors.endDate =
            errors.endDate ||
            `Ngày kết thúc phải ≥ ngày thu hoạch của ${plot.plotName} (${formatDate(plot.harvestDate)})`;
      });
    currentPlots.forEach((plot) => {
      const pe: Record<string, string> = {};
      const sow = toDate(plot.sowingDate);
      const harv = toDate(plot.harvestDate);
      if (plot.sowingDate && start && sow && sow < start)
        pe.sowingDate = "Ngày gieo phải sau ngày bắt đầu mùa vụ";
      if (plot.sowingDate && end && sow && sow > end)
        pe.sowingDate = "Ngày gieo phải trước ngày kết thúc mùa vụ";
      if (plot.harvestDate && sow && harv && harv <= sow)
        pe.harvestDate = "Ngày thu hoạch phải sau ngày gieo";
      if (plot.harvestDate && end && harv && harv > end)
        pe.harvestDate =
          "Ngày thu hoạch phải trước hoặc bằng ngày kết thúc mùa vụ";
      if (Object.keys(pe).length > 0) pErrors[plot.plotId] = pe;
    });
    return { errors, pErrors };
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    const next = { ...formData, [field]: value };
    setFormData(next);
    if (submitAttempted) {
      const { errors, pErrors } = validateForm(next, plots);
      setFormErrors(errors);
      setPlotErrors(pErrors);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    const { errors, pErrors } = validateForm(formData, plots);
    setFormErrors(errors);
    setPlotErrors(pErrors);
    if (Object.keys(errors).length === 0 && Object.keys(pErrors).length === 0) {
      // Tính toán detail ops cho API
      const originalPlotMap = new Map(
        season.plots
          .filter((p) => (p as any)._seasonDetailId)
          .map((p) => [(p as any)._seasonDetailId as string, p]),
      );
      const currentDetailIds = new Set(
        plots.map((p) => (p as any)._seasonDetailId).filter(Boolean),
      );
      const toDelete = [...originalPlotMap.keys()].filter(
        (id) => !currentDetailIds.has(id),
      );
      // Plots mới là những plot chưa có _seasonDetailId
      const toAdd = plots
        .filter((p) => !(p as any)._seasonDetailId)
        .map((p) => ({
          bedId: (p as any)._bedId ?? p.plotId,
          cropId: (p as any)._cropId || "",
          cropQuantity: p.plannedQuantity ?? 0,
          startDate: p.sowingDate || formData.startDate,
          endDate: formData.endDate,
          harvestDate: p.harvestDate || formData.endDate,
        }));
      const toUpdate = plots
        .filter((p) => {
          const detailId = (p as any)._seasonDetailId as string | undefined;
          if (!detailId) return false;
          const orig = originalPlotMap.get(detailId);
          if (!orig) return false;
          return (
            p.sowingDate !== orig.sowingDate ||
            p.harvestDate !== orig.harvestDate ||
            p.plannedQuantity !== orig.plannedQuantity ||
            (p as any)._cropId !== (orig as any)._cropId
          );
        })
        .map((p) => {
          const orig = originalPlotMap.get((p as any)._seasonDetailId)!;
          return {
            seasonDetailId: (p as any)._seasonDetailId as string,
            bedId: (p as any)._bedId ?? p.plotId,
            cropId: (p as any)._cropId || "",
            cropQuantity: p.plannedQuantity ?? 0,
            startDate: p.sowingDate || formData.startDate,
            endDate: formData.endDate,
            harvestDate: p.harvestDate || formData.endDate,
            // Preserve existing harvest yield — never reset to 0 on update
            totalHarvestYield: (orig as any).harvestQuantity ?? 0,
          };
        });

      onUpdate(
        {
          ...season,
          ...formData,
          plots: plots as unknown as PlotAssignment[],
        },
        { toAdd, toDelete, toUpdate },
      );
    }
  };

  const updatePlot = (
    plotId: string,
    field: keyof PlotAssignmentV2,
    value: any,
  ) => {
    const next = plots.map((p) =>
      p.plotId === plotId ? { ...p, [field]: value } : p,
    );
    setPlots(next);
    if (submitAttempted) {
      const { errors, pErrors } = validateForm(formData, next);
      setFormErrors(errors);
      setPlotErrors(pErrors);
    }
  };

  /**
   * Maps SeasonPlotStatus → API bedStatus value and calls PUT /api/Beds/{id}.
   * Silently ignores failures — UI state is already updated optimistically.
   */
  const updateBedStatus = async (
    plot: PlotAssignmentV2,
    newStatus: SeasonPlotStatus,
  ) => {
    const bedId = (plot as any)._bedId ?? plot.plotId;
    if (!bedId) return;
    const bedStatusMap: Record<SeasonPlotStatus, string> = {
      "Chưa trồng": "Empty",
      "Đang trồng": "Planted",
      "Đã thu hoạch": "Planted", // Bed API has no Harvested — keep Planted
      "Cảnh báo": "Warning",
    };
    try {
      const current = await api.getBed(bedId);
      await api.updateBed(bedId, {
        plotId: current.plotId,
        bedName: current.bedName,
        bedArea: current.bedArea,
        bedStatus: bedStatusMap[newStatus],
        // preserve current cropQuantities from plot state, not from re-fetched bed
        cropQuantities: plot.actualPlanted ?? current.cropQuantities,
      });
    } catch {
      // silent — UI already reflects the change
    }
  };

  /**
   * Persists actualPlanted changes to PUT /api/Beds/{id} (cropQuantities field).
   * Called on blur of the SL thực tế input. Silently ignores failures.
   */
  const updateBedCropQuantities = async (
    plot: PlotAssignmentV2,
    qty: number,
  ) => {
    const bedId = (plot as any)._bedId ?? plot.plotId;
    if (!bedId) return;
    try {
      const current = await api.getBed(bedId);
      await api.updateBed(bedId, {
        plotId: current.plotId,
        bedName: current.bedName,
        bedArea: current.bedArea,
        bedStatus: current.bedStatus,
        cropQuantities: qty,
      });
    } catch {
      // silent — UI already reflects the change
    }
  };

  const existingPlotIds = new Set(plots.map((p) => p.plotId));

  const removePlot = (plotId: string) => {
    const plot = plots.find((p) => p.plotId === plotId);
    if (plot && plot.actualPlanted > 0) {
      setFormErrors((p) => ({
        ...p,
        plotRemove: `Không thể xóa ${plot.plotName} vì đã có dữ liệu trồng thực tế (${plot.actualPlanted} cây)`,
      }));
      return;
    }
    setPlotToDelete(plotId);
    setDeletePlotDialogOpen(true);
  };
  const confirmRemovePlot = () => {
    if (plotToDelete) {
      setPlots((prev) => prev.filter((p) => p.plotId !== plotToDelete));
      setPlotToDelete(null);
      setDeletePlotDialogOpen(false);
    }
  };

  const toggleNewPlot = (id: string) =>
    setSelectedNewPlots((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  const updateNewPlotDetail = (
    id: string,
    field: "crop" | "cropId" | "sowingDate" | "harvestDate",
    value: any,
  ) =>
    setNewPlotDetails((p) => ({
      ...p,
      [id]: {
        ...(p[id] ?? {
          crop: (crops[0]?.cropName ?? "Bắp Cải Trắng") as CropType,
          cropId: crops[0]?.cropId ?? "",
          sowingDate: "",
          harvestDate: "",
        }),
        [field]: value,
      },
    }));

  const confirmAddPlots = () => {
    const firstCropId = crops[0]?.cropId ?? "";
    const firstCropName = (crops[0]?.cropName ?? "Bắp Cải Trắng") as CropType;
    const newAssignments: PlotAssignmentV2[] = selectedNewPlots.map(
      (plotId) => {
        const meta = availablePlotsForFarm.find((p) => p.id === plotId)!;
        const details = newPlotDetails[plotId] ?? {
          crop: firstCropName,
          cropId: firstCropId,
          sowingDate: "",
          harvestDate: "",
        };
        return {
          plotId,
          plotName: meta.name,
          area: meta.area,
          crop: details.crop,
          sowingDate: details.sowingDate,
          harvestDate: details.harvestDate,
          plannedQuantity: 0,
          actualPlanted: 0,
          harvestQuantity: 0,
          status: "Chưa trồng" as SeasonPlotStatus,
          _bedId: plotId, // bedId thực để dùng khi submit API
          _cropId: details.cropId, // cropId thực
        } as any;
      },
    );
    setPlots((prev) => [...prev, ...newAssignments]);
    setSelectedNewPlots([]);
    setNewPlotDetails({});
    setAddPlotOpen(false);
  };

  // Two-level grouping: khu → harvest week buckets
  const plotsByArea = plots.reduce(
    (acc, plot) => {
      if (!acc[plot.area]) acc[plot.area] = [];
      acc[plot.area].push(plot);
      return acc;
    },
    {} as Record<string, PlotAssignmentV2[]>,
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/seasons"
            className="p-2 text-[#62748e] hover:text-[#115e59] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-[#115e59] text-2xl font-semibold">
              Chỉnh sửa mùa vụ
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {submitAttempted &&
            (Object.keys(formErrors).filter((k) => k !== "plotRemove").length >
              0 ||
              Object.keys(plotErrors).length > 0) && (
              <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" /> Còn{" "}
                {Object.keys(formErrors).filter((k) => k !== "plotRemove")
                  .length + Object.keys(plotErrors).length}{" "}
                lỗi cần sửa
              </span>
            )}
          <Link
            to="/seasons"
            className="px-4 py-2 bg-[#f1f5f9] text-[#314158] rounded-lg hover:bg-[#e2e8f0] transition-colors"
          >
            Hủy bỏ
          </Link>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors"
          >
            Lưu thay đổi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info form */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
          <h3 className="text-sm font-bold text-[#62748e] uppercase mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Thông tin chung
          </h3>
          <div className="space-y-4">
            {formErrors.plotRemove && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{formErrors.plotRemove}</span>
                <button
                  className="ml-auto text-red-400 hover:text-red-600"
                  onClick={() =>
                    setFormErrors((p) => {
                      const n = { ...p };
                      delete n.plotRemove;
                      return n;
                    })
                  }
                >
                  ×
                </button>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Tên mùa vụ
              </label>
              <input
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Mùa Hè 2025"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] ${formErrors.name ? "border-red-400 bg-red-50" : "border-[#cad5e2]"}`}
              />
              {formErrors.name && (
                <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Trang trại
                <span className="ml-2 text-xs font-normal text-[#90a1b9]">
                  (không thể thay đổi)
                </span>
              </label>
              <FarmSelect
                value={formData.farmId}
                onChange={() => {}}
                farms={farms}
                className="bg-[#f8fafc] text-[#90a1b9] cursor-not-allowed pointer-events-none opacity-75"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Ngày bắt đầu
                {formData.status === "Đang canh tác" && (
                  <span className="ml-2 text-xs font-normal text-amber-600">
                    (Mùa đang chạy — thận trọng)
                  </span>
                )}
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
                disabled={isSeasonEnded}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] disabled:bg-[#f8fafc] disabled:cursor-not-allowed ${formErrors.startDate ? "border-red-400 bg-red-50" : "border-[#cad5e2]"}`}
              />
              {formErrors.startDate && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.startDate}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Ngày kết thúc
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => updateField("endDate", e.target.value)}
                min={formData.startDate || undefined}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] ${formErrors.endDate ? "border-red-400 bg-red-50" : "border-[#cad5e2]"}`}
              />
              {formErrors.endDate && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.endDate}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Trạng thái mùa vụ
              </label>
              <select
                value={formData.status}
                onChange={(e) => updateField("status", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white ${formErrors.status ? "border-red-400 bg-red-50" : "border-[#cad5e2]"}`}
              >
                <option value="Lên kế hoạch">Lên kế hoạch</option>
                <option value="Đang canh tác">Đang canh tác</option>
                <option value="Đã thu hoạch">Đã thu hoạch</option>
                <option value="Đã kết thúc">Đã kết thúc</option>
              </select>
              {formErrors.status && (
                <p className="text-xs text-red-500 mt-1">{formErrors.status}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Mô tả
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Ghi chú
              </label>
              <textarea
                value={formData.seasonNotes}
                onChange={(e) => updateField("seasonNotes", e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
                placeholder="Ghi chú thêm về mùa vụ..."
              />
            </div>
          </div>
        </div>

        {/* Plots — grouped by area */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-[#62748e] uppercase flex items-center gap-2">
              <Sprout className="w-4 h-4" /> Luống trong mùa vụ
            </h3>
            <button
              onClick={() => setAddPlotOpen(true)}
              disabled={isSeasonEnded}
              title={isSeasonEnded ? "Mùa vụ đã kết thúc" : "Thêm luống"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#f0fdfa] text-[#009689] border border-[#009689] hover:bg-[#ccfbf1] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <PlusCircle className="w-4 h-4" /> Thêm luống
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-[#90a1b9]">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3" /> Sản lượng mở khóa khi qua ngày thu
              hoạch
            </span>
            {isSeasonEnded && (
              <span className="text-amber-600 font-medium">
                • Mùa vụ đã kết thúc: không thể chỉnh sửa
              </span>
            )}
          </div>

          {plots.length === 0 ? (
            <div className="text-center py-8 text-[#62748e]">
              Chưa có luống — bấm "Thêm luống" để bắt đầu
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(plotsByArea).map(([areaLabel, areaPlots]) => {
                const weekBuckets = groupByHarvestWeek(areaPlots);
                const areaHarvested = areaPlots.filter(
                  (p) => p.status === "Đã thu hoạch",
                ).length;

                return (
                  <div key={areaLabel}>
                    {/* ── Khu header ── */}
                    <div className="flex items-center justify-between px-3 py-2 bg-[#f0fdfa] rounded-t-lg border border-[#99f6e4]">
                      <span className="text-sm font-semibold text-[#115e59]">
                        {areaLabel}
                      </span>
                      <span className="text-xs text-[#62748e]">
                        {areaHarvested}/{areaPlots.length} đã thu hoạch
                      </span>
                    </div>

                    {/* ── Week buckets inside this khu ── */}
                    <div className="border border-t-0 border-[#99f6e4] rounded-b-lg divide-y divide-[#e2e8f0]">
                      {weekBuckets.map(([weekKey, weekPlots]) => {
                        const weekHarvested = weekPlots.filter(
                          (p) => p.status === "Đã thu hoạch",
                        ).length;
                        const allHarvested = weekHarvested === weekPlots.length;
                        const cropLabels = [
                          ...new Set(weekPlots.map((p) => p.crop)),
                        ];

                        return (
                          <div key={weekKey} className="p-3">
                            {/* Week sub-header */}
                            <div className="flex items-start justify-between mb-1.5 gap-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="flex items-center gap-1 text-xs font-semibold text-[#475569]">
                                  <Calendar className="w-3.5 h-3.5" /> Thu
                                  hoạch: {formatWeekRange(weekKey)}
                                </span>
                                <div className="flex gap-1">
                                  {cropLabels.map((c) => (
                                    <span
                                      key={c}
                                      className="text-xs px-1.5 py-0.5 bg-white border border-[#e2e8f0] rounded text-[#62748e]"
                                    >
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              {!isSeasonEnded && !allHarvested && (
                                <button
                                  onClick={() =>
                                    setBulkConfirmArea(
                                      `${areaLabel}::${weekKey}`,
                                    )
                                  }
                                  className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#008236] bg-[#dcfce7] border border-[#86efac] rounded-lg hover:bg-[#bbf7d0] transition-colors"
                                >
                                  <CheckSquare className="w-3.5 h-3.5" />
                                  Đánh dấu tất cả đã thu hoạch
                                </button>
                              )}
                              {allHarvested && (
                                <span className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#008236] bg-[#dcfce7] border border-[#86efac] rounded-lg">
                                  <Check className="w-3 h-3" /> Đã thu hoạch
                                  toàn bộ đợt
                                </span>
                              )}
                            </div>

                            {/* Plot cards in this week bucket */}
                            <div className="space-y-2">
                              {weekPlots.map((plot) => {
                                const harvestUnlocked = isHarvestUnlocked(
                                  plot.harvestDate,
                                );
                                const pe = plotErrors[plot.plotId] || {};
                                const hasPlotData = plot.actualPlanted > 0;
                                return (
                                  <div
                                    key={plot.plotId}
                                    className={`border rounded-lg p-3 transition-colors ${Object.keys(pe).length > 0 ? "border-red-300 bg-red-50/30" : "border-[#e2e8f0] bg-white hover:border-[#cad5e2]"}`}
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-semibold text-[#115e59] text-sm">
                                          {plot.plotName}
                                        </span>
                                        {/* Per-plot status — explicit select */}
                                        <div className="flex items-center gap-1.5">
                                          <span
                                            className={`inline-block w-2 h-2 rounded-full ${plotStatusConfig[plot.status].dot}`}
                                          />
                                          <select
                                            value={plot.status}
                                            onChange={(e) => {
                                              const newStatus = e.target
                                                .value as SeasonPlotStatus;
                                              updatePlot(
                                                plot.plotId,
                                                "status",
                                                newStatus,
                                              );
                                              updateBedStatus(plot, newStatus);
                                            }}
                                            disabled={isSeasonEnded}
                                            className={`text-xs font-medium rounded-full px-2 py-0.5 border focus:outline-none focus:ring-2 focus:ring-[#009689] disabled:cursor-not-allowed appearance-none cursor-pointer pr-5 ${plotStatusConfig[plot.status].badge}`}
                                            style={{
                                              backgroundImage: isSeasonEnded
                                                ? "none"
                                                : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2362748e' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                                              backgroundRepeat: "no-repeat",
                                              backgroundPosition:
                                                "right 6px center",
                                            }}
                                          >
                                            <option value="Chưa trồng">
                                              Chưa trồng
                                            </option>
                                            <option value="Đang trồng">
                                              Đang trồng
                                            </option>
                                            <option value="Đã thu hoạch">
                                              Đã thu hoạch
                                            </option>
                                            <option value="Cảnh báo">
                                              Cảnh báo
                                            </option>
                                          </select>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => removePlot(plot.plotId)}
                                        disabled={isSeasonEnded || hasPlotData}
                                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        title={
                                          hasPlotData
                                            ? `Không thể xóa: luống đã có ${plot.actualPlanted} cây`
                                            : "Xóa luống"
                                        }
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                                      <div>
                                        <label className="block text-xs font-medium text-[#62748e] mb-1">
                                          Cây trồng
                                        </label>
                                        <select
                                          value={
                                            crops.find(
                                              (c) => c.cropName === plot.crop,
                                            )?.cropId ??
                                            (plot as any)._cropId ??
                                            ""
                                          }
                                          onChange={(e) => {
                                            const selected = crops.find(
                                              (c) =>
                                                c.cropId === e.target.value,
                                            );
                                            if (!selected) return;
                                            updatePlot(
                                              plot.plotId,
                                              "crop",
                                              selected.cropName as CropType,
                                            );
                                            // ghi thêm _cropId để dùng khi submit
                                            setPlots((prev) =>
                                              prev.map((p) =>
                                                p.plotId === plot.plotId
                                                  ? ({
                                                      ...p,
                                                      _cropId: selected.cropId,
                                                    } as any)
                                                  : p,
                                              ),
                                            );
                                          }}
                                          disabled={
                                            isSeasonEnded || hasPlotData
                                          }
                                          title={
                                            hasPlotData
                                              ? "Không thể thay đổi: luống đã có dữ liệu trồng thực tế"
                                              : undefined
                                          }
                                          className="w-full px-2 py-1.5 text-sm border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white disabled:bg-[#f8fafc] disabled:text-[#90a1b9] disabled:cursor-not-allowed"
                                        >
                                          {crops.map((c) => (
                                            <option
                                              key={c.cropId}
                                              value={c.cropId}
                                            >
                                              {c.cropName}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-[#62748e] mb-1">
                                          Ngày gieo
                                        </label>
                                        <input
                                          type="date"
                                          value={plot.sowingDate}
                                          min={formData.startDate || undefined}
                                          max={formData.endDate || undefined}
                                          onChange={(e) =>
                                            updatePlot(
                                              plot.plotId,
                                              "sowingDate",
                                              e.target.value,
                                            )
                                          }
                                          disabled={isSeasonEnded}
                                          className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] disabled:bg-[#f8fafc] disabled:cursor-not-allowed ${pe.sowingDate ? "border-red-400" : "border-[#cad5e2]"}`}
                                        />
                                        {pe.sowingDate && (
                                          <p className="text-xs text-red-500 mt-1">
                                            {pe.sowingDate}
                                          </p>
                                        )}
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-[#62748e] mb-1">
                                          Ngày thu hoạch
                                        </label>
                                        <input
                                          type="date"
                                          value={plot.harvestDate}
                                          min={
                                            plot.sowingDate ||
                                            formData.startDate ||
                                            undefined
                                          }
                                          max={formData.endDate || undefined}
                                          onChange={(e) =>
                                            updatePlot(
                                              plot.plotId,
                                              "harvestDate",
                                              e.target.value,
                                            )
                                          }
                                          disabled={isSeasonEnded}
                                          className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] disabled:bg-[#f8fafc] disabled:cursor-not-allowed ${pe.harvestDate ? "border-red-400" : "border-[#cad5e2]"}`}
                                        />
                                        {pe.harvestDate && (
                                          <p className="text-xs text-red-500 mt-1">
                                            {pe.harvestDate}
                                          </p>
                                        )}
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-[#62748e] mb-1">
                                          SL thực tế (cây)
                                        </label>
                                        <input
                                          type="number"
                                          value={plot.actualPlanted ?? 0}
                                          onChange={(e) =>
                                            updatePlot(
                                              plot.plotId,
                                              "actualPlanted",
                                              parseInt(e.target.value) || 0,
                                            )
                                          }
                                          onBlur={(e) =>
                                            updateBedCropQuantities(
                                              plot,
                                              parseInt(e.target.value) || 0,
                                            )
                                          }
                                          disabled={isSeasonEnded}
                                          className="w-full px-2 py-1.5 text-sm border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] disabled:bg-[#f8fafc] disabled:cursor-not-allowed"
                                        />
                                      </div>
                                    </div>

                                    <div className="mt-2 pt-2 border-t border-[#e2e8f0]">
                                      <label className="block text-xs font-medium text-[#62748e] mb-1">
                                        Sản lượng thu hoạch (kg)
                                      </label>
                                      {harvestUnlocked ? (
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="number"
                                            value={
                                              plot.harvestQuantity === 0
                                                ? ""
                                                : plot.harvestQuantity
                                            }
                                            onChange={(e) =>
                                              updatePlot(
                                                plot.plotId,
                                                "harvestQuantity",
                                                parseInt(e.target.value) || 0,
                                              )
                                            }
                                            placeholder="Nhập sản lượng..."
                                            className="w-40 px-2 py-1.5 text-sm border border-[#009689] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                                          />
                                          <span className="flex items-center gap-1 text-xs text-[#009689] font-medium">
                                            <Check className="w-3 h-3" /> Đã đến
                                            ngày thu hoạch
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5 text-sm text-[#90a1b9]">
                                          <Lock className="w-3.5 h-3.5 shrink-0" />
                                          <span>
                                            Chưa thu hoạch
                                            {plot.harvestDate && (
                                              <span className="ml-1 text-xs">
                                                (mở khóa từ{" "}
                                                {formatDate(plot.harvestDate)})
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Plot Panel */}
      {addPlotOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[#e2e8f0]">
              <div>
                <h2 className="text-lg font-semibold text-[#115e59]">
                  Thêm luống vào mùa vụ
                </h2>
                <p className="text-xs text-[#62748e] mt-0.5">
                  Tên luống:{" "}
                  <span className="font-mono font-semibold text-[#009689]">
                    [Khu]-[NN]
                  </span>{" "}
                  — ví dụ A-03, B-02
                </p>
              </div>
              <button
                onClick={() => {
                  setAddPlotOpen(false);
                  setSelectedNewPlots([]);
                  setNewPlotDetails({});
                }}
                className="text-[#62748e] hover:text-[#115e59] text-xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-3 flex-1">
              {availablePlotsForFarm.map((plot) => {
                const isSelected = selectedNewPlots.includes(plot.id);
                const alreadyInSeason = existingPlotIds.has(plot.id);
                const details = newPlotDetails[plot.id] || {
                  crop: "Bắp Cải Trắng" as CropType,
                  sowingDate: "",
                  harvestDate: "",
                };
                return (
                  <div
                    key={plot.id}
                    className={`border rounded-lg p-4 transition-colors ${alreadyInSeason ? "border-[#e2e8f0] bg-[#f8fafc] opacity-60" : isSelected ? "border-[#009689] bg-[#f0fdfa]" : "border-[#e2e8f0]"}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={alreadyInSeason}
                        onChange={() =>
                          !alreadyInSeason && toggleNewPlot(plot.id)
                        }
                        className="w-4 h-4 accent-[#009689] disabled:cursor-not-allowed"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-[#115e59] text-sm">
                            {plot.name}
                          </span>
                          {alreadyInSeason && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#e2e8f0] text-[#62748e]">
                              Đã có trong mùa vụ
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#62748e]">
                          {plot.area} • {plot.size}
                        </div>
                      </div>
                    </div>
                    {isSelected && !alreadyInSeason && (
                      <div className="grid grid-cols-3 gap-3 pl-7 mt-3">
                        <div>
                          <label className="block text-xs text-[#62748e] mb-1">
                            Cây trồng
                          </label>
                          <select
                            value={details.cropId ?? crops[0]?.cropId ?? ""}
                            onChange={(e) => {
                              const selected = crops.find(
                                (c) => c.cropId === e.target.value,
                              );
                              if (!selected) return;
                              setNewPlotDetails((p) => ({
                                ...p,
                                [plot.id]: {
                                  ...(p[plot.id] ?? {
                                    crop: selected.cropName as CropType,
                                    cropId: selected.cropId,
                                    sowingDate: "",
                                    harvestDate: "",
                                  }),
                                  cropId: selected.cropId,
                                  crop: selected.cropName as CropType,
                                },
                              }));
                            }}
                            className="w-full px-2 py-1.5 text-sm border border-[#cad5e2] rounded focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white"
                          >
                            {crops.map((c) => (
                              <option key={c.cropId} value={c.cropId}>
                                {c.cropName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-[#62748e] mb-1">
                            Ngày gieo
                          </label>
                          <input
                            type="date"
                            value={details.sowingDate}
                            onChange={(e) =>
                              updateNewPlotDetail(
                                plot.id,
                                "sowingDate",
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1.5 text-sm border border-[#cad5e2] rounded focus:outline-none focus:ring-2 focus:ring-[#009689]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#62748e] mb-1">
                            Ngày thu hoạch
                          </label>
                          <input
                            type="date"
                            value={details.harvestDate}
                            onChange={(e) =>
                              updateNewPlotDetail(
                                plot.id,
                                "harvestDate",
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1.5 text-sm border border-[#cad5e2] rounded focus:outline-none focus:ring-2 focus:ring-[#009689]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center p-6 border-t border-[#e2e8f0]">
              <span className="text-sm text-[#62748e]">
                Đã chọn: {selectedNewPlots.length} luống
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setAddPlotOpen(false);
                    setSelectedNewPlots([]);
                    setNewPlotDetails({});
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-[#62748e] hover:bg-[#f1f5f9] transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmAddPlots}
                  disabled={selectedNewPlots.length === 0}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f75] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Thêm{" "}
                  {selectedNewPlots.length > 0
                    ? `(${selectedNewPlots.length})`
                    : ""}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk harvest confirm dialog */}
      <AlertDialog.Root
        open={!!bulkConfirmArea}
        onOpenChange={(open) => !open && setBulkConfirmArea(null)}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-xl shadow-2xl p-6">
            <AlertDialog.Title className="text-lg font-semibold text-slate-900 mb-2">
              Đánh dấu cả đợt đã thu hoạch?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-slate-600 mb-6">
              {bulkConfirmArea &&
                (() => {
                  const [area, weekKey] = bulkConfirmArea.split("::");
                  return (
                    <>
                      Tất cả luống trong{" "}
                      <span className="font-semibold">{area}</span> — đợt thu
                      hoạch{" "}
                      <span className="font-semibold">
                        {formatWeekRange(weekKey)}
                      </span>{" "}
                      sẽ được chuyển sang{" "}
                      <span className="font-semibold text-[#008236]">
                        Đã thu hoạch
                      </span>
                      . Bạn vẫn có thể đổi lại từng luống sau.
                    </>
                  );
                })()}
            </AlertDialog.Description>
            <div className="flex gap-3 justify-end">
              <AlertDialog.Cancel asChild>
                <button className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
                  Hủy
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={() => {
                    if (!bulkConfirmArea) return;
                    const [area, weekKey] = bulkConfirmArea.split("::");
                    setPlots((prev) =>
                      prev.map((p) => {
                        if (p.area !== area) return p;
                        if (getHarvestWeekKey(p.harvestDate) !== weekKey)
                          return p;
                        return {
                          ...p,
                          status: "Đã thu hoạch" as SeasonPlotStatus,
                        };
                      }),
                    );
                    setBulkConfirmArea(null);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f75] transition-colors"
                >
                  Xác nhận
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Remove plot dialog */}
      <AlertDialog.Root
        open={deletePlotDialogOpen}
        onOpenChange={setDeletePlotDialogOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-xl shadow-2xl p-6">
            <AlertDialog.Title className="text-lg font-semibold text-slate-900 mb-2">
              Xóa luống?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-slate-600 mb-6">
              Luống sẽ bị xóa khỏi mùa vụ này.
            </AlertDialog.Description>
            <div className="flex gap-3 justify-end">
              <AlertDialog.Cancel asChild>
                <button className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
                  Hủy
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={confirmRemovePlot}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Xóa
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
