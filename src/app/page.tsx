"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startNewSession() {
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
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">Intellios</h1>
        <p className="mb-8 text-lg text-gray-600">Enterprise Agent Factory</p>
        <button
          onClick={startNewSession}
          disabled={loading}
          className="rounded-lg bg-gray-900 px-6 py-3 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Creating session..." : "Design a New Agent"}
        </button>
        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}
        <div className="mt-6 flex items-center justify-center gap-6">
          <Link href="/registry" className="text-sm text-gray-500 hover:text-gray-900 underline">
            View Agent Registry
          </Link>
          <Link href="/review" className="text-sm text-gray-500 hover:text-gray-900 underline">
            Review Queue
          </Link>
        </div>
      </div>
    </div>
  );
}
