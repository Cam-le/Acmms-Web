import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Eye,
  Edit,
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
  Loader2,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { Task, Staff } from "../../data/mockData";
import {
  fetchTasks,
  fetchStaff,
  createTask,
  deleteTask,
} from "../../api/mockApi";

const statusConfig = {
  pending: { label: "Chưa xử lý", color: "bg-[#FEE2E2] text-[#991B1B]" },
  "in-progress": { label: "Đang xử lý", color: "bg-[#FEF3C7] text-[#92400E]" },
  completed: { label: "Hoàn tất", color: "bg-[#D1FAE5] text-[#065F46]" },
};

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "in-progress" | "completed"
  >("all");
  const [filterArea, setFilterArea] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("list");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date(2023, 11, 20)); // December 20, 2023
  const [createStep, setCreateStep] = useState(1);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);

  useEffect(() => {
    fetchTasks().then((data) => setTasks(data));
    fetchStaff().then((data) => setStaffList(data));
  }, []);

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.area.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || task.status === filterStatus;
    const matchesArea = filterArea === "all" || task.area === filterArea;

    return matchesSearch && matchesStatus && matchesArea;
  });

  const openViewModal = (task: Task) => {
    setSelectedTask(task);
    setIsViewModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const openDeleteDialog = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteTask = () => {
    if (!taskToDelete) return;
    deleteTask(taskToDelete.id).then(() => {
      setTasks(tasks.filter((t) => t.id !== taskToDelete.id));
      setIsDeleteDialogOpen(false);
      setTaskToDelete(null);
    });
  };

  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Monday

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays();
  const dayNames = [
    "THỨ 2",
    "THỨ 3",
    "HÔM NAY",
    "THỨ 4",
    "THỨ 5",
    "THỨ 6",
    "THỨ 7",
  ];

  const getTasksForDay = (date: Date) => {
    return tasks.filter((task) => {
      if (!task.date) return false;
      const [day, month, year] = task.date.split("/");
      const taskDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
      );
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const toggleStaffSelection = (staffId: string) => {
    setSelectedStaff((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId],
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#115e59]">
            Lịch trình công việc
          </h1>
          <p className="text-sm text-[#64748b] mt-1">
            Quản lý và theo dõi tiến độ hoạt động tại trang trại
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-[#009689] text-white px-4 py-2 rounded-[10px] flex items-center gap-2 hover:bg-[#007f73] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm công việc
        </button>
      </div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex gap-6 border-b border-[#e2e8f0]">
          <Tabs.Trigger
            value="list"
            className="pb-3 px-1 relative text-sm font-medium text-[#64748b] data-[state=active]:text-[#009689] transition-colors"
          >
            <div className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Lịch trình
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#009689] opacity-0 data-[state=active]:opacity-100 transition-opacity" />
          </Tabs.Trigger>
          <Tabs.Trigger
            value="calendar"
            className="pb-3 px-1 relative text-sm font-medium text-[#64748b] data-[state=active]:text-[#009689] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Nhiệm vụ
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#009689] opacity-0 data-[state=active]:opacity-100 transition-opacity" />
          </Tabs.Trigger>
        </Tabs.List>

        {/* List View */}
        <Tabs.Content value="list" className="mt-6 space-y-6">
          {/* Search and Filters */}
          <div className="bg-white rounded-[10px] p-4 shadow-sm border border-[#e2e8f0]">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[300px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#90A1B9]" />
                <input
                  type="text"
                  placeholder="Tìm kiếm nhiệm vụ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[#cad5e2] rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] focus:border-transparent"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border border-[#cad5e2] rounded-[10px] text-sm text-[#314158] bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
              >
                <option value="all">Trạng thái: Tất cả</option>
                <option value="pending">Chưa xử lý</option>
                <option value="in-progress">Đang xử lý</option>
                <option value="completed">Hoàn tất</option>
              </select>
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                className="px-4 py-2 border border-[#cad5e2] rounded-[10px] text-sm text-[#314158] bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
              >
                <option value="all">Khu vực: Tất cả</option>
                <option value="Khu A">Khu A</option>
                <option value="Khu B">Khu B</option>
                <option value="Khu C">Khu C</option>
                <option value="Khu D">Khu D</option>
                <option value="Khu E">Khu E</option>
              </select>
            </div>
          </div>

          {/* Tasks Table */}
          <div className="bg-white rounded-[10px] shadow-sm border border-[#e2e8f0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-[#62748e]">
                      TÊN NHIỆM VỤ
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-[#62748e]">
                      KHU VỰC
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-[#62748e]">
                      TRẠNG THÁI
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-medium text-[#62748e]">
                      HÀNH ĐỘNG
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      className="border-b border-[#e2e8f0] hover:bg-[#f8fafc] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                            style={{ backgroundColor: task.iconBg }}
                          >
                            {task.icon}
                          </div>
                          <div>
                            <p className="font-medium text-[#1e293b]">
                              {task.name}
                            </p>
                            <p className="text-sm text-[#64748b] mt-0.5">
                              {task.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#45556c]">
                        {task.area} - {task.plot}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-md text-sm font-medium ${
                            statusConfig[task.status].color
                          }`}
                        >
                          {statusConfig[task.status].label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openViewModal(task)}
                            className="p-2 text-[#009689] hover:bg-[#dcfce7] rounded-[10px] transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(task)}
                            className="p-2 text-[#009689] hover:bg-[#dcfce7] rounded-[10px] transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteDialog(task)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-[10px] transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-[#e2e8f0] flex items-center justify-between">
              <p className="text-sm text-[#64748b]">
                Hiển thị <span className="font-medium">1</span> đến{" "}
                <span className="font-medium">{filteredTasks.length}</span>{" "}
                trong <span className="font-medium">{tasks.length}</span> nhiệm
                vụ
              </p>
              <div className="flex gap-2">
                <button className="p-2 border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] transition-colors">
                  <ChevronLeft className="w-4 h-4 text-[#64748b]" />
                </button>
                <button className="p-2 border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] transition-colors">
                  <ChevronRight className="w-4 h-4 text-[#64748b]" />
                </button>
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* Calendar View */}
        <Tabs.Content value="calendar" className="mt-6 space-y-6">
          {/* Calendar Header */}
          <div className="bg-white rounded-[10px] p-4 shadow-sm border border-[#e2e8f0]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() =>
                    setCurrentDate(
                      new Date(currentDate.setDate(currentDate.getDate() - 7)),
                    )
                  }
                  className="p-2 hover:bg-[#f1f5f9] rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-[#64748b]" />
                </button>
                <h2 className="text-lg font-semibold text-[#1e293b]">
                  Tháng {currentDate.getMonth() + 1},{" "}
                  {currentDate.getFullYear()}
                </h2>
                <button
                  onClick={() =>
                    setCurrentDate(
                      new Date(currentDate.setDate(currentDate.getDate() + 7)),
                    )
                  }
                  className="p-2 hover:bg-[#f1f5f9] rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-[#64748b]" />
                </button>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 text-sm font-medium text-[#009689] bg-[#d1fae5] rounded-lg hover:bg-[#a7f3d0] transition-colors">
                  Tuần
                </button>
                <button className="px-4 py-2 text-sm font-medium text-[#64748b] bg-white border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] transition-colors">
                  Tháng
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-white rounded-[10px] shadow-sm border border-[#e2e8f0] overflow-hidden">
            <div className="grid grid-cols-7 gap-0">
              {weekDays.map((day, index) => {
                const isToday =
                  day.getDate() === 20 &&
                  day.getMonth() === 11 &&
                  day.getFullYear() === 2023;
                const dayTasks = getTasksForDay(day);

                return (
                  <div
                    key={index}
                    className={`border-r border-b border-[#e2e8f0] min-h-[300px] ${
                      index === 6 ? "border-r-0" : ""
                    }`}
                  >
                    <div
                      className={`p-4 text-center border-b border-[#e2e8f0] ${
                        isToday ? "bg-[#d1fae5]" : "bg-[#f8fafc]"
                      }`}
                    >
                      <p className="text-xs font-medium text-[#64748b] mb-1">
                        {index === 2 ? "HÔM NAY" : dayNames[index]}
                      </p>
                      <p
                        className={`text-lg font-semibold ${
                          isToday ? "text-[#009689]" : "text-[#1e293b]"
                        }`}
                      >
                        {day.getDate()}
                      </p>
                    </div>
                    <div className="p-3 space-y-2">
                      {dayTasks.map((task) => (
                        <div
                          key={task.id}
                          className="p-3 rounded-lg border-l-4 bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                          style={{
                            borderLeftColor:
                              task.status === "completed"
                                ? "#10b981"
                                : task.status === "in-progress"
                                  ? "#f59e0b"
                                  : "#ef4444",
                          }}
                          onClick={() => openViewModal(task)}
                        >
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${
                              statusConfig[task.status].color
                            }`}
                          >
                            {statusConfig[task.status].label}
                          </span>
                          <p className="text-sm font-medium text-[#1e293b] line-clamp-2 mb-2">
                            {task.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-[#64748b]">
                            <MapPin className="w-3 h-3" />
                            <span>{task.area}</span>
                          </div>
                          {task.time && (
                            <div className="flex items-center gap-2 text-xs text-[#64748b] mt-1">
                              <Clock className="w-3 h-3" />
                              <span>{task.time}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-[#64748b] mt-2">
                            <User className="w-3 h-3" />
                            <span>{task.assignee}</span>
                          </div>
                        </div>
                      ))}
                      {dayTasks.length === 0 && (
                        <p className="text-sm text-[#94a3b8] text-center py-8">
                          Không có lịch trình
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* Create Task Modal */}
      <Dialog.Root open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40 animate-in fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl bg-white rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <Dialog.Title className="text-xl font-bold text-[#1e293b]">
                  Tạo lịch trình công việc
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Form để tạo lịch trình công việc mới
            </Dialog.Description>

            <div className="space-y-6">
              {/* Step 1: Basic Info */}
              <div className="bg-[#f8fafc] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[#009689] text-white flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <h3 className="text-lg font-semibold text-[#1e293b]">
                    Thông tin lịch trình
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tên lịch trình công việc{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nhập tên lịch trình..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Loại công việc
                    </label>
                    <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#009689] focus:border-transparent">
                      <option>Chọn loại công việc</option>
                      <option>Bón phân</option>
                      <option>Tưới nước</option>
                      <option>Thu hoạch</option>
                      <option>Kiểm tra</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Mô tả lịch trình
                    </label>
                    <textarea
                      placeholder="Mô tả chi tiết công việc cần làm..."
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Time & Cycle */}
              <div className="bg-[#f8fafc] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-[#e2e8f0] text-[#64748b] flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <h3 className="text-lg font-semibold text-[#1e293b]">
                    Thời gian & Chu kỳ
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Ngày bắt đầu
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Ngày kết thúc
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Chu kỳ
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      <button className="px-4 py-2 text-sm font-medium bg-white border-2 border-[#009689] text-[#009689] rounded-lg">
                        Hàng tuần
                      </button>
                      <button className="px-4 py-2 text-sm font-medium bg-white border border-[#e2e8f0] text-[#64748b] rounded-lg hover:border-[#009689] transition-colors">
                        Một lần
                      </button>
                      <button className="px-4 py-2 text-sm font-medium bg-white border border-[#e2e8f0] text-[#64748b] rounded-lg hover:border-[#009689] transition-colors">
                        Hàng ngày
                      </button>
                      <button className="px-4 py-2 text-sm font-medium bg-white border border-[#e2e8f0] text-[#64748b] rounded-lg hover:border-[#009689] transition-colors">
                        Theo mùa vụ
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Chọn ngày trong tuần
                    </label>
                    <div className="flex gap-2">
                      {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(
                        (day, i) => (
                          <button
                            key={i}
                            className={`w-10 h-10 rounded-full text-sm font-medium ${
                              i === 2 || i === 4
                                ? "bg-[#009689] text-white"
                                : "bg-white border border-[#e2e8f0] text-[#64748b] hover:border-[#009689]"
                            } transition-colors`}
                          >
                            {day}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Area */}
              <div className="bg-[#f8fafc] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-[#e2e8f0] text-[#64748b] flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <h3 className="text-lg font-semibold text-[#1e293b]">
                    Khu vực
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Mùa vụ
                      </label>
                      <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]">
                        <option>Mùa Đông 2023</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Cây trồng
                      </label>
                      <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]">
                        <option>Cà chua</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Khu vực áp dụng
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: "Khu A - Nhà kính", checked: false },
                        { name: "Khu B - Ngoại trời", checked: true },
                        { name: "Khu C - Vườn ươm", checked: false },
                        { name: "Khu D - Thủy canh", checked: false },
                      ].map((area, i) => (
                        <label
                          key={i}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                            area.checked
                              ? "border-[#009689] bg-[#d1fae5]"
                              : "border-[#e2e8f0] bg-white hover:border-[#009689]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            defaultChecked={area.checked}
                            className="w-4 h-4 text-[#009689] border-gray-300 rounded focus:ring-[#009689]"
                          />
                          <span className="text-sm font-medium text-[#1e293b]">
                            {area.name}
                          </span>
                          {area.checked && (
                            <CheckCircle2 className="w-4 h-4 text-[#009689] ml-auto" />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4: Staff Assignment */}
              <div className="bg-[#f8fafc] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-[#e2e8f0] text-[#64748b] flex items-center justify-center text-sm font-semibold">
                    4
                  </div>
                  <h3 className="text-lg font-semibold text-[#1e293b]">
                    Phân công nhân sự
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nhóm nhân viên phụ trách
                    </label>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 bg-[#dbeafe] text-[#1e40af] text-sm rounded-md flex items-center gap-2">
                        Kỹ thuật viên A
                        <button className="hover:text-[#1e3a8a]">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                      <span className="px-3 py-1 bg-[#dbeafe] text-[#1e40af] text-sm rounded-md flex items-center gap-2">
                        Nhóm Chăm sóc 1
                        <button className="hover:text-[#1e3a8a]">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    </div>
                    <button
                      onClick={() => setIsStaffModalOpen(true)}
                      className="text-sm text-[#009689] hover:text-[#007f73] font-medium"
                    >
                      + Thêm nhóm hoặc nhân viên...
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Ghi chú phân công
                    </label>
                    <textarea
                      placeholder="Lưu ý đặc biệt cho nhân viên..."
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t border-[#e2e8f0]">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 border border-[#e2e8f0] hover:bg-slate-100 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-[#009689] text-[#009689] hover:bg-[#f0fdfa] transition-colors"
              >
                Lưu nháp
              </button>
              <button className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f73] transition-colors flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Lưu & Tạo lịch trình
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Staff Selection Modal */}
      <Dialog.Root open={isStaffModalOpen} onOpenChange={setIsStaffModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-[#009689]" />
                Chọn nhân sự tham gia công việc
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Chọn nhân viên để phân công công việc
            </Dialog.Description>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#90A1B9]" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm nhân sự theo tên..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] focus:border-transparent"
                  />
                </div>
                <select className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]">
                  <option>Trạng thái</option>
                  <option>Sẵn sàng</option>
                  <option>Đang bận</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-sm text-[#64748b]">
                <span className="font-medium">ĐANG LỌC:</span>
                <span className="px-2 py-1 bg-[#d1fae5] text-[#065f46] rounded-md flex items-center gap-1">
                  Trạng thái
                  <button className="hover:text-[#047857]">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {staffList.map((staff) => {
                  const isSelected = selectedStaff.includes(staff.id);
                  const statusInfo = {
                    available: { label: "Sẵn sàng", color: "text-[#059669]" },
                    busy: { label: "Đang bận", color: "text-[#64748b]" },
                    off: { label: "Nghỉ phép", color: "text-[#64748b]" },
                  };

                  return (
                    <button
                      key={staff.id}
                      onClick={() => toggleStaffSelection(staff.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? "border-[#009689] bg-[#f0fdfa] shadow-md"
                          : "border-[#e2e8f0] bg-white hover:border-[#009689]"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-[#1e293b]"
                          style={{ backgroundColor: staff.color }}
                        >
                          {staff.initials}
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-[#009689]" />
                        )}
                      </div>
                      <p className="font-medium text-sm text-[#1e293b] mb-1">
                        {staff.name}
                      </p>
                      <p
                        className={`text-xs ${
                          statusInfo[staff.status as keyof typeof statusInfo]
                            .color
                        } flex items-center gap-1`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {
                          statusInfo[staff.status as keyof typeof statusInfo]
                            .label
                        }
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t border-[#e2e8f0]">
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 border border-[#e2e8f0] hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f73] transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Xác nhận phân công nhân sự
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* View Task Modal */}
      <Dialog.Root open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40 animate-in fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-bold text-[#1e293b]">
                Chi tiết công việc
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Xem thông tin chi tiết công việc
            </Dialog.Description>

            {selectedTask && (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                    style={{ backgroundColor: selectedTask.iconBg }}
                  >
                    {selectedTask.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#1e293b] mb-2">
                      {selectedTask.name}
                    </h3>
                    <p className="text-sm text-[#64748b]">
                      {selectedTask.description}
                    </p>
                    <span
                      className={`inline-block px-3 py-1 rounded-md text-sm font-medium mt-3 ${
                        statusConfig[selectedTask.status].color
                      }`}
                    >
                      {statusConfig[selectedTask.status].label}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-[#f8fafc] rounded-lg">
                  <div>
                    <p className="text-xs text-[#64748b] mb-1">Khu vực</p>
                    <p className="text-sm font-medium text-[#1e293b]">
                      {selectedTask.area} - {selectedTask.plot}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748b] mb-1">
                      Người phụ trách
                    </p>
                    <p className="text-sm font-medium text-[#1e293b]">
                      {selectedTask.assignee}
                    </p>
                  </div>
                  {selectedTask.date && (
                    <div>
                      <p className="text-xs text-[#64748b] mb-1">
                        Ngày thực hiện
                      </p>
                      <p className="text-sm font-medium text-[#1e293b]">
                        {selectedTask.date}
                      </p>
                    </div>
                  )}
                  {selectedTask.time && (
                    <div>
                      <p className="text-xs text-[#64748b] mb-1">Thời gian</p>
                      <p className="text-sm font-medium text-[#1e293b]">
                        {selectedTask.time}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-[#1e293b] mb-3">
                    Ghi chú của nhân viên
                  </h4>
                  <div className="p-4 bg-[#f8fafc] rounded-lg text-sm text-[#475569]">
                    "Đã hoàn thành bón phân NPK cho luống 05. Cây đang ở giai
                    đoạn đâu quả tốt. Đặt cỏ độ ẩm vừa phải, thuận lợi cho việc
                    hấp thu dinh dưỡng."
                  </div>
                </div>

                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f73] transition-colors"
                >
                  Đóng
                </button>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Edit Task Modal */}
      <Dialog.Root open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40 animate-in fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-bold text-[#1e293b]">
                Chỉnh sửa công việc
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Chỉnh sửa thông tin công việc
            </Dialog.Description>

            {selectedTask && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tên công việc
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedTask.name}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Mô tả
                  </label>
                  <textarea
                    defaultValue={selectedTask.description}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009689] focus:border-transparent resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Khu vực
                    </label>
                    <select
                      defaultValue={selectedTask.area}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                    >
                      <option value="Khu A">Khu A</option>
                      <option value="Khu B">Khu B</option>
                      <option value="Khu C">Khu C</option>
                      <option value="Khu D">Khu D</option>
                      <option value="Khu E">Khu E</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Trạng thái
                    </label>
                    <select
                      defaultValue={selectedTask.status}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#009689]"
                    >
                      <option value="pending">Chưa xử lý</option>
                      <option value="in-progress">Đang xử lý</option>
                      <option value="completed">Hoàn tất</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-[#e2e8f0]">
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 border border-[#e2e8f0] hover:bg-slate-100 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement update logic here
                      setIsEditModalOpen(false);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-[#009689] text-white hover:bg-[#007f73] transition-colors"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation Dialog */}
      <AlertDialog.Root
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-40 animate-in fade-in" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <AlertDialog.Title className="text-lg font-semibold text-slate-900 mb-2">
              Xác nhận xóa công việc
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-slate-600 mb-6">
              Bạn có chắc chắn muốn xóa công việc{" "}
              <span className="font-semibold">{taskToDelete?.name}</span> không?
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
                  onClick={handleDeleteTask}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Xóa công việc
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
