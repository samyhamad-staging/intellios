import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { auth, signOut } from "@/auth";
import { Analytics } from "@vercel/analytics/next";

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
  title: {
    default: "Intellios",
    template: "%s | Intellios",
  },
  description:
    "Intellios is an enterprise AI agent factory enabling Fortune 500 companies in regulated industries to design, govern, and deploy AI agents with built-in compliance for SR 11-7, EU AI Act, HIPAA, and NIST AI RMF.",
  metadataBase: new URL("https://intellios.app"),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    siteName: "Intellios",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm"
        >
          Skip to main content
        </a>
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
              <main id="main-content">{children}</main>
            </MobileLayout>
          ) : (
            <main id="main-content">{children}</main>
          )}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
