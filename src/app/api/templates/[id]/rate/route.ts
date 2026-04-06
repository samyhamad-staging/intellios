import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templates, templateRatings } from "@/lib/db/schema";
import { eq, avg } from "drizzle-orm";
import { z } from "zod";
import { parseBody } from "@/lib/parse-body";
import { requireAuth } from "@/lib/auth/require";

const TemplateRatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

/** POST /api/templates/[id]/rate — submit or update a rating (1-5) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const { data: body, error: bodyError } = await parseBody(request, TemplateRatingSchema);
  if (bodyError) return bodyError;

  const rating = body.rating;
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
