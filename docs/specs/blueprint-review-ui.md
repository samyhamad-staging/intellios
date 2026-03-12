# Blueprint Review UI — Specification

**Subsystem:** Control Plane
**Status:** Complete

## Purpose

Provides a human-facing interface for reviewing, approving, or requesting changes to generated Agent Blueprint Packages.

## Inputs

- Agent Blueprint Packages (from the Agent Registry)
- Governance validation results

## Outputs

- Review decisions: approve, reject, or request changes (with comments)
- Updated ABP status in the Agent Registry

## Behavior

1. Display a list of ABPs pending review at `/review`.
2. Show full blueprint details in a readable format.
3. Display governance validation results alongside the blueprint.
4. Allow reviewers to approve, reject, or request changes with a comment.
5. Store review comment and timestamp on the blueprint.
6. Update ABP status in the Agent Registry based on review decision.

## Resolved Decisions

- **Technology stack:** Next.js (full-stack React with SSR). See ADR-002.
- **Editing:** Request changes only. Reviewers can approve, reject, or request changes with comments. Changes go back through the generation/validation loop. See ADR-003.
- **Roles and permissions:** Deferred to a future phase. MVP assumes a single reviewer role. See ADR-003.
- **Page architecture (OQ-006):** Two separate pages. `/blueprints/[id]` is the Studio (design, refine, validate). `/registry/[agentId]` is the review interface with a dedicated Review tab (visible only when status = `in_review`). See OQ-006 resolution below.
- **Review queue (OQ-006):** `/review` page lists all `in_review` blueprints; entry point for reviewers.
- **Request changes semantics (OQ-006):** "Request changes" stores a reviewer comment and transitions `in_review → draft`. The designer refines in the Studio and resubmits for review via the lifecycle controls.

## Known Unknowns

| # | Question | Blocks |
|---|---|---|
| OQ-002 | Authentication and multi-tenancy — how does the reviewer authenticate and which ABPs can they see? | Access control (deferred post-MVP) |

## Implementation

### Service Architecture

| File | Role |
|---|---|
| `src/lib/db/schema.ts` | Added `reviewComment`, `reviewedAt` to `agentBlueprints` |
| `src/lib/db/migrations/0003_blueprint_review.sql` | ALTER TABLE migration + adds in_review → draft transition |
| `src/app/api/review/route.ts` | GET: lists all `in_review` blueprints |
| `src/app/api/blueprints/[id]/review/route.ts` | POST: approve/reject/request_changes with comment |
| `src/components/review/review-panel.tsx` | ReviewPanel component (formal review form) |
| `src/app/review/page.tsx` | Review queue page |
| `src/app/registry/[agentId]/page.tsx` | Review tab added (visible when `in_review`) + Governance tab |

### API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/review` | List all `in_review` blueprints (queue) |
| POST | `/api/blueprints/[id]/review` | Submit review decision with comment |

#### Review Request Body

```typescript
{
  action: "approve" | "reject" | "request_changes",
  comment?: string  // required for request_changes; optional for approve/reject
}
```

#### Review Response

```typescript
{
  id: string,
  status: "approved" | "rejected" | "draft",  // new status after action
  reviewComment: string | null,
  reviewedAt: string  // ISO timestamp
}
```

### Status Transitions After Review

| Action | New Status | Comment stored |
|---|---|---|
| `approve` | `approved` | Optional |
| `reject` | `rejected` | Optional |
| `request_changes` | `draft` | Required (reviewer must explain) |

`in_review → draft` is the only backward transition; it is only accessible via the review endpoint (not the generic status endpoint).

### UI: Review Queue (`/review`)

- Table of all `in_review` blueprints
- Columns: name, agent ID, version, submitted time, governance status
- Each row links to `/registry/[agentId]` (pre-selected Review tab)
- Empty state: "No blueprints pending review"

### UI: Registry Agent Detail (`/registry/[agentId]`)

Tabs:
- **Blueprint** — full ABP view (existing)
- **Governance** — ValidationReportView with re-validate button (new)
- **Review** — ReviewPanel (new; only shown when status = `in_review`)
- **Versions** — version history (existing)

### UI: ReviewPanel

Located on the Review tab of the registry agent detail page. Components:

1. **Blueprint summary** — agent name, version, when submitted for review
2. **Review comment textarea** — reviewer notes (required for request changes)
3. **Action buttons:**
   - Approve — green; calls POST with `action: "approve"`
   - Reject — red; calls POST with `action: "reject"`
   - Request Changes — gray; calls POST with `action: "request_changes"`; comment required
4. **Previous review comment** — shows last review comment if present (e.g., from a prior rejection/request)
