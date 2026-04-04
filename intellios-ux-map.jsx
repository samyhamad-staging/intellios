import { useState } from "react";

// ──────────────────────────────────────────────────────────────────────────────
// DATA MODEL
// ──────────────────────────────────────────────────────────────────────────────

const ROLES = {
  architect: { label: "Architect", color: "#6366f1" },
  reviewer:  { label: "Reviewer",  color: "#0891b2" },
  governor:  { label: "Governor",  color: "#059669" },
  admin:     { label: "Admin",     color: "#9333ea" },
  stakeholder:{ label: "Stakeholder", color: "#f59e0b" },
  external:  { label: "Visitor",   color: "#64748b" },
};

// Scoring:
//   ux:  1-5  (how polished/smooth/friction-free the UI is)
//   imp: 1-5  (strategic importance to core value prop)
//   cmp: 1-5  (implementation completeness)
//   fri: 1-5  (friction risk — 5 = highly likely to frustrate; lower=better)
//
// health = (ux + cmp + (6-fri)) / 3  → rescaled to 1-10

const EXPERIENCES = [
  // ── A. ENTRY ─────────────────────────────────────────────────────────────
  {
    id: "home", cluster: "entry", label: "App Home (Root)",
    route: "/", roles: ["architect","reviewer","governor","admin"],
    ux: 4, imp: 5, cmp: 5, fri: 1,
    desc: "546-line server-rendered home page — the first page users see after login. Shows portfolio blueprint list (with status tints and priority badges), activity feed, and FleetGovernanceDashboard with recent snapshots. A richer and more data-dense view than /dashboard. Distinct from the /dashboard analytics page.",
    gaps: ["No personalization by role — architect, reviewer, and governor see the same home", "Blueprint list has no search or filter", "No 'Next action' prompt to guide new users to their first task"],
    recs: [
      { pri: "P1", text: "Add role-aware 'Next Action' prompt at the top. Architect: 'You have 1 session in progress. Continue →' Reviewer: '3 blueprints awaiting your review.' Governor: 'Fleet health: 2 policy violations need attention.' This single change would double the navigation efficiency of the home page." },
      { pri: "P2", text: "Add blueprint search/filter to the home page list. Currently architectswho manage many agents must scroll through everything to find a specific one." },
    ],
  },
  {
    id: "landing", cluster: "entry", label: "Landing Page",
    route: "/landing", roles: ["external"],
    ux: 4, imp: 3, cmp: 5, fri: 1,
    desc: "Marketing page with 9 sections. Polished premium design. Not on the authenticated critical path.",
    gaps: ["No conversion CTA to free trial / waitlist", "No demo video or product screenshot", "No social proof (customers, logos)"],
    recs: [
      { pri: "P1", text: "Add a 2-min demo video embed above the fold — investors and design partners need to see it before agreeing to a meeting." },
      { pri: "P1", text: "Add a 'Request Access' CTA that captures name + company + use case. Feed into a CRM/Notion DB for design partner tracking." },
      { pri: "P2", text: "Add 1-2 placeholder customer logos with 'Design Partner' tag once pilots are live." },
    ],
  },
  {
    id: "login", cluster: "entry", label: "Login",
    route: "/login", roles: ["architect","reviewer","governor","admin"],
    ux: 4, imp: 5, cmp: 5, fri: 1,
    desc: "259-line login page with premium glassmorphism design, ambient glow effects, SSO domain auto-detection (debounced on email input), and demo account quick-fill buttons. Well-polished.",
    gaps: ["No 'Remember me' toggle", "Demo quick-fill buttons should be hidden in production"],
    recs: [
      { pri: "P1", text: "Hide demo account quick-fill buttons behind an env flag — they shouldn't be visible in production. They're helpful for demos but look unprofessional to enterprise buyers." },
      { pri: "P2", text: "Add 'Remember this device' option to reduce SSO re-auth friction for daily users." },
    ],
  },
  {
    id: "register", cluster: "entry", label: "Register",
    route: "/register", roles: ["admin"],
    ux: 2, imp: 4, cmp: 4, fri: 3,
    desc: "Minimal register form on a gray-50 background. No workspace setup, no role selection, no branding.",
    gaps: ["No workspace/enterprise name field", "No role indication", "Styling inconsistent with rest of app", "No post-register redirect to Welcome"],
    recs: [
      { pri: "P1", text: "Add company/enterprise name field — this seeds the `enterpriseId` slug and makes the workspace feel owned immediately." },
      { pri: "P1", text: "Match the brand styling of the login page (dark bg, accent colors, Intellios mark)." },
      { pri: "P2", text: "Add a progress indicator: 'Step 1 of 3 — Create Account' so users know onboarding continues after this form." },
    ],
  },
  {
    id: "welcome", cluster: "entry", label: "Welcome / Onboarding",
    route: "/welcome", roles: ["admin","architect"],
    ux: 3, imp: 5, cmp: 4, fri: 3,
    desc: "4-step checklist pointing to Templates, Settings, Governance, and Team Invite. Static page with no progress tracking.",
    gaps: ["No progress tracking (can't tell which steps are done)", "Steps are the same for every role — Architect ≠ Admin goals", "No 'Skip for now' — feels mandatory", "Doesn't surface the #1 action (create your first agent)"],
    recs: [
      { pri: "P0", text: "Make 'Create your first agent' the hero action — it should be a big primary button, not buried as step 4. First-time value comes from seeing the intake experience." },
      { pri: "P1", text: "Persist checklist completion state in DB. Show a green checkmark once each step is visited." },
      { pri: "P1", text: "Personalize by role: Architect sees Design Studio first; Admin sees Settings + Invite Team first." },
    ],
  },
  {
    id: "invite", cluster: "entry", label: "Invite Accept",
    route: "/auth/invite", roles: ["architect","reviewer","governor"],
    ux: 3, imp: 4, cmp: 4, fri: 2,
    desc: "Invited user acceptance flow. Functional but same minimal styling as Register.",
    gaps: ["No context about who invited them or why", "No preview of what the platform does"],
    recs: [
      { pri: "P2", text: "Show the inviter's name and enterprise name: 'Sarah Chen at Acme Bank has invited you to Intellios.' — adds trust and context." },
    ],
  },
  {
    id: "password-reset", cluster: "entry", label: "Password Reset",
    route: "/auth/forgot-password, /auth/reset-password", roles: ["architect","reviewer","governor","admin"],
    ux: 3, imp: 3, cmp: 4, fri: 2,
    desc: "Two-page password recovery flow: email submission and token-based reset. Functional, standard pattern.",
    gaps: ["No rate limiting feedback in UI", "No success confirmation page — just redirects to login"],
    recs: [
      { pri: "P2", text: "Add a confirmation screen after successful reset: 'Password updated. Sign in with your new password.' with a direct login button. Reduces confusion about whether the reset actually worked." },
    ],
  },

  // ── B. CREATE ─────────────────────────────────────────────────────────────
  {
    id: "design-studio", cluster: "create", label: "Design Studio (List)",
    route: "/intake", roles: ["architect"],
    ux: 5, imp: 5, cmp: 5, fri: 1,
    desc: "Polished session list with tab navigation (In Progress / Complete), search, staleness badges, domain strip, ghost cleanup. Heavily iterated across Sessions 085–087.",
    gaps: ["No session duplication / 'clone this session' shortcut", "No bulk archive/delete for power users"],
    recs: [
      { pri: "P2", text: "Add 'Duplicate session' context menu item — useful when iterating on variations of the same agent concept." },
    ],
  },
  {
    id: "quick-start", cluster: "create", label: "Quick Start Modal",
    route: "/intake (modal)", roles: ["architect"],
    ux: 4, imp: 5, cmp: 5, fri: 1,
    desc: "Tabbed modal: 'Describe Your Agent' (conversational path) and 'Start from Template' (express-lane). Clean entry point.",
    gaps: ["No recent templates shortcut", "No 'clone from existing agent' tab"],
    recs: [
      { pri: "P2", text: "Add a third tab: 'Clone Existing Agent' — shows last 3 deployed agents as starting points. Reduces time-to-blueprint for mature teams." },
    ],
  },
  {
    id: "intake-session", cluster: "create", label: "Conversational Intake",
    route: "/intake/[sessionId]", roles: ["architect"],
    ux: 5, imp: 5, cmp: 5, fri: 1,
    desc: "The platform's flagship experience. 3-phase conversation engine (Context → Requirements → Review). Domain Progress Strip, live Design Intelligence panel, transparency metadata streaming, governance checklist. Iterated across Sessions 072–086.",
    gaps: ["Re-entering a cold session still feels jarring — no warm recap of where you left off", "Stakeholder invite UX inside the session is buried"],
    recs: [
      { pri: "P1", text: "On session re-entry, show a 1-sentence AI summary: 'Last session: you covered 5/7 domains for a Customer Service agent. Remaining: Execution, Ownership.' Eliminates cold-start friction for returning users." },
      { pri: "P2", text: "Surface the 'Invite Stakeholder' action as a visible chip in the domain strip, not buried in a menu." },
    ],
  },
  {
    id: "intake-review", cluster: "create", label: "Intake Review (Phase 3)",
    route: "/intake/[sessionId] (Phase 3 state)", roles: ["architect"],
    ux: 4, imp: 5, cmp: 5, fri: 2,
    desc: "754-line Phase 3 component that renders after the conversational intake is complete. Shows the full structured payload review before blueprint generation: CompletenessMap, AmbiguityFlags (expandable), StakeholderContributions by domain, Policy quality items, Risk tier badge, Data sensitivity level, Capture verification checklist, and the final 'Generate Blueprint' CTA. This is the last human checkpoint before the blueprint is created — a critical decision point.",
    gaps: ["No inline resolution of AmbiguityFlags — users must go back into conversation to fix flagged issues", "Generate button shows no estimated time (generation can take 15-30s)", "No 'Save and continue later' — abandoning this screen means re-running the conversation", "AmbiguityFlags can be dense and scary — no prioritization (which ambiguity matters most?)"],
    recs: [
      { pri: "P1", text: "Add an estimated generation time to the 'Generate Blueprint' button: 'Generate Blueprint (~20s)'. Users who click and see nothing happen for 10 seconds often click again or navigate away. File: src/components/intake/intake-review.tsx — add a timing estimate next to the CTA." },
      { pri: "P1", text: "Allow inline resolution of AmbiguityFlags before generating. Each flag should have a quick-resolve input: 'Add clarification' that appends to the payload. Currently users must navigate back into the conversation to resolve them, which breaks flow." },
      { pri: "P2", text: "Prioritize AmbiguityFlags by impact: show 'High impact' flags first (those that would affect governance or capabilities) vs. 'Low impact' flags. A list of 8 ambiguity flags feels overwhelming without priority context." },
    ],
  },
  {
    id: "express-lane", cluster: "create", label: "Express Lane Editor",
    route: "/intake/express/[templateId]", roles: ["architect"],
    ux: 3, imp: 5, cmp: 4, fri: 2,
    desc: "Template-based fast path. Section-by-section editor with collapsible cards (Identity, Capabilities, Constraints, Governance). Just shipped in Session 088 — less battle-tested.",
    gaps: ["No field validation feedback — errors only surface on Submit", "No preview of the resulting ABP before generating", "Governance section (policies editor) is complex — users may get stuck", "'Generate Blueprint' button doesn't show estimated time"],
    recs: [
      { pri: "P0", text: "Add inline validation on required fields (agent name, purpose). Show errors as users type, not only on submit — the current form-level error pattern is a known UX anti-pattern." },
      { pri: "P1", text: "Add a 'Preview ABP' side panel before submitting. Show a read-only view of what will be generated — reduces anxiety on an irreversible action." },
      { pri: "P1", text: "Add a progress indicator showing completion across 4 sections (Identity ✓ · Capabilities ✓ · Constraints · Governance). Users need orientation in a long form." },
    ],
  },
  {
    id: "templates", cluster: "create", label: "Template Gallery",
    route: "/templates", roles: ["architect"],
    ux: 4, imp: 4, cmp: 4, fri: 1,
    desc: "Marketplace grid of built-in templates with governance tier badges, category labels, ratings. Updated to link into express-lane flow.",
    gaps: ["No search or filter by industry / risk tier", "No 'used by N teams' social proof signal", "No way to preview a template's full ABP before selecting it"],
    recs: [
      { pri: "P1", text: "Add filter tabs: All / Financial Services / Healthcare / General. Enterprise buyers think in verticals — surfacing relevant templates immediately reduces decision fatigue." },
      { pri: "P2", text: "Add a modal preview of the template's full ABP structure (6 sections, policies, constraints) before the user clicks 'Use Template'." },
    ],
  },
  {
    id: "stakeholder", cluster: "create", label: "Stakeholder Contribution",
    route: "/contribute/[token]", roles: ["stakeholder"],
    ux: 3, imp: 4, cmp: 4, fri: 2,
    desc: "External-facing contribution workspace (264-line stakeholder-workspace.tsx) for invited stakeholders. Shows session context (agent name, description, risk tier), the stakeholder's RACI role (Accountable/Responsible/Consulted/Informed with color coding), and a collaborators list showing other invited contributors. The core contribution mechanism is an AI-guided domain-scoped chat (stakeholder-ai-chat.tsx, 224 LOC) that elicits structured requirements through conversation — the AI knows the domain (Compliance, Risk, Legal, Security, IT, Operations, Business) and guides the stakeholder to articulate constraints, policies, and requirements. On submission, the contribution is formatted as a StakeholderContribution and sent back to the intake session.",
    gaps: ["No mobile-responsive check done — external stakeholders often access invite links on mobile", "No clear guidance on what 'good' contribution looks like — the AI chat helps but some domain experts still don't know what level of detail is expected", "Expired invitation shows a functional error but doesn't offer a 'Request new link' action", "No progress indicator — stakeholder doesn't know how far through the session they are"],
    recs: [
      { pri: "P1", text: "Add a 'Request new invitation link' button on the expired-token error page. Stakeholders often click invite links days or weeks after receiving them — expiry is common and the current dead-end error is a hard blocker. Add a simple email-yourself-a-new-link form." },
      { pri: "P1", text: "Add a brief orientation message above the AI chat: 'You've been invited to help design [Agent Name] as the [Compliance] expert. Your input on required policies and regulatory constraints will shape how this AI agent behaves. This takes ~10 minutes.'" },
      { pri: "P2", text: "Add a completion confirmation screen: 'Your [Compliance] input has been captured. The design team will incorporate it into the agent blueprint. You'll be notified when the blueprint is ready for review.' Closes the loop on what happens after submission." },
    ],
  },

  // ── C. REVIEW ─────────────────────────────────────────────────────────────
  {
    id: "blueprint-list", cluster: "review", label: "Blueprint Access (no list page)",
    route: "/blueprints/[id] (via Registry or Review)", roles: ["architect","reviewer"],
    ux: 3, imp: 5, cmp: 3, fri: 3,
    desc: "No dedicated blueprint list page exists. Blueprints are accessed indirectly through Agent Registry (/registry/[agentId]) or Review Queue (/review). The /blueprints/[id] detail route works but has no parent list view. Users cannot browse or search across all blueprints.",
    gaps: ["No blueprint list page — architects can't browse/search all blueprints across agents", "Only accessible by knowing a specific blueprint ID or navigating from another page", "No way to find orphaned or draft blueprints that haven't been attached to an agent"],
    recs: [
      { pri: "P0", text: "Create /blueprints/page.tsx — a searchable blueprint list page. Include: status filter (draft/in_review/approved/deployed), risk tier filter, version info, and link to parent agent. Architects need a dedicated view to manage blueprints across their portfolio. Model it on the Design Studio list (/intake) UX which is already polished." },
      { pri: "P1", text: "Add the blueprint list to the main sidebar nav. Currently the nav likely goes: Design Studio → Templates → Registry → Review. Blueprints as a lifecycle stage between design and registry is missing." },
    ],
  },
  {
    id: "blueprint-detail", cluster: "review", label: "Blueprint Detail",
    route: "/blueprints/[id]", roles: ["architect","reviewer"],
    ux: 4, imp: 5, cmp: 5, fri: 1,
    desc: "Rich 1125-line blueprint detail page. Sections, governance validation, violations, companion chat, refinement, simulation, export. The most feature-complete page in the platform.",
    gaps: ["Companion chat and simulation are powerful but their entry points aren't discoverable", "Evidence package export doesn't have a clear CTA"],
    recs: [
      { pri: "P1", text: "Add a persistent action tray on the right side: 'Refine with AI · Simulate · Export · Deploy' — the 4 core actions. Currently these are scattered across tabs and menus." },
    ],
  },
  {
    id: "companion-chat", cluster: "review", label: "Blueprint AI Companion",
    route: "/blueprints/[id] (Companion Chat panel)", roles: ["architect","reviewer"],
    ux: 4, imp: 4, cmp: 4, fri: 1,
    desc: "314-line AI companion chat panel within blueprint-detail. Uses streaming useChat with the AI SDK. Provides 4 suggested entry prompts ('What should I improve first?', 'Explain the governance violations', 'Is this blueprint ready for review?', 'Suggest improvements to the instructions'). SuggestedChange cards show priority-colored (high/medium/low) refinement suggestions with individual copy-prompt and apply-change actions. Distinctive AI-powered refinement experience that directly differentiates Intellios from static blueprint tools.",
    gaps: ["No conversation history persistence — messages are lost on page refresh or navigation", "Applying a suggested change requires copying the prompt and manually pasting — no one-click apply", "No way to see what changed in the blueprint as a result of a suggestion", "Suggested prompts are static — they don't adapt based on current blueprint state (e.g., if there are governance violations, 'Explain violations' should auto-surface as the top prompt)"],
    recs: [
      { pri: "P1", text: "Implement one-click 'Apply Suggestion' that sends the refinementPrompt directly to the blueprint refinement API without copy-paste. The refinement endpoint already exists — wire the SuggestChangeCard's apply button to it. File: src/components/blueprint/companion-chat.tsx — replace the copy-paste pattern with a direct API call." },
      { pri: "P1", text: "Persist companion chat history per blueprint in the DB (or localStorage as fallback). Architects return to blueprints multiple times during refinement — losing their conversation context is a significant friction point." },
      { pri: "P2", text: "Make suggested prompts context-aware: read the blueprint's current validationStatus and surface relevant prompts. If there are policy violations, auto-rank 'Explain the governance violations' as prompt #1. This turns the companion from a static tool into an intelligent advisor." },
    ],
  },
  {
    id: "refinement-chat", cluster: "review", label: "Blueprint Refinement Chat",
    route: "/blueprints/[id] (Refine tab — chat that directly modifies the ABP)", roles: ["architect"],
    ux: 4, imp: 5, cmp: 5, fri: 1,
    desc: "130-line streaming chat interface that DIRECTLY modifies the Agent Blueprint Package. Distinct from companion-chat (which advises) — refinement-chat calls /api/blueprints/[id]/refine/stream and triggers onBlueprintUpdated with the new ABP after each successful stream. The architect types a refinement instruction ('Make the agent refuse PII requests', 'Add a 30-second timeout constraint') and the blueprint is updated in place, triggering a re-render of the blueprint view. The core AI-driven blueprint editing mechanism.",
    gaps: ["No diff preview before changes are applied — users can't see what will change before confirming", "No undo / rollback for a refinement turn — a bad instruction permanently modifies the current version", "No confirmation step for high-impact changes (e.g., changing the risk tier or removing a policy)", "Streaming updates the blueprint live but doesn't auto-scroll to the changed section so users see what changed"],
    recs: [
      { pri: "P1", text: "Add a diff preview step before applying: show a before/after ABP diff and require a 'Confirm Changes' click before committing. The version-diff component already exists — render it inline before the ABP is updated. This is the single most important UX guard for an action that directly modifies production-bound blueprints." },
      { pri: "P1", text: "Add a 'Create version checkpoint' button before starting a refinement session. If the user goes too far, they need a named restore point. The blueprint versioning system supports this — wire it to a 'Save version before refining' CTA." },
      { pri: "P2", text: "After a successful refinement, auto-highlight the changed section in the blueprint view: 'Updated: Constraints → Timeout. See what changed ↓'. Closes the loop between the chat instruction and the visible blueprint change." },
    ],
  },
  {
    id: "red-team-panel", cluster: "review", label: "Red Team Testing Panel",
    route: "/blueprints/[id] or /registry/[agentId] (Red Team tab within Simulate)", roles: ["architect","reviewer","governor"],
    ux: 3, imp: 4, cmp: 4, fri: 2,
    desc: "249-line automated adversarial testing panel. Runs a battery of attack scenarios against the blueprint's system prompt, organized by ATTACK_CATEGORY_LABELS. Each attack shows: category label, PASS/FAIL verdict, the attack prompt, and agent response (expandable). Risk tier badge (LOW/MEDIUM/HIGH/CRITICAL) summarizes the overall report. Accessed from within SimulatePanel. A meaningful enterprise security feature that most users likely don't discover.",
    gaps: ["No ability to re-run a subset of attacks (e.g., just the CRITICAL failures) — must re-run all", "No export of the red team report as a security artefact", "Report not linked to the blueprint's governance validation — a CRITICAL red team result should block deployment", "No history of previous red team runs — can't compare before/after a blueprint refinement"],
    recs: [
      { pri: "P1", text: "Add 'Export Red Team Report' as PDF/JSON. This is a security evidence artefact that governance teams need for audit files and examiner responses. The report data is already structured — serialize it to the existing evidence-package endpoint. File: src/components/registry/red-team-panel.tsx — add an export button to the report header." },
      { pri: "P1", text: "Block deployment if the Red Team risk tier is HIGH or CRITICAL — surface a warning in the Deploy Console: 'This blueprint has unresolved red team findings at [CRITICAL] risk. Review required before deploying.' Wire the deploy flow to check the latest red team report." },
      { pri: "P2", text: "Store red team run history per blueprint version so architects can compare results before and after a refinement. Even a simple 'Run history: [v1.0: MEDIUM] [v1.1: LOW]' would show improvement trajectory." },
    ],
  },
  {
    id: "review-decision", cluster: "review", label: "Review Decision Panel",
    route: "/blueprints/[id] (Review panel — within blueprint-detail)", roles: ["reviewer"],
    ux: 4, imp: 5, cmp: 5, fri: 1,
    desc: "440-line inline review decision experience within blueprint-detail. Renders an AI-generated RiskBrief (riskLevel: low/medium/high, summary, keyPoints[], recommendation with reason) that gives reviewers an AI pre-assessment before they decide. Three action buttons: Approve, Request Changes (with comment field), Reject (with reason field). Embeds a collapsible VersionDiff showing what changed from the prior version. The human decision point in the entire Intellios workflow — the moment governance is enforced or waived.",
    gaps: ["No SLA badge showing how long this blueprint has been waiting for review", "AI recommendation can be incorrect, but there is no 'I disagree with AI assessment' feedback mechanism — the recommendation could bias reviewers", "Approval does not auto-notify the requester — architect has to discover the status change themselves", "Review comments are not threaded — all comments appear flat, no reference to specific sections"],
    recs: [
      { pri: "P1", text: "Add an SLA badge: 'Waiting 3 days · SLA: 5 days · 2 remaining'. Reviewers are often unaware of urgency — the SLA context changes behavior. The governor's SLA computation already exists (src/app/governor/page.tsx lines 59-70) — expose it in the review panel header." },
      { pri: "P1", text: "Send an in-app notification (and optionally email) to the blueprint creator on approval, rejection, or change request. Currently architects must poll the blueprint status page — this is a fundamental workflow gap. The notification system already exists — add a send-notification call to the review submission handler." },
      { pri: "P2", text: "Add an 'AI Assessment Feedback' thumb up/down on the RiskBrief. This creates a training signal that improves risk brief accuracy over time, and reduces reviewer over-reliance on AI by making them actively evaluate it." },
    ],
  },
  {
    id: "blueprint-quality", cluster: "review", label: "Blueprint Quality Scores",
    route: "/blueprints/[id] (Quality tab) + /registry/[agentId] (Quality tab)", roles: ["architect","reviewer","governor"],
    ux: 4, imp: 4, cmp: 4, fri: 1,
    desc: "409-line quality scoring dashboard available in both blueprint-detail (pre-deploy) and agent-detail (post-deploy). Pre-deploy dimensions: intentAlignment, toolAppropriateness, instructionSpecificity, governanceAdequacy, ownershipCompleteness — each scored by AI evaluation. Post-deploy ProductionQuality overlay: policyAdherenceRate, uptime, errorRate, productionScore. Line chart trends for quality over time (QualityTrendRow). AI-generated quality flags as actionable improvement signals.",
    gaps: ["Quality scores are computed by AI with no explanation of how each dimension is evaluated — a score of 3.2 on 'toolAppropriateness' is meaningless without criteria", "No minimum quality threshold that blocks blueprint progression — a score of 1 can still proceed to review", "Quality flags are displayed as text but have no 'Fix this' action path", "No comparison of quality scores between blueprint versions"],
    recs: [
      { pri: "P1", text: "Add per-dimension rubric tooltips: hover over 'Tool Appropriateness: 3.2/5' and see the scoring criteria ('5 = all required tool calls are specified and scoped correctly; 3 = some tools are listed but descriptions are vague'). Without criteria, the score is unactionable." },
      { pri: "P1", text: "Add a configurable quality gate: if the overall score falls below a threshold (e.g., 3.0), surface a warning before the architect can submit for review. This creates a quality baseline without blocking power users." },
      { pri: "P2", text: "Show quality score delta vs. previous version: 'v1.2 vs v1.1: instructionSpecificity ↑ 0.8 · governanceAdequacy ↓ 0.2'. Architects need to know if their refinement improved or degraded quality." },
    ],
  },
  {
    id: "agent-test-harness", cluster: "review", label: "Blueprint Test Harness",
    route: "/registry/[agentId] (Tests tab)", roles: ["architect","reviewer"],
    ux: 4, imp: 5, cmp: 4, fri: 2,
    desc: "Behavioral verification system in agent-detail's Tests tab. Create named test cases with an inputPrompt, expectedBehavior (natural-language), and severity (required = gates approval / informational = advisory). Run all cases against the current blueprint version — each is executed via the simulation API and evaluated by Claude-as-judge, which produces an evaluationRationale for the pass/fail verdict. TestRun status: running / passed / failed / error. Admin setting 'requireTestsBeforeApproval' (in admin-settings) can gate blueprint submission on a passing test run. API: /registry/[agentId]/test-cases (CRUD) and /blueprints/[id]/test-runs (run + history). This is Phase 23's behavioral verification layer — the formal evidence that the agent behaves as intended.",
    gaps: ["No test case templates or library — architects write every case from scratch, even common scenarios like PII exfiltration or out-of-scope requests", "expectedBehavior is free-text with no structure — pass/fail quality depends entirely on how well the architect phrases expectations", "No progress indicator during 'running' status — test runs take 30-90s and a blank spinner causes users to navigate away thinking it froze", "No cross-version comparison — can't see if a blueprint refinement broke previously passing tests"],
    recs: [
      { pri: "P1", text: "Add a test case template library seeded by risk tier. Standard: 'PII exfiltration attempt', 'Out-of-scope request', 'Prompt injection probe'. Critical adds: 'Escalation bypass', 'Data exfiltration'. One-click import from library. Regulated teams need auditable test coverage — pre-seeding removes the blank-canvas problem." },
      { pri: "P1", text: "Show a live progress indicator during test runs: 'Running case 3 of 7 · ~40s remaining'. The current spinner with no context causes architects to navigate away on a slow connection, losing the run state." },
      { pri: "P2", text: "Add a cross-version test comparison table: 'v1.1: 6/7 passed → v1.2: 7/7 passed ✓'. Architects need assurance that refinement didn't regress previously passing behavior. This is the most valuable QA signal during iterative blueprint development." },
    ],
  },
  {
    id: "regulatory-panel", cluster: "review", label: "Regulatory Framework Mapping",
    route: "/blueprints/[id] or /registry/[agentId] (Regulatory tab)", roles: ["architect","reviewer","governor"],
    ux: 3, imp: 4, cmp: 4, fri: 2,
    desc: "216-line per-blueprint regulatory compliance mapping. Shows evidence status (satisfied / partial / missing) for each requirement within configured frameworks: EU AI Act (with risk tier classification), SR 11-7, GDPR, NIST. Each requirement shows its evidence status and a color-coded badge. Distinct from the workspace-level compliance-posture page (/compliance) — this is per-blueprint regulatory assessment, not fleet-wide posture.",
    gaps: ["Missing requirements have no 'how to fix' guidance — a 'missing' status for EU AI Act Article 13 gives no path to resolution", "No export of the regulatory mapping as a compliance evidence package", "Framework coverage doesn't link to the specific policies in governance-hub that would satisfy each requirement", "The EU AI Act risk tier classification is shown but its implications are not explained"],
    recs: [
      { pri: "P1", text: "For each 'missing' requirement, show a contextual fix suggestion: 'To satisfy EU AI Act Art. 13 (Transparency), add a transparency disclosure policy in Governance → Policies.' Link to the specific governance policy creation flow. This turns the regulatory panel from a read-only status board into an actionable compliance guide." },
      { pri: "P2", text: "Add a one-click 'Export Regulatory Evidence' button that generates a PDF mapping of the blueprint to each framework requirement. This is the artefact auditors request — not the screen view." },
    ],
  },
  {
    id: "review-queue", cluster: "review", label: "Review Queue",
    route: "/review", roles: ["reviewer","governor"],
    ux: 4, imp: 5, cmp: 4, fri: 2,
    desc: "193-line review queue with multi-step approval chain visualization (completed/active/pending badges), governance status badges, and role-aware filtering. Good approval workflow UX — but missing operational tooling.",
    gaps: ["No priority sorting (by risk tier, by SLA breach)", "No bulk approve for low-risk agents", "No reviewer assignment — any reviewer can take any item", "No SLA countdown showing when a review is overdue"],
    recs: [
      { pri: "P0", text: "Add priority sorting by risk tier (critical → enhanced → standard) and SLA status. A critical-tier agent waiting 5 days should be surfaced immediately — currently it blends in with standard items. File: src/app/review/page.tsx — add a sortBy state with risk_tier and sla_remaining options." },
      { pri: "P1", text: "Add an SLA timer badge: 'Overdue 2d' in red. The governor page already computes SLA remaining (src/app/governor/page.tsx lines 59-70) — reuse that logic in the review queue cards." },
      { pri: "P1", text: "Add reviewer assignment ('Assign to me'). Without assignment, reviewers have no ownership signal and items fall through the cracks. Requires a `reviewer_id` column on agent_blueprints or a new review_assignments table." },
    ],
  },

  // ── D. GOVERN ─────────────────────────────────────────────────────────────
  {
    id: "governance-hub", cluster: "govern", label: "Governance Hub",
    route: "/governance", roles: ["governor","admin","architect"],
    ux: 3, imp: 5, cmp: 5, fri: 2,
    desc: "1005-line governance hub combining policy list, framework tags (SR 11-7, EU AI Act, GDPR), analytics (agent status counts, validation pass rate, violation heatmaps, monthly submissions/approvals, top violated policies), policy simulation (impact analysis), and template packs (pre-built policy bundles). Feature-rich but dense.",
    gaps: ["Information density is high — no progressive disclosure or role-based filtering", "Simulation feature is powerful but not discoverable", "Template packs are buried below the fold"],
    recs: [
      { pri: "P1", text: "Add a 'Quick Actions' section at the top: 'Apply Template Pack' (for new workspaces) and 'Simulate Policy Change' (for mature workspaces). These are the two highest-value features on this page but they're buried. File: src/app/governance/page.tsx." },
      { pri: "P1", text: "Collapse the analytics section by default and show a 1-line summary: 'Pass rate: 87% · 3 violations this week'. Users can expand for the full heatmap. Reduces cognitive load on a page that's already 1000+ lines." },
    ],
  },
  {
    id: "policy-form", cluster: "govern", label: "Policy Form (Create / Edit)",
    route: "/governance/policies/new, /governance/policies/[id]/edit", roles: ["governor","admin"],
    ux: 3, imp: 4, cmp: 4, fri: 3,
    desc: "Shared 865-line PolicyForm component used by both the new-policy page and the edit-policy page. Covers policy name, type, description, rules, enforcement mode, and framework tags. Note: there is NO separate /governance/policies list page — the policy list lives inside /governance (the hub). The form pages exist but the navigational context back to the hub may be unclear.",
    gaps: ["No breadcrumb navigation showing where you are in the governance hierarchy", "No 'affected agents' preview before saving — users can't see downstream impact", "No auto-save or draft state — losing a long policy mid-edit is destructive", "Rule builder UI is complex with no inline guidance"],
    recs: [
      { pri: "P1", text: "Add an 'Affected Agents' live preview panel on the right side of the policy form. Show which agents would be impacted by the policy being created/edited, with their current pass/fail status. The /api/governance/policies/simulate endpoint already exists — wire it to the form. File: src/components/governance/policy-form.tsx." },
      { pri: "P1", text: "Add auto-save every 30 seconds and a 'Draft saved' indicator. A governor could spend 20 minutes building a complex policy and lose everything on a navigation error. File: src/app/governance/policies/new/page.tsx — add a useAutoSave hook." },
      { pri: "P2", text: "Add a breadcrumb: 'Governance → Policies → New Policy'. The form is currently context-free — users don't know where they are in the hierarchy." },
    ],
  },
  {
    id: "compliance-posture", cluster: "govern", label: "Compliance Posture",
    route: "/compliance", roles: ["governor","admin"],
    ux: 3, imp: 4, cmp: 5, fri: 2,
    desc: "810-line compliance overview page. Framework coverage (SR 11-7, EU AI Act, NIST). Substantial implementation.",
    gaps: ["No exportable compliance report from this page", "No trend line showing posture over time"],
    recs: [
      { pri: "P1", text: "Add a one-click 'Export Compliance Report' button that generates a PDF summary — this is the deliverable governance teams need for board meetings and examiner responses." },
    ],
  },
  {
    id: "governor-executive", cluster: "govern", label: "Governor Executive View",
    route: "/governor/executive", roles: ["governor"],
    ux: 3, imp: 3, cmp: 4, fri: 2,
    desc: "310-line executive metrics view. Portfolio-level numbers for governance leadership.",
    gaps: ["No date range selector", "No role context — looks the same as other pages, doesn't feel like an 'executive' experience"],
    recs: [
      { pri: "P2", text: "Add a date range picker (Last 30/90/365 days) and a summary narrative: 'This quarter: 14 agents deployed, 3 compliance violations resolved, posture improved from 72% to 91%.' Executives need narrative, not just numbers." },
    ],
  },
  {
    id: "governor-hub", cluster: "govern", label: "Governor Command Center",
    route: "/governor", roles: ["governor"],
    ux: 4, imp: 5, cmp: 5, fri: 1,
    desc: "302-line governor landing page with 4 summary cards (Pending Approvals, Policy Health, Compliance KPIs, Audit Activity 24h), portfolio trend sparklines (compliance rate, violations, fleet size), and SLA remaining calculations. Well-structured command center. Sub-pages (approvals, audit, fleet, policies) are 2-line re-exports of their original pages.",
    gaps: ["Sub-pages (approvals, audit, fleet, policies) re-export originals without governor-specific context headers", "No quick-action buttons from the command center (e.g., 'Review next critical' shortcut)", "Sparkline data may be stale — no refresh indicator"],
    recs: [
      { pri: "P1", text: "Add governor context banner to re-exported sub-pages: 'Viewing as Governor — fleet-wide view' with a risk tier filter. Currently /governor/approvals looks identical to /review — the governor needs role framing. Files: src/app/governor/approvals/page.tsx, audit/page.tsx, fleet/page.tsx, policies/page.tsx — wrap re-exports in a GovernorContextProvider." },
      { pri: "P1", text: "Add 'Review next critical' quick-action on the command center that jumps directly to the highest-priority unreviewed blueprint. The SLA data is already computed — wire it to a CTA." },
      { pri: "P2", text: "Add a last-refreshed timestamp on sparkline cards so governors know they're seeing current data." },
    ],
  },
  {
    id: "governor-calendar", cluster: "govern", label: "Review Calendar",
    route: "/governor/calendar", roles: ["governor"],
    ux: 3, imp: 3, cmp: 4, fri: 2,
    desc: "180-line calendar view for periodic review scheduling. Useful for compliance cadence.",
    gaps: ["No iCal sync UX (API exists at /api/compliance/calendar.ics but not surfaced)", "No color coding by review type / urgency"],
    recs: [
      { pri: "P2", text: "Surface the 'Add to Calendar' (.ics download) button prominently — the API endpoint exists but there's no UI affordance. Governance teams live in Outlook/Google Calendar." },
    ],
  },

  // ── E. OPERATE ────────────────────────────────────────────────────────────
  {
    id: "deploy-console", cluster: "operate", label: "Deploy Console",
    route: "/deploy", roles: ["architect","admin"],
    ux: 4, imp: 5, cmp: 5, fri: 1,
    desc: "736-line deployment console with confirmation modal (change reference, deployment notes, authorization checkbox), AgentCore progress phases (confirm → deploying → success → error), ready-to-deploy section with export + direct deploy buttons, live deployments table, and sophisticated error enrichment mapping AWS errors to human-readable messages.",
    gaps: ["No rollback action — if a deploy fails, users need a quick 'deploy previous version' CTA", "No deployment history timeline (only current deployments table)", "No pre-deploy diff showing what changed since last deployment"],
    recs: [
      { pri: "P1", text: "Add a 'Rollback to previous version' button on failed or problematic deployments. The blueprint versioning system already tracks previous versions — wire it to a one-click redeploy. File: src/app/deploy/page.tsx — add to the error state UI." },
      { pri: "P2", text: "Add a deployment history timeline: 'v1.2 deployed 3d ago → v1.3 deployed now'. Gives operators temporal context for debugging." },
    ],
  },
  {
    id: "registry", cluster: "operate", label: "Agent Registry",
    route: "/registry", roles: ["architect","governor"],
    ux: 3, imp: 4, cmp: 4, fri: 2,
    desc: "343-line registry page. Deployed agent list with status, lifecycle controls, search. Functional but less polished than Design Studio.",
    gaps: ["No grouping by risk tier or deployment environment", "Status badge meanings aren't explained (no legend)", "No quick health indicator on list items"],
    recs: [
      { pri: "P1", text: "Add a health pulse indicator on each registry row: green/amber/red dot from recent telemetry. Users shouldn't need to click into an agent to know if it's healthy." },
      { pri: "P2", text: "Add a status legend tooltip — 'draft / pending_review / approved / deployed / suspended / archived' are meaningful states that first-time users won't understand without guidance." },
    ],
  },
  {
    id: "agent-detail", cluster: "operate", label: "Agent Detail",
    route: "/registry/[agentId]", roles: ["architect","reviewer","governor"],
    ux: 4, imp: 5, cmp: 5, fri: 1,
    desc: "1631-line agent detail page — the most feature-rich page in the codebase. Includes BlueprintView, BlueprintSummary, StatusBadge, LifecycleControls, ValidationReportView, ReviewPanel, RegulatoryPanel, VersionDiff, SimulatePanel, QualityDashboard, test case management, and agent health status. Comprehensive agent lifecycle view.",
    gaps: ["Feature density creates cognitive overload — too many tabs and panels competing for attention", "No guided pathway for common actions (approve, deploy, review)", "Health status could be more prominent in the header"],
    recs: [
      { pri: "P1", text: "Add a contextual action bar at the top that changes based on agent status: Draft → 'Submit for Review', In Review → 'Approve / Reject', Approved → 'Deploy'. Progressive disclosure of the right action at the right time." },
      { pri: "P2", text: "Move AgentHealth (healthStatus, errorCount) into the page header as a persistent badge. Currently health data exists but isn't the first thing a user sees when they open an agent." },
    ],
  },
  {
    id: "workflow-detail", cluster: "operate", label: "Workflow Agent Detail",
    route: "/registry/workflow/[id]", roles: ["architect","governor"],
    ux: 3, imp: 3, cmp: 4, fri: 2,
    desc: "277-line workflow agent detail page showing WorkflowDefinition structure (steps, agents, routing), version info, status badge, enterprise scope. Covers multi-agent workflow orchestration use case distinct from single-agent blueprints.",
    gaps: ["No visual workflow graph — steps are listed textually, not as a flow diagram", "No execution history or run logs", "Limited lifecycle controls compared to single-agent Registry detail", "No workflow list page — /app/workflows/ has no page.tsx. Users can navigate to a workflow detail directly but cannot browse or search across all workflows"],
    recs: [
      { pri: "P2", text: "Add a simple step-flow visualization: boxes and arrows showing workflow stages. Even a basic left-to-right flow diagram communicates the orchestration pattern far better than a text list. Use the existing step data from WorkflowDefinition.steps." },
    ],
  },
  {
    id: "simulate-panel", cluster: "operate", label: "Agent Simulation Sandbox",
    route: "/registry/[agentId] or /blueprints/[id] (Simulate tab)", roles: ["architect","reviewer"],
    ux: 4, imp: 5, cmp: 5, fri: 1,
    desc: "211-line live sandbox chat powered by the blueprint's simulation system prompt. Uses useChat with DefaultChatTransport and a custom fetch wrapper that injects a firstMessage audit flag on the first send (so the API writes an audit entry). Stateless client-side sandbox — messages are not persisted. Renders the RedTeamPanel tab alongside the live chat. A critical QA experience: the only way to interactively test agent behavior before deploy.",
    gaps: ["Sandbox state is lost on tab switch or page refresh — test conversations can't be resumed", "No saved test scenario library — architects run the same test cases repeatedly with no way to save them", "No side-by-side comparison between blueprint versions in the sandbox", "The firstMessage audit flag is a hidden mechanism — no visible indication that this session is being logged"],
    recs: [
      { pri: "P1", text: "Add a saved scenario library: architects should be able to bookmark test prompts they run repeatedly ('PII exfiltration attempt', 'Out-of-scope request', 'Edge case: empty input'). A simple list of saved prompts at the top of the sandbox would dramatically improve repeatability. File: src/components/registry/simulate-panel.tsx." },
      { pri: "P1", text: "Show an audit indicator: a small badge ('This session is being audited') on the sandbox header. The firstMessage flag writes an audit entry — users should know their simulation is logged, both for trust and for compliance evidence." },
      { pri: "P2", text: "Add a version selector to the sandbox: 'Simulating v1.2 · Switch to v1.1'. Architects who just refined a blueprint need to verify the simulation improved — currently they'd need to navigate to the previous blueprint version manually." },
    ],
  },
  {
    id: "production-dashboard", cluster: "operate", label: "Production Telemetry Dashboard",
    route: "/registry/[agentId] (Production tab)", roles: ["architect","governor","admin"],
    ux: 4, imp: 5, cmp: 4, fri: 1,
    desc: "459-line production telemetry dashboard within agent-detail. Shows 4 KPI cards (invocations, error rate, p50/p99 latency, tokens in/out), a health badge (computed from recent error rate + latency thresholds), a div-based bar chart for daily invocations and errors over the selected period, last-seen timestamp, and an Alert Thresholds management section (create/edit/delete thresholds with metric, operator, value, window). Empty state with instrumentation guidance shown when no data exists.",
    gaps: ["Alert thresholds can be set but there is no notification channel — alerts fire internally with no delivery (no email, Slack, PagerDuty)", "No period-over-period comparison on KPI cards (no 'vs last week' delta)", "Health badge computation is client-side only — no server-side alerting when thresholds are breached", "Empty state guidance is generic — no specific code snippet showing how to push metrics to the telemetry API"],
    recs: [
      { pri: "P1", text: "Add a notification channel config to alert thresholds: email, Slack webhook URL, or PagerDuty integration key. Currently users can set thresholds but receive no notification when they're breached — the alerts are invisible unless someone is actively watching the dashboard. This is the #1 missing piece for production observability." },
      { pri: "P1", text: "Add a 'vs previous period' delta to each KPI card: '+12% invocations', '-3% error rate'. This is the context that makes the numbers meaningful. The telemetry data already exists — compute the delta from the previous equivalent window." },
      { pri: "P2", text: "Replace the empty state with a specific code snippet for the telemetry push API: 'POST /api/telemetry with {agentId, invocations, errors, latencyP50Ms}'. Admins shouldn't have to look up the API contract to instrument their agents." },
    ],
  },
  {
    id: "violations-panel-runtime", cluster: "operate", label: "Runtime Violations Panel",
    route: "/registry/[agentId] (Violations tab)", roles: ["architect","governor"],
    ux: 3, imp: 4, cmp: 4, fri: 2,
    desc: "259-line runtime governance violations panel within agent-detail. Shows violations detected by evaluateRuntimePolicies() on each telemetry push, stored in the runtimeViolations table. Severity filter (All / Errors / Warnings), time range filter (Last 24h / 7d / 30d). Each violation shows: severity badge, policy name, rule ID, metric detail (observed value vs. threshold), and timestamp. Distinct from governance-hub (policy management, pre-deploy) and production-dashboard (telemetry metrics) — this is the runtime compliance signal, the evidence that policies are being enforced in production.",
    gaps: ["No violation acknowledgement or resolution workflow — violations pile up with no signal they've been reviewed", "No export for compliance reporting — this is exactly the data auditors ask for", "No trend chart — users can't see if violations are increasing or decreasing over time", "No linking from a violation back to the policy definition that was triggered"],
    recs: [
      { pri: "P1", text: "Add violation acknowledgement: 'Acknowledge' + 'Resolve' + 'Create ticket' actions per violation row. Without resolution status, violations are noise — there's no way to distinguish known/accepted violations from new ones needing attention." },
      { pri: "P1", text: "Add a violations trend sparkline at the top: 'Violations last 30 days: [mini chart]'. A single number without trend context doesn't tell operators if the situation is improving or worsening." },
      { pri: "P2", text: "Add a 'Export violations as CSV' action with date range. SOC 2 auditors specifically request runtime violation logs as part of evidence collection." },
    ],
  },
  {
    id: "monitor", cluster: "operate", label: "Monitor",
    route: "/monitor", roles: ["architect","governor"],
    ux: 3, imp: 4, cmp: 5, fri: 2,
    desc: "664-line monitoring page. Agent health, telemetry, alerts. Substantive implementation.",
    gaps: ["No alert acknowledgement workflow — alerts pile up with no resolution path", "No comparison baseline (what does 'normal' look like for this agent?)"],
    recs: [
      { pri: "P1", text: "Add alert acknowledgement: 'Acknowledge' + 'Snooze 24h' + 'Create ticket' actions on each alert. Currently alerts are read-only — there's no workflow for resolving them." },
    ],
  },
  {
    id: "monitor-intelligence", cluster: "operate", label: "Monitor Intelligence",
    route: "/monitor/intelligence", roles: ["architect","governor"],
    ux: 3, imp: 3, cmp: 5, fri: 2,
    desc: "794-line AI-powered briefing system. Snapshots, trend analysis, intelligence briefings. Feature-complete but likely underutilized since it's discoverable only from the Monitor page.",
    gaps: ["Not surfaced from Dashboard or Registry — users who need it most may not find it", "No email digest option"],
    recs: [
      { pri: "P2", text: "Promote the daily briefing to the Dashboard as a widget: 'AI Briefing: 2 agents need attention, overall fleet health 94%.' This creates a habit of visiting Monitor Intelligence." },
    ],
  },
  {
    id: "dashboard", cluster: "operate", label: "Dashboard",
    route: "/dashboard", roles: ["architect","reviewer","governor"],
    ux: 3, imp: 4, cmp: 4, fri: 2,
    desc: "317-line dashboard. Summary metrics, activity feed. Functional but generic — the same view for all roles.",
    gaps: ["Role-blind — shows same data for Architect, Reviewer, Governor", "No personalized action prompts ('You have 3 items in review queue')", "Activity feed has no filtering"],
    recs: [
      { pri: "P1", text: "Make the dashboard role-aware. Architect: 'You have 2 sessions in progress.' Reviewer: 'You have 4 blueprints awaiting review.' Governor: 'Fleet health: 94%. 1 policy violation needs attention.'" },
      { pri: "P1", text: "Add a 'Next Actions' card with 2-3 prioritized items that link directly to the relevant experience. This is the most effective way to drive daily engagement." },
    ],
  },
  {
    id: "pipeline", cluster: "operate", label: "Pipeline View",
    route: "/pipeline", roles: ["architect","reviewer"],
    ux: 3, imp: 3, cmp: 4, fri: 2,
    desc: "475-line kanban-style pipeline view. Agent progress through lifecycle stages.",
    gaps: ["Duplicate of information available in Blueprint Studio and Registry", "No drag-to-move between stages", "Unclear who this is for vs. Blueprint Studio"],
    recs: [
      { pri: "P2", text: "Define the Pipeline view's audience explicitly: it should be for teams tracking multiple agents simultaneously (team leads, PMs). Add a 'My Agents / All Agents' toggle and team-scoped filters." },
    ],
  },

  // ── F. ADMIN ──────────────────────────────────────────────────────────────
  {
    id: "admin-settings", cluster: "admin", label: "Enterprise Settings",
    route: "/admin/settings", roles: ["admin"],
    ux: 3, imp: 5, cmp: 4, fri: 3,
    desc: "669-line enterprise governance configuration center with 7 distinct sections. (1) Branding — company name, logo URL, brand color with a live sidebar preview; this is the white-labeling configuration for enterprise customers. (2) Periodic Model Review — SR 11-7 cadence in months and reminder timing before due date. (3) Review SLA — warn/breach hour thresholds that directly control the SLA badge coloring in the review queue. (4) Governance Rules — four critical enforcement knobs: require governance validation before review, allow self-approval (SOD toggle), require tests before approval, circuit breaker (auto_suspend vs. alert_only with error-violation threshold). (5) Notifications — admin email, notify on SLA breach, notify on approval. (6) Approval Chain — multi-step sequential approval chain builder: each step specifies a role (reviewer/compliance_officer/admin); all steps must complete in order before deployment is unlocked. (7) Deployment Targets — AWS Bedrock AgentCore configuration: region, IAM role ARN, foundation model (defaulting to Claude Sonnet), optional Guardrails ID/version. The most consequential configuration page in the platform — it controls enterprise governance enforcement behavior.",
    gaps: ["No section navigation — all 7 sections are stacked vertically with no sidebar index or anchor links, making it hard to jump to Approval Chain or Deployment Targets without scrolling", "No 'Preview impact' for governance rules changes — toggling 'require tests before approval' has immediate pipeline-wide effects with no confirmation or preview", "Approval Chain builder has no validation: you can create a chain with 0 steps and it silently falls back to legacy single-step mode", "Deployment Targets section exposes AWS IAM role ARN — no validation that the ARN is valid or that the credentials have the required permissions"],
    recs: [
      { pri: "P1", text: "Add a sticky section navigation sidebar on the left: 'Branding · Periodic Review · SLA · Governance Rules · Notifications · Approval Chain · Deployment Targets'. Without it, admins configuring deployment targets must scroll past 5 other sections. The page is too long to navigate linearly." },
      { pri: "P1", text: "Add an impact preview for governance rule changes: 'Enabling requireTestsBeforeApproval will affect 4 blueprints currently in draft without test cases.' Show which agents would be blocked before the admin saves." },
      { pri: "P2", text: "Add a 'Validate Deployment Target' button that tests the AWS credentials and role ARN before saving. Admins who misconfigure the ARN won't discover the error until a deploy fails — which could be days later." },
    ],
  },
  {
    id: "admin-users", cluster: "admin", label: "User Management",
    route: "/admin/users", roles: ["admin"],
    ux: 3, imp: 4, cmp: 4, fri: 2,
    desc: "User list with invite, role assignment. Functional.",
    gaps: ["No bulk invite (CSV upload)", "No last-active indicator"],
    recs: [
      { pri: "P2", text: "Add CSV bulk invite — the first thing enterprise admins do when provisioning a new tool is invite their team. A manual one-by-one flow is a significant friction point for enterprise onboarding." },
    ],
  },
  {
    id: "admin-api-keys", cluster: "admin", label: "API Keys",
    route: "/admin/api-keys", roles: ["admin"],
    ux: 3, imp: 3, cmp: 4, fri: 2,
    desc: "176-line API key management page. Create, list, revoke API keys for programmatic access.",
    gaps: ["No usage metrics per key", "No key scoping (all keys are full-access)"],
    recs: [
      { pri: "P2", text: "Add last-used timestamp and request count per key. Admins need to identify stale keys for security hygiene — especially important for SOC 2 compliance." },
    ],
  },
  {
    id: "admin-integrations", cluster: "admin", label: "Integrations",
    route: "/admin/integrations", roles: ["admin"],
    ux: 3, imp: 3, cmp: 4, fri: 2,
    desc: "183-line integrations configuration page. Toggle connections to external systems.",
    gaps: ["No health check / connection test", "No sync status indicator"],
    recs: [
      { pri: "P2", text: "Add a 'Test Connection' button for each integration with a pass/fail result. Admins need to verify connections are live before relying on them." },
    ],
  },
  {
    id: "admin-sso", cluster: "admin", label: "SSO Configuration",
    route: "/admin/sso", roles: ["admin"],
    ux: 3, imp: 4, cmp: 5, fri: 2,
    desc: "367-line SSO configuration page. SAML/OIDC setup, IdP metadata, domain verification. Comprehensive for enterprise needs.",
    gaps: ["No SSO test user flow — admins can't verify SSO works without logging out", "Complex form with no step-by-step wizard"],
    recs: [
      { pri: "P1", text: "Add a 'Test SSO Configuration' button that opens a popup window for an SSO test login without logging out the admin. This is the #1 pain point when setting up enterprise SSO — the admin can't test without risking lockout." },
    ],
  },
  {
    id: "admin-webhooks", cluster: "admin", label: "Webhooks",
    route: "/admin/webhooks", roles: ["admin"],
    ux: 3, imp: 3, cmp: 5, fri: 1,
    desc: "649-line webhook management page with create/edit/delete, secret rotation, and test delivery. Solid implementation with good API coverage.",
    gaps: ["No delivery log / recent events", "No retry configuration"],
    recs: [
      { pri: "P2", text: "Add a delivery log showing last 10 events per webhook (timestamp, status code, response time). Debugging webhook failures is a common admin pain point." },
    ],
  },
  {
    id: "admin-fleet", cluster: "admin", label: "Fleet Overview",
    route: "/admin/fleet", roles: ["admin"],
    ux: 3, imp: 3, cmp: 4, fri: 2,
    desc: "269-line fleet overview page. Bird's-eye view of all deployed agents across the enterprise.",
    gaps: ["Overlaps with /monitor and /governor/fleet — unclear differentiation", "No cost attribution per team/department"],
    recs: [
      { pri: "P2", text: "Differentiate from Monitor by making this the cost + resource allocation view. Show per-department agent counts and estimated monthly costs. Admins care about spend; governors care about compliance." },
    ],
  },
  {
    id: "blueprint-report", cluster: "review", label: "MRM Report",
    route: "/blueprints/[id]/report", roles: ["architect","reviewer","governor","admin"],
    ux: 4, imp: 5, cmp: 5, fri: 1,
    desc: "1213-line formal Model Risk Management (MRM) Report — a server-rendered, white-labeled compliance document assembled by assembleMRMReport(). 8 numbered sections: (1) Cover (agent identity, version, company name, generated date); (2) Risk Classification (EU AI Act risk tier, overall risk level); (3) Agent Identity (name, purpose, type, owner); (4) Capabilities (tools, inputs/outputs, integrations, constraints); (5) Governance Validation (full policy evaluation, violations detail, policy lineage with version history of every evaluated policy); (6) Review Decision (multi-step approval chain record — who approved each step, timestamp, comment, decision); (7) Separation of Duties Evidence (SOD compliance proof showing different users designed vs. approved); (8) Deployment Change Record. Every page view writes an audit log entry ('blueprint.report_exported'). Two action buttons: 'Print / Save as PDF' (browser print dialog) and 'Download Evidence Package' (compliance JSON from /api/blueprints/[id]/export/compliance — only enabled for approved/deployed blueprints). Accessible to all authenticated enterprise members. The formal artefact that bank examiners, compliance teams, and model risk committees review.",
    gaps: ["No comparison against the previous blueprint version's report — auditors often need to see what changed between reviews", "Evidence Package download is JSON — auditors typically expect PDF, not raw JSON", "Report is static — if policies change after the report is generated, the report doesn't indicate that the evaluated policy versions are now superseded"],
    recs: [
      { pri: "P1", text: "Convert the Evidence Package download from JSON to PDF. The /api/blueprints/[id]/export/compliance endpoint returns a JSON bundle — valuable for programmatic use, but regulators and examiners need a formatted PDF. Add a /api/blueprints/[id]/export/pdf endpoint that renders the MRM report server-side as a PDF (using puppeteer or react-pdf). The print dialog exists but produces variable-quality output depending on the browser." },
      { pri: "P2", text: "Add a 'View previous version' comparison link at the top: 'Comparing v1.2 vs v1.1 — see what changed'. Show section diffs inline (governance rules added/removed, new tools). Auditors reviewing re-approvals need to see delta evidence, not just current state." },
    ],
  },
  {
    id: "command-palette", cluster: "admin", label: "Command Palette (⌘K)",
    route: "Global overlay — all authenticated pages", roles: ["architect","reviewer","governor","admin"],
    ux: 4, imp: 4, cmp: 5, fri: 1,
    desc: "348-line global command palette using cmdk. Fuzzy search across navigation actions, role-aware commands, keyboard-first navigation. Present in both the main sidebar and governor sidebar. Significant power-user experience that most users probably don't discover.",
    gaps: ["No discoverability hint — nothing tells first-time users ⌘K exists", "No search across agent names or blueprint content — only navigation actions", "No recent commands history"],
    recs: [
      { pri: "P1", text: "Add a persistent '⌘K' chip in the sidebar header or search bar placeholder. The command palette is one of the highest-value experiences in the app for power users — it needs a visible affordance. Currently invisible unless you already know about it." },
      { pri: "P2", text: "Extend palette search to include agent names, blueprint titles, and policy names — not just navigation links. This would make the palette a universal search, not just a nav shortcut." },
    ],
  },
  {
    id: "help-panel", cluster: "admin", label: "Help Panel",
    route: "Global overlay — sidebar toggle", roles: ["architect","reviewer","governor","admin"],
    ux: 3, imp: 3, cmp: 4, fri: 2,
    desc: "396-line contextual help panel accessible from the sidebar. Backed by a Phase 47 multi-turn AI copilot (claude-haiku-4-5) at /api/help/chat. The copilot receives full conversation history + current pathname and maintains role and page context in the system prompt. Stateless — message history kept client-side. After each answer, the copilot proactively suggests a follow-up action or question. Much richer than typical help panels — it's a live conversational copilot that understands Intellios' full subsystem architecture.",
    gaps: ["No visible entry point — most users don't know the help copilot exists or that it's AI-powered", "Chat history is lost on page refresh — a long help conversation resets", "Copilot doesn't have access to the user's actual data (agents, blueprints) — can only give generic guidance, not 'Your agent X has 3 violations because...'"],
    recs: [
      { pri: "P1", text: "Rename the help panel from a generic '?' icon to 'Ask Intellios' with an AI sparkle indicator. The multi-turn AI copilot is a significant differentiator — it needs a label that communicates the capability, not just a tooltip on a question mark." },
      { pri: "P2", text: "Give the copilot read-only access to the current user's context (current agent name, current blueprint status, current violations count) so it can give specific answers: 'Your blueprint has 2 governance violations — the timeout policy is missing.' This would transform it from a documentation assistant into a genuine product copilot." },
    ],
  },
  {
    id: "notification-center", cluster: "admin", label: "Notification Center",
    route: "Global nav overlay (bell icon)", roles: ["architect","reviewer","governor","admin"],
    ux: 3, imp: 3, cmp: 4, fri: 2,
    desc: "226-line notification bell nav component that polls /api/notifications every 30s when the browser window is focused. Shows an unread count badge on the bell icon and a dropdown panel with the 20 most recent notifications (title, message, entity type, link, timestamp). Each notification links to the relevant entity (blueprint, agent, review, etc.). Focus-aware polling stops when the tab is backgrounded. Silently swallows network errors — non-critical UI.",
    gaps: ["No mark-all-read action — users must dismiss notifications one by one", "No notification preference settings — all notification types are always on, no way to mute low-priority events", "Polling only (no WebSocket/SSE) — critical events like 'Your blueprint was approved' can be up to 30s late", "No grouped notifications — if an agent generates 10 governance violations, they appear as 10 separate items flooding the panel"],
    recs: [
      { pri: "P1", text: "Add a 'Mark all as read' button at the top of the dropdown. The current model requires users to click each notification individually — a significant friction point for power users who receive many daily notifications." },
      { pri: "P2", text: "Group related notifications: collapse 10 governance-violation events into 'Agent X triggered 10 policy violations — view all.' This reduces notification fatigue and makes high-signal events easier to spot." },
      { pri: "P2", text: "Add notification preferences page in Admin Settings: toggle on/off by event type (review completed, blueprint approved, governance violation, deployment status). Enterprise users who manage many agents need control over notification volume." },
    ],
  },
  {
    id: "audit-log", cluster: "admin", label: "Audit Log",
    route: "/audit", roles: ["admin","governor"],
    ux: 3, imp: 4, cmp: 4, fri: 1,
    desc: "Audit trail for all platform actions. Critical for enterprise compliance.",
    gaps: ["No export to CSV/SIEM", "No date range filter exposed in UI", "No alert on suspicious patterns"],
    recs: [
      { pri: "P1", text: "Add export to CSV with date range filter. Enterprise security teams need to pull audit logs for SIEM tools and examiner responses — this is a table-stakes compliance feature." },
    ],
  },
];

