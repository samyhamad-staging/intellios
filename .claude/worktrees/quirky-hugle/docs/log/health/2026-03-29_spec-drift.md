# Spec Drift Report — 2026-03-29

## Summary
Specs checked: 5 | Drift items: 12

Audit covered all five spec files in `docs/specs/` against the current source tree. P1 items are schema/status mismatches where the spec actively misleads a developer reading it. P2 items are missing coverage for features that exist in code but not in the spec.

---

## Actionable Task Queue

### SPEC-20260329-001: Fix StakeholderContribution interface field names in intake-engine.md
Priority: P1
Effort: XS
File: `docs/specs/intake-engine.md:113–122`
Problem: The `StakeholderContribution` interface in the spec declares `contributorName: string` and `submittedAt: Date`. The actual TypeScript type at `src/lib/types/intake.ts:52–61` uses `contributorEmail: string` and `createdAt: string`. The MRM Section 11 example block (lines 153–163) also uses `contributorName` and `submittedAt`. Any developer reading the spec and coding against it will use wrong field names.
Fix:
```markdown
<!-- Replace lines 113–123 (StakeholderContribution interface block): -->
<!-- OLD: -->
interface StakeholderContribution {
  id: string;
  sessionId: string;
  domain: ContributionDomain;
  contributorName: string;
  contributorRole: string;
  fields: Record<string, string>;   // domain-keyed field values
  submittedAt: Date;
}

<!-- NEW: -->
interface StakeholderContribution {
  id: string;
  sessionId: string;
  domain: ContributionDomain;
  contributorEmail: string;       // email of the contributing stakeholder
  contributorRole: string;
  fields: Record<string, string>; // domain-keyed field values
  createdAt: string;              // ISO 8601 timestamp
}
```
Also replace the MRM Section 11 example block (lines 153–163):
```markdown
<!-- OLD: -->
{
  domain: string;
  contributorName: string;
  contributorRole: string;
  fields: Record<string, string>;
  submittedAt: string;
}

<!-- NEW: -->
{
  domain: string;
  contributorEmail: string;
  contributorRole: string;
  fields: Record<string, string>;
  createdAt: string; // ISO 8601
}
```
Verify: `grep -n "contributorName\|submittedAt" docs/specs/intake-engine.md` returns no results.

---

### SPEC-20260329-002: Remove stale `stopWhen: stepCountIs(10)` reference in intake-engine.md
Priority: P2
Effort: XS
File: `docs/specs/intake-engine.md:264`
Problem: Line 264 says `Tools use Vercel AI SDK v5 (\`tool()\` + \`zodSchema()\` from the \`ai\` package). \`stopWhen: stepCountIs(10)\`.` This contradicts Phase 17 at line 210, which correctly documents the value was raised to 20. The actual chat route at `src/app/api/intake/sessions/[id]/chat/route.ts:199` uses `stepCountIs(20)`.
Fix:
```markdown
<!-- Replace line 264: -->
<!-- OLD: -->
Tools use Vercel AI SDK v5 (`tool()` + `zodSchema()` from the `ai` package). `stopWhen: stepCountIs(10)`.

<!-- NEW: -->
Tools use Vercel AI SDK v5 (`tool()` + `zodSchema()` from the `ai` package). `stopWhen: stepCountIs(20)` — raised from 10 in Phase 17 to accommodate complex sessions with many back-and-forth reasoning cycles.
```
Verify: `grep -n "stepCountIs(10)" docs/specs/intake-engine.md` returns no results.

---

