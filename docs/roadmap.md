# Intellios — Product Roadmap

**Vision:** The governed control plane for enterprise AI agents — own design, governance, lifecycle, and observability. Execution happens on cloud provider runtimes. The value is the governance wrapper, not the compute.

**Last updated:** 2026-03-19 (Session 064)

---

## Completion Summary

| Area | Complete | Total | % | Status |
|---|---|---|---|---|
| **P — Shared Platform** | 11 | 14 | 79% | 3 capabilities remaining (Observability, SSO, Portfolio Intelligence) |
| **A — Architect Product** | 19 | 19 | 100% | Feature-complete for current scope |
| **G — Governor Product** | 16 | 17 | 94% | Missing dedicated entry point / navigation |
| **D — Technical Debt** | 1 | 5 | 20% | Must address in H1 |
| **H1 — Close the Loop** | 0 | 18 | 0% | Not started |
| **H2 — Govern at Scale** | 0 | 17 | 0% | Not started |
| **H3 — Execution Platform** | 0 | 14 | 0% | Deferred; gated on prerequisites |
| | | | | |
| **Current Product (P+A+G+D)** | **47** | **55** | **85%** | Production-ready; 8 items remaining |
| **Full Vision (all horizons)** | **47** | **104** | **45%** | Design + governance complete; observability + scale ahead |

---

## P — Shared Platform

Infrastructure that every product and role depends on.

| ID | Capability | Status | Notes |
|---|---|---|---|
| P-01 | Identity + RBAC | **Complete** | 5 roles: architect, reviewer, compliance_officer, admin, viewer. NextAuth sessions. |
| P-02 | Multi-tenancy | **Complete** | Application-level isolation via `enterprise_id`. |
| P-03 | Policy Engine | **Complete** | 11 operators, dot-notation fields, severity levels, Zod validation. |
| P-04 | Governance Validator | **Complete** | Deterministic rule evaluation + AI remediation suggestions. |
| P-05 | Lifecycle Engine | **Complete** | draft → in_review → approved → deployed → deprecated. SOD enforcement. |
| P-06 | Audit + Evidence | **Complete** | Append-only event ledger, MRM reports (14 sections), evidence packages, regulatory mapping. |
| P-07 | Evaluation | **Complete** | Blueprint quality (5 dims), intake quality (4 dims), red-teaming (5 categories), test harness. |
| P-08 | Registry + Versioning | **Complete** | Semantic versioning, version diff engine, blueprint lineage with governance diff. |
| P-09 | Notifications | **Complete** | In-app bell + email (Resend). Settings-gated. |
| P-10 | Webhooks | **Complete** | Outbound HMAC-SHA256 signed, per-enterprise, event-filtered. |
| P-11 | Eventing | **Partial** | Audit log is event-sourced. Typed event bus and webhook dispatch not formalized. See H1-4. |
| P-12 | Observability | **Not started** | No production telemetry ingestion. Highest-value gap. See H1-1. |
| P-13 | Enterprise SSO | **Not started** | SAML/OIDC federation. See H2-3. |
| P-14 | Portfolio Intelligence | **Partial** | Fleet governance dashboard + viewer role exist. Needs trends + cost attribution. See H2-5. |

---

## A — Architect Product

The design studio. Captures requirements, generates blueprints, refines iteratively, simulates, tests.

**Buyer:** AI/ML teams, innovation leads, platform engineering.
**Completion: 19/19 — 100%**

| ID | Capability | Status | Built in Phase |
|---|---|---|---|
| A-01 | 3-phase structured intake | **Complete** | 1, 9, 31 |
| A-02 | Multi-turn AI conversation | **Complete** | 1, 47 |
| A-03 | Expertise detection + adaptive routing | **Complete** | 49 |
| A-04 | Stakeholder collaboration (7 domains, RACI) | **Complete** | 48 |
| A-05 | AI orchestrator (synthesis, conflict detection) | **Complete** | 48 |
| A-06 | Intake confidence + readiness scoring | **Complete** | 49 |
| A-07 | Completeness map (7-domain grid) | **Complete** | 49 |
| A-08 | Blueprint generation (Claude generateObject) | **Complete** | 1 |
| A-09 | Multi-turn refinement chat (streaming) | **Complete** | 54 |
| A-10 | Blueprint regeneration from stored intake | **Complete** | 45 |
| A-11 | Blueprint Studio (7-section stepper) | **Complete** | 17 |
| A-12 | Agent simulation (stateless playground) | **Complete** | 40 |
| A-13 | Red-team security evaluation | **Complete** | 41 |
| A-14 | Behavioral test harness | **Complete** | 23 |
| A-15 | Blueprint quality dashboard (5 dimensions) | **Complete** | 54 |
| A-16 | Blueprint template library (6 starters) | **Complete** | 42 |
| A-17 | Agent code export (TypeScript) | **Complete** | 40 |
| A-18 | Clone + version iteration | **Complete** | 43 |
| A-19 | Contextual help copilot + command palette | **Complete** | 46, 47, 54 |

---

## G — Governor Product

Governance, approval, and compliance interface. Policy management, approval workflows, evidence generation, fleet posture.

**Buyer:** CRO, CISO, compliance officers, external auditors.
**Completion: 16/17 — 94%**

| ID | Capability | Status | Built in Phase |
|---|---|---|---|
| G-01 | Policy CRUD + lifecycle | **Complete** | 10, 11 |
| G-02 | Policy versioning + historical integrity | **Complete** | 22 |
| G-03 | Policy template library (SR 11-7) | **Complete** | 41 |
| G-04 | Policy simulation (test against ABP) | **Complete** | 10 |
| G-05 | Governance Hub (analytics, heatmap, trends) | **Complete** | 18 |
| G-06 | Multi-step approval workflow (configurable) | **Complete** | 22 |
| G-07 | Review queue + review console | **Complete** | 1, 19 |
| G-08 | MRM compliance report (HTML + JSON) | **Complete** | 6, 21 |
| G-09 | Evidence package export (14-section audit bundle) | **Complete** | 50 |
| G-10 | Regulatory mapping report | **Complete** | 35 |
| G-11 | Compliance posture dashboard | **Complete** | 28 |
| G-12 | Fleet governance dashboard (CRO/CISO view) | **Complete** | 51 |
| G-13 | Blueprint lineage with governance diff | **Complete** | 52 |
| G-14 | SR 11-7 periodic review scheduling | **Complete** | 35 |
| G-15 | Deployment health checks + snapshots + briefings | **Complete** | 28 |
| G-16 | Viewer role (read-only governance visibility) + audit trail | **Complete** | 2, 53 |
| G-17 | Dedicated Governor entry point / navigation | **Not started** | See H1-2 |

---

## D — Technical Debt

Must resolve before or during Horizon 1. Address in order of severity.

| ID | Item | Severity | Status | Notes |
|---|---|---|---|---|
| D-01 | ABP schema migration strategy (OQ-007) | **High** | Not started | No migration path for stored ABPs. Must solve before schema v1.1.0. See H1-3. |
| D-02 | Webhook delivery wiring | **Medium** | Not started | Admin webhooks CRUD exists; event dispatch not connected. See H1-4. |
| D-03 | In-memory rate limiting | **Medium** | Not started | `Map`-based limiter fails across instances. See H1-5.1. |
| D-04 | Help system prompt coverage | **Low** | Not started | Doesn't mention stakeholder collaboration, red-teaming, lineage, quality dashboard. |
| D-05 | DB schema role comments | **Low** | **Complete** | Updated in Phase 54 (architect rename). |

---

## Cancelled / Deferred

| Item | Decision | Date |
|---|---|---|
| Reviewer Monitoring Access | Cancelled — reviewer scope is sufficient | 2026-03-19 |
| Split Admin Roles | Cancelled — single admin role adequate for current scale | 2026-03-19 |
| Command as standalone product | Absorbed into Portfolio Intelligence (P-14) — it's a view, not a product | 2026-03-19 |
| Foundry execution runtime | Deferred to H3. Gated on: runtime governance + observability + 3 design partners | 2026-03-19 |
| Enterprise memory / knowledge graph | Deferred to H3. No telemetry to populate it yet. Accumulates as side effect of execution | 2026-03-19 |

---

## H1 — Close the Loop (Now → 3 months)

**Theme:** Connect deployed agents back to the governance system. "Governed AI agents" must be a continuous property, not a point-in-time check.

**Completion: 0/18 — 0%**

---

### H1-1: Production Observability Pipeline [P0]

Closes the highest-value gap: Intellios has zero visibility into what deployed agents do in production.

---

#### H1-1.1 — Telemetry Data Model + Ingestion API

**Depends on:** nothing

**What to build:**

1. **New DB table `agentTelemetry`** in `src/lib/db/schema.ts`:
   - Columns: `id` (uuid PK), `agentId` (text, FK → `agentBlueprints.agentId`), `enterpriseId` (text, nullable), `timestamp` (timestamp), `invocations` (integer), `errors` (integer), `latencyP50Ms` (integer), `latencyP99Ms` (integer), `tokensIn` (integer), `tokensOut` (integer), `policyViolations` (integer), `customMetrics` (jsonb, nullable), `source` (text — `"push"` or `"cloudwatch"`), `createdAt` (timestamp, default now)
   - Index on `(agentId, timestamp)` for time-range queries
   - Index on `(enterpriseId)` for tenant filtering

