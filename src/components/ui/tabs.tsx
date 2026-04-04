"use client";

import * as React from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "./cn";

export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...props }: RadixTabs.TabsListProps) {
  return (
    <RadixTabs.List
      className={cn(
        "inline-flex items-center rounded-lg bg-surface-muted p-1 gap-0.5",
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: RadixTabs.TabsTriggerProps) {
  return (
    <RadixTabs.Trigger
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        "text-text-secondary hover:text-text",
        "data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: RadixTabs.TabsContentProps) {
  return (
    <RadixTabs.Content
      className={cn("focus-visible:outline-none", className)}
      {...props}
    />
  );
}
