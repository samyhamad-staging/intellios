# Intellios — Project Journal

A narrative record of how this project has evolved over time. Written retrospectively at the end of each session to capture strategic context, reasoning, and the arc of development — things that are not visible from code commits or action logs alone.

## Session 012 — 2026-03-13: The Missing Navigation Layer

### A Platform With No Memory for Its Designers

By the end of Phase 8, Intellios had a sophisticated intake pipeline: a three-phase structured capture process, context-driven governance enforcement, stakeholder requirement lanes, contribution coverage indicators, and policy substance validation. What it did not have was a way for a designer to find their own work.

The only entry point to an intake session was a direct URL (`/intake/{uuid}`). If a designer created a session, navigated away, and came back an hour later, there was no link in the navigation to get back. The home page showed blueprints — completed agents in the registry — not the in-progress intake sessions that would eventually produce them. The gap was subtle because in development the session URL was always in the browser history, but for any real user in a real enterprise context, losing a session URL means losing the session.

### The Fix: Session List + Nav

The intake session list page (`/intake`) is deliberately simple. It reads directly from the database in a server component, separates sessions into "In Progress" and "Completed" sections, and links each row to the session workspace. Each row shows the agent name (when captured from Phase 2), the purpose (from Phase 1 context), deployment type and data sensitivity as context chips, and a relative timestamp. The "Design a New Agent" CTA is prominent at the top and repeated in the empty state.

The nav addition is one condition: `designer` or `admin`. Reviewers, compliance officers, and other roles don't have intake sessions — their work surfaces appear in the Review Queue and Governance sections. The placement before "Pipeline" reflects the workflow order: intake comes first.

### Completing the MRM Evidence Chain

Phase 8's coverage gap detection was visible in the UI during intake — the sidebar strip and the Phase 3 callout — but the coverage gap data was not preserved in the MRM Compliance Report. The report already documented which domains contributed (Section 11). Phase 9 adds what was expected but absent.

`stakeholderCoverageGaps: string[] | null` is a simple extension to the MRM type. The assembly is equally simple: call `getMissingContributionDomains` with the intake context and the mapped contribution rows. The result is null for blueprints generated before Phase 8 (no intake context available for the derivation), and an empty array for blueprints with full stakeholder coverage.

This matters for audit. An SR 11-7 review of an agent's MRM report will now show not just who contributed, but which domains were implicated by the agent's context and chose not to (or were unable to) contribute. The distinction between "no legal input required" and "legal input was expected but not received" is exactly the kind of nuance that regulators care about — and that the report can now express.

### The Intake Arc Complete

Looking back at the intake progression: Phase 6 established *what* governance was required. Phase 7 made it possible for stakeholders to say *what they required*. Phase 8 ensured what was said was *substantive* and surfaced what was *missing*. Phase 9 gives designers a way to navigate their work and ensures the coverage gap evidence is *preserved* in the permanent compliance record.

The intake engine is now a structured, evidence-grade process end to end.

---

## Session 011 — 2026-03-13: Closing the Completeness Loop

### The Problem With Presence

Phase 7 made it possible for a compliance officer to submit their requirements directly. Phase 8 asks the question Phase 7 could not answer: what if they didn't? And what if the ones who did submit requirements provided a policy that was technically present but substantively empty?

Both failure modes are invisible in normal operation. A governance policy named "FINRA Compliance Policy" with no rules and no description passes every type-presence check. It exists. It has a name. It has the right category. But it says nothing about what the agent is allowed or prohibited from doing under FINRA Rule 3110. For SR 11-7 purposes, that policy provides no audit evidence. It is an empty label.

The same invisibility applied to domain absence. If a FINRA-scoped agent had no compliance officer contribution on record, nothing surfaced that gap. The Phase 3 review screen would render normally. The Generate Blueprint button would be available. The omission was silent.

### Two Independent Fixes

The substance enforcement fix is entirely server-side. `checkGovernanceSufficiency` already ran before `mark_intake_complete` could succeed. The new substance pass is a second loop over the same required types, checking each matching policy for meaningful content. A policy is substantive if it has at least one non-empty rule in `rules[]` or a description of at least 25 characters. Below that threshold, the policy is rejected with a specific `_substance` gap type that names the offending policy and tells the AI exactly what to fix. The Claude instruction in the system prompt was updated to warn about this upfront.

The coverage indicator fix is entirely client-side. A new coverage module (`src/lib/intake/coverage.ts`) derives which contribution domains are *expected* from Phase 1 signals — FINRA implies compliance, external APIs imply security and IT, PII data implies compliance, security, and legal, and so on. The missing domains are computed by subtracting covered domains from expected ones. Two UI surfaces now show that delta: a compact amber strip in the Phase 2 sidebar (visible during the conversation, while there is still time to request input), and an informational callout in the Phase 3 review screen (visible before blueprint generation, where a designer can decide whether to proceed anyway). Both are non-blocking — the system records the gap and flags it for reviewers, but does not prevent finalization.

### The Design Choice: Non-Blocking Coverage

The decision to make coverage gaps non-blocking (while making substance gaps hard-blocking) reflects a deliberate asymmetry in the Intellios governance model. A policy with no content is definitively wrong — it provides false audit coverage and cannot be submitted to a regulator. An absent stakeholder contribution is a process gap — it may reflect a legitimate decision (the IT team was not needed for this agent), a practical constraint (the legal team is unavailable this week), or a genuine oversight. The system should surface the absence clearly, attribute it, and ensure reviewers are aware. It should not prevent a designer from proceeding when they have a legitimate reason to.

