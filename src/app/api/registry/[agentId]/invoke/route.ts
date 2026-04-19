import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, auditLog } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { ALL_BLUEPRINT_COLUMNS } from "@/lib/db/safe-columns";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { rateLimit } from "@/lib/rate-limit";
import { parseBody } from "@/lib/parse-body";
import { publishEvent } from "@/lib/events/publish";
import { logger, serializeError } from "@/lib/logger";
import { z } from "zod";
import {
  invokeAgent,
  AgentNotDeployedError,
  AgentCoreInvokeError,
} from "@/lib/agentcore/invoke";
import type { AgentCoreDeploymentRecord } from "@/lib/agentcore/types";
import { createHash } from "node:crypto";

// Vercel function timeout — a 5-turn test is well under this, but streaming
// responses can easily occupy 20-40s for complex agents.
export const maxDuration = 60;

const InvokeBody = z.object({
  /** Client-generated session id (uuid). Scopes the Bedrock conversation. */
  sessionId: z.string().min(8).max(128),
  /** The user prompt. Hard-capped to keep Test Console out of bulk-ingest territory. */
  prompt: z.string().min(1).max(4000),
});

/**
 * POST /api/registry/[agentId]/invoke
 *
 * Reviewer-scoped Test Console invocation of a deployed agent (ADR-027).
 *
 * Access: reviewer, compliance_officer, admin. Designers and architects
 * cannot invoke — the same role set that cannot approve a deployment cannot
 * test a deployment.
 *
 * Rate limit: 10 invocations per minute per actor.
 *
 * Response: streamed text/plain body of response chunks. No transcript is
 * persisted server-side; the audit row records only the prompt hash.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { session: authSession, error } = await requireAuth([
    "reviewer",
    "compliance_officer",
    "admin",
  ]);
  if (error) return error;
  const requestId = getRequestId(request);

  // ADR-027 guardrail: per-actor rate limit
  const rateLimitResponse = await rateLimit(authSession.user.email!, {
    endpoint: "invoke",
    max: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { data: body, error: bodyError } = await parseBody(request, InvokeBody);
  if (bodyError) return bodyError;

  try {
    const { agentId } = await params;

    // Resolve the latest deployed version of the agent
    const [blueprint] = await db
      .select(ALL_BLUEPRINT_COLUMNS)
      .from(agentBlueprints)
      .where(
        and(
          eq(agentBlueprints.agentId, agentId),
          eq(agentBlueprints.status, "deployed")
        )
      )
      .orderBy(desc(agentBlueprints.createdAt))
      .limit(1);

    if (!blueprint) {
      return apiError(
        ErrorCode.AGENT_NOT_DEPLOYED,
        "No deployed version found for this agent. Deploy a blueprint to AgentCore first."
      );
    }

    const enterpriseError = assertEnterpriseAccess(
      blueprint.enterpriseId,
      authSession.user
    );
    if (enterpriseError) return enterpriseError;

    if (blueprint.deploymentTarget !== "agentcore") {
      return apiError(
        ErrorCode.AGENT_NOT_DEPLOYED,
        `Test Console supports AgentCore deployments only. This agent is deployed to '${
          blueprint.deploymentTarget ?? "(none)"
        }'.`
      );
    }

    const deployment = blueprint.deploymentMetadata as unknown as AgentCoreDeploymentRecord | null;
    if (!deployment || !deployment.agentId) {
      return apiError(
        ErrorCode.AGENT_NOT_DEPLOYED,
        "Deployment metadata is missing or incomplete for this agent."
      );
    }

    // ── Audit row (pre-stream, best-effort — never blocks the invoke) ────────
    // ADR-027: store prompt hash, not prompt content. Reviewer accountability
    // without server-side transcript retention.
    const promptHash = createHash("sha256")
      .update(body.sessionId + ":" + body.prompt)
      .digest("hex")
      .slice(0, 16);

    try {
      await db.insert(auditLog).values({
        actorEmail: authSession.user.email!,
        actorRole: authSession.user.role!,
        action: "blueprint.test_invoked",
        entityType: "blueprint",
        entityId: blueprint.id,
        enterpriseId: blueprint.enterpriseId ?? null,
        metadata: {
          agentId,
          bedrockAgentId: deployment.agentId,
          sessionId: body.sessionId,
          promptHash,
          promptLength: body.prompt.length,
        },
      });
    } catch (auditErr) {
      logger.error("audit.write.failed", {
        requestId,
        action: "blueprint.test_invoked",
        err: serializeError(auditErr),
      });
    }

    // Fire-and-forget event dispatch (non-blocking — stream should not wait).
    void publishEvent({
      event: {
        type: "blueprint.test_invoked",
        payload: {
          blueprintId: blueprint.id,
          agentId,
          bedrockAgentId: deployment.agentId,
          sessionId: body.sessionId,
          promptHash,
        },
      },
      actor: {
        email: authSession.user.email!,
        role: authSession.user.role!,
      },
      entity: { type: "blueprint", id: blueprint.id },
      enterpriseId: blueprint.enterpriseId ?? null,
    }).catch((eventErr) => {
      logger.error("event.dispatch.failed", {
        requestId,
        type: "blueprint.test_invoked",
        err: serializeError(eventErr),
      });
    });

    // ── Stream the response ──────────────────────────────────────────────────
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of invokeAgent(deployment, {
            sessionId: body.sessionId,
            prompt: body.prompt,
          })) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (err) {
          // Stream is already open — we can't swap to a JSON error response.
          // Push a terminal error marker the client can recognize, then close.
          if (err instanceof AgentNotDeployedError) {
            controller.enqueue(
              encoder.encode(
                `\n\n[error:AGENT_NOT_DEPLOYED] ${err.message}`
              )
            );
          } else if (err instanceof AgentCoreInvokeError) {
            controller.enqueue(
              encoder.encode(
                `\n\n[error:AGENTCORE_INVOKE_FAILED] ${err.message}`
              )
            );
          } else {
            controller.enqueue(
              encoder.encode(
                `\n\n[error:INTERNAL_ERROR] ${
                  err instanceof Error ? err.message : String(err)
                }`
              )
            );
          }
          logger.error("blueprint.test_invoked.stream.failed", {
            requestId,
            blueprintId: blueprint.id,
            agentId,
            err: serializeError(err),
          });
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Request-Id": requestId,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    logger.error("blueprint.test_invoked.failed", {
      requestId,
      err: serializeError(err),
    });
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      "Test Console invocation failed.",
      undefined,
      requestId
    );
  }
}
