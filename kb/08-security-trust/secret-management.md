---
id: 08-005
title: Secret Management
slug: secret-management
type: task
audiences:
- engineering
status: published
created: &id001 2026-04-05
updated: *id001
tags:
- secrets
- credentials
- API keys
- encryption
- rotation
- access control
tldr: How to manage API keys, credentials, and sensitive data in Intellios
---

# Secret Management

This guide covers secret management in Intellios: how to store, access, rotate, and audit sensitive credentials.

---

## Types of Secrets in Intellios

### 1. LLM Provider API Keys

**Used for:** Claude API calls, AWS Bedrock authentication

**Examples:**
```
ANTHROPIC_API_KEY=sk-ant-xxx...  (Claude)
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE  (Bedrock)
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**Security:** Critical (if exposed, attacker can generate agents on your account, incurring costs)

### 2. Database Credentials

**Used for:** PostgreSQL authentication

**Examples:**
```
DB_USER=intellios_admin
DB_PASSWORD=xxx...
DB_HOST=intellios-prod.xxxxx.rds.amazonaws.com
```

**Security:** Critical (if exposed, attacker can read/modify all data)

### 3. Webhook Signing Secrets

**Used for:** Verify webhooks come from Intellios (not spoofed)

**Examples:**
```
WEBHOOK_SIGNING_SECRET=whsec_xxx...  (HMAC key for signing)
```

**Security:** High (if exposed, attacker can spoof webhooks, triggering false deployments)

### 4. Runtime Adapter Credentials

**Used for:** Third-party integrations (e.g., custom deployment targets, data sources)

**Examples:**
```
CUSTOM_RUNTIME_API_KEY=xxx...  (For custom orchestration system)
DATA_SOURCE_TOKEN=xxx...  (For proprietary database)
```

**Security:** Medium to High (depends on system)

### 5. SSL/TLS Certificates

**Used for:** HTTPS encryption

**Examples:**
```
CERT_PATH=/etc/ssl/certs/intellios.crt
CERT_KEY_PATH=/etc/ssl/private/intellios.key
```

**Security:** Critical (if exposed, attacker can intercept HTTPS traffic)

---

## Storage: AWS Secrets Manager (Recommended)

### Overview

**AWS Secrets Manager** is a managed service for storing and rotating secrets. Intellios uses it as the primary secrets store.

**Benefits:**
- Encrypted at rest (AES-256)
- Encrypted in transit (TLS)
- Rotation policies (automatic, scheduled rotation)
- Access logging (all access audited)
- Fine-grained access control (IAM)

---

### Setting Up Secrets

**Step 1: Create secret in AWS Console**

```bash
aws secretsmanager create-secret \
  --name intellios/production/anthropic-api-key \
  --secret-string "sk-ant-xxx..." \
  --description "Claude API key for production generation engine"

# Output:
# {
#   "ARN": "arn:aws:secretsmanager:us-east-1:123456789012:secret:intellios/production/anthropic-api-key-AbCdEf",
#   "Name": "intellios/production/anthropic-api-key"
# }
```

**Step 2: Retrieve secret in application code**

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

async function getApiKey() {
  const client = new SecretsManagerClient({ region: "us-east-1" });
  const command = new GetSecretValueCommand({
    SecretId: "intellios/production/anthropic-api-key"
  });

  try {
    const response = await client.send(command);
    return response.SecretString;  // Returns "sk-ant-xxx..."
  } catch (error) {
    throw new Error(`Failed to retrieve secret: ${error.message}`);
  }
}

// Usage in generation engine
const apiKey = await getApiKey();
const response = await anthropic.messages.create({
  api_key: apiKey,
  // ... rest of params
});
```

