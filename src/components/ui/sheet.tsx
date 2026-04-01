"use client";

import * as React from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "./cn";

export const Sheet = RadixDialog.Root;
export const SheetTrigger = RadixDialog.Trigger;
export const SheetClose = RadixDialog.Close;

export function SheetOverlay({ className, ...props }: RadixDialog.DialogOverlayProps) {
  return (
    <RadixDialog.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "duration-300",
        className
      )}
      {...props}
    />
  );
}

interface SheetContentProps extends RadixDialog.DialogContentProps {
  side?: "left" | "right" | "top" | "bottom";
}

export function SheetContent({ side = "right", className, children, ...props }: SheetContentProps) {
  const sideClasses = {
    right: "right-0 top-0 h-full w-80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
    left: "left-0 top-0 h-full w-80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
    top: "top-0 left-0 w-full data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
    bottom: "bottom-0 left-0 w-full data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
  };

  return (
    <RadixDialog.Portal>
      <SheetOverlay />
      <RadixDialog.Content
        className={cn(
          "fixed z-50 flex flex-col gap-0 border border-border bg-surface shadow-modal duration-300",
          sideClasses[side],
          className
        )}
        {...props}
      >
        {children}
        <RadixDialog.Close className="absolute right-4 top-4 rounded p-0.5 text-text-tertiary hover:text-text transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-strong">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 px-5 pt-5 pb-4 border-b border-border", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: RadixDialog.DialogTitleProps) {
  return (
    <RadixDialog.Title className={cn("text-base font-semibold text-text", className)} {...props} />
  );
}

export function SheetDescription({ className, ...props }: RadixDialog.DialogDescriptionProps) {
  return (
    <RadixDialog.Description className={cn("text-sm text-text-secondary", className)} {...props} />
  );
}

export function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex-1 overflow-y-auto px-5 py-4", className)} {...props} />;
}
