"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw, Zap } from "lucide-react";

export default function LandingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Intellios] Landing page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      {/* Background accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl opacity-30" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-md text-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg">
            <Zap className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
        </div>

        {/* Error Icon */}
        <div className="mb-6">
          <AlertTriangle className="w-12 h-12 text-amber-500 dark:text-amber-400 mx-auto opacity-80" strokeWidth={1.5} />
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
          Something went wrong
        </h1>

        {/* Subheadline */}
        <p className="text-slate-400 mb-2 text-sm">
          We encountered an unexpected error while loading this page.
        </p>

        {/* Error details (optional, for debugging) */}
        {error.message && (
          <div className="mb-6 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
            <p className="text-xs text-slate-400 font-mono">
              {error.message}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
          >
            <RotateCcw className="w-4 h-4" />
            Try again
          </button>

          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors duration-200 border border-slate-700"
          >
            <Home className="w-4 h-4" />
            Back to login
          </Link>
        </div>

        {/* Support footer */}
        <p className="text-xs text-slate-500 mt-8">
          If this problem persists, please contact{" "}
          <a
            href="mailto:support@intellios.app"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            support
          </a>
        </p>
      </div>
    </div>
  );
}
