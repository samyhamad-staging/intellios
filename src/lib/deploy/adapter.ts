import type { ABP } from "@/lib/types/abp";

export interface DeploymentRecord {
  id: string;
  target: string;
  externalId: string;
  status: "deploying" | "deployed" | "failed";
  endpoint?: string;
  deployedAt: string;
  metadata?: Record<string, unknown>;
}

export interface DeploymentAdapter {
  target: string;
  deploy(abp: ABP, config: DeploymentAdapterConfig): Promise<DeploymentRecord>;
  getStatus(record: DeploymentRecord): Promise<string>;
}

export interface DeploymentAdapterConfig {
  region?: string;
  resourceGroup?: string;
  project?: string;
  [key: string]: unknown;
}
