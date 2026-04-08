import { Suspense } from "react";
import Link from "next/link";
import { Cpu, Shield } from "lucide-react";
import { RegisterForm } from "@/components/auth/register-form";
import { Heading } from "@/components/catalyst";

export const metadata = {
  title: "Create Account — Intellios",
  description:
    "Create your Intellios account to start designing, governing, and deploying enterprise AI agents with governance designed around SR 11-7, EU AI Act, and NIST AI RMF.",
  openGraph: {
    title: "Create Account — Intellios",
    description:
      "Join the governed control plane for enterprise AI agents. Sign up to get started.",
    url: "https://intellios.app/register",
  },
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden py-12"
      style={{ background: "linear-gradient(135deg, #07071a 0%, #0d0d2b 50%, #07071a 100%)" }}
    >
      {/* Dot-grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(99,102,241,0.5) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* Ambient glow orbs */}
      <div
        className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.10), transparent 70%)" }}
      />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* ── Logo lockup ───────────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="relative">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10"
              style={{ boxShadow: "0 0 24px rgba(99,102,241,0.25), inset 0 0 12px rgba(99,102,241,0.05)" }}
            >
              <Cpu size={22} className="text-indigo-400" />
            </div>
            {/* Pulse ring */}
            <div
              className="absolute inset-0 rounded-xl border border-indigo-400/30"
              style={{ animation: "ping 2.5s cubic-bezier(0,0,0.2,1) infinite" }}
            />
          </div>
          <div className="text-center">
            <Link href="/landing" className="hover:opacity-80 transition-opacity">
              <Heading level={1} className="tracking-tight text-white">Intellios</Heading>
            </Link>
            <p className="mt-0.5 font-mono text-2xs tracking-widest text-indigo-400/60 uppercase">
              Enterprise Agent Factory
            </p>
            <Link href="/landing" className="mt-2 inline-block text-xs text-indigo-400/80 hover:text-indigo-300 transition-colors">
              Learn what Intellios does &rarr;
            </Link>
          </div>
        </div>

        <Suspense>
          <RegisterForm />
        </Suspense>

        {/* P1-7: Framework badges — target frameworks, not certifications */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {["SR 11-7", "EU AI Act", "NIST AI RMF", "GDPR"].map((badge) => (
            <div
              key={badge}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1"
            >
              <Shield size={10} className="text-indigo-400" />
              <span className="font-mono text-2xs text-white/60">{badge}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
