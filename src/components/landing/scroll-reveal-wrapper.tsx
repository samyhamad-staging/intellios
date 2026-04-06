"use client";

import { useEffect, useRef, ReactNode } from "react";

interface ScrollRevealWrapperProps {
  children: ReactNode;
}

/**
 * ScrollRevealWrapper — client-side island for scroll-triggered animations
 * Wraps children and observes elements with .reveal class for intersection
 */
export function ScrollRevealWrapper({ children }: ScrollRevealWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect prefers-reduced-motion — skip animations for users who request it
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      el.querySelectorAll(".reveal").forEach((t) => t.classList.add("revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    const targets = el.querySelectorAll(".reveal");
    targets.forEach((t) => observer.observe(t));

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="min-h-screen bg-white dark:bg-slate-950">
      {children}
    </div>
  );
}
