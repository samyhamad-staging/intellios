/**
 * Intellios Public Landing Page
 * Design-partner-ready marketing page using Tailwind Plus design patterns.
 * Accessible without authentication.
 */

"use client";

import Link from "next/link";
import { RequestAccessModal } from "@/components/landing/request-access-modal";
import {
  ShieldCheck,
  Cpu,
  Rocket,
  FileText,
  CheckSquare,
  BarChart3,
  Building2,
  Lock,
  CheckCircle,
  ArrowRight,
  Zap,
  Users,
  Eye,
  Settings,
  ChevronRight,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────── */
/*  Data                                                                    */
/* ─────────────────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: "Product", href: "#features" },
  { label: "Compliance", href: "#compliance" },
  { label: "Roles", href: "#roles" },
  { label: "Pricing", href: "#pricing" },
];

const PIPELINE_STEPS = [
  {
    number: "01",
    name: "Intake",
    description:
      "Structured requirements capture with stakeholder contribution lanes and adaptive governance depth.",
    icon: CheckSquare,
  },
  {
    number: "02",
    name: "Generate",
    description:
      "Claude produces a complete Agent Blueprint Package from requirements — pre-adapted to your governance policies.",
    icon: Cpu,
  },
  {
    number: "03",
    name: "Govern",
    description:
      "Automated validation against SR 11-7, EU AI Act, and NIST RMF on every blueprint.",
    icon: ShieldCheck,
  },
  {
    number: "04",
    name: "Review",
    description:
      "Multi-step human approval chain with separation-of-duties enforcement and full audit evidence.",
    icon: FileText,
  },
  {
    number: "05",
    name: "Deploy",
    description:
      "Lifecycle-managed deployment with continuous governance health monitoring.",
    icon: Rocket,
  },
];

const PRIMARY_FEATURES = [
  {
    name: "Compliance-First by Design",
    description:
      "Every agent blueprint is automatically assessed against SR 11-7, EU AI Act, and NIST AI RMF at generation time — not as an afterthought. Risk tiers are assigned at intake, not post-deployment.",
    icon: ShieldCheck,
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    name: "AI-Powered Blueprint Generation",
    description:
      "Claude generates complete Agent Blueprint Packages from structured requirements — including behavioral specs, governance metadata, test cases, and deployment configurations.",
    icon: Cpu,
    color: "bg-violet-50 text-violet-600",
  },
  {
    name: "End-to-End Lifecycle Management",
    description:
      "From intake through deployment, every state transition is gated, audited, and role-enforced. Full evidence chain for regulatory review — one click away.",
    icon: Rocket,
    color: "bg-emerald-50 text-emerald-600",
  },
];

const STATS = [
  { value: "5-step", label: "governed pipeline" },
  { value: "3", label: "regulatory frameworks" },
  { value: "100%", label: "audit coverage" },
  { value: "Zero", label: "ungoverned deployments" },
];

const SECONDARY_FEATURES = [
  {
    name: "Separation-of-duties enforcement",
    description: "Approval chains with configurable multi-role sign-off.",
    icon: Lock,
  },
  {
    name: "Policy library management",
    description: "Reusable governance policies with version control.",
    icon: ShieldCheck,
  },
  {
    name: "Continuous posture monitoring",
    description: "Real-time governance health dashboard across your fleet.",
    icon: BarChart3,
  },
  {
    name: "White-label enterprise branding",
    description: "Deploy Intellios under your brand and compliance posture.",
    icon: Building2,
  },
  {
    name: "MRM-ready evidence exports",
    description: "One-click compliance report generation for auditors.",
    icon: FileText,
  },
  {
    name: "SSO & RBAC",
    description: "SAML/OIDC federation with fine-grained role-based access.",
    icon: Users,
  },
  {
    name: "Blueprint version history",
    description: "Full diff and audit trail for every blueprint revision.",
    icon: CheckSquare,
  },
  {
    name: "Behavioral test evidence",
    description: "Auto-generated test cases tied to governance dimensions.",
    icon: Zap,
  },
];

const ROLES = [
  {
    name: "Architect",
    description:
      "Capture requirements through a structured, governance-aware intake conversation. Refine blueprints with AI assistance.",
    icon: Cpu,
    bg: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
  {
    name: "Reviewer",
    description:
      "Inspect blueprints, validate governance posture, and approve agents for production with full audit evidence.",
    icon: Eye,
    bg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    name: "Compliance Officer",
    description:
      "Monitor enterprise-wide posture, manage policy libraries, and export MRM compliance reports on demand.",
    icon: ShieldCheck,
    bg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    name: "Admin",
    description:
      "Configure branding, approval chains, governance policies, SSO, and manage your enterprise roster.",
    icon: Settings,
    bg: "bg-gray-50",
    iconColor: "text-gray-600",
  },
];

const FRAMEWORK_BADGES = [
  { label: "SR 11-7", color: "bg-indigo-100 text-indigo-700 ring-indigo-200/60" },
  { label: "EU AI Act", color: "bg-violet-100 text-violet-700 ring-violet-200/60" },
  { label: "NIST AI RMF", color: "bg-emerald-100 text-emerald-700 ring-emerald-200/60" },
  { label: "ISO 42001", color: "bg-amber-100 text-amber-700 ring-amber-200/60" },
  { label: "SOC 2 Type II", color: "bg-sky-100 text-sky-700 ring-sky-200/60" },
];

/* ─────────────────────────────────────────────────────────────────────── */
/*  Page                                                                    */
/* ─────────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-gray-900/10 bg-white/90 backdrop-blur-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          {/* Logo */}
          <div className="flex lg:flex-1">
            <Link href="/landing" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                <Zap size={16} className="text-white" />
              </div>
              <span className="text-base font-semibold tracking-tight text-gray-900">
                Intellios
              </span>
            </Link>
          </div>

          {/* Nav links — hidden on mobile */}
          <div className="hidden lg:flex lg:gap-x-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-1 items-center justify-end gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign in
            </Link>
            <RequestAccessModal>
              {(open) => (
                <button
                  onClick={open}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
                >
                  Request access
                </button>
              )}
            </RequestAccessModal>
          </div>
        </nav>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-white px-6 pt-14 lg:px-8">
        {/* Gradient blob */}
        <div
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%-11rem)] aspect-1155/678 w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-indigo-400 to-violet-300 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          />
        </div>

        <div className="mx-auto max-w-3xl py-20 sm:py-28 lg:py-32 text-center">
          {/* Badge */}
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
              Enterprise AI Governance Platform
              <ChevronRight size={14} className="text-indigo-500" />
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Design, govern, and deploy{" "}
            <span className="text-indigo-600">
              enterprise AI agents
            </span>{" "}
            at scale
          </h1>

          <p className="mt-6 text-lg leading-8 text-gray-500 max-w-2xl mx-auto">
            Intellios is the white-label agent factory for regulated industries. Intake
            requirements, generate governed blueprints, and ship compliant AI agents —
            under your brand, inside your compliance posture.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <RequestAccessModal>
              {(open) => (
                <button
                  onClick={open}
                  className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors flex items-center gap-2"
                >
                  Request early access
                  <ArrowRight size={16} />
                </button>
              )}
            </RequestAccessModal>
            <Link
              href="/login"
              className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Sign in →
            </Link>
          </div>

          {/* Social proof */}
          <p className="mt-8 text-xs text-gray-400">
            Built for financial services, healthcare, and regulated enterprise
          </p>
        </div>

        {/* Bottom gradient blob */}
        <div
          className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%+3rem)] aspect-1155/678 w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-violet-400 to-indigo-300 opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          />
        </div>
      </section>

      {/* ── Compliance framework badges ─────────────────────────────────── */}
      <section id="compliance" className="border-y border-gray-100 bg-gray-50 py-10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6">
            Built for compliance
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {FRAMEWORK_BADGES.map((badge) => (
              <span
                key={badge.label}
                className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold ring-1 ring-inset ${badge.color}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pipeline ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14">
            <h2 className="text-base font-semibold text-indigo-600 uppercase tracking-widest mb-3">
              The Pipeline
            </h2>
            <p className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Five steps. Fully governed. End to end.
            </p>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              Every agent starts with structured intake and ends with a compliant,
              lifecycle-managed deployment. Nothing slips through ungoverned.
            </p>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="absolute top-8 left-0 right-0 hidden lg:block">
              <div className="mx-auto max-w-5xl">
                <div className="h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6 relative z-10">
              {PIPELINE_STEPS.map((step) => (
                <div key={step.number} className="flex flex-col items-center text-center">
                  {/* Icon circle */}
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 ring-4 ring-white border border-indigo-100 mb-5 shadow-sm">
                    <step.icon size={28} className="text-indigo-600" />
                  </div>
                  <div className="text-xs font-mono font-bold text-indigo-400 mb-1.5">
                    {step.number}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">{step.name}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Primary Features ────────────────────────────────────────────── */}
      <section id="features" className="border-t border-gray-100 bg-gray-50 py-20 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14">
            <h2 className="text-base font-semibold text-indigo-600 uppercase tracking-widest mb-3">
              Why Intellios
            </h2>
            <p className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Compliance built in, not bolted on
            </p>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              Most teams bolt governance onto AI projects after the fact. Intellios embeds
              governance into every step of the agent lifecycle.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {PRIMARY_FEATURES.map((feature) => (
              <div
                key={feature.name}
                className="relative rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.color} mb-5`}>
                  <feature.icon size={24} />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">{feature.name}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl font-bold tracking-tight text-indigo-600">
                  {stat.value}
                </p>
                <p className="mt-1.5 text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Secondary Features Grid ─────────────────────────────────────── */}
      <section className="border-t border-gray-100 bg-gray-50 py-20 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14">
            <h2 className="text-base font-semibold text-indigo-600 uppercase tracking-widest mb-3">
              Everything you need
            </h2>
            <p className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Enterprise-grade, out of the box
            </p>
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {SECONDARY_FEATURES.map((feature) => (
              <div key={feature.name} className="flex flex-col">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 mb-4">
                  <feature.icon size={20} className="text-white" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{feature.name}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ───────────────────────────────────────────────────────── */}
      <section id="roles" className="py-20 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14">
            <h2 className="text-base font-semibold text-indigo-600 uppercase tracking-widest mb-3">
              Built for every role
            </h2>
            <p className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              One platform, every stakeholder
            </p>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              Architects, reviewers, compliance officers, and admins each have a dedicated
              workspace with the tools and context they need.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((role) => (
              <div
                key={role.name}
                className="rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow"
              >
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${role.bg} mb-4`}>
                  <role.icon size={20} className={role.iconColor} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{role.name}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{role.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What's included checklist ───────────────────────────────────── */}
      <section className="border-t border-gray-100 bg-indigo-50 py-16 px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              What you get on day one
            </h2>
            <p className="mt-3 text-sm text-gray-500">
              No integration work required. No compliance consulting needed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "Full governance pipeline (Intake → Generate → Govern → Review → Deploy)",
              "SR 11-7, EU AI Act, and NIST AI RMF policy templates",
              "AI-powered blueprint generation via Claude",
              "Multi-step approval chains with configurable roles",
              "Continuous governance health monitoring",
              "SSO federation (SAML 2.0 / OIDC)",
              "MRM-ready audit evidence and compliance exports",
              "White-label enterprise branding",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle size={20} className="shrink-0 text-indigo-600 mt-0.5" />
                <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-gray-900 py-24 px-6 lg:px-8">
        {/* Gradient */}
        <div
          className="absolute inset-x-0 top-1/2 -z-10 -translate-y-1/2 transform-gpu overflow-hidden opacity-30 blur-3xl"
          aria-hidden="true"
        >
          <div className="ml-[max(50%,38rem)] aspect-1313/771 w-[82.0625rem] bg-gradient-to-tr from-indigo-800 to-violet-600" />
        </div>
        <div
          className="absolute inset-x-0 top-0 -z-10 flex transform-gpu overflow-hidden pt-32 opacity-25 blur-3xl sm:pt-0"
          aria-hidden="true"
        >
          <div className="ml-[-22rem] aspect-1313/771 w-[82.0625rem] flex-none origin-top-right rotate-[30deg] bg-gradient-to-tr from-indigo-800 to-violet-600" />
        </div>

        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to govern your AI agents?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
            Join the early access program. We&apos;re onboarding design partners from
            financial services, healthcare, and regulated enterprise.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <RequestAccessModal>
              {(open) => (
                <button
                  onClick={open}
                  className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 transition-colors flex items-center gap-2"
                >
                  Request early access
                  <ArrowRight size={16} />
                </button>
              )}
            </RequestAccessModal>
            <Link
              href="/login"
              className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Sign in →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 border-t border-white/10 py-12 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-8">
            {/* Brand */}
            <div className="flex-shrink-0">
              <Link href="/landing" className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600">
                  <Zap size={14} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-white">Intellios</span>
              </Link>
              <p className="mt-2 text-xs text-gray-500 max-w-xs leading-relaxed">
                Enterprise AI agent factory for regulated industries.
              </p>
            </div>

            {/* Footer links */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
              <div>
                <p className="font-semibold text-gray-400 mb-3">Product</p>
                <ul className="space-y-2">
                  {[
                    { label: "Features", href: "#features" },
                    { label: "Compliance", href: "#compliance" },
                    { label: "Roles", href: "#roles" },
                  ].map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-gray-500 hover:text-gray-300 transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-400 mb-3">Platform</p>
                <ul className="space-y-2">
                  {[
                    { label: "Register", href: "/register" },
                    { label: "Sign in", href: "/login" },
                    { label: "Documentation", href: "#" },
                  ].map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-gray-500 hover:text-gray-300 transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-400 mb-3">Compliance</p>
                <ul className="space-y-2">
                  {["SR 11-7", "EU AI Act", "NIST AI RMF", "ISO 42001"].map((l) => (
                    <li key={l}>
                      <span className="text-gray-500">{l}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} Intellios. Enterprise AI Agent Factory. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="#" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                Privacy
              </Link>
              <Link href="#" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                Terms
              </Link>
              <Link href="#" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                Security
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