2. **New API route `src/app/api/telemetry/ingest/route.ts`**:
   - `POST /api/telemetry/ingest` — accepts array of metric data points
   - Auth: API key in `Authorization: Bearer <key>` header (not session-based — external agents push data)
   - API key validation: look up key in new `apiKeys` table (or initially, match against env var `TELEMETRY_API_KEY` for simplicity)
   - Request body Zod schema: `{ metrics: Array<{ agentId, timestamp, invocations, errors, latencyP50Ms, latencyP99Ms, tokensIn, tokensOut, policyViolations, customMetrics? }> }`
   - Validate each `agentId` exists in `agentBlueprints` with status `deployed`
   - Batch insert into `agentTelemetry`
   - Return `{ ingested: number, errors: Array<{ agentId, reason }> }`

3. **New API route `src/app/api/telemetry/[agentId]/route.ts`**:
   - `GET /api/telemetry/[agentId]?since=<ISO>&until=<ISO>&granularity=<hour|day|week>`
   - Auth: `requireAuth()` — any authenticated user can read telemetry for their enterprise
   - Query `agentTelemetry` where `agentId` matches, filter by time range
   - Return time-series array sorted by timestamp

4. **Drizzle migration**: generate and apply via `npx drizzle-kit generate` then `npx drizzle-kit push`

**Definition of done:**
- [ ] `agentTelemetry` table exists in schema with correct columns and indexes
- [ ] `POST /api/telemetry/ingest` accepts valid payloads and inserts rows
- [ ] `POST /api/telemetry/ingest` rejects invalid agentIds, returns structured errors
- [ ] `POST /api/telemetry/ingest` rejects requests without valid API key (401)
- [ ] `GET /api/telemetry/[agentId]` returns time-series data filtered by time range
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] Existing tests still pass

---

#### H1-1.2 — AgentCore Telemetry Connector

**Depends on:** H1-1.1

**What to build:**

1. **New lib module `src/lib/telemetry/agentcore-poller.ts`**:
   - Function `pollAgentCoreMetrics(agentId: string, region: string, bedrockAgentId: string)`: calls AWS CloudWatch `getMetricData` for Bedrock agent metrics (invocations, errors, latency)
   - Maps Bedrock metric names to Intellios telemetry schema fields
   - Returns array of telemetry data points in the same shape as the ingest API body

2. **New lib module `src/lib/telemetry/sync.ts`**:
   - Function `syncAllAgentCoreTelemetry()`: queries `agentBlueprints` where `deploymentTarget = 'agentcore'` AND `status = 'deployed'`, extracts `deploymentMetadata.agentId` / `region` / `agentArn`, calls `pollAgentCoreMetrics` for each, batch-inserts results into `agentTelemetry` with `source = 'cloudwatch'`
   - Tracks last sync timestamp per agent to avoid duplicate data

3. **New API route `src/app/api/cron/telemetry-sync/route.ts`**:
   - `POST /api/cron/telemetry-sync` — triggers `syncAllAgentCoreTelemetry()`
   - Auth: same pattern as `src/app/api/cron/review-reminders/route.ts` (cron secret or admin)
   - Returns `{ synced: number, errors: number }`

4. **AWS SDK dependency**: add `@aws-sdk/client-cloudwatch` to `package.json`

**Definition of done:**
- [ ] `pollAgentCoreMetrics()` fetches real CloudWatch data for a given Bedrock agent
- [ ] `syncAllAgentCoreTelemetry()` iterates all deployed AgentCore agents and ingests telemetry
- [ ] Cron route callable and returns sync results
- [ ] Telemetry rows appear in `agentTelemetry` with `source = 'cloudwatch'`
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H1-1.3 — Production Tab UI

**Depends on:** H1-1.1

**What to build:**

1. **Add `"production"` tab** to `src/app/registry/[agentId]/page.tsx`:
   - Add to `Tab` type union: `| "production"`
   - Add to `tabs` array: `{ id: "production", label: "Production" }`
   - Only show tab when blueprint status is `deployed`
   - Fetch `GET /api/telemetry/[agentId]?since=<7d ago>` in a `useEffect`
   - Store in state: `telemetryData`, `telemetryLoading`

2. **New component `src/components/registry/production-dashboard.tsx`**:
   - Props: `{ agentId: string; data: TelemetryDataPoint[] | null; loading: boolean }`
   - **Empty state**: when `data` is null or empty — "No production telemetry yet. Configure your agent to send metrics to the Intellios telemetry API."
   - **Status indicator**: large badge showing `Healthy` (errors < 5% of invocations in last 24h), `Degraded` (errors 5-20%), `Offline` (zero invocations in last 6h), `Unknown` (no data). Color: green/amber/red/gray.
   - **KPI cards row**: Total invocations (last 7d), Error rate (%), P50 latency, P99 latency, Tokens consumed
   - **Time-series chart**: line chart showing invocations and errors over time. Use simple `<div>` bars (no chart library needed — same visual approach as existing quality dashboard horizontal bars). One row per day, bar width proportional to max value.
   - **"Last seen" timestamp**: relative time since most recent telemetry data point

**Definition of done:**
- [ ] "Production" tab appears on registry detail page for deployed agents only
- [ ] Tab loads telemetry data from API
- [ ] Empty state shown when no data exists
- [ ] KPI cards display correct aggregated values from telemetry data
- [ ] Status indicator computes health from error rate + recency
- [ ] Time-series visualization renders invocations/errors per day
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H1-1.4 — Health Check Integration

**Depends on:** H1-1.1, H1-1.2

**What to build:**

1. **Extend `src/lib/monitoring/health.ts`**:
   - Modify `checkDeploymentHealth()` to also query latest telemetry from `agentTelemetry` (last 24h aggregate)
   - New `HealthStatus` value: `"degraded"` (between clean and critical)
   - Health status logic: `critical` if governance violations > 0 OR error rate > 20%; `degraded` if error rate 5-20% OR zero invocations for 6h; `clean` otherwise
   - Store production health data in `deploymentHealth` table — add columns `productionErrorRate` (real), `productionLatencyP99` (integer), `lastTelemetryAt` (timestamp) via schema migration

2. **Update monitor dashboard** `src/app/monitor/page.tsx`:
   - Show combined governance + production health status
   - "Degraded" agents shown in amber alongside "Critical" in red
   - Add column to deployed agents table: "Production Status" with last-seen timestamp

**Definition of done:**
- [ ] `checkDeploymentHealth()` incorporates telemetry data into health status
- [ ] New `degraded` status appears when production metrics indicate issues
- [ ] Monitor dashboard shows combined governance + production health
- [ ] `deploymentHealth` table has new production metric columns
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H1-1.5 — Threshold Alerts

**Depends on:** H1-1.1, H1-4.2

**What to build:**

1. **New DB table `alertThresholds`** in `src/lib/db/schema.ts`:
   - Columns: `id` (uuid PK), `agentId` (text), `enterpriseId` (text, nullable), `metric` (text — `"error_rate"`, `"latency_p99"`, `"zero_invocations"`, `"policy_violations"`), `operator` (text — `"gt"`, `"lt"`, `"eq"`), `value` (real), `windowMinutes` (integer), `enabled` (boolean, default true), `createdBy` (text), `createdAt`, `updatedAt`

2. **New lib module `src/lib/telemetry/alerts.ts`**:
   - Function `evaluateThresholds(agentId: string)`: loads thresholds for agent, queries recent telemetry within each threshold's window, evaluates conditions, returns array of `{ threshold, currentValue, breached: boolean }`
   - Function `checkAndFireAlerts()`: for each deployed agent, call `evaluateThresholds()`, for breached thresholds: create notification via `createNotification()` from `src/lib/notifications/store.ts` + publish event via `writeAuditLog()` with action `"blueprint.threshold_alert"` (add to `AuditAction` union in `src/lib/audit/log.ts` and `EventType` in `src/lib/events/types.ts`)

3. **New API routes**:
   - `GET/POST /api/registry/[agentId]/alerts/route.ts` — CRUD for alert thresholds
   - `POST /api/cron/alert-check/route.ts` — triggers `checkAndFireAlerts()` for all deployed agents

4. **UI in production dashboard**: "Alert Thresholds" section below KPI cards. List existing thresholds with enable/disable toggle. "Add Threshold" form: select metric, operator, value, window.

**Definition of done:**
- [ ] `alertThresholds` table exists with correct schema
- [ ] Thresholds can be created/read/toggled via API
- [ ] `checkAndFireAlerts()` correctly evaluates telemetry against thresholds
- [ ] Breached thresholds create in-app notifications
- [ ] Breached thresholds fire webhook events via the event bus
- [ ] New event type `blueprint.threshold_alert` added to `AuditAction` + `EventType`
- [ ] Production dashboard UI shows threshold management
- [ ] `npx tsc --noEmit` passes with 0 errors

---

### H1-2: Governor Product Extraction

No new backend — UX extraction of existing governance capabilities into a focused entry point.

---

#### H1-2.1 — Governor Layout + Navigation

**Depends on:** nothing

**What to build:**

1. **New layout `src/app/governor/layout.tsx`**:
   - Server component wrapping Governor pages
   - Uses a governor-specific sidebar (separate from the main Architect sidebar in `src/components/nav/sidebar.tsx`)
   - Shares platform header: `NotificationBell`, `HelpPanel`, user menu
   - Access: `requireAuth(["reviewer", "compliance_officer", "admin"])` — architects cannot access Governor

