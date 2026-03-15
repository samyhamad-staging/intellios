# Intellios — Project Journal

A narrative record of how this project has evolved over time. Written retrospectively at the end of each session to capture strategic context, reasoning, and the arc of development — things that are not visible from code commits or action logs alone.

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
