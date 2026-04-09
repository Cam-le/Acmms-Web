import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router";
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
  ChevronDown,
  ChevronUp,
  Info,
  Eye,
  Pencil,
  Trash2,
  Droplets,
  Sprout,
  Shield,
  Wheat,
  ScanSearch,
  Leaf,
  ClipboardList,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import {
  Staff,
  TaskTemplate,
  TaskAssignment,
  Season,
  mockTaskTemplates,
  mockTaskAssignments,
  mockSeasons,
} from "../../data/mockData";
import { fetchStaff } from "../../api/mockApi";
import type { TaskPrefill } from "../pages/AdvisoryPage";

// ─── Constants ────────────────────────────────────────────────────────────────

const TASK_TYPES = [
  "Chăm sóc",
  "Bón phân",
  "Tưới nước",
  "Bảo vệ thực vật",
  "Thu hoạch",
  "Kiểm tra",
  "Khác",
];
// Mock farms and plots for the new single-worker assignment model
interface MockFarm {
  id: string;
  name: string;
}
interface MockPlot {
  id: string;
  farmId: string;
  name: string;
}

type BedStatus = "available" | "in-use" | "resting";

interface MockBed {
  id: string;
  plotId: string;
  name: string; // e.g. "A1_01"
  status: BedStatus;
}

const MOCK_FARMS: MockFarm[] = [
  { id: "farm-a", name: "Trang trại A" },
  { id: "farm-b", name: "Trang trại B" },
  { id: "farm-c", name: "Trang trại C" },
];

const MOCK_PLOTS: MockPlot[] = [
  { id: "plot-a1", farmId: "farm-a", name: "Khu A – Vuông 01" },
  { id: "plot-a2", farmId: "farm-a", name: "Khu A – Vuông 02" },
  { id: "plot-a3", farmId: "farm-a", name: "Khu A – Vuông 03" },
  { id: "plot-b1", farmId: "farm-b", name: "Khu B – Vuông 01" },
  { id: "plot-b2", farmId: "farm-b", name: "Khu B – Vuông 02" },
  { id: "plot-c1", farmId: "farm-c", name: "Khu C – Vuông 01" },
  { id: "plot-c2", farmId: "farm-c", name: "Khu C – Vuông 02" },
];

// Beds are named <PlotCode>_<nn> and sorted ascending within each plot.
// Status "available" → selectable; "in-use" / "resting" → greyed out.
const MOCK_BEDS: MockBed[] = [
  // plot-a1 (A1)
  { id: "bed-a1-01", plotId: "plot-a1", name: "A1_01", status: "available" },
  { id: "bed-a1-02", plotId: "plot-a1", name: "A1_02", status: "available" },
  { id: "bed-a1-03", plotId: "plot-a1", name: "A1_03", status: "in-use" },
  { id: "bed-a1-04", plotId: "plot-a1", name: "A1_04", status: "available" },
  { id: "bed-a1-05", plotId: "plot-a1", name: "A1_05", status: "resting" },
  { id: "bed-a1-06", plotId: "plot-a1", name: "A1_06", status: "available" },
  // plot-a2 (A2)
  { id: "bed-a2-01", plotId: "plot-a2", name: "A2_01", status: "available" },
  { id: "bed-a2-02", plotId: "plot-a2", name: "A2_02", status: "in-use" },
  { id: "bed-a2-03", plotId: "plot-a2", name: "A2_03", status: "available" },
  { id: "bed-a2-04", plotId: "plot-a2", name: "A2_04", status: "resting" },
  // plot-a3 (A3)
  { id: "bed-a3-01", plotId: "plot-a3", name: "A3_01", status: "available" },
  { id: "bed-a3-02", plotId: "plot-a3", name: "A3_02", status: "available" },
  { id: "bed-a3-03", plotId: "plot-a3", name: "A3_03", status: "in-use" },
  // plot-b1 (B1)
  { id: "bed-b1-01", plotId: "plot-b1", name: "B1_01", status: "available" },
  { id: "bed-b1-02", plotId: "plot-b1", name: "B1_02", status: "available" },
  { id: "bed-b1-03", plotId: "plot-b1", name: "B1_03", status: "resting" },
  { id: "bed-b1-04", plotId: "plot-b1", name: "B1_04", status: "available" },
  { id: "bed-b1-05", plotId: "plot-b1", name: "B1_05", status: "in-use" },
  // plot-b2 (B2)
  { id: "bed-b2-01", plotId: "plot-b2", name: "B2_01", status: "available" },
  { id: "bed-b2-02", plotId: "plot-b2", name: "B2_02", status: "available" },
  { id: "bed-b2-03", plotId: "plot-b2", name: "B2_03", status: "in-use" },
  // plot-c1 (C1)
  { id: "bed-c1-01", plotId: "plot-c1", name: "C1_01", status: "available" },
  { id: "bed-c1-02", plotId: "plot-c1", name: "C1_02", status: "resting" },
  { id: "bed-c1-03", plotId: "plot-c1", name: "C1_03", status: "available" },
  // plot-c2 (C2)
  { id: "bed-c2-01", plotId: "plot-c2", name: "C2_01", status: "available" },
  { id: "bed-c2-02", plotId: "plot-c2", name: "C2_02", status: "in-use" },
];

