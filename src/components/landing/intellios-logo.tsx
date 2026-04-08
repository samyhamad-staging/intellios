/**
 * InteliosLogo — shared brand mark + wordmark component.
 * Custom SVG shield with gradient fill and purpose-built checkmark.
 * Used in nav, footer, and any other branded surface.
 */

interface InteliosLogoProps {
  /** Size of the mark square in px. Default: 32 */
  markSize?: number;
  /** Whether to show the wordmark next to the mark. Default: true */
  showWordmark?: boolean;
  /** Extra classes on the wrapper */
  className?: string;
}

export function InteliosLogo({
  markSize = 32,
  showWordmark = true,
  className = "",
}: InteliosLogoProps) {
  const id = `ig-${markSize}`; // unique gradient id per size instance

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* ── Mark ── */}
      <svg
        width={markSize}
        height={markSize}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="white" stopOpacity="0.12" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Rounded square background */}
        <rect width="32" height="32" rx="9" fill={`url(#${id}-bg)`} />
        {/* Subtle top-shine overlay */}
        <rect width="32" height="32" rx="9" fill={`url(#${id}-shine)`} />

        {/* Shield silhouette — purpose-built, not stock */}
        <path
          d="M16 6 L24 9.5 L24 17.5 Q24 23 16 26.5 Q8 23 8 17.5 L8 9.5 Z"
          fill="white"
          fillOpacity="0.15"
          stroke="white"
          strokeOpacity="0.35"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* Checkmark — heavier, purpose-drawn */}
        <path
          d="M11.5 16.5 L14.5 19.5 L20.5 12.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* ── Wordmark ── */}
      {showWordmark && (
        <span
          className="text-lg font-bold tracking-tight text-white"
          style={{ letterSpacing: "-0.02em" }}
        >
          Intellios
        </span>
      )}
    </span>
  );
}
