/**
 * Optional email delivery via Resend (https://resend.com).
 * No-ops gracefully if RESEND_API_KEY is not set — the in-app notification
 * is always created regardless of email delivery status.
 *
 * To enable:
 *   1. Add RESEND_API_KEY=re_... to .env.local
 *   2. Set NOTIFICATION_FROM_EMAIL=notifications@yourdomain.com
 *   3. Optionally set NOTIFICATION_APP_URL=https://intellios.example.com
 */

const RESEND_API_URL = "https://api.resend.com/emails";

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email via Resend. Silently no-ops if RESEND_API_KEY is absent.
 * Errors are logged but never thrown.
 */
export async function sendEmail(params: EmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // email delivery is optional

  const from =
    process.env.NOTIFICATION_FROM_EMAIL ?? "Intellios <noreply@intellios.app>";

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[email] Resend API error:", res.status, text);
    }
  } catch (err) {
    console.error("[email] Failed to send email:", err);
  }
}

/**
 * Build a simple, readable HTML email for a lifecycle notification.
 */
export function buildNotificationEmail(
  title: string,
  message: string,
  link: string | null
): string {
  const appUrl = process.env.NOTIFICATION_APP_URL ?? "";
  const fullLink = link && appUrl ? `${appUrl}${link}` : null;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; padding: 32px; max-width: 560px;">
  <h2 style="margin: 0 0 8px; font-size: 18px; font-weight: 600;">${escapeHtml(title)}</h2>
  <p style="margin: 0 0 24px; font-size: 15px; color: #444; line-height: 1.5;">${escapeHtml(message)}</p>
  ${fullLink ? `<a href="${escapeHtml(fullLink)}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500;">View in Intellios →</a>` : ""}
  <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;">
  <p style="margin: 0; font-size: 12px; color: #9ca3af;">Intellios — Enterprise Agent Factory</p>
</body>
</html>
  `.trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
