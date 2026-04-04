# Intellios Visual QA Report

**Date:** 2026-04-04
**Environment:** https://intellios.vercel.app/ (Vercel production)
**Viewport:** Desktop (1568 × 702), Tablet (768 × 1024), Mobile (375 × 812)
**Tested as:** admin@intellios.dev (Admin), designer@intellios.dev (Designer), reviewer@intellios.dev (Reviewer), officer@intellios.dev (Officer), viewer@intellios.dev (Viewer)
**Phases:** 5 testing phases conducted in a single session

---

## Executive Summary

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 Critical | 13 | Broken pages, crashes, missing routes, data load failures, access control gaps, blueprint generation failure |
| 🟡 Warning | 15 | Data inconsistencies, UX logic bugs, incomplete features, Viewer role write-action leakage |
| 🔵 Minor | 14 | Formatting, polish, accessibility nits |
| **Total** | **42** | |

**Key headline findings:**
- The platform's core workflow (intake → generation → review → deploy) is **blocked** at the generation step — blueprint generation returns HTTP 500 (C-13)
- **Access control is sidebar-only** — direct URL access bypasses role restrictions for all non-admin roles (C-10)
- **Zero responsive breakpoints** exist — the application is unusable on tablets and phones (C-12)
- Agent detail and blueprint detail pages are **both broken** — neither loads data (C-03, C-04)
- The Designer role **cannot access design tools** (C-09)
- **No real-time collaboration** infrastructure exists (no WebSockets, no presence, no live sync)

---

## Site Map — Every URL Reviewed

### Sidebar Pages (Top-Level)
| # | URL | Page Title | Status |
|---|-----|-----------|--------|
| 1 | `/` | Overview | OK |
| 2 | `/intake` | Design Studio | OK |
| 3 | `/blueprints` | Blueprint Studio | OK |
| 4 | `/pipeline` | Pipeline | OK |
| 5 | `/registry` | Registry | OK |
| 6 | `/templates` | Templates | OK |
| 7 | `/review` | Review Queue | OK |
| 8 | `/governance` | Governance Hub (Policies) | OK |
| 9 | `/compliance` | Compliance Command Center | OK |
| 10 | `/governor` | Governor | Issues |
| 11 | `/deploy` | Deployment Console | OK |
| 12 | `/monitor` | Deployment Monitor | Issues |
| 13 | `/analytics` | Analytics | **404** |
| 14 | `/audit-trail` | Audit Trail | OK |
| 15 | `/admin/users` | Team Management | Issues |
| 16 | `/admin/settings` | Settings | **Crash** |
| 17 | `/admin/webhooks` | Webhook Integrations | OK |
| 18 | `/admin/fleet` | Admin Fleet | OK (restricted) |
| 19 | `/admin/integrations` | Enterprise Integrations | OK |
| 20 | `/admin/api-keys` | API Keys | Minor issue |

### Detail / Drill-Down Pages
| # | URL Pattern | Page Title | Status |
|---|------------|-----------|--------|
| 21 | `/registry/[agentId]` | Agent Detail | **Not Found** |
| 22 | `/blueprints/[id]` | Agent Blueprint (Studio) | **Failed to load** |
| 23 | `/governance/policies/[id]/edit` | Edit Policy | OK |
| 24 | `/intake/[sessionId]` | Intake Session (Chat) | OK |

### Governor Sub-Pages
| # | URL | Page Title | Status |
|---|-----|-----------|--------|
| 25 | `/governor/approvals` | Review Queue (Governor) | OK |
| 26 | `/governor/policies` | Governance Hub (Governor) | OK |
| 27 | `/governor/compliance` | Compliance Command Center | OK |
| 28 | `/governor/calendar` | Compliance Calendar | Missing empty state |
| 29 | `/governor/fleet` | Deployment Monitor (Fleet) | OK |
| 30 | `/governor/audit` | Audit Trail (Governor) | OK |
| 31 | `/governor/executive` | Executive Dashboard | OK |

### Auth Pages
| # | URL | Page Title | Status |
|---|-----|-----------|--------|
| 32 | `/login` | Sign In | Accessibility issue |
| 33 | `/register` | Create Account | Accessibility issue |
| 34 | `/auth/forgot-password` | Forgot Password | **Behind auth wall** |

---

## All Findings

### 🔴 Critical — Blocks User Workflows

#### C-01: `/analytics` returns 404 Page Not Found
- **Page:** Analytics (sidebar link)
- **Description:** Clicking "Analytics" in the sidebar navigates to `/analytics`, which returns a Next.js 404 page. The route does not exist.
- **Impact:** Sidebar advertises a feature that doesn't exist. Confuses users.
- **Fix:** Either create the Analytics page or remove/hide the sidebar link. Effort: **Low** (hide link) or **High** (build page).

#### C-02: `/admin/settings` crashes with error boundary
- **Page:** Settings
- **Description:** Navigating to Settings shows the Next.js error boundary: "Something went wrong." The page crashes on load.
- **Impact:** Admins cannot access platform settings.
- **Fix:** Debug the server/client error in the Settings page component. Likely a missing data dependency or runtime error. Effort: **Medium**.

