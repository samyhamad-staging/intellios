import { Suspense } from "react";
import { Cpu } from "lucide-react";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = { title: "Create Account — Intellios" };

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
            <h1 className="text-2xl font-bold tracking-tight text-white">Intellios</h1>
            <p className="mt-0.5 font-mono text-2xs tracking-widest text-indigo-400/60 uppercase">
              Enterprise Agent Factory
            </p>
          </div>
        </div>

        <Suspense>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
