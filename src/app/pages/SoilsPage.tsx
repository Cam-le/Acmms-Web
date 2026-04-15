import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  Loader2,
  ChevronsUpDown,
} from "lucide-react";
import {
  api,
  type SoilResponse,
  type SoilCropCompatibilityResponse,
  type CropResponse,
} from "../../api/client";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

let toastSeq = 0;

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function toast(type: "success" | "error", message: string) {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3500,
    );
  }

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return { toasts, toast, dismiss };
}

function ToastContainer({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium pointer-events-auto transition-all ${
            t.type === "success"
              ? "bg-[#009689] text-white"
              : "bg-[#dc2626] text-white"
          }`}
        >
          {t.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="ml-1 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 6;

// ─── Types ────────────────────────────────────────────────────────────────────

type Soil = SoilResponse;
type ModalMode = "create" | "edit" | "delete" | null;

interface SoilFormState {
  name: string;
  scienceName: string;
}

const emptySoilForm: SoilFormState = { name: "", scienceName: "" };

// ─── Compatibility config ─────────────────────────────────────────────────────

const compatConfig: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  good: {
    label: "Tốt",
    color: "text-[#008236]",
    bg: "bg-[#dcfce7]",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  average: {
    label: "Trung bình",
    color: "text-[#92400e]",
    bg: "bg-[#fef3c7]",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  poor: {
    label: "Kém",
    color: "text-[#dc2626]",
    bg: "bg-[#fee2e2]",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

const fallbackCompatConfig = {
  label: "Không rõ",
  color: "text-[#62748e]",
  bg: "bg-[#f1f5f9]",
  icon: null,
};

// ─── Main component ───────────────────────────────────────────────────────────

export function SoilsPage() {
  const [soils, setSoils] = useState<Soil[]>([]);
  const [loading, setLoading] = useState(true);
  const [compatibilities, setCompatibilities] = useState<
    SoilCropCompatibilityResponse[]
  >([]);
  const [crops, setCrops] = useState<CropResponse[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Accordion: set of expanded soilIds
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Soil CRUD modal
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedSoil, setSelectedSoil] = useState<Soil | null>(null);
  const [form, setForm] = useState<SoilFormState>(emptySoilForm);
  const [errors, setErrors] = useState<Partial<SoilFormState>>({});

  const { toasts, toast, dismiss } = useToast();

  // ── Load on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [soilData, compatData, cropData] = await Promise.all([
          api.getSoils(),
          api.getSoilCropCompatibilities(),
          api.getCrops(),
        ]);
        setSoils(soilData);
        setCompatibilities(compatData);
        setCrops(cropData);
      } catch {
        toast("error", "Không thể tải dữ liệu. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Filtered + Paginated ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return soils;
    return soils.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.scienceName.toLowerCase().includes(q),
    );
  }, [soils, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // ── Accordion helpers ─────────────────────────────────────────────────────
  function toggle(soilId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(soilId)) next.delete(soilId);
      else next.add(soilId);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(paginated.map((s) => s.soilId)));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  const allExpanded =
    paginated.length > 0 && paginated.every((s) => expanded.has(s.soilId));

  // ── Compat helpers ────────────────────────────────────────────────────────
  function getCompatForSoil(soilId: string) {
    return compatibilities.filter((c) => c.soilId === soilId);
  }

  async function handleAddCompat(
    soilId: string,
    cropId: string,
    compatibility: string,
    note: string,
  ) {
    await api.createSoilCropCompatibility({
      soilId,
      cropId,
      compatibility,
      note,
    });
    const [refreshedCompat, refreshedSoils] = await Promise.all([
      api.getSoilCropCompatibilities(),
      api.getSoils(),
    ]);
    setCompatibilities(refreshedCompat);
    setSoils(refreshedSoils);
    toast("success", "Thêm tương thích cây trồng thành công.");
  }

  async function handleEditCompat(
    comptId: string,
    soilId: string,
    cropId: string,
    compatibility: string,
    note: string,
  ) {
    await api.updateSoilCropCompatibility(comptId, {
      soilId,
      cropId,
      compatibility,
      note,
    });
    const refreshed = await api.getSoilCropCompatibilities();
    setCompatibilities(refreshed);
    toast("success", "Cập nhật tương thích thành công.");
  }

  async function handleDeleteCompat(comptId: string) {
    await api.deleteSoilCropCompatibility(comptId);
    setCompatibilities((prev) => prev.filter((c) => c.comptId !== comptId));
    const refreshedSoils = await api.getSoils();
    setSoils(refreshedSoils);
    toast("success", "Đã xóa tương thích cây trồng.");
  }

  // ── Soil modal helpers ────────────────────────────────────────────────────
  function openCreate() {
    setForm(emptySoilForm);
    setErrors({});
    setSelectedSoil(null);
    setModalMode("create");
  }

  function openEdit(soil: Soil) {
    setForm({ name: soil.name, scienceName: soil.scienceName });
    setErrors({});
    setSelectedSoil(soil);
    setModalMode("edit");
  }

  function openDelete(soil: Soil) {
    setSelectedSoil(soil);
    setModalMode("delete");
  }

  function closeModal() {
    setModalMode(null);
    setSelectedSoil(null);
    setForm(emptySoilForm);
    setErrors({});
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
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleCreate() {
    if (!validate()) return;
    try {
      await api.createSoil({
        name: form.name.trim(),
        scienceName: form.scienceName.trim(),
      });
      setSoils(await api.getSoils());
      setPage(1);
      closeModal();
      toast("success", "Thêm loại đất thành công.");
    } catch {
      toast("error", "Tạo loại đất thất bại. Vui lòng thử lại.");
    }
  }

  async function handleEdit() {
    if (!validate() || !selectedSoil) return;
    try {
      await api.updateSoil(selectedSoil.soilId, {
        name: form.name.trim(),
        scienceName: form.scienceName.trim(),
      });
      setSoils(await api.getSoils());
      closeModal();
      toast("success", "Cập nhật loại đất thành công.");
    } catch {
      toast("error", "Cập nhật loại đất thất bại. Vui lòng thử lại.");
    }
  }

  async function handleDelete() {
    if (!selectedSoil) return;
    try {
      await api.deleteSoil(selectedSoil.soilId);
      setSoils((prev) => prev.filter((s) => s.soilId !== selectedSoil.soilId));
      closeModal();
      toast("success", `Đã xóa loại đất "${selectedSoil.name}".`);
    } catch {
      toast("error", "Xóa loại đất thất bại. Vui lòng thử lại.");
    }
  }

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-6">
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#115e59] text-2xl font-semibold">
            Quản lý loại đất
          </h1>
          <p className="text-sm text-[#62748e] mt-1">
            Danh sách các loại đất sử dụng trong hệ thống
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#009689] text-white rounded-lg hover:bg-[#007f75] transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Thêm loại đất
        </button>
      </div>

      {/* List card */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#e2e8f0] flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc tên khoa học..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
            />
          </div>
          <button
            onClick={allExpanded ? collapseAll : expandAll}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#62748e] border border-[#cad5e2] rounded-lg hover:bg-[#f1f5f9] transition-colors whitespace-nowrap"
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
            {allExpanded ? "Thu gọn tất cả" : "Mở rộng tất cả"}
          </button>
        </div>

        {/* Column header */}
        <div className="grid grid-cols-[2rem_1fr_1fr_7rem] px-5 py-2.5 bg-[#f8fafc] border-b border-[#e2e8f0] text-xs font-semibold text-[#62748e] uppercase tracking-wide">
          <span>No.</span>
          <span>Tên loại đất</span>
          <span>Tên khoa học</span>
          <span className="text-center">Thao tác</span>
        </div>

        {/* Accordion rows */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#94a3b8] text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang tải dữ liệu...
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-16 text-[#94a3b8] text-sm">
            Không tìm thấy loại đất nào
          </div>
        ) : (
          paginated.map((soil, idx) => {
            const isOpen = expanded.has(soil.soilId);
            const compat = getCompatForSoil(soil.soilId);
            return (
              <div
                key={soil.soilId}
                className="border-b border-[#f1f5f9] last:border-b-0"
              >
                {/* Row header */}
                <div
                  className="grid grid-cols-[2rem_1fr_1fr_7rem] items-center px-5 py-3.5 hover:bg-[#f8fafc] transition-colors cursor-pointer"
                  onClick={() => toggle(soil.soilId)}
                >
                  <span className="text-[#94a3b8] font-mono text-xs">
                    {(currentPage - 1) * PAGE_SIZE + idx + 1}
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    {isOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[#009689] shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8] shrink-0" />
                    )}
                    <span className="font-medium text-[#115e59] text-sm truncate">
                      {soil.name}
                    </span>
                    {compat.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-[#f0fdf9] text-[#009689] text-[10px] font-medium rounded-full shrink-0">
                        {compat.length}
                      </span>
                    )}
                  </div>
                  <span className="text-[#62748e] italic text-sm truncate pr-4">
                    {soil.scienceName}
                  </span>
                  <div
                    className="flex items-center justify-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => openEdit(soil)}
                      className="p-1.5 rounded-lg text-[#009689] hover:bg-[#f0fdf9] transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openDelete(soil)}
                      className="p-1.5 rounded-lg text-[#dc2626] hover:bg-[#fee2e2] transition-colors"
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
                    toast={toast}
                  />
                )}
              </div>
            );
          })
        )}

        {/* Pagination */}
        <div className="flex items-center justify-end px-5 py-4 border-t border-[#e2e8f0]">
          <div className="flex items-center gap-1">
            <PaginationBtn
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </PaginationBtn>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                  p === currentPage
                    ? "bg-[#009689] text-white font-semibold"
                    : "text-[#62748e] hover:bg-[#f1f5f9]"
                }`}
              >
                {p}
              </button>
            ))}
            <PaginationBtn
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </PaginationBtn>
          </div>
        </div>
      </div>

      {/* Soil CRUD modals */}
      {(modalMode === "create" || modalMode === "edit") && (
        <SoilFormModal
          mode={modalMode}
          form={form}
          errors={errors}
          onChange={(field, value) =>
            setForm((prev) => ({ ...prev, [field]: value }))
          }
          onSubmit={
            modalMode === "create"
              ? () => {
                  void handleCreate();
                }
              : () => {
                  void handleEdit();
                }
          }
          onClose={closeModal}
        />
      )}

      {modalMode === "delete" && selectedSoil && (
        <DeleteSoilModal
          soil={selectedSoil}
          compatCount={getCompatForSoil(selectedSoil.soilId).length}
          onConfirm={() => {
            void handleDelete();
          }}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// ─── CompatPanel ──────────────────────────────────────────────────────────────

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
  toast,
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
  toast: (type: "success" | "error", message: string) => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<CompatFormState>(emptyCompatForm);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CompatFormState>(emptyCompatForm);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Inline delete confirmation: comptId waiting for confirm
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
      toast("error", "Thêm tương thích thất bại. Vui lòng thử lại.");
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
      toast("error", "Cập nhật tương thích thất bại. Vui lòng thử lại.");
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
      toast("error", "Xóa tương thích thất bại. Vui lòng thử lại.");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  return (
    <div className="mx-5 mb-4 mt-1 border border-[#e2e8f0] rounded-lg overflow-hidden bg-[#f8fafc]">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#f0fdf9] border-b border-[#e2e8f0]">
        <span className="text-xs font-semibold text-[#009689] uppercase tracking-wide">
          Cây trồng tương thích ({compat.length})
        </span>
        {!showAddForm && availableCrops.length > 0 && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#009689] bg-white border border-[#009689] rounded-lg hover:bg-[#f0fdf9] transition-colors"
          >
            <Plus className="w-3 h-3" />
            Thêm tương thích cây trồng
          </button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="px-4 py-3 border-b border-[#e2e8f0] bg-white flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-[#45556c] mb-1">
              Cây trồng <span className="text-red-500">*</span>
            </label>
            <select
              value={addForm.cropId}
              onChange={(e) =>
                setAddForm((p) => ({ ...p, cropId: e.target.value }))
              }
              className="w-full px-3 py-1.5 text-sm border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155]"
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
            <label className="block text-xs font-medium text-[#45556c] mb-1">
              Mức độ
            </label>
            <select
              value={addForm.compatibility}
              onChange={(e) =>
                setAddForm((p) => ({ ...p, compatibility: e.target.value }))
              }
              className="w-full px-3 py-1.5 text-sm border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155]"
            >
              <option value="good">Tốt</option>
              <option value="average">Trung bình</option>
              <option value="poor">Kém</option>
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-[#45556c] mb-1">
              Ghi chú
            </label>
            <input
              type="text"
              value={addForm.note}
              onChange={(e) =>
                setAddForm((p) => ({ ...p, note: e.target.value }))
              }
              placeholder="Tuỳ chọn..."
              className="w-full px-3 py-1.5 text-sm border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
            />
          </div>
          <div className="flex gap-2 pb-0.5">
            <button
              onClick={() => {
                setShowAddForm(false);
                setAddForm(emptyCompatForm);
              }}
              className="px-3 py-1.5 text-xs text-[#62748e] border border-[#cad5e2] rounded-lg hover:bg-[#f1f5f9] transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={() => {
                void submitAdd();
              }}
              disabled={!addForm.cropId || addSubmitting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-[#009689] rounded-lg hover:bg-[#007f75] disabled:opacity-50 transition-colors"
            >
              {addSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
              Lưu
            </button>
          </div>
        </div>
      )}

      {/* Compat rows */}
      {compat.length === 0 ? (
        <p className="text-xs text-[#94a3b8] text-center py-5">
          Chưa có dữ liệu tương thích
        </p>
      ) : (
        <div>
          {compat.map((row) => {
            const cfg = compatConfig[row.compatibility] ?? fallbackCompatConfig;
            const isEditing = editingId === row.comptId;

            return (
              <div
                key={row.comptId}
                className="border-b border-[#f1f5f9] last:border-b-0"
              >
                {isEditing ? (
                  // Edit row
                  <div className="px-4 py-3 bg-white flex flex-wrap gap-3 items-end">
                    <div className="w-36">
                      <label className="block text-xs font-medium text-[#45556c] mb-1">
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
                        className="w-full px-3 py-1.5 text-sm border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689] bg-white text-[#334155]"
                      >
                        <option value="good">Tốt</option>
                        <option value="average">Trung bình</option>
                        <option value="poor">Kém</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-xs font-medium text-[#45556c] mb-1">
                        Ghi chú
                      </label>
                      <input
                        type="text"
                        value={editForm.note}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, note: e.target.value }))
                        }
                        className="w-full px-3 py-1.5 text-sm border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
                      />
                    </div>
                    <div className="flex gap-2 pb-0.5">
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1.5 text-xs text-[#62748e] border border-[#cad5e2] rounded-lg hover:bg-[#f1f5f9] transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={() => {
                          void submitEdit(row.comptId, row.cropId);
                        }}
                        disabled={editSubmitting}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-[#009689] rounded-lg hover:bg-[#007f75] disabled:opacity-50 transition-colors"
                      >
                        {editSubmitting && (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        )}
                        Lưu
                      </button>
                    </div>
                  </div>
                ) : deletingId === row.comptId ? (
                  // Inline delete confirmation
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-[#fff7f7] border-l-2 border-[#dc2626]">
                    <span className="flex-1 text-xs text-[#dc2626] font-medium">
                      Xóa tương thích với{" "}
                      <span className="font-semibold">{row.cropName}</span>?
                    </span>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="px-2.5 py-1 text-xs text-[#62748e] border border-[#cad5e2] rounded-lg hover:bg-[#f1f5f9] transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() => {
                        void confirmDelete(row.comptId);
                      }}
                      disabled={deleteSubmitting}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-white bg-[#dc2626] rounded-lg hover:bg-[#b91c1c] disabled:opacity-50 transition-colors"
                    >
                      {deleteSubmitting && (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      )}
                      Xóa
                    </button>
                  </div>
                ) : (
                  // Read row
                  <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-white transition-colors">
                    <span className="flex-1 text-sm font-medium text-[#115e59]">
                      {row.cropName}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </span>
                    {row.note && (
                      <span className="text-xs text-[#62748e] truncate max-w-[180px]">
                        {row.note}
                      </span>
                    )}
                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                      <button
                        onClick={() => openEditRow(row)}
                        className="p-1 text-[#94a3b8] hover:text-[#009689] hover:bg-[#f0fdf9] rounded transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setDeletingId(row.comptId);
                        }}
                        className="p-1 text-[#94a3b8] hover:text-[#dc2626] hover:bg-[#fee2e2] rounded transition-colors"
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

// ─── Soil form modal ──────────────────────────────────────────────────────────

function SoilFormModal({
  mode,
  form,
  errors,
  onChange,
  onSubmit,
  onClose,
}: {
  mode: "create" | "edit";
  form: SoilFormState;
  errors: Partial<SoilFormState>;
  onChange: (field: keyof SoilFormState, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <Backdrop onClose={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[#115e59]">
            {mode === "edit" ? "Chỉnh sửa loại đất" : "Thêm loại đất mới"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#62748e] hover:bg-[#f1f5f9] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <FormField
            label="Tên loại đất"
            required
            error={errors.name}
            placeholder="VD: Đất phù sa"
            value={form.name}
            onChange={(v) => onChange("name", v)}
          />
          <FormField
            label="Tên khoa học"
            required
            error={errors.scienceName}
            placeholder="VD: Fluvisol"
            value={form.scienceName}
            onChange={(v) => onChange("scienceName", v)}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#62748e] border border-[#cad5e2] rounded-lg hover:bg-[#f1f5f9] transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 text-sm text-white bg-[#009689] rounded-lg hover:bg-[#007f75] transition-colors font-medium"
          >
            {mode === "edit" ? "Lưu thay đổi" : "Thêm mới"}
          </button>
        </div>
      </div>
    </Backdrop>
  );
}

function FormField({
  label,
  required,
  error,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  error?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#374151] mb-1.5">
        {label}
        {required && <span className="text-[#dc2626] ml-0.5">*</span>}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          error
            ? "border-[#fca5a5] focus:ring-[#fca5a5] bg-[#fff7f7]"
            : "border-[#cad5e2] focus:ring-[#009689]"
        }`}
      />
      {error && <p className="mt-1 text-xs text-[#dc2626]">{error}</p>}
    </div>
  );
}

// ─── Delete soil modal ────────────────────────────────────────────────────────

function DeleteSoilModal({
  soil,
  compatCount,
  onConfirm,
  onClose,
}: {
  soil: Soil;
  compatCount: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Backdrop onClose={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#fee2e2] rounded-lg flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-[#dc2626]" />
          </div>
          <h2 className="text-lg font-bold text-[#115e59]">Xóa loại đất</h2>
        </div>
        <p className="text-sm text-[#62748e] mb-3">
          Bạn có chắc muốn xóa loại đất{" "}
          <span className="font-semibold text-[#115e59]">"{soil.name}"</span>?
        </p>
        {compatCount > 0 && (
          <div className="flex items-start gap-2 p-3 bg-[#fffbeb] border border-[#fde68a] rounded-lg mb-4 text-xs text-[#92400e]">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>
              Loại đất này đang có {compatCount} bản ghi tương thích cây trồng.
              Toàn bộ dữ liệu liên quan sẽ bị xóa theo.
            </p>
          </div>
        )}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#62748e] border border-[#cad5e2] rounded-lg hover:bg-[#f1f5f9] transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm text-white bg-[#dc2626] rounded-lg hover:bg-[#b91c1c] transition-colors font-medium"
          >
            Xóa
          </button>
        </div>
      </div>
    </Backdrop>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function PaginationBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-[#62748e] hover:bg-[#f1f5f9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}

function Backdrop({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
