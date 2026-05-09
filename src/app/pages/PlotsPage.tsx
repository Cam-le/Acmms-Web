import { useState, useEffect } from "react";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Grid3x3,
  Layers,
  Sprout,
  Calendar,
  MapPin,
  Cpu,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
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
} from "../../api/client";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { FormField } from "../components/ui/FormField";
import { FormSelect } from "../components/ui/FormSelect";
import { LoadingState } from "../components/ui/LoadingState";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { useToast } from "../components/ui/useToast";
import { ToastContainer } from "../components/ui/ToastContainer";
import { plotStatusTone } from "../utils/status";
import { formatDate } from "../utils/format";

// ==================== Helpers ====================

const plotStatusLabel = (s: string) =>
  s === "Active" ? "Hoạt động" : "Không hoạt động";

function bedStatusLabel(status: string): string {
  return status.toLowerCase() === "active" ? "Hoạt động" : "Không hoạt động";
}

function bedStatusToneInline(status: string): "success" | "danger" {
  return status.toLowerCase() === "active" ? "success" : "danger";
}

// ==================== Validation ====================

interface PlotFormErrors {
  plotName?: string;
  plotLength?: string;
  plotWidth?: string;
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
  if (!data.plotLength || data.plotLength <= 0) {
    errors.plotLength = "Chiều dài phải là số dương";
  }
  if (!data.plotWidth || data.plotWidth <= 0) {
    errors.plotWidth = "Chiều rộng phải là số dương";
  }
  if (!data.farmId) errors.farmId = "Vui lòng chọn trang trại";
  if (!data.soilId) errors.soilId = "Vui lòng chọn loại đất";
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

// ==================== Main Page ====================

export function PlotsPage() {
  const { toasts, showToast, dismissToast } = useToast();

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
  const [deletingPlot, setDeletingPlot] = useState(false);
  const [deletingBed, setDeletingBed] = useState(false);

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
        new Date(a.plotCreatedAt).getTime() -
        new Date(b.plotCreatedAt).getTime(),
    );

  // ── Plot CRUD ──
  const handleCreatePlot = async (data: PlotRequest) => {
    try {
      await api.createPlot(data);
      const refreshed = await api.getPlots();
      setPlots(refreshed);
      setCreatePlotOpen(false);
      showToast("Tạo vuông đất thành công", "success");
    } catch (err) {
      showToast("Tạo vuông đất thất bại: " + (err as Error).message, "error");
    }
  };

  const handleUpdatePlot = async (id: string, data: PlotRequest) => {
    try {
      await api.updatePlot(id, data);
      const refreshed = await api.getPlots();
      setPlots(refreshed);
      setEditPlotOpen(false);
      showToast("Cập nhật vuông đất thành công", "success");
    } catch (err) {
      showToast(
        "Cập nhật vuông đất thất bại: " + (err as Error).message,
        "error",
      );
    }
  };

  const handleDeletePlot = (plotId: string) => {
    setPlotToDeleteId(plotId);
    setDeletePlotDialogOpen(true);
  };

