# Intellios Demo Video — Narration Script

## Target

- **Length:** 8–10 minutes (target 8:50, hard window 8:30–9:30)
- **Pacing:** thorough — favor clarity over brevity. Enterprise buyer audience.
- **Voice:** TTS (ElevenLabs preferred; OpenAI TTS fallback). Professional male, measured cadence, `stability: 0.6`, `similarity_boost: 0.8`. No human voice.
- **Scenario:** Retail Bank Customer-FAQ Agent (enterprise `retail-bank-demo`, personas Marta / Rafael / Ed per `src/lib/db/seed-retail-bank.ts`).
- **Stage truth source:** Session 170 findings table — all eight stages PASS against live AWS Bedrock. This narration follows that stage order verbatim.

### Voice & tone notes for TTS

Words per minute target ≈ 145 — measured professional cadence, not marketing read.
Soft pauses marked with `[beat]` (≈0.5s). Hard pauses marked with `[pause]` (≈1.5s, for beat after a claim).
Pronounce `AgentCore` as "AgentCore" (one word). `ABP` spelled out: "A-B-P". `SOD` spelled out: "S-O-D". `ADR-027` read as "ADR zero-twenty-seven".

---

## Segments

### [00:00–00:30] Cold Open (30s)

**On-screen:** `scripts/demo-video/title-cards/cold-open.svg` — dark indigo backdrop, Intellios wordmark top-left, centered headline, subtitle below.

**NARRATION** (~68 words, ~28s; 2s beat to opening frame):

> Enterprise AI teams face a compounding problem: agents are shipping faster than governance can catch up. Every new agent creates a new risk surface — prompt injection, policy drift, decisions nobody can audit six months later. [beat] Intellios is the governance layer that sits in front of that. Design-time control, multi-step approval, runtime audit, evidence on demand. [beat] What follows is the complete lifecycle, end-to-end, against real AWS Bedrock.

---

### [00:30–01:45] Stage 1 — Intake (75s) — persona: Marta (architect)

**Playwright action:** navigate to `/intake/new` as `marta@retailbank.demo`. Begin session. Type the intake prompt. Show 3-turn structured conversation (tool calls visible in the chat UI). Finalize the session. Show the `Readiness: 100` state.

**UI duration budget:** ~40s of visible UI interaction + ~35s of narration layered over it.

**NARRATION** (~175 words, ~72s):

> Stage one: intake. Marta is the product owner at a regional retail bank. She needs a customer-facing FAQ agent — branch hours, routing numbers, wire-transfer procedures. She opens an Intellios intake session and describes what she wants in her own words. [beat] Intellios is not a form. It is a structured conversation, powered by Claude, that elicits the things governance will need to see later. Intended use. Data sources. Escalation paths. Compliance scope. [pause] Notice what the intake engine captures as Marta talks: this agent is English-only, U.S.-based customers, read-only. Declines anything about accounts, balances, loans, investment advice. Logs every interaction for compliance review. [beat] Each of those constraints is a tool call — a structured field that lands in the intake payload, not a freeform chat transcript. That matters: the audit trail for this agent starts at the first sentence Marta types. When she finalizes, readiness is one hundred — every governance-required field is populated. Intake session one, eight to go.

---

### [01:45–02:45] Stage 2 — Blueprint Generation (60s) — persona: Marta

**Playwright action:** click "Generate Blueprint" on the finalized intake. Show the progress indicator. Wait for Blueprint Workbench to open with the generated ABP. Scroll through `identity`, `capabilities`, `constraints`, `governance` sections.

**UI duration budget:** ~20s generation wait + ~20s scrolling through sections + ~20s narration on top.

**NARRATION** (~140 words, ~58s):

> Stage two: design. The intake payload feeds the generation engine. [beat] This is not a template. Intellios calls Claude with a strict schema — the Agent Blueprint Package, or A-B-P — and validates the response against Zod. If the model hallucinates a field or invents a capability, validation rejects it and retries, up to three times. [beat] What lands in the Blueprint Workbench is a structured artifact: identity, capabilities, constraints, governance. System instruction. Denied actions — explicit list. Data sources. Approval requirements. Risk classification. [pause] Everything a reviewer needs to evaluate this agent before it ever touches production. And because the blueprint is a schema-validated object, not a prose document, it is diffable, versionable, and automatable. Marta did not write this. She described it. The generation engine produced it.

---

### [02:45–03:25] Stage 3 — Governance Validation (40s) — persona: Marta

