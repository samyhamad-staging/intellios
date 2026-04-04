# UI Enhancement Backlog

Small, targeted UI polish items identified during QA or user testing.

---

## UE-001 — Classification banner height jitter on Override toggle

**File:** `src/app/intake/[sessionId]/page.tsx` — lines 433–510

**Observed:** The banner strip between the nav header and the chat area changes height when the user clicks "Override". The normal state is slightly shorter; the override state is slightly taller.

**Root cause (two parts):**

1. **Native `<select>` height exceeds badge `<span>` height.** Both states use `py-0.5 text-xs`, but browser `<select>` elements carry additional intrinsic height from native rendering (border, internal padding, line-height defaults) that `<span>` badges do not. The override state renders two `<select>` elements; the normal state renders two `<span>` pills — different computed heights despite identical Tailwind classes.

2. **`flex-col gap-0.5` wrapper in normal state.** The normal state wraps content in a `flex flex-col gap-0.5` div (for the optional rationale line below the badges). The override state uses a flat `flex items-center gap-2`. When the rationale is present, normal state is taller; when it is absent, normal state is shorter than the override state. Either way, the two states are not height-matched.

**Proposed fix:** Add `min-h-[32px] items-center` to the outer container div (`border-b border-border bg-surface-raised px-6 py-2`) so both states occupy the same minimum height. Additionally, give both `<select>` elements an explicit `h-[22px]` to match the computed height of the `py-0.5 text-xs` badge spans (approximately 22px).

**Priority:** Low — cosmetic only, no functional impact.

**Logged:** 2026-03-28

---

## UE-002 — AI response missing paragraph break between sentences (CRITICAL)

**File:** `src/lib/intake/system-prompt.ts` (tool-call acknowledgment output)

**Observed:** AI response reads: *"...based on what you've described.Great! I've captured..."* — period and "Great!" are run together with no space or line break.

**Root cause:** When the AI calls tools mid-response, it stitches the pre-tool narrative and post-tool acknowledgment without a forced separator. The system prompt should add explicit `\n\n` guidance between tool-call confirmation sentences, or the tool display layer should introduce a visual break.

**Proposed fix:** Add to system prompt: *"When confirming a tool call result in-line, always begin the confirmation on a new paragraph."*

**Priority:** High — visible formatting defect to first-time users.

**Logged:** 2026-03-28

---

## UE-003 — Haiku classifier over-weights "data access" signals; misclassifies routing/intake agents

**File:** `src/lib/intake/classify.ts` — `CLASSIFICATION_SYSTEM_PROMPT`

**Observed:** A "Customer Intake Agent that welcomes callers and routes them" classified as **Data Access | Medium**. Correct classification is **Automation** (orchestration/routing) or **Decision Support** (intent classification for human handoff).

**Root cause:** The classification prompt examples do not include a routing/triage agent pattern. The word "access" from context form answers likely biases the Haiku response toward `data-access`.

**Proposed fix:** Add routing/triage examples to the `CLASSIFICATION_SYSTEM_PROMPT` under the `automation` type. E.g.: *"customer intake triage, IVR routing agents, intent classification pipelines"*.

**Priority:** High — wrong classification sets the wrong governance policies and risk tier for the entire session.

**Logged:** 2026-03-28

---

## UE-004 — AI asks two large topics (capabilities + compliance) in one message

**File:** `src/lib/intake/system-prompt.ts` — `## How to Guide the Conversation`

**Observed:** After capturing identity + instructions, the AI immediately pivots to ask about both tools/systems AND compliance requirements in the same response (5 paragraphs + bullet list).

**Root cause:** System prompt says "ask one or two questions at a time" but does not prevent pivoting to a second major topic (governance) in the same turn as a first (capabilities).

**Proposed fix:** Add instruction: *"When pivoting to a new section (e.g., from capabilities to governance), finish the current section first. Do not ask about a new section in the same message where you are still probing an incomplete prior section."*

**Priority:** Medium — degrades response quality and cognitive load for users.

**Logged:** 2026-03-28

---

## UE-005 — No "currently active section" indicator in Blueprint Progress right rail

**File:** `src/app/intake/[sessionId]/page.tsx` — Blueprint Progress section

**Observed:** Right rail shows ✓ complete and ○ pending but no visual indicator of which section is currently being filled by the AI conversation.

**Proposed fix:** Track the "current section" in state (infer from which section was most recently updated by a tool call, or expose from the AI response). Render the active section row with a pulsing dot or highlighted border.

**Priority:** Medium — users lose orientation between chat and blueprint.

**Logged:** 2026-03-28

---

## UE-006 — "Building requirements..." sub-label is uninformative

**File:** `src/app/intake/[sessionId]/page.tsx` — Intake Readiness widget

**Observed:** Sub-label under the 35% readiness bar reads "Building requirements..." regardless of session state. Provides no actionable signal.

**Proposed fix:** Derive the label from the first incomplete required section: *"Next: Tools & Capabilities"* or *"1 required section remaining: Tools & Capabilities"*.

**Priority:** Medium — easy win, directly improves orientation.

**Logged:** 2026-03-28

---

## UE-007 — Tool call chips have no expand affordance to verify captured values

**File:** `src/app/intake/[sessionId]/page.tsx` — tool call chip rendering

**Observed:** Collapsed tool chips ("Agent identity — Customer Intake Agent...") truncate content with no hover tooltip or expand control. Users cannot verify what was actually captured.

**Proposed fix:** Add a hover tooltip showing the full captured value, or a click-to-expand inline preview of the structured data written to the blueprint.

**Priority:** Medium — trust/transparency issue; users have no way to confirm the AI captured their requirements correctly without leaving the page.

**Logged:** 2026-03-28

---

## UE-008 — Stakeholder Input panel visible before required sections are complete

**File:** `src/app/intake/[sessionId]/page.tsx` — Stakeholder Input right rail section

**Observed:** Stakeholder Input (with Invite/Interview buttons for 7 roles) is fully interactive at 35% readiness. Creates premature cognitive load before core requirements are defined.

**Proposed fix:** Dim/lock the Stakeholder Input section until all required blueprint sections (Agent Identity + Tools & Capabilities) are complete. Show a tooltip: *"Complete required sections first."*

**Priority:** Low — cosmetic/workflow, not blocking.

**Logged:** 2026-03-28

---

## UE-009 — AI sycophantic tone ("Perfect!", "Great!") inappropriate for enterprise compliance context

**File:** `src/lib/intake/system-prompt.ts` — `## Conversation Style`

**Observed:** AI response opens with "Perfect! I can see..." and mid-paragraph "Great! I've captured..." — filler affirmations that read as unprofessional to compliance and legal teams.

**Proposed fix:** Add to system prompt: *"Do not use filler affirmations (Perfect, Great, Absolutely, Certainly). Acknowledge what the user said directly and move forward."*

**Priority:** Low — tone/polish, but matters for enterprise credibility.

**Logged:** 2026-03-28