This asymmetry will become important in the MRM report. When the contribution coverage gap is surfaced in Phase 3, the absence becomes a documented decision rather than an undetected oversight. A compliance officer reviewing the MRM report will see which domains had contributions and which did not — and for the ones that did not, will see that the designer was informed and proceeded deliberately.

### The Compound Effect

Phase 6 established what governance was required. Phase 7 made it possible to capture who said what. Phase 8 ensures that what was captured is real — that policies contain actual controls, and that domain absences are visible rather than silent. The three phases together turn intake from a form-filling exercise into a structured, auditable evidence assembly process.

---

## Session 010 — 2026-03-13: From Consultation to Evidence

### The Gap That Phase 6 Left Open

Phase 6's three-phase architecture eliminated the governance blindspot. Claude now knows before the
first message what compliance requirements are mandatory for this specific agent. But there was a
second gap, quieter and harder to see: the system still captured requirements through a single
channel.

`stakeholdersConsulted` in Phase 1 was a multi-select: compliance, risk, legal, security, IT,
business owner. It was intended to signal that the right people had been involved. What it actually
captured was participation, not content. A compliance officer checking "consulted" and a compliance
officer who spent 45 minutes reviewing the agent spec and producing 12 specific FINRA Rule 3110
requirements looked identical in the data model.

In a Fortune 500 financial services firm, those are not the same thing. The audit trail for SR 11-7
must show not just that compliance was involved, but what compliance required. "We consulted" is
not a governance artifact. "We consulted, and here is what was required" is.

### The Shift: From Indirect to Direct

The fundamental change in Phase 7 is moving from indirect evidence to direct evidence. Before:
the designer relays what stakeholders told them. After: stakeholders submit their requirements
directly, attributed under their name and role.

This matters for two reasons beyond completeness. First, attribution. When a risk officer submits
a denied-scenario list, their name and role are attached to that list in the MRM report. If an
auditor asks where the denied-scenario constraints came from, the answer is not "the designer
mentioned risk concerns" — it is "Rafael Morales, VP Model Risk, submitted them on [date]." That
is a different quality of evidence.

Second, verbatim incorporation. The requirements are injected into Claude's system prompt and Claude
is instructed to incorporate them verbatim. There is no paraphrase, no interpretation, no
translation through the designer's understanding. The compliance officer's FINRA Rule 3110
language appears in the blueprint as the compliance officer wrote it.

### The Architecture: Domain-Adaptive Channels

Seven contribution domains, each with three domain-specific fields, were chosen over a single
free-form text box for the same reason Phase 1 chose structured fields over open narrative: structure
is more useful downstream than completeness.

A free-form textarea from a compliance officer might contain anything — or nothing useful. A form
with `regulatoryRequirements`, `prohibitedActions`, and `auditRequirements` fields guides the
compliance officer toward the precise content that matters for the blueprint. The fields are
different for each domain. A risk officer sees `riskConstraints`, `deniedScenarios`, and
`escalationProcedures`. A legal officer sees `legalConstraints`, `liabilityLimitations`, and
`dataHandlingRequirements`. The form adapts to the stakeholder's domain expertise.

### MRM Report: Closing the Evidence Chain

Phase 6 established the intake evidence chain: context signals → governance requirements → policies
→ validation → review → deployment → audit. Phase 7 adds a layer that was missing: the human
inputs that shaped the requirements before Claude ever saw them.

Section 11 of the MRM report (`stakeholderContributions`) is not a summary or a digest. It is
the full content of every stakeholder contribution, attributed and timestamped. A model risk
officer reviewing the MRM report can now answer the question that SR 11-7 implicitly asks: "Who
was involved in defining the requirements for this model, what did they require, and when?"

The answer is no longer "the designer said stakeholders were consulted." It is: seven named
individuals, representing seven governance domains, submitted specific requirements on a specific
date, and those requirements are reprinted here in full.

### What the Evidence Chain Now Looks Like

Before Phase 7: context → requirements → policies → validation → review → deployment → audit.

After Phase 7: **stakeholder requirements** → context → requirements → policies → validation →
review → deployment → audit.

The chain extends one step further upstream, to the point where the human judgment about what the
agent must do enters the system. That upstream evidence — direct, attributed, verbatim — is the
difference between a compliance record and a compliance story.

---

## Session 009 — 2026-03-13: From Discovery to Determinism

### The Blindspot in Conversation-First Intake

The original intake design had a fundamental assumption embedded in it: that Claude could discover
all relevant governance requirements through conversation. A user describes their agent; Claude asks
follow-up questions; governance requirements emerge from dialogue.

This works when users know what they don't know. It fails — silently — when they don't. An engineer
building a customer-facing trading agent might not mention FINRA compliance because they assume it's
someone else's concern, or because they don't know the platform needs to reflect it in the blueprint.
The conversation ends. The blueprint is generated. The governance gap is invisible until a compliance
officer flags it at review, or worse, during a regulatory examination.

The root cause isn't Claude's quality — it's the architecture. Discovery-based probing requires the
domain signal to appear in the conversation before the requirement can be enforced. Structured intake
moves that signal upstream.

### The Two-Signal Architecture

The fix is not to make Claude ask better questions. It's to make Claude ask the *right* questions from
the start, because it already knows the domain context before the conversation begins.

Phase 1 captures six signals: agent purpose, deployment surface, data sensitivity level, regulatory
frameworks, system integrations, and stakeholders consulted. These take two minutes to fill out. They
produce a deterministic map of what governance requirements are mandatory for this specific agent in
this specific enterprise context.