**Playwright action:** click "Validate" on the Blueprint Workbench. Show the validation panel opening. Highlight the policies evaluated, the zero-violations count, any warnings with severity labels.

**UI duration budget:** ~10s validation run + ~20s report inspection + ~10s narration-only beat.

**NARRATION** (~92 words, ~38s):

> Stage three: governance. [beat] The blueprint is checked against the enterprise policy pack. For retail bank, that is three policies: customer-facing safety, G-L-B-A privacy, and S-R eleven-seven documentation — a lite MRM framing. [pause] Zero violations. Three policies evaluated, every constraint satisfied. The validation report is persisted on the blueprint record — so this result is not a runtime check, it is an audit artifact. [beat] If Marta edits the blueprint later, the result goes stale, and the approval gate blocks until she re-validates.

---

### [03:25–03:55] Stage 4 — Submit for Review (30s) — persona: Marta

**Playwright action:** click "Submit for Review" on the validated blueprint. Show status badge transition `draft → in_review`. The button disables.

**UI duration budget:** ~8s transition + ~22s narration on top.

**NARRATION** (~68 words, ~28s):

> Stage four: submit for review. Marta hands the blueprint off. [beat] The status transitions to `in_review`. Intellios enforces a fresh-validation gate here — if the blueprint changed after the last validation, submission is rejected. That prevents a subtle class of drift where an approver signs off on one version and a different version ships. [pause] Marta's part is done. The handoff is atomic, timestamped, and audited.

---

### [03:55–04:55] Stage 5 — Multi-step Approval (60s) — persona: Rafael (reviewer)

**Playwright action:** switch user session from Marta to `rafael@retailbank.demo`. Navigate to `/review`. Open the pending blueprint from the queue. Scroll through the validation report, the system instruction, the denied-actions list. Click "Approve". Show the status badge flip to `approved`, approver email captured.

**UI duration budget:** ~15s user-switch + queue navigation, ~20s review reading, ~10s approval click, ~15s narration on top.

**NARRATION** (~142 words, ~58s):

> Stage five: approval. Rafael is the chief risk officer. Different person, different role, different session. [beat] Intellios enforces separation of duties at the server — Marta cannot approve her own work. This is not a permission flag. It is a principal check on every approval transition, written to an audit row atomically with the status change. [pause] Rafael reads the validation report, the system instruction, the denied-actions list. He sees what the agent will and will not do, the policies it passed, the person who designed it. [beat] Approve. [beat] The status flips to `approved`. In a production deployment, the approval chain can be multi-step — reviewer, compliance officer, admin — each step auditable, each step blocking. One role, one approval, one audit row. That is how governance wins a compliance review.

---

### [04:55–06:10] Stage 6 — Deploy to AgentCore (75s) — persona: Rafael

**Playwright action:** on the approved blueprint, click "Deploy to AgentCore". Enter change reference `DEMO-CHG-0001`. Click Deploy. Show the progress states `CREATING → PREPARING → PREPARED` cycling over ~30–60s of real Bedrock API time. When the badge flips `deployed`, show the deployment panel: Bedrock agent ID, ARN, region, foundation model.

**UI duration budget:** ~45s real-AWS provisioning wait + ~30s narration layered over the wait.

**NARRATION** (~175 words, ~72s, intentionally filling the provisioning wait):

> Stage six: deployment. This is the moment the control plane touches the runtime. [beat] Rafael clicks Deploy to AgentCore, enters a change reference, confirms. Under the hood, Intellios calls real AWS APIs — `CreateAgent`, `CreateAgentActionGroup`, `PrepareAgent`, `GetAgent` — against the customer's sandbox Bedrock account. No mocks. No stubs. [pause] What you are watching right now is the live provisioning cycle. Bedrock moves the agent through creating, preparing, prepared — usually thirty to sixty seconds. [beat] A few things to notice while it runs. First: Intellios never creates infrastructure in its own account. The agent is provisioned in the customer's A-W-S account, governed by the customer's execution role. Second: the agent ID, A-R-N, and region are captured in deployment metadata — that is the link between the governance artifact and the runtime entity. Third: if Bedrock fails partway, Intellios auto-rolls back by calling `DeleteAgent` before surfacing the error. [pause] Status: deployed. Green dot. Ready to invoke.

---

### [06:10–07:20] Stage 7 — Invoke (Test Console, ADR-027) (70s) — persona: Rafael

