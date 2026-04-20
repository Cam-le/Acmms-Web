import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router";
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

/**
 * Extract HH:MM directly from an ISO datetime string returned by the backend.
 * The backend always stores times as UTC (Z-suffixed) but the values it saves
 * are the literal local times the user entered — so we read the raw digits
 * instead of letting new Date() shift them by the browser timezone offset.
 * "2026-04-13T07:00:00.000Z" → "07:00"
 */
function isoTime(iso: string): string {
  if (!iso) return "";
  const t = iso.indexOf("T");
  if (t === -1) return "";
  return iso.slice(t + 1, t + 6);
}

/**
 * Extract DD/MM/YYYY directly from an ISO datetime string.
 * "2026-04-13T07:00:00.000Z" → "13/04/2026"
 */
function isoDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Sort beds by the leading number in their name.
 * "Luống 08_Vuông 01_Tây Nam" → key = 8
 * Falls back to full string comparison for names that don't match.
 */
function bedSortKey(bedName: string): number {
  const m = bedName.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : Infinity;
}
function sortBeds<T extends { bedName: string }>(beds: T[]): T[] {
  return [...beds].sort((a, b) => {
    const diff = bedSortKey(a.bedName) - bedSortKey(b.bedName);
    return diff !== 0 ? diff : a.bedName.localeCompare(b.bedName);
  });
}

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

// ─── Inline Time Range Input ─────────────────────────────────────────────────
// Two native <input type="time"> for direct keyboard entry.

interface InlineTimeRangeProps {
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  onChange: (sh: string, sm: string, eh: string, em: string) => void;
}

