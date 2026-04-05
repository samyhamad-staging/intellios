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
  },
  twitter: {
    card: "summary_large_image",
    title: "Intellios — The Governed Control Plane for AI Agents",
    description:
      "Enterprises deploy AI agents faster than they can govern them. Intellios closes the governance gap with policy-as-code, continuous compliance, and full audit trails.",
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
  return <>{children}</>;
}
