import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — Intellios",
  description:
    "Sign in to Intellios, the governed control plane for enterprise AI agents. Manage your agent blueprints, governance policies, and compliance posture.",
  openGraph: {
    title: "Sign In — Intellios",
    description:
      "Access your enterprise AI agent governance dashboard. Design, govern, and deploy AI agents with built-in compliance.",
    url: "https://intellios.app/login",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