// Labels and colours for each bed status
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

// Maps each season (by index in mockSeasons) to a farm + the plot IDs active in it.
// Built at module level so it reacts to whatever mockSeasons provides at runtime.
// Index 0 → farm-a (plots a1, a2), Index 1 → farm-b (plots b1, b2), rest → farm-c.
const SEASON_FARM_MAP: Record<string, { farmId: string; plotIds: string[] }> =
  Object.fromEntries(
    mockSeasons.map((s, i) => {
      if (i % 3 === 0)
        return [s.id, { farmId: "farm-a", plotIds: ["plot-a1", "plot-a2"] }];
      if (i % 3 === 1)
        return [s.id, { farmId: "farm-b", plotIds: ["plot-b1", "plot-b2"] }];
      return [s.id, { farmId: "farm-c", plotIds: ["plot-c1", "plot-c2"] }];
    }),
  );

// Worker status config — mirrors BED_STATUS_CONFIG pattern.
// "active" → fully selectable; "busy" → selectable but flagged; "off" → disabled/greyed.
type WorkerStatus = "active" | "busy" | "off";
const WORKER_STATUS_CONFIG: Record<
  WorkerStatus,
  { label: string; dot: string; disabled: boolean }
> = {
  active: { label: "Sẵn sàng", dot: "#10b981", disabled: false },
  busy: { label: "Đang bận", dot: "#f59e0b", disabled: false },
  off: { label: "Không hoạt động", dot: "#94a3b8", disabled: true },
};

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0"),
);

const STATUS_CONFIG = {
  pending: {
    label: "Chưa xử lý",
    color: "bg-[#FEE2E2] text-[#991B1B]",
    border: "#ef4444",
    dot: "#ef4444",
  },
  "in-progress": {
    label: "Đang xử lý",
    color: "bg-[#FEF3C7] text-[#92400E]",
    border: "#f59e0b",
    dot: "#f59e0b",
  },
  completed: {
    label: "Hoàn tất",
    color: "bg-[#D1FAE5] text-[#065F46]",
    border: "#10b981",
    dot: "#10b981",
  },
};

const ICON_MAP: Record<string, React.ElementType> = {
  "Tưới nước": Droplets,
  "Bón phân": Sprout,
  "Bảo vệ thực vật": Shield,
  "Thu hoạch": Wheat,
  "Kiểm tra": ScanSearch,
  "Chăm sóc": Leaf,
  Khác: ClipboardList,
};

/** Renders the Lucide icon for a task type, with a fallback to ClipboardList. */
function TaskIcon({
  type,
  className = "w-4 h-4",
}: {
  type: string;
  className?: string;
}) {
  const Icon = ICON_MAP[type] ?? ClipboardList;
  return <Icon className={className} />;
}
const BG_MAP: Record<string, string> = {
  "Tưới nước": "#dbeafe",
  "Bón phân": "#dcfce7",
  "Bảo vệ thực vật": "#fef9c3",
  "Thu hoạch": "#f0fdf4",
  "Kiểm tra": "#f3e8ff",
  "Chăm sóc": "#ecfdf5",
  Khác: "#f1f5f9",
};

const isoToDisplay = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

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

// ─── Assignment Target (new simplified model) ────────────────────────────────

interface AssignmentTarget {
  farmId: string;
  plotId: string;
  bedIds: string[]; // explicit list of selected bed IDs
  workerId: string;
}

