import * as React from "react";
import { cn } from "./cn";

type BadgeVariant =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "accent"
  | "muted";

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-surface-muted text-text-secondary",
  info:    "bg-blue-100 text-blue-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger:  "bg-red-100 text-red-700",
  accent:  "bg-violet-100 text-violet-700",
  muted:   "bg-surface-raised text-text-secondary",
};

const dotClasses: Record<BadgeVariant, string> = {
  neutral: "bg-text-secondary",
  info:    "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger:  "bg-red-500",
  accent:  "bg-violet-500",
  muted:   "bg-text-disabled",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  pulse?: boolean;
}

export type { BadgeVariant };

export function Badge({
  variant = "neutral",
  dot = false,
  pulse = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            dotClasses[variant],
            pulse && "animate-pulse"
          )}
        />
      )}
      {children}
    </span>
  );
}
