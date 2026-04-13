import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Eye, EyeOff, Loader2, Wifi } from "lucide-react";
import { apiRegister } from "../../api/auth";

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullname: "",
    phoneNumber: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const set =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const validate = (): string => {
    if (
      !form.email.trim() ||
      !form.password.trim() ||
      !form.fullname.trim() ||
      !form.phoneNumber.trim()
    )
      return "Vui lòng điền đầy đủ thông tin";
    if (form.password !== form.confirmPassword)
      return "Mật khẩu xác nhận không khớp";
    if (form.password.length < 6) return "Mật khẩu phải có ít nhất 6 ký tự";
    return "";
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);

    try {
      const res = await apiRegister({
        email: form.email.trim(),
        password: form.password.trim(),
        fullname: form.fullname.trim(),
        phoneNumber: form.phoneNumber.trim(),
      });

      if (res.success) {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 1200);
      } else {
        setError(res.message || "Đăng ký thất bại. Vui lòng thử lại.");
      }
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
        <div className="text-center mb-6">
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
          <p className="text-[#64748b] text-sm">Tạo tài khoản mới</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#45556c] mb-1">
              Họ và tên
            </label>
            <input
              type="text"
              value={form.fullname}
              onChange={set("fullname")}
              className="w-full px-4 py-3 rounded-[10px] border border-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#009689] focus:border-transparent transition-all text-[#334155]"
              placeholder="Nguyễn Văn A"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#45556c] mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              className="w-full px-4 py-3 rounded-[10px] border border-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#009689] focus:border-transparent transition-all text-[#334155]"
              placeholder="ten@farm.com"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#45556c] mb-1">
              Số điện thoại
            </label>
            <input
              type="tel"
              value={form.phoneNumber}
              onChange={set("phoneNumber")}
              className="w-full px-4 py-3 rounded-[10px] border border-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#009689] focus:border-transparent transition-all text-[#334155]"
              placeholder="0909998877"
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
                value={form.password}
                onChange={set("password")}
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

          <div>
            <label className="block text-sm font-medium text-[#45556c] mb-1">
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={form.confirmPassword}
                onChange={set("confirmPassword")}
                className="w-full px-4 py-3 rounded-[10px] border border-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#009689] focus:border-transparent transition-all text-[#334155]"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b]"
              >
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2">
              <Wifi size={16} /> Đăng ký thành công! Đang chuyển hướng...
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
                Đang tạo tài khoản...
              </>
            ) : (
              "Đăng ký"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-[#64748b] mt-6">
          Đã có tài khoản?{" "}
          <Link
            to="/login"
            className="text-[#009689] hover:underline font-medium"
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
