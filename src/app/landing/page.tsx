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
  FileText,
  Users,
  Cloud,
  Download,
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
    title: "Design-Time Governance",
    copy: "Author policies, configure guardrails, and enforce approval workflows before agents go live. Shift governance left — into the design phase where it's cheapest to get right and most expensive to miss.",
  },
  {
    icon: GitBranch,
    title: "Lifecycle Management",
    copy: "Version-control every agent configuration. Detect drift continuously. Generate compliance evidence automatically, mapped to SR 11-7 and MRM frameworks — so your audit trail writes itself.",
  },
  {
    icon: Activity,
    title: "Observability & Audit",
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
    { label: "Docs", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
  ],
  Resources: [
    { label: "AI Governance Whitepaper", href: "#" },
    { label: "ROI Calculator", href: "#" },
    { label: "SR 11-7 Guide", href: "#" },
    { label: "Case Studies", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Security", href: "#" },
    { label: "Responsible AI", href: "#" },
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
                  className="hidden sm:inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
                >
                  Request a Demo
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
                      Request a Demo
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
            Don&apos;t just build AI agents.{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
              Govern them.
            </span>
          </h1>

          <p className="reveal mt-6 text-lg leading-8 text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Enterprises are deploying AI agents faster than they can govern them — creating regulatory risk, shadow AI, and compliance gaps that compound with every ungoverned deployment. Intellios is the governed control plane that sits above your cloud runtimes, ensuring every agent is policy-compliant from design through production.
          </p>

          <div className="reveal mt-10 flex items-center justify-center gap-4 flex-wrap">
            <RequestAccessModal>
              {(open) => (
                <button
                  onClick={open}
                  className="btn-primary rounded-xl px-7 py-3.5 text-sm font-semibold flex items-center gap-2"
                >
                  Request a Demo
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

          <p className="reveal mt-8 text-xs text-gray-400 dark:text-gray-500">
            Built for financial services, healthcare, and regulated enterprise
          </p>
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
              The enterprise AI agent market is accelerating, but governance models haven&apos;t kept pace. The result: regulatory exposure, shadow AI proliferation, and compliance gaps that widen with every ungoverned deployment.
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
              Intellios embeds governance across the full agent lifecycle — from the first policy decision to the last audit request. Not bolted on. Built in.
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
              McKinsey warns of &ldquo;agent sprawl — the uncontrolled proliferation of redundant, fragmented, and ungoverned agents across teams and functions&rdquo; and calls for structured governance, design standards, and lifecycle management to prevent agent ecosystems from becoming fragile and unscalable.
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

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  SECTION 6 — Differentiation                                     */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section className="border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-slate-900/50 py-20 sm:py-24 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14 reveal">
            <h2 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
              Why Intellios
            </h2>
            <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              The governance layer your stack is missing
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
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
                Fragmented monitoring or policy tools don&apos;t cover the full lifecycle. Intellios is end-to-end: design-time governance through production observability, unified in a single governed control plane.
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
          {/* Logo placeholders */}
          <div className="reveal text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-6">
              Trusted by teams at
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-10 w-32 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-slate-800/30"
                >
                  <span className="text-xs text-gray-300 dark:text-gray-600">
                    Logo
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pull quote */}
          <div className="reveal mx-auto max-w-3xl rounded-2xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/5 p-8 sm:p-10 text-center mb-14">
            <svg
              className="mx-auto mb-4 h-8 w-8 text-indigo-300 dark:text-indigo-500/50"
              fill="currentColor"
              viewBox="0 0 32 32"
            >
              <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
            </svg>
            <blockquote className="text-lg font-medium text-gray-800 dark:text-gray-200 leading-relaxed mb-4">
              Intellios cut our MRM documentation cycle from 12 weeks to 2. For the first time, we&apos;re audit-ready before the auditor arrives.
            </blockquote>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              — VP of Model Risk, Fortune 100 Financial Institution
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">
              (Illustrative — design partner testimonial)
            </p>
          </div>

          {/* Compliance badges */}
          <div className="reveal">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-6">
              Compliance & Security
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                { label: "SOC 2 Type II", status: "Planned" },
                { label: "ISO 27001", status: "Planned" },
                { label: "FedRAMP Ready", status: "Roadmap" },
                { label: "SR 11-7", status: null },
                { label: "EU AI Act", status: null },
                { label: "NIST AI RMF", status: null },
              ].map((badge) => (
                <span
                  key={badge.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400"
                >
                  <ShieldCheck size={12} />
                  {badge.label}
                  {badge.status && (
                    <span className="ml-1 text-[10px] font-normal text-indigo-400 dark:text-indigo-500">
                      ({badge.status})
                    </span>
                  )}
                </span>
              ))}
            </div>
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

          {/* Forrester benchmark note */}
          <div className="reveal mt-8 rounded-xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/5 p-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Forrester TEI studies on comparable enterprise AI platforms show 300%+ ROI over three years when governance and platform reuse are built in.
            </p>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 italic">
              Forrester TEI of Microsoft Foundry, February 2026. Note: Intellios does not yet have its own commissioned TEI study — referenced as a benchmark framework.
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
            Govern your AI agents before your regulators do.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
            Every ungoverned agent is an audit finding waiting to happen, a breach vector waiting to be exploited, and a compliance gap waiting to be discovered. Close the gap now.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <RequestAccessModal>
              {(open) => (
                <button
                  onClick={open}
                  className="rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 transition-colors flex items-center gap-2"
                >
                  Request a Demo
                  <ArrowRight size={16} />
                </button>
              )}
            </RequestAccessModal>
            <Link
              href="#"
              className="rounded-xl border border-white/20 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors"
            >
              Talk to Sales
            </Link>
          </div>

          {/* Whitepaper callout */}
          <div className="mt-10 inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-3">
            <FileText size={18} className="text-indigo-400 shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium text-white">
                The AI-Native SDLC
              </p>
              <p className="text-xs text-gray-400">
                Why governance is the new center of gravity
              </p>
            </div>
            <Link
              href="#"
              className="ml-2 flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Download size={14} />
              Download
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  SECTION 10 — Footer                                             */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <footer className="bg-gray-900 dark:bg-slate-950 border-t border-white/10 py-14 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-5">
            {/* Brand column */}
            <div className="col-span-2 lg:col-span-1">
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
            <div className="flex items-center gap-6">
              <Link href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Terms of Service
              </Link>
              <Link href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Security
              </Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
