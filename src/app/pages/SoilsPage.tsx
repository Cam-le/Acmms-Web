import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  FlaskConical,
  Sprout,
  CheckCircle2,
  AlertCircle,
  XCircle,
  LandPlot,
  AlertTriangle,
} from "lucide-react";
import {
  mockSoils,
  mockSoilCropCompatibilities,
  type Soil,
  type SoilCropCompatibility,
  type CompatibilityLevel,
} from "../../data/mockSoils";
import { mockCrops } from "../../data/mockData";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 6;

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalMode = "view" | "create" | "edit" | "delete" | null;

interface FormState {
  name: string;
  scienceName: string;
}

const emptyForm: FormState = { name: "", scienceName: "" };

// ─── Compatibility config ─────────────────────────────────────────────────────

const compatConfig: Record<
  CompatibilityLevel,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  Tốt: {
    label: "Tốt",
    color: "text-[#008236]",
    bg: "bg-[#dcfce7]",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  "Trung bình": {
    label: "Trung bình",
    color: "text-[#92400e]",
    bg: "bg-[#fef3c7]",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  Kém: {
    label: "Kém",
    color: "text-[#dc2626]",
    bg: "bg-[#fee2e2]",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SoilsPage() {
  const [soils, setSoils] = useState<Soil[]>(mockSoils);
  const [compatibilities, setCompatibilities] = useState<
    SoilCropCompatibility[]
  >(mockSoilCropCompatibilities);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedSoil, setSelectedSoil] = useState<Soil | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<FormState>>({});

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

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getCompatForSoil(soilId: string) {
    return compatibilities
      .filter((c) => c.soilId === soilId)
      .map((c) => {
        const crop = mockCrops.find((cr) => cr.id === c.cropId);
        return { ...c, cropName: crop?.name ?? `Cây #${c.cropId}` };
      });
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  function openView(soil: Soil) {
    setSelectedSoil(soil);
    setModalMode("view");
  }

  function openCreate() {
    setForm(emptyForm);
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
    setForm(emptyForm);
    setErrors({});
  }

  // ── Validation ────────────────────────────────────────────────────────────
  function validate(): boolean {
    const e: Partial<FormState> = {};
    if (!form.name.trim()) e.name = "Tên loại đất không được để trống";
    if (!form.scienceName.trim())
      e.scienceName = "Tên khoa học không được để trống";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  function handleCreate() {
    if (!validate()) return;
    const newSoil: Soil = {
      soilId: `soil-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: form.name.trim(),
      scienceName: form.scienceName.trim(),
    };
    setSoils((prev) => [newSoil, ...prev]);
    setPage(1);
    closeModal();
  }

  function handleEdit() {
    if (!validate() || !selectedSoil) return;
    setSoils((prev) =>
      prev.map((s) =>
        s.soilId === selectedSoil.soilId
          ? {
              ...s,
              name: form.name.trim(),
              scienceName: form.scienceName.trim(),
            }
          : s,
      ),
    );
    closeModal();
  }

  function handleDelete() {
    if (!selectedSoil) return;
    setSoils((prev) => prev.filter((s) => s.soilId !== selectedSoil.soilId));
    setCompatibilities((prev) =>
      prev.filter((c) => c.soilId !== selectedSoil.soilId),
    );
    closeModal();
  }

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Header ── */}
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

      {/* ── Table Card ── */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm">
        {/* toolbar */}
        <div className="p-4 border-b border-[#e2e8f0]">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc tên khoa học..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#cad5e2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009689]"
            />
          </div>
        </div>

        {/* table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#62748e] uppercase tracking-wide">
                  No.
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#62748e] uppercase tracking-wide">
                  Tên loại đất
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#62748e] uppercase tracking-wide">
                  Tên khoa học
                </th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-[#62748e] uppercase tracking-wide">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-16 text-[#94a3b8] text-sm"
                  >
                    Không tìm thấy loại đất nào
                  </td>
                </tr>
              ) : (
                paginated.map((soil, idx) => {
                  return (
                    <tr
                      key={soil.soilId}
                      className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors"
                    >
                      <td className="px-5 py-4 text-[#94a3b8] font-mono text-xs">
                        {(currentPage - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-medium text-[#115e59]">
                          {soil.name}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[#62748e] italic">
                          {soil.scienceName}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openView(soil)}
                            className="p-2 rounded-lg text-[#62748e] hover:bg-[#f1f5f9] transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEdit(soil)}
                            className="p-2 rounded-lg text-[#009689] hover:bg-[#f0fdf9] transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDelete(soil)}
                            className="p-2 rounded-lg text-[#dc2626] hover:bg-[#fee2e2] transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[#e2e8f0]">
          <span className="text-sm text-[#62748e]">
            Trang {currentPage} / {totalPages}
          </span>
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

      {/* ── Modals ── */}
      {modalMode === "view" && selectedSoil && (
        <ViewModal
          soil={selectedSoil}
          compat={getCompatForSoil(selectedSoil.soilId)}
          onClose={closeModal}
        />
      )}

      {(modalMode === "create" || modalMode === "edit") && (
        <FormModal
          mode={modalMode}
          form={form}
          errors={errors}
          onChange={(field, value) =>
            setForm((prev) => ({ ...prev, [field]: value }))
          }
          onSubmit={modalMode === "create" ? handleCreate : handleEdit}
          onClose={closeModal}
        />
      )}

      {modalMode === "delete" && selectedSoil && (
        <DeleteModal
          soil={selectedSoil}
          compatCount={getCompatForSoil(selectedSoil.soilId).length}
          onConfirm={handleDelete}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

// ── View Modal ────────────────────────────────────────────────────────────────

type CompatRow = SoilCropCompatibility & { cropName: string };

function ViewModal({
  soil,
  compat,
  onClose,
}: {
  soil: Soil;
  compat: CompatRow[];
  onClose: () => void;
}) {
  return (
    <Backdrop onClose={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        {/* header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#fef3c7] flex items-center justify-center shrink-0">
              <LandPlot className="w-5 h-5 text-[#92400e]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#115e59]">{soil.name}</h2>
              <p className="text-xs text-[#62748e] italic flex items-center gap-1 mt-0.5">
                <FlaskConical className="w-3 h-3" />
                {soil.scienceName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#62748e] hover:bg-[#f1f5f9] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* compatibility section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sprout className="w-4 h-4 text-[#009689]" />
            <h3 className="text-sm font-semibold text-[#115e59]">
              Cây trồng tương thích
            </h3>
          </div>

          {compat.length === 0 ? (
            <p className="text-sm text-[#94a3b8] py-4 text-center">
              Chưa có dữ liệu tương thích
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {compat.map((c) => {
                const cfg = compatConfig[c.compatibility];
                return (
                  <div
                    key={c.comptId}
                    className="flex items-start gap-3 p-3 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]"
                  >
                    {/* crop name + badge */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-[#115e59]">
                          {c.cropName}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}
                        >
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </div>
                      {c.note && (
                        <p className="text-xs text-[#62748e]">{c.note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#62748e] border border-[#cad5e2] rounded-lg hover:bg-[#f1f5f9] transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </Backdrop>
  );
}

// ── Form Modal ────────────────────────────────────────────────────────────────

function FormModal({
  mode,
  form,
  errors,
  onChange,
  onSubmit,
  onClose,
}: {
  mode: "create" | "edit";
  form: FormState;
  errors: Partial<FormState>;
  onChange: (field: keyof FormState, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const isEdit = mode === "edit";
  return (
    <Backdrop onClose={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[#115e59]">
            {isEdit ? "Chỉnh sửa loại đất" : "Thêm loại đất mới"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#62748e] hover:bg-[#f1f5f9] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <Field
            label="Tên loại đất"
            required
            error={errors.name}
            placeholder="VD: Đất phù sa"
            value={form.name}
            onChange={(v) => onChange("name", v)}
          />
          <Field
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
            {isEdit ? "Lưu thay đổi" : "Thêm mới"}
          </button>
        </div>
      </div>
    </Backdrop>
  );
}

function Field({
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

// ── Delete Modal ──────────────────────────────────────────────────────────────

function DeleteModal({
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

// ── Backdrop ──────────────────────────────────────────────────────────────────

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
