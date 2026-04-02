import { useState, useEffect } from "react";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Grid3x3,
  Layers,
  X,
  Sprout,
  Calendar,
  MapPin,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Collapsible from "@radix-ui/react-collapsible";
import {
  api,
  PlotResponse,
  PlotRequest,
  BedResponse,
  BedRequest,
  FarmResponse,
  SoilResponse,
} from "../../api/client";

// ==================== Mock Data ====================

const mockPlots: PlotResponse[] = [
  {
    plotId: "mock-plot-1",
    farmId: "mock-farm-1",
    soilId: "mock-soil-1",
    plotName: "Plot A1",
    plotArea: 500,
    plotStatus: "Active",
    bedCreatedAt: "2026-01-10T00:00:00Z",
    farmName: "Trang trại Thung Lũng Xanh",
    soilName: "Đất phù sa",
    bedsCount: 3,
  },
  {
    plotId: "mock-plot-2",
    farmId: "mock-farm-1",
    soilId: "mock-soil-2",
    plotName: "Plot B1",
    plotArea: 350,
    plotStatus: "Active",
    bedCreatedAt: "2026-01-15T00:00:00Z",
    farmName: "Trang trại Thung Lũng Xanh",
    soilName: "Đất thịt",
    bedsCount: 2,
  },
  {
    plotId: "mock-plot-3",
    farmId: "mock-farm-2",
    soilId: "mock-soil-1",
    plotName: "Plot C1",
    plotArea: 200,
    plotStatus: "Inactive",
    bedCreatedAt: "2026-02-01T00:00:00Z",
    farmName: "Trang trại Nắng Hạ",
    soilName: "Đất phù sa",
    bedsCount: 0,
  },
];

const mockBeds: BedResponse[] = [
  {
    bedId: "mock-bed-1",
    plotId: "mock-plot-1",
    bedName: "Luống A1-1",
    bedArea: 50,
    bedStatus: "Active",
    bedCreatedAt: "2026-01-12T00:00:00Z",
    cropQuantities: 25,
    plotName: "Plot A1",
    seasonsDetailsCount: 1,
  },
  {
    bedId: "mock-bed-2",
    plotId: "mock-plot-1",
    bedName: "Luống A1-2",
    bedArea: 50,
    bedStatus: "Active",
    bedCreatedAt: "2026-01-12T00:00:00Z",
    cropQuantities: 20,
    plotName: "Plot A1",
    seasonsDetailsCount: 0,
  },
  {
    bedId: "mock-bed-3",
    plotId: "mock-plot-1",
    bedName: "Luống A1-3",
    bedArea: 45,
    bedStatus: "Inactive",
    bedCreatedAt: "2026-01-13T00:00:00Z",
    cropQuantities: 0,
    plotName: "Plot A1",
    seasonsDetailsCount: 0,
  },
  {
    bedId: "mock-bed-4",
    plotId: "mock-plot-2",
    bedName: "Luống B1-1",
    bedArea: 60,
    bedStatus: "Active",
    bedCreatedAt: "2026-01-18T00:00:00Z",
    cropQuantities: 30,
    plotName: "Plot B1",
    seasonsDetailsCount: 1,
  },
  {
    bedId: "mock-bed-5",
    plotId: "mock-plot-2",
    bedName: "Luống B1-2",
    bedArea: 55,
    bedStatus: "Active",
    bedCreatedAt: "2026-01-18T00:00:00Z",
    cropQuantities: 28,
    plotName: "Plot B1",
    seasonsDetailsCount: 0,
  },
];

const mockFarms: FarmResponse[] = [
  {
    farmId: "mock-farm-1",
    farmName: "Trang trại Thung Lũng Xanh",
    farmLocation: "Đà Lạt",
    farmArea: 5000,
    farmStatus: "Active",
    farmCreatedAt: "2025-01-01T00:00:00Z",
    seasonsCount: 2,
  },
  {
    farmId: "mock-farm-2",
    farmName: "Trang trại Nắng Hạ",
    farmLocation: "Bảo Lộc",
    farmArea: 3000,
    farmStatus: "Active",
    farmCreatedAt: "2025-03-01T00:00:00Z",
    seasonsCount: 1,
  },
];

const mockSoils: SoilResponse[] = [
  {
    soilId: "mock-soil-1",
    name: "Đất phù sa",
    scienceName: "Alluvial soil",
    cropsCount: 3,
    plotsCount: 2,
  },
  {
    soilId: "mock-soil-2",
    name: "Đất thịt",
    scienceName: "Loam soil",
    cropsCount: 2,
    plotsCount: 1,
  },
];

// ==================== Helpers ====================

