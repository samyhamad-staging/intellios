/**
 * SLA configuration for review workflow stages.
 *
 * Thresholds reflect common financial services model governance expectations
 * under SR 11-7 / DORA frameworks. Override via environment variables to
 * match enterprise policy.
 *
 * All values in hours.
 */

/** Time in `in_review` before showing an amber "approaching SLA" indicator */
export const SLA_REVIEW_WARN_HOURS =
  Number(process.env.SLA_REVIEW_WARN_HOURS ?? 48);

/** Time in `in_review` before showing a red "SLA breach" indicator */
export const SLA_REVIEW_ALERT_HOURS =
  Number(process.env.SLA_REVIEW_ALERT_HOURS ?? 72);

/**
 * Classify a card's time-in-stage for visual SLA treatment.
 *
 * @param updatedAt  ISO timestamp of last status change (when it entered in_review)
 * @param status     Current lifecycle status
 * @returns  "warn" | "alert" | "ok"
 */
export function getSlaStatus(
  updatedAt: string,
  status: string
): "warn" | "alert" | "ok" {
  if (status !== "in_review") return "ok";

  const hoursElapsed =
    (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60);

  if (hoursElapsed >= SLA_REVIEW_ALERT_HOURS) return "alert";
  if (hoursElapsed >= SLA_REVIEW_WARN_HOURS) return "warn";
  return "ok";
}
