# Intellios — Project Journal

A narrative record of how this project has evolved over time. Written retrospectively at the end of each session to capture strategic context, reasoning, and the arc of development — things that are not visible from code commits or action logs alone.

## Session 075 — 2026-03-31: Hardening Before Showing

Session 074 built the transparency layer. Session 075 is about making it robust.

**P1 hardening is the boring half of shipping.** When you build something new — the all-conversation intake v2, the transparency panels, the tool result badges — there are always failure modes you didn't see from the happy path. A mobile user arrives and can't read the chat because the 288px sidebar is occupying 80% of their viewport. The classification API times out silently and a spinner runs forever. A database write fails during context submission and the error surfaces as an opaque stream exception instead of a recoverable message. These are not edge cases to deprioritize — they are exactly the failure modes that break a first impression, and first impressions with design partners are the next milestone.

**The mobile sidebar fix is the highest visibility.** The sidebar was `w-72 shrink-0` — fixed width, no breakpoints, no awareness of viewport size. On a 375px iPhone, the chat gets 87px. This isn't even "poor UX" — it's broken. The fix is straightforward: `hidden lg:flex` plus a mobileOpen prop that lets the parent toggle a full-viewport overlay. The chat is now always full-width on mobile; the progress sidebar is accessible via a small "Progress" button in the header. This pattern — primary action always visible, secondary panel accessible on demand — is the right mobile default for this kind of interface.

**The classification loading resilience is about trust.** If the spinner runs forever because a background API call failed, the user sees an application that looks frozen. They don't know if the classification is coming or if something is broken. The `classificationLoadingTicksRef` counter is a small mechanism with a clear contract: after 2 turns without classification, stop pretending it's coming. Let the UI fall to a neutral state. Don't lie to the user about system status.

**The onContextSubmit try/catch is about debuggability.** When the context save fails, the error should be logged with the request ID, and the tool should surface a message that Claude can relay to the user. Before this fix, a DB write failure would propagate as an unhandled exception, show up as an error state in the chat, and leave no trace of what happened. After the fix, there's a console.error with a requestId, and Claude can tell the user "there was a problem saving — try again." Small change, meaningful difference when debugging in production.

**The pattern for this sprint: fix what's broken before expanding what's possible.** The transparency work was a major capability addition. This session is the follow-up that makes the capability reliable. Design partners will see the reliable version.

---

## Session 074 — 2026-03-31: Making the Machine Legible

This session started with an evaluation and ended with a working transparency layer. The evaluation was the important part.

**The intake engine is sophisticated. The user can't tell.** The system computes risk tier from a 5-condition cascade, selects between Sonnet and Haiku per turn based on 5 trigger conditions, derives mandatory governance rules from context signals, generates topic-specific probing rules based on deployment type and agent classification, tracks readiness across 3 dimensions with different weights, and enforces a capture verification gate at finalization that ensures no discussed requirement was silently dropped. None of this was visible to the user. The conversation felt like an interview — answer questions, watch blue chips appear, see a percentage climb. The user was a passenger.

**The fix is `messageMetadata`.** AI SDK v6's `toUIMessageStreamResponse` accepts a callback that attaches arbitrary JSON to each streamed message. On `finish`, the server computes a full transparency snapshot — classification signals, readiness breakdown, governance checklist, model selection reason, probing topics — and the client receives it alongside the response with zero additional latency. No polling, no new endpoints, no transport changes. The metadata is per-response, which is exactly the right granularity: after each AI turn, the sidebar updates with the latest state.

**The sidebar panels are a forcing function for trust.** When the governance checklist shows "3/6 satisfied" with specific reasons for each pending item — "compliance policy: SOX/FINRA regulatory scope" — the user knows what's expected, why, and what they need to do. When the score decomposition shows 20/50 for sections and 14/35 for governance, the user can see exactly where the gap is and what actions would close it. When the model indicator says "Sonnet — governance content detected," the user understands why this turn's response felt different from the last one. These are not decorative — they are the difference between "the AI is asking me questions" and "the AI and I are building a blueprint together, and I can see its reasoning."

**The tool call result badges close the feedback loop.** Previously, tool call chips showed what was sent (input args) but not what happened (success/failure). The user clicked the expand button and saw the raw JSON — but not whether it worked. Now "Captured" appears in green when the tool succeeds, "Failed" in red when it doesn't, and the result JSON (showing exactly what was stored) is visible on expand. This is the smallest change in the session and arguably the most impactful: it converts a write-only operation into a visible, verifiable action.

**The `.env.local` resolution was a reminder that dev environment setup is part of the product.** The transparency overhaul was code-complete for a full session before it could be verified because a single file was missing. This worktree pattern — code in one worktree, secrets in another, npm modules in a third — creates unnecessary friction. The gap-check protocol (session 073) catches documentation drift; there should be a similar check for environment completeness.

---

## Session 073 — 2026-03-31: The Gap-Check, the Merge, and What Comes Next

Session 073 is mostly about infrastructure, but the infrastructure matters.

**The logging gap reveals something about the session protocol's failure mode.** Three sessions of work — security hardening, design system evolution, intake UX fixes — were committed without creating session logs. The code was correct; the audit trail was missing. The root cause is simple: documentation was the last step, and when sessions end under time pressure or mid-task, the last step is the first to be dropped. The fix is not discipline — discipline fails under load — it is structural: add a gap-check at the start of every session that compares `_index.md` against `git log`. Claude checks for the gap before doing anything else, and creates the missing logs before starting new work. This is the correct place to put the responsibility: the beginning of the next session, not the end of the current one.

**The squash merge resolves a subtle version control problem.** The `keen-pascal` branch had 17 commits, but the branch's history was not clean — some of those commits duplicated work that had been separately committed to `main` during the same period (badge system, overview redesign). A 3-way merge would have preserved all 17 commits, including the duplicates, creating a noisy history where the same change appeared twice with different hashes. Squash merge solves this: flatten all 17 commits into 3 logical units, resolve conflicts once (there was only one: `mb-8` vs `mb-6`, took keen-pascal's version), and push to main as a fast-forward. The result is a clean, readable history. The individual commit granularity from keen-pascal is preserved in session 072's log, not in git.

**The all-conversation intake is the right call at the right moment.** The three-phase architecture — form, conversation, review — was the right design in session 009 when the product was being built to spec. Twelve months of AI product evolution later, the form feels like a gate. Users don't expect to fill out a form before talking to an AI; they expect to talk to the AI and have it figure out what it needs. The `submit_intake_context` tool is the correct technical realization of this: Claude collects context conversationally, confirms it with the user, then calls the tool once to save it. From the product's perspective, the context is still there — stored in the database, used by governance probing, visible in Phase 3 review. The implementation surface changed (tool instead of form POST); the semantic surface did not.

The cold start fix is smaller but high-impact. Every new user who started a session saw a blank chat window while the page loaded and the AI initialized. The fix — pre-populate the first message as a constant before the stream opens — costs nothing and eliminates the impression that the product is loading or broken.

**The H3 gate stands.** The strategic review this session reaffirmed: Foundry (workflow composition) and Enterprise Memory are not engineering problems waiting to be solved. They're business problems waiting to be scoped. Building them without design partners is the fastest way to build the wrong thing. The gate — 3+ enterprise partners with validated execution orchestration needs — is not bureaucracy; it's a forcing function to make sure we understand what "workflow composition" actually means to the people who will use it before we implement it.

---

## Session 072 — 2026-03-31: Making the Product Feel Like an AI Product

The all-conversation intake was the headline, but the session's character is better described as: removing the things that remind users they are using software.

The Phase 1 form was the most obvious example. It worked. It collected the right fields. But it was a form — a grid of labeled inputs with a submit button — at the moment when the product's job was to demonstrate that talking to an AI was better than filling out a form. The contradiction was architectural: the product is a governed AI factory, and its first interaction was a web form. The all-conversation path removes this contradiction at the source.

The font tokenization is less dramatic but follows the same logic. Eighty-some `text-[10px]` and `text-[11px]` scattered across 48 files are invisible to users. They are not invisible to designers. When the palette shifted from violet to indigo in session 070, the change propagated cleanly because the design tokens were centralized. If the small text sizes had needed to change — say, from 10px to 11px everywhere to improve readability at smaller viewports — there would have been no central place to change them. The tokenization is not a current fix; it is a future capability. The product can now be resized at the smallest typographic level with two lines in `globals.css`.

Accessibility is in the same category. The ARIA improvements — `aria-current="page"`, `role="navigation"`, `aria-label` on interactive controls — are not visible to most users. They are visible to screen reader users, to automated accessibility audits (Lighthouse, axe), and to enterprise procurement teams who require WCAG 2.1 AA compliance before signing contracts. None of the changes were complex; all of them were necessary for the product to be taken seriously by enterprise buyers.

The pipeline empty states are the simplest change with the clearest impact. An empty kanban column communicates nothing. It could mean: there are no agents in this stage; the data is still loading; something is wrong. "No agents in Draft" communicates one thing. It changes the product's behavior from ambiguous silence to clear signal — a small change that matters at the moment when a design partner is looking at a freshly seeded demo environment trying to understand what they're looking at.

---

## Session 071 — 2026-03-30: What Gets Fixed When the Product Is Used

Session 071 is instructive not for what was built, but for what it reveals about how production software accumulates damage in the gaps between polished sessions.

**The revision flow was entirely broken.** The "← Revise" links on the intake review page had been built, committed, and shipped in session 066b as part of a 13-item enhancement. They looked right. They tested right in isolation. But they silently didn't work: clicking them sent the user back to review — because the link was an `<a href>` pointing to the same URL, the page reloaded, and since the session status was `"completed"`, the page loaded back into review mode immediately. The fix required three coordinated changes: change the link to a button, PATCH the session status to `in_progress` on click, and switch the phase client-side without a full page reload. None of these were individually complex; their necessity was only visible when a real user tried to actually revise something after marking it complete.

The chat history vanishing on Revise was a second-order bug from the same feature. Even after the status fix, the conversation appeared blank — because `initialMessages` was only loaded for sessions not yet `"completed"`. Once reset to `"in_progress"`, the messages never came back. Both bugs together meant revision was impossible from end to end — you'd click Revise, get sent back to an empty conversation, with no way out except starting a new session.

**The landing redirect loop was a configuration error that made the product unreachable to new users.** `next.config.ts` had a redirect rule `/landing → /`. Middleware had a rule `/` → `/landing` for unauthenticated visitors. Together, these created an infinite loop: any new user trying to reach the product would get `ERR_TOO_MANY_REDIRECTS` before seeing a single pixel. This had likely been true since the landing page was added in session 048, but was only caught now — before that, all testing was done as authenticated users, who never hit the middleware redirect.

**The Badge system consolidation reflects a maturity milestone.** The unified Badge component isn't a new feature; it's a forcing function that makes the existing design consistent. The 30+ ad-hoc inline className strings that it replaced weren't a problem in session 037 when the dark sidebar was introduced, or in session 046 when the first risk tier badges appeared. They became a problem when the design needed to evolve (sessions 069–070, color palette shift) and there was no single place to update. The Badge system is the design system catching up to the implementation's breadth.

The overview redesign follows the same principle. Four separate KPI tiles were right for a product with four lifecycle stages and little else. They became wrong when governance health, quality index, and activity feed were added — the overview had grown into a collection of equally-weighted cards with no hierarchy. The compact stats strip and side-by-side layout restore the page to its intended function: an executive summary, not a feature directory.

---

## Session 070 — 2026-03-30: A Constraint Becomes a Prompt for a Better Decision

The cron downgrade is a consequence of a deployment decision: Vercel Hobby plan. The fix — change `*/15` to `0 9 * * *` — took two lines. But the session was mostly about something else.

**The color palette shift is a positioning decision, not a cosmetic one.** Violet-700 as the primary color was chosen in session 037 during the dark sidebar redesign. It was distinctive (not the blue of enterprise software) and warm (different from the cold gray of most AI tooling). Eight sessions later, with the product deployed and demonstrating to enterprise buyers, the character of that choice had shifted. Warm violet reads as creative, expressive, independent. Indigo-600 — cooler, bluer, more controlled — reads as trustworthy, stable, enterprise-grade.

The shift is subtle enough that a user switching between screenshots would notice something feels different before identifying what changed. That's the right level of change for a palette shift at this stage: significant enough to move the product positioning needle, invisible enough not to disrupt existing users.

The glass-morphism login page and gradient sidebar header are part of the same signal: this is a product that has visual craft, not just visual consistency. Enterprise buyers who evaluate software are pattern-matching against the products they know — Salesforce, Workday, ServiceNow. Those products are polished but flat. Intellios is targeting the tier of enterprise that has started buying AI-native tools: they have higher visual expectations and respond to products that demonstrate design investment.

---

## Session 069 — 2026-03-29: Why Security Audits Belong at Milestones

Session 069 was a deliberate pause. The product reached production-ready status (55/55, 100%) in session 066b. Before expanding the user base or starting the next phase of feature work, the right question is: what can go wrong?

**The audit found 7 issues. None were catastrophic. One (SEC-003) was a real attack vector.** The webhook SSRF vulnerability deserves the most attention: any admin could register a webhook pointing to an internal IP address (`192.168.x.x`, `10.x.x.x`, `172.16–31.x.x`) and use it to probe internal infrastructure. With each outbound webhook call triggered by a governance event, an attacker with admin access could map the internal network or trigger internal services. The fix — a private IP regex check in the webhook schema — is one of the patterns that should have been in the initial implementation but wasn't: SSRF is a known risk for any system that makes outbound HTTP requests to user-provided URLs.

**The failed-closed cron (SEC-001) represents a class of security thinking that's easy to miss.** The original implementation assumed that if `CRON_SECRET` was set, the cron was secure. It didn't consider the case where the environment variable is absent — which happens legitimately (new deployment, missing env config) and should fail safe, not fail open. The fix returns 503 instead of 200 when the secret is unset. This is the "fail closed" principle: when a security mechanism is unavailable, refuse to proceed rather than proceeding without protection.

**The npm audit vulnerabilities are the hidden cost of dependency management.** Five Next.js CVEs (null origin CSRF, request smuggling, unbounded buffering) had accumulates since the last audit. These aren't dramatic vulnerabilities — they require specific conditions to exploit — but they're known and patched, which means shipping code with them is indefensible once you know they exist. The automated `npm audit fix` path handled them without changes to the application code.

The deferred esbuild/drizzle-kit CVEs are an example of a legitimate risk acceptance decision. The vulnerabilities are real but limited to the development toolchain (not the production runtime), and the fix requires a breaking upgrade that would need its own session. The right call is to acknowledge them explicitly, document them in the health log, and schedule the upgrade rather than either ignoring them or rushing a breaking change.

---

## Sessions 065b–066b — 2026-03-28: Production Hardening and the Review Experience

Two sessions on the same day. The first spent almost entirely fixing the gap between what works locally and what works in production. The second on the quality of the moment just before a user commits to generating a blueprint.

**Why production fixes came first.** The classification-first intake work from Phase 38 had a fundamental assumption baked in: that fire-and-forget async works. It doesn't in Vercel serverless. The fix is simple (`await` the classification call), but the root cause is architectural: Vercel serverless is not a long-running process, and code written with that assumption breaks in ways that are invisible in local development. The postgres `max:1` fix is the same class of problem — local development typically has a single long-running server; serverless has many short-lived concurrent functions, each opening their own connection pool if not constrained. The missing `created_by` migration was a pure oversight: the column existed in the Drizzle schema from Phase 38 but was never added to production via a migration file. Every intake session creation returned HTTP 500 in production.

**UE-001–009: fixing the conversation quality.** AI behavior fixes are system prompt changes — instructions to start confirmations on new paragraphs, not skip sections when changing topics, correctly classify routing agents as Automation rather than Chatbot, and stop prefacing responses with sycophantic openers. A routing agent misclassified as a Chatbot generates a blueprint with the wrong risk tier, which affects governance gate thresholds downstream. The interface feedback fixes address the "where am I?" question in the intake flow with a pulse ring on the active section, dynamic readiness label, and click-to-expand tool chips.

**RV-001–013: the moment before commitment.** The 13 review page enhancements addressed specific friction: sticky footer with generate button, live confirmation counter, human-readable retention, per-section "← Revise" links, 3-step stepper, risk/sensitivity/regulatory badges, color-coded policy chips, denied actions blocked list. The Design System v1.1 semantic tokens make policy type chips and risk tier badges skinnable without hardcoded colors — continuing the direction from Session 064b.

---

## Session 068 — 2026-03-22: H3 Partial — Continuous Governance + Ecosystem (7/14)

This session began with a strategic decision: H3 has 14 items across 4 sprints, but only 7 are truly buildable today without live execution infrastructure or enterprise design partners. H3-1 (Foundry) and H3-2 (Memory) are explicitly gated — building a visual workflow editor and pattern extraction engine with no real execution data would be pure speculation at high cost. H3-3 (Continuous Governance) and H3-4 (Ecosystem) have no such dependency. They extend already-shipped infrastructure rather than requiring new runtime capabilities.

