/**
 * Hero Illustration Component
 * Dark-native governance pipeline with directional arrows, feedback loop,
 * real agent names, and strong Intellios brand anchor at the shield.
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
        @keyframes flow-move {
          0%   { stroke-dashoffset: 18; opacity: 0.35; }
          50%  { opacity: 0.85; }
          100% { stroke-dashoffset: 0;  opacity: 0.35; }
        }
        @keyframes shield-breathe {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(99,102,241,0.5)); }
          50%       { filter: drop-shadow(0 0 22px rgba(99,102,241,0.85)); }
        }
        @keyframes badge-pulse {
          0%, 100% { opacity: 0.88; }
          50%       { opacity: 1; }
        }
        @keyframes dot-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        @keyframes return-flow {
          0%   { stroke-dashoffset: 30; opacity: 0.25; }
          50%  { opacity: 0.6; }
          100% { stroke-dashoffset: 0;  opacity: 0.25; }
        }
        .fa { animation: flow-move 2.4s linear infinite; }
        .fb { animation: flow-move 2.4s linear infinite; animation-delay: 1.2s; }
        .fc { animation: flow-move 2.4s linear infinite; animation-delay: 0.5s; }
        .fd { animation: flow-move 2.4s linear infinite; animation-delay: 0.9s; }
        .fr { animation: return-flow 3.2s linear infinite; }
        .shield { animation: shield-breathe 3s ease-in-out infinite; }
        .badge  { animation: badge-pulse 3s ease-in-out infinite; animation-delay: 0.4s; }
        .d1 { animation: dot-blink 1.4s ease-in-out infinite; }
        .d2 { animation: dot-blink 1.4s ease-in-out infinite; animation-delay: 0.47s; }
        .d3 { animation: dot-blink 1.4s ease-in-out infinite; animation-delay: 0.94s; }
        @media (prefers-reduced-motion: reduce) {
          .fa,.fb,.fc,.fd,.fr,.shield,.badge,.d1,.d2,.d3 { animation: none !important; }
        }
      `}</style>

      <div className={`${sizeMap[size]} ${className}`}>
        <svg
          viewBox="0 0 580 240"
          className="w-full h-full"
          aria-label="Intellios governance pipeline: AI agents are validated and either approved to production or blocked with feedback"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="g-indigo" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="g-green" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
            <linearGradient id="g-prod" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#052e16" />
              <stop offset="100%" stopColor="#0f3d1e" />
            </linearGradient>

            {/* Arrowhead markers */}
            <marker id="arrow-indigo" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L0,7 L7,3.5 Z" fill="#6366f1" opacity="0.8" />
            </marker>
            <marker id="arrow-green" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L0,7 L7,3.5 Z" fill="#22c55e" opacity="0.8" />
            </marker>
            <marker id="arrow-red" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L0,7 L7,3.5 Z" fill="#ef4444" opacity="0.6" />
            </marker>
            <marker id="arrow-return" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L0,7 L7,3.5 Z" fill="#f97316" opacity="0.55" />
            </marker>

            {/* Shield glow filter */}
            <filter id="shield-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* ── STAGE 1: Agent cards ─────────────────────────────────────── */}

          {/* Top agent — Claims Triage */}
          <rect x="12" y="22" width="108" height="48" rx="9"
            fill="#1e1b4b" stroke="#4f46e5" strokeWidth="1.5" />
          <rect x="12" y="22" width="3.5" height="48" rx="1.5" fill="url(#g-indigo)" />
          <text x="71" y="40" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#a5b4fc">Claims Triage</text>
          <text x="71" y="52" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="#818cf8">Agent</text>
          <text x="71" y="63" textAnchor="middle" fontSize="7" fill="#6366f1" opacity="0.75">v2.1 · Draft</text>

          {/* Bottom agent — Risk Scoring */}
          <rect x="12" y="158" width="108" height="48" rx="9"
            fill="#1e1b4b" stroke="#4f46e5" strokeWidth="1.5" />
          <rect x="12" y="158" width="3.5" height="48" rx="1.5" fill="url(#g-indigo)" />
          <text x="71" y="176" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#a5b4fc">Risk Scoring</text>
          <text x="71" y="188" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="#818cf8">Agent</text>
          <text x="71" y="199" textAnchor="middle" fontSize="7" fill="#6366f1" opacity="0.75">v1.4 · Draft</text>

          {/* ── FLOW: agents → shield ───────────────────────────────────── */}
          <line x1="120" y1="46" x2="172" y2="106"
            stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5 4"
            markerEnd="url(#arrow-indigo)" className="fa" />
          <line x1="120" y1="182" x2="172" y2="148"
            stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5 4"
            markerEnd="url(#arrow-indigo)" className="fb" />

          {/* ── STAGE 2: Intellios Policy Shield ───────────────────────── */}
          <g className="shield" filter="url(#shield-glow)">
            {/* Outer glow ring */}
            <circle cx="214" cy="124" r="48" fill="#1e1b4b" opacity="0.5" />
            {/* Main circle */}
            <circle cx="214" cy="124" r="40" fill="#1e1b4b" stroke="#4f46e5" strokeWidth="2" />
            {/* Shield path */}
            <path
              d="M214 100 L236 111 L236 130 Q236 148 214 158 Q192 148 192 130 L192 111 Z"
              fill="url(#g-indigo)" opacity="0.2"
              stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.7"
            />
            {/* Checkmark */}
            <path d="M205 124 L212 132 L225 114"
              fill="none" stroke="#a5b4fc" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {/* "Intellios" brand label inside shield area */}
          <text x="214" y="170" textAnchor="middle" fontSize="8" fontWeight="800" fill="#818cf8" letterSpacing="0.06em">
            INTELLIOS
          </text>
          <text x="214" y="181" textAnchor="middle" fontSize="6.5" fill="#6366f1" opacity="0.65">
            SR 11-7 · GDPR · HIPAA
          </text>

          {/* ── FLOW: shield → approved ─────────────────────────────────── */}
          <line x1="254" y1="110" x2="308" y2="84"
            stroke="#22c55e" strokeWidth="1.5" strokeDasharray="5 4"
            markerEnd="url(#arrow-green)" className="fc" />

          {/* ── STAGE 3a: Approved ──────────────────────────────────────── */}
          <g className="badge">
            <rect x="308" y="60" width="106" height="46" rx="9"
              fill="#052e16" stroke="#16a34a" strokeWidth="1.5" />
            <rect x="308" y="60" width="3.5" height="46" rx="1.5" fill="url(#g-green)" />
            <circle cx="330" cy="83" r="9" fill="#15803d" />
            <path d="M326 83 L329.5 87 L336 77"
              fill="none" stroke="#bbf7d0" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
            <text x="345" y="79" fontSize="9" fontWeight="700" fill="#86efac">Approved</text>
            <text x="345" y="91" fontSize="7" fill="#4ade80" opacity="0.8">Audit trail written</text>
          </g>

          {/* ── FLOW: approved → production ─────────────────────────────── */}
          <line x1="414" y1="83" x2="440" y2="83"
            stroke="#22c55e" strokeWidth="1.5" strokeDasharray="5 4"
            markerEnd="url(#arrow-green)" className="fd" />

          {/* ── STAGE 4: Production ─────────────────────────────────────── */}
          <rect x="440" y="60" width="118" height="46" rx="9"
            fill="url(#g-prod)" stroke="#16a34a" strokeWidth="1.5" />
          <rect x="440" y="60" width="3.5" height="46" rx="1.5" fill="url(#g-green)" />
          <text x="498" y="78" textAnchor="middle" fontSize="9" fontWeight="700" fill="#86efac">Production</text>
          <circle cx="458" cy="91" r="3.5" fill="#22c55e" className="d1" />
          <circle cx="470" cy="91" r="3.5" fill="#22c55e" className="d2" />
          <circle cx="482" cy="91" r="3.5" fill="#22c55e" className="d3" />
          <text x="496" y="94" fontSize="6.5" fill="#4ade80" opacity="0.8">Live · Monitored</text>

          {/* ── FLOW: shield → blocked ──────────────────────────────────── */}
          <line x1="254" y1="138" x2="308" y2="158"
            stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4"
            markerEnd="url(#arrow-red)" className="fb" />

          {/* ── STAGE 3b: Blocked ───────────────────────────────────────── */}
          <rect x="308" y="144" width="106" height="40" rx="9"
            fill="#2d0a0a" stroke="#dc2626" strokeWidth="1.5" />
          <rect x="308" y="144" width="3.5" height="40" rx="1.5" fill="#dc2626" />
          <circle cx="330" cy="164" r="8" fill="#991b1b" />
          <path d="M326 160 L334 168 M334 160 L326 168"
            fill="none" stroke="#fca5a5" strokeWidth="1.8" strokeLinecap="round" />
          <text x="344" y="161" fontSize="9" fontWeight="700" fill="#fca5a5">Blocked</text>
          <text x="344" y="173" fontSize="7" fill="#f87171" opacity="0.8">Policy violation</text>

          {/* ── FEEDBACK LOOP: blocked → back to agents ─────────────────── */}
          {/* Curved return path below the diagram */}
          <path
            d="M361 184 Q361 218 200 218 Q100 218 66 206"
            fill="none" stroke="#f97316" strokeWidth="1.2" strokeDasharray="4 3"
            markerEnd="url(#arrow-return)" className="fr" opacity="0.5"
          />
          <text x="214" y="227" textAnchor="middle" fontSize="6.5" fill="#f97316" opacity="0.55">
            Returned for revision
          </text>

          {/* ── Stage labels ────────────────────────────────────────────── */}
          <text x="66"  y="212" textAnchor="middle" fontSize="7" fill="#475569">① Agents</text>
          <text x="214" y="196" textAnchor="middle" fontSize="7" fill="#475569">② Validate</text>
          <text x="361" y="212" textAnchor="middle" fontSize="7" fill="#475569">③ Gate</text>
          <text x="499" y="118" textAnchor="middle" fontSize="7" fill="#475569">④ Deploy</text>
        </svg>
      </div>
    </>
  );
}

export default HeroIllustration;
