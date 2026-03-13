import type { Metadata } from "next";
import "./globals.css";
import { auth, signOut } from "@/auth";
import Link from "next/link";
import NotificationBell from "@/components/nav/notification-bell";

export const metadata: Metadata = {
  title: "Intellios",
  description: "Enterprise Agent Factory",
};

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  designer: { label: "Designer", color: "bg-blue-50 text-blue-700" },
  reviewer: { label: "Reviewer", color: "bg-amber-50 text-amber-700" },
  compliance_officer: { label: "Compliance Officer", color: "bg-green-50 text-green-700" },
  admin: { label: "Admin", color: "bg-purple-50 text-purple-700" },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const roleInfo = session?.user?.role
    ? (ROLE_LABELS[session.user.role] ?? { label: session.user.role, color: "bg-gray-100 text-gray-700" })
    : null;

  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {session?.user && (
          <nav className="border-b border-gray-200 bg-white">
            <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-6">
              {/* Left: brand + nav links */}
              <div className="flex items-center gap-6">
                <Link
                  href="/"
                  className="text-sm font-semibold tracking-tight text-gray-900"
                >
                  Intellios
                </Link>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {(session.user.role === "designer" || session.user.role === "admin") && (
                    <Link href="/intake" className="hover:text-gray-900">
                      Intake
                    </Link>
                  )}
                  <Link href="/pipeline" className="hover:text-gray-900">
                    Pipeline
                  </Link>
                  <Link href="/registry" className="hover:text-gray-900">
                    Registry
                  </Link>
                  {(session.user.role === "reviewer" ||
                    session.user.role === "compliance_officer" ||
                    session.user.role === "admin") && (
                    <Link href="/review" className="hover:text-gray-900">
                      Review Queue
                    </Link>
                  )}
                  {(session.user.role === "admin" ||
                    session.user.role === "reviewer" ||
                    session.user.role === "compliance_officer") && (
                    <Link href="/deploy" className="hover:text-gray-900">
                      Deploy
                    </Link>
                  )}
                  {(session.user.role === "compliance_officer" ||
                    session.user.role === "admin") && (
                    <>
                      <Link href="/governance" className="hover:text-gray-900">
                        Governance
                      </Link>
                      <Link href="/audit" className="hover:text-gray-900">
                        Audit
                      </Link>
                      <Link href="/dashboard" className="hover:text-gray-900">
                        Dashboard
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Right: notifications + user info + sign out */}
              <div className="flex items-center gap-3">
                <NotificationBell />
                <span className="text-sm text-gray-700">{session.user.name}</span>
                {roleInfo && (
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${roleInfo.color}`}>
                    {roleInfo.label}
                  </span>
                )}
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                >
                  <button
                    type="submit"
                    className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </nav>
        )}
        {children}
      </body>
    </html>
  );
}
