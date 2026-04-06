---
id: "04-011"
title: "Webhook Integration"
slug: "webhook-integration"
type: "task"
audiences:
  - "engineering"
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
author: "Intellios Platform Engineering"
reviewers: []
tags:
  - "webhooks"
  - "lifecycle-events"
  - "integration"
  - "hmac-signing"
  - "event-driven"
prerequisites:
  - "04-001"
  - "04-012"
related:
  - "04-012"
  - "05-001"
  - "08-005"
next_steps:
  - "07-001"
  - "10-002"
feedback_url: "https://feedback.intellios.ai/kb"
tldr: >
  Configure outbound webhooks to receive HMAC-signed lifecycle events from Intellios
  (agent.created, agent.validated, agent.approved, policy.updated, etc.). Webhooks enable
  integration with CI/CD pipelines, SIEM systems, collaboration tools, and external audit
  systems. Register endpoints via the Admin Webhook Manager, verify HMAC signatures in your
  receiver, and monitor delivery health via the webhook log.
---

# Webhook Integration

> **TL;DR:** Register HTTPS endpoints in Intellios Admin Settings to receive HMAC-SHA256-signed lifecycle events. Every event (agent.created, agent.approved, policy.updated, etc.) is delivered with retry logic (3 attempts, exponential backoff). Verify signatures with the webhook secret; implement idempotent receivers. Monitor delivery health in the Admin Webhook Manager.

## Overview

Intellios emits lifecycle events whenever an agent blueprint or governance policy changes state. Webhooks allow you to route these events to external systems:
- **CI/CD pipelines:** Trigger deployment workflows when blueprints are approved
- **SIEM systems:** Alert on governance violations or policy changes
- **Collaboration tools:** Notify Slack, Microsoft Teams, or email groups of review requests
- **External audit systems:** Log policy changes and compliance decisions to archival systems
- **Custom automation:** Trigger custom workflows in your enterprise tooling

Webhooks are **enterprise-scoped**: each webhook only receives events for its own enterprise (via `enterprise_id` isolation in the webhooks table). Events are signed with HMAC-SHA256 using a per-webhook secret, enabling you to cryptographically verify authenticity and integrity.

---

## Event Types

Intellios emits 10 event types across two domains:

### Agent Lifecycle Events

| Event | Triggered | Payload Example |
|-------|-----------|-----------------|
| `agent.created` | Blueprint first generated from intake | `{ agentId, blueprintId, name, version }` |
| `agent.validated` | Governance validation completes (pass or fail) | `{ agentId, validationStatus, violations: [...] }` |
| `agent.submitted` | Designer submits blueprint for review | `{ agentId, blueprintId, submittedBy, submittedAt }` |
| `agent.approved` | Reviewer approves blueprint (all approval steps pass) | `{ agentId, approvedBy, approvedAt, approvalSteps: [...] }` |
| `agent.rejected` | Reviewer rejects blueprint | `{ agentId, rejectedBy, reason, rejectedAt }` |
| `agent.changes_requested` | Reviewer requests changes (partial rejection) | `{ agentId, requestedBy, reason, dueDate: null }` |
| `agent.deprecated` | Admin marks agent as deprecated | `{ agentId, deprecatedBy, deprecationReason }` |
| `agent.deployed` | Blueprint successfully deployed to runtime (e.g., AWS AgentCore) | `{ agentId, deploymentTarget, runtimeId, deployedAt }` |

### Policy Lifecycle Events

| Event | Triggered | Payload Example |
|-------|-----------|-----------------|
| `policy.created` | Admin creates a new governance policy | `{ policyId, name, type, version: 1 }` |
| `policy.updated` | Admin publishes new version of existing policy | `{ policyId, previousVersionId, newVersion: 2, updatedAt }` |

---

## Webhook Configuration

### Registering a Webhook

1. **Navigate to Admin Settings** → **Webhooks** → **Register Webhook**
2. **Fill in the form:**
   - **Name:** Human-readable identifier (e.g., "CI/CD Pipeline", "SIEM Alert")
   - **HTTPS URL:** The endpoint that receives events (HTTP rejected; must be HTTPS)
   - **Events to subscribe:** Select specific events or leave blank for all events
   - **Active:** Toggle on/off to pause deliveries without deletion

