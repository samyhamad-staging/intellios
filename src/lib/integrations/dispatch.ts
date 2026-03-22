import { getEnterpriseSettings } from "@/lib/settings/get-settings";
import { ServiceNowAdapter } from "./servicenow";
import { JiraAdapter } from "./jira";
import { SlackAdapter, TeamsAdapter } from "./slack";
import type { IntegrationPayload, IntegrationResult } from "./adapter";

/**
 * Dispatch an integration event to all enabled adapters for an enterprise.
 * Called by event handlers after significant governance events.
 */
export async function dispatchIntegrationEvent(
  enterpriseId: string | null,
  payload: IntegrationPayload
): Promise<IntegrationResult[]> {
  const settings = await getEnterpriseSettings(enterpriseId);
  const integrations = (settings as { integrations?: Record<string, unknown> }).integrations;
  if (!integrations) return [];

  const results: IntegrationResult[] = [];

  // ServiceNow
  const snow = integrations.servicenow as { enabled?: boolean; instanceUrl?: string; username?: string; password?: string; assignmentGroup?: string } | undefined;
  if (snow?.enabled && snow.instanceUrl && snow.username && snow.password) {
    const adapter = new ServiceNowAdapter({ enabled: true, instanceUrl: snow.instanceUrl, username: snow.username, password: snow.password, assignmentGroup: snow.assignmentGroup });
    results.push(await adapter.sendNotification(payload));
  }

  // Jira
  const jira = integrations.jira as { enabled?: boolean; baseUrl?: string; email?: string; apiToken?: string; projectKey?: string; approvalIssueType?: string } | undefined;
  if (jira?.enabled && jira.baseUrl && jira.email && jira.apiToken && jira.projectKey) {
    const adapter = new JiraAdapter({ enabled: true, baseUrl: jira.baseUrl, email: jira.email, apiToken: jira.apiToken, projectKey: jira.projectKey, approvalIssueType: jira.approvalIssueType });
    results.push(await adapter.sendNotification(payload));
  }

  // Slack
  const slack = integrations.slack as { enabled?: boolean; webhookUrl?: string; channel?: string } | undefined;
  if (slack?.enabled && slack.webhookUrl) {
    const adapter = new SlackAdapter({ enabled: true, webhookUrl: slack.webhookUrl, channel: slack.channel });
    results.push(await adapter.sendNotification(payload));
  }

  // Teams
  const teams = integrations.teams as { enabled?: boolean; webhookUrl?: string } | undefined;
  if (teams?.enabled && teams.webhookUrl) {
    const adapter = new TeamsAdapter({ enabled: true, webhookUrl: teams.webhookUrl });
    results.push(await adapter.sendNotification(payload));
  }

  return results;
}
