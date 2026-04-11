import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  List,
  MapPin,
  Clock,
  User,
  CheckCircle2,
  Eye,
  Pencil,
  Trash2,
  ClipboardList,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { api } from "../../api/client";
import type {
  TaskResponse,
  TaskDetailResponse,
  SeasonResponse,
  BedResponse,
  PlotResponse,
  UserResponse,
} from "../../api/client";

// ─── Constants ────────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise API taskStatus to lowercase consistent key */
function normaliseTaskStatus(s: string): "active" | "inactive" {
  return s?.toLowerCase() === "inactive" ? "inactive" : "active";
}

/** Map BedResponse.bedStatus to BedStatus display key */
function toBedStatus(s: string): BedStatus {
  const l = s?.toLowerCase();
  if (l === "in-use" || l === "inuse" || l === "active") return "in-use";
  if (l === "resting" || l === "inactive") return "resting";
  return "available";
}

// ─── Bed status config ────────────────────────────────────────────────────────

type BedStatus = "available" | "in-use" | "resting";

const BED_STATUS_CONFIG: Record<
  BedStatus,
  {
    label: string;
    dot: string;
    chipBg: string;
    chipText: string;
    chipBorder: string;
  }
> = {
  available: {
    label: "Sẵn sàng",
    dot: "#10b981",
    chipBg: "#f8fafc",
    chipText: "#475569",
    chipBorder: "#e2e8f0",
  },
  "in-use": {
    label: "Đang sử dụng",
    dot: "#f59e0b",
    chipBg: "#fefce8",
    chipText: "#92400e",
    chipBorder: "#fde68a",
  },
  resting: {
    label: "Đang nghỉ",
    dot: "#94a3b8",
    chipBg: "#f1f5f9",
    chipText: "#94a3b8",
    chipBorder: "#e2e8f0",
  },
};

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0"),
);

// ─── Drum Picker ──────────────────────────────────────────────────────────────

const ITEM_H = 36;
const VISIBLE = 3; // must be odd

