import type { Metadata } from "next";
import "./globals.css";
import { auth, signOut } from "@/auth";
import Sidebar from "@/components/nav/sidebar";
import Providers from "@/components/providers";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";

export const metadata: Metadata = {
  title: "Intellios",
  description: "Enterprise Agent Factory",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  const branding = session?.user?.enterpriseId
    ? (await getEnterpriseSettings(session.user.enterpriseId)).branding
    : null;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <html lang="en">
      <body className="antialiased" style={{ backgroundColor: "var(--content-bg)" }}>
        <Providers session={session}>
          {session?.user ? (
            <div className="flex h-screen overflow-hidden">
              <Sidebar
                user={{
                  name: session.user.name,
                  email: session.user.email,
                  role: session.user.role,
                }}
                branding={branding}
                signOutAction={handleSignOut}
              />
              <main className="flex-1 overflow-y-auto" style={{ backgroundColor: "var(--content-bg)" }}>
                {children}
              </main>
            </div>
          ) : (
            <>{children}</>
          )}
        </Providers>
      </body>
    </html>
  );
}
