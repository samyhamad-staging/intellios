"use client";

import * as React from "react";
import * as RadixDropdown from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "./cn";

export const DropdownMenu = RadixDropdown.Root;
export const DropdownMenuTrigger = RadixDropdown.Trigger;
export const DropdownMenuGroup = RadixDropdown.Group;
export const DropdownMenuSub = RadixDropdown.Sub;
export const DropdownMenuRadioGroup = RadixDropdown.RadioGroup;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = "end",
  ...props
}: RadixDropdown.DropdownMenuContentProps) {
  return (
    <RadixDropdown.Portal>
      <RadixDropdown.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-surface shadow-lg",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    </RadixDropdown.Portal>
  );
}

export function DropdownMenuItem({
  className,
  inset,
  ...props
}: RadixDropdown.DropdownMenuItemProps & { inset?: boolean }) {
  return (
    <RadixDropdown.Item
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-sm text-text outline-none",
        "hover:bg-surface-muted focus:bg-surface-muted",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        inset && "pl-8",
        className
      )}
      {...props}
    />
  );
}

export function DropdownMenuDangerItem({
  className,
  ...props
}: RadixDropdown.DropdownMenuItemProps) {
  return (
    <RadixDropdown.Item
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-sm text-danger outline-none",
        "hover:bg-danger-subtle focus:bg-danger-subtle",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className, ...props }: RadixDropdown.DropdownMenuSeparatorProps) {
  return (
    <RadixDropdown.Separator
      className={cn("my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export function DropdownMenuLabel({
  className,
  inset,
  ...props
}: RadixDropdown.DropdownMenuLabelProps & { inset?: boolean }) {
  return (
    <RadixDropdown.Label
      className={cn(
        "px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-text-tertiary",
        inset && "pl-8",
        className
      )}
      {...props}
    />
  );
}

export function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: RadixDropdown.DropdownMenuSubTriggerProps & { inset?: boolean }) {
  return (
    <RadixDropdown.SubTrigger
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-sm text-text outline-none",
        "hover:bg-surface-muted focus:bg-surface-muted data-[state=open]:bg-surface-muted",
        inset && "pl-8",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-50" />
    </RadixDropdown.SubTrigger>
  );
}

export function DropdownMenuSubContent({ className, ...props }: RadixDropdown.DropdownMenuSubContentProps) {
  return (
    <RadixDropdown.SubContent
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-surface shadow-lg",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: RadixDropdown.DropdownMenuCheckboxItemProps) {
  return (
    <RadixDropdown.CheckboxItem
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 py-2 pl-8 pr-3 text-sm text-text outline-none",
        "hover:bg-surface-muted focus:bg-surface-muted",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <RadixDropdown.ItemIndicator>
          <Check className="h-3.5 w-3.5" />
        </RadixDropdown.ItemIndicator>
      </span>
      {children}
    </RadixDropdown.CheckboxItem>
  );
}
