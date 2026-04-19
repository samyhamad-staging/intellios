#!/usr/bin/env bash
# =============================================================================
# scripts/vercel-ignore-build-step.sh
#
# Vercel "Ignored Build Step" command.
#
# Vercel calls this script before every build. Exit codes:
#   0 → skip this build (nothing to do)
#   1 → proceed with the build
#
# This script implements two sequential gates:
#
# Gate 1 — Path filter
#   If no files in src/ changed since the previous commit, skip the build.
#   This matches the previous behaviour and avoids spending build minutes on
#   docs-only or tooling changes.
#
# Gate 2 — CI status check
#   If src/ did change, query the GitHub Checks API to confirm all required
#   CI checks passed on this commit. If they haven't yet (pending) or they
#   failed, skip the build so a broken test never reaches production.
#
#   Required env vars (set in Vercel project settings → Environment Variables):
#     GITHUB_TOKEN  — a fine-grained PAT with "Checks: read" and
#                     "Contents: read" on this repo. Never commit this value.
#     GITHUB_OWNER  — repository owner, e.g. samyhamad-staging
#     GITHUB_REPO   — repository name, e.g. intellios
#
# Required checks (must all succeed before a build is allowed):
#   TypeScript | ESLint | Tests | Build | Migration smoke-test | npm audit
#
# Fallback behaviour
#   If GITHUB_TOKEN is unset (local preview / first-run bootstrap) the script
#   falls through Gate 2 and allows the build. This prevents a chicken-and-egg
#   problem when setting up the project for the first time. Set the token as
#   soon as the project is live.
#
# Usage in vercel.json:
#   "ignoreCommand": "bash scripts/vercel-ignore-build-step.sh"
#
# To test locally:
#   GITHUB_TOKEN=ghp_xxx GITHUB_OWNER=samyhamad-staging GITHUB_REPO=intellios \
#     VERCEL_GIT_COMMIT_SHA=$(git rev-parse HEAD) \
#     bash scripts/vercel-ignore-build-step.sh; echo "exit: $?"
# =============================================================================

set -euo pipefail

# ── Required checks ──────────────────────────────────────────────────────────
# Exact job name strings as they appear in the GitHub Actions run.
REQUIRED_CHECKS=(
  "TypeScript"
  "ESLint"
  "Tests"
  "Build"
  "Migration smoke-test"
  "npm audit"
)

# ── Helper: log to stderr so Vercel build logs show it without contaminating
#    the exit-code-conveying stdout channel. ──────────────────────────────────
log() { echo "[ignore-build] $*" >&2; }

# ── Gate 1: Path filter ──────────────────────────────────────────────────────
# Skip if src/ is unchanged relative to the previous commit. Vercel invokes
# this script from the configured Root Directory (src/), so we resolve paths
# from the repo root to avoid the src/ filter becoming src/src/.
REPO_ROOT="$(git rev-parse --show-toplevel)"
if git -C "$REPO_ROOT" rev-parse HEAD~1 &>/dev/null; then
  if git -C "$REPO_ROOT" diff HEAD~1 --quiet -- src/; then
    log "No changes in src/ — skipping build."
    exit 0
  fi
  log "Changes detected in src/ — checking CI status."
else
  log "First commit — no parent to diff against, proceeding to build."
fi

# ── Gate 2: CI status ────────────────────────────────────────────────────────

SHA="${VERCEL_GIT_COMMIT_SHA:-$(git rev-parse HEAD)}"

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  log "GITHUB_TOKEN not set — skipping CI gate and proceeding to build."
  log "WARNING: Set GITHUB_TOKEN in Vercel environment variables to enable"
  log "         the CI gate and prevent broken builds from reaching production."
  exit 1
fi

if [[ -z "${GITHUB_OWNER:-}" || -z "${GITHUB_REPO:-}" ]]; then
  log "GITHUB_OWNER or GITHUB_REPO not set — skipping CI gate."
  exit 1
fi

API="https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits/${SHA}/check-runs"
log "Fetching check runs for ${GITHUB_OWNER}/${GITHUB_REPO}@${SHA:0:8}..."

# Fetch up to 100 check runs (more than enough for this workflow).
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "${API}?per_page=100")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [[ "$HTTP_CODE" != "200" ]]; then
  log "GitHub API returned HTTP $HTTP_CODE — cannot verify CI status."
  log "Proceeding to build to avoid blocking on a transient API failure."
  exit 1
fi

# Parse the check runs with jq.
# For each required check, find the latest run (by id, descending) and
# inspect its status + conclusion.
FAILED_CHECKS=()
PENDING_CHECKS=()

for CHECK_NAME in "${REQUIRED_CHECKS[@]}"; do
  # Find the most recent run with this name.
  RUN=$(echo "$BODY" | jq -r --arg name "$CHECK_NAME" \
    '[.check_runs[] | select(.name == $name)] | sort_by(.id) | last // empty')

  if [[ -z "$RUN" || "$RUN" == "null" ]]; then
    log "  ⚠  '$CHECK_NAME' — not found (may not have run yet)."
    PENDING_CHECKS+=("$CHECK_NAME")
    continue
  fi

  STATUS=$(echo "$RUN" | jq -r '.status')
  CONCLUSION=$(echo "$RUN" | jq -r '.conclusion // "none"')

  if [[ "$STATUS" != "completed" ]]; then
    log "  ⏳ '$CHECK_NAME' — $STATUS (pending)."
    PENDING_CHECKS+=("$CHECK_NAME")
  elif [[ "$CONCLUSION" == "success" || "$CONCLUSION" == "neutral" || "$CONCLUSION" == "skipped" ]]; then
    log "  ✓  '$CHECK_NAME' — $CONCLUSION."
  else
    log "  ✗  '$CHECK_NAME' — $CONCLUSION (failed)."
    FAILED_CHECKS+=("$CHECK_NAME")
  fi
done

# ── Decision ─────────────────────────────────────────────────────────────────

if [[ ${#FAILED_CHECKS[@]} -gt 0 ]]; then
  log "Blocking build — ${#FAILED_CHECKS[@]} required check(s) failed:"
  for c in "${FAILED_CHECKS[@]}"; do log "    ✗ $c"; done
  log "Fix the failing checks and push again."
  exit 0   # exit 0 = skip/block the Vercel build
fi

if [[ ${#PENDING_CHECKS[@]} -gt 0 ]]; then
  log "Blocking build — ${#PENDING_CHECKS[@]} required check(s) still running:"
  for c in "${PENDING_CHECKS[@]}"; do log "    ⏳ $c"; done
  log "Vercel will retry on the next webhook event once checks complete."
  exit 0   # exit 0 = skip/block the Vercel build
fi

log "All ${#REQUIRED_CHECKS[@]} required checks passed — proceeding to build."
exit 1   # exit 1 = proceed with the Vercel build
