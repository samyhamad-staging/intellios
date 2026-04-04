# Intellios | How Intellios Was Built

*A transparent look at what it took to build an enterprise AI governance platform — and the working relationship at the center of it.*

*Updated April 2, 2026*

---

> **A Note to My Colleagues**
>
> I want to share something with you honestly. Not as a pitch. Not as a press release. Just a straightforward account of how Intellios came together, what it cost, what surprised me, and what I think it means — for this product and for the way we build software going forward.
>
> My name is Samy Hamad. I built Intellios working alongside Claude, an AI assistant made by Anthropic. Not managing a team that used AI tools. Not supervising engineers who happened to have copilots. I sat at my laptop, directed Claude through 88 working sessions over 22 days, and together we shipped a production-grade enterprise platform.
>
> Some of these numbers might seem hard to believe. I had trouble believing them myself. So I tracked everything — every session, every decision, every dollar — and I'm sharing all of it, including the parts that make me uncomfortable.

---

## What Intellios Is

For those of you less familiar with the project: Intellios is a governed control plane for enterprise AI agents. It helps regulated organizations design, generate, validate, review, deploy, and monitor AI agents — under their own policies, their own compliance frameworks, and their own brand.

Think of it as a factory floor for AI agents, where every agent that rolls off the line has been designed with governance baked in, reviewed by humans, validated against policy, and tracked through an audit trail.

---

## What We Actually Shipped

Here's the scope of what exists today:

- **119 API endpoints** across intake, generation, governance, registry, deployment, admin, and telemetry
- **69 React components** — dashboards, chat interfaces, review workflows, compliance views, admin panels
- **132 library modules** covering policy engines, AI orchestration, audit trails, model risk management, and deployment adapters
- **389 source files** total in the production codebase
- **5 core subsystems** working together: Intake Engine (Design Studio), Generation Engine, Governance Validator, Agent Registry, and Blueprint Review
- **Enterprise infrastructure** you'd expect from a mature product: RBAC with 5 roles, multi-tenant isolation, SSO with automatic user provisioning, webhook integrations, SLA tracking, notifications
- **Regulatory compliance** as a first-class feature — MRM reports, evidence packages, audit trails, separation-of-duties enforcement, configurable approval workflows
- **AI-driven Design Studio** — a guided conversation experience with real-time domain progress tracking, transparency metadata, stakeholder collaboration, and intelligent probing across 7 design domains
- **92 of 103 planned capabilities** delivered (89% of the full product vision)

That's the what. The how is where it gets interesting.

---

## How It Was Built

I directed Claude to build the entire system. No team of engineers. No sprints. No standups. I made the decisions — what to build, how to architect it, when to push back — and Claude wrote the code, the tests, the documentation, and the migrations.

Here are the real numbers:

### The Timeline

| Metric | Value |
|---|---|
| **Start date** | March 12, 2026 |
| **Current state** | April 2, 2026 |
| **Calendar days** | 22 |
| **Working sessions** | 88 |
| **Git commits** | 227 |

### Claude's Side

| Metric | Value |
|---|---|
| **Model** | Claude Sonnet 4.6 (primarily), with Opus 4.6 for complex sessions |
| **Estimated input tokens** | ~14.2 million |
| **Estimated output tokens** | ~2.7 million |
| **Source files generated** | 389 |
| **Total API cost** | ~$180 |

### My Side

| Metric | Value |
|---|---|
| **Active time invested** | ~10 hours |
| **Messages sent** | ~124 |
| **Decisions made** | ~263 |
| **Corrections needed** | ~11% of decisions |

I know how this reads. I'd be skeptical too. So let me walk you through what actually happened between us.

---

## How Samy and Claude Worked Together

This wasn't a magic trick. It was a working relationship that evolved over 88 sessions, and the pattern that emerged is the most important thing I can share with you.

### The First Three Sessions Were Mine

The opening sessions consumed about 4 hours of focused effort — more than a third of my total time on the project. This was the foundation work:

