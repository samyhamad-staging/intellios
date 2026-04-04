/**
 * ABP structural diff engine — pure, stateless, zero side effects.
 *
 * Compares two Agent Blueprint Package documents field-by-field and produces
 * a structured diff with per-section change lists and a semantic significance
 * classification (major / minor / patch).
 *
 * Significance model (semantic, not semver arithmetic):
 *   major — governance.policies added or removed (compliance posture changed)
 *   minor — capabilities.instructions changed, constraints changed, governance.audit changed
 *   patch — identity fields changed, tags changed, tool configs changed
 *
 * Only dependency is the ABP type — no application imports.
 */

import type { ABP } from "@/lib/types/abp";

export type ChangeType = "added" | "removed" | "modified";
export type DiffSignificance = "major" | "minor" | "patch";

export interface FieldChange {
  /** Dot-notation path, e.g. "capabilities.instructions" */
  path: string;
  /** Human-readable label, e.g. "System Prompt / Instructions" */
  label: string;
  from: unknown;
  to: unknown;
  changeType: ChangeType;
}

export interface SectionDiff {
  /** Section key, e.g. "governance" */
  section: string;
  /** Human-readable section name, e.g. "Governance" */
  label: string;
  changes: FieldChange[];
}

export interface ABPDiff {
  versionFrom: string;
  versionTo: string;
  blueprintFromId: string;
  blueprintToId: string;
  sections: SectionDiff[];
  totalChanges: number;
  significance: DiffSignificance;
  diffedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

function isDifferent(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

function changeType(from: unknown, to: unknown): ChangeType {
  if (isEmpty(from) && !isEmpty(to)) return "added";
  if (!isEmpty(from) && isEmpty(to)) return "removed";
  return "modified";
}

function compareScalar(
  path: string,
  label: string,
  from: unknown,
  to: unknown,
  changes: FieldChange[]
): void {
  if (!isDifferent(from, to)) return;
  if (isEmpty(from) && isEmpty(to)) return;
  changes.push({ path, label, from, to, changeType: changeType(from, to) });
}

/** Array diff by string item — for allowed_domains, denied_actions, tags, etc. */
function compareStringArrays(
  path: string,
  labelPrefix: string,
  fromArr: string[] | undefined | null,
  toArr: string[] | undefined | null,
  changes: FieldChange[]
): void {
  const from = fromArr ?? [];
  const to = toArr ?? [];
  const added = to.filter((x) => !from.includes(x));
  const removed = from.filter((x) => !to.includes(x));
  for (const item of added) {
    changes.push({ path, label: `${labelPrefix}: added "${item}"`, from: null, to: item, changeType: "added" });
  }
  for (const item of removed) {
    changes.push({ path, label: `${labelPrefix}: removed "${item}"`, from: item, to: null, changeType: "removed" });
  }
}

/** Compare arrays keyed by a named property (tools by name, policies by name, etc.) */
function compareNamedArray<T extends { name: string }>(
  path: string,
  labelPrefix: string,
  fromArr: T[] | undefined | null,
  toArr: T[] | undefined | null,
  changes: FieldChange[]
): void {
  const from = fromArr ?? [];
  const to = toArr ?? [];
  const fromMap = new Map(from.map((x) => [x.name, x]));
  const toMap = new Map(to.map((x) => [x.name, x]));

  for (const [name, item] of toMap) {
    if (!fromMap.has(name)) {
      changes.push({ path, label: `${labelPrefix}: added "${name}"`, from: null, to: item, changeType: "added" });
    } else {
      const fromItem = fromMap.get(name)!;
      if (isDifferent(fromItem, item)) {
        changes.push({ path, label: `${labelPrefix}: modified "${name}"`, from: fromItem, to: item, changeType: "modified" });
      }
    }
  }
  for (const [name, item] of fromMap) {
    if (!toMap.has(name)) {
      changes.push({ path, label: `${labelPrefix}: removed "${name}"`, from: item, to: null, changeType: "removed" });
    }
  }
}

// ── Section diffing ───────────────────────────────────────────────────────────

function diffIdentity(from: ABP, to: ABP): SectionDiff {
  const changes: FieldChange[] = [];
  compareScalar("identity.name", "Agent Name", from.identity?.name, to.identity?.name, changes);
  compareScalar("identity.description", "Description", from.identity?.description, to.identity?.description, changes);
  compareScalar("identity.persona", "Persona", from.identity?.persona, to.identity?.persona, changes);
  compareStringArrays(
    "metadata.tags",
    "Tag",
    from.metadata?.tags as string[] | undefined,
    to.metadata?.tags as string[] | undefined,
    changes
  );
  return { section: "identity", label: "Agent Identity", changes };
}

function diffCapabilities(from: ABP, to: ABP): SectionDiff {
  const changes: FieldChange[] = [];

  // Instructions (system prompt) — truncate for display, full value stored
  const fromInstr = from.capabilities?.instructions ?? "";
  const toInstr = to.capabilities?.instructions ?? "";
  if (isDifferent(fromInstr, toInstr) && !(isEmpty(fromInstr) && isEmpty(toInstr))) {
    changes.push({
      path: "capabilities.instructions",
      label: "System Prompt / Instructions",
      from: fromInstr ? fromInstr.substring(0, 200) + (fromInstr.length > 200 ? "…" : "") : null,
      to: toInstr ? toInstr.substring(0, 200) + (toInstr.length > 200 ? "…" : "") : null,
      changeType: changeType(fromInstr, toInstr),
    });
  }

  // Tools (named array)
  compareNamedArray(
    "capabilities.tools",
    "Tool",
    from.capabilities?.tools,
    to.capabilities?.tools,
    changes
  );

  // Knowledge sources (named array)
  compareNamedArray(
    "capabilities.knowledge_sources",
    "Knowledge Source",
    from.capabilities?.knowledge_sources as Array<{ name: string }> | undefined,
    to.capabilities?.knowledge_sources as Array<{ name: string }> | undefined,
    changes
  );

  return { section: "capabilities", label: "Capabilities", changes };
}

function diffConstraints(from: ABP, to: ABP): SectionDiff {
  const changes: FieldChange[] = [];
  compareStringArrays(
    "constraints.allowed_domains",
    "Allowed Domain",
    from.constraints?.allowed_domains,
    to.constraints?.allowed_domains,
    changes
  );
  compareStringArrays(
    "constraints.denied_actions",
    "Denied Action",
    from.constraints?.denied_actions,
    to.constraints?.denied_actions,
    changes
  );
  compareScalar(
    "constraints.max_tokens_per_response",
    "Max Tokens Per Response",
    from.constraints?.max_tokens_per_response,
    to.constraints?.max_tokens_per_response,
    changes
  );
  compareScalar(
    "constraints.rate_limits.requests_per_minute",
    "Rate Limit (requests/min)",
    from.constraints?.rate_limits?.requests_per_minute,
    to.constraints?.rate_limits?.requests_per_minute,
    changes
  );
  compareScalar(
    "constraints.rate_limits.requests_per_day",
    "Rate Limit (requests/day)",
    from.constraints?.rate_limits?.requests_per_day,
    to.constraints?.rate_limits?.requests_per_day,
    changes
  );
  return { section: "constraints", label: "Constraints", changes };
}

function diffGovernance(from: ABP, to: ABP): SectionDiff {
  const changes: FieldChange[] = [];

  // Policies (named array — this drives "major" significance)
  compareNamedArray(
    "governance.policies",
    "Governance Policy",
    from.governance?.policies,
    to.governance?.policies,
    changes
  );

  // Audit settings
  compareScalar(
    "governance.audit.log_interactions",
    "Audit: Log Interactions",
    from.governance?.audit?.log_interactions,
    to.governance?.audit?.log_interactions,
    changes
  );
  compareScalar(
    "governance.audit.retention_days",
    "Audit: Retention Days",
    from.governance?.audit?.retention_days,
    to.governance?.audit?.retention_days,
    changes
  );
  compareScalar(
    "governance.audit.pii_redaction",
    "Audit: PII Redaction",
    from.governance?.audit?.pii_redaction,
    to.governance?.audit?.pii_redaction,
    changes
  );

  return { section: "governance", label: "Governance", changes };
}

// ── Significance ─────────────────────────────────────────────────────────────

function computeSignificance(sections: SectionDiff[]): DiffSignificance {
  const govSection = sections.find((s) => s.section === "governance");
  if (govSection) {
    // Any governance policy addition/removal/modification → major
    const policyChanges = govSection.changes.filter((c) =>
      c.path === "governance.policies"
    );
    if (policyChanges.length > 0) return "major";
  }

  const capSection = sections.find((s) => s.section === "capabilities");
  const constraintsSection = sections.find((s) => s.section === "constraints");

  const capHasChanges =
    (capSection?.changes ?? []).some((c) => c.path === "capabilities.instructions" || c.path.startsWith("capabilities.tools")) ||
    (capSection?.changes.length ?? 0) > 0;
  const constraintsHasChanges = (constraintsSection?.changes.length ?? 0) > 0;

  // Audit setting changes (non-policy governance) → minor
  const govAuditChanges = (govSection?.changes ?? []).filter((c) => c.path.startsWith("governance.audit"));
  if (capHasChanges || constraintsHasChanges || govAuditChanges.length > 0) return "minor";

  return "patch";
}

// ── Main export ───────────────────────────────────────────────────────────────

export function diffABP(
  from: ABP & { id?: string; version?: string },
  to: ABP & { id?: string; version?: string }
): ABPDiff {
  const sections: SectionDiff[] = [
    diffGovernance(from, to),   // governance first — drives significance
    diffCapabilities(from, to),
    diffConstraints(from, to),
    diffIdentity(from, to),
  ];

  const totalChanges = sections.reduce((sum, s) => sum + s.changes.length, 0);
  const significance = computeSignificance(sections);

  return {
    versionFrom: from.version ?? (from as Record<string, unknown>).version as string ?? "unknown",
    versionTo: to.version ?? (to as Record<string, unknown>).version as string ?? "unknown",
    blueprintFromId: from.id ?? (from.metadata as { id?: string })?.id ?? "",
    blueprintToId: to.id ?? (to.metadata as { id?: string })?.id ?? "",
    sections,
    totalChanges,
    significance,
    diffedAt: new Date().toISOString(),
  };
}
