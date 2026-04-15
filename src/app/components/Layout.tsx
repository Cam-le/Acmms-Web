import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Tractor,
  CalendarDays,
  MapPin,
  Sprout,
  Users,
  Briefcase,
  Bell,
  Leaf,
  LogOut,
  ChevronUp,
  MessagesSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  History,
  UserCog,
  Layers,
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import * as AlertDialog from "@radix-ui/react-alert-dialog";

// ── Nav definitions per role ─────────────────────────────────────────────────
const ownerNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: Tractor, label: "Trang trại", to: "/farm" },
  { icon: MapPin, label: "Vuông đất", to: "/lands" },
  { icon: CalendarDays, label: "Mùa vụ", to: "/seasons" },
  { icon: Sprout, label: "Cây trồng", to: "/crops" },
  { icon: Layers, label: "Loại đất", to: "/soils" },
  { icon: Users, label: "Nhân viên", to: "/workers" },
  { icon: Briefcase, label: "Công việc", to: "/tasks" },
  { icon: MessagesSquare, label: "Tư vấn", to: "/advisory" },
];

const specialistNavItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    to: "/specialist/dashboard",
  },
  {
    icon: ClipboardList,
    label: "Quản lý tư vấn",
    to: "/specialist/consultations",
  },
  { icon: History, label: "Lịch sử", to: "/specialist/history" },
];

// ── Role label helper ────────────────────────────────────────────────────────
function getRoleLabel(role: string | null) {
  if (role === "Specialist") return "Chuyên gia nông nghiệp";
  if (role === "Owner") return "Chủ nông trại";
  return "Quản trị hệ thống";
}

function getHeaderTitle(role: string | null) {
  if (role === "Specialist") return "Chuyên gia";
  return "Tổng quan";
}

export function AppLayout() {
  const navigate = useNavigate();

  const storedName = localStorage.getItem("userName") ?? "Người dùng";
  const storedRole = localStorage.getItem("userRole");

  const [user] = useState({
    name: storedName,
    role: getRoleLabel(storedRole),
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isSpecialist = storedRole === "Specialist";
  const navItems = isSpecialist ? specialistNavItems : ownerNavItems;

  // Initials from name
  const initials = storedName
    .split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-[#f1f5f9] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarCollapsed ? "w-[80px]" : "w-[260px]"
        } bg-[#009689] flex flex-col shrink-0 text-white shadow-xl z-20 transition-all duration-300`}
      >
        {/* Logo */}
        <div className="h-[80px] flex items-center px-6 gap-3 shrink-0">
          <div className="w-10 h-10 bg-[#ffffff33] rounded-[10px] flex items-center justify-center shadow-sm shrink-0">
            {isSpecialist ? (
              <UserCog className="w-6 h-6 text-white" />
            ) : (
              <Leaf className="w-6 h-6 text-white" />
            )}
          </div>
          {!isSidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg leading-tight tracking-wide">
                ACMMS
              </h1>
              <p className="text-xs text-[#ffffffcc] font-medium">
                {isSpecialist ? "Chuyên gia" : "Quản trị hệ thống"}
              </p>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <div className="flex justify-center py-2 px-3 shrink-0">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 py-1.5 bg-[#ffffff1a] hover:bg-[#ffffff33] rounded-lg text-white transition-all text-xs font-medium"
            title={isSidebarCollapsed ? "Mở rộng" : "Thu gọn"}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Thu gọn</span>
              </>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-[10px] transition-all duration-200 group ${
                  isActive
                    ? "bg-[#ffffff1a] font-medium text-white shadow-inner"
                    : "text-[#ffffffcc] hover:bg-[#ffffff1a] hover:text-white"
                } ${isSidebarCollapsed ? "justify-center" : ""}`
              }
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!isSidebarCollapsed && (
                <span className="text-[15px] truncate">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 mt-auto">
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                className={`w-full bg-[#007f73] hover:bg-[#006d63] active:scale-[0.98] transition-all rounded-[12px] p-3 flex items-center gap-3 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                  isSidebarCollapsed ? "justify-center" : ""
                }`}
              >
                <div className="w-10 h-10 bg-[#dcfce7] rounded-full flex items-center justify-center text-[#009689] font-bold text-sm shrink-0 border-2 border-white/20">
                  {initials}
                </div>
                {!isSidebarCollapsed && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-medium text-sm leading-snug text-white break-words">
                        {user.name}
                      </p>
                      <p className="text-xs text-[#ffffffcc] truncate">
                        {user.role}
                      </p>
                    </div>
                    <ChevronUp className="w-4 h-4 text-[#ffffffcc]" />
                  </>
                )}
              </button>
            </Popover.Trigger>

            <Popover.Portal>
              <Popover.Content
                className="w-[228px] bg-white rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200 mb-2 border border-slate-100 z-50"
                sideOffset={5}
                align="center"
              >
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-sm font-medium text-slate-900">
                    {user.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user.role}</p>
                </div>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </button>
                <Popover.Arrow className="fill-white" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </aside>

      {/* Logout Confirmation Dialog */}
      <AlertDialog.Root
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <AlertDialog.Title className="text-lg font-semibold text-slate-900 mb-2">
              Xác nhận đăng xuất
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-slate-600 mb-6">
              Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?
            </AlertDialog.Description>
            <div className="flex gap-3 justify-end">
              <AlertDialog.Cancel asChild>
                <button className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
                  Hủy bỏ
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Đăng xuất
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shrink-0 z-10">
          <h2 className="text-lg font-semibold text-slate-800">
            {getHeaderTitle(storedRole)}
          </h2>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            {/* Role badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f0fdf9] rounded-lg border border-[#009689]/20">
              <div className="w-2 h-2 rounded-full bg-[#009689]" />
              <span className="text-xs font-medium text-[#009689]">
                {user.role}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
