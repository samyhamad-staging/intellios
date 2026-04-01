import { cn } from "./cn";
import * as React from "react";

interface EmptyStateProps {
  icon?: React.ElementType;
  heading: string;
  subtext?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, heading, subtext, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-raised text-text-tertiary">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <p className="text-sm font-medium text-text">{heading}</p>
      {subtext && <p className="mt-1 text-xs text-text-secondary max-w-xs">{subtext}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