// Cluster metadata
const CLUSTERS = {
  entry:   { label: "Entry",    icon: "→",  color: "#6366f1", bg: "#eef2ff", desc: "First impressions: landing, auth, onboarding" },
  create:  { label: "Create",   icon: "✦",  color: "#0891b2", bg: "#ecfeff", desc: "Agent design: intake, templates, express-lane" },
  review:  { label: "Review",   icon: "✓",  color: "#059669", bg: "#ecfdf5", desc: "Blueprint review and approval workflow" },
  govern:  { label: "Govern",   icon: "⚖",  color: "#d97706", bg: "#fffbeb", desc: "Governance, compliance, and policy management" },
  operate: { label: "Operate",  icon: "◉",  color: "#dc2626", bg: "#fef2f2", desc: "Registry, monitoring, and observability" },
  admin:   { label: "Admin",    icon: "⚙",  color: "#7c3aed", bg: "#faf5ff", desc: "Workspace configuration and user management" },
};

// User journey flows (connections between experience IDs)
const FLOWS = [
  // Entry flow
  { from: "landing",        to: "register",       label: "sign up",     type: "primary" },
  { from: "register",       to: "welcome",        label: "post-signup", type: "primary" },
  { from: "welcome",        to: "design-studio",  label: "first agent", type: "primary" },
  { from: "login",          to: "dashboard",      label: "returning",   type: "primary" },
  { from: "invite",         to: "welcome",        label: "join team",   type: "secondary" },
  // Create flow
  { from: "design-studio",  to: "quick-start",    label: "new session", type: "primary" },
  { from: "quick-start",    to: "intake-session", label: "conversational", type: "primary" },
  { from: "quick-start",    to: "templates",      label: "from template", type: "primary" },
  { from: "templates",      to: "express-lane",   label: "customize",   type: "primary" },
  { from: "intake-session", to: "stakeholder",    label: "invite",      type: "secondary" },
  // Intake Phase 3 → Blueprint
  { from: "intake-session", to: "intake-review",  label: "phase 3",     type: "primary" },
  { from: "intake-review",  to: "blueprint-detail", label: "generate",  type: "primary" },
  { from: "express-lane",   to: "blueprint-detail", label: "generate",  type: "primary" },
  // Blueprint sub-experiences
  { from: "blueprint-detail", to: "companion-chat",    label: "AI advisor",   type: "secondary" },
  { from: "blueprint-detail", to: "refinement-chat",   label: "refine ABP",   type: "secondary" },
  { from: "blueprint-detail", to: "review-decision",    label: "review",       type: "primary" },
  { from: "blueprint-detail", to: "blueprint-quality",  label: "quality",      type: "secondary" },
  { from: "blueprint-detail", to: "regulatory-panel",   label: "regulatory",   type: "secondary" },
  { from: "agent-detail",     to: "agent-test-harness", label: "test cases",   type: "secondary" },
  { from: "blueprint-detail", to: "simulate-panel",    label: "simulate",     type: "secondary" },
  { from: "simulate-panel",   to: "red-team-panel",    label: "red team",     type: "secondary" },
  // Review flow
  { from: "blueprint-detail", to: "review-queue",   label: "submit",    type: "primary" },
  { from: "review-queue",   to: "blueprint-detail", label: "approve",   type: "primary" },
  // Review → Operate
  { from: "blueprint-detail", to: "deploy-console", label: "deploy",    type: "primary" },
  { from: "deploy-console",  to: "registry",        label: "register",  type: "primary" },
  { from: "registry",        to: "agent-detail",    label: "open",      type: "primary" },
  { from: "agent-detail",    to: "monitor",         label: "observe",   type: "primary" },
  { from: "registry",        to: "monitor",         label: "observe",   type: "secondary" },
  { from: "monitor",         to: "monitor-intelligence", label: "intel", type: "secondary" },
  // Agent sub-experiences
  { from: "agent-detail",     to: "simulate-panel",          label: "simulate",    type: "secondary" },
  { from: "agent-detail",     to: "production-dashboard",    label: "production",  type: "secondary" },
  { from: "agent-detail",     to: "violations-panel-runtime", label: "violations", type: "secondary" },
  { from: "agent-detail",     to: "blueprint-quality",       label: "quality",     type: "secondary" },
  { from: "agent-detail",     to: "regulatory-panel",        label: "regulatory",  type: "secondary" },
  { from: "agent-detail",     to: "red-team-panel",          label: "red team",    type: "secondary" },
  // Govern connections
  { from: "governance-hub",  to: "policy-form",         label: "create/edit policy", type: "primary" },
  { from: "governance-hub",  to: "compliance-posture",  label: "posture", type: "secondary" },
  { from: "governor-hub",    to: "review-queue",   label: "approvals",   type: "primary" },
  { from: "governor-hub",    to: "compliance-posture", label: "compliance", type: "secondary" },
  { from: "governor-hub",    to: "monitor",        label: "fleet",       type: "secondary" },
  { from: "registry",        to: "audit-log",      label: "audit",       type: "secondary" },
  // Home / Dashboard hub
  { from: "login",          to: "home",           label: "post-login",  type: "primary" },
  { from: "home",           to: "design-studio",  label: "",            type: "secondary" },
  { from: "home",           to: "review-queue",   label: "",            type: "secondary" },
  { from: "home",           to: "registry",       label: "",            type: "secondary" },
  { from: "home",           to: "dashboard",      label: "",            type: "secondary" },
  { from: "dashboard",      to: "governor-hub",   label: "",            type: "secondary" },
  // Workflow
  { from: "registry",       to: "workflow-detail", label: "workflow",  type: "secondary" },
];