- Defining how the project would organize and document itself
- Answering 15 open specification questions across 5 component specs
- Setting conventions for logging, versioning, and decision-making
- Making the architectural calls: what to build first, what to defer, where subsystem boundaries fall

None of this was glamorous. It was the kind of careful, unglamorous thinking that determines whether everything downstream works or doesn't. Claude couldn't make these calls. They required domain judgment, regulatory knowledge, and product instinct that I've built up over years. This was my contribution, and it was the most valuable work I did on the entire project.

### Then the Dynamic Shifted

From session 4 onward, my role changed. Instead of designing and building, my work became directing and reviewing.

A typical session looked like this:

> **Samy:** "Proceed"
>
> **Claude:** Reads existing code. Plans the next implementation step. Writes the code. Checks for type errors. Updates all documentation. Logs the session.
>
> **Samy:** "Proceed"

In one session — Session 9 — I sent a single message: "Proceed with all phases. I will step away from the laptop." When I came back, Claude had delivered a database migration, new type definitions, an API route, a form component, a system prompt rewrite, updated tools, a review component, a rewritten session page, MRM report updates, a clean TypeScript build, and complete documentation updates.

That session cost $0.80.

I want to be careful not to oversimplify this. That session worked because 8 sessions of careful setup preceded it. Claude wasn't improvising — it was executing within a framework I had thoughtfully constructed. The $0.80 bought execution. The value came from the decisions I made about what to execute and how.

### What the Later Sessions Looked Like

As the project matured past session 68, the work shifted again. Sessions 069 through 088 focused on UX refinement, visual polish, and the kind of design judgment that earlier sessions hadn't required. My correction rate climbed — not because Claude got worse, but because the work demanded more subjective judgment: Is this sidebar too cluttered? Does this conversation flow feel natural when returning to an in-progress session? Should ghost sessions be collapsed or hidden?

These later sessions also introduced Opus 4.6 for complex multi-file UX analysis work, and the per-session cost rose accordingly. The average session cost roughly doubled from the early implementation phase.

---

## What My Judgment Looked Like

I categorized every decision I made across all 88 sessions:

| Category | Count | Share | Description |
|---|---|---|---|
| **D-Approve** | 129 | 49% | Reviewing Claude's proposed plan and saying "go" |
| **D-Scope** | 55 | 21% | What to build, what to skip, what matters for the first version |
| **D-Arch** | 49 | 19% | Technology choices, system boundaries, subsystem relationships |
| **D-Correct** | 30 | 11% | Redirecting when Claude's approach was wrong |

The architecture and scope decisions — the hard ones — clustered in the first few sessions and held up throughout the project. The correction rate increased in the UX-focused later sessions (086-088) where subjective design judgment mattered more than technical execution.

I don't take credit for Claude's speed. But I do think the correction rate says something about what happens when you give an AI clear boundaries and good constraints. It stays on track. When you don't, it produces confident-looking work that misses the point. I've seen both, sometimes in the same day.

---

## What Claude Was Good At

I want to be honest about what Claude brought to this that I couldn't have done alone, or at least not in 22 days:

- **Volume without fatigue.** Claude generated 389 source files across 88 sessions without quality degradation. I would have burned out after the first week.

- **Consistency.** Once I established a pattern — how to structure a route, how to wire a component, how to log a session — Claude followed it reliably across every subsequent implementation. Humans drift. Claude didn't.

- **Documentation as a natural byproduct.** Claude wrote session logs, updated specs, and maintained the project journal not because I reminded it each time, but because I built that expectation into the project conventions. The result is documentation more thorough than most codebases built by large teams.

- **Catching its own errors.** Every session ended with a TypeScript strict-mode check. When errors appeared, Claude fixed them before I even saw them.

- **Multi-file coherence.** In later sessions, Claude could analyze a screenshot of the running application, cross-reference it against the spec and the code, identify 10+ UX gaps prioritized by severity, then implement fixes across 4-5 files in a single session — maintaining consistency across components that referenced each other.

