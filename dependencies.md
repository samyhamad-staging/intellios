# Dependency Graph & Execution Order

```
T1 (Loading States) ──┐
T2 (Error Boundaries) ─┤
T3 (Empty States) ─────┤──→ All independent, no dependencies
T4 (Form Validation) ──┤
T5 (Copy Audit) ───────┤
T6 (A11y Audit) ───────┘
```

## Dependency Analysis

| Task | Depends On | Reason |
|------|-----------|--------|
| T1 | none | Creates new loading.tsx files only |
| T2 | none | Creates new error.tsx files only |
| T3 | none | Modifies page files that T1/T2 don't touch (T1/T2 create sibling files) |
| T4 | none | Modifies auth form files not touched by any other task |
| T5 | none | Read-only audit, produces new doc |
| T6 | none | Read-only audit, produces new doc |

## Execution Order (sequential by impact)

1. T1 — Loading states (highest leverage: 40 pages lack them)
2. T2 — Error boundaries (second highest: graceful failure recovery)
3. T3 — Empty states (direct UX improvement for data-less views)
4. T4 — Form validation (improves critical auth flows)
5. T5 — Copy audit (documentation for future work)
6. T6 — A11y audit (documentation for future work)
