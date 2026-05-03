import { Eye, Pencil, Trash2 } from "lucide-react";

export interface RowActionsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Layout — "right" (default) | "center" | "left" */
  align?: "left" | "center" | "right";
  /** Override the View icon — defaults to Eye */
  viewLabel?: string;
  /** Override the Edit icon label */
  editLabel?: string;
  /** Override the Delete icon label */
  deleteLabel?: string;
}

const ALIGN_CLASS = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
} as const;

const ICON_BTN_BASE = "p-1.5 rounded-btn transition-colors text-ink-500";
const ICON_BTN_HOVER = "hover:text-primary hover:bg-primary-50";
const ICON_BTN_DANGER = "hover:text-status-danger-fg hover:bg-status-danger-bg";

export function RowActions({
  onView,
  onEdit,
  onDelete,
  align = "right",
  viewLabel = "Xem",
  editLabel = "Chỉnh sửa",
  deleteLabel = "Xóa",
}: RowActionsProps) {
  return (
    <div className={`flex items-center gap-1 ${ALIGN_CLASS[align]}`}>
      {onView && (
        <button
          type="button"
          onClick={onView}
          title={viewLabel}
          aria-label={viewLabel}
          className={`${ICON_BTN_BASE} ${ICON_BTN_HOVER}`}
        >
          <Eye className="w-4 h-4" />
        </button>
      )}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          title={editLabel}
          aria-label={editLabel}
          className={`${ICON_BTN_BASE} ${ICON_BTN_HOVER}`}
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title={deleteLabel}
          aria-label={deleteLabel}
          className={`${ICON_BTN_BASE} ${ICON_BTN_DANGER}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