## What Claude Was Not Good At

- Couldn't set direction
- Couldn't evaluate UX/business/regulatory fit
- Would over-engineer if unchecked
- Needed grounding after context resets
- Subjective design judgment — "does this feel right?" required my eye, not Claude's reasoning
- Naming things — one session captured a human first name ("Steve") as an agent name, requiring a validation fix

---

## What I Did That I Think Mattered

### I Treated Documentation as Infrastructure

Every one of the 88 sessions produced a log. Every architectural decision was recorded before implementation. Every spec was updated when behavior changed. The project journal — a running narrative of why I made the decisions I made — grew to 268KB.

This wasn't discipline for discipline's sake. It was the mechanism that kept Claude coherent across dozens of sessions. When a new session started, Claude read the documentation to understand where things stood. Without it, context would have drifted and the quality would have degraded. The documentation wasn't a nice-to-have. It was the governance layer that made autonomous execution possible.

### I Never Let Quality Slide

Every session ended with a TypeScript strict-mode check — zero errors, no exceptions. Every feature was verified in a browser or through Vercel deployment. The system was never in a "we'll clean it up later" state.

This wasn't perfectionism. It was pragmatic. When an AI builds on its own prior work, any unresolved issue compounds. A small type error in session 10 becomes a structural problem by session 30. Keeping the build clean at every step was cheaper than fixing accumulated drift.

### I Shifted from Directing to Designing

The later sessions (070+) required a different kind of input from me. Instead of saying "build the webhook system," I was providing screenshots, circling UI problems, and asking Claude to analyze the gap between what was built and what the experience should feel like. The work became more collaborative and more iterative — closer to pair-designing than delegating.

---

## The Product Proved Its Own Thesis

There's a circularity here I didn't plan but came to appreciate: Intellios is a platform for governing AI agents. It was built by a human governing an AI. The conventions I established — session logging, decision recording, documentation-first development, continuous validation — are the same patterns the product enforces on the agents it helps enterprises create.

The way I built it, working alongside Claude, is the argument for why Intellios should exist.

---

## What This Means — and Where I'm Cautious

I want to think through the implications with you, not hand down conclusions. Here's what the data suggests to me, and where I'm still uncertain:

**Domain expertise may matter more than ever.** This project moved fast not because Claude is fast (it is), but because my direction was precise. Ten hours of experienced judgment produced better results than weeks of undirected AI generation would have. If anything, AI amplifies the gap between clear thinking and fuzzy thinking.

**Team composition might look different for new products.** Not zero engineers — that would be reckless. But perhaps the ratio shifts. Perhaps early-stage product development needs fewer hands writing code and more minds shaping requirements, policies, and architecture. I'm genuinely not sure about this, but I think it's worth exploring together.

**Speed-to-market changes when building costs this little.** When the cost of trying an idea drops from six figures to a hundred and eighty dollars, you can afford to build and test ideas that previously wouldn't survive a prioritization meeting. That changes the calculus for product exploration.

**Documentation might stop being the thing we always mean to do.** This project has more thorough documentation than most codebases built by large teams over long periods. Not because I'm more disciplined than anyone else, but because Claude generates documentation as part of its natural work process when you set up the conventions correctly. If that becomes standard, "well-documented" stops being aspirational.

**But this is one project, and I know that.** One person, one domain, one AI tool, one 22-day window. Different projects, different domains, different team dynamics would produce different results. I'm sharing a data point, not a universal law.

---

## The Broader Cost — Social, Environmental, Sustainability

I'd be dishonest if I presented the $180 and 22 days without addressing what sits underneath those numbers. Building with AI has real costs beyond the invoice, and I think you deserve a careful look at them.

### Energy and Carbon

Every token Claude processed ran on GPUs in a data center that consumed electricity and generated heat.

**What's measurable about this project:**

