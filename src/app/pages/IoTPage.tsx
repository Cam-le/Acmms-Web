import { useState, useEffect } from "react";
import { Plus, Cpu, Radio, MapPin } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "../../api/queryKeys";
import {
  api,
  IotDeviceResponse,
  IotDeviceRequest,
  SeasonResponse,
  HarvestResponse,
  HarvestDetailResponse,
} from "../../api/client";
import { useToast } from "../components/ui/useToast";
import { ToastContainer } from "../components/ui/ToastContainer";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { FormField } from "../components/ui/FormField";
import { FormSelect } from "../components/ui/FormSelect";
import { PageHeader } from "../components/ui/PageHeader";
import { SearchInput } from "../components/ui/SearchInput";
import { Pagination } from "../components/ui/Pagination";
import { LoadingState } from "../components/ui/LoadingState";
import { EmptyState } from "../components/ui/EmptyState";
import { QueryState } from "../components/ui/QueryState";
import { RowActions } from "../components/ui/RowActions";
import { StatusBadge } from "../components/ui/StatusBadge";
import { usePagination } from "../hooks/usePagination";
import { iotStatusTone, iotStatusLabel } from "../utils/status";
import { formatDate } from "../utils/format";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sort bed/harvest-detail items by name.
 * Extracts the first numeric token for numeric ordering, falls back to vi
 * locale compare. Handles both "Luống 7" and "Luống 04_Vuông 01_Tây Nam".
 */
