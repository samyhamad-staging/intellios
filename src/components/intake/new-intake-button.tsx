"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewIntakeButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/intake/sessions", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create session");
      const session = await res.json();
      router.push(`/intake/${session.id}`);
    } catch {
      setError("Could not start a session. Is the server running?");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className={className ?? "rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"}
      >
        {loading ? "Creating session…" : "Design a New Agent"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