3. **Copy the secret:** After registration, Intellios generates a 32-byte HMAC secret and displays it once in an amber callout. Store this securely (e.g., in a password manager or vault).

**Example webhook registration:**
```
Name: "PagerDuty Integration"
URL: "https://events.pagerduty.com/v2/enqueue"
Events: ["agent.rejected", "agent.changes_requested"]
Secret: "a3f7e9b2d1c4a6f8e9b2d1c4a6f8e9b2" (displayed once)
Active: true
```

### Configuration Options

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | yes | Display name in webhook manager; no functional impact |
| `url` | string (HTTPS URL) | yes | Must start with `https://`; HTTP rejected at registration |
| `events` | array of event type strings | no | Empty array means subscribe to all event types |
| `secret` | string (32-byte hex) | auto-generated | Generated by Intellios; never retrievable after display; use rotate to get a new one |
| `active` | boolean | yes (default: true) | Toggle to pause/resume without deletion |

---

## Webhook Payload Structure

Every webhook delivery includes the same structure:

```json
{
  "event": "agent.approved",
  "timestamp": "2026-04-05T14:32:18Z",
  "enterpriseId": "acme-corp",
  "agentId": "3f7a1b2c-9d4e-5f6a-8b9c-1d2e3f4a5b6c",
  "blueprintId": "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
  "data": {
    "approvedBy": "reviewer@acme.com",
    "approvedAt": "2026-04-05T14:32:10Z",
    "approvalSteps": [
      {
        "step": 1,
        "status": "passed",
        "reviewedBy": "compliance@acme.com",
        "reviewedAt": "2026-04-05T14:30:00Z"
      },
      {
        "step": 2,
        "status": "passed",
        "reviewedBy": "security@acme.com",
        "reviewedAt": "2026-04-05T14:31:30Z"
      }
    ]
  }
}
```

### Payload Fields

| Field | Type | Always Present | Notes |
|-------|------|---|---|
| `event` | string | yes | One of the 10 EventType values |
| `timestamp` | ISO 8601 string | yes | Event creation time (UTC) |
| `enterpriseId` | string | yes | Tenant identifier (enterprise_id from webhooks table) |
| `agentId` | uuid | yes (agent events) | For agent lifecycle events; omitted for policy events |
| `blueprintId` | uuid | yes (agent events) | For agent lifecycle events |
| `policyId` | uuid | yes (policy events) | For policy lifecycle events |
| `data` | object | yes | Event-specific details (varies by event type) |

---

## HMAC-SHA256 Signature Verification

Every webhook delivery includes an `X-Intellios-Signature` header containing an HMAC-SHA256 digest computed over the raw request body.

### Verification Algorithm

1. Extract the `X-Intellios-Signature` header: `sha256=<hex_digest>`
2. Retrieve your webhook secret (from Intellios Admin Settings)
3. Recompute the HMAC:
   ```
   computed_digest = HMAC-SHA256(secret, raw_request_body)
   ```
4. Compare `computed_digest` (hex-encoded) with the header value using constant-time comparison
5. If they match, the payload is authentic and unmodified; process it
6. If they don't match, reject the delivery and log an authentication failure

### Implementation Example — Node.js with Express

```javascript
import crypto from 'node:crypto';
import express from 'express';

const app = express();

// Middleware: Parse raw body for signature verification
app.use(express.raw({ type: 'application/json' }));

// Verify HMAC signature
function verifyWebhookSignature(req) {
  const signature = req.headers['x-intellios-signature'];
  if (!signature) {
    return false; // Missing signature
  }

  // Extract hex digest from "sha256=<hex>"
  const [algo, digest] = signature.split('=');
  if (algo !== 'sha256') {
    return false;
  }

  // Retrieve secret from your secure store (e.g., environment variable)
  const secret = process.env.INTELLIOS_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('INTELLIOS_WEBHOOK_SECRET not configured');
  }

  // Recompute HMAC over raw body
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(req.body); // req.body is Buffer (from express.raw)
  const computed = hmac.digest('hex');

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(digest, 'hex'),
    Buffer.from(computed, 'hex')
  );
}

// Webhook endpoint
app.post('/webhooks/intellios', (req, res) => {
  // 1. Verify signature
  if (!verifyWebhookSignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 2. Parse JSON
  let payload;
  try {
    payload = JSON.parse(req.body.toString());
  } catch (err) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // 3. Handle based on event type
  const { event, agentId, data } = payload;
  console.log(`Received event: ${event} for agent ${agentId}`);

  switch (event) {
    case 'agent.approved':
      // Trigger CI/CD pipeline
      triggerDeployment(agentId, data);
      break;
    case 'agent.rejected':
      // Notify team
      notifyTeam(`Agent ${agentId} was rejected`, data);
      break;
    case 'policy.updated':
      // Update compliance records
      updateComplianceLog(data);
      break;
    default:
      console.warn(`Unhandled event type: ${event}`);
  }

  // 4. Respond with 200 OK (Intellios considers 2xx responses as success)
  res.status(200).json({ received: true });
});

app.listen(3000, () => console.log('Webhook receiver running on :3000'));
```

