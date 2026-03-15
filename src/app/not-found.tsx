import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md text-center">
        {/* Logo mark */}
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm border border-gray-200">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#0f172a" />
            <path d="M8 10h6l2 4 2-4h6M8 22h16M14 16h4" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Status */}
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-violet-600">
          404
        </p>

        <h1 className="mb-3 text-2xl font-bold text-gray-900">
          Page not found
        </h1>

        <p className="mb-8 text-sm text-gray-500 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          If you followed a link, it may be stale.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800 transition-colors"
          >
            ← Return home
          </Link>
          <Link
            href="/registry"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            Agent Registry
          </Link>
        </div>
      </div>
    </div>
  );
}
