/**
 * Intellios Marketing Landing Page
 * Production-ready, 10-section marketing page using the Intellios design system.
 * All statistics sourced and attributed. Accessible without authentication.
 * Server component with client-side islands for interactivity.
 */

import Link from "next/link";
import { RequestAccessButton } from "@/components/landing/request-access-button";
import { HeroEmailCapture } from "@/components/landing/hero-email-capture";
import { ScrollRevealWrapper } from "@/components/landing/scroll-reveal-wrapper";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { HeroIllustration } from "@/components/landing/hero-illustration";
import { AnimatedProductShowcase } from "@/components/landing/animated-product-showcase";
import { GovernanceFlowSVG } from "@/components/landing/governance-flow-svg";
import { GatedContentCTA } from "@/components/landing/gated-content-cta";
import { MarketingNav } from "@/components/landing/marketing-nav";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import {
  ShieldCheck,
  Zap,
  ArrowRight,
  ChevronRight,
  Eye,
  Settings,
  Layers,
  GitBranch,
  Activity,
  AlertTriangle,
  Building2,
  Scale,
  TrendingUp,
  Users,
  Cloud,
  Cpu,
  Check,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────── */
/*  Data                                                                    */
/* ─────────────────────────────────────────────────────────────────────── */

const GOVERNANCE_GAP_STATS = [
  {
    icon: TrendingUp,
    stat: "40%",
    claim:
      "of enterprise applications will integrate task-specific AI agents by end of 2026, up from less than 5% in 2025.",
    source: "Gartner, August 2025",
  },
  {
    icon: AlertTriangle,
    stat: "78%",
    claim:
      "of AI users bring personal, unsanctioned AI tools into the workplace — shadow AI your security team can't see.",
    source: "WalkMe / SAP Survey, July 2025",
  },
  {
    icon: ShieldCheck,
    stat: "63%",
    claim:
      "of breached organizations lack AI governance policies entirely. Governance isn't a nice-to-have — it's the gap attackers exploit.",
    source: "IBM, Cost of a Data Breach Report 2025 (Ponemon Institute)",
  },
];

const PILLARS = [
  {
    icon: ShieldCheck,
    label: "Design-Time Governance",
    title: "Policy violations caught before agents reach production",
    copy: "Define your governance policies once as code. Intellios enforces them deterministically on every agent during design — before deployment, before risk, before exposure.",
    capabilities: [
      "Policy-as-code authoring with SR 11-7, EU AI Act, and NIST AI RMF templates",
      "Automated compliance gate blocks deployment on any policy failure",
      "Side-by-side agent comparison and version diff across every change",
      "Role-based approval workflows with cryptographic sign-off",
    ],
    metric: "Zero agents reach production without passing every compliance check",
    metricLabel: "Design-Time Guarantee",
    accent: "indigo",
  },
  {
    icon: GitBranch,
    label: "Lifecycle Management",
    title: "Every agent version tracked, validated, and audit-ready",
    copy: "Version-control every agent configuration end-to-end. Detect drift continuously. Generate compliance evidence automatically, mapped to your regulatory frameworks — so your audit trail writes itself.",
    capabilities: [
      "Immutable version history with full configuration snapshots",
      "Continuous drift detection flags unauthorized changes in production",
      "Auto-generated SR 11-7 MRM documentation per agent version",
      "Status lifecycle (Draft → Review → Approved → Deployed → Retired) with full event log",
    ],
    metric: "Designed to reduce audit prep from 12 weeks to 2",
    metricLabel: "Engineering Target",
    accent: "violet",
  },
  {
    icon: Eye,
    label: "Production Observability",
    title: "Full visibility from agent decision to audit evidence",
    copy: "Monitor every agent decision in real time. Trace the complete chain from input to action. When auditors arrive, your MRM documentation is already generated, already current, already waiting.",
    capabilities: [
      "Real-time decision tracing with input→action→outcome audit logs",
      "Anomaly detection and automated alerting on behavioral drift",
      "Cross-agent fleet dashboard with compliance health scoring",
      "One-click audit package export mapped to specific regulatory asks",
    ],
    metric: "Every agent decision traceable to a policy and a person",
    metricLabel: "Full Accountability Chain",
    accent: "emerald",
  },
];

const PERSONA_CARDS = [
  {
    role: "Chief Risk & Compliance Officers",
    icon: Scale,
    pain: "Audit prep takes months. Evidence is scattered across teams. Every new agent deployed is another compliance liability you have to track manually.",
    resolution:
      "Intellios auto-generates SR 11-7 documentation, maintains continuous compliance evidence, and eliminates the audit scramble. You're audit-ready before the auditor arrives.",
    fact: "SR 11-7, issued by the Federal Reserve and OCC in 2011, remains the cornerstone framework for model risk management at U.S. banking organizations. It requires model validation, governance, documentation, and ongoing monitoring across the full model lifecycle.",
    factSource: "Federal Reserve, SR 11-7, April 2011",
    color: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800",
    darkColor: "dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20",
    ctaLabel: "CROs: Apply as a design partner →",
    ctaTier: "persona-cro",
    ctaInitialRole: "compliance",
  },
  {
    role: "AI / ML Platform Teams",
    icon: Cpu,
    pain: "Manual compliance gates add weeks to every deployment cycle. Governance is the bottleneck your engineers resent and your compliance team can't accelerate.",
    resolution:
      "Intellios embeds governance into the deployment pipeline. Policy-as-code and automated approvals mean you ship governed agents faster — not slower.",
    fact: "Fewer than 10% of AI use cases make it past pilot stage, according to McKinsey research. Governance bottlenecks are a key contributor to stalled initiatives.",
    factSource:
      'McKinsey, "Seizing the Agentic AI Advantage," June 2025',
    color: "bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-800",
    darkColor: "dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20",
    ctaLabel: "AI / ML teams: Apply as a design partner →",
    ctaTier: "persona-ai-ml",
    ctaInitialRole: "architect",
  },
  {
    role: "CIOs & CTOs",
    icon: Eye,
    pain: "Shadow AI is growing. You don't know how many agents are in production, what they're deciding, or whether they comply with anything.",
    resolution:
      "Single pane of glass across every AI agent in your organization. Full visibility. Full control. No blind spots. Every agent governed from design through retirement.",
    fact: "88% of organizations now deploy AI in at least one business function, yet only ~31% report scaling AI enterprise-wide. Visibility and governance are the barriers to scale.",
    factSource: 'McKinsey, "The State of AI," March 2025',
    color: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800",
    darkColor: "dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    ctaLabel: "CIOs & CTOs: Apply as a design partner →",
    ctaTier: "persona-cto",
    ctaInitialRole: "engineering_lead",
  },
];

const ROI_STATS = [
  {
    stat: "$670K",
    claim:
      "additional average breach cost when shadow AI is involved ($4.63M vs. $3.96M standard). Governance pays for itself on the first prevented incident.",
    source: "IBM, Cost of a Data Breach Report 2025",
  },
  {
    stat: "$75M",
    claim:
      "civil money penalty assessed against Citibank by OCC for inadequate progress on risk management deficiencies. Regulators aren't waiting — and neither should you.",
    source: "OCC Enforcement Action, July 2024 (Docket No. AA-EC-2020-64)",
  },
  {
    stat: "~80%",
    claim:
      "of enterprises report no material EBIT impact from gen AI. Governance and workflow redesign — not more models — are the missing link between AI investment and AI returns.",
    source:
      'McKinsey, "The State of AI," March 2025; McKinsey, "Seizing the Agentic AI Advantage," June 2025',
  },
  {
    stat: "97%",
    claim:
      "of organizations that experienced an AI-related breach lacked proper AI access controls. The pattern is clear: ungoverned AI is breached AI.",
    source: "IBM, Cost of a Data Breach Report 2025",
  },
];

/* ─────────────────────────────────────────────────────────────────────── */
/*  Page                                                                    */
/* ─────────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <>
    <MarketingNav transparent />
    <ScrollRevealWrapper>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  SECTION 1 — Hero                                               */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section className="relative isolate overflow-hidden px-6 pt-20 lg:px-8 noise-overlay gradient-mesh-hero">
        {/* Background gradient blobs */}
        <div
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          aria-hidden="true"
        >
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-indigo-400 to-violet-300 opacity-20 dark:opacity-[0.15] sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>

        {/* Animated node grid — governance shield overlay */}
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <svg
            className="hero-bg-float absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] lg:w-[900px] h-[280px] sm:h-[400px] lg:h-[600px] opacity-[0.04] dark:opacity-[0.06]"
            viewBox="0 0 900 600"
          >
            {/* Interconnected nodes */}
            {[
              [150, 120], [300, 80], [450, 150], [600, 90], [750, 130],
              [100, 280], [250, 320], [400, 260], [550, 310], [700, 270],
              [200, 450], [350, 490], [500, 430], [650, 480], [800, 440],
            ].map(([cx, cy], i) => (
              <g key={i}>
                <circle cx={cx} cy={cy} r="4" fill="currentColor" className="text-indigo-600" />
                {i < 12 && (
                  <line
                    x1={cx}
                    y1={cy}
                    x2={[150, 300, 450, 600, 750, 100, 250, 400, 550, 700, 200, 350][(i + 3) % 12]}
                    y2={[120, 80, 150, 90, 130, 280, 320, 260, 310, 270, 450, 490][(i + 3) % 12]}
                    stroke="currentColor"
                    className="text-indigo-600"
                    strokeWidth="0.5"
                  />
                )}
              </g>
            ))}
            {/* Governance shield overlay */}
            <path
              d="M450 140 L550 190 L550 330 L450 390 L350 330 L350 190 Z"
              fill="none"
              stroke="currentColor"
              className="text-indigo-500"
              strokeWidth="1.5"
              strokeDasharray="8 4"
              opacity="0.6"
            />
            <path
              d="M450 180 L430 195 L430 230 L450 245 L470 230 L470 195 Z"
              fill="currentColor"
              className="text-indigo-500"
              opacity="0.3"
            />
          </svg>
        </div>

        <div className="mx-auto max-w-3xl py-20 sm:py-28 lg:py-36 text-center">
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-400 ring-1 ring-inset ring-indigo-600/20 dark:ring-indigo-500/20">
              The Governed Control Plane for AI Agents
              <ChevronRight size={14} className="text-indigo-500 dark:text-indigo-400" />
            </div>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl lg:text-7xl font-display">
            Every AI agent in your enterprise&mdash;{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
              governed, auditable, compliant.
            </span>
          </h1>

          <p className="mt-6 text-lg leading-8 font-medium text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
            Embed policy enforcement, automated audit trails, and continuous compliance into every AI agent&mdash;regardless of which cloud runs it.
          </p>

          {/* ── MRM stat card — P1-2: promoted from tertiary copy ── */}
          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center gap-4 rounded-2xl border border-indigo-200 dark:border-indigo-500/25 bg-gradient-to-r from-indigo-50 to-violet-50/60 dark:from-indigo-950/50 dark:to-violet-950/30 px-6 py-4 text-left">
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl font-bold text-gray-400 dark:text-gray-600 line-through decoration-2 decoration-red-400/70">
                  12 wks
                </span>
                <span className="text-lg font-light text-gray-400 dark:text-gray-500">&rarr;</span>
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  2 wks
                </span>
              </div>
              <div className="h-8 w-px bg-indigo-200 dark:bg-indigo-500/20" />
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 leading-tight">
                  MRM audit preparation
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Design target &middot; SR&nbsp;11-7
                </p>
              </div>
            </div>
          </div>

          {/* ── Inline email capture — P1-4 ── */}
          <div className="mt-8 flex flex-col items-center gap-4">
            <HeroEmailCapture />
            <Link
              href="#pillars"
              className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              See how it works &darr;
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {["Financial Services", "Healthcare", "Insurance", "Federal"].map((v) => (
              <span key={v} className="inline-flex items-center rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                {v}
              </span>
            ))}
          </div>

          {/* ── Decorative agent-factory illustration ── */}
          <div className="mt-12 flex justify-center">
            <HeroIllustration size="lg" className="opacity-80 dark:opacity-60" />
          </div>

          {/* ── Animated product showcase ── */}
          <div className="mt-6">
            <AnimatedProductShowcase />
          </div>
        </div>

        <div
          className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
          aria-hidden="true"
        >
          <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-violet-400 to-indigo-300 opacity-20 dark:opacity-[0.15] sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  SECTION 1b — Trust Strip (Industries + Frameworks)              */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section className="py-8 border-b border-gray-100 dark:border-white/5">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">

          {/* Row 1 — Target industries */}
          <p className="text-center text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-5">
            Purpose-built for regulated industries
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {[
              { label: "Financial Services", icon: Building2 },
              { label: "Healthcare",         icon: ShieldCheck },
              { label: "Insurance",          icon: Scale },
              { label: "Federal & Defense",  icon: Eye },
            ].map((industry) => (
              <div key={industry.label} className="flex items-center gap-2">
                <industry.icon size={14} className="text-indigo-500 dark:text-indigo-400" />
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{industry.label}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="my-6 border-t border-gray-100 dark:border-white/5" />

          {/* Row 2 — Compliance frameworks (P1-3: proof strip) */}
          <p className="text-center text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
            Governance architecture designed around
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { label: "SR 11-7 / MRM", dot: "bg-indigo-500" },
              { label: "EU AI Act",     dot: "bg-blue-500" },
              { label: "NIST AI RMF",   dot: "bg-violet-500" },
              { label: "GDPR",          dot: "bg-emerald-500" },
              { label: "HIPAA",         dot: "bg-amber-500" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-1.5"
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${f.dot}`} />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{f.label}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
            Policy templates and validation rules map directly to these frameworks.
          </p>

        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  SECTION 2 — The Governance Gap                                  */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section
        id="governance-gap"
        className="relative border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-slate-900/50 py-20 sm:py-24 px-6 lg:px-8 scroll-mt-20 noise-overlay gradient-mesh-section"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14 reveal">
            <h2 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
              The Governance Gap
            </h2>
            <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl max-w-3xl mx-auto font-display">
              AI agents are scaling. Governance isn&apos;t.
            </p>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              The enterprise AI agent market is accelerating. Oversight and controls have not kept pace.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {GOVERNANCE_GAP_STATS.map((item, i) => (
              <div
                key={i}
                className="reveal relative rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-slate-800/30 dark:backdrop-blur-sm p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 mb-5">
                  <item.icon size={24} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">
                  {item.stat}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                  {item.claim}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                  Source: {item.source}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  SECTION 3 — Three Governance Pillars                            */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section id="pillars" className="py-20 sm:py-28 px-6 lg:px-8 scroll-mt-20">
        <div className="mx-auto max-w-7xl">

          {/* Section header */}
          <div className="text-center mb-16 reveal">
            <h2 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
              The Platform
            </h2>
            <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl max-w-3xl mx-auto leading-tight font-display">
              Three pillars of governed<br className="hidden sm:block" /> AI agent delivery
            </p>
            <p className="mt-5 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Intellios embeds policy enforcement, lifecycle management, and production observability across every agent. Not bolted on. Built in.
            </p>
          </div>

          {/* Pillar overview strip */}
          <div className="reveal mb-16 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PILLARS.map((pillar, i) => {
              const accentMap: Record<string, string> = {
                indigo: "border-indigo-500/40 bg-indigo-500/10 text-indigo-400",
                violet: "border-violet-500/40 bg-violet-500/10 text-violet-400",
                emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
              };
              return (
                <div key={i} className={`flex items-center gap-3 rounded-xl border px-5 py-3.5 ${accentMap[pillar.accent]}`}>
                  <pillar.icon size={18} className="shrink-0" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest opacity-70">{String(i + 1).padStart(2, "0")}</p>
                    <p className="text-sm font-semibold">{pillar.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed pillar cards */}
          <div className="space-y-8">
            {PILLARS.map((pillar, i) => {
              const accentBorder: Record<string, string> = {
                indigo: "border-indigo-500/30 hover:border-indigo-500/50",
                violet: "border-violet-500/30 hover:border-violet-500/50",
                emerald: "border-emerald-500/30 hover:border-emerald-500/50",
              };
              const accentIcon: Record<string, string> = {
                indigo: "bg-indigo-600",
                violet: "bg-violet-600",
                emerald: "bg-emerald-600",
              };
              const accentLabel: Record<string, string> = {
                indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
                violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
                emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
              };
              const accentCheck: Record<string, string> = {
                indigo: "text-indigo-400",
                violet: "text-violet-400",
                emerald: "text-emerald-400",
              };
              const accentMetric: Record<string, string> = {
                indigo: "border-indigo-500/20 bg-indigo-500/5",
                violet: "border-violet-500/20 bg-violet-500/5",
                emerald: "border-emerald-500/20 bg-emerald-500/5",
              };
              return (
                <div
                  key={i}
                  className={`reveal group relative rounded-2xl border dark:bg-slate-800/40 bg-white shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ${accentBorder[pillar.accent]}`}
                >
                  {/* Subtle top gradient accent */}
                  <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-30 ${accentCheck[pillar.accent]}`} />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                    {/* Left — content */}
                    <div className="p-8 lg:p-10 lg:border-r border-gray-100 dark:border-white/5">
                      {/* Pillar label + number */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accentIcon[pillar.accent]} shadow-lg`}>
                          <pillar.icon size={22} className="text-white" />
                        </div>
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${accentLabel[pillar.accent]}`}>
                          {String(i + 1).padStart(2, "0")} — {pillar.label}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 leading-snug">
                        {pillar.title}
                      </h3>

                      {/* Description */}
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                        {pillar.copy}
                      </p>

                      {/* Outcome metric */}
                      <div className={`rounded-xl border px-4 py-3 ${accentMetric[pillar.accent]}`}>
                        <p className={`text-xs font-semibold uppercase tracking-widest mb-0.5 ${accentCheck[pillar.accent]}`}>
                          {pillar.metricLabel}
                        </p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {pillar.metric}
                        </p>
                      </div>
                    </div>

                    {/* Right — capabilities */}
                    <div className="p-8 lg:p-10 bg-gray-50/50 dark:bg-slate-900/30">
                      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-5">
                        Key Capabilities
                      </p>
                      <ul className="space-y-4">
                        {pillar.capabilities.map((cap, j) => (
                          <li key={j} className="flex items-start gap-3">
                            <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 shadow-sm`}>
                              <Check size={10} className={accentCheck[pillar.accent]} />
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                              {cap}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Positioning line */}
          <div className="reveal mt-16 text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              Intellios governs. Your cloud runs. Your agents perform.
            </p>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              What McKinsey calls &ldquo;agent sprawl&rdquo; — the unchecked proliferation of ungoverned agents — Intellios was designed to prevent.
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 italic">
              McKinsey, &ldquo;Seizing the Agentic AI Advantage,&rdquo; June 2025
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  SECTION 4 — How It Works                                        */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section
        id="architecture"
        className="relative border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-slate-900/50 py-20 sm:py-28 px-6 lg:px-8 scroll-mt-20 gradient-mesh-section noise-overlay"
      >
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16 reveal">
            <h2 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
              How It Works
            </h2>
            <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl font-display">
              Every agent passes through governance.<br className="hidden sm:block" /> Nothing slips through.
            </p>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              Intellios sits between your teams and your cloud. Agents are designed, validated, approved, and monitored — before and after deployment — regardless of which runtime executes them.
            </p>
          </div>

          {/* ── Governance flow illustration ── */}
          <div className="reveal mb-10 hidden lg:block">
            <GovernanceFlowSVG className="opacity-70" />
          </div>

          {/* ── WITH Intellios flow ── */}
          <div className="reveal">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
                <Check size={10} /> With Intellios
              </span>
            </div>

            {/* Flow steps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
              {[
                {
                  step: "01",
                  label: "Author",
                  title: "Agent designed in Intellios",
                  desc: "Your team defines the agent's identity, capabilities, and constraints using guided templates.",
                  icon: Users,
                  color: "border-slate-700 bg-slate-800/60",
                  stepColor: "text-slate-400",
                },
                {
                  step: "02",
                  label: "Validate",
                  title: "Policy gate enforced",
                  desc: "Every policy — SR 11-7, GDPR, HIPAA, your custom rules — runs automatically. Failures block deployment.",
                  icon: ShieldCheck,
                  color: "border-indigo-500/40 bg-indigo-500/10",
                  stepColor: "text-indigo-400",
                },
                {
                  step: "03",
                  label: "Approve",
                  title: "Signed off and versioned",
                  desc: "Risk and compliance teams approve via role-based workflows. Every decision is logged with a cryptographic audit trail.",
                  icon: GitBranch,
                  color: "border-violet-500/40 bg-violet-500/10",
                  stepColor: "text-violet-400",
                },
                {
                  step: "04",
                  label: "Deploy & Monitor",
                  title: "Live on your cloud, governed by Intellios",
                  desc: "Agent runs on AWS AgentCore, Azure AI Foundry, or any future runtime. Every decision traced. Drift detected.",
                  icon: Activity,
                  color: "border-emerald-500/40 bg-emerald-500/10",
                  stepColor: "text-emerald-400",
                },
              ].map((s, i) => (
                <div key={i} className="relative">
                  <div className={`rounded-xl border p-5 h-full ${s.color}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs font-bold font-mono ${s.stepColor}`}>{s.step}</span>
                      <span className={`text-xs font-semibold uppercase tracking-widest ${s.stepColor}`}>{s.label}</span>
                    </div>
                    <s.icon size={20} className={`mb-3 ${s.stepColor}`} />
                    <p className="text-sm font-semibold text-white mb-1.5">{s.title}</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
                  </div>
                  {/* Arrow connector */}
                  {i < 3 && (
                    <div className="hidden lg:flex absolute -right-1.5 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-3">
                      <ArrowRight size={12} className="text-gray-600" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Outcome bar */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-3 flex flex-wrap items-center gap-4 sm:gap-8">
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Result</span>
              {[
                "Full audit trail from design to retirement",
                "Zero ungoverned agents in production",
                "Works on AWS, Azure, or any runtime",
              ].map((r) => (
                <span key={r} className="flex items-center gap-1.5 text-xs text-emerald-300">
                  <Check size={10} className="text-emerald-400 shrink-0" /> {r}
                </span>
              ))}
            </div>
          </div>

          {/* ── WITHOUT Intellios contrast ── */}
          <div className="reveal mt-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
                <AlertTriangle size={10} /> Without Intellios
              </span>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-0">
                {/* Team → direct to cloud */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="rounded-lg border border-gray-700 bg-slate-800 px-3 py-1.5 text-gray-400">Your teams build agents</span>
                  <ArrowRight size={12} className="text-red-500/60 shrink-0" />
                  <span className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-red-400 font-medium">Deployed directly to cloud</span>
                  <ArrowRight size={12} className="text-gray-600 shrink-0" />
                </div>
                <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                  {[
                    "No policy checks",
                    "No audit trail",
                    "Shadow AI proliferates",
                    "Regulators flag it",
                  ].map((r) => (
                    <span key={r} className="flex items-center gap-1 text-xs text-red-400/80 bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-1">
                      <AlertTriangle size={9} className="shrink-0" /> {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Runtime compatibility note */}
          <div className="reveal mt-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Works with your existing cloud</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {["AWS AgentCore", "Azure AI Foundry", "Future Runtimes"].map((r) => (
                <span key={r} className="flex items-center gap-1.5 rounded-full border border-gray-700 bg-slate-800/50 px-4 py-1.5 text-xs font-medium text-gray-400">
                  <Cloud size={11} /> {r}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Intellios doesn&apos;t replace your cloud. It governs what runs on it.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  SECTION 5 — Personas / Use Cases                                */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section id="personas" className="py-20 sm:py-24 px-6 lg:px-8 scroll-mt-20">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14 reveal">
            <h2 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
              Use Cases
            </h2>
            <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl font-display">
              Built for the people who own the risk
            </p>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              Whether you&apos;re auditing agents, deploying them, or accountable for what they do — Intellios is designed for your specific pain and your specific workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {PERSONA_CARDS.map((card, i) => (
              <div
                key={i}
                className="reveal rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-slate-800/50 p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border ${card.color} ${card.darkColor} mb-5`}>
                  <card.icon size={24} />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                  {card.role}
                </h3>

                {/* Pain */}
                <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10 p-3">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-widest mb-1">
                    The Pain
                  </p>
                  <p className="text-sm text-red-800 dark:text-red-300/80 leading-relaxed italic">
                    &ldquo;{card.pain}&rdquo;
                  </p>
                </div>

                {/* Resolution */}
                <div className="mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 p-3">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1">
                    With Intellios
                  </p>
                  <p className="text-sm text-emerald-800 dark:text-emerald-300/80 leading-relaxed">
                    {card.resolution}
                  </p>
                </div>

                {/* Supporting fact */}
                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {card.fact}
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 italic">
                    Source: {card.factSource}
                  </p>
                </div>

                {/* Per-persona CTA — P1-5 */}
                <div className="mt-5">
                  <RequestAccessButton
                    label={card.ctaLabel}
                    mobileLabel="Apply as a design partner →"
                    variant="primary"
                    className="w-full justify-center text-xs"
                    context={{
                      tier: card.ctaTier,
                      initialRole: card.ctaInitialRole,
                      heading: `Join the design partner program`,
                      subheading: `Applying as: ${card.role}. Tell us about your use case and we'll be in touch within one business day.`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mid-page CTA ── */}
      <section className="reveal border-t border-indigo-100 dark:border-indigo-500/10 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-500/5 dark:to-violet-500/5 py-14 px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            Your compliance team could stop scrambling.
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Now accepting design partners from financial services, healthcare, and regulated enterprise.
          </p>
          <div className="mt-6 flex flex-col items-center gap-2">
            <RequestAccessButton
              label="Apply for Design Partnership"
              mobileLabel="Apply for Design Partnership"
              variant="large"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Takes 30 seconds. We respond within one business day.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  SECTION 6 — Differentiation                                     */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section id="why-intellios" className="border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-slate-900/50 py-20 sm:py-24 px-6 lg:px-8 scroll-mt-20 noise-overlay">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14 reveal">
            <h2 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
              Why Intellios
            </h2>
            <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl font-display">
              The governance layer your stack is missing
            </p>
          </div>

          {/* Bento grid layout — asymmetric for visual interest */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
            {/* vs. Building from Scratch — spans 2 rows on large */}
            <div className="reveal rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-slate-800/30 dark:backdrop-blur-sm p-8 shadow-sm hover:shadow-xl transition-all duration-300 lg:row-span-2 flex flex-col">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 mb-5">
                <Building2 size={22} className="text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 font-display">
                vs. Building from Scratch
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                18+ months, $2&ndash;5M, and ongoing maintenance to build what Intellios delivers out of the box. Intellios deploys in weeks and stays current with evolving regulations — so your team focuses on agents, not infrastructure.
              </p>
              {/* Visual comparison element */}
              <div className="mt-auto space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1">DIY build</p>
                    <div className="h-2 rounded-full bg-red-500/20 overflow-hidden">
                      <div className="h-full w-full rounded-full bg-gradient-to-r from-red-500/40 to-red-500/60" />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">18+ months</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mb-1">Intellios</p>
                    <div className="h-2 rounded-full bg-indigo-500/20 overflow-hidden">
                      <div className="h-full w-[15%] rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
                    </div>
                    <p className="text-[10px] text-indigo-400 mt-0.5">Weeks</p>
                  </div>
                </div>
              </div>
            </div>

            {/* vs. Cloud-Native Tools */}
            <div className="reveal rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-slate-800/30 dark:backdrop-blur-sm p-8 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-sky-600/10 border border-sky-500/20 mb-5">
                <Cloud size={22} className="text-sky-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 font-display">
                vs. Cloud-Native Tools Alone
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                AWS AgentCore and Azure AI Foundry are powerful execution runtimes — but they handle execution, not governance. Intellios fills the governance gap above the runtime.
              </p>
            </div>

            {/* vs. Point Solutions */}
            <div className="reveal rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-slate-800/30 dark:backdrop-blur-sm p-8 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 mb-5">
                <Layers size={22} className="text-violet-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 font-display">
                vs. Point Solutions
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Fragmented monitoring or policy tools don&apos;t cover the full lifecycle. Intellios is end-to-end: design-time controls through production observability in one platform.
              </p>
            </div>

            {/* White-Label Ready — spans 2 columns */}
            <div className="reveal rounded-2xl border border-indigo-200 dark:border-indigo-500/20 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-500/5 dark:to-violet-500/5 p-8 shadow-sm hover:shadow-xl transition-all duration-300 sm:col-span-2">
              <div className="flex items-start gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
                  <Zap size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 font-display">
                    White-Label Ready
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    Deploy under your brand, inside your compliance posture. Multi-tenant by design, Intellios powers your agent platform without exposing ours — ideal for partner ecosystems and managed services.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  SECTION 7 — Where We Are (Transparent Status)                   */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-24 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Section header */}
          <div className="reveal text-center mb-14">
            <h2 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
              Where We Are
            </h2>
            <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl font-display">
              Building in the open. Shipping with conviction.
            </p>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              Intellios is an early-stage platform built by people who&apos;ve lived the AI governance problem inside regulated enterprises. Here&apos;s exactly where we stand.
            </p>
          </div>

          {/* Status grid */}
          <div className="reveal grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-14">
            {[
              {
                status: "Live",
                statusColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                title: "Core Governance Engine",
                desc: "Policy-as-code authoring, deterministic validation, blueprint generation, and lifecycle management are built and functional. The product works.",
              },
              {
                status: "Now accepting",
                statusColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
                title: "Design Partners",
                desc: "We\u2019re looking for 3\u20135 enterprises in financial services, healthcare, or insurance to co-develop the platform. You get early access and direct influence on the roadmap. We get real-world validation.",
              },
              {
                status: "Planned",
                statusColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
                title: "SOC 2 Type II",
                desc: "On our compliance roadmap. We\u2019ll pursue formal certification once design partner onboarding validates our security architecture in production environments.",
              },
            ].map((item) => (
              <div key={item.title} className="reveal rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-slate-800/50 p-8 shadow-sm">
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold mb-4 ${item.statusColor}`}>
                  {item.status}
                </span>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{item.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Why build in the open */}
          <div className="reveal mx-auto max-w-3xl rounded-2xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/5 p-8 sm:p-10 text-center mb-14">
            <p className="text-lg font-medium text-gray-800 dark:text-gray-200 leading-relaxed mb-3">
              We sell governance and trust. Our marketing should reflect both.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Every claim on this site is either a verifiable product capability, a sourced third-party statistic, or clearly labeled as a goal. We think enterprises deserve that standard from their vendors &mdash; especially from a vendor asking them to trust it with AI governance.
            </p>
          </div>

          {/* Compliance frameworks — target standards, not certifications */}
          <div className="reveal mt-12">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
              Governance Architecture Designed Around
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                { label: "SR 11-7 / MRM" },
                { label: "EU AI Act" },
                { label: "NIST AI RMF" },
                { label: "GDPR" },
                { label: "HIPAA" },
              ].map((badge) => (
                <div key={badge.label} className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-2">
                  <Settings size={14} className="text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{badge.label}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
              Policy templates and validation rules map directly to these frameworks. SOC 2 Type II certification is on our roadmap.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  SECTION 8 — ROI                                                 */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section
        id="roi"
        className="border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-slate-900/50 py-20 sm:py-24 px-6 lg:px-8 scroll-mt-20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14 reveal">
            <h2 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
              ROI
            </h2>
            <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl font-display">
              Governance that pays for itself
            </p>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              The cost of ungoverned AI isn&apos;t theoretical. It&apos;s measured in breach remediation, regulatory penalties, and stalled initiatives.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {ROI_STATS.map((item, i) => (
              <div
                key={i}
                className="reveal rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-slate-800/50 p-8 shadow-sm"
              >
                <p className="text-3xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 mb-3">
                  {item.stat}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
                  {item.claim}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                  Source: {item.source}
                </p>
              </div>
            ))}
          </div>

          {/* Intellios-specific ROI argument */}
          <div className="reveal mt-8 rounded-xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/5 p-6 text-center">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed">
              One shadow AI breach costs $670K more than a standard incident. One regulatory penalty can reach eight figures&mdash;Citibank paid $75M for <em>inadequate progress</em> on risk management. Intellios is designed to prevent both. The math isn&apos;t close.
            </p>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 italic">
              Derived from IBM Cost of a Data Breach Report 2025 and OCC enforcement action data cited above.
            </p>
          </div>

          {/* Why Now — urgency trigger */}
          <div className="reveal mt-6 text-center">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              The EU AI Act compliance deadlines aren&apos;t waiting for your governance roadmap. If you have more than 5 AI agents in production&mdash;or plan to by Q3&mdash;you&apos;re past the point where manual governance scales.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  SECTION 8a — Gated Content (secondary conversion path)          */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <GatedContentCTA className="border-t border-gray-100 dark:border-white/5" />

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  SECTION 8b — FAQ                                                */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section className="border-t border-gray-100 dark:border-white/5 py-20 sm:py-24 px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="reveal text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl mb-4 font-display">
              Frequently asked questions
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Have a question that isn&apos;t answered below? Reach out to sales@intellios.io
            </p>
          </div>

          <FaqAccordion
            items={[
              {
                question: "What cloud providers does Intellios work with?",
                answer:
                  "Intellios is runtime-agnostic. It governs agents running on AWS AgentCore, Azure AI Foundry, or any future runtime. The governed control plane sits above your execution environment \u2014 not beside it.",
              },
              {
                question: "How long does implementation take?",
                answer:
                  "Design partners typically see first value within 2\u20134 weeks. Full deployment with custom policies, SSO integration, and audit trail configuration is typically complete within 6\u20138 weeks.",
              },
              {
                question: "Is my data isolated from other tenants?",
                answer:
                  "Yes. Intellios uses strict tenant isolation at every layer: database, API, audit trail, and policy engine. Each enterprise operates in a fully separate namespace with independent encryption keys.",
              },
              {
                question: "What compliance frameworks do you support?",
                answer:
                  "Intellios is designed around SR 11-7 (Federal Reserve model risk management), EU AI Act, NIST AI RMF, GDPR, and HIPAA. Our governance engine maps policy validations directly to framework requirements.",
              },
              {
                question: "Do you offer a free trial?",
                answer:
                  "We don\u2019t offer self-serve trials. Instead, we onboard design partners with a guided implementation that ensures governance policies are configured correctly for your regulatory environment. Apply for a design partnership to get started.",
              },
              {
                question: "How does Intellios compare to broader AI governance platforms?",
                answer:
                  "Intellios is purpose-built for AI agents in regulated industries \u2014 SR 11-7 model risk, EU AI Act high-risk systems, HIPAA covered entities. Broader platforms cover more categories (models, applications, policies) but are less deep in the regulatory frameworks our buyers operate under. For enterprises whose primary governance surface is agents in compliance-sensitive workflows, Intellios is the sharpest tool.",
              },
            ]}
          />
        </div>
      </section>

      {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}
      {/*  SECTION 9 \u2014 Final CTA                                           */}
      {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}
      <section id="final-cta" className="relative isolate overflow-hidden bg-gray-900 dark:bg-slate-950 py-24 sm:py-28 px-6 lg:px-8 noise-overlay">
        {/* Background gradients */}
        <div
          className="absolute inset-x-0 top-1/2 -z-10 -translate-y-1/2 transform-gpu overflow-hidden opacity-30 dark:opacity-40 blur-3xl"
          aria-hidden="true"
        >
          <div className="ml-[max(50%,38rem)] aspect-[1313/771] w-[82.0625rem] bg-gradient-to-tr from-indigo-700 to-violet-500 dark:from-indigo-600 dark:to-violet-500" />
        </div>
        <div
          className="absolute inset-x-0 top-0 -z-10 flex transform-gpu overflow-hidden pt-32 opacity-25 dark:opacity-35 blur-3xl sm:pt-0"
          aria-hidden="true"
        >
          <div className="ml-[-22rem] aspect-[1313/771] w-[82.0625rem] flex-none origin-top-right rotate-[30deg] bg-gradient-to-tr from-indigo-700 to-violet-500 dark:from-indigo-600 dark:to-violet-500" />
        </div>

        <div className="reveal mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl font-display">
            Your regulators are asking about your AI agents. Have answers ready.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
            Now accepting design partners from financial services, healthcare, and federal. If you&apos;re governing AI agents&mdash;or need to start&mdash;tell us about your use case.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <RequestAccessButton
                label="Apply for Design Partnership"
                mobileLabel="Apply for Design Partnership"
                variant="large"
                className="!bg-white !text-indigo-600 dark:text-indigo-400 hover:!bg-indigo-50 dark:bg-indigo-950/30"
              />
              <a
                href="mailto:sales@intellios.io?subject=Intellios%20Sales%20Inquiry"
                className="rounded-xl border border-white/20 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors"
              >
                Talk to Sales
              </a>
            </div>
            <p className="text-xs text-gray-400/80">
              No commitment required. We respond to every inquiry within one business day.
            </p>
          </div>

          {/* Supporting context */}
          <p className="mt-8 text-sm text-gray-400 max-w-lg mx-auto">
            White-label ready. Deploy under your brand, inside your compliance posture.
          </p>
        </div>
      </section>
    </ScrollRevealWrapper>
    <MarketingFooter />
    </>
  );
}

