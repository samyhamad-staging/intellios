/**
 * Enterprise Integration Adapter Interface
 *
 * All adapters implement this interface. Each adapter is configured
 * per-enterprise via enterpriseSettings.integrations.
 */

export interface IntegrationConfig {
  enabled: boolean;
  [key: string]: unknown;
}

export interface ServiceNowConfig extends IntegrationConfig {
  instanceUrl: string;   // e.g. https://your-instance.service-now.com
  username: string;
  password: string;      // stored encrypted in settings
  assignmentGroup?: string;
}

export interface JiraConfig extends IntegrationConfig {
  baseUrl: string;       // e.g. https://your-org.atlassian.net
  email: string;
  apiToken: string;
  projectKey: string;
  approvalIssueType?: string; // default "Task"
}

export interface SlackConfig extends IntegrationConfig {
  webhookUrl: string;    // Slack incoming webhook URL
  channel?: string;      // override default channel
}

export interface TeamsConfig extends IntegrationConfig {
  webhookUrl: string;    // Teams incoming webhook URL
}

export interface IntegrationPayload {
  title: string;
  description: string;
  severity?: "low" | "medium" | "high" | "critical";
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface IntegrationResult {
  success: boolean;
  externalId?: string;  // ticket ID, message TS, etc.
  error?: string;
}

export interface IntegrationAdapter {
  name: string;
  sendNotification(payload: IntegrationPayload): Promise<IntegrationResult>;
  createTicket?(payload: IntegrationPayload): Promise<IntegrationResult>;
  syncStatus?(externalId: string): Promise<string>;
}