### SPEC-20260329-003: Update `buildIntakeSystemPrompt` signature in intake-engine.md
Priority: P2
Effort: XS
File: `docs/specs/intake-engine.md:268`
Problem: Line 268 documents the function as `buildIntakeSystemPrompt(payload, context?, contributions?)`. The actual signature at `src/lib/intake/system-prompt.ts:307–315` has 7 parameters — Phase 49 added `policies?`, `classification?`, `expertiseLevel?`, and `topicProbingRules?`.
Fix:
```markdown
<!-- Replace line 268: -->
<!-- OLD: -->
`buildIntakeSystemPrompt(payload, context?, contributions?)` builds the system prompt dynamically on each request:

<!-- NEW: -->
`buildIntakeSystemPrompt(payload, context?, contributions?, policies?, classification?, expertiseLevel?, topicProbingRules?)` builds the system prompt dynamically on each request:
```
Also update the numbered block (lines 269–274) to add items 4+ for the new parameters injected in Phase 49:
```markdown
4. **Enterprise Governance Policies block** (injected when `policies` are provided) — pre-loads active policies so Claude designs blueprints that satisfy them proactively (Phase 15).
5. **Topic-specific probing rules** (injected when `topicProbingRules` is non-empty) — context- and agent-type-derived soft advisory probes for customer-facing, external-API, PII, and autonomous-agent scenarios (Phase 49).
6. **Expertise-level framing** (when `expertiseLevel` is non-null) — adjusts Claude's communication register: Guided mode gets structured sub-questions and plain-language framing; Expert mode gets concise validation-focused exchanges (Phase 49).
```
Verify: spec mentions all 7 parameters of `buildIntakeSystemPrompt`.

---

### SPEC-20260329-004: Add Guided-mode routing rule to `selectIntakeModel` table in intake-engine.md
Priority: P2
Effort: XS
File: `docs/specs/intake-engine.md:196–202` (Routing Logic table)
Problem: The routing table lists 4 conditions but is missing the Guided-mode rule added in Phase 49. The actual code at `src/lib/intake/model-selector.ts:149` routes to Sonnet when `expertiseLevel === "guided" && messageCount <= 6`. A developer reading the spec would not know this rule exists.
Fix:
```markdown
<!-- Replace routing table (lines 196–202): -->
<!-- OLD: -->
| Condition | Model | Rationale |
|---|---|---|
| `messageCount <= 1` | Sonnet | Opening turn: synthesize payload state, Phase 1 context, active policies, and contributions into a focused first response |
| `payload.identity.name` set AND `tools.length > 0` | Sonnet | Payload complete — any subsequent turn may finalize; keyword false-negatives on "yes" or "ok" are too costly |
| Explicit finalization language in `lastUserText` | Sonnet | `mark_intake_complete` requires complete `captureVerification` and `policyQualityAssessment` enumeration |
| Governance/regulatory keywords in `lastUserText` | Sonnet | Multi-constraint reasoning; `policy`, `compliance`, `regulation`, `FINRA`, `SOX`, `GDPR`, `HIPAA`, `PCI`, `audit`, `access control`, `data handling`, `PII`, etc. |
| All other turns | Haiku | Standard requirement-capture turns (~75–80% of a typical session) |

<!-- NEW: -->
| Priority | Condition | Model | Rationale |
|---|---|---|---|
| 1 | `messageCount <= 1` | Sonnet | Opening turn: synthesize payload state, Phase 1 context, active policies, and contributions into a focused first response |
| 2 | `payload.identity.name` set AND `tools.length > 0` | Sonnet | Payload complete — any subsequent turn may finalize; keyword false-negatives on "yes" or "ok" are too costly |
| 3 | Explicit finalization language in `lastUserText` | Sonnet | `mark_intake_complete` requires complete `captureVerification` and `policyQualityAssessment` enumeration |
| 4 | `expertiseLevel === "guided"` AND `messageCount <= 6` | Sonnet | Guided mode (non-technical designers) benefit from Sonnet's richer language quality on early turns *(added Phase 49)* |
| 5 | Governance/regulatory keywords in `lastUserText` | Sonnet | Multi-constraint reasoning; `policy`, `compliance`, `regulation`, `FINRA`, `SOX`, `GDPR`, `HIPAA`, `PCI`, `audit`, `access control`, `data handling`, `PII`, etc. |
| — | All other turns | Haiku | Standard requirement-capture turns (~75–80% of a typical session) |
```
Verify: spec mentions `expertiseLevel === "guided"` in the routing table.

---

