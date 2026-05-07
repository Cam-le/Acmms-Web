import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Eye, EyeOff, Wifi } from "lucide-react";
import {
  apiLogin,
  saveApiSession,
  fetchAndSaveUserInfo,
  dashboardByRole,
  ALLOWED_WEB_ROLES,
} from "../../api/auth";
import { Button } from "../components/ui/Button";
import { FormField } from "../components/ui/FormField";

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

      saveApiSession(res.data.token);

      const userInfo = await fetchAndSaveUserInfo();
      if (!userInfo) {
        setError("Không thể tải thông tin tài khoản. Vui lòng thử lại.");
        return;
      }

      if (
        !ALLOWED_WEB_ROLES.includes(
          userInfo.roleName as (typeof ALLOWED_WEB_ROLES)[number],
        )
      ) {
        setError(
          `Tài khoản "${userInfo.roleName}" không được phép đăng nhập vào web. Vui lòng dùng ứng dụng di động.`,
        );
        return;
      }

      navigate(dashboardByRole(userInfo.roleName));
    } catch {
      setError(
        "Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-subtle p-4 font-sans">
      <div className="bg-surface p-8 rounded-modal shadow-modal w-full max-w-[420px] border border-border">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-card mb-4 text-primary-fg">
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
          <h1 className="text-2xl font-bold text-primary-700 mb-1">CMMS</h1>
          <p className="text-ink-500 text-sm">Đăng nhập để tiếp tục</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <FormField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="admin@farm.com"
            disabled={loading}
          />

          <FormField
            label="Mật khẩu"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            disabled={loading}
            trailingAddon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="h-full px-3 text-ink-400 hover:text-ink-600 flex items-center"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />

          {error && (
            <div className="p-3 bg-status-danger-bg text-status-danger-fg text-sm rounded-btn">
              {error}
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            loading={loading}
            leadingIcon={Wifi}
            size="md"
          >
            Đăng nhập
          </Button>
        </form>

        <p className="text-center text-sm text-ink-500 mt-6">
          Chưa có tài khoản?{" "}
          <Link
            to="/register"
            className="text-primary hover:underline font-medium"
          >
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  );
}