**Playwright action:** click "Open Test Console" on the deployed blueprint (or navigate to `/registry/[agentId]/test`). Show the banner chip `Test harness — not a production runtime`. Enter prompt: "What's the routing number for wire transfers at my local branch?" Press Send. Show streaming Claude response word-by-word. Then navigate to `/admin/audit-log` and show the `blueprint.test_invoked` row with the `promptHash` field visible (SHA-256-16, not transcript).

**UI duration budget:** ~25s streaming response + ~10s audit-log view + ~35s narration.

**NARRATION** (~162 words, ~68s):

> Stage seven: invocation. [beat] The Test Console is reviewer-scoped. It is not a production runtime. That distinction is built into the product — the banner says it, the audit trail enforces it, and the invoke path is rate-limited at ten requests per minute. [pause] Rafael sends a customer-realistic question — wire transfer routing at a local branch. [beat] Notice the streaming response: that is Claude, running inside the Bedrock agent Rafael just deployed. Live token stream, policy-compliant answer, no leakage past the denied-actions list. [pause] More importantly, look at the audit row. Action: `blueprint.test_invoked`. Actor role: reviewer. Prompt hash: S-H-A two-fifty-six, sixteen hex characters. No transcript. [beat] That is deliberate. Intellios hashes the prompt rather than persisting it — a compliance-safe test signal, not a data-retention liability. A-D-R zero-twenty-seven writes this guarantee down and the route enforces it. Test, audit, zero transcript. That is governed invocation.

---

### [07:20–08:00] Stage 8 — Retire (40s) — persona: Ed (admin)

**Playwright action:** switch user session from Rafael to `ed@retailbank.demo`. Navigate to the Registry detail page for the deployed agent. Click the admin-only `Deprecate` button in the `LifecycleControls` quick-action bar (rendered when `currentUser.role === "admin"` — see `src/app/registry/[agentId]/page.tsx:970`). Confirm the deprecation dialog. Show the status transition `deployed → deprecated`. Wait ~8s, refresh the page. Badge shows `deprecated`. Open the Test Console again — show the `Agent is not invokable: status: deprecated` refusal.

**UI duration budget:** ~15s deprecate action + ~10s refresh + ~5s refusal screen + ~10s narration.

**NARRATION** (~100 words, ~41s):

> Stage eight: retire. [beat] The agent's useful life ends. Ed is the platform admin — a third person, a third role, because deprecation is admin-gated. Ed clicks Deprecate. Status transitions to `deprecated`. [pause] In the background, Intellios calls `DeleteAgent` against Bedrock. The live AWS resource is torn down. The deployment record stays — retirement is a state transition on the governance artifact, not a deletion. You can audit this agent's entire lifecycle years from now, long after the runtime entity is gone. [beat] And the Test Console? Agent is not invokable. Status: deprecated. The runtime is closed. The audit trail stays open.

---

### [08:00–08:50] Outro — Evidence Package (50s)

**Playwright action:** navigate to the retired blueprint's detail page. Click the `↓ Export Evidence Package` button (line 1339 of `src/app/blueprints/[id]/page.tsx`). Show the browser download flyout with the filename pattern `evidence-package-retail-bank-faq-assistant-v1.0.0-2026-04-24.json`. Open the downloaded JSON in a second browser tab — show the top-level structure: `identity`, `approvalChain`, `validationFindings`, `auditLog`, `deploymentRecord`, the full fourteen-section M-R-M report. [Playwright screenshots each section header as it scrolls.]

**NARRATION** (~120 words, ~50s):

> Every enterprise compliance conversation starts with one question: show me the evidence. [beat] Intellios ships that evidence today. [pause] One click, one export. A structured package containing the full Model Risk Management report — fourteen sections — the complete approval chain, every validation finding, the full audit log, and the deployment record. Every lifecycle event you just watched, captured. [beat] This is shipped, in production, working right now. [pause] Coming in the next release: the same evidence, rendered as a deterministic, Big-Four-style P-D-F — audit-grade typography, for regulatory submission. The JSON is the machine-readable artifact. The P-D-F is the signature-ready one. [beat] That is the differentiator, grounded in what is shipped today. [beat] Intellios.

**On-screen at end:** `scripts/demo-video/title-cards/outro.svg` — "Coming next: Evidence Package PDF Rendering (ADR-015)" / "Today: JSON export, 14-section MRM report. Next: deterministic PDF for regulatory submission."

---

## Timing Validation

Estimated durations based on 145 words/minute TTS cadence + UI action overhead. All beats included.

