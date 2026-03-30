import * as React from "react";
import { cn } from "./cn";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted";

const variantClasses: Record<BadgeVariant, string> = {
  default:  "bg-surface-muted text-text-secondary border border-border",
  primary:  "bg-primary-subtle text-primary border border-primary/20",
  success:  "bg-green-100 text-green-700",
  warning:  "bg-amber-100 text-amber-700",
  danger:   "bg-danger-subtle text-danger",
  info:     "bg-indigo-100 text-indigo-700",
  muted:    "bg-surface-muted text-text-tertiary",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export function Badge({ variant = "default", dot = false, className, children, ...props }: BadgeProps) {
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
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      )}
      {children}
    </span>
  );
}
