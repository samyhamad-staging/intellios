import type { NextConfig } from "next";
import path from "path";

const CSP = [
  "default-src 'self'",
  // Next.js requires 'unsafe-inline' for its inline styles in dev;
  // nonce-based CSP for scripts is handled by Next.js automatically in prod.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // Anthropic API — called server-side only, but listed for completeness.
  "connect-src 'self' https://api.anthropic.com",
  "img-src 'self' data:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  // Prevent clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Limit referrer information
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browser features not used by this app
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Enforce HTTPS for 1 year (only effective when served over HTTPS)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // Content Security Policy
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  // outputFileTracingRoot and turbopack.root must match — set both to the
  // monorepo root so Vercel's file tracing captures all dependencies correctly.
  outputFileTracingRoot: path.resolve(__dirname, ".."),
  turbopack: {
    root: path.resolve(__dirname, ".."),
    // Windows only: pin @react-aria/* to compiled CJS output.
    // On Linux/macOS, path.resolve() returns a POSIX path starting with '/',
    // which Turbopack misreads as a server-relative URL — production breaks.
    // On Linux the @react-aria source-condition issue does not occur (verified
    // against dd12b6c: last READY build had no resolveAlias and built clean).
    ...(process.platform === "win32" ? {
      resolveAlias: {
        "@react-aria/interactions": path.resolve(__dirname, "node_modules/@react-aria/interactions/dist/main.js").replace(/\\/g, "/"),
        "@react-aria/focus": path.resolve(__dirname, "node_modules/@react-aria/focus/dist/main.js").replace(/\\/g, "/"),
        "@react-aria/utils": path.resolve(__dirname, "node_modules/@react-aria/utils/dist/main.js").replace(/\\/g, "/"),
        "@react-aria/ssr": path.resolve(__dirname, "node_modules/@react-aria/ssr/dist/main.js").replace(/\\/g, "/"),
      },
    } : {}),
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
