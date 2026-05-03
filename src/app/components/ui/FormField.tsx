import type { InputHTMLAttributes, ReactNode } from "react";

export type FormFieldType =
  | "text"
  | "number"
  | "email"
  | "tel"
  | "password"
  | "url"
  | "date"
  | "month"
  | "time"
  | "datetime-local";

export interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  /** Helper text below input (in muted color) — overridden by `error` if both provided */
  hint?: string;
  type?: FormFieldType;
  placeholder?: string;
  disabled?: boolean;
  /** Right-side adornment (e.g. globe button for location picker) */
  trailingAddon?: ReactNode;
  /** Pass-through to native input — for min, max, autoComplete, etc */
  inputProps?: Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type" | "disabled" | "placeholder"
  >;
  /** Layout class for outer wrapper (e.g. "col-span-2") */
  className?: string;
}

export function FormField({
  label,
  value,
  onChange,
  required = false,
  error,
  hint,
  type = "text",
  placeholder,
  disabled = false,
  trailingAddon,
  inputProps,
  className = "",
}: FormFieldProps) {
  const inputClass = [
    "w-full px-3 py-2.5 border rounded-btn text-sm text-ink-700 bg-surface",
    "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-subtle",
    error
      ? "border-status-danger-fg/40 bg-status-danger-bg/30"
      : "border-border-strong",
  ].join(" ");

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-ink-600 mb-1.5">
        {label}
        {required && <span className="text-status-danger-fg ml-0.5">*</span>}
      </label>
      <div className={trailingAddon ? "flex gap-2" : undefined}>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={
            trailingAddon ? `flex-1 min-w-0 ${inputClass}` : inputClass
          }
          {...inputProps}
        />
        {trailingAddon && <div className="shrink-0">{trailingAddon}</div>}
      </div>
      {error ? (
        <p className="mt-1 text-xs text-status-danger-fg">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}
