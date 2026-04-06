import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Eye, EyeOff, Loader2, Wifi, WifiOff } from "lucide-react";
import {
  apiLogin,
  decodeJwt,
  saveApiSession,
  dashboardByRole,
  ALLOWED_WEB_ROLES,
} from "../../api/auth";
import { mockAccounts } from "../../data/mockAccounts";

type Mode = "mock" | "api";

// ── Mock session helper (kept separate from API session) ─────────────────────
function saveMockSession(
  userId: string,
  email: string,
  roleName?: string,
  fullname?: string,
) {
  localStorage.setItem("isAuthenticated", "true");
  localStorage.setItem("userId", userId);
  localStorage.setItem("userEmail", email);
  localStorage.setItem("authMode", "mock" satisfies Mode);
  if (roleName) localStorage.setItem("userRole", roleName);
  if (fullname) localStorage.setItem("userName", fullname);
}

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiSuccess, setApiSuccess] = useState(false);

  // ── Mock login (default / demo path) ─────────────────────────────────────
  const handleMockLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Vui lòng nhập email và mật khẩu");
      return;
    }

    setLoading(true);

    const found = mockAccounts.find(
      (a) => a.email === email && a.password === password,
    );

    if (!found) {
      // Fallback guest session — default to Owner view
      saveMockSession("mock-guest", email, "Owner", email);
    } else {
      saveMockSession(
        found.userId,
        found.email,
        found.roleName,
        found.fullname,
      );
    }

    setLoading(false);
    navigate(dashboardByRole(found?.roleName));
  };

  // ── API login (real backend) ──────────────────────────────────────────────
  const handleApiLogin = async () => {
    setError("");
    setApiSuccess(false);

    if (!email || !password) {
      setError("Vui lòng nhập email và mật khẩu trước");
      return;
    }

    setApiLoading(true);

    try {
      const res = await apiLogin({ email, password });

      if (!res.success || !res.data?.token) {
        setError(
          res.message || "Đăng nhập thất bại. Dùng tài khoản demo để tiếp tục.",
        );
        return;
      }

      // Decode JWT to get role + userId without an extra round-trip
      const payload = decodeJwt(res.data.token);
      if (!payload) {
        setError("Token không hợp lệ. Vui lòng thử lại.");
        return;
      }

      // Block Worker accounts from the web app
      if (
        !ALLOWED_WEB_ROLES.includes(
          payload.role as (typeof ALLOWED_WEB_ROLES)[number],
        )
      ) {
        setError(
          `Tài khoản "${payload.role}" không được phép đăng nhập vào web. Vui lòng dùng ứng dụng di động.`,
        );
        return;
      }

      // Persist token + decoded fields
      saveApiSession(res.data.token, payload);

      setApiSuccess(true);
      navigate(dashboardByRole(payload.role));
    } catch {
      setError("Không thể kết nối máy chủ. Dùng tài khoản demo để tiếp tục.");
    } finally {
      setApiLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9] p-4 font-sans">
      <div className="bg-white p-8 rounded-[20px] shadow-lg w-full max-w-[420px] border border-[#e2e8f0]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#009689] rounded-[16px] mb-4 text-white">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-8 h-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#115e59] mb-1">ACMMS</h1>
          <p className="text-[#64748b] text-sm">Đăng nhập để tiếp tục</p>
        </div>

        {/* Demo accounts hint */}
        <div className="mb-5 p-3 bg-[#f0fdf9] border border-[#99f6e4] rounded-xl text-xs text-[#0f766e]">
          <p className="font-semibold mb-1.5">Tài khoản demo:</p>
          <p className="mb-0.5">
            <span className="font-medium">Chủ nông trại:</span> owner@gmail.com
            / 123456
          </p>
          <p>
            <span className="font-medium">Chuyên gia:</span>{" "}
            specialist@gmail.com / 123456
          </p>
        </div>

        <form onSubmit={handleMockLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#45556c] mb-1">
              Email
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              className="w-full px-4 py-3 rounded-[10px] border border-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#009689] focus:border-transparent transition-all text-[#334155]"
              placeholder="admin@farm.com"
              disabled={loading || apiLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#45556c] mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value.trim())}
                className="w-full px-4 py-3 rounded-[10px] border border-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#009689] focus:border-transparent transition-all text-[#334155]"
                placeholder="••••••••"
                disabled={loading || apiLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b]"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          {apiSuccess && (
            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2">
              <Wifi size={16} /> Kết nối API thành công!
            </div>
          )}

          {/* Primary: mock/demo login */}
          <button
            type="submit"
            disabled={loading || apiLoading}
            className="w-full bg-[#009689] hover:bg-[#0f766e] text-white font-medium py-3 rounded-[10px] transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                Đang đăng nhập...
              </>
            ) : (
              "Đăng nhập (Demo)"
            )}
          </button>

          {/* Secondary: real API login */}
          <button
            type="button"
            onClick={handleApiLogin}
            disabled={loading || apiLoading}
            className="w-full border border-[#009689] text-[#009689] hover:bg-[#f0fdf9] font-medium py-3 rounded-[10px] transition-colors flex items-center justify-center gap-2"
          >
            {apiLoading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Đang kết nối...
              </>
            ) : (
              <>
                <Wifi size={16} />
                Kết nối API
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-[#64748b] mt-6">
          Chưa có tài khoản?{" "}
          <Link
            to="/register"
            className="text-[#009689] hover:underline font-medium"
          >
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  );
}
