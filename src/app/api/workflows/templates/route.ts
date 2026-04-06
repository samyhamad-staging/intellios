/**
 * GET /api/workflows/templates
 *
 * Returns the workflow template library. Supports optional search query.
 * Templates are static (no DB) — they provide pre-built orchestration
 * patterns that users can instantiate as new workflows.
 */

import { NextRequest, NextResponse } from "next/server";
import { WORKFLOW_TEMPLATES, searchTemplates, getTemplateCategories } from "@/lib/workflows/templates";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";

  let templates = q ? searchTemplates(q) : [...WORKFLOW_TEMPLATES];

  if (category) {
    templates = templates.filter((t) => t.category === category);
  }

  return NextResponse.json({
    templates,
    categories: getTemplateCategories(),
    total: templates.length,
  });
}
