# Performance Baseline — 2026-04-01

DPR-1.3 assessment. Establishes baseline metrics before design partner outreach.

## Build Analysis

| Metric | Value |
|--------|-------|
| Build target | Next.js 16, Turbopack |
| Total static assets | 3.4 MB |
| JS chunk count | 66 |
| Largest chunk | 445 KB |
| Chunks > 100 KB | 8 |
| Routes (total) | 73 pages + 86 API routes |

**Assessment:** Static asset size is healthy for an enterprise app. No single chunk exceeds 500 KB. Code splitting is working (66 chunks = good granularity).

## N+1 Query Audit

| Route | Risk | Detail |
|-------|------|--------|
| `/api/registry` | Low | Batch cost aggregate + Map lookup |
| `/api/monitor` | Low | Batch health fetch + Map lookup |
| `/api/dashboard/summary` | Low | Aggregate counts, in-memory enrichment |
| `/api/audit` | Low | Parallel queries, paginated |
| `/api/intake/sessions` | Low | Single query + in-memory extraction |
| `/api/review` | Medium | Enterprise settings per-enterprise (deduplicated) |
| `/api/monitor/check-all` | **Fixed** | Was N+1 (per-blueprint query in loop). Now batch-fetches all blueprints with `inArray()` + Map lookup. |
| `/api/cron/governance-drift` | High | Per-blueprint validation + DB write in loop. Acceptable: cron job, not user-facing, runs on small fleet (<50 agents). |
| `/api/cron/portfolio-snapshot` | Medium | Per-enterprise queries. Acceptable: cron job, runs daily, typically 1-5 enterprises. |

**Assessment:** All user-facing list endpoints use optimized batch patterns. N+1 issues exist only in cron jobs where the data volume is small (< 50 items). The one UI-triggerable N+1 (`/api/monitor/check-all`) has been fixed.

## Performance Risks at Scale

| Risk | Impact | Threshold | Mitigation |
|------|--------|-----------|------------|
| Governance drift cron | Sequential validation at fleet scale | > 100 deployed agents | Batch with `Promise.all` (bounded concurrency) |
| Portfolio snapshot cron | Per-enterprise sequential queries | > 10 enterprises | Single aggregated query with GROUP BY |
| Recharts client rendering | Large datasets slow chart render | > 500 data points | Already limited: 10-point trend, small tables |
| ABP JSON column size | Blueprint detail page load | > 50 KB ABP | Acceptable: ABPs are ~5-15 KB typically |

## Recommendations

1. **No blocking performance issues** for design partner demo (< 50 agents, 1 enterprise)
2. **Monitor cron execution time** once fleet exceeds 50 agents
3. **Consider `@next/bundle-analyzer`** if static assets grow past 5 MB
4. **Add response time logging** to high-traffic routes before production scale
