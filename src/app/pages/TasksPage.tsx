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
  Users,
  Layers,
  GripVertical,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import {
  Staff,
  TaskTemplate,
  TaskAssignment,
  mockTaskTemplates,
  mockTaskAssignments,
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
const AREAS = ["Khu A", "Khu B", "Khu C", "Khu D", "Khu E"];

const PLOTS_BY_AREA: Record<string, string[]> = {
  "Khu A": ["Luống 01", "Luống 02", "Luống 03", "Luống 04", "Luống 05"],
  "Khu B": [
    "Luống 01",
    "Luống 02",
    "Luống 03",
    "Luống 04",
    "Luống 05",
    "Luống 06",
  ],
  "Khu C": ["Luống 01", "Luống 02", "Luống 03", "Luống 04"],
  "Khu D": ["Luống 01", "Luống 02", "Luống 03", "Luống 04", "Luống 05"],
  "Khu E": ["Luống 01", "Luống 02", "Luống 03"],
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

const ICON_MAP: Record<string, string> = {
  "Tưới nước": "💧",
  "Bón phân": "🌱",
  "Bảo vệ thực vật": "🛡️",
  "Thu hoạch": "🌾",
  "Kiểm tra": "🔍",
  "Chăm sóc": "🌿",
  Khác: "📋",
};
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

// ─── Types for bed groups ─────────────────────────────────────────────────────

interface BedGroup {
  id: string;
  plots: string[];
  workerIds: string[];
}

interface AreaSelection {
  area: string;
  groups: BedGroup[];
}

// Snapshot stored per-assignment to retain group→worker mapping for display
interface BedGroupSnapshot {
  label: string; // "Nhóm 1"
  plots: string[];
  workerNames: string[];
}

// ─── Bed Group Editor ─────────────────────────────────────────────────────────

const GROUP_COLORS = [
  { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" },
  { bg: "#dcfce7", text: "#166534", border: "#86efac" },
  { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  { bg: "#f3e8ff", text: "#6b21a8", border: "#d8b4fe" },
  { bg: "#ffe4e6", text: "#9f1239", border: "#fca5a5" },
];

interface BedGroupEditorProps {
  area: string;
  groups: BedGroup[];
  staffList: Staff[];
  onGroupsChange: (groups: BedGroup[]) => void;
}

function BedGroupEditor({
  area,
  groups,
  staffList,
  onGroupsChange,
}: BedGroupEditorProps) {
  const allPlots = PLOTS_BY_AREA[area] ?? [];
  const assignedPlots = groups.flatMap((g) => g.plots);
  const unassigned = allPlots.filter((p) => !assignedPlots.includes(p));

  const addGroup = () => {
    onGroupsChange([
      ...groups,
      { id: `grp-${Date.now()}`, plots: [], workerIds: [] },
    ]);
  };

  const removeGroup = (gid: string) =>
    onGroupsChange(groups.filter((g) => g.id !== gid));

  const togglePlotInGroup = (gid: string, plot: string) => {
    onGroupsChange(
      groups.map((g) => {
        if (g.id !== gid) return g;
        return {
          ...g,
          plots: g.plots.includes(plot)
            ? g.plots.filter((p) => p !== plot)
            : [...g.plots, plot],
        };
      }),
    );
  };

  const toggleWorkerInGroup = (gid: string, wid: string) => {
    onGroupsChange(
      groups.map((g) => {
        if (g.id !== gid) return g;
        return {
          ...g,
          workerIds: g.workerIds.includes(wid)
            ? g.workerIds.filter((w) => w !== wid)
            : [...g.workerIds, wid],
        };
      }),
    );
  };

  return (
    <div className="space-y-3">
      {groups.map((group, gi) => {
        const col = GROUP_COLORS[gi % GROUP_COLORS.length];
        // Available plots = unassigned + already in this group
        const availablePlots = [...group.plots, ...unassigned].filter(
          (v, i, a) => a.indexOf(v) === i,
        );

        return (
          <div
            key={group.id}
            className="rounded-xl border-2 overflow-hidden"
            style={{ borderColor: col.border, background: col.bg + "44" }}
          >
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{ background: col.bg }}
            >
              <div className="flex items-center gap-2">
                <GripVertical
                  className="w-3.5 h-3.5"
                  style={{ color: col.text }}
                />
                <span
                  className="text-xs font-bold uppercase tracking-wide"
                  style={{ color: col.text }}
                >
                  Nhóm {gi + 1}
                </span>
                {group.plots.length > 0 && (
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      background: col.text + "20",
                      color: col.text,
                    }}
                  >
                    {group.plots.length} luống
                  </span>
                )}
              </div>
              <button
                onClick={() => removeGroup(group.id)}
                className="p-1 rounded hover:bg-black/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" style={{ color: col.text }} />
              </button>
            </div>

            <div className="px-3 py-2.5 space-y-3">
              {/* Luống selector */}
              <div>
                <p className="text-xs text-[#64748b] font-medium mb-1.5 flex items-center gap-1">
                  <Layers className="w-3 h-3" /> Luống trong nhóm
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {availablePlots.map((plot) => {
                    const sel = group.plots.includes(plot);
                    return (
                      <button
                        key={plot}
                        onClick={() => togglePlotInGroup(group.id, plot)}
                        className="px-2 py-0.5 rounded-md text-xs font-medium border transition-all"
                        style={
                          sel
                            ? {
                                background: col.bg,
                                color: col.text,
                                borderColor: col.border,
                                fontWeight: 700,
                              }
                            : {
                                background: "#f8fafc",
                                color: "#64748b",
                                borderColor: "#e2e8f0",
                              }
                        }
                      >
                        {plot}
                        {sel && " ✓"}
                      </button>
                    );
                  })}
                  {availablePlots.length === 0 && (
                    <span className="text-xs text-[#94a3b8]">
                      Không còn luống trống
                    </span>
                  )}
                </div>
              </div>

              {/* Worker selector */}
              <div>
                <p className="text-xs text-[#64748b] font-medium mb-1.5 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Nhân viên phụ trách
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {staffList
                    .filter((s) => s.status !== "off")
                    .map((s) => {
                      const sel = group.workerIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => toggleWorkerInGroup(group.id, s.id)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border transition-all"
                          style={
                            sel
                              ? {
                                  background: col.bg,
                                  color: col.text,
                                  borderColor: col.border,
                                  fontWeight: 700,
                                }
                              : {
                                  background: "#f8fafc",
                                  color: "#64748b",
                                  borderColor: "#e2e8f0",
                                }
                          }
                        >
                          <span
                            className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold shrink-0"
                            style={{ background: s.color }}
                          >
                            {s.initials[0]}
                          </span>
                          {s.name}
                          {s.status === "busy" && (
                            <span className="text-[#f59e0b] text-[10px]">
                              ●
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Unassigned beds notice */}
      {unassigned.length > 0 && groups.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-[#94a3b8]">Chưa phân nhóm:</span>
          {unassigned.map((p) => (
            <span
              key={p}
              className="text-xs px-2 py-0.5 bg-[#f1f5f9] text-[#64748b] rounded-md border border-[#e2e8f0]"
            >
              {p}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={addGroup}
        className="w-full py-2 rounded-xl border-2 border-dashed border-[#009689]/40 text-sm font-medium text-[#009689] hover:border-[#009689] hover:bg-[#f0fdfa] transition-all flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Thêm nhóm luống
      </button>
    </div>
  );
}

// ─── Area Card ────────────────────────────────────────────────────────────────

interface AreaCardProps {
  sel: AreaSelection;
  staffList: Staff[];
  onGroupsChange: (groups: BedGroup[]) => void;
  onRemove: () => void;
}

function AreaCard({ sel, staffList, onGroupsChange, onRemove }: AreaCardProps) {
  const [expanded, setExpanded] = useState(true);
  const totalPlots = sel.groups.reduce((a, g) => a + g.plots.length, 0);
  const totalWorkers = new Set(sel.groups.flatMap((g) => g.workerIds)).size;

  return (
    <div className="rounded-xl border border-[#e2e8f0] overflow-hidden bg-white shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3 bg-[#f8fafc] border-b border-[#e2e8f0]">
        <button
          onClick={() => setExpanded((p) => !p)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          <MapPin className="w-4 h-4 text-[#009689] shrink-0" />
          <span className="text-sm font-semibold text-[#1e293b]">
            {sel.area}
          </span>
          <span className="text-xs text-[#94a3b8] ml-auto shrink-0">
            {totalPlots}/{PLOTS_BY_AREA[sel.area]?.length ?? 0} luống ·{" "}
            {totalWorkers} NV
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-[#64748b] shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#64748b] shrink-0" />
          )}
        </button>
        <button
          onClick={onRemove}
          className="ml-1 p-1 text-[#94a3b8] hover:text-red-500 rounded transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {expanded && (
        <div className="px-4 py-3">
          <BedGroupEditor
            area={sel.area}
            groups={sel.groups}
            staffList={staffList}
            onGroupsChange={onGroupsChange}
          />
        </div>
      )}
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
  assignments: TaskAssignment[];
  onTaskClick: (a: TaskAssignment) => void;
}) {
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
        {assignments.map((a) => (
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
                <span className="text-sm leading-none mt-0.5">
                  {a.taskIcon}
                </span>
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
    date: "",
    startHour: "07",
    startMinute: "00",
    endHour: "09",
    endMinute: "00",
    notes: "",
  });

  // Multi-area + bed group selections
  const [areaSelections, setAreaSelections] = useState<AreaSelection[]>([]);
  const [areaPickerOpen, setAreaPickerOpen] = useState(false);

  // Stores per-group worker breakdown keyed by assignment id
  const [bedGroupsMap, setBedGroupsMap] = useState<
    Record<string, BedGroupSnapshot[]>
  >({});

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
    const matchedArea =
      AREAS.find((a) => a.toLowerCase() === prefill.area.toLowerCase()) ?? "";

    setNewAssignment((p) => ({
      ...p,
      templateId: matchedTemplate?.id ?? "",
      notes: prefill.notes,
    }));

    if (matchedArea) {
      setAreaSelections([
        {
          area: matchedArea,
          groups: [{ id: `grp-prefill`, plots: [], workerIds: [] }],
        },
      ]);
    }

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
        icon: ICON_MAP[newTemplate.type] ?? "📋",
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
              icon: ICON_MAP[editTpl.type] ?? editTpl.icon,
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

  const handleCreateAssignment = () => {
    const tpl = templates.find((t) => t.id === newAssignment.templateId);
    if (!tpl || areaSelections.length === 0 || !newAssignment.date) return;

    const timeStr = `${newAssignment.startHour}:${newAssignment.startMinute} - ${newAssignment.endHour}:${newAssignment.endMinute}`;

    const newGroupEntries: Record<string, BedGroupSnapshot[]> = {};

    const newItems: TaskAssignment[] = areaSelections.map((sel) => {
      const allWorkerIds = [...new Set(sel.groups.flatMap((g) => g.workerIds))];
      const workers = allWorkerIds
        .map((id) => staffList.find((s) => s.id === id))
        .filter(Boolean) as Staff[];

      const plotStr = sel.groups
        .filter((g) => g.plots.length > 0)
        .map((g, i) => `Nhóm ${i + 1}: ${g.plots.join(", ")}`)
        .join(" | ");

      const id = `asgn-${Date.now()}-${sel.area}`;

      // Build per-group snapshot with worker names
      const groupSnapshots: BedGroupSnapshot[] = sel.groups
        .filter((g) => g.plots.length > 0 || g.workerIds.length > 0)
        .map((g, i) => ({
          label: `Nhóm ${i + 1}`,
          plots: g.plots,
          workerNames: g.workerIds
            .map((wid) => staffList.find((s) => s.id === wid)?.name ?? wid)
            .filter(Boolean),
        }));

      newGroupEntries[id] = groupSnapshots;

      return {
        id,
        templateId: tpl.id,
        taskName: tpl.name,
        taskIcon: tpl.icon,
        taskIconBg: tpl.iconBg,
        area: sel.area,
        plot: plotStr,
        date: newAssignment.date,
        displayDate: isoToDisplay(newAssignment.date),
        time: timeStr,
        workerIds: allWorkerIds,
        workerNames: workers.map((w) => w.name),
        status: "pending" as const,
        notes: newAssignment.notes,
      };
    });

    setAssignments((prev) => [...prev, ...newItems]);
    setBedGroupsMap((prev) => ({ ...prev, ...newGroupEntries }));
    setNewAssignment({
      templateId: "",
      date: "",
      startHour: "07",
      startMinute: "00",
      endHour: "09",
      endMinute: "00",
      notes: "",
    });
    setAreaSelections([]);
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

  const addAreaSelection = (area: string) => {
    if (areaSelections.find((s) => s.area === area)) return;
    setAreaSelections((prev) => [
      ...prev,
      {
        area,
        groups: [{ id: `grp-${Date.now()}`, plots: [], workerIds: [] }],
      },
    ]);
    setAreaPickerOpen(false);
  };

  const removeAreaSelection = (area: string) =>
    setAreaSelections((prev) => prev.filter((s) => s.area !== area));

  const updateAreaGroups = (area: string, groups: BedGroup[]) =>
    setAreaSelections((prev) =>
      prev.map((s) => (s.area === area ? { ...s, groups } : s)),
    );

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
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                              style={{ backgroundColor: tpl.iconBg }}
                            >
                              {tpl.icon}
                            </div>
                            <span className="text-sm font-medium text-[#1e293b]">
                              {tpl.name}
                            </span>
                          </div>
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
            setAreaSelections([]);
            setPrefillSource(null);
            setAreaPickerOpen(false);
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
                <select
                  value={newAssignment.templateId}
                  onChange={(e) =>
                    setNewAssignment((p) => ({
                      ...p,
                      templateId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                >
                  <option value="">-- Chọn công việc --</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.icon} {t.name} ({t.type})
                    </option>
                  ))}
                </select>
                {selectedTemplate && (
                  <p className="mt-2 text-xs text-[#64748b] bg-[#f8fafc] rounded-lg px-3 py-2 border border-[#e2e8f0]">
                    {selectedTemplate.description || "Không có mô tả"}
                  </p>
                )}
              </section>

              {/* ── 2. Date & Time ── */}
              <section>
                <h3 className="text-xs font-bold text-[#009689] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#009689] text-white text-[10px] flex items-center justify-center font-bold">
                    2
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

              {/* ── 3. Areas & Bed Groups ── */}
              <section>
                <h3 className="text-xs font-bold text-[#009689] uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#009689] text-white text-[10px] flex items-center justify-center font-bold">
                    3
                  </span>
                  Vuông, Luống &amp; Nhân viên
                </h3>
                <p className="text-xs text-[#94a3b8] mb-3 ml-6.5">
                  Chọn nhiều vuông, phân luống thành nhóm và giao nhân viên cho
                  từng nhóm.
                </p>

                <div className="space-y-3 mb-3">
                  {areaSelections.map((sel) => (
                    <AreaCard
                      key={sel.area}
                      sel={sel}
                      staffList={staffList}
                      onGroupsChange={(groups) =>
                        updateAreaGroups(sel.area, groups)
                      }
                      onRemove={() => removeAreaSelection(sel.area)}
                    />
                  ))}
                </div>

                <div className="relative">
                  <button
                    onClick={() => setAreaPickerOpen((p) => !p)}
                    className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#009689]/40 text-sm font-medium text-[#009689] hover:border-[#009689] hover:bg-[#f0fdfa] transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Thêm vuông
                  </button>
                  {areaPickerOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-[#e2e8f0] z-20 overflow-hidden">
                      {AREAS.filter(
                        (a) => !areaSelections.find((s) => s.area === a),
                      ).map((a) => (
                        <button
                          key={a}
                          onClick={() => addAreaSelection(a)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#f0fdfa] hover:text-[#009689] transition-colors flex items-center gap-2"
                        >
                          <MapPin className="w-3.5 h-3.5 text-[#009689]" />
                          {a}
                        </button>
                      ))}
                      {AREAS.every((a) =>
                        areaSelections.find((s) => s.area === a),
                      ) && (
                        <p className="text-xs text-[#94a3b8] text-center py-3">
                          Đã thêm tất cả vuông
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* ── 4. Notes ── */}
              <section>
                <h3 className="text-xs font-bold text-[#009689] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#009689] text-white text-[10px] flex items-center justify-center font-bold">
                    4
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
                  setAreaSelections([]);
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
                  areaSelections.length === 0 ||
                  !newAssignment.date
                }
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f73] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Giao việc
                {areaSelections.length > 0 && (
                  <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-md">
                    {areaSelections.length} vuông
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
                const groups = bedGroupsMap[selectedAssignment.id];
                const hasGroups = groups && groups.length > 0;
                const GROUP_COLORS = [
                  { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" },
                  { bg: "#dcfce7", text: "#166534", border: "#86efac" },
                  { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
                  { bg: "#f3e8ff", text: "#6b21a8", border: "#d8b4fe" },
                  { bg: "#ffe4e6", text: "#9f1239", border: "#fca5a5" },
                ];
                return (
                  <div className="space-y-4">
                    {/* Task header */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                        style={{
                          backgroundColor: selectedAssignment.taskIconBg,
                        }}
                      >
                        {selectedAssignment.taskIcon}
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

                    {/* Meta row */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-[#f8fafc] rounded-lg text-sm">
                      <div>
                        <p className="text-xs text-[#64748b] mb-0.5">Vuông</p>
                        <p className="font-medium text-[#1e293b]">
                          {selectedAssignment.area}
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
                      {selectedAssignment.time && (
                        <div className="col-span-2">
                          <p className="text-xs text-[#64748b] mb-0.5">
                            Khung giờ
                          </p>
                          <p className="font-medium text-[#1e293b]">
                            {selectedAssignment.time}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bed groups with workers */}
                    {hasGroups ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide">
                          Phân công nhóm luống
                        </p>
                        {groups.map((g, gi) => {
                          const col = GROUP_COLORS[gi % GROUP_COLORS.length];
                          return (
                            <div
                              key={gi}
                              className="rounded-xl border overflow-hidden"
                              style={{ borderColor: col.border }}
                            >
                              {/* Group label bar */}
                              <div
                                className="px-3 py-1.5 flex items-center gap-2"
                                style={{ background: col.bg }}
                              >
                                <span
                                  className="text-xs font-bold"
                                  style={{ color: col.text }}
                                >
                                  {g.label}
                                </span>
                              </div>
                              <div className="px-3 py-2 grid grid-cols-2 gap-2 bg-white">
                                {/* Plots */}
                                <div>
                                  <p className="text-[10px] text-[#94a3b8] uppercase tracking-wide mb-1 flex items-center gap-1">
                                    <Layers className="w-2.5 h-2.5" /> Luống
                                  </p>
                                  {g.plots.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {g.plots.map((p) => (
                                        <span
                                          key={p}
                                          className="px-1.5 py-0.5 rounded text-[11px] font-medium"
                                          style={{
                                            background: col.bg,
                                            color: col.text,
                                          }}
                                        >
                                          {p}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-[#94a3b8]">
                                      —
                                    </span>
                                  )}
                                </div>
                                {/* Workers */}
                                <div>
                                  <p className="text-[10px] text-[#94a3b8] uppercase tracking-wide mb-1 flex items-center gap-1">
                                    <Users className="w-2.5 h-2.5" /> Nhân viên
                                  </p>
                                  {g.workerNames.length > 0 ? (
                                    <div className="flex flex-col gap-0.5">
                                      {g.workerNames.map((n) => (
                                        <span
                                          key={n}
                                          className="text-xs text-[#1e293b] font-medium"
                                        >
                                          {n}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-[#94a3b8]">
                                      Chưa phân công
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : /* Fallback for legacy assignments without group data */
                    selectedAssignment.plot ||
                      selectedAssignment.workerNames.length > 0 ? (
                      <div className="p-3 bg-[#f8fafc] rounded-lg space-y-2">
                        {selectedAssignment.plot && (
                          <div>
                            <p className="text-xs text-[#64748b] mb-0.5">
                              Nhóm luống
                            </p>
                            <p className="text-sm text-[#1e293b] font-medium leading-relaxed">
                              {selectedAssignment.plot}
                            </p>
                          </div>
                        )}
                        {selectedAssignment.workerNames.length > 0 && (
                          <div>
                            <p className="text-xs text-[#64748b] mb-1">
                              Nhân viên
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {selectedAssignment.workerNames.map((n, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-[#f1f5f9] text-[#475569] rounded text-xs"
                                >
                                  {n}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Notes */}
                    {selectedAssignment.notes && (
                      <div className="p-3 bg-[#f8fafc] rounded-lg text-sm text-[#475569] border-l-4 border-[#009689]">
                        {selectedAssignment.notes}
                      </div>
                    )}

                    <button
                      onClick={() => setIsViewOpen(false)}
                      className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f73] transition-colors"
                    >
                      Đóng
                    </button>
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
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: selectedTpl.iconBg }}
                  >
                    {selectedTpl.icon}
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
