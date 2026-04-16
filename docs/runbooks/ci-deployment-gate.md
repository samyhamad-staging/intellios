# Runbook: Activating the CI Deployment Gate

**Date added:** 2026-04-16
**Relates to:** `audit-t1-t2-t3` branch, T3

This runbook completes the CI deployment gate. The code changes
(`scripts/vercel-ignore-build-step.sh`, `src/vercel.json`, `.github/workflows/ci.yml`)
are already merged. The two manual configuration steps below activate them.

Without these steps the gate script exists but exits the "no GITHUB_TOKEN"
fallback path (allowing builds), and branch protection doesn't enforce CI on
direct pushes to `main`.

---

## Step 1 — GitHub: Create a Fine-Grained PAT for the gate script

The ignore-build script calls the GitHub Checks API. It needs a token with
read-only access to check runs on this repository.

1. Go to: **github.com → Settings (your account) → Developer settings →
   Personal access tokens → Fine-grained tokens → Generate new token**
2. Token name: `intellios-vercel-ci-gate`
3. Expiration: 1 year (set a calendar reminder to rotate)
4. Resource owner: `samyhamad-staging`
5. Repository access: **Only select repositories → intellios**
6. Repository permissions:
   - **Checks:** Read-only
   - **Contents:** Read-only (needed to resolve the commit SHA)
   - **Metadata:** Read-only (implicitly required)
7. Click **Generate token** and copy the value — it's shown only once.

---

## Step 2 — Vercel: Add environment variables to the Intellios project

1. Go to: **vercel.com → Intellios project → Settings → Environment Variables**
2. Add the following three variables with scope **Production + Preview + Development**:

| Variable | Value | Notes |
|---|---|---|
| `GITHUB_TOKEN` | `ghp_xxx…` (the PAT from Step 1) | Mark as **Sensitive** so it's never shown in logs |
| `GITHUB_OWNER` | `samyhamad-staging` | The GitHub org/user that owns the repo |
| `GITHUB_REPO` | `intellios` | Repository name |

3. Click **Save** after each variable.

> **Security note:** Never paste the token into chat, a Slack message, or a
> commit. It belongs only in Vercel's encrypted environment variable store.

---

## Step 3 — GitHub: Enable branch protection on `main`

This prevents direct pushes to `main` without CI passing — even from the
repo owner. It's the final enforcement layer (the Vercel gate is on the
build side; this is on the merge side).

1. Go to: **github.com → samyhamad-staging/intellios → Settings →
   Branches → Add rule**
2. Branch name pattern: `main`
3. Enable: ✅ **Require a pull request before merging**
   - Required approvals: **0** (solo project — the CI gate substitutes for
     human review for now; raise to 1 when a second contributor joins)
   - Enable: ✅ **Dismiss stale pull request approvals when new commits are pushed**
4. Enable: ✅ **Require status checks to pass before merging**
   - Search and add each of the following as required checks:
     - `TypeScript`
     - `ESLint`
     - `Tests`
     - `Build`
     - `Migration smoke-test`
     - `npm audit`
   - Enable: ✅ **Require branches to be up to date before merging**
5. Enable: ✅ **Do not allow bypassing the above settings**
   (This applies the rule to admins too — removes the footgun of a panicked
   direct push to main bypassing tests.)
6. Click **Create** / **Save changes**.

---

## Step 4 — Validate the gate end-to-end

After completing steps 1–3:

```bash
# 1. Create a test branch with a deliberately failing test
git checkout -b test/ci-gate-validation
# Edit any test file to add: expect(1).toBe(2)
git add -A && git commit -m "chore: intentionally failing test for gate validation"
git push origin test/ci-gate-validation

# 2. Open a pull request on GitHub
# → CI should run and fail on "Tests"
# → The merge button should be disabled

# 3. Observe Vercel
# → If Vercel somehow fires a build for this branch, watch the build log
#    for "[ignore-build]" lines — it should block on the failed CI check.

# 4. Revert the bad test, push again
# → CI goes green → merge button enables → Vercel build proceeds

# 5. Confirm production build only happens after green CI
git checkout main && git branch -d test/ci-gate-validation
```

---

## When staging URL is available — activate E2E in CI

Once a Vercel staging/preview deployment URL exists:

1. Go to: **github.com → samyhamad-staging/intellios → Settings →
   Secrets and variables → Actions → Variables → New repository variable**
2. Name: `PLAYWRIGHT_BASE_URL`
3. Value: `https://intellios-staging.vercel.app` (or your preview URL)

The `e2e` job in `.github/workflows/ci.yml` will start running automatically.
Then add `E2E Tests` to the required checks list in both:
- `scripts/vercel-ignore-build-step.sh` → the `REQUIRED_CHECKS` array
- GitHub branch protection rules (Step 3 above)

---

## Rollback

If the gate causes unexpected build blocks:

1. **Immediate:** In Vercel project settings, delete the `GITHUB_TOKEN` env var.
   The script will hit the "token not set" fallback path and allow all builds.
2. **Sustained:** Remove the `ignoreCommand` from `src/vercel.json` entirely,
   or revert to the old path-filter-only value:
   `"ignoreCommand": "git diff HEAD~1 --quiet -- src/"`

No code rollback needed — the gate is pure configuration once the script is deployed.
