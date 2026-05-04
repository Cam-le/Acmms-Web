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
  Clock,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Collapsible from "@radix-ui/react-collapsible";
import { Farm, FarmStatus } from "../../data/mockData";
import { api, FarmResponse } from "../../api/client";

// ─── Types ────────────────────────────────────────────────────────────────

interface FarmFormErrors {
  name?: string;
  location?: string;
  area?: string;
}

interface FarmFormData {
  name: string;
  location: string;
  status: FarmStatus;
  area: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function mapFarm(f: FarmResponse): Farm {
  return {
    id: f.farmId,
    name: f.farmName ?? "",
    location: f.farmLocation ?? "",
    status: f.farmStatus === "Active" ? "Hoạt động" : "Không hoạt động",
    area: f.farmArea ?? 0,
    description: "",
    image: "",
    createdAt: f.farmCreatedAt
      ? new Date(f.farmCreatedAt).toLocaleDateString("vi-VN")
      : "",
    plots: [],
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

// ─── MapPickerModal ───────────────────────────────────────────────────────
// Domain-specific — kept inline, renders as nested modal (z-[60])

function MapPickerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (location: string) => void;
  initialLocation?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[60]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-modal shadow-modal w-full max-w-sm z-[60] p-6 text-center">
          <Dialog.Title className="sr-only">Bản đồ</Dialog.Title>
          <Dialog.Description className="sr-only">
            Tính năng bản đồ sắp ra mắt
          </Dialog.Description>

          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center">
            <Globe className="w-8 h-8 text-primary" />
          </div>

          <h3 className="text-base font-bold text-primary-700 mb-1">
            Tính năng sắp ra mắt
          </h3>
          <p className="text-sm text-ink-500 mb-1">
            Chọn địa chỉ bằng <span className="font-medium">Google Maps</span>{" "}
            đang được phát triển.
          </p>
          <p className="text-xs text-ink-400 mb-5">
            Vui lòng nhập địa chỉ thủ công vào ô địa chỉ trong thời gian này.
          </p>

          <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-btn px-3 py-2 mb-5">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Google Maps API integration — coming soon</span>
          </div>

          <Dialog.Close className="w-full px-4 py-2 bg-primary text-primary-fg text-sm rounded-btn hover:bg-primary-hover transition-colors">
            Đã hiểu
          </Dialog.Close>
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
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
          onChange={(v) => setFormData((p) => ({ ...p, location: v }))}
          placeholder="Hà Nội, Việt Nam"
          error={errors.location}
          trailingAddon={
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              title="Chọn vị trí trên bản đồ"
              className="h-full px-2.5 border border-border-strong rounded-btn text-primary hover:bg-primary-50 hover:border-primary transition-colors"
            >
              <Globe className="w-4 h-4" />
            </button>
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
        onSelect={(address) => {
          setFormData((p) => ({ ...p, location: address }));
          setMapOpen(false);
        }}
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
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-50 rounded-card flex items-center justify-center shrink-0">
              <Home className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-primary-700">{farm.name}</h3>
              <div className="flex items-center gap-1 text-sm text-ink-500 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                <span className="max-w-xs truncate">{farm.location}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
            <div className="grid grid-cols-2 gap-4 text-sm">
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
  const rows = [
    { label: "Địa chỉ", value: farm.location },
    { label: "Diện tích", value: `${farm.area.toLocaleString()} m²` },
    { label: "Trạng thái", value: farmStatusLabel(farm.status) },
    { label: "Ngày tạo", value: farm.createdAt },
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
            <span className="text-sm text-ink-500">{label}</span>
            <span className="text-sm font-medium text-primary-700">
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
  onCreate: (farm: Omit<Farm, "id" | "plots" | "createdAt">) => void;
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
    onCreate({
      ...formData,
      name: formData.name.trim(),
      location: formData.location.trim(),
      area: parseFloat(formData.area) || 0,
      image: "",
      description: "",
    });
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
  onUpdate: (farm: Farm) => void;
  submitting: boolean;
}) {
  const [formData, setFormData] = useState<FarmFormData>({
    name: farm.name,
    location: farm.location,
    status: farm.status,
    area: farm.area.toString(),
  });
  const [formErrors, setFormErrors] = useState<FarmFormErrors>({});

  useEffect(() => {
    setFormData({
      name: farm.name,
      location: farm.location,
      status: farm.status,
      area: farm.area.toString(),
    });
    setFormErrors({});
  }, [farm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateFarmForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onUpdate({
      ...farm,
      ...formData,
      name: formData.name.trim(),
      location: formData.location.trim(),
      area: parseFloat(formData.area) || 0,
    });
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

  // Modal state — manual (not useCrudModals) because View and Edit share
  // selectedFarm, and Create doesn't need an item ref.
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

  const handleCreate = async (
    farm: Omit<Farm, "id" | "plots" | "createdAt">,
  ) => {
    setSubmitting(true);
    try {
      await api.createFarm({
        farmName: farm.name,
        farmLocation: farm.location,
        farmArea: farm.area,
        farmStatus: farm.status === "Hoạt động" ? "Active" : "Inactive",
      });
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

  const handleUpdate = async (updatedFarm: Farm) => {
    setSubmitting(true);
    try {
      await api.updateFarm(updatedFarm.id, {
        farmName: updatedFarm.name,
        farmLocation: updatedFarm.location,
        farmArea: updatedFarm.area,
        farmStatus: updatedFarm.status === "Hoạt động" ? "Active" : "Inactive",
      });
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

      {/* View Modal */}
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

      {/* Create Modal */}
      <CreateFarmModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreate}
        submitting={submitting}
      />

      {/* Edit Modal */}
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

      {/* Delete Confirm */}
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
