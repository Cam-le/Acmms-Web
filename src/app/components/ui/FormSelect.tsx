export interface FormSelectOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<FormSelectOption<T>>;
  required?: boolean;
  error?: string;
  hint?: string;
  /** Empty state placeholder (renders as disabled option with empty value) */
  placeholder?: string;
  disabled?: boolean;
  /** Layout class for outer wrapper */
  className?: string;
}

export function FormSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  required = false,
  error,
  hint,
  placeholder,
  disabled = false,
  className = "",
}: FormSelectProps<T>) {
  const selectClass = [
    "w-full px-3 py-2.5 border rounded-btn text-sm text-ink-700 bg-surface",
    "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-subtle",
    "appearance-none cursor-pointer",
    // Native select arrow via background-image
    'bg-[url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="%2362748e"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>\')] bg-no-repeat bg-[right_0.75rem_center] pr-9',
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
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
        className={selectClass}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-1 text-xs text-status-danger-fg">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}
