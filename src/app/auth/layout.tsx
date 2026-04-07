import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s — Intellios",
    default: "Account — Intellios",
  },
  description:
    "Manage your Intellios account. Secure authentication for the enterprise AI agent governance platform.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
