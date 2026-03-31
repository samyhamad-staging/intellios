"use client";

import { useState } from "react";

interface ToolCallDisplayProps {
  toolName: string;
  args: Record<string, unknown>;
}

const TOOL_ICONS: Record<string, string> = {
  set_agent_identity: "✦",
  set_branding: "🎨",
  add_tool: "⚙",
  set_instructions: "📝",
  add_knowledge_source: "🗄",
  set_constraints: "🔒",
  add_governance_policy: "🛡",
  set_audit_config: "📋",
  get_intake_summary: "◎",
  mark_intake_complete: "✓",
};

const TOOL_LABELS: Record<string, string> = {
  set_agent_identity: "Agent identity",
  set_branding: "Branding",
  add_tool: "Tool added",
  set_instructions: "Instructions",
  add_knowledge_source: "Knowledge source",
  set_constraints: "Constraints",
  add_governance_policy: "Governance policy",
  set_audit_config: "Audit config",
  get_intake_summary: "Checking progress",
  mark_intake_complete: "Intake complete",
};

function buildSummary(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case "set_agent_identity": {
      const name = args.name as string | undefined;
      const desc = args.description as string | undefined;
      if (name && desc) return `"${name}" — ${desc.length > 60 ? desc.slice(0, 60) + "…" : desc}`;
      if (name) return `"${name}"`;
      return "";
    }
    case "set_branding": {
      const parts: string[] = [];
      if (args.display_name) parts.push(args.display_name as string);
      if (args.color_primary) parts.push(args.color_primary as string);
      return parts.join(" · ");
    }
    case "add_tool": {
      const name = args.name as string | undefined;
      const type = args.type as string | undefined;
      if (name && type) return `${name} (${type})`;
      return name ?? "";
    }
    case "set_instructions": {
      const instructions = args.instructions as string | undefined;
      if (!instructions) return "Behavioral instructions set";
      return instructions.length > 80 ? instructions.slice(0, 80) + "…" : instructions;
    }
    case "add_knowledge_source": {
      const name = args.name as string | undefined;
      const type = args.type as string | undefined;
      if (name && type) return `${name} (${type})`;
      return name ?? "";
    }
    case "set_constraints": {
      const parts: string[] = [];
      const domains = args.allowed_domains as string[] | undefined;
      const denied = args.denied_actions as string[] | undefined;
      const maxTokens = args.max_tokens_per_response as number | undefined;
      if (domains?.length) parts.push(`${domains.length} allowed domain${domains.length > 1 ? "s" : ""}`);
      if (denied?.length) parts.push(`${denied.length} denied action${denied.length > 1 ? "s" : ""}`);
      if (maxTokens) parts.push(`${maxTokens} token limit`);
      return parts.join(" · ");
    }
    case "add_governance_policy": {
      const name = args.name as string | undefined;
      const type = args.type as string | undefined;
      if (name && type) return `${name} (${(type as string).replace(/_/g, " ")})`;
      return name ?? "";
    }
    case "set_audit_config": {
      const parts: string[] = [];
      if (args.log_interactions !== undefined)
        parts.push(`Logging ${args.log_interactions ? "on" : "off"}`);
      if (args.retention_days !== undefined)
        parts.push(`${args.retention_days}-day retention`);
      if (args.pii_redaction !== undefined)
        parts.push(`PII redaction ${args.pii_redaction ? "on" : "off"}`);
      return parts.join(" · ");
    }
    default:
      return "";
  }
}

export function ToolCallDisplay({ toolName, args }: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const icon = TOOL_ICONS[toolName] ?? "·";
  const label = TOOL_LABELS[toolName] ?? toolName;
  const summary = buildSummary(toolName, args ?? {});

  return (
    <div className="flex justify-start">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700 max-w-[80%] text-left hover:bg-blue-100 transition-colors"
        title={expanded ? "Click to collapse" : "Click to expand captured values"}
        aria-label={expanded ? "Collapse captured values" : "Expand captured values"}
      >
        <span className="shrink-0 mt-px">{icon}</span>
        <span className="flex-1 min-w-0">
          <span className="font-medium">{label}</span>
          {summary && (
            <span className="text-blue-500 ml-1">— {summary}</span>
          )}
          {expanded && (
            <pre className="mt-2 text-[10px] text-blue-600 whitespace-pre-wrap break-all font-mono bg-white rounded p-1.5 border border-blue-100">
              {JSON.stringify(args, null, 2)}
            </pre>
          )}
        </span>
        <span className="shrink-0 mt-px text-blue-300 ml-2">{expanded ? "▲" : "▼"}</span>
      </button>
    </div>
  );
}
