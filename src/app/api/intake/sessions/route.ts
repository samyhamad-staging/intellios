import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions } from "@/lib/db/schema";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";

export async function POST() {
  const { session: authSession, error } = await requireAuth(["designer", "admin"]);
  if (error) return error;

  try {
    const [session] = await db
      .insert(intakeSessions)
      .values({ createdBy: authSession.user.email ?? null })
      .returning();
    return NextResponse.json(session);
  } catch (error) {
    console.error("Failed to create intake session:", error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to create session");
  }
}
