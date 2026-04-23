import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-raised">
      <div className="w-full max-w-md text-center">
        {/* Logo mark */}
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-surface shadow-sm border border-border">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#0f172a" />
            <path d="M8 10h6l2 4 2-4h6M8 22h16M14 16h4" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Status */}
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
          404
        </p>

        <h1 className="mb-3 text-2xl font-bold text-text">
          Page not found
        </h1>

        <p className="mb-8 text-sm text-text-secondary leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          If you followed a link, it may be stale.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-text px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-text-secondary transition-colors"
          >
            ← Return home
          </Link>
          <Link
            href="/registry"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-medium text-text shadow-sm hover:bg-surface-raised transition-colors"
          >
            Agent Registry
          </Link>
        </div>
      </div>
    </div>
  );
}
