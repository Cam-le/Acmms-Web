import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "../../api/queryKeys";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Layers,
  ChevronsUpDown,
} from "lucide-react";
import {
  api,
  type SoilResponse,
  type SoilCropCompatibilityResponse,
  type CropResponse,
} from "../../api/client";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import {
  soilCompatibilityLabel,
  soilCompatibilityChipClass,
  SOIL_COMPATIBILITY_OPTIONS,
} from "../utils/status";

// ─── Shared UI ────────────────────────────────────────────────────────────
import { useToast } from "../components/ui/useToast";
import { ToastContainer } from "../components/ui/ToastContainer";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { FormField } from "../components/ui/FormField";
import { SearchInput } from "../components/ui/SearchInput";
import { Pagination } from "../components/ui/Pagination";
import { EmptyState } from "../components/ui/EmptyState";
import { QueryState } from "../components/ui/QueryState";
import { usePagination } from "../hooks/usePagination";

// ─── Constants ────────────────────────────────────────────────────────────

const PAGE_SIZE = 6;

// ─── Types ────────────────────────────────────────────────────────────────

type Soil = SoilResponse;

interface SoilFormState {
  name: string;
  scienceName: string;
}

const emptySoilForm: SoilFormState = { name: "", scienceName: "" };

// ─── Compatibility icon helper ────────────────────────────────────────────

function CompatIcon({ value }: { value: string }) {
  switch (value) {
    case "good":
      return <CheckCircle2 className="w-3.5 h-3.5" />;
    case "average":
      return <AlertCircle className="w-3.5 h-3.5" />;
    case "poor":
      return <XCircle className="w-3.5 h-3.5" />;
    default:
      return null;
  }
}

// ─── SoilsPage ────────────────────────────────────────────────────────────

