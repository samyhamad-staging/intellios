"use client";

import * as React from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "./cn";

export const Select = RadixSelect.Root;
export const SelectValue = RadixSelect.Value;

export function SelectTrigger({ className, children, ...props }: RadixSelect.SelectTriggerProps) {
  return (
    <RadixSelect.Trigger
      className={cn(
        "flex h-9 w-full items-center justify-between gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm",
        "placeholder:text-text-tertiary",
        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[placeholder]:text-text-tertiary",
        className
      )}
      {...props}
    >
      {children}
      <RadixSelect.Icon asChild>
        <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary" />
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  );
}

export function SelectContent({ className, children, position = "popper", ...props }: RadixSelect.SelectContentProps) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        position={position}
        className={cn(
          "relative z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-surface shadow-raised",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          className
        )}
        {...props}
      >
        <RadixSelect.ScrollUpButton className="flex cursor-default items-center justify-center py-1">
          <ChevronUp className="h-4 w-4" />
        </RadixSelect.ScrollUpButton>
        <RadixSelect.Viewport
          className={cn(
            "p-1",
            position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
          )}
        >
          {children}
        </RadixSelect.Viewport>
        <RadixSelect.ScrollDownButton className="flex cursor-default items-center justify-center py-1">
          <ChevronDown className="h-4 w-4" />
        </RadixSelect.ScrollDownButton>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
}

export function SelectItem({ className, children, ...props }: RadixSelect.SelectItemProps) {
  return (
    <RadixSelect.Item
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-3 text-sm outline-none",
        "focus:bg-surface-muted focus:text-text",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <RadixSelect.ItemIndicator>
          <Check className="h-4 w-4 text-primary" />
        </RadixSelect.ItemIndicator>
      </span>
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    </RadixSelect.Item>
  );
}

export function SelectGroup({ ...props }: RadixSelect.SelectGroupProps) {
  return <RadixSelect.Group {...props} />;
}

export function SelectLabel({ className, ...props }: RadixSelect.SelectLabelProps) {
  return (
    <RadixSelect.Label
      className={cn("py-1.5 pl-8 pr-3 text-xs font-semibold text-text-secondary", className)}
      {...props}
    />
  );
}

export function SelectSeparator({ className, ...props }: RadixSelect.SelectSeparatorProps) {
  return (
    <RadixSelect.Separator
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}
