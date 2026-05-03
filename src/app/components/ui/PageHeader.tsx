import type { ElementType, ReactNode } from "react";

export interface PageHeaderProps {
  /** Optional Lucide icon — rendered in primary-colored square box */
  icon?: ElementType;
  title: string;
  subtitle?: string;
  /** Right-side content — typically a primary <Button> or button cluster */
  actions?: ReactNode;
  /** Children rendered below the title row (e.g. status badge inline) */
  children?: ReactNode;
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-10 h-10 bg-primary rounded-card flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary-fg" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-ink-800 truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {children && <div className="ml-2">{children}</div>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