export function SoilsPage() {
  const { toasts, showToast, dismissToast } = useToast();
  const queryClient = useQueryClient();

  // ── UI-only state ──────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Soil CRUD modal state
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedSoil, setSelectedSoil] = useState<Soil | null>(null);
  const [soilToDelete, setSoilToDelete] = useState<Soil | null>(null);
  const [form, setForm] = useState<SoilFormState>(emptySoilForm);
  const [formErrors, setFormErrors] = useState<Partial<SoilFormState>>({});

  // ── Read: soils ────────────────────────────────────────────────────────
  const soilsQuery = useQuery({
    queryKey: qk.soils.list(),
    queryFn: () => api.getSoils(),
    retry: 2,
  });

  const soils: Soil[] = soilsQuery.data ?? [];

  useEffect(() => {
    if (soilsQuery.error) {
      showToast("Không thể tải dữ liệu loại đất. Vui lòng thử lại.", "error");
    }
  }, [soilsQuery.error, showToast]);

  // ── Read: compatibilities ──────────────────────────────────────────────
  const compatsQuery = useQuery({
    queryKey: qk.soils.compatibilities(),
    queryFn: () => api.getSoilCropCompatibilities(),
    retry: 2,
  });

  const compatibilities: SoilCropCompatibilityResponse[] =
    compatsQuery.data ?? [];

  useEffect(() => {
    if (compatsQuery.error) {
      showToast(
        "Không thể tải dữ liệu tương thích cây trồng. Vui lòng thử lại.",
        "error",
      );
    }
  }, [compatsQuery.error, showToast]);

  // ── Read: crops (read-only, for CompatPanel dropdowns) ─────────────────
  const cropsQuery = useQuery({
    queryKey: qk.crops.list(),
    queryFn: () => api.getCrops(),
    retry: 2,
  });

  const crops: CropResponse[] = cropsQuery.data ?? [];

  useEffect(() => {
    if (cropsQuery.error) {
      showToast(
        "Không thể tải danh sách cây trồng. Một số tính năng có thể bị hạn chế.",
        "error",
      );
    }
  }, [cropsQuery.error, showToast]);

  // ── Filter + paginate ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return soils;
    return soils.filter(
      (s) =>
        (s.name ?? "").toLowerCase().includes(q) ||
        (s.scienceName ?? "").toLowerCase().includes(q),
    );
  }, [soils, search]);

  const { page, totalPages, pagedItems, setPage, reset } = usePagination(
    filtered,
    PAGE_SIZE,
  );

  function handleSearch(v: string) {
    setSearch(v);
    reset();
  }

  // ── Accordion helpers ──────────────────────────────────────────────────
  function toggle(soilId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(soilId)) next.delete(soilId);
      else next.add(soilId);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(pagedItems.map((s) => s.soilId)));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  const allExpanded =
    pagedItems.length > 0 && pagedItems.every((s) => expanded.has(s.soilId));

  // ── Compat helpers ─────────────────────────────────────────────────────
  function getCompatForSoil(soilId: string) {
    return compatibilities.filter((c) => c.soilId === soilId);
  }

  // ── Soil CRUD modal helpers ────────────────────────────────────────────
  function openCreate() {
    setForm(emptySoilForm);
    setFormErrors({});
    setSelectedSoil(null);
    setModalMode("create");
  }

  function openEdit(soil: Soil) {
    setForm({ name: soil.name, scienceName: soil.scienceName });
    setFormErrors({});
    setSelectedSoil(soil);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setSelectedSoil(null);
    setForm(emptySoilForm);
    setFormErrors({});
  }

  function validate(): boolean {
    const e: Partial<SoilFormState> = {};
    if (!form.name.trim()) e.name = "Tên loại đất không được để trống";
    else if (form.name.trim().length > 200)
      e.name = "Tên loại đất không được quá 200 ký tự";
    if (!form.scienceName.trim())
      e.scienceName = "Tên khoa học không được để trống";
    else if (form.scienceName.trim().length > 500)
      e.scienceName = "Tên khoa học không được quá 500 ký tự";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Mutation: create soil ──────────────────────────────────────────────
  const createSoilMutation = useMutation({
    mutationFn: () =>
      api.createSoil({
        name: form.name.trim(),
        scienceName: form.scienceName.trim(),
      }),
    onSuccess: () => {
      reset();
      closeModal();
      showToast("Thêm loại đất thành công.", "success");
      queryClient.invalidateQueries({ queryKey: qk.soils.all });
    },
    onError: (err) => {
      showToast(
        err instanceof Error
          ? err.message
          : "Tạo loại đất thất bại. Vui lòng thử lại.",
        "error",
      );
    },
  });

  // ── Mutation: update soil ──────────────────────────────────────────────
  const updateSoilMutation = useMutation({
    mutationFn: () => {
      if (!selectedSoil) throw new Error("Không tìm thấy loại đất");
      return api.updateSoil(selectedSoil.soilId, {
        name: form.name.trim(),
        scienceName: form.scienceName.trim(),
      });
    },
    onSuccess: () => {
      closeModal();
      showToast("Cập nhật loại đất thành công.", "success");
      queryClient.invalidateQueries({ queryKey: qk.soils.all });
    },
    onError: (err) => {
      showToast(
        err instanceof Error
          ? err.message
          : "Cập nhật loại đất thất bại. Vui lòng thử lại.",
        "error",
      );
    },
  });

  // ── Mutation: delete soil ──────────────────────────────────────────────
  const deleteSoilMutation = useMutation({
    mutationFn: (soilId: string) => api.deleteSoil(soilId),
    onSuccess: (_data, soilId) => {
      // Find the name from current list before it's gone from cache
      const name = soils.find((s) => s.soilId === soilId)?.name ?? "";
      setSoilToDelete(null);
      showToast(`Đã xóa loại đất${name ? ` "${name}"` : ""}.`, "success");
      queryClient.invalidateQueries({ queryKey: qk.soils.all });
    },
    onError: (err) => {
      showToast(
        err instanceof Error
          ? err.message
          : "Xóa loại đất thất bại. Vui lòng thử lại.",
        "error",
      );
    },
  });

  // ── Mutation: create compatibility ────────────────────────────────────
  const createCompatMutation = useMutation({
    mutationFn: (payload: {
      soilId: string;
      cropId: string;
      compatibility: string;
      note: string;
    }) => api.createSoilCropCompatibility(payload),
    onSuccess: () => {
      showToast("Thêm tương thích cây trồng thành công.", "success");
      // Soil list shows compat counts — invalidate both
      queryClient.invalidateQueries({ queryKey: qk.soils.all });
    },
    onError: (err) => {
      throw err; // re-throw so CompatPanel's try/catch can show its own toast
    },
  });

  // ── Mutation: update compatibility ────────────────────────────────────
  const updateCompatMutation = useMutation({
    mutationFn: (payload: {
      comptId: string;
      soilId: string;
      cropId: string;
      compatibility: string;
      note: string;
    }) =>
      api.updateSoilCropCompatibility(payload.comptId, {
        soilId: payload.soilId,
        cropId: payload.cropId,
        compatibility: payload.compatibility,
        note: payload.note,
      }),
    onSuccess: () => {
      showToast("Cập nhật tương thích thành công.", "success");
      queryClient.invalidateQueries({ queryKey: qk.soils.all });
    },
    onError: (err) => {
      throw err;
    },
  });

  // ── Mutation: delete compatibility ────────────────────────────────────
  const deleteCompatMutation = useMutation({
    mutationFn: (comptId: string) => api.deleteSoilCropCompatibility(comptId),
    onSuccess: () => {
      showToast("Đã xóa tương thích cây trồng.", "success");
      queryClient.invalidateQueries({ queryKey: qk.soils.all });
    },
    onError: (err) => {
      throw err;
    },
  });

  // ── Compat handler adapters passed to CompatPanel ─────────────────────
  // These maintain the same async function signatures as before so
  // CompatPanel's internal try/catch flow is unchanged.
  async function handleAddCompat(
    soilId: string,
    cropId: string,
    compatibility: string,
    note: string,
  ) {
    await createCompatMutation.mutateAsync({
      soilId,
      cropId,
      compatibility,
      note,
    });
  }

  async function handleEditCompat(
    comptId: string,
    soilId: string,
    cropId: string,
    compatibility: string,
    note: string,
  ) {
    await updateCompatMutation.mutateAsync({
      comptId,
      soilId,
      cropId,
      compatibility,
      note,
    });
  }

  async function handleDeleteCompat(comptId: string) {
    await deleteCompatMutation.mutateAsync(comptId);
  }

  // ── Form submission dispatchers ────────────────────────────────────────
  function handleCreate() {
    if (!validate()) return;
    createSoilMutation.mutate();
  }

  function handleEdit() {
    if (!validate() || !selectedSoil) return;
    updateSoilMutation.mutate();
  }

  function handleDelete() {
    if (soilToDelete) deleteSoilMutation.mutate(soilToDelete.soilId);
  }

  const soilSubmitting =
    createSoilMutation.isPending || updateSoilMutation.isPending;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        icon={Layers}
        title="Loại Đất"
        subtitle="Danh sách các loại đất sử dụng trong hệ thống"
        actions={
          <Button leadingIcon={Plus} onClick={openCreate}>
            Thêm loại đất
          </Button>
        }
      />

      {/* List card */}
      <div className="bg-surface rounded-card border border-border shadow-card">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="Tìm kiếm theo tên hoặc tên khoa học..."
          />
          <button
            onClick={allExpanded ? collapseAll : expandAll}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-ink-500 border border-border-strong rounded-btn hover:bg-surface-subtle transition-colors whitespace-nowrap"
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
            {allExpanded ? "Thu gọn tất cả" : "Mở rộng tất cả"}
          </button>
        </div>

        {/* Scrollable table area */}
        <div className="overflow-x-auto">
          {/* Column header */}
          <div className="grid grid-cols-[2rem_1fr_1fr_7rem] px-5 py-2.5 bg-surface-alt border-b border-border text-xs font-semibold text-ink-500 uppercase tracking-wide min-w-[480px]">
            <span>No.</span>
            <span>Tên loại đất</span>
            <span>Tên khoa học</span>
            <span className="text-center">Thao tác</span>
          </div>

          {/* Rows */}
          <QueryState
            query={soilsQuery}
            errorTitle="Không thể tải danh sách loại đất"
            loadingMessage="Đang tải loại đất..."
          >
            {pagedItems.length === 0 ? (
              <EmptyState
                message={
                  search
                    ? "Không tìm thấy loại đất phù hợp"
                    : "Chưa có loại đất nào"
                }
              />
            ) : (
              pagedItems.map((soil, idx) => {
                const isOpen = expanded.has(soil.soilId);
                const compat = getCompatForSoil(soil.soilId);
                return (
                  <div
                    key={soil.soilId}
                    className="border-b border-surface-subtle last:border-b-0 min-w-[480px]"
                  >
                    {/* Row header */}
                    <div
                      className="grid grid-cols-[2rem_1fr_1fr_7rem] items-center px-5 py-3.5 hover:bg-surface-alt transition-colors cursor-pointer"
                      onClick={() => toggle(soil.soilId)}
                    >
                      <span className="text-ink-400 font-mono text-xs">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </span>
                      <div className="flex items-center gap-2 min-w-0">
                        {isOpen ? (
                          <ChevronUp className="w-3.5 h-3.5 text-primary shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-ink-400 shrink-0" />
                        )}
                        <span className="font-medium text-primary-700 text-sm truncate">
                          {soil.name ?? "—"}
                        </span>
                        {compat.length > 0 && (
                          <span className="px-1.5 py-0.5 bg-primary-50 text-primary text-[10px] font-medium rounded-pill shrink-0">
                            {compat.length}
                          </span>
                        )}
                      </div>
                      <span className="text-ink-500 italic text-sm truncate pr-4">
                        {soil.scienceName ?? "—"}
                      </span>
                      <div
                        className="flex items-center justify-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openEdit(soil)}
                          className="p-1.5 rounded-btn text-primary hover:bg-primary-50 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSoilToDelete(soil)}
                          className="p-1.5 rounded-btn text-status-danger-fg hover:bg-status-danger-bg transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded compat panel */}
                    {isOpen && (
                      <CompatPanel
                        soil={soil}
                        compat={compat}
                        crops={crops}
                        onAdd={handleAddCompat}
                        onEdit={handleEditCompat}
                        onDelete={handleDeleteCompat}
                        showToast={showToast}
                      />
                    )}
                  </div>
                );
              })
            )}
          </QueryState>
        </div>

        {/* Pagination */}
        {!soilsQuery.isLoading &&
          !soilsQuery.isError &&
          filtered.length > 0 && (
            <div className="border-t border-border px-5 py-2">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                showLabel
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                itemLabel="loại đất"
              />
            </div>
          )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modalMode !== null}
        onOpenChange={(o) => !o && closeModal()}
        title={
          modalMode === "edit" ? "Chỉnh sửa loại đất" : "Thêm loại đất mới"
        }
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={closeModal}
              disabled={soilSubmitting}
            >
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (modalMode === "edit") handleEdit();
                else handleCreate();
              }}
              loading={soilSubmitting}
            >
              {modalMode === "edit" ? "Lưu thay đổi" : "Thêm mới"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField
            label="Tên loại đất"
            required
            error={formErrors.name}
            placeholder="VD: Đất phù sa"
            value={form.name}
            onChange={(v) => {
              setForm((p) => ({ ...p, name: v }));
              setFormErrors((e) => ({ ...e, name: undefined }));
            }}
          />
          <FormField
            label="Tên khoa học"
            required
            error={formErrors.scienceName}
            placeholder="VD: Fluvisol"
            value={form.scienceName}
            onChange={(v) => {
              setForm((p) => ({ ...p, scienceName: v }));
              setFormErrors((e) => ({ ...e, scienceName: undefined }));
            }}
          />
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={soilToDelete !== null}
        onOpenChange={(o) => !o && setSoilToDelete(null)}
        title="Xóa loại đất"
        description={
          soilToDelete ? (
            <>
              <p className="mb-3">
                Bạn có chắc muốn xóa loại đất{" "}
                <strong className="text-ink-800">"{soilToDelete.name}"</strong>?
              </p>
              {getCompatForSoil(soilToDelete.soilId).length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-status-warning-bg border border-status-warning-fg/30 rounded-btn text-xs text-status-warning-fg">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <p>
                    Loại đất này đang có{" "}
                    {getCompatForSoil(soilToDelete.soilId).length} bản ghi tương
                    thích cây trồng. Toàn bộ dữ liệu liên quan sẽ bị xóa theo.
                  </p>
                </div>
              )}
            </>
          ) : null
        }
        loading={deleteSoilMutation.isPending}
        onConfirm={handleDelete}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

