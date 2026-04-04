import type { ABP } from "@/lib/types/abp";
import type { DeploymentAdapter, DeploymentRecord, DeploymentAdapterConfig } from "./adapter";
import { randomUUID } from "crypto";

/**
 * Azure AI Foundry Deployment Adapter
 *
 * Translates an ABP into an Azure AI Foundry agent manifest and initiates
 * deployment via the Azure AI Projects REST API.
 *
 * Requires env vars:
 *   AZURE_SUBSCRIPTION_ID
 *   AZURE_RESOURCE_GROUP
 *   AZURE_AI_PROJECT_NAME
 *   AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID (service principal)
 */
export class AzureFoundryAdapter implements DeploymentAdapter {
  target = "azure-foundry";

  async deploy(abp: ABP, config: DeploymentAdapterConfig): Promise<DeploymentRecord> {
    const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
    const resourceGroup = config.resourceGroup ?? process.env.AZURE_RESOURCE_GROUP;
    const projectName = process.env.AZURE_AI_PROJECT_NAME;

    if (!subscriptionId || !resourceGroup || !projectName) {
      throw new Error("Azure deployment requires AZURE_SUBSCRIPTION_ID, AZURE_RESOURCE_GROUP, AZURE_AI_PROJECT_NAME");
    }

    // Translate ABP to Azure AI Foundry agent manifest
    const manifest = this.translateToManifest(abp);

    // Get access token (service principal)
    const token = await this.getAccessToken();

    const agentName = `intellios-${abp.identity?.name?.toLowerCase().replace(/\s+/g, "-") ?? "agent"}-${Date.now()}`;
    const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.MachineLearningServices/workspaces/${projectName}/agents/${agentName}?api-version=2024-07-01-preview`;

    const r = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(manifest),
    });

    if (!r.ok) {
      const errBody = await r.text();
      throw new Error(`Azure deployment failed: ${r.status} — ${errBody}`);
    }

    const data = await r.json();

    return {
      id: randomUUID(),
      target: "azure-foundry",
      externalId: data.id ?? agentName,
      status: "deploying",
      endpoint: data.properties?.endpoint,
      deployedAt: new Date().toISOString(),
      metadata: { agentName, manifestVersion: "2024-07-01-preview" },
    };
  }

  async getStatus(record: DeploymentRecord): Promise<string> {
    // Poll Azure for deployment status
    // Simplified — real implementation would check provisioning state
    return record.status;
  }

  private translateToManifest(abp: ABP): Record<string, unknown> {
    const abpAny = abp as Record<string, unknown>;
    const capabilities = (abpAny.capabilities ?? {}) as Record<string, unknown>;
    const governance = (abpAny.governance ?? {}) as Record<string, unknown>;
    return {
      properties: {
        description: abp.identity?.description ?? "",
        systemPrompt: (capabilities.instructions as string | undefined) ?? "",
        tools: ((capabilities.tools ?? []) as Array<{ name: string; description?: string }>).map((tool) => ({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description ?? "",
          },
        })),
        model: {
          name: "gpt-4o",
          provider: "azure-openai",
        },
        tags: {
          intelliosAgentId: abp.identity?.name ?? "",
          intelliosVersion: abp.metadata?.id ?? "1.0.0",
          riskTier: (governance.riskTier as string | undefined) ?? "low",
        },
      },
    };
  }

  private async getAccessToken(): Promise<string> {
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error("Azure auth requires AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET");
    }

    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://management.azure.com/.default",
    });

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!r.ok) throw new Error(`Azure token fetch failed: ${r.status}`);
    const data = await r.json();
    return data.access_token;
  }
}
