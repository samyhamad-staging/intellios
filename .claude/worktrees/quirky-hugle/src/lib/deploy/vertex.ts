import type { ABP } from "@/lib/types/abp";
import type { DeploymentAdapter, DeploymentRecord, DeploymentAdapterConfig } from "./adapter";
import { randomUUID } from "crypto";

/**
 * Google Vertex AI Agent Deployment Adapter
 *
 * Translates an ABP into a Vertex AI Agent Engine manifest and deploys via
 * the Vertex AI REST API.
 *
 * Requires env vars:
 *   GCP_PROJECT_ID
 *   GCP_REGION (default: us-central1)
 *   GOOGLE_SERVICE_ACCOUNT_KEY (JSON key string, base64 encoded)
 */
export class VertexAIAdapter implements DeploymentAdapter {
  target = "vertex-ai";

  async deploy(abp: ABP, config: DeploymentAdapterConfig): Promise<DeploymentRecord> {
    const projectId = process.env.GCP_PROJECT_ID;
    const region = config.region ?? process.env.GCP_REGION ?? "us-central1";

    if (!projectId) {
      throw new Error("Vertex AI deployment requires GCP_PROJECT_ID");
    }

    const manifest = this.translateToManifest(abp);
    const token = await this.getAccessToken();

    const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/reasoningEngines`;

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(manifest),
    });

    if (!r.ok) {
      const errBody = await r.text();
      throw new Error(`Vertex AI deployment failed: ${r.status} — ${errBody}`);
    }

    const data = await r.json();

    return {
      id: randomUUID(),
      target: "vertex-ai",
      externalId: data.name ?? "",
      status: "deploying",
      endpoint: `https://${region}-aiplatform.googleapis.com/v1/${data.name}`,
      deployedAt: new Date().toISOString(),
      metadata: { projectId, region },
    };
  }

  async getStatus(record: DeploymentRecord): Promise<string> {
    return record.status;
  }

  private translateToManifest(abp: ABP): Record<string, unknown> {
    const abpAny = abp as Record<string, unknown>;
    const capabilities = (abpAny.capabilities ?? {}) as Record<string, unknown>;
    const governance = (abpAny.governance ?? {}) as Record<string, unknown>;
    return {
      displayName: abp.identity?.name ?? "Intellios Agent",
      description: abp.identity?.description ?? "",
      spec: {
        agentFramework: "custom",
        customConfig: {
          systemPrompt: (capabilities.instructions as string | undefined) ?? "",
          tools: (capabilities.tools ?? []),
          model: "gemini-1.5-pro",
          metadata: {
            intelliosAgentId: abp.identity?.name ?? "",
            intelliosVersion: abp.metadata?.id ?? "1.0.0",
            riskTier: (governance.riskTier as string | undefined) ?? "low",
          },
        },
      },
    };
  }

  private async getAccessToken(): Promise<string> {
    const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY required");

    // In production, use google-auth-library. Here we use a simplified JWT approach.
    // The actual implementation would use: const auth = new GoogleAuth({ credentials: JSON.parse(atob(keyJson)) })
    // For now, return a placeholder that signals the real impl is needed
    throw new Error("Vertex AI requires google-auth-library. Install: npm install google-auth-library");
  }
}
