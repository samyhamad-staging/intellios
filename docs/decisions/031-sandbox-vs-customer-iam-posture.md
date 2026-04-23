# ADR-031: Sandbox vs. customer-account IAM posture for Bedrock execution role provisioning

**Status:** accepted
**Date:** 2026-04-23
**Supersedes:** (none — extends ADR-010 AgentCore integration strategy)

## Context

Session 164 provisioned `IntelliosBedrockAgentExecRole` — the IAM role that Bedrock assumes when invoking agents managed by Intellios. The provisioner script (`scripts/provision-bedrock-sandbox.sh`) attempted to attach a minimum-necessary inline policy (`IntelliosBedrockMinPolicy`) covering only:

- `bedrock:InvokeModel` / `bedrock:InvokeModelWithResponseStream` / `bedrock:GetFoundationModel` scoped to the specific demo model ARN
- `logs:CreateLogGroup` / `logs:CreateLogStream` / `logs:PutLogEvents` scoped to `/aws/bedrock/agents*`

However, `iam:PutRolePolicy` was denied for the automation IAM user (`intellios-automation-user`). The script fell back to attaching the AWS-managed policy `AmazonBedrockFullAccess` — which grants unrestricted Bedrock access across all models and resources.

This raised a posture question that the provisioner script alone cannot resolve: **what should the correct IAM posture be for the execution role in sandbox vs. customer-production environments?**

The tension:

- **Sandbox (solo-founder, dev account):** Ergonomics matter. The founder should be able to bootstrap without procuring `iam:PutRolePolicy` ahead of time. `AmazonBedrockFullAccess` is broader than necessary but poses no meaningful risk in a private sandbox account controlled by a single operator.
- **Customer-production (enterprise deployment):** Security posture is a procurement criterion. Enterprise buyers require evidence of minimum-necessary permissions. An execution role with `AmazonBedrockFullAccess` will fail security review at firms with mature IAM governance. Intellios is a governed control plane — its own provisioning must model the governance discipline it sells.

A single script with a single behavior cannot serve both: defaulting to managed-policy breaks customer onboarding; requiring inline-policy breaks sandbox ergonomics.

## Decision

**Two explicit postures, documented and scripted separately, not a single behavior that silently degrades.**

### Posture A — Sandbox (default)

- **Policy:** `arn:aws:iam::aws:policy/AmazonBedrockFullAccess` (AWS managed).
- **Attachment mechanism:** `iam:AttachRolePolicy` — widely permitted for automation users.
- **When to use:** solo-founder dev account, CI sandbox, any account where the operator is the sole user and security reviewers are not involved.
- **Script behavior:** default behavior of `scripts/provision-bedrock-sandbox.sh` (no flag required). Emits a stderr warning that sandbox posture is in use.

### Posture B — Customer-account / scoped (opt-in)

- **Policy:** `IntelliosBedrockMinPolicy` inline — JSON at `docs/infra/iam-policies/bedrock-exec-role-scoped.json`.
- **Attachment mechanism:** `iam:PutRolePolicy` — caller must hold this permission; the script fails loudly with a clear error if denied.
- **When to use:** customer-deployment, enterprise pilot, any account where an IAM governance review will inspect attached policies.
- **Script behavior:** `scripts/provision-bedrock-sandbox.sh --scoped`. If `iam:PutRolePolicy` is denied, the script exits non-zero with a clear message: `Error: --scoped requested but iam:PutRolePolicy denied for <caller ARN>. Grant this permission to the provisioning identity before running with --scoped.`

### Trust policy

Identical in both postures — the trust policy is minimum-necessary by definition (it restricts `sts:AssumeRole` to `bedrock.amazonaws.com` with `aws:SourceAccount` + `aws:SourceArn` conditions). JSON at `docs/infra/iam-policies/bedrock-exec-role-trust.json`.

### Customer onboarding pre-flight

For Posture B deployments, the provisioning identity must hold:
- `iam:CreateRole` (or `iam:GetRole` + `iam:UpdateAssumeRolePolicy` for idempotent re-runs)
- `iam:PutRolePolicy`
- `iam:GetRolePolicy` (for verification)
- `bedrock:ListFoundationModels` (for pre-flight model confirmation)

This pre-flight list should be added to the customer onboarding checklist when `docs/implementation-playbook/` is created. **TODO (cross-reference):** create `docs/implementation-playbook/aws-prerequisites.md` and include this list.

## Consequences

**Positive.**

- Customer-account deployments can cite `IntelliosBedrockMinPolicy` in IAM governance reviews — a concrete artifact that demonstrates minimum-necessary posture.
- Sandbox ergonomics preserved — a solo founder can bootstrap without requesting `iam:PutRolePolicy` ahead of time.
- Explicit opt-in (`--scoped`) prevents accidental production deployment with the permissive policy.
- The inline policy JSON in `docs/infra/iam-policies/` is version-controlled alongside the rest of the provisioner; policy drift is surfaced via `git diff`.

**Negative.**

- Customer-account provisioning requires an additional IAM permission (`iam:PutRolePolicy`) that some organizations' automation users may not hold. This is a pre-flight item that must be documented and checked before on-site provisioning.
- Two postures means two test paths for the provisioner script. The `--scoped` path cannot be sandbox-tested without `iam:PutRolePolicy` on the test account.

**Neutral.**

- `AmazonBedrockFullAccess` remains the sandbox default indefinitely — the managed policy is stable and well-understood. If AWS adds a more scoped managed policy in future, the script can be updated to prefer it without an ADR revision.
- The scoped policy is model-ARN-specific; if the foundation model changes (e.g., the Haiku deprecation cycle), `docs/infra/iam-policies/bedrock-exec-role-scoped.json` must be updated and the role re-provisioned with `--scoped`.

## Alternatives Considered

**Always use `AmazonBedrockFullAccess`.** Simplest. Breaks customer security reviews. Rejected — Intellios is a governed control plane; its own IAM posture must model the governance discipline it sells.

**Always use scoped inline policy.** Purist. Breaks sandbox ergonomics — a solo founder would have to procure `iam:PutRolePolicy` before first provisioning, which is a non-obvious prerequisite that adds friction to the first-run experience. Rejected.

**Select posture via environment variable at provision time.** Less explicit than a CLI flag; easier to forget or misconfigure in a CI environment where env vars accumulate. Rejected in favor of an explicit `--scoped` flag that must be consciously added to the command.

**Separate scripts for sandbox and customer.** Code duplication; the two postures share ~90% of logic. Rejected.

## References

- `scripts/provision-bedrock-sandbox.sh` — the provisioner (Posture A default; `--scoped` to be added per SCRUM-29).
- `docs/infra/iam-policies/bedrock-exec-role-scoped.json` — the minimum-necessary inline policy JSON.
- `docs/infra/iam-policies/bedrock-exec-role-trust.json` — the trust policy JSON (identical for both postures).
- `docs/infra/iam-policies/README.md` — when to use which posture.
- ADR-010 — AgentCore integration strategy (establishes the execution role requirement).
- ADR-027 — Test Console (uses the execution role for live invocations).
- SCRUM-29 — implementing Story for the `--scoped` flag addition.
- Session 164 log — the provisioning experience that surfaced this decision.