interface DrumPickerProps {
  items: string[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}

function DrumPicker({ items, value, onChange, label }: DrumPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedIdx = items.indexOf(value) === -1 ? 0 : items.indexOf(value);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScroll = useRef(0);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = selectedIdx * ITEM_H;
  }, [selectedIdx]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    if (items[clamped] !== value) onChange(items[clamped]);
  }, [items, value, onChange]);

  const onScroll = () => {
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / ITEM_H);
      el.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
      handleScroll();
    }, 80);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startScroll.current = containerRef.current?.scrollTop ?? 0;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const delta = startY.current - e.clientY;
    containerRef.current.scrollTop = startScroll.current + delta;
  };
  const onMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    onScroll();
  };

  const visiblePad = Math.floor(VISIBLE / 2);

  return (
    <div className="flex flex-col items-center select-none">
      <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-1">
        {label}
      </p>
      <div className="relative" style={{ width: 60, height: ITEM_H * VISIBLE }}>
        {/* Selection highlight */}
        <div
          className="absolute left-0 right-0 rounded-xl pointer-events-none z-10"
          style={{
            top: ITEM_H * visiblePad,
            height: ITEM_H,
            background: "rgba(0,150,137,0.10)",
            border: "2px solid #009689",
          }}
        />
        {/* Top fade */}
        <div
          className="absolute inset-x-0 top-0 pointer-events-none z-10 rounded-t-xl"
          style={{
            height: ITEM_H * visiblePad,
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0))",
          }}
        />
        {/* Bottom fade */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none z-10 rounded-b-xl"
          style={{
            height: ITEM_H * visiblePad,
            background:
              "linear-gradient(to top, rgba(255,255,255,0.95), rgba(255,255,255,0))",
          }}
        />
        <div
          ref={containerRef}
          onScroll={onScroll}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          className="h-full overflow-y-scroll cursor-grab active:cursor-grabbing"
          style={{
            scrollSnapType: "y mandatory",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {Array.from({ length: visiblePad }).map((_, i) => (
            <div key={`pad-t-${i}`} style={{ height: ITEM_H }} />
          ))}
          {items.map((item) => (
            <div
              key={item}
              onClick={() => onChange(item)}
              style={{ height: ITEM_H, scrollSnapAlign: "start" }}
              className="flex items-center justify-center text-xl font-bold transition-all"
            >
              <span
                className={
                  item === value
                    ? "text-[#009689] scale-110 inline-block"
                    : "text-[#94a3b8] scale-90 inline-block"
                }
                style={{ transition: "all 0.15s ease" }}
              >
                {item}
              </span>
            </div>
          ))}
          {Array.from({ length: visiblePad }).map((_, i) => (
            <div key={`pad-b-${i}`} style={{ height: ITEM_H }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Time Picker Popover ──────────────────────────────────────────────────────

interface TimePickerProps {
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  onChange: (sh: string, sm: string, eh: string, em: string) => void;
  onClose: () => void;
}

function TimePickerSheet({
  startHour,
  startMinute,
  endHour,
  endMinute,
  onChange,
  onClose,
}: TimePickerProps) {
  const [sh, setSh] = useState(startHour || "07");
  const [sm, setSm] = useState(startMinute || "00");
  const [eh, setEh] = useState(endHour || "09");
  const [em, setEm] = useState(endMinute || "00");

  return (
    <div className="mt-2 bg-white rounded-xl border border-[#e2e8f0] shadow-lg overflow-hidden">
      {/* Compact two-column layout: start | end */}
      <div className="grid grid-cols-2 divide-x divide-[#f1f5f9]">
        <div className="px-3 py-3">
          <p className="text-[10px] font-bold text-[#009689] uppercase tracking-widest mb-2 text-center">
            Bắt đầu
          </p>
          <div className="flex items-center justify-center gap-1">
            <DrumPicker items={HOURS} value={sh} onChange={setSh} label="Giờ" />
            <span className="text-xl font-bold text-[#1e293b] mt-4">:</span>
            <DrumPicker
              items={MINUTES}
              value={sm}
              onChange={setSm}
              label="Phút"
            />
          </div>
        </div>
        <div className="px-3 py-3">
          <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-2 text-center">
            Kết thúc
          </p>
          <div className="flex items-center justify-center gap-1">
            <DrumPicker items={HOURS} value={eh} onChange={setEh} label="Giờ" />
            <span className="text-xl font-bold text-[#1e293b] mt-4">:</span>
            <DrumPicker
              items={MINUTES}
              value={em}
              onChange={setEm}
              label="Phút"
            />
          </div>
        </div>
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#f8fafc] border-t border-[#f1f5f9]">
        <span className="text-sm font-bold text-[#009689] flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {sh}:{sm} – {eh}:{em}
        </span>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-xs font-medium text-[#64748b] hover:bg-[#e2e8f0] transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => {
              onChange(sh, sm, eh, em);
              onClose();
            }}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-[#009689] text-white hover:bg-[#007f73] transition-colors"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar Day Cell ────────────────────────────────────────────────────────

function CalendarDayCard({
  day,
  dayLabel,
  isToday,
  assignments,
  onTaskClick,
}: {
  day: Date;
  dayLabel: string;
  isToday: boolean;
  assignments: TaskDetailResponse[];
  onTaskClick: (a: TaskDetailResponse) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const MAX_VISIBLE = 3;
  const visible = showAll ? assignments : assignments.slice(0, MAX_VISIBLE);
  const overflow = assignments.length - MAX_VISIBLE;

  return (
    <div
      className={`flex flex-col border-r border-[#f1f5f9] last:border-r-0 min-h-[320px] ${isToday ? "bg-[#f0fdfa]" : "bg-white"}`}
    >
      {/* Day header */}
      <div
        className={`flex flex-col items-center py-2.5 border-b ${isToday ? "border-[#009689]/20" : "border-[#f1f5f9]"}`}
      >
        <span
          className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? "text-[#009689]" : "text-[#94a3b8]"}`}
        >
          {dayLabel}
        </span>
        <div
          className={`mt-1 flex items-baseline gap-0.5 px-2 py-0.5 rounded-lg ${isToday ? "bg-[#009689]" : ""}`}
        >
          <span
            className={`text-base font-bold leading-none ${isToday ? "text-white" : "text-[#1e293b]"}`}
          >
            {day.getDate()}
          </span>
          <span
            className={`text-[10px] font-semibold leading-none ${isToday ? "text-white/80" : "text-[#94a3b8]"}`}
          >
            /{day.getMonth() + 1}
          </span>
        </div>
        {assignments.length > 0 && (
          <div className="flex gap-0.5 mt-1.5">
            {assignments.slice(0, 3).map((a) => (
              <span
                key={a.taskDetailId}
                className="w-1.5 h-1.5 rounded-full bg-[#009689]"
              />
            ))}
            {assignments.length > 3 && (
              <span className="text-[9px] text-[#94a3b8] leading-none">
                +{assignments.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Task cards */}
      <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto">
        {visible.map((a) => {
          const timeStr = a.startDate
            ? new Date(a.startDate).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";
          return (
            <button
              key={a.taskDetailId}
              onClick={() => onTaskClick(a)}
              className="w-full text-left rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all"
              style={{ borderLeft: "3px solid #009689" }}
            >
              <div className="bg-white px-2 py-1.5">
                <p className="text-[11px] font-semibold text-[#1e293b] line-clamp-2 leading-tight">
                  {a.taskTitle}
                </p>
                {timeStr && (
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-2.5 h-2.5 text-[#94a3b8] shrink-0" />
                    <span className="text-[10px] text-[#64748b]">
                      {timeStr}
                    </span>
                  </div>
                )}
                {a.bedIds.length > 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="w-2.5 h-2.5 text-[#94a3b8] shrink-0" />
                    <span className="text-[10px] text-[#64748b] truncate">
                      {a.bedIds.length} luống
                    </span>
                  </div>
                )}
                {a.assignedToWorkerIds.length > 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <User className="w-2.5 h-2.5 text-[#94a3b8] shrink-0" />
                    <span className="text-[10px] text-[#64748b] truncate">
                      1 nhân viên
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
        {!showAll && overflow > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full py-1 rounded-lg text-[10px] font-semibold text-[#009689] hover:bg-[#f0fdfa] transition-colors border border-dashed border-[#009689]/30"
          >
            +{overflow} công việc khác
          </button>
        )}
        {showAll && assignments.length > MAX_VISIBLE && (
          <button
            onClick={() => setShowAll(false)}
            className="w-full py-1 rounded-lg text-[10px] font-semibold text-[#64748b] hover:bg-[#f8fafc] transition-colors border border-dashed border-[#e2e8f0]"
          >
            Thu gọn
          </button>
        )}
        {assignments.length === 0 && (
          <p className="text-[10px] text-[#e2e8f0] text-center pt-8">—</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TasksPage() {
  const [activeTab, setActiveTab] = useState("schedule");

  // ── API data ─────────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [taskDetails, setTaskDetails] = useState<TaskDetailResponse[]>([]);
  const [seasons, setSeasons] = useState<SeasonResponse[]>([]);
  const [allBeds, setAllBeds] = useState<BedResponse[]>([]);
  const [allPlots, setAllPlots] = useState<PlotResponse[]>([]);
  const [staffList, setStaffList] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modals
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] =
    useState<TaskDetailResponse | null>(null);
  const [detailToDelete, setDetailToDelete] =
    useState<TaskDetailResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  // Template table state
  const [tplPage, setTplPage] = useState(1);
  const [viewTplOpen, setViewTplOpen] = useState(false);
  const [selectedTpl, setSelectedTpl] = useState<TaskResponse | null>(null);
  const [deleteTplOpen, setDeleteTplOpen] = useState(false);
  const [tplToDelete, setTplToDelete] = useState<TaskResponse | null>(null);
  const [editTplOpen, setEditTplOpen] = useState(false);
  const [editTpl, setEditTpl] = useState<TaskResponse | null>(null);
  const TPL_PER_PAGE = 8;

  // New template form
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    type: "",
    description: "",
  });

  // New assignment form
  const [newAssignment, setNewAssignment] = useState({
    taskId: "",
    seasonId: "",
    date: "",
    startHour: "07",
    startMinute: "00",
    endHour: "09",
    endMinute: "00",
    notes: "",
  });

  // Inline "create task" form inside the assign modal
  const [showInlineNewTask, setShowInlineNewTask] = useState(false);
  const [inlineNewTask, setInlineNewTask] = useState({
    name: "",
    type: "",
    description: "",
  });
  // Assignment target: single worker, multiple beds + plots from season
  const [assignmentTarget, setAssignmentTarget] = useState<{
    workerId: string;
    bedIds: string[];
    plotIds: string[];
  }>({
    workerId: "",
    bedIds: [],
    plotIds: [],
  });

  // Selected plot inside the assign modal (controls which beds are shown)
  const [selectedPlotId, setSelectedPlotId] = useState("");

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tasksRes, seasonsRes, bedsRes, plotsRes, staffRes] =
        await Promise.all([
          api.getTasks(),
          api.getSeasons(),
          api.getBeds(),
          api.getPlots(),
          api.getStaffs(),
        ]);
      setTasks(tasksRes ?? []);
      setSeasons(seasonsRes ?? []);
      setAllBeds(bedsRes ?? []);
      setAllPlots(plotsRes ?? []);
      setStaffList(staffRes ?? []);

      if (seasonsRes && seasonsRes.length > 0) {
        const detailArrays = await Promise.all(
          seasonsRes.map((s) =>
            api
              .getTaskDetailsBySeason(s.seasonId)
              .catch(() => [] as TaskDetailResponse[]),
          ),
        );
        const allDetails = detailArrays.flat();
        const seen = new Set<string>();
        setTaskDetails(
          allDetails.filter((d) => {
            if (seen.has(d.taskDetailId)) return false;
            seen.add(d.taskDetailId);
            return true;
          }),
        );
      }
    } catch (err) {
      console.error("Failed to load task data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ── Calendar ──────────────────────────────────────────────────────────────
  const weekDays = (() => {
    const days: Date[] = [];
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  })();

  const getAssignmentsForDay = (date: Date) =>
    taskDetails.filter((d) => {
      if (!d.startDate) return false;
      const dt = new Date(d.startDate);
      return (
        dt.getDate() === date.getDate() &&
        dt.getMonth() === date.getMonth() &&
        dt.getFullYear() === date.getFullYear()
      );
    });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateTemplate = async () => {
    if (!newTemplate.name) return;
    setIsSaving(true);
    try {
      await api.createTask({
        taskTitle: newTemplate.name,
        taskStatus: "Active",
        taskNotes: newTemplate.description,
      });
      await loadAllData();
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setIsSaving(false);
    }
    setNewTemplate({ name: "", type: "", description: "" });
    setIsCreateTemplateOpen(false);
  };

  const handleDeleteTemplate = async () => {
    if (!tplToDelete) return;
    setIsSaving(true);
    try {
      await api.deleteTask(tplToDelete.taskId);
      await loadAllData();
    } catch (err) {
      console.error("Failed to delete task:", err);
    } finally {
      setIsSaving(false);
    }
    setDeleteTplOpen(false);
    setTplToDelete(null);
    setTplPage((p) => Math.max(1, p));
  };

  const handleSaveEdit = async () => {
    if (!editTpl) return;
    setIsSaving(true);
    try {
      await api.updateTask(editTpl.taskId, {
        taskTitle: editTpl.taskTitle,
        taskStatus: editTpl.taskStatus,
        taskNotes: editTpl.taskNotes,
      });
      await loadAllData();
    } catch (err) {
      console.error("Failed to update task:", err);
    } finally {
      setIsSaving(false);
    }
    setEditTplOpen(false);
    setEditTpl(null);
  };

  const handleInlineCreateTask = async () => {
    if (!inlineNewTask.name) return;
    setIsSaving(true);
    try {
      await api.createTask({
        taskTitle: inlineNewTask.name,
        taskStatus: "Active",
        taskNotes: inlineNewTask.description,
      });
      await loadAllData();
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setIsSaving(false);
    }
    setInlineNewTask({ name: "", type: "", description: "" });
    setShowInlineNewTask(false);
  };

  const handleCreateAssignment = async () => {
    if (
      !newAssignment.taskId ||
      !newAssignment.seasonId ||
      !newAssignment.date ||
      !assignmentTarget.workerId ||
      assignmentTarget.bedIds.length === 0
    )
      return;

    // Build ISO datetimes from date + time pickers
    const startISO = `${newAssignment.date}T${newAssignment.startHour}:${newAssignment.startMinute}:00.000Z`;
    const endISO = `${newAssignment.date}T${newAssignment.endHour}:${newAssignment.endMinute}:00.000Z`;

    // Derive plotIds from selected beds
    const plotIds = Array.from(
      new Set(
        assignmentTarget.bedIds
          .map((bid) => allBeds.find((b) => b.bedId === bid)?.plotId)
          .filter(Boolean) as string[],
      ),
    );

    setIsSaving(true);
    try {
      await api.createTaskDetail({
        taskId: newAssignment.taskId,
        seasonId: newAssignment.seasonId,
        assignedToWorkerIds: [assignmentTarget.workerId],
        bedIds: assignmentTarget.bedIds,
        plotIds,
        startDate: startISO,
        endDate: endISO,
        notes: newAssignment.notes,
      });
      await loadAllData();
    } catch (err) {
      console.error("Failed to create task detail:", err);
    } finally {
      setIsSaving(false);
    }

    setNewAssignment({
      taskId: "",
      seasonId: "",
      date: "",
      startHour: "07",
      startMinute: "00",
      endHour: "09",
      endMinute: "00",
      notes: "",
    });
    setAssignmentTarget({ workerId: "", bedIds: [], plotIds: [] });
    setIsAssignOpen(false);
  };

  const handleDeleteAssignment = async () => {
    if (!detailToDelete) return;
    setIsSaving(true);
    try {
      await api.deleteTaskDetail(detailToDelete.taskDetailId);
      await loadAllData();
    } catch (err) {
      console.error("Failed to delete task detail:", err);
    } finally {
      setIsSaving(false);
    }
    setIsDeleteOpen(false);
    setDetailToDelete(null);
  };

  // Derived helpers
  const selectedTask = tasks.find((t) => t.taskId === newAssignment.taskId);

  const timeDisplay = newAssignment.startHour
    ? `${newAssignment.startHour}:${newAssignment.startMinute} – ${newAssignment.endHour}:${newAssignment.endMinute}`
    : "";

  // Beds available for the selected season (from seasonsDetails)
  const seasonBedsForAssign = (() => {
    if (!newAssignment.seasonId) return [];
    const season = seasons.find((s) => s.seasonId === newAssignment.seasonId);
    if (!season) return [];
    const bedIds = new Set(season.seasonsDetails.map((sd) => sd.bedId));
    return allBeds.filter((b) => bedIds.has(b.bedId));
  })();

  // Plots that contain those beds
  const seasonPlotsForAssign = (() => {
    const plotIds = new Set(seasonBedsForAssign.map((b) => b.plotId));
    return allPlots.filter((p) => plotIds.has(p.plotId));
  })();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#115e59]">Công việc</h1>
          <p className="text-sm text-[#64748b] mt-1">
            Quản lý và phân công công việc tại trang trại
          </p>
        </div>
        {isLoading && (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
            Đang tải...
          </span>
        )}
      </div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex gap-6 border-b border-[#e2e8f0]">
          {[
            {
              value: "schedule",
              label: "Lịch trình",
              icon: <Calendar className="w-4 h-4" />,
            },
            {
              value: "tasks",
              label: "Thêm công việc",
              icon: <List className="w-4 h-4" />,
            },
          ].map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className="pb-3 px-1 relative text-sm font-medium text-[#64748b] data-[state=active]:text-[#009689] transition-colors"
            >
              <div className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#009689] opacity-0 data-[state=active]:opacity-100 transition-opacity" />
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* ══ TAB: LỊCH TRÌNH ══ */}
        <Tabs.Content value="schedule" className="mt-6 space-y-4">
          {/* Week nav */}
          <div className="bg-white rounded-[10px] p-4 shadow-sm border border-[#e2e8f0] flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() - 7);
                  setCurrentDate(d);
                }}
                className="p-2 hover:bg-[#f1f5f9] rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-[#64748b]" />
              </button>
              <span className="text-base font-semibold text-[#1e293b]">
                {weekDays[0].getDate()}/{weekDays[0].getMonth() + 1} –{" "}
                {weekDays[6].getDate()}/{weekDays[6].getMonth() + 1}/
                {weekDays[6].getFullYear()}
              </span>
              <button
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() + 7);
                  setCurrentDate(d);
                }}
                className="p-2 hover:bg-[#f1f5f9] rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-[#64748b]" />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-xs text-[#64748b]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full inline-block bg-[#009689]" />
                  Đã giao
                </span>
              </div>
              <button
                onClick={() => setIsAssignOpen(true)}
                className="bg-[#009689] text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 hover:bg-[#007f73] transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Giao việc
              </button>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="bg-white rounded-[10px] shadow-sm border border-[#e2e8f0] overflow-hidden">
            <div className="grid grid-cols-7 divide-x divide-[#f1f5f9]">
              {weekDays.map((day, idx) => {
                const today = new Date();
                const isToday =
                  day.getDate() === today.getDate() &&
                  day.getMonth() === today.getMonth() &&
                  day.getFullYear() === today.getFullYear();
                return (
                  <CalendarDayCard
                    key={idx}
                    day={day}
                    dayLabel={DAY_LABELS[idx]}
                    isToday={isToday}
                    assignments={getAssignmentsForDay(day)}
                    onTaskClick={(a) => {
                      setSelectedDetail(a);
                      setIsViewOpen(true);
                    }}
                  />
                );
              })}
            </div>
          </div>
        </Tabs.Content>

        {/* ══ TAB: THÊM CÔNG VIỆC ══ */}
        <Tabs.Content value="tasks" className="mt-6">
          <div className="bg-white rounded-[10px] shadow-sm border border-[#e2e8f0] overflow-hidden">
            {/* Table header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0]">
              <h2 className="text-sm font-bold text-[#1e293b]">
                Danh sách công việc
              </h2>
              <button
                onClick={() => setIsCreateTemplateOpen(true)}
                className="bg-[#009689] text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 hover:bg-[#007f73] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm công việc
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                  <tr>
                    {["Công việc", "Trạng thái", "Hành động"].map((h, i) => (
                      <th
                        key={h}
                        className={`px-6 py-3 text-xs font-semibold text-[#62748e] uppercase tracking-wide ${i === 2 ? "text-center" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-16 text-center text-[#94a3b8] text-sm"
                      >
                        Đang tải...
                      </td>
                    </tr>
                  ) : (
                    tasks
                      .slice(
                        (tplPage - 1) * TPL_PER_PAGE,
                        tplPage * TPL_PER_PAGE,
                      )
                      .map((tpl) => (
                        <tr
                          key={tpl.taskId}
                          className="hover:bg-[#f8fafc] transition-colors group"
                        >
                          <td className="px-6 py-3.5">
                            <div>
                              <span className="text-sm font-medium text-[#1e293b]">
                                {tpl.taskTitle}
                              </span>
                              {tpl.taskNotes && (
                                <p className="text-xs text-[#94a3b8] mt-0.5 line-clamp-1">
                                  {tpl.taskNotes}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                normaliseTaskStatus(tpl.taskStatus) === "active"
                                  ? "bg-[#d1fae5] text-[#065f46]"
                                  : "bg-[#f1f5f9] text-[#64748b]"
                              }`}
                            >
                              {normaliseTaskStatus(tpl.taskStatus) === "active"
                                ? "Đang hoạt động"
                                : "Không hoạt động"}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedTpl(tpl);
                                  setViewTplOpen(true);
                                }}
                                className="p-1.5 text-[#009689] hover:bg-[#f0fdfa] rounded-lg transition-colors"
                                title="Xem mô tả"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditTpl({ ...tpl });
                                  setEditTplOpen(true);
                                }}
                                className="p-1.5 text-[#64748b] hover:bg-[#f1f5f9] rounded-lg transition-colors"
                                title="Chỉnh sửa"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setTplToDelete(tpl);
                                  setDeleteTplOpen(true);
                                }}
                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                title="Xoá"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                  {!isLoading && tasks.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-16 text-center text-[#94a3b8] text-sm"
                      >
                        Chưa có công việc nào. Nhấn "Thêm công việc" để bắt đầu.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-3 border-t border-[#e2e8f0] flex items-center justify-between">
              <p className="text-xs text-[#64748b]">
                {tasks.length === 0
                  ? "Chưa có công việc nào"
                  : `${(tplPage - 1) * TPL_PER_PAGE + 1}–${Math.min(tplPage * TPL_PER_PAGE, tasks.length)} / ${tasks.length} công việc`}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTplPage((p) => Math.max(1, p - 1))}
                  disabled={tplPage === 1}
                  className="p-1.5 border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-[#64748b]" />
                </button>
                {Array.from(
                  {
                    length: Math.max(1, Math.ceil(tasks.length / TPL_PER_PAGE)),
                  },
                  (_, i) => (
                    <button
                      key={i}
                      onClick={() => setTplPage(i + 1)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${tplPage === i + 1 ? "bg-[#009689] text-white" : "hover:bg-[#f8fafc] text-[#64748b]"}`}
                    >
                      {i + 1}
                    </button>
                  ),
                )}
                <button
                  onClick={() =>
                    setTplPage((p) =>
                      Math.min(
                        Math.max(1, Math.ceil(tasks.length / TPL_PER_PAGE)),
                        p + 1,
                      ),
                    )
                  }
                  disabled={
                    tplPage ===
                    Math.max(1, Math.ceil(tasks.length / TPL_PER_PAGE))
                  }
                  className="p-1.5 border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-[#64748b]" />
                </button>
              </div>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* ══ MODAL: Thêm công việc ══ */}
      <Dialog.Root
        open={isCreateTemplateOpen}
        onOpenChange={setIsCreateTemplateOpen}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#f1f5f9] shrink-0">
              <Dialog.Title className="text-lg font-bold text-[#1e293b]">
                Thêm công việc
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Tạo công việc mới
            </Dialog.Description>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {/* Tên — task_title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tên công việc <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Tưới nước buổi sáng"
                  value={newTemplate.name}
                  onChange={(e) =>
                    setNewTemplate((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>

              {/* Ghi chú — task_notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Ghi chú / Mô tả
                </label>
                <textarea
                  rows={3}
                  placeholder="VD: Bón phân NPK 5kg/sào, bắp cải trắng khu A..."
                  value={newTemplate.description}
                  onChange={(e) =>
                    setNewTemplate((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
                />
                <p className="mt-1 text-xs text-[#94a3b8]">
                  Ghi rõ loại phân, thuốc, cây trồng... nếu cần
                </p>
              </div>
            </div>

            <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-[#e2e8f0] bg-white">
              <button
                onClick={() => setIsCreateTemplateOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 border border-[#e2e8f0] hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateTemplate}
                disabled={!newTemplate.name || isSaving}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f73] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSaving ? "Đang lưu..." : "Lưu công việc"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ══ MODAL: Assign Task ══ */}
      <Dialog.Root
        open={isAssignOpen}
        onOpenChange={(open) => {
          setIsAssignOpen(open);
          if (!open) {
            setAssignmentTarget({ workerId: "", bedIds: [], plotIds: [] });
            setShowInlineNewTask(false);
            setInlineNewTask({ name: "", type: "", description: "" });
            setSelectedPlotId("");
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-white rounded-xl shadow-2xl max-h-[92vh] flex flex-col">
            {/* Sticky header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#f1f5f9] shrink-0">
              <Dialog.Title className="text-lg font-bold text-[#1e293b]">
                Giao việc
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Giao công việc cho nhân viên theo nhóm luống
            </Dialog.Description>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
              {/* ── 1. Task ── */}
              <section>
                <h3 className="text-xs font-bold text-[#009689] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#009689] text-white text-[10px] flex items-center justify-center font-bold">
                    1
                  </span>
                  Công việc
                </h3>
                <div className="flex gap-2">
                  <select
                    value={newAssignment.taskId}
                    onChange={(e) => {
                      setNewAssignment((p) => ({
                        ...p,
                        taskId: e.target.value,
                      }));
                      if (showInlineNewTask) setShowInlineNewTask(false);
                    }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  >
                    <option value="">-- Chọn công việc --</option>
                    {tasks.map((t) => (
                      <option key={t.taskId} value={t.taskId}>
                        {t.taskTitle}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setShowInlineNewTask((p) => !p);
                      if (!showInlineNewTask) {
                        setNewAssignment((p) => ({ ...p, taskId: "" }));
                      }
                    }}
                    title="Tạo công việc mới"
                    className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
                      showInlineNewTask
                        ? "bg-[#009689] border-[#009689] text-white"
                        : "border-slate-300 text-[#009689] hover:border-[#009689] hover:bg-[#f0fdfa]"
                    }`}
                  >
                    {showInlineNewTask ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Inline create task form */}
                {showInlineNewTask && (
                  <div className="mt-3 rounded-xl border border-[#009689]/30 bg-[#f0fdfa] p-4 space-y-3">
                    <p className="text-xs font-semibold text-[#009689] flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Tạo công việc mới
                    </p>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Tên công việc <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Phun thuốc phòng bệnh..."
                        value={inlineNewTask.name}
                        onChange={(e) =>
                          setInlineNewTask((p) => ({
                            ...p,
                            name: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Ghi chú
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Ghi chú thêm nếu cần..."
                        value={inlineNewTask.description}
                        onChange={(e) =>
                          setInlineNewTask((p) => ({
                            ...p,
                            description: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          setShowInlineNewTask(false);
                          setInlineNewTask({
                            name: "",
                            type: "",
                            description: "",
                          });
                        }}
                        className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 border border-slate-300 hover:bg-white transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleInlineCreateTask}
                        disabled={!inlineNewTask.name || isSaving}
                        className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-[#009689] text-white hover:bg-[#007f73] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isSaving ? "Đang lưu..." : "Tạo & chọn"}
                      </button>
                    </div>
                  </div>
                )}

                {selectedTask && !showInlineNewTask && (
                  <p className="mt-2 text-xs text-[#64748b] bg-[#f8fafc] rounded-lg px-3 py-2 border border-[#e2e8f0]">
                    {selectedTask.taskNotes || "Không có ghi chú"}
                  </p>
                )}
              </section>

              {/* ── 2. Season ── */}
              <section>
                <h3 className="text-xs font-bold text-[#009689] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#009689] text-white text-[10px] flex items-center justify-center font-bold">
                    2
                  </span>
                  Mùa vụ
                </h3>
                <select
                  value={newAssignment.seasonId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    setNewAssignment((p) => ({ ...p, seasonId: sid }));
                    setAssignmentTarget((p) => ({
                      ...p,
                      bedIds: [],
                      plotIds: [],
                    }));
                    setSelectedPlotId("");
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                >
                  <option value="">-- Chọn mùa vụ --</option>
                  {seasons.map((s) => (
                    <option key={s.seasonId} value={s.seasonId}>
                      {s.seasonName}
                      {s.status === "Active"
                        ? " (Đang hoạt động)"
                        : s.status === "Completed"
                          ? " (Đã kết thúc)"
                          : " (Sắp diễn ra)"}
                    </option>
                  ))}
                </select>
                {newAssignment.seasonId &&
                  (() => {
                    const season = seasons.find(
                      (s) => s.seasonId === newAssignment.seasonId,
                    );
                    if (!season) return null;
                    return (
                      <div className="mt-2 flex items-center justify-between px-3 py-2 bg-[#f8fafc] rounded-lg border border-[#e2e8f0] text-xs">
                        <span className="text-[#64748b]">
                          {season.seasonStartDate
                            .split("-")
                            .reverse()
                            .join("/")}{" "}
                          –{" "}
                          {season.seasonEndDate.split("-").reverse().join("/")}
                        </span>
                        <span
                          className={`font-medium px-2 py-0.5 rounded-full ${
                            season.status === "Active"
                              ? "bg-[#d1fae5] text-[#065f46]"
                              : season.status === "Completed"
                                ? "bg-[#f1f5f9] text-[#64748b]"
                                : "bg-[#fef3c7] text-[#92400e]"
                          }`}
                        >
                          {season.status === "Active"
                            ? "Đang hoạt động"
                            : season.status === "Completed"
                              ? "Đã kết thúc"
                              : "Sắp diễn ra"}
                        </span>
                      </div>
                    );
                  })()}
              </section>

              {/* ── 3. Date & Time ── */}
              <section>
                <h3 className="text-xs font-bold text-[#009689] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#009689] text-white text-[10px] flex items-center justify-center font-bold">
                    3
                  </span>
                  Ngày &amp; Giờ
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Ngày thực hiện <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={newAssignment.date}
                      onChange={(e) =>
                        setNewAssignment((p) => ({
                          ...p,
                          date: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Khung giờ
                    </label>
                    <button
                      onClick={() => setIsTimePickerOpen((p) => !p)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-left flex items-center gap-2 hover:border-[#009689] focus:outline-none focus:ring-2 focus:ring-[#009689] transition-colors"
                    >
                      <Clock className="w-4 h-4 text-[#009689] shrink-0" />
                      <span
                        className={
                          timeDisplay ? "text-[#1e293b]" : "text-[#94a3b8]"
                        }
                      >
                        {timeDisplay || "Chọn giờ..."}
                      </span>
                    </button>
                    {isTimePickerOpen && (
                      <TimePickerSheet
                        startHour={newAssignment.startHour}
                        startMinute={newAssignment.startMinute}
                        endHour={newAssignment.endHour}
                        endMinute={newAssignment.endMinute}
                        onChange={(sh, sm, eh, em) =>
                          setNewAssignment((p) => ({
                            ...p,
                            startHour: sh,
                            startMinute: sm,
                            endHour: eh,
                            endMinute: em,
                          }))
                        }
                        onClose={() => setIsTimePickerOpen(false)}
                      />
                    )}
                  </div>
                </div>
              </section>

              {/* ── 4. Vuông, Luống & Nhân viên ── */}
              <section>
                <h3 className="text-xs font-bold text-[#009689] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#009689] text-white text-[10px] flex items-center justify-center font-bold">
                    4
                  </span>
                  Vuông, Luống &amp; Nhân viên
                </h3>

                <div className="space-y-4">
                  {/* Vuông selector */}
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
                      Vuông <span className="text-red-500">*</span>
                    </label>
                    {!newAssignment.seasonId ? (
                      <select
                        disabled
                        className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm bg-[#f8fafc] text-[#cbd5e1] cursor-not-allowed"
                      >
                        <option>-- Chọn mùa vụ trước --</option>
                      </select>
                    ) : seasonPlotsForAssign.length === 0 ? (
                      <div className="px-3 py-2 bg-[#f8fafc] border border-dashed border-[#e2e8f0] rounded-lg text-xs text-[#94a3b8] italic">
                        Mùa vụ này chưa có vuông nào
                      </div>
                    ) : (
                      <select
                        value={selectedPlotId}
                        onChange={(e) => {
                          setSelectedPlotId(e.target.value);
                          // Clear beds that don't belong to the new plot
                          const newPlotId = e.target.value;
                          const bedsInNewPlot = new Set(
                            seasonBedsForAssign
                              .filter((b) => b.plotId === newPlotId)
                              .map((b) => b.bedId),
                          );
                          setAssignmentTarget((p) => ({
                            ...p,
                            bedIds: p.bedIds.filter((id) =>
                              bedsInNewPlot.has(id),
                            ),
                          }));
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                      >
                        <option value="">-- Chọn vuông --</option>
                        {seasonPlotsForAssign.map((p) => (
                          <option key={p.plotId} value={p.plotId}>
                            {p.plotName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Luống — only shown after a plot is selected */}
                  {selectedPlotId &&
                    (() => {
                      const plotBeds = seasonBedsForAssign
                        .filter((b) => b.plotId === selectedPlotId)
                        .sort((a, b) => a.bedName.localeCompare(b.bedName));
                      const selectedCount = plotBeds.filter((b) =>
                        assignmentTarget.bedIds.includes(b.bedId),
                      ).length;
                      const allSelected =
                        plotBeds.length > 0 &&
                        plotBeds.every((b) =>
                          assignmentTarget.bedIds.includes(b.bedId),
                        );
                      return (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-[#475569] uppercase tracking-wide">
                              Luống <span className="text-red-500">*</span>
                              {selectedCount > 0 && (
                                <span className="ml-2 normal-case font-semibold text-[#009689]">
                                  ({selectedCount} đã chọn)
                                </span>
                              )}
                            </label>
                            <button
                              onClick={() => {
                                const ids = plotBeds.map((b) => b.bedId);
                                setAssignmentTarget((p) => ({
                                  ...p,
                                  bedIds: allSelected
                                    ? p.bedIds.filter((id) => !ids.includes(id))
                                    : [...new Set([...p.bedIds, ...ids])],
                                }));
                              }}
                              className="text-[11px] font-medium text-[#009689] hover:underline"
                            >
                              {allSelected
                                ? "Bỏ chọn tất cả"
                                : `Chọn tất cả (${plotBeds.length})`}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {plotBeds.map((bed) => {
                              const bedStatus = toBedStatus(bed.bedStatus);
                              const cfg = BED_STATUS_CONFIG[bedStatus];
                              const isSel = assignmentTarget.bedIds.includes(
                                bed.bedId,
                              );
                              return (
                                <button
                                  key={bed.bedId}
                                  onClick={() =>
                                    setAssignmentTarget((p) => ({
                                      ...p,
                                      bedIds: isSel
                                        ? p.bedIds.filter(
                                            (id) => id !== bed.bedId,
                                          )
                                        : [...p.bedIds, bed.bedId],
                                    }))
                                  }
                                  title={`${bed.bedName} — ${cfg.label}`}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all"
                                  style={
                                    isSel
                                      ? {
                                          background: "#009689",
                                          color: "#fff",
                                          borderColor: "#009689",
                                        }
                                      : {
                                          background: cfg.chipBg,
                                          color: cfg.chipText,
                                          borderColor: cfg.chipBorder,
                                        }
                                  }
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{
                                      background: isSel
                                        ? "rgba(255,255,255,0.7)"
                                        : cfg.dot,
                                    }}
                                  />
                                  {bed.bedName}
                                  {isSel && (
                                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  {newAssignment.seasonId &&
                    !selectedPlotId &&
                    seasonPlotsForAssign.length > 0 && (
                      <div className="px-3 py-2 bg-[#f8fafc] border border-dashed border-[#e2e8f0] rounded-lg text-xs text-[#94a3b8] italic">
                        Chọn vuông để xem danh sách luống
                      </div>
                    )}

                  {/* Nhân viên */}
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
                      Nhân viên phụ trách{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {staffList.map((s) => {
                        const rawStatus = (s.status ?? "").toLowerCase();
                        const isDisabled = rawStatus === "inactive";
                        const sel = assignmentTarget.workerId === s.userId;
                        const dotColor = isDisabled
                          ? "#94a3b8"
                          : rawStatus === "busy"
                            ? "#f59e0b"
                            : "#10b981";
                        return (
                          <button
                            key={s.userId}
                            disabled={isDisabled}
                            onClick={() =>
                              setAssignmentTarget((p) => ({
                                ...p,
                                workerId: sel ? "" : s.userId,
                              }))
                            }
                            title={s.fullname}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all"
                            style={
                              sel
                                ? {
                                    background: "#009689",
                                    color: "#fff",
                                    borderColor: "#009689",
                                  }
                                : isDisabled
                                  ? {
                                      background: "#f1f5f9",
                                      color: "#94a3b8",
                                      borderColor: "#e2e8f0",
                                      opacity: 0.5,
                                      cursor: "not-allowed",
                                    }
                                  : {
                                      background: "#f8fafc",
                                      color: "#475569",
                                      borderColor: "#e2e8f0",
                                    }
                            }
                          >
                            <span
                              className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold shrink-0"
                              style={{
                                background: sel
                                  ? "rgba(255,255,255,0.25)"
                                  : "#009689",
                                color: "#fff",
                              }}
                            >
                              {s.fullname.charAt(0).toUpperCase()}
                            </span>
                            {s.fullname}
                            {!sel && (
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ background: dotColor }}
                              />
                            )}
                            {sel && (
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                      {staffList.length === 0 && (
                        <p className="text-xs text-[#94a3b8]">
                          Chưa có nhân viên
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* ── 5. Notes ── */}
              <section>
                <h3 className="text-xs font-bold text-[#009689] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#009689] text-white text-[10px] flex items-center justify-center font-bold">
                    5
                  </span>
                  Ghi chú
                </h3>
                <textarea
                  rows={2}
                  placeholder="Lưu ý đặc biệt cho nhân viên..."
                  value={newAssignment.notes}
                  onChange={(e) =>
                    setNewAssignment((p) => ({ ...p, notes: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
                />
              </section>
            </div>

            {/* Sticky footer */}
            <div className="shrink-0 border-t border-[#e2e8f0] px-6 py-4 flex gap-3 bg-white">
              <button
                onClick={() => {
                  setIsAssignOpen(false);
                  setAssignmentTarget({
                    workerId: "",
                    bedIds: [],
                    plotIds: [],
                  });
                  setSelectedPlotId("");
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 border border-[#e2e8f0] hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateAssignment}
                disabled={
                  !newAssignment.taskId ||
                  !newAssignment.seasonId ||
                  assignmentTarget.bedIds.length === 0 ||
                  !assignmentTarget.workerId ||
                  !newAssignment.date ||
                  isSaving
                }
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f73] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSaving ? "Đang lưu..." : "Giao việc"}
                {assignmentTarget.bedIds.length > 0 && (
                  <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-md">
                    {assignmentTarget.bedIds.length} luống
                  </span>
                )}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ══ MODAL: View Assignment ══ */}
      <Dialog.Root open={isViewOpen} onOpenChange={setIsViewOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-bold text-[#1e293b]">
                Chi tiết lịch trình
              </Dialog.Title>
              <div className="flex items-center gap-1">
                {selectedDetail && (
                  <button
                    onClick={() => {
                      setIsViewOpen(false);
                      setDetailToDelete(selectedDetail);
                      setIsDeleteOpen(true);
                    }}
                    title="Xoá lịch trình này"
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <Dialog.Close asChild>
                  <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>
            </div>
            <Dialog.Description className="sr-only">
              Thông tin chi tiết của công việc được giao
            </Dialog.Description>
            {selectedDetail &&
              (() => {
                const task = tasks.find(
                  (t) => t.taskId === selectedDetail.taskId,
                );
                const season = seasons.find(
                  (s) => s.seasonId === selectedDetail.seasonId,
                );
                const worker = staffList.find(
                  (s) => s.userId === selectedDetail.assignedToWorkerIds[0],
                );
                const beds = selectedDetail.bedIds
                  .map(
                    (id) => allBeds.find((b) => b.bedId === id)?.bedName ?? id,
                  )
                  .join(", ");
                const startDt = new Date(selectedDetail.startDate);
                const endDt = new Date(selectedDetail.endDate);
                const displayDate = startDt.toLocaleDateString("vi-VN");
                const timeStr = `${startDt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} – ${endDt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
                return (
                  <div className="space-y-4">
                    {/* Task header */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#f0fdfa] flex items-center justify-center shrink-0">
                        <ClipboardList className="w-6 h-6 text-[#009689]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#1e293b]">
                          {task?.taskTitle ?? selectedDetail.taskTitle ?? "—"}
                        </p>
                        <span className="inline-block px-2.5 py-0.5 rounded text-xs font-medium bg-[#d1fae5] text-[#065f46]">
                          Đã giao
                        </span>
                      </div>
                    </div>

                    {/* Meta grid */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-[#f8fafc] rounded-lg text-sm">
                      <div>
                        <p className="text-xs text-[#64748b] mb-0.5">Mùa vụ</p>
                        <p className="font-medium text-[#1e293b]">
                          {season?.seasonName ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#64748b] mb-0.5">
                          Ngày thực hiện
                        </p>
                        <p className="font-medium text-[#1e293b]">
                          {displayDate}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#64748b] mb-0.5">Luống</p>
                        <p className="font-medium text-[#1e293b]">
                          {beds || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#64748b] mb-0.5">
                          Khung giờ
                        </p>
                        <p className="font-medium text-[#1e293b]">{timeStr}</p>
                      </div>
                    </div>

                    {/* Assigned worker */}
                    <div className="p-3 bg-[#f0fdfa] rounded-lg border border-[#009689]/20">
                      <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Nhân viên phụ trách
                      </p>
                      {worker ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#009689] flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {worker.fullname.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-[#1e293b]">
                            {worker.fullname}
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-[#94a3b8]">Chưa phân công</p>
                      )}
                    </div>

                    {/* Notes */}
                    {selectedDetail.notes && (
                      <div className="p-3 bg-[#f8fafc] rounded-lg text-sm text-[#475569] border-l-4 border-[#009689]">
                        {selectedDetail.notes}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setIsViewOpen(false)}
                        className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f73] transition-colors"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                );
              })()}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ══ DIALOG: Delete Assignment ══ */}
      <AlertDialog.Root open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
            <AlertDialog.Title className="text-base font-semibold text-slate-900 mb-2">
              Xác nhận xoá lịch trình
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-slate-600 mb-6">
              Xoá lịch trình công việc{" "}
              <span className="font-semibold">
                "
                {detailToDelete?.taskTitle ??
                  tasks.find((t) => t.taskId === detailToDelete?.taskId)
                    ?.taskTitle ??
                  ""}
                "
              </span>
              ? Hành động này không thể hoàn tác.
            </AlertDialog.Description>
            <div className="flex gap-3 justify-end">
              <AlertDialog.Cancel asChild>
                <button className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
                  Hủy bỏ
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={handleDeleteAssignment}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Xoá
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* ══ MODAL: View Template Description ══ */}
      <Dialog.Root open={viewTplOpen} onOpenChange={setViewTplOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-base font-bold text-[#1e293b]">
                Chi tiết công việc
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Mô tả công việc
            </Dialog.Description>
            {selectedTpl && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#f0fdfa] flex items-center justify-center shrink-0">
                    <ClipboardList className="w-5 h-5 text-[#009689]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1e293b] text-sm">
                      {selectedTpl.taskTitle}
                    </p>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        normaliseTaskStatus(selectedTpl.taskStatus) === "active"
                          ? "bg-[#d1fae5] text-[#065f46]"
                          : "bg-[#f1f5f9] text-[#64748b]"
                      }`}
                    >
                      {normaliseTaskStatus(selectedTpl.taskStatus) === "active"
                        ? "Đang hoạt động"
                        : "Không hoạt động"}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-[#f8fafc] rounded-lg border border-[#e2e8f0] min-h-[60px]">
                  <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">
                    {selectedTpl.taskNotes || (
                      <span className="text-[#94a3b8] italic">
                        Không có ghi chú
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setViewTplOpen(false)}
                  className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f73] transition-colors"
                >
                  Đóng
                </button>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ══ MODAL: Edit Template ══ */}
      <Dialog.Root
        open={editTplOpen}
        onOpenChange={(o) => {
          setEditTplOpen(o);
          if (!o) setEditTpl(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-bold text-[#1e293b]">
                Chỉnh sửa công việc
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Chỉnh sửa công việc mẫu
            </Dialog.Description>
            {editTpl && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Tên công việc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editTpl.taskTitle}
                    onChange={(e) =>
                      setEditTpl((p) =>
                        p ? { ...p, taskTitle: e.target.value } : p,
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Trạng thái
                  </label>
                  <select
                    value={editTpl.taskStatus}
                    onChange={(e) =>
                      setEditTpl((p) =>
                        p ? { ...p, taskStatus: e.target.value } : p,
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  >
                    <option value="Active">Đang hoạt động</option>
                    <option value="Inactive">Không hoạt động</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Ghi chú / Mô tả
                  </label>
                  <textarea
                    rows={3}
                    value={editTpl.taskNotes}
                    onChange={(e) =>
                      setEditTpl((p) =>
                        p ? { ...p, taskNotes: e.target.value } : p,
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2 border-t border-[#e2e8f0]">
                  <button
                    onClick={() => {
                      setEditTplOpen(false);
                      setEditTpl(null);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 border border-[#e2e8f0] hover:bg-slate-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editTpl.taskTitle || isSaving}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f73] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isSaving ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ══ DIALOG: Delete Template ══ */}
      <AlertDialog.Root open={deleteTplOpen} onOpenChange={setDeleteTplOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
            <AlertDialog.Title className="text-base font-semibold text-slate-900 mb-2">
              Xác nhận xoá công việc
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-slate-600 mb-6">
              Xoá công việc{" "}
              <span className="font-semibold">"{tplToDelete?.taskTitle}"</span>?
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
                  onClick={handleDeleteTemplate}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Xoá
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