  const confirmDeletePlot = async () => {
    if (!plotToDeleteId) return;
    setDeletingPlot(true);
    try {
      await api.deletePlot(plotToDeleteId);
      setPlots(plots.filter((p) => p.plotId !== plotToDeleteId));
      setBeds(beds.filter((b) => b.plotId !== plotToDeleteId));
      setDeletePlotDialogOpen(false);
      setPlotToDeleteId(null);
      showToast("Xóa vuông đất thành công", "success");
    } catch (err) {
      showToast("Xóa vuông đất thất bại: " + (err as Error).message, "error");
    } finally {
      setDeletingPlot(false);
    }
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
      showToast("Tạo luống thành công", "success");
    } catch (err) {
      showToast("Tạo luống thất bại: " + (err as Error).message, "error");
    }
  };

  const handleUpdateBed = async (id: string, data: BedRequest) => {
    try {
      await api.updateBed(id, data);
      const refreshed = await api.getBeds();
      setBeds(refreshed);
      setEditBedOpen(false);
      showToast("Cập nhật luống thành công", "success");
    } catch (err) {
      showToast("Cập nhật luống thất bại: " + (err as Error).message, "error");
    }
  };

  const handleDeleteBed = (bedId: string) => {
    setBedToDeleteId(bedId);
    setDeleteBedDialogOpen(true);
  };

  const confirmDeleteBed = async () => {
    if (!bedToDeleteId) return;
    const bed = beds.find((b) => b.bedId === bedToDeleteId);
    setDeletingBed(true);
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
      setDeleteBedDialogOpen(false);
      setBedToDeleteId(null);
      showToast("Xóa luống thành công", "success");
    } catch (err) {
      showToast("Xóa luống thất bại: " + (err as Error).message, "error");
    } finally {
      setDeletingBed(false);
    }
  };

  if (loading) {
    return <LoadingState message="Đang tải dữ liệu..." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <PageHeader
        icon={Grid3x3}
        title="Quản Lý Vuông Đất"
        subtitle="Quản lý đất và luống"
        actions={
          <Button leadingIcon={Plus} onClick={() => setCreatePlotOpen(true)}>
            Thêm vuông
          </Button>
        }
      />

      {/* Farm Selector */}
      <div className="bg-white rounded-lg border border-border shadow-card p-4">
        <label className="block text-sm text-ink-500 mb-2">
          Chọn Trang Trại:
        </label>
        <select
          value={selectedFarmId}
          onChange={(e) => setSelectedFarmId(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-border-strong rounded-btn focus:outline-none focus:ring-2 focus:ring-primary text-sm text-ink-700"
        >
          {farms.map((f) => (
            <option key={f.farmId} value={f.farmId}>
              {f.farmName}
            </option>
          ))}
        </select>
      </div>

      {/* Plot List */}
      <div className="space-y-6">
        {filteredPlots.length === 0 ? (
          <div className="bg-white rounded-lg border border-border shadow-card p-12">
            <EmptyState
              icon={Grid3x3}
              message="Chưa có vuông đất nào trong trang trại này"
            />
          </div>
        ) : (
          filteredPlots.map((plot) => {
            const isOpen = openPlotIds.includes(plot.plotId);
            const plotBeds = bedsForPlot(plot.plotId).sort((a, b) => {
              const numA = parseInt(a.bedName.match(/\d+/)?.[0] ?? "0", 10);
              const numB = parseInt(b.bedName.match(/\d+/)?.[0] ?? "0", 10);
              if (numA !== numB) return numA - numB;
              return a.bedName.localeCompare(b.bedName, "vi");
            });
            const activeBeds = plotBeds.filter(
              (b) => b.bedStatus.toLowerCase() === "active",
            ).length;

            return (
              <div
                key={plot.plotId}
                className="bg-white rounded-lg border border-border shadow-card overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-12 h-12 bg-primary-50 rounded-card flex items-center justify-center shrink-0">
                        <Grid3x3 className="w-6 h-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-ink-800 mb-1 truncate">
                          {plot.plotName}
                        </h3>
                        <p className="text-sm text-ink-500 mb-2">
                          {plot.plotArea} m² · {plot.farmName}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="px-2.5 py-1 bg-primary-50 text-primary rounded-btn text-xs font-medium">
                            {plot.soilName}
                          </span>
                          <span className="text-xs text-ink-500">
                            {activeBeds}/{plotBeds.length} luống
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <StatusBadge
                        label={plotStatusLabel(plot.plotStatus)}
                        tone={plotStatusTone(plot.plotStatus)}
                      />
                      <button
                        onClick={() => {
                          setSelectedPlot(plot);
                          setViewPlotOpen(true);
                        }}
                        className="p-2 text-primary hover:bg-primary-50 rounded-btn transition-colors"
                        title="Xem"
                        aria-label="Xem chi tiết vuông đất"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPlot(plot);
                          setEditPlotOpen(true);
                        }}
                        className="p-2 text-primary hover:bg-primary-50 rounded-btn transition-colors"
                        title="Chỉnh sửa"
                        aria-label="Chỉnh sửa vuông đất"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeletePlot(plot.plotId)}
                        className="p-2 text-status-danger-fg hover:bg-status-danger-bg rounded-btn transition-colors"
                        title="Xóa"
                        aria-label="Xóa vuông đất"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <Button
                        leadingIcon={Layers}
                        onClick={() => {
                          setSelectedPlot(plot);
                          setAutoPlotOpen(true);
                        }}
                      >
                        Thêm Luống Tự Động
                      </Button>
                    </div>
                  </div>

                  <Collapsible.Root
                    open={isOpen}
                    onOpenChange={() => togglePlot(plot.plotId)}
                  >
                    <div className="flex items-center justify-between py-3 border-t border-border">
                      <Collapsible.Trigger className="flex items-center gap-2 text-ink-800 font-medium">
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                        <span>
                          Luống ({activeBeds}/{plotBeds.length})
                        </span>
                      </Collapsible.Trigger>
                      <Button
                        variant="secondary"
                        leadingIcon={Plus}
                        onClick={() => {
                          setSelectedPlot(plot);
                          setCreateBedOpen(true);
                        }}
                      >
                        Thêm Luống
                      </Button>
                    </div>

                    <Collapsible.Content>
                      {plotBeds.length === 0 ? (
                        <div className="py-8">
                          <EmptyState size="sm" message="Chưa có luống nào" />
                        </div>
                      ) : (
                        <div className="mt-4 overflow-x-auto">
                          <table className="w-full min-w-[700px]">
                            <thead className="bg-surface-alt">
                              <tr>
                                {[
                                  "Tên luống",
                                  "Cây trồng",
                                  "Diện tích",
                                  "Dài (m)",
                                  "Rộng (m)",
                                  "Số hàng",
                                  "Số cây",
                                  "Trạng thái",
                                  "Thao tác",
                                ].map((h, i) => (
                                  <th
                                    key={h}
                                    className={`px-4 py-3 text-xs font-medium text-ink-500 uppercase whitespace-nowrap ${i === 8 ? "text-center" : "text-left"}`}
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {plotBeds.map((bed) => (
                                <tr
                                  key={bed.bedId}
                                  className="hover:bg-surface-alt transition-colors"
                                >
                                  <td className="px-4 py-3 text-sm text-ink-800 font-medium whitespace-nowrap">
                                    {bed.bedName}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-ink-500">
                                    {bed.cropName ?? "-"}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-ink-500 whitespace-nowrap">
                                    {bed.bedArea} m²
                                  </td>
                                  <td className="px-4 py-3 text-sm text-ink-500">
                                    {bed.bedLength != null
                                      ? bed.bedLength
                                      : "-"}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-ink-500">
                                    {bed.bedWidth != null ? bed.bedWidth : "-"}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-ink-500">
                                    {bed.rowCount != null ? bed.rowCount : "-"}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-ink-500">
                                    {bed.plantCount != null
                                      ? bed.plantCount
                                      : "-"}
                                  </td>
                                  <td className="px-4 py-3">
                                    <StatusBadge
                                      label={bedStatusLabel(bed.bedStatus)}
                                      tone={bedStatusToneInline(bed.bedStatus)}
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => {
                                          setSelectedBed(bed);
                                          setSelectedPlot(plot);
                                          setViewBedOpen(true);
                                        }}
                                        className="p-1.5 rounded-btn transition-colors text-ink-500 hover:text-primary hover:bg-primary-50"
                                        title="Xem"
                                        aria-label="Xem chi tiết luống"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedBed(bed);
                                          setSelectedPlot(plot);
                                          setEditBedOpen(true);
                                        }}
                                        className="p-1.5 rounded-btn transition-colors text-ink-500 hover:text-primary hover:bg-primary-50"
                                        title="Chỉnh sửa"
                                        aria-label="Chỉnh sửa luống"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleDeleteBed(bed.bedId)
                                        }
                                        className="p-1.5 rounded-btn transition-colors text-ink-500 hover:text-status-danger-fg hover:bg-status-danger-bg"
                                        title="Xóa"
                                        aria-label="Xóa luống"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() =>
                                          setIotBedTarget(bed.bedId)
                                        }
                                        className="p-1.5 rounded-btn transition-colors text-ink-500 hover:text-primary hover:bg-primary-50"
                                        title="Thêm thiết bị IoT"
                                        aria-label="Thêm thiết bị IoT"
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

      {/* ── Plot Modals ── */}
      <CreatePlotModal
        open={createPlotOpen}
        onClose={() => setCreatePlotOpen(false)}
        farms={farms}
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
            farms={farms}
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

      {/* ── Delete Dialogs ── */}
      <ConfirmDialog
        open={deletePlotDialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setDeletePlotDialogOpen(false);
            setPlotToDeleteId(null);
          }
        }}
        title="Xóa vuông đất"
        description={
          <>
            Bạn có chắc chắn muốn xóa vuông này? Tất cả các luống bên trong cũng
            sẽ bị xóa và không thể hoàn tác.
          </>
        }
        confirmLabel="Xóa vuông đất"
        loading={deletingPlot}
        onConfirm={confirmDeletePlot}
      />

      <ConfirmDialog
        open={deleteBedDialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteBedDialogOpen(false);
            setBedToDeleteId(null);
          }
        }}
        title="Xóa luống"
        description="Bạn có chắc chắn muốn xóa luống này? Hành động này không thể hoàn tác."
        confirmLabel="Xóa luống"
        loading={deletingBed}
        onConfirm={confirmDeleteBed}
      />

      {/* IoT Quick-Add Modal */}
      {iotBedTarget && (
        <IotQuickAddModal
          bedId={iotBedTarget}
          onClose={() => setIotBedTarget(null)}
          onSuccess={() => showToast("Thêm thiết bị IoT thành công", "success")}
          onError={(msg) => showToast(msg, "error")}
        />
      )}
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
    plotLength: 0,
    plotWidth: 0,
    plotMarginLength: 1,
    plotMarginWidth: 0.3,
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
        plotMarginLength: 1,
        plotMarginWidth: 0.3,
        plotStatus: "Active",
      });
      setFormErrors({});
    }
  }, [open, farms, soils]);

  const computedArea = parseFloat(
    (formData.plotLength * formData.plotWidth).toFixed(2),
  );

  const set = (patch: Partial<PlotRequest>) =>
    setFormData((prev) => ({ ...prev, ...patch }));

  const handleSubmit = () => {
    const payload = { ...formData, plotArea: computedArea };
    const errors = validatePlotForm(payload, farms, soils);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onCreate({ ...payload, plotName: payload.plotName.trim() });
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Thêm Vuông Đất Mới"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy Bỏ
          </Button>
          <Button onClick={handleSubmit}>Tạo Vuông Đất</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField
          label="Tên Vuông Đất"
          required
          value={formData.plotName}
          onChange={(v) => {
            set({ plotName: v });
            setFormErrors((p) => ({ ...p, plotName: undefined }));
          }}
          placeholder="Ví dụ: Vuông 01_Tây Nam"
          error={formErrors.plotName}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="Trang Trại"
            required
            value={formData.farmId}
            onChange={(v) => set({ farmId: v })}
            options={farms.map((f) => ({ value: f.farmId, label: f.farmName }))}
            error={formErrors.farmId}
          />
          <FormSelect
            label="Loại Đất"
            required
            value={formData.soilId}
            onChange={(v) => set({ soilId: v })}
            options={soils.map((s) => ({ value: s.soilId, label: s.name }))}
            error={formErrors.soilId}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FormField
            label="Chiều Dài (m)"
            required
            type="number"
            value={formData.plotLength ? String(formData.plotLength) : ""}
            onChange={(v) => {
              set({ plotLength: parseFloat(v) || 0 });
              setFormErrors((p) => ({ ...p, plotLength: undefined }));
            }}
            error={formErrors.plotLength}
            inputProps={{ min: 0.1, step: 0.1 }}
          />
          <FormField
            label="Chiều Rộng (m)"
            required
            type="number"
            value={formData.plotWidth ? String(formData.plotWidth) : ""}
            onChange={(v) => {
              set({ plotWidth: parseFloat(v) || 0 });
              setFormErrors((p) => ({ ...p, plotWidth: undefined }));
            }}
            error={formErrors.plotWidth}
            inputProps={{ min: 0.1, step: 0.1 }}
          />
          <FormField
            label="Diện Tích (m²)"
            type="number"
            value={computedArea > 0 ? String(computedArea) : "0"}
            onChange={() => {}}
            disabled
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Độ Dài Lề (m)"
            type="number"
            value={String(formData.plotMarginLength)}
            onChange={(v) => set({ plotMarginLength: parseFloat(v) || 0 })}
            inputProps={{ min: 0, step: 0.1 }}
          />
          <FormField
            label="Độ Rộng Lề (m)"
            type="number"
            value={String(formData.plotMarginWidth)}
            onChange={(v) => set({ plotMarginWidth: parseFloat(v) || 0 })}
            inputProps={{ min: 0, step: 0.1 }}
          />
        </div>
        <FormSelect
          label="Trạng Thái"
          value={formData.plotStatus}
          onChange={(v) => set({ plotStatus: v })}
          options={[
            { value: "Active", label: "Hoạt động" },
            { value: "Inactive", label: "Không hoạt động" },
          ]}
        />
      </div>
    </Modal>
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
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Chi Tiết Vuông Đất"
      size="md"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink-800">
            {plot.plotName}
          </h3>
          <StatusBadge
            label={plotStatusLabel(plot.plotStatus)}
            tone={plotStatusTone(plot.plotStatus)}
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-ink-500">
          <MapPin className="w-4 h-4" />
          <span>{plot.farmName}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div>
            <div className="text-xs text-ink-400 uppercase mb-1">
              Tổng diện tích
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <span className="text-lg font-semibold text-ink-800">
                {plot.plotArea.toLocaleString()} m²
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-ink-400 uppercase mb-1">Loại đất</div>
            <div className="flex items-center gap-2">
              <Sprout className="w-5 h-5 text-primary" />
              <span className="font-medium text-ink-800">{plot.soilName}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          {[
            { label: "Dài", value: `${plot.plotLength ?? "-"} m` },
            { label: "Rộng", value: `${plot.plotWidth ?? "-"} m` },
            { label: "Lề dài", value: `${plot.plotMarginLength ?? "-"} m` },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-xs text-ink-400 uppercase mb-1">
                {item.label}
              </div>
              <div className="font-medium text-ink-800">{item.value}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          {[
            { label: "Lề rộng", value: `${plot.plotMarginWidth ?? "-"} m` },
            { label: "Số luống", value: `${plot.bedsCount} luống` },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-xs text-ink-400 uppercase mb-1">
                {item.label}
              </div>
              <div className="font-medium text-ink-800">{item.value}</div>
            </div>
          ))}
        </div>
        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <Calendar className="w-4 h-4" />
            <span>Ngày tạo: {formatDate(plot.plotCreatedAt)}</span>
          </div>
        </div>
      </div>
    </Modal>
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
    plotMarginLength: plot.plotMarginLength ?? 1,
    plotMarginWidth: plot.plotMarginWidth ?? 0.3,
    plotStatus: plot.plotStatus,
  });
  const [formErrors, setFormErrors] = useState<PlotFormErrors>({});

  useEffect(() => {
    if (open)
      setFormData({
        farmId: plot.farmId,
        soilId: plot.soilId,
        plotName: plot.plotName,
        plotArea: plot.plotArea,
        plotLength: plot.plotLength ?? 0,
        plotWidth: plot.plotWidth ?? 0,
        plotMarginLength: plot.plotMarginLength ?? 1,
        plotMarginWidth: plot.plotMarginWidth ?? 0.3,
        plotStatus: plot.plotStatus,
      });
    setFormErrors({});
  }, [open, plot]);

  const computedArea = parseFloat(
    (formData.plotLength * formData.plotWidth).toFixed(2),
  );

  const set = (patch: Partial<PlotRequest>) =>
    setFormData((prev) => ({ ...prev, ...patch }));

  const handleSubmit = () => {
    const payload = { ...formData, plotArea: computedArea };
    const errors = validatePlotForm(payload, farms, soils);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onUpdate(plot.plotId, { ...payload, plotName: payload.plotName.trim() });
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Chỉnh Sửa Vuông Đất"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy Bỏ
          </Button>
          <Button onClick={handleSubmit}>Lưu Thay Đổi</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField
          label="Tên Vuông Đất"
          required
          value={formData.plotName}
          onChange={(v) => {
            set({ plotName: v });
            setFormErrors((p) => ({ ...p, plotName: undefined }));
          }}
          error={formErrors.plotName}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="Trang Trại"
            value={formData.farmId}
            onChange={(v) => set({ farmId: v })}
            options={farms.map((f) => ({ value: f.farmId, label: f.farmName }))}
          />
          <FormSelect
            label="Loại Đất"
            value={formData.soilId}
            onChange={(v) => set({ soilId: v })}
            options={soils.map((s) => ({ value: s.soilId, label: s.name }))}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FormField
            label="Chiều Dài (m)"
            required
            type="number"
            value={formData.plotLength ? String(formData.plotLength) : ""}
            onChange={(v) => {
              set({ plotLength: parseFloat(v) || 0 });
              setFormErrors((p) => ({ ...p, plotLength: undefined }));
            }}
            error={formErrors.plotLength}
            inputProps={{ min: 0.1, step: 0.1 }}
          />
          <FormField
            label="Chiều Rộng (m)"
            required
            type="number"
            value={formData.plotWidth ? String(formData.plotWidth) : ""}
            onChange={(v) => {
              set({ plotWidth: parseFloat(v) || 0 });
              setFormErrors((p) => ({ ...p, plotWidth: undefined }));
            }}
            error={formErrors.plotWidth}
            inputProps={{ min: 0.1, step: 0.1 }}
          />
          <FormField
            label="Diện Tích (m²)"
            type="number"
            value={computedArea > 0 ? String(computedArea) : "0"}
            onChange={() => {}}
            disabled
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Độ Dài Lề (m)"
            type="number"
            value={String(formData.plotMarginLength)}
            onChange={(v) => set({ plotMarginLength: parseFloat(v) || 0 })}
            inputProps={{ min: 0, step: 0.1 }}
          />
          <FormField
            label="Độ Rộng Lề (m)"
            type="number"
            value={String(formData.plotMarginWidth)}
            onChange={(v) => set({ plotMarginWidth: parseFloat(v) || 0 })}
            inputProps={{ min: 0, step: 0.1 }}
          />
        </div>
        <FormSelect
          label="Trạng Thái"
          value={formData.plotStatus}
          onChange={(v) => set({ plotStatus: v })}
          options={[
            { value: "Active", label: "Hoạt động" },
            { value: "Inactive", label: "Không hoạt động" },
          ]}
        />
      </div>
    </Modal>
  );
}