### Implementation Example — Python with Flask

```python
import hmac
import hashlib
import json
from flask import Flask, request

app = Flask(__name__)
WEBHOOK_SECRET = os.environ.get('INTELLIOS_WEBHOOK_SECRET')

def verify_webhook_signature(body, signature_header):
    """Verify HMAC-SHA256 signature."""
    if not signature_header or not signature_header.startswith('sha256='):
        return False

    expected_digest = signature_header.split('=')[1]
    computed_hmac = hmac.new(
        WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256
    ).hexdigest()

    # Constant-time comparison
    return hmac.compare_digest(expected_digest, computed_hmac)

@app.route('/webhooks/intellios', methods=['POST'])
def handle_webhook():
    # 1. Verify signature
    signature = request.headers.get('X-Intellios-Signature')
    if not verify_webhook_signature(request.get_data(), signature):
        return {'error': 'Invalid signature'}, 401

    # 2. Parse JSON
    try:
        payload = request.json
    except:
        return {'error': 'Invalid JSON'}, 400

    # 3. Process event
    event = payload.get('event')
    agent_id = payload.get('agentId')
    data = payload.get('data')

    if event == 'agent.approved':
        trigger_ci_cd_pipeline(agent_id, data)
    elif event == 'policy.updated':
        update_compliance_log(data)

    # 4. Return 200 OK
    return {'received': True}, 200

if __name__ == '__main__':
    app.run(port=3000)
```

---

## Delivery Retry Logic

If your webhook endpoint is temporarily unavailable or returns a non-2xx status code, Intellios retries the delivery up to 3 times with exponential backoff:

| Attempt | Initial Delay | Cumulative Time |
|---------|---|---|
| 1 | 0 ms | 0 ms |
| 2 | 1000 ms (1 sec) | 1 sec |
| 3 | 2000 ms (2 sec) | 3 sec |

**After 3 failed attempts**, the delivery is logged as `failed` in the webhook delivery log. No automatic recovery occurs; you must manually re-trigger via the Admin Webhook Manager or wait for a matching event.

### Success Criteria

Intellios considers a delivery successful if:
- The webhook endpoint responds with HTTP status 200–299 (2xx)
- The response is received within 30 seconds of request initiation

Any other response (3xx, 4xx, 5xx, timeout, connection error) counts as a failure and triggers a retry.

---

## Testing Webhooks

The Admin Webhook Manager includes a built-in **Test Delivery** button for each webhook. This sends a synchronous test payload matching the registered event subscriptions:

1. **Navigate to:** Admin Settings → Webhooks → [Your Webhook] → **Test Delivery**
2. **View the result:**
   - **Success:** "Delivery succeeded (HTTP 200)"
   - **Timeout:** "Request timed out after 30 seconds"
   - **Other errors:** HTTP status code and first 500 chars of response body

Test deliveries are logged to the webhook delivery history for debugging.

### Test Payload Structure

```json
{
  "event": "agent.created",
  "timestamp": "2026-04-05T14:45:00Z",
  "enterpriseId": "acme-corp",
  "agentId": "test-agent-id-12345",
  "blueprintId": "test-blueprint-id-67890",
  "data": {
    "name": "Test Blueprint",
    "version": "1.0.0",
    "status": "draft"
  }
}
```

---

## Webhook Manager — Monitoring & Troubleshooting

The Admin Webhook Manager (`/admin/webhooks`) provides full visibility into webhook health and history.

### Per-Webhook Dashboard

