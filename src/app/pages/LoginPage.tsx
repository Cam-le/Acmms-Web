import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Eye, EyeOff, Loader2, Wifi, WifiOff } from "lucide-react";
import { apiLogin } from "../../api/auth";
import { mockAccounts } from "../../data/mockAccounts";

type Mode = "mock" | "api";

function saveSesssion(userId: string, email: string, mode: Mode) {
  localStorage.setItem("isAuthenticated", "true");
  localStorage.setItem("userId", userId);
  localStorage.setItem("userEmail", email);
  localStorage.setItem("authMode", mode);
}

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiStatus, setApiStatus] = useState<"idle" | "success" | "failed">(
    "idle",
  );

  // ── Mock login (default path) ──────────────────────────────────────────────
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
      // Also accept any non-empty credentials as a guest mock session
      // so testers aren't blocked — use a generic mock identity
      const fallbackId = "mock-guest";
      saveSesssion(fallbackId, email, "mock");
    } else {
      saveSesssion(found.userId, found.email, "mock");
    }

    setLoading(false);
    navigate("/dashboard");
  };

  // ── API login (opt-in) ─────────────────────────────────────────────────────
  const handleApiLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Vui lòng nhập email và mật khẩu trước");
      return;
    }

    setApiLoading(true);
    setApiStatus("idle");

    try {
      const res = await apiLogin({ email, password });

      if (res.success && res.data) {
        setApiStatus("success");
        saveSesssion(res.data.userId, res.data.email, "api");
        navigate("/dashboard");
      } else {
        setApiStatus("failed");
        setError(
          res.message || "Đăng nhập thất bại. Dùng tài khoản demo để tiếp tục.",
        );
      }
    } catch {
      setApiStatus("failed");
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

        {/* Mock-data notice banner */}
        <div className="flex items-start gap-2 mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <WifiOff size={14} className="mt-0.5 shrink-0 text-amber-500" />
          <span>
            Hệ thống đang dùng <strong>dữ liệu demo</strong>. Nhấn{" "}
            <strong>"Kết nối API"</strong> để thử đăng nhập thật.
          </span>
        </div>

        {/* Demo accounts hint */}
        <div className="mb-5 p-3 bg-[#f0fdf9] border border-[#99f6e4] rounded-xl text-xs text-[#0f766e]">
          <p className="font-semibold mb-1">Tài khoản demo:</p>
          <p>admin@gmail.com</p>
          <p>123456</p>
        </div>

        <form onSubmit={handleMockLogin} className="space-y-4">
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
                onChange={(e) => setPassword(e.target.value)}
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

          {apiStatus === "success" && (
            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2">
              <Wifi size={16} /> Kết nối API thành công!
            </div>
          )}

          {/* Primary: mock login */}
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

          {/* Secondary: real API attempt */}
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