2. **New sidebar component `src/components/nav/governor-sidebar.tsx`**:
   - Navigation sections:
     - **Approvals**: `/governor/approvals` — pending review queue (data from `GET /api/review`)
     - **Policies**: `/governor/policies` — policy management (existing `/governance` page content)
     - **Compliance**: `/governor/compliance` — compliance posture (existing `/compliance` page content)
     - **Fleet**: `/governor/fleet` — fleet governance dashboard (existing fleet dashboard component)
     - **Audit**: `/governor/audit` — audit log (existing `/audit` page content)
   - Same visual style as `src/components/nav/sidebar.tsx` (border-r, bg-gray-950, nav sections)
   - Include branding area (same as main sidebar) and command palette trigger

3. **Governor page stubs** — each governor page re-exports or wraps the existing page's content:
   - `src/app/governor/page.tsx` — placeholder (will become home page in H1-2.3)
   - `src/app/governor/approvals/page.tsx` — renders existing review queue content
   - `src/app/governor/policies/page.tsx` — renders existing governance policy list
   - `src/app/governor/compliance/page.tsx` — renders existing compliance posture
   - `src/app/governor/fleet/page.tsx` — renders existing fleet governance dashboard
   - `src/app/governor/audit/page.tsx` — renders existing audit log viewer

4. **Update `src/components/nav/sidebar.tsx`**: add "Governor" link in the Governance section for reviewer/compliance_officer/admin roles, pointing to `/governor`

**Definition of done:**
- [ ] `/governor` route renders with dedicated sidebar navigation
- [ ] All 5 sub-pages (approvals, policies, compliance, fleet, audit) render existing functionality
- [ ] Governor sidebar shows correct nav items with active state highlighting
- [ ] Platform header (notifications, help, user) present in Governor layout
- [ ] Only reviewer, compliance_officer, and admin roles can access `/governor`
- [ ] Main sidebar includes a link to Governor for eligible roles
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H1-2.2 — Role-Based Landing

**Depends on:** H1-2.1

**What to build:**

1. **Modify `src/app/page.tsx`** (the root page):
   - Currently renders the role-differentiated home screen
   - After auth check, read user's role from session
   - Redirect logic:
     - `compliance_officer` → redirect to `/governor`
     - `reviewer` → redirect to `/governor`
     - `architect` → stay on `/` (existing Architect home)
     - `admin` → stay on `/` (existing overview)
     - `viewer` → stay on `/` (existing read-only view)
   - Use `redirect()` from `next/navigation` (server component redirect)

2. **Optional: per-user override** in `users` table:
   - Add `defaultLanding` column (text, nullable) — `/`, `/governor`, or null (use role default)
   - If set, override the role-based redirect
   - Add setting to user profile / admin user edit page

**Definition of done:**
- [ ] Compliance officers and reviewers land on `/governor` after login
- [ ] Architects and admins land on `/` after login
- [ ] Redirect is server-side (no flash of wrong page)
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H1-2.3 — Governor Home Page

**Depends on:** H1-2.1

**What to build:**

1. **Implement `src/app/governor/page.tsx`** as a rich dashboard:
   - **Pending Approvals card**: count of blueprints with `status = 'in_review'` + list of top 5 with name, submitted-by, SLA time remaining. Data: `GET /api/review`
   - **Policy Health card**: count of active policies, count with recent violations, count of stale policies (not updated in 90+ days). Data: `GET /api/governance/analytics`
   - **Compliance KPIs**: overall compliance rate (% of deployed agents with `clean` health), average quality score, SLA compliance rate. Data: `GET /api/compliance/posture`
   - **Recent Audit Activity**: last 10 audit entries from past 24h with action, actor, timestamp. Data: `GET /api/audit?since=<24h ago>&limit=10`
   - All data fetched client-side via `useEffect` (same pattern as existing dashboard pages)

**Definition of done:**
- [ ] Governor home page shows 4 data cards with live data from existing APIs
- [ ] Pending approvals link to individual blueprint review pages
- [ ] Policy health shows active/violated/stale counts
- [ ] Compliance KPIs render correctly
- [ ] Recent audit entries show chronologically
- [ ] Empty states shown when no data exists
- [ ] `npx tsc --noEmit` passes with 0 errors

---

### H1-3: ABP Schema Migration

Resolves OQ-007. Required before any artifact expansion in H2.

---

#### H1-3.1 — Migration Framework

**Depends on:** nothing

**What to build:**

1. **New lib module `src/lib/abp/migrate.ts`**:
   - Type `ABPVersion = "1.0.0" | "1.1.0"` (extend as versions are added)
   - Type `MigrationFn = (abp: Record<string, unknown>) => Record<string, unknown>`
   - Registry: `const MIGRATIONS: Map<string, MigrationFn>` — keyed by `"fromVersion→toVersion"` (e.g., `"1.0.0→1.1.0"`)
   - Function `registerMigration(from: ABPVersion, to: ABPVersion, fn: MigrationFn)` — adds to registry
   - Function `detectVersion(abp: Record<string, unknown>): ABPVersion` — reads `abp.version` field; if missing, returns `"1.0.0"` (all current ABPs lack explicit version)
   - Function `migrateABP(abp: Record<string, unknown>, targetVersion: ABPVersion): Record<string, unknown>` — detects current version, walks the migration chain (1.0.0 → 1.1.0 → ... → target), applies each step, returns migrated ABP with updated `version` field
   - If no migration path exists, throw descriptive error

2. **Integration point — migrate-on-read**:
   - New helper `src/lib/abp/read.ts`: `readABP(raw: unknown): ABP` — calls `migrateABP(raw, LATEST_VERSION)` then validates with Zod `ABPSchema.parse()`. This is the single function all code should use to read ABPs from the database.
   - **Do NOT modify existing read sites yet** — that happens in H1-3.3. This deliverable creates the framework only.

3. **Test**: create `src/lib/abp/__tests__/migrate.test.ts` with:
   - Test that a v1.0.0 ABP (no `version` field) is detected as `"1.0.0"`
   - Test that `migrateABP()` applies registered migrations in order
   - Test that migrating to current version is a no-op
   - Test that missing migration path throws

**Definition of done:**
- [ ] `migrateABP()` correctly chains registered migrations from detected version to target
- [ ] `detectVersion()` handles ABPs with and without explicit version fields
- [ ] `readABP()` returns a fully typed, validated, migrated ABP
- [ ] Unit tests cover version detection, migration chaining, no-op, and error cases
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H1-3.2 — ABP v1.1.0 Schema

**Depends on:** H1-3.1

**What to build:**

1. **Extend ABP Zod schema** in `src/lib/types/abp.ts`:
   - Add `version` field to `ABPSchema`: `z.string().default("1.0.0")`
   - Add new `execution` section to `ABPContentSchema`:
     ```
     execution: z.object({
       observability: z.object({
         metricsEnabled: z.boolean().default(true),
         logLevel: z.enum(["none", "errors", "info", "debug"]).default("errors"),
         samplingRate: z.number().min(0).max(1).default(1.0),
         telemetryEndpoint: z.string().nullable().default(null),
       }).default({}),
       runtimeConstraints: z.object({
         maxTokensPerInteraction: z.number().nullable().default(null),
         maxConcurrentSessions: z.number().nullable().default(null),
         circuitBreakerThreshold: z.number().min(0).max(1).nullable().default(null),
         sessionTimeoutMinutes: z.number().nullable().default(null),
       }).default({}),
       feedback: z.object({
         alertWebhook: z.string().nullable().default(null),
         escalationEmail: z.string().nullable().default(null),
       }).default({}),
     }).default({})
     ```
   - All fields have defaults so existing ABPs pass validation after migration

2. **Register 1.0.0 → 1.1.0 migration** in `src/lib/abp/migrate.ts`:
   - Migration function: adds `version: "1.1.0"` and `execution: {}` (defaults applied by Zod at read time)
   - Register via `registerMigration("1.0.0", "1.1.0", fn)`

3. **Update schema changelog** `docs/schemas/abp/changelog.md`:
   - v1.1.0 entry: added `execution` section (observability, runtimeConstraints, feedback), added explicit `version` field

4. **Create versioned schema file** `docs/schemas/abp/v1.1.0.schema.json` reflecting the new structure

**Definition of done:**
- [ ] `ABPSchema` includes `execution` section with all sub-fields
- [ ] `ABPSchema` includes `version` field
- [ ] All existing ABP Zod validations still pass (defaults ensure backward compatibility)
- [ ] 1.0.0 → 1.1.0 migration registered and working
- [ ] Schema changelog updated
- [ ] New versioned schema JSON file created
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H1-3.3 — Generation Engine Update

**Depends on:** H1-3.2

**What to build:**

1. **Update `src/lib/generation/system-prompt.ts`**:
   - Add instructions for the `execution` section to `BASE_GENERATION_PROMPT`:
     - "Set `execution.observability.metricsEnabled` to true for production agents"
     - "Set `execution.observability.logLevel` based on risk tier: high/critical → 'info', medium → 'errors', low → 'none'"
     - "Set `execution.runtimeConstraints.maxTokensPerInteraction` proportional to agent complexity"
     - "Set `execution.runtimeConstraints.circuitBreakerThreshold` for high-risk agents (suggest 0.1 = 10% error rate)"

2. **Update `src/lib/generation/generate.ts`**:
   - `generateBlueprint()`: use updated `ABPContentSchema` (which now includes `execution`)
   - `assembleABP()`: set `version: "1.1.0"` on newly generated ABPs
   - `refineBlueprint()`: preserve `execution` section during refinement