Phase 2 is still a freeform conversation — that expressiveness is the intake engine's core value.
But now Claude starts fully informed. The system prompt receives both the current payload state (what
has been captured) and the context block (what the enterprise environment requires). Claude knows,
before the user says a word, that a customer-facing agent processing PII under FINRA must have a
compliance policy, a data handling policy, audit logging, a defined retention period, and behavioral
instructions. Claude will probe for all of these. Not because it inferred them from the conversation,
but because the context made them mandatory.

The governance sufficiency matrix in `mark_intake_complete` closes the loop as hard enforcement: even
if Claude missed something, or the user deflected, the intake cannot be finalized with required
governance gaps outstanding. The error message names each missing item and its reason.

### Phase 3: Review as Evidence

The pre-finalization review screen is not a usability feature — it's a governance artifact. It requires
the designer to read what was captured, section by section, and check a box confirming it is correct.
That acknowledgment is a documented human review event, not just a button click.

The ambiguity flags panel surfaces everything Claude flagged as unclear during the conversation.
Reviewers and compliance officers will see these flags in the governance report. Making them visible at
the point of finalization — before the blueprint exists — creates an opportunity to resolve ambiguity
rather than pass it downstream.

### MRM Report: A Complete Intake Evidence Chain

The MRM report now includes deployment type, data sensitivity, regulatory scope, and stakeholders
consulted from Phase 1 context in its Risk Classification section. A model risk officer reviewing
the report can now see not just what governance policies were applied, but what domain signals drove
the intake process. The evidence chain is complete: context → requirements → policies → validation →
review → deployment → audit.

---

## Session 008 — 2026-03-13: From Controls to Evidence

### The Proof Problem

After seven sessions, Intellios has strong controls: governance validation, independent review, SOD enforcement, change management records, immutable audit logs, role-based access, and multi-tenant isolation. The platform enforces everything a regulated enterprise needs.

But controls and proof of controls are different things. A model risk officer reviewing an AI platform for SR 11-7 compliance doesn't walk through a live application clicking tabs. They receive a document. That document answers specific questions: What is this model? Who approved it? Who reviewed it independently? What governance checks passed? What policies were applied? Was the deployment authorized by change management? Can I trace every decision back to a named individual at a specific time?

The MRM Compliance Report answers all of these questions in a single artifact.

### Why JSON, Not PDF

The report is exported as structured JSON rather than a formatted PDF. This is deliberate. Enterprises have their own document management, eGRC, and model inventory systems. A structured JSON artifact can be imported into ServiceNow, Archer, or any model risk management platform without manual re-entry. A PDF is readable by humans; JSON is processable by systems. At scale, enterprises will ingest these reports programmatically, not print them.

### Risk Classification Without a Risk Framework

The Risk Classification section involves a deliberate design tension. The current schema has no explicit risk tier or business owner field — those concepts don't exist in the ABP. Rather than defer the section or require schema changes, the report derives a risk tier from governance policy types: both safety and compliance policies present → High; one of the two → Medium; neither → Low. The derivation basis is stated verbatim in the report alongside the tier.

This is honest about what the system knows and doesn't know. An enterprise can validate or override the derived tier using their own risk taxonomy. The section captures what is machine-derivable while making clear where human judgment is required. That transparency is itself a governance artifact.

### Audit of Audits

Every report export writes a `blueprint.report_exported` entry to the audit log. This closes a subtle traceability gap: if a regulator asks "when did your compliance team last review the documentation for this model?", the answer is now queryable. The audit trail records not just what happened to the agent, but who examined the evidence and when.

### Model Lineage as Regulatory Evidence

The Model Lineage section captures two things: the full version history of a logical agent (all blueprint versions, their statuses, who created them, how many refinement cycles each underwent) and the deployment lineage (every production deployment across all versions, with the change reference number). In a financial services firm with a multi-year agent lifecycle, this section tells the story of a model's evolution — from initial design through revisions, reviews, and production deployments — in a single read.

---

## Session 007 — 2026-03-13: Closing the Operational Gaps

### Deployment as a Documented Event

The single most important fix this session has nothing to do with UI aesthetics. It is the elimination of a one-click production deployment. Before this session, deploying an AI agent to production required exactly one click — the same amount of deliberation as liking a social media post.

In a financial services firm, production deployments require change records. They exist in ServiceNow or Jira. They have ticket numbers. They have been approved by a change advisory board. The absence of a change reference capture in the deployment flow was not a UX gap — it was a compliance gap. Any audit of the deployment process would surface it immediately.

The confirmation modal now requires a change reference number before the deploy button becomes active. The reference is stored in the audit log, permanently attached to the `blueprint.status_changed (deployed)` event. This means an auditor can look at any deployed agent and trace back to the change record that authorized it. That is the property that matters.

### The Friction Is the Feature

The modal introduces intentional friction. This is deliberate. The previous one-click flow optimized for speed. Enterprise production deployments should not optimize for speed — they should optimize for deliberateness. The extra 30 seconds to enter a change reference is not waste; it is the moment at which someone consciously takes ownership of a production decision.

The authorization checkbox reinforces this: "I confirm that this deployment is authorized..." This language is borrowed from regulated industries where written acknowledgment of responsibility is a control. It is not bureaucracy for its own sake — it is a checkpoint that shifts accountability from the system to the individual.

### Search at Scale

The tag filter on the pipeline board was designed for small datasets. At Fortune 500 scale — potentially hundreds of agents across business units — users need text search. The same logic applies to the registry. A reviewer looking for "the customer support bot from the retail division" should not have to scroll.

The implementation is deliberately client-side. The registry API already returns the full list for the user's enterprise scope. Adding a server-side search would add API latency for a filtering operation that can be done instantly in the browser. The `useMemo` filter runs in microseconds on lists of hundreds of items. This is the right architectural choice.