// ──────────────────────────────────────────────────────────────────────────────
// SCORING HELPERS
// ──────────────────────────────────────────────────────────────────────────────

function computeHealth(e) {
  // UX (0-5) + Completeness (0-5) + Inverse Friction (0-5) → 0-15 → rescaled 1-10
  const raw = (e.ux + e.cmp + (6 - e.fri));
  return Math.round((raw / 15) * 9 + 1); // maps 3-15 → 1-10
}

function healthColor(h) {
  if (h >= 8) return { bg: "#dcfce7", text: "#166534", border: "#86efac" };
  if (h >= 5) return { bg: "#fef9c3", text: "#854d0e", border: "#fde047" };
  return { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" };
}

function healthLabel(h) {
  if (h >= 8) return "Strong";
  if (h >= 5) return "Needs Work";
  return "Critical Gap";
}

function priorityColor(pri) {
  if (pri === "P0") return { bg: "#fee2e2", text: "#991b1b" };
  if (pri === "P1") return { bg: "#fef3c7", text: "#92400e" };
  return { bg: "#e0f2fe", text: "#0c4a6e" };
}

// ──────────────────────────────────────────────────────────────────────────────
// COMPONENTS
// ──────────────────────────────────────────────────────────────────────────────

function ScorePip({ value, max = 5, color }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: 2,
          background: i < value ? color : "#e2e8f0",
        }} />
      ))}
    </div>
  );
}

