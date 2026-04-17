/**
 * Blueprint Lifecycle Integration Tests
 *
 * Covers the five core blueprint API routes that enforce the governance
 * contract Intellios sells to regulated enterprises:
 *
 *   1. PATCH /api/blueprints/[id]/status  — State machine transitions
 *   2. POST  /api/blueprints/[id]/review  — Approve / reject / request_changes
 *   3. POST  /api/blueprints/[id]/validate — Governance validation
 *   4. POST  /api/blueprints/[id]/deploy/agentcore — AgentCore deployment
 *   5. POST  /api/blueprints             — Create (generate from intake)
 *
 * Test categories per route:
 *   - Happy-path transitions
 *   - Invalid / disallowed transitions
 *   - Role-based access control
 *   - Separation of Duties (SOD)
 *   - Multi-step approval chain enforcement
 *   - Governance validation gates
 *   - Test-pass gates
 *   - Deployment side-effects
 *   - Enterprise scope isolation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDb, selectResult, updateResult, insertResult, findFirstResult, resetMockDb } from "./helpers/mock-db";
import { mockRequireAuth, mockAssertEnterpriseAccess, setupAuthSession, setupAuthError, setupEnterpriseDenied, resetAuthMocks } from "./helpers/mock-auth";
import { makeBlueprint, makeSettings, makeValidationReport, makeIntakeSession } from "./helpers/fixtures";
import { makeRequest, makeParams, responseJson } from "./helpers/route-test-utils";

// ═══════════════════════════════════════════════════════════════════════════════
// Module mocks — must be at top level before any imports of the routes
// ═══════════════════════════════════════════════════════════════════════════════

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  agentBlueprints: { id: "id", enterpriseId: "enterpriseId", status: "status" },
  auditLog: { id: "id" },
  intakeSessions: { id: "id" },
  blueprintTestRuns: { id: "id", blueprintId: "blueprintId" },
}));
vi.mock("@/lib/db/safe-columns", () => ({
  SAFE_BLUEPRINT_COLUMNS: {},
  ALL_BLUEPRINT_COLUMNS: {},
}));
vi.mock("@/lib/auth/require", () => ({ requireAuth: mockRequireAuth }));
vi.mock("@/lib/auth/enterprise", () => ({ assertEnterpriseAccess: mockAssertEnterpriseAccess }));

const mockPublishEvent = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/events/publish", () => ({ publishEvent: mockPublishEvent }));

const mockParseBody = vi.fn();
vi.mock("@/lib/parse-body", () => ({ parseBody: mockParseBody }));

const mockGetRequestId = vi.fn().mockReturnValue("req-test-001");
vi.mock("@/lib/request-id", () => ({ getRequestId: mockGetRequestId }));

const mockValidateBlueprint = vi.fn().mockResolvedValue(makeValidationReport());
vi.mock("@/lib/governance/validator", () => ({ validateBlueprint: mockValidateBlueprint }));

const mockGetEnterpriseSettings = vi.fn().mockResolvedValue(makeSettings());
vi.mock("@/lib/settings/get-settings", () => ({ getEnterpriseSettings: mockGetEnterpriseSettings }));

const mockCheckDeploymentHealth = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/monitoring/health", () => ({ checkDeploymentHealth: mockCheckDeploymentHealth }));

const mockDeployToAgentCore = vi.fn().mockResolvedValue({ agentId: "ac-001", status: "PREPARED" });
vi.mock("@/lib/agentcore/deploy", () => ({ deployToAgentCore: mockDeployToAgentCore }));

const mockReadABP = vi.fn().mockReturnValue({ identity: { name: "Test" }, metadata: { tags: [] } });
vi.mock("@/lib/abp/read", () => ({ readABP: mockReadABP }));

const mockGenerateBlueprint = vi.fn().mockResolvedValue({
  identity: { name: "Generated Agent" },
  metadata: { tags: ["gen"] },
  capabilities: {},
  guardrails: {},
});
vi.mock("@/lib/generation/generate", () => ({ generateBlueprint: mockGenerateBlueprint }));

const mockLoadPolicies = vi.fn().mockResolvedValue([]);
vi.mock("@/lib/governance/load-policies", () => ({ loadPolicies: mockLoadPolicies }));

const mockRateLimit = vi.fn().mockResolvedValue(null);
const mockEnterpriseRateLimit = vi.fn().mockResolvedValue(null);
const mockIsRedisHealthy = vi.fn().mockResolvedValue("fallback");
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mockRateLimit,
  enterpriseRateLimit: mockEnterpriseRateLimit,
  isRedisHealthy: mockIsRedisHealthy,
}));

const mockEnterpriseScope = vi.fn().mockReturnValue(undefined);
vi.mock("@/lib/auth/enterprise-scope", () => ({ enterpriseScope: mockEnterpriseScope }));

const mockWithTenantScopeGuarded = vi.fn().mockImplementation(async (_req: unknown, fn: (ctx: unknown) => Promise<unknown>) => {
  return fn({ enterpriseId: "ent-001" });
});
vi.mock("@/lib/auth/with-tenant-scope", () => ({ withTenantScopeGuarded: mockWithTenantScopeGuarded }));

// Mock drizzle-orm operators — they just pass through in tests
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ eq: val })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  desc: vi.fn((col: unknown) => ({ desc: col })),
}));

// ═══════════════════════════════════════════════════════════════════════════════
// Import route handlers AFTER mocks are registered
// ═══════════════════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-var-requires
const statusRoute = await import("@/app/api/blueprints/[id]/status/route");
const reviewRoute = await import("@/app/api/blueprints/[id]/review/route");
const validateRoute = await import("@/app/api/blueprints/[id]/validate/route");
const deployRoute = await import("@/app/api/blueprints/[id]/deploy/agentcore/route");
const blueprintsRoute = await import("@/app/api/blueprints/route");

// ═══════════════════════════════════════════════════════════════════════════════
// Global setup
// ═══════════════════════════════════════════════════════════════════════════════

beforeEach(() => {
  resetMockDb();
  resetAuthMocks();
  mockPublishEvent.mockReset().mockResolvedValue(undefined);
  mockParseBody.mockReset();
  mockValidateBlueprint.mockReset().mockResolvedValue(makeValidationReport());
  mockGetEnterpriseSettings.mockReset().mockResolvedValue(makeSettings());
  mockCheckDeploymentHealth.mockReset().mockResolvedValue(undefined);
  mockDeployToAgentCore.mockReset().mockResolvedValue({ agentId: "ac-001", status: "PREPARED" });
  mockReadABP.mockReset().mockReturnValue({ identity: { name: "Test" }, metadata: { tags: [] } });
  mockGenerateBlueprint.mockReset().mockResolvedValue({
    identity: { name: "Generated Agent" },
    metadata: { tags: ["gen"] },
    capabilities: {},
    guardrails: {},
  });
  mockLoadPolicies.mockReset().mockResolvedValue([]);
  mockRateLimit.mockReset().mockResolvedValue(null);
  mockEnterpriseRateLimit.mockReset().mockResolvedValue(null);
  mockIsRedisHealthy.mockReset().mockResolvedValue("fallback");
  mockGetRequestId.mockReset().mockReturnValue("req-test-001");
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. PATCH /api/blueprints/[id]/status — State Machine
// ═══════════════════════════════════════════════════════════════════════════════

describe("PATCH /api/blueprints/[id]/status", () => {
  const callStatus = (request: Request, id = "bp-001") =>
    statusRoute.PATCH(request as any, makeParams(id));

  // Helper: set up parseBody to return the given status + optional fields
  function setupBody(body: { status: string; comment?: string; changeRef?: string; deploymentNotes?: string }) {
    mockParseBody.mockResolvedValue({ data: body, error: null });
  }

  // Helper: set up the DB to return a blueprint with given status
  function setupBlueprint(status: string, overrides: Record<string, unknown> = {}) {
    const bp = makeBlueprint({ status, ...overrides });
    selectResult.mockReturnValue([bp]);
    updateResult.mockReturnValue([{ ...bp, status: "updated" }]);
    return bp;
  }

  // ─── Happy-path transitions ──────────────────────────────────────────────

  describe("valid transitions (legacy single-step)", () => {
    it("draft → in_review: architect submits for review", async () => {
      setupAuthSession({ role: "architect" });
      setupBody({ status: "in_review" });
      setupBlueprint("draft");
      // validateBlueprint is called during in_review submission — return clean report
      mockValidateBlueprint.mockResolvedValue({ violations: [], policyCount: 5 });

      const res = await callStatus(makeRequest("PATCH"));

      expect(res.status).toBe(200);
      expect(mockPublishEvent).toHaveBeenCalled();
    });

    it("in_review → approved: reviewer approves", async () => {
      setupAuthSession({ role: "reviewer", email: "reviewer@acme.com" });
      setupBody({ status: "approved", comment: "Looks good" });
      setupBlueprint("in_review", { createdBy: "designer@acme.com" });

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(200);
    });

    it("in_review → rejected: reviewer rejects", async () => {
      setupAuthSession({ role: "reviewer", email: "reviewer@acme.com" });
      setupBody({ status: "rejected" });
      setupBlueprint("in_review", { createdBy: "designer@acme.com" });

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(200);
    });

    it("approved → deployed: admin deploys with changeRef", async () => {
      setupAuthSession({ role: "admin", email: "admin@acme.com" });
      setupBody({ status: "deployed", changeRef: "CHG-001" });
      setupBlueprint("approved");

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(200);
      // Deployment triggers checkDeploymentHealth
      expect(mockCheckDeploymentHealth).toHaveBeenCalled();
    });

    it("deployed → deprecated: admin deprecates", async () => {
      setupAuthSession({ role: "admin" });
      setupBody({ status: "deprecated" });
      setupBlueprint("deployed");

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(200);
    });

    it("rejected → deprecated: admin deprecates rejected", async () => {
      setupAuthSession({ role: "admin" });
      setupBody({ status: "deprecated" });
      setupBlueprint("rejected");

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(200);
    });

    it("suspended → in_review: admin resumes suspended blueprint", async () => {
      setupAuthSession({ role: "admin" });
      setupBody({ status: "in_review" });
      setupBlueprint("suspended");

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(200);
    });

    it("suspended → deprecated: admin deprecates suspended", async () => {
      setupAuthSession({ role: "admin" });
      setupBody({ status: "deprecated" });
      setupBlueprint("suspended");

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(200);
    });
  });

  // ─── Invalid transitions ────────────────────────────────────────────────

  describe("invalid transitions", () => {
    it("draft → approved: cannot skip review", async () => {
      setupAuthSession({ role: "admin" });
      setupBody({ status: "approved" });
      setupBlueprint("draft");

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(422);
    });

    it("deployed → approved: cannot go backwards", async () => {
      setupAuthSession({ role: "admin" });
      setupBody({ status: "approved" });
      setupBlueprint("deployed");

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(422);
    });

    it("deprecated → draft: terminal state cannot transition", async () => {
      setupAuthSession({ role: "admin" });
      setupBody({ status: "draft" });
      setupBlueprint("deprecated");

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(422);
    });

    it("approved → deployed without changeRef: requires change reference", async () => {
      setupAuthSession({ role: "admin" });
      setupBody({ status: "deployed" }); // no changeRef
      setupBlueprint("approved");

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(400);
    });

    it("rejected → in_review: cannot re-submit rejected", async () => {
      setupAuthSession({ role: "admin" });
      setupBody({ status: "in_review" });
      setupBlueprint("rejected");

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(422);
    });
  });

  // ─── Role-based access control ──────────────────────────────────────────

  describe("role enforcement", () => {
    it("rejects unauthenticated requests", async () => {
      setupAuthError("UNAUTHORIZED");
      setupBody({ status: "in_review" });

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(401);
    });

    it("rejects viewer role (not in allowed roles)", async () => {
      setupAuthError("FORBIDDEN");
      setupBody({ status: "in_review" });

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(403);
    });

    it("blocks designer from submitting to in_review (only architects can)", async () => {
      setupAuthSession({ role: "designer" });
      setupBody({ status: "in_review" });
      setupBlueprint("draft");

      const res = await callStatus(makeRequest("PATCH"));
      // Route requires architect or admin for in_review transitions
      expect(res.status).toBe(403);
    });

    it("blocks designer from deploying (only reviewers/admins can)", async () => {
      setupAuthSession({ role: "designer" });
      setupBody({ status: "deployed", changeRef: "CHG-001" });
      setupBlueprint("approved");

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(403);
    });
  });

  // ─── Separation of Duties (SOD) ────────────────────────────────────────

  describe("SOD enforcement (legacy single-step)", () => {
    it("blocks self-approval when creator = reviewer in legacy mode", async () => {
      // Fixed: SOD enforcement now applies in BOTH multi-step and legacy modes.
      // Creator of a blueprint cannot approve their own work.
      setupAuthSession({ role: "reviewer", email: "designer@acme.com" });
      setupBody({ status: "approved" });
      setupBlueprint("in_review", { createdBy: "designer@acme.com" });
      mockGetEnterpriseSettings.mockResolvedValue(makeSettings({ allowSelfApproval: false }));

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(403);
    });

    it("allows self-approval when allowSelfApproval is true", async () => {
      setupAuthSession({ role: "reviewer", email: "designer@acme.com" });
      setupBody({ status: "approved" });
      setupBlueprint("in_review", { createdBy: "designer@acme.com" });
      mockGetEnterpriseSettings.mockResolvedValue(makeSettings({ allowSelfApproval: true }));

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(200);
    });

    it("allows approval when reviewer is not the creator", async () => {
      setupAuthSession({ role: "reviewer", email: "reviewer@acme.com" });
      setupBody({ status: "approved" });
      setupBlueprint("in_review", { createdBy: "designer@acme.com" });
      mockGetEnterpriseSettings.mockResolvedValue(makeSettings({ allowSelfApproval: false }));

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(200);
    });
  });

  // ─── Enterprise scope ──────────────────────────────────────────────────

  describe("enterprise scope", () => {
    it("blocks cross-enterprise access", async () => {
      setupAuthSession({ role: "designer", enterpriseId: "ent-002" });
      setupBody({ status: "in_review" });
      setupBlueprint("draft", { enterpriseId: "ent-001" });
      setupEnterpriseDenied();

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(403);
    });

    it("returns 404 for nonexistent blueprint", async () => {
      setupAuthSession({ role: "admin" });
      setupBody({ status: "in_review" });
      selectResult.mockReturnValue([]); // no blueprint found

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(404);
    });
  });

  // ─── Governance validation gate (draft → in_review) ───────────────────

  describe("governance validation gate", () => {
    it("blocks submission when validation has error-severity violations", async () => {
      setupAuthSession({ role: "architect" });
      setupBody({ status: "in_review" });
      setupBlueprint("draft");
      mockValidateBlueprint.mockResolvedValue({
        violations: [{ policyId: "pol-001", severity: "error", message: "Violation" }],
        policyCount: 5,
      });

      const res = await callStatus(makeRequest("PATCH"));
      // Should block — 422 INVALID_STATE
      expect(res.status).toBe(422);
    });

    it("allows submission when validation passes cleanly", async () => {
      setupAuthSession({ role: "architect" });
      setupBody({ status: "in_review" });
      setupBlueprint("draft");
      mockValidateBlueprint.mockResolvedValue({
        violations: [],
        policyCount: 5,
      });

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(200);
    });
  });

  // ─── Test-pass gate ───────────────────────────────────────────────────

  describe("test-pass gate", () => {
    it("blocks in_review submission when requireTestsBeforeApproval is set and no passing test run exists", async () => {
      setupAuthSession({ role: "architect" });
      setupBody({ status: "in_review" });
      setupBlueprint("draft");
      // Clean validation so we reach the test-pass gate
      mockValidateBlueprint.mockResolvedValue({ violations: [], policyCount: 5 });
      mockGetEnterpriseSettings.mockResolvedValue(
        makeSettings({ requireTestsBeforeApproval: true })
      );
      // No passing test runs — findFirst returns undefined (default)
      mockDb.query.blueprintTestRuns.findFirst.mockResolvedValue(undefined);

      const res = await callStatus(makeRequest("PATCH"));
      // 422 VALIDATION_ERROR
      expect(res.status).toBe(422);
    });

    it("allows in_review submission when a passing test run exists", async () => {
      setupAuthSession({ role: "architect" });
      setupBody({ status: "in_review" });
      setupBlueprint("draft");
      mockValidateBlueprint.mockResolvedValue({ violations: [], policyCount: 5 });
      mockGetEnterpriseSettings.mockResolvedValue(
        makeSettings({ requireTestsBeforeApproval: true })
      );
      // Passing test run exists
      mockDb.query.blueprintTestRuns.findFirst.mockResolvedValue({
        id: "run-001",
        blueprintId: "bp-001",
        status: "passed",
        startedAt: new Date(),
      });

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(200);
    });
  });

  // ─── Multi-step approval chain ────────────────────────────────────────

  describe("multi-step approval chain", () => {
    const twoStepChain = [
      { step: 0, role: "reviewer" as const, label: "Technical Review" },
      { step: 1, role: "compliance_officer" as const, label: "Compliance Review" },
    ];

    it("advances to next step on non-final approval", async () => {
      setupAuthSession({ role: "reviewer", email: "reviewer@acme.com" });
      setupBody({ status: "approved", comment: "Step 1 OK" });
      setupBlueprint("in_review", {
        createdBy: "designer@acme.com",
        currentApprovalStep: 0,
        approvalProgress: [],
      });
      mockGetEnterpriseSettings.mockResolvedValue(
        makeSettings({ approvalChain: twoStepChain })
      );

      const res = await callStatus(makeRequest("PATCH"));
      const body = await responseJson(res);

      expect(res.status).toBe(200);
      expect(body).toHaveProperty("nextStep", 1);
      expect(body).toHaveProperty("status", "in_review");
    });

    it("transitions to approved on final step", async () => {
      setupAuthSession({ role: "compliance_officer", email: "compliance@acme.com" });
      setupBody({ status: "approved", comment: "Final approval" });
      setupBlueprint("in_review", {
        createdBy: "designer@acme.com",
        currentApprovalStep: 1,
        approvalProgress: [{
          step: 0,
          role: "reviewer",
          label: "Technical Review",
          approvedBy: "reviewer@acme.com",
          approvedAt: new Date().toISOString(),
          decision: "approved",
          comment: null,
        }],
      });
      mockGetEnterpriseSettings.mockResolvedValue(
        makeSettings({ approvalChain: twoStepChain })
      );

      const res = await callStatus(makeRequest("PATCH"));
      const body = await responseJson(res);

      expect(res.status).toBe(200);
      expect(body).toHaveProperty("status", "approved");
    });

    it("rejects at any step with terminal rejection", async () => {
      setupAuthSession({ role: "reviewer", email: "reviewer@acme.com" });
      setupBody({ status: "rejected", comment: "Does not meet requirements" });
      setupBlueprint("in_review", {
        createdBy: "designer@acme.com",
        currentApprovalStep: 0,
        approvalProgress: [],
      });
      mockGetEnterpriseSettings.mockResolvedValue(
        makeSettings({ approvalChain: twoStepChain })
      );

      const res = await callStatus(makeRequest("PATCH"));
      const body = await responseJson(res);

      expect(res.status).toBe(200);
      expect(body).toHaveProperty("status", "rejected");
    });

    it("blocks wrong role for current step", async () => {
      // Compliance officer tries to approve step 0 (requires reviewer)
      setupAuthSession({ role: "compliance_officer", email: "compliance@acme.com" });
      setupBody({ status: "approved" });
      setupBlueprint("in_review", {
        createdBy: "designer@acme.com",
        currentApprovalStep: 0,
        approvalProgress: [],
      });
      mockGetEnterpriseSettings.mockResolvedValue(
        makeSettings({ approvalChain: twoStepChain })
      );

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(403);
    });
  });

  // ─── Deployment side-effects ──────────────────────────────────────────

  describe("deployment side-effects", () => {
    it("schedules periodic review when enabled", async () => {
      setupAuthSession({ role: "admin" });
      setupBody({ status: "deployed", changeRef: "CHG-002" });
      setupBlueprint("approved");
      mockGetEnterpriseSettings.mockResolvedValue(
        makeSettings({ periodicReviewEnabled: true, periodicReviewCadenceMonths: 6 })
      );

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(200);
      // Should call getEnterpriseSettings to check periodicReview
      expect(mockGetEnterpriseSettings).toHaveBeenCalled();
    });

    it("stores baseline validation report at approval time", async () => {
      setupAuthSession({ role: "reviewer", email: "reviewer@acme.com" });
      setupBody({ status: "approved" });
      const report = makeValidationReport();
      setupBlueprint("in_review", {
        createdBy: "designer@acme.com",
        validationReport: report,
      });

      const res = await callStatus(makeRequest("PATCH"));
      expect(res.status).toBe(200);
      // The update call should include baselineValidationReport
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // ─── Audit logging ────────────────────────────────────────────────────

  describe("audit logging", () => {
    it("writes audit log entry on successful transition", async () => {
      setupAuthSession({ role: "reviewer", email: "reviewer@acme.com" });
      setupBody({ status: "approved" });
      setupBlueprint("in_review", { createdBy: "designer@acme.com" });

      await callStatus(makeRequest("PATCH"));

      // db.insert is called for audit log
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("publishes event on successful transition", async () => {
      setupAuthSession({ role: "reviewer", email: "reviewer@acme.com" });
      setupBody({ status: "approved" });
      setupBlueprint("in_review", { createdBy: "designer@acme.com" });

      await callStatus(makeRequest("PATCH"));

      expect(mockPublishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            type: expect.stringContaining("blueprint."),
          }),
        })
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. POST /api/blueprints/[id]/review
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/blueprints/[id]/review", () => {
  const callReview = (request: Request, id = "bp-001") =>
    reviewRoute.POST(request as any, makeParams(id));

  function setupBody(body: { action: string; comment?: string }) {
    mockParseBody.mockResolvedValue({ data: body, error: null });
  }

  function setupBlueprint(overrides: Record<string, unknown> = {}) {
    const bp = makeBlueprint({ status: "in_review", ...overrides });
    selectResult.mockReturnValue([bp]);
    updateResult.mockReturnValue([{
      id: bp.id,
      status: overrides.status ?? "approved",
      reviewComment: null,
      reviewedAt: new Date(),
    }]);
    return bp;
  }

  describe("legacy single-step review", () => {
    it("approve: transitions to approved", async () => {
      setupAuthSession({ role: "reviewer", email: "reviewer@acme.com" });
      setupBody({ action: "approve" });
      setupBlueprint({ createdBy: "designer@acme.com" });

      const res = await callReview(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/review"));
      expect(res.status).toBe(200);
    });

    it("reject: transitions to rejected", async () => {
      setupAuthSession({ role: "reviewer", email: "reviewer@acme.com" });
      setupBody({ action: "reject", comment: "Not ready" });
      setupBlueprint({ createdBy: "designer@acme.com" });

      const res = await callReview(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/review"));
      expect(res.status).toBe(200);
    });

    it("request_changes: transitions back to draft", async () => {
      setupAuthSession({ role: "reviewer", email: "reviewer@acme.com" });
      setupBody({ action: "request_changes", comment: "Please fix naming" });
      setupBlueprint({ createdBy: "designer@acme.com" });

      const res = await callReview(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/review"));
      expect(res.status).toBe(200);
    });

    it("request_changes without comment: returns 400", async () => {
      setupAuthSession({ role: "reviewer" });
      setupBody({ action: "request_changes" });
      setupBlueprint();

      const res = await callReview(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/review"));
      expect(res.status).toBe(400);
    });
  });

  describe("access control", () => {
    it("rejects unauthenticated requests", async () => {
      setupAuthError("UNAUTHORIZED");
      const res = await callReview(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/review"));
      expect(res.status).toBe(401);
    });

    it("rejects blueprint not in review state", async () => {
      setupAuthSession({ role: "reviewer" });
      setupBody({ action: "approve" });
      const bp = makeBlueprint({ status: "draft" });
      selectResult.mockReturnValue([bp]);

      const res = await callReview(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/review"));
      expect(res.status).toBe(422);
    });

    it("blocks cross-enterprise access", async () => {
      setupAuthSession({ role: "reviewer", enterpriseId: "ent-002" });
      setupBody({ action: "approve" });
      setupBlueprint({ enterpriseId: "ent-001" });
      setupEnterpriseDenied();

      const res = await callReview(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/review"));
      expect(res.status).toBe(403);
    });
  });

  describe("multi-step approval via review", () => {
    const twoStepChain = [
      { step: 0, role: "reviewer" as const, label: "Technical Review" },
      { step: 1, role: "compliance_officer" as const, label: "Compliance Review" },
    ];

    it("advances step on non-final approval", async () => {
      setupAuthSession({ role: "reviewer", email: "reviewer@acme.com" });
      setupBody({ action: "approve" });
      setupBlueprint({
        createdBy: "designer@acme.com",
        currentApprovalStep: 0,
        approvalProgress: [],
      });
      mockGetEnterpriseSettings.mockResolvedValue(
        makeSettings({ approvalChain: twoStepChain })
      );

      const res = await callReview(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/review"));
      const body = await responseJson(res);

      expect(res.status).toBe(200);
      expect(body).toHaveProperty("nextStep", 1);
    });

    it("SOD blocks self-approval in multi-step chain", async () => {
      setupAuthSession({ role: "reviewer", email: "designer@acme.com" });
      setupBody({ action: "approve" });
      setupBlueprint({
        createdBy: "designer@acme.com",
        currentApprovalStep: 0,
        approvalProgress: [],
      });
      mockGetEnterpriseSettings.mockResolvedValue(
        makeSettings({ approvalChain: twoStepChain, allowSelfApproval: false })
      );

      const res = await callReview(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/review"));
      expect(res.status).toBe(403);
    });
  });

  // ─── Governance enforcement (ADR-019) + transaction atomicity (ADR-021) ─────
  //
  // These tests lock in the two production-readiness invariants shipped in
  // session 148 that were originally deferred from the lifecycle test suite:
  //
  //   C2 — An approval cannot succeed while the stored validation report still
  //        contains error-severity violations, unless an admin explicitly
  //        overrides with `governanceOverride: true` + a ≥20-char reason. The
  //        override path emits a second audit row (`blueprint.approved.override`).
  //
  //   C3 — The status flip + primary audit + optional override audit share a
  //        single `db.transaction(...)`. If any audit insert throws, the
  //        route's outer try/catch converts the error to a 500 INTERNAL_ERROR
  //        response and `publishEvent` is never called — the post-commit
  //        event dispatcher cannot observe a rolled-back approval.
  //
  describe("governance enforcement (ADR-019) + transaction atomicity (ADR-021)", () => {
    /** A stored validation report with one error-severity blocker. */
    function makeBlockingReport() {
      return {
        valid: false,
        policyCount: 3,
        evaluatedPolicyIds: ["pol-gdpr", "pol-soc2", "pol-hipaa"],
        generatedAt: "2026-04-17T00:00:00.000Z",
        violations: [
          {
            policyId: "pol-gdpr",
            policyName: "GDPR Data Minimization",
            ruleId: "gdpr-001",
            field: "capabilities.dataAccess.personalData",
            operator: "!=",
            severity: "error" as const,
            message: "Agent must not access personal data without explicit consent",
            suggestion: "Add consent check to dataAccess config",
          },
        ],
      };
    }

    it("blocks reviewer approval when error-severity violations remain (no override)", async () => {
      setupAuthSession({ role: "reviewer", email: "reviewer@acme.com" });
      setupBody({ action: "approve" });
      const bp = makeBlueprint({
        status: "in_review",
        createdBy: "designer@acme.com",
        validationReport: makeBlockingReport(),
      });
      selectResult.mockReturnValue([bp]);

      const res = await callReview(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/review"));
      const body = await responseJson(res);

      // 409 GOVERNANCE_BLOCKED, not 403 / 422 — so clients can distinguish
      // this from auth / state-machine failures and surface override UI.
      expect(res.status).toBe(409);
      expect(body.code).toBe("GOVERNANCE_BLOCKED");
      // Violation detail is returned so the reviewer can see what to fix.
      expect(body.details?.violations).toHaveLength(1);
      expect(body.details?.violations[0]).toMatchObject({
        policyId: "pol-gdpr",
        ruleId: "gdpr-001",
        severity: "error",
      });
      // Non-admins do not see the override affordance.
      expect(body.details?.overrideAvailable).toBe(false);
      // Short-circuit: no update, no audit, no event.
      expect(mockDb.update).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(mockPublishEvent).not.toHaveBeenCalled();
    });

    it("blocks non-admin approval even when governanceOverride flag is sent", async () => {
      setupAuthSession({ role: "reviewer", email: "reviewer@acme.com" });
      setupBody({
        action: "approve",
        governanceOverride: true,
        overrideReason: "I say we should ship this now regardless of policy",
      } as { action: string; comment?: string });
      const bp = makeBlueprint({
        status: "in_review",
        createdBy: "designer@acme.com",
        validationReport: makeBlockingReport(),
      });
      selectResult.mockReturnValue([bp]);

      const res = await callReview(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/review"));
      const body = await responseJson(res);

      // Override is admin-only — a reviewer with the flag set is still blocked.
      expect(res.status).toBe(409);
      expect(body.code).toBe("GOVERNANCE_BLOCKED");
      expect(body.details?.overrideAvailable).toBe(false);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("admin override with valid reason approves and emits both audit rows", async () => {
      setupAuthSession({ role: "admin", email: "admin@acme.com" });
      setupBody({
        action: "approve",
        governanceOverride: true,
        overrideReason: "Legal has accepted residual GDPR risk for this pilot cohort.",
      } as { action: string; comment?: string });
      const bp = makeBlueprint({
        status: "in_review",
        createdBy: "designer@acme.com",
        validationReport: makeBlockingReport(),
      });
      selectResult.mockReturnValue([bp]);
      updateResult.mockReturnValue([{
        id: bp.id,
        status: "approved",
        reviewComment: null,
        reviewedAt: new Date("2026-04-17T12:00:00.000Z"),
      }]);

      const res = await callReview(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/review"));

      expect(res.status).toBe(200);
      // Entered the transaction exactly once.
      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
      // Two audit inserts: blueprint.reviewed + blueprint.approved.override.
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
      // The chained `.values(...)` mock is shared across both insert calls
      // (mockReturnValue returns the same object each call), so its
      // mock.calls array contains both payloads in order: [reviewed, override].
      const insertFirstResult = (mockDb.insert as unknown as { mock: { results: Array<{ value: { values: ReturnType<typeof vi.fn> } }> } }).mock.results[0].value;
      const reviewedValues = insertFirstResult.values.mock.calls[0][0] as Record<string, unknown>;
      const overrideValues = insertFirstResult.values.mock.calls[1][0] as Record<string, unknown>;
      expect(reviewedValues).toMatchObject({
        action: "blueprint.reviewed",
        actorEmail: "admin@acme.com",
        actorRole: "admin",
      });
      expect((reviewedValues.metadata as Record<string, unknown>).governanceOverride).toBe(true);
      expect(overrideValues).toMatchObject({
        action: "blueprint.approved.override",
        actorEmail: "admin@acme.com",
        actorRole: "admin",
        entityId: "bp-001",
      });
      const overrideMeta = overrideValues.metadata as { reason: string; blockers: Array<{ policyId: string }> };
      expect(overrideMeta.reason).toContain("residual GDPR risk");
      expect(overrideMeta.blockers).toHaveLength(1);
      expect(overrideMeta.blockers[0].policyId).toBe("pol-gdpr");
      // Post-commit event still fires on the happy override path.
      expect(mockPublishEvent).toHaveBeenCalled();
    });

    it("rolls back: audit insert throws → 500 INTERNAL_ERROR, publishEvent never called", async () => {
      setupAuthSession({ role: "reviewer", email: "reviewer@acme.com" });
      setupBody({ action: "approve" });
      // Clean validation report — governance check passes, we want to exercise
      // the transaction atomicity path specifically, not the block path.
      const bp = makeBlueprint({
        status: "in_review",
        createdBy: "designer@acme.com",
        validationReport: { valid: true, policyCount: 3, evaluatedPolicyIds: [], generatedAt: "2026-04-17T00:00:00.000Z", violations: [] },
      });
      selectResult.mockReturnValue([bp]);
      updateResult.mockReturnValue([{
        id: bp.id,
        status: "approved",
        reviewComment: null,
        reviewedAt: new Date(),
      }]);

      // Force the audit insert inside the transaction to throw. The route
      // wraps `db.transaction` in an outer try/catch that converts any
      // throw to a 500 response. `publishEvent` runs AFTER the transaction
      // resolves, so a thrown insert must prevent it entirely.
      (mockDb.insert as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
        values: () => {
          throw new Error("simulated audit write failure");
        },
      }));

      const res = await callReview(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/review"));
      const body = await responseJson(res);

      expect(res.status).toBe(500);
      expect(body.code).toBe("INTERNAL_ERROR");
      // Transaction was entered (ADR-021: status flip + audit are bundled).
      expect(mockDb.transaction).toHaveBeenCalled();
      // Critical: post-commit event dispatch must never observe a
      // rolled-back transaction. If publishEvent fires here, downstream
      // consumers (webhooks, email, audit mirrors) would be told a
      // blueprint was approved that has no durable audit record.
      expect(mockPublishEvent).not.toHaveBeenCalled();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. POST /api/blueprints/[id]/validate
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/blueprints/[id]/validate", () => {
  const callValidate = (request: Request, id = "bp-001") =>
    validateRoute.POST(request as any, makeParams(id));

  function setupBlueprint(overrides: Record<string, unknown> = {}) {
    const bp = makeBlueprint({ status: "draft", ...overrides });
    selectResult.mockReturnValue([bp]);
    return bp;
  }

  it("runs validation and returns report", async () => {
    setupAuthSession({ role: "architect" });
    const report = makeValidationReport({ policyCount: 5, violations: [] });
    mockValidateBlueprint.mockResolvedValue(report);
    setupBlueprint();

    const res = await callValidate(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/validate"));
    const body = await responseJson(res);

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("report");
    expect(mockValidateBlueprint).toHaveBeenCalled();
  });

  it("persists validation report to DB", async () => {
    setupAuthSession({ role: "architect" });
    mockValidateBlueprint.mockResolvedValue(makeValidationReport());
    setupBlueprint();

    await callValidate(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/validate"));

    expect(mockDb.update).toHaveBeenCalled();
  });

  it("returns 404 for nonexistent blueprint", async () => {
    setupAuthSession({ role: "architect" });
    selectResult.mockReturnValue([]);

    const res = await callValidate(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/validate"));
    expect(res.status).toBe(404);
  });

  it("blocks cross-enterprise access", async () => {
    setupAuthSession({ role: "architect", enterpriseId: "ent-002" });
    setupBlueprint({ enterpriseId: "ent-001" });
    setupEnterpriseDenied();

    const res = await callValidate(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/validate"));
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. POST /api/blueprints/[id]/deploy/agentcore
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/blueprints/[id]/deploy/agentcore", () => {
  const callDeploy = (request: Request, id = "bp-001") =>
    deployRoute.POST(request as any, makeParams(id));

  function setupBlueprint(overrides: Record<string, unknown> = {}) {
    const bp = makeBlueprint({ status: "approved", ...overrides });
    selectResult.mockReturnValue([bp]);
    updateResult.mockReturnValue([{ ...bp, status: "deployed" }]);
    return bp;
  }

  it("deploys approved blueprint and returns deployment record", async () => {
    setupAuthSession({ role: "admin" });
    setupBlueprint();
    mockGetEnterpriseSettings.mockResolvedValue(
      makeSettings({ agentcoreEnabled: true })
    );

    const res = await callDeploy(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/deploy/agentcore"));
    const body = await responseJson(res);

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("success", true);
    expect(body).toHaveProperty("deployment");
    expect(mockDeployToAgentCore).toHaveBeenCalled();
  });

  it("rejects non-approved blueprint", async () => {
    setupAuthSession({ role: "admin" });
    setupBlueprint({ status: "draft" });
    // override selectResult for the actual status check
    const bp = makeBlueprint({ status: "draft" });
    selectResult.mockReturnValue([bp]);

    const res = await callDeploy(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/deploy/agentcore"));
    expect(res.status).toBe(422);
  });

  it("rejects when AgentCore is not configured", async () => {
    setupAuthSession({ role: "admin" });
    setupBlueprint();
    mockGetEnterpriseSettings.mockResolvedValue(makeSettings()); // no agentcore config

    const res = await callDeploy(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/deploy/agentcore"));
    expect(res.status).toBe(400);
  });

  it("returns 502 when AWS deploy fails", async () => {
    setupAuthSession({ role: "admin" });
    setupBlueprint();
    mockGetEnterpriseSettings.mockResolvedValue(
      makeSettings({ agentcoreEnabled: true })
    );
    mockDeployToAgentCore.mockRejectedValue(new Error("AWS Bedrock API timeout"));

    const res = await callDeploy(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/deploy/agentcore"));
    expect(res.status).toBe(502);
  });

  it("returns 404 for nonexistent blueprint", async () => {
    setupAuthSession({ role: "admin" });
    selectResult.mockReturnValue([]);

    const res = await callDeploy(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/deploy/agentcore"));
    expect(res.status).toBe(404);
  });

  it("blocks cross-enterprise access", async () => {
    setupAuthSession({ role: "reviewer", enterpriseId: "ent-002" });
    setupBlueprint({ enterpriseId: "ent-001" });
    setupEnterpriseDenied();

    const res = await callDeploy(makeRequest("POST", "http://localhost:3000/api/blueprints/bp-001/deploy/agentcore"));
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. POST /api/blueprints — Create (generate from intake session)
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/blueprints (generate)", () => {
  const callCreate = (request: Request) =>
    blueprintsRoute.POST(request as any);

  function setupBody(body: { sessionId: string }) {
    mockParseBody.mockResolvedValue({ data: body, error: null });
  }

  it("generates blueprint from completed intake session", async () => {
    setupAuthSession({ role: "architect" });
    setupBody({ sessionId: "session-001" });
    findFirstResult.mockReturnValue(makeIntakeSession());
    insertResult.mockReturnValue([makeBlueprint({ status: "draft", sessionId: "session-001" })]);

    const res = await callCreate(makeRequest("POST", "http://localhost:3000/api/blueprints"));
    const body = await responseJson(res);

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("abp");
    expect(mockGenerateBlueprint).toHaveBeenCalled();
    expect(mockValidateBlueprint).toHaveBeenCalled();
  });

  it("returns 404 for nonexistent session", async () => {
    setupAuthSession({ role: "architect" });
    setupBody({ sessionId: "session-999" });
    findFirstResult.mockReturnValue(undefined);

    const res = await callCreate(makeRequest("POST", "http://localhost:3000/api/blueprints"));
    expect(res.status).toBe(404);
  });

  it("rejects non-completed session", async () => {
    setupAuthSession({ role: "architect" });
    setupBody({ sessionId: "session-001" });
    findFirstResult.mockReturnValue(makeIntakeSession({ status: "in_progress" }));

    const res = await callCreate(makeRequest("POST", "http://localhost:3000/api/blueprints"));
    expect(res.status).toBe(422);
  });

  it("blocks cross-enterprise session access", async () => {
    setupAuthSession({ role: "architect", enterpriseId: "ent-002" });
    setupBody({ sessionId: "session-001" });
    findFirstResult.mockReturnValue(makeIntakeSession({ enterpriseId: "ent-001" }));
    setupEnterpriseDenied();

    const res = await callCreate(makeRequest("POST", "http://localhost:3000/api/blueprints"));
    expect(res.status).toBe(403);
  });

  it("enforces rate limiting", async () => {
    setupAuthSession({ role: "architect" });
    const rateLimitResponse = { status: 429 };
    mockRateLimit.mockResolvedValue(rateLimitResponse);

    const res = await callCreate(makeRequest("POST", "http://localhost:3000/api/blueprints"));
    expect(res.status).toBe(429);
  });
});
