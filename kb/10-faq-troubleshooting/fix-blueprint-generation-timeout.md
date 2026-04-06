---
id: "10-009"
title: "Blueprint Generation Hangs or Times Out"
slug: "blueprint-generation-timeout"
type: "troubleshooting"
audiences: ["engineering"]
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
tags: ["generation", "timeout", "performance", "large-blueprints", "rate-limiting"]
tldr: "Blueprint generation times out when intake payload is too complex (>500KB), LLM rate limits are exceeded, or database connections are exhausted. Monitor payload size, reduce concurrent requests, and check rate limit headers."
feedback_url: "https://feedback.intellios.ai/kb"
---

## TL;DR

Blueprint generation timeout or hangs. Causes: intake payload exceeds 500KB complexity limit, LLM rate limiting (60 req/min default), or database connection exhaustion. Check payload size, reduce concurrent requests, and verify rate limit quota in response headers.

---

## Symptom

- Blueprint generation hangs for >10 minutes without completing
- Generation returns HTTP status code **504 Gateway Timeout** or **408 Request Timeout**
- UI shows spinner indefinitely; user clicks "Cancel" to stop
- Generation Engine logs show timeout errors: `GENERATION_TIMEOUT` or `EXTERNAL_SERVICE_TIMEOUT`
- Multiple concurrent generations fail simultaneously

---

## Possible Causes (by likelihood)

1. **Intake payload too complex** — JSON payload exceeds 500KB; too many tool definitions or fields
2. **LLM rate limiting** — Request throttled due to OpenAI/LLM provider rate limits (60 req/min)
3. **Database connection exhaustion** — Connection pool depleted; other sessions hogging connections
4. **Network latency** — Slow internet connection to generation service (>30s latency)
5. **Insufficient compute resources** — Generation Engine pod under heavy load; no available capacity

---

## Diagnosis Steps

### Step 1: Check intake payload size
```bash
# Inspect the intake payload submitted to generation
# If stored locally, check file size:
ls -lh intake_payload.json

# If sent via API:
curl -H "Authorization: Bearer $TOKEN" \
  https://api.intellios.ai/v1/intakes/{intake_id} | jq '.' | wc -c

# Output: byte count. If >500000 (500KB), payload is too large
```

### Step 2: Monitor for rate limiting
```bash
# Submit a generation request and check response headers
curl -i -X POST https://api.intellios.ai/v1/blueprints/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @intake.json

# Look for rate limit headers in response:
# X-RateLimit-Limit: 60
# X-RateLimit-Remaining: 0
# X-RateLimit-Reset: 1712361600
# If Remaining is 0, you are rate-limited until Reset timestamp
```

### Step 3: Check database connection pool
```bash
# Query generation engine metrics endpoint
curl -H "Authorization: Bearer $TOKEN" \
  https://api.intellios.ai/v1/admin/metrics/generation

# Look for:
# db_connections_active: X
# db_connections_max: Y
# If active >= max, pool is exhausted
```

### Step 4: Review generation engine logs
Log into platform → Administration → Logs. Filter by component: "generation-engine". Look for:
- `GENERATION_TIMEOUT` — Generation exceeds 10-minute limit
- `LLM_RATE_LIMIT` — External LLM provider throttling
- `DB_CONNECTION_POOL_EXHAUSTED` — No available connections

### Step 5: Check concurrent generation count
```bash
# Query the API for in-progress blueprints
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.intellios.ai/v1/blueprints?status=generating" | jq '.blueprints | length'

# If count is high (>10), check for cascade failures
```

---

## Resolution

### If payload too complex:
1. Simplify the intake form. Remove optional tool definitions.
2. Split into multiple smaller blueprints (each <300KB)
3. Example: Create separate blueprints for "data ingestion" and "analysis" instead of one combined agent
4. Re-submit with smaller payload
5. **Verify:** Generation completes within 5 minutes; payload size <300KB

### If rate limited by LLM:
1. Implement exponential backoff in your client code:
   ```python
   import time
   import requests

   for attempt in range(5):
       response = requests.post(url, headers=headers, json=data)
       if response.status_code == 429:  # Too Many Requests
           wait_time = 2 ** attempt
           print(f"Rate limited. Waiting {wait_time}s...")
           time.sleep(wait_time)
       else:
           break
   ```
2. Reduce concurrent generation requests (queue them instead)
3. Contact Intellios support to increase rate limit quota (requires plan upgrade)
4. **Verify:** Request succeeds with X-RateLimit-Remaining > 0

### If database connections exhausted:
1. Contact your Intellios support team to restart the generation-engine service
2. Temporarily reduce concurrent requests (e.g., from 10 to 3 simultaneous generations)
3. Implement a queue: submit generation requests one at a time with 30-second spacing
4. Check if other applications are hogging connections; coordinate scaling with your DBA
5. **Verify:** Next generation request completes within expected time; logs show healthy connection pool

### If network latency:
1. Check your network connection:
   ```bash
   ping api.intellios.ai
   # Should see latency <100ms (typical: 20-50ms)
   ```
2. If latency >1000ms, contact your ISP or network team
3. If within your control, use VPN or direct network path to generation service
4. Consider deploying a generation engine replica closer to your location
5. **Verify:** `ping` latency <100ms; generation completes in expected time

### If insufficient compute resources:
1. Contact Intellios support to scale the generation-engine service
2. Request temporary increase in pod count or CPU limits
3. Implement request queuing to smooth load
4. Schedule generation jobs during off-peak hours
5. **Verify:** Generation Engine metrics show CPU <80% and memory <80%

---

## Prevention

- **Payload design:** Set intake form max size limit; require tool definitions to be compact
- **Rate limit budget:** Track your rate limit consumption; request quota increase before hitting limit
- **Async queue:** Never submit generation requests synchronously; use job queue with retry logic
- **Monitoring:** Alert if generation time exceeds 5 minutes or rate limit remaining drops below 10
- **Capacity planning:** Forecast peak generation load; request resources 2 weeks in advance

---

## Escalation

For repeated timeouts despite following above steps, or to request rate limit increases, see [escalation-paths.md](../escalation-paths.md).

---

## Related Articles

- [Generation Engine Architecture](../04-architecture-integration/generation-engine-architecture.md)
- [API Rate Limits](../04-architecture-integration/api-rate-limits.md)
- [Performance Tuning](../07-administration-operations/performance-tuning.md)
- [Async Job Queue Guide](../04-architecture-integration/job-queue.md)