### Review Decisions Belong on the Blueprint

Before this session, a designer whose blueprint was rejected had two options to find out why: check their notification (if they happened to notice it) or open the audit trail and search. Neither is acceptable as the primary discovery path. The decision and rationale should be the first thing a designer sees when they open a blueprint that has been reviewed.

The banner is color-coded (green/red/amber) and placed immediately below the tab bar, above the content. It is impossible to miss. It includes the reviewer's identity, the timestamp, and the comment verbatim. A designer can act on the feedback — refine the blueprint, address the violations — without leaving the page.

The "changes requested" case (amber) is particularly important. When a reviewer returns a blueprint to draft with a comment, the comment contains the actionable feedback. Making that comment visible at the top of the page, rather than buried in an audit trail, directly shortens the revision cycle.

### SOD Was Incomplete Until the Control Validation

A production-readiness validation pass at the end of this session surfaced a SOD gap that should have been caught earlier. The `deployed` transition — the single most consequential step in the entire lifecycle — had no role restriction. Any authenticated user could call `PATCH /api/blueprints/{id}/status` with `{ status: "deployed", changeRef: "CR-123" }` and bypass the reviewer gate entirely.

The fix is a single guard in the status route: `if (newStatus === "deployed" && role !== "reviewer" && role !== "admin")`. But the significance is architectural. Three independent enforcement layers now stand between a designer and a production deployment: the client redirects to the modal (UX friction), the API rejects missing `changeRef` (business rule), and the RBAC guard enforces the reviewer/admin boundary (SOD). No single layer failure compromises the system. A designer who bypasses the UI still hits the API gate. A reviewer who bypasses the modal still must provide a `changeRef`. The layers are independent and cumulative.

This is the property that matters for SR 11-7 compliance: defense in depth on the deployment promotion, not trust in a single checkpoint.

---

## Session 006 — 2026-03-13: The Platform Becomes Aware of Itself

### The Transition from Tool to Platform

Up to this session, Intellios was a well-governed workflow tool. Every lifecycle action was captured, every approval documented, every transition enforced. But the system was silent. Nothing moved unless someone opened a browser tab and looked.

In regulated environments — the exact environment Intellios is built for — that model breaks. SR 11-7 model governance requires not just that reviews happen, but that they happen in a documented, timely manner. A 72-hour review clock doesn't work if reviewers only discover work when they happen to log in. The pull-based model shifts accountability from the system to individual memory.

This session's work adds a push dimension to the platform.

### Architectural Choice: The Audit Log as Event Source

The most important decision this session was not adding notifications. It was deciding where notifications originate.

The naive implementation would add a `publishEvent()` call alongside `writeAuditLog()` in every route handler that changes status. This works, but it creates two problems: every developer must remember to call both functions, and the audit log and the event system can diverge (audit write succeeds, event publish fails, or vice versa).

The ChatGPT architectural feedback crystallized a better pattern: the audit log write IS the event. After the DB insert succeeds, `writeAuditLog` dispatches a `LifecycleEvent` with the audit row's ID as the correlation ID. The audit record is the source of truth; the event is a derived signal. The routes don't know about notifications. The notification handler doesn't know about the audit format. The event bus is the seam.

This has a second property that matters for correctness: if the audit write fails, the event is never dispatched. No notification will fire for an action that wasn't actually recorded. The system cannot notify about something that didn't happen.

### Handler Registration: Side-Effect Import

The notification handler registers itself with the event bus via a side-effect import inside `audit/log.ts`. This is a deliberate design: any code that writes an audit entry automatically gets the notification handler registered. There is no separate bootstrap step, no `initNotifications()` call to forget. The import creates the binding.

This pattern works cleanly in Next.js's per-request module evaluation model. Each worker that handles a request will execute the module's top-level code on first import, registering the handler. Subsequent requests in the same worker reuse the already-registered handler.

### SLA Monitoring: Governance Made Visible

The 48h warn / 72h alert thresholds on the Pipeline Board are not just UX indicators. They are the governance policy made visible at the exact moment it matters — when a reviewer is looking at their work queue. A red-ringed card with "SLA breach" is harder to ignore than a number in a compliance report written two weeks later.

The implementation is deliberately simple: a `getSlaStatus()` function, called client-side on each card render, returning a three-value signal. No background jobs, no scheduler, no database polling. The computation is O(n) over the cards currently visible. At enterprise scale (hundreds of agents), this remains fast. The thresholds are environment-variable overridable, so each enterprise can configure their own review SLA without a code change.

### What the Platform Now Does Automatically

Before this session: every workflow state change was recorded silently.

