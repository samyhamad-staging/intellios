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

/**
 * Build a stakeholder invitation email.
 * Sent when a designer invites an external stakeholder to contribute
 * requirements via the public collaboration workspace.
 */
export function buildInvitationEmail(
  inviteeName: string | null,
  sessionName: string,
  domain: string,
  raciRole: string,
  roleTitle: string | null,
  contributionUrl: string,
  expiresAt: Date
): string {
  const greeting = inviteeName ? `Hi ${escapeHtml(inviteeName)},` : "Hello,";
  const roleDisplay = roleTitle ? escapeHtml(roleTitle) : capitalizeFirst(raciRole);
  const domainDisplay = escapeHtml(domain.replace(/_/g, " "));
  const expiryDisplay = expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const authorityNote: Record<string, string> = {
    accountable: "Your input carries final decision-making authority for this domain.",
    responsible: "Your input will shape the delivery requirements for this domain.",
    consulted: "Your expert input will be incorporated into the agent requirements.",
    informed: "Your feedback helps ensure the agent aligns with your team's needs.",
  };
  const authority = authorityNote[raciRole] ?? authorityNote.consulted;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; padding: 32px; max-width: 560px;">
  <h2 style="margin: 0 0 8px; font-size: 18px; font-weight: 600;">You've been invited to contribute AI agent requirements</h2>
  <p style="margin: 0 0 24px; font-size: 15px; color: #444; line-height: 1.5;">${greeting}</p>
  <p style="margin: 0 0 16px; font-size: 15px; color: #444; line-height: 1.5;">
    You've been invited as <strong>${roleDisplay}</strong> to provide <strong>${domainDisplay}</strong> requirements
    for the agent design project: <strong>${escapeHtml(sessionName)}</strong>.
  </p>
  <p style="margin: 0 0 24px; font-size: 14px; color: #666; line-height: 1.5;">${escapeHtml(authority)}</p>
  <a href="${escapeHtml(contributionUrl)}" style="display: inline-block; background: #7c3aed; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500;">Add My Input →</a>
  <p style="margin: 24px 0 0; font-size: 12px; color: #9ca3af;">
    This link expires on ${escapeHtml(expiryDisplay)}. No Intellios account required.
  </p>
  <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;">
  <p style="margin: 0; font-size: 12px; color: #9ca3af;">Intellios — Enterprise Agent Factory</p>
</body>
</html>
  `.trim();
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
