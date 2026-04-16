# ADR-015: PDF Rendering of Evidence Package

**Status:** proposed
**Date:** 2026-04-09
**Supersedes:** (none)

## Context

Today the evidence package is emitted as JSON by `GET /api/blueprints/[id]/evidence-package` and cached at `evidence/{id}/{version}.json`. The only on-screen rendering of the `MRMReport` is the HTML report at `src/app/blueprints/[id]/report/page.tsx`, which uses `print:break-before-page` CSS and a `PrintButton` component — a print-to-PDF workflow, not a server-side rendered PDF.

A sample "Big 4 audit style" PDF rendering of the evidence package (`samples/evidence-package-claims-triage-agent-v2.1-2026-04-09.pdf`, built via `samples/build_evidence_pdf.py`) has been produced using reportlab for founder/design-partner use. The sample is structurally faithful — every field maps to the real `MRMReport` + wrapper shape from `src/lib/mrm/types.ts` and the evidence-package route — but customer data is hand-written seed and flagged `[FR]`.

The product commitment made on 2026-04-09 is that Intellios must be able to render this PDF from real data. Compliance officers, regulators, and Big 4 audit partners expect a branded, printable artifact for regulatory submissions. The current HTML-print workflow is insufficient:

- Layout quality depends on the browser's print engine and user margin settings.
- No deterministic byte-identical rendering for signed/archived distribution.
- Running headers, page numbers, code-block line numbers, and Big 4 typography are hard to guarantee in print CSS across Chromium / Firefox / Safari.
- Branding surface is limited — Catalyst components are built for on-screen use and render inconsistently through browser print.

## Decision

Intellios will add a **server-side PDF renderer** for the evidence package, alongside the existing JSON export. The JSON export remains authoritative; the PDF is a rendering of that JSON.

**Shape:**

1. New route: `GET /api/blueprints/[id]/evidence-package.pdf`
   - Same auth and status gate as the JSON export (`approved` or `deployed`)
   - Same audit event: `blueprint.evidence_package_exported` with `format: "pdf"`
   - Content-Disposition filename: `evidence-package-{safeName}-v{version}-{YYYY-MM-DD}.pdf`
2. The route loads the canonical JSON export (cache-hit from `evidence/{id}/{version}.json` when available; otherwise calls `assembleMRMReport()` + `assessAllFrameworks()` + builds the wrapper).
3. The JSON is handed to a deterministic PDF renderer. Two candidate implementations are tracked in an open question:
   - Node-native: `pdf-lib` or `pdfkit` for full control
   - Headless Chromium: `puppeteer` / `playwright` printing a dedicated server-side HTML template (reuse the existing HTML report shell with a print stylesheet)
4. Brand-compliant output: Geist Sans + Geist Mono, indigo `#4f46e5` accent, Big 4 audit aesthetic (serif titles acceptable for cover only), thin table rules, line-numbered YAML blocks, running header, page numbers, classification banner.
5. Same S3-cache strategy as JSON: `evidence/{id}/{version}.pdf`.
6. The reference Python generator at `samples/build_evidence_pdf.py` documents the target layout and field mapping; it is NOT the production renderer but serves as a spec for the TypeScript implementation.

**Out of scope for this ADR:**
- Cryptographic signing of the PDF (tracked as a separate future item).
- White-label per-tenant theming (tracked under H3 enterprise branding).
- Interactive PDF features (form fields, embedded evidence files).

## Consequences

**Positive:**
- Regulators and Big 4 audit teams receive a branded, printable, deterministic artifact.
- Framing that "Intellios produces this PDF" becomes technically accurate, not a mockup claim.
- The spec-by-example provided by `samples/build_evidence_pdf.py` reduces implementation ambiguity — the target layout is visible before any TypeScript is written.
- The PDF becomes the default artifact a compliance officer can drop into a regulatory portal without rendering in their own browser.

**Negative:**
- New dependency: either a Node PDF library (maintenance surface) or headless Chromium (deploy-size + memory footprint + startup latency).
- Two rendering paths (HTML report screen + PDF export) must stay in sync as `MRMReport` fields evolve. Mitigation: a shared section-config module that both renderers consume.
- Server-side rendering of a ~14-page PDF will add measurable latency to the export endpoint. Mitigation: S3 cache + async precomputation on `blueprint.status_changed → deployed`.

**Risk to defer:**
- If we keep positioning the sample PDF as "what Intellios produces" in marketing or design-partner conversations without shipping this, the gap between demo and product widens. Target implementation window: before the next design-partner pilot (see roadmap).

**Follow-up work tracked:**
- OQ: whether to build on `pdf-lib` / `pdfkit` / headless Chromium (see `docs/open-questions.md`).
- Spec file: `docs/specs/evidence-package-pdf-renderer.md` to be created when this ADR moves from `proposed` to `accepted`.
- Schema note: no ABP schema change required — the PDF is derived entirely from existing fields.