### SPEC-20260329-005: Add missing intake API routes to intake-engine.md
Priority: P2
Effort: S
File: `docs/specs/intake-engine.md:236–244` (API Routes table)
Problem: The API Routes table lists 7 routes but the actual source tree has 16. Routes added in Phase 48 (Stakeholder Collaboration Workspace) and Phase 49 (Intake Confidence Engine) are entirely undocumented.
Fix:
```markdown
<!-- Append to API Routes table (after line 244): -->
| GET | `/api/intake/sessions/[id]/quality-score` | Compute live intake readiness score (0–100) from section coverage, governance depth, and specificity signals *(Phase 49)* |
| GET | `/api/intake/sessions/[id]/classification` | Get or trigger AI classification of the session into agent type + risk tier *(Phase 49)* |
| POST | `/api/intake/sessions/[id]/quick-start` | Generate a starter payload from a one-line description (template bootstrap for Guided-mode designers) *(Phase 49)* |
| POST | `/api/intake/sessions/[id]/stakeholder-chat` | AI-orchestrated stakeholder interview — streams RACI-adapted questions; guest-accessible via invitation token *(Phase 48)* |
| POST | `/api/intake/sessions/[id]/invitations` | Create a token-gated stakeholder workspace invitation and send the invitation email *(Phase 48)* |
| GET | `/api/intake/sessions/[id]/invitations` | List all stakeholder invitations for a session *(Phase 48)* |
| GET | `/api/intake/invitations/[token]` | Validate an invitation token and return workspace context for the guest *(Phase 48)* |
| POST | `/api/intake/invitations/[token]/chat` | Stakeholder interview chat stream — authenticated by invitation token, no Intellios account required *(Phase 48)* |
| GET | `/api/intake/sessions/[id]/insights` | List AI Orchestrator insights (synthesis, conflict detection, gap analysis) *(Phase 48)* |
| PATCH | `/api/intake/sessions/[id]/insights/[insightId]` | Approve or dismiss an AI Orchestrator insight; approved invite-insights auto-create invitations *(Phase 48)* |
| POST | `/api/intake/sessions/[id]/finalize` | Alternative finalization path (direct HTTP, not via AI tool call); used by quick-start flow *(Phase 49)* |
```
Verify: spec API table has at least 15 rows.

---

### SPEC-20260329-006: Add `POST /api/blueprints/[id]/review-brief` to blueprint-review-ui.md
Priority: P2
Effort: S
File: `docs/specs/blueprint-review-ui.md:59–63` (API Endpoints table, after line 63)
Problem: `POST /api/blueprints/[id]/review-brief` exists at `src/app/api/blueprints/[id]/review-brief/route.ts` but is not mentioned anywhere in the spec. This endpoint generates a Claude Haiku AI Risk Brief for a blueprint under review — a primary reviewer affordance — yet the spec only documents 2 blueprint-review endpoints.
Fix:
```markdown
<!-- Append to API Endpoints table (after line 63): -->
| POST | `/api/blueprints/[id]/review-brief` | Generate an AI risk brief (Claude Haiku) for a blueprint under review. Returns `{ brief: { riskLevel, summary, keyPoints, recommendation, recommendationReason } }`. Auth: `reviewer \| compliance_officer \| admin`. |
```
Also append a new subsection after the `### UI: ReviewPanel` section:

```markdown
### AI Risk Brief

When a reviewer opens the Review tab, the `ReviewPanel` can request a one-click AI risk brief via `POST /api/blueprints/[id]/review-brief`. The brief is generated by `claude-haiku-4-5-20251001` using the blueprint's identity, tools, governance policies, constraints, and current validation report.

**Response shape:**
```typescript
{
  brief: {
    riskLevel: "low" | "medium" | "high",
    summary: string,          // one-sentence risk profile
    keyPoints: string[],      // 2–5 key governance concerns
    recommendation: "approve" | "request_changes" | "reject",
    recommendationReason: string
  }
}
```

**Auth:** `reviewer | compliance_officer | admin`. Enterprise-scoped.
```
Verify: spec mentions "review-brief" and "AI Risk Brief".

---

