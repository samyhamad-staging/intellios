---
id: "10-010"
title: "Webhook Events Not Received by External System"
slug: "webhook-delivery-failures"
type: "troubleshooting"
audiences: ["engineering"]
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
tags: ["webhooks", "events", "delivery", "integrations", "networking"]
tldr: "Webhook events fail to reach external endpoint. Check: invalid endpoint URL, HMAC signature mismatch, target server timeout, SSL certificate validation errors. Verify webhook configuration and endpoint health."
feedback_url: "https://feedback.intellios.ai/kb"
---

## TL;DR

Webhook delivery fails silently or returns error. Common causes: invalid/unreachable endpoint URL, HMAC signature verification failure, target timeout (>30s), SSL certificate validation error, or wrong webhook secret. Verify endpoint accessibility and signature configuration.

---

## Symptom

- Webhook events not arriving at external system despite being configured
- Webhook status shows "Failed" or "Error" in Admin → Webhooks
- External system never receives POST requests from Intellios platform
- Webhook retry attempts (up to 5 retries over 24 hours) all fail
- Admin logs show webhook delivery error: `WEBHOOK_DELIVERY_FAILED`

---

## Possible Causes (by likelihood)

1. **Invalid endpoint URL** — URL unreachable, DNS unresolvable, or permanently redirecting
2. **HMAC signature mismatch** — Webhook secret incorrect or signature validation logic flawed
3. **Target server timeout** — External endpoint takes >30 seconds to respond
4. **SSL certificate error** — Self-signed cert, expired cert, or untrusted CA
5. **Firewall/network blocking** — Intellios IP blocked by target network; target behind VPN/bastion

---

## Diagnosis Steps

### Step 1: Verify webhook configuration
Log into platform → Administration → Webhooks. Check:
- Endpoint URL is valid and matches actual receiving service
- Event subscriptions correct (e.g., `blueprint.created`, `blueprint.approved`)
- Webhook secret is stored securely and matches implementation

### Step 2: Test endpoint accessibility
```bash
# Simple health check to target endpoint
curl -i -X POST https://your-webhook-endpoint.com/events \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Expected response: 200 OK or 202 Accepted
# If timeout or connection refused, endpoint unreachable
```

### Step 3: Check URL format and DNS
```bash
# Verify URL is properly formatted and resolvable
nslookup your-webhook-endpoint.com

# Check for redirects
curl -iL https://your-webhook-endpoint.com/events

# Look for 301/302/307 responses; if found, update webhook URL
```

### Step 4: Verify HMAC signature validation
```bash
# Webhook events include X-Intellios-Signature header (HMAC-SHA256)
# Your endpoint should validate as follows:

import hmac
import hashlib

def verify_signature(payload_body, signature_header, secret):
    expected_signature = hmac.new(
        secret.encode(),
        payload_body,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected_signature, signature_header)

# If verify_signature returns False, signature validation failed
# Check that secret matches the one in Intellios Admin panel
```

### Step 5: Check SSL certificate
```bash
# Inspect SSL certificate validity
openssl s_client -connect your-webhook-endpoint.com:443

# Look for: "Verify return code: 0 (ok)"
# If error, certificate is invalid or untrusted
```

### Step 6: Review webhook delivery logs
Platform → Administration → Logs. Filter by "webhooks". Look for:
- `WEBHOOK_SIGNATURE_VERIFICATION_FAILED` — Secret mismatch
- `WEBHOOK_ENDPOINT_TIMEOUT` — Target took >30s
- `WEBHOOK_SSL_CERTIFICATE_ERROR` — Certificate validation failed
- `WEBHOOK_DNS_RESOLUTION_FAILED` — URL unresolvable

---

## Resolution

### If endpoint URL invalid:
1. Verify the endpoint URL in your external system (e.g., your backend API)
2. Test with `curl` to confirm it's accessible:
   ```bash
   curl -X POST https://your-correct-endpoint.com/events \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```
3. Update webhook configuration in Intellios Admin → Webhooks
4. Save changes
5. **Verify:** Test event manually by triggering action (e.g., create a blueprint) and check external logs

### If HMAC signature mismatch:
1. Copy webhook secret from Intellios Admin → Webhooks → Details
2. Update your endpoint implementation to use correct secret:
   ```python
   SECRET = "your_webhook_secret_from_intellios"  # Copy from Admin panel
   signature = hmac.new(SECRET.encode(), payload_body, hashlib.sha256).hexdigest()
   ```
3. Ensure payload_body is the raw request body bytes (not parsed JSON)
4. Redeploy your endpoint
5. **Verify:** Next webhook triggers without signature validation errors; logs show 200 OK

### If target timeout:
1. Optimize your endpoint code to respond within 10 seconds
2. If processing is slow, implement async: return 202 Accepted immediately, process event in background job
3. Example (Express.js):
   ```javascript
   app.post('/events', (req, res) => {
     res.status(202).send('Accepted');
     processEventAsync(req.body);
   });
   ```
4. Redeploy and test
5. **Verify:** Endpoint responds with 202 in <2s

### If SSL certificate error:
1. **For self-signed certs in dev:** Update Intellios webhook config to disable SSL verification (dev only):
   - Navigate to Webhooks → Advanced Settings
   - Toggle "Verify SSL Certificate" OFF
   - Save
2. **For production:** Use a valid certificate from a trusted CA (e.g., Let's Encrypt)
   - Regenerate/renew certificate
   - Update your server config
   - Verify with: `openssl s_client -connect your-endpoint.com:443`
3. Re-enable SSL verification in Intellios
4. **Verify:** `openssl` shows "Verify return code: 0 (ok)"

### If firewall/network blocking:
1. Contact your network team; request allowlist for Intellios IP ranges
   - Intellios webhook sender IPs: `10.0.0.0/8` (contact support for exact range)
2. If behind VPN, coordinate with your security team to allow inbound webhook traffic
3. If using bastion/jumphost, ensure webhook endpoint is accessible from bastion
4. Test connectivity:
   ```bash
   telnet your-endpoint.com 443
   ```
5. **Verify:** Telnet succeeds; webhook status shows "Healthy"

---

## Prevention

- **Endpoint monitoring:** Monitor webhook endpoints with synthetic checks; alert if >95% failure rate
- **Signature validation:** Always validate HMAC signatures; log all validation failures
- **Timeout budgeting:** Design endpoints to respond in <5 seconds; use async for heavy processing
- **Certificate management:** Auto-renew SSL certificates 60 days before expiration
- **Webhook testing:** Use a webhook testing tool (e.g., webhook.site) before deploying to production

---

## Escalation

For network access issues or to whitelist Intellios IPs, see [escalation-paths.md](../escalation-paths.md).

---

## Related Articles

- [Webhook Configuration Guide](../04-architecture-integration/webhook-setup.md)
- [Event Types Reference](../04-architecture-integration/event-types.md)
- [Signature Verification Implementation](../04-architecture-integration/webhook-security.md)
- [Integration Patterns](../06-use-cases-playbooks/integration-patterns.md)