- Intellios used approximately 16.9 million tokens (14.2M input + 2.7M output) across 88 sessions.
- The International Energy Agency estimates that a single large-language-model query uses roughly 10 times the electricity of a standard web search — approximately 2.9 watt-hours per query versus 0.3 watt-hours (IEA, "Electricity 2024," January 2024).
- Across the ~124 exchanges that produced Intellios, that suggests roughly 0.4-0.5 kWh of electricity for the AI inference alone. That's comparable to running a household laptop for about 8-10 hours.

**What's harder to measure:**

- The energy mix powering the data center matters enormously. Anthropic has stated it sources renewable energy for its operations, but the specifics of grid mix at any given moment during these 88 sessions aren't something I can verify. I'm taking them at their word while acknowledging that "renewable" in corporate reporting doesn't always mean zero-carbon in practice.

- Training the model Claude runs on consumed significantly more energy than my 88 sessions of inference did — by orders of magnitude. That cost is amortized across every user of Claude worldwide, but it exists. Estimates for training large frontier models range from 10,000 to 80,000+ MWh (Luccioni et al., "Power Hungry Processing," 2023; Patterson et al., "The Carbon Footprint of Machine Learning Training," 2022). My project's share of that is vanishingly small, but I benefit from infrastructure with a substantial energy history.

  **For honest comparison:** A traditional team of 5-8 engineers working 4-6 months would have consumed energy too — commuting, heating and cooling office space, running workstations and monitors 8 hours a day, maintaining CI/CD servers. I haven't done a rigorous lifecycle comparison, and I'd be wary of anyone who claims one approach is definitively "greener" without one. What I can say is that the AI path consumed far less calendar time, which compresses the energy window — but concentrates it in data center infrastructure with its own footprint.

### Water

Data centers use water for cooling. This is documented and significant.

- Google reported using approximately 5.6 billion gallons of water across its data centers in 2022 (Google Environmental Report, 2023). Microsoft reported 6.4 billion liters in the same period (Microsoft Environmental Sustainability Report, 2023).
- Anthropic has not published water usage figures specific to its infrastructure. I can't estimate how much water my 88 sessions consumed, and I won't make up a number.
- What I can say: the water cost of AI inference is real, it's growing industry-wide, and my project contributed to it in some small, unquantifiable amount.

### Labor and Livelihoods

This is the hardest section to write, and the one I've thought about the most.

The headline of this document — one person built what traditionally requires 5-8 engineers — has a labor displacement implication that I shouldn't dress up. If this approach scales, fewer people get hired to do work that currently employs a lot of people. That's a real consequence, and it affects real lives.

**What I believe is true:**

- The work I did with Claude didn't take a job from anyone. There was no team that got laid off. This product didn't exist before, and without AI assistance, it likely wouldn't exist now — I simply couldn't have built it alone at this scope using traditional methods.

- But that's one project. If this way of working becomes common, the aggregate effect on software engineering employment is a serious question. The demand for people who write code may decline. The demand for people who can think clearly about systems, governance, and domain problems may increase. Whether those are the same people, and whether the transition is managed humanely, is not something I can control — but it's something I think we should talk about openly.

- The skills this approach rewards — domain expertise, architectural thinking, clear communication, judgment under ambiguity — are not the skills most junior engineering roles are currently designed to develop. If AI handles the implementation layer, how do people build the experience that makes them effective directors of AI? I don't have a good answer to this. It worries me.

**What I won't claim:**

- I won't claim this "creates more jobs than it destroys." I don't know that, and the history of technology transitions suggests the answer is complicated, unevenly distributed, and depends heavily on policy and institutional choices that are beyond any single project.

- I won't claim that the engineers who would have built this traditionally can simply "move up the stack." Career transitions are hard, retraining takes time and money, and not everyone has equal access to either.

### Sustainability of the Approach Itself

There's a different kind of sustainability question: is this way of building software durable, or does it create fragility?

- **Concentration of knowledge.** One person holds the context. If I'm unavailable, this project depends on documentation quality. That's better than most single-developer projects — the docs are genuinely thorough — but it's still a structural risk.

