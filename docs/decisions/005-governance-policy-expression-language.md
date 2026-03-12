# ADR-005: Governance Policy Expression Language

**Status:** accepted
**Date:** 2026-03-12
**Resolves:** OQ-001

## Context

The governance policy schema defined a `condition` field for policy rules with the note "format TBD". This blocked the Governance Validator implementation entirely — without a defined expression language, no rule evaluation engine could be built.

Three approaches were evaluated:

| Option | Description | Trade-offs |
|---|---|---|
| **A: Structured field/operator/value** | Rules expressed as `{ field, operator, value }` triplets | Simple, deterministic, covers ~95% of enterprise governance cases. Cannot express compound "if X then Y" conditions. |
| **B: JSON Logic** | Standard JSON Logic specification for rule expression | Battle-tested, expressive, handles AND/OR/NOT. Complex to implement, unfamiliar format for enterprise policy authors. |
| **C: Natural language + Claude evaluation** | Rules described in prose, evaluated by Claude at runtime | Maximum expressiveness, but non-deterministic. Cannot audit rule evaluations. Latency and cost per rule evaluation. |

## Decision

**Option A: Structured field/operator/value rules.**

Each rule in a governance policy uses this format:

```json
{
  "id": "rule-identifier",
  "field": "dot.notation.path",
  "operator": "<operator>",
  "value": "<comparison value>",
  "severity": "error | warning",
  "message": "Human-readable violation message"
}
```

**Field addressing:** Dot-notation path resolved against the full ABP object (e.g., `"capabilities.instructions"`, `"governance.policies"`). Resolves nested objects including optional chains.

**Supported operators:**

| Operator | Applies to | Passes when |
|---|---|---|
| `exists` | any | value is not null/undefined/empty string/empty array |
| `not_exists` | any | value is null, undefined, empty string, or empty array |
| `equals` | scalar | value strictly equals `rule.value` |
| `not_equals` | scalar | value does not strictly equal `rule.value` |
| `contains` | string or array | string includes `rule.value`, or array contains `rule.value` as element |
| `not_contains` | string or array | negation of `contains` |
| `matches` | string | string matches regex pattern in `rule.value` |
| `count_gte` | array | `array.length >= rule.value` (numeric) |
| `count_lte` | array | `array.length <= rule.value` (numeric) |
| `includes_type` | array of objects | array contains an element with `.type === rule.value` |
| `not_includes_type` | array of objects | no element has `.type === rule.value` |

**Severity semantics:**
- `error`: violation blocks the lifecycle transition `draft → in_review`. Blueprint can still be stored and refined.
- `warning`: informational. Does not block any lifecycle transition.

**Remediations:** Claude generates a suggested fix for each violation in a single batched call after evaluation. Suggestions are stored in the validation report and displayed in the UI.

**Validation timing:** Automatic on blueprint generation (stored in `validation_report` column). Re-validation available via `POST /api/blueprints/[id]/validate`.

## Consequences

- The policy expression language is intentionally limited to simple assertions. Compound conditional logic ("if agent has tool X then policy Y must exist") is not expressible with Option A and must wait for a future iteration.
- The `condition` field in the v1.0.0 policy schema is superseded. Schema advances to v1.1.0 with the structured rule format.
- Rule evaluation is fully deterministic — same ABP + same policies always produces the same result.
- Enterprise policy authors can write rules without programming knowledge.
- Future extension paths: AND/OR rule grouping can be added as `group` rules wrapping multiple `field/operator/value` rules; Claude evaluation can be added as a new operator type (`claude_evaluates`).