// Details snapshot stored per-assignment for display in view modal
interface AssignmentDetail {
  farmName: string;
  plotName: string;
  bedNames: string[];
  workerName: string;
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
  assignments: TaskAssignment[];
  onTaskClick: (a: TaskAssignment) => void;
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
        {/* Date + Month on one line */}
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
        {/* Status dots */}
        {assignments.length > 0 && (
          <div className="flex gap-0.5 mt-1.5">
            {assignments.slice(0, 3).map((a) => (
              <span
                key={a.id}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: STATUS_CONFIG[a.status].dot }}
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
        {visible.map((a) => (
          <button
            key={a.id}
            onClick={() => onTaskClick(a)}
            className="w-full text-left rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all"
            style={{
              borderLeft: `3px solid ${STATUS_CONFIG[a.status].border}`,
            }}
          >
            <div className="bg-white px-2 py-1.5">
              <div className="flex items-start gap-1.5">
                <p className="text-[11px] font-semibold text-[#1e293b] line-clamp-2 leading-tight flex-1">
                  {a.taskName}
                </p>
              </div>
              {a.time && (
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-2.5 h-2.5 text-[#94a3b8] shrink-0" />
                  <span className="text-[10px] text-[#64748b]">{a.time}</span>
                </div>
              )}
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-2.5 h-2.5 text-[#94a3b8] shrink-0" />
                <span className="text-[10px] text-[#64748b] truncate">
                  {a.area}
                  {a.plot ? ` · ${a.plot.split("|")[0].trim()}` : ""}
                </span>
              </div>
              {a.workerNames.length > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <User className="w-2.5 h-2.5 text-[#94a3b8] shrink-0" />
                  <span className="text-[10px] text-[#64748b] truncate">
                    {a.workerNames[0]}
                    {a.workerNames.length > 1
                      ? ` +${a.workerNames.length - 1}`
                      : ""}
                  </span>
                </div>
              )}
            </div>
          </button>
        ))}
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
  const location = useLocation();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [activeTab, setActiveTab] = useState("schedule");

  const [templates, setTemplates] = useState<TaskTemplate[]>(mockTaskTemplates);
  const [assignments, setAssignments] =
    useState<TaskAssignment[]>(mockTaskAssignments);

  // UI
  const [currentDate, setCurrentDate] = useState(new Date(2023, 11, 20));

  // Modals
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<TaskAssignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] =
    useState<TaskAssignment | null>(null);
  const [prefillSource, setPrefillSource] = useState<TaskPrefill | null>(null);

  // Custom task types created on the fly
  const [customTaskTypes, setCustomTaskTypes] = useState<string[]>([]);
  const [newTypeInput, setNewTypeInput] = useState("");
  const [showNewTypeInput, setShowNewTypeInput] = useState(false);

  // Template table state
  const [tplPage, setTplPage] = useState(1);
  const [viewTplOpen, setViewTplOpen] = useState(false);
  const [selectedTpl, setSelectedTpl] = useState<TaskTemplate | null>(null);
  const [deleteTplOpen, setDeleteTplOpen] = useState(false);
  const [tplToDelete, setTplToDelete] = useState<TaskTemplate | null>(null);
  const [editTplOpen, setEditTplOpen] = useState(false);
  const [editTpl, setEditTpl] = useState<TaskTemplate | null>(null);
  const TPL_PER_PAGE = 8;

  // New template form — matches task_title + task_notes from ERD
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    type: "",
    description: "",
  });

  // New assignment form
  const [newAssignment, setNewAssignment] = useState({
    templateId: "",
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
  const [inlineShowNewTypeInput, setInlineShowNewTypeInput] = useState(false);
  const [inlineNewTypeInput, setInlineNewTypeInput] = useState("");

  // Assignment target: single farm → plot → specific beds → single worker
  const [assignmentTarget, setAssignmentTarget] = useState<AssignmentTarget>({
    farmId: "",
    plotId: "",
    bedIds: [],
    workerId: "",
  });

  // Stores per-assignment detail snapshot for view modal
  const [assignmentDetails, setAssignmentDetails] = useState<
    Record<string, AssignmentDetail>
  >({
    // Demo data for existing mock assignments
    "asgn-4": {
      farmName: "Trang trại A",
      plotName: "Khu A – Vuông 02",
      bedNames: ["A2_01", "A2_03"],
      workerName: "Trần Văn Hằng",
    },
  });

  useEffect(() => {
    fetchStaff().then(setStaffList);
  }, []);

  // ── Advisory prefill ──────────────────────────────────────────────────────
  useEffect(() => {
    const prefill = (location.state as { taskPrefill?: TaskPrefill } | null)
      ?.taskPrefill;
    if (!prefill) return;

    setPrefillSource(prefill);
    const matchedTemplate = templates.find(
      (t) => t.type === prefill.suggestedTaskType,
    );

    setNewAssignment((p) => ({
      ...p,
      templateId: matchedTemplate?.id ?? "",
      notes: prefill.notes,
    }));

    setIsAssignOpen(true);
    window.history.replaceState({}, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    assignments.filter((a) => {
      if (!a.date) return false;
      const d = new Date(a.date);
      return (
        d.getDate() === date.getDate() &&
        d.getMonth() === date.getMonth() &&
        d.getFullYear() === date.getFullYear()
      );
    });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.type) return;
    setTemplates((prev) => [
      ...prev,
      {
        id: `tpl-${Date.now()}`,
        name: newTemplate.name,
        type: newTemplate.type,
        description: newTemplate.description,
        crop: "",
        icon: ICON_MAP[newTemplate.type] ? newTemplate.type : "Khác",
        iconBg: BG_MAP[newTemplate.type] ?? "#f1f5f9",
      },
    ]);
    setNewTemplate({ name: "", type: "", description: "" });
    setShowNewTypeInput(false);
    setNewTypeInput("");
    setIsCreateTemplateOpen(false);
  };

  const handleDeleteTemplate = () => {
    if (!tplToDelete) return;
    setTemplates((prev) => prev.filter((t) => t.id !== tplToDelete.id));
    setDeleteTplOpen(false);
    setTplToDelete(null);
    // clamp page if needed
    setTplPage((p) => Math.max(1, p));
  };

  const handleSaveEdit = () => {
    if (!editTpl) return;
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === editTpl.id
          ? {
              ...editTpl,
              icon: ICON_MAP[editTpl.type]
                ? editTpl.type
                : (editTpl.icon ?? "Khác"),
              iconBg: BG_MAP[editTpl.type] ?? editTpl.iconBg,
            }
          : t,
      ),
    );
    setEditTplOpen(false);
    setEditTpl(null);
  };

  const handleAddCustomType = () => {
    const t = newTypeInput.trim();
    if (!t || customTaskTypes.includes(t) || TASK_TYPES.includes(t)) return;
    setCustomTaskTypes((p) => [...p, t]);
    setNewTemplate((p) => ({ ...p, type: t }));
    setShowNewTypeInput(false);
    setNewTypeInput("");
  };

  const handleInlineAddCustomType = () => {
    const t = inlineNewTypeInput.trim();
    if (!t || customTaskTypes.includes(t) || TASK_TYPES.includes(t)) return;
    setCustomTaskTypes((p) => [...p, t]);
    setInlineNewTask((p) => ({ ...p, type: t }));
    setInlineShowNewTypeInput(false);
    setInlineNewTypeInput("");
  };

  const handleInlineCreateTask = () => {
    if (!inlineNewTask.name || !inlineNewTask.type) return;
    const newTpl: TaskTemplate = {
      id: `tpl-${Date.now()}`,
      name: inlineNewTask.name,
      type: inlineNewTask.type,
      description: inlineNewTask.description,
      crop: "",
      icon: ICON_MAP[inlineNewTask.type] ? inlineNewTask.type : "Khác",
      iconBg: BG_MAP[inlineNewTask.type] ?? "#f1f5f9",
    };
    setTemplates((prev) => [...prev, newTpl]);
    setNewAssignment((p) => ({ ...p, templateId: newTpl.id }));
    setInlineNewTask({ name: "", type: "", description: "" });
    setInlineShowNewTypeInput(false);
    setInlineNewTypeInput("");
    setShowInlineNewTask(false);
  };

  const handleCreateAssignment = () => {
    const tpl = templates.find((t) => t.id === newAssignment.templateId);
    if (
      !tpl ||
      !assignmentTarget.farmId ||
      !assignmentTarget.plotId ||
      !newAssignment.date
    )
      return;

    const timeStr = `${newAssignment.startHour}:${newAssignment.startMinute} - ${newAssignment.endHour}:${newAssignment.endMinute}`;

    const farm = MOCK_FARMS.find((f) => f.id === assignmentTarget.farmId);
    const plot = MOCK_PLOTS.find((p) => p.id === assignmentTarget.plotId);
    const worker = staffList.find((s) => s.id === assignmentTarget.workerId);
    const selectedBeds = MOCK_BEDS.filter((b) =>
      assignmentTarget.bedIds.includes(b.id),
    ).sort((a, b) => a.name.localeCompare(b.name));

    const id = `asgn-${Date.now()}`;

    const detail: AssignmentDetail = {
      farmName: farm?.name ?? "",
      plotName: plot?.name ?? "",
      bedNames: selectedBeds.map((b) => b.name),
      workerName: worker?.name ?? "",
    };

    const newItem: TaskAssignment = {
      id,
      templateId: tpl.id,
      taskName: tpl.name,
      taskIcon: tpl.type,
      taskIconBg: tpl.iconBg,
      area: plot?.name ?? assignmentTarget.plotId,
      plot: selectedBeds.map((b) => b.name).join(", "),
      date: newAssignment.date,
      displayDate: isoToDisplay(newAssignment.date),
      time: timeStr,
      workerIds: worker ? [worker.id] : [],
      workerNames: worker ? [worker.name] : [],
      status: "pending" as const,
      notes: newAssignment.notes,
      seasonId: newAssignment.seasonId || undefined,
    };

    setAssignments((prev) => [...prev, newItem]);
    setAssignmentDetails((prev) => ({ ...prev, [id]: detail }));
    setNewAssignment({
      templateId: "",
      seasonId: "",
      date: "",
      startHour: "07",
      startMinute: "00",
      endHour: "09",
      endMinute: "00",
      notes: "",
    });
    setAssignmentTarget({ farmId: "", plotId: "", bedIds: [], workerId: "" });
    setIsAssignOpen(false);
  };

  const handleDeleteAssignment = () => {
    if (!assignmentToDelete) return;
    setAssignments((prev) =>
      prev.filter((a) => a.id !== assignmentToDelete.id),
    );
    setIsDeleteOpen(false);
    setAssignmentToDelete(null);
  };

  const selectedTemplate = templates.find(
    (t) => t.id === newAssignment.templateId,
  );

  const timeDisplay = newAssignment.startHour
    ? `${newAssignment.startHour}:${newAssignment.startMinute} – ${newAssignment.endHour}:${newAssignment.endMinute}`
    : "";

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
                {(
                  Object.entries(STATUS_CONFIG) as [
                    keyof typeof STATUS_CONFIG,
                    (typeof STATUS_CONFIG)[keyof typeof STATUS_CONFIG],
                  ][]
                ).map(([, cfg]) => (
                  <span key={cfg.label} className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ background: cfg.dot }}
                    />
                    {cfg.label}
                  </span>
                ))}
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
                      setSelectedAssignment(a);
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
                    {["Công việc", "Loại", "Hành động"].map((h, i) => (
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
                  {templates
                    .slice((tplPage - 1) * TPL_PER_PAGE, tplPage * TPL_PER_PAGE)
                    .map((tpl) => (
                      <tr
                        key={tpl.id}
                        className="hover:bg-[#f8fafc] transition-colors group"
                      >
                        <td className="px-6 py-3.5">
                          <span className="text-sm font-medium text-[#1e293b]">
                            {tpl.name}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f1f5f9] text-[#64748b]">
                            {tpl.type}
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
                    ))}
                  {templates.length === 0 && (
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

            {/* Pagination — always visible */}
            <div className="px-6 py-3 border-t border-[#e2e8f0] flex items-center justify-between">
              <p className="text-xs text-[#64748b]">
                {templates.length === 0
                  ? "Chưa có công việc nào"
                  : `${(tplPage - 1) * TPL_PER_PAGE + 1}–${Math.min(tplPage * TPL_PER_PAGE, templates.length)} / ${templates.length} công việc`}
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
                    length: Math.max(
                      1,
                      Math.ceil(templates.length / TPL_PER_PAGE),
                    ),
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
                        Math.max(1, Math.ceil(templates.length / TPL_PER_PAGE)),
                        p + 1,
                      ),
                    )
                  }
                  disabled={
                    tplPage ===
                    Math.max(1, Math.ceil(templates.length / TPL_PER_PAGE))
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

              {/* Loại công việc — maps to task_title prefix / categorisation */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Loại công việc <span className="text-red-500">*</span>
                </label>
                <select
                  value={newTemplate.type}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setShowNewTypeInput(true);
                    } else {
                      setNewTemplate((p) => ({ ...p, type: e.target.value }));
                      setShowNewTypeInput(false);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                >
                  <option value="">Chọn loại</option>
                  {[...TASK_TYPES, ...customTaskTypes].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="__new__">+ Tạo loại mới...</option>
                </select>
                {showNewTypeInput && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Tên loại công việc mới"
                      value={newTypeInput}
                      onChange={(e) => setNewTypeInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleAddCustomType()
                      }
                      autoFocus
                      className="flex-1 px-3 py-2 border border-[#009689] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
                    />
                    <button
                      onClick={handleAddCustomType}
                      disabled={!newTypeInput.trim()}
                      className="px-3 py-2 bg-[#009689] text-white rounded-lg text-sm font-medium hover:bg-[#007f73] disabled:opacity-40 transition-colors"
                    >
                      Thêm
                    </button>
                    <button
                      onClick={() => {
                        setShowNewTypeInput(false);
                        setNewTypeInput("");
                      }}
                      className="px-3 py-2 text-[#64748b] border border-[#e2e8f0] rounded-lg text-sm hover:bg-[#f8fafc] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Mô tả — task_notes, free-text for anything (fertilizer, crop, etc.) */}
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
                disabled={!newTemplate.name || !newTemplate.type}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f73] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Lưu công việc
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
            setAssignmentTarget({
              farmId: "",
              plotId: "",
              bedIds: [],
              workerId: "",
            });
            setPrefillSource(null);
            setShowInlineNewTask(false);
            setInlineNewTask({ name: "", type: "", description: "" });
            setInlineShowNewTypeInput(false);
            setInlineNewTypeInput("");
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
              {/* Advisory prefill banner */}
              {prefillSource && (
                <div className="flex items-start gap-2.5 bg-[#f0fdfa] border border-[#009689]/30 rounded-lg px-3 py-2.5 text-xs text-[#115e59]">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#009689]" />
                  <div>
                    <span className="font-semibold">
                      Được tạo từ tư vấn {prefillSource.sourceAdvisoryId}
                    </span>
                    <span className="text-[#62748e]">
                      {" "}
                      · Thông tin đã được điền sẵn. Bạn có thể điều chỉnh trước
                      khi giao.
                    </span>
                  </div>
                </div>
              )}

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
                    value={newAssignment.templateId}
                    onChange={(e) => {
                      setNewAssignment((p) => ({
                        ...p,
                        templateId: e.target.value,
                      }));
                      if (showInlineNewTask) setShowInlineNewTask(false);
                    }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  >
                    <option value="">-- Chọn công việc --</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.type})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setShowInlineNewTask((p) => !p);
                      if (!showInlineNewTask) {
                        setNewAssignment((p) => ({ ...p, templateId: "" }));
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

                    {/* Name */}
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

                    {/* Type */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Loại <span className="text-red-500">*</span>
                      </label>
                      {!inlineShowNewTypeInput ? (
                        <div className="flex gap-2">
                          <select
                            value={inlineNewTask.type}
                            onChange={(e) =>
                              setInlineNewTask((p) => ({
                                ...p,
                                type: e.target.value,
                              }))
                            }
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                          >
                            <option value="">-- Chọn loại --</option>
                            {[...TASK_TYPES, ...customTaskTypes].map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => setInlineShowNewTypeInput(true)}
                            className="shrink-0 px-2.5 py-1.5 rounded-lg border border-dashed border-[#009689]/50 text-xs text-[#009689] hover:bg-white transition-colors"
                          >
                            + Loại mới
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Tên loại mới..."
                            value={inlineNewTypeInput}
                            onChange={(e) =>
                              setInlineNewTypeInput(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleInlineAddCustomType();
                              if (e.key === "Escape") {
                                setInlineShowNewTypeInput(false);
                                setInlineNewTypeInput("");
                              }
                            }}
                            className="flex-1 px-3 py-2 border border-[#009689] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                            autoFocus
                          />
                          <button
                            onClick={handleInlineAddCustomType}
                            disabled={!inlineNewTypeInput.trim()}
                            className="shrink-0 px-3 py-1.5 rounded-lg bg-[#009689] text-white text-xs font-medium disabled:opacity-40 transition-colors"
                          >
                            Thêm
                          </button>
                          <button
                            onClick={() => {
                              setInlineShowNewTypeInput(false);
                              setInlineNewTypeInput("");
                            }}
                            className="shrink-0 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-600 hover:bg-white transition-colors"
                          >
                            Hủy
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Mô tả
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
                          setInlineShowNewTypeInput(false);
                          setInlineNewTypeInput("");
                        }}
                        className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 border border-slate-300 hover:bg-white transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleInlineCreateTask}
                        disabled={!inlineNewTask.name || !inlineNewTask.type}
                        className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-[#009689] text-white hover:bg-[#007f73] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Tạo &amp; chọn
                      </button>
                    </div>
                  </div>
                )}

                {selectedTemplate && !showInlineNewTask && (
                  <p className="mt-2 text-xs text-[#64748b] bg-[#f8fafc] rounded-lg px-3 py-2 border border-[#e2e8f0]">
                    {selectedTemplate.description || "Không có mô tả"}
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
                    const mapped = SEASON_FARM_MAP[sid];
                    setNewAssignment((p) => ({ ...p, seasonId: sid }));
                    setAssignmentTarget((p) => ({
                      ...p,
                      farmId: mapped?.farmId ?? "",
                      plotId: "",
                      bedIds: [],
                    }));
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                >
                  <option value="">-- Chọn mùa vụ --</option>
                  {mockSeasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.status === "Đang hoạt động"
                        ? " (Đang hoạt động)"
                        : s.status === "Đã kết thúc"
                          ? " (Đã kết thúc)"
                          : " (Sắp diễn ra)"}
                    </option>
                  ))}
                </select>
                {newAssignment.seasonId &&
                  (() => {
                    const season = mockSeasons.find(
                      (s) => s.id === newAssignment.seasonId,
                    );
                    if (!season) return null;
                    return (
                      <div className="mt-2 flex items-center justify-between px-3 py-2 bg-[#f8fafc] rounded-lg border border-[#e2e8f0] text-xs">
                        <span className="text-[#64748b]">
                          {season.startDate.split("-").reverse().join("/")} –{" "}
                          {season.endDate.split("-").reverse().join("/")}
                        </span>
                        <span
                          className={`font-medium px-2 py-0.5 rounded-full ${
                            season.status === "Đang hoạt động"
                              ? "bg-[#d1fae5] text-[#065f46]"
                              : season.status === "Đã kết thúc"
                                ? "bg-[#f1f5f9] text-[#64748b]"
                                : "bg-[#fef3c7] text-[#92400e]"
                          }`}
                        >
                          {season.status}
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

              {/* ── 4. Farm, Plot, Beds & Worker ── */}
              <section>
                <h3 className="text-xs font-bold text-[#009689] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#009689] text-white text-[10px] flex items-center justify-center font-bold">
                    4
                  </span>
                  Trang trại, Vuông, Luống &amp; Nhân viên
                </h3>

                <div className="space-y-4">
                  {/* Farm — read-only, derived from season */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Trang trại
                    </label>
                    {assignmentTarget.farmId ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-[#f1f5f9] border border-[#e2e8f0] rounded-lg">
                        <MapPin className="w-3.5 h-3.5 text-[#94a3b8] shrink-0" />
                        <span className="text-sm font-medium text-[#64748b]">
                          {MOCK_FARMS.find(
                            (f) => f.id === assignmentTarget.farmId,
                          )?.name ?? "—"}
                        </span>
                        <span className="ml-auto text-[10px] text-[#94a3b8] italic">
                          Từ mùa vụ
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 bg-[#f8fafc] border border-dashed border-[#e2e8f0] rounded-lg">
                        <MapPin className="w-3.5 h-3.5 text-[#cbd5e1] shrink-0" />
                        <span className="text-sm text-[#cbd5e1] italic">
                          Chọn mùa vụ để xem trang trại
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Plot — only available plots for the season's farm */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Vuông <span className="text-red-500">*</span>
                    </label>
                    {!assignmentTarget.farmId ? (
                      <select
                        disabled
                        className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm bg-[#f8fafc] text-[#cbd5e1] cursor-not-allowed"
                      >
                        <option>-- Chọn mùa vụ trước --</option>
                      </select>
                    ) : (
                      <select
                        value={assignmentTarget.plotId}
                        onChange={(e) =>
                          setAssignmentTarget((p) => ({
                            ...p,
                            plotId: e.target.value,
                            bedIds: [],
                          }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                      >
                        <option value="">-- Chọn vuông --</option>
                        {(() => {
                          const mapped =
                            SEASON_FARM_MAP[newAssignment.seasonId];
                          const allowedIds = mapped?.plotIds ?? [];
                          return MOCK_PLOTS.filter(
                            (p) =>
                              p.farmId === assignmentTarget.farmId &&
                              (allowedIds.length === 0 ||
                                allowedIds.includes(p.id)),
                          ).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ));
                        })()}
                      </select>
                    )}
                  </div>

                  {/* Beds — chip picker, sorted, with status indicators */}
                  {assignmentTarget.plotId &&
                    (() => {
                      const plotBeds = MOCK_BEDS.filter(
                        (b) => b.plotId === assignmentTarget.plotId,
                      ).sort((a, b) => a.name.localeCompare(b.name));
                      const selectedCount = assignmentTarget.bedIds.length;
                      const availableCount = plotBeds.filter(
                        (b) => b.status === "available",
                      ).length;
                      const allAvailableSelected =
                        availableCount > 0 &&
                        plotBeds
                          .filter((b) => b.status === "available")
                          .every((b) => assignmentTarget.bedIds.includes(b.id));
                      return (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-medium text-slate-500">
                              Luống phân công{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-2">
                              {selectedCount > 0 && (
                                <span className="text-[11px] font-semibold text-[#009689]">
                                  {selectedCount} đã chọn
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  const allAvailable = plotBeds
                                    .filter((b) => b.status === "available")
                                    .map((b) => b.id);
                                  setAssignmentTarget((p) => ({
                                    ...p,
                                    bedIds: allAvailableSelected
                                      ? []
                                      : allAvailable,
                                  }));
                                }}
                                className="text-[11px] font-medium text-[#009689] hover:underline disabled:opacity-40"
                                disabled={availableCount === 0}
                              >
                                {allAvailableSelected
                                  ? "Bỏ chọn tất cả"
                                  : `Chọn tất cả (${availableCount})`}
                              </button>
                            </div>
                          </div>

                          {/* Legend */}
                          <div className="flex items-center gap-3 mb-2">
                            {(
                              Object.entries(BED_STATUS_CONFIG) as [
                                BedStatus,
                                (typeof BED_STATUS_CONFIG)[BedStatus],
                              ][]
                            ).map(([, cfg]) => (
                              <span
                                key={cfg.label}
                                className="flex items-center gap-1 text-[10px] text-[#64748b]"
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full inline-block"
                                  style={{ background: cfg.dot }}
                                />
                                {cfg.label}
                              </span>
                            ))}
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {plotBeds.map((bed) => {
                              const cfg = BED_STATUS_CONFIG[bed.status];
                              const isAvailable = bed.status === "available";
                              const isSel = assignmentTarget.bedIds.includes(
                                bed.id,
                              );
                              return (
                                <button
                                  key={bed.id}
                                  disabled={!isAvailable}
                                  onClick={() =>
                                    setAssignmentTarget((p) => ({
                                      ...p,
                                      bedIds: isSel
                                        ? p.bedIds.filter((id) => id !== bed.id)
                                        : [...p.bedIds, bed.id],
                                    }))
                                  }
                                  title={`${bed.name} — ${cfg.label}`}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all"
                                  style={
                                    isSel
                                      ? {
                                          background: "#009689",
                                          color: "#fff",
                                          borderColor: "#009689",
                                        }
                                      : !isAvailable
                                        ? {
                                            background: cfg.chipBg,
                                            color: cfg.chipText,
                                            borderColor: cfg.chipBorder,
                                            opacity: 0.5,
                                            cursor: "not-allowed",
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
                                  {bed.name}
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

                  {/* Worker — all workers shown; "off" is disabled+greyed, "busy" flagged */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Nhân viên phụ trách{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    {/* Worker status legend */}
                    <div className="flex items-center gap-3 mb-2">
                      {(
                        Object.entries(WORKER_STATUS_CONFIG) as [
                          WorkerStatus,
                          (typeof WORKER_STATUS_CONFIG)[WorkerStatus],
                        ][]
                      ).map(([, cfg]) => (
                        <span
                          key={cfg.label}
                          className="flex items-center gap-1 text-[10px] text-[#64748b]"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full inline-block"
                            style={{ background: cfg.dot }}
                          />
                          {cfg.label}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {staffList.map((s) => {
                        const rawStatus = s.status as WorkerStatus;
                        const wCfg =
                          WORKER_STATUS_CONFIG[rawStatus] ??
                          WORKER_STATUS_CONFIG.active;
                        const isDisabled = wCfg.disabled;
                        const sel = assignmentTarget.workerId === s.id;
                        return (
                          <button
                            key={s.id}
                            disabled={isDisabled}
                            onClick={() =>
                              setAssignmentTarget((p) => ({
                                ...p,
                                workerId: sel ? "" : s.id,
                              }))
                            }
                            title={`${s.name} — ${wCfg.label}`}
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
                            {/* Avatar */}
                            <span
                              className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold shrink-0"
                              style={{
                                background: sel
                                  ? "rgba(255,255,255,0.25)"
                                  : isDisabled
                                    ? "#e2e8f0"
                                    : s.color,
                                color: isDisabled ? "#94a3b8" : "#fff",
                              }}
                            >
                              {s.initials[0]}
                            </span>
                            {s.name}
                            {/* Status dot — only show when not selected */}
                            {!sel && (
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ background: wCfg.dot }}
                                title={wCfg.label}
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
                    farmId: "",
                    plotId: "",
                    bedIds: [],
                    workerId: "",
                  });
                  setPrefillSource(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 border border-[#e2e8f0] hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateAssignment}
                disabled={
                  !newAssignment.templateId ||
                  !assignmentTarget.farmId ||
                  !assignmentTarget.plotId ||
                  assignmentTarget.bedIds.length === 0 ||
                  !assignmentTarget.workerId ||
                  !newAssignment.date
                }
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f73] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Giao việc
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
                Chi tiết
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Thông tin chi tiết của công việc được giao
            </Dialog.Description>
            {selectedAssignment &&
              (() => {
                const detail = assignmentDetails[selectedAssignment.id];
                return (
                  <div className="space-y-4">
                    {/* Task header */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: selectedAssignment.taskIconBg,
                        }}
                      >
                        <TaskIcon
                          type={selectedAssignment.taskIcon}
                          className="w-6 h-6 text-[#475569]"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-[#1e293b]">
                          {selectedAssignment.taskName}
                        </p>
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-xs font-medium ${STATUS_CONFIG[selectedAssignment.status].color}`}
                        >
                          {STATUS_CONFIG[selectedAssignment.status].label}
                        </span>
                      </div>
                    </div>

                    {/* Meta grid */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-[#f8fafc] rounded-lg text-sm">
                      <div>
                        <p className="text-xs text-[#64748b] mb-0.5">
                          Trang trại
                        </p>
                        <p className="font-medium text-[#1e293b]">
                          {detail?.farmName || selectedAssignment.area || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#64748b] mb-0.5">
                          Ngày thực hiện
                        </p>
                        <p className="font-medium text-[#1e293b]">
                          {selectedAssignment.displayDate}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#64748b] mb-0.5">Vuông</p>
                        <p className="font-medium text-[#1e293b]">
                          {detail?.plotName || selectedAssignment.area || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#64748b] mb-0.5">
                          Khung giờ
                        </p>
                        <p className="font-medium text-[#1e293b]">
                          {selectedAssignment.time || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#64748b] mb-0.5">Luống</p>
                        <p className="font-medium text-[#1e293b]">
                          {detail?.bedNames?.length
                            ? detail.bedNames.join(", ")
                            : selectedAssignment.plot || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#64748b] mb-0.5">Mùa vụ</p>
                        {selectedAssignment.seasonId ? (
                          <p className="font-medium text-[#1e293b]">
                            {mockSeasons.find(
                              (s) => s.id === selectedAssignment.seasonId,
                            )?.name ?? "—"}
                          </p>
                        ) : (
                          <p className="font-medium text-[#94a3b8]">—</p>
                        )}
                      </div>
                    </div>

                    {/* Assigned worker */}
                    <div className="p-3 bg-[#f0fdfa] rounded-lg border border-[#009689]/20">
                      <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Nhân viên phụ trách
                      </p>
                      {detail?.workerName ||
                      selectedAssignment.workerNames[0] ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#009689] flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {(
                              detail?.workerName ||
                              selectedAssignment.workerNames[0]
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-[#1e293b]">
                            {detail?.workerName ||
                              selectedAssignment.workerNames[0]}
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-[#94a3b8]">Chưa phân công</p>
                      )}
                    </div>

                    {/* Notes */}
                    {selectedAssignment.notes && (
                      <div className="p-3 bg-[#f8fafc] rounded-lg text-sm text-[#475569] border-l-4 border-[#009689]">
                        {selectedAssignment.notes}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setIsViewOpen(false);
                          setAssignmentToDelete(selectedAssignment);
                          setIsDeleteOpen(true);
                        }}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-4 h-4" /> Xoá
                      </button>
                      <button
                        onClick={() => setIsViewOpen(false)}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f73] transition-colors"
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
              Xác nhận xoá công việc
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-slate-600 mb-6">
              Xoá công việc{" "}
              <span className="font-semibold">
                "{assignmentToDelete?.taskName}"
              </span>{" "}
              tại{" "}
              <span className="font-semibold">{assignmentToDelete?.area}</span>{" "}
              ngày{" "}
              <span className="font-semibold">
                {assignmentToDelete?.displayDate}
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
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: selectedTpl.iconBg }}
                  >
                    <TaskIcon
                      type={selectedTpl.type}
                      className="w-5 h-5 text-[#475569]"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1e293b] text-sm">
                      {selectedTpl.name}
                    </p>
                    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f1f5f9] text-[#64748b]">
                      {selectedTpl.type}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-[#f8fafc] rounded-lg border border-[#e2e8f0] min-h-[60px]">
                  <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">
                    {selectedTpl.description || (
                      <span className="text-[#94a3b8] italic">
                        Không có mô tả
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
                    value={editTpl.name}
                    onChange={(e) =>
                      setEditTpl((p) =>
                        p ? { ...p, name: e.target.value } : p,
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Loại công việc <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editTpl.type}
                    onChange={(e) =>
                      setEditTpl((p) =>
                        p ? { ...p, type: e.target.value } : p,
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  >
                    {[...TASK_TYPES, ...customTaskTypes].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Ghi chú / Mô tả
                  </label>
                  <textarea
                    rows={3}
                    value={editTpl.description}
                    onChange={(e) =>
                      setEditTpl((p) =>
                        p ? { ...p, description: e.target.value } : p,
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
                    disabled={!editTpl.name || !editTpl.type}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f73] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Lưu
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
              <span className="font-semibold">"{tplToDelete?.name}"</span>? Hành
              động này không thể hoàn tác.
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
