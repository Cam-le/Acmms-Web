import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { AlertTriangle, Trash2 } from "lucide-react";
import type { ElementType, ReactNode } from "react";
import { Button } from "./Button";

/**
 * ConfirmDialog — yes/no confirmation, typically for destructive actions.
 * IMPORTANT — async confirmation pattern:
 *   The Confirm button does NOT auto-close the dialog. Caller is responsible
 *   for calling onOpenChange(false) when their async work succeeds. This is
 *   intentional: it lets the loading state actually render (vs. the existing
 *   FarmPage pattern where the dialog closes immediately and Loader2 never
 *   appears), and lets the dialog stay open on error so the user can retry.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={modals.deleteItem !== null}
 *     onOpenChange={(o) => !o && modals.closeDelete()}
 *     title="Xóa trang trại"
 *     description={<>Bạn có chắc muốn xóa <strong>{farm.name}</strong>?</>}
 *     loading={submitting}
 *     onConfirm={async () => {
 *       setSubmitting(true);
 *       try {
 *         await api.deleteFarm(modals.deleteItem!.id);
 *         modals.closeDelete();           // close on success
 *         showToast("Xóa thành công", "success");
 *       } catch (e) {
 *         showToast(e.message, "error");  // dialog stays open for retry
 *       } finally {
 *         setSubmitting(false);
 *       }
 *     }}
 *   />
 */

export type ConfirmTone = "danger" | "warning" | "primary";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /** Confirm button label — default "Xác nhận" */
  confirmLabel?: string;
  /** Cancel button label — default "Hủy" */
  cancelLabel?: string;
  /** Visual tone — default "danger" */
  tone?: ConfirmTone;
  /** Custom icon — defaults: danger=Trash2, warning/primary=AlertTriangle */
  icon?: ElementType;
  /** Disable confirm + show spinner while async */
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

const TONE_ICON_BG: Record<ConfirmTone, string> = {
  danger: "bg-status-danger-bg",
  warning: "bg-status-warning-bg",
  primary: "bg-primary-50",
};

const TONE_ICON_FG: Record<ConfirmTone, string> = {
  danger: "text-status-danger-fg",
  warning: "text-status-warning-fg",
  primary: "text-primary",
};

const TONE_BUTTON_VARIANT: Record<ConfirmTone, "danger" | "primary"> = {
  danger: "danger",
  warning: "primary",
  primary: "primary",
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  tone = "danger",
  icon,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const Icon = icon ?? (tone === "danger" ? Trash2 : AlertTriangle);

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-modal shadow-modal w-full max-w-sm z-50 p-6">
          <div className="flex items-start gap-3 mb-4">
            <div
              className={`w-10 h-10 ${TONE_ICON_BG[tone]} rounded-card flex items-center justify-center shrink-0`}
            >
              <Icon className={`w-5 h-5 ${TONE_ICON_FG[tone]}`} />
            </div>
            <div className="min-w-0 pt-1">
              <AlertDialog.Title className="text-lg font-bold text-ink-800">
                {title}
              </AlertDialog.Title>
            </div>
          </div>

          <AlertDialog.Description className="text-sm text-ink-500 mb-6 leading-relaxed">
            {description}
          </AlertDialog.Description>

          <div className="flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost" disabled={loading}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                variant={TONE_BUTTON_VARIANT[tone]}
                loading={loading}
                onClick={(e) => {
                  // Always preventDefault — Radix AlertDialog.Action would
                  // otherwise auto-close the dialog before async onConfirm
                  // completes, hiding the loading state. Caller closes via
                  // onOpenChange when their async work succeeds (or leaves
                  // the dialog open on error to allow retry).
                  e.preventDefault();
                  if (loading) return;
                  onConfirm();
                }}
              >
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
