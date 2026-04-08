/**
 * Governance Flow SVG Illustration
 * A custom architectural diagram showing the governance pipeline flow.
 * Used in the "How It Works" section as a visual complement.
 */

export function GovernanceFlowSVG({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full ${className}`}
      aria-hidden="true"
    >
      {/* Connection lines with animated dashes */}
      <style>{`
        @keyframes flow-dash {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
        .flow-line {
          animation: flow-dash 1.5s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .flow-line { animation: none; }
        }
      `}</style>

      {/* Flowing connection paths */}
      <path
        d="M 160 60 C 220 60 240 60 300 60"
        stroke="url(#flow-grad-1)"
        strokeWidth="2"
        strokeDasharray="6 6"
        className="flow-line"
      />
      <path
        d="M 360 60 C 420 60 440 60 500 60"
        stroke="url(#flow-grad-2)"
        strokeWidth="2"
        strokeDasharray="6 6"
        className="flow-line"
        style={{ animationDelay: "0.3s" }}
      />
      <path
        d="M 560 60 C 620 60 640 60 700 60"
        stroke="url(#flow-grad-3)"
        strokeWidth="2"
        strokeDasharray="6 6"
        className="flow-line"
        style={{ animationDelay: "0.6s" }}
      />

      {/* Node 1: Author */}
      <circle cx="130" cy="60" r="28" fill="rgba(30, 41, 59, 0.8)" stroke="rgba(71, 85, 105, 0.4)" strokeWidth="1.5" />
      <circle cx="130" cy="60" r="12" fill="rgba(99, 102, 241, 0.15)" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="1" />
      <circle cx="130" cy="60" r="3" fill="#6366f1" />
      <text x="130" y="100" textAnchor="middle" className="fill-gray-500" fontSize="10" fontWeight="600">AUTHOR</text>

      {/* Node 2: Validate (shield) */}
      <circle cx="330" cy="60" r="28" fill="rgba(30, 41, 59, 0.8)" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="1.5" />
      <path d="M 330 46 L 342 52 L 342 66 L 330 74 L 318 66 L 318 52 Z" fill="rgba(99, 102, 241, 0.2)" stroke="#6366f1" strokeWidth="1" />
      <text x="330" y="100" textAnchor="middle" className="fill-indigo-400" fontSize="10" fontWeight="600">VALIDATE</text>

      {/* Node 3: Approve (checkmark) */}
      <circle cx="530" cy="60" r="28" fill="rgba(30, 41, 59, 0.8)" stroke="rgba(139, 92, 246, 0.4)" strokeWidth="1.5" />
      <circle cx="530" cy="60" r="14" fill="rgba(139, 92, 246, 0.15)" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="1" />
      <path d="M 523 60 L 528 65 L 537 55" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <text x="530" y="100" textAnchor="middle" className="fill-violet-400" fontSize="10" fontWeight="600">APPROVE</text>

      {/* Node 4: Deploy (pulse) */}
      <circle cx="730" cy="60" r="28" fill="rgba(30, 41, 59, 0.8)" stroke="rgba(16, 185, 129, 0.4)" strokeWidth="1.5" />
      <circle cx="730" cy="60" r="8" fill="rgba(16, 185, 129, 0.3)">
        <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="730" cy="60" r="4" fill="#10b981" />
      <text x="730" y="100" textAnchor="middle" className="fill-emerald-400" fontSize="10" fontWeight="600">DEPLOY</text>

      {/* Gradient definitions */}
      <defs>
        <linearGradient id="flow-grad-1" x1="160" y1="60" x2="300" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" stopOpacity="0.2" />
          <stop offset="1" stopColor="#6366f1" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="flow-grad-2" x1="360" y1="60" x2="500" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" stopOpacity="0.4" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="flow-grad-3" x1="560" y1="60" x2="700" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b5cf6" stopOpacity="0.4" />
          <stop offset="1" stopColor="#10b981" stopOpacity="0.6" />
        </linearGradient>
      </defs>
    </svg>
  );
}
