import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Eye,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  List,
  MapPin,
  Clock,
  User,
  CheckCircle2,
  Edit,
  ChevronDown,
  ChevronUp,
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
const CROP_TYPES = ["Bắp Cải Trắng", "Bắp Cải Tím", "Bắp Cải Xoăn"];
const AREAS = ["Khu A", "Khu B", "Khu C", "Khu D", "Khu E"];
const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const STATUS_CONFIG = {
  pending: {
    label: "Chưa xử lý",
    color: "bg-[#FEE2E2] text-[#991B1B]",
    border: "#ef4444",
  },
  "in-progress": {
    label: "Đang xử lý",
    color: "bg-[#FEF3C7] text-[#92400E]",
    border: "#f59e0b",
  },
  completed: {
    label: "Hoàn tất",
    color: "bg-[#D1FAE5] text-[#065F46]",
    border: "#10b981",
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

// ─── Component ────────────────────────────────────────────────────────────────

export function TasksPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [activeTab, setActiveTab] = useState("schedule");

  // Data — seeded from mockData.ts
  const [templates, setTemplates] = useState<TaskTemplate[]>(mockTaskTemplates);
  const [assignments, setAssignments] =
    useState<TaskAssignment[]>(mockTaskAssignments);

  // UI
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | TaskAssignment["status"]
  >("all");
  const [filterArea, setFilterArea] = useState("all");
  const [currentDate, setCurrentDate] = useState(new Date(2023, 11, 20));
  const [templatesExpanded, setTemplatesExpanded] = useState(true);

  // Modals
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<TaskAssignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] =
    useState<TaskAssignment | null>(null);

  // Staff picker
  const [isStaffPickerOpen, setIsStaffPickerOpen] = useState(false);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [staffSearch, setStaffSearch] = useState("");

  // New template form
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    type: "",
    description: "",
    crop: "",
  });

  // New assignment form
  const [newAssignment, setNewAssignment] = useState({
    templateId: "",
    area: "",
    plot: "",
    date: "",
    time: "",
    notes: "",
  });

  useEffect(() => {
    fetchStaff().then(setStaffList);
  }, []);

  // ── Calendar helpers ──────────────────────────────────────────────────────────

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

  // ── Filtered list ─────────────────────────────────────────────────────────────

  const filteredAssignments = assignments.filter((a) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      a.taskName.toLowerCase().includes(q) ||
      a.area.toLowerCase().includes(q) ||
      a.workerNames.some((n) => n.toLowerCase().includes(q));
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    const matchArea = filterArea === "all" || a.area === filterArea;
    return matchSearch && matchStatus && matchArea;
  });

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.type) return;
    setTemplates((prev) => [
      ...prev,
      {
        id: `tpl-${Date.now()}`,
        name: newTemplate.name,
        type: newTemplate.type,
        description: newTemplate.description,
        crop: newTemplate.crop,
        icon: ICON_MAP[newTemplate.type] ?? "📋",
        iconBg: BG_MAP[newTemplate.type] ?? "#f1f5f9",
      },
    ]);
    setNewTemplate({ name: "", type: "", description: "", crop: "" });
    setIsCreateTemplateOpen(false);
  };

  const handleCreateAssignment = () => {
    const tpl = templates.find((t) => t.id === newAssignment.templateId);
    if (!tpl || !newAssignment.area || !newAssignment.date) return;
    const workers = selectedWorkerIds
      .map((id) => staffList.find((s) => s.id === id))
      .filter(Boolean) as Staff[];
    setAssignments((prev) => [
      ...prev,
      {
        id: `asgn-${Date.now()}`,
        templateId: tpl.id,
        taskName: tpl.name,
        taskIcon: tpl.icon,
        taskIconBg: tpl.iconBg,
        area: newAssignment.area,
        plot: newAssignment.plot,
        date: newAssignment.date,
        displayDate: isoToDisplay(newAssignment.date),
        time: newAssignment.time,
        workerIds: selectedWorkerIds,
        workerNames: workers.map((w) => w.name),
        status: "pending",
        notes: newAssignment.notes,
      },
    ]);
    setNewAssignment({
      templateId: "",
      area: "",
      plot: "",
      date: "",
      time: "",
      notes: "",
    });
    setSelectedWorkerIds([]);
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

  const toggleWorker = (id: string) =>
    setSelectedWorkerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const filteredStaff = staffList.filter((s) =>
    s.name.toLowerCase().includes(staffSearch.toLowerCase()),
  );
  const selectedTemplate = templates.find(
    (t) => t.id === newAssignment.templateId,
  );

  // ── Render ────────────────────────────────────────────────────────────────────

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
        <button
          onClick={() => setIsAssignOpen(true)}
          className="bg-[#009689] text-white px-4 py-2 rounded-[10px] flex items-center gap-2 hover:bg-[#007f73] transition-colors"
        >
          <Plus className="w-4 h-4" /> Giao việc
        </button>
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
              label: "Công Việc",
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
          <div className="bg-white rounded-[10px] p-4 shadow-sm border border-[#e2e8f0] flex items-center justify-between">
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
            <div className="flex items-center gap-4 text-xs text-[#64748b]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ef4444] inline-block" />
                Chưa xử lý
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f59e0b] inline-block" />
                Đang xử lý
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10b981] inline-block" />
                Hoàn tất
              </span>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="bg-white rounded-[10px] shadow-sm border border-[#e2e8f0] overflow-hidden">
            <div className="grid grid-cols-7 border-b border-[#e2e8f0]">
              {weekDays.map((day, idx) => {
                const today = new Date();
                const isToday =
                  day.getDate() === today.getDate() &&
                  day.getMonth() === today.getMonth() &&
                  day.getFullYear() === today.getFullYear();
                return (
                  <div
                    key={idx}
                    className={`py-3 text-center border-r border-[#e2e8f0] last:border-r-0 ${isToday ? "bg-[#d1fae5]" : "bg-[#f8fafc]"}`}
                  >
                    <p className="text-xs font-medium text-[#64748b]">
                      {DAY_LABELS[idx]}
                    </p>
                    <p
                      className={`text-lg font-semibold mt-0.5 ${isToday ? "text-[#009689]" : "text-[#1e293b]"}`}
                    >
                      {day.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-7 divide-x divide-[#e2e8f0]">
              {weekDays.map((day, idx) => {
                const dayAssignments = getAssignmentsForDay(day);
                return (
                  <div key={idx} className="min-h-[280px] p-2 space-y-2">
                    {dayAssignments.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          setSelectedAssignment(a);
                          setIsViewOpen(true);
                        }}
                        className="w-full text-left p-2.5 rounded-lg border-l-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                        style={{
                          borderLeftColor: STATUS_CONFIG[a.status].border,
                        }}
                      >
                        <p className="text-xs font-semibold text-[#1e293b] line-clamp-2 mb-1.5">
                          {a.taskIcon} {a.taskName}
                        </p>
                        {a.time && (
                          <p className="text-xs text-[#64748b] flex items-center gap-1 mb-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            {a.time}
                          </p>
                        )}
                        <p className="text-xs text-[#64748b] flex items-center gap-1 mb-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {a.area}
                          {a.plot ? ` · ${a.plot}` : ""}
                        </p>
                        {a.workerNames.length > 0 && (
                          <p className="text-xs text-[#64748b] flex items-center gap-1">
                            <User className="w-3 h-3 shrink-0" />
                            {a.workerNames.length === 1
                              ? a.workerNames[0]
                              : `${a.workerNames[0]} +${a.workerNames.length - 1}`}
                          </p>
                        )}
                      </button>
                    ))}
                    {dayAssignments.length === 0 && (
                      <p className="text-xs text-[#cbd5e1] text-center pt-10">
                        —
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Tabs.Content>

        {/* ══ TAB: CÔNG VIỆC ══ */}
        <Tabs.Content value="tasks" className="mt-6 space-y-6">
          {/* Template library */}
          <div className="bg-white rounded-[10px] shadow-sm border border-[#e2e8f0] overflow-hidden">
            <button
              onClick={() => setTemplatesExpanded((p) => !p)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#f8fafc] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#115e59]">
                  Danh sách việc mẫu
                </span>
                <span className="px-2 py-0.5 bg-[#d1fae5] text-[#065f46] rounded-full text-xs font-medium">
                  {templates.length}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCreateTemplateOpen(true);
                  }}
                  className="text-xs text-[#009689] font-medium flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3 h-3" /> Thêm mẫu
                </button>
                {templatesExpanded ? (
                  <ChevronUp className="w-4 h-4 text-[#64748b]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#64748b]" />
                )}
              </div>
            </button>
            {templatesExpanded && (
              <div className="px-6 pb-5 pt-4 border-t border-[#e2e8f0] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    title={tpl.description}
                    className="flex items-center gap-3 p-3 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] hover:border-[#009689] transition-colors cursor-default"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: tpl.iconBg }}
                    >
                      {tpl.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1e293b] truncate">
                        {tpl.name}
                      </p>
                      <p className="text-xs text-[#64748b] truncate">
                        {tpl.type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignment list */}
          <div className="bg-white rounded-[10px] shadow-sm border border-[#e2e8f0] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#90A1B9]" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, khu vực, nhân viên..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-[#cad5e2] rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border border-[#cad5e2] rounded-[10px] text-sm bg-white text-[#314158] focus:outline-none focus:ring-2 focus:ring-[#009689]"
              >
                <option value="all">Trạng thái: Tất cả</option>
                <option value="pending">Chưa xử lý</option>
                <option value="in-progress">Đang xử lý</option>
                <option value="completed">Hoàn tất</option>
              </select>
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                className="px-3 py-2 border border-[#cad5e2] rounded-[10px] text-sm bg-white text-[#314158] focus:outline-none focus:ring-2 focus:ring-[#009689]"
              >
                <option value="all">Khu vực: Tất cả</option>
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                  <tr>
                    {[
                      "Công việc",
                      "Khu vực",
                      "Nhân viên",
                      "Ngày thực hiện",
                      "Trạng thái",
                      "Hành động",
                    ].map((h, i) => (
                      <th
                        key={h}
                        className={`px-6 py-3 text-xs font-medium text-[#62748e] uppercase tracking-wide ${i === 5 ? "text-center" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {filteredAssignments.map((a) => (
                    <tr
                      key={a.id}
                      className="hover:bg-[#f8fafc] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                            style={{ backgroundColor: a.taskIconBg }}
                          >
                            {a.taskIcon}
                          </div>
                          <p className="font-medium text-[#1e293b] text-sm">
                            {a.taskName}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#45556c]">
                        {a.area}
                        {a.plot ? ` · ${a.plot}` : ""}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {a.workerNames.length > 0 ? (
                            a.workerNames.map((name, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-[#f1f5f9] text-[#475569] rounded text-xs"
                              >
                                {name}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-[#94a3b8]">
                              Chưa phân công
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#45556c]">
                        <div>{a.displayDate}</div>
                        {a.time && (
                          <div className="text-xs text-[#94a3b8] mt-0.5">
                            {a.time}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${STATUS_CONFIG[a.status].color}`}
                        >
                          {STATUS_CONFIG[a.status].label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedAssignment(a);
                              setIsViewOpen(true);
                            }}
                            className="p-2 text-[#009689] hover:bg-[#dcfce7] rounded-lg transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 text-[#009689] hover:bg-[#dcfce7] rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setAssignmentToDelete(a);
                              setIsDeleteOpen(true);
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xoá"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAssignments.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-16 text-center text-[#94a3b8] text-sm"
                      >
                        Không tìm thấy công việc nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t border-[#e2e8f0] flex items-center justify-between">
              <p className="text-sm text-[#64748b]">
                {filteredAssignments.length} / {assignments.length} công việc
              </p>
              <div className="flex gap-2">
                <button className="p-1.5 border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] transition-colors">
                  <ChevronLeft className="w-4 h-4 text-[#64748b]" />
                </button>
                <button className="p-1.5 border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] transition-colors">
                  <ChevronRight className="w-4 h-4 text-[#64748b]" />
                </button>
              </div>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* ══ MODAL: Create Template ══ */}
      <Dialog.Root
        open={isCreateTemplateOpen}
        onOpenChange={setIsCreateTemplateOpen}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-bold text-[#1e293b]">
                Thêm công việc mẫu
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            <div className="space-y-4">
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Loại công việc <span className="text-red-500">*</span>
                </label>
                <select
                  value={newTemplate.type}
                  onChange={(e) =>
                    setNewTemplate((p) => ({ ...p, type: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                >
                  <option value="">Chọn loại</option>
                  {TASK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Cây trồng áp dụng
                </label>
                <select
                  value={newTemplate.crop}
                  onChange={(e) =>
                    setNewTemplate((p) => ({ ...p, crop: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                >
                  <option value="">Tất cả</option>
                  {CROP_TYPES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mô tả
                </label>
                <textarea
                  rows={2}
                  placeholder="Mô tả ngắn..."
                  value={newTemplate.description}
                  onChange={(e) =>
                    setNewTemplate((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-5 border-t border-[#e2e8f0]">
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
                <CheckCircle2 className="w-4 h-4" /> Tạo mẫu
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ══ MODAL: Assign Task ══ */}
      <Dialog.Root open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xl bg-white rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
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
              Giao một công việc mẫu cho nhân viên tại khu vực và thời gian cụ
              thể
            </Dialog.Description>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Công việc <span className="text-red-500">*</span>
                </label>
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
                    {selectedTemplate.crop
                      ? ` · Cây trồng: ${selectedTemplate.crop}`
                      : ""}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Khu vực <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newAssignment.area}
                    onChange={(e) =>
                      setNewAssignment((p) => ({ ...p, area: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  >
                    <option value="">Chọn khu vực</option>
                    {AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Luống / ô
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Luống 01"
                    value={newAssignment.plot}
                    onChange={(e) =>
                      setNewAssignment((p) => ({ ...p, plot: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Ngày thực hiện <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newAssignment.date}
                    onChange={(e) =>
                      setNewAssignment((p) => ({ ...p, date: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Khung giờ
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 07:00 - 09:00"
                    value={newAssignment.time}
                    onChange={(e) =>
                      setNewAssignment((p) => ({ ...p, time: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nhân viên phụ trách
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedWorkerIds.map((id) => {
                    const s = staffList.find((x) => x.id === id);
                    return s ? (
                      <span
                        key={id}
                        className="px-2.5 py-1 bg-[#dbeafe] text-[#1e40af] text-sm rounded-md flex items-center gap-1.5"
                      >
                        {s.name}
                        <button onClick={() => toggleWorker(id)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
                <button
                  onClick={() => setIsStaffPickerOpen(true)}
                  className="text-sm text-[#009689] font-medium hover:underline"
                >
                  + Thêm nhân viên...
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Ghi chú
                </label>
                <textarea
                  rows={2}
                  placeholder="Lưu ý đặc biệt cho nhân viên..."
                  value={newAssignment.notes}
                  onChange={(e) =>
                    setNewAssignment((p) => ({ ...p, notes: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-5 border-t border-[#e2e8f0]">
              <button
                onClick={() => setIsAssignOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 border border-[#e2e8f0] hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateAssignment}
                disabled={
                  !newAssignment.templateId ||
                  !newAssignment.area ||
                  !newAssignment.date
                }
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f73] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Giao việc
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
                Chi tiết công việc
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
            {selectedAssignment && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ backgroundColor: selectedAssignment.taskIconBg }}
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
                <div className="grid grid-cols-2 gap-3 p-4 bg-[#f8fafc] rounded-lg text-sm">
                  <div>
                    <p className="text-xs text-[#64748b] mb-0.5">Khu vực</p>
                    <p className="font-medium text-[#1e293b]">
                      {selectedAssignment.area}
                      {selectedAssignment.plot
                        ? ` · ${selectedAssignment.plot}`
                        : ""}
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
                    <div>
                      <p className="text-xs text-[#64748b] mb-0.5">Khung giờ</p>
                      <p className="font-medium text-[#1e293b]">
                        {selectedAssignment.time}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-[#64748b] mb-0.5">Nhân viên</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedAssignment.workerNames.length > 0 ? (
                        selectedAssignment.workerNames.map((n, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-[#f1f5f9] text-[#475569] rounded text-xs"
                          >
                            {n}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[#94a3b8]">
                          Chưa phân công
                        </span>
                      )}
                    </div>
                  </div>
                </div>
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
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ══ MODAL: Staff Picker ══ */}
      <Dialog.Root open={isStaffPickerOpen} onOpenChange={setIsStaffPickerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-base font-semibold text-[#1e293b] flex items-center gap-2">
                <User className="w-4 h-4 text-[#009689]" /> Chọn nhân viên
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Chọn nhân viên để phân công công việc
            </Dialog.Description>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#90A1B9]" />
              <input
                type="text"
                placeholder="Tìm tên nhân viên..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689]"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {filteredStaff.map((s) => {
                const selected = selectedWorkerIds.includes(s.id);
                const statusLabel: Record<string, string> = {
                  available: "Sẵn sàng",
                  busy: "Đang bận",
                  off: "Nghỉ phép",
                };
                const statusColor: Record<string, string> = {
                  available: "text-[#059669]",
                  busy: "text-[#94a3b8]",
                  off: "text-[#94a3b8]",
                };
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleWorker(s.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${selected ? "border-[#009689] bg-[#f0fdfa]" : "border-[#e2e8f0] hover:border-[#009689]"}`}
                  >
                    <div className="flex justify-between mb-2">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-[#1e293b]"
                        style={{ backgroundColor: s.color }}
                      >
                        {s.initials}
                      </div>
                      {selected && (
                        <CheckCircle2 className="w-4 h-4 text-[#009689]" />
                      )}
                    </div>
                    <p className="text-xs font-medium text-[#1e293b] mb-0.5">
                      {s.name}
                    </p>
                    <p
                      className={`text-xs ${statusColor[s.status] ?? "text-[#94a3b8]"}`}
                    >
                      {statusLabel[s.status] ?? s.status}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 mt-5 pt-4 border-t border-[#e2e8f0]">
              <button
                onClick={() => setIsStaffPickerOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 border border-[#e2e8f0] hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => setIsStaffPickerOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f73] transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Xác nhận (
                {selectedWorkerIds.length})
              </button>
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
    </div>
  );
}
