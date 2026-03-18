import Link from "next/link";
import { CheckCircle2, Users, ShieldCheck, Settings, LayoutTemplate } from "lucide-react";

export const metadata = { title: "Welcome to Intellios" };

const STEPS = [
  {
    icon: LayoutTemplate,
    title: "Browse the Template Library",
    description: "Get started instantly with a production-ready agent template. Clone any starter into your workspace in one click.",
    href: "/templates",
    cta: "Browse Templates",
  },
  {
    icon: Settings,
    title: "Configure your workspace",
    description: "Set your company branding, approval chain, and compliance preferences.",
    href: "/admin/settings",
    cta: "Open Settings",
  },
  {
    icon: ShieldCheck,
    title: "Review your governance policies",
    description: "Your workspace was pre-seeded with SR 11-7 policies. Customise them to fit your requirements.",
    href: "/governance",
    cta: "View Policies",
  },
  {
    icon: Users,
    title: "Invite your team",
    description: "Add designers, reviewers, and compliance officers to collaborate on agent blueprints.",
    href: "/admin/users",
    cta: "Manage Users",
  },
  {
    icon: CheckCircle2,
    title: "Design your first agent",
    description: "Start an intake session to capture requirements and generate your first Agent Blueprint Package.",
    href: "/intake",
    cta: "Start Intake",
  },
];

export default function WelcomePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      {/* Hero */}
      <div className="mb-10 rounded-card border border-violet-200 bg-violet-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600">
          <CheckCircle2 className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Your workspace is ready
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome to Intellios. Your enterprise was created, policies were seeded,
          and your admin account is set up. Here&apos;s what to do next.
        </p>
      </div>

      {/* Checklist */}
      <div className="space-y-4">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div
              key={step.href}
              className="flex items-start gap-4 rounded-card border border-gray-200 bg-white p-5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                <Icon className="h-4.5 w-4.5 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-400">Step {i + 1}</p>
                <h3 className="mt-0.5 font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{step.description}</p>
              </div>
              <Link
                href={step.href}
                className="shrink-0 self-center rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {step.cta}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Skip */}
      <p className="mt-8 text-center text-sm text-gray-400">
        Already set up?{" "}
        <Link href="/" className="text-violet-600 hover:text-violet-700 hover:underline underline-offset-2">
          Go to your dashboard
        </Link>
      </p>
    </div>
  );
}
