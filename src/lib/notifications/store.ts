/**
 * Notification store — DB write layer for in-app notifications.
 * Called by the lifecycle event handler; never directly from route handlers.
 */

import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

export interface NotificationInput {
  recipientEmail: string;
  enterpriseId: string | null;
  type: string;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  link: string | null;
}

/**
 * Persist an in-app notification. Errors are logged but never thrown —
 * notification failure must never interrupt a primary workflow operation.
 */
export async function createNotification(input: NotificationInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      recipientEmail: input.recipientEmail,
      enterpriseId: input.enterpriseId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
      link: input.link,
    });
  } catch (err) {
    console.error("[notifications] Failed to write notification:", err, input);
  }
}

/**
 * Return the most recent notifications for a user (latest 20).
 */
export async function getNotificationsForUser(email: string) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientEmail, email))
    .orderBy(desc(notifications.createdAt))
    .limit(20);
}

/**
 * Count unread notifications for a user.
 */
export async function getUnreadCount(email: string): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.recipientEmail, email), eq(notifications.read, false)));
  return rows.length;
}

/**
 * Mark all notifications for a user as read.
 */
export async function markAllRead(email: string): Promise<void> {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.recipientEmail, email), eq(notifications.read, false)));
}
