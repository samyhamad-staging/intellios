import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions } from "@/lib/db/schema";
import { apiError, ErrorCode } from "@/lib/errors";

export async function POST() {
  try {
    const [session] = await db.insert(intakeSessions).values({}).returning();
    return NextResponse.json(session);
  } catch (error) {
    console.error("Failed to create intake session:", error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to create session");
  }
}
