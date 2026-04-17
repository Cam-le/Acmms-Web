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
  Cpu,
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
  CropResponse,
  IotDeviceRequest,
  AutoAllocatePreviewResponse,
  AutoAllocateBedItem,
} from "../../api/client";

// ==================== Helpers ====================

const plotStatusMap: Record<string, string> = {
  Active: "Hoạt động",
  Inactive: "Không hoạt động",
};

const bedStatusMap: Record<string, string> = {
  Planted: "Đang trồng",
  planted: "Đang trồng",
  Empty: "Chưa trồng",
  empty: "Chưa trồng",
  Warning: "Đang bị bệnh",
  warning: "Đang bị bệnh",
};

const bedStatusConfig: Record<string, string> = {
  Planted: "bg-[#dcfce7] text-[#166534]",
  planted: "bg-[#dcfce7] text-[#166534]",
  Empty: "bg-[#f1f5f9] text-[#475569]",
  empty: "bg-[#f1f5f9] text-[#475569]",
  Warning: "bg-[#fef9c3] text-[#854d0e]",
  warning: "bg-[#fef9c3] text-[#854d0e]",
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
  const [crops, setCrops] = useState<CropResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
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
  // IoT quick-add: bedId to pre-fill the modal launched from a bed row
  const [iotBedTarget, setIotBedTarget] = useState<string | null>(null);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const [plotsData, bedsData] = await Promise.all([
          api.getPlots(),
          api.getBeds(),
        ]);
        setPlots(plotsData);
        setBeds(bedsData);
      } catch {
        setPlots([]);
        setBeds([]);
      }
      try {
        const farmsData = await api.getFarms();
        setFarms(farmsData);
        if (farmsData.length > 0) setSelectedFarmId(farmsData[0].farmId);
      } catch {
        setFarms([]);
      }
      try {
        setSoils(await api.getSoils());
      } catch {
        setSoils([]);
      }
      try {
        setCrops(await api.getCrops());
      } catch {
        // crops list is optional for display; proceed without
      }
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

  const filteredPlots = plots
    .filter((p) => p.farmId === selectedFarmId)
    .filter((p): p is PlotResponse => !!p?.plotId)
    .sort(
      (a, b) =>
        new Date(a.bedCreatedAt).getTime() - new Date(b.bedCreatedAt).getTime(),
    );

  const farmOptions: FarmResponse[] = farms;

  // ── Plot CRUD ──
  const handleCreatePlot = async (data: PlotRequest) => {
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
    try {
      await api.deletePlot(plotToDeleteId);
      setPlots(plots.filter((p) => p.plotId !== plotToDeleteId));
      setBeds(beds.filter((b) => b.plotId !== plotToDeleteId));
    } catch (err) {
      alert("Xóa vuông đất thất bại: " + (err as Error).message);
    }
    setPlotToDeleteId(null);
    setDeletePlotDialogOpen(false);
  };

  // ── Bed CRUD ──
  const handleCreateBed = async (data: BedRequest) => {
    try {
      await api.createBed(data);
      const [refreshedBeds, refreshedPlots] = await Promise.all([
        api.getBeds(),
        api.getPlots(),
      ]);
      setBeds(refreshedBeds);
      setPlots(refreshedPlots);
      setCreateBedOpen(false);
    } catch (err) {
      alert("Tạo luống thất bại: " + (err as Error).message);
    }
  };

  const handleUpdateBed = async (id: string, data: BedRequest) => {
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
    try {
      await api.deleteBed(bedToDeleteId);
      setBeds(beds.filter((b) => b.bedId !== bedToDeleteId));
      if (bed)
        setPlots(
          plots.map((p) =>
            p.plotId === bed.plotId
              ? { ...p, bedsCount: Math.max(0, p.bedsCount - 1) }
              : p,
          ),
        );
    } catch (err) {
      alert("Xóa luống thất bại: " + (err as Error).message);
    }
    setBedToDeleteId(null);
    setDeleteBedDialogOpen(false);
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
            const plotBeds = bedsForPlot(plot.plotId).sort((a, b) => {
              // Extract leading number from bedName for natural numeric sort
              const numA = parseInt(a.bedName.match(/\d+/)?.[0] ?? "0", 10);
              const numB = parseInt(b.bedName.match(/\d+/)?.[0] ?? "0", 10);
              if (numA !== numB) return numA - numB;
              return a.bedName.localeCompare(b.bedName, "vi");
            });
            const activeBeds = plotBeds.filter(
              (b) => b.bedStatus === "Planted" || b.bedStatus === "planted",
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
                            {activeBeds}/{plotBeds.length} luống đang trồng
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
                          Luống ({activeBeds}/{plotBeds.length} đang trồng)
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
                                  Cây trồng
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#62748e] uppercase">
                                  Diện tích
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#62748e] uppercase">
                                  Dài (m)
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#62748e] uppercase">
                                  Rộng (m)
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#62748e] uppercase">
                                  Số hàng
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#62748e] uppercase">
                                  Số cây
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
                                    {bed.cropName ?? "-"}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-[#62748e]">
                                    {bed.bedArea} m²
                                  </td>
                                  <td className="px-4 py-3 text-sm text-[#62748e]">
                                    {bed.bedLength != null
                                      ? bed.bedLength
                                      : "-"}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-[#62748e]">
                                    {bed.bedWidth != null ? bed.bedWidth : "-"}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-[#62748e]">
                                    {bed.rowCount != null ? bed.rowCount : "-"}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-[#62748e]">
                                    {bed.plantCount != null
                                      ? bed.plantCount
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
                                      <button
                                        onClick={() =>
                                          setIotBedTarget(bed.bedId)
                                        }
                                        className="p-2 text-[#009689] hover:bg-[#f0fdfa] rounded-lg transition-colors"
                                        title="Thêm thiết bị IoT"
                                      >
                                        <Cpu className="w-4 h-4" />
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
            crops={crops}
            onCreate={handleCreateBed}
          />
          <AutoBedModal
            open={autoPlotOpen}
            onClose={() => setAutoPlotOpen(false)}
            plot={selectedPlot}
            crops={crops}
            onConfirmed={async () => {
              const [refreshedBeds, refreshedPlots] = await Promise.all([
                api.getBeds(),
                api.getPlots(),
              ]);
              setBeds(refreshedBeds);
              setPlots(refreshedPlots);
              setAutoPlotOpen(false);
            }}
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
            crops={crops}
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

      {/* IoT Quick-Add Modal — launched from bed row Cpu button */}
      {iotBedTarget && (
        <IotQuickAddModal
          bedId={iotBedTarget}
          onClose={() => setIotBedTarget(null)}
        />
      )}
    </div>
  );
}

// ==================== Validation ====================

interface PlotFormErrors {
  plotName?: string;
  plotArea?: string;
  farmId?: string;
  soilId?: string;
}

function validatePlotForm(
  data: PlotRequest,
  farms: FarmResponse[],
  soils: SoilResponse[],
): PlotFormErrors {
  const errors: PlotFormErrors = {};
  if (!data.plotName.trim()) {
    errors.plotName = "Vui lòng nhập tên vuông đất";
  } else if (data.plotName.trim().length < 2) {
    errors.plotName = "Tên vuông đất phải có ít nhất 2 ký tự";
  }
  if (!data.plotArea || data.plotArea <= 0) {
    errors.plotArea = "Diện tích phải là số dương";
  } else if (data.plotArea > 1_000_000) {
    errors.plotArea = "Diện tích vượt quá giới hạn cho phép";
  }
  if (!data.farmId) {
    errors.farmId = "Vui lòng chọn trang trại";
  }
  if (!data.soilId) {
    errors.soilId = "Vui lòng chọn loại đất";
  }
  return errors;
}

interface BedFormErrors {
  bedName?: string;
  bedArea?: string;
}

function validateBedForm(data: BedRequest): BedFormErrors {
  const errors: BedFormErrors = {};
  if (!data.bedName.trim()) {
    errors.bedName = "Vui lòng nhập tên luống";
  } else if (data.bedName.trim().length < 2) {
    errors.bedName = "Tên luống phải có ít nhất 2 ký tự";
  } else if (data.bedName.trim().length > 200) {
    errors.bedName = "Tên luống không được quá 200 ký tự";
  }
  if (!data.bedArea || data.bedArea <= 0) {
    errors.bedArea = "Diện tích phải là số dương";
  }
  return errors;
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
    plotLength: 0,
    plotWidth: 0,
    plotMargin: 0.3,
    plotStatus: "Active",
  });
  const [formErrors, setFormErrors] = useState<PlotFormErrors>({});

  useEffect(() => {
    if (open) {
      setFormData({
        farmId: farms[0]?.farmId ?? "",
        soilId: soils[0]?.soilId ?? "",
        plotName: "",
        plotArea: 0,
        plotLength: 0,
        plotWidth: 0,
        plotMargin: 0.3,
        plotStatus: "Active",
      });
      setFormErrors({});
    }
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
              const errors = validatePlotForm(formData, farms, soils);
              setFormErrors(errors);
              if (Object.keys(errors).length > 0) return;
              onCreate({ ...formData, plotName: formData.plotName.trim() });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Tên Vuông Đất <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Plot A1"
                value={formData.plotName}
                onChange={(e) => {
                  setFormData({ ...formData, plotName: e.target.value });
                  setFormErrors((p) => ({ ...p, plotName: undefined }));
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] ${formErrors.plotName ? "border-red-300 bg-red-50" : "border-[#cad5e2]"}`}
              />
              {formErrors.plotName && (
                <p className="mt-1 text-xs text-red-500">
                  {formErrors.plotName}
                </p>
              )}
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
                  min={1}
                  value={formData.plotArea || ""}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      plotArea: parseFloat(e.target.value) || 0,
                    });
                    setFormErrors((p) => ({ ...p, plotArea: undefined }));
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] ${formErrors.plotArea ? "border-red-300 bg-red-50" : "border-[#cad5e2]"}`}
                />
                {formErrors.plotArea && (
                  <p className="mt-1 text-xs text-red-500">
                    {formErrors.plotArea}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Lề Vuông (m)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={formData.plotMargin}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      plotMargin: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Chiều Dài (m)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={formData.plotLength || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      plotLength: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Chiều Rộng (m)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={formData.plotWidth || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      plotWidth: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>
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
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#e2e8f0]">
              <div>
                <div className="text-xs text-[#62748e] uppercase mb-1">Dài</div>
                <div className="font-medium text-[#115e59]">
                  {plot.plotLength ?? "-"} m
                </div>
              </div>
              <div>
                <div className="text-xs text-[#62748e] uppercase mb-1">
                  Rộng
                </div>
                <div className="font-medium text-[#115e59]">
                  {plot.plotWidth ?? "-"} m
                </div>
              </div>
              <div>
                <div className="text-xs text-[#62748e] uppercase mb-1">Lề</div>
                <div className="font-medium text-[#115e59]">
                  {plot.plotMargin ?? "-"} m
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
    plotLength: plot.plotLength ?? 0,
    plotWidth: plot.plotWidth ?? 0,
    plotMargin: plot.plotMargin ?? 0.3,
    plotStatus: plot.plotStatus,
  });
  useEffect(() => {
    if (open)
      setFormData({
        farmId: plot.farmId,
        soilId: plot.soilId,
        plotName: plot.plotName,
        plotArea: plot.plotArea,
        plotLength: plot.plotLength ?? 0,
        plotWidth: plot.plotWidth ?? 0,
        plotMargin: plot.plotMargin ?? 0.3,
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
                  Lề Vuông (m)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={formData.plotMargin}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      plotMargin: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Chiều Dài (m)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={formData.plotLength}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      plotLength: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Chiều Rộng (m)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={formData.plotWidth}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      plotWidth: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>
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

// ==================== IoT Quick-Add Modal (from PlotsPage bed row) ====================

function IotQuickAddModal({
  bedId,
  onClose,
}: {
  bedId: string;
  onClose: () => void;
}) {
  const emptyForm: IotDeviceRequest = {
    bedId,
    deviceCode: "",
    name: "",
    type: "Environment",
    status: "Active",
    installationDate: new Date().toISOString(),
    latitude: 0,
    longitude: 0,
  };
  const [formData, setFormData] = useState<IotDeviceRequest>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    formData.name.trim() !== "" && formData.deviceCode.trim() !== "";

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.createIotDevice({
        ...formData,
        installationDate: new Date(formData.installationDate).toISOString(),
      });
      onClose();
    } catch (err) {
      alert("Thêm thiết bị thất bại: " + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#e2e8f0]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#f0fdfa] rounded-lg flex items-center justify-center">
                <Cpu className="w-5 h-5 text-[#009689]" />
              </div>
              <div>
                <Dialog.Title className="text-base font-semibold text-[#115e59]">
                  Thêm Thiết Bị IoT
                </Dialog.Title>
                <p className="text-xs text-[#62748e] mt-0.5 font-mono">
                  Luống: {bedId.slice(0, 8)}…
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="p-2 text-[#62748e] hover:bg-[#f8fafc] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-1.5">
                  Mã thiết bị <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="CMMS_01_ESP"
                  value={formData.deviceCode}
                  onChange={(e) =>
                    setFormData({ ...formData, deviceCode: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-1.5">
                  Tên thiết bị <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Cảm biến nhiệt độ A1"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-1.5">
                  Loại thiết bị
                </label>
                <input
                  type="text"
                  placeholder="Environment"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-1.5">
                  Trạng thái
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm"
                >
                  <option value="Active">Hoạt động</option>
                  <option value="Inactive">Không hoạt động</option>
                  <option value="Maintenance">Bảo trì</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-1.5">
                Ngày lắp đặt
              </label>
              <input
                type="date"
                value={formData.installationDate.split("T")[0]}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    installationDate: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : new Date().toISOString(),
                  })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-1.5">
                  Vĩ độ
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={formData.latitude || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      latitude: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-1.5">
                  Kinh độ
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={formData.longitude || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      longitude: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm"
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[#e2e8f0] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-[#f1f5f9] text-[#314158] rounded-lg hover:bg-[#e2e8f0] transition-colors text-sm"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="px-5 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Thêm Thiết Bị
            </button>
          </div>
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
  crops,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  plot: PlotResponse;
  crops: CropResponse[];
  onCreate: (data: BedRequest) => void;
}) {
  const emptyForm = (): BedRequest => ({
    plotId: plot.plotId,
    bedName: "",
    bedArea: 0,
    bedStatus: "Empty",
    cropQuantities: 0,
    cropId: undefined,
    bedWidth: undefined,
    bedLength: undefined,
    pathWidth: undefined,
    plantCount: undefined,
    rowCount: undefined,
  });

  const [formData, setFormData] = useState<BedRequest>(emptyForm());
  const [formErrors, setFormErrors] = useState<BedFormErrors>({});
  const [loadingCrop, setLoadingCrop] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(emptyForm());
      setFormErrors({});
      setLoadingCrop(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plot]);

  // Fetch crop defaults when a crop is selected; auto-fill bedWidth, pathWidth, rowCount
  const handleCropChange = async (newCropId: string) => {
    setFormData((prev) => ({
      ...prev,
      cropId: newCropId || undefined,
      // Clear auto-filled fields so stale values don't persist if user switches crop
      bedWidth: undefined,
      pathWidth: undefined,
      rowCount: undefined,
    }));

    if (!newCropId) return;

    setLoadingCrop(true);
    try {
      const crop = await api.getCrop(newCropId);
      setFormData((prev) => ({
        ...prev,
        cropId: newCropId,
        bedWidth: crop.bedWidthDefault ?? prev.bedWidth,
        pathWidth: crop.pathWidthDefault ?? prev.pathWidth,
        rowCount: crop.rowsPerBed ?? prev.rowCount,
      }));
    } catch {
      // Crop fetch failed — user can still enter values manually
    } finally {
      setLoadingCrop(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-[#115e59]">
              Thêm Luống
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
              const errors = validateBedForm(formData);
              setFormErrors(errors);
              if (Object.keys(errors).length > 0) return;
              onCreate({ ...formData, bedName: formData.bedName.trim() });
            }}
            className="space-y-4"
          >
            {/* Tên luống — always manual */}
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Tên Luống <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.bedName}
                onChange={(e) => {
                  setFormData({ ...formData, bedName: e.target.value });
                  setFormErrors((p) => ({ ...p, bedName: undefined }));
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] ${formErrors.bedName ? "border-red-300 bg-red-50" : "border-[#cad5e2]"}`}
              />
              {formErrors.bedName && (
                <p className="mt-1 text-xs text-red-500">
                  {formErrors.bedName}
                </p>
              )}
            </div>

            {/* Cây trồng — triggers auto-fill of bedWidth / pathWidth / rowCount */}
            {crops.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Cây Trồng
                </label>
                <div className="relative">
                  <select
                    value={formData.cropId ?? ""}
                    onChange={(e) => handleCropChange(e.target.value)}
                    className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  >
                    <option value="">-- Không chọn --</option>
                    {crops.map((c) => (
                      <option key={c.cropId} value={c.cropId}>
                        {c.cropName}
                      </option>
                    ))}
                  </select>
                  {loadingCrop && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#009689] border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </div>
            )}

            {/* Diện tích + Số lượng cây — always manual */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Diện Tích (m²) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0.1}
                  step={0.01}
                  value={formData.bedArea || ""}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      bedArea: parseFloat(e.target.value) || 0,
                    });
                    setFormErrors((p) => ({ ...p, bedArea: undefined }));
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] ${formErrors.bedArea ? "border-red-300 bg-red-50" : "border-[#cad5e2]"}`}
                />
                {formErrors.bedArea && (
                  <p className="mt-1 text-xs text-red-500">
                    {formErrors.bedArea}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Số Lượng Cây
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
            </div>

            {/* Chiều dài — always manual */}
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Chiều Dài (m)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={formData.bedLength ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bedLength: parseFloat(e.target.value) || undefined,
                  })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>

            {/* Chiều rộng + Lối đi + Số hàng — auto-filled from crop, still editable */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Chiều Rộng (m)
                  {formData.cropId && (
                    <span className="ml-1 text-xs text-[#009689] font-normal">
                      (tự động)
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.bedWidth ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bedWidth: parseFloat(e.target.value) || undefined,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Lối Đi (m)
                  {formData.cropId && (
                    <span className="ml-1 text-xs text-[#009689] font-normal">
                      (tự động)
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.pathWidth ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pathWidth: parseFloat(e.target.value) || undefined,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Số Hàng
                  {formData.cropId && (
                    <span className="ml-1 text-xs text-[#009689] font-normal">
                      (tự động)
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.rowCount ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rowCount: parseInt(e.target.value) || undefined,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>
            </div>

            {/* Số cây — always manual */}
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Số Cây
              </label>
              <input
                type="number"
                min={0}
                value={formData.plantCount ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    plantCount: parseInt(e.target.value) || undefined,
                  })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>

            {/* Trạng thái — always manual */}
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
                <option value="Planted">Đang trồng</option>
                <option value="Empty">Chưa trồng</option>
                <option value="Warning">Đang bị bệnh</option>
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
              {bed.cropName && (
                <div className="flex justify-between">
                  <span className="text-sm text-[#62748e]">Cây trồng:</span>
                  <span className="text-sm font-medium text-[#115e59]">
                    {bed.cropName}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-[#62748e]">Diện tích:</span>
                <span className="text-sm font-medium text-[#115e59]">
                  {bed.bedArea} m²
                </span>
              </div>
              {bed.bedLength != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-[#62748e]">Chiều dài:</span>
                  <span className="text-sm font-medium text-[#115e59]">
                    {bed.bedLength} m
                  </span>
                </div>
              )}
              {bed.bedWidth != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-[#62748e]">Chiều rộng:</span>
                  <span className="text-sm font-medium text-[#115e59]">
                    {bed.bedWidth} m
                  </span>
                </div>
              )}
              {bed.pathWidth != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-[#62748e]">Lối đi:</span>
                  <span className="text-sm font-medium text-[#115e59]">
                    {bed.pathWidth} m
                  </span>
                </div>
              )}
              {bed.rowCount != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-[#62748e]">Số hàng:</span>
                  <span className="text-sm font-medium text-[#115e59]">
                    {bed.rowCount}
                  </span>
                </div>
              )}
              {bed.plantCount != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-[#62748e]">Số cây:</span>
                  <span className="text-sm font-medium text-[#115e59]">
                    {bed.plantCount}
                  </span>
                </div>
              )}
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
  crops,
  onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  bed: BedResponse;
  crops: CropResponse[];
  onUpdate: (id: string, data: BedRequest) => void;
}) {
  const [formData, setFormData] = useState<BedRequest>({
    plotId: bed.plotId,
    bedName: bed.bedName,
    bedArea: bed.bedArea,
    bedStatus: bed.bedStatus,
    cropQuantities: bed.cropQuantities,
    cropId: bed.cropId,
    bedWidth: bed.bedWidth,
    bedLength: bed.bedLength,
    pathWidth: bed.pathWidth,
    plantCount: bed.plantCount,
    rowCount: bed.rowCount,
  });
  const [formErrors, setFormErrors] = useState<BedFormErrors>({});

  useEffect(() => {
    if (open) {
      setFormData({
        plotId: bed.plotId,
        bedName: bed.bedName,
        bedArea: bed.bedArea,
        bedStatus: bed.bedStatus,
        cropQuantities: bed.cropQuantities,
        cropId: bed.cropId,
        bedWidth: bed.bedWidth,
        bedLength: bed.bedLength,
        pathWidth: bed.pathWidth,
        plantCount: bed.plantCount,
        rowCount: bed.rowCount,
      });
      setFormErrors({});
    }
  }, [open, bed]);

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
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
              const errors = validateBedForm(formData);
              setFormErrors(errors);
              if (Object.keys(errors).length > 0) return;
              onUpdate(bed.bedId, {
                ...formData,
                bedName: formData.bedName.trim(),
              });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Tên Luống
              </label>
              <input
                type="text"
                value={formData.bedName}
                onChange={(e) => {
                  setFormData({ ...formData, bedName: e.target.value });
                  setFormErrors((p) => ({ ...p, bedName: undefined }));
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] ${formErrors.bedName ? "border-red-300 bg-red-50" : "border-[#cad5e2]"}`}
              />
              {formErrors.bedName && (
                <p className="mt-1 text-xs text-red-500">
                  {formErrors.bedName}
                </p>
              )}
            </div>
            {crops.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Cây Trồng
                </label>
                <select
                  value={formData.cropId ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cropId: e.target.value || undefined,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                >
                  <option value="">-- Không chọn --</option>
                  {crops.map((c) => (
                    <option key={c.cropId} value={c.cropId}>
                      {c.cropName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Diện Tích (m²)
                </label>
                <input
                  type="number"
                  min={0.1}
                  step={0.01}
                  value={formData.bedArea || ""}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      bedArea: parseFloat(e.target.value) || 0,
                    });
                    setFormErrors((p) => ({ ...p, bedArea: undefined }));
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] ${formErrors.bedArea ? "border-red-300 bg-red-50" : "border-[#cad5e2]"}`}
                />
                {formErrors.bedArea && (
                  <p className="mt-1 text-xs text-red-500">
                    {formErrors.bedArea}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Số Lượng Cây
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
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Chiều Dài (m)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.bedLength ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bedLength: parseFloat(e.target.value) || undefined,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Chiều Rộng (m)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.bedWidth ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bedWidth: parseFloat(e.target.value) || undefined,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Lối Đi (m)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.pathWidth ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pathWidth: parseFloat(e.target.value) || undefined,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Số Hàng
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.rowCount ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rowCount: parseInt(e.target.value) || undefined,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Số Cây
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.plantCount ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      plantCount: parseInt(e.target.value) || undefined,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>
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
                <option value="Planted">Đang trồng</option>
                <option value="Empty">Chưa trồng</option>
                <option value="Warning">Đang bị bệnh</option>
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

// ==================== Auto Bed Modal ====================

function AutoBedModal({
  open,
  onClose,
  plot,
  crops,
  onConfirmed,
}: {
  open: boolean;
  onClose: () => void;
  plot: PlotResponse;
  crops: CropResponse[];
  onConfirmed: () => Promise<void>;
}) {
  const [step, setStep] = useState<"form" | "preview">("form");

  // Crop selection
  const [cropId, setCropId] = useState<string>("");
  const [loadingCrop, setLoadingCrop] = useState(false);
  const [soilWarning, setSoilWarning] = useState<string | null>(null);
  const [soilBlocked, setSoilBlocked] = useState(false);

  // Form fields — populated after crop fetch
  const [bedWidth, setBedWidth] = useState<number>(1);
  const [pathWidth, setPathWidth] = useState<number>(0.5);
  const [rowsPerBed, setRowsPerBed] = useState<number>(2);
  const [bedNamePrefix, setBedNamePrefix] = useState("Luống");

  const [preview, setPreview] = useState<AutoAllocatePreviewResponse | null>(
    null,
  );
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setStep("form");
      setPreview(null);
      setError(null);
      setCropId("");
      setSoilWarning(null);
      setSoilBlocked(false);
      setBedWidth(1);
      setPathWidth(0.5);
      setRowsPerBed(2);
      setBedNamePrefix("Luống");
    }
  }, [open]);

  // When crop selection changes: fetch crop details, auto-fill, check soil
  const handleCropChange = async (newCropId: string) => {
    setCropId(newCropId);
    setSoilWarning(null);
    setSoilBlocked(false);
    setError(null);

    if (!newCropId) return;

    setLoadingCrop(true);
    try {
      const crop = await api.getCrop(newCropId);

      // Auto-fill defaults from crop
      if (crop.bedWidthDefault != null) setBedWidth(crop.bedWidthDefault);
      if (crop.pathWidthDefault != null) setPathWidth(crop.pathWidthDefault);
      if (crop.rowsPerBed != null) setRowsPerBed(crop.rowsPerBed);

      // Soil compatibility check — case-insensitive
      if (crop.compatibleSoils && crop.compatibleSoils.length > 0) {
        const match = crop.compatibleSoils.find(
          (s) => s.soilId === plot.soilId,
        );
        if (!match) {
          // Soil not listed at all — block
          setSoilBlocked(true);
          setSoilWarning(
            `Loại đất "${plot.soilName}" không có trong danh sách đất tương thích của cây trồng này. Không thể tiếp tục.`,
          );
        } else if (match.compatibility.toLowerCase() === "poor") {
          // Poor compatibility — warn but allow
          setSoilWarning(
            `Cảnh báo: Loại đất "${plot.soilName}" không phù hợp tốt với cây trồng này (mức độ: kém). Bạn vẫn có thể tiếp tục nhưng nên cân nhắc.`,
          );
        }
      }
    } catch (err) {
      setError("Không thể tải thông tin cây trồng: " + (err as Error).message);
    } finally {
      setLoadingCrop(false);
    }
  };

  const handlePreview = async () => {
    if (!cropId) {
      setError("Vui lòng chọn cây trồng");
      return;
    }
    if (soilBlocked) {
      setError(
        "Không thể tạo luống do đất không tương thích với cây trồng đã chọn.",
      );
      return;
    }
    setError(null);
    setLoadingPreview(true);
    try {
      const result = await api.autoAllocatePreview({
        plotId: plot.plotId,
        cropId,
        bedWidth,
        pathWidth,
        rowsPerBed,
        bedNamePrefix,
      });
      setPreview(result);
      setStep("preview");
    } catch (err) {
      setError("Xem trước thất bại: " + (err as Error).message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setConfirming(true);
    try {
      await api.autoAllocateConfirm({
        plotId: preview.plotId,
        cropId: preview.cropId,
        beds: preview.beds,
      });
      await onConfirmed();
    } catch (err) {
      setError("Xác nhận thất bại: " + (err as Error).message);
      setConfirming(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#e2e8f0]">
            <div>
              <Dialog.Title className="text-xl font-semibold text-[#115e59]">
                Phân Luống Tự Động
              </Dialog.Title>
              <p className="text-xs text-[#62748e] mt-0.5">
                {plot.plotName} ·{" "}
                {step === "form" ? "Nhập thông số" : "Xem trước kết quả"}
              </p>
            </div>
            <Dialog.Close asChild>
              <button className="p-2 text-[#62748e] hover:bg-[#f8fafc] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="px-6 py-5 overflow-y-auto flex-1">
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            {step === "form" && (
              <div className="space-y-4">
                {/* Crop selector — must be chosen first */}
                <div>
                  <label className="block text-sm font-medium text-[#115e59] mb-2">
                    Cây Trồng <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={cropId}
                      onChange={(e) => handleCropChange(e.target.value)}
                      className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                    >
                      <option value="">-- Chọn cây trồng --</option>
                      {crops.map((c) => (
                        <option key={c.cropId} value={c.cropId}>
                          {c.cropName}
                        </option>
                      ))}
                    </select>
                    {loadingCrop && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#009689] border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </div>

                {/* Soil compatibility notice */}
                {soilWarning && (
                  <div
                    className={`px-4 py-3 rounded-lg text-sm border ${
                      soilBlocked
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-amber-50 border-amber-200 text-amber-700"
                    }`}
                  >
                    {soilWarning}
                  </div>
                )}

                {/* Rest of the form — only shown after a crop is chosen and loaded */}
                {cropId && !loadingCrop && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#115e59] mb-2">
                        Prefix tên luống
                      </label>
                      <input
                        type="text"
                        value={bedNamePrefix}
                        onChange={(e) => setBedNamePrefix(e.target.value)}
                        placeholder="Ví dụ: Luống"
                        className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#115e59] mb-2">
                          Chiều Rộng luống (m)
                        </label>
                        <input
                          type="number"
                          min={0.1}
                          step={0.1}
                          value={bedWidth}
                          onChange={(e) =>
                            setBedWidth(parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#115e59] mb-2">
                          Khoảng cách lối đi (m)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={pathWidth}
                          onChange={(e) =>
                            setPathWidth(parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#115e59] mb-2">
                          Hàng/luống
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={rowsPerBed}
                          onChange={(e) =>
                            setRowsPerBed(parseInt(e.target.value) || 1)
                          }
                          className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {step === "preview" && preview && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#f0fdfa] rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-[#009689]">
                      {preview.bedCount}
                    </div>
                    <div className="text-xs text-[#62748e] mt-1">Luống</div>
                  </div>
                  <div className="bg-[#f0fdfa] rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-[#009689]">
                      {preview.plantCount}
                    </div>
                    <div className="text-xs text-[#62748e] mt-1">Cây</div>
                  </div>
                  <div className="bg-[#f0fdfa] rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-[#009689]">
                      {preview.bedArea}
                    </div>
                    <div className="text-xs text-[#62748e] mt-1">m²/luống</div>
                  </div>
                </div>
                {preview.widthRemain > 0 && (
                  <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    Còn dư {preview.widthRemain} m chiều rộng chưa sử dụng
                  </div>
                )}
                <div className="border border-[#e2e8f0] rounded-lg overflow-hidden">
                  <div className="bg-[#f8fafc] px-4 py-2 grid grid-cols-2 text-xs font-medium text-[#62748e] uppercase">
                    <span>Tên luống</span>
                    <span className="text-right">Tổng Cây Trồng</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-[#e2e8f0]">
                    {preview.beds.map((b, i) => (
                      <div
                        key={i}
                        className="px-4 py-2 grid grid-cols-2 text-sm"
                      >
                        <span className="font-medium text-[#115e59]">
                          {b.bedName}
                        </span>
                        <span className="text-right text-[#62748e]">
                          {b.plantCount} cây
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-[#e2e8f0] flex justify-end gap-3">
            {step === "form" ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 bg-[#f1f5f9] text-[#314158] rounded-lg hover:bg-[#e2e8f0] transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={
                    loadingPreview || !cropId || loadingCrop || soilBlocked
                  }
                  className="px-6 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loadingPreview && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Xem Trước
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setStep("form");
                    setError(null);
                  }}
                  className="px-6 py-2 bg-[#f1f5f9] text-[#314158] rounded-lg hover:bg-[#e2e8f0] transition-colors"
                >
                  Quay Lại
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="px-6 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {confirming && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Xác Nhận Tạo
                </button>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