After this session:
- Designer submits for review → all reviewers and compliance officers for that enterprise receive an in-app notification (and email if Resend is configured)
- Reviewer approves, rejects, or requests changes → designer receives notification with the review outcome
- Agent deployed → designer notified (it's live), compliance officers notified (a new model is in production)
- Any in-review agent crossing 48 hours → amber SLA indicator on pipeline board
- Any in-review agent crossing 72 hours → red SLA breach indicator

The platform now knows when to interrupt people — and which people to interrupt.

---

## Session 005 (continued) — 2026-03-13: Completing the Lifecycle Loop

### Phase C: From Approval to Deployment

Phase A built the pipeline surface. Phase B made compliance visible. Phase C closed the loop that neither of those phases addressed: what happens after approval?

Before Phase C, "Approved" was a terminal success state in the UI — the agent had passed review, and then... nothing. There was no surface to promote it to production, no way to distinguish between "approved but not yet deployed" and "live." For an enterprise product built around governed AI agent deployment, this was a conceptual gap. Approval is a governance milestone; deployment is a business event. They need to be distinct.

### The `deployed` Status: A Production Reality Marker

Adding `deployed` as a lifecycle status (between `approved` and `deprecated`) was a deliberate modeling decision, not just a UI addition. The valid transition `approved → deployed → deprecated` encodes the production lifecycle semantics in the data model itself. It means:
- An agent can be approved but not yet running in production (queue model)
- An agent can be deployed and later deprecated without going back through approval
- The audit log records the deployment event as a distinct transition, separate from the approval

This is surfaced across every layer that was already tracking status: status badge (indigo), pipeline board (sixth column), lifecycle controls ("Deploy to Production" button), ABP schema metadata, and the status route's transition validator.

### The Deployment Console: Intentional Friction

The Deployment Console (`/deploy`) separates "approved" and "deployed" into a visible queue with an explicit action. This is intentional friction. Auto-deployment on approval would be faster but would eliminate the deployment as a conscious business decision. In regulated environments, the deployment step is often where a separate sign-off, environment check, or change management record is required.

By surfacing approved agents as a "ready to deploy" list with a single button, the console acknowledges both the typical case (deploy promptly after approval) and the atypical case (hold an approved agent for a release window, a change freeze, or a final environment verification).

### The Executive Dashboard: Synthesizing the Full Picture

The Executive Dashboard (`/dashboard`) is the highest-abstraction surface in the platform — designed for stakeholders who need answers, not workflow tools. Its four KPIs (deployed count, deployment rate, compliance rate, pending review) are chosen to answer the questions a CTO or Chief Risk Officer would ask in a governance review:
- *How many agents are live?*
- *What fraction of our work makes it to production?*
- *Are our deployed agents compliant?*
- *Is anything stuck in review?*

The pipeline funnel visualization makes throughput visible. The governance health grid surfaces the top issues requiring remediation. The recent deployments table provides accountability — who deployed what, when.

### The Blueprint Summary: Bridging Technical and Business

The `BlueprintSummary` component addresses a gap that became visible during the review workflow design: the Blueprint JSON view (raw ABP structure) is useful for engineers and compliance officers, but business stakeholders reviewing an agent for deployment approval need plain language. The Summary tab renders the same data with natural-language labels, tool descriptions, policy names, and constraint plain-text — purpose-built for the non-technical decision-maker.

### Phase 2 Complete

All three UX phases are now delivered. Intellios has transformed from a functional prototype into a governed enterprise platform: every role has a purpose-built home, every workflow has a clear surface, every lifecycle stage has a corresponding UI treatment, and the governance posture is visible at every level from individual blueprint to executive portfolio.

---

## Session 005 (continued) — 2026-03-13: Governance as a First-Class Surface

### Phase B: Making Compliance Visible

Phase A established the skeleton — a pipeline board and role-differentiated home that gave every stakeholder a clear entry point. Phase B addressed the deeper problem: governance was functional (the validator ran, the audit log recorded), but it was invisible. A compliance officer had no surface to understand the state of compliance across the entire agent portfolio. A reviewer had no inline governance context when deciding whether to approve or reject a blueprint. The audit log existed as an API endpoint with no UI.

Phase B surfaced all three of these buried capabilities.

### The Governance Hub as a Command Center

The Governance Hub (`/governance`) is designed to answer a single question in under 5 seconds: *"Is our agent portfolio compliant?"* The four-stat coverage block at the top — Total, Passing, With Errors, Not Validated — gives an immediate answer. Everything below is context for the answer. The "agents requiring attention" list is sorted by violation count descending, so the worst problems are always first. The policy library makes it clear exactly what rules agents are being evaluated against.

This design decision — lead with status, follow with detail — reflects how compliance officers actually work. They don't start by reading policy definitions. They start by looking for violations.

### The Audit Trail as a Compliance Record

The audit trail was deliberately designed as load-on-demand rather than an auto-loading page. The reason: at enterprise scale, the audit log could have thousands of entries. Auto-loading all of them on every page visit would be slow and wasteful. The filter bar forces the user to scope the query before loading, which matches how audit trails are actually used (investigating a specific incident, actor, or time window) and keeps performance predictable.

The CSV export is deliberately one click from the filtered view — the same filtered view a compliance officer would have open during a regulatory review. Export follows the scope of the current query, not all records.

### The Review Console: From Free-Form to Structured

The most important governance upgrade in Phase B was making review decisions structured. The old panel had a free-form textarea — reviewers could write nothing, write a single word, or write a novel. There was no enforced format.

The new panel enforces:
1. An explicit decision choice (radio buttons) — no ambiguous text like "looks good to me"
2. A required rationale for all decisions — not just "request changes"
3. The governance report inline — reviewers can't claim ignorance of violations

The SOD warning is a soft control, not a hard block. Blocking would be too strict — in small teams, the designer and reviewer might legitimately be the same person, especially early in deployment. The warning creates an audit trail of the exception without preventing legitimate work.

---

## Session 005 — 2026-03-13: From Tool to Platform

### The UX Reckoning

Sessions 001–004 built a technically sound system. By Session 005, the honest assessment was that Intellios looked like an internal prototype, not an enterprise platform. The home page was a single centered button. The registry was a flat list. The Blueprint Workbench had no sense of progress or governance status until you scrolled to the right sidebar. There was no pipeline visibility — no way for any stakeholder to see the overall state of agent production at a glance.

Session 005 was a deliberate pivot: stop building new capabilities, start making the existing capabilities feel like a product worth using.

### The Architecture Decision: Governed Kanban

The most consequential design decision was framing Intellios around a **pipeline board as the universal status layer**. Every role — designer, reviewer, compliance officer, executive — needs to know where each agent is in its lifecycle. A Kanban board with five columns (Draft, In Review, Approved, Rejected, Deprecated) gives that clarity immediately. It also makes the governance model visible: agents can only move forward through legitimate transitions, and the board shows the consequences.

This was a departure from the original registry-as-list approach. The registry is now a detail surface; the pipeline board is the operational center.

### Role Differentiation on the Home Screen

The home page redesign was architecturally meaningful because it required a shift from client component to server component. The original `page.tsx` was a client component purely because it needed `useRouter` for post-fetch navigation. Moving to a server component that queries the DB directly (instead of fetching from the API) enabled:
- Role-aware rendering before any JavaScript executes
- Zero client-side data fetching for the home page shell
- A clean extraction of the "New Intake" button into a minimal `NewIntakeButton` client component that handles only its own local state

The result: each role now lands on a different home with a different primary CTA. Designer sees their work. Reviewer sees their queue. Admin sees portfolio stats.

### Blueprint Workbench: The Three-Column Model

The workbench redesign introduced a left-rail section stepper — seven sections drawn from the ABP structure (Identity, Instructions, Tools, Knowledge, Constraints, Governance, Audit), each marked ✓ or · based on whether the ABP field is populated. This addresses a consistent user confusion: designers couldn't tell at a glance whether their agent was "complete" or had gaps Claude had left unfilled.

The Submit for Review button moved from the registry page (where designers never looked) to the right rail of the workbench, directly in the workflow. It is governance-aware: disabled when validation errors exist, showing an explicit blocker count. This enforces the "no submitting broken agents" rule at the UI level, not just the API level.

### What Comes Next

Phase A delivered the surfaces that every role touches daily. Phase B (Governance Hub, Review Console upgrade, Audit Trail UI) is the next highest-ROI investment — it's where the compliance and reviewer workflows become genuinely usable rather than functional. The infrastructure is already in place (the `audit_log` table, the `governance_policies` table, the existing review panel). Phase B is surface work on top of a solid foundation.

---

## Session 004 — 2026-03-13: Crossing the Multi-Tenancy Threshold

### Why Multi-Tenancy Was the Last P0

Every other Post-MVP Phase 1 item was additive — rate limiting, security headers, audit logging. They hardened an already-correct system. Multi-tenancy was different: it was a correctness gap. Without it, every authenticated user had implicit access to all data regardless of which enterprise they belonged to. The system was only safe in single-tenant deployments where all users shared a trust boundary. That constraint had to be lifted before any real enterprise could be onboarded.

### The Architecture Decision

The alternative to application-level enforcement was row-level security (RLS) at the Postgres layer. RLS is more airtight — the database enforces isolation even if application code has bugs — but it requires a fundamentally different authentication model (each enterprise gets its own connection context or the RLS policy uses a session variable set per request). Given that the project uses a connection pool with a single service credential, RLS would have required significant infrastructure changes.

Application-level enforcement was the right call for this phase: it's explicit, testable, and the enforcement logic lives where the business rules live. The `assertEnterpriseAccess()` helper makes the check visible at every call site rather than hidden in database machinery.

### The Design

Two patterns emerged naturally:

1. **Single-resource routes** (blueprint by ID, intake session by ID, registry agent by agentId): fetch the resource, then call `assertEnterpriseAccess(resource.enterpriseId, user)`. The response is either null (proceed) or a 403 (return immediately). This is explicit and colocated with the not-found check.

2. **List routes** (registry, review queue, audit log): the WHERE clause carries the filter. No post-fetch filtering — the database does the work. This is more efficient and scales correctly as data volumes grow.

Governance policies needed a third pattern: GET returns global (null enterpriseId) plus the caller's enterprise-specific policies. This reflects the real semantics — platform-level policies apply to everyone; enterprise policies layer on top.

### What enterpriseId on blueprints enables

The key insight was denormalizing `enterpriseId` onto `agent_blueprints` rather than deriving it via a JOIN through `intake_sessions`. This means:
- Every blueprint read does zero additional DB queries for the enterprise check
- The validate route dropped a JOIN it had been doing to get enterprise scope from the session
- Future index on `(enterprise_id)` can support efficient tenant-scoped list queries

### The Remaining Roadmap

Phase 1 is now P0-complete. All the items that were hard blockers for enterprise use have shipped. What remains is P2:
- Distributed rate limiting (Redis) — the in-memory limiter doesn't work across multiple server instances, which matters only in horizontally scaled deployments
- Deployment pipeline — packaging approved ABPs for delivery to target runtime environments

The next most valuable technical work is the ABP schema evolution strategy (OQ-007, P1) — defining how schema versions migrate before any v1.1.0 changes are made. This is architectural design work, not implementation.

---

## Session 002 — 2026-03-12: First Live Run

### The Gap Between "Complete" and "Working"

Session 001 ended with all 5 MVP components built and the build verified clean. But "build passes" is not the same as "pipeline works against a real database with a real API key." Session 002 closed that gap.

The environment had no database. Docker Desktop was inoperative (Windows service stopped, Start-Process silently failed), WSL only had a stopped docker-desktop distro. PostgreSQL 17 was installed directly via winget — the installer ran interactively in the background and completed before being killed, leaving a fully initialized cluster with the `postgresql-x64-17` Windows service running on port 5432.

### The End-to-End Run

The pipeline was walked through in full: a customer support agent ("TechCorp SupportBot") was designed via the Intake Engine, generated by the Generation Engine, governance-validated (4/4 policies passed), submitted for review, and approved. All lifecycle transitions fired correctly. All tool call badges rendered in the intake chat. All database writes were confirmed.

One runtime bug was found and fixed during the run: `ToolCallDisplay` crashed with `Cannot convert undefined or null to object` when Claude called `mark_intake_complete` (which has no args). The fix was a single null-safe fallback: `Object.entries(args ?? {})`. The component had never been exercised with an argless tool call before this run.

### All Reviewer Branches Exercised

The happy path was only one of five lifecycle branches. A second agent — "OnboardBot" (Acme Corp HR onboarding) — was used to walk every remaining reviewer path:

- **Request Changes** (`in_review → draft`): reviewer comment stored, status reverted, Review tab disappeared, "Submit for Review" restored. The designer can iterate and resubmit.
- **Resubmit** (`draft → in_review`): one-click, Review tab re-appears.
- **Reject** (`in_review → rejected`): terminal state. Review tab gone, only "Deprecate" available. Cannot be re-submitted.
- **Review Queue empty state**: `/review` correctly shows no items after OnboardBot moves to `rejected`.
- **Registry dual-status**: `/registry` shows both agents with correct status badges (Approved / Rejected).

No bugs were found. The lifecycle state machine is airtight across all branches.

### What This Session Established

The MVP is not just built and not just running — every reviewable branch of the lifecycle has been exercised against a real database. The system behaves correctly at every transition. Two full agent lifecycles are in the database:
- 2 intake sessions (completed)
- 2 agent blueprints (1 approved, 1 rejected)
- 4 governance policies (all passing)

**Session cost:** ~$0.56 for 2 user messages and full autonomous execution across both context windows.

---

## Session 001 (continued) — 2026-03-12: MVP Completion

### Governance Validator

The governance policy expression language (OQ-001) was the central design question. Three options were evaluated:

- **Structured `{ field, operator, value, severity, message }` rules** (chosen): Deterministic, easy to author in JSON, exhaustive coverage with 11 operators. Requires no AI at evaluation time — pure logic.
- **JSON Logic**: A proven standard with libraries, but introduces an external dependency and is harder for non-technical policy authors to write.
- **Claude-evaluated rules**: Natural language rules interpreted by Claude at runtime. Maximum flexibility, but non-deterministic (same rule can produce different results on reruns) and slow.

The determinism requirement was decisive. Governance is a gate — its output must be reproducible. Structure was chosen.

The validator architecture is a two-pass pipeline: (1) deterministic rule evaluation — pure TypeScript, no AI; (2) Claude-powered remediation suggestion — a single batched `generateObject` call that enriches all violations simultaneously. This keeps the evaluation correct and the suggestions helpful, without coupling correctness to AI availability.

OQ-004 (when to validate) was resolved as: automatic validation runs after generation, blueprint always stored regardless of violations, and the `draft → in_review` status transition is gated on zero error-severity violations. This lets designers iterate on the blueprint while seeing governance feedback in real time.

### Agent Registry

The Agent Registry question was primarily OQ-005: separate registry table, or is `agent_blueprints` the registry? Separate tables are cleaner conceptually but add join complexity for every query. Evolving `agent_blueprints` means the registry is always co-located with the ABP data.

The decision: `agent_blueprints` IS the registry. A new `agent_id` UUID field groups versions of the same logical agent. The lifecycle state machine (`draft → in_review → approved/rejected → deprecated`) is enforced at the API layer. `selectDistinctOn` (PostgreSQL-specific) gives latest-per-agent queries in a single scan.

### Blueprint Review UI

The last component required resolving OQ-006: page architecture. The decision was to keep the generation Studio (`/blueprints/[id]`) and the formal review interface (`/registry/[agentId]`) as separate pages. The Studio is for designers iterating on a blueprint. The registry detail page is for reviewers making formal decisions.

The Review tab on the registry detail page appears only when `status === "in_review"`, with an amber dot indicator. "Request changes" (the most nuanced action) stores a reviewer comment and moves the blueprint back to `draft` — the designer receives the feedback, refines in the Studio, and resubmits. This keeps the editorial loop tightly defined without requiring a separate comment thread or notification system.

### MVP Success Criteria — All Met

All 5 P0 components are complete and the build verifies cleanly (22 routes):

1. ✓ Enterprise user provides requirements through the Intake Engine
2. ✓ Generation Engine produces a valid ABP from those requirements
3. ✓ Governance Validator checks the ABP against governance policies
4. ✓ ABP is stored in the Agent Registry with versioning
5. ✓ Human reviewer can view and approve/reject via the Blueprint Review UI

### What the Second Half of Session 001 Added

The first half established the knowledge system and first two components (Intake + Generation). The second half completed the pipeline: Governance Validator, Agent Registry, Blueprint Review UI. Total session: ~177 actions, ~3 commits (knowledge system improvements, Governance Validator, Blueprint Review UI). The MVP loop is fully demonstrable.

### What Remains (Post-MVP)

Four open questions remain from the OQ tracker:

- **OQ-002** (authentication/multi-tenancy): Deferred intentionally. The DB schema has `enterprise_id` placeholders but no enforcement. The right time to address this is when a second enterprise needs to use the system.
- **OQ-003** (error handling strategy): All routes return basic `{ error: "..." }` messages. A structured error format (`{ code, message, details }`) would improve frontend UX and observability.
- **OQ-007** (ABP schema evolution): Only one schema version (v1.0.0) exists. Migration strategy deferred until v1.1.0 is needed.
- **OQ-008** (generation quality): Generated ABPs pass Zod schema validation but semantic quality (instruction richness, tool config completeness) is not checked. Quality validation would improve generated output.

---

## Session 001 — 2026-03-12

### The Problem Being Solved

Intellios started with a clear product vision: enterprises need a way to create, govern, and deploy AI agents under their own brand and policies without building the underlying infrastructure from scratch. The core insight is that agent design is a structured problem — requirements can be captured systematically, blueprints can be generated and validated against policy, and the entire lifecycle can be managed through a governed workflow.

The first session was not about writing application code. It was about establishing the foundation that everything else would be built on: a knowledge management system, a canonical artifact definition (the ABP), and a shared vocabulary.

### How the Knowledge System Was Designed

The first architectural decision was where to keep project knowledge. Three options were evaluated:

- **External wiki** (Notion, Confluence): Good for human reading, but not version-controlled with the code; divergence is inevitable; no first-class Git integration.
- **Database-backed system**: Queryable and programmable, but requires infrastructure before anything else exists; excessive for the current scale; harder to review in pull requests.
- **Git-native structured docs** (chosen): Markdown + JSON Schema files in the repository. Every change is a commit. Docs and code are always at the same revision. Claude can read and write them with the same tools used for code.

This choice shaped the entire project's working style. Claude operates primarily by reading `CLAUDE.md` at the start of each session to re-establish context, then reading relevant specs and ADRs before taking action. The human reviewer (Samy) approves decisions recorded as ADRs.

### Defining the Agent Blueprint Package

The ABP is the central artifact of Intellios. Getting its schema right early was critical because every other subsystem either produces or consumes it. The v1.0.0 schema established the following sections:

- **`identity`**: What the agent is (name, description, persona, branding)
- **`capabilities`**: What the agent can do (tools, instructions, knowledge sources)
- **`constraints`**: What the agent is limited to (domains, denied actions, rate limits)
- **`governance`**: How the agent is governed (policies, audit config)

A key design principle: the schema separates **content** (what Claude generates) from **metadata** (what the system assigns — ID, version, timestamps, status). This prevents Claude from hallucinating system-assigned values during generation.

### The 15 Open Questions

After the initial knowledge system was established, 15 open questions had been identified across all 5 component specs. Samy answered all 15 in a single session exchange — the highest-value input of the entire session. The decisions included:

- Intake method: conversational UI (not form-based)
- Generation method: Claude API call with structured output (not template-based)
- Storage: PostgreSQL (not NoSQL — relational consistency matters for policy enforcement)
- Versioning: semantic versioning for ABP revisions
- Governance: synchronous validation for MVP (async deferred)

These 15 answers were recorded as ADR-002 (technology stack) and ADR-003 (component behavior).

### Building the Intake Engine

With the foundation established, the Intake Engine was the first component implemented. The key architectural insight was using **Claude tool use for incremental payload construction** rather than processing a single user description at the end of the conversation.

Each tool maps to an ABP schema section. As the user describes their agent in natural language, Claude calls tools (`set_agent_identity`, `add_tool`, `set_constraints`, etc.) to build the payload progressively. This means:
1. The user sees immediate feedback as sections are captured
2. The payload is always in a valid, partially-complete state
3. The intake can be resumed or inspected at any point

The Vercel AI SDK v5 was chosen for streaming. This turned out to be a significant implementation challenge — v5 had a completely redesigned API from v4, and ~12 different breaking changes had to be resolved. The key API differences: `UIMessage` instead of `Message`, `useChat` with `DefaultChatTransport`, `sendMessage` instead of `append`, `convertToModelMessages` for message format conversion, `stepCountIs` for loop termination.

A critical race condition was discovered during code review: when Claude calls multiple tools in a single step (which it frequently does), the tool handlers execute in parallel and race to update the `intake_payload` JSONB column. This was fixed by serializing all payload updates through a promise queue — each update waits for the previous one to complete before reading and writing state.

### Building the Generation Engine

The Generation Engine converts a completed intake payload into a full ABP. Three generation approaches were considered:

- **Tool use**: Claude calls tools to populate each ABP section incrementally. Flexible, but complex to orchestrate and harder to ensure completeness.
- **`generateObject` with Zod schema** (chosen): SDK-level schema enforcement. Claude generates the entire content section in one call. Type-safe, no JSON parsing fragility, schema violations are caught by the SDK.
- **Streaming text + JSON parse**: Simple to implement, but parsing failures are silent and schema drift is hard to catch.

`generateObject` was selected because it enforces correctness at the framework level, not the application level. The schema is the validation — there's no separate validation pass needed.

Refinement uses a full-regeneration pattern: the current ABP, original intake, and requested change are all passed to Claude, which produces a new complete ABP. This is simpler than targeted patching and produces more coherent results (changes can cascade through all sections when appropriate).

### Effort Profile

This session demonstrated the leverage model that Intellios is designed to exemplify: **13 messages from Samy produced 2 fully implemented MVP components, 50+ files, and a complete knowledge system**. The majority of Samy's effort was 15 high-value decisions in a single exchange. Claude's implementation effort was approximately ~143K input / ~79K output tokens (~$2.20 estimated cost).

### What Remains

At the end of Session 001, the Intake Engine and Generation Engine are complete. Three MVP components remain:

- **Governance Validator** — most complex: requires a policy expression language (currently unspecified), rule evaluation engine, and violation reporting
- **Agent Registry** — most straightforward: CRUD with versioning, lifecycle state machine, search
- **Blueprint Review UI** — depends on both Governance Validator (to display validation results) and Agent Registry (to fetch ABPs)

The most significant unresolved architectural question is the governance policy expression language: how are policy rules expressed in a way that is both machine-evaluable and human-readable? This blocks the Governance Validator implementation.

---

*Add new entries at the top of this file (most recent first) after updating this section title and date.*
