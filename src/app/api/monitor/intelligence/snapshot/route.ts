import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { apiError, ErrorCode } from "@/lib/errors";
import { runMetricsSnapshot } from "@/lib/awareness/metrics-worker";
import { detectAnomalies, getPreviousSnapshot } from "@/lib/awareness/anomaly-detector";

/**
 * POST /api/monitor/intelligence/snapshot
 *
 * Runs a full metrics aggregation pass, writes a system_health_snapshots row,
 * runs anomaly detection, and returns the snapshot + detected anomalies.
 *
 * Roles: compliance_officer | admin
 */
export async function POST(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["compliance_officer", "admin"]);
  if (error) return error;
  void getRequestId(request);

  try {
    const enterpriseId = authSession.user.enterpriseId ?? null;

    const snapshot = await runMetricsSnapshot(enterpriseId);
    const previous = await getPreviousSnapshot(snapshot);
    const anomalies = await detectAnomalies(snapshot, previous);

    return NextResponse.json({ snapshot, anomalies });
  } catch (err) {
    console.error("[POST /api/monitor/intelligence/snapshot]", err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to run metrics snapshot");
  }
}
