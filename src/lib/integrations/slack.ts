import type { SlackConfig, TeamsConfig, IntegrationAdapter, IntegrationPayload, IntegrationResult } from "./adapter";

export class SlackAdapter implements IntegrationAdapter {
  name = "slack";

  constructor(private config: SlackConfig) {}

  async sendNotification(payload: IntegrationPayload): Promise<IntegrationResult> {
    if (!this.config.enabled) return { success: false, error: "Integration disabled" };

    const colorMap: Record<string, string> = {
      critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#6b7280"
    };

    const body = {
      ...(this.config.channel ? { channel: this.config.channel } : {}),
      attachments: [
        {
          color: colorMap[payload.severity ?? "medium"] ?? "#6b7280",
          title: payload.title,
          text: payload.description,
          ...(payload.link ? { title_link: payload.link } : {}),
          footer: "Intellios Governance",
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    try {
      const r = await fetch(this.config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!r.ok) return { success: false, error: `Slack webhook error: ${r.status}` };
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
}

export class TeamsAdapter implements IntegrationAdapter {
  name = "teams";

  constructor(private config: TeamsConfig) {}

  async sendNotification(payload: IntegrationPayload): Promise<IntegrationResult> {
    if (!this.config.enabled) return { success: false, error: "Integration disabled" };

    const themeMap: Record<string, string> = {
      critical: "attention", high: "warning", medium: "accent", low: "default"
    };

    const body = {
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: {
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            type: "AdaptiveCard",
            version: "1.4",
            body: [
              { type: "TextBlock", text: payload.title, weight: "Bolder", size: "Medium", color: themeMap[payload.severity ?? "medium"] ?? "default" },
              { type: "TextBlock", text: payload.description, wrap: true },
              ...(payload.link ? [{ type: "TextBlock", text: `[View in Intellios](${payload.link})`, wrap: true }] : []),
            ],
          },
        },
      ],
    };

    try {
      const r = await fetch(this.config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!r.ok) return { success: false, error: `Teams webhook error: ${r.status}` };
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
}