// ─── CompatPanel ──────────────────────────────────────────────────────────
// Domain-specific inline CRUD panel — kept as-is per refactor plan.
// Uses showToast (msg, type) — shared hook signature.

interface CompatFormState {
  cropId: string;
  compatibility: string;
  note: string;
}

const emptyCompatForm: CompatFormState = {
  cropId: "",
  compatibility: "good",
  note: "",
};

function CompatPanel({
  soil,
  compat,
  crops,
  onAdd,
  onEdit,
  onDelete,
  showToast,
}: {
  soil: Soil;
  compat: SoilCropCompatibilityResponse[];
  crops: CropResponse[];
  onAdd: (
    soilId: string,
    cropId: string,
    compatibility: string,
    note: string,
  ) => Promise<void>;
  onEdit: (
    comptId: string,
    soilId: string,
    cropId: string,
    compatibility: string,
    note: string,
  ) => Promise<void>;
  onDelete: (comptId: string) => Promise<void>;
  showToast: (message: string, type: "success" | "error") => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<CompatFormState>(emptyCompatForm);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CompatFormState>(emptyCompatForm);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const linkedCropIds = new Set(compat.map((c) => c.cropId));
  const availableCrops = crops.filter((c) => !linkedCropIds.has(c.cropId));

  function openEditRow(row: SoilCropCompatibilityResponse) {
    setDeletingId(null);
    setEditingId(row.comptId);
    setEditForm({
      cropId: row.cropId,
      compatibility: row.compatibility,
      note: row.note,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyCompatForm);
  }

  async function submitAdd() {
    if (!addForm.cropId) return;
    setAddSubmitting(true);
    try {
      await onAdd(
        soil.soilId,
        addForm.cropId,
        addForm.compatibility,
        addForm.note.trim(),
      );
      setAddForm(emptyCompatForm);
      setShowAddForm(false);
    } catch {
      showToast("Thêm tương thích thất bại. Vui lòng thử lại.", "error");
    } finally {
      setAddSubmitting(false);
    }
  }

  async function submitEdit(comptId: string, cropId: string) {
    setEditSubmitting(true);
    try {
      await onEdit(
        comptId,
        soil.soilId,
        cropId,
        editForm.compatibility,
        editForm.note.trim(),
      );
      cancelEdit();
    } catch {
      showToast("Cập nhật tương thích thất bại. Vui lòng thử lại.", "error");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function confirmDelete(comptId: string) {
    setDeleteSubmitting(true);
    try {
      await onDelete(comptId);
      setDeletingId(null);
    } catch {
      showToast("Xóa tương thích thất bại. Vui lòng thử lại.", "error");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  return (
    <div className="mx-5 mb-4 mt-1 border border-border rounded-card overflow-hidden bg-surface-alt">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-primary-50 border-b border-border">
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">
          Cây trồng tương thích ({compat.length})
        </span>
        {!showAddForm && availableCrops.length > 0 && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary bg-surface border border-primary rounded-btn hover:bg-primary-50 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Thêm tương thích cây trồng
          </button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="px-4 py-3 border-b border-border bg-surface flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-ink-600 mb-1">
              Cây trồng <span className="text-status-danger-fg">*</span>
            </label>
            <select
              value={addForm.cropId}
              onChange={(e) =>
                setAddForm((p) => ({ ...p, cropId: e.target.value }))
              }
              className="w-full px-3 py-1.5 text-sm border border-border-strong rounded-btn focus:outline-none focus:ring-2 focus:ring-primary bg-surface text-ink-700"
            >
              <option value="">-- Chọn --</option>
              {availableCrops.map((c) => (
                <option key={c.cropId} value={c.cropId}>
                  {c.cropName}
                </option>
              ))}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-ink-600 mb-1">
              Mức độ
            </label>
            <select
              value={addForm.compatibility}
              onChange={(e) =>
                setAddForm((p) => ({ ...p, compatibility: e.target.value }))
              }
              className="w-full px-3 py-1.5 text-sm border border-border-strong rounded-btn focus:outline-none focus:ring-2 focus:ring-primary bg-surface text-ink-700"
            >
              {SOIL_COMPATIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-ink-600 mb-1">
              Ghi chú
            </label>
            <input
              type="text"
              value={addForm.note}
              onChange={(e) =>
                setAddForm((p) => ({ ...p, note: e.target.value }))
              }
              placeholder="Tuỳ chọn..."
              className="w-full px-3 py-1.5 text-sm border border-border-strong rounded-btn focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2 pb-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setAddForm(emptyCompatForm);
              }}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={() => void submitAdd()}
              disabled={!addForm.cropId}
              loading={addSubmitting}
            >
              Lưu
            </Button>
          </div>
        </div>
      )}

      {/* Compat rows */}
      {compat.length === 0 ? (
        <p className="text-xs text-ink-400 text-center py-5">
          Chưa có dữ liệu tương thích
        </p>
      ) : (
        <div>
          {compat.map((row) => {
            const isEditing = editingId === row.comptId;

            return (
              <div
                key={row.comptId}
                className="border-b border-surface-subtle last:border-b-0"
              >
                {isEditing ? (
                  // Edit row
                  <div className="px-4 py-3 bg-surface flex flex-wrap gap-3 items-end">
                    <div className="w-36">
                      <label className="block text-xs font-medium text-ink-600 mb-1">
                        Mức độ
                      </label>
                      <select
                        value={editForm.compatibility}
                        onChange={(e) =>
                          setEditForm((p) => ({
                            ...p,
                            compatibility: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-1.5 text-sm border border-border-strong rounded-btn focus:outline-none focus:ring-2 focus:ring-primary bg-surface text-ink-700"
                      >
                        {SOIL_COMPATIBILITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-xs font-medium text-ink-600 mb-1">
                        Ghi chú
                      </label>
                      <input
                        type="text"
                        value={editForm.note}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, note: e.target.value }))
                        }
                        className="w-full px-3 py-1.5 text-sm border border-border-strong rounded-btn focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="flex gap-2 pb-0.5">
                      <Button variant="ghost" size="sm" onClick={cancelEdit}>
                        Hủy
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void submitEdit(row.comptId, row.cropId)}
                        loading={editSubmitting}
                      >
                        Lưu
                      </Button>
                    </div>
                  </div>
                ) : deletingId === row.comptId ? (
                  // Inline delete confirmation
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-status-danger-bg/30 border-l-2 border-status-danger-fg">
                    <span className="flex-1 text-xs text-status-danger-fg font-medium">
                      Xóa tương thích với{" "}
                      <span className="font-semibold">
                        {row.cropName ?? "cây trồng này"}
                      </span>
                      ?
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingId(null)}
                    >
                      Hủy
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => void confirmDelete(row.comptId)}
                      loading={deleteSubmitting}
                    >
                      Xóa
                    </Button>
                  </div>
                ) : (
                  // Read row
                  <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface transition-colors">
                    <span className="flex-1 text-sm font-medium text-primary-700">
                      {row.cropName ?? "—"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-xs font-medium ${soilCompatibilityChipClass(row.compatibility)}`}
                    >
                      <CompatIcon value={row.compatibility} />
                      {soilCompatibilityLabel(row.compatibility)}
                    </span>
                    {row.note && (
                      <span className="text-xs text-ink-500 truncate max-w-[180px]">
                        {row.note}
                      </span>
                    )}
                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                      <button
                        onClick={() => openEditRow(row)}
                        className="p-1 text-ink-400 hover:text-primary hover:bg-primary-50 rounded-btn transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setDeletingId(row.comptId);
                        }}
                        className="p-1 text-ink-400 hover:text-status-danger-fg hover:bg-status-danger-bg rounded-btn transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
