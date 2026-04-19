import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import type { Toast } from "./useToast";

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

const CONFIG = {
  success: {
    icon: CheckCircle,
    bg: "bg-white border-l-4 border-[#009689]",
    iconColor: "text-[#009689]",
  },
  error: {
    icon: AlertCircle,
    bg: "bg-white border-l-4 border-red-500",
    iconColor: "text-red-500",
  },
  info: {
    icon: Info,
    bg: "bg-white border-l-4 border-blue-500",
    iconColor: "text-blue-500",
  },
} as const;

const slideInStyle = `
  @keyframes toast-in {
    from { opacity: 0; transform: translateX(16px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .toast-item {
    animation: toast-in 0.18s ease-out forwards;
  }
`;

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <>
      <style>{slideInStyle}</style>
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => {
          const { icon: Icon, bg, iconColor } = CONFIG[toast.type];
          return (
            <div
              key={toast.id}
              className={`toast-item ${bg} pointer-events-auto flex items-start gap-3 min-w-[280px] max-w-[360px] px-4 py-3 rounded-lg shadow-lg`}
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
              <p className="text-sm text-[#1e293b] flex-1 leading-snug">
                {toast.message}
              </p>
              <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 text-[#94a3b8] hover:text-[#475569] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
