import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/parse-body";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";

const TestIntegrationSchema = z.object({
  adapter: z.enum(["slack", "teams", "servicenow", "jira"]),
  config: z.record(z.string(), z.string()),
});

/**
 * POST /api/admin/integrations/test
 *
 * P2-532: Tests connectivity for a given integration adapter.
 *
 * Body: { adapter: "slack" | "teams" | "servicenow" | "jira", config: Record<string, string> }
 *
 * - Slack / Teams: sends a test POST to the webhookUrl with a test message.
 * - ServiceNow:    performs a GET to /api/now/table/sys_user?sysparm_limit=1 with Basic auth.
 * - Jira:          performs a GET to /rest/api/3/myself with Basic auth.
 *
 * Returns: { ok: true, message: string } | { ok: false, error: string }
 */

export async function POST(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["admin"]);
  if (error) return error;
  void authSession;

  const requestId = getRequestId(request);
  const { data: body, error: bodyError } = await parseBody(request, TestIntegrationSchema);
  if (bodyError) return bodyError;

  const { adapter, config } = body;

  try {
    switch (adapter) {
      case "slack":
      case "teams": {
        const url = config.webhookUrl ?? config.url ?? "";
        if (!url || !url.startsWith("https://")) {
          return NextResponse.json({ ok: false, error: "Webhook URL is required and must start with https://" });
        }
        const payload = adapter === "slack"
          ? { text: "✅ Intellios integration test — connection verified." }
          : {
              "@type": "MessageCard",
              "@context": "http://schema.org/extensions",
              text: "✅ Intellios integration test — connection verified.",
            };
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok || res.status === 200) {
          return NextResponse.json({ ok: true, message: `Test message sent — ${adapter === "slack" ? "check your Slack channel" : "check your Teams channel"}. HTTP ${res.status}.` });
        }
        return NextResponse.json({ ok: false, error: `Webhook returned HTTP ${res.status}. Check the URL and channel permissions.` });
      }

      case "servicenow": {
        const instanceUrl = (config.instanceUrl ?? "").replace(/\/$/, "");
        const username = config.username ?? "";
        const password = config.password ?? "";
        if (!instanceUrl) {
          return NextResponse.json({ ok: false, error: "Instance URL is required." });
        }
        if (!username) {
          return NextResponse.json({ ok: false, error: "Username is required." });
        }
        const testUrl = `${instanceUrl}/api/now/table/sys_user?sysparm_limit=1&sysparm_fields=user_name`;
        const res = await fetch(testUrl, {
          headers: {
            Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
            Accept: "application/json",
          },
        });
        if (res.status === 200) {
          return NextResponse.json({ ok: true, message: `ServiceNow connection verified at ${instanceUrl}.` });
        }
        if (res.status === 401) {
          return NextResponse.json({ ok: false, error: "Authentication failed — check username and password." });
        }
        return NextResponse.json({ ok: false, error: `ServiceNow returned HTTP ${res.status}.` });
      }

      case "jira": {
        const baseUrl = (config.baseUrl ?? "").replace(/\/$/, "");
        const email = config.email ?? "";
        const apiToken = config.apiToken ?? "";
        if (!baseUrl) {
          return NextResponse.json({ ok: false, error: "Base URL is required." });
        }
        if (!email || !apiToken) {
          return NextResponse.json({ ok: false, error: "Email and API token are required." });
        }
        const testUrl = `${baseUrl}/rest/api/3/myself`;
        const res = await fetch(testUrl, {
          headers: {
            Authorization: `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`,
            Accept: "application/json",
          },
        });
        if (res.status === 200) {
          const data = await res.json();
          return NextResponse.json({ ok: true, message: `Jira connected as ${data.displayName ?? email}.` });
        }
        if (res.status === 401) {
          return NextResponse.json({ ok: false, error: "Authentication failed — check email and API token." });
        }
        return NextResponse.json({ ok: false, error: `Jira returned HTTP ${res.status}.` });
      }

      default:
        return NextResponse.json({ ok: false, error: `Unknown adapter: ${adapter}` }, { status: 400 });
    }
  } catch (err) {
    console.error(`[${requestId}] Integration test failed for ${adapter}:`, err);
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? `Connection error: ${err.message}` : "Connection failed — check the URL and credentials.",
    });
  }
}
