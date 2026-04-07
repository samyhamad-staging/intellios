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
  info:    "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  danger:  "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
  accent:  "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
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
