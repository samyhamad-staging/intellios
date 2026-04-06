/**
 * Hero Illustration Component
 * Reusable SVG-based illustration for landing page hero section.
 * Depicts an abstract "agent factory" concept using interconnected nodes,
 * flow diagrams, and circuit-board patterns with Intellios brand colors.
 * Includes subtle CSS animations for visual interest.
 */

import React from "react";

interface HeroIllustrationProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-64 h-48",
  md: "w-96 h-72",
  lg: "w-full max-w-2xl h-96",
};

export function HeroIllustration({ className = "", size = "lg" }: HeroIllustrationProps) {
  return (
    <>
      <style>{`
        @keyframes gentle-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        @keyframes gentle-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        @keyframes flow-animation {
          0%, 100% { stroke-dashoffset: 0; }
          50% { stroke-dashoffset: 8; }
        }

        .hero-node {
          animation: gentle-pulse 3s ease-in-out infinite;
        }

        .hero-node:nth-child(odd) {
          animation-delay: 0.5s;
        }

        .hero-connector {
          animation: flow-animation 4s linear infinite;
        }

        .hero-connector:nth-child(even) {
          animation-delay: 0.5s;
        }

        .hero-illustration-container {
          animation: gentle-float 4s ease-in-out infinite;
        }
      `}</style>

      <div className={`hero-illustration-container ${sizeMap[size]} ${className}`}>
        <svg
          viewBox="0 0 400 300"
          className="w-full h-full"
          aria-hidden="true"
        >
          {/* Define gradients */}
          <defs>
            <linearGradient id="hero-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#4f46e5", stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: "#a855f7", stopOpacity: 0.8 }} />
            </linearGradient>

            <linearGradient id="hero-gradient-2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#a855f7", stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: "#4f46e5", stopOpacity: 0.8 }} />
            </linearGradient>

            <filter id="hero-glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Background accent shapes */}
          <g opacity="0.1">
            <circle cx="80" cy="60" r="45" fill="url(#hero-gradient-1)" />
            <circle cx="320" cy="240" r="55" fill="url(#hero-gradient-2)" />
            <rect x="250" y="40" width="80" height="80" fill="url(#hero-gradient-1)" opacity="0.7" />
          </g>

          {/* Central control node (represents the governed control plane) */}
          <g className="hero-node" filter="url(#hero-glow)">
            <circle cx="200" cy="150" r="16" fill="url(#hero-gradient-1)" />
            <circle cx="200" cy="150" r="12" fill="none" stroke="#4f46e5" strokeWidth="1.5" opacity="0.4" />
            <circle cx="200" cy="150" r="8" fill="none" stroke="#a855f7" strokeWidth="1" opacity="0.6" />
          </g>

          {/* Layer 1 - Inner nodes (immediate governance) */}
          {[
            { cx: 140, cy: 100 },
            { cx: 260, cy: 100 },
            { cx: 260, cy: 200 },
            { cx: 140, cy: 200 },
          ].map((pos, i) => (
            <g key={`layer1-${i}`}>
              {/* Connection line to center */}
              <line
                x1={pos.cx}
                y1={pos.cy}
                x2={200}
                y2={150}
                stroke="url(#hero-gradient-1)"
                strokeWidth="1.5"
                opacity="0.5"
                className="hero-connector"
                strokeDasharray="4"
              />
              {/* Node */}
              <g className="hero-node">
                <circle cx={pos.cx} cy={pos.cy} r="10" fill="url(#hero-gradient-2)" />
                <circle cx={pos.cx} cy={pos.cy} r="7" fill="none" stroke="#a855f7" strokeWidth="1" opacity="0.5" />
              </g>
            </g>
          ))}

          {/* Layer 2 - Outer nodes (enterprise agents) */}
          {[
            { cx: 80, cy: 60 },
            { cx: 320, cy: 60 },
            { cx: 340, cy: 150 },
            { cx: 320, cy: 240 },
            { cx: 80, cy: 240 },
            { cx: 60, cy: 150 },
          ].map((pos, i) => (
            <g key={`layer2-${i}`}>
              {/* Connection line to inner nodes */}
              <line
                x1={pos.cx}
                y1={pos.cy}
                x2={i < 2 ? (i === 0 ? 140 : 260) : i < 4 ? 260 : 140}
                y2={i < 2 ? 100 : i < 4 ? 200 : 100}
                stroke="url(#hero-gradient-2)"
                strokeWidth="1"
                opacity="0.3"
                className="hero-connector"
                strokeDasharray="3"
              />
              {/* Node */}
              <g className="hero-node" style={{ animationDelay: `${i * 0.2}s` }}>
                <circle cx={pos.cx} cy={pos.cy} r="7" fill="#4f46e5" opacity="0.8" />
                <circle cx={pos.cx} cy={pos.cy} r="5" fill="none" stroke="#a855f7" strokeWidth="0.5" opacity="0.4" />
              </g>
            </g>
          ))}

          {/* Decorative shield/governance badge */}
          <g opacity="0.5" filter="url(#hero-glow)">
            <path
              d="M 200 140 L 220 155 L 220 180 L 200 195 L 180 180 L 180 155 Z"
              fill="none"
              stroke="url(#hero-gradient-1)"
              strokeWidth="1.2"
            />
            {/* Inner checkmark-like accent */}
            <path
              d="M 195 165 L 200 170 L 210 160"
              fill="none"
              stroke="#4f46e5"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.7"
            />
          </g>

          {/* Data flow accents - abstract circuit paths */}
          <g opacity="0.2" className="hero-connector" strokeDasharray="2">
            <path
              d="M 100 80 Q 150 100 200 150"
              fill="none"
              stroke="url(#hero-gradient-1)"
              strokeWidth="1"
            />
            <path
              d="M 300 80 Q 250 100 200 150"
              fill="none"
              stroke="url(#hero-gradient-2)"
              strokeWidth="1"
            />
            <path
              d="M 300 220 Q 250 200 200 150"
              fill="none"
              stroke="url(#hero-gradient-1)"
              strokeWidth="1"
            />
            <path
              d="M 100 220 Q 150 200 200 150"
              fill="none"
              stroke="url(#hero-gradient-2)"
              strokeWidth="1"
            />
          </g>

          {/* Contextual labels as subtle text indicators */}
          <text x="200" y="270" textAnchor="middle" fontSize="10" fill="#6b7280" opacity="0.5">
            Governed Agent Factory
          </text>
        </svg>
      </div>
    </>
  );
}

export default HeroIllustration;
