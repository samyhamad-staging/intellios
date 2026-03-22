import type { JiraConfig, IntegrationAdapter, IntegrationPayload, IntegrationResult } from "./adapter";

export class JiraAdapter implements IntegrationAdapter {
  name = "jira";

  constructor(private config: JiraConfig) {}

  async sendNotification(payload: IntegrationPayload): Promise<IntegrationResult> {
    return this.createTicket(payload);
  }

  async createTicket(payload: IntegrationPayload): Promise<IntegrationResult> {
    if (!this.config.enabled) return { success: false, error: "Integration disabled" };

    const url = `${this.config.baseUrl}/rest/api/3/issue`;
    const priorityMap: Record<string, string> = {
      critical: "Highest", high: "High", medium: "Medium", low: "Low"
    };

    const body = {
      fields: {
        project: { key: this.config.projectKey },
        summary: payload.title,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: payload.description }],
            },
            ...(payload.link ? [{
              type: "paragraph",
              content: [{ type: "text", text: `Link: ${payload.link}` }],
            }] : []),
          ],
        },
        issuetype: { name: this.config.approvalIssueType ?? "Task" },
        priority: { name: priorityMap[payload.severity ?? "medium"] ?? "Medium" },
        labels: ["intellios", "ai-governance"],
      },
    };

    try {
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString("base64")}`,
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        return { success: false, error: `Jira API error: ${r.status}` };
      }

      const data = await r.json();
      return { success: true, externalId: data.key };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  async syncStatus(externalId: string): Promise<string> {
    if (!this.config.enabled) return "unknown";

    const url = `${this.config.baseUrl}/rest/api/3/issue/${externalId}?fields=status`;
    try {
      const r = await fetch(url, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString("base64")}`,
          Accept: "application/json",
        },
      });
      if (!r.ok) return "unknown";
      const data = await r.json();
      return data.fields?.status?.name?.toLowerCase() ?? "unknown";
    } catch {
      return "unknown";
    }
  }
}
