"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function startNewSession() {
    setLoading(true);
    const res = await fetch("/api/intake/sessions", { method: "POST" });
    const session = await res.json();
    router.push(`/intake/${session.id}`);
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
      </div>
    </div>
  );
}
