/**
 * GET /api/templates
 *
 * Returns the template catalog: static built-in templates merged with
 * DB-backed community/enterprise templates (H3-4.1 Template Marketplace).
 *
 * Supports query params: q (name search), category, riskTier, source
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templates as templatesTable } from "@/lib/db/schema";
import { and, eq, or, isNull, ilike, desc } from "drizzle-orm";
import { BLUEPRINT_TEMPLATES } from "@/lib/templates/blueprint-templates";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const riskTier = searchParams.get("riskTier") ?? "";
  const source = searchParams.get("source") ?? "";

  // Static built-in templates (no auth required, backward-compatible)
  let staticTemplates = BLUEPRINT_TEMPLATES.map(({ id, name, description, category: cat, governanceTier, tags }) => ({
    id,
    name,
    description,
    category: cat,
    riskTier: governanceTier ?? null,
    governanceTier,
    tags,
    source: "built-in",
    rating: null,
    usageCount: 0,
    author: null,
    publishedAt: null,
  }));

  // Filter static templates
  if (search) staticTemplates = staticTemplates.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
  if (category) staticTemplates = staticTemplates.filter((t) => t.category === category);
  if (riskTier) staticTemplates = staticTemplates.filter((t) => t.riskTier === riskTier);
  if (source && source !== "built-in") staticTemplates = [];

  // DB-backed community/enterprise templates
  let dbTemplates: typeof templatesTable.$inferSelect[] = [];
  try {
    const conditions = [isNull(templatesTable.enterpriseId)]; // community = global
    if (search) conditions.push(ilike(templatesTable.name, `%${search}%`));
    if (category) conditions.push(eq(templatesTable.category, category));
    if (riskTier) conditions.push(eq(templatesTable.riskTier, riskTier));
    if (source) conditions.push(eq(templatesTable.source, source));

    dbTemplates = await db.query.templates.findMany({
      where: and(...conditions),
      orderBy: [desc(templatesTable.usageCount), desc(templatesTable.rating)],
    });
  } catch {
    // DB unavailable — fall back to static only
  }

  return NextResponse.json({ templates: [...staticTemplates, ...dbTemplates] });
}
