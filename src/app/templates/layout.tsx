import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent Templates — Intellios",
  description:
    "Browse pre-built, governance-ready AI agent templates for financial services, healthcare, and enterprise use cases. Every template ships with SR 11-7, GDPR, and HIPAA compliance controls built in.",
  keywords: [
    "AI agent templates",
    "enterprise AI templates",
    "governed AI agents",
    "compliance-ready agents",
    "financial services AI",
    "healthcare AI agents",
    "SR 11-7 templates",
  ],
  openGraph: {
    title: "Agent Templates — Intellios",
    description:
      "Pre-built, governance-ready AI agent templates for regulated industries. Pick a template and generate a governed agent blueprint in under 2 minutes.",
    url: "https://intellios.app/templates",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