### SPEC-20260329-007: Add `deployed` status to agent-registry.md lifecycle state machine and data model
Priority: P1
Effort: S
File: `docs/specs/agent-registry.md:50,87–98`
Problem: The `deployed` lifecycle status was added in a later phase. The data model column description (line 50) only lists `draft | in_review | approved | rejected | deprecated`. The lifecycle state machine diagram (lines 87–98) does not show `deployed` at all. The actual transition map in `src/app/api/blueprints/[id]/status/route.ts:32–39` shows `approved → deployed` and `deployed → deprecated`.
Fix:
```markdown
<!-- Replace line 50 (status column): -->
<!-- OLD: -->
| `status` | TEXT | `draft \| in_review \| approved \| rejected \| deprecated` |

<!-- NEW: -->
| `status` | TEXT | `draft \| in_review \| approved \| rejected \| deprecated \| deployed` |
```
```markdown
<!-- Replace lifecycle state machine diagram (lines 87–98): -->
<!-- OLD: -->
```
draft → in_review → approved → deprecated
              ↓
           rejected → deprecated
```

Valid transitions:
- `draft` → `in_review`, `deprecated`
- `in_review` → `approved`, `rejected`, `deprecated`
- `approved` → `deprecated`
- `rejected` → `deprecated`
- `deprecated` → (terminal)
```
<!-- NEW: -->
```
draft → in_review → approved → deployed → deprecated
              ↓           ↓
           rejected → deprecated
```

Valid transitions:
- `draft` → `in_review`, `deprecated`
- `in_review` → `approved`, `rejected`, `deprecated`
- `approved` → `deployed`, `deprecated`
- `deployed` → `deprecated`
- `rejected` → `deprecated`
- `deprecated` → (terminal)

Deploying to production (`approved → deployed`) requires a `changeRef` (change ticket number) in the request body and `reviewer | admin` role. On deployment: `checkDeploymentHealth()` is run fire-and-forget; a periodic review due date is scheduled when `periodicReview.enabled` in enterprise settings.
```
Verify: spec mentions `deployed` in status column and state machine.

---

### SPEC-20260329-008: Add missing `agent_blueprints` columns to agent-registry.md data model
Priority: P1
Effort: S
File: `docs/specs/agent-registry.md:42–51` (Data Model table)
Problem: The data model table lists 9 columns. The actual schema at `src/lib/db/schema.ts` has at least 15 additional columns added across Phase 4 through Phase 52 that are not documented. A developer looking at the spec cannot reconstruct the actual table structure.
Fix:
```markdown
<!-- Append to data model table (after line 51): -->
| `validation_report` | JSONB | Latest governance validation report (`{ valid, violations, policyCount, generatedAt }`) |
| `review_comment` | TEXT | Reviewer comment from the latest review action |
| `reviewed_by` | TEXT | Email of the last reviewer |
| `reviewed_at` | TIMESTAMP | Timestamp of the last review action |
| `created_by` | TEXT | Email of the designer who generated the blueprint |
| `enterprise_id` | UUID | Enterprise tenant scope |
| `current_approval_step` | INT | Active step index in the multi-step approval chain (0-based) |
| `approval_progress` | JSONB | Array of `ApprovalStepRecord` — each completed approval step with actor, decision, comment, timestamp |
| `previous_blueprint_id` | UUID | FK to the blueprint this was forked from (null for v1 blueprints; set by `POST /api/blueprints/[id]/new-version`) |
| `governance_diff` | JSONB | ABP diff vs. previous version computed at creation time; null for v1 (Phase 52) |
| `next_review_due` | TIMESTAMP | SR 11-7 periodic review due date; set on deployment when `periodicReview.enabled` (Phase 36) |
| `deployment_target` | TEXT | `"agentcore"` or null — platform the agent was deployed to |
| `agent_type` | TEXT | Denormalized from intake classification: `"automation" \| "decision-support" \| "autonomous" \| "data-access"` |
| `risk_tier` | TEXT | Denormalized from intake classification: `"low" \| "medium" \| "high" \| "critical"` |
```
Verify: spec data model table includes `validation_report`, `approval_progress`, `governance_diff`.

---

### SPEC-20260329-009: Remove stale OQ-005 Known Unknown from agent-registry.md
Priority: P2
Effort: XS
File: `docs/specs/agent-registry.md:106–116` (Known Unknowns table)
Problem: The Known Unknowns section (lines 106–116) still lists OQ-005 three times as unresolved. However, the spec itself already documents the resolution on line 53 under "Design decisions (OQ-005 resolved):". The entire Known Unknowns section is stale — OQ-005 was resolved and OQ-002 (multi-tenancy) is implemented (enterprise-scoped queries are live across all routes).
Fix:
```markdown
<!-- Replace the entire Known Unknowns section (lines 106–116): -->
<!-- OLD: -->
## Known Unknowns

