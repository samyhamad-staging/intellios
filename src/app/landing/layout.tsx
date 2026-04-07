import type { Metadata } from "next";

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

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* ── JSON-LD Structured Data (SEO) ─────────────────────────────── */}
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
      {/* Force dark mode for all marketing/landing pages regardless of user OS preference */}
      <div className="dark">
        {children}
      </div>
    </>
  );
}
