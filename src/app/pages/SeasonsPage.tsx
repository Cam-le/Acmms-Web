import React, { useState, useEffect, useCallback } from "react";
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
  Wheat,
  Info,
  FileText,
  AlertTriangle,
  Check,
  Thermometer,
  Droplets,
  Sun,
  CloudRain,
  Cpu,
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
  IotDataResponse,
  IotDeviceResponse,
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
    if (detailsToCreate.length > 0) {
      const allSeasons = await api.getSeasons();
      const match = Array.isArray(allSeasons)
        ? allSeasons.find(
            (s) =>
              s.farmId === farmId &&
              s.seasonName === seasonData.name &&
              s.seasonStartDate === seasonData.startDate,
          )
        : null;

      if (match?.seasonId) {
        await Promise.allSettled(
          detailsToCreate.map((d) =>
            api.createSeasonDetail({
              seasonId: match.seasonId,
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

/** Shape of one merged IoT row: latest reading + device info */
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
  light: number;
  isRaining: boolean;
  isAlert: boolean;
}

function DetailSeasonView({ season }: { season: Season }) {
  const plots = season.plots.map(toV2);

  // ── IoT sensor data ────────────────────────────────────────────────────────
  const [iotRows, setIotRows] = useState<IotRow[]>([]);
  const [iotLoading, setIotLoading] = useState(true);
  const [iotError, setIotError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadIot() {
      setIotLoading(true);
      setIotError(null);
      try {
        const allData = await api.getIotDatas();
        const seasonData = (Array.isArray(allData) ? allData : []).filter(
          (d) => d.seasonId === season.id,
        );

        // Keep only the most recent reading per device
        const latestByDevice: Record<string, IotDataResponse> = {};
        for (const d of seasonData) {
          const prev = latestByDevice[d.deviceId];
          if (!prev || d.recordedAt > prev.recordedAt) {
            latestByDevice[d.deviceId] = d;
          }
        }

        // Fetch device details for each unique deviceId (in parallel)
        const deviceIds = Object.keys(latestByDevice);
        const deviceResults = await Promise.allSettled(
          deviceIds.map((id) => api.getIotDevice(id)),
        );

        if (cancelled) return;

        const rows: IotRow[] = deviceIds.map((deviceId, i) => {
          const reading = latestByDevice[deviceId];
          const deviceResult = deviceResults[i];
          const device: IotDeviceResponse | null =
            deviceResult.status === "fulfilled" ? deviceResult.value : null;

          // Find bed name from season plots using bedId
          const bedId = device?.bedId ?? null;
          const matchedPlot = bedId
            ? season.plots.find((p) => p._bedId === bedId)
            : null;
          const bedName = matchedPlot?.plotName ?? null;

          return {
            sensorDataId: reading.sensorDataId,
            deviceId,
            deviceCode: device?.deviceCode ?? deviceId.slice(0, 8),
            deviceName: device?.name ?? "—",
            bedId: bedId ?? "",
            bedName,
            recordedAt: reading.recordedAt,
            temperature: reading.temperature,
            humidity: reading.humidity,
            soilMoisture: reading.soilMoisture,
            light: reading.light,
            isRaining: reading.isRaining,
            isAlert: reading.isAlert,
          };
        });

        setIotRows(rows);
      } catch {
        if (!cancelled) setIotError("Không thể tải dữ liệu cảm biến IoT.");
      } finally {
        if (!cancelled) setIotLoading(false);
      }
    }
    loadIot();
    return () => {
      cancelled = true;
    };
  }, [season.id]);

  // ── Harvest groups ─────────────────────────────────────────────────────────
  // Group by exact harvest date (ISO string), sorted earliest first
  const byHarvestDate = plots.reduce(
    (acc, p) => {
      const key = p.harvestDate || "__unset__";
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    },
    {} as Record<string, PlotAssignmentV2[]>,
  );
  const harvestGroups = Object.entries(byHarvestDate).sort(([a], [b]) => {
    if (a === "__unset__") return 1;
    if (b === "__unset__") return -1;
    return a < b ? -1 : 1;
  });

  const totalKg = plots.reduce((s, p) => s + (p.harvestQuantity ?? 0), 0);

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
            <p className="text-sm text-[#62748e] mt-0.5">{season.farm}</p>
          </div>
        </div>
        <Link
          to={`/seasons?view=edit&id=${season.id}`}
          className="flex items-center gap-2 px-4 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors"
        >
          <Edit className="w-4 h-4" /> Chỉnh sửa
        </Link>
      </div>

      {/* Info strip */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-[#62748e] uppercase mb-1">
              Trang trại
            </div>
            <div className="font-medium text-[#115e59]">{season.farm}</div>
          </div>
          <div>
            <div className="text-xs text-[#62748e] uppercase mb-1">
              Thời gian
            </div>
            <div className="font-medium text-[#115e59]">
              {formatDate(season.startDate)} – {formatDate(season.endDate)}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#62748e] uppercase mb-1">
              Số luống
            </div>
            <div className="font-medium text-[#115e59]">{plots.length}</div>
          </div>
          <div>
            <div className="text-xs text-[#62748e] uppercase mb-1">
              Tổng sản lượng
            </div>
            <div className="font-medium text-[#008236] flex items-center gap-1">
              <Wheat className="w-4 h-4" />
              {totalKg > 0 ? `${totalKg.toLocaleString("vi-VN")} kg` : "—"}
            </div>
          </div>
          {season.description && (
            <div className="col-span-full">
              <div className="text-xs text-[#62748e] uppercase mb-1">Mô tả</div>
              <div className="text-sm text-[#334155]">{season.description}</div>
            </div>
          )}
        </div>
      </div>

      {/* Beds table — grouped by harvest date */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e2e8f0]">
          <h3 className="text-sm font-bold text-[#62748e] uppercase flex items-center gap-2">
            <Sprout className="w-4 h-4" /> Chi tiết luống ({plots.length})
          </h3>
        </div>

        {plots.length === 0 ? (
          <div className="text-center py-12 text-[#62748e]">
            Chưa có luống nào được gán cho mùa vụ này
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <tr>
                  {[
                    "Luống",
                    "Khu vực",
                    "Cây trồng",
                    "Ngày gieo",
                    "Thu hoạch dự kiến",
                    "SL dự kiến (cây)",
                    "SL thực tế (cây)",
                    "Sản lượng (kg)",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-[#62748e] uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {harvestGroups.map(([harvestKey, groupPlots]) => (
                  <React.Fragment key={harvestKey}>
                    {/* Harvest date group header row */}
                    <tr key={`hdr-${harvestKey}`} className="bg-[#f0fdfa]">
                      <td
                        colSpan={8}
                        className="px-4 py-2 text-xs font-semibold text-[#115e59] border-y border-[#99f6e4]"
                      >
                        <span className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#009689]" />
                          Thu hoạch dự kiến:{" "}
                          {harvestKey === "__unset__"
                            ? "Chưa có ngày"
                            : formatDate(harvestKey)}
                          <span className="font-normal text-[#62748e]">
                            · {groupPlots.length} luống
                          </span>
                        </span>
                      </td>
                    </tr>
                    {/* Bed rows */}
                    {groupPlots.map((plot, idx) => {
                      const harvestUnlocked = isHarvestUnlocked(
                        plot.harvestDate,
                      );
                      return (
                        <tr
                          key={plot.plotId}
                          className={`border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors ${idx === groupPlots.length - 1 ? "border-b-2 border-[#e2e8f0]" : ""}`}
                        >
                          <td className="px-4 py-2.5 font-mono font-semibold text-[#115e59] whitespace-nowrap">
                            {plot.plotName}
                          </td>
                          <td className="px-4 py-2.5 text-[#62748e] whitespace-nowrap">
                            {plot.area}
                          </td>
                          <td className="px-4 py-2.5 text-[#62748e]">
                            {plot.crop}
                          </td>
                          <td className="px-4 py-2.5 text-[#62748e] whitespace-nowrap">
                            {formatDate(plot.sowingDate) || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-[#62748e] whitespace-nowrap">
                            {formatDate(plot.harvestDate) || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-[#62748e] text-right">
                            {plot.plannedQuantity ?? 0}
                          </td>
                          <td className="px-4 py-2.5 text-[#62748e] text-right">
                            {plot.actualPlanted ?? 0}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {harvestUnlocked ? (
                              plot.harvestQuantity ? (
                                <span className="font-medium text-[#008236]">
                                  {plot.harvestQuantity} kg
                                </span>
                              ) : (
                                <span className="text-[#90a1b9]">—</span>
                              )
                            ) : (
                              <span className="flex items-center justify-end gap-1 text-[#90a1b9]">
                                <Lock className="w-3 h-3" /> Chưa thu
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* IoT Sensor Data */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#62748e] uppercase flex items-center gap-2">
            <Cpu className="w-4 h-4" /> Dữ liệu cảm biến IoT
            {iotRows.length > 0 && (
              <span className="font-normal normal-case text-[#009689]">
                · {iotRows.length} thiết bị
              </span>
            )}
          </h3>
          {iotRows.some((r) => r.isAlert) && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-full text-xs font-medium text-red-600">
              <AlertTriangle className="w-3 h-3" /> Có cảnh báo
            </span>
          )}
        </div>

        {iotLoading ? (
          <div className="flex items-center justify-center py-10 text-[#62748e] gap-2">
            <div className="w-5 h-5 border-2 border-[#009689] border-t-transparent rounded-full animate-spin" />
            Đang tải dữ liệu cảm biến...
          </div>
        ) : iotError ? (
          <div className="flex items-center gap-2 px-6 py-4 text-sm text-red-600">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {iotError}
          </div>
        ) : iotRows.length === 0 ? (
          <div className="text-center py-10 text-[#62748e] text-sm">
            Chưa có dữ liệu cảm biến cho mùa vụ này
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <tr>
                  {[
                    "Thiết bị",
                    "Luống",
                    "Thời gian đo",
                    "Nhiệt độ (°C)",
                    "Độ ẩm KK (%)",
                    "Độ ẩm đất (%)",
                    "Ánh sáng",
                    "Trạng thái",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-[#62748e] uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {iotRows.map((row) => (
                  <tr
                    key={row.sensorDataId}
                    className={`hover:bg-[#f8fafc] transition-colors ${row.isAlert ? "bg-red-50/40" : ""}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-mono text-xs font-semibold text-[#115e59]">
                        {row.deviceCode}
                      </div>
                      {row.deviceName !== row.deviceCode && (
                        <div className="text-xs text-[#90a1b9]">
                          {row.deviceName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#62748e] whitespace-nowrap">
                      {row.bedName ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#009689]" />
                          {row.bedName}
                        </span>
                      ) : (
                        <span className="text-[#90a1b9]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#62748e] whitespace-nowrap text-xs">
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
                        {row.temperature.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-medium text-blue-600">
                        <Droplets className="w-3.5 h-3.5" />
                        {row.humidity}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-medium text-[#008236]">
                        <Droplets className="w-3.5 h-3.5 opacity-60" />
                        {row.soilMoisture}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-[#62748e]">
                        <Sun className="w-3.5 h-3.5 text-yellow-500" />
                        {row.light > 0 ? row.light : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {row.isRaining && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                            <CloudRain className="w-3 h-3" /> Đang mưa
                          </span>
                        )}
                        {row.isAlert ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                            <AlertTriangle className="w-3 h-3" /> Cảnh báo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-[#008236]">
                            <CheckCircle className="w-3 h-3" /> Bình thường
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

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
  // ── Harvest-group model ────────────────────────────────────────────────────
  // Each group has one harvest date + a set of bed IDs assigned to that date.
  // cropId / cropQuantity are fetched from GET /api/Beds/{id} per bed.
  interface HarvestGroup {
    id: string; // local uuid for React key
    harvestDate: string;
    bedIds: string[];
  }
  interface BedFetchCache {
    cropId: string;
    cropName: string;
    cropQuantity: number;
  }

  const [harvestGroups, setHarvestGroups] = useState<HarvestGroup[]>([
    { id: crypto.randomUUID(), harvestDate: "", bedIds: [] },
  ]);
  // Cache fetched bed data so we don't re-fetch on every render
  const [bedCache, setBedCache] = useState<Record<string, BedFetchCache>>({});
  // Track which bed pickers are open
  const [openPicker, setOpenPicker] = useState<string | null>(null);

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

  // All bed IDs already claimed by any group
  const allClaimedBedIds = harvestGroups.flatMap((g) => g.bedIds);

  const fetchAndCacheBed = async (bedId: string) => {
    if (bedCache[bedId]) return;
    try {
      const bed = await api.getBed(bedId);
      if (bed) {
        setBedCache((prev) => ({
          ...prev,
          [bedId]: {
            cropId: bed.cropId ?? "",
            cropName: bed.cropName ?? "",
            cropQuantity:
              typeof bed.cropQuantities === "number" ? bed.cropQuantities : 0,
          },
        }));
      }
    } catch {
      // silently ignore — data will be submitted with empty cropId if missing
    }
  };

  const toggleBedInGroup = async (groupId: string, bedId: string) => {
    setHarvestGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const already = g.bedIds.includes(bedId);
        return {
          ...g,
          bedIds: already
            ? g.bedIds.filter((x) => x !== bedId)
            : [...g.bedIds, bedId],
        };
      }),
    );
    // Kick off cache fetch regardless of add/remove so data is ready on submit
    await fetchAndCacheBed(bedId);
  };

  const updateGroupHarvestDate = (groupId: string, date: string) => {
    setHarvestGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, harvestDate: date } : g)),
    );
  };

  const addHarvestGroup = () => {
    setHarvestGroups((prev) => [
      ...prev,
      { id: crypto.randomUUID(), harvestDate: "", bedIds: [] },
    ]);
  };

  const removeHarvestGroup = (groupId: string) => {
    setHarvestGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  const handleStep2Submit = () => {
    const detailsToCreate: Array<{
      bedId: string;
      cropId: string;
      cropQuantity: number;
      startDate: string;
      endDate: string;
      harvestDate: string;
    }> = [];

    const uiPlots: PlotAssignment[] = [];

    for (const group of harvestGroups) {
      for (const bedId of group.bedIds) {
        const cached = bedCache[bedId];
        const bed = availableBeds.find((b) => b.id === bedId);
        detailsToCreate.push({
          bedId,
          cropId: cached?.cropId ?? "",
          cropQuantity: cached?.cropQuantity ?? 0,
          startDate: formData.startDate,
          endDate: formData.endDate,
          harvestDate: group.harvestDate || formData.endDate,
        });
        uiPlots.push({
          plotId: bedId,
          plotName: bed?.name ?? bedId,
          area: bed?.area ?? "—",
          crop: (cached?.cropName ?? "Bắp Cải Trắng") as CropType,
          sowingDate: formData.startDate,
          harvestDate: group.harvestDate || formData.endDate,
          plannedQuantity: cached?.cropQuantity ?? 0,
          actualPlanted: 0,
          harvestQuantity: 0,
          status: "Chưa trồng" as any,
        });
      }
    }

    onCreate({ ...formData, plots: uiPlots }, detailsToCreate);
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
                    setHarvestGroups([
                      { id: crypto.randomUUID(), harvestDate: "", bedIds: [] },
                    ]);
                    setOpenPicker(null);
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
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#62748e] uppercase flex items-center gap-2">
              <Sprout className="w-4 h-4" /> Chọn luống theo đợt thu hoạch
            </h3>
            <div className="text-xs text-[#62748e] bg-[#f0fdfa] border border-[#99f6e4] rounded-lg px-3 py-1.5">
              Ngày bắt đầu:{" "}
              <span className="font-medium text-[#115e59]">
                {formatDate(formData.startDate)}
              </span>
              &nbsp;·&nbsp;Kết thúc:{" "}
              <span className="font-medium text-[#115e59]">
                {formatDate(formData.endDate)}
              </span>
            </div>
          </div>

          {availableBeds.length === 0 && (
            <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {formData.farmId
                ? "Trang trại này chưa có luống nào. Vui lòng tạo luống trong trang Quản lý Khu đất."
                : "Vui lòng chọn trang trại ở bước 1 để xem danh sách luống."}
            </div>
          )}

          {/* Harvest groups */}
          <div className="space-y-4">
            {harvestGroups.map((group, groupIdx) => {
              // Beds already used by OTHER groups
              const otherGroupBedIds = harvestGroups
                .filter((g) => g.id !== group.id)
                .flatMap((g) => g.bedIds);
              const pickerIsOpen = openPicker === group.id;

              return (
                <div
                  key={group.id}
                  className="border border-[#e2e8f0] rounded-xl overflow-hidden"
                >
                  {/* Group header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#f8fafc] border-b border-[#e2e8f0]">
                    <div className="w-6 h-6 rounded-full bg-[#009689] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {groupIdx + 1}
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <label className="text-sm font-medium text-[#115e59] shrink-0">
                        Ngày thu hoạch dự kiến
                        <span className="text-red-400 ml-0.5">*</span>
                      </label>
                      <input
                        type="date"
                        value={group.harvestDate}
                        min={formData.startDate || undefined}
                        onChange={(e) =>
                          updateGroupHarvestDate(group.id, e.target.value)
                        }
                        className="px-2 py-1 text-sm border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                      />
                    </div>
                    {harvestGroups.length > 1 && (
                      <button
                        onClick={() => removeHarvestGroup(group.id)}
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa đợt này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Bed picker body */}
                  <div className="p-4">
                    {/* Chosen beds chip list */}
                    {group.bedIds.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {group.bedIds.map((bedId) => {
                          const bed = availableBeds.find((b) => b.id === bedId);
                          return (
                            <span
                              key={bedId}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f0fdfa] border border-[#99f6e4] rounded-full text-xs font-medium text-[#115e59]"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#009689] shrink-0" />
                              {bed?.name ?? bedId}
                              <span className="text-[#62748e]">
                                · {bed?.area}
                              </span>
                              <button
                                onClick={() =>
                                  toggleBedInGroup(group.id, bedId)
                                }
                                className="ml-0.5 text-[#90a1b9] hover:text-red-500 transition-colors"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Toggle bed picker */}
                    <button
                      onClick={() =>
                        setOpenPicker(pickerIsOpen ? null : group.id)
                      }
                      className="flex items-center gap-2 text-sm text-[#009689] hover:text-[#007f75] font-medium transition-colors"
                    >
                      <PlusCircle className="w-4 h-4" />
                      {group.bedIds.length === 0
                        ? "Chọn luống cho đợt này"
                        : "Thêm / bớt luống"}
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${pickerIsOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {/* Expandable bed list */}
                    {pickerIsOpen && (
                      <div className="mt-3 border border-[#e2e8f0] rounded-lg overflow-hidden divide-y divide-[#f1f5f9]">
                        {availableBeds.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-[#62748e]">
                            Không có luống nào
                          </div>
                        ) : (
                          availableBeds.map((bed) => {
                            const isChecked = group.bedIds.includes(bed.id);
                            const isTaken = otherGroupBedIds.includes(bed.id);
                            return (
                              <label
                                key={bed.id}
                                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                                  isTaken
                                    ? "opacity-40 cursor-not-allowed bg-[#f8fafc]"
                                    : isChecked
                                      ? "bg-[#f0fdfa]"
                                      : "hover:bg-[#f8fafc]"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={isTaken}
                                  onChange={() => {
                                    if (!isTaken)
                                      toggleBedInGroup(group.id, bed.id);
                                  }}
                                  className="w-4 h-4 accent-[#009689]"
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="font-mono font-semibold text-sm text-[#115e59]">
                                    {bed.name}
                                  </span>
                                  <span className="ml-2 text-xs text-[#62748e]">
                                    {bed.area} · {bed.size}
                                  </span>
                                </div>
                                {isTaken && (
                                  <span className="text-xs text-[#90a1b9] shrink-0">
                                    Đã chọn ở đợt khác
                                  </span>
                                )}
                                {isChecked && !isTaken && (
                                  <Check className="w-3.5 h-3.5 text-[#009689] shrink-0" />
                                )}
                              </label>
                            );
                          })
                        )}
                      </div>
                    )}

                    {group.bedIds.length === 0 && !pickerIsOpen && (
                      <p className="mt-1.5 text-xs text-amber-600">
                        Đợt này chưa có luống nào được chọn
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add harvest group button */}
          {availableBeds.length > 0 &&
            allClaimedBedIds.length < availableBeds.length && (
              <button
                onClick={addHarvestGroup}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-[#99f6e4] rounded-xl text-sm text-[#009689] font-medium hover:bg-[#f0fdfa] transition-colors"
              >
                <PlusCircle className="w-4 h-4" /> Thêm đợt thu hoạch khác
              </button>
            )}

          {/* Footer */}
          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2 bg-[#f1f5f9] text-[#314158] rounded-lg hover:bg-[#e2e8f0] transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại
            </button>
            <div className="flex items-center gap-3">
              {allClaimedBedIds.length === 0 && (
                <span className="text-xs text-amber-600">
                  Vui lòng chọn ít nhất 1 luống
                </span>
              )}
              <button
                onClick={handleStep2Submit}
                disabled={allClaimedBedIds.length === 0}
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

  // ── "Thêm luống" uses the same harvest-group model as CreateSeasonView ──────
  interface AddHarvestGroup {
    id: string;
    harvestDate: string;
    bedIds: string[];
  }
  interface AddBedCache {
    cropId: string;
    cropName: string;
    cropQuantity: number;
  }
  const [addGroups, setAddGroups] = useState<AddHarvestGroup[]>([
    { id: crypto.randomUUID(), harvestDate: "", bedIds: [] },
  ]);
  const [addBedCache, setAddBedCache] = useState<Record<string, AddBedCache>>(
    {},
  );
  const [addOpenPicker, setAddOpenPicker] = useState<string | null>(null);

  const fetchAndCacheAddBed = async (bedId: string) => {
    if (addBedCache[bedId]) return;
    try {
      const bed = await api.getBed(bedId);
      if (bed) {
        setAddBedCache((prev) => ({
          ...prev,
          [bedId]: {
            cropId: bed.cropId ?? "",
            cropName: bed.cropName ?? "",
            cropQuantity:
              typeof bed.cropQuantities === "number" ? bed.cropQuantities : 0,
          },
        }));
      }
    } catch {
      // silently ignore
    }
  };

  const toggleAddBedInGroup = async (groupId: string, bedId: string) => {
    setAddGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const already = g.bedIds.includes(bedId);
        return {
          ...g,
          bedIds: already
            ? g.bedIds.filter((x) => x !== bedId)
            : [...g.bedIds, bedId],
        };
      }),
    );
    await fetchAndCacheAddBed(bedId);
  };

  const resetAddModal = () => {
    setAddPlotOpen(false);
    setAddGroups([{ id: crypto.randomUUID(), harvestDate: "", bedIds: [] }]);
    setAddBedCache({});
    setAddOpenPicker(null);
  };

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

  const confirmAddPlots = () => {
    const firstCropId = crops[0]?.cropId ?? "";
    const firstCropName = (crops[0]?.cropName ?? "Bắp Cải Trắng") as CropType;
    const newAssignments: PlotAssignmentV2[] = [];

    for (const group of addGroups) {
      for (const bedId of group.bedIds) {
        const meta = availablePlotsForFarm.find((p) => p.id === bedId);
        const cached = addBedCache[bedId];
        newAssignments.push({
          plotId: bedId,
          plotName: meta?.name ?? bedId,
          area: meta?.area ?? "—",
          crop: (cached?.cropName ?? firstCropName) as CropType,
          sowingDate: formData.startDate,
          harvestDate: group.harvestDate || formData.endDate,
          plannedQuantity: cached?.cropQuantity ?? 0,
          actualPlanted: 0,
          harvestQuantity: 0,
          status: "Chưa trồng" as SeasonPlotStatus,
          _bedId: bedId,
          _cropId: cached?.cropId ?? firstCropId,
        } as any);
      }
    }

    setPlots((prev) => [...prev, ...newAssignments]);
    resetAddModal();
  };

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
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] ${formErrors.startDate ? "border-red-400 bg-red-50" : "border-[#cad5e2]"}`}
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

        {/* Plots — compact harvest-date-grouped table */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#e2e8f0] shadow-sm overflow-hidden flex flex-col">
          {/* Panel header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0]">
            <h3 className="text-sm font-bold text-[#62748e] uppercase flex items-center gap-2">
              <Sprout className="w-4 h-4" /> Luống trong mùa vụ ({plots.length})
            </h3>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs text-[#90a1b9]">
                <Lock className="w-3 h-3" /> Sản lượng mở khóa khi qua ngày thu
                hoạch
              </span>
              <button
                onClick={() => setAddPlotOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#f0fdfa] text-[#009689] border border-[#009689] hover:bg-[#ccfbf1] transition-colors"
              >
                <PlusCircle className="w-4 h-4" /> Thêm luống
              </button>
            </div>
          </div>

          {formErrors.plotRemove && (
            <div className="mx-6 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-start gap-2">
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

          {plots.length === 0 ? (
            <div className="text-center py-12 text-[#62748e]">
              Chưa có luống — bấm "Thêm luống" để bắt đầu
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#f8fafc] border-b border-[#e2e8f0] sticky top-0 z-10">
                  <tr>
                    {[
                      "Luống",
                      "Khu vực",
                      "Cây trồng",
                      "Ngày gieo",
                      "Thu hoạch dự kiến",
                      "SL thực tế (cây)",
                      "Sản lượng (kg)",
                      "",
                    ].map((h, i) => (
                      <th
                        key={i}
                        className="px-3 py-3 text-left text-xs font-semibold text-[#62748e] uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Group by harvest date, sorted earliest first
                    const byHarvest = plots.reduce(
                      (acc, p) => {
                        const key = p.harvestDate || "__unset__";
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(p);
                        return acc;
                      },
                      {} as Record<string, PlotAssignmentV2[]>,
                    );
                    const sortedGroups = Object.entries(byHarvest).sort(
                      ([a], [b]) => {
                        if (a === "__unset__") return 1;
                        if (b === "__unset__") return -1;
                        return a < b ? -1 : 1;
                      },
                    );

                    return sortedGroups.map(([harvestKey, groupPlots]) => (
                      <React.Fragment key={harvestKey}>
                        {/* Harvest-date group header row */}
                        <tr key={`hdr-${harvestKey}`} className="bg-[#f0fdfa]">
                          <td
                            colSpan={8}
                            className="px-4 py-2 text-xs font-semibold text-[#115e59] border-y border-[#99f6e4]"
                          >
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-[#009689]" />
                                Thu hoạch dự kiến:{" "}
                                {harvestKey === "__unset__"
                                  ? "Chưa có ngày"
                                  : formatDate(harvestKey)}
                                <span className="font-normal text-[#62748e]">
                                  · {groupPlots.length} luống
                                </span>
                              </span>
                              {/* Inline harvest date editor for all beds in group */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-normal text-[#62748e]">
                                  Đổi ngày cho cả đợt:
                                </span>
                                <input
                                  type="date"
                                  defaultValue={
                                    harvestKey === "__unset__" ? "" : harvestKey
                                  }
                                  min={formData.startDate || undefined}
                                  max={formData.endDate || undefined}
                                  onChange={(e) => {
                                    const newDate = e.target.value;
                                    setPlots((prev) =>
                                      prev.map((p) =>
                                        p.harvestDate ===
                                        (harvestKey === "__unset__"
                                          ? ""
                                          : harvestKey)
                                          ? { ...p, harvestDate: newDate }
                                          : p,
                                      ),
                                    );
                                  }}
                                  className="px-2 py-0.5 text-xs border border-[#cad5e2] rounded focus:outline-none focus:ring-1 focus:ring-[#009689]"
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                        {/* Bed rows */}
                        {groupPlots.map((plot, idx) => {
                          const harvestUnlocked = isHarvestUnlocked(
                            plot.harvestDate,
                          );
                          const pe = plotErrors[plot.plotId] || {};
                          const hasPlotData = plot.actualPlanted > 0;
                          return (
                            <tr
                              key={plot.plotId}
                              className={`border-b transition-colors ${
                                Object.keys(pe).length > 0
                                  ? "bg-red-50/40 border-red-200"
                                  : idx === groupPlots.length - 1
                                    ? "border-b-2 border-[#e2e8f0] hover:bg-[#f8fafc]"
                                    : "border-[#f1f5f9] hover:bg-[#f8fafc]"
                              }`}
                            >
                              {/* Bed name */}
                              <td className="px-3 py-2 font-mono font-semibold text-[#115e59] whitespace-nowrap">
                                {plot.plotName}
                              </td>
                              {/* Area */}
                              <td className="px-3 py-2 text-[#62748e] whitespace-nowrap text-xs">
                                {plot.area}
                              </td>
                              {/* Crop select */}
                              <td className="px-3 py-2">
                                <select
                                  value={
                                    crops.find((c) => c.cropName === plot.crop)
                                      ?.cropId ??
                                    (plot as any)._cropId ??
                                    ""
                                  }
                                  onChange={(e) => {
                                    const selected = crops.find(
                                      (c) => c.cropId === e.target.value,
                                    );
                                    if (!selected) return;
                                    updatePlot(
                                      plot.plotId,
                                      "crop",
                                      selected.cropName as CropType,
                                    );
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
                                  disabled={hasPlotData}
                                  title={
                                    hasPlotData
                                      ? "Không thể thay đổi: đã có dữ liệu trồng thực tế"
                                      : undefined
                                  }
                                  className="px-2 py-1 text-xs border border-[#cad5e2] rounded focus:outline-none focus:ring-1 focus:ring-[#009689] bg-white disabled:bg-[#f8fafc] disabled:text-[#90a1b9] disabled:cursor-not-allowed min-w-[110px]"
                                >
                                  {crops.map((c) => (
                                    <option key={c.cropId} value={c.cropId}>
                                      {c.cropName}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              {/* Sowing date */}
                              <td className="px-3 py-2">
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
                                  className={`px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#009689] ${pe.sowingDate ? "border-red-400 bg-red-50" : "border-[#cad5e2]"}`}
                                />
                                {pe.sowingDate && (
                                  <p className="text-xs text-red-500 mt-0.5 whitespace-nowrap">
                                    {pe.sowingDate}
                                  </p>
                                )}
                              </td>
                              {/* Per-row harvest date override */}
                              <td className="px-3 py-2">
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
                                  className={`px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#009689] ${pe.harvestDate ? "border-red-400 bg-red-50" : "border-[#cad5e2]"}`}
                                />
                                {pe.harvestDate && (
                                  <p className="text-xs text-red-500 mt-0.5 whitespace-nowrap">
                                    {pe.harvestDate}
                                  </p>
                                )}
                              </td>
                              {/* Actual planted */}
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={plot.actualPlanted ?? 0}
                                  min={0}
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
                                  className="w-20 px-2 py-1 text-xs border border-[#cad5e2] rounded focus:outline-none focus:ring-1 focus:ring-[#009689] text-right"
                                />
                              </td>
                              {/* Harvest yield */}
                              <td className="px-3 py-2">
                                {harvestUnlocked ? (
                                  <input
                                    type="number"
                                    value={
                                      plot.harvestQuantity === 0
                                        ? ""
                                        : plot.harvestQuantity
                                    }
                                    min={0}
                                    onChange={(e) =>
                                      updatePlot(
                                        plot.plotId,
                                        "harvestQuantity",
                                        parseInt(e.target.value) || 0,
                                      )
                                    }
                                    placeholder="kg"
                                    className="w-24 px-2 py-1 text-xs border border-[#009689] rounded focus:outline-none focus:ring-1 focus:ring-[#009689] text-right"
                                  />
                                ) : (
                                  <span className="flex items-center gap-1 text-xs text-[#90a1b9] whitespace-nowrap">
                                    <Lock className="w-3 h-3 shrink-0" />
                                    {plot.harvestDate
                                      ? `từ ${formatDate(plot.harvestDate)}`
                                      : "Chưa thu"}
                                  </span>
                                )}
                              </td>
                              {/* Delete */}
                              <td className="px-3 py-2">
                                <button
                                  onClick={() => removePlot(plot.plotId)}
                                  disabled={hasPlotData}
                                  title={
                                    hasPlotData
                                      ? `Không thể xóa: đã có ${plot.actualPlanted} cây`
                                      : "Xóa luống"
                                  }
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Plot Modal — harvest-group model */}
      {addPlotOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-[#e2e8f0]">
              <div>
                <h2 className="text-lg font-semibold text-[#115e59]">
                  Thêm luống vào mùa vụ
                </h2>
                <p className="text-xs text-[#62748e] mt-0.5">
                  Chọn ngày thu hoạch dự kiến, rồi chọn luống cho từng đợt
                </p>
              </div>
              <button
                onClick={resetAddModal}
                className="text-[#62748e] hover:text-[#115e59] text-xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Season date hint */}
            <div className="px-6 pt-3 pb-0">
              <div className="text-xs text-[#62748e] bg-[#f0fdfa] border border-[#99f6e4] rounded-lg px-3 py-1.5 inline-flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#009689]" />
                Mùa vụ:{" "}
                <span className="font-medium text-[#115e59]">
                  {formatDate(formData.startDate)}
                </span>
                {" → "}
                <span className="font-medium text-[#115e59]">
                  {formatDate(formData.endDate)}
                </span>
              </div>
            </div>

            {/* Groups scroll area */}
            <div className="overflow-y-auto p-6 space-y-4 flex-1">
              {addGroups.map((group, groupIdx) => {
                const otherBedIds = addGroups
                  .filter((g) => g.id !== group.id)
                  .flatMap((g) => g.bedIds);
                const pickerOpen = addOpenPicker === group.id;
                const allClaimedInModal = addGroups.flatMap((g) => g.bedIds);

                return (
                  <div
                    key={group.id}
                    className="border border-[#e2e8f0] rounded-xl overflow-hidden"
                  >
                    {/* Group header */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-[#f8fafc] border-b border-[#e2e8f0]">
                      <div className="w-6 h-6 rounded-full bg-[#009689] text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {groupIdx + 1}
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <label className="text-sm font-medium text-[#115e59] shrink-0">
                          Ngày thu hoạch dự kiến
                          <span className="text-red-400 ml-0.5">*</span>
                        </label>
                        <input
                          type="date"
                          value={group.harvestDate}
                          min={formData.startDate || undefined}
                          max={formData.endDate || undefined}
                          onChange={(e) =>
                            setAddGroups((prev) =>
                              prev.map((g) =>
                                g.id === group.id
                                  ? { ...g, harvestDate: e.target.value }
                                  : g,
                              ),
                            )
                          }
                          className="px-2 py-1 text-sm border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                        />
                      </div>
                      {addGroups.length > 1 && (
                        <button
                          onClick={() =>
                            setAddGroups((prev) =>
                              prev.filter((g) => g.id !== group.id),
                            )
                          }
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa đợt này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Bed picker body */}
                    <div className="p-4">
                      {/* Chosen bed chips */}
                      {group.bedIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {group.bedIds.map((bedId) => {
                            const bed = availablePlotsForFarm.find(
                              (b) => b.id === bedId,
                            );
                            return (
                              <span
                                key={bedId}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f0fdfa] border border-[#99f6e4] rounded-full text-xs font-medium text-[#115e59]"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-[#009689] shrink-0" />
                                {bed?.name ?? bedId}
                                <span className="text-[#62748e]">
                                  · {bed?.area}
                                </span>
                                <button
                                  onClick={() =>
                                    toggleAddBedInGroup(group.id, bedId)
                                  }
                                  className="ml-0.5 text-[#90a1b9] hover:text-red-500 transition-colors"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Toggle picker */}
                      <button
                        onClick={() =>
                          setAddOpenPicker(pickerOpen ? null : group.id)
                        }
                        className="flex items-center gap-2 text-sm text-[#009689] hover:text-[#007f75] font-medium transition-colors"
                      >
                        <PlusCircle className="w-4 h-4" />
                        {group.bedIds.length === 0
                          ? "Chọn luống cho đợt này"
                          : "Thêm / bớt luống"}
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${pickerOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {/* Expandable bed list */}
                      {pickerOpen && (
                        <div className="mt-3 border border-[#e2e8f0] rounded-lg overflow-hidden divide-y divide-[#f1f5f9]">
                          {availablePlotsForFarm.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-[#62748e]">
                              Không có luống nào
                            </div>
                          ) : (
                            availablePlotsForFarm.map((bed) => {
                              const isChecked = group.bedIds.includes(bed.id);
                              const alreadyInSeason = existingPlotIds.has(
                                bed.id,
                              );
                              const takenByOther = otherBedIds.includes(bed.id);
                              const disabled = alreadyInSeason || takenByOther;
                              return (
                                <label
                                  key={bed.id}
                                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                                    disabled
                                      ? "opacity-40 cursor-not-allowed bg-[#f8fafc]"
                                      : isChecked
                                        ? "bg-[#f0fdfa] cursor-pointer"
                                        : "hover:bg-[#f8fafc] cursor-pointer"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={disabled}
                                    onChange={() => {
                                      if (!disabled)
                                        toggleAddBedInGroup(group.id, bed.id);
                                    }}
                                    className="w-4 h-4 accent-[#009689]"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className="font-mono font-semibold text-sm text-[#115e59]">
                                      {bed.name}
                                    </span>
                                    <span className="ml-2 text-xs text-[#62748e]">
                                      {bed.area} · {bed.size}
                                    </span>
                                  </div>
                                  {alreadyInSeason && (
                                    <span className="text-xs text-[#90a1b9] shrink-0">
                                      Đã có trong mùa vụ
                                    </span>
                                  )}
                                  {takenByOther && !alreadyInSeason && (
                                    <span className="text-xs text-[#90a1b9] shrink-0">
                                      Đã chọn ở đợt khác
                                    </span>
                                  )}
                                  {isChecked && !disabled && (
                                    <Check className="w-3.5 h-3.5 text-[#009689] shrink-0" />
                                  )}
                                </label>
                              );
                            })
                          )}
                        </div>
                      )}

                      {group.bedIds.length === 0 && !pickerOpen && (
                        <p className="mt-1.5 text-xs text-amber-600">
                          Đợt này chưa có luống nào được chọn
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add another group */}
              {availablePlotsForFarm.filter(
                (b) =>
                  !existingPlotIds.has(b.id) &&
                  !addGroups.flatMap((g) => g.bedIds).includes(b.id),
              ).length > 0 && (
                <button
                  onClick={() =>
                    setAddGroups((prev) => [
                      ...prev,
                      { id: crypto.randomUUID(), harvestDate: "", bedIds: [] },
                    ])
                  }
                  className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-[#99f6e4] rounded-xl text-sm text-[#009689] font-medium hover:bg-[#f0fdfa] transition-colors"
                >
                  <PlusCircle className="w-4 h-4" /> Thêm đợt thu hoạch khác
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center p-6 border-t border-[#e2e8f0]">
              <span className="text-sm text-[#62748e]">
                Đã chọn: {addGroups.reduce((s, g) => s + g.bedIds.length, 0)}{" "}
                luống
              </span>
              <div className="flex gap-3">
                <button
                  onClick={resetAddModal}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-[#62748e] hover:bg-[#f1f5f9] transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmAddPlots}
                  disabled={
                    addGroups.reduce((s, g) => s + g.bedIds.length, 0) === 0
                  }
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f75] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Thêm (
                  {addGroups.reduce((s, g) => s + g.bedIds.length, 0)})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