**H3-3: Continuous Governance** closes the gap between design-time and runtime governance. The most important piece is H3-3.1 — governance drift detection. The key insight behind the implementation is the distinction between the *approval-time baseline* (what violations existed when a compliance officer approved an agent) and the *current state* (violations against today's active policy set). A deployed agent that was clean at approval may develop new violations if policies change after deployment. Storing `baselineValidationReport` at approval time and computing the diff on every cron run is the minimal correct approach. It avoids the false positive problem (violations that existed at approval time are not "new" and should not trigger drift alerts) while correctly catching genuine policy drift.

H3-3.2 (Self-Healing) introduces the first AI-generated remediation flow. Claude proposes minimal targeted ABP changes for each violation, returning a structured diff. The design choice to *not* auto-apply the fix — requiring architect acceptance — is deliberate. Auto-apply would violate the separation of duties principle that runs throughout the product: AI generates, humans govern. The Suggested Fix panel in the Studio is a proposal, not an action.

H3-3.3 (Compliance Calendar) is operationally valuable for compliance officers managing SR 11-7 and annual policy reviews. The iCal export (`.ics`) is zero-dependency and universally supported — every calendar client (Outlook, Google Calendar, Apple Calendar) can subscribe to it. The multi-window reminder logic (30/14/7 days) replaces the single `reminderDaysBefore` setting with a fixed schedule that mirrors regulatory practice.

**H3-4: Ecosystem** is commercially important. The four items make Intellios an open platform rather than a closed appliance.

H3-4.1 (Template Marketplace) seeds the network effect: as more enterprises publish community templates, the cost of starting a new agent drops. The publish flow deliberately strips enterprise-specific data before storing the template globally — this prevents accidental data leakage across tenants when blueprints are shared.

H3-4.2 (Enterprise Integrations) is the most operationally critical. ServiceNow, Jira, and Slack/Teams are the three tools where governance actions need to appear for enterprises to trust the system. The adapter framework is designed to be extend-first: adding a new integration means implementing one interface (`IntegrationAdapter`) and adding one block to the dispatcher. The secret-masking behavior in the GET endpoint (passwords and API tokens replaced with `••••••••`) is a UX safety feature — admins can verify configuration without exposing credentials.

H3-4.3 (API-First + SDK) establishes the foundation for API-led integration. The bcrypt hashing + single-use plaintext reveal pattern for API keys is the industry standard (GitHub, Stripe, etc.) — the plaintext is shown exactly once at creation and never again. The OpenAPI 3.1 spec is the source of truth from which TypeScript and Python SDKs can be code-generated; the SDK packages themselves are deferred because they require a monorepo build setup (pnpm workspaces or equivalent) that is outside the scope of the Next.js application.

H3-4.4 (Multi-Cloud) translates ABPs to Azure AI Foundry and Google Vertex AI manifests. The adapter interface is deliberately thin — `deploy()` and `getStatus()` — which is enough to initiate deployment and poll status without coupling the application to cloud-provider-specific concepts. The actual auth implementations (service principal for Azure, service account JWT for Vertex) are scaffolded correctly but require real credentials to test against live endpoints.

**At the close of this session, the Full Vision stands at 92/103 (89%). The remaining 11 items are H3-1 (Foundry) + H3-2 (Memory) — both correctly deferred behind the design partner gate.**

---

## Session 066 — 2026-03-20: H2 Complete — Portfolio Intelligence + Governor Completeness

This session completed H2 entirely, bringing Govern at Scale to 17/17 (100%) and the Core Product to 55/55 (100%).

H2-5 delivered Portfolio Intelligence across three deliverables. The `portfolioSnapshots` table provides a weekly time-series of fleet metrics per enterprise, written by a Sunday cron. The design decision to use DELETE + INSERT rather than Drizzle's `onConflictDoUpdate` for the upsert was forced by PostgreSQL's behavior with nullable unique index columns — null != null means no conflict fires, leading to unbounded row accumulation. The non-unique index + destructive replace pattern is the correct workaround for nullable partition keys.

The Executive Dashboard (`/governor/executive`) is the first true C-suite artifact in the product — a single-page view of fleet health, compliance posture, monthly cost, at-risk agents, quality trends, and cost attribution by business unit. The PDF export via `window.print()` was a deliberate scope choice: browser print is zero-dependency, produces standards-compliant PDF, and requires no server-side rendering. The alternative (server-side PDF generation via puppeteer or a PDF library) would add significant maintenance surface with minimal user benefit for this use case.

H2-6 closed documentation debts and added three completeness items. G-17 (Governor entry point) was already implemented by H1-2 but marked "Not started" — a stale status that misrepresented the platform's maturity. Similarly, P-11 through P-14 had stale status labels (Partial/Not started) despite being fully implemented by H1 and H2. Fixing these brings the documentation in sync with code reality, which matters because the roadmap is Claude's primary source of truth for current state at the start of each session.

The Compliance Report Export API introduces the first structured audit artifact — a machine-readable JSON report covering fleet posture, policy violations, cost, and risk distribution for a given month. This is the foundation for regulatory evidence packages: compliance officers can now download a timestamped JSON record of their enterprise's governance posture for any month and attach it to audit submissions. The report API deliberately excludes any formatting — the raw JSON is the artifact, and presentation is the responsibility of downstream tooling.

The Platform Admin Fleet Overview is a super-admin-only view showing cross-enterprise fleet stats. The 403 gate is explicit and strict: admin users with an `enterpriseId` see a "super-admins only" message. This is the right design because cross-tenant data visibility should never be granted to tenant-scoped admins, even ones with full admin privileges within their tenant.

**At the close of this session, the Core Product (P+A+G+D) is 100% complete and H2 is 100% complete. The platform now covers the full governed lifecycle: design → intake → generation → governance → registry → review → deployment → runtime enforcement → observability → cost tracking → executive reporting.** The next frontier is H3 (Execution Platform) — gated on 3+ enterprise design partners with validated orchestration needs.

## Session 066 — 2026-03-20: H2-4 Artifact Family v1 (Workflow Schema + Multi-Artifact Registry)

This session's extended continuation completed H2-4.1 and H2-4.2, establishing workflows as first-class registry artifacts alongside agent blueprints.

H2-4.1 introduced the Workflow Definition Schema — a Zod-validated data model that describes multi-agent pipelines. The three core concepts are `agents` (a list of participating agents with roles and required flags), `handoffRules` (directed edges between agents with conditions and evaluation priorities), and `sharedContext` (a typed envelope of fields passed between agents). The schema is deliberately minimal: it describes orchestration structure but not execution semantics. Execution semantics belong to H3 (the Foundry runtime). The decision to separate schema from runtime was key — it lets workflow definitions be authored, reviewed, and governed before any execution infrastructure exists.

The `workflows` table mirrors the `agentBlueprints` table in structure (workflowId as logical ID, id as physical PK, status lifecycle, enterprise scoping) but uses the same status values as blueprints minus `deployed` — workflows are published, not deployed to a runtime. This deliberate omission is documented in `workflow.ts` itself.

Agent reference validation in the CRUD API is a runtime guard: every `agentId` in `definition.agents` must exist in `agentBlueprints` within the caller's enterprise scope before the workflow can be created or updated. This prevents dangling references and ensures workflows only reference real agents — essential for governance downstream.

H2-4.2 updated the registry UI to show both artifact types under a single top-level "Registry" page with Agents/Workflows tabs. The tab design is intentional: both artifact types share search and status filter mechanics, but each renders in its own list with appropriate icons and detail links. The workflow detail page (`/registry/workflow/[id]`) displays the full definition — agents with role labels and "Required" badges, handoff rules sorted by priority with condition in monospace, and shared context fields with type annotations. The Deprecate button provides the primary lifecycle control (DELETE → `status = "deprecated"`), keeping the UI lean for the MVP.

**H2 now at 59% (10/17).** The artifact family foundation is in place. H2-4.3 (Workflow Governance) is next — applying enterprise policies to workflow artifacts using the same governance evaluation engine already used for blueprints.

## Session 066 — 2026-03-20: H2-3 Enterprise SSO + JIT Provisioning

H2-3 added enterprise SSO to the platform via NextAuth v5's OIDC provider. The design acknowledges a fundamental constraint: NextAuth doesn't support per-request provider configuration. The solution is a two-layer approach: the OIDC provider is configured at platform level via env vars (`SSO_ISSUER`, `SSO_CLIENT_ID`, `SSO_CLIENT_SECRET`), while per-enterprise customisation (email domain, group-to-role mapping, attribute claim overrides) lives in the `enterprise_settings` JSON column and is consumed in the `signIn` callback.

JIT provisioning runs entirely in the `signIn` callback — the only hook NextAuth provides that can mutate the user before the session is created. The callback finds the enterprise by email domain (linear scan of `enterprise_settings` rows, acceptable given the expected scale of 1–100 enterprises), resolves the Intellios role from the IdP groups array, and either creates a new user or refreshes their display name. The provisioned user gets a random bcrypt hash as their password — a hash they can never match by guessing, preventing credential login for SSO-only users.

The SSO check endpoint (`/api/auth/sso-check?domain=`) is deliberately public: the login page calls it on email input to decide whether to show the "Continue with SSO →" button, and this needs to work before the user is authenticated. The 400ms debounce on the email field prevents unnecessary API calls.

A significant side-fix: the `governance.circuitBreaker` setting was being silently stripped on every admin settings PUT. The Zod validation schema for the settings endpoint was missing the `circuitBreaker` sub-object, so any PUT would validate and write a governance block without it. This affected circuit breaker configuration persistence. The fix adds the sub-object to the schema and changes the merge strategy from replace to deep-merge for the governance block.

## Session 066 — 2026-03-20: H1 Complete + H2 Sprint 1 (Runtime Governance Engine)

This session did two things: closed H1 (verification + documentation), then executed all four deliverables of H2 Sprint 1 in a single context.

H2-1.1 introduced the `runtime` policy type — a parallel governance track to the design-time ABP validator. Instead of asserting fields on the blueprint document, runtime policies evaluate against live telemetry aggregates: token budgets, error rates, scope constraints (comparing deployed tool list against an allowlist), and circuit-breaker thresholds. The key design decision was an operator dispatch table (`Map<RuntimeRuleOperator, OperatorFn>`) rather than a switch statement, which makes adding new operators a one-line change rather than a structural modification. The `pii_action` operator is intentionally a stub (always returns null / skip) — PII interception requires the H3 Foundry execution layer to intercept individual invocations, which doesn't exist yet. Documenting the operator now lets policy authors express intent while avoiding false violations.

H2-1.2 wired the telemetry pipeline into runtime policy evaluation. Every telemetry push now triggers `evaluateRuntimePolicies()` fire-and-forget for each affected agent. Violations are written to a new `runtimeViolations` table with operator-specific metric labels (`tokens_daily`, `avg_tokens_per_interaction`, `error_rate`, `out_of_scope_tools`). The fire-and-forget pattern is deliberate — telemetry ingest must never block on governance evaluation.

H2-1.3 built the Violations tab on the registry detail page. This is the first place in the product where runtime governance is surfaced to operators. The design mirrors the Production tab pattern: a standalone component (`ViolationsPanel`) that fetches from a dedicated API route with severity and time-range filtering. The alert wiring sends notifications and webhook events for error-severity violations only — warnings are data for the UI, not alerts.

H2-1.4 added the circuit breaker. When a deployed agent accumulates N error-severity violations in a single evaluation window (default N=3, configurable via enterprise settings `governance.circuitBreaker`), the agent is automatically suspended: its status transitions `deployed → suspended`, an audit event fires, and admins + compliance officers are notified. The `suspended` status is a new lifecycle state alongside `draft`, `in_review`, `approved`, `deployed`, `rejected`, `deprecated`. The resume path requires admin action and restarts the full approval workflow (`suspended → in_review`), preventing accidental re-deployment without human review. The `alert_only` circuit breaker mode fires notifications without suspending — for enterprises that prefer operational continuity over automatic enforcement.

The strategic significance of H2 Sprint 1: Intellios has crossed from a design-time governance platform to a continuous governance platform. Every agent that pushes telemetry is now automatically evaluated against its enterprise's runtime policies on every data push, with violations surfaced, alerted, and enforced without any human action required. This is the foundational capability that justifies the "governed control plane" positioning.

## Session 066 — 2026-03-20: H1 Complete

This session closes H1 — Close the Loop at 100% (17/17 items). The session was primarily verification and documentation: confirming that all H1-1.5 and H1-4.2 components existed in the codebase from prior sessions, tracing the webhook dispatch chain to verify D-02 was resolved at the code level, and correcting a hallucinated "H1-2.4" item and "18" total that appeared in a prior context-compaction summary. The actual H1 count is 17 items.

The most important confirmation in this session was the webhook dispatch chain trace. `publishEvent()` calls `writeAuditLog()`, which calls `dispatch()` on the in-process event bus, which invokes `webhookDispatchHandler` (registered via side-effect import), which calls `deliverWebhook()` with HMAC signing. The admin UI already has a delivery log panel. D-02 — "webhooks never actually sent" — is resolved: the two systems are now connected through the event bus at every call site that was previously a raw `writeAuditLog()` call.

With H1 closed, all five technical debt items are also resolved: D-01 (ABP schema migration) via H1-3, D-02 (webhook wiring) via H1-4.2, D-03 (Redis rate limiting) via H1-5.1, D-04 (help prompt refresh) via H1-5.3, D-05 (schema role comments) in an earlier session. The current product stands at 51/55 items complete (93%). The only remaining item before H2 is G-17 (dedicated Governor entry point), which was the UX extraction work completed in H1-2 — but the G-17 header in the G section was never updated. It should be marked complete since H1-2.1/2.2/2.3 delivered exactly what G-17 specified.

H2 — Govern at Scale — begins next. The first sprint is the Runtime Governance Engine (H2-1.1 → H2-1.2 → H2-1.3 → H2-1.4 in sequence). This is the transition from governance as a design-time property to governance as a continuous runtime property. H1 built the observability pipeline; H2 will use that data to enforce policy at runtime — blocking, suspending, or alerting based on what agents actually do in production.

## Session 065 — 2026-03-20: Sprint 5 Closed, H1 at 89%

This is a short context-continuation session. Session 064 ran out of context mid-Sprint-5; this session verified the remaining H1-1.5 components (alert CRUD API routes and cron endpoint), confirmed all DoD checkboxes were already satisfied, and resolved two TypeScript error categories introduced during Sprint 5.

The ioredis and CloudWatch type errors are structurally interesting: both are optional infrastructure integrations (Redis for rate limiting, CloudWatch for telemetry sync) where the packages are loaded at runtime via `require()` or are already installed in one case but not the other. The right fix was different in each case — for `ioredis`, replace the dynamic type annotation with `any` (ioredis is genuinely not a compile-time dependency); for `@aws-sdk/client-cloudwatch`, install the package properly since `agentcore-poller.ts` uses its types structurally throughout. This pattern — optional infrastructure with type-safe interfaces — will recur as H2 adds more integrations.

With Sprint 5 closed, H1 stands at 16 of 18 deliverables. The two remaining items are qualitatively different: H1-4.2's webhook dispatch verification requires a running webhook endpoint to test end-to-end delivery (it is not a coding task, it is an operational test); H1-2.4's Governor sub-pages are UX work with no prerequisite dependencies. H2 (Govern at Scale) and H3 (Execution Platform) await.

## Session 064 (continued, Sprint 5) — 2026-03-19: The Event Layer Closes

Sprint 5 completes four items that together close a major architectural seam: the gap between actions happening in the system and the platform knowing about them reliably.

**H1-4.2 is the most structurally significant change in Sprint 5.** The platform has had an event bus concept since early in the project — `writeAuditLog()` records actions, `IntelliosEvent` types events, webhooks exist in the schema. But until Sprint 5 the event bus was not actually wired: `writeAuditLog()` wrote to the database and nothing else happened. Webhooks were never delivered. The `publishEvent()` wrapper changes this: every action now goes through a single typed function, and the dispatch layer can be attached behind it. The 32-file migration is mechanical but important — it means the contract is enforced. Future events cannot be added without going through `publishEvent()`.

**H1-4.3 and H1-5.2 are infrastructure enablers.** The event filtering API (`GET /api/events`) makes the audit log queryable by external systems for the first time — compliance tools, SIEMs, and the future integrations in H3-4.2 all depend on this endpoint. S3 artifact caching (H1-5.2) solves a different problem: evidence packages and MRM reports are expensive to generate and were regenerated on every request. The S3 cache with signed URL redirect means repeat requests serve a cached artifact at no AI cost. Both are opt-in via environment variables, so local development is unaffected.

**H1-1.5 closes the production monitoring story.** H1-1.1 through H1-1.4 built the telemetry pipeline, CloudWatch sync, production dashboard UI, and health status integration. H1-1.5 adds the alert layer: operators can now configure thresholds (error rate > 5% over 60 minutes, zero invocations over 30 minutes, etc.) and the cron job evaluates them fleet-wide every 15 minutes. Breaches generate in-app notifications for compliance officers and admins, and fire `blueprint.threshold_alert` events through the event bus. The threshold management UI is embedded directly in the production dashboard, where it belongs — operators configure alerting in the same view where they monitor production metrics.

**The architectural pattern is now complete for H1-1.** The pipeline is: ingest → aggregate → health → alert → notify. Each step was built in a separate sprint, but they compose into a coherent system. An agent deployed to AgentCore pushes metrics via the telemetry API; the CloudWatch poller supplements with hourly aggregates; the health check integrates those signals into governance status; threshold alert rules define the operator's expectations; the cron job fires when reality diverges from expectations. This is the minimum viable observability loop for a production AI agent.

## Session 064 (continued) — 2026-03-19: The Observability Stack Completes

The second half of session 064 completes the four items in Sprint 4 of the H1 plan: combined health status (H1-1.4), role-based routing (H1-2.2), the governor home dashboard (H1-2.3), and migrate-on-read integration for the generation engine (H1-3.3). Together these four items close what was the last gap in the H1-1 observability stack and establish the Governor as a navigable product.

**H1-1.4 is the payoff for two sprints of infrastructure work.** H1-1.1 added the telemetry data model and ingestion API. H1-1.2 wired CloudWatch to Intellios for AgentCore deployments. H1-1.3 built the production dashboard UI. H1-1.4 closes the loop by making telemetry influence the governance health status that operators already watch. Before this change, a deployed agent with a 25% error rate would show "clean" in the monitor if it had no governance violations. After this change, it correctly shows "critical." The combined health logic — governance errors OR production signal — is the design: governance and production health are not separate concerns, they are two dimensions of the same question: "is this agent doing what it was designed to do, safely?"

**H1-2.2 and H1-2.3 make the Governor product navigable.** The governor layout and navigation were built in H1-2.1 (Sprint 3), but two things were still missing: reviewers landing on `/` instead of `/governor` after login, and the governor home being a placeholder. Both are now fixed. The server-side redirect in `src/app/page.tsx` is a one-liner but has outsized impact — it means reviewer and compliance officer roles never have to navigate to the governor; they start there. The governor home dashboard aggregates the four data sources a compliance officer needs for a morning review: pending approvals, policy health, fleet compliance posture, and recent audit activity. The implementation uses the same data-fetching pattern used throughout the platform, keeping the codebase coherent.

**H1-3.3 completes the schema migration integration.** The migrate-on-read pattern established in H1-3.1 (migration framework) and H1-3.2 (v1.1.0 schema) is only meaningful if all code that reads blueprints from the database uses `readABP()` instead of raw casts. This sweep replaced all nine `as ABP` cast sites in the server-side codebase. New blueprints generated by the engine now carry `version: "1.1.0"` and a populated `execution` section. Refinement preserves the execution config rather than discarding it. The generation prompt instructs Claude to vary log level and circuit breaker threshold by risk tier, so the execution section has business meaning, not just defaults.

**TypeScript revealed six latent bugs.** The tsc fix pass is not overhead — it is the system's immune response. Three of the six errors (`reload` not in AI SDK v5, `designer` variable in report.ts, `enabled` not in `AgentCoreConfig`) were pre-existing bugs in code written earlier in the session that only became visible at typecheck time. The `z.record()` Zod v4 signature change and the nested `.default({})` issue are framework-level changes that would have caused silent runtime failures. Running typecheck after every sprint, not just at the end, is the right discipline.

## Session 064 — 2026-03-19: Making the Invisible Visible

Phase 54 addresses a category of waste that is easy to overlook in a system that is growing quickly: intelligence that is computed but never surfaced. Intellios has been calculating five-dimensional blueprint quality scores since early in the project — running costly AI evaluations against every blueprint that passes review, scoring intent alignment, tool appropriateness, instruction specificity, governance adequacy, and ownership completeness on a 1–5 scale. Until this session, every one of those scores was written to the database and never displayed anywhere. A designer submitting their tenth blueprint had no more visibility into quality than they had on their first.

**Why the gap existed.** The quality scoring subsystem was built as infrastructure: the evaluation runs, the scores persist, the flags attach. But the evaluation was added before the registry detail page had a tab system, and when tabs were introduced in a later phase, quality wasn't included because the UI work wasn't in scope for that session. The gap is a product of incremental development: each session adds value in its own scope, but coordination across scopes requires someone to specifically look for what's missing. The T0 audit (which preceded this session's plan) was that coordination mechanism.

