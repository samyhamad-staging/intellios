import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiKeys, auditLog } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(["admin"]);
  if (error) return error;

  const { id } = await params;
  const enterpriseId = session.user.enterpriseId ?? null;

  const key = await db.query.apiKeys.findFirst({
    where: and(
      eq(apiKeys.id, id),
      isNull(apiKeys.revokedAt),
      enterpriseId ? eq(apiKeys.enterpriseId, enterpriseId) : isNull(apiKeys.enterpriseId)
    ),
  });

  if (!key) return NextResponse.json({ error: "API key not found" }, { status: 404 });

  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(eq(apiKeys.id, id));

  await db.insert(auditLog).values({
    actorEmail: session.user.email!,
    actorRole: session.user.role!,
    action: "api_key.revoked",
    entityType: "api_key",
    entityId: id,
    enterpriseId,
    metadata: { name: key.name },
  });

  return NextResponse.json({ ok: true });
}
