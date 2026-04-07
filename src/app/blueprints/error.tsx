"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/catalyst/button";
import { Heading } from "@/components/catalyst";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";

export default function BlueprintError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Intellios/Blueprint] Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <Heading level={2} className="mb-2">Blueprint error</Heading>
        <p className="mb-1 text-sm text-text-secondary">
          Something went wrong loading this blueprint. Your data is safe.
        </p>
        {error.digest && (
          <p className="mb-4 font-mono text-2xs text-text-tertiary">Ref: {error.digest}</p>
        )}
        {!error.digest && <div className="mb-4" />}
        <div className="flex items-center justify-center gap-3">
          <Button
            onClick={reset}
            color="indigo"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </Button>
          <Button
            href="/pipeline"
            outline
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Pipeline
          </Button>
        </div>
      </div>
    </div>
  );
}