**Status Overview:**
- Webhook name, URL, created date
- Active/Inactive toggle
- Last delivery timestamp
- Recent delivery status summary (e.g., "3 successes, 1 failure in last 24h")

**Event Subscriptions:**
- Display which events this webhook is subscribed to
- Click to edit subscriptions

**Actions:**
- **Test Delivery:** Send a synchronous test payload to verify connectivity
- **Rotate Secret:** Generate a new HMAC secret (old secret continues working for 24h grace period)
- **View Deliveries:** Expandable log of last 20 delivery attempts

### Delivery Log

For each delivery, you'll see:

| Column | Description |
|--------|---|
| Event | Event type (e.g., agent.approved) |
| Status | success \| failed |
| HTTP Code | Response status code (e.g., 200, 500, timeout) |
| Attempts | Number of retry attempts consumed |
| Timestamp | When the final delivery attempt occurred |
| Response Body | First 500 characters of the HTTP response body |

**Click a delivery row** to see full details:
- Raw payload sent
- All retry attempt timestamps
- Full response body

### Troubleshooting Common Issues

| Symptom | Likely Cause | Solution |
|---------|---|---|
| "Deliveries failing with HTTP 401" | Invalid signature or secret mismatch | Verify your receiver is using the correct webhook secret from Intellios Admin Settings |
| "Timeouts after 30s" | Webhook endpoint too slow | Optimize your receiver endpoint; consider async processing with a job queue |
| "No deliveries logged for recent events" | Webhook disabled or event not subscribed | Check `active` toggle in Admin Webhook Manager; verify event filter matches your use case |
| "Signature verification failing" | Raw body parsing issue | Ensure you're computing HMAC over the raw HTTP body (not the parsed JSON); don't re-encode or minify |
| "Event X never delivers" | Enterprise scope isolation or event doesn't occur | Verify the event is actually being emitted; check enterprise_id matches; use test delivery button |

---

## Idempotency & Deduplication

Webhook deliveries are **not deduplicated** at the Intellios level. If the same event is emitted twice (e.g., due to a race condition), both deliveries will be sent to all subscribed webhooks.

**Your receiver should implement idempotency:**

1. **Store a delivery receipt** with a unique identifier:
   ```json
   {
     "delivery_id": "<computed hash of event + timestamp>",
     "event": "agent.approved",
     "processed_at": "2026-04-05T14:32:18Z"
   }
   ```

2. **Check if already processed** before taking action:
   ```
   if (isReceivedAndProcessed(delivery_id)) {
     return 200 OK; // Already handled, return success to acknowledge
   }
   ```

3. **Store the receipt** after successful processing so you don't process twice if Intellios retries.

---

## Security Best Practices

1. **Store secrets securely:** Use environment variables, a secrets vault (HashiCorp Vault, AWS Secrets Manager), or encrypted configuration. Never commit webhook secrets to source control.

2. **Always verify signatures:** Implement HMAC verification as shown above; never skip it even if you trust the network.

3. **Use HTTPS only:** Intellios rejects HTTP webhook URLs at registration. Always use HTTPS to prevent man-in-the-middle attacks.

4. **Rotate secrets periodically:** Use the "Rotate Secret" button in the Admin Webhook Manager to generate a new secret. Old secrets continue working for 24 hours, allowing you to update your receiver gracefully.

5. **Implement rate limiting:** If you receive many events, add rate limiting to your receiver to prevent abuse or accidental DoS.

6. **Log all deliveries:** Store delivery logs (payload, signature, timestamp) for audit purposes. Retain logs for at least 90 days.

7. **Monitor for anomalies:** Set up alerts if webhook delivery success rate drops below your SLA (e.g., <99%).

---

## Common Use Cases

### CI/CD Integration (GitHub Actions)

Trigger a deployment workflow when a blueprint is approved:

```yaml
# .github/workflows/deploy-approved-agents.yml
name: Deploy Approved Agents

on:
  repository_dispatch:
    types: [intellios_agent_approved]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to AgentCore
        env:
          AGENT_ID: ${{ github.event.client_payload.agentId }}
          DEPLOYMENT_MANIFEST: ${{ github.event.client_payload.data }}
        run: |
          # Trigger your deployment pipeline
          aws codedeploy create-deployment \
            --application-name my-agents \
            --deployment-group-name production \
            --github-location repository=$AGENT_ID
```