These questions must be resolved before this component can be implemented. See `docs/open-questions.md` for full detail.

| # | Question | Blocks |
|---|---|---|
| OQ-005 | Relationship between `agent_blueprints` table (created for Generation Engine) and the Agent Registry — are they the same, or does the Registry wrap it? | Schema design |
| OQ-005 | Version history model — separate rows per version, or JSONB array? | Schema design, query design |
| OQ-005 | Agent uniqueness definition — what field(s) identify an agent as unique within an enterprise? | Uniqueness enforcement |
| OQ-002 | Authentication and multi-tenancy — how is enterprise isolation enforced for stored ABPs? | All registry operations |
| OQ-007 | ABP schema evolution — how are ABPs stored at an older schema version handled when the schema advances? | Long-term data integrity |

<!-- NEW: -->
## Known Unknowns

| # | Question | Status |
|---|---|---|
| OQ-007 | ABP schema evolution — how are ABPs stored at an older schema version handled when the schema advances? | Open |
```
Verify: spec no longer references OQ-005 as an open question.

---

### SPEC-20260329-010: Add missing governance API routes to governance-validator.md
Priority: P2
Effort: S
File: `docs/specs/governance-validator.md:74–79` (API Endpoints table)
Problem: The spec only documents 3 governance routes. The actual source has 8 governance routes. Routes for individual policy management (GET/PATCH/DELETE by ID), policy version history, policy simulation, governance templates, and analytics are not documented.
Fix:
```markdown
<!-- Replace API Endpoints table (lines 74–79): -->
<!-- OLD: -->
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/blueprints/[id]/validate` | Manual validation; stores report in DB, returns it |
| GET | `/api/governance/policies` | List global governance policies |
| POST | `/api/governance/policies` | Create a governance policy |

<!-- NEW: -->
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/blueprints/[id]/validate` | Manual validation; stores report in DB, returns it |
| GET | `/api/governance/policies` | List governance policies (global + enterprise-scoped) |
| POST | `/api/governance/policies` | Create a governance policy |
| GET | `/api/governance/policies/[id]` | Get a single governance policy by ID |
| PATCH | `/api/governance/policies/[id]` | Update a governance policy (creates a new version in history) |
| GET | `/api/governance/policies/[id]/history` | Full version history for a policy, ordered newest → oldest. Auth: `compliance_officer \| admin`. |
| POST | `/api/governance/policies/simulate` | Run a policy's rules against a provided ABP without persisting anything — returns a preview validation report |
| GET | `/api/governance/templates` | List available governance policy template packs |
| POST | `/api/governance/templates/[pack]/apply` | Apply a template pack — creates pre-configured policies from the named pack for the enterprise |
| GET | `/api/governance/analytics` | Governance health analytics (compliance rate, violation trends, policy coverage) — `compliance_officer \| admin \| viewer` |
```
Verify: spec governance API table has at least 10 rows.

---

### SPEC-20260329-011: Update OQ-002 Known Unknown status in governance-validator.md
Priority: P2
Effort: XS
File: `docs/specs/governance-validator.md:110–114` (Known Unknowns table)
Problem: Line 114 reads "Enterprise-specific policy loading (MVP loads global policies only)". Enterprise-scoped policy loading is fully implemented — `loadPolicies(enterpriseId)` in `src/lib/governance/load-policies.ts` fetches both global policies and enterprise-specific policies. The "(MVP loads global policies only)" annotation misleads the reader into thinking multi-tenancy is not yet implemented.
Fix:
```markdown
<!-- Replace Known Unknowns table (lines 110–114): -->
<!-- OLD: -->
| # | Question | Blocks |
|---|---|---|
| OQ-002 | Authentication and multi-tenancy — how are governance policies scoped per enterprise? | Enterprise-specific policy loading (MVP loads global policies only) |

