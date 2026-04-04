"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Heading } from "@/components/catalyst";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to console in development; swap for your error monitoring service
    console.error("[Intellios] Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-raised">
      <div className="w-full max-w-md text-center">
        {/* Logo mark */}
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-surface shadow-sm border border-border">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#0f172a" />
            <path d="M8 10h6l2 4 2-4h6M8 22h16M14 16h4" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Status */}
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-red-500">
          Error
        </p>

        <Heading level={1} className="mb-3 text-text">
          Something went wrong
        </Heading>

        <p className="mb-2 text-sm text-text-secondary leading-relaxed">
          An unexpected error occurred. This has been logged automatically.
        </p>

        {error.digest && (
          <p className="mb-6 font-mono text-xs text-text-tertiary">
            Reference: {error.digest}
          </p>
        )}

        {!error.digest && <div className="mb-6" />}

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-text px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-text-secondary transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-medium text-text shadow-sm hover:bg-surface-raised transition-colors"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}
