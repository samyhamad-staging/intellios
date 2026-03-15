/**
 * Enterprise-level configuration settings.
 *
 * Stored as JSONB in the enterprise_settings table (one row per enterprise).
 * Missing keys always fall back to DEFAULT_ENTERPRISE_SETTINGS via deep merge
 * in getEnterpriseSettings(). This means the DB row may be a partial object —
 * only explicitly changed values need to be stored.
 */

/** One step in a sequential multi-step approval chain. */
export interface ApprovalChainStep {
  /** 0-based index of this step in the chain. */
  step: number;
  /** The role that must perform this approval step. */
  role: "reviewer" | "compliance_officer" | "admin";
  /** Human-readable label shown in UI and MRM report. */
  label: string;
}

/**
 * A completed approval step record stored in agent_blueprints.approvalProgress.
 * Append-only — never mutated after insertion.
 */
export interface ApprovalStepRecord {
  step: number;
  role: string;
  label: string;
  approvedBy: string;     // reviewer email
  approvedAt: string;     // ISO 8601
  decision: "approved" | "rejected";
  comment: string | null;
}

export interface EnterpriseSettings {
  /** Review SLA thresholds in hours */
  sla: {
    /** Hours in in_review before showing amber warning indicator. Default: 48 */
    warnHours: number;
    /** Hours in in_review before showing red SLA breach indicator. Default: 72 */
    breachHours: number;
  };
  /** Governance workflow rules */
  governance: {
    /**
     * If true, a blueprint must have a clean (valid) validation report
     * before it can be submitted for review. Default: true.
     */
    requireValidationBeforeReview: boolean;
    /**
     * If true, all three Phase 3 review acknowledgments must be checked
     * before finalization during intake. Default: true.
     */
    requireAllPhase3Acknowledgments: boolean;
    /**
     * If true, the same user who designed a blueprint may also approve it.
     * Should be false in regulated environments (SOD violation). Default: false.
     */
    allowSelfApproval: boolean;
    /**
     * If true, a blueprint must have at least one passing test run before
     * it can be submitted for review. Default: false.
     */
    requireTestsBeforeApproval: boolean;
  };
  /** Notification preferences */
  notifications: {
    /** Primary admin notification email — null to use reviewer role emails only */
    adminEmail: string | null;
    /** Send notification email when a blueprint breaches SLA. Default: true */
    notifyOnBreach: boolean;
    /** Send notification email when a blueprint is approved. Default: true */
    notifyOnApproval: boolean;
  };
  /**
   * Sequential multi-step approval chain. Each entry defines a required
   * approval step. Steps are enforced in index order (step 0 first).
   *
   * When empty (the default), the legacy single-step model applies:
   * any reviewer or admin may approve a blueprint.
   */
  approvalChain: ApprovalChainStep[];
  /**
   * Phase 28: Awareness and Measurement System configuration.
   */
  awareness: {
    /**
     * Thresholds for anomaly detection. When a metric crosses a threshold,
     * an in-app notification is pushed to compliance officers and adminEmail.
     */
    alertThresholds: {
      /** Blueprint validity rate (7d rolling) below which to alert. Default: 0.70 */
      validityRateMin: number;
      /** Quality index drop (week-over-week) above which to alert. Default: 10 */
      qualityIndexDrop: number;
      /** Webhook delivery success rate below which to alert. Default: 0.80 */
      webhookSuccessRateMin: number;
      /** Review queue depth above which to alert. Default: 10 */
      reviewQueueMax: number;
    };
    /**
     * Optional URL to POST the daily briefing JSON to an external endpoint.
     * Null to disable. Useful for Slack webhooks, custom dashboards, etc.
     */
    briefingWebhookUrl: string | null;
  };
  /**
   * Phase 2: Deployment target configuration.
   * Each key represents a supported deployment target.
   */
  deploymentTargets: {
    /**
     * Amazon Bedrock AgentCore direct deployment configuration.
     * Null means AgentCore deployment is not configured for this enterprise.
     * AWS credentials are read from server environment variables
     * (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) or instance profile —
     * never stored in the database.
     */
    agentcore: {
      /** Whether direct AgentCore deployment is enabled. */
      enabled: boolean;
      /** AWS region to deploy agents into (e.g. "us-east-1"). */
      region: string;
      /**
       * ARN of the IAM service role with bedrock:InvokeModel permission.
       * Must be pre-created by the enterprise AWS administrator.
       */
      agentResourceRoleArn: string;
      /**
       * Bedrock foundation model ID.
       * Default: "anthropic.claude-3-5-sonnet-20241022-v2:0"
       */
      foundationModel: string;
      /** Optional Bedrock Guardrail identifier for content filtering. */
      guardrailId?: string;
      /** Guardrail version string (required when guardrailId is set). */
      guardrailVersion?: string;
    } | null;
  };
}

/** Configuration block passed to the AgentCore deploy function. */
export interface AgentCoreConfig {
  region: string;
  agentResourceRoleArn: string;
  foundationModel: string;
  guardrailId?: string;
  guardrailVersion?: string;
}

export const DEFAULT_ENTERPRISE_SETTINGS: EnterpriseSettings = {
  sla: {
    warnHours: 48,
    breachHours: 72,
  },
  governance: {
    requireValidationBeforeReview: true,
    requireAllPhase3Acknowledgments: true,
    allowSelfApproval: false,
    requireTestsBeforeApproval: false,
  },
  notifications: {
    adminEmail: null,
    notifyOnBreach: true,
    notifyOnApproval: true,
  },
  approvalChain: [],
  awareness: {
    alertThresholds: {
      validityRateMin: 0.70,
      qualityIndexDrop: 10,
      webhookSuccessRateMin: 0.80,
      reviewQueueMax: 10,
    },
    briefingWebhookUrl: null,
  },
  deploymentTargets: {
    agentcore: null,
  },
};
