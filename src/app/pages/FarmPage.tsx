import { useState, useEffect, useCallback } from "react";
import { useToast } from "../components/ui/useToast";
import { ToastContainer } from "../components/ui/ToastContainer";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { RowActions } from "../components/ui/RowActions";
import { FormField } from "../components/ui/FormField";
import { FormSelect } from "../components/ui/FormSelect";
import { LoadingState } from "../components/ui/LoadingState";
import { EmptyState } from "../components/ui/EmptyState";
import { farmStatusTone, farmStatusLabel } from "../utils/status";
import {
  Plus,
  MapPin,
  ChevronDown,
  ChevronUp,
  Home,
  Tractor,
  Globe,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Collapsible from "@radix-ui/react-collapsible";
import { api, FarmResponse, GeocodeResultResponse } from "../../api/client";

// ─── Local Types ──────────────────────────────────────────────────────────

type FarmStatus = "Hoạt động" | "Không hoạt động";

interface Farm {
  id: string;
  name: string;
  location: string;
  status: FarmStatus;
  area: number;
  createdAt: string;
  latitude?: number;
  longitude?: number;
}

interface FarmFormData {
  name: string;
  location: string;
  status: FarmStatus;
  area: string;
  latitude?: number;
  longitude?: number;
}

interface FarmFormErrors {
  name?: string;
  location?: string;
  area?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function mapFarm(f: FarmResponse): Farm {
  return {
    id: f.farmId,
    name: f.farmName ?? "",
    location: f.farmLocation ?? "",
    status: f.farmStatus === "Active" ? "Hoạt động" : "Không hoạt động",
    area: f.farmArea ?? 0,
    createdAt: f.farmCreatedAt
      ? new Date(f.farmCreatedAt).toLocaleDateString("vi-VN")
      : "",
    latitude: toCoord(f.latitude) ?? undefined,
    longitude: toCoord(f.longitude) ?? undefined,
  };
}

function validateFarmForm(formData: {
  name: string;
  location: string;
  area: string;
}): FarmFormErrors {
  const errors: FarmFormErrors = {};
  if (!formData.name.trim()) {
    errors.name = "Vui lòng nhập tên trang trại";
  } else if (formData.name.trim().length < 2) {
    errors.name = "Tên trang trại phải có ít nhất 2 ký tự";
  } else if (formData.name.trim().length > 255) {
    errors.name = "Tên trang trại không được quá 255 ký tự";
  }
  if (!formData.location.trim()) {
    errors.location = "Vui lòng nhập địa chỉ trang trại";
  } else if (formData.location.trim().length > 600) {
    errors.location = "Địa chỉ không được quá 600 ký tự";
  }
  if (!formData.area.trim()) {
    errors.area = "Vui lòng nhập diện tích";
  } else {
    const a = parseFloat(formData.area);
    if (isNaN(a) || a <= 0) {
      errors.area = "Diện tích phải là số dương";
    } else if (a > 10_000_000) {
      errors.area = "Diện tích vượt quá giới hạn cho phép";
    }
  }
  return errors;
}

const STATUS_OPTIONS: Array<{ value: FarmStatus; label: string }> = [
  { value: "Hoạt động", label: "Hoạt động" },
  { value: "Không hoạt động", label: "Không hoạt động" },
];

/**
 * Safely parse a coord value from the API.
 * Backend may return latitude/longitude as string or number — both are handled.
 */
function toCoord(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? null : n;
}

function fmtCoord(v: number | string | null | undefined): string {
  const n = toCoord(v);
  return n != null ? n.toFixed(6) : "—";
}

// ─── MapPickerModal ───────────────────────────────────────────────────────
// Geocode địa chỉ qua BE (Google Maps API)
// Flow: nhập địa chỉ → Tìm → xem kết quả → Xác nhận

type GeocodeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: GeocodeResultResponse }
  | { status: "error"; message: string };

function MapPickerModal({
  open,
  onClose,
  onSelect,
  initialLocation = "",
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (result: GeocodeResultResponse) => void;
  initialLocation?: string;
}) {
  const [query, setQuery] = useState(initialLocation);
  const [geocodeState, setGeocodeState] = useState<GeocodeState>({
    status: "idle",
  });

  useEffect(() => {
    if (open) {
      setQuery(initialLocation);
      setGeocodeState({ status: "idle" });
    }
  }, [open, initialLocation]);

  const handleGeocode = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setGeocodeState({ status: "loading" });
    try {
      const result = await api.geocodeAddress(trimmed);
      setGeocodeState({ status: "success", result });
    } catch (err) {
      setGeocodeState({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Không thể tìm tọa độ cho địa chỉ này",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleGeocode();
    }
  };

  const handleConfirm = () => {
    if (geocodeState.status !== "success" || !geocodeState.result) return;
    onSelect(geocodeState.result);
    onClose();
  };

  const isLoading = geocodeState.status === "loading";

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[60]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-modal shadow-modal w-[calc(100%-2rem)] max-w-md z-[60] flex flex-col max-h-[90vh] overflow-hidden">
          <Dialog.Title className="sr-only">Tìm tọa độ địa chỉ</Dialog.Title>
          <Dialog.Description className="sr-only">
            Nhập địa chỉ để tìm tọa độ bằng Google Maps
          </Dialog.Description>

          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
            <div className="w-8 h-8 bg-primary-50 rounded-btn flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-base font-bold text-ink-800">Xác định vị trí</p>
              <p className="text-xs text-ink-400">Google Maps Geocoding</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-sm font-medium text-ink-600 mb-1.5">
                Địa chỉ trang trại
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (geocodeState.status !== "idle") {
                      setGeocodeState({ status: "idle" });
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="VD: Đà Lạt, Lâm Đồng, Việt Nam"
                  disabled={isLoading}
                  className="flex-1 min-w-0 px-3 py-2.5 border border-border-strong rounded-btn text-sm text-ink-700 bg-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
                <Button
                  onClick={handleGeocode}
                  loading={isLoading}
                  disabled={!query.trim()}
                  leadingIcon={Search}
                  size="md"
                >
                  Tìm
                </Button>
              </div>
              <p className="mt-1.5 text-xs text-ink-400">
                Nhập địa chỉ đầy đủ để kết quả chính xác hơn. Nhấn Enter hoặc bấm Tìm.
              </p>
            </div>

            {geocodeState.status === "loading" && (
              <div className="flex items-center gap-2 text-sm text-ink-500 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Đang tìm kiếm tọa độ...</span>
              </div>
            )}

            {geocodeState.status === "error" && (
              <div className="flex items-start gap-2.5 p-3 bg-status-danger-bg/40 border border-status-danger-fg/20 rounded-btn">
                <AlertCircle className="w-4 h-4 text-status-danger-fg mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-status-danger-fg">
                    Không tìm được tọa độ
                  </p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {geocodeState.message}. Hãy thử nhập địa chỉ cụ thể hơn.
                  </p>
                </div>
              </div>
            )}

            {geocodeState.status === "success" && geocodeState.result && (
              <div className="p-4 bg-primary-50 border border-primary/20 rounded-btn space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-sm font-semibold text-primary-700">
                    Đã tìm thấy vị trí
                  </p>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-ink-400 uppercase mb-0.5">
                      Địa chỉ chuẩn hóa
                    </p>
                    <p className="text-sm font-medium text-ink-700">
                      {geocodeState.result?.formattedAddress ?? "—"}
                    </p>
                  </div>
                  <div className="flex gap-6">
                    <div>
                      <p className="text-xs text-ink-400 uppercase mb-0.5">
                        Vĩ độ
                      </p>
                      <p className="text-sm font-mono text-ink-700">
                        {fmtCoord(geocodeState.result?.latitude)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-400 uppercase mb-0.5">
                        Kinh độ
                      </p>
                      <p className="text-sm font-mono text-ink-700">
                        {fmtCoord(geocodeState.result?.longitude)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
            <Button variant="ghost" onClick={onClose}>
              Hủy
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={geocodeState.status !== "success"}
            >
              Xác nhận vị trí
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── FarmFormFields ───────────────────────────────────────────────────────

function FarmFormFields({
  formData,
  setFormData,
  errors = {},
}: {
  formData: FarmFormData;
  setFormData: React.Dispatch<React.SetStateAction<FarmFormData>>;
  errors?: FarmFormErrors;
}) {
  const [mapOpen, setMapOpen] = useState(false);

  const handleGeocodeSelect = (result: GeocodeResultResponse) => {
    setFormData((p) => ({
      ...p,
      location: result.formattedAddress,
      latitude: toCoord(result.latitude) ?? undefined,
      longitude: toCoord(result.longitude) ?? undefined,
    }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Tên trang trại"
          required
          value={formData.name}
          onChange={(v) => setFormData((p) => ({ ...p, name: v }))}
          placeholder="Trang trại Thung lũng Xanh"
          error={errors.name}
        />
        <FormField
          label="Địa chỉ"
          required
          value={formData.location}
          onChange={(v) =>
            setFormData((p) => ({
              ...p,
              location: v,
              // Clear tọa độ khi user tự sửa text — cần geocode lại
              latitude: undefined,
              longitude: undefined,
            }))
          }
          placeholder="Đà Lạt, Lâm Đồng, Việt Nam"
          error={errors.location}
          trailingAddon={
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              title="Xác định tọa độ qua Google Maps"
              className="h-full px-2.5 border border-border-strong rounded-btn text-primary hover:bg-primary-50 hover:border-primary transition-colors"
            >
              <Globe className="w-4 h-4" />
            </button>
          }
        />
      </div>

      {/* Tọa độ đã geocode */}
      {formData.latitude != null && formData.longitude != null && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 border border-primary/20 rounded-btn">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs text-primary-700 font-mono">
            {fmtCoord(formData.latitude)}, {fmtCoord(formData.longitude)}
          </span>
          <span className="text-xs text-ink-400 ml-1">· Tọa độ đã xác định</span>
          <button
            type="button"
            onClick={() =>
              setFormData((p) => ({
                ...p,
                latitude: undefined,
                longitude: undefined,
              }))
            }
            className="ml-auto text-xs text-ink-400 hover:text-status-danger-fg transition-colors"
          >
            Xóa
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Diện tích (m²)"
          required
          type="number"
          value={formData.area}
          onChange={(v) => setFormData((p) => ({ ...p, area: v }))}
          placeholder="5000"
          error={errors.area}
          inputProps={{ min: 1 }}
        />
        <FormSelect
          label="Trạng thái"
          value={formData.status}
          onChange={(v) => setFormData((p) => ({ ...p, status: v }))}
          options={STATUS_OPTIONS}
        />
      </div>

      <MapPickerModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        onSelect={handleGeocodeSelect}
        initialLocation={formData.location}
      />
    </div>
  );
}

// ─── FarmCard ─────────────────────────────────────────────────────────────

function FarmCard({
  farm,
  onView,
  onEdit,
  onDelete,
}: {
  farm: Farm;
  onView: (f: Farm) => void;
  onEdit: (f: Farm) => void;
  onDelete: (f: Farm) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <div className="bg-surface rounded-card border border-border shadow-card overflow-hidden">
        <div className="p-5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 bg-primary-50 rounded-card flex items-center justify-center shrink-0">
              <Home className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-primary-700 truncate">
                {farm.name}
              </h3>
              <div className="flex items-center gap-1 text-sm text-ink-500 mt-0.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{farm.location}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            <StatusBadge
              label={farmStatusLabel(farm.status)}
              tone={farmStatusTone(farm.status)}
            />
            <span className="text-sm text-ink-500">
              {farm.area.toLocaleString()} m²
            </span>
            <RowActions
              onView={() => onView(farm)}
              onEdit={() => onEdit(farm)}
              onDelete={() => onDelete(farm)}
              align="center"
            />
            <Collapsible.Trigger className="p-1.5 text-ink-500 hover:text-primary-700 transition-colors">
              {open ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Collapsible.Trigger>
          </div>
        </div>

        <Collapsible.Content>
          <div className="border-t border-surface-subtle p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-ink-400 uppercase mb-1">
                  Diện tích
                </div>
                <div className="font-medium text-primary-700">
                  {farm.area.toLocaleString()} m²
                </div>
              </div>
              <div>
                <div className="text-xs text-ink-400 uppercase mb-1">
                  Ngày tạo
                </div>
                <div className="font-medium text-primary-700">
                  {farm.createdAt || "—"}
                </div>
              </div>
              {farm.latitude != null && farm.longitude != null && (
                <div className="sm:col-span-2">
                  <div className="text-xs text-ink-400 uppercase mb-1">
                    Tọa độ GPS
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-sm text-primary-700">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    {fmtCoord(farm.latitude)}, {fmtCoord(farm.longitude)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
}

// ─── ViewFarmModal ────────────────────────────────────────────────────────

function ViewFarmModal({
  farm,
  open,
  onClose,
}: {
  farm: Farm;
  open: boolean;
  onClose: () => void;
}) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Địa chỉ", value: farm.location },
    { label: "Diện tích", value: `${farm.area.toLocaleString()} m²` },
    { label: "Trạng thái", value: farmStatusLabel(farm.status) },
    { label: "Ngày tạo", value: farm.createdAt },
    ...(farm.latitude != null && farm.longitude != null
      ? [
          {
            label: "Tọa độ GPS",
            value: `${fmtCoord(farm.latitude)}, ${fmtCoord(farm.longitude)}`,
          },
        ]
      : []),
  ];

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={farm.name}
      description="Chi tiết trang trại"
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <div className="space-y-1">
        {rows.map(({ label, value }) => (
          <div
            key={label}
            className="flex justify-between py-2 border-b border-surface-subtle last:border-0"
          >
            <span className="text-sm text-ink-500 shrink-0">{label}</span>
            <span className="text-sm font-medium text-primary-700 text-right ml-4 break-all">
              {value || "—"}
            </span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ─── CreateFarmModal ──────────────────────────────────────────────────────

function CreateFarmModal({
  open,
  onClose,
  onCreate,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: FarmFormData) => void;
  submitting: boolean;
}) {
  const [formData, setFormData] = useState<FarmFormData>({
    name: "",
    location: "",
    status: "Hoạt động",
    area: "",
  });
  const [formErrors, setFormErrors] = useState<FarmFormErrors>({});

  useEffect(() => {
    if (!open) {
      setFormData({ name: "", location: "", status: "Hoạt động", area: "" });
      setFormErrors({});
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateFarmForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onCreate(formData);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Thêm trang trại mới"
      size="lg"
      onSubmit={handleSubmit}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button type="submit" loading={submitting}>
            Tạo trang trại
          </Button>
        </>
      }
    >
      <FarmFormFields
        formData={formData}
        setFormData={(updater) => {
          setFormData(updater);
          setFormErrors({});
        }}
        errors={formErrors}
      />
    </Modal>
  );
}

// ─── EditFarmModal ────────────────────────────────────────────────────────

function EditFarmModal({
  farm,
  open,
  onClose,
  onUpdate,
  submitting,
}: {
  farm: Farm;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: FarmFormData) => void;
  submitting: boolean;
}) {
  const [formData, setFormData] = useState<FarmFormData>({
    name: farm.name,
    location: farm.location,
    status: farm.status,
    area: farm.area.toString(),
    latitude: farm.latitude,
    longitude: farm.longitude,
  });
  const [formErrors, setFormErrors] = useState<FarmFormErrors>({});

  useEffect(() => {
    setFormData({
      name: farm.name,
      location: farm.location,
      status: farm.status,
      area: farm.area.toString(),
      latitude: farm.latitude,
      longitude: farm.longitude,
    });
    setFormErrors({});
  }, [farm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateFarmForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onUpdate(farm.id, formData);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Chỉnh sửa trang trại"
      size="lg"
      onSubmit={handleSubmit}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button type="submit" loading={submitting}>
            Lưu thay đổi
          </Button>
        </>
      }
    >
      <FarmFormFields
        formData={formData}
        setFormData={(updater) => {
          setFormData(updater);
          setFormErrors({});
        }}
        errors={formErrors}
      />
    </Modal>
  );
}

// ─── FarmPage ─────────────────────────────────────────────────────────────

export function FarmPage() {
  const { toasts, showToast, dismissToast } = useToast();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [farmToDelete, setFarmToDelete] = useState<Farm | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadFarms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getFarms();
      setFarms(
        data
          .sort(
            (a, b) =>
              new Date(a.farmCreatedAt ?? 0).getTime() -
              new Date(b.farmCreatedAt ?? 0).getTime(),
          )
          .map(mapFarm),
      );
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách trang trại",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadFarms();
  }, [loadFarms]);

  const handleView = (farm: Farm) => {
    setSelectedFarm(farm);
    setViewModalOpen(true);
  };

  const handleEdit = (farm: Farm) => {
    setSelectedFarm(farm);
    setEditModalOpen(true);
  };

  const handleDelete = (farm: Farm) => {
    setFarmToDelete(farm);
  };

  const confirmDelete = async () => {
    if (!farmToDelete) return;
    setSubmitting(true);
    try {
      await api.deleteFarm(farmToDelete.id);
      setFarmToDelete(null);
      showToast("Xóa trang trại thành công", "success");
      await loadFarms();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Không thể xóa trang trại",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Gọi PUT /api/Maps/farm/{id}/coordinates sau khi create/update.
   * Không block — nếu fail chỉ show toast info, farm vẫn đã được lưu.
   */
  async function maybeUpdateCoordinates(farmId: string, data: FarmFormData) {
    if (data.latitude == null || data.longitude == null) return;
    try {
      await api.updateFarmCoordinates(farmId, {
        address: data.location.trim(),
        latitude: data.latitude,
        longitude: data.longitude,
      });
    } catch {
      showToast(
        "Trang trại đã lưu nhưng không thể cập nhật tọa độ GPS",
        "info",
      );
    }
  }

  const handleCreate = async (data: FarmFormData) => {
    setSubmitting(true);
    try {
      const created = await api.createFarm({
        farmName: data.name.trim(),
        farmLocation: data.location.trim(),
        farmArea: parseFloat(data.area) || 0,
        farmStatus: data.status === "Hoạt động" ? "Active" : "Inactive",
      });
      await maybeUpdateCoordinates(created.farmId, data);
      setCreateModalOpen(false);
      showToast("Tạo trang trại thành công", "success");
      await loadFarms();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Không thể tạo trang trại",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, data: FarmFormData) => {
    setSubmitting(true);
    try {
      await api.updateFarm(id, {
        farmName: data.name.trim(),
        farmLocation: data.location.trim(),
        farmArea: parseFloat(data.area) || 0,
        farmStatus: data.status === "Hoạt động" ? "Active" : "Inactive",
      });
      await maybeUpdateCoordinates(id, data);
      setEditModalOpen(false);
      setSelectedFarm(null);
      showToast("Cập nhật trang trại thành công", "success");
      await loadFarms();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Không thể cập nhật trang trại",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      <PageHeader
        icon={Tractor}
        title="Trang Trại"
        subtitle="Quản lý danh sách trang trại"
        actions={
          <Button leadingIcon={Plus} onClick={() => setCreateModalOpen(true)}>
            Thêm trang trại
          </Button>
        }
      />

      {loading ? (
        <LoadingState />
      ) : farms.length === 0 ? (
        <EmptyState
          icon={Home}
          message="Chưa có trang trại nào"
          action={
            <Button leadingIcon={Plus} onClick={() => setCreateModalOpen(true)}>
              Thêm trang trại
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {farms.map((farm) => (
            <FarmCard
              key={farm.id}
              farm={farm}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {selectedFarm && (
        <ViewFarmModal
          farm={selectedFarm}
          open={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedFarm(null);
          }}
        />
      )}

      <CreateFarmModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreate}
        submitting={submitting}
      />

      {selectedFarm && (
        <EditFarmModal
          farm={selectedFarm}
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedFarm(null);
          }}
          onUpdate={handleUpdate}
          submitting={submitting}
        />
      )}

      <ConfirmDialog
        open={farmToDelete !== null}
        onOpenChange={(o) => !o && setFarmToDelete(null)}
        title="Xóa trang trại"
        description={
          <>
            Bạn có chắc muốn xóa trang trại{" "}
            <strong>{farmToDelete?.name}</strong>? Hành động này không thể hoàn
            tác.
          </>
        }
        loading={submitting}
        onConfirm={confirmDelete}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}