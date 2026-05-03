import { Loader2 } from "lucide-react";
export type SpinnerSize = "xs" | "sm" | "md" | "lg";

export interface SpinnerProps {
  size?: SpinnerSize;
  /** For color override only — defaults to text-primary */
  className?: string;
}

const SIZE_CLASS: Record<SpinnerSize, string> = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  const colorClass = className.includes("text-") ? "" : "text-primary";
  return (
    <Loader2
      className={`animate-spin ${colorClass} ${SIZE_CLASS[size]} ${className}`.trim()}
    />
  );
}
