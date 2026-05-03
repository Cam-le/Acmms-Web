import type { TextareaHTMLAttributes } from "react";

export interface FormTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  /** Pass-through to native textarea — for maxLength, etc */
  textareaProps?: Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "value" | "onChange" | "disabled" | "placeholder" | "rows"
  >;
  className?: string;
}

export function FormTextarea({
  label,
  value,
  onChange,
  required = false,
  error,
  hint,
  placeholder,
  disabled = false,
  rows = 3,
  textareaProps,
  className = "",
}: FormTextareaProps) {
  const textareaClass = [
    "w-full px-3 py-2.5 border rounded-btn text-sm text-ink-700 bg-surface resize-y",
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
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={textareaClass}
        {...textareaProps}
      />
      {error ? (
        <p className="mt-1 text-xs text-status-danger-fg">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}
