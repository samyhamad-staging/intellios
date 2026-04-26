# Runbook: Evidence-Package PDF Renderer — Production Runtime Smoke

**Date added:** 2026-04-26 (Session 173)
**Relates to:** ADR-015, OQ-009 (resolved), SCRUM-38 (Done), Session 172 close-out
**Production code:** `c339f0a` — `src/lib/pdf/render-evidence.ts`, `src/app/api/blueprints/[id]/evidence-package/pdf/route.ts`
**Reference output:** `samples/evidence-package-claims-triage-agent-v2.1-2026-04-09.pdf`
**Target blueprint for smoke:** Retail Bank Customer-FAQ — `ed34ef1a` (Session 170 walkthrough)

This runbook closes the gap between "code green on Vercel" (`c339f0a`) and "audit-quality PDF actually rendered against real production data." The route currently throws a clear named error on any production request because `CHROMIUM_REMOTE_EXECUTABLE_URL` is unset.

The work has four phases. Phases 1–3 are blocking; Phase 4 is the visual fidelity pass that informs follow-up patches.

---

## Phase 1 — Host the slim Chromium binary

`@sparticuz/chromium-min` deliberately ships without the Chromium binary so each operator chooses where to host it. The version pinned in `src/package.json` is `^131.0.1` — the binary URL must match.

### Path A — Self-host on the Intellios artifact bucket (recommended for production)

This is the durable path. The binary lives next to the evidence-package cache, on infrastructure Intellios already pays for and audits.

```bash
# From repo root.
bash scripts/publish-chromium-pack.sh
```

The script (added in Session 173):
1. Downloads `chromium-v131.0.1-pack.x64.tar` from the Sparticuz GitHub release.
2. Verifies the SHA-256 against the value embedded in the script.
3. Uploads to `s3://${ARTIFACT_BUCKET}/assets/chromium/v131.0.1/chromium-pack.x64.tar` with public-read ACL.
4. Prints the public URL to paste into Vercel.

Expected URL shape:
```
https://${ARTIFACT_BUCKET}.s3.${AWS_REGION}.amazonaws.com/assets/chromium/v131.0.1/chromium-pack.x64.tar
```

**Required env in your local shell before running:**
- `ARTIFACT_BUCKET` — the bucket name you've been using for evidence-package caches.
- `AWS_REGION` — defaults to `us-east-1`, override if your bucket is elsewhere.
- AWS credentials with `s3:PutObject` and `s3:PutObjectAcl` on that bucket.

### Path B — GitHub release URL (smoke-only fallback)

Acceptable for the first runtime smoke. **Do not leave this in production** — GitHub release downloads have rate limits and outage risk that becomes Intellios's outage risk.

```
https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.x64.tar
```

If you go this route for the smoke, open a Story to migrate to Path A before any design-partner demo.

---

## Phase 2 — Set the Vercel environment variable

1. **vercel.com → Intellios project → Settings → Environment Variables**
2. Add:

| Variable | Value | Scope |
|---|---|---|
| `CHROMIUM_REMOTE_EXECUTABLE_URL` | The URL from Phase 1 | Production only (initially) |

3. Mark non-sensitive (the URL itself is public; the binary is published with public-read).
4. Click **Save**.

A new deployment is **not** required — Vercel re-injects env vars on the next cold start of the function. The very next PDF request will pick up the new URL.

> **Edge case:** if you set the variable but the route still throws `CHROMIUM_REMOTE_EXECUTABLE_URL is not set`, the function instance is warm with the old env. Force a redeploy from the Deployments tab (re-deploy the existing build, no commit needed) to recycle all instances.

---

## Phase 3 — Trigger the live render

### Pre-flight

The route requires:
- The blueprint to exist and be in status `approved` or `deployed`.
- The actor to have role `architect`, `reviewer`, `compliance_officer`, `admin`, or `viewer`.
- The actor's enterprise to match the blueprint's enterprise (or admin override).

Confirm the Retail Bank Customer-FAQ blueprint `ed34ef1a` is still `deployed` (Session 170 left it so):

```bash
# From a logged-in browser session, hit:
GET /api/blueprints/ed34ef1a
# Look for "status": "deployed" and a populated evidence_package_id.
```

If the blueprint is no longer `ed34ef1a`, list candidates via `/registry` and pick any approved/deployed agent — the smoke is not specific to Retail Bank, but visual comparison to the reference PDF assumes a 14-section MRM.

### Render

Two paths — pick one:

**(a) Via the UI (preferred for the first smoke).**
1. Open `/registry/${agentId}` in a logged-in browser.
2. Scroll to the **Export Evidence Package** panel.
3. Click the **PDF** button (indigo-filled — the primary action sibling to JSON).
4. Wait for the download. First request: 2–4 s cold-start latency from Chromium binary download. Subsequent requests within ~10 min: 50–200 ms.

**(b) Via direct API call (if the UI is gated).**
```bash
curl -L -o /tmp/evidence-smoke.pdf \
  -H "Cookie: $(grep -oP 'next-auth.session-token=\K[^;]+' ~/.intellios-cookie | head -1)" \
  https://${VERCEL_HOST}/api/blueprints/ed34ef1a/evidence-package/pdf
```

