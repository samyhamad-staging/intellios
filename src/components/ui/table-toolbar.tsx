"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/catalyst/button";

/**
 * FilterChip represents a single filter option with active state and optional count
 */
export interface FilterChip {
  /** Unique identifier for the filter */
  key: string;
  /** Display label */
  label: string;
  /** Whether this filter is currently active */
  active: boolean;
  /** Optional count badge to show on the chip */
  count?: number;
}

/**
 * TableToolbarProps defines all customization options for the toolbar
 */
export interface TableToolbarProps {
  /** Search input placeholder text */
  searchPlaceholder?: string;
  /** Current search input value */
  searchValue?: string;
  /** Callback fired when search input changes */
  onSearchChange?: (value: string) => void;
  /** Array of filter chips to display */
  filters?: FilterChip[];
  /** Callback fired when a filter chip is clicked */
  onFilterClick?: (key: string) => void;
  /** Total number of results to display in count text */
  resultCount?: number;
  /** Label for result count (e.g., "agents", "blueprints") */
  resultLabel?: string;
  /** Optional action node to render on the right (e.g., "Create" button) */
  action?: React.ReactNode;
  /** Additional className for root container */
  className?: string;
}

/**
 * TableToolbar — A reusable, responsive toolbar for data tables
 *
 * Renders:
 * - Left: Search input with Search icon
 * - Center: Filter chips as pill buttons
 * - Right: Result count + action slot
 *
 * Responsive: Uses flex-wrap for multi-line layout on smaller screens
 */
export function TableToolbar({
  searchPlaceholder = "Search…",
  searchValue = "",
  onSearchChange,
  filters,
  onFilterClick,
  resultCount,
  resultLabel,
  action,
  className,
}: TableToolbarProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${className || ""}`}
    >
      {/* Left: Search Input */}
      <div className="relative w-64 max-w-xs flex-shrink-0">
        <Search
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          className="input-field-sm w-full pl-8"
        />
        {searchValue && (
          <button
            onClick={() => onSearchChange?.("")}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Center: Filter Chips */}
      {filters && filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((chip) => (
            <button
              key={chip.key}
              onClick={() => onFilterClick?.(chip.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                chip.active
                  ? "bg-primary-subtle text-primary border border-primary-subtle"
                  : "bg-surface border border-border text-text-secondary hover:bg-surface-raised"
              }`}
            >
              <span>{chip.label}</span>
              {chip.count !== undefined && chip.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0 text-[10px] font-semibold ${
                    chip.active
                      ? "bg-primary/20 text-primary"
                      : "bg-surface-muted text-text-tertiary"
                  }`}
                >
                  {chip.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Right: Result Count + Action */}
      <div className="ml-auto flex items-center gap-3">
        {resultCount !== undefined && (
          <span className="text-xs text-text-tertiary whitespace-nowrap">
            {resultCount} {resultLabel || "result"}{resultCount !== 1 ? "s" : ""}
          </span>
        )}
        {action}
      </div>
    </div>
  );
}

/**
 * PaginationProps defines options for the Pagination component
 */
export interface PaginationProps {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Callback fired when user clicks Previous or Next */
  onPageChange: (page: number) => void;
}

/**
 * Pagination — A simple pagination control with Previous/Next buttons
 *
 * Displays: "Page X of Y" with Previous/Next buttons using Catalyst Button component
 * - Previous button disabled on page 1
 * - Next button disabled on last page
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-border-subtle">
      <span className="text-xs text-text-tertiary">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirstPage}
          plain
        >
          ← Previous
        </Button>
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isLastPage}
          plain
        >
          Next →
        </Button>
      </div>
    </div>
  );
}
