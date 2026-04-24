# Intellios Demo Video Pipeline

**Purpose.** Programmatic, re-runnable pipeline that captures the 8-stage Intellios lifecycle against real AWS Bedrock, layers TTS narration, adds Intellios-branded title cards, and produces a 1080p YouTube-unlisted MP4. SCRUM-43 is the Jira Story this pipeline exists to close.

The whole asset — narration script, Playwright capture, FFmpeg composition, title cards — is source-controlled under `scripts/demo-video/` so the demo can be re-generated whenever the product changes. That is the point: a durable differentiation-proof asset, not a frozen recording.

## Pipeline overview

Four stages, in order:

```
  narrate  →   automate    →   capture      →   compose
  ───────      ────────        ─────────         ────────
  TTS API      Playwright      walkthrough       FFmpeg concat +
  (~9 min)     drives 8-       .webm produced    narration overlay +
  narration    stage run       at 1920x1080      title-card clips →
  .mp3         on dev server                     demo-v1.mp4
```

Each stage is idempotent. If pacing drifts, edit `narration.md` first (it is the authoritative timing source) and then adjust `walkthrough.spec.ts` beats and `ffmpeg-compose.sh` offsets to match.

## Files in this directory

| File | Purpose | Edited when |
|---|---|---|
| `narration.md` | Timed narration script (8 stages + cold-open + outro). Authoritative source for video pacing. | Product flow changes, OR narration timing drifts outside 8:30–9:30. |
| `walkthrough.spec.ts` | Playwright capture script. Mirrors narration beats. | Stage actions change, OR narration.md is edited. |
| `ffmpeg-compose.sh` | Reference composition pipeline for Session 172. | Title-card holds, narration offset, or encoding profile change. |
| `title-cards/cold-open.svg` | 1920x1080 cold-open title card. Self-contained SVG. | Brand refresh; headline change. |
| `title-cards/outro.svg` | 1920x1080 outro title card. Frames the ADR-015 PDF renderer as the next-release item. | ADR-015 ships (retitle to match shipped state); brand refresh. |
| `output/` | Gitignored. Houses walkthrough.webm, narration.mp3, intermediate clips, final demo-v1.mp4. | Session 172 writes here. |

## Prerequisites (Session 172)

### Local tooling

- **Node 20+** with `npm`.
- **Playwright** — `@playwright/test@^1.59` installed in `src/` (already present; run `npx playwright install chromium` if the chromium binary is missing).
- **FFmpeg 4.4+** — on Windows: `winget install Gyan.FFmpeg`; on macOS: `brew install ffmpeg`. Required for the composition step.
- **librsvg** (optional, recommended) — `rsvg-convert` renders SVG title cards with higher text fidelity than FFmpeg's SVG decoder. `brew install librsvg` or `winget install GNOME.librsvg`.

### Environment keys

`src/.env.local` must contain:

- `DATABASE_URL`, `ANTHROPIC_API_KEY`, `AUTH_SECRET` (already present — app boot prereqs).
- `BEDROCK_EXECUTION_ROLE_ARN` — the AgentCore execution role ARN for `retail-bank-demo` enterprise.
- `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` — the sandbox automation user credentials, holding the `IntelliosBedrockRuntimeInvoke` inline policy applied in Session 170.

**TTS API key** (for the narration render step):

- `ELEVENLABS_API_KEY` (preferred), OR
- `OPENAI_API_KEY` (fallback).

**Session 171 tooling inventory found neither TTS key present in `src/.env.local`.** Session 172 cannot execute the narration render without one of them. Add to `src/.env.local` before starting Session 172.

### Dev-server state

1. `docker compose up` (Postgres on `:5433`, Redis on `:6379`).
2. `cd src && npx tsx scripts/seed-demo.ts` — seeds `retail-bank-demo` enterprise, three personas (Marta / Rafael / Ed), three governance policies.
3. Set the Bedrock execution role ARN on the seeded enterprise (see `docs/demo/lifecycle-demo.md` §Stage 0 — one SQL statement).
4. `cd src && npm run dev` — dev server on `http://localhost:3000`.
5. Verify `curl http://localhost:3000/api/healthz` returns 200 with `bedrockCircuit.status === "closed"`.

### AWS state

- Bedrock agent foundation model `us.anthropic.claude-haiku-4-5-20251001-v1:0` must be an ACTIVE inference profile in your region. Session 170 finding: AWS revokes LEGACY model access after 30 days of non-use; check current status via `aws bedrock list-inference-profiles --region us-east-1` and substitute if needed.
- Sandbox account must have at least 1 unused Bedrock agent slot (capture creates exactly one, retires it at Stage 8).

## Commands (Session 172 execution)

Run from `C:\Users\samyh\Intellios\` (repo root).

```bash
# 0. Confirm dev server + health
curl -s http://localhost:3000/api/healthz | jq '.bedrockCircuit.status'
# expected: "closed"