3. **Integrate migrate-on-read across read sites**: find every place that casts `blueprint.abp as ABP` and replace with `readABP(blueprint.abp)`. Key files:
   - `src/lib/mrm/report.ts` (line 71: `const abp = blueprint.abp as ABP`)
   - `src/lib/monitoring/health.ts` (line 55: `blueprint.abp as ABP`)
   - `src/app/api/blueprints/[id]/route.ts`
   - `src/app/api/blueprints/[id]/validate/route.ts`
   - `src/app/api/blueprints/[id]/refine/route.ts` and `stream/route.ts`
   - `src/app/api/blueprints/[id]/export/code/route.ts`
   - `src/app/api/blueprints/[id]/export/agentcore/route.ts`
   - `src/app/api/blueprints/[id]/simulate/chat/route.ts`
   - `src/app/api/registry/[agentId]/route.ts`
   - Any other file that reads ABP from DB — search for `as ABP` to find all sites

4. **Update Blueprint Studio** `src/app/blueprints/[id]/page.tsx`:
   - Add "Execution" section to the 7-section stepper (now 8 sections)
   - Display observability config, runtime constraints, feedback settings
   - Editable fields for each sub-section

**Definition of done:**
- [ ] New blueprints generated with `version: "1.1.0"` and populated `execution` section
- [ ] Execution section content varies by risk tier (higher risk = more monitoring)
- [ ] All `as ABP` casts replaced with `readABP()` — old blueprints auto-migrate on read
- [ ] Blueprint Studio shows execution section
- [ ] Refinement preserves execution section
- [ ] `npx tsc --noEmit` passes with 0 errors

---

### H1-4: Eventing Formalization

Formalizes the implicit event system into a typed, dispatchable event bus.

---

#### H1-4.1 — Typed Event Definitions

**Depends on:** nothing

**What to build:**

1. **Rewrite `src/lib/events/types.ts`**:
   - Replace string union `EventType` with a discriminated union `IntelliosEvent`:
     ```typescript
     type IntelliosEvent =
       | { type: "blueprint.created"; payload: { blueprintId: string; agentId: string; name: string; createdBy: string } }
       | { type: "blueprint.status_changed"; payload: { blueprintId: string; fromStatus: string; toStatus: string } }
       | { type: "blueprint.reviewed"; payload: { blueprintId: string; decision: string; reviewer: string; comment: string | null } }
       | { type: "policy.created"; payload: { policyId: string; name: string; type: string } }
       // ... one variant per existing EventType
     ```
   - Each variant has a typed `payload` — no more `Record<string, unknown>`
   - Keep `LifecycleEvent` interface as the wire format (it wraps an `IntelliosEvent`)
   - Export `EventEnvelope` type: `{ id: string; event: IntelliosEvent; timestamp: string; enterpriseId: string | null; actor: { email: string; role: string }; entity: { type: string; id: string } }`

2. **Update `src/lib/audit/log.ts`**:
   - `writeAuditLog()` signature accepts `IntelliosEvent` (or keep accepting `AuditEntry` and derive `IntelliosEvent` internally for backward compatibility during migration)
   - Existing callers continue to work — this is additive

3. **Synchronize `AuditAction` and `EventType`**: they are currently duplicate string unions. Merge into a single source of truth. `AuditAction` should reference `IntelliosEvent["type"]`.

**Definition of done:**
- [ ] `IntelliosEvent` discriminated union covers all 27+ existing event types with typed payloads
- [ ] `EventEnvelope` type wraps event with metadata (id, timestamp, actor, entity, enterprise)
- [ ] `AuditAction` type derived from `IntelliosEvent["type"]` — single source of truth
- [ ] All existing `writeAuditLog()` call sites still compile without changes
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H1-4.2 — Event Bus + Webhook Dispatch

**Depends on:** H1-4.1, resolves D-02

**What to build:**

1. **New function `publishEvent()`** in `src/lib/events/publish.ts`:
   - Signature: `publishEvent(envelope: EventEnvelope): Promise<void>`
   - Internally: (1) writes audit log row, (2) dispatches to event bus handlers
   - Replaces the current `writeAuditLog() → dispatch()` two-step in `src/lib/audit/log.ts`

2. **Migrate call sites**: replace all `writeAuditLog()` calls across API routes with `publishEvent()`:
   - Search for `writeAuditLog(` across all `src/app/api/` files
   - Each call site constructs an `EventEnvelope` with typed payload instead of raw `AuditEntry`
   - This is a large but mechanical migration (approximately 40 call sites across API routes)

3. **Verify webhook dispatch works end-to-end**:
   - `src/lib/webhooks/dispatch.ts` already registers as an event bus handler
   - `src/lib/webhooks/deliver.ts` already does HMAC-signed HTTP POST with retry
   - Verify: create a webhook via admin UI, trigger an event, check `webhookDeliveries` table for success
   - This resolves D-02 (webhook delivery wiring) — the wiring exists, it just needs events flowing through it

4. **Add webhook delivery status to admin UI**: in `src/app/admin/webhooks/page.tsx`, show recent deliveries with status (success/failed) and response code

**Definition of done:**
- [ ] `publishEvent()` function exists and combines audit log write + event dispatch
- [ ] All `writeAuditLog()` call sites migrated to `publishEvent()`
- [ ] Webhook dispatch fires for matching events (test with admin webhook UI)
- [ ] Webhook delivery records appear in `webhookDeliveries` table
- [ ] D-02 marked as resolved
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H1-4.3 — Event Filtering API

**Depends on:** H1-4.1, H1-4.2

**What to build:**

1. **New API route `src/app/api/events/route.ts`**:
   - `GET /api/events?type=<eventType>&entityType=<type>&enterpriseId=<id>&since=<ISO>&until=<ISO>&limit=<n>&offset=<n>`
   - Auth: `requireAuth()` — any authenticated user, filtered to their enterprise
   - Queries `auditLog` table with filters, returns array of `EventEnvelope`-shaped objects
   - Pagination via `limit` + `offset`
   - Default: last 100 events, most recent first

2. **Response format**: JSON array of `EventEnvelope` objects with typed payloads reconstructed from audit log `metadata` + `fromState`/`toState` columns

