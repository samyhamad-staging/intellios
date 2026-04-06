"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

/**
 * FaqAccordion — client-side island for FAQ expand/collapse state
 * Manages which FAQ item is currently open
 */
export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="reveal">
          <button
            onClick={() => setOpenFaq(openFaq === i ? null : i)}
            className="w-full flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-slate-800/50 px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="font-semibold text-gray-900 dark:text-white">
              {item.question}
            </span>
            <ChevronRight
              size={20}
              className={`text-gray-600 dark:text-gray-400 flex-shrink-0 transition-transform ${
                openFaq === i ? "rotate-90" : ""
              }`}
            />
          </button>
          {openFaq === i && (
            <div className="px-6 py-4 border-x border-b border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-slate-800/30 rounded-b-lg">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {item.answer}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
