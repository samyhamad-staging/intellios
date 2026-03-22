import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, templates, auditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require";
import type { ABP } from "@/lib/types/abp";

/**
 * POST /api/templates/[id]/publish
 * [id] here is a blueprint ID — publishes the blueprint as a community template.
 * Strips enterprise-specific data before publishing.
 * Access: architect | admin
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(["architect", "admin"]);
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { name, description, category, tags } = body as {
    name?: string; description?: string; category?: string; tags?: string[];
  };

  const blueprint = await db.query.agentBlueprints.findFirst({
    where: eq(agentBlueprints.id, id),
  });
  if (!blueprint) {
    return NextResponse.json({ error: "Blueprint not found" }, { status: 404 });
  }
  if (session.user.role !== "admin" && blueprint.enterpriseId !== session.user.enterpriseId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const abp = blueprint.abp as ABP;

  // Strip enterprise-specific fields
  const sanitizedAbp = {
    ...abp,
    identity: { ...abp.identity, name: name ?? abp.identity?.name },
    enterpriseId: undefined,
  };

  const [template] = await db
    .insert(templates)
    .values({
      enterpriseId: null, // community templates are global
      name: name ?? blueprint.name ?? "Untitled Template",
      description: description ?? "",
      category: category ?? "",
      riskTier: (abp.governance as { riskTier?: string } | undefined)?.riskTier ?? null,
      abpTemplate: sanitizedAbp,
      tags: tags ?? blueprint.tags ?? [],
      source: "community",
      author: session.user.email!,
      publishedAt: new Date(),
    })
    .returning();

  await db.insert(auditLog).values({
    actorEmail: session.user.email!,
    actorRole: session.user.role!,
    action: "template.published",
    entityType: "blueprint",
    entityId: id,
    enterpriseId: blueprint.enterpriseId ?? null,
    metadata: { templateId: template.id, templateName: template.name },
  });

  return NextResponse.json({ template });
}
