# Governance Policy Schema Changelog

## v1.1.0 — 2026-03-12

**Structured policy expression language (ADR-005).**

Breaking change to the `rules` array structure:

- Rules now use a structured `{ id, field, operator, value?, severity, message }` format instead of free-form objects.
- `operator` is an enum of 11 supported values: `exists`, `not_exists`, `equals`, `not_equals`, `contains`, `not_contains`, `matches`, `count_gte`, `count_lte`, `includes_type`, `not_includes_type`.
- `field` uses dot-notation to address any path into the ABP (e.g., `"capabilities.instructions"`, `"governance.policies"`).
- `condition` field removed (was a placeholder, never implemented).
- `severity` is required: `"error"` (blocks `draft → in_review`) or `"warning"` (informational).

See `docs/decisions/005-governance-policy-expression-language.md` for the full decision rationale.

---

## v1.0.0 — 2026-03-12

**Initial release.**

Defines the structure of a governance policy:
- `id`, `name`, `type`, `description` metadata
- `rules` array (free-form objects, superseded in v1.1.0)
- `enterprise_id` for tenant scoping (null = global policy)
