import { useState } from "react";
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
  LandArea,
  LandStatus,
  PlotStatus,
  LandPlot as Plot,
  mockLands,
} from "../../data/mockData";

const plotStatusConfig = {
  "Đang sử dụng": "bg-[#dbeafe] text-[#1e40af]",
  "Khả dụng": "bg-[#dcfce7] text-[#008236]",
  "Không khả dụng": "bg-[#f1f5f9] text-[#475569]",
};

export function PlotsPage() {
  const [lands, setLands] = useState<LandArea[]>(mockLands);
  const [selectedFarm, setSelectedFarm] = useState(
    "Trang trại Thung Lũng Xanh",
  );
  const [openLandIds, setOpenLandIds] = useState<string[]>(["1"]);

  // Modal states
  const [createLandOpen, setCreateLandOpen] = useState(false);
  const [viewLandOpen, setViewLandOpen] = useState(false);
  const [editLandOpen, setEditLandOpen] = useState(false);
  const [createPlotOpen, setCreatePlotOpen] = useState(false);
  const [autoPlotOpen, setAutoPlotOpen] = useState(false);
  const [viewPlotOpen, setViewPlotOpen] = useState(false);
  const [editPlotOpen, setEditPlotOpen] = useState(false);

  const [selectedLand, setSelectedLand] = useState<LandArea | null>(null);
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);

  // Delete dialog states
  const [deleteLandDialogOpen, setDeleteLandDialogOpen] = useState(false);
  const [deletePlotDialogOpen, setDeletePlotDialogOpen] = useState(false);
  const [landToDeleteId, setLandToDeleteId] = useState<string | null>(null);
  const [plotToDeleteRef, setPlotToDeleteRef] = useState<{
    landId: string;
    plotId: string;
  } | null>(null);

  const toggleLand = (landId: string) => {
    setOpenLandIds((prev) =>
      prev.includes(landId)
        ? prev.filter((id) => id !== landId)
        : [...prev, landId],
    );
  };

  const handleCreateLand = (
    data: Omit<LandArea, "id" | "createdDate" | "plots">,
  ) => {
    const newLand: LandArea = {
      ...data,
      id: Date.now().toString(),
      createdDate: new Date().toLocaleDateString("vi-VN"),
      plots: [],
    };
    setLands([...lands, newLand]);
    setCreateLandOpen(false);
  };

  const handleUpdateLand = (updatedLand: LandArea) => {
    setLands(lands.map((l) => (l.id === updatedLand.id ? updatedLand : l)));
    setEditLandOpen(false);
  };

  const handleDeleteLand = (landId: string) => {
    setLandToDeleteId(landId);
    setDeleteLandDialogOpen(true);
  };

  const confirmDeleteLand = () => {
    if (landToDeleteId) {
      setLands(lands.filter((l) => l.id !== landToDeleteId));
      setLandToDeleteId(null);
      setDeleteLandDialogOpen(false);
    }
  };

  const handleCreatePlot = (landId: string, plot: Omit<Plot, "id">) => {
    setLands(
      lands.map((land) =>
        land.id === landId
          ? {
              ...land,
              plots: [
                ...land.plots,
                { ...plot, id: `${landId}-P${land.plots.length + 1}` },
              ],
              usedArea: land.usedArea + plot.area,
              remainingArea: land.remainingArea - plot.area,
            }
          : land,
      ),
    );
    setCreatePlotOpen(false);
  };

  const handleAutoPlot = (
    landId: string,
    plotSize: number,
    crop: string,
    cropsPerPlot: number,
  ) => {
    const land = lands.find((l) => l.id === landId);
    if (!land) return;

    const numPlots = Math.floor(land.remainingArea / plotSize);
    const newPlots: Plot[] = [];

    for (let i = 0; i < numPlots; i++) {
      newPlots.push({
        id: `${landId}-P${land.plots.length + i + 1}`,
        name: `Luống ${String.fromCharCode(65 + Math.floor((land.plots.length + i) / 26))}${
          ((land.plots.length + i) % 26) + 1
        }`,
        area: plotSize,
        crop,
        status: "Đang sử dụng",
        actualCrops: cropsPerPlot,
      });
    }

    setLands(
      lands.map((l) =>
        l.id === landId
          ? {
              ...l,
              plots: [...l.plots, ...newPlots],
              usedArea: l.usedArea + numPlots * plotSize,
              remainingArea: l.remainingArea - numPlots * plotSize,
            }
          : l,
      ),
    );
    setAutoPlotOpen(false);
  };

  const handleUpdatePlot = (landId: string, updatedPlot: Plot) => {
    setLands(
      lands.map((land) =>
        land.id === landId
          ? {
              ...land,
              plots: land.plots.map((p) =>
                p.id === updatedPlot.id ? updatedPlot : p,
              ),
            }
          : land,
      ),
    );
    setEditPlotOpen(false);
  };

  const handleDeletePlot = (landId: string, plotId: string) => {
    setPlotToDeleteRef({ landId, plotId });
    setDeletePlotDialogOpen(true);
  };

  const confirmDeletePlot = () => {
    if (plotToDeleteRef) {
      const { landId, plotId } = plotToDeleteRef;
      const land = lands.find((l) => l.id === landId);
      const plot = land?.plots.find((p) => p.id === plotId);
      if (land && plot) {
        setLands(
          lands.map((l) =>
            l.id === landId
              ? {
                  ...l,
                  plots: l.plots.filter((p) => p.id !== plotId),
                  usedArea: l.usedArea - plot.area,
                  remainingArea: l.remainingArea + plot.area,
                }
              : l,
          ),
        );
      }
      setPlotToDeleteRef(null);
      setDeletePlotDialogOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[#115e59] text-2xl font-semibold mb-1">
            Quản Lý Khu Đất
          </h1>
          <p className="text-[#45556c] text-sm">Quản lý đất và luống</p>
        </div>
        <button
          onClick={() => setCreateLandOpen(true)}
          className="bg-[#009689] text-white px-4 py-2 rounded-lg hover:bg-[#007f75] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Thêm khu
        </button>
      </div>

      {/* Farm Selector */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4">
        <label className="block text-sm text-[#62748e] mb-2">
          Chọn Trang Trại:
        </label>
        <select
          value={selectedFarm}
          onChange={(e) => setSelectedFarm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
        >
          <option value="Trang trại Thung Lũng Xanh">
            Trang trại Thung Lũng Xanh
          </option>
          <option value="Trang trại Nắng Hạ">Trang trại Nắng Hạ</option>
        </select>
      </div>

      {/* Land Areas */}
      <div className="space-y-6">
        {lands.map((land) => {
          const isOpen = openLandIds.includes(land.id);
          const usedPlots = land.plots.filter(
            (p) => p.status === "Đang sử dụng",
          ).length;

          return (
            <div
              key={land.id}
              className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm overflow-hidden"
            >
              {/* Land Header */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#f0fdfa] rounded-lg flex items-center justify-center">
                      <Grid3x3 className="w-6 h-6 text-[#009689]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#115e59] mb-1">
                        {land.name}
                      </h3>
                      <p className="text-sm text-[#62748e] mb-2">
                        {land.totalArea}m²
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 bg-[#f0fdfa] text-[#009689] rounded text-xs font-medium">
                          {land.landType}
                        </span>
                        <span className="text-xs text-[#62748e]">
                          {usedPlots}/{land.plots.length} luống khả dụng
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        land.status === "Hoạt động"
                          ? "bg-[#dcfce7] text-[#008236]"
                          : "bg-[#fee2e2] text-[#991b1b]"
                      }`}
                    >
                      {land.status}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedLand(land);
                        setViewLandOpen(true);
                      }}
                      className="p-2 text-[#009689] hover:bg-[#f0fdfa] rounded-lg transition-colors"
                      title="Xem"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLand(land);
                        setEditLandOpen(true);
                      }}
                      className="p-2 text-[#009689] hover:bg-[#f0fdfa] rounded-lg transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteLand(land.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLand(land);
                        setAutoPlotOpen(true);
                      }}
                      className="ml-2 px-4 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors text-sm flex items-center gap-2"
                    >
                      <Layers className="w-4 h-4" />
                      Phân Luống Tự Động
                    </button>
                  </div>
                </div>

                {/* Plots Section */}
                <Collapsible.Root
                  open={isOpen}
                  onOpenChange={() => toggleLand(land.id)}
                >
                  <div className="flex items-center justify-between py-3 border-t border-[#e2e8f0]">
                    <Collapsible.Trigger className="flex items-center gap-2 text-[#115e59] font-medium">
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                      <span>
                        Luống ({usedPlots}/{land.plots.length} luống khả dụng)
                      </span>
                    </Collapsible.Trigger>
                    <button
                      onClick={() => {
                        setSelectedLand(land);
                        setCreatePlotOpen(true);
                      }}
                      className="px-4 py-2 bg-white text-[#009689] border border-[#009689] rounded-lg hover:bg-[#f0fdfa] transition-colors text-sm flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Thêm 1 Luống
                    </button>
                  </div>

                  <Collapsible.Content>
                    {land.plots.length === 0 ? (
                      <div className="py-8 text-center text-[#62748e]">
                        Chưa có luống nào
                      </div>
                    ) : (
                      <div className="mt-4">
                        <table className="w-full">
                          <thead className="bg-[#f8fafc]">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[#62748e] uppercase">
                                Tên
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[#62748e] uppercase">
                                Diện tích
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[#62748e] uppercase">
                                Cây Trồng
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[#62748e] uppercase">
                                Trạng Thái
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-[#62748e] uppercase">
                                Thao Tác
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e2e8f0]">
                            {land.plots.map((plot) => (
                              <tr
                                key={plot.id}
                                className="hover:bg-[#f8fafc] transition-colors"
                              >
                                <td className="px-4 py-3 text-sm text-[#115e59] font-medium">
                                  {plot.name}
                                </td>
                                <td className="px-4 py-3 text-sm text-[#62748e]">
                                  {plot.area}m²
                                </td>
                                <td className="px-4 py-3">
                                  {plot.crop ? (
                                    <div>
                                      <div className="text-sm text-[#115e59]">
                                        {plot.crop}
                                      </div>
                                      {plot.season && (
                                        <div className="text-xs text-[#62748e]">
                                          {plot.season}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-sm text-[#62748e]">
                                      -
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${
                                      plotStatusConfig[plot.status]
                                    }`}
                                  >
                                    {plot.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => {
                                        setSelectedPlot(plot);
                                        setSelectedLand(land);
                                        setViewPlotOpen(true);
                                      }}
                                      className="p-2 text-[#009689] hover:bg-[#f0fdfa] rounded-lg transition-colors"
                                      title="Xem"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedPlot(plot);
                                        setSelectedLand(land);
                                        setEditPlotOpen(true);
                                      }}
                                      className="p-2 text-[#009689] hover:bg-[#f0fdfa] rounded-lg transition-colors"
                                      title="Chỉnh sửa"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeletePlot(land.id, plot.id)
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
        })}
      </div>

      {/* Modals */}
      <CreateLandModal
        open={createLandOpen}
        onClose={() => setCreateLandOpen(false)}
        onCreate={handleCreateLand}
      />

      {selectedLand && (
        <>
          <ViewLandModal
            open={viewLandOpen}
            onClose={() => setViewLandOpen(false)}
            land={selectedLand}
          />
          <EditLandModal
            open={editLandOpen}
            onClose={() => setEditLandOpen(false)}
            land={selectedLand}
            onUpdate={handleUpdateLand}
          />
          <CreatePlotModal
            open={createPlotOpen}
            onClose={() => setCreatePlotOpen(false)}
            landId={selectedLand.id}
            onCreate={handleCreatePlot}
          />
          <AutoPlotModal
            open={autoPlotOpen}
            onClose={() => setAutoPlotOpen(false)}
            land={selectedLand}
            onCreate={handleAutoPlot}
          />
        </>
      )}

      {selectedPlot && selectedLand && (
        <>
          <ViewPlotModal
            open={viewPlotOpen}
            onClose={() => setViewPlotOpen(false)}
            plot={selectedPlot}
            land={selectedLand}
          />
          <EditPlotModal
            open={editPlotOpen}
            onClose={() => setEditPlotOpen(false)}
            plot={selectedPlot}
            landId={selectedLand.id}
            onUpdate={handleUpdatePlot}
          />
        </>
      )}

      {/* Delete Land Confirmation Dialog */}
      <AlertDialog.Root
        open={deleteLandDialogOpen}
        onOpenChange={setDeleteLandDialogOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <AlertDialog.Title className="text-lg font-semibold text-slate-900 mb-2">
              Xác nhận xóa khu đất
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-slate-600 mb-6">
              Bạn có chắc chắn muốn xóa khu đất này? Tất cả các luống bên trong
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
                  onClick={confirmDeleteLand}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Xóa khu đất
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Delete Plot Confirmation Dialog */}
      <AlertDialog.Root
        open={deletePlotDialogOpen}
        onOpenChange={setDeletePlotDialogOpen}
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
                  onClick={confirmDeletePlot}
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

// Create Land Modal
function CreateLandModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: Omit<LandArea, "id" | "createdDate" | "plots">) => void;
}) {
  const defaultForm = {
    name: "",
    farm: "Trang trại Thung Lũng Xanh",
    totalArea: 0,
    usedArea: 0,
    remainingArea: 0,
    landType: "",
    status: "Hoạt động" as LandStatus,
    description: "",
  };
  const [formData, setFormData] = useState(defaultForm);

  const handleTotalAreaChange = (val: number) => {
    setFormData({
      ...formData,
      totalArea: val,
      remainingArea: val - formData.usedArea,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      ...formData,
      remainingArea: formData.totalArea - formData.usedArea,
    });
    setFormData(defaultForm);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-[#115e59]">
              Thêm khu Đất Mới
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 text-[#62748e] hover:bg-[#f8fafc] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Nông Trại
                </label>
                <select
                  value={formData.farm}
                  onChange={(e) =>
                    setFormData({ ...formData, farm: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                >
                  <option value="Nông trại xanh">Nông trại xanh</option>
                  <option value="Nông trại Nắng Hạ">Nông trại Nắng Hạ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Tên Lô Đất
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Khu A"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Tổng Diện Tích (m²) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="10000"
                  value={formData.totalArea || ""}
                  onChange={(e) =>
                    handleTotalAreaChange(parseInt(e.target.value) || 0)
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Loại Đất
                </label>
                <select
                  required
                  value={formData.landType}
                  onChange={(e) =>
                    setFormData({ ...formData, landType: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                >
                  <option value="">Chọn loại đất...</option>
                  <option value="Đất Thịt">Đất Thịt</option>
                  <option value="Đất pha sét">Đất pha sét</option>
                  <option value="Đất cát">Đất cát</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Trạng Thái
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as LandStatus,
                  })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              >
                <option value="Hoạt động">Hoạt động</option>
                <option value="Không hoạt động">Không hoạt động</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Mô Tả / Ghi Chú
              </label>
              <textarea
                rows={4}
                placeholder="Thông tin thêm về lô đất..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
              />
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
                Tạo Lô Đất
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// View Land Modal
function ViewLandModal({
  open,
  onClose,
  land,
}: {
  open: boolean;
  onClose: () => void;
  land: LandArea;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-[#115e59]">
              Chi Tiết Khu Đất
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
                {land.name}
              </h3>
              <span
                className={`px-3 py-1 rounded text-sm font-medium ${land.status === "Hoạt động" ? "bg-[#dcfce7] text-[#008236]" : "bg-[#fee2e2] text-[#991b1b]"}`}
              >
                {land.status}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-[#62748e]">
              <MapPin className="w-4 h-4" />
              <span>{land.farm}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#e2e8f0]">
              <div>
                <div className="text-xs text-[#62748e] uppercase mb-1">
                  Tổng diện tích
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#009689]" />
                  <span className="text-lg font-semibold text-[#115e59]">
                    {land.totalArea.toLocaleString()} m²
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
                    {land.landType}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#e2e8f0]">
              <div className="text-xs text-[#62748e] uppercase mb-2">Mô tả</div>
              <p className="text-sm text-[#115e59]">
                {land.description || "Không có mô tả thêm."}
              </p>
            </div>

            <div className="pt-4 border-t border-[#e2e8f0]">
              <div className="flex items-center gap-2 text-xs text-[#62748e]">
                <Calendar className="w-4 h-4" />
                <span>Ngày tạo: {land.createdDate}</span>
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

// Edit Land Modal
function EditLandModal({
  open,
  onClose,
  land,
  onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  land: LandArea;
  onUpdate: (land: LandArea) => void;
}) {
  const [formData, setFormData] = useState({
    name: land.name,
    landType: land.landType,
    totalArea: land.totalArea,
    status: land.status,
    description: land.description || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ ...land, ...formData });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-[#115e59]">
              Chỉnh Sửa Khu Đất
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 text-[#62748e] hover:bg-[#f8fafc] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Tên Lô Đất
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
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
                value={formData.totalArea}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    totalArea: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Loại Đất
              </label>
              <select
                value={formData.landType}
                onChange={(e) =>
                  setFormData({ ...formData, landType: e.target.value })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              >
                <option value="Đất Thịt">Đất Thịt</option>
                <option value="Đất pha sét">Đất pha sét</option>
                <option value="Đất cát">Đất cát</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Trạng Thái
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as LandStatus,
                  })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              >
                <option value="Hoạt động">Hoạt động</option>
                <option value="Không hoạt động">Không hoạt động</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Mô Tả / Ghi Chú
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
              />
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
                className="px-6 py-2 bg-[#0ea5e9] text-white rounded-lg hover:bg-[#0284c7] transition-colors"
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

// Create Plot Modal
function CreatePlotModal({
  open,
  onClose,
  landId,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  landId: string;
  onCreate: (landId: string, plot: Omit<Plot, "id">) => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    area: 0,
    crop: "",
    status: "Khả dụng" as PlotStatus,
    actualCrops: 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(landId, formData);
    setFormData({
      name: "",
      area: 0,
      crop: "",
      status: "Khả dụng",
      actualCrops: 1,
    });
  };

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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Tên Luống
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Luống A"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Diện tích (m²)
              </label>
              <input
                type="number"
                required
                value={formData.area || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    area: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Cây trồng
              </label>
              <select
                value={formData.crop}
                onChange={(e) =>
                  setFormData({ ...formData, crop: e.target.value })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              >
                <option value="">-- Trống --</option>
                <option value="Cà Chua">Cà Chua</option>
                <option value="Ngô">Ngô</option>
                <option value="Bắp Cải Trắng">Bắp Cải Trắng</option>
                <option value="Bắp Cải Tím">Bắp Cải Tím</option>
                <option value="Bắp Cải Xoăn">Bắp Cải Xoăn</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Số lượng trồng
              </label>
              <input
                type="number"
                value={formData.actualCrops}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    actualCrops: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
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
                Tạo luống
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Auto Plot Modal
function AutoPlotModal({
  open,
  onClose,
  land,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  land: LandArea;
  onCreate: (
    landId: string,
    plotSize: number,
    crop: string,
    cropsPerPlot: number,
  ) => void;
}) {
  const [plotSize, setPlotSize] = useState(50);
  const [crop, setCrop] = useState("");
  const [cropsPerPlot, setCropsPerPlot] = useState(7);

  const numPlots = Math.floor(land.remainingArea / plotSize);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(land.id, plotSize, crop, cropsPerPlot);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-[#115e59]">
              Phân Luống Tự Động
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 text-[#62748e] hover:bg-[#f8fafc] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Diện tích mỗi luống (m²)
              </label>
              <input
                type="number"
                required
                value={plotSize}
                onChange={(e) => setPlotSize(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Cây trồng
              </label>
              <select
                required
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              >
                <option value="">-- Trống --</option>
                <option value="Cà Chua">Cà Chua</option>
                <option value="Ngô">Ngô</option>
                <option value="Bắp Cải Trắng">Bắp Cải Trắng</option>
                <option value="Bắp Cải Tím">Bắp Cải Tím</option>
                <option value="Bắp Cải Xoăn">Bắp Cải Xoăn</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Lượng cây trồng trên mỗi luống
              </label>
              <input
                type="number"
                required
                value={cropsPerPlot}
                onChange={(e) => setCropsPerPlot(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>

            <div className="bg-[#f0fdfa] p-4 rounded-lg">
              <div className="text-sm text-[#009689] font-medium">
                Sẽ tạo {numPlots} luống với diện tích {plotSize}m² mỗi luống
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
                disabled={numPlots === 0}
                className="px-6 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Phân luống
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// View Plot Modal
function ViewPlotModal({
  open,
  onClose,
  plot,
  land,
}: {
  open: boolean;
  onClose: () => void;
  plot: Plot;
  land: LandArea;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-[#115e59]">
              Thông Tin Chi Tiết
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
              Vị trí: {land.name}
            </div>

            <div className="pt-4 border-t border-[#e2e8f0]">
              <h4 className="text-sm font-medium text-[#62748e] uppercase mb-3">
                Thông Tin Cơ Bản
              </h4>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-[#62748e]">• Tên luống:</span>
                  <span className="text-sm font-medium text-[#115e59]">
                    {plot.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#62748e]">• Diện tích:</span>
                  <span className="text-sm font-medium text-[#115e59]">
                    {plot.area} m²
                  </span>
                </div>
                {plot.actualCrops && (
                  <div className="flex justify-between">
                    <span className="text-sm text-[#62748e]">
                      • Lượng cây trồng thực tế:
                    </span>
                    <span className="text-sm font-medium text-[#115e59]">
                      {plot.actualCrops}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-[#62748e]">• Trạng thái:</span>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      plotStatusConfig[plot.status]
                    }`}
                  >
                    {plot.status}
                  </span>
                </div>
                {plot.plantedDate && (
                  <div className="flex justify-between">
                    <span className="text-sm text-[#62748e]">• Ngày tạo:</span>
                    <span className="text-sm font-medium text-[#115e59]">
                      {plot.plantedDate}
                    </span>
                  </div>
                )}
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

// Edit Plot Modal
function EditPlotModal({
  open,
  onClose,
  plot,
  landId,
  onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  plot: Plot;
  landId: string;
  onUpdate: (landId: string, plot: Plot) => void;
}) {
  const [formData, setFormData] = useState({
    name: plot.name,
    area: plot.area,
    crop: plot.crop || "",
    actualCrops: plot.actualCrops || 0,
    status: plot.status,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(landId, { ...plot, ...formData });
  };

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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Tên Luống
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Diện tích (m²)
              </label>
              <input
                type="number"
                required
                value={formData.area}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    area: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Lượng cây trồng thực tế
              </label>
              <input
                type="number"
                value={formData.actualCrops}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    actualCrops: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Trạng thái
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as PlotStatus,
                  })
                }
                className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              >
                <option value="Đang sử dụng">Đang sử dụng</option>
                <option value="Khả dụng">Khả dụng</option>
                <option value="Không khả dụng">Không khả dụng</option>
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
                className="px-6 py-2 bg-[#0ea5e9] text-white rounded-lg hover:bg-[#0284c7] transition-colors"
              >
                Lưu thay đổi
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
