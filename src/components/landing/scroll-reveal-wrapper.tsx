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

    const attachObserver = () => {
      el.querySelectorAll(".reveal:not(.revealed)").forEach((t) => observer.observe(t));
    };

    // Reveal any .reveal elements already in the viewport — covers the case
    // where the tab was opened in the background and the observer never fired.
    const revealInViewport = () => {
      el.querySelectorAll(".reveal:not(.revealed)").forEach((t) => {
        const rect = t.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          t.classList.add("revealed");
          observer.unobserve(t);
        }
      });
    };

    attachObserver();

    // (a) On load, catch anything in viewport that the observer missed
    //     (background-tab case: observer fires only once tab is active).
    window.addEventListener("load", revealInViewport);

    // (b) When a backgrounded tab becomes visible, re-run in-viewport check
    //     and re-attach observer for any newly-scrolled-into-view elements.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        revealInViewport();
        attachObserver();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // (c) On hash-navigation (e.g. clicking a nav anchor), IntersectionObserver
    //     may not fire because the browser scrolls without triggering intersection
    //     callbacks in some browsers. Wait one rAF for the scroll to settle, then
    //     reveal anything now in viewport and re-attach for newly-visible elements.
    const onHashChange = () => {
      requestAnimationFrame(() => {
        revealInViewport();
        attachObserver();
      });
    };
    window.addEventListener("hashchange", onHashChange);

    return () => {
      observer.disconnect();
      window.removeEventListener("load", revealInViewport);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  return (
    <div ref={ref} className="min-h-screen bg-white dark:bg-slate-950">
      {children}
    </div>
  );
}