**The design principle: use what you have.** None of the three features implemented in this session required a new data model or a new AI call. The quality scores were already in `blueprintQualityScores`. The agents were already in the registry. The blueprint refinement logic (`refineBlueprint()`) was already built and working. The session's entire value came from connecting existing data to existing UI surfaces — a `QualityDashboard` component that reads what was always there, a command palette search that queries the registry that was always there, a streaming chat that calls the refinement function that was always there.

**The refinement chat is the most consequential change.** A single-shot textarea for blueprint refinement has a fundamental UX problem: the designer submits a change, waits for the full generateObject call to complete, sees a "Refined." confirmation, and has to re-read the entire blueprint to understand what changed. There is no feedback loop, no conversation, no explanation of what was actually modified and why. The streaming chat inverts this: the AI completes the structural change (generateObject, blocking, persisted immediately), then streams a 2-3 sentence narrative explaining what it did. The designer reads the explanation while the blueprint panel updates. The interaction is closer to working with a collaborator than submitting a form.

**The command palette as a navigation shortcut.** The agent search feature is smaller in scope but solves a real friction point: in a fleet with dozens of agents, navigating to a specific agent required clicking Registry, scanning the list, and clicking through to the detail page. The command palette search makes any agent reachable in 2-3 keystrokes from anywhere in the application. The implementation is intentionally simple — fetch all agents, filter client-side — because the registry is enterprise-scoped and typical fleet sizes don't require server-side pagination for a 5-result dropdown. The right complexity is the minimum needed.

**What this session reveals about the audit process.** The T0/T1 framework (T0 = data exists, UI missing; T1 = critical UX blockers) is a useful diagnostic. T0 gaps are especially painful because the investment has already been made — the AI call was paid for, the data was stored — and the return is zero because no one can see the result. Auditing for T0 gaps before planning new features is a way to capture returns on investments that were already made. Three of the four T0 gaps identified in the audit turned out to be already fixed (T0-2, T0-3, T0-4 were found present during implementation), which is itself a signal: the system has been growing fast enough that not all implemented features are tracked in the plan.

## Session 063 — 2026-03-17: The Role That Signs the Contract

Phase 53 addresses a structural problem that had been accumulating since the project's first role model decision: Intellios had four roles, but they behaved like a privilege ladder rather than a set of functional specializations. The most urgent symptom was the CRO/CISO access gap: giving a board-level stakeholder read-only visibility required making them `admin`, which also granted user management, enterprise settings, and AgentCore deployment authority. No enterprise security team accepts this. The `viewer` role is the minimum viable change to make the product usable by the people who sign purchase orders.

**Why this matters for procurement.** The people who approve enterprise software purchases at regulated institutions are not the people who operate it. The CISO needs to see the compliance posture before recommending the purchase. The CRO needs to see the risk dashboard during the evaluation period. The external auditor needs to access evidence packages during due diligence. Before Phase 53, all three of these stakeholders required an `admin` account to do any of this — and any IT security review would immediately flag admin access as unacceptable for a read-only role. The viewer role is what makes Intellios procurement-compatible.

**The principle of least privilege, applied.** The viewer role is strictly additive to read endpoints — it does not get any write, approve, deploy, or trigger capabilities. Specifically: no policy management (read governance policies, yes; create/edit/delete, no), no health check triggers (view monitoring intelligence, yes; POST to run a health check, no), no approval authority (view audit trail and evidence packages, yes; approve blueprints, no). The line was drawn not at "what is safe" but at "what is needed to read fleet posture without any side effects." The result is a role that can be assigned to a CISO, CRO, board member, or external examiner without any governance review of what they might do.

**The code export gap was a compliance risk, not an inconsistency.** The same session fixed a separate issue: `GET /api/blueprints/[id]/export/code` had no status gate, while the AgentCore export and compliance export both enforced `approved | deployed`. This meant a designer could export TypeScript agent code from a draft blueprint with active governance violations. Code export is the most actionable artifact in the system — it can be put into production immediately. The fact that it was ungated was not an oversight that would be caught in a normal code review; it required thinking through the full artifact-to-production path. The fix is one guard clause, but the reasoning required treating code export as a regulatory boundary, not just an API endpoint.

**What this session reveals about the current role model.** The analysis produced seven recommendations. Three were immediate (Recs 1, 3, 4 — all implemented). The remaining four were deferred: designer feedback loop (Phase 54), reviewer monitoring access (Phase 55), split admin roles (Phase 56+), and enterprise-configurable permissions (long-term). The deferral is deliberate: the first three solve customer-facing problems with low effort and low risk. The deferred recommendations require more investment and should wait for evidence that the problem they solve is actually blocking customers — not just that it would be better to have them.

## Session 062 — 2026-03-17: The Audit Trail That Closes the Loop

Phase 52 completes the three-action strategic plan identified in the Phase 49 evaluation. The plan had a specific sequence: first make Intellios defensible to examiners (Evidence Package, Phase 50), then make it visible to the buyer (Fleet Dashboard, Phase 51), then make it accurate across the agent lifecycle (Blueprint Lineage, Phase 52). Each phase addressed a different stakeholder at a different moment in the procurement and regulatory cycle. Phase 52 is the one that makes the others durable.

**The question regulators actually ask.** When an examiner reviews an AI governance program, per-agent documentation is the baseline expectation. What separates adequate programs from defensible ones is change management. "This agent was modified in Q3. What changed? Did the change trigger re-validation? Who approved it? Where is the evidence?" Without version lineage, the answer is: "We don't know." With Phase 52, the answer is: "v1 → v2 on March 17: governance metadata updated, 0 structural changes — patch significance. v2 → v3 in June: tool `payment_processor` added — constraint re-validation required; here is the re-validation report."

**Why the diff is computed at creation time.** The governance diff is not computed when the user views the lineage panel — it's computed when the new version is created and stored permanently. This is the only acceptable approach for regulatory evidence. A diff recomputed on display could theoretically return a different result if the underlying ABP fields were ever modified (they shouldn't be, but auditability requires that you can't even ask the question). The stored diff is an immutable record of what changed at the moment it changed. If an examiner asks what was different between v1 and v2 on March 17, the answer is the same whether they ask today or in three years.

**The significance model is a governance routing layer.** Significance (major/minor/patch) is not just a display label — it's the mechanism by which the diff drives governance behavior. Governance section changes → re-validation required. Instruction/capability changes → safety policy review triggered. Tool set changes → constraint re-validation recommended. Identity/metadata only → no additional governance action needed. This mapping is deterministic and static, which is the point: a regulator can understand why a particular change triggered a particular governance action without relying on probabilistic reasoning. The mapping is the policy.

**Three actions, three stakeholders, one product.** The Evidence Package Export answers the examiner's question ("show me the governance documentation for this agent"). The Fleet Governance Dashboard answers the CRO's question ("what is our current AI risk exposure?"). Blueprint Lineage answers the auditor's question ("what changed, when, and how was it governed?"). Together they make Intellios a complete regulatory defense system — not just a process tool. The principal architect evaluation from Phase 49 identified these three gaps as the highest-value additions; Phase 50, 51, and 52 closed all three in a single session day, with no new data models required in any of them. The data infrastructure was already there. The work was making it speak to the people who need to hear it.

## Session 061 — 2026-03-17: Making the CRO's Question Answerable

Phase 51 completes the second of the three strategic actions identified in the Phase 49 evaluation. The buyer/user mismatch is now addressed from two directions: Phase 50 gave the designer an artifact to show the CRO; Phase 51 gives the CRO a view they can own directly.

**The question this answers.** The CRO's mental model for AI risk is not "show me any agent's compliance report." It's "what is our current exposure across all deployed AI?" — a fleet question, not a per-agent question. Intellios previously had no answer to this question. The admin Overview showed pipeline counts (1 in review, 2 approved) — useful for operations, invisible to risk. Phase 51 replaces this with: 0 Critical / 1 High / 3 Medium / 0 Low risk agents deployed, with per-agent governance health and one-click drill-down to any evidence package.

**Why no new data was needed.** This is the second phase in a row that required no new data model. The risk tier came from intake classification (already stored at Phase 43) or policy-type logic (same derivation used by the MRM report). Governance health came from `validationReport.violations` (written by the governance validator since Phase 5). Overdue reviews came from `nextReviewDue` (added in Phase 36 for SR 11-7 compliance). The data infrastructure for the fleet view was built over many phases without anyone building the fleet view itself. Phase 51 is the presentation layer that makes those investments visible to the right person.

**The risk tier fallback is an intentional architectural choice.** The seeded demo data predates Phase 43 classification — all have `null` intake risk tiers. The fallback derives tier from governance policy coverage: safety + compliance policies → High, one → Medium, neither → Low. This is the same logic the MRM report uses. The consistency is deliberate: the risk tier on the fleet dashboard matches the risk tier in the compliance document, so there's no explaining discrepancies to regulators. A single derivation path, used everywhere.

**The three strategic actions are now two-thirds complete.** Evidence Package Export (Phase 50) makes Intellios defensible to examiners. Fleet Governance Dashboard (Phase 51) makes Intellios visible to the buyer who signs the contract. Blueprint Lineage with Governance Diff (Phase 52) — the remaining action — makes Intellios accurate across the agent lifecycle by answering "what changed between versions, and was the change properly governed?" That's the next natural phase.

## Session 060 — 2026-03-17: The Artifact That Closes Contracts

Phase 50 is architecturally small — one new route, one UI section — but strategically it's the most important addition since the MRM compliance report. The strategic evaluation in session 059 identified a fatal blind spot: Intellios optimizes for the designer (the user) but the budget holder (the CRO/CISO) has never seen a single screen. Evidence Package Export directly addresses this.

**Why this matters more than it looks.** The MRM compliance report already existed. The 14-section governance document, the regulatory framework assessment, the audit chain — all of this was already built and accessible via `/blueprints/[id]/report`. The compliance export route also existed but was gated to `compliance_officer | admin`. What didn't exist was a path from the designer's hands to the CRO's hands. The designer in Blueprint Studio has no obvious way to say "here, look at this artifact, this is why you should approve the spend." Phase 50 creates that path.

**The framing matters as much as the function.** The UI section is called "Audit Evidence" with an "EXAM-READY" badge, not "Download JSON." The copy says "This agent has a complete governance record — ready for regulatory examination." This framing is deliberate: the designer needs language to show their CRO, not just a download button. The word "exam-ready" is doing work — it implies an external examiner could arrive tomorrow and the artifact would hold.

**The role access decision reflects the buyer/user mismatch.** The existing compliance export required `compliance_officer | admin`. That made sense for a tool designed around the compliance function. The evidence package is designed around the sales motion: the designer needs to show it to their CRO to justify the procurement. If the designer can't export it, the artifact doesn't reach the buyer. Opening access to `designer | reviewer | compliance_officer | admin` — anyone authenticated with enterprise access — removes this barrier. The status gate (approved/deployed only) remains the quality control.

**No new data, just new access patterns.** Everything in the evidence package existed already: the MRM report assembler, the approval chain in `approvalProgress`, the quality scores, the test runs. Phase 50 is a UI + access model change that makes existing governance infrastructure visible to the people who need to see it. This is a pattern worth noting for Phase 51 and 52: the data already exists in almost every case. The work is surfacing it at the right time, to the right person, in the right frame.

## Session 059 — 2026-03-17: Teaching the Intake to Read the Room

Phase 49 addresses a gap that was invisible until you tried to onboard a business user: the intake was built by engineers, for an abstract "designer" persona, and it showed. It asked the same questions the same way regardless of who was answering. A Compliance Officer who has never thought about API authentication gets the same opening prompt as a software architect who has built three integrations. A first-time user who types "I don't know" gets no more guidance than an expert who writes a dense technical specification.

**The insight behind adaptive mode.** Expertise detection works because technical and business vocabularies rarely overlap. The word "OAuth" appears in engineering discussions, not business ones. The word "customer" appears in business discussions at much higher density than in engineering ones. A few signals — vocabulary hits, average message length, uncertainty phrases — are enough to classify the designer into one of three registers with useful accuracy. The classification happens after turn 2 (enough data to score) and persists to the database so subsequent turns don't re-detect. The classification affects both the system prompt (communication style block) and model routing (Guided mode gets Sonnet for the first 6 turns — the richer language quality matters most when onboarding).

**Topic probing vs. governance probing.** The existing governance probing rules are signal-derived and hard-enforced (they block finalization). The new topic probing rules are soft advisory — they suggest areas to explore but don't block. This distinction matters. Whether a customer-facing agent has a defined fallback behavior is important but not a governance compliance question. Whether an autonomous agent has human oversight checkpoints is critical — but whether the override mechanism uses a flag or a UI button is an implementation detail the designer can defer. The probing rules surface these questions in the right phase (conversation, not finalization review) without turning them into checkboxes.

**Readiness score as a confidence proxy.** The score (0-100, three dimensions: section coverage, governance depth, specificity) gives the designer a real-time signal of completeness without requiring them to know what "complete" looks like for their risk tier. A low-risk agent where governance is optional reaches 100 much earlier than a critical-risk agent that needs all 5 policy types. The thresholds (15/50/80) were tuned so that "building" covers the productive middle ground where most of the work happens, and "ready" is genuinely rare — reserved for sessions that are actually comprehensive.

**Completeness Map as trust architecture.** The map in Phase 3 is the answer to the stakeholder question "did the intake discover everything?" It makes the system's completeness reasoning visible: why a domain is required (the trigger reason), whether it has stakeholder input (the ★ badge), whether it has items but below the expected depth (sparse = amber). A Compliance Officer reviewing the map can see at a glance that the governance section has 2 policies but the risk tier expects 5, and that the audit domain is required because of PII sensitivity. This transparency is what transforms "trust the AI" into "verify the AI's reasoning."

## Session 058 — 2026-03-17: Bringing Stakeholders Into the Room

Phase 48 is the most architecturally significant addition since the Intake Engine itself. It solves a problem that was invisible before but becomes obvious once you see it: the intake process was a monologue. The designer talked to an AI, gathered their own understanding, and produced a blueprint. Everyone else — the Compliance Officer who'd have to audit it, the IT Lead who'd have to run it, the Legal team who'd have to approve it — had no voice until after the blueprint existed and was submitted for review. The review phase then became adversarial: reviewers rejecting work they hadn't shaped, requesting changes that could have been requirements.

The Stakeholder Collaboration Workspace inverts this. Domain experts contribute requirements *before* the blueprint exists, not after. Their input shapes the design rather than constraining it retroactively.

**The RACI model as authority encoding.** The most interesting design decision in this phase is using RACI roles not just as labels but as behavioral signals to the AI interviewer. An Accountable stakeholder has final decision-making authority — their interview should surface non-negotiables and hard constraints. A Responsible owner is operationally accountable for delivery — their interview should focus on implementation requirements and feasibility. A Consulted expert provides domain knowledge — the interview should go deep on technical specifics. An Informed stakeholder just needs to be kept aware — the interview should focus on dependencies and concerns. The same AI model conducts all four interviews but with fundamentally different orientations.

**Shared synthesis as coordination infrastructure.** Each stakeholder's AI interview receives the current synthesis as context. This solves a real coordination problem: without this, the third stakeholder to contribute would answer questions the first two already answered, and the AI would have no way to ask follow-up questions that build on prior input. With the synthesis, the AI can say "the Compliance Officer has established that EU data residency is required — how does that affect your infrastructure design?" Stakeholders don't see each other's raw contributions (privacy), but they see the agreed-upon synthesis (transparency). This is the same principle as good meeting facilitation: you don't need to show everyone's notes, but you do need to keep everyone on the same page.

**The AI Orchestrator as proactive coordinator.** The orchestrator is what makes this a collaboration system rather than just a collection of separate interviews. After each contribution, it generates four types of insights: synthesis (updated shared understanding), conflicts (contradictions between stakeholders), gaps (domains or questions not yet addressed), and suggestions (specific next actions for the designer to approve). The suggestion type is particularly powerful — it closes the loop from "the AI noticed something missing" to "an invitation was sent to fill that gap." The designer is in the loop (they approve suggestions before actions are taken) but the cognitive work of noticing the gap and formulating the response is done by the orchestrator.

**Token-based public access without account friction.** The decision to use token-based URLs rather than requiring account creation is about removing activation friction. If every invited stakeholder had to create an Intellios account before contributing, many would drop off. The 32-byte hex token is long enough to be cryptographically unguessable and short enough to work as a URL. The 7-day expiry creates appropriate urgency without being punitive. The public workspace has no Intellios chrome (no sidebar, no authenticated nav) — it looks like a standalone tool, not an enterprise platform the stakeholder has been asked to sign up for.

**The verification story.** The feature works. The Compliance domain row shows the RACI badge and invitee name after invitation creation. The public workspace loads at `/contribute/[token]` with no authentication. The AI immediately asks a context-aware question about regulatory frameworks and lending regulations — because it knows this is a loan calculator agent, it knows the stakeholder is the Compliance expert, and it knows they're Consulted (domain expertise). The right panel correctly shows "You're the first contributor" for a first invitation.

What's next for this flow: running a multi-stakeholder scenario (invite 2-3 people, have them each contribute, watch the orchestrator generate conflict and gap insights, see the insights panel populate for the designer). The infrastructure is fully in place for that.

## Session 056 — 2026-03-16: Making Data-Dense Screens Readable

This session was a focused visual polish pass — four improvements targeting the most information-dense pages in the app, each addressing a specific readability or usability gap that only becomes visible when the data is real.

**Deduplication as information compression.** The Workspace Activity feed is designed to show "what's happening," but 25 consecutive identical rows communicates nothing — it's noise, not signal. The `groupItems()` deduplication is interesting because it's not just a cosmetic fix; it's a data interpretation layer. It answers the question "how should we interpret a burst of the same event?" with "this is one thing that happened many times" rather than "these are 25 separate things." The ×N badge makes the count visible without hiding it. This matters: an audit trail should never suppress information, only organize it.

**Hierarchy in the User Management table.** The previous table treated name, email, role, joined date, and actions as five equal columns. But they're not equal — name+email are the identity (primary), role is the key governance attribute (secondary), joined is peripheral context. The redesign's 3-column `[3fr_2fr_1fr]` grid encodes this hierarchy spatially. The two-line user cell (name bold, email small below) is the two-line row pattern that's now consistent across the app: intake sessions, activity feed, registry entries, and now user management all use the same visual language. The hover-reveal edit icon is a small but meaningful change: showing edit controls at all times adds visual clutter for a low-frequency action; revealing on hover keeps the table scannable.

