import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Eye, EyeOff, Loader2, Wifi } from "lucide-react";
import {
  apiLogin,
  decodeJwt,
  saveApiSession,
  dashboardByRole,
  ALLOWED_WEB_ROLES,
} from "../../api/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Vui lòng nhập email và mật khẩu");
      return;
    }

    setLoading(true);

    try {
      const res = await apiLogin({
        email: email.trim(),
        password: password.trim(),
      });

      if (!res.success || !res.data?.token) {
        setError(
          res.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.",
        );
        return;
      }

      const payload = decodeJwt(res.data.token);
      if (!payload) {
        setError("Token không hợp lệ. Vui lòng thử lại.");
        return;
      }

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

      saveApiSession(res.data.token, payload);
      navigate(dashboardByRole(payload.role));
    } catch {
      setError(
        "Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.",
      );
    } finally {
      setLoading(false);
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

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#45556c] mb-1">
              Email
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-[10px] border border-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#009689] focus:border-transparent transition-all text-[#334155]"
              placeholder="admin@farm.com"
              disabled={loading}
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
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-[10px] border border-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#009689] focus:border-transparent transition-all text-[#334155]"
                placeholder="••••••••"
                disabled={loading}
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#009689] hover:bg-[#0f766e] text-white font-medium py-3 rounded-[10px] transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Đang đăng nhập...
              </>
            ) : (
              <>
                <Wifi size={16} />
                Đăng nhập
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