#### C-03: All agent detail pages show "Not found"
- **Page:** `/registry/[agentId]` (e.g., `/registry/30000000-0000-0000-0000-000000000003`)
- **Description:** Clicking any agent row or chevron in the Registry navigates to the agent detail page, which renders "Not found" with a "Back to Registry" link. Confirmed for all 5 agents.
- **Impact:** Users cannot view agent details, tabs (Overview, Blueprint, Governance, etc.) from the Registry. Core workflow is broken.
- **Fix:** Investigate the data lookup in the `[agentId]` dynamic route. The UUID format and database query need debugging. Effort: **Medium**.

#### C-04: All blueprint detail pages show "Failed to load blueprint"
- **Page:** `/blueprints/[id]` (e.g., `/blueprints/20000000-0000-0000-0000-000000000003`)
- **Description:** Clicking any blueprint from Blueprint Studio opens the Blueprint Studio detail page with layout (sidebar panel, Refine/Companion AI tabs) but the main content shows an orange "Failed to load blueprint" banner and a red error at the bottom. The status badge shows "draft" for all blueprints regardless of actual status.
- **Impact:** Users cannot view or edit any blueprint content. The Refine and Companion AI features are non-functional. Core workflow is broken.
- **Fix:** Debug the blueprint data fetch in the detail route. Likely an API endpoint or schema mismatch. Effort: **Medium**.

#### C-05: Governor dashboard — Policy Health card shows no data
- **Page:** `/governor`
- **Description:** The "Policy Health" card displays column headers (Active, Violated, Stale) but no numerical values beneath them. The card appears structurally broken.
- **Impact:** Governor users cannot assess policy health at a glance.
- **Fix:** Investigate the data query for the Policy Health card. Likely returns empty/null instead of counts. Effort: **Low**.

#### C-06: Governor dashboard — Compliance KPIs incomplete
- **Page:** `/governor`
- **Description:** The "Compliance KPIs" card shows: Compliance rate = 100%, Clean agents = `/` (slash character instead of a number), Critical = empty (no value at all).
- **Impact:** Misleading data display for governance officers.
- **Fix:** Fix the data computation for "Clean agents" (likely a division with missing denominator) and "Critical" (missing fallback to 0). Effort: **Low**.

