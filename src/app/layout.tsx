import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { auth, signOut } from "@/auth";

const geistSans = localFont({
  src: "../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "100 900",
});

const geistMono = localFont({
  src: "../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2",
  variable: "--font-mono",
  display: "swap",
  weight: "100 900",
});
import Sidebar from "@/components/nav/sidebar";
import Providers from "@/components/providers";

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

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
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
