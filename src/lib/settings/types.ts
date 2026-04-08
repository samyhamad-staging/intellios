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
    /**
     * H2-1.4: Governance-gated circuit breaker configuration.
     * When a deployed agent accumulates error-severity runtime violations
     * beyond the threshold, the circuit breaker fires.
     */
    circuitBreaker: {
      /**
       * What to do when the violation threshold is exceeded.
       * - "auto_suspend": automatically suspend the agent (status → suspended)
       * - "alert_only": notify admins and compliance officers without suspending
       * Default: "auto_suspend"
       */
      action: "auto_suspend" | "alert_only";
      /**
       * Number of error-severity runtime violations in the current evaluation
       * window that triggers the circuit breaker. Default: 3.
       */
      errorViolationThreshold: number;
    };
  };
  /** Notification preferences */
  notifications: {
    /** Primary admin notification email — null to use reviewer role emails only */
    adminEmail: string | null;
    /** Send notification email when a blueprint breaches SLA. Default: true */
    notifyOnBreach: boolean;
    /** Send notification email when a blueprint is approved. Default: true */
    notifyOnApproval: boolean;
    /**
     * P1-433: Slack incoming webhook URL.
     * When set, governance alerts (SLA breach, approval, anomaly) are also
     * posted to this Slack channel. Format: https://hooks.slack.com/services/…
     */
    slackWebhookUrl: string | null;
    /**
     * P1-433: PagerDuty Events API v2 integration key (routing key).
     * When set, critical alerts (anomaly detected, SLA breach) trigger a
     * PagerDuty incident. Obtain from PagerDuty → Services → Integrations.
     */
    pagerdutyKey: string | null;
    /**
     * P2-607: Per-event, per-channel notification routing matrix.
     * Each event key maps to an object of { email, slack, pagerduty } booleans.
     * Missing entries default to all-true for email, false for slack/pagerduty.
     */
    routing?: {
      blueprint_approved:  { email: boolean; slack: boolean; pagerduty: boolean };
      blueprint_rejected:  { email: boolean; slack: boolean; pagerduty: boolean };
      blueprint_deployed:  { email: boolean; slack: boolean; pagerduty: boolean };
      policy_violation:    { email: boolean; slack: boolean; pagerduty: boolean };
      sla_breach:          { email: boolean; slack: boolean; pagerduty: boolean };
      review_assigned:     { email: boolean; slack: boolean; pagerduty: boolean };
      anomaly_detected:    { email: boolean; slack: boolean; pagerduty: boolean };
    };
    /**
     * P2-607: Digest frequency — how often to batch non-critical notifications.
     * "immediate" sends each alert as it occurs (default).
     */
    digestFrequency?: "immediate" | "daily" | "weekly";
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
  /** White-label branding configuration. */
  branding: {
    /** Company name shown in sidebar and reports. Default: "Intellios" */
    companyName: string;
    /** Optional logo URL. If set, shown in sidebar instead of the default SVG. */
    logoUrl: string | null;
    /** Hex color for sidebar logo background. Default: "#6366f1" (indigo-500 — canonical --color-primary) */
    primaryColor: string;
  };
  /** SR 11-7 periodic model review scheduling. */
  periodicReview: {
    /** Whether periodic review scheduling is enabled. Default: true */
    enabled: boolean;
    /**
     * Default review cadence in months for newly deployed agents.
     * Common values: 6 (semi-annual), 12 (annual), 24 (biennial). Default: 12
     */
    defaultCadenceMonths: number;
    /**
     * Days before next_review_due at which a reminder notification is sent.
     * Default: 30
     */
    reminderDaysBefore: number;
  };
  /**
   * H2-3: Enterprise SSO (SAML 2.0 / OIDC) configuration.
   * OIDC is activated when the platform-level SSO_ISSUER env var is set.
   * SAML requires a separate SAML middleware (future enhancement).
   */
  sso: {
    /** Whether SSO is enabled for this enterprise. Default: false */
    enabled: boolean;
    /** SSO protocol. Only "oidc" is supported in the current platform build. */
    protocol: "oidc" | "saml";
    /**
     * OIDC: issuer / discovery base URL
     * (e.g. https://login.microsoftonline.com/{tenant}/v2.0)
     * SAML: IdP metadata URL
     */
    issuer: string;
    /** OIDC client ID registered with the IdP. */
    clientId: string;
    /**
     * OIDC client secret. Stored at rest in the enterprise settings JSONB
     * column. Masked to "••••••••" in all GET responses.
     */
    clientSecret: string;
    /**
     * Email domain that triggers the SSO login button on the login page.
     * e.g. "acme.com" — when a user types an @acme.com email the SSO
     * button appears and credentials are hidden.
     */
    emailDomain: string;
    /** IdP claim-name overrides for standard user attributes. */
    attributeMapping: {
      /** Claim that contains the user's email address. Default: "email" */
      email: string;
      /** Claim that contains the user's display name. Default: "name" */
      name: string;
      /** Claim that contains the user's group memberships. Default: "groups" */
      groups: string;
    };
    /**
     * H2-3.2: Group name → Intellios role mapping used during JIT
     * provisioning. e.g. { "EngineeringLeads": "architect" }.
     * Users not matching any group receive defaultRole.
     */
    groupRoleMapping: Record<string, string>;
    /** H2-3.2: Role for SSO users not matched by groupRoleMapping. Default: "viewer" */
    defaultRole: string;
  };
  /**
   * H2-5.2: Cost attribution token pricing rates.
   * Used to compute per-agent and fleet-level cost from telemetry.
   * Costs: (tokensIn * inputCostPer1kTokens + tokensOut * outputCostPer1kTokens) / 1000
   */
  costRates: {
    /** Cost per 1,000 input tokens in USD. Default: 0.003 */
    inputCostPer1kTokens: number;
    /** Cost per 1,000 output tokens in USD. Default: 0.015 */
    outputCostPer1kTokens: number;
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
    circuitBreaker: {
      action: "auto_suspend",
      errorViolationThreshold: 3,
    },
  },
  notifications: {
    adminEmail: null,
    notifyOnBreach: true,
    notifyOnApproval: true,
    slackWebhookUrl: null,
    pagerdutyKey: null,
    digestFrequency: "immediate",
    routing: {
      blueprint_approved:  { email: true,  slack: false, pagerduty: false },
      blueprint_rejected:  { email: true,  slack: true,  pagerduty: false },
      blueprint_deployed:  { email: true,  slack: true,  pagerduty: false },
      policy_violation:    { email: true,  slack: true,  pagerduty: true  },
      sla_breach:          { email: true,  slack: true,  pagerduty: true  },
      review_assigned:     { email: true,  slack: false, pagerduty: false },
      anomaly_detected:    { email: true,  slack: true,  pagerduty: true  },
    },
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
  branding: {
    companyName: "Intellios",
    logoUrl: null,
    primaryColor: "#6366f1", // indigo-500 — canonical brand primary (matches --color-primary)
  },
  periodicReview: {
    enabled: true,
    defaultCadenceMonths: 12,
    reminderDaysBefore: 30,
  },
  sso: {
    enabled: false,
    protocol: "oidc",
    issuer: "",
    clientId: "",
    clientSecret: "",
    emailDomain: "",
    attributeMapping: { email: "email", name: "name", groups: "groups" },
    groupRoleMapping: {},
    defaultRole: "viewer",
  },
  costRates: {
    inputCostPer1kTokens: 0.003,
    outputCostPer1kTokens: 0.015,
  },
  deploymentTargets: {
    agentcore: null,
  },
};
