---
id: 10-005
title: Known Issues
slug: known-issues
type: troubleshooting
audiences:
- engineering
status: published
created: &id001 2026-04-05
updated: *id001
tags:
- bugs
- workaround
- limitation
- timeout
- conflict
- template
tldr: Current limitations and workarounds for Intellios platform
---

# Known Issues

## Issue 1: Large ABP Validation Timeout (>500 KB)

**Severity:** Medium | **Status:** In Progress | **Workaround:** Yes

**Description:** Agent Blueprint Packages exceeding 500 KB in size may timeout during governance validation. This occurs when the combined size of the prompt, tool definitions, and metadata approaches backend resource limits.

**Symptoms:**
- Validation request hangs for 30+ seconds
- Request returns HTTP 504 (Gateway Timeout)
- Error message: "Governance validation did not complete within timeout window"

**Root cause:** Governance validator iterates through all 11 operators; large blueprints with many tools cause cumulative evaluation time to exceed 30-second API timeout.

**Workaround:**

1. **Reduce blueprint size:**
   - Consolidate tool descriptions (remove redundant fields)
   - Limit to 20 tools maximum (instead of 50+)
   - Use tool categories instead of individual tools

2. **Split multi-domain agent into single-domain agents:**
   - Instead of one agent handling "credit, fraud, and kyc" → create 3 focused agents
   - Reduces prompt complexity, improves reusability

3. **Pre-validate before submission:**
   ```bash
   # Use CLI to estimate validation time
   intellios estimate --file=blueprint.json
   # Output: estimated validation time 2.5s (OK), 85s (TIMEOUT)
   ```

**Expected fix:** Q2 2026 (async validation with background job queue).

---

## Issue 2: Concurrent Refinement Version Conflicts

**Severity:** Low | **Status:** Backlog | **Workaround:** Yes

**Description:** When multiple users refine the same blueprint simultaneously (before approval), version conflicts can occur. The second user's save may overwrite the first user's changes without warning.

**Symptoms:**
- User A and User B both refining "CreditDecision-v1.draft"
- User A modifies prompt, saves at 14:32:10
- User B modifies tools, saves at 14:32:15
- User B sees their tools, but User A's prompt changes are lost
- No conflict warning displayed

**Root cause:** Database `blueprint_version` table lacks optimistic locking; concurrent updates not serialized.

**Workaround:**

1. **Coordinate via Slack:** Teams should announce refinement work in Slack channel before starting
2. **Use serial refinement:** One person completes refinement, then next person starts
3. **Export and merge:** If conflict occurs:
   - Both users export their versions
   - Manually merge changes in JSON
   - Re-upload merged blueprint

**Expected fix:** Q3 2026 (optimistic locking + conflict resolution UI).

**Mitigation:** Blueprint refinement lock (coming Q2 2026): system prevents second user from entering refinement mode if agent is already being edited.

---

## Issue 3: Express-Lane Template Admin Role Requirement

**Severity:** Low | **Status:** Design Phase | **Workaround:** Yes

**Description:** Creating custom Intake templates (Express-Lane templates for fast workflows) currently requires Admin role. Non-admin users (Team Leads, Reviewers) cannot create templates, even though they understand domain requirements better.

**Symptoms:**
- PM wants to create "Credit Decisioning Quick Start" template
- UI shows "Create Template" button but clicking it says "Admin access required"
- Workaround: PM must ask admin to create template from PM's specifications

**Root cause:** Template creation touches global policy definitions, which are restricted to admins for safety.

**Workaround:**

1. **Ask admin to create:** PM describes template, admin creates it
2. **Use template copy:** Copy an existing template and modify it (copy inherits parent template permissions; can be edited by non-admin)
3. **Document in PR:** PM submits template design in internal PR; admin reviews and creates

**Expected fix:** Q3 2026 (fine-grained role for "Template Editor" role between Admin and PM).

---

## Issue 4: Webhook Delivery Failures on Network Timeouts

**Severity:** Medium | **Status:** In Progress | **Workaround:** Yes

**Description:** Webhooks configured to notify external systems (e.g., incident management, config management) may fail silently if the receiving system is temporarily unavailable. Failed webhooks are retried, but visibility into failures is limited.

**Symptoms:**
- Agent approved and deployed
- Webhook should notify "deployment system" but notification fails (external system was down for 2 minutes)
- External system doesn't know about new agent deployment
- Admin discovers issue only when checking webhook delivery logs (not immediately visible in dashboard)

**Root cause:** Webhook retries follow exponential backoff (5s, 25s, 125s); if all retries fail, webhook moved to dead letter queue without alerting admin.

