import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions } from "@/lib/db/schema";

export async function POST() {
  try {
    const [session] = await db.insert(intakeSessions).values({}).returning();
    return NextResponse.json(session);
  } catch (error) {
    console.error("Failed to create intake session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
