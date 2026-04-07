"use client";

import * as React from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-fg hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary/50",
  secondary:
    "border border-border bg-surface text-text hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-border-strong/50",
  ghost:
    "text-text-secondary hover:bg-surface-muted hover:text-text focus-visible:ring-2 focus-visible:ring-border/50",
  destructive:
    "bg-danger text-danger-fg hover:bg-danger-hover focus-visible:ring-2 focus-visible:ring-danger/50",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-2.5 py-1 text-xs rounded-sm",
  md: "px-3 py-1.5 text-sm rounded",
  lg: "px-4 py-2 text-sm rounded-lg",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 font-medium transition-colors",
          "focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
