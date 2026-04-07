/**
 * Hero Illustration Component
 * Depicts the Intellios governance pipeline: agents flow through a central
 * policy checkpoint before reaching production. Clear left→right narrative:
 * Draft Agent → Governance Check → Approved → Production.
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
        @keyframes flow-dot {
          0%   { stroke-dashoffset: 24; opacity: 0.3; }
          50%  { opacity: 0.7; }
          100% { stroke-dashoffset: 0;  opacity: 0.3; }
        }
        @keyframes shield-pulse {
          0%, 100% { opacity: 1;   transform: scale(1); }
          50%       { opacity: 0.85; transform: scale(1.04); }
        }
        @keyframes badge-appear {
          0%, 100% { opacity: 0.85; }
          50%       { opacity: 1; }
        }
        .flow-line   { animation: flow-dot 2.2s linear infinite; }
        .flow-line-2 { animation: flow-dot 2.2s linear infinite; animation-delay: 1.1s; }
        .shield-gfx  { animation: shield-pulse 3s ease-in-out infinite; transform-origin: 200px 130px; }
        .badge-gfx   { animation: badge-appear 3s ease-in-out infinite; animation-delay: 0.4s; }

        @media (prefers-reduced-motion: reduce) {
          .flow-line, .flow-line-2, .shield-gfx, .badge-gfx { animation: none !important; }
        }
      `}</style>

      <div className={`${sizeMap[size]} ${className}`}>
        <svg
          viewBox="0 0 520 220"
          className="w-full h-full"
          aria-label="Governance pipeline: AI agents are validated against policies before reaching production"
        >
          <defs>
            <linearGradient id="indigo-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="1" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="green-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" stopOpacity="1" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
            </linearGradient>
            <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* ── Stage 1: Agent nodes (left) ─────────────────────────────── */}
          {/* Top agent */}
          <rect x="18" y="28" width="88" height="36" rx="8"
            fill="#eef2ff" stroke="#c7d2fe" strokeWidth="1.5" />
          <text x="62" y="43" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#4338ca">AI Agent</text>
          <text x="62" y="55" textAnchor="middle" fontSize="7" fill="#6366f1">v2.1 · Draft</text>

          {/* Bottom agent */}
          <rect x="18" y="154" width="88" height="36" rx="8"
            fill="#eef2ff" stroke="#c7d2fe" strokeWidth="1.5" />
          <text x="62" y="169" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#4338ca">AI Agent</text>
          <text x="62" y="181" textAnchor="middle" fontSize="7" fill="#6366f1">v1.4 · Draft</text>

          {/* ── Flow lines: agents → governance ─────────────────────────── */}
          {/* Top agent → shield */}
          <line x1="106" y1="46" x2="152" y2="100"
            stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5 4"
            className="flow-line" />
          {/* Bottom agent → shield */}
          <line x1="106" y1="172" x2="152" y2="142"
            stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5 4"
            className="flow-line-2" />

          {/* ── Stage 2: Governance checkpoint (center) ─────────────────── */}
          <g className="shield-gfx" filter="url(#soft-glow)">
            {/* Shield background glow */}
            <ellipse cx="200" cy="130" rx="42" ry="42" fill="#eef2ff" opacity="0.6" />
            {/* Shield shape */}
            <path
              d="M200 88 L232 103 L232 138 Q232 160 200 172 Q168 160 168 138 L168 103 Z"
              fill="url(#indigo-grad)" opacity="0.15"
              stroke="url(#indigo-grad)" strokeWidth="2"
            />
            {/* Inner shield */}
            <path
              d="M200 98 L222 110 L222 137 Q222 153 200 163 Q178 153 178 137 L178 110 Z"
              fill="url(#indigo-grad)" opacity="0.12"
              stroke="#6366f1" strokeWidth="1" strokeOpacity="0.4"
            />
            {/* Checkmark */}
            <path
              d="M190 130 L197 138 L212 120"
              fill="none" stroke="#4f46e5" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
            />
          </g>
          {/* Label */}
          <text x="200" y="182" textAnchor="middle" fontSize="8" fontWeight="700" fill="#4338ca">
            Policy Check
          </text>
          <text x="200" y="193" textAnchor="middle" fontSize="7" fill="#6366f1" opacity="0.7">
            SR 11-7 · GDPR · HIPAA
          </text>

          {/* ── Flow line: governance → approved ────────────────────────── */}
          <line x1="248" y1="118" x2="290" y2="90"
            stroke="#059669" strokeWidth="1.5" strokeDasharray="5 4"
            className="flow-line" />

          {/* ── Stage 3: Approved badge ──────────────────────────────────── */}
          <g className="badge-gfx">
            <rect x="290" y="62" width="96" height="38" rx="8"
              fill="#d1fae5" stroke="#6ee7b7" strokeWidth="1.5" />
            {/* Checkmark circle */}
            <circle cx="308" cy="81" r="8" fill="#059669" />
            <path d="M304 81 L307 84 L313 77"
              fill="none" stroke="white" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
            <text x="323" y="78" fontSize="8.5" fontWeight="700" fill="#065f46">Approved</text>
            <text x="323" y="90" fontSize="7" fill="#047857">Audit trail written</text>
          </g>

          {/* ── Flow line: approved → production ────────────────────────── */}
          <line x1="386" y1="81" x2="414" y2="81"
            stroke="#059669" strokeWidth="1.5" strokeDasharray="5 4"
            className="flow-line-2" />

          {/* ── Stage 4: Production ─────────────────────────────────────── */}
          <rect x="414" y="58" width="92" height="46" rx="8"
            fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5" />
          <text x="460" y="77" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#15803d">Production</text>
          {/* Status dots */}
          <circle cx="432" cy="90" r="3.5" fill="#22c55e" />
          <circle cx="444" cy="90" r="3.5" fill="#22c55e" />
          <circle cx="456" cy="90" r="3.5" fill="#22c55e" />
          <text x="468" y="93" fontSize="6.5" fill="#16a34a">Live · Monitored</text>

          {/* ── Blocked path (bottom) ───────────────────────────────────── */}
          <line x1="248" y1="142" x2="290" y2="155"
            stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4 3"
            opacity="0.5" />
          <g opacity="0.85">
            <rect x="290" y="140" width="90" height="34" rx="8"
              fill="#fef2f2" stroke="#fca5a5" strokeWidth="1.5" />
            {/* X circle */}
            <circle cx="308" cy="157" r="7" fill="#dc2626" />
            <path d="M305 154 L311 160 M311 154 L305 160"
              fill="none" stroke="white" strokeWidth="1.5"
              strokeLinecap="round" />
            <text x="320" y="154" fontSize="8.5" fontWeight="700" fill="#991b1b">Blocked</text>
            <text x="320" y="166" fontSize="7" fill="#b91c1c">Policy violation</text>
          </g>

          {/* ── Divider label ────────────────────────────────────────────── */}
          <text x="200" y="14" textAnchor="middle" fontSize="7.5" fontWeight="600"
            fill="#6366f1" letterSpacing="0.08em" opacity="0.6">
            INTELLIOS GOVERNANCE PIPELINE
          </text>

          {/* ── Stage labels ─────────────────────────────────────────────── */}
          <text x="62"  y="210" textAnchor="middle" fontSize="7" fill="#9ca3af">① Agents</text>
          <text x="200" y="210" textAnchor="middle" fontSize="7" fill="#9ca3af">② Validate</text>
          <text x="338" y="210" textAnchor="middle" fontSize="7" fill="#9ca3af">③ Gate</text>
          <text x="460" y="210" textAnchor="middle" fontSize="7" fill="#9ca3af">④ Deploy</text>
        </svg>
      </div>
    </>
  );
}

export default HeroIllustration;
