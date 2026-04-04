# Dependency Upgrade Plan — 2026-03

Generated: 2026-03-16
Tool: monthly-dependency-planner scheduled task

---

## Security Advisories

### GHSA-67mh-4wv8-2f99 — esbuild development server CORS bypass (Moderate)
- **Severity:** Moderate (CVSS 5.3)
- **Affected package:** `drizzle-kit` (devDependency) → `@esbuild-kit/esm-loader` → `esbuild <=0.24.2`
- **Installed version:** `drizzle-kit@0.31.9`
- **npm audit "fix":** Downgrade to `drizzle-kit@0.18.1` — **DO NOT apply**. This is a misleading fix recommendation; 0.18.1 is 13 minor versions older than the current 0.31.9 and would be a severe regression.
- **Impact scope:** Dev-only. This vulnerability affects `drizzle-kit studio` (the local database browser) running on localhost. A malicious web page could send requests to the dev server and read responses. **No production exposure.**
- **Practical mitigation:** Never run `drizzle-kit studio` on a network-accessible interface. Monitor for a drizzle-kit release above 0.31.9 that removes the `@esbuild-kit/esm-loader` dependency.
- **Action:** See DEP-202603-004 below.

No high or critical severity advisories.

---

## Package Status

| Package | Installed | Latest | Type | Action |
|---|---|---|---|---|
| `vitest` | 3.2.4 | 4.1.0 | **Major** | DEP-202603-001 |
| `@vitest/coverage-v8` | 3.2.4 | 4.1.0 | **Major** | DEP-202603-001 |
| `eslint` | 9.39.4 | 10.0.3 | **Major** | DEP-202603-002 |
| `next-auth` | 5.0.0-beta.30 | 4.24.13 | **Skip** | See note below |
| `drizzle-kit` | 0.31.9 | 0.31.9 | Security advisory | DEP-202603-004 |
| All other packages | — | — | Current | No action |

**Note on `next-auth`:** npm reports latest stable as `4.24.13` but this project intentionally uses `next-auth@5.0.0-beta.30` (Auth.js v5 beta). v5 is the current development line. This is not a regression — skip this item.

---

## Actionable Task Queue

### DEP-202603-001: Upgrade vitest + @vitest/coverage-v8 from 3.x to 4.x (major)
Priority: P2
Effort: S
File: `src/package.json:41-42` (devDependencies)
Problem: `vitest` and `@vitest/coverage-v8` are at 3.2.4; latest is 4.1.0. These must be upgraded together as they are tightly coupled.

**Migration surface area for this project:**

The test suite (`src/__tests__/agentcore/`) uses the following vitest APIs:
- `describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach` — stable across v3→v4
- `vi.fn()`, `vi.mock()`, `vi.clearAllMocks()` — stable
- `vi.useFakeTimers()`, `vi.useRealTimers()`, `vi.runAllTimersAsync()` — stable
- `vi.spyOn()` — stable
- `type Mock` import from vitest — stable
- `vitest.config.ts` uses `defineConfig`, `environment: "node"`, `globals: true`, `coverage.provider: "v8"` — all stable in v4

**Known v4 breaking changes to verify:**
- `globals: true` behavior unchanged but confirm `@types/vitest` globals are still injected correctly
- `coverage.thresholds` syntax may have changed — verify `lines`/`functions` keys still valid
- If using `@vitest/ui` or browser mode (not used here), those have breaking changes — N/A

Fix:
```bash
cd /c/Users/samyh/OneDrive/Desktop/Claude/src
npm install --save-dev vitest@^4.1.0 @vitest/coverage-v8@^4.1.0
npx tsc --noEmit
npm test
```
Verify: `npm test` passes all 2 test files (translate.test.ts, deploy-route.test.ts); `npx tsc --noEmit` passes

---

### DEP-202603-002: Plan major upgrade of eslint from 9.x to 10.x
Priority: P3
Effort: M
File: `src/package.json:44` (devDependencies)
Problem: `eslint` is at 9.39.4; latest is 10.0.3. Also requires upgrading `eslint-config-next` (currently `^16.1.6`) once Next.js publishes ESLint 10 compatible config.

**Migration surface area for this project:**
- This project uses ESLint flat config (required since ESLint 9) — flat config is the only format in v10, so no migration needed there
- `eslint-config-next` must support ESLint 10 before this upgrade is safe. Check if `eslint-config-next@16.x` supports ESLint 10 before proceeding.
- ESLint 10 drops support for legacy plugins using the old plugin format — verify `eslint-config-next` doesn't pull in any legacy plugins

**Prerequisites:**
1. Verify `eslint-config-next@16` compatibility with ESLint 10 (check Next.js release notes)
2. Check ESLint 10 migration guide at: https://eslint.org/docs/latest/use/migrate-to-10.0.0

Fix (only after verifying eslint-config-next compatibility):
```bash
cd /c/Users/samyh/OneDrive/Desktop/Claude/src
npm install --save-dev eslint@^10.0.0
npx next lint
```
Verify: `npx next lint` passes with no errors; no new lint warnings introduced

---

### DEP-202603-003: No critical package upgrades needed
Priority: —
All production-critical packages (`next`, `ai`, `@ai-sdk/anthropic`, `drizzle-orm`, `zod`, `postgres`) are current. No action required this month.

---

### DEP-202603-004: Monitor drizzle-kit esbuild security advisory
Priority: P3
Effort: XS
File: `src/package.json:` (devDependencies — drizzle-kit)
Problem: `drizzle-kit@0.31.9` contains a transitive `esbuild <=0.24.2` via `@esbuild-kit/esm-loader`, flagged under GHSA-67mh-4wv8-2f99. There is no upgrade path available — npm's suggested "fix" of 0.18.1 is a 13-minor-version downgrade and must not be applied.

**Risk:** Low in practice. Vulnerability only affects `drizzle-kit studio` (local dev tool). Production is not affected.

Fix (once available):
```bash
# Check if a newer drizzle-kit resolves the advisory
npm audit 2>&1 | grep drizzle-kit
# If resolved in a newer patch, upgrade:
npm install --save-dev drizzle-kit@latest
npx tsc --noEmit
npm run db:generate  # smoke test drizzle-kit CLI still works
```
Verify: `npm audit` reports no vulnerabilities for `drizzle-kit`; `npm run db:generate` completes successfully