function InlineTimeRange({
  startHour,
  startMinute,
  endHour,
  endMinute,
  onChange,
}: InlineTimeRangeProps) {
  const parseTimeInput = (val: string) => {
    const [h = "00", m = "00"] = val.split(":");
    return { h: h.padStart(2, "0"), m: m.padStart(2, "0") };
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-1">
          Bắt đầu
        </p>
        <input
          type="time"
          value={`${startHour}:${startMinute}`}
          onChange={(e) => {
            const { h, m } = parseTimeInput(e.target.value);
            onChange(h, m, endHour, endMinute);
          }}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
        />
      </div>
      <span className="text-[#94a3b8] font-bold mt-5">–</span>
      <div className="flex-1">
        <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-1">
          Kết thúc
        </p>
        <input
          type="time"
          value={`${endHour}:${endMinute}`}
          onChange={(e) => {
            const { h, m } = parseTimeInput(e.target.value);
            onChange(startHour, startMinute, h, m);
          }}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
        />
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
  isEditMode,
  onEditClick,
  onDeleteClick,
  style,
}: {
  day: Date;
  dayLabel: string;
  isToday: boolean;
  assignments: TaskDetailResponse[];
  onTaskClick: (a: TaskDetailResponse) => void;
  isEditMode: boolean;
  onEditClick: (a: TaskDetailResponse) => void;
  onDeleteClick: (a: TaskDetailResponse) => void;
  style?: React.CSSProperties;
}) {
  const [showAll, setShowAll] = useState(false);
  // Raw YYYY-MM-DD for this cell — used for multi-day span detection
  const cellDay = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  const MAX_VISIBLE = 3;
  const visible = showAll ? assignments : assignments.slice(0, MAX_VISIBLE);
  const overflow = assignments.length - MAX_VISIBLE;

  return (
    <div
      style={style}
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
          const taskStartDay = a.startDate?.slice(0, 10) ?? "";
          const taskEndDay = a.endDate?.slice(0, 10) ?? taskStartDay;
          const isMultiDay = taskEndDay !== taskStartDay;
          const isFirstDay = cellDay === taskStartDay;
          const isLastDay = cellDay === taskEndDay;
          const isMidDay = isMultiDay && !isFirstDay && !isLastDay;
          const timeStr = isoTime(a.startDate);
          const spanBadge = isMultiDay
            ? isFirstDay
              ? `→ ${isoDate(a.endDate)}`
              : isLastDay
                ? `← ${isoDate(a.startDate)}`
                : `${isoDate(a.startDate)} → ${isoDate(a.endDate)}`
            : null;
          const borderColor = isEditMode
            ? "#f59e0b"
            : isMultiDay && !isFirstDay
              ? "#7c3aed"
              : "#009689";

          if (isEditMode) {
            return (
              <div
                key={a.taskDetailId}
                className="w-full rounded-lg overflow-hidden shadow-sm"
                style={{ borderLeft: `3px solid ${borderColor}` }}
              >
                <div className="bg-white px-2 py-1.5">
                  <p className="text-[11px] font-semibold text-[#1e293b] line-clamp-2 leading-tight mb-1.5">
                    {a.taskTitle}
                  </p>
                  {spanBadge && (
                    <p className="text-[9px] text-[#7c3aed] font-medium mb-1">
                      {spanBadge}
                    </p>
                  )}
                  {timeStr && isFirstDay && (
                    <div className="flex items-center gap-1 mb-1.5">
                      <Clock className="w-2.5 h-2.5 text-[#94a3b8] shrink-0" />
                      <span className="text-[10px] text-[#64748b]">
                        {timeStr}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-1">
                    <button
                      onClick={() => onEditClick(a)}
                      className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-semibold bg-[#f0fdfa] text-[#009689] hover:bg-[#ccfbf1] transition-colors"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                      Sửa
                    </button>
                    <button
                      onClick={() => onDeleteClick(a)}
                      className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      Xoá
                    </button>
                  </div>
                </div>
              </div>
            );
          }
          return (
            <button
              key={a.taskDetailId}
              onClick={() => onTaskClick(a)}
              className="w-full text-left rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all"
              style={{ borderLeft: `3px solid ${borderColor}` }}
            >
              <div
                className={`px-2 py-1.5 ${isMidDay ? "bg-[#faf5ff]" : "bg-white"}`}
              >
                <p className="text-[11px] font-semibold text-[#1e293b] line-clamp-2 leading-tight">
                  {a.taskTitle}
                </p>
                {spanBadge && (
                  <p className="text-[9px] text-[#7c3aed] font-medium mt-0.5">
                    {spanBadge}
                  </p>
                )}
                {timeStr && isFirstDay && (
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-2.5 h-2.5 text-[#94a3b8] shrink-0" />
                    <span className="text-[10px] text-[#64748b]">
                      {timeStr}
                    </span>
                  </div>
                )}
                {a.bedIds.length > 0 && isFirstDay && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="w-2.5 h-2.5 text-[#94a3b8] shrink-0" />
                    <span className="text-[10px] text-[#64748b] truncate">
                      {a.bedIds.length} luống
                    </span>
                  </div>
                )}
                {a.assignedToWorkerIds.length > 0 && isFirstDay && (
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

// ─── Worker Schedule Preview ──────────────────────────────────────────────────

/**
 * Shows a worker's existing task schedule as a weekly grid.
 * Each day cell lists task time blocks as simple labelled pills.
 * Uses raw ISO digit slices throughout — never Date() — to avoid UTC shifts.
 */
function WorkerSchedulePreview({
  workerId,
  fromDate,
  toDate,
  taskDetails,
  staffList,
}: {
  workerId: string;
  fromDate: string;
  toDate: string;
  taskDetails: TaskDetailResponse[];
  staffList: UserResponse[];
}) {
  const DAY_HDRS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  // Safe date iteration using string arithmetic (avoids UTC midnight shift).
  const addOneDayStr = (dateStr: string) => {
    const d = new Date(`${dateStr}T12:00:00`);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Build ordered list of YYYY-MM-DD strings in [fromDate, toDate] (max 42).
  const days: string[] = [];
  let cur = fromDate;
  while (cur <= toDate && days.length < 42) {
    days.push(cur);
    cur = addOneDayStr(cur);
  }

  // Group tasks by every day they cover (raw string range check).
  const byDate: Record<string, TaskDetailResponse[]> = {};
  taskDetails
    .filter((d) => d.assignedToWorkerIds.includes(workerId))
    .forEach((d) => {
      if (!d.startDate) return;
      const s = d.startDate.slice(0, 10);
      const e = (d.endDate ?? d.startDate).slice(0, 10);
      let c = s;
      while (c <= e) {
        if (!byDate[c]) byDate[c] = [];
        if (!byDate[c].find((x) => x.taskDetailId === d.taskDetailId))
          byDate[c].push(d);
        c = addOneDayStr(c);
      }
    });

  // Pad to Monday-aligned week grid.
  // Compute day-of-week for fromDate without Date() ambiguity.
  const firstDate = new Date(`${fromDate}T12:00:00`);
  const dow0 = firstDate.getDay(); // 0=Sun
  const padBefore = dow0 === 0 ? 6 : dow0 - 1;
  const padded: (string | null)[] = [...Array(padBefore).fill(null), ...days];
  while (padded.length % 7 !== 0) padded.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  const workerName =
    staffList.find((s) => s.userId === workerId)?.fullname ?? "";
  const todayKey = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  })();

  const busyDays = days.filter((d) => (byDate[d]?.length ?? 0) > 0).length;

  // Format raw ISO digits to HH:MM label.
  const fmtTime = (iso: string) => `${iso.slice(11, 13)}:${iso.slice(14, 16)}`;

  return (
    <div className="rounded-lg border border-[#e2e8f0] overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#f8fafc] border-b border-[#e2e8f0]">
        <span className="text-xs font-semibold text-[#475569]">
          Lịch bận của <span className="text-[#009689]">{workerName}</span>
        </span>
        {busyDays > 0 ? (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
            {busyDays} ngày bận
          </span>
        ) : (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f0fdfa] text-[#009689] border border-[#009689]/20 font-medium">
            Không có lịch bận
          </span>
        )}
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-[#e2e8f0]">
        {DAY_HDRS.map((h) => (
          <div
            key={h}
            className="py-1 text-center text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]"
          >
            {h}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div className="max-h-[280px] overflow-y-auto">
        {weeks.map((week, wi) => (
          <div
            key={wi}
            className="grid grid-cols-7 border-b border-[#f1f5f9] last:border-b-0"
          >
            {week.map((dayStr, di) => {
              if (!dayStr) {
                return (
                  <div
                    key={di}
                    className="min-h-[64px] bg-[#fafafa] border-r border-[#f1f5f9] last:border-r-0"
                  />
                );
              }
              const tasks = byDate[dayStr] ?? [];
              const isBusy = tasks.length > 0;
              const isToday = dayStr === todayKey;
              const dayNum = parseInt(dayStr.slice(8), 10);

              return (
                <div
                  key={di}
                  className={`min-h-[64px] border-r border-[#f1f5f9] last:border-r-0 p-1 flex flex-col gap-1 ${isBusy ? "bg-amber-50/40" : ""}`}
                >
                  {/* Day number */}
                  <div className="flex justify-center">
                    <span
                      className="text-[10px] font-semibold w-5 h-5 flex items-center justify-center rounded-full leading-none"
                      style={
                        isToday
                          ? { background: "#009689", color: "#fff" }
                          : isBusy
                            ? { color: "#92400e" }
                            : { color: "#cbd5e1" }
                      }
                    >
                      {dayNum}
                    </span>
                  </div>

                  {/* Task pills */}
                  {tasks.map((t) => (
                    <div
                      key={t.taskDetailId}
                      title={t.taskTitle ?? "Công việc"}
                      className="rounded px-1 py-0.5 text-[9px] font-semibold text-center leading-tight truncate"
                      style={{
                        background: "rgba(245,158,11,0.15)",
                        border: "1px solid #f59e0b",
                        color: "#92400e",
                      }}
                    >
                      {fmtTime(t.startDate)}–{fmtTime(t.endDate)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TasksPage() {
  const [activeTab, setActiveTab] = useState<"schedule" | "allTasks" | "tasks">(
    "schedule",
  );

  // ── API data ─────────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [taskDetails, setTaskDetails] = useState<TaskDetailResponse[]>([]);
  const [seasons, setSeasons] = useState<SeasonResponse[]>([]);
  const [allBeds, setAllBeds] = useState<BedResponse[]>([]);
  const [allPlots, setAllPlots] = useState<PlotResponse[]>([]);
  const [staffList, setStaffList] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI
  const [isCalendarEditMode, setIsCalendarEditMode] = useState(false);

  // Calendar filter (worker + date range)
  const [calWorkerFilter, setCalWorkerFilter] = useState("");
  const [calFromDate, setCalFromDate] = useState(() => {
    const d = new Date();
    const dow = d.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    return mon.toISOString().slice(0, 10);
  });
  const [calToDate, setCalToDate] = useState(() => {
    const d = new Date();
    const dow = d.getDay();
    const diff = dow === 0 ? 0 : 7 - dow;
    const sun = new Date(d);
    sun.setDate(d.getDate() + diff);
    return sun.toISOString().slice(0, 10);
  });

  // All-tasks table
  const [allTasksSearch, setAllTasksSearch] = useState("");
  const [allTasksWorkerFilter, setAllTasksWorkerFilter] = useState("");
  const [allTasksStatusFilter, setAllTasksStatusFilter] = useState("");
  const [allTasksPage, setAllTasksPage] = useState(1);
  const ALL_TASKS_PER_PAGE = 8;

  // Modals
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditDetailOpen, setIsEditDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] =
    useState<TaskDetailResponse | null>(null);
  const [detailToDelete, setDetailToDelete] =
    useState<TaskDetailResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-open "Thêm công việc" modal when navigated from Advisory page
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("openCreateTask") === "true") {
      const description = searchParams.get("description") ?? "";
      setNewTemplate((p) => ({ ...p, description }));
      setActiveTab("tasks");
      setIsCreateTemplateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, []);

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

  // ── Assign modal: mode + shared state ────────────────────────────────────
  const [assignMode, setAssignMode] = useState<"bulk" | "single">("bulk");

  // Bulk form
  const WEEKDAY_MAP: Record<string, number> = {
    T2: 1,
    T3: 2,
    T4: 3,
    T5: 4,
    T6: 5,
    T7: 6,
    CN: 0,
  };
  const [bulkForm, setBulkForm] = useState({
    workerId: "",
    taskId: "",
    seasonId: "",
    plotId: "",
    bedIds: [] as string[],
    fromDate: "",
    toDate: "",
    selectedDays: ["T2", "T3", "T4", "T5", "T6"] as string[],
    startHour: "07",
    startMinute: "00",
    endHour: "09",
    endMinute: "00",
    notes: "",
  });

  // Single form
  const [singleForm, setSingleForm] = useState({
    workerId: "",
    taskId: "",
    seasonId: "",
    plotId: "",
    bedIds: [] as string[],
    // used in same-day mode
    date: "",
    startHour: "07",
    startMinute: "00",
    endHour: "09",
    endMinute: "00",
    notes: "",
    // multi-day mode
    isMultiDay: false,
    multiStartDate: "",
    multiStartHour: "07",
    multiStartMinute: "00",
    multiEndDate: "",
    multiEndHour: "17",
    multiEndMinute: "00",
  });
  const [singleConflict, setSingleConflict] = useState<string[]>([]);

  // Derived: beds available for a given seasonId + plotId
  const getBedsForPlot = (seasonId: string, plotId: string) => {
    if (!seasonId || !plotId) return [];
    const season = seasons.find((s) => s.seasonId === seasonId);
    if (!season) return [];
    const seasonBedIds = new Set(season.seasonsDetails.map((sd) => sd.bedId));
    return allBeds.filter(
      (b) => seasonBedIds.has(b.bedId) && b.plotId === plotId,
    );
  };

  const getPlotsForSeason = (seasonId: string) => {
    if (!seasonId) return [];
    const season = seasons.find((s) => s.seasonId === seasonId);
    if (!season) return [];
    const seasonBedIds = new Set(season.seasonsDetails.map((sd) => sd.bedId));
    const plotIds = new Set(
      allBeds.filter((b) => seasonBedIds.has(b.bedId)).map((b) => b.plotId),
    );
    return allPlots.filter((p) => plotIds.has(p.plotId));
  };

  // Bulk preview count
  const bulkPreviewCount = (() => {
    if (!bulkForm.fromDate || !bulkForm.toDate || !bulkForm.selectedDays.length)
      return 0;
    const from = new Date(bulkForm.fromDate);
    const to = new Date(bulkForm.toDate);
    if (from > to) return 0;
    const selSet = new Set(bulkForm.selectedDays.map((d) => WEEKDAY_MAP[d]));
    let count = 0;
    const cur = new Date(from);
    while (cur <= to) {
      if (selSet.has(cur.getDay())) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  })();

  // Single conflict check (against existing mock taskDetails)
  const checkSingleConflict = (
    workerId: string,
    date: string,
    sh: string,
    sm: string,
    eh: string,
    em: string,
  ) => {
    if (!workerId || !date) {
      setSingleConflict([]);
      return;
    }
    const newStart = new Date(`${date}T${sh}:${sm}:00`).getTime();
    const newEnd = new Date(`${date}T${eh}:${em}:00`).getTime();
    const conflicts = taskDetails
      .filter((d) => {
        if (!d.assignedToWorkerIds.includes(workerId)) return false;
        if (!d.startDate || !d.endDate) return false;
        if (d.startDate.slice(0, 10) !== date) return false;
        const s = new Date(d.startDate).getTime();
        const e = new Date(d.endDate).getTime();
        return newStart < e && newEnd > s;
      })
      .map((d) => d.taskTitle ?? "Công việc khác");
    setSingleConflict(conflicts);
  };

  // Reset assign modal
  const resetAssignModal = () => {
    setBulkForm({
      workerId: "",
      taskId: "",
      seasonId: "",
      plotId: "",
      bedIds: [],
      fromDate: "",
      toDate: "",
      selectedDays: ["T2", "T3", "T4", "T5", "T6"],
      startHour: "07",
      startMinute: "00",
      endHour: "09",
      endMinute: "00",
      notes: "",
    });
    setSingleForm({
      workerId: "",
      taskId: "",
      seasonId: "",
      plotId: "",
      bedIds: [],
      date: "",
      startHour: "07",
      startMinute: "00",
      endHour: "09",
      endMinute: "00",
      notes: "",
      isMultiDay: false,
      multiStartDate: "",
      multiStartHour: "07",
      multiStartMinute: "00",
      multiEndDate: "",
      multiEndHour: "17",
      multiEndMinute: "00",
    });
    setSingleConflict([]);
    setAssignMode("bulk");
  };

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
      setTasks(
        (tasksRes ?? []).sort(
          (a, b) =>
            new Date(a.taskCreatedAt).getTime() -
            new Date(b.taskCreatedAt).getTime(),
        ),
      );
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

  // ── Submit handlers for bulk + single assign ─────────────────────────────

  const handleSubmitBulk = async () => {
    const {
      workerId,
      taskId,
      seasonId,
      bedIds,
      fromDate,
      toDate,
      selectedDays,
      startHour,
      startMinute,
      endHour,
      endMinute,
      notes,
    } = bulkForm;
    if (
      !workerId ||
      !taskId ||
      !seasonId ||
      !bedIds.length ||
      !fromDate ||
      !toDate ||
      !selectedDays.length
    )
      return;

    const selSet = new Set(selectedDays.map((d) => WEEKDAY_MAP[d]));
    const plotIds = Array.from(
      new Set(
        bedIds
          .map((bid) => allBeds.find((b) => b.bedId === bid)?.plotId)
          .filter(Boolean) as string[],
      ),
    );
    const farmId =
      allPlots.find((p) => plotIds.includes(p.plotId))?.farmId ?? "";

    // Collect all matching dates in the range
    const dates: string[] = [];
    const cur = new Date(fromDate);
    const end = new Date(toDate);
    while (cur <= end) {
      if (selSet.has(cur.getDay())) dates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }

    const bulkStartMins = parseInt(startHour) * 60 + parseInt(startMinute);
    const bulkEndMins = parseInt(endHour) * 60 + parseInt(endMinute);
    if (bulkEndMins <= bulkStartMins) return;
    if (fromDate > toDate) return;

    setIsSaving(true);
    try {
      await Promise.all(
        dates.map((dateStr) =>
          api.createTaskDetail({
            taskId,
            seasonId,
            farmId,
            assignedToWorkerIds: [workerId],
            bedIds,
            plotIds,
            startDate: `${dateStr}T${startHour}:${startMinute}:00.000Z`,
            endDate: `${dateStr}T${endHour}:${endMinute}:00.000Z`,
            notes,
            status: "Pending",
          }),
        ),
      );
      await loadAllData();
      resetAssignModal();
      setIsAssignOpen(false);
    } catch (err) {
      console.error("Failed to create bulk task details:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitSingle = async () => {
    const {
      workerId,
      taskId,
      seasonId,
      bedIds,
      notes,
      isMultiDay,
      date,
      startHour,
      startMinute,
      endHour,
      endMinute,
      multiStartDate,
      multiStartHour,
      multiStartMinute,
      multiEndDate,
      multiEndHour,
      multiEndMinute,
    } = singleForm;
    if (!workerId || !taskId || !seasonId || !bedIds.length) return;

    const plotIds = Array.from(
      new Set(
        bedIds
          .map((bid) => allBeds.find((b) => b.bedId === bid)?.plotId)
          .filter(Boolean) as string[],
      ),
    );
    const farmId =
      allPlots.find((p) => plotIds.includes(p.plotId))?.farmId ?? "";

    let startISO: string;
    let endISO: string;

    if (isMultiDay) {
      if (!multiStartDate || !multiEndDate) return;
      if (multiEndDate < multiStartDate) return;
      if (
        multiEndDate === multiStartDate &&
        parseInt(multiEndHour) * 60 + parseInt(multiEndMinute) <=
          parseInt(multiStartHour) * 60 + parseInt(multiStartMinute)
      )
        return;
      startISO = `${multiStartDate}T${multiStartHour}:${multiStartMinute}:00.000Z`;
      endISO = `${multiEndDate}T${multiEndHour}:${multiEndMinute}:00.000Z`;
    } else {
      if (!date) return;
      const singleStartMins = parseInt(startHour) * 60 + parseInt(startMinute);
      const singleEndMins = parseInt(endHour) * 60 + parseInt(endMinute);
      if (singleEndMins <= singleStartMins) return;
      startISO = `${date}T${startHour}:${startMinute}:00.000Z`;
      endISO = `${date}T${endHour}:${endMinute}:00.000Z`;
    }

    setIsSaving(true);
    try {
      await api.createTaskDetail({
        taskId,
        seasonId,
        farmId,
        assignedToWorkerIds: [workerId],
        bedIds,
        plotIds,
        startDate: startISO,
        endDate: endISO,
        notes,
        status: "Pending",
      });
      await loadAllData();
      resetAssignModal();
      setIsAssignOpen(false);
    } catch (err) {
      console.error("Failed to create task detail:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!detailToDelete) return;
    setIsSaving(true);
    try {
      await api.deleteTaskDetail(detailToDelete.taskDetailId);
      await loadAllData();
    } catch (err) {
      // Mock fallback: remove from local state
      setTaskDetails((prev) =>
        prev.filter((d) => d.taskDetailId !== detailToDelete.taskDetailId),
      );
    } finally {
      setIsSaving(false);
    }
    setIsDeleteOpen(false);
    setDetailToDelete(null);
  };

  // ── Edit task detail ───────────────────────────────────────────────────────

  const [editDetail, setEditDetail] = useState<{
    taskId: string;
    seasonId: string;
    date: string;
    startHour: string;
    startMinute: string;
    endHour: string;
    endMinute: string;
    notes: string;
    workerId: string;
    status: string;
    bedIds: string[];
    plotIds: string[];
    selectedPlotIds: string[];
  } | null>(null);

  // Whether the "Lịch bận" schedule panel is expanded in the edit modal
  const [editShowSchedule, setEditShowSchedule] = useState(false);

  const openEditDetail = (detail: TaskDetailResponse) => {
    const dateStr = detail.startDate.slice(0, 10);
    const startH = detail.startDate.slice(11, 13);
    const startM = detail.startDate.slice(14, 16);
    const endH = detail.endDate.slice(11, 13);
    const endM = detail.endDate.slice(14, 16);
    // Derive which plots are selected from the bed list
    const plotIdsFromBeds = Array.from(
      new Set(
        detail.bedIds
          .map((bid) => allBeds.find((b) => b.bedId === bid)?.plotId)
          .filter(Boolean) as string[],
      ),
    );
    setEditDetail({
      taskId: detail.taskId,
      seasonId: detail.seasonId,
      date: dateStr,
      startHour: startH,
      startMinute: startM,
      endHour: endH,
      endMinute: endM,
      notes: detail.notes ?? "",
      workerId: detail.assignedToWorkerIds[0] ?? "",
      status: detail.status ?? "Active",
      bedIds: detail.bedIds,
      plotIds: detail.plotIds,
      selectedPlotIds: plotIdsFromBeds,
    });
    setIsEditDetailOpen(true);
  };

  const handleUpdateAssignment = async () => {
    if (!selectedDetail || !editDetail) return;
    const editStartMins =
      parseInt(editDetail.startHour) * 60 + parseInt(editDetail.startMinute);
    const editEndMins =
      parseInt(editDetail.endHour) * 60 + parseInt(editDetail.endMinute);
    if (editEndMins <= editStartMins) return;
    setIsSaving(true);
    try {
      const startISO = `${editDetail.date}T${editDetail.startHour}:${editDetail.startMinute}:00.000`;
      const endISO = `${editDetail.date}T${editDetail.endHour}:${editDetail.endMinute}:00.000`;
      // Derive plotIds from selected beds
      const plotIds = Array.from(
        new Set(
          editDetail.bedIds
            .map((bid) => allBeds.find((b) => b.bedId === bid)?.plotId)
            .filter(Boolean) as string[],
        ),
      );
      const farmId =
        allPlots.find((p) => plotIds.includes(p.plotId))?.farmId ?? "";
      await api.updateTaskDetail(selectedDetail.taskDetailId, {
        taskId: editDetail.taskId,
        seasonId: editDetail.seasonId,
        farmId,
        assignedToWorkerIds: [editDetail.workerId],
        bedIds: editDetail.bedIds,
        plotIds,
        startDate: startISO,
        endDate: endISO,
        notes: editDetail.notes,
      });
      await loadAllData();
    } catch (err) {
      console.error("Failed to update task detail:", err);
    } finally {
      setIsSaving(false);
    }
    setIsEditDetailOpen(false);
    setEditDetail(null);
    setIsViewOpen(false);
  };

  // ── All-tasks derived data ─────────────────────────────────────────────────
  const STATUS_SORT_ORDER: Record<string, number> = {
    Pending: 0,
    Completed: 1,
  };

  const allTasksFiltered = (() => {
    const q = allTasksSearch.toLowerCase();
    return taskDetails
      .filter((d) => {
        if (
          q &&
          !(d.taskTitle ?? "").toLowerCase().includes(q) &&
          !staffList
            .find((s) => s.userId === d.assignedToWorkerIds[0])
            ?.fullname.toLowerCase()
            .includes(q)
        )
          return false;
        if (
          allTasksWorkerFilter &&
          d.assignedToWorkerIds[0] !== allTasksWorkerFilter
        )
          return false;
        if (allTasksStatusFilter && d.status !== allTasksStatusFilter)
          return false;
        return true;
      })
      .sort((a, b) => {
        // Primary: status priority (Active → Pending → Completed → rest)
        const sa = STATUS_SORT_ORDER[a.status ?? ""] ?? 99;
        const sb = STATUS_SORT_ORDER[b.status ?? ""] ?? 99;
        if (sa !== sb) return sa - sb;
        // Secondary: most recent date first
        return (
          new Date(b.startDate ?? 0).getTime() -
          new Date(a.startDate ?? 0).getTime()
        );
      });
  })();

  const allTasksTotalPages = Math.max(
    1,
    Math.ceil(allTasksFiltered.length / ALL_TASKS_PER_PAGE),
  );
  const allTasksPageClamped = Math.min(allTasksPage, allTasksTotalPages);
  const allTasksSlice = allTasksFiltered.slice(
    (allTasksPageClamped - 1) * ALL_TASKS_PER_PAGE,
    allTasksPageClamped * ALL_TASKS_PER_PAGE,
  );

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
        <div className="flex items-center gap-3">
          {isLoading && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
              Đang tải...
            </span>
          )}
          <button
            onClick={() => setIsAssignOpen(true)}
            className="bg-[#009689] text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 hover:bg-[#007f73] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Giao việc
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <Tabs.List className="flex gap-6 border-b border-[#e2e8f0]">
          {[
            {
              value: "schedule",
              label: "Lịch theo nhân viên",
              icon: <Calendar className="w-4 h-4" />,
            },
            {
              value: "allTasks",
              label: "Tất cả công việc",
              icon: <List className="w-4 h-4" />,
            },
            {
              value: "tasks",
              label: "Mẫu công việc",
              icon: <ClipboardList className="w-4 h-4" />,
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

        {/* ══ TAB: LỊCH THEO NHÂN VIÊN ══ */}
        <Tabs.Content value="schedule" className="mt-6 space-y-4">
          {/* Filter bar */}
          <div className="bg-white rounded-[10px] p-4 shadow-sm border border-[#e2e8f0] flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#64748b]">
                Nhân viên
              </label>
              <select
                value={calWorkerFilter}
                onChange={(e) => setCalWorkerFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689] w-52"
              >
                <option value="">-- Chọn nhân viên --</option>
                {staffList
                  .filter((s) => s.roleName === "Worker")
                  .map((s) => (
                    <option key={s.userId} value={s.userId}>
                      {s.fullname}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#64748b]">
                Từ ngày
              </label>
              <input
                type="date"
                value={calFromDate}
                onChange={(e) => setCalFromDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#64748b]">
                Đến ngày
              </label>
              <input
                type="date"
                value={calToDate}
                onChange={(e) => setCalToDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {/* <button
                onClick={() => setIsCalendarEditMode((p) => !p)}
                className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 font-medium border transition-colors ${
                  isCalendarEditMode
                    ? "bg-amber-500 text-white border-amber-500 hover:bg-amber-600"
                    : "bg-white text-[#64748b] border-[#e2e8f0] hover:border-amber-400 hover:text-amber-600"
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                {isCalendarEditMode ? "Thoát chỉnh sửa" : "Chỉnh sửa lịch"}
              </button> */}
            </div>
          </div>

          {/* Validation / empty prompt */}
          {!calWorkerFilter ? (
            <div className="bg-white rounded-[10px] shadow-sm border border-[#e2e8f0] py-16 text-center text-[#94a3b8] text-sm">
              <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Chọn nhân viên và khoảng thời gian để xem lịch làm việc
            </div>
          ) : (
            (() => {
              const from = calFromDate ? new Date(calFromDate) : null;
              const to = calToDate ? new Date(calToDate) : null;
              if (!from || !to)
                return (
                  <div className="bg-white rounded-[10px] shadow-sm border border-[#e2e8f0] py-16 text-center text-[#94a3b8] text-sm">
                    Vui lòng chọn khoảng thời gian để hiển thị lịch
                  </div>
                );
              if (from > to)
                return (
                  <div className="bg-red-50 rounded-[10px] border border-red-200 py-6 text-center text-red-500 text-sm">
                    Ngày bắt đầu phải trước ngày kết thúc
                  </div>
                );
              const diffDays =
                Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
              if (diffDays > 42)
                return (
                  <div className="bg-amber-50 rounded-[10px] border border-amber-200 py-6 text-center text-amber-600 text-sm">
                    Khoảng thời gian tối đa hiển thị là 6 tuần. Vui lòng thu hẹp
                    phạm vi.
                  </div>
                );

              // Build calendar days from Monday of the week containing "from"
              // to Sunday of the week containing "to"
              const calStart = new Date(from);
              const startDow = calStart.getDay();
              calStart.setDate(
                calStart.getDate() + (startDow === 0 ? -6 : 1 - startDow),
              );

              const calEnd = new Date(to);
              const endDow = calEnd.getDay();
              if (endDow !== 0) calEnd.setDate(calEnd.getDate() + (7 - endDow));

              const calDays: Date[] = [];
              const cursor = new Date(calStart);
              while (cursor <= calEnd && calDays.length < 42) {
                calDays.push(new Date(cursor));
                cursor.setDate(cursor.getDate() + 1);
              }

              // Filter task details for this worker only
              const workerDetails = taskDetails.filter((d) =>
                d.assignedToWorkerIds.includes(calWorkerFilter),
              );

              const getAssignmentsForDay = (date: Date) => {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, "0");
                const d = String(date.getDate()).padStart(2, "0");
                const key = `${y}-${m}-${d}`;
                return workerDetails.filter((t) => {
                  if (!t.startDate) return false;
                  const start = t.startDate.slice(0, 10);
                  const end = (t.endDate ?? t.startDate).slice(0, 10);
                  return key >= start && key <= end;
                });
              };

              const selectedWorker = staffList.find(
                (s) => s.userId === calWorkerFilter,
              );
              const totalInRange = workerDetails.filter((d) => {
                if (!d.startDate) return false;
                const start = d.startDate.slice(0, 10);
                const end = (d.endDate ?? d.startDate).slice(0, 10);
                return start <= calToDate && end >= calFromDate;
              }).length;

              return (
                <>
                  {isCalendarEditMode && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-[10px] text-sm text-amber-700">
                      <Pencil className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>
                        Đang ở chế độ chỉnh sửa — nhấn{" "}
                        <span className="font-semibold">Sửa</span> hoặc{" "}
                        <span className="font-semibold">Xoá</span> trực tiếp
                        trên từng công việc.
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-[#64748b]">
                    <span className="font-semibold text-[#1e293b]">
                      {selectedWorker?.fullname ?? calWorkerFilter}
                    </span>{" "}
                    —{" "}
                    <span className="font-semibold text-[#009689]">
                      {totalInRange}
                    </span>{" "}
                    công việc trong khoảng thời gian đã chọn
                  </p>
                  {/* Calendar grid */}
                  <div className="bg-white rounded-[10px] shadow-sm border border-[#e2e8f0] overflow-hidden">
                    <div className="grid grid-cols-7 divide-x divide-[#f1f5f9]">
                      {DAY_LABELS.map((label) => (
                        <div
                          key={label}
                          className="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] bg-[#f8fafc] border-b border-[#f1f5f9]"
                        >
                          {label}
                        </div>
                      ))}
                      {calDays.map((day, idx) => {
                        const today = new Date();
                        const isToday =
                          day.getDate() === today.getDate() &&
                          day.getMonth() === today.getMonth() &&
                          day.getFullYear() === today.getFullYear();
                        const inRange =
                          day.toISOString().slice(0, 10) >= calFromDate &&
                          day.toISOString().slice(0, 10) <= calToDate;
                        return (
                          <CalendarDayCard
                            key={idx}
                            day={day}
                            dayLabel={DAY_LABELS[idx % 7]}
                            isToday={isToday}
                            assignments={getAssignmentsForDay(day)}
                            onTaskClick={(a) => {
                              setSelectedDetail(a);
                              setIsViewOpen(true);
                            }}
                            isEditMode={isCalendarEditMode}
                            onEditClick={(a) => {
                              setSelectedDetail(a);
                              openEditDetail(a);
                            }}
                            onDeleteClick={(a) => {
                              setDetailToDelete(a);
                              setIsDeleteOpen(true);
                            }}
                            style={!inRange ? { opacity: 0.35 } : undefined}
                          />
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()
          )}
        </Tabs.Content>

        {/* ══ TAB: TẤT CẢ CÔNG VIỆC ══ */}
        <Tabs.Content value="allTasks" className="mt-6 space-y-4">
          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Tìm tên công việc hoặc nhân viên..."
              value={allTasksSearch}
              onChange={(e) => {
                setAllTasksSearch(e.target.value);
                setAllTasksPage(1);
              }}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] w-72"
            />
            <select
              value={allTasksWorkerFilter}
              onChange={(e) => {
                setAllTasksWorkerFilter(e.target.value);
                setAllTasksPage(1);
              }}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689] w-52"
            >
              <option value="">Tất cả nhân viên</option>
              {staffList
                .filter((s) => s.roleName === "Worker")
                .map((s) => (
                  <option key={s.userId} value={s.userId}>
                    {s.fullname}
                  </option>
                ))}
            </select>
            <select
              value={allTasksStatusFilter}
              onChange={(e) => {
                setAllTasksStatusFilter(e.target.value);
                setAllTasksPage(1);
              }}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689] w-48"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Pending">Đang làm</option>
              <option value="Completed">Đã hoàn thành</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-[10px] shadow-sm border border-[#e2e8f0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                  <tr>
                    {[
                      "Tên công việc",
                      "Nhân viên",
                      "Vuông",
                      "Ngày",
                      "Giờ",
                      "Trạng thái",
                      "Hành động",
                    ].map((h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-xs font-semibold text-[#62748e] uppercase tracking-wide whitespace-nowrap ${i === 6 ? "text-center" : "text-left"}`}
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
                        colSpan={7}
                        className="px-4 py-16 text-center text-[#94a3b8] text-sm"
                      >
                        Đang tải...
                      </td>
                    </tr>
                  ) : allTasksSlice.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-16 text-center text-[#94a3b8] text-sm"
                      >
                        Không tìm thấy công việc phù hợp
                      </td>
                    </tr>
                  ) : (
                    allTasksSlice.map((detail) => {
                      const worker = staffList.find(
                        (s) => s.userId === detail.assignedToWorkerIds[0],
                      );
                      const plotNames = detail.plotIds
                        .map(
                          (id) =>
                            allPlots.find((p) => p.plotId === id)?.plotName ??
                            id,
                        )
                        .join(", ");
                      const locationLabel = plotNames || "—";
                      const isMultiDayRow =
                        detail.startDate &&
                        detail.endDate &&
                        detail.startDate.slice(0, 10) !==
                          detail.endDate.slice(0, 10);
                      const dateLabel = isMultiDayRow
                        ? `${isoDate(detail.startDate)} – ${isoDate(detail.endDate)}`
                        : isoDate(detail.startDate);
                      const timeLabel =
                        detail.startDate && detail.endDate
                          ? `${isoTime(detail.startDate)} – ${isoTime(detail.endDate)}`
                          : "—";
                      const statusMap: Record<
                        string,
                        { label: string; cls: string }
                      > = {
                        Pending: {
                          label: "Đang làm",
                          cls: "bg-[#fef3c7] text-[#92400e]",
                        },
                        Completed: {
                          label: "Đã hoàn thành",
                          cls: "bg-[#d1fae5] text-[#065f46]",
                        },
                      };
                      const statusInfo = statusMap[detail.status ?? ""] ?? {
                        label: detail.status ?? "—",
                        cls: "bg-[#f1f5f9] text-[#64748b]",
                      };
                      return (
                        <tr
                          key={detail.taskDetailId}
                          className="hover:bg-[#f8fafc] transition-colors"
                        >
                          <td className="px-4 py-3 text-sm font-medium text-[#1e293b]">
                            {detail.taskTitle ??
                              tasks.find((t) => t.taskId === detail.taskId)
                                ?.taskTitle ??
                              "—"}
                          </td>
                          <td className="px-4 py-3">
                            {worker ? (
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-[#009689] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                                  {worker.fullname.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm text-[#1e293b]">
                                  {worker.fullname}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-[#94a3b8]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#64748b] max-w-[180px] truncate">
                            {locationLabel}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#1e293b] whitespace-nowrap">
                            {dateLabel}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#64748b] whitespace-nowrap">
                            {timeLabel}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${statusInfo.cls}`}
                            >
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedDetail(detail);
                                  setIsViewOpen(true);
                                }}
                                className="p-1.5 text-[#009689] hover:bg-[#f0fdfa] rounded-lg transition-colors"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedDetail(detail);
                                  openEditDetail(detail);
                                }}
                                className="p-1.5 text-[#64748b] hover:bg-[#f1f5f9] rounded-lg transition-colors"
                                title="Chỉnh sửa"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setDetailToDelete(detail);
                                  setIsDeleteOpen(true);
                                }}
                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                title="Xoá"
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

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-[#e2e8f0] flex items-center justify-end gap-1">
              <button
                onClick={() => setAllTasksPage((p) => Math.max(1, p - 1))}
                disabled={allTasksPageClamped === 1}
                className="p-1.5 border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-[#64748b]" />
              </button>
              {Array.from({ length: allTasksTotalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setAllTasksPage(i + 1)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                    allTasksPageClamped === i + 1
                      ? "bg-[#009689] text-white"
                      : "hover:bg-[#f8fafc] text-[#64748b]"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() =>
                  setAllTasksPage((p) => Math.min(allTasksTotalPages, p + 1))
                }
                disabled={allTasksPageClamped === allTasksTotalPages}
                className="p-1.5 border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-[#64748b]" />
              </button>
            </div>
          </div>
        </Tabs.Content>

        {/* ══ TAB: MẪU CÔNG VIỆC ══ */}
        <Tabs.Content value="tasks" className="mt-6">
          <div className="bg-white rounded-[10px] shadow-sm border border-[#e2e8f0] overflow-hidden">
            {/* Table header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0]">
              <h2 className="text-sm font-bold text-[#1e293b]">
                Mẫu công việc
              </h2>
              <button
                onClick={() => setIsCreateTemplateOpen(true)}
                className="bg-[#009689] text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 hover:bg-[#007f73] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm mẫu
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                  <tr>
                    {["Công việc", "Hành động"].map((h, i) => (
                      <th
                        key={h}
                        className={`px-6 py-3 text-xs font-semibold text-[#62748e] uppercase tracking-wide ${i === 1 ? "text-center" : "text-left"}`}
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
                        colSpan={2}
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
                        colSpan={2}
                        className="px-6 py-16 text-center text-[#94a3b8] text-sm"
                      >
                        Chưa có mẫu công việc nào. Nhấn "Thêm mẫu" để bắt đầu.
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
                  ? "Chưa có mẫu nào"
                  : `${(tplPage - 1) * TPL_PER_PAGE + 1}–${Math.min(tplPage * TPL_PER_PAGE, tasks.length)} / ${tasks.length} mẫu`}
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

      {/* ══ MODAL: Assign Task (Bulk + Single) ══ */}
      <Dialog.Root
        open={isAssignOpen}
        onOpenChange={(open) => {
          setIsAssignOpen(open);
          if (!open) resetAssignModal();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-white rounded-xl shadow-2xl max-h-[92vh] flex flex-col">
            {/* Header */}
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
              Giao công việc cho nhân viên theo lịch định kỳ hoặc đột xuất
            </Dialog.Description>

            {/* Mode toggle */}
            <div className="px-6 pt-4 shrink-0">
              <div className="grid grid-cols-2 rounded-lg border border-[#e2e8f0] overflow-hidden text-sm font-medium">
                <button
                  onClick={() => setAssignMode("bulk")}
                  className={`py-2.5 flex items-center justify-center gap-2 transition-colors ${assignMode === "bulk" ? "bg-[#009689] text-white" : "bg-white text-[#64748b] hover:bg-[#f8fafc]"}`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Định kỳ
                </button>
                <button
                  onClick={() => setAssignMode("single")}
                  className={`py-2.5 flex items-center justify-center gap-2 transition-colors ${assignMode === "single" ? "bg-[#009689] text-white" : "bg-white text-[#64748b] hover:bg-[#f8fafc]"}`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Đột xuất
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {/* ══ BULK MODE ══ */}
              {assignMode === "bulk" && (
                <div className="space-y-5">
                  <p className="text-xs text-[#64748b] bg-[#f0fdfa] border border-[#009689]/20 rounded-lg px-3 py-2">
                    Giao cùng 1 công việc lặp đi lặp lại trong khung thời gian
                    dài. Hệ thống sẽ tạo lịch tự động theo các ngày được chọn.
                  </p>

                  {/* Row 1: Worker + Task */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#475569] mb-1.5">
                        Nhân viên <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={bulkForm.workerId}
                        onChange={(e) =>
                          setBulkForm((p) => ({
                            ...p,
                            workerId: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                      >
                        <option value="">-- Chọn nhân viên --</option>
                        {staffList
                          .filter((s) => s.roleName === "Worker")
                          .map((s) => (
                            <option key={s.userId} value={s.userId}>
                              {s.fullname}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#475569] mb-1.5">
                        Mẫu công việc <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={bulkForm.taskId}
                        onChange={(e) =>
                          setBulkForm((p) => ({ ...p, taskId: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                      >
                        <option value="">-- Chọn công việc --</option>
                        {tasks.map((t) => (
                          <option key={t.taskId} value={t.taskId}>
                            {t.taskTitle}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Season + Plot */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#475569] mb-1.5">
                        Mùa vụ <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={bulkForm.seasonId}
                        onChange={(e) =>
                          setBulkForm((p) => ({
                            ...p,
                            seasonId: e.target.value,
                            plotId: "",
                            bedIds: [],
                          }))
                        }
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
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#475569] mb-1.5">
                        Vuông <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={bulkForm.plotId}
                        onChange={(e) =>
                          setBulkForm((p) => ({
                            ...p,
                            plotId: e.target.value,
                            bedIds: [],
                          }))
                        }
                        disabled={!bulkForm.seasonId}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689] disabled:opacity-50"
                      >
                        <option value="">-- Chọn vuông --</option>
                        {getPlotsForSeason(bulkForm.seasonId).map((p) => (
                          <option key={p.plotId} value={p.plotId}>
                            {p.plotName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Bed multi-select */}
                  {bulkForm.plotId && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-[#475569]">
                          Luống <span className="text-red-500">*</span>
                          {bulkForm.bedIds.length > 0 && (
                            <span className="ml-1.5 text-[#009689] font-semibold">
                              ({bulkForm.bedIds.length} đã chọn)
                            </span>
                          )}
                        </label>
                        <button
                          onClick={() => {
                            const all = getBedsForPlot(
                              bulkForm.seasonId,
                              bulkForm.plotId,
                            ).map((b) => b.bedId);
                            setBulkForm((p) => ({
                              ...p,
                              bedIds: p.bedIds.length === all.length ? [] : all,
                            }));
                          }}
                          className="text-xs text-[#009689] hover:underline"
                        >
                          {bulkForm.bedIds.length ===
                          getBedsForPlot(bulkForm.seasonId, bulkForm.plotId)
                            .length
                            ? "Bỏ chọn tất cả"
                            : "Chọn tất cả"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 p-3 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
                        {sortBeds(
                          getBedsForPlot(bulkForm.seasonId, bulkForm.plotId),
                        ).map((bed) => {
                          const sel = bulkForm.bedIds.includes(bed.bedId);
                          return (
                            <button
                              key={bed.bedId}
                              onClick={() =>
                                setBulkForm((p) => ({
                                  ...p,
                                  bedIds: sel
                                    ? p.bedIds.filter((id) => id !== bed.bedId)
                                    : [...p.bedIds, bed.bedId],
                                }))
                              }
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all"
                              style={
                                sel
                                  ? {
                                      background: "#009689",
                                      color: "#fff",
                                      borderColor: "#009689",
                                    }
                                  : {
                                      background: "#fff",
                                      color: "#475569",
                                      borderColor: "#e2e8f0",
                                    }
                              }
                            >
                              {bed.bedName}
                              {sel && (
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Row 3: Date range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#475569] mb-1.5">
                        Từ ngày <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={bulkForm.fromDate}
                        onChange={(e) =>
                          setBulkForm((p) => ({
                            ...p,
                            fromDate: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#475569] mb-1.5">
                        Đến ngày <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={bulkForm.toDate}
                        onChange={(e) =>
                          setBulkForm((p) => ({ ...p, toDate: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
                      />
                    </div>
                  </div>

                  {/* Worker schedule preview — shown once worker + date range are set */}
                  {bulkForm.workerId &&
                    bulkForm.fromDate &&
                    bulkForm.toDate &&
                    new Date(bulkForm.fromDate) <=
                      new Date(bulkForm.toDate) && (
                      <WorkerSchedulePreview
                        workerId={bulkForm.workerId}
                        fromDate={bulkForm.fromDate}
                        toDate={bulkForm.toDate}
                        taskDetails={taskDetails}
                        staffList={staffList}
                      />
                    )}

                  {/* Weekday selector */}
                  <div>
                    <label className="block text-xs font-medium text-[#475569] mb-1.5">
                      Các ngày trong tuần{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      {(
                        ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const
                      ).map((d) => {
                        const sel = bulkForm.selectedDays.includes(d);
                        return (
                          <button
                            key={d}
                            onClick={() =>
                              setBulkForm((p) => ({
                                ...p,
                                selectedDays: sel
                                  ? p.selectedDays.filter((x) => x !== d)
                                  : [...p.selectedDays, d],
                              }))
                            }
                            className="w-9 h-9 rounded-full text-xs font-semibold border transition-all"
                            style={
                              sel
                                ? {
                                    background: "#009689",
                                    color: "#fff",
                                    borderColor: "#009689",
                                  }
                                : {
                                    background: "#f8fafc",
                                    color: "#475569",
                                    borderColor: "#e2e8f0",
                                  }
                            }
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time range */}
                  <div>
                    <label className="block text-xs font-medium text-[#475569] mb-1.5">
                      Khung giờ
                    </label>
                    <InlineTimeRange
                      startHour={bulkForm.startHour}
                      startMinute={bulkForm.startMinute}
                      endHour={bulkForm.endHour}
                      endMinute={bulkForm.endMinute}
                      onChange={(sh, sm, eh, em) =>
                        setBulkForm((p) => ({
                          ...p,
                          startHour: sh,
                          startMinute: sm,
                          endHour: eh,
                          endMinute: em,
                        }))
                      }
                    />
                    {(() => {
                      const sm =
                        parseInt(bulkForm.startHour) * 60 +
                        parseInt(bulkForm.startMinute);
                      const em =
                        parseInt(bulkForm.endHour) * 60 +
                        parseInt(bulkForm.endMinute);
                      if (
                        bulkForm.fromDate &&
                        bulkForm.toDate &&
                        bulkForm.fromDate > bulkForm.toDate
                      )
                        return (
                          <p className="mt-1.5 text-xs text-red-500">
                            Ngày kết thúc phải sau ngày bắt đầu.
                          </p>
                        );
                      if (em <= sm)
                        return (
                          <p className="mt-1.5 text-xs text-red-500">
                            Giờ kết thúc phải sau giờ bắt đầu.
                          </p>
                        );
                      return null;
                    })()}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-medium text-[#475569] mb-1.5">
                      Ghi chú
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Lưu ý đặc biệt cho nhân viên..."
                      value={bulkForm.notes}
                      onChange={(e) =>
                        setBulkForm((p) => ({ ...p, notes: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
                    />
                  </div>

                  {/* Preview */}
                  {bulkPreviewCount > 0 && (
                    <div className="px-3 py-2.5 bg-[#f0fdfa] border border-[#009689]/25 rounded-lg text-sm text-[#0f766e]">
                      Hệ thống sẽ{" "}
                      <span className="font-semibold">
                        giao {bulkPreviewCount} việc
                      </span>{" "}
                      trong khoảng thời gian đã chọn (
                      {bulkForm.selectedDays.join(", ")} hàng tuần)
                    </div>
                  )}
                </div>
              )}

              {/* ══ SINGLE MODE ══ */}
              {assignMode === "single" && (
                <div className="space-y-5">
                  <p className="text-xs text-[#64748b] bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Giao việc đặc biệt vào một ngày cụ thể, ngoài lịch định kỳ
                    thông thường.
                  </p>

                  {/* Row 1: Worker + Date (same-day only) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#475569] mb-1.5">
                        Nhân viên <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={singleForm.workerId}
                        onChange={(e) => {
                          const wid = e.target.value;
                          setSingleForm((p) => ({ ...p, workerId: wid }));
                          checkSingleConflict(
                            wid,
                            singleForm.date,
                            singleForm.startHour,
                            singleForm.startMinute,
                            singleForm.endHour,
                            singleForm.endMinute,
                          );
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                      >
                        <option value="">-- Chọn nhân viên --</option>
                        {staffList
                          .filter((s) => s.roleName === "Worker")
                          .map((s) => (
                            <option key={s.userId} value={s.userId}>
                              {s.fullname}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#475569] mb-1.5">
                        Ngày thực hiện
                        {!singleForm.isMultiDay && (
                          <span className="text-red-500"> *</span>
                        )}
                      </label>
                      <input
                        type="date"
                        disabled={singleForm.isMultiDay}
                        value={singleForm.isMultiDay ? "" : singleForm.date}
                        onChange={(e) => {
                          const d = e.target.value;
                          setSingleForm((p) => ({ ...p, date: d }));
                          checkSingleConflict(
                            singleForm.workerId,
                            d,
                            singleForm.startHour,
                            singleForm.startMinute,
                            singleForm.endHour,
                            singleForm.endMinute,
                          );
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
                      />
                    </div>
                  </div>

                  {/* Conflict warning */}
                  {singleConflict.length > 0 && (
                    <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                      <span className="shrink-0 mt-0.5">⚠</span>
                      <p>
                        Nhân viên đã có lịch trùng ngày này:{" "}
                        <span className="font-semibold">
                          {singleConflict.join(", ")}
                        </span>
                        . Bạn vẫn có thể giao nếu cần.
                      </p>
                    </div>
                  )}

                  {/* Worker schedule preview */}
                  {singleForm.workerId &&
                    (singleForm.isMultiDay
                      ? singleForm.multiStartDate &&
                        singleForm.multiEndDate &&
                        singleForm.multiEndDate >=
                          singleForm.multiStartDate && (
                          <WorkerSchedulePreview
                            workerId={singleForm.workerId}
                            fromDate={singleForm.multiStartDate}
                            toDate={singleForm.multiEndDate}
                            taskDetails={taskDetails}
                            staffList={staffList}
                          />
                        )
                      : singleForm.date && (
                          <WorkerSchedulePreview
                            workerId={singleForm.workerId}
                            fromDate={singleForm.date}
                            toDate={singleForm.date}
                            taskDetails={taskDetails}
                            staffList={staffList}
                          />
                        ))}

                  {/* Row 2: Task + Season */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#475569] mb-1.5">
                        Mẫu công việc <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={singleForm.taskId}
                        onChange={(e) =>
                          setSingleForm((p) => ({
                            ...p,
                            taskId: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                      >
                        <option value="">-- Chọn công việc --</option>
                        {tasks.map((t) => (
                          <option key={t.taskId} value={t.taskId}>
                            {t.taskTitle}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#475569] mb-1.5">
                        Mùa vụ <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={singleForm.seasonId}
                        onChange={(e) =>
                          setSingleForm((p) => ({
                            ...p,
                            seasonId: e.target.value,
                            plotId: "",
                            bedIds: [],
                          }))
                        }
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
                    </div>
                  </div>

                  {/* Row 3: Plot + Beds */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#475569] mb-1.5">
                        Vuông <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={singleForm.plotId}
                        onChange={(e) =>
                          setSingleForm((p) => ({
                            ...p,
                            plotId: e.target.value,
                            bedIds: [],
                          }))
                        }
                        disabled={!singleForm.seasonId}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689] disabled:opacity-50"
                      >
                        <option value="">-- Chọn vuông --</option>
                        {getPlotsForSeason(singleForm.seasonId).map((p) => (
                          <option key={p.plotId} value={p.plotId}>
                            {p.plotName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div />
                  </div>

                  {/* Bed multi-select */}
                  {singleForm.plotId && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-[#475569]">
                          Luống <span className="text-red-500">*</span>
                          {singleForm.bedIds.length > 0 && (
                            <span className="ml-1.5 text-[#009689] font-semibold">
                              ({singleForm.bedIds.length} đã chọn)
                            </span>
                          )}
                        </label>
                        <button
                          onClick={() => {
                            const all = getBedsForPlot(
                              singleForm.seasonId,
                              singleForm.plotId,
                            ).map((b) => b.bedId);
                            setSingleForm((p) => ({
                              ...p,
                              bedIds: p.bedIds.length === all.length ? [] : all,
                            }));
                          }}
                          className="text-xs text-[#009689] hover:underline"
                        >
                          {singleForm.bedIds.length ===
                          getBedsForPlot(singleForm.seasonId, singleForm.plotId)
                            .length
                            ? "Bỏ chọn tất cả"
                            : "Chọn tất cả"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 p-3 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
                        {sortBeds(
                          getBedsForPlot(
                            singleForm.seasonId,
                            singleForm.plotId,
                          ),
                        ).map((bed) => {
                          const sel = singleForm.bedIds.includes(bed.bedId);
                          return (
                            <button
                              key={bed.bedId}
                              onClick={() =>
                                setSingleForm((p) => ({
                                  ...p,
                                  bedIds: sel
                                    ? p.bedIds.filter((id) => id !== bed.bedId)
                                    : [...p.bedIds, bed.bedId],
                                }))
                              }
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all"
                              style={
                                sel
                                  ? {
                                      background: "#009689",
                                      color: "#fff",
                                      borderColor: "#009689",
                                    }
                                  : {
                                      background: "#fff",
                                      color: "#475569",
                                      borderColor: "#e2e8f0",
                                    }
                              }
                            >
                              {bed.bedName}
                              {sel && (
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Multi-day toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSingleForm((p) => ({
                          ...p,
                          isMultiDay: !p.isMultiDay,
                        }))
                      }
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                        singleForm.isMultiDay ? "bg-[#009689]" : "bg-[#e2e8f0]"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          singleForm.isMultiDay
                            ? "translate-x-4"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="text-xs font-medium text-[#475569]">
                      Công việc kéo dài nhiều ngày
                    </span>
                  </div>

                  {/* Same-day time range */}
                  {!singleForm.isMultiDay && (
                    <div>
                      <label className="block text-xs font-medium text-[#475569] mb-1.5">
                        Khung giờ
                      </label>
                      <InlineTimeRange
                        startHour={singleForm.startHour}
                        startMinute={singleForm.startMinute}
                        endHour={singleForm.endHour}
                        endMinute={singleForm.endMinute}
                        onChange={(sh, sm, eh, em) => {
                          setSingleForm((p) => ({
                            ...p,
                            startHour: sh,
                            startMinute: sm,
                            endHour: eh,
                            endMinute: em,
                          }));
                          checkSingleConflict(
                            singleForm.workerId,
                            singleForm.date,
                            sh,
                            sm,
                            eh,
                            em,
                          );
                        }}
                      />
                      {(() => {
                        const sm =
                          parseInt(singleForm.startHour) * 60 +
                          parseInt(singleForm.startMinute);
                        const em =
                          parseInt(singleForm.endHour) * 60 +
                          parseInt(singleForm.endMinute);
                        if (em <= sm)
                          return (
                            <p className="mt-1.5 text-xs text-red-500">
                              Giờ kết thúc phải sau giờ bắt đầu.
                            </p>
                          );
                        return null;
                      })()}
                    </div>
                  )}

                  {/* Multi-day date + time range */}
                  {singleForm.isMultiDay && (
                    <div className="space-y-3 p-3 bg-[#f0fdfa] border border-[#009689]/20 rounded-lg">
                      <p className="text-[11px] text-[#0f766e] font-medium"></p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-[#475569] uppercase tracking-wide mb-1">
                            Ngày bắt đầu <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={singleForm.multiStartDate}
                            onChange={(e) =>
                              setSingleForm((p) => ({
                                ...p,
                                multiStartDate: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#475569] uppercase tracking-wide mb-1">
                            Ngày kết thúc{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={singleForm.multiEndDate}
                            onChange={(e) =>
                              setSingleForm((p) => ({
                                ...p,
                                multiEndDate: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-[#475569] uppercase tracking-wide mb-1">
                            Giờ bắt đầu
                          </label>
                          <input
                            type="time"
                            value={`${singleForm.multiStartHour}:${singleForm.multiStartMinute}`}
                            onChange={(e) => {
                              const [h = "07", m = "00"] =
                                e.target.value.split(":");
                              setSingleForm((p) => ({
                                ...p,
                                multiStartHour: h.padStart(2, "0"),
                                multiStartMinute: m.padStart(2, "0"),
                              }));
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#475569] uppercase tracking-wide mb-1">
                            Giờ kết thúc
                          </label>
                          <input
                            type="time"
                            value={`${singleForm.multiEndHour}:${singleForm.multiEndMinute}`}
                            onChange={(e) => {
                              const [h = "17", m = "00"] =
                                e.target.value.split(":");
                              setSingleForm((p) => ({
                                ...p,
                                multiEndHour: h.padStart(2, "0"),
                                multiEndMinute: m.padStart(2, "0"),
                              }));
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
                          />
                        </div>
                      </div>
                      {(() => {
                        if (
                          !singleForm.multiStartDate ||
                          !singleForm.multiEndDate
                        )
                          return null;
                        if (singleForm.multiEndDate < singleForm.multiStartDate)
                          return (
                            <p className="text-xs text-red-500">
                              Ngày kết thúc phải sau ngày bắt đầu.
                            </p>
                          );
                        if (
                          singleForm.multiEndDate ===
                            singleForm.multiStartDate &&
                          parseInt(singleForm.multiEndHour) * 60 +
                            parseInt(singleForm.multiEndMinute) <=
                            parseInt(singleForm.multiStartHour) * 60 +
                              parseInt(singleForm.multiStartMinute)
                        )
                          return (
                            <p className="text-xs text-red-500">
                              Giờ kết thúc phải sau giờ bắt đầu.
                            </p>
                          );
                        const d1 = new Date(singleForm.multiStartDate);
                        const d2 = new Date(singleForm.multiEndDate);
                        const days =
                          Math.round((d2.getTime() - d1.getTime()) / 86400000) +
                          1;
                        return (
                          <p className="text-xs text-[#0f766e] font-medium">
                            Kéo dài{" "}
                            <span className="font-bold">{days} ngày</span> (
                            {singleForm.multiStartDate} →{" "}
                            {singleForm.multiEndDate})
                          </p>
                        );
                      })()}
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-medium text-[#475569] mb-1.5">
                      Ghi chú
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Lý do giao việc đột xuất, yêu cầu cụ thể..."
                      value={singleForm.notes}
                      onChange={(e) =>
                        setSingleForm((p) => ({ ...p, notes: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sticky footer */}
            <div className="shrink-0 border-t border-[#e2e8f0] px-6 py-4 flex gap-3 bg-white">
              <button
                onClick={() => {
                  setIsAssignOpen(false);
                  resetAssignModal();
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 border border-[#e2e8f0] hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={
                  assignMode === "bulk" ? handleSubmitBulk : handleSubmitSingle
                }
                disabled={
                  isSaving ||
                  (assignMode === "bulk"
                    ? !bulkForm.workerId ||
                      !bulkForm.taskId ||
                      !bulkForm.seasonId ||
                      !bulkForm.bedIds.length ||
                      !bulkForm.fromDate ||
                      !bulkForm.toDate ||
                      !bulkForm.selectedDays.length ||
                      bulkForm.fromDate > bulkForm.toDate ||
                      parseInt(bulkForm.endHour) * 60 +
                        parseInt(bulkForm.endMinute) <=
                        parseInt(bulkForm.startHour) * 60 +
                          parseInt(bulkForm.startMinute)
                    : !singleForm.workerId ||
                      !singleForm.taskId ||
                      !singleForm.seasonId ||
                      !singleForm.bedIds.length ||
                      (singleForm.isMultiDay
                        ? !singleForm.multiStartDate ||
                          !singleForm.multiEndDate ||
                          singleForm.multiEndDate < singleForm.multiStartDate ||
                          (singleForm.multiEndDate ===
                            singleForm.multiStartDate &&
                            parseInt(singleForm.multiEndHour) * 60 +
                              parseInt(singleForm.multiEndMinute) <=
                              parseInt(singleForm.multiStartHour) * 60 +
                                parseInt(singleForm.multiStartMinute))
                        : !singleForm.date ||
                          parseInt(singleForm.endHour) * 60 +
                            parseInt(singleForm.endMinute) <=
                            parseInt(singleForm.startHour) * 60 +
                              parseInt(singleForm.startMinute)))
                }
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f73] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {assignMode === "bulk"
                  ? bulkPreviewCount > 0
                    ? `Xác nhận (${bulkPreviewCount} giao việc)`
                    : "Xác nhận giao việc"
                  : "Xác nhận giao việc"}
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
              <Dialog.Close asChild>
                <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
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
                const farmName =
                  allPlots.find((p) => p.farmId === season?.farmId)?.farmName ??
                  null;
                const worker = staffList.find(
                  (s) => s.userId === selectedDetail.assignedToWorkerIds[0],
                );
                const beds =
                  sortBeds(
                    selectedDetail.bedIds
                      .map((id) => allBeds.find((b) => b.bedId === id))
                      .filter((b): b is NonNullable<typeof b> => !!b),
                  )
                    .map((b) => b.bedName)
                    .join(", ") || selectedDetail.bedIds.join(", ");
                const plots = selectedDetail.plotIds
                  .map(
                    (id) =>
                      allPlots.find((p) => p.plotId === id)?.plotName ?? id,
                  )
                  .join(", ");
                const detailStartDay =
                  selectedDetail.startDate?.slice(0, 10) ?? "";
                const detailEndDay =
                  selectedDetail.endDate?.slice(0, 10) ?? detailStartDay;
                const isMultiDayDetail = detailEndDay !== detailStartDay;
                const displayDate = isMultiDayDetail
                  ? `${isoDate(selectedDetail.startDate)} – ${isoDate(selectedDetail.endDate)}`
                  : isoDate(selectedDetail.startDate);
                const timeStr = `${isoTime(selectedDetail.startDate)} – ${isoTime(selectedDetail.endDate)}`;
                const statusColor =
                  selectedDetail.status === "Pending"
                    ? "bg-[#fef3c7] text-[#92400e]"
                    : selectedDetail.status === "Completed"
                      ? "bg-[#d1fae5] text-[#065f46]"
                      : "bg-[#f1f5f9] text-[#64748b]";
                const statusLabel =
                  selectedDetail.status === "Pending"
                    ? "Đang làm"
                    : selectedDetail.status === "Completed"
                      ? "Đã hoàn thành"
                      : (selectedDetail.status ?? "—");
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
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-xs font-medium ${statusColor}`}
                        >
                          {statusLabel}
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
                      {farmName && (
                        <div>
                          <p className="text-xs text-[#64748b] mb-0.5">
                            Trang trại
                          </p>
                          <p className="font-medium text-[#1e293b]">
                            {farmName}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-[#64748b] mb-0.5">Vuông</p>
                        <p className="font-medium text-[#1e293b]">
                          {plots || "—"}
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
                          {isMultiDayDetail
                            ? "Thời gian thực hiện"
                            : "Ngày thực hiện"}
                        </p>
                        <p className="font-medium text-[#1e293b]">
                          {displayDate}
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

                    <div className="flex gap-3 pt-1">
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

      {/* ══ MODAL: Edit Assignment ══ */}
      <Dialog.Root
        open={isEditDetailOpen}
        onOpenChange={(o) => {
          setIsEditDetailOpen(o);
          if (!o) {
            setEditDetail(null);
            setEditShowSchedule(false);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-white rounded-xl shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#f1f5f9] shrink-0">
              <Dialog.Title className="text-lg font-bold text-[#1e293b]">
                Chỉnh sửa lịch trình
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Chỉnh sửa thông tin lịch trình công việc
            </Dialog.Description>
            {editDetail &&
              selectedDetail &&
              (() => {
                // ── Constraint helpers ────────────────────────────────────
                const isCompleted = selectedDetail.status === "Completed";
                // Start-time is locked if Pending and the assignment time is already in the past
                const assignmentStart = selectedDetail.startDate
                  ? new Date(
                      `${selectedDetail.startDate.slice(0, 10)}T${selectedDetail.startDate.slice(11, 16)}:00`,
                    ).getTime()
                  : null;
                const isPastPending =
                  selectedDetail.status === "Pending" &&
                  assignmentStart !== null &&
                  assignmentStart < Date.now();

                // Derived values for season-related sections
                const editSeason = seasons.find(
                  (s) => s.seasonId === editDetail.seasonId,
                );
                const editFarmName =
                  allPlots.find((p) => p.farmId === editSeason?.farmId)
                    ?.farmName ?? null;
                const editSeasonBeds = (() => {
                  if (!editDetail.seasonId) return [];
                  const season = seasons.find(
                    (s) => s.seasonId === editDetail.seasonId,
                  );
                  if (!season) return [];
                  const bedIds = new Set(
                    season.seasonsDetails.map((sd) => sd.bedId),
                  );
                  return allBeds.filter((b) => bedIds.has(b.bedId));
                })();
                const editSeasonPlots = (() => {
                  const plotIds = new Set(editSeasonBeds.map((b) => b.plotId));
                  return allPlots.filter((p) => plotIds.has(p.plotId));
                })();
                return (
                  <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
                    {/* ── Completed lock banner ── */}
                    {isCompleted && (
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-[#f1f5f9] border border-[#e2e8f0] rounded-lg text-xs text-[#64748b]">
                        <CheckCircle2 className="w-4 h-4 text-[#009689] shrink-0" />
                        <span>
                          Lịch trình này đã hoàn thành và không thể chỉnh sửa.
                        </span>
                      </div>
                    )}

                    {/* ── 1. Công việc ── */}
                    <section>
                      <h3 className="text-xs font-bold text-[#009689] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#009689] text-white text-[10px] flex items-center justify-center font-bold">
                          1
                        </span>
                        Công việc
                      </h3>
                      <select
                        value={editDetail.taskId}
                        disabled={isCompleted}
                        onChange={(e) =>
                          setEditDetail((p) =>
                            p ? { ...p, taskId: e.target.value } : p,
                          )
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                      >
                        <option value="">-- Chọn công việc --</option>
                        {tasks.map((t) => (
                          <option key={t.taskId} value={t.taskId}>
                            {t.taskTitle}
                          </option>
                        ))}
                      </select>
                    </section>

                    {/* ── 2. Mùa vụ (read-only) ── */}
                    <section>
                      <h3 className="text-xs font-bold text-[#009689] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#009689] text-white text-[10px] flex items-center justify-center font-bold">
                          2
                        </span>
                        Mùa vụ
                      </h3>
                      {editSeason ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between px-3 py-2.5 bg-[#f8fafc] rounded-lg border border-[#e2e8f0] text-sm">
                            <span className="font-medium text-[#1e293b]">
                              {editSeason.seasonName}
                            </span>
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${editSeason.status === "Active" ? "bg-[#d1fae5] text-[#065f46]" : editSeason.status === "Completed" ? "bg-[#f1f5f9] text-[#64748b]" : "bg-[#fef3c7] text-[#92400e]"}`}
                            >
                              {editSeason.status === "Active"
                                ? "Đang hoạt động"
                                : editSeason.status === "Completed"
                                  ? "Đã kết thúc"
                                  : "Sắp diễn ra"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#64748b]">
                            <span>
                              {editSeason.seasonStartDate
                                .split("-")
                                .reverse()
                                .join("/")}{" "}
                              –{" "}
                              {editSeason.seasonEndDate
                                .split("-")
                                .reverse()
                                .join("/")}
                            </span>
                            {editFarmName && (
                              <>
                                <span className="text-[#e2e8f0]">·</span>
                                <MapPin className="w-3 h-3 text-[#009689] shrink-0" />
                                <span className="text-[#0f766e] font-medium">
                                  {editFarmName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="px-3 py-2.5 bg-[#f8fafc] rounded-lg border border-[#e2e8f0] text-xs text-[#94a3b8] italic">
                          Không xác định được mùa vụ
                        </div>
                      )}
                    </section>

                    {/* ── 3. Ngày & Giờ ── */}
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
                            Ngày thực hiện{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={editDetail.date}
                            disabled={isCompleted || isPastPending}
                            onChange={(e) =>
                              setEditDetail((p) =>
                                p ? { ...p, date: e.target.value } : p,
                              )
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] disabled:bg-[#f8fafc] disabled:text-[#94a3b8] disabled:cursor-not-allowed"
                          />
                          {isPastPending && (
                            <p className="mt-1 text-[11px] text-amber-600">
                              Thời gian đã qua — không thể thay đổi ngày/giờ bắt
                              đầu.
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1.5">
                            Khung giờ
                          </label>
                          {isPastPending || isCompleted ? (
                            <div className="flex items-center gap-2 px-3 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-sm text-[#64748b]">
                              <Clock className="w-4 h-4 text-[#94a3b8] shrink-0" />
                              <span>
                                {editDetail.startHour}:{editDetail.startMinute}{" "}
                                – {editDetail.endHour}:{editDetail.endMinute}
                              </span>
                            </div>
                          ) : (
                            <>
                              <InlineTimeRange
                                startHour={editDetail.startHour}
                                startMinute={editDetail.startMinute}
                                endHour={editDetail.endHour}
                                endMinute={editDetail.endMinute}
                                onChange={(sh, sm, eh, em) =>
                                  setEditDetail((p) =>
                                    p
                                      ? {
                                          ...p,
                                          startHour: sh,
                                          startMinute: sm,
                                          endHour: eh,
                                          endMinute: em,
                                        }
                                      : p,
                                  )
                                }
                              />
                              {(() => {
                                const sm =
                                  parseInt(editDetail.startHour) * 60 +
                                  parseInt(editDetail.startMinute);
                                const em =
                                  parseInt(editDetail.endHour) * 60 +
                                  parseInt(editDetail.endMinute);
                                if (em <= sm)
                                  return (
                                    <p className="mt-1.5 text-xs text-red-500">
                                      Giờ kết thúc phải sau giờ bắt đầu.
                                    </p>
                                  );
                                return null;
                              })()}
                            </>
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
                        {/* Vuông */}
                        <div>
                          <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
                            Vuông
                            {editDetail.selectedPlotIds.length > 0 && (
                              <span className="ml-2 normal-case font-semibold text-[#009689]">
                                ({editDetail.selectedPlotIds.length} đã chọn)
                              </span>
                            )}
                          </label>
                          {!editDetail.seasonId ? (
                            <div className="px-3 py-2 bg-[#f8fafc] border border-dashed border-[#e2e8f0] rounded-lg text-xs text-[#94a3b8] italic">
                              Chọn mùa vụ trước
                            </div>
                          ) : editSeasonPlots.length === 0 ? (
                            <div className="px-3 py-2 bg-[#f8fafc] border border-dashed border-[#e2e8f0] rounded-lg text-xs text-[#94a3b8] italic">
                              Mùa vụ này chưa có vuông nào
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {editSeasonPlots.map((plot) => {
                                const isSel =
                                  editDetail.selectedPlotIds.includes(
                                    plot.plotId,
                                  );
                                return (
                                  <button
                                    key={plot.plotId}
                                    disabled={isCompleted}
                                    onClick={() => {
                                      const next = isSel
                                        ? editDetail.selectedPlotIds.filter(
                                            (id) => id !== plot.plotId,
                                          )
                                        : [
                                            ...editDetail.selectedPlotIds,
                                            plot.plotId,
                                          ];
                                      const keepBeds = new Set(
                                        editSeasonBeds
                                          .filter((b) =>
                                            next.includes(b.plotId),
                                          )
                                          .map((b) => b.bedId),
                                      );
                                      setEditDetail((p) =>
                                        p
                                          ? {
                                              ...p,
                                              selectedPlotIds: next,
                                              bedIds: p.bedIds.filter((id) =>
                                                keepBeds.has(id),
                                              ),
                                            }
                                          : p,
                                      );
                                    }}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={
                                      isSel
                                        ? {
                                            background: "#009689",
                                            color: "#fff",
                                            borderColor: "#009689",
                                          }
                                        : {
                                            background: "#f8fafc",
                                            color: "#475569",
                                            borderColor: "#e2e8f0",
                                          }
                                    }
                                  >
                                    {plot.plotName}
                                    {isSel && (
                                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Luống — grouped by selected plot */}
                        {editDetail.selectedPlotIds.length > 0 &&
                          (() => {
                            const groups = editDetail.selectedPlotIds
                              .map((plotId) => ({
                                plot: editSeasonPlots.find(
                                  (p) => p.plotId === plotId,
                                ),
                                plotBeds: sortBeds(
                                  editSeasonBeds.filter(
                                    (b) => b.plotId === plotId,
                                  ),
                                ),
                              }))
                              .filter((g) => g.plot && g.plotBeds.length > 0);
                            if (groups.length === 0) return null;
                            return (
                              <div className="space-y-3">
                                <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide">
                                  Luống
                                  {editDetail.bedIds.length > 0 && (
                                    <span className="ml-2 normal-case font-semibold text-[#009689]">
                                      ({editDetail.bedIds.length} đã chọn)
                                    </span>
                                  )}
                                </label>
                                {groups.map(({ plot, plotBeds }) => {
                                  const allSel = plotBeds.every((b) =>
                                    editDetail.bedIds.includes(b.bedId),
                                  );
                                  const plotSelCount = plotBeds.filter((b) =>
                                    editDetail.bedIds.includes(b.bedId),
                                  ).length;
                                  return (
                                    <div
                                      key={plot!.plotId}
                                      className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3"
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-semibold text-[#475569]">
                                          {plot!.plotName}
                                          {plotSelCount > 0 && (
                                            <span className="ml-1.5 text-[#009689]">
                                              ({plotSelCount})
                                            </span>
                                          )}
                                        </span>
                                        {!isCompleted && (
                                          <button
                                            onClick={() => {
                                              const ids = plotBeds.map(
                                                (b) => b.bedId,
                                              );
                                              setEditDetail((p) =>
                                                p
                                                  ? {
                                                      ...p,
                                                      bedIds: allSel
                                                        ? p.bedIds.filter(
                                                            (id) =>
                                                              !ids.includes(id),
                                                          )
                                                        : [
                                                            ...new Set([
                                                              ...p.bedIds,
                                                              ...ids,
                                                            ]),
                                                          ],
                                                    }
                                                  : p,
                                              );
                                            }}
                                            className="text-[11px] font-medium text-[#009689] hover:underline"
                                          >
                                            {allSel
                                              ? "Bỏ chọn tất cả"
                                              : `Chọn tất cả (${plotBeds.length})`}
                                          </button>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {plotBeds.map((bed) => {
                                          const isSel =
                                            editDetail.bedIds.includes(
                                              bed.bedId,
                                            );
                                          return (
                                            <button
                                              key={bed.bedId}
                                              disabled={isCompleted}
                                              onClick={() =>
                                                setEditDetail((p) =>
                                                  p
                                                    ? {
                                                        ...p,
                                                        bedIds: isSel
                                                          ? p.bedIds.filter(
                                                              (id) =>
                                                                id !==
                                                                bed.bedId,
                                                            )
                                                          : [
                                                              ...p.bedIds,
                                                              bed.bedId,
                                                            ],
                                                      }
                                                    : p,
                                                )
                                              }
                                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                              style={
                                                isSel
                                                  ? {
                                                      background: "#009689",
                                                      color: "#fff",
                                                      borderColor: "#009689",
                                                    }
                                                  : {
                                                      background: "#fff",
                                                      color: "#475569",
                                                      borderColor: "#e2e8f0",
                                                    }
                                              }
                                            >
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
                                })}
                              </div>
                            );
                          })()}

                        {/* Nhân viên phụ trách */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-[#475569] uppercase tracking-wide">
                              Nhân viên phụ trách{" "}
                              {!isCompleted && (
                                <span className="text-red-500 normal-case font-normal">
                                  *
                                </span>
                              )}
                            </label>
                            {!isCompleted && (
                              <button
                                onClick={() => setEditShowSchedule((v) => !v)}
                                className="flex items-center gap-1 text-[11px] text-[#009689] hover:underline"
                              >
                                <Calendar className="w-3 h-3" />
                                {editShowSchedule
                                  ? "Ẩn lịch bận"
                                  : "Xem lịch bận"}
                              </button>
                            )}
                          </div>
                          {/* Worker chips */}
                          <div className="flex flex-wrap gap-1.5">
                            {staffList
                              .filter((s) => s.roleName === "Worker")
                              .map((s) => {
                                const isInactive =
                                  (s.status ?? "").toLowerCase() === "inactive";
                                const sel = editDetail.workerId === s.userId;
                                const chipDisabled = isCompleted || isInactive;
                                return (
                                  <button
                                    key={s.userId}
                                    disabled={chipDisabled}
                                    onClick={() => {
                                      setEditDetail((p) =>
                                        p ? { ...p, workerId: s.userId } : p,
                                      );
                                      setEditShowSchedule(true);
                                    }}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={
                                      sel
                                        ? {
                                            background: "#009689",
                                            color: "#fff",
                                            borderColor: "#009689",
                                          }
                                        : chipDisabled
                                          ? {
                                              background: "#f1f5f9",
                                              color: "#94a3b8",
                                              borderColor: "#e2e8f0",
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
                                    {sel && (
                                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                          </div>
                          {/* Schedule preview — shown when a worker is selected and panel is open */}
                          {editShowSchedule &&
                            editDetail.workerId &&
                            editDetail.date && (
                              <div className="mt-3">
                                <WorkerSchedulePreview
                                  workerId={editDetail.workerId}
                                  fromDate={editDetail.date}
                                  toDate={editDetail.date}
                                  taskDetails={taskDetails.filter(
                                    (d) =>
                                      d.taskDetailId !==
                                      selectedDetail.taskDetailId,
                                  )}
                                  staffList={staffList}
                                />
                              </div>
                            )}
                        </div>
                      </div>
                    </section>

                    {/* ── 5. Ghi chú ── */}
                    <section>
                      <h3 className="text-xs font-bold text-[#009689] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#009689] text-white text-[10px] flex items-center justify-center font-bold">
                          5
                        </span>
                        Ghi chú
                      </h3>
                      <textarea
                        rows={3}
                        disabled={isCompleted}
                        value={editDetail.notes}
                        onChange={(e) =>
                          setEditDetail((p) =>
                            p ? { ...p, notes: e.target.value } : p,
                          )
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none disabled:bg-[#f8fafc] disabled:text-[#94a3b8] disabled:cursor-not-allowed"
                      />
                    </section>
                  </div>
                );
              })()}

            {/* Footer */}
            <div className="shrink-0 border-t border-[#e2e8f0] px-6 py-4 flex gap-3 justify-end bg-white">
              <button
                onClick={() => {
                  setIsEditDetailOpen(false);
                  setEditDetail(null);
                  setEditShowSchedule(false);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 border border-[#e2e8f0] hover:bg-slate-50 transition-colors"
              >
                {selectedDetail?.status === "Completed" ? "Đóng" : "Hủy"}
              </button>
              {selectedDetail?.status !== "Completed" && (
                <button
                  onClick={handleUpdateAssignment}
                  disabled={
                    !editDetail?.date || !editDetail?.workerId || isSaving
                  }
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f73] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              )}
            </div>
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
