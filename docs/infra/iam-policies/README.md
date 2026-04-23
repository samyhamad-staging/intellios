# Intellios Bedrock Execution Role — IAM Policies

This directory contains canonical IAM policy documents for the `IntelliosBedrockAgentExecRole` — the role that Amazon Bedrock assumes when invoking agents managed by Intellios.

See **ADR-031** (`docs/decisions/031-sandbox-vs-customer-iam-posture.md`) for the full rationale and decision record.

---

## Files

| File | Purpose |
|---|---|
| `bedrock-exec-role-trust.json` | Trust policy — identical for both postures. Restricts `sts:AssumeRole` to `bedrock.amazonaws.com` with `aws:SourceAccount` + `aws:SourceArn` conditions (confused-deputy prevention). |
| `bedrock-exec-role-scoped.json` | Minimum-necessary inline permissions policy (Posture B — customer/scoped). Restricts Bedrock actions to the specific demo model ARN; restricts CloudWatch log writes to `/aws/bedrock/agents*`. |

---

## Two Postures

### Posture A — Sandbox (default)

Used by `scripts/provision-bedrock-sandbox.sh` without any flag.

- Attaches `arn:aws:iam::aws:policy/AmazonBedrockFullAccess` (AWS managed, unrestricted Bedrock access).
- Requires only `iam:AttachRolePolicy` on the provisioning identity — low bar.
- **When to use:** solo-founder dev account, CI sandbox, any account without an IAM governance review.
- **Warning:** not appropriate for customer deployments — enterprise buyers will reject `AmazonBedrockFullAccess` in security reviews.

### Posture B — Customer-account / Scoped

Used by `scripts/provision-bedrock-sandbox.sh --scoped` *(flag to be implemented per SCRUM-29)*.

- Attaches `IntelliosBedrockMinPolicy` inline using `bedrock-exec-role-scoped.json`.
- Requires `iam:PutRolePolicy` on the provisioning identity — the script fails loudly if denied.
- **When to use:** customer-deployment, enterprise pilot, any account subject to IAM governance review.

**Pre-flight for Posture B — the provisioning identity must hold:**
- `iam:CreateRole` (or `iam:GetRole` + `iam:UpdateAssumeRolePolicy` for idempotent re-runs)
- `iam:PutRolePolicy`
- `iam:GetRolePolicy` (for verification)
- `bedrock:ListFoundationModels` (for model pre-flight)

---

## Updating the Scoped Policy

If the foundation model changes (e.g., Haiku deprecation), update `bedrock-exec-role-scoped.json` and re-run the provisioner with `--scoped`. The `Resource` ARN in `BedrockFoundationModelInvoke` must match the model used in `src/lib/db/seed-retail-bank.ts` and `src/lib/agentcore/translate.ts`.

The trust policy is model-independent and should not need updating unless the AWS account ID or region changes.