function sortByBedName<T extends { bedName: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const numA = parseInt(a.bedName.match(/\d+/)?.[0] ?? "0", 10);
    const numB = parseInt(b.bedName.match(/\d+/)?.[0] ?? "0", 10);
    if (numA !== numB) return numA - numB;
    return a.bedName.localeCompare(b.bedName, "vi");
  });
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function IoTPage() {
  const { toasts, showToast, dismissToast } = useToast();
  const queryClient = useQueryClient();

  // ── UI state (modals, form, selection) ──────────────────────────────────
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");

  const [addOpen, setAddOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<IotDeviceResponse | null>(null);
  const [editTarget, setEditTarget] = useState<IotDeviceResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IotDeviceResponse | null>(
    null,
  );

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

  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // ── Read: devices ──────────────────────────────────────────────────────
  const devicesQuery = useQuery({
    queryKey: qk.iot.devices(),
    queryFn: () => api.getIotDevices(),
  });

  // ── Read: seasons ──────────────────────────────────────────────────────
  const seasonsQuery = useQuery({
    queryKey: qk.seasons.list(),
    queryFn: () => api.getSeasons(),
  });

  const devices: IotDeviceResponse[] = devicesQuery.data ?? [];
  const seasons: SeasonResponse[] = seasonsQuery.data ?? [];

  // Default-select first season once loaded
  useEffect(() => {
    if (seasons.length > 0 && !selectedSeasonId) {
      setSelectedSeasonId(seasons[0].seasonId);
    }
  }, [seasons, selectedSeasonId]);

  // Surface device load errors as toast
  useEffect(() => {
    if (devicesQuery.error) {
      showToast(
        devicesQuery.error instanceof Error
          ? "Không thể tải danh sách thiết bị: " + devicesQuery.error.message
          : "Không thể tải danh sách thiết bị",
        "error",
      );
    }
  }, [devicesQuery.error, showToast]);

  // ── Bed name cache (derived from device list) ──────────────────────────
  // We fetch bed names on-demand in a single pass whenever the device list changes.
  const [bedNameCache, setBedNameCache] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!devicesQuery.data) return;
    const uniqueBedIds = [...new Set(devicesQuery.data.map((d) => d.bedId))];
    if (uniqueBedIds.length === 0) return;
    Promise.all(
      uniqueBedIds.map(async (id) => {
        try {
          const bed = await api.getBed(id);
          return [id, bed.bedName] as [string, string];
        } catch {
          return [id, id.slice(0, 8) + "…"] as [string, string];
        }
      }),
    ).then((entries) => setBedNameCache(Object.fromEntries(entries)));
  }, [devicesQuery.data]);

  // ── Derived / filtered ─────────────────────────────────────────────────

  const filtered = devices.filter((d) => {
    const matchSearch =
      !searchText ||
      d.name.toLowerCase().includes(searchText.toLowerCase()) ||
      d.deviceCode.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = !filterStatus || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const { page, setPage, totalPages, pagedItems } = usePagination(
    filtered,
    PAGE_SIZE,
  );

  const openAdd = () => {
    setFormData(emptyForm);
    setAddOpen(true);
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

  // ── Mutation: create ────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: () =>
      api.createIotDevice({
        ...formData,
        installationDate: new Date(formData.installationDate).toISOString(),
      }),
    onSuccess: () => {
      setAddOpen(false);
      setFormData(emptyForm);
      showToast("Thêm thiết bị thành công!", "success");
      queryClient.invalidateQueries({ queryKey: qk.iot.all });
    },
    onError: (err) => {
      showToast("Thêm thiết bị thất bại: " + (err as Error).message, "error");
    },
  });

  // ── Mutation: update ────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editTarget) throw new Error("No edit target");
      return api.updateIotDevice(editTarget.deviceId, {
        ...formData,
        installationDate: new Date(formData.installationDate).toISOString(),
      });
    },
    onSuccess: () => {
      setEditTarget(null);
      showToast("Cập nhật thiết bị thành công!", "success");
      queryClient.invalidateQueries({ queryKey: qk.iot.all });
    },
    onError: (err) => {
      showToast(
        "Cập nhật thiết bị thất bại: " + (err as Error).message,
        "error",
      );
    },
  });

  // ── Mutation: delete ────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (deviceId: string) => api.deleteIotDevice(deviceId),
    onSuccess: () => {
      setDeleteTarget(null);
      showToast("Xóa thiết bị thành công!", "success");
      queryClient.invalidateQueries({ queryKey: qk.iot.all });
    },
    onError: (err) => {
      showToast("Xóa thiết bị thất bại: " + (err as Error).message, "error");
    },
  });

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <PageHeader
        icon={Cpu}
        title="Quản Lý Thiết Bị IoT"
        subtitle="Theo dõi và quản lý thiết bị cảm biến trong các luống canh tác"
        actions={
          <Button leadingIcon={Plus} onClick={openAdd}>
            Thêm Thiết Bị
          </Button>
        }
      />

      {/* Main table */}
      <div className="bg-surface rounded-card border border-border overflow-hidden shadow-card">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex flex-wrap gap-3 items-center">
          <SearchInput
            value={searchText}
            onChange={setSearchText}
            placeholder="Tìm theo tên hoặc mã thiết bị..."
            className="flex-1 min-w-[180px]"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 text-sm border border-border-strong rounded-btn focus:outline-none focus:ring-2 focus:ring-primary bg-surface text-ink-700"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Active">Hoạt động</option>
            <option value="Inactive">Không hoạt động</option>
          </select>
        </div>

        <QueryState
          query={devicesQuery}
          errorTitle="Không thể tải danh sách thiết bị"
        >
          {filtered.length === 0 ? (
            <EmptyState
              icon={Cpu}
              title="Chưa có thiết bị nào"
              message='Nhấn "Thêm Thiết Bị" để đăng ký thiết bị mới'
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-surface-alt border-b border-border">
                  <tr>
                    {[
                      "Thiết bị",
                      "Loại",
                      "Luống",
                      "Tọa độ",
                      "Lắp đặt",
                      "Trạng thái",
                      "Thao tác",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pagedItems.map((device) => (
                    <tr
                      key={device.deviceId}
                      className="hover:bg-surface-alt transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-50 rounded-btn flex items-center justify-center shrink-0">
                            <Radio className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-primary-700">
                              {device.name}
                            </p>
                            <p className="text-xs text-ink-500 font-mono">
                              {device.deviceCode}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-ink-700">
                        {device.type}
                      </td>
                      <td className="px-5 py-3 text-sm text-ink-700">
                        {bedNameCache[device.bedId] ??
                          device.bedId.slice(0, 8) + "…"}
                      </td>
                      <td className="px-5 py-3 text-xs text-ink-500">
                        {device.latitude !== 0 || device.longitude !== 0 ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {device.latitude}, {device.longitude}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-ink-500">
                        {formatDate(device.installationDate)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge
                          label={iotStatusLabel(device.status)}
                          tone={iotStatusTone(device.status)}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <RowActions
                          align="center"
                          onView={() => setViewTarget(device)}
                          onEdit={() => openEdit(device)}
                          onDelete={() => setDeleteTarget(device)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryState>

        {filtered.length > 0 && (
          <div className="border-t border-border px-4">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              showLabel
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              itemLabel="thiết bị"
            />
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <IotFormModal
        open={addOpen || !!editTarget}
        mode={editTarget ? "edit" : "add"}
        formData={formData}
        setFormData={setFormData}
        seasons={seasons}
        selectedSeasonId={selectedSeasonId}
        setSelectedSeasonId={setSelectedSeasonId}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={
          editTarget
            ? () => updateMutation.mutate()
            : () => createMutation.mutate()
        }
        onClose={() => {
          setAddOpen(false);
          setEditTarget(null);
          setFormData(emptyForm);
        }}
      />

      {/* View Modal */}
      {viewTarget && (
        <ViewDeviceModal
          device={viewTarget}
          bedName={
            bedNameCache[viewTarget.bedId] ?? viewTarget.bedId.slice(0, 8) + "…"
          }
          onClose={() => setViewTarget(null)}
        />
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Xóa thiết bị"
        description={
          <>
            Bạn có chắc muốn xóa thiết bị <strong>{deleteTarget?.name}</strong>?
            Hành động này không thể hoàn tác.
          </>
        }
        confirmLabel="Xóa thiết bị"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.deviceId);
        }}
      />
    </div>
  );
}

// ─── IotFormModal ─────────────────────────────────────────────────────────────

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
  // ── Cascade state: season → harvest → bed ───────────────────────────
  const [selectedHarvestId, setSelectedHarvestId] = useState<string>("");

  // Step 2: harvests for selected season
  const harvestsQuery = useQuery({
    queryKey: qk.seasons.harvests(selectedSeasonId),
    queryFn: () => api.getHarvestsBySeason(selectedSeasonId),
    enabled: open && !!selectedSeasonId,
  });

  const harvests: HarvestResponse[] = harvestsQuery.data ?? [];

  // Auto-select first harvest when list loads / season changes
  useEffect(() => {
    if (harvests.length > 0 && !selectedHarvestId) {
      setSelectedHarvestId(harvests[0].harvestId);
    }
  }, [harvests, selectedHarvestId]);

  // Reset harvest + bed when season changes
  useEffect(() => {
    setSelectedHarvestId("");
    // Don't clear formData.bedId here — on edit open the bedId is pre-set
    // and season change is intentional, so we let bed reset via harvest change.
  }, [selectedSeasonId]);

  // Step 3: harvest-details (beds) for selected harvest
  const harvestDetailsQuery = useQuery({
    queryKey: qk.seasons.harvestDetails(selectedHarvestId),
    queryFn: () => api.getHarvestDetailsByHarvest(selectedHarvestId),
    enabled: open && !!selectedHarvestId,
  });

  const harvestDetails: HarvestDetailResponse[] = sortByBedName(
    harvestDetailsQuery.data ?? [],
  );

  // In add mode: auto-select first bed when details load
  useEffect(() => {
    if (mode === "add" && harvestDetails.length > 0 && !formData.bedId) {
      setFormData({ ...formData, bedId: harvestDetails[0].bedId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [harvestDetails, mode]);

  // Reset cascade state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedHarvestId("");
    }
  }, [open]);

  // When harvest changes, clear bed selection so user must pick explicitly
  const handleHarvestChange = (harvestId: string) => {
    setSelectedHarvestId(harvestId);
    setFormData({ ...formData, bedId: "" });
  };

  const canSubmit =
    formData.bedId.trim() !== "" &&
    formData.name.trim() !== "" &&
    formData.deviceCode.trim() !== "";

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={mode === "add" ? "Thêm Thiết Bị IoT" : "Chỉnh Sửa Thiết Bị"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit} loading={submitting}>
            {mode === "add" ? "Thêm Thiết Bị" : "Lưu Thay Đổi"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Bed selection — shown for both add and edit */}
        <div className="space-y-3 p-4 bg-primary-50 rounded-btn border border-primary-200">
          <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide">
            Chọn luống lắp đặt
          </p>

          {/* Season */}
          <FormSelect
            label="Mùa vụ"
            value={selectedSeasonId}
            onChange={setSelectedSeasonId}
            options={
              seasons.length === 0
                ? [{ value: "", label: "Không có mùa vụ" }]
                : seasons.map((s) => ({
                    value: s.seasonId,
                    label: s.seasonName,
                  }))
            }
          />

          {/* Harvest (plot) */}
          {harvestsQuery.isLoading ? (
            <LoadingState
              variant="inline"
              message="Đang tải danh sách vuông..."
            />
          ) : harvestsQuery.isError ? (
            <p className="text-xs text-status-danger-fg">
              Không thể tải danh sách vuông. Vui lòng thử lại.
            </p>
          ) : (
            <FormSelect
              label="Vuông"
              value={selectedHarvestId}
              onChange={handleHarvestChange}
              placeholder="— Chọn vuông —"
              options={harvests.map((h) => ({
                value: h.harvestId,
                label: h.plotName,
              }))}
            />
          )}

          {/* Bed */}
          {!!selectedHarvestId &&
            (harvestDetailsQuery.isLoading ? (
              <LoadingState
                variant="inline"
                message="Đang tải danh sách luống..."
              />
            ) : harvestDetailsQuery.isError ? (
              <p className="text-xs text-status-danger-fg">
                Không thể tải danh sách luống. Vui lòng thử lại.
              </p>
            ) : (
              <FormSelect
                label="Luống"
                required
                value={formData.bedId}
                onChange={(v) => setFormData({ ...formData, bedId: v })}
                placeholder="— Chọn luống —"
                options={harvestDetails.map((d) => ({
                  value: d.bedId,
                  label: d.bedName,
                }))}
              />
            ))}
        </div>

        {/* Device Code + Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Mã thiết bị"
            required
            placeholder="Ví dụ: CMMS_01_ESP"
            value={formData.deviceCode}
            onChange={(v) => setFormData({ ...formData, deviceCode: v })}
          />
          <FormField
            label="Tên thiết bị"
            required
            placeholder="Ví dụ: Cảm biến nhiệt độ A1"
            value={formData.name}
            onChange={(v) => setFormData({ ...formData, name: v })}
          />
        </div>

        {/* Type + Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Loại thiết bị"
            placeholder="Ví dụ: Environment"
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
            ]}
          />
        </div>

        {/* Installation Date */}
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

        {/* Coordinates */}
        <div>
          <p className="block text-sm font-medium text-ink-600 mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            Tọa độ
          </p>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Vĩ độ"
              type="number"
              placeholder="Vĩ độ"
              value={formData.latitude ? String(formData.latitude) : ""}
              onChange={(v) =>
                setFormData({
                  ...formData,
                  latitude: parseFloat(v) || 0,
                })
              }
              inputProps={{ step: "any" }}
            />
            <FormField
              label="Kinh độ"
              type="number"
              placeholder="Kinh độ"
              value={formData.longitude ? String(formData.longitude) : ""}
              onChange={(v) =>
                setFormData({
                  ...formData,
                  longitude: parseFloat(v) || 0,
                })
              }
              inputProps={{ step: "any" }}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── ViewDeviceModal ──────────────────────────────────────────────────────────

function ViewDeviceModal({
  device,
  bedName,
  onClose,
}: {
  device: IotDeviceResponse;
  bedName: string;
  onClose: () => void;
}) {
  const rows: [string, string][] = [
    ["Mã thiết bị", device.deviceCode],
    ["Loại", device.type],
    ["Luống", bedName],
    ["Tọa độ", `${device.latitude}, ${device.longitude}`],
    ["Ngày lắp đặt", formatDate(device.installationDate)],
    ["Ngày tạo", formatDate(device.createdAt)],
    ["Hoạt động gần nhất", formatDate(device.lastActiveAt)],
  ];

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-modal shadow-modal w-[calc(100%-2rem)] max-w-md z-50 flex flex-col max-h-[90vh] overflow-hidden">
          <Dialog.Description className="sr-only">
            Chi tiết thiết bị
          </Dialog.Description>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-primary-50 rounded-btn flex items-center justify-center shrink-0">
                <Cpu className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <Dialog.Title className="text-base font-semibold text-primary-700 truncate">
                  {device.name}
                </Dialog.Title>
                <StatusBadge
                  label={iotStatusLabel(device.status)}
                  tone={iotStatusTone(device.status)}
                  size="sm"
                />
              </div>
            </div>
            <Dialog.Close
              className="text-ink-400 hover:text-ink-700 transition-colors shrink-0 ml-3"
              aria-label="Đóng"
            >
              <span className="sr-only">Đóng</span>✕
            </Dialog.Close>
          </div>

          <div className="px-6 py-5 space-y-3 overflow-y-auto">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm gap-4">
                <span className="text-ink-500 shrink-0">{label}</span>
                <span className="text-primary-700 font-medium text-right break-all">
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
            <Button onClick={onClose}>Đóng</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