<!-- NEW: -->
*All known unknowns for this subsystem are resolved. OQ-002 (multi-tenancy) is implemented via `loadPolicies(enterpriseId)` — fetches global policies plus enterprise-specific policies; all governance endpoints enforce enterprise scope via `assertEnterpriseAccess()`.*
```
Verify: spec no longer says "MVP loads global policies only".

---

### SPEC-20260329-012: Add missing blueprint routes to generation-engine.md
Priority: P2
Effort: S
File: `docs/specs/generation-engine.md:88–93` (API Routes table)
Problem: The spec only documents the 3 core generation routes. The blueprint API now has 20+ routes. Key features built on top of generated blueprints (simulate, quality evaluation, MRM report, evidence package, code export, companion) have no spec coverage.
Fix:
```markdown
<!-- Append to API Routes table (after line 93): -->
| POST | `/api/blueprints/[id]/regenerate` | Re-run generation + validation from the stored intake session; resets `refinementCount` to 0; draft blueprints only *(Phase 45)* |
| POST | `/api/blueprints/[id]/new-version` | Create a new draft version of the same logical agent (same `agentId`, major semver bump, lifecycle reset); computes and stores governance diff vs. source *(Phase 43/52)* |
| GET | `/api/blueprints/[id]/diff` | Return the ABP diff between this blueprint and its previous version (uses `diffABP()`) *(Phase 23)* |
| POST | `/api/blueprints/[id]/simulate/chat` | Stream a live chat session using the blueprint as the agent system prompt — playground for reviewers and designers *(Phase 40)* |
| POST | `/api/blueprints/[id]/simulate/red-team` | AI-generated adversarial test prompts for the blueprint; returns a list of attack scenarios *(Phase 40)* |
| GET | `/api/blueprints/[id]/quality` | AI quality evaluation across 5 scored dimensions (clarity, completeness, governance, safety, operability) *(Phase 36)* |
| GET | `/api/blueprints/[id]/report` | Assemble and return full MRM Compliance Report (14 sections). Auth: `compliance_officer \| admin \| viewer`. Writes audit log. |
| GET | `/api/blueprints/[id]/evidence-package` | One-click regulatory evidence bundle: MRM report + approval chain + quality evaluation + test run evidence. Auth: `designer \| reviewer \| compliance_officer \| admin`. Status gate: `approved \| deployed` *(Phase 50)* |
| GET | `/api/blueprints/[id]/export/code` | Export blueprint as deployable code artifact. Status gate: `approved \| deployed`. Auth: `compliance_officer \| admin`. *(Phase 36)* |
| GET | `/api/blueprints/[id]/export/compliance` | Export blueprint as a compliance artifact PDF/JSON. Auth: `compliance_officer \| admin`. *(Phase 36)* |
| GET | `/api/blueprints/[id]/export/agentcore` | Export blueprint in AgentCore deployment format. Auth: `compliance_officer \| admin`. *(Phase 36)* |
| POST | `/api/blueprints/[id]/companion/chat` | Blueprint Companion — streaming AI assistant for designers to ask questions about their blueprint *(Phase 36)* |
| GET | `/api/blueprints/[id]/test-runs` | List behavioral test runs for a blueprint. Auth: `requireAuth()` (no role restriction). |
| GET | `/api/blueprints/[id]/regulatory` | Return regulatory requirement mapping (FINRA, SOX, GDPR, HIPAA, PCI-DSS) derived from intake context and governance policies |
| POST | `/api/blueprints/[id]/periodic-review/complete` | Mark a periodic review as complete and reschedule the next due date *(Phase 36)* |
```
Verify: spec API table includes "simulate", "evidence-package", and "report" routes.
