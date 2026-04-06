# Intellios Landing Page — Conversion & Marketing Audit

**Audit Date:** April 5, 2026
**Page Audited:** `/landing` (Marketing Landing Page)
**Auditor Role:** Combined Conversion Strategist, UX Researcher, Brand Positioning Expert
**Version:** 2.0 (enhanced pass — all 8 evaluation passes complete, all statistics source-verified)

---

## EXECUTIVE SUMMARY

The Intellios landing page is exceptionally well-researched and substantive — the sourced statistics, persona-specific pain/resolution structure, and architecture diagram set it apart from the vast majority of enterprise SaaS landing pages. The page's single biggest strength is **credibility through specificity**: every major claim is attributed to a named source (IBM, McKinsey, Gartner, OCC), which is rare and powerful for a pre-revenue product.

The single biggest conversion killer is **the absence of a demonstrated product experience**. The hero mockup is a static wireframe of UI chrome, not a real screenshot, video, or interactive demo. For a product selling to risk-averse enterprise buyers in regulated industries, the gap between "we say we can do this" and "here's proof we can do this" is the chasm where conversions die. The page tells a strong story but never *shows* the product working.

The one change that would have the most impact if implemented tomorrow: **replace the static hero mockup with a 60-second product walkthrough video** (or at minimum, 3–4 real product screenshots in a carousel) that shows a real agent blueprint being validated against SR 11-7 policies.

**Source verification note:** All six third-party statistics on the page (IBM Cost of a Data Breach 2025, Gartner August 2025, WalkMe/SAP July 2025, McKinsey June/March 2025, OCC July 2024) were independently verified against their original sources. The data is accurately cited, which is a significant editorial strength. One minor note: the OCC docket number cited as "AA-EC-2020-64" should be verified — the enforcement action reference is EA-ENF-2024-51 for the $75M penalty itself, amending the original 2020 consent order. The McKinsey "fewer than 10%" statistic is a directionally accurate paraphrase (the source says "about 90 percent of more transformative vertical use cases remain stuck in pilot mode").

---

## SCORECARD

| Dimension | Score (1–10) | One-line assessment |
|---|---|---|
| Clarity | 7 | Strong for informed buyers; opaque for cold traffic that doesn't already know what "agent governance" means. |
| Value Communication | 8 | Excellent use of sourced data and persona-specific pain points; weakened by features stated as functions rather than outcomes. |
| User Experience | 7 | Clean design, solid responsive structure, good use of whitespace; hurt by page length and no visual demonstration of the product. |
| Conversion Optimization | 5 | Single conversion path (Request Early Access), no content for mid-funnel visitors, no low-commitment entry points. |
| **Overall** | **6.5** | A strong content foundation undermined by a narrow conversion funnel and no product evidence. This is a thought-leadership piece masquerading as a landing page. |

---

## 5-SECOND TEST RESULTS

1. **What does Intellios do?** Partially answerable. "Don't just build AI agents. Govern them." communicates the *category* (governance) but not the *mechanism*. A first-time visitor gets "something about governing AI agents" but not what "governing" means in practice. The supporting line — "the control plane that makes every AI agent policy-compliant from design through production" — helps, but "control plane" is infrastructure jargon that non-technical buyers won't parse. **Score: 0.5/1**

2. **Who is it for?** Answerable via the industry pills (Financial Services, Healthcare, Insurance, Federal) but the *buyer role* is not visible in the hero. Is this for CISOs? CIOs? Compliance officers? Engineers? The hero doesn't say. You have to scroll to Section 5 to find out. **Score: 0.5/1**

3. **Why should I care?** Not answerable in 5 seconds. The hero tagline is a directive ("Govern them") rather than a consequence. There is no quantified outcome, no risk statement, and no emotional hook in the first viewport. The "12 weeks → 2 weeks" stat is buried in Section 7. **Score: 0/1**

4. **What am I supposed to do next?** Answerable. "Request Early Access" is clear and prominently placed. **Score: 1/1**

**Total: 2/4 — Hero section flagged as [CRITICAL].**

---

## DETAILED FINDINGS BY SECTION

### PASS 2 — HEADLINE & VALUE PROPOSITION

**[CRITICAL] Finding: Headline communicates category but not outcome**

