import type { Metadata } from "next";
import Link from "next/link";
import { Zap } from "lucide-react";
import { RequestAccessButton } from "@/components/landing/request-access-button";
import { MobileNav } from "@/components/landing/mobile-nav";

export const metadata: Metadata = {
  title: "Intellios — The Governed Control Plane for Enterprise AI Agents",
  description:
    "Design, govern, and deploy AI agents at enterprise scale. Intellios embeds governance across the full agent lifecycle — from policy authoring to production observability. Built for regulated industries.",
  keywords: [
    "AI governance",
    "enterprise AI agents",
    "agent governance platform",
    "SR 11-7",
    "model risk management",
    "MRM",
    "AI compliance",
    "shadow AI",
    "agent lifecycle management",
    "AI observability",
    "regulated AI",
    "NIST AI RMF",
    "EU AI Act",
    "agent sprawl",
  ],
  openGraph: {
    title: "Intellios — Govern Your AI Agents at Enterprise Scale",
    description:
      "The governed control plane that sits above your cloud runtimes. Design-time governance, lifecycle management, and full observability for every AI agent in your organization.",
    type: "website",
    siteName: "Intellios",
    locale: "en_US",
    url: "https://intellios.app/landing",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Intellios — The Governed Control Plane for AI Agents",
    description:
      "Enterprises deploy AI agents faster than they can govern them. Intellios closes the governance gap with policy-as-code, continuous compliance, and full audit trails.",
    images: "/og-image.png",
  },
  alternates: {
    canonical: "https://intellios.app/landing",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const NAV_LINKS = [
  { label: "Problem", href: "#governance-gap" },
  { label: "Product", href: "#pillars" },
  { label: "Use Cases", href: "#personas" },
  { label: "Pricing", href: "/landing/pricing" },
  { label: "Security", href: "/landing/security" },
  { label: "Templates", href: "/templates" },
];

const FOOTER_LINKS = {
  Platform: [
    { label: "Governance", href: "#pillars" },
    { label: "Templates", href: "/templates" },
    { label: "Architecture", href: "#architecture" },
  ],
  Company: [
    { label: "Pricing", href: "/landing/pricing" },
    { label: "Security", href: "/landing/security" },
    { label: "About", href: "#why-intellios" },
  ],
  Legal: [
    { label: "Privacy", href: "/landing/privacy" },
    { label: "Terms", href: "/landing/terms" },
  ],
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* ── JSON-LD Structured Data ────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Intellios",
            "url": "https://intellios.app",
            "description": "Enterprise AI agent factory with built-in governance and compliance",
            "sameAs": []
          })
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Intellios",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "description": "Design, govern, and deploy AI agents at enterprise scale with deterministic policy enforcement and regulatory compliance"
          })
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What cloud providers does Intellios work with?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Intellios is runtime-agnostic. It governs agents running on AWS AgentCore, Azure AI Foundry, or any future runtime. The governed control plane sits above your execution environment — not beside it."
                }
              },
              {
                "@type": "Question",
                "name": "How long does implementation take?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Design partners typically see first value within 2–4 weeks. Full deployment with custom policies, SSO integration, and audit trail configuration is typically complete within 6–8 weeks."
                }
              },
              {
                "@type": "Question",
                "name": "Is my data isolated from other tenants?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes. Intellios uses strict tenant isolation at every layer: database, API, audit trail, and policy engine. Each enterprise operates in a fully separate namespace with independent encryption keys."
                }
              },
              {
                "@type": "Question",
                "name": "What compliance frameworks do you support?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Intellios is designed around SR 11-7 (Federal Reserve model risk management), EU AI Act, NIST AI RMF, GDPR, and HIPAA. Our governance engine maps policy validations directly to framework requirements."
                }
              }
            ]
          })
        }}
      />
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
            <RequestAccessButton />

            <MobileNav navLinks={NAV_LINKS} />
          </div>
        </nav>
      </header>

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <main id="main-content">{children}</main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
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
