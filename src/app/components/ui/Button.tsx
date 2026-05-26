import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ElementType, ReactNode } from "react";
import { Spinner } from "./Spinner";

/**
 * Button — canonical button component.
 *
 * Variants:
 *   - primary  (default): teal bg, white text — main CTAs
 *   - secondary:          subtle bg, dark text — cancel / secondary actions
 *   - danger:             red bg, white text — destructive confirmations
 *   - ghost:              no bg, muted text — modal cancel link-style
 */

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: "button" | "submit" | "reset";
  /** Show spinner and disable button */
  loading?: boolean;
  /** Lucide icon component before label */
  leadingIcon?: ElementType;
  /** Lucide icon component after label */
  trailingIcon?: ElementType;
  /** Make button take full container width */
  fullWidth?: boolean;
  children?: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-fg hover:bg-primary-hover disabled:bg-primary disabled:opacity-50",
  secondary:
    "bg-surface-subtle text-ink-700 hover:bg-border disabled:opacity-50",
  danger: "bg-status-danger-fg text-white hover:opacity-90 disabled:opacity-50",
  ghost:
    "text-ink-500 hover:text-ink-700 hover:bg-surface-subtle disabled:opacity-50",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
};

const ICON_SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
};

const SPINNER_SIZE: Record<ButtonSize, "xs" | "sm"> = {
  sm: "xs",
  md: "sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      type = "button",
      loading = false,
      leadingIcon: LeadingIcon,
      trailingIcon: TrailingIcon,
      fullWidth = false,
      disabled,
      children,
      className = "",
      ...rest
    },
    ref,
  ) {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={[
          "inline-flex items-center justify-center font-medium rounded-btn transition-colors",
          "disabled:cursor-not-allowed",
          VARIANT_CLASS[variant],
          SIZE_CLASS[size],
          fullWidth ? "w-full" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      >
        {loading ? (
          <Spinner
            size={SPINNER_SIZE[size]}
            className={
              variant === "primary" || variant === "danger" ? "text-white" : ""
            }
          />
        ) : (
          LeadingIcon && <LeadingIcon className={ICON_SIZE_CLASS[size]} />
        )}
        {children}
        {!loading && TrailingIcon && (
          <TrailingIcon className={ICON_SIZE_CLASS[size]} />
        )}
      </button>
    );
  },
);