**Empty states over empty charts.** The Compliance Trends section had 6 rows of empty bars — technically accurate (the data is zero) but visually misleading (the bars imply the data structure was populated, just with zeroes). An empty state with a clear message is more honest: "this section doesn't have data yet" rather than "this data exists and happens to be zero everywhere." The check is simple (`every(m => m.count === 0)`) but the decision to prioritize it requires recognizing that an empty bar chart communicates the wrong thing.

**The anatomy of a good row component.** The Intake Sessions fix surfaces a general principle: metadata should travel with the item it describes, not float independently on the right. The old design had creator email + timestamp as a separate right-side element, which meant the row had two focal points competing for attention. The new design has one focal point (the content area) with three layers of decreasing prominence: agent name (primary, `text-gray-900`), purpose or status note (secondary, `text-gray-500`), and `"by [username] · [timeAgo]"` (tertiary, `text-gray-300`). The right side is reserved for navigation affordances (tags, chevron) — things that tell you what to do next, not things that describe what you're looking at.

## Session 055 — 2026-03-16: From Q&A to Action-Capable Copilot

Phase 47 upgrades the help panel from a one-shot question answerer to a genuine action-capable copilot. The session produced three distinct improvements, each building on the last.

**Multi-turn memory.** The Phase 46 panel was stateless — every question was independent, follow-ups lost all context. The architectural upgrade is minimal in code but significant in behavior: the endpoint switches from `prompt:` (one-shot) to `messages:` (full history via `convertToModelMessages()`), and the response format switches to `toUIMessageStreamResponse()` (structured UIMessage SSE). On the client, `useChat()` replaces the manual `ReadableStream` decoder. The `DefaultChatTransport({ body: { pathname } })` in `useMemo([pathname])` ensures each request carries the current page context even as the user navigates.

**Action capability.** After seeing the multi-turn copilot working, the user immediately asked: "yes I would like it to be action capable." This is the insight that turns a help panel into a productivity tool. When the model knows where the user should go next, it can surface a clickable navigation card directly in the response — not just "go to the Governance page" as text, but a button that actually takes you there and closes the panel. The `suggest_action` tool with `inputSchema: zodSchema(...)` (matching the AI SDK v6 pattern from intake tools) enables this. The violet card with `ArrowRight` is visually distinct from the conversation bubbles, making it easy to spot and click.

**Role-aware suggestions.** A shared screenshot revealed a subtle bug: the designer role was seeing admin suggestion cards on the Overview page. The root cause was that `SUGGESTED_QUESTIONS["/"]` only defined admin questions, and `FALLBACK_QUESTIONS` was a flat `string[]` (not role-keyed), so the fallback path always resolved to admin. The fix required both expanding the `"/"` entry to cover all 4 roles and converting `FALLBACK_QUESTIONS` to a `Record<string, string[]>`. A small change, but the kind of bug that quietly erodes trust in the product — a designer who sees admin questions thinks the system doesn't know who they are.

**Recent Activity redesign.** The admin Overview's Recent Activity section was showing raw email addresses and "—" for null values in a flat 5-column row. The user circled it as needing work. The redesign collapses it to two-line rows: agent name prominent on line 1; `"by [username] · [timeAgo]"` in muted text on line 2 (username extracted from the part before `@`). Status badge stays right-aligned. The change removes all the visual noise while preserving all the information — and eliminates the "—" pattern entirely since the metadata line just omits the author when null.

