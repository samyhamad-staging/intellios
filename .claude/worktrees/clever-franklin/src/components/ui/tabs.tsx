"use client";

import * as React from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "./cn";

export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...props }: RadixTabs.TabsListProps) {
  return (
    <RadixTabs.List
      className={cn(
        "inline-flex items-center rounded-lg bg-gray-100 p-1 gap-0.5",
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
        "text-gray-500 hover:text-gray-700",
        "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm",
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
