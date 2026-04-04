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
import { getReviewerEmails, getComplianceOfficerEmails, getUsersByRole } from "./recipients";
import { sendEmail, buildNotificationEmail } from "./email";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";

interface Meta {
  createdBy?: string | null;
  agentName?: string | null;
  agentId?: string | null;
  reviewAction?: string | null;
  /** Alias used by blueprint.reviewed events (payload field is 'decision') */
  decision?: string | null;
  comment?: string | null;
  // Health check fields (blueprint.health_checked events)
  healthStatus?: string | null;
  previousStatus?: string | null;
  errorCount?: number | null;
  // Multi-step approval fields (blueprint.approval_step_completed events)
  completedStep?: number | null;
  label?: string | null;
  // Intake contribution + invitation fields
  domain?: string | null;
  inviteeEmail?: string | null;
  raciRole?: string | null;
  sessionCreatedBy?: string | null;
}

async function handleLifecycleEvent(event: LifecycleEvent): Promise<void> {
  const meta = (event.metadata ?? {}) as Meta;
  const agentName = meta.agentName ?? "A blueprint";
  const agentId = meta.agentId;
  const link = agentId ? `/registry/${agentId}` : null;

  // Load enterprise settings once — used to gate email sending and resolve adminEmail.
  const settings = await getEnterpriseSettings(event.enterpriseId);
  const emailEnabled = settings.notifications.notifyOnApproval;
  const adminEmail = settings.notifications.adminEmail ?? null;

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
        if (emailEnabled) {
          void sendEmail({
            to: email,
            subject: `[Intellios] ${title}`,
            html: buildNotificationEmail(title, message, link),
          });
        }
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
        if (emailEnabled) {
          void sendEmail({
            to: createdBy,
            subject: `[Intellios] ${title}`,
            html: buildNotificationEmail(title, message, link),
          });
          // CC admin when configured
          if (adminEmail && adminEmail !== createdBy && adminEmail !== event.actorEmail) {
            void sendEmail({
              to: adminEmail,
              subject: `[Intellios] ${title}`,
              html: buildNotificationEmail(title, message, link),
            });
          }
        }
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
        if (emailEnabled) {
          void sendEmail({
            to: createdBy,
            subject: `[Intellios] ${title}`,
            html: buildNotificationEmail(title, message, link),
          });
        }
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
        if (emailEnabled) {
          void sendEmail({
            to: createdBy,
            subject: `[Intellios] ${title}`,
            html: buildNotificationEmail(title, message, link),
          });
          // CC admin when configured
          if (adminEmail && adminEmail !== createdBy && adminEmail !== event.actorEmail) {
            void sendEmail({
              to: adminEmail,
              subject: `[Intellios] ${title}`,
              html: buildNotificationEmail(title, message, link),
            });
          }
        }
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
        if (emailEnabled) {
          void sendEmail({
            to: email,
            subject: `[Intellios] ${title}`,
            html: buildNotificationEmail(title, message, link),
          });
        }
      }
      return;
    }
  }

  // ── blueprint.reviewed ───────────────────────────────────────────────────
  // P1-251: Notify blueprint creator on approval / rejection / change request.
  // The event payload uses 'decision' but older code used 'reviewAction' — accept both.
  if (event.type === "blueprint.reviewed") {
    const createdBy = meta.createdBy;
    const reviewAction = (meta.reviewAction ?? meta.decision) as string | undefined;
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
    if (emailEnabled) {
      void sendEmail({
        to: createdBy,
        subject: `[Intellios] ${template.title}`,
        html: buildNotificationEmail(template.title, fullMessage, link),
      });
    }
  }

  // ── blueprint.approval_step_completed ────────────────────────────────────
  // Notify all users with the next required role that a blueprint is awaiting
  // their approval step. Also notify the designer of their blueprint's progress.
  if (event.type === "blueprint.approval_step_completed") {
    const toState = event.toState as Record<string, unknown> | null;
    const nextApproverRole = toState?.nextApproverRole as string | undefined;
    const nextApproverLabel = toState?.nextApproverLabel as string | undefined;
    const nextStep = (toState?.step as number | undefined) ?? 0;
    const completedStep = (meta.completedStep as number | undefined) ?? 0;
    const completedLabel = meta.label ?? "previous step";

    // Notify next-step reviewers
    if (nextApproverRole) {
      const recipients = await getUsersByRole(nextApproverRole, event.enterpriseId);
      const title = `Blueprint awaiting ${nextApproverLabel ?? "your review"}`;
      const message = `${agentName} completed step "${completedLabel}" and is now awaiting step ${nextStep + 1} (${nextApproverLabel ?? nextApproverRole}) approval`;

      for (const email of recipients) {
        if (email === event.actorEmail) continue;
        await createNotification({
          recipientEmail: email,
          enterpriseId: event.enterpriseId,
          type: "blueprint.approval_step_pending",
          title,
          message,
          entityType: event.entityType,
          entityId: event.entityId,
          link,
        });
        if (emailEnabled) {
          void sendEmail({
            to: email,
            subject: `[Intellios] ${title}`,
            html: buildNotificationEmail(title, message, link),
          });
        }
      }
    }

    // Notify the designer that their blueprint advanced a step
    const createdBy = meta.createdBy;
    if (createdBy && createdBy !== event.actorEmail) {
      const designerTitle = "Your blueprint advanced in review";
      const designerMessage = nextApproverLabel
        ? `${agentName} passed step ${completedStep + 1} ("${completedLabel}") and is now awaiting step ${nextStep + 1} (${nextApproverLabel})`
        : `${agentName} passed step ${completedStep + 1} ("${completedLabel}") and is now in final review`;
      await createNotification({
        recipientEmail: createdBy,
        enterpriseId: event.enterpriseId,
        type: "blueprint.approval_step_pending",
        title: designerTitle,
        message: designerMessage,
        entityType: event.entityType,
        entityId: event.entityId,
        link,
      });
      if (emailEnabled) {
        void sendEmail({
          to: createdBy,
          subject: `[Intellios] ${designerTitle}`,
          html: buildNotificationEmail(designerTitle, designerMessage, link),
        });
      }
    }

    return;
  }

  // ── blueprint.periodic_review_completed ──────────────────────────────────
  if (event.type === "blueprint.periodic_review_completed") {
    const complianceOfficers = await getComplianceOfficerEmails(event.enterpriseId);
    const title = "Periodic review completed";
    const message = `${agentName} periodic review was completed by ${event.actorEmail}. Next review scheduled.`;

    for (const email of complianceOfficers) {
      if (email === event.actorEmail) continue;
      await createNotification({
        recipientEmail: email,
        enterpriseId: event.enterpriseId,
        type: "blueprint.periodic_review_completed",
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

  // ── blueprint.health_checked ─────────────────────────────────────────────
  // Notify compliance officers only on clean↔critical transitions to prevent
  // alert fatigue from repeated health checks with no status change.
  if (event.type === "blueprint.health_checked") {
    const prev    = meta.previousStatus as string | undefined;
    const current = meta.healthStatus   as string | undefined;
    const errors  = (meta.errorCount as number | undefined) ?? 0;

    const degraded = prev !== "critical" && current === "critical";
    const restored = prev === "critical" && current === "clean";
    if (!degraded && !restored) return;

    const complianceOfficers = await getComplianceOfficerEmails(event.enterpriseId);
    const title   = degraded
      ? "Deployed agent needs governance review"
      : "Deployed agent governance restored";
    const message = degraded
      ? `"${agentName}" has ${errors} governance error(s) after a policy change. Review and remediate to restore compliance.`
      : `"${agentName}" now passes all governance checks.`;
    const type    = degraded ? "deployment.health_degraded" : "deployment.health_restored";

    for (const email of complianceOfficers) {
      await createNotification({
        recipientEmail: email,
        enterpriseId:   event.enterpriseId,
        type,
        title,
        message,
        entityType: event.entityType,
        entityId:   event.entityId,
        link,
      });
      void sendEmail({
        to:      email,
        subject: `[Intellios] ${title}`,
        html:    buildNotificationEmail(title, message, link),
      });
    }
    return;
  }

  // ── intake.contribution_submitted ────────────────────────────────────────
  // Notify the session designer that a stakeholder has submitted requirements.
  if (event.type === "intake.contribution_submitted") {
    const designerEmail = meta.sessionCreatedBy ?? null;
    if (!designerEmail || designerEmail === event.actorEmail) return;

    const domain = (meta.domain as string | undefined) ?? "a domain";
    const raciRole = (meta.raciRole as string | undefined) ?? "stakeholder";
    const title = "Stakeholder contribution received";
    const message = `${event.actorEmail} (${raciRole}) submitted ${domain} requirements. The AI orchestrator is updating insights.`;

    await createNotification({
      recipientEmail: designerEmail,
      enterpriseId: event.enterpriseId,
      type: "intake.contribution_submitted",
      title,
      message,
      entityType: event.entityType,
      entityId: event.entityId,
      link: `/intake/${event.entityId}`,
    });
    return;
  }
}

// Register with event bus on module initialization (side-effect).
// This runs once per Next.js worker process when this module is first imported.
registerHandler(handleLifecycleEvent);