The session also required navigating three distinct TypeScript errors in the AI SDK v6 tool definition API — `maxSteps` (doesn't exist, replaced by `stopWhen: stepCountIs(2)`), `parameters:` (wrong key, replaced by `inputSchema: zodSchema(...)`) and a null-safety crash in `extractAction` when `part.input` is `undefined` during streaming. These errors are all non-obvious from the docs and worth knowing for the next time tools are added to a streaming endpoint.

## Session 054 — 2026-03-16: Giving Users a Voice in Their Own UI

Phase 46 adds the first help infrastructure Intellios has ever had. This is notable not because it's technically complex — two files, one modified — but because its absence had been a silent friction cost embedded in every session.

The key design decision was to make the help panel contextual rather than generic. A static FAQ or link to documentation would answer the wrong question 80% of the time. What users need is not a list of everything Intellios can do; they need the 4 most relevant things for where they are right now and who they are. A compliance officer on the Compliance page has completely different questions than a designer on the Intake page. That distinction is encoded entirely client-side — `usePathname()` plus role — so the panel opens instantly, with no loading state and no API round-trip.

The streaming choice matters too. A help panel that makes you wait 1.5 seconds for a response before anything appears is psychologically different from one that starts responding in 200ms. `claude-haiku-4-5-20251001` + `toTextStreamResponse()` makes the latency imperceptible. Users see the first words as the model generates them.

The system prompt in `buildHelpSystemPrompt()` is deliberately dense — it covers all 5 subsystems, all lifecycle states, all 4 roles, all risk tiers, agent types, governance concepts, and per-role workflows. The tradeoff: Haiku has 400 token output ceiling here, which forces conciseness. The goal is 2–4 sentences of directly useful guidance, not a treatise. Role and pathname are injected verbatim so the model knows whether to answer from a designer's perspective or a compliance officer's, and whether to reference the current page specifically.

The trigger location — next to sign-out in the sidebar footer — is intentional. It's accessible from any page without taking up navigation real estate. It doesn't compete with the main nav for attention, but it's always reachable.

## Session 053 — 2026-03-16: Closing the Gap Between Settings and Behavior

Phase 45 targets a different kind of gap than the last two phases: not missing UI or unconnected data, but settings that existed, were persisted, and had no effect on behavior. The notification settings are the clearest example. Admins could disable `notifyOnApproval` in the Settings UI, hit Save, see the change persist — and then still receive every approval email, unchanged. The settings table and the notification handler were written independently, and nobody connected them. This is a trust problem. A user who toggles a preference expects that preference to be honored.

The fix in `handler.ts` is structurally minimal — one `getEnterpriseSettings()` call at the top of the event handler, one `if (emailEnabled)` check wrapping each `sendEmail()` block — but its significance is disproportionate. `createNotification()` remains unconditional because in-app notifications are free, instant, and low-interruption. Email is high-interruption and should be user-controllable. The distinction matters.

The `adminEmail` CC pattern adds a second, previously broken feature in the same stroke: the Settings UI has an "Admin notification email" field that was never consulted. High-visibility events (approved, deployed) now CC that address when configured and when email is enabled.

Blueprint regeneration addresses a structural limitation of the designer experience. Refinement is iterative improvement — it assumes the initial generation was directionally correct. But if the intake produced a misclassified agent type, or the generation went structurally off-track, no amount of incremental refinement gets it back on course. Regeneration is a different primitive: start over from the same intake data, with the same pipeline, and get a fresh output. The route deliberately updates the existing draft row (no new DB row) because the "version" concept in Intellios represents a governance lifecycle unit, not a generation attempt. Starting over on a draft is not a version change — it's the same draft being rebuilt.

The confirm flow (amber warning box, two-step, "Yes, Regenerate" in red) is intentional friction. Regeneration is destructive to any manual refinements. The designer should understand what they're doing.

The registry status polling is 4 lines of code that address a real multi-user workflow problem. When a reviewer approves a blueprint in one tab, the designer in another tab still sees "In Review" until they manually refresh. In a review workflow with SLA tracking, that gap matters. The `document.visibilityState` check ensures background tabs don't add unnecessary server load.

## Session 052 — 2026-03-16: Making the Invisible Visible

Phase 44 follows a pattern that has now recurred twice: the most valuable work is not building new features, but surfacing what already exists. Three gaps, three different layers of the stack.

The middleware gap was a silent failure mode. `proxy.ts` was fully production-complete — auth checks, public path bypasses, request-ID injection, role-based redirects — but Next.js only loads files named `middleware.ts`. Every request to the application was effectively unprotected at the edge layer. The database-level auth in each route handler was still doing its job, but the middleware layer — responsible for redirecting unauthenticated visitors and injecting request IDs — had never run. One `git mv` corrected this. No code changes required; only the filename was wrong.

The Versions tab gap is a data availability problem. The `validationReport` field is fetched with every blueprint version in the tab query. It has always been there. But the table rendered only version number, status, refinement count, and created date — the operators comparing versions had no quality signal without navigating into each one individually. The new Governance column shows a Pass/Fail badge (from `report.valid`) and separate error-count and warning-count badges (from `report.violations` filtered by severity). This is the kind of column that changes decision-making: an operator can now see at a glance whether v2 regressed on governance relative to v1 before deciding whether to deploy.

The Quality Index gap is a discoverability problem. The governance health score has existed since the Intelligence Monitor was built. It runs continuously via the awareness metrics worker. But it was only visible on one dedicated page that most operators never visit — the `/monitor/intelligence` page, which sits three clicks deep in the navigation. The admin Overview is the first thing an admin sees every session. Adding the Quality Index KPI card there — pulled directly from `getRecentSnapshots()` in the server component — means governance health is no longer something you have to go looking for. The number is 76/100 today with a +6 delta, meaning the portfolio improved since the last snapshot.

The thread running through all three phases is the same: Intellios is at a point in development where the architecture is substantially complete. The next frontier is not features but reach — ensuring that the features that exist are discoverable, connected, and surfaced at the right moment in the operator workflow. The next audit pass will likely find more of the same.

## Session 051 — 2026-03-16: Closing the Gaps We Left Open

Every product accumulates orphaned work — features fully built but never connected, APIs written but missing their counterpart. Phase 43 was a systematic audit of what existed in the codebase versus what was actually reachable by users. Three gaps surfaced, each with a different character.

The notification bell is the most embarrassing kind of gap: the entire system was built in Phase 3 — DB table, event bus, notification handler, store, `GET/PATCH /api/notifications`, and the `NotificationBell` component with 30s polling, unread count badge, and dropdown panel. Then `sidebar.tsx` imported `Bell` from lucide-react but never used it, and `NotificationBell` was never imported anywhere. The fix was one import and one JSX element. Six lines of code to activate months of backend work. Users have been receiving notifications that were invisible to them.

The version diff gap was more subtle. The `diffABP()` engine was complete. The `VersionDiff` component was complete. The registry detail page already had the compare dropdown rendered with state. The API route — discovered during the audit — also already existed. The feature was fully functional end-to-end. The roadmap still said "Not started." Lesson: the roadmap needs to reflect reality, not just what was planned.

The blueprint iteration gap is the one that actually required new code. Intellios governs the full lifecycle of an agent: intake → draft → in_review → approved → deployed. But what happens when a deployed agent needs to change? Before this session, the only option was "clone" — which creates a new logical agent with a new `agentId`. That's forking, not iteration. A new version of the same agent should share the same `agentId` (same logical entity, same governance history), with an incremented version number and a clean lifecycle state for the new iteration. The `new-version` route implements this: major semver bump ("1.0.0" → "2.0.0"), draft status, all approval/review/deployment fields cleared, validation report null (needs fresh validation). The "Create New Version" button appears only for approved or deployed versions — you can't iterate on a draft, and a rejected version should be fixed rather than versioned.

The strategic point of this phase is that the product has become complex enough that the limiting factor is no longer "build more features" — it's "make sure what's already built is actually reachable." Future development should include a periodic audit pass similar to what generated this session's work list.

## Session 050 — 2026-03-16: Reducing Friction, Adding Transparency

The product acquired its first two growth mechanisms last session: self-service registration (anyone can sign up) and adversarial red-teaming (anyone can test what they build). Phase 42 addresses the inevitable next problem: a new customer signs up, lands on an empty registry, and has to figure out what to build first. The activation gap — the distance between "account created" and "value experienced" — is where most B2B SaaS products lose new customers.

The Blueprint Template Library closes that gap. Six production-ready agent starters cover the domains that matter to Intellios's target customer: retail banking customer service, regulatory Q&A, contract document review, loan pre-screening, AML alert triage, and HR policy support. Each template ships with a complete ABP — real system prompts that capture actual operational scope boundaries, 2–3 tool stubs that represent how these agents actually integrate with enterprise systems, and constraint sets that reflect the regulatory and governance requirements of the domain. These are not toy examples. The AML Alert Triage template's denied actions include things like "File a SAR or make a final determination on suspicious activity" — constraints that a compliance team would actually need.

The one-click use flow has an interesting constraint: the `agentBlueprints.sessionId` column is NOT NULL with a foreign key to `intakeSessions`. This design reflects the original assumption that every blueprint must trace to an intake session — a governance requirement. Templates don't have a source intake session, but the constraint still applies. The solution is a stub intake session row inserted inside the same transaction, with `intakePayload.source = "template"` as a marker. The blueprint traces to something; it's just not an interactive intake conversation.

This design preserves the invariant (every blueprint has an intake session) while being transparent about what happened (it was a template use, not an intake session). The audit log entry captures `templateId` and `templateName` in metadata, so the lineage is complete.

The gallery page is deliberately public — no authentication required to browse templates. This serves the acquisition funnel: a prospect following a link to `/templates` can see what the product does without creating an account. The CTAs adapt: unauthenticated visitors see "Sign in to use →"; authenticated users see the "Use Template" button. The middleware bypass follows the same pattern as `/landing` and `/register`.

The Workspace Activity Feed addresses a different problem: once a team is using the product, the audit log captures everything that happens, but it's completely invisible. The admin dashboard shows pipeline counts — static numbers. The activity feed makes the workspace feel alive. The `humanizeAction()` function in the API route translates all 28 `AuditAction` values into first-person verb phrases ("refined Customer Service Agent", "ran red-team on AML Alert Triage Agent — HIGH risk"). The client component shows initials avatars color-hashed by actor name, so a busy workspace looks like a team working together rather than a log file.

Together, Phase 42 completes the new-customer loop: sign up, see the landing page, go to the template gallery, clone a starter, have a working draft in 30 seconds. The transparency side — seeing what your team has done — is what converts that first draft into ongoing engagement.

## Session 049 — 2026-03-16: Growth and Security

Phase 40 closed the factory loop — deployed blueprints became things you could simulate and download. Phase 41 asks the next two questions: who can get in, and how secure is what gets deployed?

The registration system answers the first. Before this session, getting into Intellios required knowing someone — the demo accounts existed, the login page existed, but there was no path from "I found intellios.vercel.app" to "I have a workspace." That gap matters enormously for a product positioning itself as enterprise-ready. An enterprise AI governance platform that can't self-serve enterprise sign-up is asking every prospect to become a sales lead. The registration flow is simple on the surface — company name, name, email, password — but the back-end does substantive work: new enterprise UUID, settings upserted with a sensible default approval chain, SR 11-7 Core policies seeded. A new customer arrives with a governance framework already in place. That's not just convenient; it's part of the product promise. Intellios is compliance-ready on day one.

The landing page CTA change from "Request a Demo" to "Start Free Trial" is a small text edit with a large strategic implication. It changes the funnel from "ask a human to let you in" to "walk in yourself." The infrastructure to support that was the whole point of the registration work.

The adversarial red-teaming component answers the second question. The Simulate tab now has two modes: Chat (the Phase 40 playground) and Red Team (Phase 41). Red Team runs a two-phase evaluation: Sonnet generates 10 attacks tailored to this specific agent — its identity, instructions, constraints, and denied actions — then Haiku evaluates all 10 in parallel by actually running each attack against the agent's system prompt and judging whether the agent resisted. The result is a scored report with a risk tier (LOW/MEDIUM/HIGH/CRITICAL), individual attack rows you can expand to see the prompt and verdict, and a guidance banner for high-risk results.

The architecture decision that matters most here is the split between generation and evaluation. Attack generation uses Sonnet because quality matters — a generic jailbreak prompt is noise; a prompt that specifically targets this agent's defined scope is signal. Evaluation uses Haiku because it's a batch job — 10 parallel calls, cost efficiency matters more than generation quality at the evaluation stage. The result is a red-team suite that's both cheap to run and meaningfully tailored to the blueprint.

The stateless design decision parallels the Agent Playground: no DB table, no persistent conversation. The report is returned in the response and rendered client-side. One audit entry captures that a run happened, with score and risk tier in metadata. This keeps the schema clean and puts the artifact where it belongs — in the hands of the human reviewing the blueprint, not in a table that needs to be queried.

Together, these two additions change what the product is. Before: a pipeline for existing customers. After: a pipeline that acquires and immediately equips new customers, and gives them a security tool to validate what they build before it ships.

## Session 048 — 2026-03-16: Closing the Factory Loop

Forty phases of work had produced something that felt complete from the inside but had a quiet gap at its center. The product is called an enterprise agent factory. But until this session, a deployed agent was a document — a well-governed, multi-approved, compliance-validated document, but a document. Nothing ran. A prospect who completed a demo walkthrough left having seen an impressive pipeline, and then had to imagine the part where the factory actually made something.

Phase 40 is three moves to close that gap.

The Agent Playground is the most direct answer. The "Simulate" tab on the Registry detail page opens a live chat with the agent — not a mockup, not a description of what the agent would do, but a Claude instance running under the blueprint's actual system prompt, governance constraints as behavioral guardrails, and tool descriptions as context for how it would behave in production. The messages are stateless (client-side only; no database), which is exactly right for a simulation: it's a behavioral preview, not a conversation record. The audit trail captures that the simulation happened — not what was said. The `firstMessage` flag in the request body is the lightweight signal that tells the API route to write exactly one audit entry per session, regardless of how long the conversation runs.

The Agent Code Export takes a different angle on the same gap. A blueprint is not a running agent, but a TypeScript file with the blueprint's system prompt, tool stubs, and a working agentic loop is. The generated code is not a template — it's specific to the blueprint: the agent's name, the exact system prompt, one tool definition per capability with a TODO-stub handler, and a `runAgent()` function with full tool_use handling. A developer can drop this file into their project and implement the tool handlers. The factory produces a portable artifact, not just a governance record.

The Public Landing Page is the customer acquisition piece. `intellios.vercel.app` previously showed a login form to anyone who arrived without credentials — the right behavior for a closed system, but a dead end for prospects. The landing page is five sections: hero, pipeline, differentiators, roles, footer CTA. Unauthenticated visits to `/` now redirect there. The middleware change is three lines. The landing page itself is a pure server component with no database queries.

Two infrastructure issues shaped this session. The Vigil scheduled health tasks had been silently failing because the `docs/log/health/` directory didn't exist — every task that tried to write a report there hit a filesystem error, found nothing to synthesize, and produced no output. Seeding the directory with the two files the synthesizer expects unblocked the loop. The other infrastructure issue was TypeScript compatibility: the AI SDK v5 `useChat` hook no longer accepts an `api` string or `append` function — it requires `DefaultChatTransport` and `sendMessage({ text })`, with message text extracted from `msg.parts`. The first implementation of `simulate-panel.tsx` used the v4 API; the second used the correct v5 pattern. This is the third time in the project's history that an AI SDK v5 API mismatch has required a rewrite pass — the v5 upgrade was the right call, but the API surface is genuinely different from what most documentation examples show.

The product now has a front door, a factory floor, and an exit: visitors arrive at the landing page, authenticated users design and govern agents through the pipeline, and the result is something they can either simulate interactively or deploy as code. That's the loop closed.

## Session 047 — 2026-03-15: Cutting the Noise, Shipping to Production

There is a particular kind of UI problem that only becomes visible when you stop looking at features and start looking at the screen as a whole. Every individual card, button, and label made sense when it was added. But over thirty-something sessions of incremental feature work, the admin Overview had accumulated ten cards above the fold — six pipeline status cards (including Rejected and Deprecated, which require no action) and four navigation cards that did nothing the sidebar didn't already do. The page was telling the admin everything it knew rather than what they needed to know.

The fix was a reduction in two moves. First, separate what needs attention from what doesn't: action callouts (amber for blueprints in review, green for agents ready to deploy) only appear when there is genuine pending work — zero counts mean zero cards. Second, make the pipeline stage cards useful by routing them: clicking "In Review" goes to the Review Queue, clicking "Approved" goes to the Deploy Console. The terminal states (Rejected, Deprecated) became a single compact text line — present for completeness, but not given the same visual weight as active pipeline stages.

The same diagnostic applied to Dashboard and Deploy Console. The Dashboard had an "Executive Dashboard" label with a bar chart icon, a "Platform Summary" section that restated numbers already visible elsewhere on the same page, and a "Status" column in the Recent Deployments table that always read "Deployed" (because it's a deployments table). Each of these was a pixel tax on the user's attention. The Deployment Console had a rocket icon header, a "Pipeline →" link duplicating the sidebar, and a "Total Agents" KPI that has nothing to do with deploying agents. Removing them doesn't change what the system can do — it changes how quickly users can find what they need.

The production deployment work uncovered a structural mismatch that had been invisible. Vercel's CLI deploys had always run from inside `src/`, where `package.json` lives. When we connected the GitHub repo, Vercel cloned from the repository root — which has no `package.json`, only `docs/`, `src/`, and `vercel.json`. The first Git-triggered build failed immediately. The fix was a single setting change (Root Directory: `./` → `src`), but finding it required reading build logs and understanding that the font resolution error was a symptom of the wrong working directory, not an actual CSS problem. Every future push to master now auto-deploys correctly.

## Session 046 — 2026-03-15: Polishing the Edges Where Roles Feel the Friction

Phase 39 is a different kind of session. No new subsystems, no migrations, no routes. Just twelve targeted cuts into the micro-frictions that compound across a role's daily workflow — the kind of rough edges that users hit dozens of times but that never make it onto a roadmap because individually they seem too small to justify a phase.

The Designer workflow had two main gaps. The intake context form's submit button was still `bg-gray-900` — a holdover from before the violet-600 color standard was established. More substantively, the quality score popover showed dimension names and numeric scores but gave no interpretation: a "breadth" score of 2.4 is meaningless without knowing that breadth measures how many distinct requirement areas were captured. Adding per-dimension descriptions and an amber hint when any dimension falls below 3.0 turns a bare numeric display into actionable guidance. The classification rationale was already being computed and stored, but never surfaced — a single italic line in the classification header closes that gap without adding any state.

The Reviewer workflow had an asymmetry problem. The review queue step badge showed which approval step was active but couldn't distinguish between "this step is yours to act on" and "this step belongs to another role and you're waiting." Reading `userRole` from the existing session fetch — which was already running in the same `useEffect` — and comparing it to `activeStep.role` resolves this with two dozen lines of code. The violations list in the review panel had no escape hatch when policies needed context: a "View policies in Governance Hub →" link makes the governance page feel connected rather than isolated. The approval history in the Versions tab was the most structural addition: `approvalProgress` was already stored on every blueprint, but the Versions tab never read it, leaving the review audit trail invisible to anyone who navigated there.

The Compliance Officer page was a scroll wall. Three section anchors (`#at-risk`, `#review-queue`, `#policy-coverage`) and three KPI card-to-anchor links turn the page's top-of-page summary into actual navigation. An "Agents with unresolved validation errors" subtitle on the At-Risk section saves the cognitive step of asking what "at-risk" means. Wrapping the affected agent count in a registry link when count > 0 creates a direct path from policy violation to affected agents — previously a dead end.

The two cross-cutting fixes affect every role. The `?? "Unnamed Agent"` fallback silently made null-name agents indistinguishable across all pages — swapping to `` `Agent ${agentId.slice(0, 8)}` `` makes them identifiable without adding any database round-trips. The deploy success modal's "Close" button was a discard. Renaming it "Done" and adding a "View in Registry →" link completes the deploy-to-registry flow that was always architecturally present but never wired up in the UI.

None of these changes are individually impressive. Collectively, they close the gap between a system that technically works and one that feels considered — where the UI anticipates what you'll need next rather than leaving you to navigate there yourself.

## Session 043 — 2026-03-15: Making the Intake System Self-Aware

Phase 38 fixes a structural flaw that was always latent but only became visible once the intake system had enough depth to make the flaw consequential: the intake conversation was intake-first, not classification-first. Every agent, from a simple internal data-lookup tool to an autonomous FINRA-regulated customer-facing decision engine, received the same uniform governance interrogation. The system had no concept of what kind of agent it was talking about until after the conversation ended. This was friction in both directions — overquestion low-risk agents, underpress high-risk ones.

The architectural fix is classification-first adaptive intake. The key insight is that the signals needed to classify are captured in Phase 1's structured form, before the conversation begins. Deployment type, data sensitivity, and regulatory scope already uniquely determine the EU AI Act risk tier. The only missing piece was agent type — what the agent actually does functionally — which requires a single fast Haiku `generateObject` call using the free-text `agentPurpose` plus the structured context fields. That call fires async after Phase 1 submit, does not block the response, and writes results to the session row within seconds.

The implementation philosophy was reuse and extension. The EU AI Act risk tier logic already existed in `classifier.ts` — it just needed an exported wrapper that could be called before a blueprint exists. The system prompt already had a context injection section — it just needed a classification block and a tier-adaptive depth instruction appended. The coverage and tools functions already had context-driven domain gating — they just needed an optional riskTier parameter for tier-based overrides. Nothing was restructured; everything was extended.

The behavioral consequences are significant. A low-risk internal automation agent now gets 5–8 turns and no mandatory stakeholder domains. A critical-risk HIPAA agent is told the intake is exhaustive, all five policy types are required, and finalization will be blocked if any are missing. The same information that was always available — deployment context, data sensitivity, regulatory scope — now actually shapes the conversation rather than just informing context-rule matching after the fact. The agent knows what it is before it starts asking questions about it.

The generation engine improvement is the quietest change but possibly the most impactful for blueprint quality. The generation prompt previously received only the IntakePayload — the structured requirements captured during the conversation. It never had access to the original context (agentPurpose, deploymentType, dataSensitivity) or the classification. This meant Claude had to infer the governance depth from the policies that were already captured, rather than being told explicitly what depth was appropriate. With context and classification now injected, the generation prompt says "this is a critical-risk autonomous agent — produce all five policy types with specific rules." The ownership.dataClassification field is now auto-populated deterministically from context rather than being left to Claude's inference.

## Session 042 — 2026-03-15: Closing the Operational Gaps

Phase 37 addresses a class of problems that are orthogonal to features and architecture: the operational necessities that a real enterprise deployment assumes exist but a development-focused build often defers. Phase 36 made Intellios commercially presentable. Phase 37 makes it operationally deployable.

The first gap is the one that makes Phase 36's periodic review scheduling meaningful. Intellios already knows when the next review is due — it shows that date on the registry detail page, surfaces overdue agents in the Compliance Command Center, and documents it in the MRM report. But until Phase 37, there was no way to actually complete a review. The "Complete Review" button closes this loop. A compliance officer navigates to the overdue agent or the Compliance page, clicks "Complete Review," optionally adds notes, and the system resets the clock: `lastPeriodicReviewAt = now()`, `nextReviewDue = now() + cadenceMonths`. The audit trail records it. An email goes to the other compliance officers. The compliance loop is now complete.

The second gap is password recovery. This is the most basic security hygiene — but it is also the most visible operational hole during onboarding. The first time a new user forgets their password, the answer cannot be "ask your admin to create a new account with a temporary password." The implementation follows the standard cryptographic pattern: raw token delivered by email, SHA-256 hash stored in the database. The one-hour TTL and `used_at` guard prevent token reuse. The always-200 response on the forgot-password endpoint prevents email enumeration. These are not clever decisions — they are the correct application of established patterns. The value is that they are now in place.

The third gap is user invitations. The existing user management page creates users with admin-set temporary passwords, which means the admin sees the password and communicates it out-of-band — by Slack, email, or voice. This is a credential hygiene failure that a security-conscious enterprise will flag immediately. The invitation system replaces this: the admin sends an invitation email, the invitee sets their own password. The token has a 72-hour TTL. The duplicate-invitation guard (HTTP 409 if an unexpired unaccepted invitation already exists for the email) prevents accidental double-invites. The pending invitations table in the admin UI shows what is outstanding and how much time remains — the admin always knows who has accepted and who has not.

The fourth gap is reminder automation. The `reminderDaysBefore` setting existed since Phase 36 but did nothing. A setting that has no operational effect erodes trust — users will notice that configuring it does not change behavior. The daily cron job makes it functional. The cycle-deduplication logic (`lastReminderSentAt >= lastPeriodicReviewAt` guard) is the subtlest piece: it ensures that the cron can fire every day without sending duplicate reminders within the same review cycle, regardless of how far in advance the reminder window opens.

The through-line is operational completeness. None of these four items add capability to the platform's core value proposition. They do not improve the quality of generated blueprints, expand the governance coverage, or enhance the intelligence layer. What they do is remove the gaps that would make a real enterprise user distrust the system — the inability to recover a password, the insecure credential handoff during onboarding, the review scheduling that never fires reminders, and the compliance loop with no way to close it. These are the things that distinguish a product from a demo.

## Session 041 — 2026-03-15: From Demo-Ready to Commercially Viable

Phase 36 begins from a specific strategic moment. Phase 35 produced a demo-ready product — a system that can be walked through end-to-end in twelve minutes without surprises. That is necessary but not sufficient for a first customer engagement. A prospect who sees the demo and decides to move forward will immediately ask three questions that the Phase 35 product cannot answer satisfactorily.

The first question is about brand. "Can we white-label this?" is the question every enterprise buyer asks of platform software. Intellios is sold as a *white-label enterprise agent factory* — that claim is in the first sentence of the product description. But until Phase 36, every page said "Intellios." Every MRM compliance report was headed with the Intellios name. A financial services firm running this for their AI governance practice does not want their internal stakeholders reading documents that say "Intellios" at the top. The white-label implementation had to be seamless — sidebar logo, sidebar company name, MRM report footer — all controlled from a single admin settings panel with a live preview. It needed to work without a page reload, without a session token change, and without a new API endpoint on every render. The architectural choice — fetch branding server-side in the server component layout and pass it as props to the client sidebar — is the cleanest path through Next.js's server/client component boundary.

The second question is about regulatory staying power. Intellios already has strong SR 11-7 documentation for initial model approval: a 13-section MRM report, approval chain evidence, SOD documentation. But SR 11-7 is not a one-time event — it explicitly requires periodic model revalidation after deployment, typically annual for high-risk models. Until Phase 36, Intellios had no scheduling, tracking, or evidence system for subsequent review cycles. A compliance officer reviewing the system with an eye toward regulatory examination would immediately identify this gap. Phase 36 closes it by wiring the periodic review due date into the deploy transition, surfacing it in the MRM report (Section 14), flagging overdue agents in the Compliance Command Center, and showing the next review date on the registry detail page. The compliance narrative now has two chapters, not one.

The third question is about production scale. The audit trail is the fastest-growing table in the system — every lifecycle event writes a row, and deployed enterprises will accumulate hundreds of thousands of rows over a pilot period. The existing interface returned up to 200 rows with no pagination, no total count, and no way to navigate to older records. This is not a problem at demo scale. It becomes a problem within weeks of a real deployment. The fix is standard server-side pagination with a 50-row page size and parallel count query — the interface presents page X of Y with previous/next navigation.

There is also Item 0: the orphaned `</div>` that had been producing a TypeScript error in the webhooks page since Phase 33. It was tracked, confirmed as pre-existing, and deferred. It is now deleted. Sometimes the smallest items carry a disproportionate cost in build confidence — a TypeScript error that is present every time `tsc` runs, even if unrelated to current work, creates noise that erodes signal. Phase 36 starts clean.

The through-line of Phase 36 is commercial credibility. Phase 34 made the product presentable. Phase 35 made the demo reliable. Phase 36 makes the product defensible under scrutiny: the branding question, the regulatory completeness question, and the production scale question all have answers now.

## Session 040 — 2026-03-15: Closing the Last Gaps Before the Curtain Rises

Phase 35 is the smallest phase in the project by line count. It is also among the most consequential for what the project is actually trying to do: convince a live audience.

The framing is precise. A 9-stop showcase script had been written. The demo data had been seeded. The walkthrough had been tested in spirit. But systematic codebase audit of every stop revealed three blockers that would silently break the live demo — not with an error message, but with a missing button, a redirect, or a silent disappearance.

The MRM Report access bug is illustrative of how good intentions create usability problems. The original access gate — compliance_officer and admin only — was conservative and defensible from a role-separation standpoint. The MRM report contains governance evidence, approval chain details, and regulatory assessment. It felt like the kind of document that should be restricted. But a closer look reveals that it is a *read-only evidence document* — not an action surface, not a mutation point. Restricting read access to it serves no security purpose while creating a concrete demo friction point: the designer who built the agent cannot read the compliance document that results from their work. The fix is not a security relaxation; it is a correction of an overly conservative classification.

The inline simulation gap reveals how features built for one surface don't automatically transfer to another. The "Preview Impact" simulation existed — but only on the policy edit page, reachable only by compliance officers who navigate to a specific policy and enter edit mode. The governance hub policy cards — the primary browse surface — had no simulation capability. The demo script said "click Preview Impact on the SR 11-7 policy card." There was no such button. The fix adds the button inline, backed by the same existing API route, with results rendered below the card. No new route. No new backend logic. Just surfacing existing capability where users actually are.

The step advancement toast is the most subtle of the three. The multi-step approval workflow is sophisticated — it tracks which step of the chain is complete, which role is next, and maintains a full evidence trail. But after submitting step 2 of 3, the panel closed with no explanation. For a demo audience watching the reviewer click "Approve", the item disappearing from the queue would read as a bug — "did the click register? Did something fail?" The toast adds two seconds of explicit confirmation: "Approval submitted — advancing to Final Sign-off." The item then clears. The audience now understands what just happened.

Taken together, these three fixes share a common pattern: they are not feature additions. They are corrections of gaps between the system's actual behavior and the behavior that the demo script assumed. The system was built correctly. The script was written correctly. The gaps lived in the space between them — in assumptions about what buttons existed, what roles could access, and what transitions looked like.

This phase marks the completion of the showcase infrastructure. The demo can now be run end-to-end, stop by stop, without surprises.

---

## Session 039 — 2026-03-15: Preparing the Stage

For thirty-three phases, Intellios has been built for capability. Phase 34 is the first phase built entirely for *presentation*.

The distinction matters. A system that works and a system that can be demonstrated are not the same thing. A system that works handles the happy path correctly. A system that can be demonstrated handles every observable moment — first load, error states, empty states, cold-start conditions, loading states — without looking broken, unfinished, or confusing to an audience watching for the first time.

The demo data seed is the most structurally significant piece. Five agents at five different lifecycle stages, each designed to illustrate a specific capability. Not just status values — but complete supporting data: audit trails, validation reports, test cases, test runs, quality scores, health snapshots, governance violations, a pre-generated intelligence briefing. The idempotent UUID approach means the seed can be re-run safely; it skips existing rows without duplicating data. This matters for demo operations: if something looks wrong, you re-seed rather than diagnose.

The choice to hardcode UUIDs is deliberate and worth noting. Random UUIDs at seed time mean the demo script's instructions — "navigate to the Customer Inquiry Bot" — would be meaningless across different database instances. Hardcoded UUIDs mean that every seeded database looks identical. The demo script can give exact navigation instructions. The seed is not a generator of demo data; it is a snapshot of a specific, curated state.

The branded error pages address a real demo risk: if something goes wrong during a live showcase, the system should look like it's handling it gracefully rather than showing a Next.js stack trace. `error.tsx` and `not-found.tsx` with matching design system elements — violet accents, the same typeface, the same layout grammar — signal that the system was built by people who thought about edge cases. That signal is part of what the demo is selling.

The generation success flash is a micro-interaction fix with outsized perceptual impact. Before this phase, clicking "Generate Blueprint" resulted in a redirect to the blueprint workbench with no acknowledgment that generation succeeded. The flash — a green confirmation message that appears for 900ms before the normal state — closes a feedback loop that users unconsciously expect. "Did it work? Oh, it worked."

The DEMO_SETUP.md guide is the operational artifact that makes the demo infrastructure usable by anyone, not just the person who built it. Twelve minutes of structured stops, exact credentials, navigation paths, what to say at each stop, and what not to demo live. The existence of this document is itself a signal: this is a product that has been thought through, not just built.

---

## Session 038 — 2026-03-15: From "It Works" to "We're Confident It Works"

Phases 29 and 30 built the AgentCore integration. It worked. It passed manual testing. It was usable. But "usable" and "confident" are different levels of trust — especially when the integration involves live AWS API calls, IAM permissions, and a 5-step async deployment sequence where any step can fail.

Phase 33 addresses the gap between those two levels.

The framing was precise: seven specific risk areas had been identified after shipping. Zero test coverage. A 30-second polling timeout that real Bedrock deployments regularly exceeded. Config validation that happened mid-sequence rather than pre-flight. Free-form JSON accepted by the settings API without validation — meaning bad configs could be silently persisted and only fail three deployment steps in. Raw AWS error strings surfacing directly in the UI with no guidance. Short ABP instructions being silently discarded rather than padded. And no way to verify that a deployed agent was actually operational in Bedrock.

Each of these is a confidence problem, not a functionality problem. The deploy flow worked for well-configured, well-sized blueprints with valid credentials. The confidence gaps appear at the edges — on first-time setup, on terse blueprints, on ambiguous errors, on "did it actually deploy?" questions.

The test suite is the most structural investment. 49 tests across two files — pure function tests for the translation layer (zero AWS dependency, fast, deterministic) and integration tests for the deploy sequence (mocked AWS SDK, fake timers, rollback verification). The fake timer work deserves particular mention: vitest's `useFakeTimers()` interacts with promise rejection handling in a subtle way — if you advance all 180 polling timers before attaching a rejection handler, the rejection is treated as unhandled. The `runWithTimers()` helper solves this by settling the promise immediately before advancing timers. This is the kind of discovery that only surfaces when you actually write tests rather than plan to write them.

The pre-flight validation change has a side effect beyond catching errors early: it also improves auditability. When `validateAgentCoreConfig()` throws before `BedrockAgentClient` is instantiated, no AWS CloudTrail entry is created. An audit trail of CreateAgent attempts now represents only genuine deployment attempts, not configuration mistakes. That's a small thing, but it reflects a broader design philosophy: fail before you leave traces.

The instruction padding fix corrects a silent data loss bug. When an operator's ABP had a real persona and real instructions that happened to be under 40 characters combined — Bedrock's minimum — the entire content was silently discarded and replaced with a generic fallback. The operator had no way to know this happened. Now the content is preserved, padded to meet the minimum. Only truly empty blueprints trigger the fallback. The distinction matters: the difference between "your 38-character instruction got replaced" and "your 38-character instruction got padded" is the difference between a system that loses data and a system that handles edge cases gracefully.

The live health endpoint adds the final observability piece: you can now verify that a Bedrock agent is actually `PREPARED` after deployment, not just trust that the deploy API returned 200. Individual agent failures return `UNREACHABLE` — the endpoint never fails wholesale, because a health check that can't handle partial failures isn't a health check.

This phase didn't add new capabilities. It made existing capabilities trustworthy. That distinction matters for where the product sits in its lifecycle: Intellios now has enough integration surface area that confidence in each layer is a precondition for confidently building the next one.

---

## Session 037 — 2026-03-15: From Prototype to Product

For thirty-one phases, Intellios has been accumulating capability: intake, generation, governance, deployment, compliance, monitoring, intelligence, regulatory frameworks, test harnesses. Every phase added something the system could do.

Phase 32 addressed something different: what the system looks like.

The honest assessment before this phase is that Intellios looked like a prototype. Gray horizontal nav bar, flat border cards, no icons, no brand identity, no visual hierarchy. The functionality was enterprise-grade. The presentation was not.

The design direction was deliberate: dark sidebar with violet accent, inspired by Linear and Vercel. This aesthetic has specific connotations — it signals developer-focused, product-grade tooling. It's the aesthetic used by companies that build for power users who need to trust the system they're working with. For an enterprise agent governance platform, that trust signal matters.

The technical choices were equally deliberate. Lucide React was selected over alternatives for its tree-shaking, its MIT license, and its consistent icon family across ~1,000 icons. Geist Sans was selected for its clean, modern feel and the fact that it requires no external CDN — it ships as an npm package and is served from the same origin as the application. No component library was introduced; all components stay custom Tailwind, which keeps the bundle lean and the design fully controllable.

The sidebar anatomy was designed around role-gated visibility. Designers see intake and pipeline. Reviewers see the review queue. Compliance officers see governance and compliance. Admins see everything. The sidebar makes role boundaries visible in the navigation itself, which reinforces the separation of duties that the backend enforces.

Twenty pages were redesigned. Four components were upgraded. The single most impactful change was the layout itself — replacing the horizontal nav with a permanent sidebar changes the spatial grammar of the entire application. Every page now feels like it belongs to a coherent product rather than a collection of individually-built screens.

The work was done in a single session spanning two context windows (037a and 037b), with the plan approved once at the start. Twenty-five files changed. Zero behavioral changes. Zero database migrations. Zero new API routes. The commit touched only the presentation layer — which is also why it was safe to do all at once.

Intellios now looks like something you'd pay for.

---

## Session 036 — 2026-03-15: Making the AI Legible

Every previous phase of Intellios improved what the AI could do. Phase 31 improves what the human can see the AI doing.

This was the insight behind the session. Intellios has Claude embedded in nine different moments across the agent lifecycle — intake conversation, blueprint generation, governance validation with remediation suggestions, async quality scoring, behavioral test execution with judge evaluation, and daily intelligence briefings. But the UX treatment of these moments was inconsistent. Some were invisible. Some were unstyled. Some were present but unexplained.

The most striking example was governance violation suggestions. Claude had been generating actionable fix suggestions for every violation since Phase 8. They were stored in the database and surfaced in the UI — but rendered as plain gray text, visually indistinguishable from the policy rule they were meant to fix. A reviewer had no way to know whether a line was a regulation or an AI recommendation. The blue suggestion block — `✦ Suggested fix` in a bordered aside — is a small visual change that carries significant semantic weight. It tells the user: this part came from the AI, not the rulebook.

The same logic drove the test judge rationale expansion. Claude evaluates every behavioral test case and writes a rationale for each verdict. That rationale was stored in the database but never displayed. It lived in a column that no UI ever read. Now clicking the test result line opens each case with its verdict and, for failures, the judge's explanation. A designer can now understand *why* a test failed, not just that it did.

The briefing migration from `generateText` to `generateObject` with a Zod schema is the architecturally most consequential change. The daily briefing has always been Claude's most sophisticated output — a five-section analytical synthesis of the entire platform's health. But it was rendered as a monospace `<pre>` block, indistinguishable from a log file. The schema migration forces Claude to produce structured sections that the UI can render as distinct cards with iconography, color hierarchy, and proper typography. The `<pre>` fallback for old records ensures nothing breaks — but every new briefing is now a first-class structured document.

The AI Risk Brief on the review panel represents the third category: AI assistance at high-stakes decision points. Reviewers currently make approve/reject/request_changes decisions after reading the raw ABP content and a governance validation report. Nothing synthesizes that information into a risk assessment. The "Generate Brief" button calls Claude Haiku with the blueprint content, governance violations, and ownership data — and returns a structured brief with a risk level (low/medium/high), a one-sentence summary, key points, and a suggested action. Crucially, the suggested action is a non-interactive badge, clearly labeled as guidance. The reviewer still decides. Claude informs; the human decides.

The generation step progress labels are the smallest change but perhaps the most psychologically important. Waiting 5–15 seconds with a spinner and "Generating blueprint…" is stressful — it feels like something might have failed. Cycling through "Building agent identity… → Defining capabilities and tools… → Configuring governance constraints… → Finalizing blueprint…" transforms that wait from anxiety into expectation. The user knows what Claude is working on.

## Session 035 — 2026-03-15: Closing the Regulatory Loop

Every previous phase of Intellios improved the platform's ability to govern, monitor, and understand itself. Phase 30 does something different: it closes the loop with the external audience that ultimately matters most in regulated industries — the auditor.

The compliance evidence export is not a report. It's a machine-readable evidence dossier. When a compliance officer downloads it for an approved or deployed agent, they get everything in one file: the 14-section MRM report with risk classification and SOD evidence, the AI quality evaluation with per-dimension scores and flags, every test run result with Claude-as-judge verdicts, and export metadata that itself becomes an audit record. The `blueprint.compliance_exported` event now appears in the audit log just like `blueprint.deployed` or `blueprint.reviewed` — there is a permanent record of who pulled the evidence package, when, and for which version.

The status gate (approved or deployed only) is a deliberate design choice. An evidence package for a draft or rejected blueprint is meaningless for submission purposes — and presenting incomplete evidence to an auditor is worse than presenting none at all. The API enforces this, the UI surfaces the button only when appropriate.

The intake quality score surface (Phase 30-C) addresses a different gap. The quality evaluator has been running silently since Phase 28, scoring intake sessions as they finalize. But the scores were invisible — no UI ever showed them. Now they appear in two places: as a live chip on the intake session review screen (green/amber/red at a glance), and as a full dimension table on the Intelligence page alongside blueprint quality scores. A compliance officer can now see whether intake quality is tracking in the right direction — whether designers are producing high-breadth, low-ambiguity, risk-identified, stakeholder-aligned requirements.

These two deliverables are thematically connected. The evidence export proves compliance to external stakeholders. The intake score surface improves compliance from the inside — by making intake quality visible before the blueprint is ever generated.

## Session 034 — 2026-03-15: From Today's Snapshot to a Living History

Session 033 gave Intellios a voice — a daily briefing that diagnoses rather than just reports. Session 034 gave that voice memory.

The core insight driving this session: a single day's briefing answers "how is the platform doing today?" but the compounding value of a daily briefing is the *comparison*. Is quality trending up or down? Was yesterday's webhook failure a fluke or the start of a pattern? Has the review queue been building for three days, or did it spike this morning?

These questions require history. The Intelligence page now shows 7 days of briefings navigable by date strip, and 4 thirty-day trend charts with threshold lines that make the direction of each metric instantly legible. The webhook chart showing a flat red line at 0% — persistent since yesterday — tells a different story than if it appeared today for the first time.

Two other gaps closed. First: the quality scores table had been empty since Phase 28 launched, because all the blueprints in the system predate the quality evaluator. The backfill solves this cleanly — one button, one API call, and every existing blueprint in review/approved/deployed gets scored. In testing, 2 blueprints scored immediately (68 and 48/100), exposing real issues: too many tools without justification, and a blueprint generated without intake context. These are exactly the signals the quality evaluator was designed to surface.

Second: the anomaly signals in the briefing were text. Useful text, but text nonetheless. Now when the webhook rate is 0%, the KPI card links directly to `/admin/webhooks`. When the review queue exceeds the threshold, it links to `/review`. The distance between "here is what's wrong" and "here is where to fix it" collapsed to a single click.

The briefing webhook delivery (29-E) completes the outbound integration story started in Phase 25. Admins can now pipe the daily briefing to Slack or Teams by setting a single URL in enterprise settings — no extra configuration needed.

## Session 033 — 2026-03-15: From Monitoring to Diagnosis

Session 032 built the Intelligence system. Session 033 made it honest and useful.

The distinction matters. A system that reports numbers is monitoring. A system that explains what those numbers mean — and tells you what to do about them — is diagnosis. That's what this session achieved.

The first thing the end-to-end test exposed was that the webhook success rate of 0% was raising a false ATTENTION alarm every snapshot. This turned out to be a layered problem. The initial hypothesis was that test deliveries were contaminating the rate. That was half right: excluding `webhook.test` events was correct. But the real issue was that 413 `blueprint.report_exported` deliveries were all failing with HTTP 404 — not because of infrastructure failure, but because a webhook endpoint had been misconfigured (token not found). The platform was accurately reporting 0%, but the briefing had no context to interpret it.

The fix was to add a failure breakdown — per-event-type counts and HTTP status codes — to `rawMetrics` on every snapshot. This turns "0% webhook rate" into "413 blueprint.report_exported failures, all HTTP 404, one event type, consistent error code — this is a misconfiguration, not an outage." The briefing Claude generated confirmed this was the right approach: it correctly diagnosed the problem, named the dominant event type, and stated which downstream consumers were affected.

The second insight was about what it means to be analytical vs descriptive. The original briefing prompt asked Claude to "cover" topics — report the numbers for each section. The rewritten prompt asks Claude to reason about them: explain what the trend direction means, flag what looks wrong, distinguish a configuration problem from an infrastructure failure, flag high policy churn as requiring confirmation. The resulting briefing reads like an intelligent analyst wrote it, not a templating engine.

Three structural accuracy fixes also happened this session. The SLA compliance rate had a subtle query bug — it was filtering by `reviewedAt >= minus7d` rather than `createdAt >= minus7d`, meaning a blueprint created 30 days ago and reviewed yesterday would appear as having a 1-day turnaround. The Quality Index formula was defaulting to `webhookSuccessRate = 1.0` when null (too generous) or silently penalising with 0 when no data existed. And the `Generate Briefing` button was always hidden because `d.role` read the wrong level of the API response (`d.user.role` was the correct path).

All of these were low-visibility bugs — the kind that erode trust in a tool over time without a single obvious failure event. Catching and fixing them during the first real E2E test is exactly what that test is for.

The platform now generates briefings that are genuinely worth reading.

---

## Session 032 — 2026-03-14: Teaching the Platform to Watch Itself

Phase 28 is the platform becoming self-aware. Every previous phase built something Intellios can do for users. This phase builds something Intellios does for itself: continuous, automatic assessment of whether the whole system is working correctly.

The design question that drove this phase was: how do you know if an AI agent factory is healthy? Not in the infrastructure sense (is the server up?) but in the operational sense: Are the agents being designed well? Is quality trending in the right direction? Are governance controls holding? These questions can't be answered by monitoring latency and error rates — they require domain-specific metrics computed against the application's own data.

The answer is a three-layer system. The first layer is the quality evaluator: every time a blueprint is submitted for review or an intake session is finalized, a Haiku call runs asynchronously in the background and scores the work on 5 or 4 dimensions respectively. The scores are stored but never block the user's workflow — they are pure measurement. The second layer is the metrics worker: a SQL aggregation run that computes a composite Quality Index from operational signals (validity rate, refinement efficiency, SLA compliance, webhook reliability, policy coverage). This runs on demand or on a schedule and writes a snapshot row. The third layer is the briefing generator: a Sonnet call that looks at recent snapshots, quality scores, and audit activity and produces a 5-section narrative briefing that gives a compliance officer or executive a clear picture of the platform's state in plain prose.

The architectural insight that made this tractable was keeping the three layers strictly separated by what they do. The quality evaluator is AI-on-code-artifacts — it reads the ABP and scores it. The metrics worker is SQL-on-operational-data — no AI involved. The briefing generator is AI-on-aggregated-metrics — it synthesizes what the other two layers have already computed. Each layer has a single, clear responsibility and cannot fail in a way that affects the other two.

The side-effect module pattern — established in Phase 25 for webhooks — is proving to be the right abstraction. `quality-evaluator.ts` registers its handlers once via `registerHandler()`, imports as a side effect from `audit/log.ts`, and is never called explicitly by any route. The event bus carries the signal; the evaluator reacts. This means quality scoring required zero changes to any existing route, and adding a new event type to trigger evaluation in the future is a one-line change.

The daily briefing is the most user-visible output. A compliance officer arriving at the platform in the morning sees a single panel: health badge (NOMINAL / ATTENTION / CRITICAL), the briefing date, and the narrative. The narrative is structured — five sections covering generation quality, lifecycle health, governance state, system reliability, and any items requiring attention. Claude writes it fresh each day from the day's metrics, which means it captures patterns that no fixed dashboard can: "Validity rate dropped 12 points vs. yesterday, concentrated in the Financial Services risk category" is a sentence a static KPI card cannot produce.

The scheduled task is the operational anchor. Without it, the briefing is an on-demand tool. With it, it becomes a daily pulse check. The `intellios-daily-briefing` task fires at 8 AM, hits the briefing endpoint, and logs success or failure. Samy will see the briefing in the notification bell and at `/monitor/intelligence` when arriving for the day's work.

---

## Session 031 — 2026-03-14: Closing the Loop on AgentCore Evidence

Phase 3 is small but important. It's the difference between having done something and being able to prove you did it.

Phase 2 introduced one-click deployment to Amazon Bedrock AgentCore. The deployment record was written to the database and surfaced in the Registry detail page. But two compliance-facing surfaces didn't yet know about AgentCore: the MRM Compliance Report and the Audit Trail. Phase 3 closes both gaps.

The MRM Report change is the more consequential of the two. Section 8 (Deployment Change Record) previously showed four fields: deployed-at, deployed-by, change reference, deployment notes. For a blueprint deployed via AgentCore, a compliance officer reviewing this report would see that the agent was deployed but have no visibility into *where* — no ARN, no region, no foundation model. Those are exactly the fields a regulator or internal auditor would ask for. The orange AWS Resource Details strip added in this session turns Section 8 into a complete deployment attestation: the `agentArn` is the permanent, globally unique identifier for the Bedrock agent, and its presence in the MRM report connects Intellios's governance workflow to the live AWS resource unambiguously.

The Audit Trail expansion was smaller but overdue. The action label dictionary had only been partially maintained — it covered the original 10 action types but was missing the 8 added since Phase 19. An audit log with unrecognized action codes that fall back to their raw string (`blueprint.agentcore_deployed`) is functional but unfriendly. The expanded ACTION_LABELS and ACTION_COLORS tables now cover all 18 current action types, with consistent color semantics: orange for AgentCore actions, amber for status transitions, green for approvals, rose for deletions. The inline AgentCore summary (agentId and region without expanding the metadata JSON) makes the most important fields immediately visible on the row, matching the existing pattern where status transitions show `from → to` inline.

The webhook finding is worth documenting explicitly. Item 3 of the Phase 3 spec read: "`blueprint.agentcore_exported` event in webhook dispatch." On investigation, the event bus architecture made this a no-op: `writeAuditLog` side-effect-imports `src/lib/webhooks/dispatch.ts`, which registers `webhookDispatchHandler` as a universal listener for all EventTypes. The handler filters by the webhook's event subscription array but doesn't have an allowlist of handled types — any EventType that flows through the bus reaches the webhook dispatcher. Since `blueprint.agentcore_exported` was added to `EventType` in Session 030 and the export route already calls `writeAuditLog`, webhook delivery for exports was working before Phase 3 started. The architecture's side-effect import pattern is paying forward: every new action type becomes automatically dispatchable to webhooks without requiring a change to the dispatcher.

## Session 030 — 2026-03-14: One Button, One AWS Agent

Phase 2 closes the loop that Phase 1 opened. Phase 1 answered: "can an operator take an Intellios-approved blueprint and run it on Bedrock?" Yes — with a downloadable manifest and a CLI command. Phase 2 removes the operator entirely from that path. Click "Deploy to AgentCore…", confirm, watch the spinner, get back a Bedrock `agentId` and `agentArn` in 20 seconds. The governance workflow — intake, generation, validation, multi-step approval — is now a direct upstream supplier for a live AWS agent.

The implementation decision that mattered most was the polling architecture. Bedrock's `PrepareAgent` call is asynchronous: it accepts the request and returns immediately, while preparation happens in the background. The agent can sit in `PREPARING` state for anywhere from a few seconds to over 20 seconds depending on how many action groups are being configured and current Bedrock load. The deploy function runs a 500ms-interval polling loop against `GetAgent`, waiting for `agentStatus === "PREPARED"`, with a hard 30-second timeout and an automatic rollback (`DeleteAgent`) if the timeout fires. This design keeps the API route's response time bounded and prevents ghost agents from accumulating in the customer's AWS account.

The rollback path required careful thought. If `CreateAgentActionGroup` fails halfway through (say, the second of five action groups), we've already created the parent agent in Bedrock. Without a rollback, the customer's account accumulates partially-configured agents in a `NOT_PREPARED` state, which are invisible in Intellios but visible and potentially costly in AWS. The deploy function wraps both the action group creation loop and the PrepareAgent call in try/catch blocks with `DeleteAgent` calls in the catch. This isn't a perfect distributed transaction — there's a window where the `DeleteAgent` call could also fail — but it's best-effort cleanup that covers the common failure modes and logs explicitly when rollback itself fails.

Credential handling was the boundary that could not move. ADR-010 established the rule: no AWS credentials in the Intellios database. The deploy function reads from `BedrockAgentClient({ region })` with default credential resolution — `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` from environment, or instance profile in ECS/EKS. The enterprise-specific IAM service role ARN (`agentResourceRoleArn`) — which is not a credential, it's a resource identifier — does live in enterprise settings. The service role ARN is the IAM role that Bedrock itself assumes to call foundation models on behalf of the agent. It's created by the enterprise's AWS administrator and shared with Intellios as configuration. The calling credential is never stored anywhere near the database.

The four-phase modal (confirm → deploying → success → error) was designed to match the actual latency shape of the operation. A user who clicks "Deploy" needs feedback that something is happening during the 20-30 second preparation window. The cycling progress labels (`Creating agent in Bedrock…` → `Attaching action groups…` → `Preparing agent…` → `Waiting for PREPARED status…`) aren't synchronized to actual AWS API call milestones — they cycle on a 7-second interval. The real state is binary: calling or done. But the visual feedback matters because users who see a static spinner for 25 seconds assume the tab is broken.

The deployment details strip on the Registry detail page is the post-deployment payoff. Once a blueprint is deployed to AgentCore, the orange strip below the header shows the Bedrock `agentId`, region, model, full ARN, and the deployer's email. The "AgentCore ↗" pill badge next to the status badge links directly to the AWS console agent detail page. This traceability — from ABP governance record to live AWS resource — is what transforms Intellios from a documentation system into an operational control plane.

## Session 028 — 2026-03-14: The Integration Bridge

The comment that has lived in `src/lib/events/types.ts` since Phase 3 reads: "future analytics / **webhooks**." After 24 phases, the platform was producing the most comprehensive AI governance evidence trail in the codebase's history — every blueprint status change, every policy update, every approval step, every test run, every health check, all logged and dispatched through an in-process event bus. And then the event died. Nothing outside the platform ever knew any of it happened.

Phase 25 is the integration bridge that was deferred for 24 phases. It doesn't add new governance logic. It doesn't change how blueprints are validated or how policies are enforced. What it does is open a door from the platform's internal event stream to the external world — a door that every enterprise ecosystem is waiting for on the other side.

The design choice that mattered most was making delivery fire-and-forget from the event handler. The webhook dispatch handler is registered in the event bus alongside the notifications handler and the policy-impact handler. When a `blueprint.status_changed` event fires — say, a blueprint transitioning to `approved` — all three handlers are called: notifications handler routes an in-app alert to the reviewer, policy-impact handler schedules a health check for deployed agents, and now the webhook handler queries active webhooks and fires HTTP POSTs. None of these handler calls can block or delay the original API response. The blueprint approval response arrives at the client in milliseconds; the webhook delivery happens asynchronously afterward. This constraint shaped the entire retry architecture: 3 sequential attempts within the async task, each awaited, with delays of 0ms/1s/2s. The caller is already gone by the time the first retry fires.

HMAC-SHA256 signing was the only real design decision. The alternative — no signature — would mean recipients have no way to verify authenticity. Any actor who discovers the webhook URL could forge events. HMAC signing turns the shared secret into a cryptographic proof: only an entity with knowledge of the secret can produce a valid `X-Intellios-Signature: sha256=<hex_digest>` header. The pattern is identical to GitHub webhooks — a standard that's been battle-tested for over a decade and has client libraries in every language. This lowers the integration barrier considerably: any developer who has integrated with GitHub webhooks already knows exactly how to verify Intellios webhooks.

The secret management UX required careful thought. Secrets are displayed exactly once: at registration and at rotation. After that, they're retrievable only from the database (which requires database access, defeating the security model). The amber "Copy this secret now" callout is persistent and dismissible, with a one-click copy button. The delivery log shows HTTP response codes and attempt counts but never the secret. Rotation generates a new random 32-byte secret, superseding the old one atomically — there's a brief window between rotation and the recipient updating their verification logic during which deliveries will fail, which is why the delivery log exists as a diagnostic tool.

The enterprise scoping model deserves documentation. Each webhook has an `enterprise_id` column. The dispatch handler queries active webhooks matching the event's `enterpriseId` (including null-enterprise webhooks, which receive all events — intended for platform-level monitoring). This means enterprise A's webhooks receive enterprise A's events exclusively. An admin at enterprise A cannot register a webhook that receives enterprise B's blueprint approvals. The filtering happens in the DB query, not in the handler logic, so there's no bypass path.

What Phase 25 actually unlocks is best understood by listing the integrations it now enables without any platform changes:
- CI/CD pipeline → subscribe to `blueprint.status_changed` with `toState.status = "approved"` → auto-trigger deployment workflow
- SIEM system → subscribe to `blueprint.health_checked` with `toState.healthStatus = "critical"` → security alert
- Slack bot → subscribe to `blueprint.reviewed` → Slack message to the agent's designer
- External audit system → subscribe to all `policy.*` events → append to compliance record
- Monitoring dashboard → subscribe to all events → external metrics aggregation

All of these were impossible in Phase 24. All of them are now possible without writing a line of platform code.

## Session 027 — 2026-03-14: Proactive Compliance

The question entering Phase 24 was whether Intellios was actually helping compliance officers manage risk, or merely documenting it. After 23 phases, the platform could validate blueprints against policies, enforce approval chains, track test evidence, and render MRM reports. But compliance officers were still reactive: a policy change would silently affect deployed agents, and assembling an enterprise compliance picture required navigating five separate pages.

The most important architectural insight of Phase 24 came from examining `validateBlueprint()` in `src/lib/governance/validator.ts`. The function signature is `validateBlueprint(abp, enterpriseId, policies?)` — that third parameter is optional, and when provided, it bypasses the DB query entirely and runs the evaluator against the supplied policy array. This was implemented in Phase 4 (Phase 17 in session terms) to avoid redundant DB round-trips in the generation route. It had been sitting unused for every other consumer ever since. Phase 24's simulation feature is essentially a free lunch on top of that earlier investment: load all approved/deployed blueprints, call `evaluatePolicies()` (one level below the validator, skipping even the remediation pass), classify each blueprint, return results. The entire simulation endpoint is ~60 lines of logic with zero AI calls.

The "Preview Impact" button in the policy form is positioned deliberately. The form has three sections: Policy Details (name, type, description), Rules, Impact Preview. The user defines what they want the policy to do, then can immediately see what it would actually do to their deployed estate before saving. If a compliance officer wants to tighten a data handling rule and discovers it would create 12 new violations across deployed credit-scoring agents, they have a choice to make. The platform is not making that choice for them — it's surfacing information that previously didn't exist. That's proactive risk management.

The staleness detection for the simulation result deserves a note. Any field change in the form — name, type, or any rule modification — sets `simDirty = true`, which surfaces an amber "simulation may be outdated" warning if a prior result is displayed. This prevents the common UX failure mode where a user clicks Preview, edits a rule, and then reads the pre-edit results as authoritative. The result panel is only shown without the warning when `simResult !== null && !simDirty` — meaning the simulation result reflects exactly the current form state.

The Compliance Command Center's design follows the same principle as the Blueprint Workbench: surfaces information that already exists in the system, aggregated and prioritized for a specific role's workflow. A compliance officer opening `/compliance` gets one page with: how many agents are deployed and healthy, what their compliance rate is, what percentage have behavioral test coverage, what's sitting in the review queue and how long, which agents have specific issues requiring attention, and which policies are generating systemic violations. None of this data is new — it's all in the DB from prior phases. The page is a view, not a feature. But the view didn't exist, which meant the information didn't exist in practice.

The at-risk agent classification merits explanation. An agent is flagged as at-risk if it has any of three issues: governance violations (validation report has error-severity violations), health degradation (deployment health check returned "critical"), or no test coverage (no passing test run for the current blueprint version). These three signal classes come from three different phases (governance validation from day 1, deployment health from Phase 19, behavioral testing from Phase 23) and now surface together in a single table. A compliance officer reviewing this table can see that "Loan Underwriting Agent v2" has both governance violations and no test coverage — two distinct risk signals from two distinct verification layers — without having to cross-reference three separate pages.

What Phase 24 adds to the platform's compliance posture is the shift from reactive documentation to proactive intelligence. The governance evidence chain is now complete: intake → generation → structural governance validation → approval chain → behavioral testing → deployment → health monitoring → proactive impact simulation for policy changes. The compliance officer has full situational awareness of the enterprise's deployed AI estate and can model the impact of regulatory changes before implementing them.

## Session 026 — 2026-03-14: Behavioral Verification

The diagnostic question entering Phase 23 was simple and uncomfortable: does anyone actually know whether these approved agents behave as designed?

After 22 phases, Intellios can validate an agent blueprint against governance policies, enforce multi-role approval chains, track policy versions across the evidence chain, assess regulatory framework compliance, and render a thirteen-section MRM compliance report. All of that is structural. None of it answers whether the agent — when given a message — actually behaves as its blueprint says it will. A credit-scoring agent might have a policy prohibiting race-based decisions. The governance validator confirms the policy is present and correctly scoped. It cannot confirm that the agent, when asked to score a loan application, actually ignores demographic signals. That question requires running the agent.

SR 11-7's model validation guidance is explicit about this: it requires performance testing, not only documentation review. A bank submitting an MRM package for a credit-scoring AI agent cannot satisfy SR 11-7 with a governance policy checklist alone. There needs to be evidence that the model was tested, that specific test inputs were applied, and that the outputs were evaluated against expected behavior.

The architectural insight that made Phase 23 practical without building an entire testing infrastructure is that every ABP already contains everything needed to run the agent. `capabilities.instructions` is a complete system prompt. `identity.name` and `identity.description` provide context. `constraints.denied_actions` and `constraints.allowed_domains` provide behavioral bounds. The test harness simply uses these fields as-is — `buildAgentSystemPrompt(abp)` is a deterministic transformation of ABP fields into a runtime system prompt. No AI generation, no interpretation.

The Claude-as-judge design deserves explanation. The naive alternative — string matching or regex on actual outputs — breaks immediately for natural language. A test case that expects "the agent should refuse to provide financial advice" cannot be evaluated by checking whether the output contains the string "I cannot provide financial advice." The agent might refuse in dozens of valid phrasings. It might also refuse the wrong thing. The judge call — a second Haiku invocation that reads the input, expected behavior, and actual output and returns `{ pass, rationale }` — is much more robust. It can evaluate whether the semantic intent of the expected behavior was satisfied, not whether specific words appear. The cost is two Haiku calls per test case, approximately $0.01 for five cases. For a workflow that runs maybe weekly and produces permanent compliance evidence, this is negligible.

The test case / test run data model separation required careful thought. Test cases are attached to the logical agent (`agentId`), not to a specific blueprint version. This is intentional: test definitions represent what the agent is supposed to do, and that concept persists across versions. When a designer refines a blueprint and increments the version, they should re-run the same test suite against the new version — the test cases don't change just because the prompt did. Test runs, by contrast, are attached to the specific blueprint version (`blueprintId`). Each run is an immutable evidence record: who ran it, when, what results each case produced, what the overall verdict was. These are append-only rows — never updated after completion, never deleted. The MRM report's Section 13 reads the latest run for the blueprint being reported on. Regulators reviewing the package can see exactly when tests were executed and what they found.

The submission gate (`requireTestsBeforeApproval`) illustrates a recurring design pattern in Intellios: features that can be enforced at the API boundary should be enforced there, not only in the UI. The gate checks for a passing test run after the governance validation gate in the `draft → in_review` transition handler. Every submission path — the Blueprint Workbench "Submit for Review" button, a direct API PATCH call, any future tool that transitions blueprints — hits the same code path and gets the same check. Enterprises that don't enable this setting see no change in behavior. Enterprises that do enable it get a platform-enforced guarantee that no unverified blueprint reaches the review queue.

The amber strip in the Blueprint Workbench right rail — "⚠ Run tests before submitting for review" — deserves a note on its design rationale. It appears whenever test cases are defined but no passing run exists, regardless of whether the enterprise has enabled the submission gate. The reasoning: if a designer has taken the time to define behavioral test cases, they almost certainly intend to run them before submitting. The strip is a reminder, not an enforcement mechanism. The enforcement, when configured, happens at the API. The UI friction is purely informational.

What Phase 23 adds to the platform is evidence continuity. The governance evidence chain now runs from: intake requirements → blueprint generation → structural governance validation (with policy version lineage) → multi-role approval chain → behavioral test execution → deployment → ongoing governance health monitoring. Every link produces permanent, attributable records. The MRM compliance report renders them together in a structure designed for model risk committee consumption. The platform has moved from documenting what was designed to verifying that what was designed actually works.

## Session 025 — 2026-03-13: Governance Maturity

The diagnostic question entering Phase 22 was: which remaining architectural gaps would cause a financial services or healthcare regulator to reject Intellios's audit package? Two gaps stood out as categorical blockers, not just gaps in coverage.

The first was the single-reviewer approval model. SR 11-7 is explicit about the need to separate model development from validation from approval authority. A system where the same person who designs a blueprint can review it — or where a single reviewer can approve without any subsequent check by compliance or risk — doesn't satisfy separation of duties. It's not a gap that can be papered over with a policy or a documentation note. It requires the platform to enforce who can act at each stage. The approval chain architecture resolves this: enterprises configure an ordered sequence of steps, each with a required role and a label that becomes part of the permanent evidence record. Each step creates an `ApprovalStepRecord` — immutable, timestamped, attributed. The MRM report renders these as an evidence table that a regulator can read and verify.

The backward compatibility design decision was deliberate and non-negotiable. The default empty `approvalChain` activates the pre-Phase 22 single-step model, unchanged. Enterprises that configured nothing continue working exactly as before. Enterprises that have blueprints currently in `in_review` state will not be affected — those blueprints will proceed through the legacy path. Only enterprises that explicitly configure a chain get the new enforcement. This made it possible to deploy Phase 22 without a migration or communication campaign; the feature exists, but operators must choose to activate it.

The second gap was policy mutability. When a compliance officer edited a governance policy, the change was silent from the perspective of any previously approved blueprint. The `evaluatedPolicyIds` in a `ValidationReport` still pointed to the same policy rows — which now contained different content. This is a forensic problem: the validation evidence is no longer reproducible. A regulator asking "which policy was this blueprint validated against when it was approved?" would get the current policy content, not the content at validation time. The versioning solution is conceptually simple — every PATCH creates a new row, the old row is marked superseded — but its implications ripple through the system in useful ways. The governance health check (Phase 19) now correctly detects policy changes because a new version creates a new UUID, which doesn't appear in the deployed agent's `evaluatedPolicyIds`. The MRM report's policy lineage section can show exactly which version of each policy was active at validation time, and whether that version has since been superseded. The evidence is now truly immutable.

The SOD extension for multi-step approval deserves a note. The original SOD check was `createdBy !== actorEmail`. For a two-step chain where the designer is also the first-step reviewer, this is a necessary check. But it's not sufficient: a two-step chain where alice designs the blueprint and bob approves step 1 and step 2 satisfies the SOD check per step, but bob is still the sole decision-maker across the entire approval process. The check was extended to compare `userEmail` against all prior `approvalProgress[*].approvedBy` entries, not just `createdBy`. This ensures that no single individual participates in more than one role in the approval chain — which is the SOD intent, not just the designer check.

One architectural realization during implementation: the approval chain needed to be enforced in two routes, not one. The plan correctly identified `status/route.ts` as the primary enforcement point. But `ReviewPanel` in the UI calls `POST /api/blueprints/[id]/review`, not the status PATCH. Had the chain only been enforced in the status route, a reviewer could have bypassed it entirely by calling the review API directly. Both routes now enforce the chain, with the review route being the primary path for interactive approvals and the status route handling lifecycle transitions.

The governance maturity work now rounds out the compliance evidence package to a level where a regulated enterprise could present it to a model risk committee. The approval chain provides the multi-role evidence trail SR 11-7 requires. Policy versioning provides the reproducible validation context. The MRM report renders both, clearly, in a structure designed for audit consumption. The platform has moved from "plausibly governance-aware" to "genuinely governance-enforcing."

## Session 024 — 2026-03-13: Enterprise Completeness

The framing for this session came from a simple question: what would block a Fortune 500 compliance team from taking Intellios into production review today? The answer wasn't missing features — it was missing infrastructure. Phase 20 had added the regulatory vocabulary. The platform could now assess blueprints against EU AI Act, SR 11-7, and NIST. But five operational gaps meant a real enterprise couldn't fully operationalize it.

The MRM report's Section 12 gap was the most critical. The regulatory framework assessment data was being computed and returned by the JSON API, but the HTML report — the document a compliance officer actually prints to give to a regulator — stopped at Section 11. The data existed; the rendering didn't. This is a P0 because a compliance officer printing the MRM package to submit to a regulator would be submitting an incomplete document. The fix was a pure rendering change: fetch the regulatory assessment in parallel with the report assembly, render three framework subsections. No API changes, no new data, just evidence surfaced properly.

Agent cloning addresses an organizational reality that isn't obvious from a technology perspective. Enterprises don't build one agent; they build families. A US customer-service agent and its EU-compliant counterpart. A base risk-scoring agent and a specialized variant for a different business unit. Today they had to re-run the full intake + generation cycle from scratch for each variant, even if the delta from the source agent was small. The clone operation solves this. The most important design decision here was creating a new logical agent rather than a new version. This distinction matters for model risk management: a version implies the same agent evolved, and its MRM report should inherit the parent's reviewer and deployer evidence. A clone is a new agent derived from a parent — it needs its own MRM lifecycle, its own review, its own deployment record. The `sourceBlueprint` audit metadata preserves the derivation trail for traceability without conflating the two agents' compliance records.

The ownership block addresses a problem that becomes apparent only when a registry grows beyond ten agents: there's no machine-readable accountability. Who owns this agent? What department? What's the cost center for budget tracking? Is this production or sandbox? A registry of fifty agents named "Customer Support Bot" and "Risk Scoring Agent" provides no answers. The ownership block makes these fields first-class ABP data — searchable, exportable, included in the MRM report, surfaced in the registry. The implementation decision to make it a dedicated PATCH endpoint rather than routing it through the generation pipeline was deliberate: ownership metadata isn't AI-generated. It's structured administrative data entered by a designer. Routing it through generation would imply the AI is making these determinations, which is both architecturally wrong and a compliance risk.

Enterprise settings addresses the problem of hardcoded configuration. The 48-hour SLA warning threshold and 72-hour breach threshold were constants in the code. For a single-tenant SaaS prototype this is fine; for a multi-tenant platform serving enterprises with different review SLA commitments, it's a production blocker. The `enterprise_settings` table gives each enterprise its own tunable configuration surface. The deep-merge-with-defaults pattern means enterprises that have never touched a setting get the platform defaults without a DB row, while enterprises that have customized only one section don't lose the other defaults. This is the kind of infrastructure investment that doesn't add visible features but makes everything else more operationally sustainable.

The governance analytics section closes a visibility gap that grows more significant as the platform matures. The Governance Hub had been showing current-state counts: how many agents are passing, how many have violations. What it couldn't answer was whether things were improving. A compliance officer preparing for a board-level risk review needs to say "our governance posture has improved — our validation pass rate is up, our average time to approval is down, here's the trend." The analytics section makes that possible from existing data. The SQL aggregation design decision — no new event store, computed from existing `audit_log` and `agent_blueprints` tables — reflects the project's ongoing discipline around not adding infrastructure until the data needs clearly demand it.

What this session adds up to is a platform that can now be presented to a serious compliance review without obvious operational gaps. The regulatory vocabulary is in place (Phase 20). The compliance documentation is complete (Section 12). Organizational accountability is machine-readable (ownership block). Configuration is enterprise-tunable (settings). Governance trends are visible (analytics). Agent families are efficiently buildable (cloning). The remaining items on the gap inventory — webhooks, multi-step approval, policy versioning — require stakeholder alignment on workflow changes that go beyond code. They're the right next investments, but they require human decisions about how the platform should work before implementation begins.

## Session 023 — 2026-03-13: Speaking the Language of Regulators

There is a gap that exists in almost every compliance tool that is not directly visible in the code: the platform may have all the right evidence — policies, validation reports, audit trails, stakeholder contributions — but presents none of it in the vocabulary regulators actually use. A Fortune 500 compliance officer asked to demonstrate EU AI Act compliance for a deployed agent doesn't want a list of governance policies and violation counts. She wants to know whether Art. 11 technical documentation requirements are satisfied, whether Art. 12 logging obligations are met, whether the human oversight controls required by Art. 14 are in place. Phase 20 translates Intellios's evidence into that vocabulary.

The central architectural decision was keeping regulatory classification entirely stateless and deterministic. No AI calls, no new database tables, no stored state. The classifier is a pure function: given an ABP, an intake context, a validation report, and an optional deployment health status, it produces a `RegulatoryAssessment` fresh on every request. This means assessments are always current — there is no staleness problem — and the implementation has zero marginal cost for the infrastructure. The trade-off is that the assessment is derived from what the system knows about the blueprint at query time, not from any additional ground-truth data. This is why the regulatory panel carries a clear disclaimer that the assessment is informational and does not constitute legal advice. The platform surfaces evidence; qualified counsel makes the determination.

The EU AI Act risk tier logic deserved particular care. The regulation's Annex III categories are detailed and context-dependent; a purely algorithmic system cannot reliably determine them. The choice was to classify based on strong signals from intake context — HIPAA scope, FINRA customer-facing deployment, PII sensitivity combined with external deployment surface — and to use "review-required" as a conservative category whenever any of those signals are present. "Review-required" means: the signals suggest this agent may warrant high-risk classification, and a compliance officer should assess. This is more useful than a false "minimal-risk" classification that leads an operator to skip due diligence.

The version diff engine addresses a different kind of gap. In the re-review workflow — when a designer resubmits a blueprint after "request changes" — the reviewer had no efficient way to see what changed. They had to re-read the entire blueprint. This is both a workflow problem and a compliance problem: regulators expect point-in-time audit evidence of what changed between reviewed versions and why. The ABP diff engine produces a structural diff that speaks directly to a reviewer's concerns: did the governance policies change? did the system instructions change? did new tools get added? The significance model (major/minor/patch) maps to what a reviewer would actually weight: a governance policy change is categorically more significant than a description edit.

The compliance starter packs close the enterprise onboarding gap. A new enterprise with no governance policies in Intellios has zero coverage — every blueprint validation comes back with no violations, not because the blueprint is clean, but because there are no rules to evaluate it against. This is a dangerous false sense of security. The four packs (SR 11-7 Core, EU AI Act High-Risk, GDPR Agent Data, AI Safety Baseline) give a new enterprise a fully functional governance framework in one click. Fifteen policies with meaningful rules derived from the actual regulatory text. The duplicate guard with force-reimport means enterprises can also use the packs to reset to a known baseline after experimentation.

The MRM report's Section 12 completes the picture. A compliance report that doesn't reference regulatory frameworks is a report that won't satisfy a regulator. Section 12 takes the same evidence already assembled for sections 1–11 and presents it in the three-framework vocabulary. One report, eleven sections of evidence, one section of regulatory mapping. This is the package a compliance officer submits when a regulator asks for documentation.

## Session 022 — 2026-03-13: The Governance Clock Doesn't Stop at Deployment

There's a subtle but serious assumption baked into most compliance tooling: governance is something you do before you ship. You design the agent, you validate it, you get the reviewer's sign-off, and then it's done. But policies change. The compliance landscape shifts. A rule that didn't exist when the agent was approved might have been added last Tuesday by a compliance officer responding to a new regulatory guidance. The deployed agent is still running — or would be, if Intellios were executing agents — and it's now out of compliance with no one knowing.

Phase 19 exists to close that gap. The framing matters: Intellios is a design-time platform. It doesn't execute agents. So "runtime monitoring" here means something specific and achievable: *are your deployed blueprints still compliant with the enterprise's current policy set?* That's a deterministic question with a deterministic answer, and it's answerable every time a policy changes.

The key design decision was keeping health checks deliberately cheap. The `validateBlueprint()` function calls Claude Haiku to generate remediation suggestions — useful for designers, but not something you want to fire on every policy save across every deployed agent. `evaluatePolicies()` is the pure rule engine underneath it: no AI, no network call, just predicate evaluation. By wiring the health check directly to `evaluatePolicies()`, a compliance officer managing ten deployed agents pays essentially zero marginal cost when they update a policy. The checks run synchronously in the same request lifecycle that saves the policy change.

The notification design took careful thought. Compliance officers don't want to be pinged every time a health check runs — they want to know when something *changes*. The transition-based model (`clean→critical` and `critical→clean`) means a notification carries genuine information content: something changed about this agent's governance posture. Repeated checks that confirm the existing state are silently recorded in the audit log but never surface as notifications. This is the same philosophy as the SLA alert design from Phase 3 — alert fatigue is a real cost to the humans operating the platform.

The circular import between `policy-impact-handler.ts` and `audit/log.ts` is worth explaining because it looks alarming at first glance. `audit/log.ts` imports `policy-impact-handler.ts` as a side effect so the handler registers with the event bus. But `policy-impact-handler.ts` imports `writeAuditLog` from `audit/log.ts`. Node.js handles this cleanly: when `audit/log.ts` is first evaluated, it starts importing `policy-impact-handler.ts`; by the time that module's `registerHandler()` call executes, `audit/log.ts` is partially initialized but `writeAuditLog` is already defined. The module cache ensures the circular resolution only happens once. This is exactly the same pattern as `notifications/handler.ts`, which has been running since Phase 3 without issues.

The Monitor page completes the observability picture. Compliance officers now have a dedicated view of the governance health of everything in production — a single table that answers "which deployed agents are compliant with current policies?" without needing to navigate to each one individually. The "Check All" button provides a manual audit sweep; the per-row "Check Now" is for spot checks. The governance health strip on the Registry detail page brings the same information into the context where a compliance officer would naturally go to investigate a specific agent. The three-variant strip (unknown/clean/critical) gives an immediate signal before they've even opened a tab.

One thing this phase explicitly does not do: it doesn't automate remediation. When an agent is marked critical, the platform surfaces what's wrong and links to the governance tab. What happens next is a human decision — whether to deprecate the agent, update it to comply with the new policies, or escalate for a policy exception. The platform's role is to ensure that decision is made with full information and that no deployed agent silently drifts out of compliance without anyone knowing.

---

## Session 021 — 2026-03-13: Fixing What the Happy Path Hid

Phase 18 emerged from a deliberate systems analysis rather than a feature request. The question was simple: what does the agent creation flow actually look like to a user who doesn't take the exact path we designed? The answer was uncomfortable.

The Blueprint Workbench had a hidden assumption baked into every line of code that touched `agentId`: the user would always arrive there from the "Generate Blueprint" button. If they arrived from a pipeline link, a bookmark, the registry's "Open in Workbench" action, or a shared URL — the Submit for Review block simply didn't render. No error, no fallback. Just a workbench that appeared to have no submission capability. The fix was converting `agentId` from a URL search param constant to a state variable that the API fetch can populate.

The URL encoding problem was similar in character — a design that worked perfectly on the happy path but accumulated technical debt invisibly. Base64-encoding a full ABP into a query string is the kind of shortcut that seems harmless when blueprints are small. As agents become more complex (more tools, longer instructions, more governance policies), these URLs grow toward browser limits. The workbench already had an API-fetch fallback; removing the URL encoding just made the fallback the only path.

The auto-validate fix is the most impactful of the four in terms of daily UX friction. Every designer who refines a blueprint — which is most designers, since generation rarely produces exactly the right blueprint on the first pass — currently faces: refine, wait, then manually click "Validate now", wait again, then submit. Two separate round-trips where the second was always going to happen. The combined time cost across a feature-rich agent with three or four refinement cycles is significant. Collapsing the second round-trip into the first was a one-paragraph code change.

The silent validation error fix is the smallest change but perhaps the most important signal. A `catch { /* non-critical */ }` comment is a smell: the author knew the error existed, judged it non-critical, and moved on. But non-critical from a data perspective is different from non-critical from a user perspective. When a designer clicks "Validate now" and the API call fails, they deserve to know — not because they need to act on it immediately, but because they should know their governance report is not up to date before submitting.

Phase 18 is the kind of phase that doesn't get celebrated because nothing new appeared on the screen. The same four screens exist. The same buttons are present. But they all work now, in all the ways users actually use them — not just the one way we expected.

---

## Session 020 — 2026-03-13: Turning the Machine Inward

### The Architect Mode Question

Phase 17 had an unusual origin. Rather than identifying a specific product gap and implementing it, this session began with a different kind of question: what if we applied the same analytical rigour we use to evaluate enterprise AI agents to Intellios itself? The result was Architect Mode — a structured seven-section system analysis of the codebase as it stood after sixteen phases of development.

The analysis surfaced three classes of latent inefficiency that had accumulated over the project's rapid build-out. None were bugs. All were structural problems invisible until you examined the system at a high level of abstraction.

### The Duplication Problem

The most telling finding: the enterprise policy DB query (`or(isNull, eq(enterpriseId))`) was independently implemented in three separate files, with Phase 17 about to make it four. The validator had its own private `loadPolicies` function. The intake chat route had an inline copy. The generate and refine routes were about to each add their own. Four independent implementations of the same critical query — divergence risk is exactly proportional to the number of copies.

The solution was obvious once named: extract `load-policies.ts` as the single source of truth before adding any new call sites. This is the kind of refactoring that architects flag and feature developers miss — not because the feature developers are wrong, but because they're optimizing for the task in front of them, not the aggregate shape of the system.

The extraction also revealed a second problem hidden inside it: the generate route would call `validateBlueprint` which would internally call `loadPolicies` again — a second DB round-trip for policies already in memory. Extending `validateBlueprint` with an optional `policies?` parameter resolved this with a single line: `const resolvedPolicies = policies ?? await loadPolicies(enterpriseId)`. Existing callers are untouched; the generate route passes its pre-loaded policies and skips the redundant query.

### The Violation Discovery Loop

The second structural problem was subtler. The governance validator ran after generation. Claude generated a blueprint, the validator found violations, the user refined, Claude regenerated, the validator checked again. This was the designed flow — but it contained an implicit assumption that Claude would be unaware of the rules it was violating. That assumption was only true because we chose not to tell Claude what the rules were.

Policy-aware generation inverts this. Before generating, Claude receives the enterprise's active governance policies formatted as an `[ERROR]`/`[WARN]`-tagged constraint list in the system prompt. Error-severity rules must be satisfied proactively. The generate → violate → refine cycle doesn't disappear, but its frequency drops sharply for the common case where violations are rule-based and predictable rather than semantic.

The critical implementation question was whether to format policies as a wall of text or a structured constraint list. The structured format won — dot-notation field paths (`governance.policies[0].type`), explicit severity tags, and the exact operator and value expected. This is the format a rule-following LLM can act on, not just reference.

### The Model Cost Asymmetry

The third finding was a cost efficiency opportunity: all intake turns used Sonnet regardless of their complexity. Routine requirement-capture turns — "add a rate limiting constraint", "set the deployment environment to production", "what tools have I added so far?" — don't need Sonnet's capability ceiling. Haiku handles them reliably at roughly 8× lower cost.

The design challenge was avoiding the opposite failure: routing a finalization turn to Haiku when `mark_intake_complete` needs to enumerate complete `captureVerification` and `policyQualityAssessment` structures. A missed finalization signal on a Haiku turn would produce a low-quality assessment that blocks or degrades the Phase 3 review.

Two insights shaped the final design. First, the primary finalization signal should be structural, not linguistic. When `payload.identity.name` is set and at least one tool is recorded, the session is ready to finalize — and any subsequent user message might be the confirmation. This handles the short affirmations ("yes", "ok", "that's it") that keyword matching cannot catch reliably. Second, keyword matching is a useful secondary layer for governance-heavy discussions that can't be detected structurally, but the keyword set must be specific enough to avoid false positives on everyday words.

The resulting `selectIntakeModel` function routes approximately 75–80% of a typical session to Haiku, with Sonnet reserved for the opening turn, payload-complete turns, explicit finalization language, and governance/regulatory keyword matches. The conservative bias toward Sonnet on ambiguous signals reflects the asymmetry: a false positive costs money; a false negative costs quality on the most critical steps of the intake process.

### The Remediation Afterthought

The final change was the smallest: switching `addRemediationSuggestions` from Sonnet to Haiku. Remediation suggestions are short, structured, factual completions — "add `governance.audit.log_interactions: true`" — with no creative reasoning required. This had simply never been questioned because it was part of the original implementation. Phase 17 was the first time anyone looked at it critically. Haiku handles it reliably and costs 8× less.

### What Phase 17 Represents

Most of Intellios' phases have been outward-facing: new capabilities, new UI surfaces, new integrations. Phase 17 is different. It's the system examining itself and correcting inefficiencies that accumulated through rapid sequential development. The four improvements — shared policy loading, policy-aware generation, adaptive model selection, Haiku for remediation — each solve a structural problem that was invisible at the feature level but apparent when you step back and look at the whole.

This kind of self-examination is the phase you can only have after you've built enough to have something worth examining.

---

## Session 014 — 2026-03-13: Auditing the Auditors + Opening the Door

### The Audit Gap in the Governance Layer

Phase 10 introduced the ability for compliance officers to create, modify, and delete governance policies. This was a meaningful operational step forward — but it introduced a subtle compliance problem. The audit infrastructure already captured blueprint lifecycle events in meticulous detail: every refinement, every status transition, every review decision. Yet when a compliance officer deleted a governance policy, that deletion left no trace. The very layer responsible for governing AI agent behavior had no immutable record of its own mutations.

This is precisely the kind of gap that surfaces in SR 11-7 model risk examinations: "show me the history of your governance policies over the past 12 months." Without audit entries for policy changes, the only answer would be "we don't have it."

Phase 11 closes this completely. `policy.created` was already defined in `AuditAction` but had never been wired to the POST handler — a silent gap since Phase 1. PATCH and DELETE now emit `policy.updated` and `policy.deleted` respectively, with `fromState`/`toState` snapshots capturing name, type, and rule count. The Audit Trail UI was also brought to completeness: all 10 `AuditAction` values now have explicit labels and color tokens, including `blueprint.report_exported` and `intake.contribution_submitted` which were also previously missing from the display dictionary.

### The Onboarding Problem

A more operational question than the audit gap: how does a new compliance officer get access to Intellios? Or a new designer starting their first project? Until Phase 12, the only answer was "ask a developer to insert a row into the database." This is a deal-breaker for any real enterprise deployment — database access for user provisioning is not acceptable in financial services environments where privilege separation is audited.

Phase 12 gives administrators a purpose-built user management interface at `/admin/users`. The design is deliberately straightforward:

- **Create**: full name, email, role, temporary password. bcrypt at cost 12. Email uniqueness enforced at the API layer with a 409 so the form can surface the error correctly.
- **View**: alphabetically sorted roster with role statistics at the top. Role counts let an admin quickly see if their enterprise has appropriate coverage (e.g., at least one compliance officer).
- **Edit role**: inline — clicking "Edit" on a row opens a `<select>` dropdown with Save/Cancel, no separate page needed for a single-field update. The updated role reflects immediately in the badge.
- **Self-protection**: the API rejects role changes to the calling admin's own account, and the UI omits the edit affordance on the admin's own row. This prevents an admin from accidentally locking themselves out.

Password reset is intentionally absent from v1. The pattern in enterprise security is for users to change their own passwords through a separate flow; admin-forced password resets require more infrastructure (temporary password flags, forced-change-on-login enforcement) than this phase warranted.

---

## Session 013 — 2026-03-13: Closing the Governance Configuration Loop

### The Last Manual Step

Every previous phase assumed governance policies were a fixed input — defined once (via direct API calls, seeded in migrations, or hardcoded) and applied automatically thereafter. This was fine for development, but in an enterprise deployment the set of governance policies isn't static. Compliance teams evolve them as regulations change, audit findings emerge, and internal risk appetite shifts. Without a UI to manage them, Intellios left a meaningful gap: the engine that validates every AI agent was itself ungoverned from a UX perspective.

Phase 10 closes this gap by giving compliance officers and administrators a full policy management interface inside the Governance Hub.

### Design Decisions

Three choices shaped how this was implemented:

**Role expansion on POST.** The original POST endpoint was admin-only. This made sense for the first implementation — policies are high-stakes, so keeping them under the strictest role was conservative. But compliance officers are the subject matter experts on regulatory requirements; requiring them to route policy changes through an admin creates friction and a handoff that doesn't reflect how real teams work. Expanding POST (and the new PATCH/DELETE) to include `compliance_officer` matches the role's purpose: they own the governance framework.

**Platform policy protection.** Global platform policies (those with `enterpriseId = null`) represent the baseline governance floor that applies to all enterprises. Compliance officers manage enterprise-specific policies; they cannot override the platform layer. This is enforced at the API level and surfaced in the edit page via a read-only amber warning banner. The separation is architecturally important — it maintains the platform's ability to enforce baseline standards regardless of what any given enterprise compliance officer chooses.

**Shared form component.** Rather than building two separate forms (create + edit) with duplicated rule-builder logic, the `PolicyForm` component handles both through props: `initialValues` for pre-population, `readOnly` for the platform-policy view, `submitLabel` and `onSubmit` for the action variant. The rule builder renders identically in both contexts — the only visual difference is whether inputs are editable and whether the submit button appears.

### The Rule Builder

The governance policy rule language has 11 operators covering existence checks, equality, string containment, regex, numeric count comparisons, and type array membership. Expressing this in a form without overwhelming users required one structural choice: operators that don't take a value (`exists`, `not_exists`) hide the value field entirely. This reduces the form's visual weight for the most common check types and eliminates the confusion of a visible empty field that has no meaning.

Each rule independently sets its severity (`error` blocks deployment; `warning` is informational). This lets a policy mix mandatory requirements with advisory best-practices in a single policy object.

### What This Enables

With policy management in the UI, the full governance lifecycle now lives in Intellios:
1. Compliance officers define what the rules are (Policy Library)
2. The Governance Validator applies them automatically during blueprint review
3. Violations surface in the Blueprint Workbench and Review Console
4. The MRM Report captures the complete governance record for regulators

The platform is now self-contained for enterprise governance configuration without requiring developer or API access for day-to-day policy management.

---

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