**Definition of done:**
- [ ] `GET /api/events` returns paginated, filtered event list
- [ ] Filters work: type, entityType, enterpriseId, time range
- [ ] Enterprise scoping enforced (users only see their enterprise's events)
- [ ] Response shape matches `EventEnvelope` type
- [ ] `npx tsc --noEmit` passes with 0 errors

---

### H1-5: Infrastructure Hardening

---

#### H1-5.1 — Redis Rate Limiting

**Depends on:** nothing. Resolves D-03.

**What to build:**

1. **Rewrite `src/lib/rate-limit.ts`**:
   - Current implementation: in-memory `Map<string, Window>` with sliding window (66 lines)
   - New implementation: Redis-backed sliding window using sorted sets
   - Read `REDIS_URL` from env — if not set, fall back to current in-memory implementation (for local dev)
   - Use `ioredis` package (add to `package.json`)
   - Redis key pattern: `ratelimit:${endpoint}:${actorEmail}`
   - Algorithm: `ZADD` timestamp, `ZREMRANGEBYSCORE` to evict expired, `ZCARD` to count
   - TTL: auto-expire keys after `windowMs` to prevent unbounded growth
   - Same public API: `rateLimit(actorEmail, config)` returns `NextResponse | null`

2. **Add env var**: `REDIS_URL` to `src/lib/env.ts` schema (optional string)

3. **Add `ioredis` dependency**: `npm install ioredis`

**Definition of done:**
- [ ] `rateLimit()` uses Redis when `REDIS_URL` is set
- [ ] `rateLimit()` falls back to in-memory `Map` when `REDIS_URL` is not set
- [ ] Same 429 response format as current implementation
- [ ] Redis keys auto-expire via TTL
- [ ] `REDIS_URL` added to env schema as optional
- [ ] D-03 marked as resolved
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H1-5.2 — Artifact Storage (S3)

**Depends on:** nothing

**What to build:**

1. **New lib module `src/lib/storage/s3.ts`**:
   - S3 client initialized from `AWS_REGION` + `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` (or IAM role)
   - Bucket name from env var `ARTIFACT_BUCKET`
   - Function `uploadArtifact(key: string, body: Buffer | string, contentType: string): Promise<string>` — uploads to S3, returns the S3 key
   - Function `getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>` — generates pre-signed download URL (default: 1 hour)
   - Function `artifactExists(key: string): Promise<boolean>` — head check

2. **Integrate with evidence package export**:
   - In `src/app/api/blueprints/[id]/evidence-package/route.ts`: after generating the ZIP, upload to S3 with key `evidence/{blueprintId}/{timestamp}.zip`, store the S3 key in `agentBlueprints.evidencePackageKey` (new nullable text column)
   - On subsequent requests: check if `evidencePackageKey` exists and blueprint hasn't changed since — if so, return signed URL instead of regenerating

3. **Integrate with MRM report export**:
   - Similar caching pattern for `src/app/api/blueprints/[id]/report/route.ts`

4. **Integrate with code export**:
   - Similar caching pattern for `src/app/api/blueprints/[id]/export/code/route.ts`

5. **Add `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`** to `package.json`

6. **Fallback**: when `ARTIFACT_BUCKET` is not set, skip caching and generate on-demand (current behavior)

**Definition of done:**
- [ ] S3 upload/download/signed-URL functions work
- [ ] Evidence packages cached in S3 and served via signed URL on repeat requests
- [ ] MRM reports cached in S3
- [ ] Code exports cached in S3
- [ ] When `ARTIFACT_BUCKET` is not set, behavior is identical to current (no crash, no regression)
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H1-5.3 — Help Prompt Refresh

**Depends on:** nothing. Resolves D-04.

**What to build:**

1. **Update `buildHelpSystemPrompt()` in `src/app/api/help/chat/route.ts`**:
   - The function currently describes 5 subsystems and 5 common workflows. It is missing features built in Phases 23-54.
   - Add sections for:
     - **Stakeholder Collaboration**: "Intellios supports multi-stakeholder intake via 7 contribution domains (compliance, risk, legal, security, IT, operations, business). Architects can invite domain experts via the stakeholder workspace. An AI orchestrator synthesizes contributions, detects conflicts, and identifies coverage gaps."
     - **Red-Team Testing**: "The red-team evaluator probes agents for prompt injection, data exfiltration, instruction override, jailbreak, and social engineering vulnerabilities. Access via the Simulate tab on any blueprint."
     - **Blueprint Quality Dashboard**: "Every blueprint is scored on 5 dimensions: intent alignment, tool appropriateness, instruction specificity, governance adequacy, and ownership completeness. Scores range 1-5, with an overall 0-100 score. Access via the Quality tab on any agent in the registry."
     - **Refinement Chat**: "Blueprint refinement uses a multi-turn streaming chat. Send natural language instructions to modify any aspect of the blueprint. The AI applies changes and explains what it did."
     - **Blueprint Lineage**: "The version diff engine shows changes between blueprint versions. The lineage view shows the full version history with governance diff — which policies changed between versions."
     - **Agent Search**: "Press Cmd+K (or Ctrl+K) to open the command palette. Type an agent name to search the registry directly."
     - **Viewer Role**: "Viewer users have read-only access to blueprints, governance dashboards, audit trails, and compliance reports. They cannot create, modify, or approve anything."
   - Fix stale role references: change any remaining "designer" references to "architect"
   - Update role list: `architect | reviewer | compliance_officer | admin | viewer` (currently missing viewer)

**Definition of done:**
- [ ] `buildHelpSystemPrompt()` covers all 7 new feature areas listed above
- [ ] Role references say "architect" not "designer"
- [ ] Role list includes "viewer"
- [ ] Help copilot can answer questions about stakeholder collaboration, red-teaming, quality scores, refinement chat, lineage, agent search, and viewer role
- [ ] D-04 marked as resolved
- [ ] `npx tsc --noEmit` passes with 0 errors

---

### H1 — DO NOT BUILD:
- Foundry, knowledge graph, multi-agent workflows, runtime governance engine
- Multi-cloud deployment adapters (Bedrock-only is sufficient for early customers)
- Enterprise SSO (email/password is adequate pre-scale)

---

## H2 — Govern at Scale (Months 3–9)

**Theme:** Extend governance from design-time to runtime. Intellios becomes the authority on agent behavior in production.

**Completion: 0/17 — 0%**

---

### H2-1: Runtime Governance Engine

---

#### H2-1.1 — Runtime Policy Type

**Depends on:** H1-1.1

**What to build:**

1. **Extend policy type enum**: the `governancePolicies.type` column currently accepts `safety | compliance | data_handling | access_control | audit`. Add `runtime` as a new valid type.

2. **New runtime rule operators** in `src/lib/governance/evaluate.ts`:
   - `token_budget_daily` — max tokens per agent per day
   - `token_budget_per_interaction` — max tokens per single interaction
   - `pii_action` — what to do when PII detected: `block`, `redact`, or `log`
   - `scope_constraint` — allowed topics/actions (whitelist)
   - `circuit_breaker_error_rate` — error rate threshold (0-1) that triggers circuit breaker

3. **Runtime policy creation UI**: extend `src/components/governance/policy-form.tsx` to support the `runtime` type with its specific rule operators. When type = `runtime`, show runtime-specific rule builders.

4. **Runtime policies stored in `governancePolicies` table** — no new table needed, just a new `type` value.

**Definition of done:**
- [ ] `runtime` is a valid policy type in the governance system
- [ ] Runtime rule operators evaluate correctly
- [ ] Policy form supports creating runtime policies
- [ ] Existing policy CRUD, versioning, and simulation work with runtime policies
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H2-1.2 — Telemetry-Based Violation Detection

**Depends on:** H2-1.1, H1-1.1

**What to build:**

1. **New DB table `runtimeViolations`** in `src/lib/db/schema.ts`:
   - Columns: `id` (uuid PK), `agentId` (text), `enterpriseId` (text, nullable), `policyId` (text, FK → `governancePolicies.id`), `policyName` (text), `ruleId` (text), `severity` (text — error/warning), `metric` (text — which telemetry metric triggered it), `observedValue` (real), `threshold` (real), `message` (text), `telemetryTimestamp` (timestamp), `detectedAt` (timestamp, default now)

2. **New lib module `src/lib/governance/runtime-evaluator.ts`**:
   - Function `evaluateRuntimePolicies(agentId: string, telemetryWindow: TelemetryDataPoint[])`:
     - Load runtime policies for the agent's enterprise
     - For each policy rule: compute the relevant metric from the telemetry window (e.g., sum tokens, compute error rate, check for PII indicators)
     - For each violation: insert into `runtimeViolations`
     - Return `{ violations: RuntimeViolation[], checked: number }`

3. **Hook into telemetry ingestion**: after `POST /api/telemetry/ingest` inserts new data points, call `evaluateRuntimePolicies()` for each affected agent

4. **PII detection** (sample-based): for agents with `pii_action` rules, flag in telemetry that PII scanning is needed. Actual PII scanning deferred to a background job (mark as TODO for this deliverable — full PII scanning is a separate concern).

**Definition of done:**
- [ ] `runtimeViolations` table exists with correct schema
- [ ] `evaluateRuntimePolicies()` correctly evaluates token budgets, error rates, and circuit breaker thresholds
- [ ] Violations are written to `runtimeViolations` when thresholds are breached
- [ ] Telemetry ingestion triggers runtime policy evaluation
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H2-1.3 — Runtime Violation UI + Alerts

**Depends on:** H2-1.2

**What to build:**

1. **New API route `src/app/api/registry/[agentId]/violations/route.ts`**:
   - `GET /api/registry/[agentId]/violations?since=<ISO>&severity=<error|warning>&limit=<n>`
   - Returns violations from `runtimeViolations` table

2. **Add "Violations" tab** to `src/app/registry/[agentId]/page.tsx`:
   - Tab visible only for deployed agents with runtime policies
   - Shows violation timeline (list sorted by `detectedAt` desc)
   - Severity distribution: count of errors vs warnings
   - Per-policy breakdown: which policies are most frequently violated

3. **New component `src/components/registry/violations-panel.tsx`**:
   - Props: `{ agentId: string; violations: RuntimeViolation[]; loading: boolean }`
   - Violation list with severity badge, policy name, observed vs threshold values, timestamp
   - Filter by severity, time range

4. **Alert on critical violations**: use `createNotification()` to notify admin + compliance_officer when error-severity runtime violations are detected. Publish webhook event `blueprint.runtime_violation`.

**Definition of done:**
- [ ] Violations API returns paginated, filtered runtime violations
- [ ] "Violations" tab appears on registry detail for deployed agents
- [ ] Violation list renders with severity badges and metric details
- [ ] Notifications created for error-severity violations
- [ ] Webhook event fires for violations
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H2-1.4 — Governance-Gated Circuit Breaker

**Depends on:** H2-1.2, H2-1.3

**What to build:**

1. **New lifecycle status `suspended`**: add to the status enum in `src/lib/db/schema.ts` alongside `draft | in_review | approved | rejected | deployed | deprecated`. Update lifecycle controls, status badges, and all status-related logic.

2. **Auto-suspend logic** in `src/lib/governance/runtime-evaluator.ts`:
   - After evaluating runtime policies, if error-severity violations exceed the enterprise's circuit breaker threshold (from `enterpriseSettings`): update blueprint status to `suspended`
   - Write audit log entry `blueprint.status_changed` with `toState: { status: "suspended" }`
   - Notify admin + compliance_officer

3. **Enterprise setting**: add `governance.circuitBreakerAction` to `EnterpriseSettings` in `src/lib/settings/types.ts`:
   - Values: `"auto_suspend"` (default) or `"alert_only"`
   - When `alert_only`: violations create notifications but don't change status

4. **Resume flow**: `suspended → deployed` transition requires re-approval (same as `draft → in_review → approved → deployed`). Add resume button to lifecycle controls for admin role.

5. **Update `src/components/registry/status-badge.tsx`**: add `suspended` variant (red pulsing badge)

**Definition of done:**
- [ ] `suspended` is a valid blueprint status throughout the system
- [ ] Circuit breaker auto-suspends agents when violation threshold exceeded
- [ ] `alert_only` mode creates notifications without suspending
- [ ] Suspended agents can be resumed through re-approval flow
- [ ] Status badge shows `suspended` state
- [ ] Audit trail records suspension events
- [ ] `npx tsc --noEmit` passes with 0 errors

---

### H2-2: Production Quality Measurement

---

#### H2-2.1 — Production Quality Scoring

**Depends on:** H1-1.1, H2-1.2

**What to build:**

1. **Extend `src/components/blueprint/quality-dashboard.tsx`**:
   - Add "Production Quality" section below existing design-time quality scores
   - New metrics: Policy Adherence Rate (% of telemetry windows with zero violations), Uptime % (% of time with non-zero invocations), Error Rate
   - Data source: aggregate from `agentTelemetry` + `runtimeViolations`

2. **New API route `src/app/api/registry/[agentId]/quality/production/route.ts`**:
   - Returns production quality metrics computed from telemetry + violations
   - Time range: last 30 days

3. **Combined quality score**: design-time score (existing 0-100) weighted against production score. Display as "Design: X / Production: Y" comparison.

**Definition of done:**
- [ ] Quality dashboard shows production metrics alongside design-time scores
- [ ] Policy adherence rate computed correctly from violations data
- [ ] Uptime percentage computed from telemetry data
- [ ] API returns production quality data
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H2-2.2 — Quality Trend Analysis

**Depends on:** H2-2.1

**What to build:**

1. **New DB table `qualityTrends`**: weekly snapshots of combined quality score per agent. Columns: `id`, `agentId`, `enterpriseId`, `weekStart` (date), `designScore` (real), `productionScore` (real, nullable), `policyAdherenceRate` (real, nullable)

2. **Cron job** `POST /api/cron/quality-trends`: runs weekly, computes quality snapshot for each deployed agent, inserts into `qualityTrends`

3. **Trend visualization** in quality dashboard: line chart showing quality score over past 12 weeks. Highlight regression (current week score < previous week by > 10 points).

4. **Regression alert**: when production quality drops below design-time quality by > 15 points, create notification + webhook event.

**Definition of done:**
- [ ] Weekly quality snapshots stored in `qualityTrends` table
- [ ] Cron job computes and stores snapshots
- [ ] Quality dashboard shows trend visualization
- [ ] Regression detection creates alerts when quality drops significantly
- [ ] `npx tsc --noEmit` passes with 0 errors

---

### H2-3: Enterprise SSO

---

#### H2-3.1 — SAML 2.0 + OIDC Federation

**Depends on:** nothing

**What to build:**

1. **Configure NextAuth providers** in the auth configuration (currently in `src/app/api/auth/[...nextauth]/route.ts`):
   - Add SAML provider using `next-auth` SAML support or `@auth/saml-provider`
   - Add generic OIDC provider for Azure AD / Google Workspace / Okta
   - Provider config stored per-enterprise in `enterpriseSettings.sso` (new settings section)

2. **Enterprise SSO settings**: add `sso` section to `EnterpriseSettings` in `src/lib/settings/types.ts`:
   - `enabled: boolean`, `protocol: "saml" | "oidc"`, `issuer: string`, `clientId: string`, `clientSecret: string`, `metadataUrl: string` (for SAML), `attributeMapping: { email, name, groups }`

3. **Admin SSO configuration page** `src/app/admin/sso/page.tsx`: form to configure SSO settings per enterprise

4. **Login page update**: show "Sign in with SSO" button when SSO is configured for the enterprise domain

**Definition of done:**
- [ ] SAML and OIDC providers configured in NextAuth
- [ ] SSO settings stored per-enterprise
- [ ] Admin can configure SSO via settings page
- [ ] Login page shows SSO option when configured
- [ ] SSO login creates/updates user record
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H2-3.2 — Directory Sync + JIT Provisioning

**Depends on:** H2-3.1

**What to build:**

1. **JIT user creation**: on first SSO login, auto-create user record with:
   - Email from SSO assertion
   - Name from SSO assertion
   - Role mapped from directory group (configurable mapping in enterprise settings)
   - `enterpriseId` from the SSO configuration

2. **Directory group → role mapping**: add `sso.groupRoleMapping` to enterprise settings:
   - `{ "EngineeringLeads": "architect", "ComplianceTeam": "compliance_officer", "Reviewers": "reviewer" }`
   - Default role when no group matches: `viewer`

3. **Periodic sync** (stretch): `POST /api/cron/directory-sync` — for enterprises with directory sync enabled, query the IdP for deactivated users and mark them inactive in Intellios

**Definition of done:**
- [ ] First SSO login creates user with correct role from group mapping
- [ ] Subsequent SSO logins update user attributes (name, groups)
- [ ] Admin can configure group-to-role mappings
- [ ] Unknown groups default to viewer role
- [ ] `npx tsc --noEmit` passes with 0 errors

---

### H2-4: Artifact Family v1

---

#### H2-4.1 — Workflow Definition Schema

**Depends on:** H1-3.1

**What to build:**

1. **New Zod schema `src/lib/types/workflow.ts`**:
   ```typescript
   WorkflowSchema = z.object({
     version: z.string().default("1.0.0"),
     name: z.string(),
     description: z.string(),
     agents: z.array(z.object({
       agentId: z.string(),
       role: z.string(),         // role within the workflow
       required: z.boolean(),
     })),
     handoffRules: z.array(z.object({
       from: z.string(),         // agentId or "start"
       to: z.string(),           // agentId or "end"
       condition: z.string(),    // natural language condition
       priority: z.number(),
     })),
     sharedContext: z.array(z.object({
       field: z.string(),
       type: z.enum(["string", "number", "boolean", "json"]),
       description: z.string(),
     })),
   })
   ```

2. **New DB table `workflows`**: `id`, `workflowId` (logical ID like `agentId`), `name`, `description`, `definition` (jsonb — WorkflowSchema), `status` (same lifecycle as blueprints), `version`, `enterpriseId`, `createdBy`, `createdAt`, `updatedAt`

3. **CRUD API routes**:
   - `GET/POST /api/workflows/route.ts` — list/create workflows
   - `GET/PATCH/DELETE /api/workflows/[id]/route.ts` — read/update/delete
   - Validate `definition` against `WorkflowSchema` on create/update
   - Validate all referenced `agentId`s exist in the blueprint registry

**Definition of done:**
- [ ] `WorkflowSchema` validates workflow definitions with agents, handoff rules, shared context
- [ ] `workflows` table exists with correct schema
- [ ] CRUD API routes work with auth + enterprise scoping
- [ ] Agent references validated against registry
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H2-4.2 — Multi-Artifact Registry

**Depends on:** H2-4.1

**What to build:**

1. **Extend registry API** `src/app/api/registry/route.ts`:
   - Add `artifactType` query param: `blueprint` (default) or `workflow`
   - When `artifactType=workflow`: query `workflows` table instead of `agentBlueprints`
   - Return unified response shape with `artifactType` discriminator

2. **Extend registry UI** `src/app/registry/page.tsx`:
   - Add toggle/tabs: "Agents" (blueprints) and "Workflows"
   - Workflow list shows: name, status, agent count, version

3. **Workflow detail page** `src/app/registry/workflow/[workflowId]/page.tsx`:
   - Show workflow definition: agent list with names/statuses, handoff rules, shared context
   - Version history
   - Status badge and lifecycle controls (same as blueprint)

**Definition of done:**
- [ ] Registry API supports querying workflows
- [ ] Registry UI shows agents and workflows as separate views
- [ ] Workflow detail page renders definition and version history
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H2-4.3 — Workflow Governance

**Depends on:** H2-4.1, H2-4.2

**What to build:**

1. **Workflow validation**: before a workflow can move to `in_review`, validate:
   - All referenced agents exist and are `approved` or `deployed`
   - No circular handoff rules
   - All shared context fields are defined

2. **Workflow governance diff**: when a workflow is updated, show what changed — agents added/removed, handoff rules modified, shared context altered

3. **Approval workflow**: same multi-step approval chain as blueprints. Audit trail records workflow approval events.

4. **MRM report extension**: if a blueprint is part of a workflow, the MRM report includes workflow context (which workflow, what role the agent plays, handoff conditions)

**Definition of done:**
- [ ] Workflow validation blocks invalid workflows from review
- [ ] Governance diff shows workflow changes
- [ ] Multi-step approval chain works for workflows
- [ ] Audit trail records workflow events
- [ ] `npx tsc --noEmit` passes with 0 errors

---

### H2-5: Portfolio Intelligence

---

#### H2-5.1 — Risk Trend Analysis

**Depends on:** H1-1.1

**What to build:**

1. **New DB table `portfolioSnapshots`**: weekly fleet-level metrics. Columns: `id`, `enterpriseId`, `weekStart` (date), `totalAgents` (integer), `deployedAgents` (integer), `complianceRate` (real), `avgQualityScore` (real), `totalViolations` (integer), `violationsByType` (jsonb), `agentsByRiskTier` (jsonb)

2. **Cron job** `POST /api/cron/portfolio-snapshot`: runs weekly, aggregates fleet metrics per enterprise

3. **Trend API** `GET /api/portfolio/trends?weeks=12`: returns time-series of portfolio snapshots

4. **Trend visualization**: add to fleet governance dashboard (`src/app/governance/page.tsx` or the Governor fleet page). Line charts: compliance rate over time, violation count over time, fleet size over time. Group by risk tier or business unit.

**Definition of done:**
- [ ] Weekly portfolio snapshots stored and queryable
- [ ] Trend API returns time-series data
- [ ] Trend charts render in fleet governance dashboard
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H2-5.2 — Cost Attribution

**Depends on:** H1-1.1

**What to build:**

1. **Cost computation** from telemetry: `tokensIn * inputCostPerToken + tokensOut * outputCostPerToken`. Cost rates configurable per enterprise in `enterpriseSettings.costRates` (new settings section).

2. **Per-agent cost API** `GET /api/registry/[agentId]/cost?period=<month>`: returns token consumption, cost breakdown, estimated monthly spend

3. **Fleet cost rollup API** `GET /api/portfolio/cost?period=<month>`: per-agent costs aggregated to fleet total, grouped by business unit (from `agentBlueprints.ownership.businessUnit`)

4. **Cost column** in registry list page: show estimated monthly cost alongside each agent

**Definition of done:**
- [ ] Cost rates configurable per enterprise
- [ ] Per-agent cost API returns correct calculations from telemetry
- [ ] Fleet cost rollup groups by business unit
- [ ] Registry list shows cost column
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H2-5.3 — Executive Dashboard

**Depends on:** H2-5.1, H2-5.2

**What to build:**

1. **New page `src/app/governor/executive/page.tsx`**:
   - Single-page board-ready view with cards:
     - Fleet size (total agents, deployed, by status)
     - Compliance posture (% compliant, trend arrow)
     - Risk distribution (pie/bar by risk tier)
     - Cost summary (total monthly, top 5 by cost)
     - Quality trend (12-week line, overall index)
     - Top 5 alerts (most recent critical notifications)
   - All data from existing APIs: `/api/portfolio/trends`, `/api/portfolio/cost`, `/api/compliance/posture`, `/api/notifications`

2. **PDF export**: "Export PDF" button generates a print-optimized version. Use `@react-pdf/renderer` or browser print CSS (`@media print` stylesheet) — prefer print CSS for simplicity.

3. **Access control**: admin + compliance_officer only

**Definition of done:**
- [ ] Executive dashboard page renders all 6 data cards
- [ ] PDF export produces a clean, print-ready document
- [ ] Only admin and compliance_officer can access
- [ ] All data sourced from existing APIs (no new backend beyond what H2-5.1/H2-5.2 provide)
- [ ] `npx tsc --noEmit` passes with 0 errors

---

## H3 — Execution Platform (Months 9–18)

**Theme:** Extend from design + governance into workflow composition and execution monitoring.

**Gate:** 3+ enterprise design partners with validated execution orchestration needs. Do not build speculatively.

**Completion: 0/14 — 0%**

---

### H3-1: Foundry MVP

---

#### H3-1.1 — Workflow Composition UI

**Depends on:** H2-4.1

**What to build:**

1. **New page `src/app/workflows/compose/page.tsx`**: visual workflow editor
   - Canvas with drag-and-drop agent nodes from registry
   - Handoff connectors between nodes (lines with condition labels)
   - Conditional routing branches (if/else splits)
   - "Start" and "End" nodes
   - Save/load workflow definitions to `workflows` table via API

2. **Canvas implementation**: use a lightweight canvas library (e.g., `reactflow`) or custom SVG-based renderer. Nodes are agent cards (name + status badge). Edges are handoff rules.

3. **Sidebar panel**: agent picker (search registry), handoff rule editor (from/to/condition), shared context field editor

**Definition of done:**
- [ ] Visual workflow editor renders with drag-and-drop
- [ ] Agents can be added from registry search
- [ ] Handoff connections can be drawn between agents
- [ ] Workflow can be saved to and loaded from the database
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H3-1.2 — Execution Monitoring

**Depends on:** H1-1.1, H2-4.2

**What to build:**

1. **New DB table `workflowRuns`**: `id`, `workflowId`, `status` (running/completed/failed/paused), `currentStep` (agentId), `startedAt`, `completedAt`, `input` (jsonb), `output` (jsonb), `stepHistory` (jsonb array of step results)

2. **Dashboard page** `src/app/workflows/runs/page.tsx`: list active and recent workflow runs. Per-run detail: current step highlighted, agent status at each step, elapsed time, error state.

3. **API**: `GET /api/workflows/[id]/runs` — list runs. `GET /api/workflows/[id]/runs/[runId]` — run detail with step history.

**Definition of done:**
- [ ] Workflow runs tracked in database with step-by-step history
- [ ] Runs dashboard shows active and completed runs
- [ ] Run detail view shows step progression and status
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H3-1.3 — Workflow-Level Governance

**Depends on:** H2-4.3

**What to build:**

1. **Workflow deployment approval**: same multi-step approval chain as blueprints
2. **Workflow audit trail**: all workflow lifecycle events (created, reviewed, deployed, run_started, run_completed) logged via `publishEvent()`
3. **Workflow governance diff**: show changes between workflow versions
4. **MRM report workflow section**: new section in MRM report when blueprint is part of a deployed workflow

**Definition of done:**
- [ ] Workflow deployments require approval
- [ ] Workflow events appear in audit trail
- [ ] Governance diff works for workflow versions
- [ ] MRM report includes workflow context
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H3-1.4 — Workflow Simulation

**Depends on:** H3-1.1, A-12

**What to build:**

1. **Dry-run endpoint** `POST /api/workflows/[id]/simulate`: accepts test input, runs each agent in sequence using existing simulation (`/api/blueprints/[id]/simulate/chat`), passes output as input to next agent per handoff rules

2. **Simulation report**: per-agent response, handoff decisions made, total latency, governance violations detected during simulation

3. **UI**: "Simulate" button on workflow detail page, results displayed inline

**Definition of done:**
- [ ] Workflow simulation runs each agent in sequence with handoff logic
- [ ] Simulation report shows per-agent results
- [ ] UI displays simulation results
- [ ] `npx tsc --noEmit` passes with 0 errors

---

### H3-2: Enterprise Memory v1

---

#### H3-2.1 — Execution History Store

**Depends on:** H1-1.1

**What to build:**

1. **New DB table `executionHistory`**: `id`, `agentId`, `blueprintId`, `blueprintVersion`, `enterpriseId`, `interactionSummary` (text), `decisionRationale` (text, nullable), `outcome` (text — `"success"`, `"failure"`, `"escalated"`), `metadata` (jsonb), `timestamp`

2. **Ingestion**: extend telemetry ingest API to accept optional `interactionLogs` alongside metrics. Parse and store as execution history entries.

3. **Query API** `GET /api/agents/[agentId]/history?since=&until=&outcome=&limit=`: paginated, filterable execution history

**Definition of done:**
- [ ] Execution history stored with interaction summaries and outcomes
- [ ] Query API supports time range, outcome, and pagination filters
- [ ] Linked to agent + blueprint version
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H3-2.2 — Pattern Extraction

**Depends on:** H3-2.1

**What to build:**

1. **AI analysis job**: periodically analyze execution history using Claude to extract:
   - Common resolution patterns (how agents typically handle certain query types)
   - Escalation triggers (what conditions cause failures or escalations)
   - Failure modes (recurring error patterns)

2. **Store patterns** in new `agentPatterns` table: `id`, `agentId`, `patternType` (resolution/escalation/failure), `description`, `frequency`, `confidence`, `extractedAt`

3. **Surface in UI**: "Insights" section on agent detail page showing extracted patterns. Use in Architect's blueprint refinement context (include patterns in refinement chat system prompt).

**Definition of done:**
- [ ] Pattern extraction job runs and produces meaningful patterns from execution history
- [ ] Patterns stored and queryable
- [ ] Patterns surfaced in agent detail UI
- [ ] `npx tsc --noEmit` passes with 0 errors

---

### H3-3: Continuous Governance

---

#### H3-3.1 — Scheduled Policy Re-evaluation

**Depends on:** H2-1.1

**What to build:**

1. **Cron job** `POST /api/cron/governance-drift`: for each deployed agent, re-validate blueprint against current policy set using `validateBlueprint()`. Compare results to last validation. If new violations found → governance drift detected.

2. **Drift notifications**: notify admin + compliance_officer when drift detected. Include which policies changed and which new violations appeared.

3. **Drift column in fleet dashboard**: show "Drifted" badge alongside agents whose current policies would produce violations that weren't present at approval time.

**Definition of done:**
- [ ] Scheduled re-evaluation detects governance drift
- [ ] Drift notifications sent to appropriate roles
- [ ] Fleet dashboard shows drift status
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H3-3.2 — Self-Healing Remediation

**Depends on:** H3-3.1, A-09

**What to build:**

1. **AI remediation suggestions**: when governance drift or production violations are detected, use Claude to propose specific ABP modifications that would resolve the violations

2. **Auto-create draft**: create a new blueprint version (draft status) with Claude's suggested changes applied. Link to the violations that triggered it.

3. **Architect review flow**: architect sees "Suggested Fix" in Studio with diff showing what Claude changed and why. Architect can accept, modify, or reject.

**Definition of done:**
- [ ] Claude proposes ABP changes based on violations
- [ ] Draft version auto-created with suggested fixes
- [ ] Diff view shows Claude's proposed changes
- [ ] Architect can accept/modify/reject suggestions
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H3-3.3 — Compliance Calendar

**Depends on:** G-14

**What to build:**

1. **New page `src/app/governor/calendar/page.tsx`**: calendar view showing:
   - SR 11-7 periodic review due dates (from `agentBlueprints.nextReviewDue`)
   - Policy review schedules (configurable per policy)
   - Regulatory submission deadlines (manually entered)

2. **Automated reminders**: extend `POST /api/cron/review-reminders` to send notifications at 30, 14, and 7 days before deadlines

3. **iCal export**: generate `.ics` file for subscribing in external calendar apps

**Definition of done:**
- [ ] Calendar page shows all compliance-related deadlines
- [ ] Automated reminders at 30/14/7 day intervals
- [ ] iCal export works
- [ ] `npx tsc --noEmit` passes with 0 errors

---

### H3-4: Ecosystem

---

#### H3-4.1 — Template Marketplace

**Depends on:** A-16

**What to build:**

1. **Extend template system**: add `source` field (built-in / community), `rating` (average), `usageCount`, `author`, `publishedAt` to template schema

2. **Browse UI**: gallery view with search, filter by category/risk-tier/rating. Preview template before importing. Usage metrics displayed.

3. **Submission flow**: architects can publish their blueprints as templates (strip enterprise-specific data, add description/tags)

4. **Rating system**: users rate templates after use (1-5 stars). Stored in new `templateRatings` table.

**Definition of done:**
- [ ] Templates have community metadata (author, rating, usage count)
- [ ] Gallery view with search and filtering
- [ ] Architects can publish blueprints as templates
- [ ] Rating system works
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H3-4.2 — Enterprise Integrations

**Depends on:** H1-4.2

**What to build:**

1. **Integration adapter framework**: `src/lib/integrations/adapter.ts` — base interface for external system adapters: `sendNotification()`, `createTicket()`, `syncStatus()`

2. **ServiceNow adapter**: creates incident tickets on critical violations. Config: instance URL, credentials, assignment group.

3. **Jira adapter**: creates approval tasks in Jira when blueprints enter review. Updates Jira status when approved/rejected.

4. **Slack/Teams adapter**: sends notification messages to configured channel. Uses incoming webhook URLs.

5. **Admin integration config page**: `src/app/admin/integrations/page.tsx` — configure which integrations are active, provide credentials, map events to actions.

**Definition of done:**
- [ ] Adapter interface defined with implementations for ServiceNow, Jira, Slack
- [ ] Each adapter can be configured per-enterprise
- [ ] Events correctly trigger adapter actions
- [ ] Admin page for managing integrations
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H3-4.3 — API-First + SDK

**Depends on:** H1-4.3

**What to build:**

1. **OpenAPI 3.1 spec**: auto-generate from route definitions or manually author `docs/api/openapi.yaml` covering all public API routes

2. **API key management**: new `apiKeys` table (id, enterpriseId, name, keyHash, scopes, createdBy, createdAt, lastUsedAt, revokedAt). Admin page for creating/revoking API keys.

3. **TypeScript SDK**: `packages/sdk-typescript/` — typed client generated from OpenAPI spec. Publish to npm.

4. **Python SDK**: `packages/sdk-python/` — typed client generated from OpenAPI spec. Publish to PyPI.

**Definition of done:**
- [ ] OpenAPI spec covers all public API routes
- [ ] API key creation/revocation works via admin UI
- [ ] TypeScript SDK installable and functional
- [ ] Python SDK installable and functional
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H3-4.4 — Multi-Cloud Deployment

**Depends on:** P-08

**What to build:**

1. **Deployment adapter interface**: `src/lib/deploy/adapter.ts` — `deploy(abp: ABP, config: DeployConfig): Promise<DeploymentRecord>`, `getStatus(record: DeploymentRecord): Promise<string>`

2. **Azure AI Foundry adapter**: translate ABP → Azure AI Foundry deployment manifest. Deploy via Azure SDK.

3. **Google Vertex AI adapter**: translate ABP → Vertex AI agent definition. Deploy via Google Cloud SDK.

4. **Deployment target selector**: extend `src/app/blueprints/[id]/page.tsx` deploy flow to allow choosing target (Bedrock / Azure / Vertex / Custom). Config per enterprise in `enterpriseSettings.deploymentTargets`.

**Definition of done:**
- [ ] Deployment adapter interface with implementations for Azure + Vertex
- [ ] ABP translation to each cloud's manifest format
- [ ] Deployment target selector in UI
- [ ] Deployed agents tracked with target-specific metadata
- [ ] `npx tsc --noEmit` passes with 0 errors

---

## Dependency Graph (Critical Path)

```
H1-1.1 (Telemetry model)
  ├── H1-1.2 (AgentCore connector)
  ├── H1-1.3 (Production tab UI)
  ├── H1-1.4 (Health integration) ← H1-1.2
  ├── H1-1.5 (Threshold alerts) ← H1-4.2
  ├── H2-1.1 (Runtime policy type)
  │     ├── H2-1.2 (Violation detection) ← H1-1.1
  │     ├── H2-1.3 (Violation UI)
  │     └── H2-1.4 (Circuit breaker) ← H2-1.2
  ├── H2-2.1 (Production quality) ← H2-1.2
  ├── H2-5.1 (Risk trends)
  └── H2-5.2 (Cost attribution)

H1-3.1 (Migration framework)
  ├── H1-3.2 (ABP v1.1.0)
  │     └── H1-3.3 (Generation update)
  └── H2-4.1 (Workflow schema)
        ├── H2-4.2 (Multi-artifact registry)
        └── H2-4.3 (Workflow governance)

H1-4.1 (Event definitions)
  └── H1-4.2 (Event bus + webhook dispatch)
        ├── H1-4.3 (Event filtering API)
        └── H1-1.5 (Threshold alerts)

H1-2.1 (Governor layout) → H1-2.2 (Routing) → H1-2.3 (Home page)
H1-5.1, H1-5.2, H1-5.3 — independent, no dependencies
```

**Critical path to H2:** H1-1.1 → H1-1.2 → H2-1.1 → H2-1.2 (runtime governance requires telemetry)

**Critical path to H3:** H1-3.1 → H2-4.1 → H3-1.1 (Foundry requires artifact family which requires migration framework)

---

## Session Execution Guide

Each deliverable is scoped to fit a single Claude session (1–3 hours). Recommended execution order for H1:

**Sprint 1 (foundations, parallelizable):**
- H1-1.1 + H1-4.1 + H1-5.1 + H1-5.3 (four independent deliverables)

**Sprint 2 (connect):**
- H1-1.2 + H1-4.2 + H1-3.1 (connector, event bus, migration framework)

**Sprint 3 (surface):**
- H1-1.3 + H1-2.1 + H1-3.2 (production UI, Governor layout, ABP v1.1.0)

**Sprint 4 (integrate):**
- H1-1.4 + H1-2.2 + H1-2.3 + H1-3.3 (health integration, routing, Governor home, generation update)

**Sprint 5 (complete):**
- H1-1.5 + H1-4.3 + H1-5.2 (alerts, event API, S3 storage)

---

## Key Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R-1 | **Foundry prematurity** | 12 months of runtime engineering with no revenue | Gate on 3+ design partners + H2 prerequisites complete |
| R-2 | **Observability gap erodes governance claim** | Buyers ask "how do you ensure compliance after deployment?" — today: "we don't" | H1-1 is P0; nothing else matters until deployed agents report back |
| R-3 | **Enterprise integration tax** | Each enterprise has different stacks; unbounded integration work | Integration adapter framework (H1-4) + prioritize top 3 stacks in H3-4.2 |
| R-4 | **Knowledge graph black hole** | 18 months of schema design with no outcome | No standalone project; H3-2 accumulates as side effect of observable execution |
| R-5 | **Product family fragmentation** | Multiple product names = multiple procurement conversations | One platform, role-based experiences; pricing by capability tier, not product |

---

## Accomplished — Phase History (Reference)

54 phases shipped between 2026-03-12 and 2026-03-19. Condensed by functional area.

### Foundation (Phases 1–5)

Core pipeline loop: intake → generate → validate → review. Auth + RBAC. Audit logging. Rate limiting. Input validation. Error handling.

### Governance Infrastructure (Phases 6, 10–11, 14–15, 22)

MRM compliance reporting (14 sections). Policy CRUD + lifecycle audit. Governance integrity validation. Multi-step approval workflow + policy versioning (ADR-006).

### Enterprise Features (Phases 9, 12–13, 16–17, 24–25)

Intake session management. User management (CRUD + invitations). Role-differentiated home screens. Pipeline board + blueprint workbench. Notification system (in-app + email). Outbound webhooks (HMAC-signed).

### Intelligence + Monitoring (Phases 23, 28, 44)

Blueprint quality scoring (5 dimensions). Intake quality scoring (4 dimensions). Deployment health snapshots. Daily AI-synthesized intelligence briefings. System health metrics. Governance scores surfaced in UI. Auth middleware activated.

### Deployment Integration (Phases 26–27, 33)

AgentCore manifest export. Direct AWS Bedrock deploy. AgentCore confidence hardening (error handling, model scoring).

### Compliance + Evidence (Phases 21, 29–30, 35, 50, 52)

MRM report JSON + HTML export. Evidence package export (14-section audit bundles). Regulatory mapping report. SR 11-7 periodic review scheduling. Blueprint lineage with governance diff.

### Intake Evolution (Phases 8, 31, 48–49)

Context enrichment (risk-aware probing). Classification-driven intake (agent type + risk tier). Stakeholder collaboration workspace (7 domains, RACI, AI orchestrator). Intake confidence engine (expertise detection, adaptive routing, readiness scoring, completeness map).

### UX Polish + Growth (Phases 36–42, 45–47, 53–54)

Role-optimized UX. Agent playground + code export + landing page. Self-service registration + red-teaming. Blueprint template library + activity feed. Notification settings + blueprint regeneration + status polling. Contextual help + multi-turn copilot. Viewer role. Architect command center (quality dashboard, refinement chat, agent search).

### Lifecycle + Versioning (Phases 20, 43, 52)

Deployed state + deprecation. Clone + new version iteration. Version diff engine. Blueprint lineage with governance diff.

### Role Model (Phase 54 addendum)

Designer role renamed to Architect across entire codebase (type definition, 42 API auth guards, UI labels, seed data, DB records). Phase 55/56 cancelled.
