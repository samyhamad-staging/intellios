/**
 * Public landing page — Phase 40.
 * Accessible without authentication. Unauthenticated visitors to / are redirected here.
 * Explains what Intellios does, demonstrates the pipeline, and links to sign in.
 */

import Link from "next/link";

const PIPELINE_STEPS = [
  {
    number: "01",
    name: "Intake",
    description: "Structured requirements capture with stakeholder contribution lanes and adaptive governance depth.",
  },
  {
    number: "02",
    name: "Generate",
    description: "Claude produces a complete Agent Blueprint Package from requirements — pre-adapted to your governance policies.",
  },
  {
    number: "03",
    name: "Govern",
    description: "Automated validation against your policy set. SR 11-7, EU AI Act, and NIST RMF assessed on every blueprint.",
  },
  {
    number: "04",
    name: "Review",
    description: "Multi-step human approval chain with separation-of-duties enforcement and full audit evidence.",
  },
  {
    number: "05",
    name: "Deploy",
    description: "Lifecycle-managed deployment with continuous governance health monitoring and periodic review scheduling.",
  },
];

const DIFFERENTIATORS = [
  {
    title: "SR 11-7 Ready",
    description:
      "Full model documentation, multi-step approval chains, periodic review scheduling, and behavioral test evidence — out of the box.",
  },
  {
    title: "EU AI Act + NIST RMF",
    description:
      "Automated regulatory framework assessment on every blueprint. Risk tier classification at intake, not after the fact.",
  },
  {
    title: "White-Label",
    description:
      "Your brand, your governance policies, your compliance posture. Deploy under your name across your enterprise.",
  },
];

const ROLES = [
  {
    name: "Designer",
    description: "Capture requirements through a structured, governance-aware intake conversation.",
  },
  {
    name: "Reviewer",
    description: "Inspect blueprints, validate governance posture, and approve agents for production.",
  },
  {
    name: "Compliance Officer",
    description: "Monitor enterprise-wide posture, manage policy libraries, and export MRM compliance reports.",
  },
  {
    name: "Admin",
    description: "Configure branding, approval chains, governance policies, and manage your enterprise roster.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="text-lg font-semibold text-gray-900 tracking-tight">Intellios</span>
        <div className="flex items-center gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
          >
            Start Free Trial
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 mb-6">
          Enterprise AI Governance Platform
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight tracking-tight">
          The Enterprise<br />
          <span className="text-violet-600">AI Agent Factory</span>
        </h1>
        <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Design, govern, and deploy AI agents that meet your compliance requirements —
          under your brand, at enterprise scale.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/register"
            className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700 transition-colors shadow-sm"
          >
            Start Free Trial
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Sign In →
          </Link>
        </div>
      </section>

      {/* Pipeline */}
      <section className="border-t border-gray-100 bg-gray-50 px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-gray-400 mb-10">
            The Pipeline
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.number} className="relative">
                {/* Connector line */}
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="hidden sm:block absolute top-5 left-full w-full h-px bg-gray-200 z-0" style={{ width: "calc(100% - 2rem)", left: "calc(100% - 0.5rem)" }} />
                )}
                <div className="relative z-10 rounded-xl border border-gray-200 bg-white p-4 h-full">
                  <div className="text-xs font-mono font-bold text-violet-500 mb-2">{step.number}</div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">{step.name}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-gray-400 mb-10">
          Built for Regulated Industries
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {DIFFERENTIATORS.map((d) => (
            <div key={d.title} className="rounded-xl border border-gray-200 p-6">
              <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center mb-4">
                <div className="h-3 w-3 rounded-full bg-violet-500" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{d.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{d.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="border-t border-gray-100 bg-gray-50 px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-gray-400 mb-10">
            Built for Every Role
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ROLES.map((role) => (
              <div key={role.name} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-5">
                <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{role.name}</p>
                  <p className="mt-0.5 text-sm text-gray-400">{role.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="border-t border-gray-100 px-6 py-10 text-center">
        <div className="flex items-center justify-center gap-6 mb-4">
          <Link href="/register" className="text-sm font-medium text-violet-600 hover:text-violet-700">
            Start Free Trial →
          </Link>
          <Link href="/login" className="text-sm text-gray-400 hover:text-gray-600">
            Sign In
          </Link>
        </div>
        <p className="text-xs text-gray-400">
          Already have access?{" "}
          <Link href="/login" className="font-medium text-violet-600 hover:text-violet-700">
            Sign in →
          </Link>
        </p>
        <p className="mt-3 text-xs text-gray-300">
          © {new Date().getFullYear()} Intellios. Enterprise AI Agent Factory.
        </p>
      </footer>
    </div>
  );
}