# 1. Render narration.mp3 from narration.md (Session 172 writes this wrapper)
node scripts/demo-video/render-narration.mjs   # NOT YET SCAFFOLDED — Session 172 creates
# reads narration.md, strips [beat]/[pause] markers into SSML breaks,
# posts to ElevenLabs /v1/text-to-speech or OpenAI /v1/audio/speech,
# writes output/narration.mp3

# 2. Capture the 8-stage walkthrough
cd src
npx playwright test ../scripts/demo-video/walkthrough.spec.ts \
  --config=../scripts/demo-video/playwright.config.ts \
  --project=chromium --reporter=line
# (a playwright.config.ts for demo-video is expected in Session 172 —
#  existing src/playwright.config.ts targets ./e2e and enables fullyParallel,
#  both of which conflict with this capture.)
cd ..

# Copy the recorded .webm into output/ so ffmpeg-compose.sh finds it
cp src/test-results/**/walkthrough-*/video.webm scripts/demo-video/output/walkthrough.webm

# 3. Compose the final MP4
bash scripts/demo-video/ffmpeg-compose.sh
# Output: scripts/demo-video/output/demo-v1.mp4
```

## Re-running when the product changes

**Narration is the authoritative source.** The rule is: edit `narration.md` first, then propagate.

1. **Narration** — Edit stage wording, timings, beats. Re-validate the timing table at the end of `narration.md`; total must fall 8:30–9:30.
2. **Playwright** — Match any new beats or dropped steps in `walkthrough.spec.ts`. Align `DEMO.timing.stageN*Total` values with the narration table.
3. **FFmpeg offsets** — Adjust `NARRATION_OFFSET` in `ffmpeg-compose.sh` if narration.mp3 leading silence changes.
4. **Title cards** — Only when the headline framing needs to change. The outro card needs an update the moment ADR-015 ships (the "Coming next" label becomes false).

Commit narration + playwright + ffmpeg changes together — the three files form a single compositional contract. Drift between them produces a broken video.

## Known limitations

- **Browser state must be clean.** Chromium with notifications enabled, extension icons, or a non-default DevTools state pollutes the capture frame. Use Playwright's disposable profile (default) — do not point at a real user profile.
- **Real AWS dependency.** Stage 6 calls `CreateAgent` / `PrepareAgent` / `GetAgent` against real Bedrock. A failed deploy produces a visibly-broken video. Session 170 demonstrated a 30-day LEGACY-model access-revocation failure mode; verify the foundation model is ACTIVE before each run.
- **Network conditions visible in capture.** If dev server is on a laggy connection, loading spinners will hold longer than the narration beats. Run the capture on a wired network or with the local dev server only.
- **No per-stage retry.** If Stage 7's Bedrock invoke stalls, the whole capture must restart. Session 170's Stage 7 retry pattern (re-prepare agent with active inference profile) is not scripted — Session 172 should either add retry logic OR gate the capture on a one-shot smoke invoke before the full run.

## Cost per run

| Item | Cost |
|---|---|
| AWS Bedrock — 1 agent lifecycle (create + invoke + delete, ~8 min deployed) | ~$0.05–0.15 |
| TTS render — ~1,200-word narration via ElevenLabs (standard Rachel-class voice) | ~$2–4 |
| TTS render — same via OpenAI TTS-1 ($15/M chars, ~7,000 chars) | ~$0.10–0.20 |
| FFmpeg composition | Free |
| YouTube upload (unlisted) | Free |
| **Total per run** | **~$0.10–$5.00** depending on TTS provider |

Re-runs amortize cheaply — cost is dominated by TTS, and TTS only re-renders when narration.md changes.

## Session 171 scaffolding state (this session)

This directory was scaffolded in Session 171 as a pre-capture deliverable. No MP4 was produced; no TTS was called; no AWS resources were created.

- **Narration script** — complete, timing-validated, total 8:50 projected duration.
- **Playwright skeleton** — syntax-valid (0 parse errors), semantic type-check deferred to Session 172 due to a local stale-`node_modules` filesystem issue noted in the Session 171 log.
- **FFmpeg reference** — complete, bash-syntax-valid.
- **Title cards** — both SVGs well-formed, 1920x1080, self-contained.
- **Tooling gap flagged** — TTS API key absent from `src/.env.local`. Add before Session 172.

See `docs/log/2026-04-24_session-171.md` for the scaffolding session log; see `docs/log/2026-04-23_session-170.md` for the canonical 8/8 walkthrough findings this pipeline encodes.

## Not scaffolded (Session 172 creates)

- `render-narration.mjs` — TTS wrapper that reads narration.md, SSML-ifies the beat markers, posts to the TTS API, saves output/narration.mp3.
- `playwright.config.ts` (local to `scripts/demo-video/`) — non-parallel, single-project, capture-focused config distinct from `src/playwright.config.ts`.
- Any retry scaffolding around Stage 6 / Stage 7 capture failure modes.

These are deliberately left to Session 172 because each has a non-trivial dependency on the TTS provider choice, Playwright config conflicts, or observed Bedrock behavior at capture time — all better resolved in the session that actually executes the pipeline.
