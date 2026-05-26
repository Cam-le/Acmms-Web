import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import { apiRegister } from "../../api/auth";
import { Button } from "../components/ui/Button";
import { FormField } from "../components/ui/FormField";
import { FormSelect } from "../components/ui/FormSelect";
import { useToast } from "../components/ui/useToast";
import { ToastContainer } from "../components/ui/ToastContainer";

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullname: "",
    phoneNumber: "",
    targetRole: "Worker",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();

  const setField = (field: keyof typeof form) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
    if (form.password.length < 8 || form.password.length > 100)
      return "Mật khẩu phải từ 8 đến 100 ký tự";
    if (!/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password))
      return "Mật khẩu phải chứa cả chữ và số";
    return "";
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      showToast(err, "error");
      return;
    }

    setLoading(true);

    try {
      const res = await apiRegister({
        email: form.email.trim(),
        password: form.password.trim(),
        fullname: form.fullname.trim(),
        phoneNumber: form.phoneNumber.trim(),
        targetRole: form.targetRole,
      });

      if (res.success) {
        showToast("Đăng ký thành công! Đang chuyển hướng...", "success");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        showToast(
          res.message || "Đăng ký thất bại. Vui lòng thử lại.",
          "error",
        );
      }
    } catch {
      showToast(
        "Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-subtle p-4 font-sans">
      <div className="bg-surface p-8 rounded-modal shadow-modal w-full max-w-[420px] border border-border">
        {/* Header */}
        <div className="text-center mb-6">
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
          {/* §10.1 resolved — brand name is CMMS */}
          <h1 className="text-2xl font-bold text-primary-700 mb-1">CMMS</h1>
          <p className="text-ink-500 text-sm">Tạo tài khoản mới</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <FormField
            label="Họ và tên"
            value={form.fullname}
            onChange={setField("fullname")}
            placeholder="Nguyễn Văn A"
            disabled={loading}
          />

          <FormField
            label="Email"
            type="email"
            value={form.email}
            onChange={setField("email")}
            placeholder="ten@farm.com"
            disabled={loading}
          />

          <FormField
            label="Số điện thoại"
            type="tel"
            value={form.phoneNumber}
            onChange={setField("phoneNumber")}
            placeholder="0961234567"
            disabled={loading}
          />

          <FormSelect
            label="Vai trò"
            value={form.targetRole}
            onChange={setField("targetRole")}
            disabled={loading}
            options={[
              { value: "Worker", label: "Công Nhân" },
              { value: "Specialist", label: "Chuyên gia nông nghiệp" },
            ]}
          />

          <FormField
            label="Mật khẩu"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={setField("password")}
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

          <FormField
            label="Xác nhận mật khẩu"
            type={showConfirm ? "text" : "password"}
            value={form.confirmPassword}
            onChange={setField("confirmPassword")}
            placeholder="••••••••"
            disabled={loading}
            trailingAddon={
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="h-full px-3 text-ink-400 hover:text-ink-600 flex items-center"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />

          <Button type="submit" fullWidth loading={loading}>
            Đăng ký
          </Button>
        </form>

        <p className="text-center text-sm text-ink-500 mt-6">
          Đã có tài khoản?{" "}
          <Link
            to="/login"
            className="text-primary hover:underline font-medium"
          >
            Đăng nhập
          </Link>
        </p>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