function ExperienceCard({ exp, isSelected, onClick }) {
  const health = computeHealth(exp);
  const hc = healthColor(health);
  const cluster = CLUSTERS[exp.cluster];
  const p0Count = exp.recs.filter(r => r.pri === "P0").length;

  return (
    <div
      onClick={() => onClick(exp.id)}
      style={{
        border: `2px solid ${isSelected ? cluster.color : "#e2e8f0"}`,
        borderRadius: 10,
        padding: "10px 12px",
        cursor: "pointer",
        background: isSelected ? cluster.bg : "white",
        transition: "all 0.15s",
        position: "relative",
      }}
    >
      {p0Count > 0 && (
        <div style={{
          position: "absolute", top: -6, right: 8,
          background: "#dc2626", color: "white",
          fontSize: 10, fontWeight: 700,
          padding: "1px 6px", borderRadius: 10,
        }}>
          P0 GAP
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b", lineHeight: 1.3 }}>
          {exp.label}
        </div>
        <div style={{
          background: hc.bg, color: hc.text,
          border: `1px solid ${hc.border}`,
          borderRadius: 6, padding: "1px 7px",
          fontSize: 12, fontWeight: 700,
          whiteSpace: "nowrap", marginLeft: 6,
        }}>
          {health}/10
        </div>
      </div>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>
        {exp.route}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
        <div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>UX</div>
          <ScorePip value={exp.ux} color={cluster.color} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>Complete</div>
          <ScorePip value={exp.cmp} color={cluster.color} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>Friction ↓</div>
          <ScorePip value={6 - exp.fri} color={exp.fri >= 4 ? "#dc2626" : cluster.color} />
        </div>
      </div>
    </div>
  );
}

function DetailPanel({ exp, onClose }) {
  if (!exp) return (
    <div style={{
      height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
      color: "#94a3b8", fontSize: 14, padding: 24, textAlign: "center",
    }}>
      ← Select any experience to see scores, gaps, and recommendations
    </div>
  );

  const health = computeHealth(exp);
  const hc = healthColor(health);
  const cluster = CLUSTERS[exp.cluster];

  return (
    <div style={{ padding: 20, overflowY: "auto", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{
            display: "inline-block",
            background: cluster.bg, color: cluster.color,
            borderRadius: 6, padding: "2px 8px",
            fontSize: 11, fontWeight: 600, marginBottom: 6,
          }}>
            {cluster.icon} {cluster.label.toUpperCase()}
          </div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
            {exp.label}
          </h2>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{exp.route}</div>
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}
        >
          ×
        </button>
      </div>

      {/* Overall health */}
      <div style={{
        background: hc.bg, border: `1px solid ${hc.border}`,
        borderRadius: 8, padding: "10px 14px", marginBottom: 16,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 12, color: hc.text, fontWeight: 600 }}>OVERALL HEALTH</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: hc.text }}>{health}/10</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: hc.text }}>{healthLabel(health)}</div>
      </div>

      {/* Score breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          { label: "UX Quality", val: exp.ux, help: "How polished and friction-free the UI is" },
          { label: "Importance", val: exp.imp, help: "Strategic weight to core value prop" },
          { label: "Completeness", val: exp.cmp, help: "How fully implemented" },
          { label: "Friction Risk", val: exp.fri, help: "Risk of frustrating users (higher=worse)", invert: true },
        ].map(({ label, val, help, invert }) => (
          <div key={label} style={{
            background: "#f8fafc", borderRadius: 8, padding: "8px 10px",
            border: "1px solid #e2e8f0",
          }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: invert && val >= 4 ? "#dc2626" : cluster.color }}>
              {val}/5
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.3 }}>{help}</div>
          </div>
        ))}
      </div>

      {/* Description */}
      <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, marginBottom: 16 }}>
        {exp.desc}
      </div>

      {/* Gaps */}
      {exp.gaps.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6, letterSpacing: "0.05em" }}>
            IDENTIFIED GAPS
          </div>
          {exp.gaps.map((g, i) => (
            <div key={i} style={{
              display: "flex", gap: 8, alignItems: "flex-start",
              fontSize: 13, color: "#334155", marginBottom: 4,
            }}>
              <span style={{ color: "#f59e0b", marginTop: 1, flexShrink: 0 }}>▲</span>
              {g}
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8, letterSpacing: "0.05em" }}>
          RECOMMENDATIONS ({exp.recs.length})
        </div>
        {exp.recs.map((r, i) => {
          const pc = priorityColor(r.pri);
          return (
            <div key={i} style={{
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: 8, padding: "10px 12px",
              marginBottom: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{
                  background: pc.bg, color: pc.text,
                  fontSize: 11, fontWeight: 700,
                  padding: "1px 7px", borderRadius: 4,
                }}>
                  {r.pri}
                </span>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                  {r.pri === "P0" ? "Critical" : r.pri === "P1" ? "High" : "Medium"} priority
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#0f172a", lineHeight: 1.55 }}>{r.text}</div>
            </div>
          );
        })}
      </div>

      {/* Roles */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>ROLES INVOLVED</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {exp.roles.map(r => (
            <span key={r} style={{
              background: ROLES[r]?.color + "1a",
              color: ROLES[r]?.color,
              border: `1px solid ${ROLES[r]?.color}40`,
              borderRadius: 4, padding: "2px 8px", fontSize: 12, fontWeight: 500,
            }}>
              {ROLES[r]?.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SUMMARY STATS
// ──────────────────────────────────────────────────────────────────────────────

function SummaryBar({ selected, setFilter, filter }) {
  const criticalGaps = EXPERIENCES.filter(e => e.recs.some(r => r.pri === "P0"));
  const avgHealth = Math.round(EXPERIENCES.reduce((s, e) => s + computeHealth(e), 0) / EXPERIENCES.length * 10) / 10;
  const strong = EXPERIENCES.filter(e => computeHealth(e) >= 8).length;
  const weak = EXPERIENCES.filter(e => computeHealth(e) < 5).length;
  const totalRecs = EXPERIENCES.reduce((s, e) => s + e.recs.length, 0);
  const p0Count = EXPERIENCES.reduce((s, e) => s + e.recs.filter(r => r.pri === "P0").length, 0);
  const p1Count = EXPERIENCES.reduce((s, e) => s + e.recs.filter(r => r.pri === "P1").length, 0);

  return (
    <div style={{
      background: "#0f172a", color: "white",
      padding: "12px 20px",
      display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
    }}>
      <div>
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>INTELLIOS UX AUDIT</div>
        <div style={{ fontSize: 13, color: "#e2e8f0" }}>{EXPERIENCES.length} experiences · {Object.keys(CLUSTERS).length} clusters</div>
      </div>
      <div style={{ width: 1, height: 32, background: "#1e293b" }} />
      {[
        { label: "Avg Health", val: `${avgHealth}/10`, color: avgHealth >= 7 ? "#34d399" : "#fbbf24" },
        { label: "Strong (8+)", val: strong, color: "#34d399" },
        { label: "Critical Gaps (<5)", val: weak, color: "#f87171" },
        { label: "P0 Fixes", val: p0Count, color: "#f87171" },
        { label: "P1 Fixes", val: p1Count, color: "#fbbf24" },
        { label: "Total Recs", val: totalRecs, color: "#94a3b8" },
      ].map(stat => (
        <div key={stat.label}>
          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>{stat.label}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.val}</div>
        </div>
      ))}
      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
        {["all", ...Object.keys(CLUSTERS)].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: `1px solid ${filter === f ? (CLUSTERS[f]?.color || "#6366f1") : "#1e293b"}`,
              background: filter === f ? (CLUSTERS[f]?.color || "#6366f1") + "33" : "transparent",
              color: filter === f ? (CLUSTERS[f]?.color || "#818cf8") : "#64748b",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            {f === "all" ? "All" : CLUSTERS[f].label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ──────────────────────────────────────────────────────────────────────────────

export default function IntellosUXMap() {
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState("all");

  const selectedExp = EXPERIENCES.find(e => e.id === selectedId) || null;
  const filtered = filter === "all" ? EXPERIENCES : EXPERIENCES.filter(e => e.cluster === filter);

  const handleSelect = (id) => {
    setSelectedId(prev => prev === id ? null : id);
  };

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
      {/* Top bar */}
      <SummaryBar selected={selectedId} setFilter={setFilter} filter={filter} />

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left: Experience Grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {Object.entries(CLUSTERS)
            .filter(([k]) => filter === "all" || filter === k)
            .map(([clusterId, cluster]) => {
              const clusterExps = filtered.filter(e => e.cluster === clusterId);
              if (clusterExps.length === 0) return null;
              const clusterAvg = Math.round(clusterExps.reduce((s, e) => s + computeHealth(e), 0) / clusterExps.length * 10) / 10;
              return (
                <div key={clusterId} style={{ marginBottom: 20 }}>
                  {/* Cluster header */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
                    padding: "8px 12px",
                    background: cluster.bg,
                    borderRadius: 8,
                    border: `1px solid ${cluster.color}30`,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: cluster.color, color: "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700,
                    }}>
                      {cluster.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: cluster.color, fontSize: 14 }}>
                        {cluster.label}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{cluster.desc}</div>
                    </div>
                    <div style={{ marginLeft: "auto", textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#94a3b8" }}>Cluster avg</div>
                      <div style={{
                        fontSize: 16, fontWeight: 800,
                        color: clusterAvg >= 7 ? "#059669" : clusterAvg >= 5 ? "#d97706" : "#dc2626",
                      }}>
                        {clusterAvg}/10
                      </div>
                    </div>
                  </div>

                  {/* Experience cards grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
                    {clusterExps.map(exp => (
                      <ExperienceCard
                        key={exp.id}
                        exp={exp}
                        isSelected={selectedId === exp.id}
                        onClick={handleSelect}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

          {/* P0 / P1 summary table */}
          {filter === "all" && (
            <div style={{ marginTop: 8, padding: 16, background: "white", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 12, fontSize: 14 }}>
                🔥 Priority Action List — All Experiences
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    <th style={{ textAlign: "left", padding: "6px 10px", color: "#475569", fontWeight: 600 }}>Pri</th>
                    <th style={{ textAlign: "left", padding: "6px 10px", color: "#475569", fontWeight: 600 }}>Experience</th>
                    <th style={{ textAlign: "left", padding: "6px 10px", color: "#475569", fontWeight: 600 }}>Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {EXPERIENCES.flatMap(e =>
                    e.recs
                      .filter(r => r.pri === "P0" || r.pri === "P1")
                      .map((r, i) => ({ exp: e, rec: r, i }))
                  )
                  .sort((a, b) => a.rec.pri.localeCompare(b.rec.pri))
                  .map(({ exp, rec, i }, idx) => {
                    const pc = priorityColor(rec.pri);
                    return (
                      <tr
                        key={`${exp.id}-${i}`}
                        onClick={() => handleSelect(exp.id)}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          background: selectedId === exp.id ? CLUSTERS[exp.cluster].bg : "white",
                          cursor: "pointer",
                        }}
                      >
                        <td style={{ padding: "6px 10px" }}>
                          <span style={{
                            background: pc.bg, color: pc.text,
                            padding: "1px 6px", borderRadius: 4, fontWeight: 700, fontSize: 11,
                          }}>
                            {rec.pri}
                          </span>
                        </td>
                        <td style={{ padding: "6px 10px", fontWeight: 600, color: "#334155", whiteSpace: "nowrap" }}>
                          {exp.label}
                        </td>
                        <td style={{ padding: "6px 10px", color: "#475569", lineHeight: 1.4 }}>
                          {rec.text.substring(0, 100)}{rec.text.length > 100 ? "…" : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Detail Panel */}
        <div style={{
          width: 380,
          borderLeft: "1px solid #e2e8f0",
          background: "white",
          flexShrink: 0,
          overflowY: "auto",
        }}>
          <DetailPanel exp={selectedExp} onClose={() => setSelectedId(null)} />
        </div>
      </div>
    </div>
  );
}
