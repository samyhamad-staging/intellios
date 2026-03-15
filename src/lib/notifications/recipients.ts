/**
 * Recipient resolution — looks up users by role and enterprise to determine
 * who should receive a notification for a given lifecycle event.
 */

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq, inArray, isNull, or } from "drizzle-orm";

/**
 * Returns emails of all active reviewers and compliance officers
 * in the given enterprise scope (or platform-wide if enterpriseId is null).
 *
 * Admin users are intentionally excluded — they have the dashboard for
 * portfolio oversight and should not be flooded with per-blueprint events.
 */
export async function getReviewerEmails(
  enterpriseId: string | null
): Promise<string[]> {
  const enterpriseFilter = enterpriseId
    ? eq(users.enterpriseId, enterpriseId)
    : isNull(users.enterpriseId);

  const rows = await db
    .select({ email: users.email })
    .from(users)
    .where(
      and(
        enterpriseFilter,
        inArray(users.role, ["reviewer", "compliance_officer"])
      )
    );

  return rows.map((r) => r.email);
}

/**
 * Returns emails of all compliance officers in the given enterprise scope.
 * Used for deployment notifications — compliance officers need visibility
 * into production promotions.
 */
export async function getComplianceOfficerEmails(
  enterpriseId: string | null
): Promise<string[]> {
  const enterpriseFilter = enterpriseId
    ? eq(users.enterpriseId, enterpriseId)
    : isNull(users.enterpriseId);

  const rows = await db
    .select({ email: users.email })
    .from(users)
    .where(and(enterpriseFilter, eq(users.role, "compliance_officer")));

  return rows.map((r) => r.email);
}

/**
 * Returns emails of all users with a specific role in the given enterprise.
 * Used for multi-step approval workflow notifications (Phase 22) — notifies
 * all users with the required role when an approval step becomes active.
 */
export async function getUsersByRole(
  role: string,
  enterpriseId: string | null
): Promise<string[]> {
  const enterpriseFilter = enterpriseId
    ? eq(users.enterpriseId, enterpriseId)
    : isNull(users.enterpriseId);

  const rows = await db
    .select({ email: users.email })
    .from(users)
    .where(and(enterpriseFilter, eq(users.role, role)));

  return rows.map((r) => r.email);
}

/**
 * Returns admin emails — used for critical alerts (future: SLA breaches,
 * governance failures on deployed agents).
 */
export async function getAdminEmails(
  enterpriseId: string | null
): Promise<string[]> {
  // Admins are either platform-wide (no enterprise) or enterprise admins
  const rows = await db
    .select({ email: users.email })
    .from(users)
    .where(
      and(
        eq(users.role, "admin"),
        enterpriseId
          ? or(eq(users.enterpriseId, enterpriseId), isNull(users.enterpriseId))
          : isNull(users.enterpriseId)
      )
    );

  return rows.map((r) => r.email);
}
