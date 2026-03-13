/**
 * Lifecycle event → in-app notification handler.
 *
 * This module registers itself with the event bus on import (side-effect).
 * It is imported by src/lib/audit/log.ts so that it is guaranteed to be
 * registered whenever writeAuditLog is used.
 *
 * Notification routing logic:
 *
 *   blueprint.status_changed → in_review   → notify reviewers + compliance officers
 *   blueprint.status_changed → approved    → notify designer
 *   blueprint.status_changed → rejected    → notify designer
 *   blueprint.status_changed → deployed    → notify designer + compliance officers
 *   blueprint.reviewed (request_changes)   → notify designer
 *
 * The actorEmail is always excluded from their own notifications.
 *
 * For events carrying blueprint data, `metadata.createdBy`, `metadata.agentName`,
 * and `metadata.agentId` must be present (set by the originating route handlers).
 */

import { registerHandler } from "@/lib/events/bus";
import type { LifecycleEvent } from "@/lib/events/types";
import { createNotification } from "./store";
import { getReviewerEmails, getComplianceOfficerEmails } from "./recipients";
import { sendEmail, buildNotificationEmail } from "./email";

interface Meta {
  createdBy?: string | null;
  agentName?: string | null;
  agentId?: string | null;
  reviewAction?: string | null;
  comment?: string | null;
}

async function handleLifecycleEvent(event: LifecycleEvent): Promise<void> {
  const meta = (event.metadata ?? {}) as Meta;
  const agentName = meta.agentName ?? "A blueprint";
  const agentId = meta.agentId;
  const link = agentId ? `/registry/${agentId}` : null;

  // ── blueprint.status_changed ─────────────────────────────────────────────
  if (event.type === "blueprint.status_changed") {
    const toStatus = (event.toState?.status as string) ?? "";

    if (toStatus === "in_review") {
      // Notify all reviewers + compliance officers in the enterprise
      const recipients = await getReviewerEmails(event.enterpriseId);
      const title = "Blueprint submitted for review";
      const message = `${agentName} was submitted for review by ${event.actorEmail}`;

      for (const email of recipients) {
        if (email === event.actorEmail) continue; // don't self-notify
        await createNotification({
          recipientEmail: email,
          enterpriseId: event.enterpriseId,
          type: "blueprint.submitted",
          title,
          message,
          entityType: event.entityType,
          entityId: event.entityId,
          link,
        });
        void sendEmail({
          to: email,
          subject: `[Intellios] ${title}`,
          html: buildNotificationEmail(title, message, link),
        });
      }
      return;
    }

    if (toStatus === "approved") {
      const createdBy = meta.createdBy;
      if (createdBy && createdBy !== event.actorEmail) {
        const title = "Blueprint approved";
        const message = `${agentName} was approved by ${event.actorEmail} and is ready to deploy`;
        await createNotification({
          recipientEmail: createdBy,
          enterpriseId: event.enterpriseId,
          type: "blueprint.approved",
          title,
          message,
          entityType: event.entityType,
          entityId: event.entityId,
          link,
        });
        void sendEmail({
          to: createdBy,
          subject: `[Intellios] ${title}`,
          html: buildNotificationEmail(title, message, link),
        });
      }
      return;
    }

    if (toStatus === "rejected") {
      const createdBy = meta.createdBy;
      if (createdBy && createdBy !== event.actorEmail) {
        const title = "Blueprint rejected";
        const message = `${agentName} was rejected by ${event.actorEmail}`;
        await createNotification({
          recipientEmail: createdBy,
          enterpriseId: event.enterpriseId,
          type: "blueprint.rejected",
          title,
          message,
          entityType: event.entityType,
          entityId: event.entityId,
          link,
        });
        void sendEmail({
          to: createdBy,
          subject: `[Intellios] ${title}`,
          html: buildNotificationEmail(title, message, link),
        });
      }
      return;
    }

    if (toStatus === "deployed") {
      // Notify the designer
      const createdBy = meta.createdBy;
      if (createdBy && createdBy !== event.actorEmail) {
        const title = "Agent deployed to production";
        const message = `${agentName} was deployed to production by ${event.actorEmail}`;
        await createNotification({
          recipientEmail: createdBy,
          enterpriseId: event.enterpriseId,
          type: "blueprint.deployed",
          title,
          message,
          entityType: event.entityType,
          entityId: event.entityId,
          link,
        });
        void sendEmail({
          to: createdBy,
          subject: `[Intellios] ${title}`,
          html: buildNotificationEmail(title, message, link),
        });
      }

      // Also notify compliance officers
      const complianceOfficers = await getComplianceOfficerEmails(event.enterpriseId);
      for (const email of complianceOfficers) {
        if (email === event.actorEmail || email === createdBy) continue;
        const title = "Agent deployed to production";
        const message = `${agentName} was deployed by ${event.actorEmail}`;
        await createNotification({
          recipientEmail: email,
          enterpriseId: event.enterpriseId,
          type: "blueprint.deployed",
          title,
          message,
          entityType: event.entityType,
          entityId: event.entityId,
          link,
        });
        void sendEmail({
          to: email,
          subject: `[Intellios] ${title}`,
          html: buildNotificationEmail(title, message, link),
        });
      }
      return;
    }
  }

  // ── blueprint.reviewed ───────────────────────────────────────────────────
  if (event.type === "blueprint.reviewed") {
    const createdBy = meta.createdBy;
    const reviewAction = meta.reviewAction as string | undefined;
    const comment = meta.comment;

    if (!createdBy || createdBy === event.actorEmail) return;

    const MESSAGES: Record<string, { title: string; body: string }> = {
      approve: {
        title: "Blueprint approved",
        body: `${agentName} was approved and is ready to deploy`,
      },
      reject: {
        title: "Blueprint rejected",
        body: `${agentName} was rejected by ${event.actorEmail}`,
      },
      request_changes: {
        title: "Changes requested on your blueprint",
        body: `${agentName} was returned for changes by ${event.actorEmail}`,
      },
    };

    const template = reviewAction
      ? (MESSAGES[reviewAction] ?? { title: "Blueprint reviewed", body: `${agentName} was reviewed` })
      : { title: "Blueprint reviewed", body: `${agentName} was reviewed` };

    const fullMessage = comment
      ? `${template.body}. Comment: "${comment}"`
      : template.body;

    await createNotification({
      recipientEmail: createdBy,
      enterpriseId: event.enterpriseId,
      type: `blueprint.${reviewAction ?? "reviewed"}`,
      title: template.title,
      message: fullMessage,
      entityType: event.entityType,
      entityId: event.entityId,
      link,
    });
    void sendEmail({
      to: createdBy,
      subject: `[Intellios] ${template.title}`,
      html: buildNotificationEmail(template.title, fullMessage, link),
    });
  }
}

// Register with event bus on module initialization (side-effect).
// This runs once per Next.js worker process when this module is first imported.
registerHandler(handleLifecycleEvent);
