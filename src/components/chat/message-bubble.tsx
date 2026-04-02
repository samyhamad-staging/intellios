import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { Divider } from "@/components/ui/divider";
import {
  Target, Cpu, GitBranch, Database, ShieldAlert, Lock, ScrollText,
} from "lucide-react";

// ── Domain icon + label map ───────────────────────────────────────────────────

const DOMAIN_ICONS: Record<string, React.ElementType> = {
  identity:     Target,
  tools:        Cpu,
  instructions: GitBranch,
  knowledge:    Database,
  constraints:  ShieldAlert,
  governance:   Lock,
  audit:        ScrollText,
};

const DOMAIN_LABELS: Record<string, string> = {
  identity:     "PURPOSE",
  tools:        "CAPABILITIES",
  instructions: "BEHAVIOR",
  knowledge:    "KNOWLEDGE",
  constraints:  "GUARDRAILS",
  governance:   "GOVERNANCE",
  audit:        "AUDIT",
};

// ── Markdown components ───────────────────────────────────────────────────────

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  /** Key of the domain this AI response targets (e.g., "governance") */
  activeDomain?: string | null;
}

const assistantComponents: Components = {
  p: ({ children }) => (
    <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="text-sm pl-4 space-y-0.5 mb-2 list-disc">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="text-sm pl-4 space-y-0.5 mb-2 list-decimal">{children}</ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  h1: ({ children }) => (
    <h3 className="text-sm font-semibold mt-3 mb-1">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="text-sm font-semibold mt-3 mb-1">{children}</h3>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>
  ),
  code: ({ children }) => (
    <code className="text-xs bg-surface-muted rounded px-1 py-0.5 font-mono">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="text-xs bg-surface-muted rounded p-3 overflow-x-auto mb-2 font-mono">
      {children}
    </pre>
  ),
  hr: () => <Divider soft className="my-2" />,
  // Strip link styling — AI-generated links in intake chat have no valid destination.
  // Without this override, ReactMarkdown renders <a> tags with full browser default
  // styles (blue, underlined, cursor:pointer), creating false click affordances.
  a: ({ children }) => <>{children}</>,
};

// ── Component ─────────────────────────────────────────────────────────────────

export function MessageBubble({ role, content, activeDomain }: MessageBubbleProps) {
  const isUser = role === "user";
  const DomainIcon = activeDomain ? DOMAIN_ICONS[activeDomain] : null;
  const domainLabel = activeDomain ? DOMAIN_LABELS[activeDomain] : null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-xl px-4 py-3 ${
          isUser
            ? "bg-primary text-white"
            : "bg-surface text-text border border-border"
        }`}
      >
        {/* Domain annotation for AI messages */}
        {!isUser && DomainIcon && domainLabel && (
          <div className="flex items-center gap-1.5 mb-2 opacity-70">
            <DomainIcon size={11} className="text-indigo-400 shrink-0" />
            <span className="text-2xs font-mono tracking-widest text-indigo-400">
              {domainLabel}
            </span>
          </div>
        )}
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
        ) : (
          <ReactMarkdown components={assistantComponents}>{content}</ReactMarkdown>
        )}
      </div>
    </div>
  );
}