#### C-07: Forgot Password page is behind auth wall
- **Page:** `/auth/forgot-password`
- **Description:** The "Forgot your password?" link on the login page navigates to `/login?callbackUrl=%2Fauth%2Fforgot-password`, meaning the forgot-password route requires authentication. Users who need to reset their password (because they're locked out) cannot access this page.
- **Impact:** Password recovery is non-functional for locked-out users.
- **Fix:** Move the forgot-password page outside the auth middleware. Add it to the public routes list. Effort: **Low**.

#### C-08: Workflows tab shows duplicate Agents content
- **Page:** `/registry` → Workflows tab
- **Description:** Clicking the "Workflows" tab in the Registry page does not load distinct workflow content. It displays the same agent list as the "Agents" tab.
- **Impact:** The Workflows feature appears non-functional or unimplemented.
- **Fix:** Either implement the Workflows tab content or remove the tab. Effort: **Medium**.

#### C-09: Designer role cannot access Design Studio or Blueprints
- **Page:** Sidebar navigation (designer role)
- **Description:** The "designer" role (designer@intellios.dev) has no sidebar links to Design Studio (`/intake`) or Blueprints (`/blueprints`). Navigating to these URLs directly redirects to Overview. A role named "designer" should have access to the design tools.
- **Impact:** The designer role is effectively unable to perform its core function — designing agents.
- **Fix:** Grant the designer role access to Design Studio and Blueprints, or rename the role to better reflect its actual permissions. Effort: **Medium**.

#### C-10: Direct URL access bypasses sidebar-based access control
- **Pages:** `/governance`, `/admin/users`, `/deploy`, `/review` (all non-admin roles including Viewer)
- **Description:** Pages hidden from the sidebar for non-admin roles can still be accessed via direct URL navigation. For example, the Designer role has no Governance link in the sidebar, but navigating to `/governance` loads the full Governance Hub with all policy data. Admin pages (`/admin/users`) load with an "Access denied" banner but still render the full page UI including action buttons ("Bulk CSV", "Invite User", "+ New User"). The Viewer role can access `/deploy` with full Deploy buttons and `/review` with the complete Review Queue. Only `/intake` properly redirects unauthorized roles.
- **Impact:** Security concern — access control is enforced at the UI navigation level but not at the route/page level. Non-admin users can access restricted pages and see restricted data. Action buttons that non-admin users could potentially click are visible.
- **Fix:** Implement server-side route guards that redirect unauthorized roles away from restricted pages entirely. Pages should not render any UI when the user lacks permission. Effort: **High**.

#### C-11: Invite User form submission crashes page (error boundary)
- **Page:** `/admin/users` → "Send Invitation"
- **Description:** Submitting the Invite User form with a valid email and role crashes the entire page with the error boundary: "Something went wrong. An unexpected error occurred." The API call itself succeeds (HTTP 201 Created) and the invitation is saved to the database — confirmed by reloading the page and seeing the invitation in the Pending Invitations table. The crash occurs in the client-side success response handler.
- **Impact:** Admin users see a crash after inviting a team member, even though the invitation was actually sent. Users may try resubmitting, creating duplicate invitations. There is no success feedback.
- **Fix:** Debug the client-side error in the invite form's success handler. Likely an unhandled state update, navigation, or toast notification that throws. Effort: **Medium**.

#### C-12: No responsive breakpoints — layout completely broken on tablet/mobile
- **Pages:** All pages
- **Description:** The application has no responsive CSS breakpoints. At 768px (tablet), the sidebar remains at full 240px width, compressing content into ~530px. Status cards overlap, agent names truncate, filter pills wrap to multiple rows, and the Pipeline Kanban board's columns are clipped. At 375px (mobile), the sidebar consumes ~55% of the viewport, status cards collapse into unreadable strips, and content is essentially unusable. Confirmed both via CSS injection (Phase 3) and true browser viewport resizing (Phase 5).
- **Impact:** The application is completely unusable on tablets and phones. Enterprise users on iPads or mobile devices cannot use the platform.
- **Fix:** Implement responsive breakpoints: (1) Collapse sidebar to hamburger/drawer below 1024px, (2) Stack status cards vertically below 768px, (3) Make Pipeline Kanban horizontally scrollable, (4) Add mobile-first grid adjustments. Effort: **High**.

#### C-13: Blueprint generation fails — POST `/api/blueprints` returns 500
- **Page:** Intake Session → Review → "Generate Blueprint (~20s)"
- **Description:** After completing a full 7-domain intake session (Purpose, Capabilities, Behavior, Knowledge, Guardrails, Governance, Audit), confirming all 6 review sections, and clicking "Generate Blueprint", the generation fails. The API endpoint `POST /api/blueprints` returns HTTP 500 Internal Server Error. The client-side then crashes with `TypeError: Cannot read properties of undefined (reading 'name')` during an `Array.map()` call. The error repeats multiple times in the console. The UI displays "Generation failed" in red text.
- **Impact:** **The core workflow of the entire platform is broken.** Users can complete the full intake process across all 7 domains, review and confirm every section, but cannot generate the final Agent Blueprint Package. This blocks the primary value proposition of the product.
- **Fix:** Debug the `/api/blueprints` POST handler — likely a missing field mapping, null reference in the ABP generation logic, or a database constraint violation. Also add null-safety in the client-side rendering code. Effort: **High** (server-side investigation required).

---

### 🟡 Warning — Data Inconsistencies & UX Issues

#### W-01: Deployed agent count inconsistency across pages
- **Pages:** Deploy, Monitor, Governor > Fleet, Governor > Executive
- **Description:** The Deploy page shows 1 deployed agent (Customer Inquiry Bot). The Monitor page shows 0 deployed agents. Governor > Fleet shows 0 deployed. Governor > Executive shows "2 deployed · 1 in review". Four different numbers across four pages.
- **Impact:** Users cannot trust deployment status information.
- **Fix:** Ensure all pages query the same source of truth for deployed agent counts. Effort: **Medium**.

#### W-02: Review Queue shows "clear" but Overview shows 1 awaiting review
- **Pages:** `/review`, `/`, `/governor/approvals`
- **Description:** The Overview page shows "1 In Review — Awaiting review →" and the Action Queue shows "1 agent awaiting review approval." But the Review Queue page (`/review`) shows "Review queue is clear." Governor > Approvals also shows "Review queue is clear."
- **Impact:** Users see conflicting information about pending reviews.
- **Fix:** Reconcile the review count queries. The Fraud Detection Advisor is "In Review" in the Registry but not appearing in the review queue. Effort: **Medium**.

#### W-03: `designer` role badge not renamed to `architect`
- **Page:** `/admin/users` (Team Management)
- **Description:** The users table shows the "designer" role badge for designer@intellios.dev. The invite dropdown offers "Architect" but no "Designer" option (see W-14). Inconsistent role naming between existing users and new invitations.
- **Impact:** Inconsistent role naming between UI labels and user roles.
- **Fix:** Update the role label in the user management display. Effort: **Low**.

#### W-04: Governor audit activity uses raw event names
- **Pages:** `/governor`, `/` (Overview Activity)
- **Description:** The Governor dashboard's "Audit Activity (24H)" section shows raw technical event names like `blueprint.agentcore deployed`, `blueprint.submitted`, `blueprint.refined`, `blueprint.created`. The Overview page partially humanizes events but still shows `blueprint.submitted`.
- **Impact:** Non-technical governance officers see developer-facing event names.
- **Fix:** Add an event name humanizer/formatter (e.g., `blueprint.submitted` → "Submitted blueprint for review"). Effort: **Low**.

#### W-05: Blueprint status casing inconsistency
- **Page:** `/blueprints`
- **Description:** Customer Inquiry Bot shows status "deployed" (lowercase) while all other blueprints show capitalized status names ("Approved", "Draft", "In Review", "Deprecated").
- **Impact:** Visual inconsistency in the Blueprint Studio list.
- **Fix:** Normalize status badge casing. Effort: **Low**.

#### W-06: Calendar page has no empty state
- **Page:** `/governor/calendar`
- **Description:** The Compliance Calendar page shows only the title, subtitle, and "Export to Calendar (.ics)" button. The content area is completely blank with no empty state message.
- **Impact:** Users may think the page is broken rather than empty.
- **Fix:** Add an empty state component (e.g., "No compliance events scheduled."). Effort: **Low**.

#### W-07: API Keys page — Scopes field is empty
- **Page:** `/admin/api-keys`
- **Description:** The "Create New Key" form shows a "Scopes" label but no input control, checkbox list, or selection mechanism beneath it. The label is orphaned.
- **Impact:** Users cannot set scopes when creating API keys.
- **Fix:** Either add scope selection controls or remove the label if scopes aren't supported yet. Effort: **Low**.

#### W-08: Register form — step wizard shows all fields on step 1
- **Page:** `/register`
- **Description:** The registration form has a 3-step wizard (Organization → Identity → Security) but all form fields appear visible on step 1 rather than being separated across the 3 steps.
- **Impact:** The wizard stepper is misleading — it suggests a multi-step flow but shows everything at once.
- **Fix:** Either implement proper step-by-step progression or remove the wizard stepper. Effort: **Medium**.

#### W-09: Search command palette only finds pages, not agents or policies
- **Page:** Global search (sidebar "Search..." / Cmd+K)
- **Description:** The search modal's placeholder says "Search agents, policies, or pages..." but searching for agent names (e.g., "loan", "fraud") returns no results. Only page navigation items appear.
- **Impact:** Users expect to search for agents and policies as the placeholder promises, but only page navigation works.
- **Fix:** Implement agent and policy search, or update the placeholder text to match actual functionality. Effort: **Medium** (placeholder fix is **Low**).

#### W-10: Ask Intellios panel squishes main content
- **Page:** Any page with Ask Intellios open
- **Description:** Opening the "Ask Intellios" AI panel on the right side compresses the main content area significantly rather than overlaying.
- **Impact:** Reduced usability when the AI panel is open alongside main content.
- **Fix:** Consider an overlay/drawer pattern instead of side-by-side compression. Effort: **Medium**.

#### W-11: Reviewer role sees pending review that Admin cannot
- **Pages:** Overview (reviewer role) vs `/review` (admin role)
- **Description:** The Reviewer role's landing page shows "Fraud Detection Advisor" in the Pending Reviews section with an "In Review" badge and "Review" button. However, the Admin role's Review Queue shows "Review queue is clear."
- **Impact:** The admin has less visibility into pending reviews than a reviewer, which is backwards for an oversight role.
- **Fix:** Same root cause as W-02. The admin's review queue query must be reconciled. Effort: **Medium** (part of W-02 fix).

#### W-12: Ask Intellios panel fails to open intermittently
- **Page:** Any page with "Ask Intellios" sidebar button
- **Description:** Clicking the "Ask Intellios" button sometimes fails to open the AI assistant panel. Multiple clicks produced no visible panel, no DOM elements, and no console errors. The feature worked in Phase 2 but was non-functional during Phase 3.
- **Impact:** Users cannot reliably access the AI assistant feature.
- **Fix:** Investigate the panel toggle state management. May be a race condition or stale React state after page navigation. Effort: **Medium**.

#### W-13: Invite User form — no validation feedback on empty submission
- **Page:** `/admin/users` → Invite User form
- **Description:** Clicking "Send Invitation" with an empty email field produces no visible error message. The form stays in its current state with no indication of what's wrong.
- **Impact:** Users don't know why the form won't submit.
- **Fix:** Add inline validation error messages below the email field on failed validation. Effort: **Low**.

#### W-14: Invite role dropdown missing "Designer" option
- **Page:** `/admin/users` → Invite User form → Role dropdown
- **Description:** The Role dropdown offers: Architect, Reviewer, Compliance Officer, Admin, Viewer. There is no "Designer" option, yet the existing user "Agent Designer" has a "designer" role badge.
- **Impact:** Admins cannot invite new users with the "designer" role through the standard invite flow.
- **Fix:** Either add "Designer" as a role option or migrate existing "designer" role to "Architect" for consistency. Related to W-03. Effort: **Low**.

#### W-15: Viewer role exposes write-action controls
- **Pages:** Pipeline, Registry, Deploy (via direct URL), Admin (via direct URL)
- **Description:** The Viewer role — intended as read-only — sees write-action controls on accessible pages. Pipeline shows "Submit for review →", "Review now →", "Deploy →" action links. Registry shows "Clone" buttons on every agent. Deploy console (accessible via direct URL `/deploy`) renders full "Deploy to AgentCore..." and "Deploy to Production..." buttons. Admin `/admin/users` renders "+ New User", "Invite User", and "Bulk CSV" action buttons despite the "Access denied" banner.
- **Impact:** A Viewer could potentially trigger deployments, clone agents, or attempt admin actions. Even if API-level enforcement blocks these operations, the UI should not present write actions to a read-only role.
- **Fix:** Conditionally hide write-action controls based on role. Extend C-10 route guards to block Viewer from Deploy, Review Queue, and Governance Hub via direct URL. Effort: **Medium**.

---

### 🔵 Minor — Polish & Accessibility

#### M-01: Login/Register form labels have extremely low contrast
- **Pages:** `/login`, `/register`
- **Description:** Field labels on the dark-themed auth pages are nearly invisible. The label text color is very close to the dark background.
- **Impact:** Accessibility violation (WCAG contrast ratio). Users may not be able to identify fields.
- **Fix:** Increase label text color brightness (e.g., from `text-slate-700` to `text-slate-300`). Effort: **Low**.

#### M-02: Login page has no "Create account" / "Register" link
- **Page:** `/login`
- **Description:** The login page doesn't have a visible link to the registration page. Users who need to create an account have no path from the login form.
- **Impact:** New users cannot discover self-registration.
- **Fix:** Add a "Don't have an account? Create one →" link below the sign-in form. Effort: **Low**.

#### M-03: Executive Dashboard — Monthly Cost shows "$0.0000"
- **Page:** `/governor/executive`
- **Description:** The Monthly Cost card displays "$0.0000" with 4 decimal places. While technically accurate for zero, the formatting looks odd.
- **Impact:** Minor visual polish issue.
- **Fix:** Format as "$0.00" or "—" when there's no cost data. Effort: **Low**.

#### M-04: Admin Fleet — no page heading or structure
- **Page:** `/admin/fleet`
- **Description:** The page shows only a single line of text: "Platform fleet overview is only available to super-admins." No heading, no icon, no structure.
- **Impact:** The page feels like an error rather than a proper access restriction.
- **Fix:** Add a proper heading, icon, and styled access-denied card. Effort: **Low**.

#### M-05: Governor > Approvals contradicts Governor dashboard
- **Page:** `/governor/approvals` vs `/governor`
- **Description:** The Governor dashboard shows "1 in review" in the Pending Approvals card with "Fraud Detection Advisor — 23d ago — Overdue". But the Approvals sub-page shows "Review queue is clear."
- **Impact:** Same data inconsistency as W-02 but specific to the Governor context.
- **Fix:** Same root cause as W-02 — the approvals query filters differently than the dashboard query. Effort: **Medium** (part of W-02 fix).

#### M-06: Overview Activity — mixed event formatting
- **Page:** `/`
- **Description:** Most events are humanized ("Admin deployed agent") but the last entry shows "Designer blueprint.submitted" — mixing human-readable and raw event formats.
- **Impact:** Inconsistent activity feed presentation.
- **Fix:** Same humanizer fix as W-04. Effort: **Low** (part of W-04 fix).

#### M-07: Blueprint detail page — generic breadcrumb and title
- **Page:** `/blueprints/[id]`
- **Description:** The breadcrumb shows "Blueprints > Blueprint" (generic) and the title says "Agent Blueprint" rather than the specific agent name. Status badge shows "draft" regardless of actual status.
- **Impact:** Even if the blueprint loaded, the page header would be uninformative.
- **Fix:** Populate breadcrumb and title from loaded blueprint data. Effort: **Low** (dependent on C-04 fix).

#### M-08: Governance Hub — "Audit Trail →" button style inconsistency
- **Page:** `/governance`
- **Description:** The "Audit Trail →" button in the top-right uses a different style (text link with arrow) than the action bar buttons below it (outlined pill buttons).
- **Impact:** Visual inconsistency in button styling.
- **Fix:** Align the button style with the page's action bar pattern. Effort: **Low**.

#### M-09: Pipeline cards link to broken agent detail pages
- **Page:** `/pipeline`
- **Description:** Clicking any agent card in the Pipeline view navigates to `/registry/[agentId]`, which shows "Not found" (same as C-03). Pipeline provides no independent detail view.
- **Impact:** Pipeline drill-down is non-functional (dependent on C-03 fix).
- **Fix:** Resolving C-03 will fix this. No independent fix needed. Effort: **N/A** (blocked by C-03).

#### M-10: New Blueprint button redirects to Design Studio
- **Page:** `/blueprints` → "+ New Blueprint" button
- **Description:** Clicking "+ New Blueprint" navigates to `/intake` (Design Studio) rather than opening a blueprint creation form. Likely intentional but the label suggests direct blueprint creation.
- **Impact:** Minor UX confusion — button implies creating a blueprint directly but starts the intake flow instead.
- **Fix:** Consider relabeling to "+ Start New Agent" or "Go to Design Studio →". Effort: **Low**.

#### M-11: Officer role badge shows "Compliance" instead of "Compliance Officer"
- **Page:** Sidebar footer (officer role)
- **Description:** The officer's role badge at the bottom-left shows "Compliance" rather than the full role name "Compliance Officer" as shown in Team Management.
- **Impact:** Minor inconsistency in role display.
- **Fix:** Show the full role label or ensure consistent truncation. Effort: **Low**.

#### M-12: New Agent creation modal — "Enter to start" hint misleading
- **Page:** Design Studio → "+ New Agent" modal
- **Description:** The modal has three tabs (Describe, Template/Fast, Clone), a textarea with helpful placeholder text, suggestion chips, and a character count validator. After entering sufficient text, the hint changes to "Enter to start" — but Enter doesn't submit the form.
- **Impact:** Minor UX confusion — users may press Enter expecting submission.
- **Fix:** Either make Enter submit the form or change the hint to "Ready to start". Effort: **Low**.

#### M-13: Notification bell — functional but empty
- **Page:** All pages (header bell icon)
- **Description:** The notification bell icon opens a dropdown panel correctly showing "No notifications yet." However, no platform activity (deployments, reviews, approvals) generates notifications.
- **Impact:** Feature appears non-functional despite the UI working. Notifications are not wired to platform events.
- **Fix:** Connect notification system to platform events. Effort: **Medium**.

#### M-14: `/overview` direct URL returns 404 — sidebar link goes to `/`
- **Page:** Overview
- **Description:** Navigating directly to `/overview` returns a 404 Page Not Found. The sidebar "Overview" link actually navigates to `/` (root).
- **Impact:** Bookmarks or shared links to `/overview` will fail.
- **Fix:** Add a redirect from `/overview` to `/`, or make `/overview` a valid route. Effort: **Low**.

---

## Role-Based Access Audit

### Access Matrix (5 Roles)

| Feature / Page | Admin | Designer | Reviewer | Officer | Viewer |
|---|---|---|---|---|---|
| **Landing page** | Overview | Overview | Review Queue | Governance & Compliance | Overview |
| **Design Studio** (`/intake`) | ✅ | ❌ (redirects) | ❌ (redirects) | ❌ (redirects) | ❌ (redirects) |
| **Blueprints** | ✅ | ❌ (redirects) | ❌ (redirects) | ❌ (redirects) | ❌ (redirects) |
| **Pipeline** | ✅ | ✅ | ✅ | ✅ | ✅ (shows write CTAs — W-15) |
| **Registry** | ✅ | ✅ | ✅ | ✅ | ✅ (shows Clone buttons — W-15) |
| **Templates** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Review Queue** | ✅ | ❌ | ✅ | ✅ | ⚠️ Loads via direct URL (not in sidebar) |
| **Policies** | ✅ | ❌ | ❌ | ✅ | ✅ (in sidebar) |
| **Compliance** | ✅ | ❌ | ❌ | ✅ | ✅ (in sidebar) |
| **Governor** | ✅ | ❌ (redirects) | ✅ | ✅ | ❌ (not in sidebar) |
| **Deploy** | ✅ | ❌ | ✅ | ✅ | ⚠️ Loads via direct URL with deploy buttons (W-15) |
| **Monitor** | ✅ | ❌ | ✅ | ✅ | ✅ (in sidebar) |
| **Analytics** | ✅ (404) | ❌ | ❌ | ✅ (404) | ✅ (in sidebar) |
| **Audit Trail** | ✅ | ❌ | ❌ | ✅ | ✅ (in sidebar) |
| **Admin (Team, Settings)** | ✅ | ❌ (loads with "Access denied") | ❌ (loads with "Access denied") | ❌ (loads with "Access denied") | ❌ (loads with "Access denied" + action buttons) |
| **Ask Intellios** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Governance Hub (direct URL)** | ✅ | ⚠️ Loads (should block) | ⚠️ Loads (should block) | ✅ | ⚠️ Loads via direct URL |

### Key Access Control Concerns

- **C-09:** Designer role has no access to design tools — the role named "designer" cannot reach Design Studio or Blueprints
- **C-10:** Direct URL access bypasses sidebar restrictions for all non-admin roles. Only `/intake` properly redirects unauthorized users; all other restricted pages load fully.
- **W-15:** Viewer role sees write-action controls (Clone, Deploy, Submit) on pages it can access. A read-only role should never display mutation buttons.
- Admin pages render full UI including action buttons despite showing an "Access denied" banner to non-admin roles.

### Viewer Role Sidebar

The Viewer role sidebar is correctly restricted to read-only sections:
- **Visible:** Overview, Pipeline, Registry, Templates, Policies, Compliance, Monitor, Analytics, Audit Trail, Ask Intellios
- **Hidden (correct):** Design Studio, Blueprints, Review Queue, Governor, Deploy, Admin section (Team, Settings, Webhooks, Fleet, Integrations, API Keys)

---

## Responsive Testing

Responsive testing was performed via CSS `max-width` injection (Phase 3) and confirmed via true browser viewport resizing (Phase 5). Both methods produced identical results, confirming no responsive breakpoints exist.

### 768px × 1024px (iPad Tablet)
- **Sidebar**: Remains fully expanded at ~220px width — no collapse to hamburger/drawer. Consumes ~29% of viewport.
- **Overview**: Status cards compressed; text wraps ("Ready to deploy →")
- **Registry**: Agent names truncate ("Loan Application Assist..."); filter pills wrap to 2 rows ("Deprecated" drops to second line); "In Review" badge wraps across two lines
- **Pipeline**: Kanban board's 3rd+ columns are clipped/cut off; board doesn't scroll horizontally

### 375px × 812px (iPhone Mobile)
- **Sidebar**: Still fully expanded — consumes ~55% of viewport, leaving ~170px for content
- **Overview**: Status cards forced into 2×2 grid; "QUALITY INDEX" label wraps awkwardly
- **Registry**: Agent names completely hidden, only status badges visible; tags wrap vertically
- **Pipeline**: Kanban shows only first column (Draft); other columns off-screen with no scroll indicator
- **All pages**: Main content area is too narrow to display any meaningful information

**Conclusion:** Zero responsive breakpoints exist. The application is unusable on tablets and phones. See C-12.

---

## Recommended Fix Prioritization

### Tier 1 — Immediate (blocks core workflows)
1. **C-13** — Blueprint generation returns 500 → Debug POST `/api/blueprints` endpoint. Blocks the entire intake → generation → review → deploy pipeline.
2. **C-03** — Agent detail pages "Not found" → Debug `[agentId]` route data fetch
3. **C-04** — Blueprint detail "Failed to load" → Debug blueprint API / data fetch
4. **C-10** — Direct URL access bypasses access control → Implement server-side route guards for all restricted pages
5. **C-11** — Invite User crashes on submission → Debug client-side success handler (API returns 201 but UI crashes)
6. **C-01** — Analytics 404 → Hide sidebar link (quick fix) or build page
7. **C-02** — Settings crash → Debug error boundary / runtime error

### Tier 2 — High Priority (data trust / governance / security)
8. **C-12** — No responsive breakpoints → Implement sidebar collapse, responsive grids, mobile-first layouts
9. **C-05 + C-06** — Governor dashboard broken cards → Fix Policy Health + Compliance KPI queries
10. **W-01** — Deployed count inconsistency → Unify deployment status source of truth
11. **W-02 + M-05 + W-11** — Review queue inconsistency → Reconcile review count queries across all roles
12. **C-07** — Forgot password behind auth → Move to public routes
13. **C-09** — Designer role missing Design Studio access → Grant design tools to designer role
14. **C-08** — Workflows tab shows duplicate content → Implement or remove tab
15. **W-15** — Viewer role exposes write-action controls → Hide mutation buttons for Viewer role; extend C-10 route guards

### Tier 3 — Medium Priority (polish / consistency)
16. **M-13** — Notification bell functional but no events wired → Integrate platform activity events
17. **W-09** — Search only finds pages → Implement agent/policy search or update placeholder
18. **W-12** — Ask Intellios panel fails to open intermittently → Debug toggle state management
19. **W-08** — Register wizard shows all fields on step 1 → Fix step progression or remove stepper
20. **W-04 + M-06** — Raw event names → Build event name humanizer
21. **W-10** — Ask Intellios squishes content → Consider overlay pattern
22. **W-13** — Invite form missing validation feedback → Add inline error messages
23. **W-14 + W-03** — Role naming inconsistency → Reconcile "designer"/"architect" naming and invite dropdown
24. **W-05** — Blueprint status casing → Normalize status badge text
25. **M-01** — Auth form label contrast → Increase text brightness
26. **W-06** — Calendar empty state → Add empty state component
27. **W-07** — API Keys scopes field → Add controls or remove label
28. **M-02** — Login → Register link → Add navigation link

### Tier 4 — Low Priority (minor polish)
29. **M-14** — `/overview` direct URL returns 404 → Add redirect or route alias
30. **M-03** — Cost decimal formatting → Format as "$0.00"
31. **M-04** — Admin Fleet access denied → Add proper page structure
32. **M-07** — Blueprint generic breadcrumb → Populate from data (after C-04)
33. **M-08** — Audit Trail button style → Align with action bar
34. **M-09** — Pipeline cards link to broken agent details → Depends on C-03
35. **M-10** — "New Blueprint" button label → Relabel to match actual behavior
36. **M-11** — Officer role badge truncated → Show full role name
37. **M-12** — New Agent modal "Enter to start" hint → Fix hint text or enable Enter submission

---

## Testing Narratives

### Full 7-Domain Intake Session (Phase 4)

The complete intake flow was tested end-to-end with a fictional "BillingBot" customer support agent:

- **New Agent modal**: Three creation paths (Describe, Template/Fast, Clone), character validation, suggestion chips — well-designed
- **AI conversation**: Purpose domain captured enterprise context (deployment type, data sensitivity, integrations, stakeholders) through natural conversation. AI asked relevant follow-up questions and confirmed each domain before transitioning.
- **Domain progression**: Stepper advanced correctly: Purpose → Capabilities → Behavior → Knowledge → Guardrails → Governance → Audit. Domain counter incremented from 0/7 to 6/7. Tool calls displayed as "Captured" with expandable details.
- **Tools captured**: 5 tools generated (query_customer_database, lookup_orders_shopify, initiate_stripe_refund, create_zendesk_ticket, check_refund_eligibility) with correct types (api/function)
- **Review page**: Completeness Map showed 6/7 sections captured, "Requirements Sufficient" badge, HIGH RISK classification, GDPR/PCI-DSS regulatory scope correctly identified. All 6 confirmable sections had working checkboxes. Stakeholder input warning correctly flagged missing domain owner sign-offs.
- **Generation failure**: See C-13. The final step (Generate Blueprint) fails with a 500 server error.

### Deployment Console (Phase 4)

The Deployment Console (`/deploy`) was tested end-to-end and functions well:

- **Summary cards** correctly show 1 Deployed and 1 Ready to Deploy
- **Ready to Deploy section** displays "Loan Application Assistant" (Approved, v1.0.0) with three action options: "Export for AgentCore", "Deploy to AgentCore...", and "Deploy to Production..."
- **Deploy to Production modal** is well-designed with proper change management controls: required Change Reference Number field (placeholder: CHG0012345), optional Deployment Notes textarea, and a confirmation checkbox requiring authorization attestation
- **Live in Production section** shows "Customer Inquiry Bot" (v1.0.0, deployed 29 days ago) with ✓ Clean governance status

No bugs found. This is a polished, production-ready feature.

### Notification System (Phase 4)

- Bell icon in header opens dropdown panel on click — UI functional
- Panel displays "No notifications yet" empty state
- Panel closes when clicking elsewhere on the page
- No notifications are generated from any platform activity (deployments, reviews, approvals, blueprint generation)

### Viewer Role Provisioning and Testing (Phase 5)

A Viewer account (viewer@intellios.dev / Viewer1234!) was provisioned via the Admin's "+ New User" form and successfully logged in.

**Direct URL access testing:**
- `/intake` (Design Studio) — Redirected to Overview ✅ (properly blocked)
- `/admin/users` — Loaded with "Access denied" banner but rendered full Admin UI with action buttons ❌
- `/governance` (Governance Hub) — Fully accessible with all data and actions ❌
- `/deploy` — Fully accessible with Deploy buttons ❌
- `/review` — Fully accessible, showed empty review queue ❌

**Sidebar pages (all functional):**
- Overview: Full dashboard with status cards, action queue, governance health, activity feed
- Pipeline: Kanban board renders correctly but shows write-action CTAs (W-15)
- Registry: Agent list renders correctly but shows Clone buttons (W-15)
- Monitor: Deployment Monitor shows "No deployed agents yet"
- Policies, Compliance: Render correctly

### Real-Time Collaboration (Phase 5)

- Opened two concurrent tabs on the same Registry page
- No WebSocket connections or Server-Sent Events (SSE) detected in network traffic
- No presence indicators, cursor sharing, or collaborative editing features exist
- No real-time data sync — changes in one tab require manual page refresh to appear in the other
- **Conclusion:** The platform has no real-time collaboration infrastructure. It is a standard request-response web application.

---

## Testing Coverage

### What Was Tested (Phases 1–5)
- 34+ unique URLs across sidebar pages, detail pages, governor sub-pages, and auth pages
- 5 user roles (Admin, Designer, Reviewer, Compliance Officer, Viewer) with full access matrix
- Full 7-domain intake flow (Purpose → Capabilities → Behavior → Knowledge → Guardrails → Governance → Audit)
- Blueprint generation end-to-end (fails at API level — C-13)
- Deployment Console end-to-end (no bugs found)
- Notification system (UI works, no events wired)
- Responsive layouts at 768px (tablet) and 375px (mobile) via CSS injection and true viewport resize
- Direct URL access control for all restricted routes
- Real-time collaboration (none exists)
- Search, AI assistant, invite flow, registration, password reset

### Remaining Limitations
- **Cross-browser multi-user collaboration** — Same-session concurrent tabs were tested, but true multi-user collaboration (different browser profiles or devices with different users editing the same resource) was not tested. The absence of any WebSocket/SSE infrastructure confirms no real-time features exist to test.
- **Physical device testing** — Viewport resizing confirmed responsive issues, but physical device testing (touch targets, native scrolling, iOS/Android rendering) was not performed.

---

*Report generated by visual QA audit on 2026-04-04 across 5 testing phases. 34+ unique URLs reviewed at desktop, tablet, and mobile viewports. 5 user roles tested (Admin, Designer, Reviewer, Officer, Viewer). Full 7-domain intake flow completed. 42 total findings: 13 Critical, 15 Warning, 14 Minor.*
