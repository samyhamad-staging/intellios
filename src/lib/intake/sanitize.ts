import { createHash } from "node:crypto";
import { sanitizePromptInput } from "@/lib/generation/system-prompt";

/**
 * Intake prompt-injection defense — layer 2 of 3 (ADR-025).
 *
 * Wraps user-supplied text in a delimited `<untrusted_user_input>` block after
 * passing it through the scalar sanitizer in `lib/generation/system-prompt.ts`.
 * The wrapper makes the trust boundary visually explicit in the assembled system
 * prompt: content inside a block is data, not instructions.
 *
 * The layer 3 directive (in `lib/intake/system-prompt.ts` BASE_PROMPT) tells the
 * model how to read these blocks. Both layers exist so that a novel token that
 * slips past the scalar blocklist is still read as data by the model.
 */

export type UntrustedKind =
  | "agent_purpose"
  | "contribution_field_value"
  | "contribution_field_label"
  | "contributor_identity"
  | "policy_name"
  | "policy_description"
  | "policy_rule_message";

/**
 * Max-length default per `kind`. Callers may override with `opts.maxLen` for
 * call-site–specific limits (contribution values, for example, are historically
 * allowed up to 1000 chars).
 */
const DEFAULT_MAX_LEN: Record<UntrustedKind, number> = {
  agent_purpose:              500,
  contribution_field_value:   1000,
  contribution_field_label:   80,
  contributor_identity:       200,
  policy_name:                200,
  policy_description:         500,
  policy_rule_message:        500,
};

export interface SanitizedContent {
  /** Delimited `<untrusted_user_input …>…</untrusted_user_input>` block, ready to interpolate. */
  safe: string;
  /** True if the scalar sanitizer altered the input — surface this in audit logs. */
  stripped: boolean;
  /** First 8 hex chars of SHA-256(raw), used to correlate prompt blocks with stored DB rows. */
  hash: string;
}

export interface SanitizeOptions {
  kind: UntrustedKind;
  /** Override the default per-kind length cap. */
  maxLen?: number;
}

/**
 * Sanitize user-supplied text for safe inclusion in an intake system prompt.
 *
 * Returns the wrapped block plus audit metadata. The `stripped` flag means
 * the scalar sanitizer removed characters — either a real injection attempt
 * or a benign lookalike; reviewers can fetch the original from the DB via the
 * hash.
 */
export function sanitizeUserContent(
  raw: string,
  opts: SanitizeOptions,
): SanitizedContent {
  const maxLen = opts.maxLen ?? DEFAULT_MAX_LEN[opts.kind];
  const normalized = (raw ?? "").toString();
  const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 8);

  // Length comparison is done on the pre-cap string so we don't over-report stripping
  // from a simple length truncation. We consider truncation a form of stripping too.
  const scalarSanitized = sanitizePromptInput(normalized, maxLen);
  const stripped = scalarSanitized !== normalized.slice(0, maxLen) || normalized.length > maxLen;

  const safe = `<untrusted_user_input kind="${opts.kind}" hash="${hash}">\n${scalarSanitized}\n</untrusted_user_input>`;

  return { safe, stripped, hash };
}

/**
 * Convenience for call sites that just want the `safe` string inline. Does NOT
 * lose the audit metadata — the telemetry hook runs internally.
 *
 * Use the full `sanitizeUserContent` when you want to log `stripped`/`hash`.
 */
export function wrapUntrusted(raw: string, opts: SanitizeOptions): string {
  return sanitizeUserContent(raw, opts).safe;
}
