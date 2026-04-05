/**
 * React Query key factory — canonical query keys for all Intellios data fetches.
 *
 * Rules:
 * - Keys are arrays (never plain strings) for granular invalidation.
 * - Use the factory functions below; do not inline string arrays in components.
 * - Hierarchy: [domain] > [resource] > [id/params]
 *   e.g. ["registry", "agents"] or ["governance", "policies", { enterpriseId }]
 */

export const queryKeys = {
  // ── Agent Registry ──────────────────────────────────────────────────────────
  registry: {
    agents: () => ["registry", "agents"] as const,
    workflows: () => ["registry", "workflows"] as const,
    agent: (agentId: string) => ["registry", "agent", agentId] as const,
    quality: (agentId: string) => ["registry", "quality", agentId] as const,
  },

  // ── Blueprints ───────────────────────────────────────────────────────────────
  blueprints: {
    all: () => ["blueprints"] as const,
    list: () => ["blueprints", "list"] as const,
    detail: (id: string) => ["blueprints", id] as const,
  },

  // ── Governance ───────────────────────────────────────────────────────────────
  governance: {
    policies: () => ["governance", "policies"] as const,
    templates: () => ["governance", "templates"] as const,
    analytics: (days: number) => ["governance", "analytics", days] as const,
  },

  // ── Review queue ─────────────────────────────────────────────────────────────
  review: {
    queue: () => ["review", "queue"] as const,
  },

  // ── Monitor ──────────────────────────────────────────────────────────────────
  monitor: {
    agents: () => ["monitor", "agents"] as const,
    intelligence: () => ["monitor", "intelligence"] as const,
  },

  // ── Compliance ───────────────────────────────────────────────────────────────
  compliance: {
    overview: () => ["compliance", "overview"] as const,
  },

  // ── Audit log ────────────────────────────────────────────────────────────────
  audit: {
    log: (filters: Record<string, unknown>) => ["audit", "log", filters] as const,
  },

  // ── Pipeline ─────────────────────────────────────────────────────────────────
  pipeline: {
    board: () => ["pipeline", "board"] as const,
  },

  // ── Current user ─────────────────────────────────────────────────────────────
  me: () => ["me"] as const,
} as const;
