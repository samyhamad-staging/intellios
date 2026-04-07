"use client";

import { useState } from "react";
import { Button } from "@/components/catalyst/button";
import { Plus } from "lucide-react";
import { QuickStartModal } from "./quick-start-modal";

export function NewIntakeButton({ className }: { className?: string }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setModalOpen(true)}
        color="indigo"
        className={className}
      >
        <Plus size={15} />
        New Agent
      </Button>

      {modalOpen && (
        <QuickStartModal onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
