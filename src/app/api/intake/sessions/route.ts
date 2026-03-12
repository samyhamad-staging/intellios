import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions } from "@/lib/db/schema";

export async function POST() {
  const [session] = await db.insert(intakeSessions).values({}).returning();
  return NextResponse.json(session);
}
