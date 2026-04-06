"use client";

import { RequestAccessModal } from "@/components/landing/request-access-modal";

/**
 * RequestAccessButton — Client Component wrapper for the RequestAccessModal
 *
 * The RequestAccessModal uses a render-prop pattern (children as a function),
 * which cannot be used directly inside Server Components because functions
 * are not serializable across the Server/Client boundary.
 *
 * This wrapper encapsulates the render-prop usage so Server Components can
 * simply render <RequestAccessButton /> without passing any functions.
 */

interface RequestAccessButtonProps {
  /** Label shown on sm+ screens */
  label?: string;
  /** Label shown on mobile (< sm) */
  mobileLabel?: string;
  /** Additional CSS classes */
  className?: string;
  /** Visual variant */
  variant?: "primary" | "large";
}

export function RequestAccessButton({
  label = "Request Early Access",
  mobileLabel = "Get Access",
  className = "",
  variant = "primary",
}: RequestAccessButtonProps) {
  const baseStyles =
    variant === "large"
      ? "inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
      : "inline-flex rounded-lg bg-indigo-600 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors";

  return (
    <RequestAccessModal>
      {(open) => (
        <button onClick={open} className={`${baseStyles} ${className}`}>
          {mobileLabel !== label && (
            <span className="sm:hidden">{mobileLabel}</span>
          )}
          <span className={mobileLabel !== label ? "hidden sm:inline" : ""}>
            {label}
          </span>
        </button>
      )}
    </RequestAccessModal>
  );
}
