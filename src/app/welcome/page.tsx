"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Heading, Subheading } from "@/components/catalyst/heading";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  ArrowRight,
  Zap,
  Users,
  ShieldCheck,
  Settings,
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  BarChart2,
  Inbox,
} from "lucide-react";

const STEPS_KEY = "welcome-steps-visited";

// ── Role-specific setup steps (P1-81) ───────────────────────────────────────
// Each role sees a different sequence of steps tailored to their first-day
// priorities. Admins set up workspace; reviewers focus on the queue; architects
// start designing. The hero CTA also adapts per role.

const STEPS_BY_ROLE: Record<string, { icon: React.ElementType; title: string; description: string; href: string; cta: string }[]> = {
  admin: [
    {
      icon: Settings,
      title: "Configure your workspace",
      description: "Branding, approval chain, and compliance preferences.",
      href: "/admin/settings",
      cta: "Open Settings",
    },
    {
      icon: Users,
      title: "Invite your team",
      description: "Add designers, reviewers, and compliance officers.",
      href: "/admin/users",
      cta: "Manage Users",
    },
    {
      icon: ShieldCheck,
      title: "Review governance policies",
      description: "Your workspace was pre-seeded with SR 11-7 policies.",
      href: "/governance",
      cta: "View Policies",
    },
  ],
  compliance_officer: [
    {
      icon: ShieldCheck,
      title: "Review governance policies",
      description: "Verify and customise the SR 11-7 policy set for your enterprise.",
      href: "/governance",
      cta: "View Policies",
    },
    {
      icon: BarChart2,
      title: "Check the compliance dashboard",
      description: "Fleet-wide pass rate, violations, and risk tier distribution.",
      href: "/governance",
      cta: "Open Dashboard",
    },
    {
      icon: Settings,
      title: "Configure alert thresholds",
      description: "Set the pass-rate floor and violation limits that trigger notifications.",
      href: "/admin/settings#notifications",
      cta: "Configure Alerts",
    },
  ],
  reviewer: [
    {
      icon: Inbox,
      title: "Open your review queue",
      description: "Blueprint submissions awaiting your approval or feedback.",
      href: "/review",
      cta: "View Queue",
    },
    {
      icon: ClipboardList,
      title: "Explore the agent registry",
      description: "Browse deployed agents and their governance status.",
      href: "/registry",
      cta: "Open Registry",
    },
    {
      icon: ShieldCheck,
      title: "Review governance policies",
      description: "Understand the rules blueprints are validated against.",
      href: "/governance",
      cta: "View Policies",
    },
  ],
  // architect and default
  architect: [
    {
      icon: Zap,
      title: "Start your first design session",
      description: "Describe your agent's purpose in plain language — Intellios does the rest.",
      href: "/intake",
      cta: "Create Agent",
    },
    {
      icon: ClipboardList,
      title: "Browse templates",
      description: "Pre-built blueprints for Financial Services, Healthcare, and more.",
      href: "/templates",
      cta: "View Templates",
    },
    {
      icon: ShieldCheck,
      title: "Review governance policies",
      description: "Understand what policies your blueprints will be validated against.",
      href: "/governance",
      cta: "View Policies",
    },
  ],
};

const HERO_BY_ROLE: Record<string, { eyebrow: string; headline: string; body: string; cta: string; href: string; secondaryLabel?: string; secondaryHref?: string }> = {
  admin: {
    eyebrow: "Admin workspace ready",
    headline: "Set up your enterprise workspace",
    body: "Configure branding, approval chains, and governance policies to match your enterprise standards before inviting your team.",
    cta: "Open Settings",
    href: "/admin/settings",
    secondaryLabel: "Invite your team →",
    secondaryHref: "/admin/users",
  },
  compliance_officer: {
    eyebrow: "Compliance console ready",
    headline: "Govern your AI agent fleet",
    body: "Review and refine the SR 11-7 policy pack, set alert thresholds, and monitor your fleet-wide compliance posture.",
    cta: "Open Governance",
    href: "/governance",
    secondaryLabel: "View fleet overview →",
    secondaryHref: "/",
  },
  reviewer: {
    eyebrow: "Review queue is live",
    headline: "Start reviewing blueprints",
    body: "Blueprints submitted by your design team are waiting for your expert review and approval.",
    cta: "Open Review Queue",
    href: "/review",
    secondaryLabel: "Browse registry →",
    secondaryHref: "/registry",
  },
  architect: {
    eyebrow: "Your workspace is ready",
    headline: "Start building your first AI agent",
    body: "Describe what you want your agent to do. Intellios captures your requirements, applies governance, and generates a compliant Agent Blueprint Package — ready for review and deployment.",
    cta: "Create your first agent",
    href: "/intake",
    secondaryLabel: "Or use a template →",
    secondaryHref: "/templates",
  },
};

