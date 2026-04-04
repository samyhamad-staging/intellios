# Vigil

**Vigil** is the autonomous quality and maintenance system for Intellios. It runs while you're away — scanning the codebase, identifying problems, and preparing a prioritized, pre-researched task queue so that every session with Claude starts with immediately executable work.

---

## How it works

```
Saturday night          Sunday morning              Monday
──────────────          ──────────────              ──────
10pm  Test gaps    →    4am   OQ triage         →   2am  Policy conflicts
11pm  Spec drift   →    5am   ADR completeness  →   3am  DB growth
                        5:30  OWASP scan        →   5am  Intake patterns
Nightly                 6am   Zod coverage      →   6am  Dependency plan
──────────────          7am   Phase readiness
1am   Quality           7:30  Session digest
      backfill          9am   ★ SYNTHESIZER
2am   TypeScript              ↓
3am   Dead code         TASK_QUEUE.md
```

The **synthesizer** (Sunday 9am) is the central step. It reads every health report from the week, verifies each finding still exists in the actual code, normalizes priority across sources, deduplicates by `file:line`, and writes a single `docs/log/health/TASK_QUEUE.md` with code-precise Fix blocks ready to execute.

---

## Files

| File | Purpose |
|---|---|
| `docs/log/health/TASK_QUEUE.md` | Live prioritized task queue — the primary artifact |
| `docs/log/health/VIGIL_STATE.json` | Synthesizer memory: last run date, completed task keys (30-day TTL) |
| `docs/log/health/TASK_QUEUE_HISTORY.md` | Append-only log of synthesis runs and session completions |
| `docs/log/health/REGRESSIONS.md` | TypeScript regression alerts (appended by nightly audit) |
| `docs/log/health/YYYY-MM-DD_*.md` | Individual scan reports (source material for synthesizer) |

---

## On-demand tasks

| Task | What it does |
|---|---|
| `vigil-status` | Live dashboard: queue depth, last scan dates, recent activity, recommendation |
| `session-kickoff` | Reads TASK_QUEUE.md, selects a session bundle, verifies tasks, executes immediately |

Run `vigil-status` any time to see where things stand. Run `session-kickoff` when you want Claude to pick up and execute the queue.

---

## Task schedule

### Nightly (every night)
| Time | Task | Output |
|---|---|---|
| 1:05am | Quality score backfill | `*_quality-backfill.md` |
| 2:05am | TypeScript audit | `*_typescript.md` + REGRESSIONS.md |
| 3:08am | Dead code sweep | `*_dead-code.md` |

### Saturday night (feeds Sunday synthesis)
| Time | Task | Output |
|---|---|---|
| 10:02pm | Test harness gap report | `*_test-gaps.md` |
| 11:02pm | Spec drift detector | `*_spec-drift.md` |

### Sunday morning cascade (in dependency order)
| Time | Task | Output |
|---|---|---|
| 4:02am | Open questions triage | `*_oq-triage.md` + updates `open-questions.md` |
| 5:00am | ADR completeness | `*_adr-completeness.md` + skeleton ADR files |
| 5:37am | OWASP surface scan | `*_security.md` |
| 6:09am | Zod coverage audit | `*_zod-coverage.md` |
| 7:00am | Phase readiness | `*_phase-readiness.md` (reads OWASP + Zod) |
| 7:34am | Session digest | appends to `project-journal.md` |
| 9:07am | ★ Task queue synthesizer | `TASK_QUEUE.md` + updates `VIGIL_STATE.json` |

### Monday (deep analysis)
| Time | Task | Output |
|---|---|---|
| 2:05am | Policy conflict detector | `*_policy-conflicts.md` |
| 3:09am | DB growth monitor | `*_db-growth.md` |
| 5:03am | Intake pattern analysis | `*_intake-patterns.md` |
| 6:10am | Dependency planner (monthly) | `YYYY-MM_dependency-plan.md` |

### Every 3 days *(legacy — will migrate to Saturday in next review)*
| Time | Task |
|---|---|
| 3:00am Sat | Spec drift (now Saturday 11pm) |

---

## Priority normalization

The synthesizer applies this matrix before sorting, overriding the source task's self-assigned priority:

| Source | Minimum priority | Maximum priority |
|---|---|---|
| TypeScript errors (TS-*) | P0 | — |
| Auth / injection (SEC-*) | P1 | — |
| Unvalidated inputs (ZOD-*) | P1 | — |
| Dead code (DC-*) | P2 | P2 |
| Spec drift (SPEC-*) | — | P2 |
| ADR housekeeping (ADR-*) | — | P3 |

---

## Completed task memory

When `session-kickoff` completes a task, it writes the task's `file:line` into `VIGIL_STATE.json` with today's date. The synthesizer skips any `file:line` present in this map, preventing the same finding from re-appearing for 30 days. After 30 days the entry expires and the file is re-scanned fresh.

---

## Adding a new scan

1. Create a scheduled task with `taskId` prefixed with `vigil-` or a domain name
2. Output a report to `docs/log/health/YYYY-MM-DD_[name].md`
3. Include an `## Actionable Task Queue` section using the standard task block format:
   ```
   ### [PREFIX-YYYYMMDD-NNN]: [imperative title]
   Priority: P0/P1/P2/P3
   Effort: XS/S/M/L
   File: `src/path/file.ts:LINE`
   Problem: [1 sentence]
   Fix:
   [code block]
   Verify: [1 sentence]
   Done: [ ]
   ```
4. The synthesizer picks it up automatically on the next Sunday run

---

## Design principles

1. **Read before writing** — every Fix block is generated from the actual current file content, not guessed
2. **Verify before discarding** — a task is only removed from the queue if the fix has been confirmed, not just applied
3. **No orientation tax** — `session-kickoff` reads only `TASK_QUEUE.md`; it does not re-read health reports or specs
4. **Memory over repetition** — completed fixes are remembered for 30 days so the system doesn't rediscover what was already fixed
5. **Cascade awareness** — Sunday tasks run in dependency order so later tasks can reference earlier results
