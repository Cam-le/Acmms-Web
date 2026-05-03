import type { ElementType } from "react";
export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: ElementType;
  /** Number badge shown after label, e.g. pending count */
  badge?: number | string;
}

export interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  tabs: ReadonlyArray<TabItem<T>>;
}

export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
}: TabsProps<T>) {
  return (
    <div
      className="inline-flex gap-1 bg-surface-subtle p-1 rounded-btn"
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={[
              "flex items-center gap-2 px-4 py-2 rounded-btn text-sm font-medium transition-colors",
              isActive
                ? "bg-surface text-ink-800 shadow-card"
                : "text-ink-500 hover:text-ink-700",
            ].join(" ")}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {tab.label}
            {tab.badge != null && tab.badge !== 0 && (
              <span
                className={[
                  "ml-0.5 px-1.5 py-0.5 text-xs rounded-pill leading-none",
                  isActive
                    ? "bg-primary text-primary-fg"
                    : "bg-ink-400 text-white",
                ].join(" ")}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
