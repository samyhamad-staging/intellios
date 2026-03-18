import Link from "next/link";
import { auth } from "@/auth";
import { LayoutTemplate, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { BLUEPRINT_TEMPLATES } from "@/lib/templates/blueprint-templates";
import { UseTemplateButton } from "@/components/templates/use-template-button";
import type { BlueprintTemplate } from "@/lib/templates/blueprint-templates";

// ─── Tier badge ───────────────────────────────────────────────────────────────

const TIER_STYLES = {
  standard: "bg-gray-100 text-gray-600",
  enhanced: "bg-blue-100 text-blue-700",
  critical: "bg-rose-100 text-rose-700",
};

const TIER_ICONS = {
  standard: CheckCircle,
  enhanced: Shield,
  critical: AlertTriangle,
};

function TierBadge({ tier }: { tier: BlueprintTemplate["governanceTier"] }) {
  const Icon = TIER_ICONS[tier];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TIER_STYLES[tier]}`}>
      <Icon className="h-3 w-3" />
      {tier}
    </span>
  );
}

// ─── Category badge ───────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<BlueprintTemplate["category"], string> = {
  "financial-services": "Financial Services",
  compliance: "Compliance",
  operations: "Operations",
  hr: "HR",
};

function CategoryBadge({ category }: { category: BlueprintTemplate["category"] }) {
  return (
    <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
      {CATEGORY_LABELS[category]}
    </span>
  );
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  isAuthenticated,
}: {
  template: BlueprintTemplate;
  isAuthenticated: boolean;
}) {
  const tools = template.abp.capabilities.tools ?? [];
  const deniedActions = template.abp.constraints?.denied_actions ?? [];

  return (
    <div className="flex flex-col rounded-card border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex-1 p-5">
        {/* Badges */}
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <TierBadge tier={template.governanceTier} />
          <CategoryBadge category={template.category} />
        </div>

        {/* Name + description */}
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{template.name}</h3>
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{template.description}</p>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-1">
          {template.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-md bg-gray-50 px-1.5 py-0.5 text-xs text-gray-500 border border-gray-100">
              {tag}
            </span>
          ))}
        </div>

        {/* Preview panel */}
        <details className="mt-4 group">
          <summary className="cursor-pointer list-none text-xs text-violet-600 hover:text-violet-700 font-medium select-none">
            <span className="group-open:hidden">Show details ▾</span>
            <span className="hidden group-open:inline">Hide details ▴</span>
          </summary>
          <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
            {tools.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Tools</p>
                <ul className="space-y-1">
                  {tools.map((tool) => (
                    <li key={tool.name} className="text-xs text-gray-600">
                      <span className="font-medium">{tool.name}</span>
                      {tool.description && (
                        <span className="text-gray-400"> — {tool.description.slice(0, 60)}{tool.description.length > 60 ? "…" : ""}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {deniedActions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Key Constraints</p>
                <ul className="space-y-1">
                  {deniedActions.slice(0, 4).map((action) => (
                    <li key={action} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <span className="mt-0.5 text-red-400 shrink-0">✕</span>
                      <span>{action}</span>
                    </li>
                  ))}
                  {deniedActions.length > 4 && (
                    <li className="text-xs text-gray-400">+{deniedActions.length - 4} more constraints</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </details>
      </div>

      {/* CTA footer */}
      <div className="border-t border-gray-100 px-5 py-3">
        {isAuthenticated ? (
          <UseTemplateButton
            templateId={template.id}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          />
        ) : (
          <Link
            href={`/login?callbackUrl=/templates`}
            className="text-xs font-medium text-violet-600 hover:text-violet-700"
          >
            Sign in to use →
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────

function CategorySection({
  category,
  templates,
  isAuthenticated,
}: {
  category: BlueprintTemplate["category"];
  templates: BlueprintTemplate[];
  isAuthenticated: boolean;
}) {
  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold text-gray-700">{CATEGORY_LABELS[category]}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <TemplateCard key={t.id} template={t} isAuthenticated={isAuthenticated} />
        ))}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const CATEGORY_ORDER: BlueprintTemplate["category"][] = [
  "financial-services",
  "compliance",
  "operations",
  "hr",
];

export default async function TemplatesPage() {
  const session = await auth();
  const isAuthenticated = !!session;

  // Group templates by category
  const grouped = CATEGORY_ORDER.reduce<Record<string, BlueprintTemplate[]>>((acc, cat) => {
    const items = BLUEPRINT_TEMPLATES.filter((t) => t.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="mb-10 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card bg-violet-100">
              <LayoutTemplate className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Template Library</h1>
              <p className="mt-1 text-sm text-gray-500">
                Production-ready agent starters for financial services and compliance teams. Clone any template into your workspace in one click.
              </p>
            </div>
          </div>
          {isAuthenticated && (
            <Link
              href="/registry"
              className="shrink-0 text-xs text-gray-500 hover:text-gray-700 mt-1"
            >
              ← Back to registry
            </Link>
          )}
        </div>

        {/* Template sections */}
        <div className="space-y-10">
          {CATEGORY_ORDER.map((cat) =>
            grouped[cat] ? (
              <CategorySection
                key={cat}
                category={cat}
                templates={grouped[cat]}
                isAuthenticated={isAuthenticated}
              />
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