// ==================== IoT Quick-Add Modal ====================

function IotQuickAddModal({
  bedId,
  onClose,
  onSuccess,
  onError,
}: {
  bedId: string;
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
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
      onSuccess();
      onClose();
    } catch (err) {
      onError("Thêm thiết bị thất bại: " + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Thêm Thiết Bị IoT"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={!canSubmit || submitting}
          >
            Thêm Thiết Bị
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-ink-400 font-mono">
          Luống: {bedId.slice(0, 8)}…
        </p>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Mã thiết bị"
            required
            placeholder="CMMS_01_ESP"
            value={formData.deviceCode}
            onChange={(v) => setFormData({ ...formData, deviceCode: v })}
          />
          <FormField
            label="Tên thiết bị"
            required
            placeholder="Cảm biến nhiệt độ A1"
            value={formData.name}
            onChange={(v) => setFormData({ ...formData, name: v })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Loại thiết bị"
            placeholder="Environment"
            value={formData.type}
            onChange={(v) => setFormData({ ...formData, type: v })}
          />
          <FormSelect
            label="Trạng thái"
            value={formData.status}
            onChange={(v) => setFormData({ ...formData, status: v })}
            options={[
              { value: "Active", label: "Hoạt động" },
              { value: "Inactive", label: "Không hoạt động" },
              { value: "Maintenance", label: "Bảo trì" },
            ]}
          />
        </div>
        <FormField
          label="Ngày lắp đặt"
          type="date"
          value={formData.installationDate.split("T")[0]}
          onChange={(v) =>
            setFormData({
              ...formData,
              installationDate: v
                ? new Date(v).toISOString()
                : new Date().toISOString(),
            })
          }
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="Vĩ độ"
            type="number"
            placeholder="0"
            value={formData.latitude ? String(formData.latitude) : ""}
            onChange={(v) =>
              setFormData({ ...formData, latitude: parseFloat(v) || 0 })
            }
            inputProps={{ step: "any" }}
          />
          <FormField
            label="Kinh độ"
            type="number"
            placeholder="0"
            value={formData.longitude ? String(formData.longitude) : ""}
            onChange={(v) =>
              setFormData({ ...formData, longitude: parseFloat(v) || 0 })
            }
            inputProps={{ step: "any" }}
          />
        </div>
      </div>
    </Modal>
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
    bedStatus: "Active",
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

  const handleCropChange = async (newCropId: string) => {
    setFormData((prev) => ({
      ...prev,
      cropId: newCropId || undefined,
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

  const handleSubmit = () => {
    const errors = validateBedForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onCreate({ ...formData, bedName: formData.bedName.trim() });
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Thêm Luống"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button onClick={handleSubmit}>Tạo Luống</Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-500">
          Vuông đất:{" "}
          <span className="font-medium text-ink-800">{plot.plotName}</span>
        </p>

        <FormField
          label="Tên Luống"
          required
          value={formData.bedName}
          onChange={(v) => {
            setFormData({ ...formData, bedName: v });
            setFormErrors((p) => ({ ...p, bedName: undefined }));
          }}
          error={formErrors.bedName}
        />

        {crops.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1.5">
              Cây Trồng
            </label>
            <div className="relative">
              <select
                value={formData.cropId ?? ""}
                onChange={(e) => handleCropChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-border-strong rounded-btn text-sm text-ink-700 bg-surface focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
              >
                <option value="">-- Không chọn --</option>
                {crops.map((c) => (
                  <option key={c.cropId} value={c.cropId}>
                    {c.cropName}
                  </option>
                ))}
              </select>
              {loadingCrop && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Spinner size="sm" />
                </span>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Diện Tích (m²)"
            required
            type="number"
            value={formData.bedArea ? String(formData.bedArea) : ""}
            onChange={(v) => {
              setFormData({ ...formData, bedArea: parseFloat(v) || 0 });
              setFormErrors((p) => ({ ...p, bedArea: undefined }));
            }}
            error={formErrors.bedArea}
            inputProps={{ min: 0.1, step: 0.01 }}
          />
        </div>

        <FormField
          label="Chiều Dài (m)"
          type="number"
          value={formData.bedLength != null ? String(formData.bedLength) : ""}
          onChange={(v) =>
            setFormData({
              ...formData,
              bedLength: parseFloat(v) || undefined,
            })
          }
          inputProps={{ min: 0, step: 0.01 }}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            label={
              formData.cropId ? "Chiều Rộng (m) (tự động)" : "Chiều Rộng (m)"
            }
            type="number"
            value={formData.bedWidth != null ? String(formData.bedWidth) : ""}
            onChange={(v) =>
              setFormData({
                ...formData,
                bedWidth: parseFloat(v) || undefined,
              })
            }
            inputProps={{ min: 0, step: 0.01 }}
          />
          <FormField
            label={formData.cropId ? "Lối Đi (m) (tự động)" : "Lối Đi (m)"}
            type="number"
            value={formData.pathWidth != null ? String(formData.pathWidth) : ""}
            onChange={(v) =>
              setFormData({
                ...formData,
                pathWidth: parseFloat(v) || undefined,
              })
            }
            inputProps={{ min: 0, step: 0.01 }}
          />
          <FormField
            label={formData.cropId ? "Số Hàng (tự động)" : "Số Hàng"}
            type="number"
            value={formData.rowCount != null ? String(formData.rowCount) : ""}
            onChange={(v) =>
              setFormData({
                ...formData,
                rowCount: parseInt(v) || undefined,
              })
            }
            inputProps={{ min: 1 }}
          />
        </div>

        <FormField
          label="Số Cây"
          type="number"
          value={formData.plantCount != null ? String(formData.plantCount) : ""}
          onChange={(v) =>
            setFormData({
              ...formData,
              plantCount: parseInt(v) || undefined,
            })
          }
          inputProps={{ min: 0 }}
        />
      </div>
    </Modal>
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
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Thông Tin Chi Tiết Luống"
      size="md"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="text-sm text-ink-500">
          <MapPin className="w-4 h-4 inline mr-1" />
          Vị trí: {plot.plotName} · {plot.farmName}
        </div>
        <div className="pt-4 border-t border-border space-y-2">
          {[
            { label: "Tên luống", value: bed.bedName },
            bed.cropName ? { label: "Cây trồng", value: bed.cropName } : null,
            { label: "Diện tích", value: `${bed.bedArea} m²` },
            bed.bedLength != null
              ? { label: "Chiều dài", value: `${bed.bedLength} m` }
              : null,
            bed.bedWidth != null
              ? { label: "Chiều rộng", value: `${bed.bedWidth} m` }
              : null,
            bed.pathWidth != null
              ? { label: "Lối đi", value: `${bed.pathWidth} m` }
              : null,
            bed.rowCount != null
              ? { label: "Số hàng", value: String(bed.rowCount) }
              : null,
            bed.plantCount != null
              ? { label: "Số cây", value: String(bed.plantCount) }
              : null,
            {
              label: "Mùa vụ liên kết",
              value: `${bed.seasonsDetailsCount} mùa`,
            },
            { label: "Ngày tạo", value: formatDate(bed.bedCreatedAt) },
          ]
            .filter(Boolean)
            .map((item) =>
              item ? (
                <div key={item.label} className="flex justify-between">
                  <span className="text-sm text-ink-500">{item.label}:</span>
                  <span className="text-sm font-medium text-ink-800">
                    {item.value}
                  </span>
                </div>
              ) : null,
            )}
          <div className="flex justify-between items-center">
            <span className="text-sm text-ink-500">Trạng thái:</span>
            <StatusBadge
              label={bedStatusLabel(bed.bedStatus)}
              tone={bedStatusToneInline(bed.bedStatus)}
            />
          </div>
        </div>
      </div>
    </Modal>
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

  const handleSubmit = () => {
    const errors = validateBedForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onUpdate(bed.bedId, { ...formData, bedName: formData.bedName.trim() });
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Chỉnh Sửa Luống"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy Bỏ
          </Button>
          <Button onClick={handleSubmit}>Lưu Thay Đổi</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField
          label="Tên Luống"
          required
          value={formData.bedName}
          onChange={(v) => {
            setFormData({ ...formData, bedName: v });
            setFormErrors((p) => ({ ...p, bedName: undefined }));
          }}
          error={formErrors.bedName}
        />
        {crops.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1.5">
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
              className="w-full px-3 py-2.5 border border-border-strong rounded-btn text-sm text-ink-700 bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
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
          <FormField
            label="Diện Tích (m²)"
            required
            type="number"
            value={formData.bedArea ? String(formData.bedArea) : ""}
            onChange={(v) => {
              setFormData({ ...formData, bedArea: parseFloat(v) || 0 });
              setFormErrors((p) => ({ ...p, bedArea: undefined }));
            }}
            error={formErrors.bedArea}
            inputProps={{ min: 0.1, step: 0.01 }}
          />
          <FormField
            label="Số Lượng Cây"
            type="number"
            value={String(formData.cropQuantities)}
            onChange={(v) =>
              setFormData({
                ...formData,
                cropQuantities: parseInt(v) || 0,
              })
            }
            inputProps={{ min: 0 }}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FormField
            label="Chiều Dài (m)"
            type="number"
            value={formData.bedLength != null ? String(formData.bedLength) : ""}
            onChange={(v) =>
              setFormData({
                ...formData,
                bedLength: parseFloat(v) || undefined,
              })
            }
            inputProps={{ min: 0, step: 0.01 }}
          />
          <FormField
            label="Chiều Rộng (m)"
            type="number"
            value={formData.bedWidth != null ? String(formData.bedWidth) : ""}
            onChange={(v) =>
              setFormData({
                ...formData,
                bedWidth: parseFloat(v) || undefined,
              })
            }
            inputProps={{ min: 0, step: 0.01 }}
          />
          <FormField
            label="Lối Đi (m)"
            type="number"
            value={formData.pathWidth != null ? String(formData.pathWidth) : ""}
            onChange={(v) =>
              setFormData({
                ...formData,
                pathWidth: parseFloat(v) || undefined,
              })
            }
            inputProps={{ min: 0, step: 0.01 }}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Số Hàng"
            type="number"
            value={formData.rowCount != null ? String(formData.rowCount) : ""}
            onChange={(v) =>
              setFormData({
                ...formData,
                rowCount: parseInt(v) || undefined,
              })
            }
            inputProps={{ min: 1 }}
          />
          <FormField
            label="Số Cây"
            type="number"
            value={
              formData.plantCount != null ? String(formData.plantCount) : ""
            }
            onChange={(v) =>
              setFormData({
                ...formData,
                plantCount: parseInt(v) || undefined,
              })
            }
            inputProps={{ min: 0 }}
          />
        </div>
        <FormSelect
          label="Trạng Thái"
          value={formData.bedStatus}
          onChange={(v) => setFormData({ ...formData, bedStatus: v })}
          options={[
            { value: "Active", label: "Hoạt động" },
            { value: "Inactive", label: "Không hoạt động" },
          ]}
        />
      </div>
    </Modal>
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

  const [cropId, setCropId] = useState<string>("");
  const [loadingCrop, setLoadingCrop] = useState(false);
  const [soilWarning, setSoilWarning] = useState<string | null>(null);
  const [soilBlocked, setSoilBlocked] = useState(false);

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

  const handleCropChange = async (newCropId: string) => {
    setCropId(newCropId);
    setSoilWarning(null);
    setSoilBlocked(false);
    setError(null);
    if (!newCropId) return;
    setLoadingCrop(true);
    try {
      const crop = await api.getCrop(newCropId);
      if (crop.bedWidthDefault != null) setBedWidth(crop.bedWidthDefault);
      if (crop.pathWidthDefault != null) setPathWidth(crop.pathWidthDefault);
      if (crop.rowsPerBed != null) setRowsPerBed(crop.rowsPerBed);
      if (crop.compatibleSoils && crop.compatibleSoils.length > 0) {
        const match = crop.compatibleSoils.find(
          (s) => s.soilId === plot.soilId,
        );
        if (!match) {
          setSoilBlocked(true);
          setSoilWarning(
            `Loại đất "${plot.soilName}" không có trong danh sách đất tương thích của cây trồng này. Không thể tiếp tục.`,
          );
        } else if (match.compatibility.toLowerCase() === "poor") {
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

  const footer =
    step === "form" ? (
      <>
        <Button variant="secondary" onClick={onClose}>
          Hủy bỏ
        </Button>
        <Button
          onClick={handlePreview}
          loading={loadingPreview}
          disabled={loadingPreview || !cropId || loadingCrop || soilBlocked}
        >
          Xem Trước
        </Button>
      </>
    ) : (
      <>
        <Button
          variant="secondary"
          onClick={() => {
            setStep("form");
            setError(null);
          }}
        >
          Quay Lại
        </Button>
        <Button
          onClick={handleConfirm}
          loading={confirming}
          disabled={confirming}
        >
          Xác Nhận Tạo
        </Button>
      </>
    );

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title="Phân Luống Tự Động"
      size="lg"
      footer={footer}
    >
      <p className="text-xs text-ink-500 mb-4">
        {plot.plotName} ·{" "}
        {step === "form" ? "Nhập thông số" : "Xem trước kết quả"}
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 bg-status-danger-bg border border-status-danger-fg/30 rounded-btn text-sm text-status-danger-fg">
          {error}
        </div>
      )}

      {step === "form" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1.5">
              Cây Trồng <span className="text-status-danger-fg ml-0.5">*</span>
            </label>
            <div className="relative">
              <select
                value={cropId}
                onChange={(e) => handleCropChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-border-strong rounded-btn text-sm text-ink-700 bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Chọn cây trồng --</option>
                {crops.map((c) => (
                  <option key={c.cropId} value={c.cropId}>
                    {c.cropName}
                  </option>
                ))}
              </select>
              {loadingCrop && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Spinner size="sm" />
                </span>
              )}
            </div>
          </div>

          {soilWarning && (
            <div
              className={`px-4 py-3 rounded-btn text-sm border ${
                soilBlocked
                  ? "bg-status-danger-bg border-status-danger-fg/30 text-status-danger-fg"
                  : "bg-status-warning-bg border-status-warning-fg/30 text-status-warning-fg"
              }`}
            >
              {soilWarning}
            </div>
          )}

          {cropId && !loadingCrop && (
            <>
              <FormField
                label="Prefix tên luống"
                value={bedNamePrefix}
                onChange={setBedNamePrefix}
                placeholder="Ví dụ: Luống"
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  label="Chiều Rộng luống (m)"
                  type="number"
                  value={String(bedWidth)}
                  onChange={(v) => setBedWidth(parseFloat(v) || 0)}
                  inputProps={{ min: 0.1, step: 0.1 }}
                />
                <FormField
                  label="Khoảng cách lối đi (m)"
                  type="number"
                  value={String(pathWidth)}
                  onChange={(v) => setPathWidth(parseFloat(v) || 0)}
                  inputProps={{ min: 0, step: 0.1 }}
                />
                <FormField
                  label="Số hàng trên luống"
                  type="number"
                  value={String(rowsPerBed)}
                  onChange={(v) => setRowsPerBed(parseInt(v) || 1)}
                  inputProps={{ min: 1 }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {step === "preview" && preview && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: preview.bedCount, label: "Luống" },
              { value: preview.plantCount, label: "Cây" },
              { value: preview.bedArea, label: "m²/luống" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-primary-50 rounded-btn p-3 text-center"
              >
                <div className="text-2xl font-bold text-primary">
                  {item.value}
                </div>
                <div className="text-xs text-ink-500 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
          {preview.widthRemain > 0 && (
            <div className="px-3 py-2 bg-status-warning-bg border border-status-warning-fg/30 rounded-btn text-xs text-status-warning-fg">
              Còn dư {preview.widthRemain} m chiều rộng chưa sử dụng
            </div>
          )}
          <div className="border border-border rounded-btn overflow-hidden">
            <div className="bg-surface-alt px-4 py-2 grid grid-cols-2 text-xs font-medium text-ink-500 uppercase">
              <span>Tên luống</span>
              <span className="text-right">Tổng Cây Trồng</span>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-border">
              {preview.beds.map((b, i) => (
                <div key={i} className="px-4 py-2 grid grid-cols-2 text-sm">
                  <span className="font-medium text-ink-800">{b.bedName}</span>
                  <span className="text-right text-ink-500">
                    {b.plantCount} cây
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
