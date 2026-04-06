---
id: "10-012"
title: "Agent Deployment to Runtime Fails or Reports Unhealthy Status"
slug: "agent-deployment-failures"
type: "troubleshooting"
audiences: ["engineering"]
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
tags: ["deployment", "runtime", "agents", "health-checks", "infrastructure"]
tldr: "Agent deployment fails or becomes unhealthy after deployment. Check: runtime adapter configuration, missing environment secrets, network connectivity, resource limits exceeded. Verify deployment logs and health check endpoints."
feedback_url: "https://feedback.intellios.ai/kb"
---

## TL;DR

Agent deployment fails or reports "Unhealthy" status. Causes: runtime adapter misconfiguration, missing API secrets, network connectivity to external services, container resource limits (CPU/memory). Check deployment logs and runtime health checks.

---

## Symptom

- Deployment shows error: `DEPLOYMENT_FAILED` or `RUNTIME_ADAPTER_ERROR`
- Agent status shows "Unhealthy" after successful deployment
- Runtime health check fails: HTTP 503 Service Unavailable
- Container crashes on startup; deployment stuck in "Pending" state
- Agent cannot invoke external tools: "Connection refused" or "Timeout"

---

## Possible Causes (by likelihood)

1. **Runtime adapter misconfigured** — Wrong adapter type, incorrect endpoint URL, or missing configuration
2. **Missing environment secrets** — API keys, database credentials not injected into runtime
3. **Network connectivity issue** — Runtime cannot reach external services (LLM API, database, webhooks)
4. **Resource limits exceeded** — Container memory/CPU limit too low; process OOMKilled
5. **Runtime startup failure** — Bootstrap script error; service dependencies not available

---

## Diagnosis Steps

### Step 1: Check deployment status and logs
```bash
# Fetch deployment details
curl -H "Authorization: Bearer $TOKEN" \
  https://api.intellios.ai/v1/deployments/{deployment_id}

# Response includes:
# {
#   "status": "failed",
#   "phase": "initializing",
#   "error": "RUNTIME_ADAPTER_ERROR",
#   "message": "Failed to initialize adapter"
# }

# Retrieve deployment logs
curl -H "Authorization: Bearer $TOKEN" \
  https://api.intellios.ai/v1/deployments/{deployment_id}/logs | tail -100
```

### Step 2: Verify runtime adapter configuration
Log into platform → Deployments → {deployment_id} → Configuration. Check:
- Adapter type matches selected runtime (e.g., "kubernetes", "docker", "lambda")
- Endpoint URL is reachable: `curl -i https://runtime-endpoint.com/health`
- Authentication credentials (if any) are valid

### Step 3: Check environment secrets
```bash
# List secrets injected into deployment
curl -H "Authorization: Bearer $TOKEN" \
  https://api.intellios.ai/v1/deployments/{deployment_id}/secrets | jq '.secrets'

# Verify all required secrets are present:
# - OPENAI_API_KEY (for LLM access)
# - DATABASE_URL (if using database tools)
# - WEBHOOK_SECRET (if receiving webhooks)

# If missing, add via Admin → Secrets
```

### Step 4: Test network connectivity
```bash
# If you have access to runtime pod/container:
# SSH into container and test outbound connectivity
curl -i https://api.openai.com/v1/models  # Test LLM API
curl -i https://your-database.com:5432    # Test database (if using)

# Look for "Connection refused", "Timeout", or DNS errors
```

### Step 5: Check resource utilization
Log into platform → Deployments → {deployment_id} → Metrics. Look for:
- Memory usage near/exceeding limit (alert at 90%)
- CPU usage high (>80% sustained)
- Restart count increasing (indicates crash loop)

### Step 6: Inspect health check endpoint
```bash
# Health check runs every 10 seconds post-deployment
curl -i https://runtime-endpoint.com/health

# Expected response:
# {
#   "status": "healthy",
#   "checks": {
#     "liveness": "pass",
#     "readiness": "pass"
#   }
# }

# If readiness fails, startup isn't complete yet; wait 30s
# If liveness fails, process is stuck; likely needs restart
```

---

## Resolution

### If runtime adapter misconfigured:
1. Log into platform → Deployments → {deployment_id}
2. Click "Edit Configuration"
3. Verify adapter type matches your runtime:
   - For Kubernetes: adapter type "kubernetes", endpoint "https://k8s-api.your-cluster.com"
   - For Docker: adapter type "docker", endpoint "unix:///var/run/docker.sock"
   - For Lambda: adapter type "aws-lambda", region specified
4. Test the endpoint: `curl -i https://your-endpoint/health`
5. Save and redeploy
6. **Verify:** Deployment succeeds; health check passes

### If missing environment secrets:
1. Admin → Secrets → Add Secret
2. Add each missing secret (consult deployment logs for names):
   - Name: `OPENAI_API_KEY`, Value: [your OpenAI key]
   - Name: `DATABASE_URL`, Value: [your DB connection string]
3. Redeploy the agent
4. **Verify:** Deployment logs show "Secrets injected successfully"

### If network connectivity issue:
1. Verify external service is accessible:
   ```bash
   curl -i https://api.openai.com/v1/models  # Should be 401 or 2xx
   ```
2. If external service is unreachable, check:
   - Firewall rules allow outbound HTTPS
   - DNS is resolving correctly: `nslookup api.openai.com`
   - VPN/proxy is configured (if required)
3. Contact your network team to allowlist the external service
4. Redeploy
5. **Verify:** Runtime can reach external endpoints; health check passes

### If resource limits exceeded:
1. Log into platform → Deployments → {deployment_id} → Configuration
2. Increase resource limits:
   - Memory: increase from (e.g.) 512MB to 1GB
   - CPU: increase from (e.g.) 250m to 500m
3. Save and redeploy
4. Monitor metrics during execution; if still crashing, increase further
5. **Verify:** Agent runs without crashes; metrics show healthy utilization (<80%)

### If runtime startup failure:
1. Review deployment logs in detail:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     https://api.intellios.ai/v1/deployments/{deployment_id}/logs | grep -i "error\|failed\|exception"
   ```
2. Common startup errors:
   - "Module not found" — Install missing dependencies in Dockerfile
   - "Port already in use" — Change agent port or kill conflicting process
   - "Service unavailable" — Wait for dependencies (database, cache) to start
3. Fix the underlying issue in your blueprint or runtime config
4. Redeploy
5. **Verify:** Health check endpoint responds 200 OK

---

## Prevention

- **Pre-deployment testing:** Always test deployment in staging environment first
- **Secrets management:** Use a secure secrets vault; never hardcode credentials in blueprints
- **Resource right-sizing:** Monitor metrics during tests; allocate resources 20% above peak observed usage
- **Dependency declarations:** Explicitly list all external service dependencies in agent blueprint
- **Health checks:** Define meaningful health checks that test key functionality (not just "is port open")
- **Monitoring and alerts:** Set up alerts for deployment failures, unhealthy status, and high resource usage

---

## Escalation

For infrastructure-level issues (Kubernetes cluster issues, cloud provider limits), see [escalation-paths.md](../escalation-paths.md).

---

## Related Articles

- [Runtime Adapter Configuration](../04-architecture-integration/runtime-adapter-setup.md)
- [Deployment Guide](../07-administration-operations/deployment-guide.md)
- [Environment Secrets Management](../07-administration-operations/secrets-management.md)
- [Monitoring Agent Health](../07-administration-operations/agent-monitoring.md)
- [Resource Allocation Best Practices](../07-administration-operations/resource-allocation.md)
