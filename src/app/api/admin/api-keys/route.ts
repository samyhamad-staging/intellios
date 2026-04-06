import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiKeys, auditLog } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require";
import { parseBody } from "@/lib/parse-body";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const VALID_SCOPES = [
  "blueprints:read", "blueprints:write",
  "policies:read", "policies:write",
  "registry:read", "telemetry:write",
  "compliance:read",
];

// P1-SEC-005 FIX: Proper Zod schema instead of unchecked type assertion
const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(200).transform((s) => s.trim()),
  scopes: z.array(z.enum([
    "blueprints:read", "blueprints:write",
    "policies:read", "policies:write",
    "registry:read", "telemetry:write",
    "compliance:read",
  ])).default([]),
});

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

  // P1-SEC-005 FIX: Use parseBody + Zod instead of raw request.json() with type assertion
  const { data: body, error: bodyError } = await parseBody(request, CreateApiKeySchema);
  if (bodyError) return bodyError;

  const enterpriseId = session.user.enterpriseId ?? null;

  // Generate key: ik_live_<32 random hex chars>
  const rawKey = `ik_live_${randomBytes(16).toString("hex")}`;
  const keyPrefix = rawKey.substring(0, 12); // "ik_live_xxxx"
  const keyHash = await bcrypt.hash(rawKey, 10);

  const [created] = await db
    .insert(apiKeys)
    .values({
      enterpriseId,
      name: body.name,
      keyHash,
      keyPrefix,
      scopes: body.scopes,
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
