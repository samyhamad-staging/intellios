"use client";

/**
 * Animated Product Showcase
 * Replaces the static fake UI mockup with an animated governance validation sequence.
 * Shows the product "working" without needing video or real screenshots.
 */

import { useState, useEffect, useRef } from "react";
import { ShieldCheck, Check, AlertTriangle, FileCheck, Lock } from "lucide-react";

const CHECKS = [
  { label: "Safety Baseline", framework: "NIST AI RMF", delay: 0 },
  { label: "SR 11-7 Compliance", framework: "Fed Reserve", delay: 600 },
  { label: "Data Privacy", framework: "GDPR Art. 22", delay: 1200 },
  { label: "Access Control", framework: "SOX / RBAC", delay: 1800 },
];

const SIDEBAR_ITEMS = [
  { label: "Governance", active: true, icon: ShieldCheck },
  { label: "Blueprints", active: false, icon: FileCheck },
  { label: "Policies", active: false, icon: Lock },
  { label: "Audit Trail", active: false, icon: FileCheck },
];

export function AnimatedProductShowcase() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeChecks, setActiveChecks] = useState<number[]>([]);
  const [scoreWidth, setScoreWidth] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [cycleKey, setCycleKey] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Trigger animation when visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Run the validation sequence
  useEffect(() => {
    if (!isVisible) return;

    // Reset state for new cycle
    setActiveChecks([]);
    setScoreWidth(0);
    setShowScore(false);

    const timers: ReturnType<typeof setTimeout>[] = [];

    CHECKS.forEach((check, i) => {
      timers.push(
        setTimeout(() => {
          setActiveChecks((prev) => [...prev, i]);
        }, check.delay + 400)
      );
    });

    // Show score after all checks
    timers.push(
      setTimeout(() => {
        setShowScore(true);
        // Animate score bar
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setScoreWidth(98);
          });
        });
      }, 2800)
    );

    // Restart cycle
    timers.push(
      setTimeout(() => {
        setCycleKey((k) => k + 1);
        setIsVisible(true);
      }, 7000)
    );

    return () => timers.forEach(clearTimeout);
  }, [isVisible, cycleKey]);

  return (
    <div ref={ref} className="mx-auto max-w-4xl">
      <div className="gradient-border rounded-xl">
        <div className="rounded-xl bg-slate-900 shadow-2xl glow-indigo overflow-hidden">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 border-b border-white/5">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
            </div>
            <div className="flex-1 mx-8">
              <div className="flex items-center justify-center gap-2 rounded-md bg-slate-700/50 border border-white/5 px-3 py-1">
                <Lock size={9} className="text-emerald-400/70" />
                <span className="text-xs text-gray-500 font-mono">
                  app.intellios.io/blueprints/review
                </span>
              </div>
            </div>
          </div>

          {/* App UI */}
          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-12 gap-4">
              {/* Sidebar */}
              <div className="col-span-3 hidden sm:block space-y-1.5">
                {SIDEBAR_ITEMS.map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all duration-300 ${
                      item.active
                        ? "bg-indigo-500/15 text-indigo-400 font-semibold border border-indigo-500/20"
                        : "text-gray-500 hover:text-gray-400 border border-transparent"
                    }`}
                  >
                    <item.icon size={12} />
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="col-span-12 sm:col-span-9 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-200 font-display">
                    Blueprint Review: Claims-Triage-Agent v2.1
                  </div>
                  <div className="flex gap-1.5">
                    {activeChecks.length === CHECKS.length ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400"
                        style={{ animation: "fade-slide-up 0.3s ease-out" }}
                      >
                        <Check size={8} /> Ready for Approval
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                        <AlertTriangle size={8} /> Validating...
                      </span>
                    )}
                  </div>
                </div>

                {/* Validation checks grid */}
                <div className="grid grid-cols-2 gap-2">
                  {CHECKS.map((check, i) => {
                    const isActive = activeChecks.includes(i);
                    return (
                      <div
                        key={check.label}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-500 ${
                          isActive
                            ? "bg-emerald-500/5 border-emerald-500/20"
                            : "bg-slate-800/50 border-white/5"
                        }`}
                      >
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                            isActive
                              ? "bg-emerald-500/15 scale-100"
                              : "bg-slate-700 scale-90"
                          }`}
                        >
                          {isActive ? (
                            <Check
                              size={10}
                              className="text-emerald-400"
                              style={{ animation: "check-in 0.4s ease-out" }}
                            />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span
                            className={`text-xs transition-colors duration-300 ${
                              isActive ? "text-gray-200" : "text-gray-500"
                            }`}
                          >
                            {check.label}
                          </span>
                          {isActive && (
                            <p
                              className="text-[9px] text-gray-500 font-mono"
                              style={{ animation: "fade-slide-up 0.3s ease-out" }}
                            >
                              {check.framework}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Governance score */}
                <div
                  className={`rounded-lg border p-3 transition-all duration-500 ${
                    showScore
                      ? "bg-slate-800/50 border-emerald-500/20"
                      : "bg-slate-800/30 border-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-400">
                      Governance Score
                    </span>
                    <span
                      className={`text-xs font-bold transition-colors duration-300 ${
                        showScore ? "text-emerald-400" : "text-gray-600"
                      }`}
                    >
                      {showScore ? "98/100" : "--/100"}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 transition-all duration-1000 ease-out"
                      style={{ width: `${scoreWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
