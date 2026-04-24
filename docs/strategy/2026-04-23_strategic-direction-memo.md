# Intellios — Strategic Direction Memo

**Author:** Strategic analysis (Claude, acting as founder-grade product strategist)
**Date:** 2026-04-23
**Audience:** Samy, as founder/PM/architect
**Status:** Opinionated recommendation for Samy to accept, reject, or amend
**Grounding:** Real state of the Intellios codebase, ADRs 001–029, roadmap through Session 157, project journal through Session 163

---

## TL;DR

**Do not pivot. Do not start a connector catalog. Do not rebuild Intellios around Jira/Confluence.**

Intellios is ~90% shipped against a clear, defensible wedge — *the governed control plane for enterprise AI agents, with execution on the customer's cloud runtime*. That wedge is worth finishing. The next 60 days should be spent landing one live reference customer on the eight-stage lifecycle demo against real AWS AgentCore, not broadening the product surface.

The "translate conversations and plans into Jira backlog and Confluence documentation" capability that you (rightly) care about is **not the product**. It is the **operating model** you are already running against the Intellios project itself, and it is the shape of the **customer success playbook** that will sell this product into enterprises. Package that discipline — do not productize it into a connector catalog.

The correct sequence is:
1. **Now–Day 60:** Finish the wedge. Live AWS smoke, real demo, one paid design partner.
2. **Day 60–180:** Productize the implementation playbook (delivery assets, patterns, customer success enablement) from what you already run internally.
3. **Day 180+:** Selectively extend the intake→artifact→governance pattern to one adjacent artifact class — driven by pull from the design partner, not push from a roadmap.

Connectors are a *last-mile* concern, not a wedge. Build them when a paying customer blocks on one.

---

## 1. Defining The Real Problem

You framed this as five problem types. They are not equally load-bearing right now. Let me restate them with weights.

| Problem type | What it asks | Weight today |
|---|---|---|
| **Product strategy** | What should Intellios *be*? | Mostly resolved. Positioning is clear ("governed control plane, not runtime"); wedge is chosen; core artifact (ABP) is specified; 8-stage lifecycle is built. |
| **Delivery / governance** | How do we finish and ship this wedge credibly? | **Highest weight.** Session 157 closed the lifecycle gap; Session 158 (live AWS smoke) is pending; zero paying customers yet. |
| **Customer success / implementation** | How does an enterprise adopt this without you personally on-site? | **Second-highest weight.** There is no playbook, no implementation partner enablement, no repeatable design-partner motion. This is the bottleneck for the *next* proof point after the demo. |
| **Workflow / documentation (Jira/Confluence translation)** | How do conversations become governed, executable work? | You have solved this *internally* (ADR-029). Externalizing it as a product is a different — and weaker — bet than packaging it as a services capability. |
| **Adoption** | How does the product spread inside an enterprise? | Premature. Cannot be validly answered before there is one production customer. |

**The problem to solve first is delivery: finish the credible end-to-end reference implementation.** Everything else — connector breadth, Jira/Confluence translation, services-led scaling — presumes a working demonstrable product and is speculative until that exists.

The correct reframing of your question is *not* "what should Intellios expand into?" It is **"what is the minimum set of things, in what order, that converts today's impressive prototype into a revenue-generating product?"**

---

## 2. Evaluating The Candidate Directions

Each is scored against seven criteria on a 1–5 scale (5 = strong).

### 2.1 Connector Catalog Strategy

> *Build a catalog of supported connectors and approved integration patterns for popular enterprise tools.*

| Criterion | Score | Comment |
|---|---|---|
| Strategic value | 2 | Connectors are commoditizing fast (2026 reality: every SaaS has MCP; every platform has native integrations). A catalog alone is not a moat. |
| Customer value | 3 | Real but diffuse. Hard to point at *one* outcome. |
| Time-to-value | 1 | Years. A credible catalog needs dozens of connectors maintained continuously. |
| Delivery risk | 1 | Solo founder + AI cannot maintain a connector catalog breadth. |
| Differentiation | 1 | Anti-differentiating. You become the least-funded of N connector vendors. |
| Maintainability | 1 | Every connector is a perpetual-motion maintenance tax: auth changes, API deprecations, rate-limit shifts. |
| Enterprise fit | 2 | Enterprises will ask *"why not just use Zapier/Workato/n8n/Paragon/native MCP?"*. Without an answer, they don't. |

**Verdict: reject as a wedge.** Build connectors tactically, one at a time, when a specific design partner blocks on one.

### 2.2 Jira/Confluence-First Translation Strategy

> *Become excellent at translating conversations and plans into Jira backlog and Confluence documentation.*

| Criterion | Score | Comment |
|---|---|---|
| Strategic value | 2 | Atlassian Rovo does this natively. Competing on Atlassian's home turf, using Atlassian's APIs, against Atlassian's AI budget, is not a winnable war. |
| Customer value | 4 | Real pain, real value — *if you can reach the buyer*. |
| Time-to-value | 4 | A thin vertical wedge could ship in weeks. |
| Delivery risk | 3 | Feasible. The translation pattern is literally what ADR-029 encodes. |
| Differentiation | 2 | Very weak vs. Rovo, ChatGPT Enterprise, Copilot, Notion AI. Unless the differentiation is *governance*, not translation. |
| Maintainability | 3 | Moderate. Jira/Confluence APIs are stable but their AI features are moving fast. |
| Enterprise fit | 3 | Plausible, but this orphans the AI-agent positioning and restarts go-to-market from zero. |

**Verdict: reject as a pivot.** It throws away 157 sessions of compounding investment in the agent-governance wedge. The translation capability is strategically more valuable as the *operating model* than as the product.

### 2.3 Service Workflow Strategy (JSM / ServiceNow)

> *Focus first on service operations where intake → triage → execution handoffs create clear near-term value.*

| Criterion | Score | Comment |
|---|---|---|
| Strategic value | 3 | Real category. ServiceNow has aggressive Now Assist roadmap. |
| Customer value | 4 | Real pain (IT ticket triage, service request intake). |
| Time-to-value | 2 | ServiceNow integration is heavy. ITSM selling cycle is long. |
| Delivery risk | 2 | ITSM domain is specialized; you'd be a tourist. |
| Differentiation | 2 | Now Assist, Moveworks, Aisera, Forethought, Ada — already crowded. |
| Maintainability | 2 | ServiceNow integrations are notoriously brittle to customer configurations. |
| Enterprise fit | 3 | Plausible but 18-month sales cycles. |

**Verdict: reject.** ITSM is an attractive-looking adjacency that will eat your lifespan.

### 2.4 Standalone System-of-Record Strategy

> *Develop more of your own internal system-of-record and workflow capabilities.*

| Criterion | Score | Comment |
|---|---|---|
| Strategic value | 1 | Enterprises do not need another SoR. They need governance *over* their SoRs. |
| Enterprise fit | 1 | Actively hostile to enterprise buying. IT will not adopt a new SoR. |

**Verdict: reject unequivocally.** This is a fantasy that almost every AI-tool startup briefly entertains and always regrets.

