import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templates, templateRatings } from "@/lib/db/schema";
import { eq, avg } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require";

/** POST /api/templates/[id]/rate — submit or update a rating (1-5) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const rating = Number(body.rating);
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
  }

  const userEmail = session.user.email!;

  // Upsert rating
  await db
    .insert(templateRatings)
    .values({ templateId: id, userEmail, rating })
    .onConflictDoUpdate({
      target: [templateRatings.templateId, templateRatings.userEmail],
      set: { rating },
    });

  // Recompute average
  const result = await db
    .select({ avg: avg(templateRatings.rating) })
    .from(templateRatings)
    .where(eq(templateRatings.templateId, id));

  const newAvg = Number(result[0]?.avg ?? 0);
  await db.update(templates).set({ rating: newAvg }).where(eq(templates.id, id));

  return NextResponse.json({ rating: newAvg });
}
