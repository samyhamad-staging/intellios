/**
 * Pricing — Intellios
 * Enterprise pricing tiers with integrated contact modal.
 * Uses RequestAccessButton for all CTAs — no more mailto links.
 */

import { Metadata } from "next";
import { Check, ArrowRight } from "lucide-react";
import { RequestAccessButton } from "@/components/landing/request-access-button";

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
    },
  },
];

const faqs = [
  {
    question: "Can I start with Design Partner and upgrade later?",
    answer:
      "Absolutely. The Design Partner tier is designed as the entry point. As your needs grow, we\u2019ll help you transition to Enterprise or White-Label at any time \u2014 with full data continuity and no re-onboarding.",
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

/** Map tier names to modal context for personalized messaging */
function tierContext(tierName: string) {
  const contexts: Record<string, { tier: string; heading: string; subheading: string }> = {
    "Design Partner": {
      tier: "Design Partner",
      heading: "Apply for the Design Partner program",
      subheading: "Get full platform access, dedicated onboarding, and direct influence on our roadmap. We're looking for 3\u20135 enterprises in regulated industries.",
    },
    "Enterprise": {
      tier: "Enterprise",
      heading: "Get Enterprise pricing",
      subheading: "Custom policy templates, SSO/SAML, SLA guarantees, and a dedicated success manager. Tell us about your organization and we'll put together a proposal.",
    },
    "White-Label": {
      tier: "White-Label",
      heading: "Explore White-Label partnership",
      subheading: "Deploy Intellios under your brand with full multi-tenant isolation and API-first architecture. Let's discuss your partner ecosystem needs.",
    },
  };
  return contexts[tierName];
}

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-4 font-display">
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
                  ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 ring-2 ring-indigo-600/20 md:scale-105"
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
                        className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA Button — opens modal with tier-specific context */}
                <div className="w-full">
                  <RequestAccessButton
                    label={tier.cta.text}
                    mobileLabel={tier.cta.text}
                    variant="large"
                    context={tierContext(tier.name)}
                    className={`w-full justify-center ${
                      tier.highlighted
                        ? ""
                        : "!bg-gray-100 dark:!bg-white/10 !text-gray-900 dark:!text-white hover:!bg-gray-200 dark:hover:!bg-white/20"
                    }`}
                  />
                </div>
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
            Tell us about your requirements and we&apos;ll recommend the right fit.
          </p>
          <RequestAccessButton
            label="Get in Touch"
            mobileLabel="Get in Touch"
            variant="large"
            context={{
              heading: "Let\u2019s find the right plan",
              subheading: "Tell us about your organization, use case, and scale requirements. We\u2019ll recommend the best tier and put together a proposal.",
            }}
          />
          <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
            We respond within one business day. No commitment required.
          </p>
        </section>
    </div>
  );
}