### 2.5 Services-Led Pattern Library Strategy

> *Develop a repeatable library of implementation patterns, documentation templates, operating procedures, and delivery playbooks before productizing connectors.*

| Criterion | Score | Comment |
|---|---|---|
| Strategic value | 4 | Matches reality: every enterprise AI sale today is services-led. |
| Customer value | 5 | Design partners urgently need implementation scaffolding. |
| Time-to-value | 5 | Zero engineering required. Your existing ADRs and playbooks are the first draft. |
| Delivery risk | 4 | Solo + AI can produce documentation at scale. |
| Differentiation | 4 | The *governance-first* delivery pattern is genuinely differentiated — nobody else packages it. |
| Maintainability | 5 | Documentation decays slowly. |
| Enterprise fit | 5 | Enterprises love this. Services-led offers derisk adoption. |

**Verdict: adopt this in parallel.** Not as *the* strategy, but as the customer-success enablement layer wrapped around the agent-factory wedge.

### 2.6 Hybrid / Sequenced Strategy

> *Begin with a narrow wedge, prove value, then expand deliberately.*

**Verdict: adopt, with a concrete sequence (below).**

### 2.7 The Better Framing I Am Proposing

> *Finish the agent-factory wedge; package the internal operating model as the customer-success playbook; treat connectors and new artifact classes as on-demand extensions, not a roadmap.*

This is not a dramatic new strategy. It is a disciplined version of what Intellios is already doing, with an explicit refusal to broaden the surface until there is a paying customer forcing the question.

---

## 3. Key Assumptions Behind The Recommendation

Each assumption is labeled; the risky ones need validation inside the first 90 days.

| # | Assumption | Label |
|---|---|---|
| A1 | The "governed control plane, not runtime" positioning is buyable by enterprises. | **Needs validation.** One design partner confirms or disconfirms. |
| A2 | AWS AgentCore is enterprise-credible as a runtime for the initial reference implementation. | **Likely sound.** AWS + Bedrock is a defensible initial choice. But enterprise buyers will ask for Azure OpenAI and GCP Vertex variants within 6 months. |
| A3 | The 8-stage lifecycle (Intake → Retire) is the correct decomposition of the problem. | **Likely sound.** Derived from real work; ABP schema is expressive. |
| A4 | A solo founder + AI can deliver a first paying customer implementation within 90 days once the demo is live. | **Uncertain.** Depends on customer's procurement + security review cadence. |
| A5 | Enterprise governance teams are a real buyer (not just central IT or AI-platform teams). | **Needs validation.** Who writes the check? |
| A6 | The ABP schema is stable enough to commit to externally, or stable + versioned enough to evolve safely. | **Likely sound.** Schema is versioned; migrations exist. |
| A7 | The internal governance discipline (ADR-029, Jira/Confluence four-surface pattern) is transferable to a customer's own operating model as a playbook. | **Risky.** It works for *you* because you are the sole operator. A customer with 30 engineers may not absorb the same discipline. |
| A8 | Connectors are a last-mile concern, not a wedge. | **Likely sound** for the agent-control-plane wedge specifically; the value being sold is governance, not integration breadth. |
| A9 | The customer success problem is mostly solvable by documentation + templates + optional human services. | **Uncertain.** May require human-in-the-loop services longer than expected. |
| A10 | Competition from frameworks (LangGraph, CrewAI) and platforms (Bedrock AgentCore native, Azure AI Foundry Agents, Vertex Agent Builder) will not collapse the governance niche in the next 18 months. | **Risky.** Bedrock AgentCore specifically is the platform Intellios wraps; AWS may ship native governance features that subsume part of the value. This is the single biggest strategic risk — see §7. |

