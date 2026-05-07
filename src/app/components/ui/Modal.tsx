import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";

/**
 * Modal — wrapper around Radix Dialog with standard header/body/footer.
 * Form pattern:
 *   <Modal title="..." onSubmit={handleSubmit}
 *          footer={<Button type="submit" loading={...}>Save</Button>}>
 *     <FormField label="Name" .../>
 *   </Modal>
 *
 * When `onSubmit` is provided, content is wrapped in <form> so the submit
 * button in `footer` triggers the handler (footer is inside the form too).
 *
 * Nested modals (e.g. MapPickerModal inside FarmFormFields):
 *   The inner modal renders at z-[60] automatically when nested via portal.
 *   No special prop needed — Radix handles overlay stacking.
 */

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** SR-only description (Radix recommends one for a11y) */
  description?: string;
  /** Width — default "lg" */
  size?: ModalSize;
  children: ReactNode;
  /** Footer slot — typically (Cancel + Submit) buttons */
  footer?: ReactNode;
  /** Hide the close X in header */
  hideCloseButton?: boolean;
  /**
   * If provided, wraps body+footer in <form>. Submit button (type="submit")
   * in footer will trigger this handler.
   */
  onSubmit?: (e: FormEvent) => void;
  /** Use higher z-index for nested modals (default 50, nested 60) */
  nested?: boolean;
}

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: "max-w-sm", // 384px
  md: "max-w-md", // 448px
  lg: "max-w-lg", // 512px
  xl: "max-w-xl", // 576px
  "2xl": "max-w-2xl", // 672px
  "3xl": "max-w-3xl", // 768px
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  size = "lg",
  children,
  footer,
  hideCloseButton = false,
  onSubmit,
  nested = false,
}: ModalProps) {
  const overlayZ = nested ? "z-[60]" : "z-50";
  const contentZ = nested ? "z-[60]" : "z-50";

  const body = (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Dialog.Title className="text-lg font-bold text-ink-800 truncate pr-4">
          {title}
        </Dialog.Title>
        {!hideCloseButton && (
          <Dialog.Close
            className="text-ink-400 hover:text-ink-700 transition-colors shrink-0"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </Dialog.Close>
        )}
      </div>

      <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>

      {footer && (
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          {footer}
        </div>
      )}
    </>
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={`fixed inset-0 bg-black/50 ${overlayZ}`} />
        <Dialog.Content
          className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-modal shadow-modal w-[calc(100%-2rem)] ${SIZE_CLASS[size]} ${contentZ} flex flex-col max-h-[90vh] overflow-hidden`}
        >
          {/*
            Single sr-only Description — Radix warns if missing. Visible
            descriptive text should be rendered as part of `children`.
          */}
          <Dialog.Description className="sr-only">
            {description ?? title}
          </Dialog.Description>

          {onSubmit ? (
            <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
              {body}
            </form>
          ) : (
            body
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
