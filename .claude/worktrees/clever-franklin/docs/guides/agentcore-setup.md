# AgentCore Setup Guide

Operator checklist for connecting Intellios to Amazon Bedrock Agents (AgentCore).

There are two paths:
- **Export** — Download a manifest JSON and apply it manually with the AWS CLI
- **Direct Deploy** — Intellios calls the Bedrock API directly from the server

The export path requires no AWS credentials in the Intellios server. The direct deploy path requires all steps below.

---

## Prerequisites for Direct Deploy

### 1. AWS Credentials in the Intellios Server Process

Intellios never stores AWS credentials — it reads them from the server environment using the standard AWS credential chain.

**Development (`src/.env.local`):**
```
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_DEFAULT_REGION=us-east-1
```

**Production (preferred — no key rotation needed):**
- **ECS Task Role:** Attach an IAM role to your ECS task definition with the permissions below. No environment variables needed.
- **EC2 Instance Profile:** Attach the IAM role to the EC2 instance.
- **EKS Service Account (IRSA):** Annotate the Kubernetes service account.

---

### 2. IAM Role for Bedrock Agents

Create an IAM role with the following trust and permissions policies.

**Trust policy** (allows Bedrock to assume the role for agent execution):
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "bedrock.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
```

**Permission policy** (required for Intellios to create and manage agents):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:CreateAgent",
        "bedrock:CreateAgentActionGroup",
        "bedrock:PrepareAgent",
        "bedrock:GetAgent",
        "bedrock:DeleteAgent",
        "bedrock:InvokeModel"
      ],
      "Resource": "*"
    }
  ]
}
```

> **Note:** `bedrock:InvokeModel` must be allowed on the specific foundation model ARN (e.g. `arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`). Using `*` is fine for initial setup; restrict to specific model ARNs for production.

The role ARN will look like:
```
arn:aws:iam::123456789012:role/AmazonBedrockExecutionRoleForAgents_Intellios
```

---

### 3. Foundation Model Access

The default foundation model is `anthropic.claude-3-5-sonnet-20241022-v2:0`. You must request access to this model in the target AWS region before deploying.

1. Open the AWS console → **Amazon Bedrock** → **Model access**
2. Click **Manage model access**
3. Find **Anthropic Claude 3.5 Sonnet v2** and request access
4. Wait for approval (usually instant for new accounts, may take hours for regulated regions)

To use a different model, update the `foundationModel` field in Admin → Settings → Deployment Targets.

---

### 4. Configure Intellios Admin Settings

In Intellios, navigate to **Admin → Settings → Deployment Targets**.

Fill in:

| Field | Value |
|---|---|
| **Enable AgentCore** | Toggle on |
| **AWS Region** | e.g. `us-east-1` (must match where you have model access) |
| **Agent Resource Role ARN** | The IAM role ARN from Step 2 |
| **Foundation Model** | `anthropic.claude-3-5-sonnet-20241022-v2:0` (or your approved model) |
| **Guardrail ID** | Optional — Bedrock Guardrail ID (e.g. `ABCD1234EFGH`) |
| **Guardrail Version** | Required if Guardrail ID is set |

> **Validation:** The settings form validates that the region matches the pattern `[a-z]{2}-[a-z]+-[0-9]+` (e.g. `us-east-1`) and the role ARN matches `arn:aws:iam::[12-digit-account]:role/[name]`. Invalid values are rejected at save time with a specific error message.

---

## Using the Export Path (No Live AWS Connection)

1. Navigate to an **approved** blueprint's detail page in the Agent Registry
2. Click **Export for AgentCore ↓** (also available in the Deploy Console)
3. Download the `manifest.json` file
4. Edit the file: replace `"arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME"` with your actual IAM role ARN
5. Apply with the AWS CLI:
   ```bash
   aws bedrock-agent create-agent \
     --cli-input-json file://manifest.json \
     --region us-east-1

   # After creation, prepare the agent:
   aws bedrock-agent prepare-agent \
     --agent-id AGENT_ID_FROM_ABOVE \
     --region us-east-1
   ```
6. The manifest includes deployment instructions; read them before applying.

---

## Using the Direct Deploy Path

1. Complete all steps in Prerequisites above
2. Navigate to **Deploy Console** (sidebar → Deploy)
3. Find your approved agent in the "Ready to Deploy" section
4. Click **Deploy to AgentCore…**
5. Review the confirmation modal — it shows what will be created
6. Click **Deploy** and wait up to 90 seconds
7. On success: agentId, ARN, region, and an AWS console link are shown
8. On failure: the error message will indicate the specific cause (IAM permissions, model access, quota, etc.) with suggested remediation steps

---

## Live Health Monitoring

Once agents are deployed to AgentCore, you can check their live Bedrock status:

1. Navigate to **Monitor** (sidebar → Monitor)
2. Scroll to the **AgentCore Live Status** section (only visible when AgentCore agents are deployed)
3. Click **Check Live AWS Status**
4. The table shows the Bedrock `agentStatus` per agent:
   - 🟢 **PREPARED** — agent is callable via `InvokeAgent`
   - 🟡 **PREPARING** — agent is being prepared (may need to wait and re-check)
   - 🔴 **FAILED / UNREACHABLE** — agent needs attention; check the Bedrock console

> Requires the same AWS credentials used for deployment to have `bedrock:GetAgent` permission.

---

## Known Limitations

| Limitation | Impact | Workaround |
|---|---|---|
| `agentVersion: "1"` stored in deployment record | The stored version is a placeholder, not Bedrock's actual agent version | Use `"DRAFT"` when calling `InvokeAgent` until this is fixed |
| Tool parameters use generic `input: string` schema | Bedrock agent has no knowledge of structured parameter types | Send structured JSON as a string in the `input` parameter; parse on your end |
| No re-deployment diff | Deploying a new blueprint version creates a new Bedrock agent (not an update) | Old agent remains in Bedrock; delete manually via the AWS console if no longer needed |
| 90-second preparation timeout | Complex agents (many tools) may occasionally time out | Check Bedrock console; if agent shows PREPARED there, the Intellios record may be stale |

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `AWS permission denied. Verify the IAM role has 'bedrock:CreateAgent'…` | The server's AWS credentials or the agent role ARN lacks required permissions | Add missing permissions to the IAM policy |
| `Invalid IAM role ARN. Update the agentResourceRoleArn…` | The ARN in Admin → Settings doesn't match `arn:aws:iam::ACCOUNT_ID:role/NAME` | Correct the ARN in settings |
| `Foundation model not found or not enabled in this region` | Model access not requested or not yet approved | Request access in AWS Bedrock → Model access |
| `AWS Bedrock agent quota exceeded` | Account-level quota for Bedrock agents reached | Request a quota increase in AWS Service Quotas for `bedrock:agents` |
| `Agent preparation timed out (90s)` | Bedrock took longer than 90 seconds to prepare | Check Bedrock console; if PREPARED, the issue is Intellios-side; try re-deploying |
| `AgentCore config missing: region` | Region field is empty in Admin → Settings | Fill in the region |
