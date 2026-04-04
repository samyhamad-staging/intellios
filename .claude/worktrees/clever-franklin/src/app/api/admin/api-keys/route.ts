import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiKeys, auditLog } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const VALID_SCOPES = [
  "blueprints:read", "blueprints:write",
  "policies:read", "policies:write",
  "registry:read", "telemetry:write",
  "compliance:read",
];

export async function GET(_request: NextRequest) {
  const { session, error } = await requireAuth(["admin"]);
  if (error) return error;

  const enterpriseId = session.user.enterpriseId ?? null;

  const keys = await db.query.apiKeys.findMany({
    where: and(
      isNull(apiKeys.revokedAt),
      enterpriseId ? eq(apiKeys.enterpriseId, enterpriseId) : isNull(apiKeys.enterpriseId)
    ),
  });

  // Never return keyHash
  return NextResponse.json({
    keys: keys.map(({ keyHash: _keyHash, ...k }) => k),
    validScopes: VALID_SCOPES,
  });
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth(["admin"]);
  if (error) return error;

  const body = await request.json();
  const { name, scopes } = body as { name: string; scopes: string[] };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const invalidScopes = (scopes ?? []).filter((s: string) => !VALID_SCOPES.includes(s));
  if (invalidScopes.length > 0) {
    return NextResponse.json({ error: `Invalid scopes: ${invalidScopes.join(", ")}` }, { status: 400 });
  }

  const enterpriseId = session.user.enterpriseId ?? null;

  // Generate key: ik_live_<32 random hex chars>
  const rawKey = `ik_live_${randomBytes(16).toString("hex")}`;
  const keyPrefix = rawKey.substring(0, 12); // "ik_live_xxxx"
  const keyHash = await bcrypt.hash(rawKey, 10);

  const [created] = await db
    .insert(apiKeys)
    .values({
      enterpriseId,
      name: name.trim(),
      keyHash,
      keyPrefix,
      scopes: scopes ?? [],
      createdBy: session.user.email!,
    })
    .returning();

  await db.insert(auditLog).values({
    actorEmail: session.user.email!,
    actorRole: session.user.role!,
    action: "api_key.created",
    entityType: "api_key",
    entityId: created.id,
    enterpriseId,
    metadata: { name: created.name, scopes: created.scopes },
  });

  // Return the raw key ONCE — never stored in plaintext
  return NextResponse.json({
    key: rawKey,
    id: created.id,
    name: created.name,
    keyPrefix,
    scopes: created.scopes,
    createdAt: created.createdAt,
    warning: "Copy this key now — it will not be shown again.",
  });
}
