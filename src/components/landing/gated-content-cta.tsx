"use client";

/**
 * GatedContentCTA — Email gate for downloadable content
 *
 * Provides a secondary conversion path for prospects who aren't ready to
 * request a demo but want to engage with thought leadership content.
 * Captures email + company for nurture, then reveals the download.
 *
 * Currently a stub — delivers a "coming soon" acknowledgment.
 * When real content is ready, update the success state to deliver the asset.
 */

import { useState } from "react";
import { ArrowRight, FileText, CheckCircle, BookOpen, Shield, Scale } from "lucide-react";

interface GatedContentCTAProps {
  className?: string;
}

export function GatedContentCTA({ className = "" }: GatedContentCTAProps) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          company: company.trim() || null,
          role: null,
          message: null,
          tier: "content-download",
          content: "ai-governance-framework",
        }),
      });
      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={`py-16 sm:py-20 px-6 lg:px-8 ${className}`}>
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800/30 dark:backdrop-blur-sm overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">

            {/* Left — Content preview */}
            <div className="p-8 lg:p-10 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-500/5 dark:to-violet-500/5 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
                  <BookOpen size={16} className="text-white" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  Free Guide
                </span>
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 font-display leading-snug">
                The Enterprise AI Agent Governance Framework
              </h3>

              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                A practical framework for building governance into your AI agent lifecycle &mdash; from policy definition through production monitoring. Built from regulatory requirements across SR 11-7, EU AI Act, and NIST AI RMF.
              </p>

              {/* What's inside */}
              <div className="space-y-3">
                {[
                  { icon: Shield, text: "Policy-as-code patterns for regulated industries" },
                  { icon: FileText, text: "Audit trail architecture for SR 11-7 compliance" },
                  { icon: Scale, text: "EU AI Act readiness checklist for agent deployments" },
                ].map((item) => (
                  <div key={item.text} className="flex items-start gap-2.5">
                    <item.icon size={14} className="text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Email capture or success */}
            <div className="p-8 lg:p-10 flex flex-col justify-center">
              {submitted ? (
                <div className="text-center py-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15 mx-auto mb-4">
                    <CheckCircle size={24} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    We&apos;ll send it over
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    The framework guide will be delivered to{" "}
                    <span className="font-medium text-gray-700 dark:text-gray-200">{email}</span>{" "}
                    as soon as it&apos;s published.
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Currently in final review. Expected within two weeks.
                  </p>
                </div>
              ) : (
                <>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Get the guide
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
                    Enter your work email and we&apos;ll send it when it&apos;s ready. No spam, ever.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/30 transition-colors"
                    />
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Company (optional)"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/30 transition-colors"
                    />

                    {error && (
                      <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting || !email.trim()}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      {submitting ? "Sending..." : (
                        <>
                          Send me the guide
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>

                    <p className="text-center text-[10px] text-gray-400 dark:text-gray-500">
                      No account required. Unsubscribe anytime.
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
