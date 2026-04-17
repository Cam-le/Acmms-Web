import { useState, useEffect } from "react";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Cpu,
  Radio,
  MapPin,
  X,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import {
  api,
  IotDeviceResponse,
  IotDeviceRequest,
  SeasonResponse,
} from "../../api/client";

// ==================== Constants ====================

const iotStatusMap: Record<string, string> = {
  Active: "Hoạt động",
  Inactive: "Không hoạt động",
  Maintenance: "Bảo trì",
};

const iotStatusConfig: Record<string, string> = {
  Active: "bg-[#dcfce7] text-[#008236]",
  Inactive: "bg-[#fee2e2] text-[#991b1b]",
  Maintenance: "bg-amber-100 text-amber-700",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("vi-VN");
  } catch {
    return iso;
  }
}

// ==================== Main Page ====================

export function IoTPage() {
  const [devices, setDevices] = useState<IotDeviceResponse[]>([]);
  const [seasons, setSeasons] = useState<SeasonResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Season/bed picker for add-device modal
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [selectedBedId, setSelectedBedId] = useState<string>("");

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<IotDeviceResponse | null>(null);
  const [editTarget, setEditTarget] = useState<IotDeviceResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IotDeviceResponse | null>(
    null,
  );

  // Form
  const emptyForm: IotDeviceRequest = {
    bedId: "",
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

  // Filter / search
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadDevices = async () => {
    try {
      const data = await api.getIotDevices();
      setDevices(data);
      setError(null);
    } catch (err) {
      setError("Không thể tải danh sách thiết bị: " + (err as Error).message);
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadDevices();
      try {
        const s = await api.getSeasons();
        setSeasons(s);
        if (s.length > 0) setSelectedSeasonId(s[0].seasonId);
      } catch {
        // seasons failed — bed picker won't work but page still loads
      }
      setLoading(false);
    }
    init();
  }, []);

  // Reset bed selection when season changes
  useEffect(() => {
    setSelectedBedId("");
  }, [selectedSeasonId]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const activeSeason = seasons.find((s) => s.seasonId === selectedSeasonId);
  const bedsForSeason = activeSeason?.seasonsDetails ?? [];

  const filtered = devices.filter((d) => {
    const matchSearch =
      !searchText ||
      d.name.toLowerCase().includes(searchText.toLowerCase()) ||
      d.deviceCode.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = !filterStatus || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const openAdd = () => {
    setFormData({
      ...emptyForm,
      bedId: selectedBedId || (bedsForSeason[0]?.bedId ?? ""),
    });
    setAddOpen(true);
  };

  const openAddForBed = (bedId: string) => {
    setFormData({ ...emptyForm, bedId });
    setAddOpen(true);
  };

  const handleCreate = async () => {
    if (!formData.bedId || !formData.name.trim() || !formData.deviceCode.trim())
      return;
    setSubmitting(true);
    try {
      await api.createIotDevice({
        ...formData,
        installationDate: new Date(formData.installationDate).toISOString(),
      });
      await loadDevices();
      setAddOpen(false);
      setFormData(emptyForm);
    } catch (err) {
      alert("Thêm thiết bị thất bại: " + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await api.updateIotDevice(editTarget.deviceId, {
        ...formData,
        installationDate: new Date(formData.installationDate).toISOString(),
      });
      await loadDevices();
      setEditTarget(null);
    } catch (err) {
      alert("Cập nhật thiết bị thất bại: " + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteIotDevice(deleteTarget.deviceId);
      await loadDevices();
      setDeleteTarget(null);
    } catch (err) {
      alert("Xóa thiết bị thất bại: " + (err as Error).message);
    }
  };

  const openEdit = (device: IotDeviceResponse) => {
    setFormData({
      bedId: device.bedId,
      deviceCode: device.deviceCode,
      name: device.name,
      type: device.type,
      status: device.status,
      installationDate: device.installationDate,
      latitude: device.latitude,
      longitude: device.longitude,
    });
    setEditTarget(device);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#009689] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#115e59]">
            Quản Lý Thiết Bị IoT
          </h1>
          <p className="text-sm text-[#62748e] mt-1">
            Theo dõi và quản lý thiết bị cảm biến trong các luống canh tác
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Thêm Thiết Bị
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Beds per season quick-add section */}
      {seasons.length > 0 && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#115e59] flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#009689]" />
              Thêm thiết bị theo mùa vụ
            </h2>
            <div className="relative">
              <select
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white"
              >
                {seasons.map((s) => (
                  <option key={s.seasonId} value={s.seasonId}>
                    {s.seasonName}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#62748e] pointer-events-none" />
            </div>
          </div>

          {bedsForSeason.length === 0 ? (
            <p className="text-sm text-[#62748e] text-center py-4">
              Mùa vụ này chưa có luống nào
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {bedsForSeason.map((detail, i) => (
                <div
                  key={detail.seasonDetailId}
                  className="border border-[#e2e8f0] rounded-lg p-3 flex items-center justify-between bg-[#f8fafc] hover:bg-[#f0fdfa] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#115e59] truncate">
                      Luống #{i + 1}
                    </p>
                    <p className="text-[10px] text-[#62748e] truncate font-mono">
                      {detail.bedId.slice(0, 8)}…
                    </p>
                  </div>
                  <button
                    onClick={() => openAddForBed(detail.bedId)}
                    className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors ml-2"
                  >
                    <Plus className="w-3 h-3" />
                    Thêm
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#e2e8f0] flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-3 flex-1">
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã thiết bị..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="flex-1 max-w-xs px-4 py-2 text-sm border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Active">Hoạt động</option>
              <option value="Inactive">Không hoạt động</option>
              <option value="Maintenance">Bảo trì</option>
            </select>
          </div>
          <button
            onClick={loadDevices}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#62748e] border border-[#cad5e2] rounded-lg hover:bg-[#f8fafc] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Làm mới
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-[#62748e]">
            <Cpu className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Chưa có thiết bị nào</p>
            <p className="text-sm mt-1">
              Nhấn "Thêm Thiết Bị" để đăng ký thiết bị mới
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#62748e] uppercase tracking-wider">
                    Thiết bị
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#62748e] uppercase tracking-wider">
                    Loại
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#62748e] uppercase tracking-wider">
                    Luống (ID)
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#62748e] uppercase tracking-wider">
                    Tọa độ
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#62748e] uppercase tracking-wider">
                    Lắp đặt
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#62748e] uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-[#62748e] uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {filtered.map((device) => (
                  <tr
                    key={device.deviceId}
                    className="hover:bg-[#f8fafc] transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#f0fdfa] rounded-lg flex items-center justify-center flex-shrink-0">
                          <Radio className="w-4 h-4 text-[#009689]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#115e59]">
                            {device.name}
                          </p>
                          <p className="text-xs text-[#62748e] font-mono">
                            {device.deviceCode}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#314158]">
                      {device.type}
                    </td>
                    <td className="px-5 py-3 text-xs text-[#62748e] font-mono">
                      {device.bedId.slice(0, 8)}…
                    </td>
                    <td className="px-5 py-3 text-xs text-[#62748e]">
                      {device.latitude !== 0 || device.longitude !== 0 ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {device.latitude}, {device.longitude}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-[#62748e]">
                      {formatDate(device.installationDate)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${iotStatusConfig[device.status] ?? "bg-[#f1f5f9] text-[#475569]"}`}
                      >
                        {iotStatusMap[device.status] ?? device.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setViewTarget(device)}
                          className="p-2 text-[#009689] hover:bg-[#f0fdfa] rounded-lg transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(device)}
                          className="p-2 text-[#009689] hover:bg-[#f0fdfa] rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(device)}
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

        {/* Footer count */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-[#e2e8f0] text-xs text-[#62748e]">
            Hiển thị {filtered.length} / {devices.length} thiết bị
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────── */}
      <IotFormModal
        open={addOpen || !!editTarget}
        mode={editTarget ? "edit" : "add"}
        formData={formData}
        setFormData={setFormData}
        seasons={seasons}
        selectedSeasonId={selectedSeasonId}
        setSelectedSeasonId={setSelectedSeasonId}
        submitting={submitting}
        onSubmit={editTarget ? handleUpdate : handleCreate}
        onClose={() => {
          setAddOpen(false);
          setEditTarget(null);
          setFormData(emptyForm);
        }}
      />

      {/* ── View Modal ───────────────────────────────────────────────────── */}
      {viewTarget && (
        <ViewDeviceModal
          device={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}

      {/* ── Delete Confirm ───────────────────────────────────────────────── */}
      <AlertDialog.Root
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
            <AlertDialog.Title className="text-lg font-semibold text-slate-900 mb-2">
              Xác nhận xóa thiết bị
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-slate-600 mb-6">
              Bạn có chắc muốn xóa thiết bị{" "}
              <strong>{deleteTarget?.name}</strong> không? Hành động này không
              thể hoàn tác.
            </AlertDialog.Description>
            <div className="flex gap-3 justify-end">
              <AlertDialog.Cancel asChild>
                <button className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
                  Hủy bỏ
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Xóa thiết bị
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

// ==================== IoT Form Modal (Add + Edit) ====================

function IotFormModal({
  open,
  mode,
  formData,
  setFormData,
  seasons,
  selectedSeasonId,
  setSelectedSeasonId,
  submitting,
  onSubmit,
  onClose,
}: {
  open: boolean;
  mode: "add" | "edit";
  formData: IotDeviceRequest;
  setFormData: (d: IotDeviceRequest) => void;
  seasons: SeasonResponse[];
  selectedSeasonId: string;
  setSelectedSeasonId: (id: string) => void;
  submitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const activeSeason = seasons.find((s) => s.seasonId === selectedSeasonId);
  const bedsForSeason = activeSeason?.seasonsDetails ?? [];

  const canSubmit =
    formData.bedId.trim() !== "" &&
    formData.name.trim() !== "" &&
    formData.deviceCode.trim() !== "";

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#e2e8f0]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#f0fdfa] rounded-lg flex items-center justify-center">
                <Cpu className="w-5 h-5 text-[#009689]" />
              </div>
              <Dialog.Title className="text-lg font-semibold text-[#115e59]">
                {mode === "add" ? "Thêm Thiết Bị IoT" : "Chỉnh Sửa Thiết Bị"}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="p-2 text-[#62748e] hover:bg-[#f8fafc] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Bed selection — only when adding */}
            {mode === "add" && (
              <div className="space-y-3 p-4 bg-[#f0fdfa] rounded-lg border border-[#ccfbf1]">
                <p className="text-xs font-semibold text-[#115e59] uppercase tracking-wide">
                  Chọn luống lắp đặt
                </p>
                <div>
                  <label className="block text-sm font-medium text-[#115e59] mb-1.5">
                    Mùa vụ
                  </label>
                  <select
                    value={selectedSeasonId}
                    onChange={(e) => setSelectedSeasonId(e.target.value)}
                    className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm"
                  >
                    {seasons.length === 0 && (
                      <option value="">Không có mùa vụ</option>
                    )}
                    {seasons.map((s) => (
                      <option key={s.seasonId} value={s.seasonId}>
                        {s.seasonName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#115e59] mb-1.5">
                    Luống <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.bedId}
                    onChange={(e) =>
                      setFormData({ ...formData, bedId: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm font-mono"
                  >
                    <option value="">— Chọn luống —</option>
                    {bedsForSeason.map((detail, i) => (
                      <option key={detail.seasonDetailId} value={detail.bedId}>
                        Luống #{i + 1} — {detail.bedId}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Device Code + Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-1.5">
                  Mã thiết bị <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: CMMS_01_ESP"
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
                  placeholder="Ví dụ: Cảm biến nhiệt độ A1"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm"
                />
              </div>
            </div>

            {/* Type + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#115e59] mb-1.5">
                  Loại thiết bị
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Environment"
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

            {/* Installation Date */}
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

            {/* Coordinates */}
            <div>
              <label className="block text-sm font-medium text-[#115e59] mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Tọa độ (tuỳ chọn)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    value={formData.latitude || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        latitude: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm"
                  />
                  <p className="mt-1 text-xs text-[#62748e]">Vĩ độ</p>
                </div>
                <div>
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    value={formData.longitude || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        longitude: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] text-sm"
                  />
                  <p className="mt-1 text-xs text-[#62748e]">Kinh độ</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
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
              onClick={onSubmit}
              disabled={!canSubmit || submitting}
              className="px-5 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {mode === "add" ? "Thêm Thiết Bị" : "Lưu Thay Đổi"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ==================== View Device Modal ====================

function ViewDeviceModal({
  device,
  onClose,
}: {
  device: IotDeviceResponse;
  onClose: () => void;
}) {
  const rows: [string, string][] = [
    ["Mã thiết bị", device.deviceCode],
    ["Loại", device.type],
    ["Luống (bedId)", device.bedId],
    ["Tọa độ", `${device.latitude}, ${device.longitude}`],
    ["Ngày lắp đặt", formatDate(device.installationDate)],
    ["Ngày tạo", formatDate(device.createdAt)],
    ["Hoạt động gần nhất", formatDate(device.lastActiveAt)],
  ];

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
                  {device.name}
                </Dialog.Title>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-0.5 ${iotStatusConfig[device.status] ?? "bg-[#f1f5f9] text-[#475569]"}`}
                >
                  {iotStatusMap[device.status] ?? device.status}
                </span>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="p-2 text-[#62748e] hover:bg-[#f8fafc] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="px-6 py-5 space-y-3">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-[#62748e]">{label}</span>
                <span className="text-[#115e59] font-medium text-right max-w-[60%] break-all">
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t border-[#e2e8f0] flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors text-sm"
            >
              Đóng
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
