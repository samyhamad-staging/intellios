/**
 * Pricing — Intellios
 * Server component. Enterprise pricing tiers and contact information.
 */

import { Metadata } from "next";
import Link from "next/link";
import { Zap, Check, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing — Intellios",
  description: "Intellios pricing plans for enterprises and white-label partners",
};

interface PricingTier {
  name: string;
  description: string;
  features: string[];
  cta: {
    text: string;
    href: string;
  };
  highlighted?: boolean;
}

const tiers: PricingTier[] = [
  {
    name: "Design Partner",
    description: "For enterprises shaping the future of governed AI.",
    features: [
      "Full platform access",
      "Dedicated onboarding",
      "Direct engineering support",
      "Influence on roadmap",
    ],
    cta: {
      text: "Apply for Design Partnership",
      href: "mailto:sales@intellios.io",
    },
  },
  {
    name: "Enterprise",
    description: "For organizations ready to govern AI at scale.",
    features: [
      "Everything in Design Partner",
      "Custom policy templates",
      "SSO/SAML integration",
      "Dedicated success manager",
      "SLA guarantees",
      "Custom integrations",
    ],
    cta: {
      text: "Contact Sales",
      href: "mailto:sales@intellios.io",
    },
    highlighted: true,
  },
  {
    name: "White-Label",
    description: "For platforms embedding governed AI into their own products.",
    features: [
      "Everything in Enterprise",
      "Full brand customization",
      "Multi-tenant isolation",
      "API-first deployment",
      "Partner ecosystem support",
    ],
    cta: {
      text: "Talk to Sales",
      href: "mailto:sales@intellios.io",
    },
  },
];

const faqs = [
  {
    question: "Can I start with Design Partner and upgrade later?",
    answer:
      "Absolutely. Many of our customers begin as Design Partners and migrate to Enterprise or White-Label as their needs evolve. We'll help you with the transition at any time.",
  },
  {
    question: "What's included in custom integrations?",
    answer:
      "Custom integrations depend on your requirements. Our engineering team works with you to build connectors for your existing systems, APIs, and data sources.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "We don't offer a self-serve free trial, but Design Partner accounts give you full platform access with dedicated support from day one. Reach out to discuss what works best for your organization.",
  },
  {
    question: "How does multi-tenant isolation work in White-Label?",
    answer:
      "Our multi-tenant architecture ensures complete logical and physical separation between your customers' data. Each tenant has isolated encryption keys, access controls, and audit logs.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-gray-900/10 dark:border-white/10 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/landing" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
              Intellios
            </span>
          </Link>
          <Link
            href="/landing"
            className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Back to home
          </Link>
        </nav>
      </header>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
            Pricing
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Simple, transparent pricing designed for enterprises building governed AI.
          </p>
        </div>

        {/* ── Pricing Tiers ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-xl border transition-all duration-200 ${
                tier.highlighted
                  ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 ring-2 ring-indigo-600/20 md:scale-105"
                  : "border-gray-900/10 dark:border-white/10 bg-white dark:bg-white/5"
              }`}
            >
              {/* Most Popular Badge */}
              {tier.highlighted && (
                <div className="absolute -top-4 left-6 bg-indigo-600 text-white text-sm font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <div className="p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {tier.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  {tier.description}
                </p>

                {/* Features */}
                <div className="space-y-4 mb-8">
                  {tier.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <Check
                        size={20}
                        className="text-indigo-600 flex-shrink-0 mt-0.5"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <a
                  href={tier.cta.href}
                  className={`inline-flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 w-full justify-center ${
                    tier.highlighted
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20"
                  }`}
                >
                  {tier.cta.text}
                  <ArrowRight size={16} />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* ── FAQ Section ────────────────────────────────────────────────── */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {faqs.map((faq, index) => (
              <div key={index} className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {faq.question}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
        <section className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Not sure which plan is right?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Let's talk about your requirements and find the perfect fit.
          </p>
          <a
            href="mailto:sales@intellios.io"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Get in Touch
            <ArrowRight size={16} />
          </a>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 dark:bg-slate-950 border-t border-white/10 py-14 px-6 lg:px-8 mt-20">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between gap-4 pb-8 border-b border-white/10">
            <Link href="/landing" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600">
                <Zap size={14} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-white">
                Intellios
              </span>
            </Link>
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} Intellios. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