### Expected result

- HTTP 200, `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="evidence-package-...-vX.Y.Z-2026-04-26.pdf"`.
- File ≥ 50 KB (a healthy 14-section MRM is typically 200 KB – 2 MB).
- File opens in Preview / Acrobat / browser without errors.
- An `evidence_package_exported` audit row appears in the events table with `format: "pdf"` and `cached: false` on the first request, `cached: true` on subsequent requests for the same `(id, version)`.

### Failure modes & remediation

| Symptom | Likely cause | Fix |
|---|---|---|
| 500 with `CHROMIUM_REMOTE_EXECUTABLE_URL is not set` | Env var missing or function instance warm with old env | Re-check Phase 2; force redeploy. |
| 500 with `Failed to fetch executable from <url>` | Binary URL 404 or ACL not public-read | Re-run Phase 1; check S3 object ACL with `aws s3api get-object-acl ...`. |
| 500 with `Function exceeded memory limit` | Default Vercel memory too low for Chromium on a long MRM | Add `vercel.json` per-route override bumping `memory` to 2048. (Already noted as TODO in the route file's docstring.) |
| 504 timeout | First-cold-start binary download exceeded `maxDuration` | Route already sets `maxDuration = 60` — should not happen. If it does, prewarm by hitting the route once before the demo. |
| PDF returns but is blank or only renders 1 page | `waitUntil: "networkidle"` resolved before fonts loaded | Patch the renderer to use `waitUntil: "load"` + an explicit `page.waitForLoadState("networkidle", { timeout: 5000 })`. Open a Story. |
| 403 on the PDF route but JSON route works | Role gate divergence (shouldn't exist — both routes share the same gate) | File a Jira bug citing the route paths and the actor's role. |

---

## Phase 4 — Visual fidelity comparison

Open the freshly rendered PDF alongside `samples/evidence-package-claims-triage-agent-v2.1-2026-04-09.pdf`. Walk both side-by-side for these specific aesthetic checks:

1. **Cover page** — Intellios mark, agent name (serif), version, classification banner, "Confidential — Internal Use" footer position.
2. **Running header** — `INTELLIOS — Agent Name — vX.Y.Z` on every page after the cover.
3. **Section breaks** — each of the 14 MRM sections starts on a new page (Tailwind `print:break-before-page`).
4. **Tables** — thin grey rules, no zebra striping, right-aligned numerics, tabular nums where used.
5. **Approval chain** — each step on its own row, signer + role + timestamp + decision rendered consistently.
6. **Quality eval scores** — the four scoring badges (correctness, helpfulness, tool selection, safety) in the order matching the JSON template.
7. **Test runs evidence** — collapsed transcript blocks render readably (this is the most likely fidelity gap, given how `print:` variants interact with long monospaced content).
8. **Page numbers** — `Page N of M` in footer, never zero or unresolved `<span class="totalPages">`.

Expected gaps for v1 (open Stories under SCRUM-38 follow-up Epic if they appear):
- Sample's serif title font not embedded — Chromium will substitute. This is acceptable; the audit-quality bar is content fidelity, not exact typeface match.
- Fine-tuning of margins around the classification banner.
- Tighter widow/orphan control on long section bodies.

For each material gap (something an audit reviewer would flag), file a SCRUM Story under Epic 1.2 with `concern:fidelity` and `adr-015` labels.

---

## Phase 5 — Close-out

Once the PDF renders end-to-end and the visual review yields no blocking gaps:

1. Open Session N+1 log; add the smoke result + visual review notes.
2. Strike "Production runtime smoke" off the Session 172 follow-up list (`docs/log/2026-04-25_session-172.md` § "Operational follow-up").
3. Update `docs/roadmap.md` Phase A status — flip "Evidence Package PDF renderer" from "Done (this session)" to "Done + runtime-validated (Session N+1)" so future-Samy can distinguish *shipped* from *operationally green*.
4. Unblock SCRUM-43 (demo capture) — its narration depends on a real PDF artifact existing.

---

## Rollback

If the smoke fails in a way that blocks the demo and a same-day fix isn't credible:

1. **Hide the PDF buttons.** Comment out the `<DownloadEvidencePDFButton />` import in `src/app/blueprints/[id]/report/page.tsx` and `src/app/registry/[agentId]/page.tsx`. Push as a single revert commit. The JSON export remains the user-facing path.
2. **Leave the route in place.** Don't delete `src/app/api/blueprints/[id]/evidence-package/pdf/route.ts` — the issue is operational, not architectural. A subsequent fix-up commit can re-enable the buttons.
3. **Do not flip ADR-015 back to `proposed`.** The decision is sound; a runtime-config gap is not an architectural reversal. Add a note to the ADR's Implementation section instead.

---

## Open follow-ups not blocking the smoke

- `vercel.json` per-route memory bump (TODO in `render-evidence.ts` docstring).
- Vitest unit suite for the PDF route mirroring the JSON route's pattern.
- Shared `assembleEvidencePackage()` helper to eliminate JSON↔PDF route drift risk.
- Migration from Path B (GitHub release URL) to Path A (self-hosted) if the smoke used the fallback.