**Workaround:**

1. **Monitor webhook delivery logs:**
   ```bash
   # Check webhook status
   intellios webhooks list --status=failed --since=1h
   # Output: 3 failed webhook deliveries in last hour
   ```

2. **Set up webhook monitoring alert:**
   - Use CloudWatch to monitor `/metrics` endpoint for `webhook_delivery_failures` counter
   - Alert if failures > 5 in 1 hour

3. **Manual retry:**
   ```bash
   # Retry failed webhook
   intellios webhooks retry --id=webhook-uuid
   ```

4. **Increase retry timeout (temporarily):**
   - Adjust `webhook.timeout` from 30s → 60s in config if external system is slow

**Expected fix:** Q2 2026 (webhook delivery dashboard with automatic alerts).

---

## Issue 5: Policy Migration Complexity on Major Version Upgrade

**Severity:** Medium | **Status:** Backlog | **Workaround:** Yes

**Description:** Upgrading from governance-policy v1.x to v2.x requires re-validating all historical agents, which is time-consuming for organizations with 100+ agents.

**Symptoms:**
- Organization upgrades policy from v1.0.0 → v2.0.0 (new risk classification system)
- Existing 150 agents remain on v1.0.0 (backwards compatible)
- To upgrade all agents to v2.0.0: must re-validate each one (15 minutes per agent = 37 hours of manual work)

**Root cause:** Policy major versions change constraint semantics; automatic migration not safe. Manual review required per agent.

**Workaround:**

1. **Batch re-validate via CLI:**
   ```bash
   # Re-validate all agents on v1.0.0 under new policy v2.0.0
   intellios policy migrate \
     --from-version=v1.0.0 \
     --to-version=v2.0.0 \
     --agent-tag=legacy
   # Generates report: X agents pass, Y need remediation
   ```

2. **Staged migration:** Migrate agents in waves
   - Week 1: Migrate low-risk agents (auto-approved)
   - Week 2: Migrate medium-risk agents (manual review)
   - Week 3: Migrate high-risk agents (multi-stakeholder review)

3. **Defer migration:** Keep agents on v1.0.0; only new agents use v2.0.0
   - Adds technical debt but reduces immediate re-validation work

**Expected fix:** Q4 2026 (policy migration assistant with recommended changes per agent).

---

## Issue 6: Multi-Tenancy Data Isolation Edge Case

**Severity:** Low (Enterprise only) | **Status:** In Progress | **Workaround:** Yes

**Description:** In multi-tenant deployments, blueprint versions may leak isolation if accidentally shared between enterprises. This is a rare edge case but impacts security-sensitive configurations.

**Symptoms:**
- Enterprise A creates blueprint "SensitiveAgent-v1"
- Enterprise B's admin accidentally gains read access to Enterprise A's blueprint
- Unlikely but possible if RBAC middleware has bugs

**Root cause:** Multi-tenancy middleware uses `enterprise_id` scoping; if middleware bug exists, scoping may be bypassed.

**Workaround:**

1. **Audit access:**
   ```bash
   # Check who accessed this blueprint
   intellios audit-log --resource=blueprint:SensitiveAgent-v1 --action=read
   ```

2. **Rotate sensitive data:** If concerned about past access
   - Export blueprint, remove sensitive prompts/instructions
   - Re-import as new version
   - Deploy new version to production

**Expected fix:** Q2 2026 (multi-tenancy security audit completion + SOC 2 Type II will validate isolation).

---

## Issue 7: Generation Engine Timeout on Complex LLM Requests

**Severity:** Low | **Status:** Investigating | **Workaround:** Yes

**Description:** When generating blueprints for complex agents (e.g., multi-domain, 50+ tools, custom constraints), the LLM API call may exceed timeout (2 minutes).

**Symptoms:**
- User creates intake for complex agent
- Generation starts but takes >2 minutes
- Request times out; user must retry

**Root cause:** Claude/Bedrock API calls with large prompts (>10K tokens) take longer; timeout set conservatively at 2 minutes.

**Workaround:**

1. **Simplify agent scope:** Break complex agent into simpler agents
   - Instead of one agent handling 50 tools, create 2-3 agents with 15-20 tools each

2. **Increase generation timeout (config):**
   ```yaml
   generation_engine:
     llm_timeout: 300  # 5 minutes instead of 2
   ```

3. **Use quick templates:** Instead of full generation, select a pre-built template
   - Templates pre-generated and cached; no timeout risk

**Expected fix:** Q3 2026 (async generation with background job queue + real-time progress updates).

