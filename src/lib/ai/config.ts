/**
 * Centralized AI model registry.
 *
 * Model IDs are read from environment variables so they can be updated
 * without code changes — critical for responding to Anthropic model
 * deprecations without an emergency deploy.
 *
 * Env vars:
 *   AI_MODEL_SONNET  — complex generation tasks (default: claude-sonnet-4-20250514)
 *   AI_MODEL_HAIKU   — fast/cheap tasks: classification, remediation, orchestration
 *                      (default: claude-haiku-4-5-20251001)
 */

import { anthropic } from "@ai-sdk/anthropic";

const SONNET_MODEL_ID = process.env.AI_MODEL_SONNET ?? "claude-sonnet-4-20250514";
const HAIKU_MODEL_ID = process.env.AI_MODEL_HAIKU ?? "claude-haiku-4-5-20251001";

export const models = {
  /**
   * Sonnet — used for blueprint generation and refinement.
   * High capability, structured output, longer context.
   */
  sonnet: anthropic(SONNET_MODEL_ID),

  /**
   * Haiku — used for classification, remediation suggestions, and orchestration.
   * Fast and cost-efficient for high-frequency, lower-complexity calls.
   */
  haiku: anthropic(HAIKU_MODEL_ID),
} as const;
