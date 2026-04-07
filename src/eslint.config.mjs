// eslint.config.mjs — ESLint 9 flat config for Next.js 16
// eslint-config-next ships a ready-made flat config array (ESLint 9 format).
import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    rules: {
      // ── React Compiler experimental rules ────────────────────────────────
      // eslint-plugin-react-hooks v5 adds compiler-constraint rules that flag
      // patterns common in existing Next.js code. Downgrade to warn so CI
      // doesn't hard-fail on pre-existing code while we migrate incrementally.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      // ── Cosmetic / auto-fixable ───────────────────────────────────────────
      // Unescaped entities in JSX are cosmetic; warn rather than hard-fail.
      "react/no-unescaped-entities": "warn",
    },
  },
];
