# ADR-028: Vercel ignoreCommand Gate 1 — diff against last successful deploy, not HEAD~1

**Status:** accepted
**Date:** 2026-04-20
**Supersedes:** none; refines `scripts/vercel-ignore-build-step.sh` (introduced pre-session-151; patched by session 151 for root-dir resolution; extended session 155 for Gate 2 CI-status checks).

## Context

`scripts/vercel-ignore-build-step.sh` is Vercel's `ignoreCommand` for this project. It has two sequential gates: a path filter (skip the build when no `src/` files changed) and a CI-status gate (skip when required GitHub Actions checks haven't passed on HEAD). The path filter previously diffed `HEAD~1` against `HEAD`.

A single-commit diff is blind to bundled pushes. When a push lands multiple commits, Vercel invokes `ignoreCommand` only once — on the push's tip. If the tip commit doesn't touch `src/` but an earlier commit in the same push does, `HEAD~1..HEAD` shows no `src/` change and the build is skipped. The `src/` change that mattered — the one that should have deployed — is invisible to the filter.

This bit the project three times:

1. **`27ce5dd`** (session 151) — earlier commits in the push changed `src/`, HEAD was docs-only. Build skipped. Recovery: push commit `584b252` that bumped `src/package.json` version 0.1.0 → 0.1.1 so the new HEAD touches `src/`, forcing Gate 1 to proceed.
2. **`1f51d1a`** (session 158) — earlier commits `da3e14b` (auth Edge crypto) + `1539d86` (cron POST→GET) changed `src/`; HEAD was session 158's docs-only log. Build skipped. Recovery: push commit `4bf1bb5` that bumped version 0.1.1 → 0.1.2.
3. The next bundled push with a docs-only HEAD would have repeated the pattern.

Each workaround burns a commit whose only purpose is to re-trigger the CI/deploy pipeline. The workarounds leave `src/package.json` version churning for no substantive reason, obscure `git log`, and rely on human memory ("oh right, the ignore script is dumb about bundled pushes"). This is the shape of a bug that punishes correct behavior — linear commit hygiene with a docs-only terminal commit is a *virtue*, not a mistake.

## Decision

**Gate 1 diffs against `VERCEL_GIT_PREVIOUS_SHA` — the SHA of the last successful production deploy for this branch — rather than `HEAD~1`.** `HEAD~1` remains as a fallback when the previous-deploy SHA is absent or unreachable.

Baseline precedence, first reachable wins:

1. `VERCEL_GIT_PREVIOUS_SHA` — documented as *"the Git SHA of the last successful deployment for the project and branch, available at build time."* This is exactly the correct frame for the question Gate 1 is trying to answer: *has anything under `src/` changed since the code we are currently serving in production?* If the previous SHA is not in the local shallow clone, the script attempts a targeted `git fetch --depth=200 origin $SHA` before giving up.
2. `HEAD~1` — retained for local runs (no Vercel env vars), first deploys (no previous SHA on record), and the edge case where the previous SHA is truly unrecoverable (force-push rewriting history past the fetch depth).
3. First-commit — if `HEAD~1` doesn't resolve, proceed to Gate 2 unchanged (matches prior behavior).

On any fallback step the script logs the baseline it selected and why, so a skipped-build decision is always attributable to a specific SHA in Vercel's build log.

The semantics of "skip" and "proceed" are unchanged: the script exits `0` to skip the build, `1` to proceed. Gate 2 is untouched — it still checks GitHub required checks on the current HEAD.

We chose this over three alternatives:

- **Deepen to full history and diff `origin/main..HEAD`.** Works, but `origin/main` in a Vercel clone points to the ref being deployed, not the last deployed commit, so it drifts under bundled pushes. Using `VERCEL_GIT_PREVIOUS_SHA` is both more accurate and cheaper.
- **Diff `HEAD~N` with N equal to the push size.** Requires knowing the push size, which Vercel does not expose. Would have to infer from git reflog, which shallow clones truncate.
- **Give up on a path filter, always run Gate 2.** Conceptually cleanest but wastes build minutes on docs-only pushes, which is the original reason this script exists.

## Consequences

- **Bundled pushes deploy correctly without workaround commits.** No more version-bump-to-retrigger churn. Anyone following commit hygiene is no longer punished for doing so.
- **First deploys on a project or branch** still work — `VERCEL_GIT_PREVIOUS_SHA` is unset, the script falls back to `HEAD~1`, and Gate 1 behaves exactly as it used to.
- **Force-push that rewrites history** past the previous deploy SHA: the fetch attempt fails silently, the script falls back to `HEAD~1`, the build is evaluated against a potentially-misleading baseline but errs toward proceeding (which is safer than erroneously skipping). Logged so the fallback is visible in Vercel's build output.
- **Shallow clone cost.** In the common case (previous SHA within the 200-commit fetch window) the fetch is cheap. In the rare case of a very old previous SHA, the fetch fails, we fall back, and the build proceeds — no worse than the status quo.
- **The existing Gate 2 CI-status check on HEAD is unchanged** and continues to prevent broken builds from deploying regardless of Gate 1's verdict.
- **Observable by design.** The Vercel build log will now include a line like `Baseline: VERCEL_GIT_PREVIOUS_SHA (abc12345)` or `Baseline: HEAD~1 (...)` on every invocation, so skipped-build decisions have an audit trail.
- **One-time cleanup.** The pre-existing CRLF line endings on this script were normalized to LF as part of this change (bash tolerates CRLF on Vercel's runtime but local testing was blocked by it). Scope is one file; the broader CRLF normalization pass deferred in session 158 remains deferred.

Follow-ups outside this ADR's scope:

- The workaround version bumps (`584b252`, `4bf1bb5`) are not reverted — they are in history and served their purpose. Future version bumps should track actual release events, not deploy-gate workarounds.
- A lightweight regression test for this script (a `scripts/test-vercel-ignore-build-step.sh` harness against synthetic repos) is not included in this change but would be cheap to add if another regression lands here.
