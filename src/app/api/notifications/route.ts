import { NextRequest, NextResponse } from "next/server";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import {
  getNotificationsForUser,
  getUnreadCount,
  markAllRead,
} from "@/lib/notifications/store";

/**
 * GET /api/notifications
 * Returns the 20 most recent notifications for the authenticated user,
 * plus the current unread count.
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth([
    "designer",
    "reviewer",
    "compliance_officer",
    "admin",
  ]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const email = authSession.user.email!;
    const [items, unreadCount] = await Promise.all([
      getNotificationsForUser(email),
      getUnreadCount(email),
    ]);

    return NextResponse.json({ notifications: items, unreadCount });
  } catch (err) {
    console.error(`[${requestId}] Failed to fetch notifications:`, err);
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      "Failed to fetch notifications",
      undefined,
      requestId
    );
  }
}

/**
 * PATCH /api/notifications
 * Marks all notifications as read for the authenticated user.
 */
export async function PATCH(request: NextRequest) {
  const { session: authSession, error } = await requireAuth([
    "designer",
    "reviewer",
    "compliance_officer",
    "admin",
  ]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    await markAllRead(authSession.user.email!);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[${requestId}] Failed to mark notifications read:`, err);
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      "Failed to mark notifications read",
      undefined,
      requestId
    );
  }
}
