/**
 * POST /api/blueprints/from-template
 *
 * Express-lane blueprint generation: creates a blueprint directly from a
 * template with optional customizations, bypassing the full intake conversation.
 *
 * Flow:
 *  1. Resolve the built-in template by ID
 *  2. Deep-merge customizations on top of template ABP
 *  3. Create a minimal intake session (audit trail + FK constraint)
 *  4. Assemble full ABP with fresh metadata
 *  5. Run governance validation (post-generation, no probing)
 *  6. Persist to agent_blueprints
 *  7. Publish blueprint.created event
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, intakeSessions, auditLog } from "@/lib/db/schema";
import { findBlueprintTemplate } from "@/lib/templates/blueprint-templates";
import { validateBlueprint } from "@/lib/governance/validator";
import { loadPolicies } from "@/lib/governance/load-policies";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { publishEvent } from "@/lib/events/publish";
import { rateLimit } from "@/lib/rate-limit";
import { parseBody } from "@/lib/parse-body";
import { randomUUID } from "crypto";
import { z } from "zod";

// ── Request schema ───────────────────────────────────────────────────────────

const FromTemplateBody = z.object({
  templateId: z.string().min(1),
  customizations: z
    .object({
      identity: z
        .object({
          name: z.string().min(1),
          description: z.string().optional(),
          persona: z.string().optional(),
          branding: z
            .object({
              display_name: z.string().optional(),
              icon_url: z.string().optional(),
              color_primary: z.string().optional(),
              color_secondary: z.string().optional(),
            })
            .optional(),
        })
        .optional(),
      capabilities: z
        .object({
          tools: z
            .array(
              z.object({
                name: z.string(),
                type: z.enum(["api", "function", "mcp_server", "plugin"]),
                description: z.string().optional(),
                config: z.record(z.string(), z.unknown()).optional(),
              })
            )
            .optional(),
          instructions: z.string().optional(),
          knowledge_sources: z
            .array(
              z.object({
                name: z.string(),
                type: z.enum(["file", "database", "api", "vector_store"]),
                uri: z.string().optional(),
              })
            )
            .optional(),
        })
        .optional(),
      constraints: z
        .object({
          allowed_domains: z.array(z.string()).optional(),
          denied_actions: z.array(z.string()).optional(),
          max_tokens_per_response: z.number().optional(),
          rate_limits: z
            .object({
              requests_per_minute: z.number().optional(),
              requests_per_day: z.number().optional(),
            })
            .optional(),
        })
        .optional(),
      governance: z
        .object({
          policies: z
            .array(
              z.object({
                name: z.string(),
                type: z.enum(["safety", "compliance", "data_handling", "access_control", "audit"]),
                description: z.string().optional(),
                rules: z.array(z.string()).optional(),
              })
            )
            .optional(),
          audit: z
            .object({
              log_interactions: z.boolean().optional(),
              retention_days: z.number().optional(),
              pii_redaction: z.boolean().optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

// ── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["architect", "designer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  // Rate limit
  const rateLimitResponse = await rateLimit(authSession.user.email!, {
    endpoint: "generate",
    max: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  // Parse & validate body
  const { data: body, error: bodyError } = await parseBody(request, FromTemplateBody);
  if (bodyError) return bodyError;

  try {
    // 1. Resolve template
    const template = findBlueprintTemplate(body.templateId);
    if (!template) {
      return apiError(ErrorCode.NOT_FOUND, `Template "${body.templateId}" not found`);
    }

    // 2. Merge customizations on top of template ABP
    const custom = body.customizations ?? {};
    const templateAbp = template.abp;

    const mergedIdentity = custom.identity
      ? { ...templateAbp.identity, ...custom.identity }
      : templateAbp.identity;

    const mergedCapabilities = custom.capabilities
      ? {
          tools: custom.capabilities.tools ?? templateAbp.capabilities.tools,
          instructions: custom.capabilities.instructions ?? templateAbp.capabilities.instructions,
          knowledge_sources:
            custom.capabilities.knowledge_sources ?? templateAbp.capabilities.knowledge_sources,
        }
      : templateAbp.capabilities;

    const mergedConstraints = custom.constraints
      ? { ...templateAbp.constraints, ...custom.constraints }
      : templateAbp.constraints;

    const mergedGovernance = custom.governance
      ? {
          policies: custom.governance.policies ?? templateAbp.governance.policies,
          audit: custom.governance.audit
            ? { ...templateAbp.governance.audit, ...custom.governance.audit }
            : templateAbp.governance.audit,
        }
      : templateAbp.governance;

    const enterpriseId = authSession.user.enterpriseId ?? null;

    // 3. Create a minimal intake session for audit trail (agent_blueprints.session_id is NOT NULL)
    //    Status = "completed" so it shows correctly in the Design Studio list.
    //    intakePayload stores the merged customizations for provenance.
    const [stubSession] = await db
      .insert(intakeSessions)
      .values({
        enterpriseId,
        createdBy: authSession.user.email ?? "system",
        status: "completed",
        intakePayload: {
          _source: "express-lane",
          _templateId: template.id,
          _templateName: template.name,
          identity: mergedIdentity,
          capabilities: mergedCapabilities,
          constraints: mergedConstraints,
          governance: mergedGovernance,
        },
        intakeContext: {
          agentPurpose: mergedIdentity.description ?? template.description,
          deploymentType: templateAbp.ownership?.deploymentEnvironment === "production"
            ? "customer-facing" as const
            : "internal-only" as const,
          dataSensitivity: (templateAbp.ownership?.dataClassification === "regulated"
            ? "regulated"
            : templateAbp.ownership?.dataClassification ?? "internal") as "public" | "internal" | "confidential" | "pii" | "regulated",
          regulatoryScope: template.governanceTier === "critical"
            ? (["FINRA"] as ("FINRA" | "SOX" | "GDPR" | "HIPAA" | "PCI-DSS" | "none")[])
            : (["none"] as ("FINRA" | "SOX" | "GDPR" | "HIPAA" | "PCI-DSS" | "none")[]),
          integrationTypes: mergedCapabilities.tools.some((t: { type: string }) => t.type === "api")
            ? (["internal-apis"] as ("internal-apis" | "external-apis" | "databases" | "file-systems" | "none")[])
            : (["none"] as ("internal-apis" | "external-apis" | "databases" | "file-systems" | "none")[]),
          stakeholdersConsulted: ["none"] as ("legal" | "compliance" | "security" | "it" | "business-owner" | "none")[],
        },
      })
      .returning();

    // 4. Assemble full ABP
    const abp = {
      version: "1.1.0" as const,
      metadata: {
        id: randomUUID(),
        created_at: new Date().toISOString(),
        created_by: authSession.user.email ?? "system",
        status: "draft" as const,
        tags: templateAbp.metadata.tags ?? [],
        enterprise_id: enterpriseId ?? undefined,
      },
      identity: mergedIdentity,
      capabilities: mergedCapabilities,
      constraints: mergedConstraints,
      governance: mergedGovernance,
      execution: {},
    };

    // 5. Governance validation (post-generation, no intake probing)
    const policies = await loadPolicies(enterpriseId);
    const validationReport = await validateBlueprint(abp, enterpriseId, policies);

    // 6. Denormalize for registry search
    const name = abp.identity.name ?? null;
    const tags = (abp.metadata.tags ?? []) as string[];

    // 7. Persist blueprint
    const [blueprint] = await db
      .insert(agentBlueprints)
      .values({
        sessionId: stubSession.id,
        abp,
        name,
        tags,
        enterpriseId,
        validationReport,
        createdBy: authSession.user.email ?? null,
      })
      .returning();

    // Audit log
    try {
      await db.insert(auditLog).values({
        actorEmail: authSession.user.email!,
        actorRole: authSession.user.role!,
        action: "blueprint.created_from_template",
        entityType: "blueprint",
        entityId: blueprint.id,
        enterpriseId: enterpriseId ?? null,
        toState: {
          abp,
          status: blueprint.status,
        },
        metadata: {
          agentId: blueprint.agentId,
          name: blueprint.name,
          templateId: template.id,
          templateName: template.name,
        },
      });
    } catch (auditErr) {
      console.error(`[${requestId}] Failed to write audit log:`, auditErr);
    }

    // 8. Publish event
    await publishEvent({
      event: {
        type: "blueprint.created",
        payload: {
          blueprintId: blueprint.id,
          agentId: blueprint.agentId,
          name: blueprint.name ?? "",
          createdBy: authSession.user.email!,
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role },
      entity: { type: "blueprint", id: blueprint.id },
      enterpriseId,
    });

    return NextResponse.json({
      id: blueprint.id,
      agentId: blueprint.agentId,
      abp,
      validationReport,
      source: "express-lane",
      templateId: template.id,
    });
  } catch (err) {
    console.error(`[${requestId}] Express-lane generation failed:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to generate blueprint from template", undefined, requestId);
  }
}
