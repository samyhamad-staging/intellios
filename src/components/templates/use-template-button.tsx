"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface UseTemplateButtonProps {
  templateId: string;
  className?: string;
}

export function UseTemplateButton({ templateId, className }: UseTemplateButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/templates/${templateId}/use`, { method: "POST" });
      if (!res.ok) {
        const json = (await res.json()) as { message?: string };
        throw new Error(json.message ?? `Error ${res.status}`);
      }
      const { agentId } = (await res.json()) as { blueprintId: string; agentId: string };
      router.push(`/registry/${agentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className={className}
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Creating…
          </>
        ) : (
          "Use Template"
        )}
      </button>
      {error && (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
