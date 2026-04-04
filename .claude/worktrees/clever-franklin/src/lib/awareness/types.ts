/**
 * Phase 28: Awareness and Measurement System — shared types.
 *
 * These types mirror the database tables introduced in migration 0014.
 */

// ── Metrics Snapshot ─────────────────────────────────────────────────────────

export interface MetricsSnapshot {
  id: string;
  enterpriseId: string | null;
  snapshotAt: string;                  // ISO 8601
  qualityIndex: number | null;         // 0–100 composite
  blueprintValidityRate: number | null; // 0.0–1.0
  avgRefinements: number | null;
  reviewQueueDepth: number | null;
  slaComplianceRate: number | null;    // 0.0–1.0
  webhookSuccessRate: number | null;   // 0.0–1.0
  activePolicyCount: number | null;
  blueprintsGenerated24h: number | null;
  violations24h: number | null;
  rawMetrics: Record<string, unknown>;
}

// ── Quality Score Results ─────────────────────────────────────────────────────

export interface QualityScoreResult {
  id: string;
  blueprintId: string;
  enterpriseId: string | null;
  overallScore: number | null;           // 0–100
  intentAlignment: number | null;        // 1–5
  toolAppropriateness: number | null;
  instructionSpecificity: number | null;
  governanceAdequacy: number | null;
  ownershipCompleteness: number | null;
  flags: string[];
  evaluatorModel: string | null;
  evaluatedAt: string;                   // ISO 8601
}

export interface IntakeScoreResult {
  id: string;
  sessionId: string;
  enterpriseId: string | null;
  overallScore: number | null;
  breadthScore: number | null;
  ambiguityScore: number | null;
  riskIdScore: number | null;
  stakeholderScore: number | null;
  evaluatorModel: string | null;
  evaluatedAt: string;
}

// ── Anomaly Signals ───────────────────────────────────────────────────────────

export type AnomalySeverity = "attention" | "critical";

export interface AnomalySignal {
  metric: string;
  value: number | null;
  threshold: number;
  severity: AnomalySeverity;
  message: string;
}

// ── Briefing ──────────────────────────────────────────────────────────────────

export type HealthStatus = "nominal" | "attention" | "critical";

export interface BriefingSections {
  generationQuality: string;
  lifecycle: string;
  governance: string;
  system: string;
  attentionRequired: string[];  // individual action bullets
}

export interface BriefingResult {
  id: string;
  enterpriseId: string | null;
  briefingDate: string;        // YYYY-MM-DD
  content: string;             // full briefing text
  healthStatus: HealthStatus;
  generatedAt: string;         // ISO 8601
  metricsSnapshot: Record<string, unknown>;
  sections?: BriefingSections; // structured sections for rich rendering (new records only)
}

// ── Intelligence Page Payload (GET /api/monitor/intelligence) ─────────────────

export interface IntelligencePayload {
  latestBriefing: BriefingResult | null;
  briefingHistory: BriefingResult[];     // last 7 briefings, newest-first (includes latestBriefing)
  snapshots: MetricsSnapshot[];          // last 30, newest-first
  recentScores: QualityScoreResult[];    // last 10 blueprint quality scores
  recentIntakeScores: IntakeScoreResult[]; // last 10 intake quality scores
  kpis: {
    qualityIndex: number | null;
    qualityIndexDelta: number | null;    // vs. prior snapshot
    blueprintValidityRate: number | null;
    reviewQueueDepth: number | null;
    webhookSuccessRate: number | null;
  };
}
