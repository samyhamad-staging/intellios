# Incident Response Runbook

**Last updated:** 2026-04-05
**Owner:** Engineering Lead

## Severity Levels

| Level | Definition | Response Time | Examples |
|-------|-----------|---------------|----------|
| **SEV-1** | Platform down or data breach | Immediate | Full outage, cross-tenant data leak, auth system failure |
| **SEV-2** | Major feature broken | < 1 hour | Blueprint generation failing, review queue inaccessible |
| **SEV-3** | Degraded functionality | < 4 hours | Slow responses, partial feature failure, non-critical errors |
| **SEV-4** | Minor issue | Next business day | UI glitch, non-blocking error, cosmetic issue |

## Incident Detection

### Automated
- Vercel deployment failure notifications (email)
- Anomaly detection cron (`/api/cron/alert-check` — daily 9 AM)
- Governance drift detection (`/api/cron/governance-drift` — daily 6 AM)

### Manual
- User reports via support channel
- Dashboard health indicators at `/monitor`

## Incident Response Steps

### 1. Acknowledge (< 5 minutes)
- [ ] Assess severity level
- [ ] Create incident channel/thread
- [ ] Notify stakeholders if SEV-1/SEV-2

### 2. Triage (< 15 minutes)
- [ ] Identify affected systems and tenants
- [ ] Check Vercel dashboard for deployment issues: https://vercel.com/dashboard
- [ ] Check Vercel function logs for errors
- [ ] Check database connectivity
- [ ] Determine if this is deployment-related (recent push) or infrastructure-related

### 3. Mitigate
**If caused by a recent deployment:**
- [ ] Rollback via Vercel (see [Rollback Runbook](./rollback.md))

**If caused by database issue:**
- [ ] Check PostgreSQL connection (Vercel → RDS)
- [ ] Check connection pool exhaustion (current limit: 1 connection in serverless mode)
- [ ] Check for long-running queries or locks

**If caused by external dependency:**
- [ ] Anthropic API: Check https://status.anthropic.com
- [ ] AWS: Check https://health.aws.amazon.com
- [ ] Vercel: Check https://www.vercel-status.com

### 4. Resolve
- [ ] Apply fix (hotfix branch → PR → merge → deploy)
- [ ] Verify fix in production
- [ ] Monitor for recurrence (30 minutes minimum)

### 5. Post-Incident
- [ ] Write postmortem within 48 hours (see template below)
- [ ] Update runbooks if needed
- [ ] Create follow-up issues for prevention

## Postmortem Template

```markdown
# Incident Postmortem: [Title]

**Date:** YYYY-MM-DD
**Duration:** X hours Y minutes
**Severity:** SEV-N
**Author:** [Name]

## Summary
One-paragraph description of what happened.

## Timeline
- HH:MM — Event detected
- HH:MM — Response began
- HH:MM — Root cause identified
- HH:MM — Fix deployed
- HH:MM — Incident resolved

## Root Cause
What specifically caused the incident.

## Impact
- Tenants affected: N
- Duration of impact: X hours
- Data affected: None / Describe

## What Went Well
- ...

## What Went Wrong
- ...

## Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| ... | ... | ... | ... |
```

## Escalation Contacts

| Role | Responsibility | Contact |
|------|---------------|---------|
| Engineering Lead | Technical response, deployment decisions | [Configure] |
| Product Owner | Customer communication, severity assessment | [Configure] |

## Communication Templates

### SEV-1 Initial Notification
> We are investigating an issue affecting [service]. We will provide updates every 30 minutes. Current status: Investigating.

### SEV-1 Resolution
> The issue affecting [service] has been resolved. Root cause: [brief description]. Duration: [X hours]. We will publish a detailed postmortem within 48 hours.
