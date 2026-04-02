"use client";

import { useState, useRef, useCallback, type KeyboardEvent, type ChangeEvent } from "react";
import { Paperclip, X, FileText, AlertTriangle } from "lucide-react";

// ── Cost controls ─────────────────────────────────────────────────────────────
// Max file size accepted from disk (hard reject above this)
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB
// Max characters embedded into the message (truncated beyond this)
// ~4 chars/token → 4,000 chars ≈ 1,000 tokens ≈ ~$0.003 at Sonnet pricing
const MAX_EMBED_CHARS = 4_000;

const ACCEPTED_EXTENSIONS = [".txt", ".md", ".markdown", ".csv", ".json", ".xml", ".yaml", ".yml", ".log"];
const ACCEPTED_MIME = ["text/plain", "text/markdown", "text/csv", "application/json", "text/xml", "application/xml", "text/yaml"];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FileAttachment {
  name: string;
  content: string;   // text content, truncated to MAX_EMBED_CHARS
  size: number;      // original file size in bytes
  truncated: boolean;
}

interface ChatInputProps {
  onSend: (message: string, attachment?: FileAttachment) => void;
  disabled?: boolean;
  placeholder?: string;
  filesUsedInSession?: number;
  maxFilesPerSession?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Describe your agent...",
  filesUsedInSession = 0,
  maxFilesPerSession = 3,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filesRemaining = maxFilesPerSession - filesUsedInSession;
  const canAttach = filesRemaining > 0 && !attachment;

  // ── Send ───────────────────────────────────────────────────────────────────
  function handleSend() {
    const trimmed = value.trim();
    if ((!trimmed && !attachment) || disabled) return;
    onSend(trimmed || "(see attached file)", attachment ?? undefined);
    setValue("");
    setAttachment(null);
    setFileError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  }

  // ── File selection ─────────────────────────────────────────────────────────
  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so same file can re-trigger
    if (!file) return;

    setFileError(null);

    // Size check
    if (file.size > MAX_FILE_BYTES) {
      setFileError(
        `File too large — max 2 MB. "${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB.`
      );
      return;
    }

    // Type check (MIME or extension)
    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    if (!ACCEPTED_MIME.includes(file.type) && !ACCEPTED_EXTENSIONS.includes(ext)) {
      setFileError(
        `Unsupported type. Accepted: ${ACCEPTED_EXTENSIONS.join(", ")}`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = (ev.target?.result as string) ?? "";
      const truncated = raw.length > MAX_EMBED_CHARS;
      setAttachment({
        name: file.name,
        content: truncated ? raw.slice(0, MAX_EMBED_CHARS) : raw,
        size: file.size,
        truncated,
      });
    };
    reader.onerror = () => setFileError("Failed to read file. Please try again.");
    reader.readAsText(file);
  }, []);

  const estimatedTokens = attachment ? Math.ceil(attachment.content.length / 4) : 0;
  const acceptStr = ACCEPTED_EXTENSIONS.join(",");

  return (
    <div className="border-t border-border bg-surface">

      {/* ── Attachment preview ─────────────────────────────────────────────── */}
      {attachment && (
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-raised px-3 py-2">
            <FileText size={14} className="shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-text">{attachment.name}</p>
              <p className="text-2xs text-text-tertiary">
                {(attachment.size / 1024).toFixed(0)} KB
                <span className="mx-1 opacity-40">·</span>
                ~{estimatedTokens.toLocaleString()} tokens
                {attachment.truncated && (
                  <span className="ml-1.5 font-medium text-amber-600">
                    · truncated to {MAX_EMBED_CHARS.toLocaleString()} chars
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => setAttachment(null)}
              className="shrink-0 rounded p-0.5 text-text-tertiary hover:bg-surface-muted hover:text-text transition-colors"
              title="Remove attachment"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ── File error ────────────────────────────────────────────────────── */}
      {fileError && (
        <div className="flex items-start gap-2 px-4 pt-2">
          <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="flex-1 text-2xs text-amber-700">{fileError}</p>
          <button onClick={() => setFileError(null)}>
            <X size={11} className="text-text-tertiary" />
          </button>
        </div>
      )}

      {/* ── Input row ─────────────────────────────────────────────────────── */}
      <div className="flex items-end gap-2 p-4">

        {/* Attach button */}
        <div className="relative shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptStr}
            onChange={handleFileChange}
            className="hidden"
            disabled={!canAttach || disabled}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!canAttach || !!disabled}
            title={
              filesRemaining <= 0
                ? `Session upload limit reached (${maxFilesPerSession} files max)`
                : attachment
                ? "Remove current attachment to add another"
                : `Attach a file · ${filesRemaining} of ${maxFilesPerSession} remaining`
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-tertiary hover:bg-surface-raised hover:text-text disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            <Paperclip size={15} />
          </button>
          {/* Remaining count bubble */}
          {filesUsedInSession > 0 && filesRemaining > 0 && (
            <span className="pointer-events-none absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-border bg-surface-raised text-2xs font-mono text-text-tertiary">
              {filesRemaining}
            </span>
          )}
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text outline-none placeholder:text-text-tertiary focus:border-primary/60 focus:ring-1 focus:ring-primary/20 disabled:opacity-50 transition-colors"
        />

        <button
          onClick={handleSend}
          disabled={disabled || (!value.trim() && !attachment)}
          className="btn-primary rounded-xl px-4 py-3 text-sm font-medium disabled:opacity-50"
        >
          Send
        </button>
      </div>

      {/* ── Session usage hint ────────────────────────────────────────────── */}
      {filesUsedInSession > 0 && (
        <p className="px-4 pb-3 text-2xs text-text-tertiary">
          {filesUsedInSession}/{maxFilesPerSession} file uploads used this session
        </p>
      )}
    </div>
  );
}
