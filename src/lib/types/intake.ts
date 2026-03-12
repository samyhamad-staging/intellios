export interface IntakePayload {
  identity?: {
    name?: string;
    description?: string;
    persona?: string;
    branding?: {
      display_name?: string;
      icon_url?: string;
      color_primary?: string;
      color_secondary?: string;
    };
  };
  capabilities?: {
    tools?: Array<{
      name: string;
      type: "api" | "function" | "mcp_server" | "plugin";
      description?: string;
      config?: Record<string, unknown>;
    }>;
    instructions?: string;
    knowledge_sources?: Array<{
      name: string;
      type: "file" | "database" | "api" | "vector_store";
      uri?: string;
    }>;
  };
  constraints?: {
    allowed_domains?: string[];
    denied_actions?: string[];
    max_tokens_per_response?: number;
    rate_limits?: {
      requests_per_minute?: number;
      requests_per_day?: number;
    };
  };
  governance?: {
    policies?: Array<{
      name: string;
      type: "safety" | "compliance" | "data_handling" | "access_control" | "audit";
      description?: string;
      rules?: string[];
    }>;
    audit?: {
      log_interactions?: boolean;
      retention_days?: number;
      pii_redaction?: boolean;
    };
  };
}
