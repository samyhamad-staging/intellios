/**
 * GET /api/templates
 *
 * Public endpoint — returns the template catalog without ABP bodies.
 * No authentication required (templates are pre-built public starters).
 */

import { NextResponse } from "next/server";
import { BLUEPRINT_TEMPLATES } from "@/lib/templates/blueprint-templates";

export async function GET() {
  const templates = BLUEPRINT_TEMPLATES.map(({ id, name, description, category, governanceTier, tags }) => ({
    id,
    name,
    description,
    category,
    governanceTier,
    tags,
  }));

  return NextResponse.json({ templates });
}