const plotStatusMap: Record<string, string> = {
  Active: "Hoạt động",
  Inactive: "Không hoạt động",
};

const bedStatusMap: Record<string, string> = {
  Active: "Đang sử dụng",
  active: "Đang sử dụng",
  Inactive: "Khả dụng",
  inactive: "Khả dụng",
};

const bedStatusConfig: Record<string, string> = {
  Active: "bg-[#dbeafe] text-[#1e40af]",
  active: "bg-[#dbeafe] text-[#1e40af]",
  Inactive: "bg-[#f1f5f9] text-[#475569]",
  inactive: "bg-[#f1f5f9] text-[#475569]",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("vi-VN");
  } catch {
    return iso;
  }
}

// ==================== Main Page ====================

export function PlotsPage() {
  const [plots, setPlots] = useState<PlotResponse[]>([]);
  const [beds, setBeds] = useState<BedResponse[]>([]);
  const [farms, setFarms] = useState<FarmResponse[]>([]);
  const [soils, setSoils] = useState<SoilResponse[]>([]);
  const [isMockData, setIsMockData] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedFarmId, setSelectedFarmId] = useState<string>("all");
  const [openPlotIds, setOpenPlotIds] = useState<string[]>([]);

  const [createPlotOpen, setCreatePlotOpen] = useState(false);
  const [viewPlotOpen, setViewPlotOpen] = useState(false);
  const [editPlotOpen, setEditPlotOpen] = useState(false);
  const [createBedOpen, setCreateBedOpen] = useState(false);
  const [autoPlotOpen, setAutoPlotOpen] = useState(false);
  const [viewBedOpen, setViewBedOpen] = useState(false);
  const [editBedOpen, setEditBedOpen] = useState(false);

  const [selectedPlot, setSelectedPlot] = useState<PlotResponse | null>(null);
  const [selectedBed, setSelectedBed] = useState<BedResponse | null>(null);

  const [deletePlotDialogOpen, setDeletePlotDialogOpen] = useState(false);
  const [deleteBedDialogOpen, setDeleteBedDialogOpen] = useState(false);
  const [plotToDeleteId, setPlotToDeleteId] = useState<string | null>(null);
  const [bedToDeleteId, setBedToDeleteId] = useState<string | null>(null);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      let useMock = false;
      try {
        const [plotsData, bedsData] = await Promise.all([
          api.getPlots(),
          api.getBeds(),
        ]);
        setPlots(plotsData);
        setBeds(bedsData);
      } catch {
        setPlots(mockPlots);
        setBeds(mockBeds);
        useMock = true;
      }
      try {
        setFarms(await api.getFarms());
      } catch {
        setFarms(mockFarms);
      }
      try {
        setSoils(await api.getSoils());
      } catch {
        setSoils(mockSoils);
      }
      setIsMockData(useMock);
      setLoading(false);
    }
    loadAll();
  }, []);

  const togglePlot = (plotId: string) => {
    setOpenPlotIds((prev) =>
      prev.includes(plotId)
        ? prev.filter((id) => id !== plotId)
        : [...prev, plotId],
    );
  };

  const bedsForPlot = (plotId: string) =>
    beds.filter((b): b is BedResponse => !!b?.bedId && b.plotId === plotId);

  const calcRemainingArea = (plot: PlotResponse) => {
    const used = bedsForPlot(plot.plotId).reduce((s, b) => s + b.bedArea, 0);
    return Math.max(0, plot.plotArea - used);
  };

  const filteredPlots = (
    selectedFarmId === "all"
      ? plots
      : plots.filter((p) => p.farmId === selectedFarmId)
  )
    .filter((p): p is PlotResponse => !!p?.plotId)
    .sort(
      (a, b) =>
        new Date(a.bedCreatedAt).getTime() - new Date(b.bedCreatedAt).getTime(),
    );

  const farmOptions: FarmResponse[] = farms.length
    ? farms
    : Array.from(new Map(plots.map((p) => [p.farmId, p])).values()).map(
        (p) => ({ farmId: p.farmId, farmName: p.farmName }) as FarmResponse,
      );

  // ── Plot CRUD ──
  const handleCreatePlot = async (data: PlotRequest) => {
    if (isMockData) {
      const newPlot: PlotResponse = {
        plotId: `mock-${Date.now()}`,
        farmId: data.farmId,
        soilId: data.soilId,
        plotName: data.plotName,
        plotArea: data.plotArea,
        plotStatus: data.plotStatus,
        bedCreatedAt: new Date().toISOString(),
        farmName:
          farms.find((f) => f.farmId === data.farmId)?.farmName ?? data.farmId,
        soilName:
          soils.find((s) => s.soilId === data.soilId)?.name ?? data.soilId,
        bedsCount: 0,
      };
      setPlots([...plots, newPlot]);
      setCreatePlotOpen(false);
      return;
    }
    try {
      await api.createPlot(data);
      const refreshed = await api.getPlots();
      setPlots(refreshed);
      setCreatePlotOpen(false);
    } catch (err) {
      alert("Tạo vuông đất thất bại: " + (err as Error).message);
    }
  };

  const handleUpdatePlot = async (id: string, data: PlotRequest) => {
    if (isMockData) {
      setPlots(
        plots.map((p) =>
          p.plotId === id
            ? {
                ...p,
                ...data,
                farmName:
                  farms.find((f) => f.farmId === data.farmId)?.farmName ??
                  p.farmName,
                soilName:
                  soils.find((s) => s.soilId === data.soilId)?.name ??
                  p.soilName,
              }
            : p,
        ),
      );
      setEditPlotOpen(false);
      return;
    }
    try {
      await api.updatePlot(id, data);
      const refreshed = await api.getPlots();
      setPlots(refreshed);
      setEditPlotOpen(false);
    } catch (err) {
      alert("Cập nhật vuông đất thất bại: " + (err as Error).message);
    }
  };

  const handleDeletePlot = (plotId: string) => {
    setPlotToDeleteId(plotId);
    setDeletePlotDialogOpen(true);
  };

  const confirmDeletePlot = async () => {
    if (!plotToDeleteId) return;
    if (isMockData) {
      setPlots(plots.filter((p) => p.plotId !== plotToDeleteId));
      setBeds(beds.filter((b) => b.plotId !== plotToDeleteId));
    } else {
      try {
        await api.deletePlot(plotToDeleteId);
        setPlots(plots.filter((p) => p.plotId !== plotToDeleteId));
        setBeds(beds.filter((b) => b.plotId !== plotToDeleteId));
      } catch (err) {
        alert("Xóa vuông đất thất bại: " + (err as Error).message);
      }
    }
    setPlotToDeleteId(null);
    setDeletePlotDialogOpen(false);
  };

  // ── Bed CRUD ──
  const handleCreateBed = async (data: BedRequest) => {
    if (isMockData) {
      const newBed: BedResponse = {
        bedId: `mock-bed-${Date.now()}`,
        plotId: data.plotId,
        bedName: data.bedName,
        bedArea: data.bedArea,
        bedStatus: data.bedStatus,
        bedCreatedAt: new Date().toISOString(),
        cropQuantities: data.cropQuantities,
        plotName:
          plots.find((p) => p.plotId === data.plotId)?.plotName ?? data.plotId,
        seasonsDetailsCount: 0,
      };
      setBeds([...beds, newBed]);
      setPlots(
        plots.map((p) =>
          p.plotId === data.plotId ? { ...p, bedsCount: p.bedsCount + 1 } : p,
        ),
      );
      setCreateBedOpen(false);
      return;
    }
    try {
      await api.createBed(data);
      const refreshedBeds = await api.getBeds();
      setBeds(refreshedBeds);
      const refreshedPlots = await api.getPlots();
      setPlots(refreshedPlots);
      setCreateBedOpen(false);
    } catch (err) {
      alert("Tạo luống thất bại: " + (err as Error).message);
    }
  };

  const handleUpdateBed = async (id: string, data: BedRequest) => {
    if (isMockData) {
      setBeds(beds.map((b) => (b.bedId === id ? { ...b, ...data } : b)));
      setEditBedOpen(false);
      return;
    }
    try {
      await api.updateBed(id, data);
      const refreshed = await api.getBeds();
      setBeds(refreshed);
      setEditBedOpen(false);
    } catch (err) {
      alert("Cập nhật luống thất bại: " + (err as Error).message);
    }
  };

  const handleDeleteBed = (bedId: string) => {
    setBedToDeleteId(bedId);
    setDeleteBedDialogOpen(true);
  };

  const confirmDeleteBed = async () => {
    if (!bedToDeleteId) return;
    const bed = beds.find((b) => b.bedId === bedToDeleteId);
    const doDelete = () => {
      setBeds(beds.filter((b) => b.bedId !== bedToDeleteId));
      if (bed)
        setPlots(
          plots.map((p) =>
            p.plotId === bed.plotId
              ? { ...p, bedsCount: Math.max(0, p.bedsCount - 1) }
              : p,
          ),
        );
    };
    if (isMockData) {
      doDelete();
    } else {
      try {
        await api.deleteBed(bedToDeleteId);
        doDelete();
      } catch (err) {
        alert("Xóa luống thất bại: " + (err as Error).message);
      }
    }
    setBedToDeleteId(null);
    setDeleteBedDialogOpen(false);
  };

  const handleAutoPlot = async (
    plotId: string,
    bedSize: number,
    cropQuantities: number,
    prefix: string,
  ) => {
    const plot = plots.find((p) => p.plotId === plotId);
    if (!plot) return;
    const count = Math.floor(calcRemainingArea(plot) / bedSize);
    if (count === 0) return;
    const existing = bedsForPlot(plotId).length;

    if (isMockData) {
      const newBeds: BedResponse[] = Array.from({ length: count }, (_, i) => ({
        bedId: `mock-bed-${Date.now()}-${i}`,
        plotId,
        bedName: `${prefix}_${String(existing + i + 1).padStart(2, "0")}`,
        bedArea: bedSize,
        bedStatus: "Active",
        bedCreatedAt: new Date().toISOString(),
        cropQuantities,
        plotName: plot.plotName,
        seasonsDetailsCount: 0,
      }));
      setBeds((prev) => [...prev, ...newBeds]);
      setPlots((prev) =>
        prev.map((p) =>
          p.plotId === plotId ? { ...p, bedsCount: p.bedsCount + count } : p,
        ),
      );
      setAutoPlotOpen(false);
      return;
    }

    for (let i = 0; i < count; i++) {
      await handleCreateBed({
        plotId,
        bedName: `${prefix}_${String(existing + i + 1).padStart(2, "0")}`,
        bedArea: bedSize,
        bedStatus: "Active",
        cropQuantities,
      });
    }
    setAutoPlotOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#62748e]">
        Đang tải dữ liệu...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[#115e59] text-2xl font-semibold mb-1">
            Quản Lý Vuông Đất
          </h1>
          <p className="text-[#45556c] text-sm">Quản lý đất và luống</p>
        </div>
        <div className="flex items-center gap-3">
          {isMockData && (
            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
              Dữ liệu mẫu
            </span>
          )}
          <button
            onClick={() => setCreatePlotOpen(true)}
            className="bg-[#009689] text-white px-4 py-2 rounded-lg hover:bg-[#007f75] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Thêm vuông
          </button>
        </div>
      </div>

      {/* Farm Selector */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
        <label className="block text-sm text-[#62748e] mb-2">
          Chọn Trang Trại:
        </label>
        <select
          value={selectedFarmId}
          onChange={(e) => setSelectedFarmId(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
        >
          <option value="all">Tất cả trang trại</option>
          {farmOptions.map((f) => (
            <option key={f.farmId} value={f.farmId}>
              {f.farmName}
            </option>
          ))}
        </select>
      </div>

      {/* Plot List */}
      <div className="space-y-6">
        {filteredPlots.length === 0 ? (
          <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-12 text-center text-[#62748e]">
            Chưa có vuông đất nào
          </div>
        ) : (
          filteredPlots.map((plot) => {
            const isOpen = openPlotIds.includes(plot.plotId);
            const plotBeds = bedsForPlot(plot.plotId).sort((a, b) =>
              a.bedName.localeCompare(b.bedName, "vi"),
            );
            const activeBeds = plotBeds.filter(
              (b) => b.bedStatus === "Active" || b.bedStatus === "active",
            ).length;

            return (
              <div
                key={plot.plotId}
                className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-[#f0fdfa] rounded-lg flex items-center justify-center">
                        <Grid3x3 className="w-6 h-6 text-[#009689]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#115e59] mb-1">
                          {plot.plotName}
                        </h3>
                        <p className="text-sm text-[#62748e] mb-2">
                          {plot.plotArea} m² · {plot.farmName}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 bg-[#f0fdfa] text-[#009689] rounded text-xs font-medium">
                            {plot.soilName}
                          </span>
                          <span className="text-xs text-[#62748e]">
                            {activeBeds}/{plotBeds.length} luống hoạt động
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          plot.plotStatus === "Active"
                            ? "bg-[#dcfce7] text-[#008236]"
                            : "bg-[#fee2e2] text-[#991b1b]"
                        }`}
                      >
                        {plotStatusMap[plot.plotStatus] ?? plot.plotStatus}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedPlot(plot);
                          setViewPlotOpen(true);
                        }}
                        className="p-2 text-[#009689] hover:bg-[#f0fdfa] rounded-lg transition-colors"
                        title="Xem"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPlot(plot);
                          setEditPlotOpen(true);
                        }}
                        className="p-2 text-[#009689] hover:bg-[#f0fdfa] rounded-lg transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeletePlot(plot.plotId)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPlot(plot);
                          setAutoPlotOpen(true);
                        }}
                        className="ml-2 px-4 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors text-sm flex items-center gap-2"
                      >
                        <Layers className="w-4 h-4" />
                        Thêm Luống Tự Động
                      </button>
                    </div>
                  </div>

                  <Collapsible.Root
                    open={isOpen}
                    onOpenChange={() => togglePlot(plot.plotId)}
                  >
                    <div className="flex items-center justify-between py-3 border-t border-[#e2e8f0]">
                      <Collapsible.Trigger className="flex items-center gap-2 text-[#115e59] font-medium">
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                        <span>
                          Luống ({activeBeds}/{plotBeds.length} luống hoạt động)
                        </span>
                      </Collapsible.Trigger>
                      <button
                        onClick={() => {
                          setSelectedPlot(plot);
                          setCreateBedOpen(true);
                        }}
                        className="px-4 py-2 bg-white text-[#009689] border border-[#009689] rounded-lg hover:bg-[#f0fdfa] transition-colors text-sm flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Thêm Luống
                      </button>
                    </div>

                    <Collapsible.Content>
                      {plotBeds.length === 0 ? (
                        <div className="py-8 text-center text-[#62748e]">
                          Chưa có luống nào
                        </div>
                      ) : (
                        <div className="mt-4">
                          <table className="w-full">
                            <thead className="bg-[#f8fafc]">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#62748e] uppercase">
                                  Tên luống
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#62748e] uppercase">
                                  Diện tích
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#62748e] uppercase">
                                  Số lượng cây
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#62748e] uppercase">
                                  Trạng thái
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-[#62748e] uppercase">
                                  Thao tác
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e2e8f0]">
                              {plotBeds.map((bed) => (
                                <tr
                                  key={bed.bedId}
                                  className="hover:bg-[#f8fafc] transition-colors"
                                >
                                  <td className="px-4 py-3 text-sm text-[#115e59] font-medium">
                                    {bed.bedName}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-[#62748e]">
                                    {bed.bedArea} m²
                                  </td>
                                  <td className="px-4 py-3 text-sm text-[#62748e]">
                                    {bed.cropQuantities > 0
                                      ? bed.cropQuantities
                                      : "-"}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${bedStatusConfig[bed.bedStatus] ?? "bg-[#f1f5f9] text-[#475569]"}`}
                                    >
                                      {bedStatusMap[bed.bedStatus] ??
                                        bed.bedStatus}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        onClick={() => {
                                          setSelectedBed(bed);
                                          setSelectedPlot(plot);
                                          setViewBedOpen(true);
                                        }}
                                        className="p-2 text-[#009689] hover:bg-[#f0fdfa] rounded-lg transition-colors"
                                        title="Xem"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedBed(bed);
                                          setSelectedPlot(plot);
                                          setEditBedOpen(true);
                                        }}
                                        className="p-2 text-[#009689] hover:bg-[#f0fdfa] rounded-lg transition-colors"
                                        title="Chỉnh sửa"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleDeleteBed(bed.bedId)
                                        }
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
                        </div>
                      )}
                    </Collapsible.Content>
                  </Collapsible.Root>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <CreatePlotModal
        open={createPlotOpen}
        onClose={() => setCreatePlotOpen(false)}
        farms={farmOptions}
        soils={soils}
        onCreate={handleCreatePlot}
      />

      {selectedPlot && (
        <>
          <ViewPlotModal
            open={viewPlotOpen}
            onClose={() => setViewPlotOpen(false)}
            plot={selectedPlot}
          />
          <EditPlotModal
            open={editPlotOpen}
            onClose={() => setEditPlotOpen(false)}
            plot={selectedPlot}
            farms={farmOptions}
            soils={soils}
            onUpdate={handleUpdatePlot}
          />
          <CreateBedModal
            open={createBedOpen}
            onClose={() => setCreateBedOpen(false)}
            plot={selectedPlot}
            onCreate={handleCreateBed}
          />
          <AutoBedModal
            open={autoPlotOpen}
            onClose={() => setAutoPlotOpen(false)}
            plot={selectedPlot}
            remainingArea={calcRemainingArea(selectedPlot)}
            onCreate={handleAutoPlot}
          />
        </>
      )}

      {selectedBed && selectedPlot && (
        <>
          <ViewBedModal
            open={viewBedOpen}
            onClose={() => setViewBedOpen(false)}
            bed={selectedBed}
            plot={selectedPlot}
          />
          <EditBedModal
            open={editBedOpen}
            onClose={() => setEditBedOpen(false)}
            bed={selectedBed}
            onUpdate={handleUpdateBed}
          />
        </>
      )}

      {/* Delete Plot Dialog */}
      <AlertDialog.Root
        open={deletePlotDialogOpen}
        onOpenChange={setDeletePlotDialogOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <AlertDialog.Title className="text-lg font-semibold text-slate-900 mb-2">
              Xác nhận xóa vuông đất
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-slate-600 mb-6">
              Bạn có chắc chắn muốn xóa vuông này? Tất cả các luống bên trong
              cũng sẽ bị xóa và không thể hoàn tác.
            </AlertDialog.Description>
            <div className="flex gap-3 justify-end">
              <AlertDialog.Cancel asChild>
                <button className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
                  Hủy bỏ
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={confirmDeletePlot}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Xóa vuông đất
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Delete Bed Dialog */}
      <AlertDialog.Root
        open={deleteBedDialogOpen}
        onOpenChange={setDeleteBedDialogOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <AlertDialog.Title className="text-lg font-semibold text-slate-900 mb-2">
              Xác nhận xóa luống
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-slate-600 mb-6">
              Bạn có chắc chắn muốn xóa luống này? Hành động này không thể hoàn
              tác.
            </AlertDialog.Description>
            <div className="flex gap-3 justify-end">
              <AlertDialog.Cancel asChild>
                <button className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
                  Hủy bỏ
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={confirmDeleteBed}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Xóa luống
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

// ==================== Plot Modals ====================

function CreatePlotModal({
  open,
  onClose,
  farms,
  soils,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  farms: FarmResponse[];
  soils: SoilResponse[];
  onCreate: (data: PlotRequest) => void;
}) {
  const [formData, setFormData] = useState<PlotRequest>({
    farmId: "",
    soilId: "",
    plotName: "",
    plotArea: 0,
    plotStatus: "Active",
  });

  useEffect(() => {
    if (open)
      setFormData({
        farmId: farms[0]?.farmId ?? "",
        soilId: soils[0]?.soilId ?? "",
        plotName: "",
        plotArea: 0,
        plotStatus: "Active",
      });
  }, [open, farms, soils]);

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-[#115e59]">
              Thêm Vuông Đất Mới
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 text-[#62748e] hover:bg-[#f8fafc] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onCreate(formData);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Tên Vuông Đất <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Plot A1"
                value={formData.plotName}
                onChange={(e) =>
                  setFormData({ ...formData, plotName: e.target.value })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Trang Trại <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.farmId}
                  onChange={(e) =>
                    setFormData({ ...formData, farmId: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                >
                  {farms.map((f) => (
                    <option key={f.farmId} value={f.farmId}>
                      {f.farmName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Loại Đất <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.soilId}
                  onChange={(e) =>
                    setFormData({ ...formData, soilId: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                >
                  {soils.map((s) => (
                    <option key={s.soilId} value={s.soilId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Diện Tích (m²) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.plotArea || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      plotArea: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Trạng Thái
                </label>
                <select
                  value={formData.plotStatus}
                  onChange={(e) =>
                    setFormData({ ...formData, plotStatus: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                >
                  <option value="Active">Hoạt động</option>
                  <option value="Inactive">Không hoạt động</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-[#f1f5f9] text-[#314158] rounded-lg hover:bg-[#e2e8f0] transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors"
              >
                Tạo Vuông Đất
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ViewPlotModal({
  open,
  onClose,
  plot,
}: {
  open: boolean;
  onClose: () => void;
  plot: PlotResponse;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-[#115e59]">
              Chi Tiết Vuông Đất
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 text-[#62748e] hover:bg-[#f8fafc] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#115e59]">
                {plot.plotName}
              </h3>
              <span
                className={`px-3 py-1 rounded text-sm font-medium ${plot.plotStatus === "Active" ? "bg-[#dcfce7] text-[#008236]" : "bg-[#fee2e2] text-[#991b1b]"}`}
              >
                {plotStatusMap[plot.plotStatus] ?? plot.plotStatus}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#62748e]">
              <MapPin className="w-4 h-4" />
              <span>{plot.farmName}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#e2e8f0]">
              <div>
                <div className="text-xs text-[#62748e] uppercase mb-1">
                  Tổng diện tích
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#009689]" />
                  <span className="text-lg font-semibold text-[#115e59]">
                    {plot.plotArea.toLocaleString()} m²
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-[#62748e] uppercase mb-1">
                  Loại đất
                </div>
                <div className="flex items-center gap-2">
                  <Sprout className="w-5 h-5 text-[#009689]" />
                  <span className="font-medium text-[#115e59]">
                    {plot.soilName}
                  </span>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-[#e2e8f0]">
              <div className="text-xs text-[#62748e] uppercase mb-1">
                Số luống
              </div>
              <div className="text-[#115e59] font-medium">
                {plot.bedsCount} luống
              </div>
            </div>
            <div className="pt-4 border-t border-[#e2e8f0]">
              <div className="flex items-center gap-2 text-xs text-[#62748e]">
                <Calendar className="w-4 h-4" />
                <span>Ngày tạo: {formatDate(plot.bedCreatedAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-6">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#f1f5f9] text-[#314158] rounded-lg hover:bg-[#e2e8f0] transition-colors"
            >
              Đóng
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EditPlotModal({
  open,
  onClose,
  plot,
  farms,
  soils,
  onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  plot: PlotResponse;
  farms: FarmResponse[];
  soils: SoilResponse[];
  onUpdate: (id: string, data: PlotRequest) => void;
}) {
  const [formData, setFormData] = useState<PlotRequest>({
    farmId: plot.farmId,
    soilId: plot.soilId,
    plotName: plot.plotName,
    plotArea: plot.plotArea,
    plotStatus: plot.plotStatus,
  });

  useEffect(() => {
    if (open)
      setFormData({
        farmId: plot.farmId,
        soilId: plot.soilId,
        plotName: plot.plotName,
        plotArea: plot.plotArea,
        plotStatus: plot.plotStatus,
      });
  }, [open, plot]);

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-[#115e59]">
              Chỉnh Sửa Vuông Đất
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 text-[#62748e] hover:bg-[#f8fafc] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onUpdate(plot.plotId, formData);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Tên Vuông Đất
              </label>
              <input
                type="text"
                required
                value={formData.plotName}
                onChange={(e) =>
                  setFormData({ ...formData, plotName: e.target.value })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Trang Trại
                </label>
                <select
                  value={formData.farmId}
                  onChange={(e) =>
                    setFormData({ ...formData, farmId: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                >
                  {farms.map((f) => (
                    <option key={f.farmId} value={f.farmId}>
                      {f.farmName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Loại Đất
                </label>
                <select
                  value={formData.soilId}
                  onChange={(e) =>
                    setFormData({ ...formData, soilId: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                >
                  {soils.map((s) => (
                    <option key={s.soilId} value={s.soilId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Diện Tích (m²)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.plotArea}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      plotArea: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Trạng Thái
                </label>
                <select
                  value={formData.plotStatus}
                  onChange={(e) =>
                    setFormData({ ...formData, plotStatus: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                >
                  <option value="Active">Hoạt động</option>
                  <option value="Inactive">Không hoạt động</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-[#f1f5f9] text-[#314158] rounded-lg hover:bg-[#e2e8f0] transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ==================== Bed Modals ====================

function CreateBedModal({
  open,
  onClose,
  plot,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  plot: PlotResponse;
  onCreate: (data: BedRequest) => void;
}) {
  const [formData, setFormData] = useState<BedRequest>({
    plotId: plot.plotId,
    bedName: "",
    bedArea: 0,
    bedStatus: "Active",
    cropQuantities: 0,
  });

  useEffect(() => {
    if (open)
      setFormData({
        plotId: plot.plotId,
        bedName: "",
        bedArea: 0,
        bedStatus: "Active",
        cropQuantities: 0,
      });
  }, [open, plot]);

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-[#115e59]">
              Thêm Luống Thủ Công
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 text-[#62748e] hover:bg-[#f8fafc] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>
          <div className="mb-4 text-sm text-[#62748e]">
            Vuông đất:{" "}
            <span className="font-medium text-[#115e59]">{plot.plotName}</span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onCreate(formData);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Tên Luống <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: west_01"
                value={formData.bedName}
                onChange={(e) =>
                  setFormData({ ...formData, bedName: e.target.value })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Diện Tích (m²) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min={0.1}
                step={0.1}
                value={formData.bedArea || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bedArea: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Số Lượng Cây Trồng
              </label>
              <input
                type="number"
                min={0}
                value={formData.cropQuantities}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cropQuantities: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Trạng Thái
              </label>
              <select
                value={formData.bedStatus}
                onChange={(e) =>
                  setFormData({ ...formData, bedStatus: e.target.value })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              >
                <option value="Active">Đang sử dụng</option>
                <option value="Inactive">Khả dụng</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
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
                Tạo Luống
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ViewBedModal({
  open,
  onClose,
  bed,
  plot,
}: {
  open: boolean;
  onClose: () => void;
  bed: BedResponse;
  plot: PlotResponse;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-[#115e59]">
              Thông Tin Chi Tiết Luống
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 text-[#62748e] hover:bg-[#f8fafc] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>
          <div className="space-y-4">
            <div className="text-sm text-[#62748e]">
              <MapPin className="w-4 h-4 inline mr-1" />
              Vị trí: {plot.plotName} · {plot.farmName}
            </div>
            <div className="pt-4 border-t border-[#e2e8f0] space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-[#62748e]">Tên luống:</span>
                <span className="text-sm font-medium text-[#115e59]">
                  {bed.bedName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#62748e]">Diện tích:</span>
                <span className="text-sm font-medium text-[#115e59]">
                  {bed.bedArea} m²
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#62748e]">Số lượng cây:</span>
                <span className="text-sm font-medium text-[#115e59]">
                  {bed.cropQuantities}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#62748e]">Mùa vụ liên kết:</span>
                <span className="text-sm font-medium text-[#115e59]">
                  {bed.seasonsDetailsCount} mùa
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#62748e]">Trạng thái:</span>
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${bedStatusConfig[bed.bedStatus] ?? "bg-[#f1f5f9] text-[#475569]"}`}
                >
                  {bedStatusMap[bed.bedStatus] ?? bed.bedStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#62748e]">Ngày tạo:</span>
                <span className="text-sm font-medium text-[#115e59]">
                  {formatDate(bed.bedCreatedAt)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-6">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#f1f5f9] text-[#314158] rounded-lg hover:bg-[#e2e8f0] transition-colors"
            >
              Đóng
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EditBedModal({
  open,
  onClose,
  bed,
  onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  bed: BedResponse;
  onUpdate: (id: string, data: BedRequest) => void;
}) {
  const [formData, setFormData] = useState<BedRequest>({
    plotId: bed.plotId,
    bedName: bed.bedName,
    bedArea: bed.bedArea,
    bedStatus: bed.bedStatus,
    cropQuantities: bed.cropQuantities,
  });

  useEffect(() => {
    if (open)
      setFormData({
        plotId: bed.plotId,
        bedName: bed.bedName,
        bedArea: bed.bedArea,
        bedStatus: bed.bedStatus,
        cropQuantities: bed.cropQuantities,
      });
  }, [open, bed]);

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-[#115e59]">
              Chỉnh Sửa Luống
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 text-[#62748e] hover:bg-[#f8fafc] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onUpdate(bed.bedId, formData);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Tên Luống
              </label>
              <input
                type="text"
                required
                value={formData.bedName}
                onChange={(e) =>
                  setFormData({ ...formData, bedName: e.target.value })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Diện Tích (m²)
              </label>
              <input
                type="number"
                required
                min={0.1}
                step={0.1}
                value={formData.bedArea}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bedArea: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Số Lượng Cây Trồng
              </label>
              <input
                type="number"
                min={0}
                value={formData.cropQuantities}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cropQuantities: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Trạng Thái
              </label>
              <select
                value={formData.bedStatus}
                onChange={(e) =>
                  setFormData({ ...formData, bedStatus: e.target.value })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              >
                <option value="Active">Đang sử dụng</option>
                <option value="Inactive">Khả dụng</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-[#f1f5f9] text-[#314158] rounded-lg hover:bg-[#e2e8f0] transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AutoBedModal({
  open,
  onClose,
  plot,
  remainingArea,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  plot: PlotResponse;
  remainingArea: number;
  onCreate: (
    plotId: string,
    bedSize: number,
    cropQuantities: number,
    prefix: string,
  ) => void;
}) {
  const [bedSize, setBedSize] = useState(50);
  const [cropQuantities, setCropQuantities] = useState(10);
  const [prefix, setPrefix] = useState("bed");
  const count = Math.floor(remainingArea / bedSize);

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-[#115e59]">
              Thêm Luống Tự Động
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 text-[#62748e] hover:bg-[#f8fafc] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>
          <div className="mb-4 text-sm text-[#62748e]">
            Vuông:{" "}
            <span className="font-medium text-[#115e59]">{plot.plotName}</span>{" "}
            · Diện tích còn lại (ước tính):{" "}
            <span className="font-medium text-[#115e59]">
              {remainingArea} m²
            </span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onCreate(plot.plotId, bedSize, cropQuantities, prefix);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Prefix tên luống
              </label>
              <input
                type="text"
                required
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="Ví dụ: west, north"
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Diện tích mỗi luống (m²)
              </label>
              <input
                type="number"
                required
                min={1}
                value={bedSize}
                onChange={(e) => setBedSize(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Số lượng cây mỗi luống
              </label>
              <input
                type="number"
                required
                min={0}
                value={cropQuantities}
                onChange={(e) =>
                  setCropQuantities(parseInt(e.target.value) || 0)
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>
            <div className="bg-[#f0fdfa] p-4 rounded-lg">
              <div className="text-sm text-[#009689] font-medium">
                Sẽ tạo {count} luống với diện tích {bedSize} m² mỗi luống
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-[#f1f5f9] text-[#314158] rounded-lg hover:bg-[#e2e8f0] transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={count === 0}
                className="px-6 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Thêm Luống
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