The two assumptions most worth actively stress-testing: **A1** (real buyer exists for *governance plane* framing) and **A10** (the platforms don't eat the niche).

---

## 4. The Optimum Direction

**Finish the agent-factory wedge with one credible live reference. Package the delivery pattern as a services-led playbook. Defer everything else.**

The sequence, concretely:

### Phase A — Wedge Close (Day 0–30)

- Session 158 live AWS smoke against sandbox Bedrock.
- Demo rehearsal + screen recording (the lifecycle-demo.md runbook).
- ADR-015 (evidence package renderer) shipped — this is the *proof-of-governance* deliverable an enterprise security team will ask for.
- One-pager: "What Intellios is, what it is not, what it replaces, what it complements."
- Identify 3–5 candidate design partners (warm intros preferred).

### Phase B — Design Partner (Day 30–90)

- Ship to one design partner against a real enterprise policy set and a real AWS account.
- Extract concrete findings — every friction point is a product improvement or a playbook improvement, and the decision of which is evidence-driven, not speculative.
- Price the engagement as design-partner ($25–75K) rather than free — free engagements do not generate the pressure that produces real feedback.

### Phase C — Playbook Productization (Day 60–150, parallel with B)

- Extract the internal operating model (what ADR-029 encodes, what `CLAUDE.md` requires, what the session-log and effort-log patterns look like) into a **customer-facing implementation playbook**.
- Ship it as a Confluence template pack + Jira workflow preset + Notion alternative, not as engineered integrations.
- This is *not* a connector catalog. It is documentation + templates + optional services.

### Phase D — Conditional Expansion (Day 150+)

- Only driven by design-partner pull, consider ONE of:
  - A second AI runtime (Azure OpenAI Assistants or Vertex Agent Builder) if A2 is disconfirmed by the partner.
  - A second artifact class (e.g., *governed automations* or *governed data-access policies*) if the partner asks for it.
  - Targeted connectors (Jira, ServiceNow, Okta, specific ticketing) if the partner blocks on one.
- Do *not* broaden to all three at once. Choose the one the design partner is paying to solve.

---

## 5. What To Do, What To Defer, What To Avoid

### Do

- Finish Session 158 live smoke this week.
- Ship the demo video on a public URL within 30 days.
- Write the one-pager and the buyer narrative (for a **Head of AI Governance**, **Enterprise Architect for AI**, or **Director of ML Platform Engineering** — not for the CIO).
- Extract the Intellios-internal operating model into a customer-usable implementation playbook pack.
- Keep the ADR-029 four-surface discipline in the project — it is now the marketing proof.
- Start a warm-intro outreach list: 10 qualified targets, aim for 3 meetings in 30 days.

### Defer

- Any connector work that is not driven by a specific customer commitment.
- Any new subsystem beyond the eight existing ones (no generative features, no "copilot" surfaces, no "agent marketplace").
- Azure/Vertex runtime support — until the design partner requires it.
- Multi-tenant SaaS polish — the initial shape is enterprise self-hosted or single-tenant managed.
- Marketing site beyond a one-page + demo video.

### Avoid

- **Building a connector catalog.** You cannot maintain breadth.
- **Competing with Atlassian Rovo on Jira/Confluence translation.** Wrong fight, wrong turf.
- **Building your own system-of-record.** No enterprise will buy it.
- **Services-led pivot.** A services business that disguises itself as a product starves the product.
- **Platform surface sprawl.** Every new surface dilutes the "governed control plane" story.
- **Adding runtimes or artifact classes before the first paid customer.** Breadth is fatal pre-PMF.

### Test Before Committing Heavily

- Does the "governed control plane" framing resonate with *governance/risk* leaders, or only with *platform engineering* leaders? (The former is the durable buyer.)
- Is ABP's expressiveness sufficient for a real enterprise's first real agent? (Session 158 onward will answer this.)
- Does AWS AgentCore's feature velocity make Intellios redundant within 18 months, or does it make Intellios more valuable by adding more surface that needs governing?

---

## 6. Jira and Confluence — The Honest Role They Should Play

You asked me to decide plainly. Here it is.

**Jira/Confluence translation should be an operating-model capability and a customer-success playbook asset. It should not be a product feature, a connector, or a wedge.**

### Why

1. You already run this capability internally — ADR-029, the session-log discipline, the effort-log, the Confluence space structure, the Jira SCRUM project. It works. Session 161–163 prove it catches real drift.
2. Externalizing it as a product puts Intellios against Atlassian Rovo. You lose that fight.
3. Externalizing it as a connector (e.g., "Intellios writes to Jira/Confluence for customer X") is a feature, not a product — and every AI tool has it already.
4. Externalizing it as a *playbook* (templates + patterns + implementation steps customers can adopt) is exactly the customer-success enablement you will need anyway, costs nothing additional to produce, and compounds the governance positioning.

### What that means concretely

- Publish the Intellios internal operating model (sanitized) as a **public playbook** — Confluence template pack, Jira workflow preset, sample ADR template, sample session-log template, the `docs/` directory structure.
- This is positioning collateral, not a product SKU. It helps you *win the governance-first narrative* in enterprise conversations.
- If a design partner asks for a direct Jira integration during implementation (to auto-create Stories from intake sessions, say), build it *for that customer* as professional services — do not productize it speculatively.
- The four-surface discipline (ADR-029) becomes a **capability you sell as the way to run agent programs**, not a piece of software you ship.

### The subtle trap to avoid

The trap is mistaking your own delivery discipline for a product. Your discipline is the operating model *behind* Intellios — the reason Intellios itself is well-built. Enterprises will want to adopt the discipline because of the outcomes Intellios produces. The product is Intellios. The discipline is what makes it trustworthy.

---

## 7. Enterprise Reality Check

Eight enterprise-reality considerations, candidly assessed:

| Consideration | Assessment |
|---|---|
| Change management friction | Medium. Enterprises adopt new AI governance tools readily *if* there is a regulatory driver. Lean into EU AI Act, NIST AI RMF, internal AI risk committees. |
| Customer success enablement | Weak today. The playbook pack is the #1 gap after the demo. |
| Implementation burden | Low if self-hosted, medium if managed. The control plane itself is lightweight. |
| Enterprise trust | Good but fragile. The governance story is the trust story. Any "we also run the runtime" messaging erodes it. Guard the framing. |
| Governance and auditability | Strong. Evidence package (ADR-015, when shipped) + policy versioning + multi-step approval + SOD is genuinely enterprise-grade. This is the moat. |
| Overlap with native platform AI features | Rising. AWS AgentCore, Azure AI Foundry, Vertex Agent Builder are all adding governance hooks. The Intellios advantage is **cross-runtime, policy-first, auditable, and not owned by the runtime vendor.** Preserve that distinction ruthlessly. |
| Time-to-value | A credible demo shortens enterprise evaluation cycles from 6+ months to 2–3. The live demo is the TTV accelerator. |
| Scalability | The architecture scales. The constraint is human-side (enablement, customer success), not technical. |
| Cost of maintaining integrations | High-risk if broadened. Low-risk if confined to one runtime (AWS AgentCore) for now. |
| Platform dependency risk | High. Sole AgentCore dependency is the biggest concentration risk. Plan the Azure/Vertex adapter *after* the first customer, not before — but plan it. |
| Clarity of go-to-market story | Weak today. One-pager + narrative needed in 30 days. |

---

## 8. Decision-Useful Recommendation

### What direction to take

**Finish the wedge, land one design partner, package the operating model as a playbook. Nothing else.**

### What to defer

- Connector catalog work (indefinitely, as a category).
- Second runtime (until design partner requires it).
- Additional artifact classes (until design partner asks).
- Marketing/sales scaling (until design partner closes).

### What to avoid

- Pivoting to Jira/Confluence translation as a product.
- Building a standalone system-of-record.
- Services-led pivot masquerading as a product strategy.
- Adding surface area before PMF.

### What to test before committing heavily

- Governance-first buyer hypothesis.
- ABP expressiveness on a real customer agent.
- AgentCore platform-risk surface.

### How to sequence execution

The four-phase sequence in §4. Each phase has a gate — do not advance without passing the prior phase's validation.

---

# Deliverables

The rest of this document is the execution-ready translation of the strategy.

---

## DELIVERABLE 1 — Executive Decision Memo

**Recommended direction.** Finish Intellios's governed-agent-control-plane wedge, land one paid design partner, and package the internal operating model as the customer-success playbook. Defer connector breadth, defer Jira/Confluence productization, defer new runtimes, defer new artifact classes.

**Why now.** The product is ~90% shipped. Session 157 closed the two last lifecycle gaps (runtime-test harness and retirement). The remaining work before "real end-to-end against AWS Bedrock" is one live smoke deploy, one evidence-package feature (ADR-015), and a demo recording. That is days-to-weeks of work, not quarters. The risk of broadening the surface before finishing is that the wedge never finishes and the surface becomes unmaintainable. The risk of finishing the wedge is low, because the work is mechanical from here.

**Alternatives rejected.**
1. *Connector catalog.* Anti-differentiating; unmaintainable at solo scale; connectors are a commodity.
2. *Jira/Confluence translation pivot.* Hostile competitive turf (Rovo); throws away agent-wedge compounding; the translation capability is higher-leverage as a services playbook than as a product.
3. *JSM/ServiceNow focus.* Crowded, long sales cycles, domain expertise you do not have.
4. *Build internal system-of-record.* Structural mismatch with enterprise buying.
5. *Pure services-led.* Starves the product. Adopt services *around* the product, not *instead of* it.

**Assumptions that matter most.**
- The governance-first buyer exists as a decision-maker, not just a contributor. (Needs validation in first 60 days.)
- AgentCore + AWS is a defensible initial runtime choice. (Likely sound; watch for native-governance encroachment.)
- The internal operating model transfers to a customer-usable playbook. (Risky; test with design partner.)

**Top risks (with mitigations).**
- *AgentCore native governance ships and subsumes Intellios.* Mitigation: preserve the "cross-runtime, policy-first, not owned by the runtime vendor" narrative; plan Azure adapter as a Phase D trigger.
- *No qualified design partner in 90 days.* Mitigation: start outreach the moment the demo is live; price at design-partner rates to create commitment signal; be willing to do the first one at cost.
- *ABP schema proves insufficient for a real customer agent.* Mitigation: versioned schema with migration path already exists; budget one ADR + one schema bump per real-customer finding.
- *Solo operator + AI cannot sustain the delivery pace into a production customer engagement.* Mitigation: draw a line at 70% solo + 30% contracted specialist help from Day 60.
- *The governance narrative fails to land with buyers.* Mitigation: the demo IS the narrative. If the demo doesn't sell it, rewrite the narrative before building more product.

**Decision rationale.** Intellios has the three ingredients that justify finishing: (1) a clear defensible positioning, (2) ~90% of the product built, (3) a real integration with a credible runtime. The two ingredients it lacks — a live customer and a packaged delivery model — are both achievable in one 90-day push without any additional product breadth. Any other strategic direction either abandons what's built or adds surface that cannot be maintained.

**Proposed sequencing/phasing.**
- **Phase A (Day 0–30) — Wedge Close.** Session 158 live smoke, ADR-015 evidence renderer, demo recording, one-pager, buyer narrative.
- **Phase B (Day 30–90) — Design Partner.** One priced design-partner engagement against real customer data.
- **Phase C (Day 60–150) — Playbook.** Extract operating model → customer-usable playbook pack.
- **Phase D (Day 150+) — Conditional Expansion.** One additional runtime OR one additional artifact class OR targeted connectors, driven by design-partner pull.

---

## DELIVERABLE 2 — Target Operating Model

Purpose: define how a planning conversation / workshop / requirements discussion / AI-generated work product becomes, in order, (a) durable documentation in Confluence and (b) prioritized units of work in Jira. This is the operating model Intellios itself runs on, which is simultaneously the customer-success playbook you will sell.

### 2.1 Principles

1. **Every substantive session produces four surfaces.** Repo commit, session log, project-journal entry, Jira/Confluence receipts. All four must agree; any two can reconstruct the third. (This is the ADR-029 invariant generalized.)
2. **Decisions are first-class artifacts.** Any technical choice of material weight becomes an ADR (or its customer-playbook equivalent: a Decision Record). ADRs live in repo *and* Confluence, versioned identically.
3. **Conversations produce three outputs every time.** A synthesis document (Confluence), one or more Jira work items, and — if a decision was made — an ADR entry.
4. **Backlog shape follows the wedge.** Initiatives → Epics → Stories → Subtasks. No floating tasks, no "general backlog." Every Story links to one Epic; every Epic links to one Initiative; every Initiative ties to a strategic outcome.
5. **Labels carry cross-cutting structure.** `sys:*` for subsystem, `concern:*` for cross-cutting (security, performance, accessibility), `adr-NNN` to trace decisions into implementation, `phase:*` for strategic phase (wedge-close, design-partner, playbook, expansion). (This is the existing Intellios label taxonomy — keep it.)
6. **Documentation and code ship together.** No code commit without the documentation commit (same commit or the immediate follow-up).
7. **AI-generated work is treated like human-generated work.** Same ADR discipline, same review gates, same test coverage expectations.

### 2.2 The Translation Loop (canonical flow)

```
 ┌──────────────────────────────────────────────────────┐
 │  Conversation / Workshop / Plan / AI Output          │
 └───────────────────────┬──────────────────────────────┘
                         │  (1) synthesis pass
                         ▼
 ┌──────────────────────────────────────────────────────┐
 │  Session Synthesis Document (Confluence page)         │
 │   • Context                                           │
 │   • Decisions made (each → ADR if material)           │
 │   • Decisions deferred (→ Open Questions)             │
 │   • Follow-up work (→ Jira backlog items)             │
 └────────────┬──────────────────────────────┬──────────┘
              │                              │
         (2) decisions                  (3) follow-up work
              │                              │
              ▼                              ▼
 ┌────────────────────────┐    ┌────────────────────────┐
 │  ADRs (Decision        │    │  Jira Stories /        │
 │   Records in repo      │    │   Subtasks (linked to  │
 │   + Confluence mirror) │    │   the right Epic)      │
 └────────────┬───────────┘    └────────────┬───────────┘
              │                              │
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │  Implementation Sessions     │
              │  (each producing four        │
              │   surfaces: commit, log,     │
              │   journal, Jira/Confluence)  │
              └──────────────────────────────┘
```

### 2.3 Roles And Ownership

| Artifact | Owned by | Reviewed by | Cadence |
|---|---|---|---|
| Session Synthesis Document | Session facilitator (human or AI) | Product/Architect | Per session |
| ADR | Author of the decision | Architect approval required | Per material decision |
| Jira Story | Product/Architect | Tech Lead | Per actionable follow-up |
| Session Log | AI or implementer | Self-audit at session close | Per session |
| Project Journal Entry | Implementer | — | Per session |
| Effort Log | Implementer | — | Per session |

### 2.4 Quality Controls

- **Four-surface gate at session close.** No session closes without all four surfaces written.
- **Story-to-Epic-to-Initiative closure.** Any floating Story gets reassigned or deleted.
- **Open-question tracking.** Deferred decisions become OQ-NNN entries, each with owner + review date.
- **ADR retro sweep.** Quarterly, or triggered by three consecutive sessions shipping against an ADR still at `proposed`. (Session 162 established this cadence.)
- **Evidence package generation** (post ADR-015). For any decision with regulatory weight, a PDF package auto-generated from the four surfaces.

### 2.5 How This Becomes The Customer Playbook

A customer adopting Intellios receives:
- **Confluence space template** — mirror of Intellios's structure: Strategy, Architecture, Decisions (ADRs), Specs, Schemas, Open Questions, Session Log, Journal, Roadmap.
- **Jira project preset** — Initiatives → Epics → Stories → Subtasks, with label taxonomy preconfigured.
- **Session log + effort log templates** — markdown files plus a prompt for AI assistants to auto-populate them.
- **ADR template + decision-record workflow** — with status lifecycle (proposed → accepted → deprecated), four-surface mirroring requirement, and quarterly retro-sweep cadence.
- **Two-hour onboarding workshop** — led by Intellios services, teaching the loop on one real workshop from the customer's backlog.

This is the "customer success enablement" asset. It is made of documents and templates, not software. It is defensible because *you already run it*, not because you built it on speculation.

---

## DELIVERABLE 3 — Jira Backlog

The backlog below is expressed as Initiatives → Epics → Stories. It is *prioritized*; the order within each layer is the execution order. Labels use the existing Intellios taxonomy (`sys:*`, `concern:*`, `adr-NNN`, `phase:*`). Acceptance criteria are tight and verifiable.

Key to priority: P0 = in the critical path of the wedge close; P1 = required for design partner; P2 = conditional on partner pull; P3 = deferred until expansion phase.

### Initiative 1 — WEDGE CLOSE (Phase A)

**Objective:** Convert the 90%-built agent factory into a credible, recorded, demonstrable, end-to-end live reference.

#### Epic 1.1 — Live AWS Smoke & Demo Rehearsal `phase:wedge-close sys:agentcore`

*Rationale:* Session 157 closed the code. Session 158 converts it from "types compile" to "real against the AWS contract end-to-end." Without this, there is no product to show.

| Story | Priority | Acceptance Criteria | Dependencies | Owner |
|---|---|---|---|---|
| 1.1.1 Provision sandbox AWS account + Bedrock execution role | P0 | Role ARN provisioned; seeded in `scripts/seed-demo.ts`; documented in runbook | — | Samy |
| 1.1.2 Live smoke deploy against sandbox | P0 | All 8 lifecycle stages execute live; any errors documented in a Findings table | 1.1.1 | Samy + AI |
| 1.1.3 Retail Bank demo rehearsal | P0 | Full 8-stage walkthrough recorded end-to-end with zero fallback paths invoked | 1.1.2 | Samy |
| 1.1.4 Demo video recording (5–8 min) | P0 | Public-hosted URL; captioned; linked from one-pager | 1.1.3 | Samy |
| 1.1.5 Resolve OQ-010 (RETURN_CONTROL tool-mock) | P1 | Decision documented: build / defer / publish as cookbook. ADR if "build." | 1.1.2 | Architect |

#### Epic 1.2 — Evidence Package Renderer (ADR-015) `phase:wedge-close sys:governance adr-015`

*Rationale:* Enterprise security and compliance teams will ask for a downloadable audit artifact for any agent. ADR-015 is still `proposed` with no implementation. Without this, the governance story is underwritten.

| Story | Priority | Acceptance Criteria | Dependencies | Owner |
|---|---|---|---|---|
| 1.2.1 Implement `src/lib/evidence/` renderer | P0 | PDF evidence pack generated from ABP + validation report + audit log + approval chain | ADR-015 promoted | Samy + AI |
| 1.2.2 `/api/registry/[agentId]/evidence` route | P0 | Reviewer+ role-gated; rate-limited; audit-logged | 1.2.1 | Samy + AI |
| 1.2.3 UI: "Download Evidence Package" button on Registry detail page | P1 | Renders on `deployed` and `retired` states; disabled on `draft` | 1.2.2 | Samy |
| 1.2.4 Promote ADR-015 to `accepted` across four surfaces | P0 | Repo + catalog + Confluence + Jira all flipped; evidence commit linked | 1.2.1 | Architect |

#### Epic 1.3 — Buyer Narrative & One-Pager `phase:wedge-close concern:go-to-market`

*Rationale:* Without a one-page narrative and a crisp buyer persona, every sales conversation restarts from scratch and the demo carries no context.

| Story | Priority | Acceptance Criteria | Dependencies | Owner |
|---|---|---|---|---|
| 1.3.1 Draft buyer persona | P0 | One-page persona for Head of AI Governance / AI Platform Director — pains, levers, objections, buying process | — | Samy |
| 1.3.2 Draft one-pager v1 | P0 | Single page: problem, Intellios answer, differentiation, demo link, pricing tier | 1.3.1 | Samy |
| 1.3.3 Test one-pager on 3 non-customers | P0 | 3 independent reads; feedback collated; v2 revised | 1.3.2 | Samy |
| 1.3.4 Define 3 pricing tiers (design-partner / pilot / production) | P1 | Rates documented; contract templates identified | 1.3.2 | Samy |

---

### Initiative 2 — DESIGN PARTNER (Phase B)

**Objective:** Land one paid design partner, run a real implementation against real customer data, extract product and playbook findings.

#### Epic 2.1 — Target Outreach `phase:design-partner concern:go-to-market`

| Story | Priority | Acceptance Criteria | Dependencies | Owner |
|---|---|---|---|---|
| 2.1.1 Build target list (10 qualified) | P0 | Prioritized list of 10 enterprises with known AI governance initiatives; warm intro path documented per target | 1.3.2 | Samy |
| 2.1.2 Outreach sequence — meetings | P0 | 3 demos in 30 days | 2.1.1, 1.1.4 | Samy |
| 2.1.3 Qualify → LOI → signed agreement | P0 | One signed design-partner agreement ($25–75K) | 2.1.2 | Samy |

#### Epic 2.2 — Design Partner Implementation `phase:design-partner sys:*`

| Story | Priority | Acceptance Criteria | Dependencies | Owner |
|---|---|---|---|---|
| 2.2.1 Intake session with customer's AI governance team | P0 | Full intake for one real agent captured as ABP intake payload; session synthesis doc produced | 2.1.3 | Samy |
| 2.2.2 Generate + validate ABP against customer's policy pack | P0 | ABP passes validation (or remediation cycle completes) | 2.2.1 | Samy + AI |
| 2.2.3 Deploy to customer's AWS sandbox | P0 | Agent deployed; invocation smoke-tested; evidence package generated | 2.2.2 | Samy |
| 2.2.4 Review with customer's compliance team | P0 | Compliance sign-off or documented gap list | 2.2.3 | Samy |
| 2.2.5 Findings log | P1 | Every friction point categorized as "product fix," "playbook fix," or "accept as is" | 2.2.1–4 | Architect |

#### Epic 2.3 — Platform Risk: AgentCore Encroachment Watch `phase:design-partner concern:strategic-risk`

*Rationale:* The biggest strategic risk (A10) is AWS shipping native governance features that subsume Intellios. Monitor explicitly.

| Story | Priority | Acceptance Criteria | Dependencies | Owner |
|---|---|---|---|---|
| 2.3.1 Monthly AgentCore release-notes review | P1 | Review doc logged in Confluence each month; any feature overlap flagged as an OQ | — | Architect |
| 2.3.2 Pre-commit decision: 2nd runtime trigger | P1 | ADR written documenting the *specific* market or platform signal that would trigger an Azure or Vertex adapter | 2.3.1 | Architect |

---

### Initiative 3 — PLAYBOOK PRODUCTIZATION (Phase C, parallel to B)

**Objective:** Extract the internal operating model into a customer-usable implementation playbook pack.

#### Epic 3.1 — Confluence Space Template Pack `phase:playbook concern:customer-success`

| Story | Priority | Acceptance Criteria | Dependencies | Owner |
|---|---|---|---|---|
| 3.1.1 Abstract Intellios Confluence space into a template | P1 | Section structure (Strategy, Architecture, ADRs, Specs, Schemas, Open Questions, Session Log, Journal, Roadmap) documented as reusable template; PII + internal specifics removed | — | Samy |
| 3.1.2 Publish as downloadable pack (.json Confluence export + README) | P1 | One-click import produces a new empty space with identical structure | 3.1.1 | Samy |
| 3.1.3 Write "Space Adoption Guide" | P1 | One-page guide: how to run the space, what each section is for, how it maps to Jira | 3.1.1 | Samy |

#### Epic 3.2 — Jira Project Preset `phase:playbook concern:customer-success`

| Story | Priority | Acceptance Criteria | Dependencies | Owner |
|---|---|---|---|---|
| 3.2.1 Export Intellios SCRUM project schema | P1 | Issue types, workflows, fields, label taxonomy documented | — | Samy |
| 3.2.2 Publish as Jira configuration pack | P1 | Import-ready preset; README; sample Initiatives/Epics/Stories | 3.2.1 | Samy |

#### Epic 3.3 — Operating Model Playbook Document `phase:playbook concern:customer-success`

| Story | Priority | Acceptance Criteria | Dependencies | Owner |
|---|---|---|---|---|
| 3.3.1 Draft "Governed Agent Delivery Playbook" v1 | P1 | 20–40 page PDF covering: intake pattern, ADR discipline, four-surface invariant, retro sweep cadence, evidence package discipline, review & approval workflow | — | Samy |
| 3.3.2 Review with design partner as dogfood | P2 | Design partner uses the playbook on 2.2.1–4; feedback collated | 2.2.1, 3.3.1 | Samy |
| 3.3.3 Playbook v2 revision | P2 | Findings from 3.3.2 addressed | 3.3.2 | Samy |
| 3.3.4 Onboarding workshop deck | P2 | 2-hour workshop deck for new customer teams | 3.3.1 | Samy |

---

### Initiative 4 — CONDITIONAL EXPANSION (Phase D, gated)

**Objective:** Exactly one extension beyond the wedge, driven by design-partner pull.

#### Epic 4.1 — Runtime Adapter: Azure OpenAI Assistants OR Vertex Agent Builder `phase:expansion sys:runtime adr-tbd`

*Rationale:* Only triggered if the design partner mandates a non-AWS runtime. Build one, not both.

| Story | Priority | Acceptance Criteria | Dependencies | Owner |
|---|---|---|---|---|
| 4.1.1 ADR: runtime-adapter abstraction | P3 | ADR documenting the adapter contract and the first additional runtime | Partner pull | Architect |
| 4.1.2 Adapter implementation | P3 | End-to-end lifecycle test green on the new runtime | 4.1.1 | Samy + AI |

#### Epic 4.2 — Additional Artifact Class (e.g., Governed Automations) `phase:expansion sys:new-artifact adr-tbd`

*Rationale:* Only triggered if partner pull identifies a high-value artifact class beyond agents.

| Story | Priority | Acceptance Criteria | Dependencies | Owner |
|---|---|---|---|---|
| 4.2.1 ADR: artifact-class generalization | P3 | ADR + schema ADR for the new artifact class | Partner pull | Architect |
| 4.2.2 Prototype implementation behind feature flag | P3 | Single artifact lifecycle works; feature-flagged; no default exposure | 4.2.1 | Samy + AI |

#### Epic 4.3 — Targeted Connectors `phase:expansion concern:integration`

| Story | Priority | Acceptance Criteria | Dependencies | Owner |
|---|---|---|---|---|
| 4.3.1 Connector: Jira auto-create stories from intake sessions | P3 | *Only* if design partner blocks on it. MCP-based implementation preferred. | Partner pull | Samy + AI |
| 4.3.2 Connector: Okta SSO | P3 | *Only* if enterprise SSO is a procurement blocker | Partner pull | Samy + AI |

---

### Initiative 5 — DO-NOT-DO (explicit rejections)

Document these explicitly so future sessions do not re-open them.

- ❌ General connector catalog — rejected as a wedge (see ADR to be authored).
- ❌ Jira/Confluence translation product — rejected as a pivot (see memo §2.2).
- ❌ ITSM/ServiceNow focus — rejected as tangent.
- ❌ Standalone system-of-record — rejected structurally.
- ❌ Multi-tenant SaaS polish pre-PMF — deferred.
- ❌ Second runtime before design partner demands it — deferred.

Create one ADR-030: "Strategic Direction — Wedge-First, Playbook-Second, Expansion-Conditional" documenting these rejections with rationale. This becomes the North Star ADR against which future scope-expansion proposals are measured.

---

## DELIVERABLE 4 — Confluence Information Architecture

Purpose: a durable documentation structure that mirrors the repo and serves as the customer-facing canonical surface. This IA is itself the template you will productize in Epic 3.1.

### Top-level spaces

Single Confluence space (`INTELLIOS`) with the nested structure below. No separate spaces.

### Tree

```
Intellios (Home)
├── Strategy
│   ├── North Star & Positioning
│   ├── Strategic Direction Memo (this document)
│   ├── Competitive Landscape
│   ├── Buyer Persona(s)
│   └── One-Pager
├── Architecture
│   ├── System Overview
│   ├── Subsystem Specs (Intake / Generation / Governance / Registry / Review UI)
│   ├── Runtime Adapters
│   ├── Control Plane
│   └── Data Model & ABP Spec
├── Decisions (ADRs)
│   ├── ADR Catalog (status table)
│   ├── ADR-001 → ADR-NNN (each as a child page)
│   └── Decision Methodology
├── Specifications
│   └── Per-component behavior specs
├── Schemas
│   ├── ABP Schema (versioned)
│   └── Policy Schema (versioned)
├── Open Questions
│   └── OQ-NNN (each as a child page)
├── Roadmap & Status
│   ├── Current Phase
│   ├── Wedge Close Tracker
│   ├── Design Partner Tracker
│   └── Playbook Tracker
├── Operating Model (Intellios-internal)
│   ├── Four-Surface Discipline (ADR-029)
│   ├── Session Log Conventions
│   ├── Jira Playbook
│   ├── Effort Log
│   └── Retro Sweep Methodology
├── Implementation Playbook (Customer-Facing) [Phase C]
│   ├── Governed Agent Delivery Playbook
│   ├── Confluence Space Template Guide
│   ├── Jira Preset Guide
│   ├── Onboarding Workshop
│   └── Pattern Library
├── Demo Assets
│   ├── Retail Bank Walkthrough
│   ├── Demo Video
│   └── Evidence Package Example
├── Workshops & Sessions
│   └── Session Synthesis pages (one per material working session)
├── Delivery Progress
│   └── Session Logs (one per session)
└── Project Journal
    └── Narrative entries (one per session)
```

### Page purposes, audiences, required contents

| Page | Purpose | Audience | Required contents |
|---|---|---|---|
| **North Star & Positioning** | Anchor for every subsequent decision | Founder, early team, design partner | Vision sentence; what Intellios *is* and *is not*; the five principles |
| **Strategic Direction Memo** | This document | Founder, board, design partner | Recommendation + rationale + deliverables |
| **Competitive Landscape** | Honest read of adjacent/overlapping players | Founder, buyer | AgentCore native governance, Rovo, Now Assist, framework players — where Intellios overlaps and where it wins |
| **Buyer Persona(s)** | Who writes the check, who blocks | Founder, sales | Pains, levers, objections, buying process, 3–5 named titles |
| **One-Pager** | The 60-second artifact | Buyer, recruiter | Problem, answer, differentiation, demo link, call to action |
| **System Overview** | High-level architecture | All technical readers | Subsystem diagram, data flow, ABP as central artifact |
| **Subsystem Specs** | Behavior specifications | Engineers, integrators | Interface, responsibilities, data contracts, status |
| **ABP Spec** | Canonical artifact definition | Engineers, buyer | Schema version table, field-by-field doc, evolution policy |
| **ADR Catalog** | Live status table of every ADR | All technical readers | One row per ADR: number, title, status, implementing commit, Jira link |
| **ADR-NNN pages** | One per decision | Decision reviewer, auditor | Context, decision, consequences, alternatives considered, status, implementation section |
| **Open Questions** | Live tracker of unresolved questions | Founder, architect | Each OQ: question, owner, review date, blocking work |
| **Roadmap & Status** | Where we are, what's next | Founder, design partner | Current phase, wedge tracker, risks |
| **Operating Model** | Intellios's own discipline | Internal team, (later) playbook dogfood | The four-surface invariant; ADR-029; session-log format; retro-sweep cadence |
| **Implementation Playbook (Customer)** | The asset customers receive | Customer champion, customer architect | Delivery pattern; Confluence + Jira preset docs; workshop materials; evidence-package guidance |
| **Demo Assets** | Recordings and artifacts | Buyer | Demo video; Retail Bank walkthrough; sample evidence package |
| **Workshop & Sessions** | Synthesis from working sessions | Founder, architect | Context, decisions, deferred items, follow-ups |
| **Session Logs** | Per-session audit trail | Architect, auditor | Actions, outcomes, commits, effort |
| **Project Journal** | Narrative of why, not what | Founder, future team | One entry per session; strategic context; lessons learned |

### Governance of this IA

- Every top-level section has an **owner** (named, not just a role).
- Every page has a **last-reviewed date** — stale > 90 days triggers a review.
- Every ADR page is mirrored to repo at `docs/decisions/NNN-*.md`; drift is caught by the quarterly retro sweep.

---

## DELIVERABLE 5 — Workflow Design

Purpose: the explicit workflow by which a conversation / session / plan / requirement / AI-generated output becomes prioritized Jira work plus durable Confluence documentation.

### Step-by-step

#### Step 0 — Session Framing (pre-conversation)

- Facilitator (human or AI) confirms: what outcomes is this session meant to produce? What decisions are in scope? What artifacts are expected?
- If the session is implementation-oriented: identify or create the Jira Story, transition to **In Progress**.
- If meta/governance: note the exemption explicitly in the session log's front-matter.

#### Step 1 — Session Execution

- Conversation / workshop / implementation proceeds.
- Facilitator captures in real time: decisions made, decisions deferred, follow-ups identified.
- For AI-led sessions: AI produces the session log action-by-action as it works.

#### Step 2 — Synthesis (within ~24h of session close)

- Facilitator writes the **Session Synthesis** page in Confluence under Workshops & Sessions, with four required sections: Context, Decisions Made, Decisions Deferred, Follow-Up Work.
- Every Decision Made gets a classification: (a) covered by existing ADR — reference the ADR; (b) material new decision — write a new ADR; (c) immaterial — inline in the synthesis page only.
- Every Decision Deferred becomes an OQ-NNN entry with owner + review date.
- Every Follow-Up Work item becomes a candidate Jira Story.

#### Step 3 — ADR Authoring (for material new decisions)

- Author writes the ADR using the template at `docs/decisions/_template.md`; mirrors to Confluence under Decisions.
- ADR starts at `proposed`.
- Architect reviews; promotes to `accepted` or requests revision.
- On acceptance: the four-surface flip happens in one commit (repo ADR file, repo catalog, Confluence page, Confluence catalog) with a Jira Story closing comment if one was linked.

#### Step 4 — Jira Backlog Update

- Each Follow-Up Work item is created as a Jira Story under the correct Epic with the correct label taxonomy (`sys:*`, `concern:*`, `adr-NNN`, `phase:*`).
- Stories without an Epic are out-of-bounds; either assign to an existing Epic or create a new one (which is itself a decision worth examining).
- Priority is set at creation (P0–P3).

#### Step 5 — Implementation Sessions (subsequent)

- Each implementation session opens with Story transition to **In Progress** and ends with Story closure, session log, journal entry, and any ADR status flips.
- Every commit message references its Jira key and, if applicable, ADR number.

#### Step 6 — Quality Controls At Session Close

- **Gate 1 — Four surfaces present.** Commit, session log, journal entry, Jira/Confluence receipt.
- **Gate 2 — Tests and typecheck green.** (Code sessions only.)
- **Gate 3 — Documentation current.** Specs, roadmap, open questions, effort log all updated.
- **Gate 4 — ADR status coherent.** Any ADR referenced in the session has consistent status across all four surfaces.

#### Step 7 — Quarterly Retro Sweep

- Every 90 days, or triggered by three consecutive sessions shipping against an ADR still at `proposed`, run the retro sweep (methodology captured in the session-162 Confluence page).
- Sweep identifies drift; produces a Jira Story to close the sweep; ends with a clean state.

### Ownership

| Step | Owner |
|---|---|
| 0 — framing | Facilitator |
| 1 — execution | Whoever is working |
| 2 — synthesis | Facilitator (may delegate to AI) |
| 3 — ADR | Decision author; Architect reviews |
| 4 — Jira | Product/Architect |
| 5 — implementation | Implementer (human or AI) |
| 6 — session close gates | Self-audit by implementer |
| 7 — retro sweep | Architect |

### Where AI and humans interact

- AI drafts; humans decide.
- AI can execute any step whose gate is mechanical (log writing, Jira creation, Confluence mirror).
- Humans must approve: ADR acceptance, Jira Story creation from a fuzzy follow-up, Story priority, and the four-surface gate at session close.
- The rule: AI is trusted up to but not including the acceptance moment of a decision; acceptance is a human act.

---

## DELIVERABLE 6 — First 90 Days Plan

### Weeks 1–2 (April 24 – May 8)

- **Wedge close tactical.** Provision sandbox AWS; run Session 158 live smoke; record findings; resolve OQ-010.
- **ADR-030 authoring.** "Strategic Direction — Wedge-First, Playbook-Second, Expansion-Conditional" — documents this memo's rejections.
- **Buyer persona v1.** Draft + 3 read-throughs with non-customers.
- **Target list research.** Identify 10 candidate design partners with warm-intro paths.

**Exit criteria:** Live smoke green; ADR-030 accepted; persona + target list complete.

### Weeks 3–4 (May 8 – May 22)

- **Evidence package renderer (ADR-015).** Ship end-to-end; flip ADR to `accepted`.
- **Demo recording.** Full 8-stage Retail Bank walkthrough, 5–8 min video, public URL.
- **One-pager v1.**
- **Begin outreach** to top 5 targets.

**Exit criteria:** Demo video public; one-pager v1 done; 3 meetings on calendar.

### Weeks 5–8 (May 22 – June 19)

- **Design partner meetings** (3 targeted).
- **Pricing tiers defined** + contract templates.
- **Playbook v1 draft begins** in parallel — focused on the operating-model documentation that already exists internally.
- **Monthly AgentCore watch** starts (Epic 2.3.1).

**Exit criteria:** At least one qualified design-partner prospect in LOI; Playbook v1 outline complete.

### Weeks 9–13 (June 19 – July 24)

- **Sign one design partner.**
- **Begin design-partner implementation** (intake → generate → validate → deploy → review).
- **Playbook v1 dogfooded** with the design partner's team.
- **Findings log active.**

**Exit criteria:** One paid design partner live in production environment; at least first real agent deployed; Playbook v1.5 revised from dogfood feedback.

### Decision points

- **End of Week 4:** if no meetings booked, rewrite the one-pager and buyer persona. Do not proceed to Week 5 outreach without diagnosing the gap.
- **End of Week 8:** if no LOI in hand, reassess buyer persona. Candidate reframe: target AI Platform teams at mid-market instead of governance teams at enterprises. This is the hardest decision in the plan and deserves a dedicated strategic session.
- **End of Week 13:** if design partner engagement reveals the positioning doesn't land, pause Phase C and hold a positioning retro. Adjust the narrative before spending playbook effort.

### Resource shape

- **Samy:** ~60% of time on wedge-close and partner outreach; ~20% on implementation with the design partner; ~20% on playbook.
- **AI (Claude in Cowork / Claude Code):** execution labor across all three streams, ADR-029 discipline enforced.
- **Contracted specialist help (reserved for Phase B implementation):** budget for 20–40 hours of external help once design partner signs, particularly for customer-side AWS/security review navigation.

---

## DELIVERABLE 7 — Risks And Validation Tests

### Top strategic risks

| # | Risk | Severity | Mitigation / test |
|---|---|---|---|
| S1 | AWS AgentCore ships native governance that subsumes Intellios | High | Monthly release-notes watch (Epic 2.3.1); preserve "cross-runtime, not owned by runtime vendor" narrative; trigger Azure adapter ADR the moment overlap is material |
| S2 | Governance-first buyer persona is wrong | High | Test with 10 qualified targets in 60 days; if no meetings, reframe persona before investing further |
| S3 | Intellios positioning sounds academic next to agent-builder platforms with shiny UIs | Medium | Lean on the evidence package and lifecycle demo as concrete differentiation; avoid competing on UI polish |
| S4 | Competition from LangGraph/CrewAI + cloud platforms + Atlassian/Notion AI compresses the governance niche | Medium | Maintain lifecycle-completeness and policy-expressiveness as the moat; do not try to match breadth on any other axis |
| S5 | ABP schema insufficient for a real customer agent | Low | Versioned schema; migration path; one ADR + one schema bump budget per finding |

### Top delivery risks

| # | Risk | Severity | Mitigation / test |
|---|---|---|---|
| D1 | Live AWS smoke exposes contract mismatches that require rework | Medium | Session 158 is time-boxed at 2–3 days; if rework is >1 week, re-plan before proceeding |
| D2 | Solo founder burnout under Phase A + Phase B + Phase C parallel load | High | Hard cap Phase C at ~20% time until design partner signs; reserve contracted help budget |
| D3 | Design partner engagement generates scope creep beyond the wedge | High | Contract explicitly limits scope; scope changes require a new engagement; every customer ask is classified as product / playbook / services |
| D4 | Evidence package (ADR-015) is more work than budgeted | Medium | If implementation is not complete in 2 weeks, scope down to minimal viable PDF renderer, document the gaps as follow-up OQs |

### Top adoption risks

| # | Risk | Severity | Mitigation / test |
|---|---|---|---|
| A1 | Design partner's compliance team rejects the evidence package format | Medium | Show the evidence package structure to 1–2 friendly enterprise compliance contacts before the design-partner implementation |
| A2 | Design partner's AWS team refuses to grant Bedrock access to an external tool | Medium | Ship a documented IAM permission model before the demo; include in buyer conversations |
| A3 | Design partner champions Intellios but cannot get through procurement | High | Select design partners with evidence of prior vendor onboarding <$100K in <90 days; de-prioritize slow-procurement targets |

### Real-world validation tests to run before scaling investment

1. **Buyer persona test (by Week 4).** Does the Head of AI Governance / AI Platform title exist and respond to the one-pager? If <20% meeting conversion from 10 targets, reframe.
2. **Positioning test (by Week 6).** In first 3 meetings, does the "governed control plane, not runtime" framing resonate or confuse? If it confuses, rewrite before broadening outreach.
3. **Demo test (by Week 4).** Does the 8-stage lifecycle demo produce the "that's what I need" reaction? If the demo requires >30 minutes of additional explanation, the narrative is wrong.
4. **Evidence package test (by Week 6).** Does a friendly enterprise compliance contact accept the evidence package format at face value? If they ask for substantial changes, capture the gap and decide product vs. services.
5. **Playbook dogfood test (Phase C).** Does the design partner's team absorb the four-surface discipline in <4 hours of onboarding? If not, the playbook is undershooting its audience.
6. **Platform-risk test (monthly).** Each AgentCore release: does any feature overlap with Intellios's governance surface by >20%? If yes, author an ADR on the response.
7. **Procurement test (Phase B).** Time-to-signed-LOI after first demo: target <60 days. If >90 days, re-select design partners.

---

## DELIVERABLE 8 — Clear Recommendation Summary

### The path to pursue

**Finish the agent-factory wedge; land one paid design partner; package the internal operating model as the customer-success playbook.** In that order, with strict discipline against broadening the surface.

### The path not to pursue yet

- **Connector catalog.** Not now, possibly not ever. Build connectors one-at-a-time when a customer blocks.
- **Jira/Confluence translation productized.** Keep it as an operating-model capability and a services playbook. Do not compete with Rovo.
- **Second runtime.** Not before a design partner requires it.
- **Additional artifact classes.** Not before a design partner asks for one.
- **Services-led pivot.** Keep services tight around the product; do not let the product become a brochure for services.

### The first proof point to establish

**A recorded, public, 5–8 minute demo of the full eight-stage lifecycle running live against AWS Bedrock, with an evidence package generated and downloadable, visible on an Intellios URL by end of May 2026.** This is the artifact that converts the next ten sales conversations from abstract to concrete.

### The first meaningful business outcome to target

**One paid design partner — $25–75K — signed by end of July 2026**, with a signed statement-of-work to deploy one real agent from intake to production against the customer's real AWS account and real policy set by end of September 2026.

### The one thing to do this week

Provision the sandbox AWS account with a Bedrock execution role and complete Session 158's live smoke. Every other piece of the plan depends on this.

---

## Appendix — How This Memo Translates Itself

This memo was written to be converted directly into Jira and Confluence. To operationalize it:

1. **Create Initiatives 1–5** in Jira (the five Initiative headings in Deliverable 3).
2. **Create the Epics** as listed in Deliverable 3; apply the labels shown.
3. **Create the Stories** as listed; set priorities per the P0–P3 in the tables; assign owners.
4. **Create the Confluence pages** per Deliverable 4's tree; this memo itself goes under Strategy.
5. **Author ADR-030** capturing the rejections in Initiative 5.
6. **Open OQ entries** for each assumption labeled "uncertain" or "risky" in §3.
7. **Log this as a strategic-direction session** in `docs/log/` and write a journal entry.
8. **Quarterly re-read.** Re-open this memo at the end of Phase A, end of Phase B, and end of Phase C. Update what the evidence has changed. Preserve the original as a versioned artifact.

The memo is itself subject to ADR-029's four-surface discipline: once accepted, it should exist in repo, in Confluence, and be linked from the Project Journal and a Jira Initiative.
