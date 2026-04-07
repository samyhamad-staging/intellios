"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "loading">("idle");

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (state === "idle") {
      setState("confirm");
      // Auto-reset after 2.5s if user doesn't confirm
      setTimeout(() => setState((s) => (s === "confirm" ? "idle" : s)), 2500);
      return;
    }

    if (state === "confirm") {
      setState("loading");
      try {
        const res = await fetch(`/api/intake/sessions/${sessionId}`, { method: "DELETE" });
        if (res.ok) router.refresh();
        else setState("idle");
      } catch {
        setState("idle");
      }
    }
  }

  const isConfirm = state === "confirm";
  const isLoading = state === "loading";

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      title={isConfirm ? "Click again to confirm" : "Delete session"}
      className={`flex h-7 items-center justify-center rounded-md px-2 text-2xs font-mono transition-all disabled:opacity-40 ${
        isConfirm
          ? "bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-800 gap-1 w-auto"
          : "w-7 text-text-tertiary hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-400"
      }`}
    >
      {isConfirm ? (
        <>
          <Trash2 size={11} />
          <span>Delete?</span>
        </>
      ) : (
        <Trash2 size={12} />
      )}
    </button>
  );
}
