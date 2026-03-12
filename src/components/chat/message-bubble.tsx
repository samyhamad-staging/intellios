import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
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
  hr: () => <hr className="my-2 border-gray-200" />,
};

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-gray-900 text-white"
            : "bg-white text-gray-900 border border-gray-200"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
        ) : (
          <ReactMarkdown components={assistantComponents}>{content}</ReactMarkdown>
        )}
      </div>
    </div>
  );
}