| Segment | Narration words | Narration duration | UI-action room | Total | Running total |
|---|---:|---:|---:|---:|---:|
| Cold open | 68 | 28s | +2s title hold | 0:30 | 0:30 |
| Stage 1 — Intake | 175 | 72s | +3s silent beats | 1:15 | 1:45 |
| Stage 2 — Blueprint | 140 | 58s | +2s silent beats | 1:00 | 2:45 |
| Stage 3 — Validation | 92 | 38s | +2s silent beats | 0:40 | 3:25 |
| Stage 4 — Submit | 68 | 28s | +2s silent beats | 0:30 | 3:55 |
| Stage 5 — Approval | 142 | 58s | +2s silent beats | 1:00 | 4:55 |
| Stage 6 — Deploy | 175 | 72s | +3s silent beats (fills AWS wait) | 1:15 | 6:10 |
| Stage 7 — Invoke | 162 | 68s | +2s silent beats | 1:10 | 7:20 |
| Stage 8 — Retire | 95 | 39s | +1s beat | 0:40 | 8:00 |
| Outro — Evidence | 120 | 50s | +0s (narration-dense) | 0:50 | 8:50 |
| **TOTAL** | **1,237** | **8:31 (narration only)** | **+19s UI beats** | **8:50** | **8:50** |

**Total target:** 8:50 — within the 8:30–9:30 window.

**If TTS runs faster/slower than 145wpm:**
- 135wpm (slower): total ≈ 9:33 — still in window.
- 155wpm (faster): total ≈ 8:08 — below the 8:30 floor; Session 172 must re-measure and pad UI beats if needed.

**First-pass Session 172 validation step:** after TTS render, measure actual narration.mp3 duration; if outside `8:00–9:30`, adjust TTS rate parameter and re-render before composition.

---

## Scenario details (for Playwright script + consistency)

| Fact | Value | Source |
|---|---|---|
| Enterprise ID | `retail-bank-demo` | `src/lib/db/seed-retail-bank.ts` |
| Architect user | `marta@retailbank.demo` / `Marta1234!` | seed |
| Reviewer user | `rafael@retailbank.demo` / `Rafael1234!` | seed |
| Admin user | `ed@retailbank.demo` / `Ed1234!` | seed — appears at Stage 8 (deprecate is admin-gated, see `src/app/registry/[agentId]/page.tsx:970`) |
| Policies | Customer-Facing Safety, GLBA Privacy, SR 11-7 Lite | seed |
| Foundation model | `us.anthropic.claude-haiku-4-5-20251001-v1:0` (ACTIVE inference profile) | Session 170 Stage 7 resolution |
| Intake prompt | "A customer-facing FAQ agent for a retail bank. It should answer questions about branch hours, wire-transfer procedures, and routing numbers. It must never give personalized financial advice or disclose account information. Log every interaction for compliance." | `docs/demo/lifecycle-demo.md` Stage 1 |
| Test Console prompt | "What's the routing number for wire transfers at my local branch?" | `docs/demo/lifecycle-demo.md` Stage 6 |
| Change reference | `DEMO-CHG-0001` | `docs/demo/lifecycle-demo.md` Stage 5 |
| Expected agent-name pattern | `retail-bank-faq-assistant` (hyphenated, Bedrock-compliant) | Session 166 `translate.ts` sanitization |

---

## Maintenance notes

**When the product changes, update this file first.** The Playwright script mirrors narration beats — changing one without the other will desynchronize capture timing. Re-render TTS after edits.

**Stage additions or re-ordering** require revision of the timing table AND re-validation that total falls 8:30–9:30. Do not ship a demo video with a broken time budget.

**"Coming next release" language** applies only to the PDF renderer (ADR-015 / SCRUM-40). Everything else visible in the video is shipped today — do not soften that claim.

**Persona assignments:** Marta 1–4 (architect — intake through submit), Rafael 5–7 (reviewer — approve, deploy, invoke), Ed at Stage 8 (admin — deprecate, because the UI `LifecycleControls` component renders only when `currentUser.role === "admin"`). The three-persona split reinforces the separation-of-duties narrative organically. If UI permissions change, update both this file and the Playwright script in the same commit.

**Timing table update on persona change:** Stage 8 budget was set at 40s; a persona-switch frame (Rafael → Ed) adds ~3s of Playwright overhead. Absorbed within the existing budget because Stage 8 narration tolerates a small UI-action pad.
