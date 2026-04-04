# ADR-001: Git-Native Knowledge Management System

**Status:** accepted
**Date:** 2026-03-12
**Supersedes:** none

## Context

Intellios needs a source-of-truth system to manage architecture, decisions, schemas, and specifications. The system must be accessible to both humans and Claude, support versioning, and prevent knowledge drift.

Options considered:
1. **External wiki** (Notion, Confluence) — requires integration, can drift from code
2. **Database-backed system** — complex setup, harder for Claude to read
3. **Git-native structured docs** — Markdown + JSON Schema files in the repo

## Decision

Use **git-native structured docs**. All project knowledge lives as Markdown and JSON/YAML files inside the repository, versioned alongside code.

Structure:
- `docs/architecture/` — system design documents
- `docs/decisions/` — ADRs (this format)
- `docs/schemas/` — versioned JSON Schema files
- `docs/specs/` — component behavior specifications
- `docs/glossary.md` — canonical term definitions
- `docs/roadmap.md` — current phase and priorities
- `CLAUDE.md` — project instructions for Claude

## Consequences

**Benefits:**
- Claude reads files directly with no integration
- Git provides versioning, diffing, and blame
- Pull requests serve as the review mechanism for knowledge changes
- Zero external tooling required
- Single source of truth co-located with code

**Trade-offs:**
- No rich formatting (diagrams require ASCII or external tools)
- No full-text search beyond grep/ripgrep (acceptable for project scale)
- Requires discipline to keep docs updated alongside code changes