**Step 3: Grant IAM permissions**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:intellios/production/*"
      ]
    }
  ]
}
```

---

## Storage: Environment Variables (Limited Use)

**When to use:** Development only, or non-sensitive config

**Example:**
```bash
# Development only
export ANTHROPIC_API_KEY=sk-ant-dev-xxx...
export LOG_LEVEL=DEBUG
```

**WARNING:** Never use environment variables for production secrets. Risks:

- Secrets visible in process listings (`ps aux`)
- Secrets leaked in error messages, logs
- Secrets captured in debugging output
- Docker image history exposes env vars

**Exception:** When running in ECS/Lambda, use AWS Secrets Manager (not env vars).

---

## Storage: On-Premises / Self-Hosted

If deploying Intellios on-premises or in a private cloud without AWS Secrets Manager:

### Option 1: HashiCorp Vault

**Setup:**
```bash
# 1. Deploy Vault (HA, self-managed)
vault server -config=/etc/vault/config.hcl

# 2. Store secret
vault kv put secret/intellios/production/anthropic-api-key \
  key="sk-ant-xxx..."

# 3. Retrieve in application
curl --header "X-Vault-Token: $VAULT_TOKEN" \
  http://vault.internal:8200/v1/secret/data/intellios/production/anthropic-api-key
```

### Option 2: Encrypted Configuration File

**Setup:**
```yaml
# secrets-config.enc.yaml (encrypted with GPG)
---
lln_provider_api_key:
  anthropic: "sk-ant-xxx..."  # GPG encrypted
  bedrock_role_arn: "arn:aws:iam::..."

database:
  password: "xxx..."  # GPG encrypted

# Decrypt at runtime
gpg --decrypt secrets-config.enc.yaml > secrets-config.yaml
```

**Warning:** Less secure than Vault or Secrets Manager; requires careful key management.

---

## Secret Rotation

### Automatic Rotation (AWS Secrets Manager)

**Setup rotation policy:**

```bash
aws secretsmanager rotate-secret \
  --secret-id intellios/production/anthropic-api-key \
  --rotation-rules AutomaticallyAfterDays=90 \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:123456789012:function:rotate-anthropic-key
```

**Rotation function (Lambda):**

```typescript
// lambda/rotate-anthropic-key.ts
export async function handler(event: any) {
  const secretId = event.ClientRequestToken;
  const step = event.ClientRequestToken;

  if (step === "create") {
    // 1. Generate new API key from Anthropic
    const newKey = await anthropic.createApiKey();

    // 2. Store new secret version in Secrets Manager
    await secretsManager.putSecretValue({
      SecretId: "intellios/production/anthropic-api-key",
      ClientRequestToken: secretId,
      SecretString: newKey,
      VersionStages: ["AWSPENDING"]
    });
  } else if (step === "set") {
    // 3. Update application config to use new key
    // (Usually done via Lambda environment variable or config reload)

    // 4. Finalize secret rotation
    await secretsManager.updateSecretVersionStage({
      SecretId: "intellios/production/anthropic-api-key",
      VersionStage: "AWSCURRENT"
    });
  } else if (step === "test") {
    // Test new key is valid
    const response = await anthropic.messages.create({
      api_key: newKey,
      model: "claude-3-5-sonnet",
      messages: [{ role: "user", content: "test" }]
    });

    if (!response) throw new Error("New key test failed");
  }
}
```

**Rotation schedule:**
- API keys: Every 90 days (or on-demand if compromised)
- Database passwords: Every 30 days
- Webhook secrets: Every 180 days

---

## Access Control

### IAM Permissions

**Principle:** Least privilege. Grant only needed permissions to specific principals.

**Example: Service role for Intellios API**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "GetLlmApiKey",
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:intellios/production/anthropic-api-key-*"
    },
    {
      "Sid": "GetDatabasePassword",
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:intellios/production/db-password-*"
    }
  ]
}
```

**Denied by default:**
- Humans cannot read secrets (only machines via IAM)
- Developers cannot retrieve production secrets without approval
- Runtime adapters cannot access LLM credentials (isolation)

**Exception flow (human needs to read secret):**

```bash
# 1. Developer requests secret access
aws secretsmanager describe-secret \
  --secret-id intellios/production/anthropic-api-key
# Output: "Access Denied (admin approval required)"

# 2. Admin grants temporary access (5-minute window)
aws iam put-user-policy \
  --user-name alice \
  --policy-name temp-secret-access \
  --policy-document file://temp-access-policy.json

# 3. Developer retrieves secret (audit logged)
aws secretsmanager get-secret-value \
  --secret-id intellios/production/anthropic-api-key

# 4. Admin revokes access after 5 minutes
aws iam delete-user-policy \
  --user-name alice \
  --policy-name temp-secret-access
```

---

## Audit Logging

### CloudTrail Logging (All Secret Access)

**Every secret access is logged:**

```json
{
  "eventVersion": "1.05",
  "eventTime": "2026-04-05T14:32:00Z",
  "eventSource": "secretsmanager.amazonaws.com",
  "eventName": "GetSecretValue",
  "awsRegion": "us-east-1",
  "sourceIPAddress": "10.0.1.42",  // Intellios Lambda function
  "userAgent": "aws-cli/2.0.0",
  "requestParameters": {
    "secretId": "intellios/production/anthropic-api-key"
  },
  "responseElements": null,
  "requestID": "abc12345-1234-1234-1234-123456789012",
  "eventID": "xyz98765-9876-9876-9876-987654321098",
  "eventType": "AwsApiCall",
  "recipientAccountId": "123456789012"
}
```

**Key fields:**
- `eventName`: What happened (GetSecretValue, PutSecretValue, RotateSecret)
- `sourceIPAddress`: Where the access came from
- `eventTime`: When it happened
- `requestParameters`: Which secret

**Audit queries:**
```bash
# Who accessed the API key?
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=anthropic-api-key \
  --max-results 50
```

---

## Best Practices

1. **Never log secrets:**
   ```typescript
   // BAD
   console.log(`Using API key: ${apiKey}`);

   // GOOD
   console.log(`Using API key: ${apiKey.substring(0, 10)}...`);
   ```

2. **Never pass secrets as environment variables in containers:**
   ```dockerfile
   # BAD
   FROM node:20
   ENV ANTHROPIC_API_KEY=sk-ant-xxx...

   # GOOD
   FROM node:20
   # Leave API key out; retrieve at runtime from Secrets Manager
   ```

3. **Rotation before expiration:**
   - Rotate every 30-90 days (before natural expiration)
   - Test new secrets before switching

4. **Alert on unauthorized access:**
   ```bash
   # CloudWatch alarm: More than 5 failed secret access attempts in 1 min
   aws cloudwatch put-metric-alarm \
     --alarm-name secret-access-failures \
     --alarm-description "Alert on secret access failures" \
     --metric-name UnauthorizedAPIAccessCount \
     --threshold 5
   ```

5. **Encryption in logs:**
   - Do not log full secrets
   - Log only action (GetSecretValue) and principal (IAM role)

---

## Incident: Secret Compromise

**If you suspect a secret has been compromised:**

1. **Immediately rotate:**
   ```bash
   aws secretsmanager rotate-secret --secret-id intellios/production/anthropic-api-key --rotate-immediately
   ```

2. **Revoke old credential** (at source):
   - Anthropic: Revoke API key in console
   - AWS: Delete access key
   - Database: Change password

3. **Audit access logs:**
   ```bash
   aws cloudtrail lookup-events \
     --lookup-attributes AttributeKey=ResourceName,AttributeValue=anthropic-api-key \
     --start-time 2026-04-01T00:00:00Z \
     --max-results 100
   ```

4. **Notify stakeholders:**
   - Security team
   - Compliance
   - Affected customers (if customer secret compromised)

---

## Testing Secret Management

**Unit test: Secret retrieval**

```typescript
describe("Secret Management", () => {
  it("should retrieve API key without exposing it", async () => {
    const apiKey = await getApiKey();
    expect(apiKey).toBeDefined();
    expect(apiKey.length).toBeGreaterThan(10);

    // Verify logging doesn't expose secret
    const logs = captureConsoleLogs();
    expect(logs).not.toContain(apiKey);
  });

  it("should fail if IAM role lacks permissions", async () => {
    // Remove IAM permission temporarily
    await removeSecretsManagerPermission();

    try {
      await getApiKey();
      fail("Should have thrown");
    } catch (e) {
      expect(e.message).toContain("Access Denied");
    } finally {
      // Restore permission
      await grantSecretsManagerPermission();
    }
  });
});
```

---

## Troubleshooting

### "Access Denied" when retrieving secret

**Causes:**
1. IAM role lacks `secretsmanager:GetSecretValue` permission
2. Secret resource ARN not in IAM policy
3. IAM policy still being propagated (wait 1-5 minutes)

**Fix:**
```bash
# Verify IAM permissions
aws iam get-role-policy --role-name intellios-api --policy-name secrets-access

# Check if secret exists
aws secretsmanager describe-secret --secret-id intellios/production/anthropic-api-key
```

### Secret rotation failing

**Causes:**
1. Lambda function lacks permissions to update secret
2. New credential invalid (e.g., API key generation failed)
3. Application not reloading new secret (still using old key)

**Fix:**
```bash
# Check rotation history
aws secretsmanager describe-secret --secret-id intellios/production/anthropic-api-key

# View rotation logs
aws logs tail /aws/lambda/rotate-anthropic-key --follow
```

---

## Support

**Questions about secret management?**

- **Security team:** [PLACEHOLDER: security@intellios.com]
- **Engineering team:** [PLACEHOLDER: engineering@intellios.com]
- **AWS support:** [PLACEHOLDER: AWS Enterprise Support account]

