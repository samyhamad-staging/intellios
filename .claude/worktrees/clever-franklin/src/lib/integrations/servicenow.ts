import type { ServiceNowConfig, IntegrationAdapter, IntegrationPayload, IntegrationResult } from "./adapter";

export class ServiceNowAdapter implements IntegrationAdapter {
  name = "servicenow";

  constructor(private config: ServiceNowConfig) {}

  async sendNotification(payload: IntegrationPayload): Promise<IntegrationResult> {
    return this.createTicket(payload);
  }

  async createTicket(payload: IntegrationPayload): Promise<IntegrationResult> {
    if (!this.config.enabled) return { success: false, error: "Integration disabled" };

    const url = `${this.config.instanceUrl}/api/now/table/incident`;
    const urgencyMap: Record<string, number> = { critical: 1, high: 1, medium: 2, low: 3 };

    const body = {
      short_description: payload.title,
      description: `${payload.description}${payload.link ? `\n\nLink: ${payload.link}` : ""}`,
      urgency: urgencyMap[payload.severity ?? "medium"] ?? 2,
      category: "AI Governance",
      ...(this.config.assignmentGroup ? { assignment_group: { value: this.config.assignmentGroup } } : {}),
    };

    try {
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")}`,
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        return { success: false, error: `ServiceNow API error: ${r.status}` };
      }

      const data = await r.json();
      return { success: true, externalId: data.result?.sys_id };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  async syncStatus(externalId: string): Promise<string> {
    if (!this.config.enabled) return "unknown";

    const url = `${this.config.instanceUrl}/api/now/table/incident/${externalId}?sysparm_fields=state`;
    try {
      const r = await fetch(url, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")}`,
          Accept: "application/json",
        },
      });
      if (!r.ok) return "unknown";
      const data = await r.json();
      const stateMap: Record<string, string> = { "1": "open", "2": "in_progress", "6": "resolved", "7": "closed" };
      return stateMap[data.result?.state] ?? "open";
    } catch {
      return "unknown";
    }
  }
}
