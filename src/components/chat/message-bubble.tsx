import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { Divider } from "@/components/ui/divider";

// Domain key → user-friendly label for the domain tag
const DOMAIN_LABELS: Record<string, { label: string; icon: string }> = {
  identity:     { label: "Purpose",      icon: "\u25CE" },
  tools:        { label: "Capabilities", icon: "\u2699" },
  instructions: { label: "Behavior",     icon: "\uD83D\uDCCB" },
  knowledge:    { label: "Knowledge",    icon: "\uD83D\uDCDA" },
  constraints:  { label: "Guardrails",   icon: "\uD83D\uDEA7" },
  governance:   { label: "Governance",   icon: "\uD83D\uDEE1" },
  audit:        { label: "Audit",        icon: "\uD83D\uDCDD" },
};

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
    <code className="text-xs bg-gray-100 rounded px-1 py-0.5 font-mono">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="text-xs bg-gray-100 rounded p-3 overflow-x-auto mb-2 font-mono">
      {children}
    </pre>
  ),
  hr: () => <Divider soft className="my-2" />,
};

export function MessageBubble({ role, content, activeDomain }: MessageBubbleProps) {
  const isUser = role === "user";
  const domainInfo = activeDomain ? DOMAIN_LABELS[activeDomain] : null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-indigo-600 text-white"
            : "bg-white text-gray-900 border border-gray-200"
        }`}
      >
        {/* Domain tag for AI messages */}
        {!isUser && domainInfo && (
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-2xs leading-none">{domainInfo.icon}</span>
            <span className="text-2xs font-medium text-gray-400">{domainInfo.label}</span>
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
