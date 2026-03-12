interface ToolCallDisplayProps {
  toolName: string;
  args: Record<string, unknown>;
}

const TOOL_LABELS: Record<string, string> = {
  set_agent_identity: "Captured agent identity",
  set_branding: "Captured branding",
  add_tool: "Added capability",
  set_instructions: "Captured instructions",
  add_knowledge_source: "Added knowledge source",
  set_constraints: "Captured constraints",
  add_governance_policy: "Added governance policy",
  set_audit_config: "Captured audit config",
  get_intake_summary: "Checking progress",
  mark_intake_complete: "Intake complete",
};

export function ToolCallDisplay({ toolName, args }: ToolCallDisplayProps) {
  const label = TOOL_LABELS[toolName] ?? toolName;
  const summary = Object.entries(args)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(", ");

  return (
    <div className="flex justify-start">
      <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700 max-w-[80%]">
        <span className="font-medium">{label}</span>
        {summary && <span className="text-blue-500 ml-1">— {summary}</span>}
      </div>
    </div>
  );
}
