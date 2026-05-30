import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Modal } from "./ui/Modal";
import { FormField } from "./ui/FormField";
import { Button } from "./ui/Button";
import { api } from "../../api/client";
import { useToast } from "./ui/useToast";
import { ToastContainer } from "./ui/ToastContainer";

export interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const EMPTY_FORM: FormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function ChangePasswordModal({
  open,
  onOpenChange,
}: ChangePasswordModalProps) {
  const { toasts, showToast, dismissToast } = useToast();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [saving, setSaving] = useState(false);

  function patch(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear the error for this field as the user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const next: Partial<FormState> = {};

    if (!form.currentPassword.trim()) {
      next.currentPassword = "Vui lòng nhập mật khẩu hiện tại";
    }

    if (!form.newPassword.trim()) {
      next.newPassword = "Vui lòng nhập mật khẩu mới";
    } else if (form.newPassword.length < 6) {
      next.newPassword = "Mật khẩu mới phải có ít nhất 6 ký tự";
    } else if (form.newPassword === form.currentPassword) {
      next.newPassword = "Mật khẩu mới phải khác mật khẩu hiện tại";
    }

    if (!form.confirmPassword.trim()) {
      next.confirmPassword = "Vui lòng xác nhận mật khẩu mới";
    } else if (form.confirmPassword !== form.newPassword) {
      next.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await api.changePassword({
        currentPassword: form.currentPassword.trim(),
        newPassword: form.newPassword.trim(),
      });
      showToast("Đổi mật khẩu thành công", "success");
      setForm(EMPTY_FORM);
      setErrors({});
      onOpenChange(false);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Đổi mật khẩu thất bại",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      // Reset state when closing
      setForm(EMPTY_FORM);
      setErrors({});
    }
    onOpenChange(open);
  }

  return (
    <>
      <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title="Đổi mật khẩu"
        size="md"
        onSubmit={handleSubmit}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              Hủy
            </Button>
            <Button type="submit" loading={saving} leadingIcon={KeyRound}>
              Xác nhận
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField
            label="Mật khẩu hiện tại"
            type="password"
            value={form.currentPassword}
            onChange={(v) => patch("currentPassword", v)}
            required
            error={errors.currentPassword}
            placeholder="Nhập mật khẩu hiện tại"
            disabled={saving}
          />
          <FormField
            label="Mật khẩu mới"
            type="password"
            value={form.newPassword}
            onChange={(v) => patch("newPassword", v)}
            required
            error={errors.newPassword}
            placeholder="Ít nhất 6 ký tự"
            disabled={saving}
          />
          <FormField
            label="Xác nhận mật khẩu mới"
            type="password"
            value={form.confirmPassword}
            onChange={(v) => patch("confirmPassword", v)}
            required
            error={errors.confirmPassword}
            placeholder="Nhập lại mật khẩu mới"
            disabled={saving}
          />
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