**Intellios webhook receiver (Node.js):**
```javascript
app.post('/webhooks/intellios', async (req, res) => {
  const payload = req.body;
  if (payload.event === 'agent.approved') {
    // Dispatch repository_dispatch event to trigger Actions
    await github.repos.createDispatchEvent({
      owner: 'my-org',
      repo: 'agent-deployment',
      event_type: 'intellios_agent_approved',
      client_payload: {
        agentId: payload.agentId,
        data: payload.data
      }
    });
  }
  res.json({ received: true });
});
```

### SIEM Integration (Splunk)

Forward governance violations to your SIEM:

```javascript
app.post('/webhooks/intellios', async (req, res) => {
  const payload = req.body;

  // Forward agent.validated with violations
  if (payload.event === 'agent.validated' && payload.data.violations?.length > 0) {
    const splunkEvent = {
      source: 'intellios',
      sourcetype: 'governance_violation',
      event: {
        agentId: payload.agentId,
        violations: payload.data.violations,
        timestamp: payload.timestamp
      }
    };

    await fetch('https://your-splunk.com/services/collector', {
      method: 'POST',
      headers: { 'Authorization': `Splunk ${SPLUNK_HEC_TOKEN}` },
      body: JSON.stringify(splunkEvent)
    });
  }

  res.json({ received: true });
});
```

### Slack Notifications

Post approval decisions to a Slack channel:

```javascript
app.post('/webhooks/intellios', async (req, res) => {
  const payload = req.body;

  if (payload.event === 'agent.approved') {
    const slackMessage = {
      channel: '#governance-approvals',
      text: `Blueprint approved: ${payload.data.name || payload.blueprintId}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Agent Approved* 🎉\nAgent: ${payload.data.name}\nApproved by: ${payload.data.approvedBy}`
          }
        }
      ]
    };

    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      body: JSON.stringify(slackMessage)
    });
  }

  res.json({ received: true });
});
```

---

## Rotating Webhook Secrets

Over time, you may need to rotate your webhook secret (e.g., if exposed, as part of security hygiene, or to revoke access).

1. **In Admin Webhook Manager**, click **Rotate Secret** for the webhook
2. **Intellios generates a new 32-byte hex secret** and displays it in an amber callout
3. **Copy the new secret** and update your receiver endpoint's environment variables
4. **Old secret remains valid for 24 hours** to allow gradual migration
5. **After 24 hours**, the old secret is invalidated; only the new secret works

---

## Webhook Delivery Log Schema

For auditing and debugging, Intellios stores all webhook deliveries in the `webhook_deliveries` table:

| Column | Type | Description |
|--------|------|---|
| `id` | UUID | Unique delivery attempt ID |
| `webhookId` | UUID | Foreign key to webhooks table |
| `enterpriseId` | text | Tenant identifier |
| `eventType` | text | Event type (agent.created, etc.) |
| `payload` | JSONB | Full webhook payload sent |
| `status` | text | pending \| success \| failed |
| `responseStatus` | integer | HTTP status code (e.g., 200, 500) |
| `responseBody` | text | First 500 chars of response body |
| `attempts` | integer | Number of retry attempts |
| `lastAttemptedAt` | timestamp | When the most recent attempt occurred |
| `createdAt` | timestamp | When the delivery was first queued |

**Query recent failures:**
```sql
SELECT id, webhookId, eventType, responseStatus, responseBody, lastAttemptedAt
FROM webhook_deliveries
WHERE status = 'failed'
  AND enterpriseId = 'acme-corp'
  AND createdAt > now() - interval '24 hours'
ORDER BY lastAttemptedAt DESC;
```

---

## Summary

- **Register webhooks** via Admin Settings with an HTTPS URL and optional event filter
- **Store your webhook secret securely** (environment variables, vault, etc.)
- **Verify HMAC-SHA256 signatures** in your receiver using the secret
- **Implement idempotent processing** to handle retries gracefully
- **Monitor delivery health** in the Admin Webhook Manager
- **Rotate secrets** periodically using the Admin UI
- **Test deliveries** before deploying to production

Webhooks transform Intellios from a governance silo into an integration hub, enabling your enterprise tooling to react in real-time to agent lifecycle and policy changes.
