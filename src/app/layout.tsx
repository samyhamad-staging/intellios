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
import { Toaster } from "sonner";
import Sidebar from "@/components/nav/sidebar";
import MobileLayout from "@/components/nav/mobile-layout";
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
  const session = await auth().catch(() => null);

  const branding = session?.user?.enterpriseId
    ? await getEnterpriseSettings(session.user.enterpriseId).then(s => s.branding).catch(() => null)
    : null;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      {/*
        Anti-flash script — runs synchronously before React hydrates.
        Reads theme preference from localStorage and falls back to system
        preference. Adds .dark to <html> immediately so Tailwind dark: utilities
        are active on first paint, preventing a flash of light mode.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
        }}
      />
      <body className="antialiased" style={{ backgroundColor: "var(--content-bg)" }}>
        <Providers session={session}>
          <Toaster position="bottom-right" richColors />
          {session?.user ? (
            // C-12: MobileLayout handles responsive sidebar drawer on tablet/mobile
            <MobileLayout
              sidebar={
                <Sidebar
                  user={{
                    name: session.user.name,
                    email: session.user.email,
                    role: session.user.role,
                  }}
                  branding={branding}
                  signOutAction={handleSignOut}
                />
              }
            >
              {children}
            </MobileLayout>
          ) : (
            <>{children}</>
          )}
        </Providers>
      </body>
    </html>
  );
}