- **What exists**: "Don't just build AI agents. Govern them." with supporting text "The control plane that makes every AI agent policy-compliant from design through production."
- **Why it matters**: The headline tells the visitor what to *do* (govern agents) but not what they *get* (reduced audit prep time, prevented breaches, regulatory compliance). It assumes the visitor already believes governance is their problem. For the 78% of enterprises currently using shadow AI without governance (per the page's own stat), the concept of "governing agents" may not register as urgent. The headline speaks to the converted, not the unconvinced. Per the StoryBrand framework, the headline positions Intellios as the hero rather than as the guide — it tells the visitor what *Intellios* does rather than what *the visitor* achieves.
- **Recommendation**: Lead with the visitor's pain or desired outcome, then introduce governance as the mechanism. See REWRITTEN COPY section for alternatives.
- **Principle**: StoryBrand framework — the customer is the hero, the product is the guide. Headlines that start with the customer's problem or desired outcome consistently outperform product-description headlines (per Copyhackers/Wynter research on B2B SaaS headline testing).

**[CRITICAL] Finding: No proof point in the first viewport**

- **What exists**: The hero contains no number, no timeframe, no testimonial, no case study reference. The powerful "12 weeks → 2 weeks" MRM documentation stat is buried 6 full scroll-depths down the page.
- **Why it matters**: Per the anchoring effect, the first number a visitor encounters shapes their perception of all subsequent claims. The hero misses the chance to anchor the visitor's perception with a concrete, memorable number. The supporting tagline — "Runtime-agnostic. Audit-ready by default. Built for regulated industries." — is three adjective phrases with no evidence attached to any of them.
- **Recommendation**: Add the "12 weeks → 2 weeks" stat (or a variant) directly below the subheadline. Example: "Designed to collapse MRM audit preparation from 12 weeks to 2."
- **Principle**: Anchoring effect (Tversky & Kahneman) — the first data point presented becomes the mental reference for evaluating everything that follows.

**Specificity Score: 3/5** — Clear function (govern AI agents) + clear audience (regulated enterprise) but no specific outcome in the headline itself. The page as a whole reaches a 4, but the hero is a 3.

**Differentiation**: The phrase "governed control plane" is distinctive and could not be pasted onto a competitor's page. This is a strength. However, the main headline ("Don't just build AI agents. Govern them.") *could* be used by any governance vendor.

---

### PASS 3 — COPY & MESSAGING

**[MEDIUM] Finding: Audience mirror — strong on pain, weak on aspirational language and day-to-day vocabulary**

- **What exists**: The page reflects these target-user pain points: audit prep is slow and manual; shadow AI is proliferating without controls; compliance is a bottleneck that slows engineering; agents are deployed without visibility or governance; regulatory risk is escalating. The page accurately uses regulatory vocabulary (SR 11-7, MRM, policy-as-code, separation of duties) that signals insider knowledge. This is a strength — the copy reads like it was written by someone who has sat in MRM committee meetings.
- **What's missing**: The page never reflects the *aspirational* state the buyer wants. It describes the *pain* they have and the *features* Intellios offers, but it skips the emotional midpoint: "What does my life look like after I adopt this?" A CRO's aspiration isn't "governance" — it's "walking into an audit with everything already documented, zero scramble, zero all-nighters." A CIO's aspiration isn't "single pane of glass" — it's "knowing exactly how many agents are in production and being confident none of them are liabilities." The copy also lacks the informal vocabulary buyers actually use — phrases like "audit fire drill," "compliance tax," "the spreadsheet from hell," or "another thing that keeps me up at night." This informal language creates recognition ("they understand my world").
- **Recommendation**: Add one sentence per persona card that paints the "after" picture in the buyer's own emotional vocabulary. For the CRO card: "Walk into your next audit with everything already documented. No fire drills. No spreadsheets." For the CIO card: "Open one dashboard and see every agent, its compliance status, and its last validation — across every cloud." For the Platform Team card: "Ship governed agents on the same cadence as ungoverned ones. Governance becomes invisible to your engineers."
- **Principle**: Mirror neurons in persuasion (per Robert Cialdini's "liking" principle) — people trust communicators who reflect their own language and emotional experience. Aspirational mirroring is as important as pain mirroring.

---

**[HIGH] Finding: Features are stated as mechanisms, not as outcomes**

- **What exists**: The three pillars are "Design-Time Governance," "Lifecycle Management," and "Observability & Audit." Each describes what the product *does* rather than what the buyer *gets*.

| Feature as stated on page | Implied benefit | Benefit explicit? |
|---|---|---|
| Design-Time Governance | Catch compliance failures before agents go live (cheaper, faster) | Partially — "cheapest to get right" is implied, not quantified |
| Lifecycle Management | Audit trail writes itself; no manual compliance documentation | Yes — "your audit trail writes itself" is strong |
| Observability & Audit | Auditors find everything already documented when they arrive | Yes — "already generated, already current, already waiting" |
| Runtime-agnostic by design | No vendor lock-in; works with existing cloud investments | No — the benefit of runtime-agnosticism for the buyer is never stated |
| White-Label Ready | Revenue opportunity; sell governed agents under your own brand | Partially — "ideal for partner ecosystems" hints but doesn't quantify |
| 12 weeks → 2 weeks | Massive time and cost savings on audit prep | Yes — well stated |
| Policy-as-code | Faster deployment cycles; governance doesn't slow engineering | Partially — "ship governed agents faster" is good but could quantify |
| Auto-generated SR 11-7 docs | Eliminates months of manual compliance documentation work | Yes — "eliminates the audit scramble" |

- **Why it matters**: Enterprise buyers don't purchase mechanisms; they purchase outcomes. "Design-Time Governance" is a feature category. "Catch 100% of policy violations before your agents reach production" is a measurable outcome a VP can put in a business case.
- **Recommendation**: Rewrite each pillar title to lead with the outcome. "Design-Time Governance" → "Catch policy violations before agents go live." "Lifecycle Management" → "Auto-generate your SR 11-7 audit trail." "Observability & Audit" → "Be audit-ready before auditors arrive."
- **Principle**: Jobs-to-Be-Done framework (Christensen) — buyers hire products to achieve specific outcomes, not to possess features.

**[HIGH] Finding: "Runtime-agnostic" is unexplained jargon for non-technical buyers**

- **What exists**: "Runtime-agnostic" appears in the hero tagline and as a section heading. No explanation of what this means or why the buyer should care.
- **Why it matters**: The CRO and CIO personas identified on this page are not infrastructure engineers. "Runtime-agnostic" is meaningful to a platform architect but opaque to a Chief Risk Officer. Per Miller's Law, working memory holds 7±2 chunks; jargon that requires mental translation consumes a chunk that should be spent on the value proposition.
- **Recommendation**: Replace "Runtime-agnostic" with a buyer-centric equivalent: "Works with your existing cloud — AWS, Azure, or whatever comes next." In the architecture section, keep the technical term but immediately translate it: "Runtime-agnostic means Intellios governs your agents regardless of where they run."
- **Principle**: Miller's Law (cognitive load) — every piece of jargon that requires mental translation reduces the cognitive budget available for processing the actual value proposition.

**[MEDIUM] Finding: Scanning audit — heading sequence doesn't tell a complete story**

The heading sequence extracted in order:

1. "The Governed Control Plane for AI Agents" (badge)
2. "Don't just build AI agents. Govern them."
3. "The Governance Gap" → "AI agents are scaling. Governance isn't."
4. "The Platform" → "Three pillars of governed AI agent delivery"
5. "Architecture" → "Runtime-agnostic by design"
6. "Use Cases" → "Built for the people who own the risk"
7. "Ready to see how it works for your team?" (mid-CTA)
8. "Why Intellios" → "The governance layer your stack is missing"
9. (Social proof section — no strong heading)
10. "ROI" → "Governance that pays for itself"
11. "Govern your AI agents before your regulators do."

- **What exists**: The sequence moves Problem → Product → Architecture → Use Cases → Differentiation → Trust → ROI → CTA. This is close to a classic PAS + proof structure but is weakened by Architecture appearing before Use Cases. A CRO doesn't care about architecture diagrams — they care about whether Intellios solves their specific pain.
- **Why it matters**: Per the serial position effect, items in the middle of a sequence are remembered least. Architecture (the most technical, least emotionally resonant section) occupies the critical middle position where it breaks the persuasion arc.
- **Recommendation**: Reorder to: Problem → Use Cases (make it personal) → Product (how we solve it) → Differentiation → ROI → Trust → Architecture (for the technical evaluator who scrolls this far) → CTA. Move architecture to near the bottom — it's a due-diligence section, not a persuasion section.
- **Principle**: Serial position effect (Ebbinghaus) — primacy and recency positions drive retention; the middle sags. Architecture detail in the middle drains persuasive momentum.

**[MEDIUM] Finding: Claim credibility audit — systematic review of every unsubstantiated claim**

The page's third-party statistics are exceptionally well-sourced. However, several Intellios-specific claims lack evidence:

| Claim on page | Type | Credibility issue | Fix |
|---|---|---|---|
| "12 weeks → 2 weeks" MRM documentation reduction | Vague metric (hedged) | "Designed to deliver" = unproven aspiration | Attribute to pilot data, design partner estimate, or reframe as engineering target |
| "Intellios deploys in weeks" (vs. Building from Scratch) | Unsupported timeframe | No evidence provided for the "weeks" claim | Add specificity: "Design partners have gone from onboarding to first validation in under 14 days" (if true) |
| "18+ months, $2–5M" to build from scratch | Unattributed comparison | Plausible but not sourced; could be challenged | Add source: internal estimate, analyst quote, or footnote from comparable build-vs-buy analyses |
| "stays current with evolving regulations" | Unsupported promise | No mechanism described for how regulation updates are tracked/implemented | Add one sentence: "Our policy library is updated within [X] days of regulatory changes" |
| "Not bolted on. Built in." | Marketing claim | Meaningless without architectural evidence for the visitor | The architecture diagram partially addresses this; add a callout linking this claim to the diagram |
| "Zero ungoverned deployments" (if implied) | Unsupported superlative | Only achievable if the system has no bypass mechanism | Clarify: "No agent reaches production without passing governance validation" and explain what enforcement mechanism prevents bypass |
| "100% audit coverage" (if stated anywhere) | Unsupported superlative | Requires clarification of scope | Define what "audit coverage" means: every agent decision logged, every policy check documented, etc. |

- **Why it matters**: The page's third-party credibility (IBM, McKinsey, Gartner) sets a high bar that makes the unsourced Intellios-specific claims more conspicuous by contrast. A sophisticated buyer will notice that every industry stat has a citation but the product-specific claims don't.
- **Recommendation**: Apply the same sourcing discipline to Intellios-specific claims that the page already applies to industry data. Every product claim should be backed by: pilot data, a design partner quote, an engineering specification, or a transparent "this is our target."
- **Principle**: Contrast effect (anchoring in reverse) — when some claims are highly credible, unsupported adjacent claims are perceived as *less* credible than they would be on a page with uniformly unsourced claims.

---

**[MEDIUM] Finding: Voice is authoritative and polished but veers toward fear-based in the ROI section**

- **What exists**: Current voice: *Authoritative, data-driven, urgent.* The ROI section copy leans heavily on fear: "attackers exploit," "breach vector waiting to be exploited," "compliance gap waiting to be discovered." The final CTA's "before your regulators do" is fear-of-regulator messaging.
- **Why it matters**: For CROs and compliance officers, this might feel like preaching to the choir — they already know the risks. For CIOs and platform leads, too much fear can trigger reactance (Brehm's psychological reactance theory) and feel manipulative. The best voice for this audience: *Authoritative, pragmatic, peer-level.* The page is close but could calibrate the ROI section to balance "cost of inaction" with "value of action."
- **Recommendation**: Pair every fear-based stat with a corresponding positive outcome stat. For the $670K breach cost stat, follow it with a concrete governance ROI number (even a projected one). The current page does this partially ("governance pays for itself on the first prevented incident") but the ratio tilts 80/20 toward fear. Aim for 50/50.
- **Principle**: Psychological reactance (Brehm) — when people feel pressured by fear appeals, they sometimes reject the message to restore their sense of autonomy. Balance is essential.

**Readability**: Estimated grade 11–12. For the CRO/CIO audience, this is appropriate. For product leaders or less technical evaluators, some passages (particularly the architecture section) could be simplified. No immediate action needed, but a grade 9–10 version of the hero section would broaden the top of the funnel.

**[LOW] Finding: Footer is sparse**

- **What exists**: Product links and a single "Contact Sales" link. No privacy policy, terms of service, security page, blog, or careers link.
- **Why it matters**: Enterprise buyers perform due diligence. A missing privacy policy or security page is a trust signal failure. Per Jakob's Law, users expect footers to contain legal links because that's where every other site puts them.
- **Recommendation**: Add at minimum: Privacy Policy, Terms of Service, Security, and a link to a blog or resources section (even if it's a "coming soon" stub).
- **Principle**: Jakob's Law — users spend most of their time on other sites, so they expect yours to work the same way.

---

### PASS 4 — PAGE STRUCTURE & NARRATIVE ARC

**Section Inventory:**

| # | Section | Job | Succeeds? | Right position? |
|---|---|---|---|---|
| 1 | Hero | Hook visitor, communicate core value | Partially — hooks informed buyers, loses cold traffic | Yes |
| 2 | Governance Gap | Establish the problem | Yes — sourced stats make the problem concrete | Yes |
| 3 | Three Pillars | Explain what the product does | Partially — mechanism-focused, not outcome-focused | Move after Use Cases |
| 4 | Architecture | Show technical fit | Yes for technical evaluators | Move to near bottom |
| 5 | Personas | Make it personal to buyer | Yes — pain/resolution structure is excellent | Move to position 3 |
| 6 | Mid-CTA | Convert interested visitors | Yes — well-placed | Keep after personas |
| 7 | Social Proof | Build trust | Partially — no named customers, projected metrics | Keep position |
| 8 | Why Intellios | Differentiate from alternatives | Yes — comparison framing is clear | Keep position |
| 9 | ROI | Justify investment | Yes — sourced data is compelling | Keep position |
| 10 | Final CTA | Convert ready visitors | Yes — strong copy and clear actions | Yes |

**Persuasion Arc**: The page most closely follows a modified PAS (Problem-Agitation-Solution) pattern: Problem (Section 2) → Solution description (Sections 3–4) → Use Cases (Section 5) → Differentiation (Section 8) → ROI/Agitation (Section 9) → CTA (Section 10). The deviation: agitation (ROI fear stats) comes *after* the solution, which reduces urgency during the solution sections. A visitor who isn't yet convinced the problem is severe enough might disengage before reaching the persona cards and ROI data that would convince them.

**[HIGH] Finding: Content gap — no "How It Works" process section**

- **What exists**: The architecture diagram shows system layers but not the user's workflow. A visitor cannot answer: "If I sign up, what happens? What does day 1 look like? What do I actually *do* in this product?"
- **Why it matters**: Per the Fogg Behavior Model (B=MAP), ability is a critical component of behavior change. If the prospect can't visualize themselves using the product, the perceived effort stays high and conversion stays low. A "How It Works" section (e.g., "1. Define your governance policies → 2. Generate agent blueprints → 3. Validate automatically → 4. Deploy with confidence") reduces perceived complexity.
- **Recommendation**: Add a 3–4 step "How It Works" section between the Pillars and Personas. Use numbered steps with icons. Each step should take one sentence.
- **Principle**: Fogg Behavior Model — when motivation is moderate, increasing ability (making the action seem simple) is more effective than increasing motivation.

**[MEDIUM] Finding: Content gap — no FAQ or objection handling section**

- **What exists**: No FAQ section exists. Common enterprise buyer objections (integration complexity, implementation timeline, pricing model, data residency, on-premise deployment) are not addressed anywhere on the page.
- **Why it matters**: Per the Zeigarnik effect, unanswered questions create cognitive tension that can either drive engagement (if there's a clear path to answers) or drive abandonment (if there isn't). Without an FAQ, the only path to answers is "Talk to Sales," which is a high-friction step.
- **Recommendation**: Add a 6–8 question FAQ section before the final CTA. Include: "How long does implementation take?", "Does Intellios see my data?", "What if we use multiple cloud providers?", "How does pricing work?", "Can we deploy on-premise?", "What regulatory frameworks do you support today?"
- **Principle**: Zeigarnik effect — people remember uncompleted tasks/unanswered questions more than completed ones; unresolved objections create tension that often resolves as abandonment rather than conversion.

**[LOW] Finding: Redundancy in compliance badge placement**

- **What exists**: Industry verticals ("Financial Services, Healthcare, Insurance, Federal") appear as pills in the hero AND again as badges in the Social Proof section. Regulatory frameworks appear in the Social Proof section. The same information is communicated twice without adding new context.
- **Why it matters**: Redundancy without escalation wastes page real estate and signals lack of editorial discipline.
- **Recommendation**: Keep the hero pills (they aid targeting). In the Social Proof section, replace the industry vertical repeat with named design partner logos or anonymized case references ("A top-10 U.S. bank" or "A Fortune 500 insurer").
- **Principle**: Progressive disclosure — each scroll-depth should reveal new information, not repeat prior information.

---

### PASS 5 — CALLS TO ACTION & CONVERSION DESIGN

**CTA Inventory:**

| CTA text | Location | Type | Where it leads | Friction (1–5) |
|---|---|---|---|---|
| Request Early Access | Header (sticky) | Primary | Modal form (email, company, role, message) | 3 |
| Request Early Access | Hero | Primary | Same modal | 3 |
| See How It Works | Hero | Secondary | Scroll to #pillars | 1 |
| Request Early Access | Mid-page CTA (after Personas) | Primary | Same modal | 3 |
| Request Early Access | Final CTA section | Primary | Same modal | 3 |
| Talk to Sales | Final CTA section | Secondary | mailto:sales@intellios.io | 2 |
| Sign in | Header | Tertiary | /login | 1 |

**[MEDIUM] Finding: Primary CTA evaluation — button passes the blurred-screenshot test but lacks friction reduction**

- **What exists**: The "Request Early Access" button is indigo-600 (high contrast against white), consistently placed, and uses an ArrowRight icon for directionality. In a blurred screenshot, the primary CTA is identifiable — the indigo button reads as the strongest interactive element. It appears above the fold (hero) AND at the natural conclusion (final CTA section). Button text is specific enough ("Request Early Access" is better than "Get Started" or "Submit" but less specific than "Start Your Governance Pilot").
- **Why it matters**: The CTA passes the mechanical tests but fails the psychological test: there's no surrounding copy that reduces the anxiety of clicking. The button says what to do but not what happens next, how long it takes, or what the visitor is committing to.
- **Recommendation**: Add microcopy below the hero CTA: "Takes 30 seconds. We respond within one business day." Below the final CTA: "No commitment. Tell us your use case and we'll schedule a consultation."
- **Principle**: Fitts's Law (the button is appropriately sized and positioned) is satisfied; Fogg's Behavior Model (motivation × ability × trigger) is not — ability is undermined by anxiety about what happens post-click.

**[HIGH] Finding: Friction analysis — conversion path has 5 steps with one unnecessary gate**

Step-by-step conversion path analysis (visitor lands → desired action complete):

| Step | Action | Necessary? | Friction level | Notes |
|---|---|---|---|---|
| 1 | Visitor reads page, decides to act | Yes | Low | Page content does this job well |
| 2 | Clicks "Request Early Access" button | Yes | Low | Button is prominent and clear |
| 3 | Modal opens; visitor sees 4-field form | Yes | Medium | Modal is clean but the 4-field form is more than most "early access" forms |
| 4 | Fills in work email + company (required) + role (optional) + message (optional) | Partially | Medium-High | **Company name is a friction point.** Many visitors will fill in email but hesitate at company name — it signals "a sales rep will look up my company." Role and message are correctly optional. |
| 5 | Clicks "Request access" and sees confirmation | Yes | Low | Success state is well-designed ("We review each request and typically reach out within one business day") |

- **What exists**: The form requires work email and company name. Role and message are optional. The modal has no dark-mode support (always white), which is a minor jarring inconsistency if the visitor is browsing in dark mode.
- **Why it matters**: The "company name" required field is the single highest-friction element in the conversion path. For early-stage products, requiring company identification before the visitor has seen a demo or talked to anyone feels premature. Per the Fogg Behavior Model, even small friction increases at the moment of action can cause abandonment when motivation is moderate (visitor is curious but not yet convinced).
- **Recommendation**: Make company name optional, or replace it with a single-field email capture for an initial touchpoint, followed by a qualification step via email. If company name is critical for lead qualification, keep it but add microcopy: "Helps us tailor the demo to your industry" — giving a reason increases compliance (per Langer's "because" study: even a trivial reason increases compliance by ~34%).
- **Principle**: Fogg Behavior Model — at the moment of action, reducing even small friction points can have outsized impact on conversion rates.

**[MEDIUM] Finding: No urgency or scarcity mechanisms — appropriate but missing a legitimate lever**

- **What exists**: No urgency or scarcity language anywhere on the page. No "limited slots," no "closing applications on [date]," no countdown timer.
- **Why it matters**: For an enterprise product in design-partner phase, heavy-handed scarcity would feel manipulative and erode trust. However, *legitimate* scarcity exists — design partner programs genuinely have limited capacity. The page mentions "We're onboarding design partners from regulated industries" in the mid-CTA supporting copy, but this is descriptive, not scarce.
- **Recommendation**: Add one legitimate scarcity signal: "Currently onboarding our first 10 design partners" or "Q2 2026 cohort — 3 spots remaining." This is honest if the program has limited capacity and creates urgency without manipulation. Place this near the final CTA where the visitor is most ready to act.
- **Principle**: Cialdini's scarcity principle — people assign more value to opportunities that are limited. Legitimate scarcity (real capacity constraints) is both ethical and effective; manufactured scarcity destroys trust with sophisticated buyers.

---

**[CRITICAL] Finding: Single conversion path with no low-commitment options**

- **What exists**: Every CTA on the page is either "Request Early Access" (a form submission that requires work email + company name) or "Talk to Sales" (a direct sales email). There is no low-commitment option for visitors who are interested but not ready to identify themselves.
- **Why it matters**: The conversion ladder is missing its bottom two rungs. A typical enterprise landing page should offer: (1) a learn-more option for cold visitors (whitepaper, webinar recording, product video), (2) a medium-commitment option for warm visitors (newsletter, demo video gated by email only), and (3) a high-commitment option for hot visitors (request access, talk to sales). This page only has rung 3. Per Cialdini's commitment and consistency principle, small commitments precede large ones — asking for a form submission with company name as the *first* and only action is asking visitors to skip directly to a high-commitment step.
- **Recommendation**: Add at minimum one low-commitment CTA. Options ranked by impact: (A) An ungated 60-second product video linked from the hero ("Watch the Demo"), (B) A downloadable whitepaper on AI agent governance in regulated industries (gated by email only), (C) A newsletter signup in the footer.
- **Principle**: Cialdini's commitment and consistency principle — people who take a small action (watching a video) are more likely to take a larger action (requesting access) because they've already self-identified as interested.

**[HIGH] Finding: "Request Early Access" button text is identical in 4 locations**

- **What exists**: The same "Request Early Access" text and modal appear 4 times on the page (header, hero, mid-page, final CTA).
- **Why it matters**: Per banner blindness (Benway & Lane, 1998), repeated identical elements become invisible after the first encounter. By the third appearance of the same button, visitors have habituated to ignoring it. Additionally, each placement occurs at a different point in the visitor's decision journey, so the same message at every stage misses the opportunity to match the CTA copy to the visitor's current mindset.
- **Recommendation**: Vary the CTA copy to match the persuasion context. Hero: "Request Early Access" (fine — visitor is still orienting). Mid-page (after personas): "See If You Qualify" or "Tell Us Your Use Case" (the persona cards just made it personal — lean into that). Final CTA: "Start Your Governance Pilot" or "Apply for Design Partnership" (the visitor has now read the entire page — escalate the specificity and commitment language).
- **Principle**: Banner blindness — repeated identical visual elements are progressively ignored by users as they scroll.

**[HIGH] Finding: No anxiety-reducing copy near the primary CTA**

- **What exists**: The "Request Early Access" button has no supporting microcopy. No "No credit card required," no "We respond within 24 hours," no "Currently accepting 10 design partners."
- **Why it matters**: At the moment of conversion, the visitor's primary emotion is risk assessment: "What happens if I fill this out? Will I be spammed? Will a sales rep call me immediately? Is this worth my time?" Per Fogg's Behavior Model, reducing friction at the moment of action is the highest-leverage intervention. Anxiety-reducing microcopy directly below CTAs consistently increases conversion rates 10–30% in B2B SaaS (per Unbounce benchmark data).
- **Recommendation**: Add microcopy directly below each primary CTA. Hero: "We respond to every request within one business day." Mid-page: "Currently onboarding design partners from regulated industries." Final CTA: "No commitment required. Tell us your use case and we'll schedule a 30-minute consultation."
- **Principle**: Fogg Behavior Model (B=MAP) — at the moment of action, reducing the smallest friction (anxiety) can be more effective than increasing the largest motivation.

**Conversion ladder assessment:**

| Visitor stage | Available action | Assessment |
|---|---|---|
| Just browsing | "See How It Works" (scrolls to pillars) | Weak — no video, no downloadable, no ungated content |
| Interested but not ready | None | Missing entirely |
| Ready to act | Request Early Access, Talk to Sales | Present but lacks friction reduction |

---

### PASS 6 — TRUST & SOCIAL PROOF

**Social Proof Inventory:**

| Trust element | Location | Strength | Assessment |
|---|---|---|---|
| "Designed with input from teams in Financial Services, Healthcare, Insurance, Federal & Defense" | Section 7 | WEAK | Anonymous, unverifiable claim. No named companies, no logos, no photos, no quotes. Indistinguishable from "we talked to people in these industries." |
| "12 weeks → 2 weeks" MRM documentation reduction | Section 7 | WEAK | Compelling number but hedged ("designed to deliver") and unattributed to any customer or pilot. Currently reads as an aspiration, not evidence. |
| Regulatory framework badges (SR 11-7, EU AI Act, NIST AI RMF) | Section 7 | MODERATE | Demonstrates domain knowledge. However, "alignment" with regulatory frameworks is not the same as certification or validation by a regulatory body. |
| SOC 2 Type II / ISO 27001 / FedRAMP badges (In Progress) | Section 7 | WEAK (counterproductive) | Highlights what the product lacks. Dashed-border treatment inadvertently draws attention to absence. |
| IBM / McKinsey / Gartner sourced statistics | Sections 2, 5, 9 | STRONG (for market claims) | Excellent sourcing. But these prove the *market problem* exists, not that *Intellios solves* it. |
| Architecture diagram showing AWS AgentCore, Azure AI Foundry | Section 4 | MODERATE | Signals technical credibility and integration capability. Named cloud platforms add concreteness. |
| OCC Citibank $75M penalty reference | Section 9 | STRONG (for urgency) | Specific, verifiable, emotionally impactful. But again proves the risk exists, not that Intellios mitigates it. |

**Overall social proof assessment:** The page has STRONG third-party evidence for the market problem but WEAK evidence that Intellios specifically solves it. Every trust element proves "this problem is real and expensive" but none prove "this product works." This is the single largest trust asymmetry on the page.

---

**[CRITICAL] Finding: Zero named customers, testimonials, or case studies**

- **What exists**: "Designed with input from teams in Financial Services, Healthcare, Insurance, Federal & Defense" — this is a claim of design-partner involvement with no named companies, no logos, no quotes, and no attributed results.
- **Why it matters**: This is the single largest trust gap on the page. Enterprise buyers in regulated industries are intensely risk-averse. They buy what peers have validated. An unnamed claim of "designed with input from teams in" is indistinguishable from "we talked to some people once." Per Cialdini's social proof principle, the effectiveness of proof scales with specificity and identifiability — an anonymous claim is the weakest form.
- **Recommendation**: If NDAs prevent naming design partners, use anonymized but specific references: "A top-5 U.S. bank is piloting Intellios for SR 11-7 compliance across 200+ AI agents" or "Input from 3 Fortune 500 compliance teams shaped our governance engine." If no design partners exist yet, replace the claim with founder credibility: bios, relevant domain expertise, prior companies, regulatory background.
- **Principle**: Cialdini's social proof — named, specific, identifiable endorsements are orders of magnitude more persuasive than anonymous claims.

**[HIGH] Finding: "12 weeks → 2 weeks" stat is unattributed and hedged**

- **What exists**: "The MRM documentation reduction our governance engine is *designed to deliver*." (emphasis mine on the hedge)
- **Why it matters**: "Designed to deliver" means "hasn't actually delivered yet." A skeptical buyer reads this as an aspiration, not a result. This is the page's single most compelling data point, and it's undermined by hedge language.
- **Recommendation**: Either (A) remove the hedge if the number comes from testing ("Reduces MRM documentation preparation from 12 weeks to 2 in pilot deployments"), (B) reframe as a design target without pretending it's a result ("Our target: collapse MRM audit prep from 12 weeks to 2. Here's how we're engineering it."), or (C) attribute it to a design partner's projected estimate ("Our design partners estimate Intellios could reduce their audit prep from 12 weeks to 2").
- **Principle**: Claim credibility — hedged claims create cognitive dissonance between the bold number and the cautious language, which erodes trust rather than building it.

**[MEDIUM] Finding: Security certifications listed as "In Progress" may undermine rather than build trust**

- **What exists**: SOC 2 Type II (Q3 2026), ISO 27001 (Q4 2026), FedRAMP Ready (2027) — all displayed with dashed borders and "(Target: Qn 2026)" labels.
- **Why it matters**: For enterprise buyers, uncompleted security certifications are a red flag, not a trust signal. Listing them with target dates says "we don't have these yet." For a product selling to regulated financial institutions, the absence of SOC 2 today is a potential dealbreaker that this section actually *highlights* rather than mitigates.
- **Recommendation**: Remove the "In Progress" certifications from the main trust section. Instead, mention the certification roadmap in an FAQ answer: "We're pursuing SOC 2 Type II (targeting Q3 2026) and ISO 27001. Our current security posture includes [list actual current measures]." This reframes the conversation from "what we lack" to "what we're building toward" in a context where the visitor is actively seeking that information.
- **Principle**: Von Restorff effect (isolation effect) — the dashed-border "in progress" badges visually stand out from the solid "achieved" badges, inadvertently drawing attention to what's missing rather than what's present.

**Credibility gaps — top 3 remaining objections a skeptical visitor would have:**

1. "Has anyone actually used this?" — No named customer, no case study, no testimonial, no pilot data.
2. "Is the product real or is this vaporware?" — The hero mockup is an HTML wireframe, not a real screenshot. No product video, no interactive demo.
3. "Who's behind this?" — No team page, no founder bios, no company information beyond a copyright line. For a product asking regulated enterprises to trust it with governance of their AI agents, founder credibility is non-negotiable.

**[HIGH] Finding: No risk reversal mechanisms anywhere on the page**

- **What exists**: The page offers zero risk reversal. No free trial, no money-back guarantee, no "cancel anytime," no pilot program description, no "no credit card required," no "we'll set it up for you" offer. The only risk-reduction element is the success state copy after form submission: "We review each request and typically reach out within one business day."
- **Why it matters**: Enterprise buyers in regulated industries are *more* risk-averse than average, not less. They need to justify every vendor engagement to procurement, legal, and compliance. Without explicit risk reversal, the visitor is being asked to submit their work email and company name with zero guarantee of what they'll receive in return. Per prospect theory (Kahneman & Tversky), losses loom larger than gains — the perceived risk of "wasting my time" or "getting spammed" outweighs the potential gain of "learning about a cool product."
- **Recommendation**: Add at least two risk reversal mechanisms: (1) Near the form: "We review every request personally and respond within one business day. No automated sequences." (2) Near the final CTA: "Design partners receive a guided 2-week pilot with dedicated support. If it doesn't fit your workflow, there's no obligation." If a pilot program exists, describing it reduces the perceived risk of the initial form submission because the visitor can see what they're moving toward.
- **Principle**: Prospect theory / loss aversion (Kahneman & Tversky) — people are approximately 2x more sensitive to potential losses than equivalent gains. Risk reversal directly counteracts this asymmetry.

---

### PASS 7 — VISUAL DESIGN, UX & TECHNICAL EXECUTION

**[HIGH] Finding: Hero "product mockup" is an HTML wireframe, not a real product screenshot**

- **What exists**: A constructed HTML mockup showing a "Blueprint Review: Claims-Triage-Agent v2.1" with four policy pass badges and a governance score bar. It has fake browser chrome (red/amber/green dots, a URL bar showing app.intellios.io).
- **Why it matters**: Enterprise buyers can tell the difference between a mockup and a real product. The fake browser chrome actually makes it worse — it signals "this is a simulation." If the product exists, show the real product. If it doesn't exist yet, the mockup creates an expectation/reality gap that erodes trust when the visitor eventually sees the actual product. Per the peak-end rule, the hero image is both the first impression (peak) and the frame through which all subsequent content is evaluated.
- **Recommendation**: Replace with (in order of preference): (A) a real, annotated product screenshot, (B) a 60-second product video with play button overlay, (C) an animated GIF showing a governance validation completing in real time, (D) if no product exists yet, remove the mockup entirely and replace with a conceptual illustration that doesn't pretend to be a real product.
- **Principle**: Peak-end rule (Kahneman) — experiences are judged primarily by their peak moment and their end. The hero image is the peak moment of first impression.

**[MEDIUM] Finding: Visual hierarchy is strong overall but the three top focal points are wrong**

- **What exists**: The three strongest visual focal points are: (1) the headline (correct), (2) the product mockup (should be a proof point), (3) the "40%" stat in the Governance Gap section.
- **Why it matters**: The ideal three focal points for conversion are: headline, primary proof point (a number that proves value), and primary CTA. The mockup consumes the proof-point slot without delivering proof (it's a wireframe). The "40%" stat is a market size number, not an Intellios-specific value proof. The primary CTA ("Request Early Access") is visually subordinate to both the mockup and the stat cards.
- **Recommendation**: Make the primary CTA more visually prominent (larger button, more whitespace around it, or a subtle animation). Add a real proof point (the 12→2 week stat) to the hero so it becomes one of the three strongest focal points.
- **Principle**: Visual hierarchy / F-pattern scanning — the three most visually dominant elements on a page should be the three most important for conversion.

**[MEDIUM] Finding: Mobile experience — functional but with conversion-impacting gaps**

- **What exists**: The page has responsive design (mobile hamburger menu with aria-label, grid columns collapse from 3-col to 1-col, padding adjusts). The mobile menu includes all nav links plus "Sign in" and "Request Early Access" CTAs. The architecture diagram stacks from 3-col grid to 1-col on small screens.
- **Issues identified**:
  - **Thumb zone**: The sticky header CTA ("Request Early Access") is in the top-right corner — outside the natural thumb zone on mobile devices. The hero CTA buttons are centered, which is better. The mid-page and final CTAs are centered and full-width appropriate.
  - **Text sizing**: Hero headline scales from `text-4xl` (36px) to `sm:text-6xl` to `lg:text-7xl`. On the smallest viewports, 36px is adequate. Subtext at `text-lg` (18px) is readable.
  - **Product mockup on mobile**: The hero mockup's sidebar column is hidden on mobile (`hidden sm:block`), which is correct. However, the mockup's validation badges at `text-[10px]` (10px) are very small on mobile — potentially unreadable without zooming.
  - **Card width**: Persona cards and ROI cards at 1-col on mobile create long scroll depths per card (pain box + resolution box + fact = ~300px per card × 3 = 900px of card content). No visual break between cards besides 32px gap.
  - **Header CTA visibility**: The "Request Early Access" button in the header is `hidden sm:inline-flex` — it's completely invisible on mobile (< 640px). Mobile visitors see only "Sign in" in the header and must scroll to the hero to find a CTA. This is a significant mobile conversion gap.
- **Recommendation**: (1) Make the header CTA visible on mobile — either inline or as a sticky bottom bar. (2) Add a sticky mobile CTA bar at the bottom of the viewport that appears after the visitor scrolls past the hero CTA. (3) Consider collapsing persona cards into an accordion on mobile to reduce scroll depth. (4) Increase the validation badge text in the hero mockup to at least 12px on mobile.
- **Principle**: Fitts's Law — the time to reach a target is a function of distance and size. On mobile, CTAs need to be within thumb reach (bottom 40% of screen) and large enough to tap accurately (minimum 44×44px tap target per WCAG 2.1).

**[LOW] Finding: Performance signals — generally clean, one concern**

- **What exists**: The page is a single React component with no external images, no video embeds, no third-party scripts (beyond Next.js itself). The hero background uses CSS gradients and an inline SVG (lightweight). Scroll-reveal animations use IntersectionObserver (efficient, no scroll-event listeners). The architecture diagram is pure HTML/CSS, not an image. The `RequestAccessModal` is imported and rendered on every page load but only the trigger is visible; the modal itself renders conditionally.
- **Performance strengths**: No hero image to lazy-load. No external font files beyond Geist (loaded locally via `next/font/local`). No analytics scripts visible in the code. The page should achieve sub-2-second LCP on decent connections.
- **One concern**: The full page is a `"use client"` component (~1100 lines of JSX), meaning the entire page ships as a client bundle. For a marketing landing page, this is suboptimal — the page could be a server component with client interactivity isolated to the mobile menu toggle and the RequestAccessModal. This affects Time to Interactive (TTI) on slower devices.
- **Recommendation**: Refactor the landing page to be a server component. Extract `useScrollReveal`, `mobileMenuOpen` state, and `RequestAccessModal` into client component islands. This would reduce the client JS bundle significantly and improve TTI. Low priority because the page likely performs adequately as-is, but it's a best-practice improvement.
- **Principle**: Google/SOASTA research — each additional second of load time reduces conversions by ~7%. While this page likely loads quickly, client component bloat affects TTI on mobile devices over slower networks, which is relevant for international enterprise buyers.

**[LOW] Finding: Consistent and clean design system**

- **What works well**: Button styles are consistent (indigo-600 primary, border secondary). Heading hierarchy follows a clear pattern (uppercase tracking-widest label → bold title → gray description). Card styles are uniform. Spacing is consistent. Dark mode support is implemented throughout. The indigo-to-violet gradient creates a cohesive color story. This is genuinely well-executed design work.

**[LOW] Finding: Page length may cause drop-off before ROI section**

- **What exists**: 10 sections totaling approximately 6000+ words of content. On desktop, this is roughly 8–10 full scroll-depths.
- **Why it matters**: Per scroll-depth analytics benchmarks (Chartbeat/Hotjar), average scroll depth on landing pages is 50–60% of page length. The ROI section — which contains some of the page's most persuasive content — is at approximately the 80% mark.
- **Recommendation**: Consider either (A) moving the ROI section higher (before or immediately after differentiation), or (B) adding a sticky "jump to" navigation that lets visitors skip to sections of interest. The current nav links (Problem, Product, Architecture, Use Cases, Why Us, ROI) partially address this but are hidden on mobile.
- **Principle**: Scroll depth attenuation — each additional scroll-depth loses approximately 5–10% of visitors. Critical persuasion content should be in the top 60% of page length.

**Accessibility notes:**

- The page uses semantic HTML structure and proper heading hierarchy.
- The mobile hamburger menu has an aria-label — good.
- The scroll-reveal animations use IntersectionObserver, which is accessible. However, there's no `prefers-reduced-motion` check — users who have requested reduced motion will still get fade-in animations.
- Color contrast appears adequate for body text (gray-900 on white, gray-300 on slate-950 dark mode).
- The gradient text on "Govern them." (indigo-600 to violet-600 on white) should be verified for WCAG AA contrast — gradient text on light backgrounds can fail at the lighter end of the gradient.

---

### PASS 8 — STRATEGIC POSITIONING & COMPETITIVE LENS

**Positioning statement** (derived solely from page content):

"For Chief Risk Officers, CIOs, and AI platform leaders at regulated enterprises who need to govern AI agents across the full lifecycle, Intellios is the governed control plane that embeds policy enforcement and audit readiness from design through production, unlike cloud-native runtime tools (AWS AgentCore, Azure AI Foundry) which handle execution but not governance, or building from scratch which takes 18+ months and $2–5M."

Assessment: This is a strong positioning statement. The page communicates it, but not in the first viewport. A visitor has to read through 80% of the page to assemble all the pieces. The positioning should be compressible into the hero.

**[HIGH] Finding: Status quo competitor — the page argues against alternatives but not against inaction**

- **What exists**: The "Why Intellios" section effectively argues against three alternatives: building from scratch ($2–5M, 18+ months), relying on cloud-native tools alone (execution without governance), and using point solutions (fragmented coverage). This is strong competitive positioning.
- **What's missing**: The page never directly argues against the most common competitor: *doing nothing*. The implicit argument is "ungoverned AI is dangerous," but the page doesn't connect this to the specific *inertia* that keeps enterprise buyers from acting. Typical inertia looks like: "We'll address governance next quarter," "Our current risk framework covers AI well enough," "We're too early in our AI journey to need governance," or "We'll build it ourselves when we're ready."
- **Why it matters**: Per the Fogg Behavior Model, the trigger to act must overcome not just insufficient motivation but also the *default state* of inaction. The "Why Intellios" section handles competitive displacement well but doesn't handle the "why now" question that prevents the visitor from bookmarking the page and never returning.
- **Recommendation**: Add a "Why Now" element — either as a standalone section or integrated into the ROI section. Frame it around a triggering event the buyer recognizes: "If you have more than 5 AI agents in production — or plan to by Q3 — you're past the point where manual governance scales." Or: "The EU AI Act compliance deadline isn't waiting for your governance roadmap." The OCC Citibank penalty ($75M for *inadequate progress* on risk management) is already on the page — connect it explicitly to the cost of *delaying* governance, not just the cost of *lacking* it.
- **Principle**: Status quo bias (Samuelson & Zeckhauser, 1988) — people disproportionately prefer the current state of affairs. Overcoming status quo bias requires making the cost of inaction vivid, specific, and time-bound — not just theoretically dangerous.

---

**"Why Not" Analysis — Top 5 reasons a qualified visitor does NOT convert:**

| # | Reason | Addressed on page? | Severity |
|---|---|---|---|
| 1 | "I don't know if this product actually exists yet" | No — mockup looks like a concept, not a real product | Critical |
| 2 | "No one I know is using this" | No — zero named customers or testimonials | Critical |
| 3 | "I need to see a demo before I commit even my email" | No — no video, no interactive demo, no ungated content | High |
| 4 | "I don't know what this costs or how pricing works" | No — no pricing section, no "pricing philosophy," no ballpark | Medium |
| 5 | "I need to know who's behind this before I trust them with governance" | No — no team page, no founder bios, no company background | High |

---

## QUICK WINS (< 1 day to implement)

1. **Add anxiety-reducing microcopy below every "Request Early Access" button.** Text: "We respond within one business day. No commitment required." Expected impact: 15–25% increase in form submission rate based on B2B CTA microcopy benchmarks.

2. **Move the "12 weeks → 2 weeks" stat into the hero section** as a secondary proof point below the subheadline. Remove the hedge "designed to deliver" — either state it as a target or state it as a measured result. Expected impact: Anchors the value proposition with a concrete number in the first 5 seconds.

3. **Vary CTA copy across page positions.** Hero: "Request Early Access." Mid-page: "Tell Us Your Use Case." Final: "Apply for Design Partnership." Expected impact: Reduces banner blindness, increases click-through on mid-page and final CTAs.

4. **Remove "In Progress" security certifications from the trust section.** Move to an FAQ section instead. Expected impact: Eliminates an inadvertent trust-eroding signal.

5. **Add a footer with Privacy Policy, Terms, Security, and team/about links.** Even placeholder pages show enterprise maturity. Expected impact: Reduces due-diligence friction for enterprise evaluators.

6. **Add `prefers-reduced-motion` media query check** to the scroll-reveal animation hook. One line of code for accessibility compliance.

7. **Rewrite the three pillar titles from mechanism to outcome.** "Design-Time Governance" → "Catch violations before agents go live." Takes 10 minutes. Expected impact: Immediate clarity improvement for non-technical buyers.

8. **Make the header CTA visible on mobile.** Currently `hidden sm:inline-flex` — mobile visitors (< 640px) see no CTA in the sticky header. Change to always-visible or add a sticky bottom CTA bar. Expected impact: Recovers mobile conversions from visitors who scroll past the hero CTA.

9. **Add dark mode support to the RequestAccessModal.** The modal is always white (`bg-white`) regardless of user preference. A jarring light flash in dark mode breaks immersion at the exact moment of conversion. 10-minute CSS fix.

10. **Add a "Why Now" trigger sentence to the ROI section.** After the ROI argument, add: "The EU AI Act compliance deadline isn't waiting for your governance roadmap. Neither are your regulators." Converts the fear-of-loss messaging into urgency-of-timing. Expected impact: Addresses the #1 reason qualified visitors bookmark instead of converting — "I'll deal with this later."

---

## HIGH-IMPACT PROJECTS (require design/dev effort)

1. **Create a product demo video (or real screenshot set).** Scope: 1–2 weeks for a polished 60-second walkthrough. Expected impact: Addresses the #1 conversion blocker ("is this product real?"). The video should show a real governance validation running on a real agent blueprint. Embed it in the hero with a "Watch the 60-Second Demo" CTA. Business case: This is the single highest-ROI investment the page can make. Every day without product evidence is a day qualified visitors bounce.

2. **Add a "How It Works" 3–4 step process section.** Scope: 1–2 days for copy + design. Expected impact: Reduces perceived complexity, increases visitor confidence that they can actually use the product. Place between Problem and Use Cases. Steps: (1) Define your governance policies, (2) Generate agent blueprints, (3) Validate automatically against SR 11-7, EU AI Act, NIST, (4) Deploy with confidence, govern continuously.

3. **Build a low-commitment content funnel.** Scope: 1–2 weeks for a gated whitepaper or webinar. Expected impact: Captures the 70–80% of qualified visitors who are interested but not ready to "request access." A whitepaper on "The Enterprise AI Governance Gap: Why 78% of AI Deployments Are Ungoverned" (using the page's own stats) would provide a natural email capture for nurture campaigns. Business case: The current page converts only the hottest leads. A content funnel captures warm leads who would otherwise leave with no way to follow up.

4. **Add founder/team credibility section.** Scope: 1 day for copy + photos. Expected impact: Addresses the "who's behind this?" objection directly. For a governance product, the team's regulatory and enterprise background is a competitive advantage. Include: founder photos, one-line bios, relevant prior experience (Big 4 consulting, FDIC, OCC, or enterprise AI platform experience).

5. **Build an FAQ section addressing top 8 buyer objections.** Scope: 1–2 days. Expected impact: Reduces "Talk to Sales" friction for visitors who have specific questions. Each FAQ answer becomes an opportunity to reinforce the value proposition while resolving objections.

---

## REWRITTEN COPY

### Hero Headlines (3 alternatives)

**BEFORE:**
> Don't just build AI agents. Govern them.

**AFTER — Option A (Outcome-focused):**
> Every AI agent in your enterprise — governed, auditable, and compliant. From day one.

**Why:** Leads with the outcome the buyer wants (governed, auditable, compliant agents) rather than an imperative they need to interpret. Passes the grunt test: a visitor immediately knows what they get.

**AFTER — Option B (Pain-focused):**
> Your AI agents are multiplying. Your governance isn't keeping up.

**Why:** Mirrors the buyer's lived experience. Per the PAS framework, starting with the problem the buyer already feels creates immediate resonance. The subheadline then introduces Intellios as the solution.

**AFTER — Option C (Identity-focused):**
> The governance control plane for enterprises that can't afford ungoverned AI.

**Why:** Positions the buyer as someone who takes governance seriously (identity appeal). "Can't afford" does double duty — it references both financial risk and reputational risk.

### Hero Subheadline

**BEFORE:**
> The control plane that makes every AI agent policy-compliant from design through production.

**AFTER:**
> Embed policy enforcement, automated audit trails, and continuous compliance into every AI agent — regardless of which cloud runs it.

**Why:** Translates "control plane" into three specific capabilities the buyer can evaluate. "Regardless of which cloud" replaces "runtime-agnostic" with plain language.

### Hero Supporting Line

**BEFORE:**
> Runtime-agnostic. Audit-ready by default. Built for regulated industries.

**AFTER:**
> Designed to reduce MRM audit preparation from 12 weeks to 2. Works with AWS, Azure, and whatever comes next.

**Why:** Replaces three adjective phrases with one quantified outcome and one concrete proof of flexibility. Moves the buried "12→2 weeks" stat to where it belongs: the first viewport.

### Three Pillar Titles

**BEFORE:** Design-Time Governance | Lifecycle Management | Observability & Audit

**AFTER:** Catch policy violations before agents go live | Auto-generate your audit trail | Be audit-ready before auditors arrive

**Why:** Each title is now a benefit the buyer receives rather than a product category they need to interpret.

### Mid-Page CTA

**BEFORE:**
> Ready to see how it works for your team?

**AFTER:**
> Your compliance team could stop scrambling. Tell us your use case.

**Why:** "Ready to see how it works" is generic and could appear on any SaaS page. The rewrite references a specific pain (audit scrambling) that the persona cards just described, creating continuity.

### Final CTA Headline

**BEFORE:**
> Govern your AI agents before your regulators do.

**AFTER:**
> Your regulators are asking about your AI agents. Have answers ready.

**Why:** The original is a fear-based imperative. The rewrite maintains the regulatory urgency but reframes it as empowerment (having answers) rather than fear (being governed by regulators). Subtle shift, but it positions the buyer as proactive rather than reactive.

### Governance Gap Section Heading

**BEFORE:**
> AI agents are scaling. Governance isn't.

**AFTER:**
> Your enterprise is deploying AI agents faster than your risk team can govern them.

**Why:** The original is a punchy aphorism but it's third-person and abstract. The rewrite uses "your" twice, making it personal. It also names the specific tension (deployment speed vs. governance capacity) rather than stating it generically.

### Differentiation Section Heading

**BEFORE:**
> The governance layer your stack is missing.

**AFTER:**
> What sits between your agents and your auditors.

**Why:** The original is feature-descriptive ("governance layer" + "your stack" = jargon²). The rewrite frames Intellios as the bridge between two things the buyer already understands (agents and auditors), making the positioning instantly concrete.

### Pillar Body Copy (Design-Time Governance)

**BEFORE:**
> Author policies, configure guardrails, and enforce approval workflows before agents go live. Shift governance left — into the design phase where it's cheapest to get right and most expensive to miss.

**AFTER:**
> Define your governance policies once. Intellios enforces them on every agent, automatically, before anything reaches production. The result: zero agents go live without passing your compliance checks.

**Why:** The original uses engineering jargon ("shift left") that non-technical CROs won't parse. The rewrite states the mechanism ("define once, enforce everywhere") and the outcome ("zero ungoverned agents") in plain language.

### ROI Section — Intellios-Specific Argument

**BEFORE:**
> At $670K additional breach cost per shadow AI incident, governance pays for itself on the first prevented event. Factor in regulatory penalties that routinely reach eight figures, and the question isn't whether you can afford governance — it's whether you can afford not to have it.

**AFTER:**
> One shadow AI breach costs $670K more than a standard incident. One regulatory penalty can reach eight figures — Citibank paid $75M for *inadequate progress* on risk management. Intellios is designed to prevent both. The math isn't close.

**Why:** The original ends with a cliché ("can't afford not to"). The rewrite connects the two sourced data points to Intellios specifically, adds the visceral detail of "inadequate progress" (which creates fear of *delay*, not just fear of *absence*), and closes with a confident, terse assessment that respects the buyer's intelligence.

### Request Access Modal — Headline and Subtext

**BEFORE:**
> Request early access
> We're onboarding design partners from financial services, healthcare, and regulated enterprise. Tell us about your use case and we'll be in touch.

**AFTER:**
> Join the design partner program
> We're onboarding 10 design partners from regulated industries for Q2 2026. Spots are reviewed in order of submission. Tell us your use case — we respond within one business day.

**Why:** "Request early access" is passive. "Join the design partner program" is identity-affirming — it frames submission as joining something, not requesting something. The rewrite adds legitimate scarcity (10 partners), review order (urgency), and a response time commitment (anxiety reduction).

### Final CTA Body

**BEFORE:**
> Every ungoverned agent is an audit finding waiting to happen, a breach vector waiting to be exploited, and a compliance gap waiting to be discovered. Close the gap now.

**AFTER:**
> We're onboarding design partners from financial services, healthcare, and federal. If you're governing AI agents — or need to start — tell us about your use case. We respond to every inquiry within one business day.

**Why:** The original is pure fear with no new information (it restates what Sections 2 and 9 already established). The rewrite introduces scarcity (limited design partner slots), qualifies the visitor (they should be in regulated industries), and reduces anxiety (response time commitment).

---

## "WHY NOT" OBJECTION MAP

| Likely objection | Currently addressed? | Recommended fix |
|---|---|---|
| "Is this product real or vaporware?" | No — HTML mockup looks like a concept | Replace mockup with real product screenshots or video |
| "No one I trust is using this yet" | No — zero named customers or testimonials | Add anonymized design partner references or founder credibility |
| "I need to see it work before I give you my info" | No — no ungated demo or video | Add a 60-second product walkthrough video in the hero |
| "What does this cost?" | No — no pricing information at all | Add pricing philosophy section or FAQ answer ("we price based on agent count; design partners receive preferred pricing") |
| "Who are the people behind this?" | No — no team section, no founder info | Add a team section with photos, bios, and relevant domain expertise |
| "How long does implementation take?" | No | Add FAQ: "Most design partners are live within 2 weeks" |
| "Does Intellios see or store my data?" | No | Add FAQ addressing data residency and architecture isolation |
| "Will this work with our existing tech stack?" | Partially — architecture diagram helps | Add explicit integration list or FAQ with specific platforms/tools supported |
| "We're not far enough along in our AI journey to need this" | No — no content for early-stage AI adopters | Add a maturity-model positioning: "Whether you have 5 agents or 500, governance scales with you" |
| "I'll deal with this next quarter" | No — no time-bound urgency | Add "Why Now" section connecting regulatory deadlines to action timeline |
| "What if this doesn't work for our specific regulatory requirements?" | Partially — SR 11-7, EU AI Act, NIST mentioned | Add FAQ: "What if my framework isn't listed? Our policy engine is configurable to any regulatory framework." |
| "I don't want to be someone's guinea pig" | No — "design partner" framing inadvertently implies early/untested | Reframe: "Design partners shape the product AND get priority support, dedicated onboarding, and preferred pricing" — make the value exchange explicit |

---

## PRIORITY MATRIX SUMMARY

For quick reference, here are all findings organized by priority level:

**CRITICAL (fix before anything else — 4 findings):**
1. Hero section fails the 5-second test (2/4 questions answerable)
2. Single conversion path with no low-commitment options
3. Zero named customers, testimonials, or case studies
4. Hero mockup is an HTML wireframe, not a real product

**HIGH (meaningful impact — fix in the next sprint — 9 findings):**
1. Features stated as mechanisms, not outcomes (pillar titles)
2. "Runtime-agnostic" is unexplained jargon for non-technical buyers
3. Content gap: no "How It Works" process section
4. "Request Early Access" text identical in 4 locations (banner blindness)
5. No anxiety-reducing copy near CTAs
6. "12 weeks → 2 weeks" stat is hedged and unattributed
7. No risk reversal mechanisms anywhere on the page
8. Status quo competitor (inaction) not argued against
9. Conversion path has unnecessary friction (company name required)

**MEDIUM (real improvement — schedule it — 8 findings):**
1. Audience mirror: strong on pain, weak on aspirational language
2. Claim credibility audit: Intellios-specific claims lack sourcing discipline
3. Heading sequence doesn't tell a complete story (section order)
4. Voice veers fear-based in ROI section
5. "In Progress" security certifications may undermine trust
6. Content gap: no FAQ section
7. Primary CTA lacks friction-reducing microcopy
8. Mobile: header CTA invisible below 640px; hero mockup badges unreadable

**LOW (polish — do when above is done — 5 findings):**
1. Footer is sparse (no legal, security, or team links)
2. Redundancy in compliance badge placement
3. Consistent and clean design system (positive finding — protect this)
4. Page length may cause drop-off before ROI section
5. Full page as client component impacts TTI; refactor to server component with client islands

---

*End of audit (v2.0). 26 discrete findings across 8 evaluation passes. All third-party statistics independently verified against original sources. Every finding is actionable with a specific recommendation, a named principle, and a priority tag. The page has a strong content foundation — the statistics, sourcing discipline, and persona work are genuinely above-average for early-stage enterprise SaaS. The path from good to great runs through three interventions: show the product, add a low-commitment conversion path, and build the trust layer that enterprise buyers require before they'll fill out a form.*
