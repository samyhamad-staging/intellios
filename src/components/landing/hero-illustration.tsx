/**
 * Hero Illustration Component
 * Dark-native governance pipeline: agents flow through a central
 * policy checkpoint before reaching production.
 * Left→right narrative: Draft Agent → Governance Check → Approved/Blocked → Production
 */

import React from "react";

interface HeroIllustrationProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-64 h-48",
  md: "w-96 h-72",
  lg: "w-full max-w-2xl h-80",
};

export function HeroIllustration({ className = "", size = "lg" }: HeroIllustrationProps) {
  return (
    <>
      <style>{`
        @keyframes flow-pulse {
          0%   { stroke-dashoffset: 20; opacity: 0.4; }
          50%  { opacity: 0.9; }
          100% { stroke-dashoffset: 0;  opacity: 0.4; }
        }
        @keyframes shield-breathe {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 8px rgba(99,102,241,0.4)); }
          50%       { opacity: 0.88; filter: drop-shadow(0 0 16px rgba(99,102,241,0.7)); }
        }
        @keyframes badge-glow {
          0%, 100% { opacity: 0.9; }
          50%       { opacity: 1; }
        }
        @keyframes dot-live {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .flow-a   { animation: flow-pulse 2.4s linear infinite; }
        .flow-b   { animation: flow-pulse 2.4s linear infinite; animation-delay: 1.2s; }
        .flow-c   { animation: flow-pulse 2.4s linear infinite; animation-delay: 0.6s; }
        .shield   { animation: shield-breathe 3s ease-in-out infinite; }
        .badge    { animation: badge-glow 3s ease-in-out infinite; animation-delay: 0.5s; }
        .dot1     { animation: dot-live 1.4s ease-in-out infinite; }
        .dot2     { animation: dot-live 1.4s ease-in-out infinite; animation-delay: 0.5s; }
        .dot3     { animation: dot-live 1.4s ease-in-out infinite; animation-delay: 1.0s; }
        @media (prefers-reduced-motion: reduce) {
          .flow-a, .flow-b, .flow-c, .shield, .badge, .dot1, .dot2, .dot3 {
            animation: none !important;
          }
        }
      `}</style>

      <div className={`${sizeMap[size]} ${className}`}>
        <svg
          viewBox="0 0 560 230"
          className="w-full h-full"
          aria-label="Governance pipeline: AI agents are validated against policies before reaching production"
        >
          <defs>
            <linearGradient id="indigo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="green-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
            <linearGradient id="flow-indigo" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="flow-green" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.2" />
            </linearGradient>
            <filter id="shield-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="card-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* ── Label ─────────────────────────────────────────────────────── */}
          <text x="280" y="14" textAnchor="middle" fontSize="7" fontWeight="700"
            fill="#6366f1" letterSpacing="0.12em" opacity="0.5">
            INTELLIOS GOVERNANCE PIPELINE
          </text>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* STAGE 1 — Agent cards                                             */}
          {/* ══════════════════════════════════════════════════════════════════ */}

          {/* Top agent */}
          <rect x="14" y="26" width="96" height="42" rx="9"
            fill="#1e1b4b" stroke="#4f46e5" strokeWidth="1.5" opacity="0.95" />
          {/* Left accent bar */}
          <rect x="14" y="26" width="3" height="42" rx="1.5" fill="url(#indigo-grad)" />
          <text x="62" y="43" textAnchor="middle" fontSize="9" fontWeight="700" fill="#a5b4fc">AI Agent</text>
          <text x="62" y="56" textAnchor="middle" fontSize="7.5" fill="#6366f1" opacity="0.8">v2.1 · Draft</text>

          {/* Bottom agent */}
          <rect x="14" y="152" width="96" height="42" rx="9"
            fill="#1e1b4b" stroke="#4f46e5" strokeWidth="1.5" opacity="0.95" />
          <rect x="14" y="152" width="3" height="42" rx="1.5" fill="url(#indigo-grad)" />
          <text x="62" y="169" textAnchor="middle" fontSize="9" fontWeight="700" fill="#a5b4fc">AI Agent</text>
          <text x="62" y="182" textAnchor="middle" fontSize="7.5" fill="#6366f1" opacity="0.8">v1.4 · Draft</text>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* FLOW LINES — agents → shield                                      */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <line x1="110" y1="47" x2="166" y2="100"
            stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5 4"
            className="flow-a" />
          <line x1="110" y1="173" x2="166" y2="142"
            stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5 4"
            className="flow-b" />

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* STAGE 2 — Policy Check shield (center)                            */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <g className="shield" filter="url(#shield-glow)">
            {/* Outer glow ring */}
            <circle cx="210" cy="120" r="44" fill="#312e81" opacity="0.3" />
            {/* Shield background */}
            <circle cx="210" cy="120" r="36" fill="#1e1b4b" stroke="#4f46e5" strokeWidth="1.5" />
            {/* Shield icon path */}
            <path
              d="M210 95 L232 106 L232 126 Q232 144 210 152 Q188 144 188 126 L188 106 Z"
              fill="url(#indigo-grad)" opacity="0.25"
              stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.6"
            />
            {/* Checkmark */}
            <path
              d="M201 120 L208 128 L221 111"
              fill="none" stroke="#818cf8" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
            />
          </g>

          {/* Label */}
          <text x="210" y="170" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#a5b4fc">
            Policy Check
          </text>
          <text x="210" y="181" textAnchor="middle" fontSize="7" fill="#6366f1" opacity="0.65">
            SR 11-7 · GDPR · HIPAA
          </text>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* FLOW — shield → approved (top-right)                              */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <line x1="246" y1="107" x2="302" y2="82"
            stroke="#22c55e" strokeWidth="1.5" strokeDasharray="5 4"
            className="flow-c" />

          {/* FLOW — shield → blocked (bottom-right) */}
          <line x1="246" y1="133" x2="302" y2="158"
            stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4"
            opacity="0.6" className="flow-b" />

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* STAGE 3a — Approved                                               */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <g className="badge" filter="url(#card-glow)">
            <rect x="302" y="58" width="104" height="44" rx="9"
              fill="#052e16" stroke="#16a34a" strokeWidth="1.5" />
            <rect x="302" y="58" width="3" height="44" rx="1.5" fill="url(#green-grad)" />
            <circle cx="323" cy="80" r="9" fill="#15803d" />
            <path d="M319 80 L322 83.5 L329 75"
              fill="none" stroke="#bbf7d0" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
            <text x="338" y="76" fontSize="9" fontWeight="700" fill="#86efac">Approved</text>
            <text x="338" y="89" fontSize="7" fill="#4ade80" opacity="0.75">Audit trail written</text>
          </g>

          {/* FLOW — approved → production */}
          <line x1="406" y1="80" x2="432" y2="80"
            stroke="#22c55e" strokeWidth="1.5" strokeDasharray="5 4"
            className="flow-c" />

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* STAGE 4 — Production                                              */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <rect x="432" y="58" width="106" height="44" rx="9"
            fill="#052e16" stroke="#16a34a" strokeWidth="1.5" />
          <rect x="432" y="58" width="3" height="44" rx="1.5" fill="url(#green-grad)" />
          <text x="484" y="75" textAnchor="middle" fontSize="9" fontWeight="700" fill="#86efac">Production</text>
          {/* Live pulsing dots */}
          <circle cx="450" cy="88" r="3.5" fill="#22c55e" className="dot1" />
          <circle cx="462" cy="88" r="3.5" fill="#22c55e" className="dot2" />
          <circle cx="474" cy="88" r="3.5" fill="#22c55e" className="dot3" />
          <text x="488" y="91" fontSize="6.5" fill="#4ade80" opacity="0.75">Live · Monitored</text>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* STAGE 3b — Blocked                                                */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <g opacity="0.92">
            <rect x="302" y="140" width="104" height="40" rx="9"
              fill="#2d0a0a" stroke="#dc2626" strokeWidth="1.5" />
            <rect x="302" y="140" width="3" height="40" rx="1.5" fill="#dc2626" />
            <circle cx="323" cy="160" r="8" fill="#991b1b" />
            <path d="M319 156 L327 164 M327 156 L319 164"
              fill="none" stroke="#fca5a5" strokeWidth="1.8"
              strokeLinecap="round" />
            <text x="337" y="157" fontSize="9" fontWeight="700" fill="#fca5a5">Blocked</text>
            <text x="337" y="169" fontSize="7" fill="#f87171" opacity="0.75">Policy violation</text>
          </g>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* Stage labels                                                       */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <text x="62"  y="216" textAnchor="middle" fontSize="7" fill="#475569">① Agents</text>
          <text x="210" y="216" textAnchor="middle" fontSize="7" fill="#475569">② Validate</text>
          <text x="354" y="216" textAnchor="middle" fontSize="7" fill="#475569">③ Gate</text>
          <text x="485" y="216" textAnchor="middle" fontSize="7" fill="#475569">④ Deploy</text>
        </svg>
      </div>
    </>
  );
}

export default HeroIllustration;
