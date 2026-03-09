import { useState } from "react";
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
} from "lucide-react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Collapsible from "@radix-ui/react-collapsible";
import {
  Season,
  SeasonStatus,
  SeasonCropType as CropType,
  PlotAssignment,
  mockSeasons,
  mockFarms,
} from "../../data/mockData";

// ===================== HELPERS =====================
const statusConfig: Record<SeasonStatus, string> = {
  "Đang hoạt động": "bg-[#dcfce7] text-[#008236]",
  "Đã kết thúc": "bg-[#f1f5f9] text-[#475569]",
  "Sắp diễn ra": "bg-[#dbeafe] text-[#1e40af]",
};

const cropEmoji: Record<string, string> = {
  "Bắp Cải Trắng": "🥬",
  "Bắp Cải Tím": "🟣",
  "Bắp Cải Xoăn": "🌿",
};

// ===================== FARM SELECT =====================
function FarmSelect({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155] ${className ?? ""}`}
    >
      <option value="">{placeholder ?? "Chọn trang trại"}</option>
      {mockFarms.map((f) => (
        <option key={f.id} value={f.name}>
          {f.name}
        </option>
      ))}
    </select>
  );
}

// ===================== SEASONS PAGE =====================
export function SeasonsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") || "list";
  const seasonId = searchParams.get("id");

  const [seasons, setSeasons] = useState<Season[]>(mockSeasons);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<SeasonStatus | "all">("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [seasonToDelete, setSeasonToDelete] = useState<Season | null>(null);

  const filteredSeasons = seasons.filter((season) => {
    const matchesSearch =
      season.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      season.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      season.farm.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || season.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const selectedSeason = seasons.find((s) => s.id === seasonId);

  const handleDelete = (season: Season) => {
    setSeasonToDelete(season);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (seasonToDelete) {
      setSeasons(seasons.filter((s) => s.id !== seasonToDelete.id));
      setSeasonToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleCreate = (season: Omit<Season, "id" | "code">) => {
    const newSeason: Season = {
      ...season,
      id: Date.now().toString(),
      code: `MV${String(seasons.length + 1).padStart(3, "0")}`,
    };
    setSeasons([newSeason, ...seasons]);
    setSearchParams({ view: "list" });
  };

  const handleUpdate = (updatedSeason: Season) => {
    setSeasons(
      seasons.map((s) => (s.id === updatedSeason.id ? updatedSeason : s)),
    );
    setSearchParams({ view: "list" });
  };

  if (view === "create") {
    return <CreateSeasonView onCreate={handleCreate} />;
  }

  if (view === "detail" && selectedSeason) {
    return <DetailSeasonView season={selectedSeason} />;
  }

  if (view === "edit" && selectedSeason) {
    return <EditSeasonView season={selectedSeason} onUpdate={handleUpdate} />;
  }

  // ==================== LIST VIEW ====================
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <h1 className="text-[#115e59] text-2xl font-semibold">
          Quản Lý Mùa Vụ
        </h1>
        <Link
          to="/seasons?view=create"
          className="bg-[#009689] text-white px-4 py-2 rounded-lg hover:bg-[#007f75] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Mùa vụ mới
        </Link>
      </div>

      {/* Search and Filters */}
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
          <div className="flex gap-2">
            {(
              ["all", "Đang hoạt động", "Đã kết thúc", "Sắp diễn ra"] as const
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
        <table className="w-full">
          <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
            <tr>
              {[
                "Mã",
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
            {filteredSeasons.map((season) => (
              <tr
                key={season.id}
                className="hover:bg-[#f8fafc] transition-colors"
              >
                <td className="px-6 py-4 text-sm text-[#115e59] font-medium">
                  {season.code}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-[#115e59]">
                    {season.name}
                  </div>
                  {season.description && (
                    <div className="text-xs text-[#62748e] mt-1">
                      {season.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-[#62748e]">
                  {season.farm}
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-[#62748e]">
                    Bắt đầu: {season.startDate}
                  </div>
                  <div className="text-xs text-[#62748e]">
                    Kết thúc: {season.endDate}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-[#115e59] font-medium">
                  {season.plots.length}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${statusConfig[season.status]}`}
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

        {filteredSeasons.length === 0 && (
          <div className="flex flex-col items-center py-16 text-[#62748e] gap-3">
            <Calendar className="w-12 h-12 text-[#cad5e2]" />
            <p>
              {searchQuery || filterStatus !== "all"
                ? "Không tìm thấy mùa vụ phù hợp"
                : "Chưa có mùa vụ nào"}
            </p>
          </div>
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

// ==================== CREATE VIEW ====================
function CreateSeasonView({
  onCreate,
}: {
  onCreate: (season: Omit<Season, "id" | "code">) => void;
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    farm: "",
    startDate: "",
    endDate: "",
    description: "",
    status: "Sắp diễn ra" as SeasonStatus,
    plots: [] as PlotAssignment[],
  });
  const [selectedPlots, setSelectedPlots] = useState<string[]>([]);
  const [plotDetails, setPlotDetails] = useState<
    Record<
      string,
      {
        crop: CropType;
        sowingDate: string;
        harvestDate: string;
        quantity: number;
      }
    >
  >({});

  const mockPlots = [
    { id: "A-3", name: "Luống A-3", area: "Khu A (Phía Bắc)", size: "50 m²" },
    { id: "A-4", name: "Luống A-4", area: "Khu A (Phía Bắc)", size: "45 m²" },
    { id: "B-2", name: "Luống B-2", area: "Khu B (Phía Nam)", size: "60 m²" },
  ];
  const defaultDetail = {
    crop: "Bắp Cải Trắng" as CropType,
    sowingDate: "",
    harvestDate: "",
    quantity: 0,
  };
  const cropOptions: CropType[] = [
    "Bắp Cải Trắng",
    "Bắp Cải Tím",
    "Bắp Cải Xoăn",
  ];

  const handleStep2Submit = () => {
    const plots: PlotAssignment[] = selectedPlots.map((plotId) => {
      const plot = mockPlots.find((p) => p.id === plotId)!;
      const details = plotDetails[plotId] || defaultDetail;
      return {
        plotId,
        plotName: plot.name,
        area: plot.area,
        crop: details.crop,
        sowingDate: details.sowingDate,
        harvestDate: details.harvestDate,
        quantity: details.quantity,
        status: "Đang hoạt động" as SeasonStatus,
      };
    });
    onCreate({ ...formData, plots });
  };

  const togglePlot = (plotId: string) =>
    setSelectedPlots((prev) =>
      prev.includes(plotId)
        ? prev.filter((id) => id !== plotId)
        : [...prev, plotId],
    );

  const updatePlotDetail = (
    plotId: string,
    field: keyof typeof defaultDetail,
    value: any,
  ) =>
    setPlotDetails((prev) => ({
      ...prev,
      [plotId]: { ...(prev[plotId] || defaultDetail), [field]: value },
    }));

  const applyToAll = (sourceId: string) => {
    const source = plotDetails[sourceId] || defaultDetail;
    const newDetails: typeof plotDetails = {};
    selectedPlots.forEach((id) => {
      newDetails[id] = { ...source };
    });
    setPlotDetails(newDetails);
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

      {/* Step 1 */}
      {step === 1 && (
        <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6 max-w-2xl">
          <h3 className="text-sm font-bold text-[#62748e] uppercase mb-4">
            📝 Thông tin mùa vụ
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Tên mùa vụ *
                </label>
                <input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  placeholder="Mùa Hè 2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Trang trại
                </label>
                <FarmSelect
                  value={formData.farm}
                  onChange={(v) => setFormData((p) => ({ ...p, farm: v }))}
                  placeholder="Chọn trang trại"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Ngày bắt đầu
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, startDate: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-2">
                  Ngày kết thúc
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, endDate: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
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
                <option value="Sắp diễn ra">Sắp diễn ra</option>
                <option value="Đang hoạt động">Đang hoạt động</option>
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
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!formData.name}
              className="px-6 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tiếp theo
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
          <h3 className="text-sm font-bold text-[#62748e] uppercase mb-4">
            🌱 Chọn luống
          </h3>
          <div className="space-y-3">
            {mockPlots.map((plot) => {
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
                      <div className="font-medium text-[#115e59]">
                        {plot.name}
                      </div>
                      <div className="text-xs text-[#62748e]">
                        {plot.area} • {plot.size}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="grid grid-cols-2 gap-3 pl-7">
                      <div>
                        <label className="block text-xs text-[#62748e] mb-1">
                          Cây trồng
                        </label>
                        <select
                          value={details.crop}
                          onChange={(e) =>
                            updatePlotDetail(
                              plot.id,
                              "crop",
                              e.target.value as CropType,
                            )
                          }
                          className="w-full px-2 py-1.5 text-sm border border-[#cad5e2] rounded focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white"
                        >
                          {cropOptions.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-[#62748e] mb-1">
                          Sản lượng dự kiến (kg)
                        </label>
                        <input
                          type="number"
                          value={details.quantity || ""}
                          onChange={(e) =>
                            updatePlotDetail(
                              plot.id,
                              "quantity",
                              parseInt(e.target.value) || 0,
                            )
                          }
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
                        <div className="col-span-2">
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
          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2 bg-[#f1f5f9] text-[#314158] rounded-lg hover:bg-[#e2e8f0] transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại
            </button>
            <button
              onClick={handleStep2Submit}
              disabled={selectedPlots.length === 0}
              className="px-6 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" /> Tạo mùa vụ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== DETAIL VIEW ====================
function DetailSeasonView({ season }: { season: Season }) {
  const plotsByCrop = season.plots.reduce(
    (acc, plot) => {
      if (!acc[plot.crop]) acc[plot.crop] = [];
      acc[plot.crop].push(plot);
      return acc;
    },
    {} as Record<CropType, PlotAssignment[]>,
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
              {season.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-[#62748e]">{season.code}</span>
              <span className="text-[#62748e]">•</span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig[season.status]}`}
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

      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
        <h3 className="text-sm font-bold text-[#62748e] uppercase mb-4">
          🌱 Thông tin chung
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
                {season.startDate} – {season.endDate}
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

      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
        <h3 className="text-sm font-bold text-[#62748e] uppercase mb-4">
          Thông tin chi tiết
        </h3>
        {Object.entries(plotsByCrop).map(([crop, plots]) => {
          const totalQuantity = plots.reduce((sum, p) => sum + p.quantity, 0);
          const emoji = cropEmoji[crop] ?? "🌱";
          return (
            <Collapsible.Root key={crop} defaultOpen>
              <Collapsible.Trigger className="flex items-center justify-between w-full py-3 border-b border-[#e2e8f0]">
                <div className="flex items-center gap-2">
                  <span>{emoji}</span>
                  <span className="font-medium text-[#115e59]">{crop}</span>
                  <span className="text-xs text-[#62748e]">
                    ({plots.length} luống • {totalQuantity} kg)
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-[#62748e]" />
              </Collapsible.Trigger>
              <Collapsible.Content>
                <table className="w-full mt-3">
                  <thead>
                    <tr>
                      {[
                        "Luống",
                        "Khu vực",
                        "Ngày gieo",
                        "Thu hoạch",
                        "Trạng thái",
                        "Sản lượng",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-[#62748e] uppercase"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]">
                    {plots.map((plot) => (
                      <tr key={plot.plotId}>
                        <td className="px-4 py-3 text-sm text-[#115e59]">
                          {plot.plotName}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#62748e]">
                          {plot.area}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#62748e]">
                          {plot.sowingDate}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#62748e]">
                          {plot.harvestDate}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusConfig[plot.status]}`}
                          >
                            {plot.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#62748e]">
                          {plot.quantity} kg
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

// ==================== EDIT VIEW ====================
function EditSeasonView({
  season,
  onUpdate,
}: {
  season: Season;
  onUpdate: (season: Season) => void;
}) {
  const [formData, setFormData] = useState({
    name: season.name,
    farm: season.farm,
    startDate: season.startDate,
    endDate: season.endDate,
    status: season.status,
    description: season.description,
  });
  const [plots, setPlots] = useState<PlotAssignment[]>(season.plots);
  const [deletePlotDialogOpen, setDeletePlotDialogOpen] = useState(false);
  const [plotToDelete, setPlotToDelete] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ ...season, ...formData, plots });
  };

  const updatePlot = (
    plotId: string,
    field: keyof PlotAssignment,
    value: any,
  ) =>
    setPlots((prev) =>
      prev.map((plot) =>
        plot.plotId === plotId ? { ...plot, [field]: value } : plot,
      ),
    );

  const removePlot = (plotId: string) => {
    setPlotToDelete(plotId);
    setDeletePlotDialogOpen(true);
  };
  const confirmRemovePlot = () => {
    if (plotToDelete) {
      setPlots((prev) => prev.filter((plot) => plot.plotId !== plotToDelete));
      setPlotToDelete(null);
      setDeletePlotDialogOpen(false);
    }
  };

  const cropOptions: CropType[] = [
    "Bắp Cải Trắng",
    "Bắp Cải Tím",
    "Bắp Cải Xoăn",
  ];

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
            <p className="text-sm text-[#62748e] mt-1">{season.code}</p>
          </div>
        </div>
        <div className="flex gap-3">
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
          <h3 className="text-sm font-bold text-[#62748e] uppercase mb-4">
            📝 Thông tin chung
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Tên mùa vụ
              </label>
              <input
                value={formData.name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Mùa Hè 2025"
                className="w-full px-3 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Trang trại
              </label>
              <FarmSelect
                value={formData.farm}
                onChange={(v) => setFormData((p) => ({ ...p, farm: v }))}
                placeholder="Chọn trang trại"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Ngày bắt đầu
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, startDate: e.target.value }))
                }
                className="w-full px-3 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-2">
                Ngày kết thúc
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, endDate: e.target.value }))
                }
                className="w-full px-3 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
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
                <option value="Sắp diễn ra">Sắp diễn ra</option>
                <option value="Đang hoạt động">Đang hoạt động</option>
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
              />
            </div>
          </div>
        </div>

        {/* Plots table — wider crop column, narrower quantity/date columns */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
          <h3 className="text-sm font-bold text-[#62748e] uppercase mb-4">
            🌱 Luống trong mùa vụ
          </h3>
          {plots.length === 0 ? (
            <div className="text-center py-8 text-[#62748e]">
              Chưa có luống nào
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <colgroup>
                  {/* Luống */}
                  <col style={{ width: "14%" }} />
                  {/* Cây trồng — wider */}
                  <col style={{ width: "28%" }} />
                  {/* Ngày gieo */}
                  <col style={{ width: "18%" }} />
                  {/* Thu hoạch */}
                  <col style={{ width: "18%" }} />
                  {/* Sản lượng */}
                  <col style={{ width: "16%" }} />
                  {/* Action */}
                  <col style={{ width: "6%" }} />
                </colgroup>
                <thead>
                  <tr>
                    {[
                      "Luống",
                      "Cây trồng",
                      "Ngày gieo",
                      "Thu hoạch",
                      "SL (kg)",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-2 py-2 text-left text-xs font-medium text-[#62748e] uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {plots.map((plot) => (
                    <tr key={plot.plotId}>
                      <td className="px-2 py-3 text-sm text-[#115e59] font-medium truncate">
                        {plot.plotName}
                      </td>
                      <td className="px-2 py-3">
                        <select
                          value={plot.crop}
                          onChange={(e) =>
                            updatePlot(
                              plot.plotId,
                              "crop",
                              e.target.value as CropType,
                            )
                          }
                          className="w-full px-2 py-1.5 text-sm border border-[#cad5e2] rounded focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white"
                        >
                          {cropOptions.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="date"
                          value={plot.sowingDate}
                          onChange={(e) =>
                            updatePlot(
                              plot.plotId,
                              "sowingDate",
                              e.target.value,
                            )
                          }
                          className="w-full px-1.5 py-1.5 text-xs border border-[#cad5e2] rounded focus:outline-none focus:ring-2 focus:ring-[#009689]"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="date"
                          value={plot.harvestDate}
                          onChange={(e) =>
                            updatePlot(
                              plot.plotId,
                              "harvestDate",
                              e.target.value,
                            )
                          }
                          className="w-full px-1.5 py-1.5 text-xs border border-[#cad5e2] rounded focus:outline-none focus:ring-2 focus:ring-[#009689]"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="number"
                          value={plot.quantity}
                          onChange={(e) =>
                            updatePlot(
                              plot.plotId,
                              "quantity",
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-full px-1.5 py-1.5 text-sm border border-[#cad5e2] rounded focus:outline-none focus:ring-2 focus:ring-[#009689]"
                        />
                      </td>
                      <td className="px-2 py-3 text-center">
                        <button
                          onClick={() => removePlot(plot.plotId)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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
