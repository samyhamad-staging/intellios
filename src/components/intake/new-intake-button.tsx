"use client";

import { useState } from "react";
import { QuickStartModal } from "./quick-start-modal";

export function NewIntakeButton({ className }: { className?: string }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={className ?? "rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"}
      >
        New Agent
      </button>

      {modalOpen && (
        <QuickStartModal onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