- **Dependency on a single vendor.** Intellios was built with Claude. If Anthropic changes its pricing, its models, its API, or its policies, this project is exposed. I chose a capable tool, but I'm not pretending there's no lock-in risk.

- **Environmental trajectory.** AI inference demand is growing rapidly. The IEA projects that data center electricity consumption could more than double by 2026, reaching over 1,000 TWh globally (IEA, "Electricity 2024"). My 0.5 kWh is negligible, but I'm part of a trend. If every software project shifts to AI-intensive development, the aggregate energy and water demand is a legitimate concern — even if each individual project's footprint is small.

- **The rebound effect.** When something becomes dramatically cheaper and faster to build, people build more of it. That's mostly good — more ideas get tested, more problems get addressed. But "more software" also means more infrastructure to run it, more maintenance burden, and more digital waste. I don't have a way to quantify this for Intellios specifically, but I'm aware of the dynamic.

### Where I Land

I don't think building Intellios this way was irresponsible. The direct environmental footprint was small — far smaller than the traditional alternative by most measures I can estimate. The labor impact was net-positive in this specific case (a product that wouldn't otherwise exist). The documentation and governance practices reduce long-term waste.

But I also don't think I get to ignore the systemic questions just because my individual footprint is small. The way Intellios was built is part of a larger shift, and that shift has costs — to energy grids, to water systems, to people's careers — that deserve honest attention, not dismissal.

I'm sharing this assessment not because I have all the answers, but because I think transparency about these tradeoffs is part of building technology responsibly. If Intellios is a governance platform, the least I can do is govern my own accounting honestly.

---

## What the Numbers Don't Capture

I want to be upfront about the limitations of this accounting:

- **My hours undercount my real contribution.** Ten hours of active time doesn't capture the years of experience that made those hours productive. Claude was fast because the direction it received was informed by deep domain knowledge. Hand someone without that background the same tools, and the result would be very different.

- **I'm a single point of failure.** One person holds all the context. The documentation helps. It doesn't fully solve the bus-factor problem. If this product grows, deliberate knowledge transfer is necessary.

- **$180 is the AI compute cost, not the total cost.** It doesn't include the development platform, my time at market rate, or the subscription that provides access to Claude. The total is still dramatically lower than the traditional alternative, but I want to be precise about what the $180 represents.

- **Twenty-two days is not the same as battle-tested.** The architecture is sound and the code is clean, but no amount of pre-launch development substitutes for what real users in production will surface. I expect to find gaps. Every product does.

- **AI-generated code carries its own risk profile.** It can be subtly wrong in ways that pass type checks and look correct but fail under conditions Claude didn't anticipate. I mitigated this with continuous verification, but I won't pretend the risk is zero.

---

## What I'm Proud Of

Honestly? Not the speed. Not the cost. Those are interesting, but they're outputs.

I'm proud that the system does what I said it would do. That the governance is substantive, not decorative. That the audit trail is complete. That the documentation is thorough enough for any of you to pick up the project journal and understand not just what was built, but why every decision was made.

I'm proud that I built a governance platform by governing an AI, and that the process validated the product's reason for existing.

And I'm proud to share this with you transparently — including the caveats and the uncertainties — because I'd rather have an honest conversation about what this means than a polished one.

---

## If You Want to See for Yourself

Everything is in the repo:

- **Session-by-session effort data** — token counts, costs, my decisions, time: `docs/log/effort-log.md`
- **Strategic narrative** — why decisions were made, in the order they were made: `docs/project-journal.md` (268KB)
- **Session logs** — what happened in each of the 88 sessions: `docs/log/` (91 log files)
- **Architectural decisions** — every significant technical choice, recorded before implementation: `docs/decisions/` (13 ADRs)

Nothing has been edited after the fact. It's all there as it happened.

I'd genuinely welcome your questions, your skepticism, and your ideas about what to do with what we've learned.
