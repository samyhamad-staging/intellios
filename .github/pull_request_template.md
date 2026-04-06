## Summary

<!-- What does this PR do? Why? -->

## Changes

<!-- List the key changes -->

## Testing

- [ ] Unit tests pass (`npm test`)
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] Lint passes (`npx next lint --dir .`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual testing performed for UI changes

## Multi-Tenancy Checklist

<!-- If this PR touches API routes or database queries -->

- [ ] All new queries include `enterpriseId` scoping (or N/A)
- [ ] `assertEnterpriseAccess()` or `enterpriseScope()` used for data access
- [ ] No cross-tenant data leakage possible
- [ ] Admin bypass is intentional and documented

## Documentation

- [ ] ADR created for significant architectural decisions
- [ ] Spec updated if behavior changed
- [ ] Session log updated

## Risk Assessment

- **Risk level:** Low / Medium / High
- **Rollback plan:** <!-- How to revert if something goes wrong -->
- **Database migration:** Yes / No
  - If yes: Is the migration backward-compatible? Can it be rolled back?