export default function WelcomePage() {
  const router = useRouter();
  const { data: sessionData } = useSession();
  const role = (sessionData?.user?.role as string | undefined) ?? "architect";

  // Normalise to one of the known keys (default to architect for unknown roles)
  const roleKey = Object.keys(STEPS_BY_ROLE).includes(role) ? role : "architect";
  const steps = STEPS_BY_ROLE[roleKey];
  const hero = HERO_BY_ROLE[roleKey] ?? HERO_BY_ROLE.architect;

  // P1-80: Persist checklist completion state — localStorage, browser-local
  const [visitedSteps, setVisitedSteps] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STEPS_KEY);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });

  function markVisited(href: string) {
    setVisitedSteps((prev) => {
      const next = new Set(prev).add(href);
      try { localStorage.setItem(STEPS_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
    router.push(href);
  }

  const completedCount = steps.filter((s) => visitedSteps.has(s.href)).length;
  const allDone = completedCount >= steps.length;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      {/* ── Role-aware hero ────────────────────────────────────────────── */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-600 to-violet-800 p-8 text-center shadow-lg">
        <SectionHeading style={{ color: "#ddd6fe" }} className="mb-2">
          {hero.eyebrow}
        </SectionHeading>
        <Heading level={1} className="text-white">{hero.headline}</Heading>
        <p className="mt-3 text-sm leading-relaxed text-violet-200">{hero.body}</p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            onClick={() => markVisited(hero.href)}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-semibold text-violet-700 shadow transition-opacity hover:opacity-90"
          >
            <Zap size={16} className="text-violet-600" />
            {hero.cta}
            <ArrowRight size={15} />
          </button>
          {hero.secondaryHref && (
            <Link
              href={hero.secondaryHref}
              className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/50 bg-violet-700/40 px-5 py-2 text-xs font-medium text-violet-200 transition-colors hover:bg-violet-700/60"
            >
              {hero.secondaryLabel}
              <ChevronRight size={13} />
            </Link>
          )}
        </div>
      </div>

      {/* ── Role-aware setup steps ────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <SectionHeading>
            Setup checklist
          </SectionHeading>
          <p className="mt-0.5 text-sm text-text-secondary">
            Recommended first steps for your role. You can revisit these any time.
          </p>
        </div>
        {/* P1-80: Progress indicator */}
        {completedCount > 0 && (
          <span className={`shrink-0 ml-4 text-xs font-medium ${allDone ? "text-emerald-600" : "text-text-tertiary"}`}>
            {allDone ? "✓ All done" : `${completedCount}/${steps.length} visited`}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {steps.map((step) => {
          const Icon = step.icon;
          const visited = visitedSteps.has(step.href);
          return (
            <div
              key={step.href}
              className={`flex items-center gap-4 rounded-xl border px-5 py-4 transition-colors ${
                visited
                  ? "border-emerald-100 bg-emerald-50/50"
                  : "border-border bg-surface"
              }`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${visited ? "bg-emerald-100" : "bg-surface-muted"}`}>
                {visited ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Icon className="h-4 w-4 text-text-tertiary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Subheading level={3} className={visited ? "text-emerald-700" : "text-text"}>
                  {step.title}
                </Subheading>
                <p className="mt-0.5 text-xs text-text-secondary">{step.description}</p>
              </div>
              <button
                onClick={() => markVisited(step.href)}
                className={`shrink-0 text-xs font-medium transition-colors ${
                  visited
                    ? "text-emerald-600 hover:text-emerald-700"
                    : "text-violet-600 hover:text-violet-700 hover:underline underline-offset-2"
                }`}
              >
                {visited ? "Revisit →" : `${step.cta} →`}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Skip ─────────────────────────────────────────────────────── */}
      <p className="mt-8 text-center text-sm text-text-tertiary">
        Already set up?{" "}
        <Link
          href="/"
          className="text-violet-600 hover:text-violet-700 hover:underline underline-offset-2"
        >
          Go to your dashboard
        </Link>
      </p>
    </div>
  );
}
