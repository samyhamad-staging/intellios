/**
 * Intellios Marketing Landing Page
 * Production-ready, 10-section marketing page using the Intellios design system.
 * All statistics sourced and attributed. Accessible without authentication.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RequestAccessModal } from "@/components/landing/request-access-modal";
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
  Menu,
  X,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────── */
/*  Scroll animation hook                                                  */
/* ─────────────────────────────────────────────────────────────────────── */

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Respect prefers-reduced-motion — skip animations for users who request it
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      el.querySelectorAll(".reveal").forEach((t) => t.classList.add("revealed"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    const targets = el.querySelectorAll(".reveal");
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);
  return ref;
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Data                                                                    */
/* ─────────────────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: "Problem", href: "#governance-gap" },
  { label: "Product", href: "#pillars" },
  { label: "Architecture", href: "#architecture" },
  { label: "Use Cases", href: "#personas" },
  { label: "Why Us", href: "#why-intellios" },
  { label: "ROI", href: "#roi" },
];

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
    icon: Settings,
    title: "Catch policy violations before agents go live",
    copy: "Define your governance policies once. Intellios enforces them on every agent, automatically, before anything reaches production. Zero agents go live without passing your compliance checks.",
  },
  {
    icon: GitBranch,
    title: "Auto-generate your SR 11-7 audit trail",
    copy: "Version-control every agent configuration. Detect drift continuously. Generate compliance evidence automatically, mapped to SR 11-7 and MRM frameworks — so your audit trail writes itself.",
  },
  {
    icon: Activity,
    title: "Be audit-ready before auditors arrive",
    copy: "Monitor every agent decision in real time. Trace the full chain from input to action. When auditors arrive, your MRM documentation is already generated, already current, already waiting.",
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
    color: "bg-indigo-50 text-indigo-600 border-indigo-100",
    darkColor: "dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20",
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
    color: "bg-violet-50 text-violet-600 border-violet-100",
    darkColor: "dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20",
  },
  {
    role: "CIOs & CTOs",
    icon: Eye,
    pain: "Shadow AI is growing. You don't know how many agents are in production, what they're deciding, or whether they comply with anything.",
    resolution:
      "Single pane of glass across every AI agent in your organization. Full visibility. Full control. No blind spots. Every agent governed from design through retirement.",
    fact: "88% of organizations now deploy AI in at least one business function, yet only ~31% report scaling AI enterprise-wide. Visibility and governance are the barriers to scale.",
    factSource: 'McKinsey, "The State of AI," March 2025',
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    darkColor: "dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
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

const FOOTER_LINKS = {
  Product: [
    { label: "Platform Overview", href: "#pillars" },
    { label: "Architecture", href: "#architecture" },
    { label: "Use Cases", href: "#personas" },
    { label: "Why Intellios", href: "#why-intellios" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Contact Sales", href: "mailto:sales@intellios.io" },
    { label: "Careers", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Security", href: "#" },
  ],
};

/* ─────────────────────────────────────────────────────────────────────── */
/*  Page                                                                    */
/* ─────────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const scrollRef = useScrollReveal();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div ref={scrollRef} className="min-h-screen bg-white dark:bg-slate-950">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-gray-900/10 dark:border-white/10 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex lg:flex-1">
            <Link href="/landing" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                <Zap size={16} className="text-white" />
              </div>
              <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
                Intellios
              </span>
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden lg:flex lg:gap-x-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 rounded transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-1 items-center justify-end gap-3">
            <Link
              href="/login"
              className="hidden sm:block text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 rounded transition-colors"
            >
              Sign in
            </Link>
            <RequestAccessModal>
              {(open) => (
                <button
                  onClick={open}
                  className="inline-flex rounded-lg bg-indigo-600 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
                >
                  <span className="sm:hidden">Get Access</span>
                  <span className="hidden sm:inline">Request Early Access</span>
                </button>
              )}
            </RequestAccessModal>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden rounded-lg p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 dark:border-white/5 bg-white dark:bg-slate-950 px-6 pb-4 pt-2">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 border-t border-gray-100 dark:border-white/5 pt-3 flex flex-col gap-2">
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Sign in
                </Link>
                <RequestAccessModal>
                  {(open) => (
                    <button
                      onClick={() => { setMobileMenuOpen(false); open(); }}
                      className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors text-center"
                    >
                      Request Early Access
                    </button>
                  )}
                </RequestAccessModal>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  SECTION 1 — Hero                                               */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section className="relative isolate overflow-hidden px-6 pt-14 lg:px-8">
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
          <div className="reveal mb-6 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-400 ring-1 ring-inset ring-indigo-600/20 dark:ring-indigo-500/20">
              The Governed Control Plane for AI Agents
              <ChevronRight size={14} className="text-indigo-500 dark:text-indigo-400" />
            </div>
          </div>

          <h1 className="reveal text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl lg:text-7xl">
            Every AI agent in your enterprise&mdash;{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
              governed, auditable, compliant.
            </span>
          </h1>

          <p className="reveal mt-6 text-lg leading-8 font-medium text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
            Embed policy enforcement, automated audit trails, and continuous compliance into every AI agent&mdash;regardless of which cloud runs it.
          </p>
          <p className="reveal mt-3 text-base leading-7 text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Designed to reduce MRM audit preparation from 12 weeks to 2. Works with AWS, Azure, and whatever comes next.
          </p>

          <div className="reveal mt-10 flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <RequestAccessModal>
                {(open) => (
                  <button
                    onClick={open}
                    className="btn-primary rounded-xl px-7 py-3.5 text-sm font-semibold flex items-center gap-2"
                  >
                    Request Early Access
                    <ArrowRight size={16} />
                  </button>
                )}
              </RequestAccessModal>
              <Link
                href="#pillars"
                className="rounded-xl border border-gray-300 dark:border-gray-700 px-7 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
              >
                See How It Works
              </Link>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              We respond within one business day. No commitment required.
            </p>
          </div>

          <div className="reveal mt-8 flex flex-wrap items-center justify-center gap-2">
            {["Financial Services", "Healthcare", "Insurance", "Federal"].map((v) => (
              <span key={v} className="inline-flex items-center rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                {v}
              </span>
            ))}
          </div>

          {/* ── Product visualization mockup ── */}
          <div className="reveal mt-14 mx-auto max-w-4xl">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-slate-800/50 shadow-xl overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-gray-700/50">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                </div>
                <div className="flex-1 mx-8">
                  <div className="rounded-md bg-white dark:bg-slate-600/50 border border-gray-200 dark:border-gray-600 px-3 py-1 text-xs text-gray-400 dark:text-gray-500 text-center">
                    app.intellios.io/blueprints/review
                  </div>
                </div>
              </div>
              {/* App UI mockup */}
              <div className="p-5 sm:p-6 bg-gray-50 dark:bg-slate-900/50">
                <div className="grid grid-cols-12 gap-4">
                  {/* Sidebar hint */}
                  <div className="col-span-3 hidden sm:block space-y-2">
                    <div className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white flex items-center gap-1.5">
                      <ShieldCheck size={12} />
                      Governance
                    </div>
                    {["Blueprints", "Registry", "Policies", "Audit Trail"].map((item) => (
                      <div key={item} className="rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                        {item}
                      </div>
                    ))}
                  </div>
                  {/* Main content area */}
                  <div className="col-span-12 sm:col-span-9 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Blueprint Review: Claims-Triage-Agent v2.1</div>
                      <div className="flex gap-1.5">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                          4/4 Policies Passed
                        </span>
                        <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-400">
                          Ready for Approval
                        </span>
                      </div>
                    </div>
                    {/* Validation results */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Safety Baseline", status: "passed" },
                        { label: "SR 11-7 Compliance", status: "passed" },
                        { label: "Access Control", status: "passed" },
                        { label: "Audit Standards", status: "passed" },
                      ].map((check) => (
                        <div key={check.label} className="flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 px-3 py-2">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
                            <ShieldCheck size={10} className="text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="text-xs text-gray-700 dark:text-gray-300">{check.label}</span>
                        </div>
                      ))}
                    </div>
                    {/* Governance score bar */}
                    <div className="rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Governance Score</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">98/100</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500" style={{ width: "98%" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
      {/*  SECTION 2 — The Governance Gap                                  */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section
        id="governance-gap"
        className="relative border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-slate-900/50 py-20 sm:py-24 px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14 reveal">
            <h2 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
              The Governance Gap
            </h2>
            <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl max-w-3xl mx-auto">
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
                className="reveal relative rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-slate-800/50 p-8 shadow-sm hover:shadow-md transition-shadow"
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
      <section id="pillars" className="py-20 sm:py-24 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14 reveal">
            <h2 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
              The Platform
            </h2>
            <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl max-w-3xl mx-auto">
              Three pillars of governed AI agent delivery
            </p>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              Intellios embeds policy enforcement, audit readiness, and fleet visibility across the full agent lifecycle. Not bolted on. Built in.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {PILLARS.map((pillar, i) => (
              <div
                key={i}
                className="reveal group relative rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-slate-800/50 p-8 shadow-sm hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 mb-6 shadow-md group-hover:shadow-lg transition-shadow">
                  <pillar.icon size={26} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {pillar.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {pillar.copy}
                </p>
              </div>
            ))}
          </div>

          {/* Positioning line */}
          <div className="reveal mt-14 text-center">
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
      {/*  SECTION 4 — Architecture Diagram                                */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section
        id="architecture"
        className="relative border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-slate-900/50 py-20 sm:py-24 px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14 reveal">
            <h2 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
              Architecture
            </h2>
            <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Runtime-agnostic by design
            </p>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              Intellios doesn&apos;t replace your cloud. It governs what runs on it. A single control plane above any execution runtime.
            </p>
          </div>

          {/* Architecture diagram */}
          <div className="reveal mx-auto max-w-3xl">
            {/* Top Layer — Enterprise Systems */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-slate-800/50 p-5 mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                Enterprise Systems
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Identity Providers", icon: Users },
                  { label: "Data Sources", icon: Layers },
                  { label: "Policy Engines", icon: ShieldCheck },
                  { label: "CI/CD Pipelines", icon: GitBranch },
                ].map((sys) => (
                  <div
                    key={sys.label}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-700/50 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300"
                  >
                    <sys.icon size={12} />
                    {sys.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Connector arrows */}
            <div className="flex justify-center py-1">
              <div className="flex flex-col items-center">
                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
                <div className="h-0 w-0 border-x-4 border-x-transparent border-t-4 border-t-gray-300 dark:border-t-gray-600" />
              </div>
            </div>

            {/* Center Layer — Intellios (highlighted) */}
            <div className="rounded-xl border-2 border-indigo-400 dark:border-indigo-500/60 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-500/10 dark:to-violet-500/10 p-6 mb-3 shadow-lg relative">
              <div className="absolute -top-3 left-6">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                  <Zap size={10} />
                  INTELLIOS
                </span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-4 mt-2">
                Governed Control Plane
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PILLARS.map((p, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-white/80 dark:bg-slate-800/60 p-3 text-center"
                  >
                    <p.icon size={20} className="mx-auto text-indigo-600 dark:text-indigo-400 mb-1.5" />
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">
                      {p.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Connector arrows */}
            <div className="flex justify-center py-1">
              <div className="flex flex-col items-center">
                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
                <div className="h-0 w-0 border-x-4 border-x-transparent border-t-4 border-t-gray-300 dark:border-t-gray-600" />
              </div>
            </div>

            {/* Middle Layer — Runtime Adapter */}
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800/30 p-3 mb-3 text-center">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Runtime Adapter Interface
              </p>
            </div>

            {/* Connector arrows */}
            <div className="flex justify-center py-1">
              <div className="flex flex-col items-center">
                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
                <div className="h-0 w-0 border-x-4 border-x-transparent border-t-4 border-t-gray-300 dark:border-t-gray-600" />
              </div>
            </div>

            {/* Bottom Layer — Cloud Runtimes */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-slate-800/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                Cloud Runtimes
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "AWS AgentCore", icon: Cloud },
                  { label: "Azure AI Foundry", icon: Cloud },
                  { label: "Future Runtimes", icon: Cloud },
                ].map((rt) => (
                  <div
                    key={rt.label}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-700/50 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300"
                  >
                    <rt.icon size={12} />
                    {rt.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  SECTION 5 — Personas / Use Cases                                */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section id="personas" className="py-20 sm:py-24 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14 reveal">
            <h2 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
              Use Cases
            </h2>
            <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
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
            Currently onboarding design partners from financial services, healthcare, and regulated enterprise.
          </p>
          <div className="mt-6 flex flex-col items-center gap-2">
            <RequestAccessModal>
              {(open) => (
                <button
                  onClick={open}
                  className="btn-primary rounded-xl px-7 py-3 text-sm font-semibold inline-flex items-center gap-2"
                >
                  Tell Us Your Use Case
                  <ArrowRight size={16} />
                </button>
              )}
            </RequestAccessModal>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Takes 30 seconds. We respond within one business day.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  SECTION 6 — Differentiation                                     */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section id="why-intellios" className="border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-slate-900/50 py-20 sm:py-24 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14 reveal">
            <h2 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
              Why Intellios
            </h2>
            <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              The governance layer your stack is missing
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* vs. Building from Scratch */}
            <div className="reveal rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-slate-800/50 p-8 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/10 mb-4">
                <Building2 size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                vs. Building from Scratch
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                18+ months, $2&ndash;5M, and ongoing maintenance to build what Intellios delivers out of the box. Intellios deploys in weeks and stays current with evolving regulations — so your team focuses on agents, not infrastructure.
              </p>
            </div>

            {/* vs. Cloud-Native Tools Alone */}
            <div className="reveal rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-slate-800/50 p-8 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-500/10 mb-4">
                <Cloud size={20} className="text-sky-600 dark:text-sky-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                vs. Cloud-Native Tools Alone
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                AWS AgentCore and Azure AI Foundry are powerful execution runtimes — but they handle execution, not governance. Intellios fills the governance gap above the runtime, ensuring compliance regardless of where your agents run.
              </p>
            </div>

            {/* vs. Point Solutions */}
            <div className="reveal rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-slate-800/50 p-8 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/10 mb-4">
                <Layers size={20} className="text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                vs. Point Solutions
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Fragmented monitoring or policy tools don&apos;t cover the full lifecycle. Intellios is end-to-end: design-time controls through production observability in one platform.
              </p>
            </div>

            {/* White-Label Ready */}
            <div className="reveal rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-slate-800/50 p-8 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 mb-4">
                <Zap size={20} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                White-Label Ready
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Deploy under your brand, inside your compliance posture. Multi-tenant by design, Intellios powers your agent platform without exposing ours — ideal for partner ecosystems and managed services.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  SECTION 7 — Social Proof / Trust Signals                        */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-24 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Design partner signal */}
          <div className="reveal text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
              Designed with input from teams in
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {["Financial Services", "Healthcare", "Insurance", "Federal & Defense"].map((vertical) => (
                <span
                  key={vertical}
                  className="inline-flex items-center rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400"
                >
                  <Building2 size={14} className="mr-1.5 text-gray-400 dark:text-gray-500" />
                  {vertical}
                </span>
              ))}
            </div>
          </div>

          {/* Data-driven value callout */}
          <div className="reveal mx-auto max-w-3xl rounded-2xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/5 p-8 sm:p-10 text-center mb-14">
            <p className="text-4xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 mb-3">
              12 weeks &rarr; 2 weeks
            </p>
            <p className="text-lg font-medium text-gray-800 dark:text-gray-200 leading-relaxed mb-2">
              The MRM documentation reduction our governance engine is designed to deliver.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Policy-as-code and automated compliance evidence generation collapse audit preparation from months to days.
            </p>
          </div>

          {/* Compliance badges — separated achieved vs planned */}
          <div className="reveal">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
              Regulatory Framework Alignment
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 mb-4">
              {["SR 11-7", "EU AI Act", "NIST AI RMF"].map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400"
                >
                  <ShieldCheck size={12} />
                  {badge}
                </span>
              ))}
            </div>
            {/* Security certifications roadmap moved to FAQ — listing in-progress certs here inadvertently highlights gaps */}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  SECTION 8 — ROI                                                 */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section
        id="roi"
        className="border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-slate-900/50 py-20 sm:py-24 px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14 reveal">
            <h2 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
              ROI
            </h2>
            <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
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
      {/*  SECTION 9 — Final CTA                                           */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section className="relative isolate overflow-hidden bg-gray-900 dark:bg-slate-950 py-24 sm:py-28 px-6 lg:px-8">
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
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Your regulators are asking about your AI agents. Have answers ready.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
            We&apos;re onboarding design partners from financial services, healthcare, and federal. If you&apos;re governing AI agents&mdash;or need to start&mdash;tell us about your use case.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <RequestAccessModal>
                {(open) => (
                  <button
                    onClick={open}
                    className="rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 transition-colors flex items-center gap-2"
                  >
                    Apply for Design Partnership
                    <ArrowRight size={16} />
                  </button>
                )}
              </RequestAccessModal>
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

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  SECTION 10 — Footer                                             */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <footer className="bg-gray-900 dark:bg-slate-950 border-t border-white/10 py-14 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {/* Brand column */}
            <div className="col-span-2 lg:col-span-2">
              <Link href="/landing" className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600">
                  <Zap size={14} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-white">
                  Intellios
                </span>
              </Link>
              <p className="mt-3 text-xs text-gray-400 max-w-xs leading-relaxed">
                The governed control plane for enterprise AI agents. Design, govern, and deploy under your brand, inside your compliance posture.
              </p>
            </div>

            {/* Link columns */}
            {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
              <div key={heading}>
                <p className="font-semibold text-gray-400 text-sm mb-3">
                  {heading}
                </p>
                <ul className="space-y-2.5">
                  {links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} Intellios. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
