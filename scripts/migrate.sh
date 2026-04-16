#!/usr/bin/env bash
# Intellios — database schema management wrapper.
#
# Usage:
#   scripts/migrate.sh --dry-run    Show SQL that would be applied, without executing it.
#   scripts/migrate.sh --apply      Apply schema changes to the database (default).
#
# DATABASE_URL must be set in the environment before calling this script.
# In CI, export it from a GitHub Actions secret or a .env file.
# In local dev, it can be sourced from src/.env.local.
#
# Implementation note:
#   This project uses `drizzle-kit push` for schema management, which directly
#   syncs the TypeScript schema definition to the database.  The SQL migration
#   files in src/lib/db/migrations/ serve as an audit trail and reference, but
#   schema state is always authoritative from src/lib/db/schema.ts.
#
#   When the project transitions to migration-based deployments (drizzle-kit
#   migrate), update the APPLY_CMD and DRY_RUN_CMD variables below.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$SCRIPT_DIR/../src"

usage() {
  echo "Usage: $0 [--dry-run | --apply | --help]"
  echo ""
  echo "  --dry-run   Print the SQL that would be executed without applying it."
  echo "  --apply     Apply schema changes to the database (default when no flag given)."
  echo ""
  echo "Required environment variables:"
  echo "  DATABASE_URL   PostgreSQL connection string"
  echo "                 e.g. postgresql://user:pass@host:5432/dbname"
}

# ─── Guard: require DATABASE_URL ─────────────────────────────────────────────

if [ -z "${DATABASE_URL:-}" ]; then
  echo "error: DATABASE_URL is not set." >&2
  echo "       Export it before running this script, or source src/.env.local." >&2
  exit 1
fi

# ─── Parse arguments ──────────────────────────────────────────────────────────

MODE="${1:---apply}"

case "$MODE" in
  --help|-h)
    usage
    exit 0
    ;;
  --dry-run|--apply)
    # handled below
    ;;
  *)
    echo "error: unknown flag: $MODE" >&2
    usage >&2
    exit 1
    ;;
esac

# ─── Run ──────────────────────────────────────────────────────────────────────

cd "$SRC_DIR"

if [ "$MODE" = "--dry-run" ]; then
  echo "=== Dry-run: schema changes that would be applied ==="
  echo "    DATABASE_URL target: ${DATABASE_URL%%@*}@…"
  echo ""
  npx drizzle-kit push --dry-run
  echo ""
  echo "=== Dry-run complete — no changes were applied. ==="
else
  echo "=== Applying database schema to: ${DATABASE_URL%%@*}@… ==="
  npx drizzle-kit push
  echo "=== Schema applied successfully. ==="
fi
