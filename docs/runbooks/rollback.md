# Deployment Rollback Runbook

**Last updated:** 2026-04-05
**Owner:** Engineering Lead

## When to Roll Back

Roll back immediately if a deployment causes:
- HTTP 500 errors on critical paths (intake, blueprint generation, review)
- Authentication failures
- Cross-tenant data visibility (SEV-1 — rollback AND investigate)
- Unrecoverable UI crashes on core pages

## Rollback via Vercel Dashboard

**Time to rollback: < 2 minutes**

1. Go to https://vercel.com/[team]/intellios/deployments
2. Find the **last known good deployment** (green checkmark, before the problematic deploy)
3. Click the three-dot menu (⋯) on that deployment
4. Select **"Promote to Production"**
5. Confirm the promotion
6. Verify the rollback:
   - Check the production URL loads
   - Test the affected functionality
   - Monitor Vercel function logs for 5 minutes

## Rollback via Git

If Vercel dashboard is unavailable:

```bash
# Find the last known good commit
git log --oneline -10

# Revert the problematic commit(s)
git revert HEAD    # or specific commit hash
git push origin main

# Vercel will auto-deploy the revert
```

## Database Migration Rollback

**Critical: Database migrations may NOT be automatically reversible.**

### If the migration was additive (new columns, new tables):
- The rollback deployment will simply not use the new columns/tables
- No database action needed — the old code ignores new schema

### If the migration was destructive (dropped columns, renamed tables):
- **This requires manual intervention**
- Contact the database administrator
- Restore from backup if data was lost (see [Backup & Restore](./backup-restore.md))

### Prevention
- All migrations should be backward-compatible (additive only)
- Never drop columns in the same deployment that stops using them
- Use a two-phase approach: (1) stop using column, deploy; (2) drop column, deploy

## Post-Rollback Checklist

- [ ] Verify production is stable
- [ ] Notify affected users/tenants if there was visible impact
- [ ] Create a bug fix on a feature branch (not directly on main)
- [ ] Test the fix against staging before re-deploying
- [ ] Document what happened in the incident log
