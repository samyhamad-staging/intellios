# ADR-010: Amazon Bedrock AgentCore Integration Strategy

**Status:** accepted
**Date:** 2026-03-14
**Supersedes:** (none)

## Context

Intellios generates, governs, and packages AI agents as ABP (Agent Blueprint Package) artifacts. To demonstrate commercial viability and enable deployment on AWS infrastructure, Intellios needs to integrate with Amazon Bedrock AgentCore — AWS's managed AI agent runtime.

Three approaches were evaluated:

1. **Export-only:** Translate ABP to a Bedrock-compatible JSON manifest that an operator can apply via the AWS console or CDK. Zero runtime coupling; pure data transformation.

2. **Deep coupling:** Redesign ABP schema to match Bedrock's data model; Bedrock becomes the execution engine.

3. **Adapter / deployment-target pattern:** ABP remains the canonical contract and internal schema. AgentCore is treated as one deployment target among several (alongside Anthropic Claude-direct, Azure AI, on-prem). A translation adapter converts outward.

The evaluation criteria were:
- Governance boundary preservation (ABP must remain the source of truth)
- Schema stability (no breaking changes to ABP v1.2.0)
- Multi-cloud flexibility (avoid AWS lock-in for customers who don't use Bedrock)
- Time-to-showcase (fastest path to running on AgentCore for demo purposes)
- Future extensibility (other cloud targets, other runtimes)

## Decision

**Adopt the Adapter / Deployment-Target pattern in two phases:**

**Phase 1 — Export:** A reviewer can click "Export for AgentCore" on any approved blueprint and download a complete deployment manifest JSON. The manifest contains all fields needed to call `CreateAgent` + `CreateAgentActionGroup` in Bedrock. No AWS credentials required in Intellios; the operator applies the manifest manually or via CI/CD.

**Phase 2 — Direct Deploy:** With AWS credentials configured in Admin Settings, a reviewer can click "Deploy to AgentCore" and Intellios calls the Bedrock control-plane API directly. The resulting `agentId` and `agentArn` are stored in `agentBlueprints.deploymentMetadata`.

### ABP → AgentCore Field Mapping

| ABP Field | AgentCore Field | Notes |
|---|---|---|
| `identity.name` | `agentName` | Truncated to 100 chars |
| `identity.description` | `description` | Truncated to 200 chars |
| `capabilities.instructions` | `instruction` | Required; min 40 chars |
| `capabilities.tools[]` | `actionGroups[]` | RETURN_CONTROL pattern (no Lambda) |
| `capabilities.tools[].name` | `actionGroupName` | Sanitized to `[a-zA-Z0-9_-]+` |
| `capabilities.tools[].description` | `description` in ActionGroup | |
| `constraints.denied_actions[]` | Guardrail blocked topics | Via `guardrailConfiguration` |
| `governance.audit.log_interactions` | `memoryConfiguration.enabledMemoryTypes` | Maps to SESSION_SUMMARY |
| `ownership.deploymentEnvironment` | tags `environment` | |
| `ownership.businessUnit` | tags `businessUnit` | |
| `metadata.id` | tags `abpId` | Traceability |
| `metadata.enterprise_id` | tags `enterpriseId` | Traceability |

### Tool Mapping (RETURN_CONTROL Pattern)

Each tool in `capabilities.tools[]` maps to a Bedrock `ActionGroup` with:
- `actionGroupExecutor.customControl = "RETURN_CONTROL"` (no Lambda required)
- `functionSchema` generated from the tool's `name` and `description`
- `apiSchema` omitted (no OpenAPI spec required for showcase)

This pattern means the caller's application handles tool invocations — ideal for demonstration without infrastructure setup.

### Non-Decisions

- AWS credentials are **not** stored in the database. Phase 2 reads them from `process.env` (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `BEDROCK_AGENT_ROLE_ARN`) or IAM roles (ECS/EKS). This is intentional: credential management is an infra concern, not an application concern.
- AgentCore is **not** made the exclusive deployment target. Other targets (Anthropic direct, Azure AI Foundry) remain possible future additions.
- ABP schema **v1.2.0 is unchanged**. The translation is purely outbound.

## Consequences

**Positive:**
- ABP remains the stable internal contract; governance workflow unchanged
- Export-only Phase 1 requires no AWS credentials in dev/CI and demonstrates the full lifecycle
- Phase 2 can be enabled per-enterprise via Admin Settings without affecting enterprises that don't use AWS
- The `deploymentTarget` + `deploymentMetadata` DB columns enable future multi-target routing
- RETURN_CONTROL pattern means zero Lambda setup for showcase

**Trade-offs:**
- The export manifest requires an operator to understand Bedrock's console or CDK — mitigated by including a `README` section in the manifest
- Phase 2 requires `@aws-sdk/client-bedrock-agent` dependency; this is a runtime dependency only (not bundled into client JS)
- Guardrail mapping from `denied_actions[]` is approximate — Bedrock guardrails are a richer model than a string list

**Files introduced:**
- `src/lib/agentcore/types.ts` — TypeScript types for the Bedrock Agent API subset we use
- `src/lib/agentcore/translate.ts` — pure ABP → BedrockAgentDefinition function
- `src/app/api/blueprints/[id]/export/agentcore/route.ts` — GET export endpoint
- `src/lib/agentcore/deploy.ts` — `deployToAgentCore()`: live AWS SDK call sequence (Phase 2)
- `src/app/api/blueprints/[id]/deploy/agentcore/route.ts` — POST direct deploy endpoint (Phase 2)
- `src/lib/db/migrations/0013_agentcore_deployment.sql` — `deployment_target` + `deployment_metadata` columns (Phase 2)
