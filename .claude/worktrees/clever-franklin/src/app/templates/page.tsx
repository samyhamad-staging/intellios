"use client";

import { useEffect, useState } from "react";
import { Package, Search, Star, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  riskTier: string | null;
  source: string;
  rating: number | null;
  usageCount: number;
  author: string | null;
  publishedAt: string | null;
  tags: string[];
}

export default function TemplateMarketplacePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState<Record<string, number>>({});

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (sourceFilter) params.set("source", sourceFilter);
    fetch(`/api/templates?${params}`)
      .then((r) => r.json())
      .then((d) => { setTemplates(d.templates ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [search, sourceFilter]);

  async function handleRate(templateId: string, rating: number) {
    const r = await fetch(`/api/templates/${templateId}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
    if (r.ok) {
      const { rating: newAvg } = await r.json();
      setTemplates((prev) =>
        prev.map((t) => t.id === templateId ? { ...t, rating: newAvg } : t)
      );
      setRatingFilter((prev) => ({ ...prev, [templateId]: rating }));
    }
  }

  const sourceLabel: Record<string, string> = {
    "built-in": "Built-in",
    "community": "Community",
  };

  const riskColor: Record<string, string> = {
    low: "bg-emerald-100 text-emerald-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Template Marketplace
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Browse built-in and community agent templates
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          />
        </div>
        <Select
          value={sourceFilter || "_all_"}
          onValueChange={(v) => setSourceFilter(v === "_all_" ? "" : v)}
        >
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all_">All sources</SelectItem>
            <SelectItem value="built-in">Built-in</SelectItem>
            <SelectItem value="community">Community</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonList rows={6} height="h-40" />
        </div>
      )}

      {!loading && templates.length === 0 && (
        <EmptyState icon={Package} heading="No templates found" subtext="Try adjusting your search or filters." />
      )}

      {!loading && templates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-border bg-surface p-5 hover:border-primary/20 hover:shadow-[var(--shadow-raised)] transition-all space-y-3 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-text text-sm leading-tight">{t.name}</h3>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  t.source === "community" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"
                }`}>
                  {sourceLabel[t.source] ?? t.source}
                </span>
              </div>

              {t.description && (
                <p className="text-xs text-text-secondary line-clamp-2">{t.description}</p>
              )}

              <div className="flex flex-wrap gap-1.5">
                {t.riskTier && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${riskColor[t.riskTier] ?? "bg-slate-100 text-slate-600"}`}>
                    {t.riskTier}
                  </span>
                )}
                {t.category && (
                  <span className="rounded-full bg-surface-raised px-2 py-0.5 text-xs text-text-secondary">
                    {t.category}
                  </span>
                )}
              </div>

              {(t.rating != null || t.usageCount > 0 || ratingFilter[t.id] != null) && (
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRate(t.id, star)}
                        className="focus:outline-none"
                        title={`Rate ${star} stars`}
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${
                            star <= (ratingFilter[t.id] ?? Math.round(t.rating ?? 0))
                              ? "fill-amber-400 text-amber-400"
                              : "text-text-tertiary/40"
                          }`}
                        />
                      </button>
                    ))}
                    {t.rating != null && (
                      <span className="text-xs text-text-tertiary ml-1">{t.rating.toFixed(1)}</span>
                    )}
                  </div>
                  {t.usageCount > 0 && (
                    <div className="flex items-center gap-1 text-xs text-text-tertiary">
                      <TrendingUp className="h-3 w-3" />
                      {t.usageCount} uses
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
