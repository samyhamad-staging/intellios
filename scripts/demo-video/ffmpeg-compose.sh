#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Intellios Demo Video — FFmpeg Composition Pipeline (Session 172 reference)
#
# SCOPE: This script is REFERENCE ONLY for Session 172. It is NOT executed in
# Session 171. It documents the full composition flow so Session 172 has a
# repeatable, auditable build recipe.
#
# Inputs (all under scripts/demo-video/):
#   - title-cards/cold-open.svg            (1920×1080 SVG)
#   - title-cards/outro.svg                (1920×1080 SVG)
#   - output/walkthrough.webm              (Playwright capture — Session 172)
#   - output/narration.mp3                 (TTS render — Session 172)
#
# Output:
#   - output/demo-v1.mp4                   (1080p H.264 + AAC, YouTube-ready)
#
# Run once in Session 172 after:
#   (a) Playwright walkthrough.webm is captured
#   (b) narration.mp3 is rendered via ElevenLabs or OpenAI TTS
#   (c) narration duration has been measured and falls within 8:30–9:30
#
# Expected total output duration: 8:30–9:30 (3s cold-open + ~8:30 webm + 3s outro)
#
# Tooling:
#   - FFmpeg 4.4+          (brew install ffmpeg  OR  winget install Gyan.FFmpeg)
#   - librsvg (optional)   (faster, higher-fidelity SVG→PNG; falls back to FFmpeg)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${SCRIPT_DIR}/output"
TC_DIR="${SCRIPT_DIR}/title-cards"

COLD_OPEN_SVG="${TC_DIR}/cold-open.svg"
OUTRO_SVG="${TC_DIR}/outro.svg"
WALKTHROUGH_WEBM="${OUT_DIR}/walkthrough.webm"
NARRATION_MP3="${OUT_DIR}/narration.mp3"

COLD_OPEN_PNG="${OUT_DIR}/cold-open.png"
OUTRO_PNG="${OUT_DIR}/outro.png"
COLD_OPEN_CLIP="${OUT_DIR}/cold-open.mp4"
OUTRO_CLIP="${OUT_DIR}/outro.mp4"
CONCAT_LIST="${OUT_DIR}/concat.txt"
MERGED_VIDEO="${OUT_DIR}/merged-video.mp4"

FINAL_MP4="${OUT_DIR}/demo-v1.mp4"

# Title-card hold durations (seconds)
COLD_OPEN_HOLD="3"
OUTRO_HOLD="3"

# Target resolution + framerate
WIDTH="1920"
HEIGHT="1080"
FPS="30"

# ─── Pre-flight: verify inputs exist ─────────────────────────────────────────
for f in "$COLD_OPEN_SVG" "$OUTRO_SVG" "$WALKTHROUGH_WEBM" "$NARRATION_MP3"; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: required input missing: $f"
    exit 1
  fi
done

# Confirm FFmpeg is present.
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ERROR: ffmpeg not found. Install: brew install ffmpeg (macOS) or winget install Gyan.FFmpeg (Windows)."
  exit 1
fi

# Warn if narration duration is outside the 8:00–9:30 window (soft gate — does
# not block; Session 172 operator decides). Requires ffprobe (ships with ffmpeg).
NARRATION_SEC="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$NARRATION_MP3" | awk '{print int($1)}')"
echo "Narration duration: ${NARRATION_SEC}s (target: 510–570s ≈ 8:30–9:30)"
if (( NARRATION_SEC < 480 )) || (( NARRATION_SEC > 570 )); then
  echo "WARN: narration duration outside recommended window. Proceeding anyway."
fi

mkdir -p "$OUT_DIR"

# ─── Step 1: SVG → PNG ───────────────────────────────────────────────────────
# Prefer librsvg (rsvg-convert) for crisper text rendering; fall back to FFmpeg.
# Both produce 1920×1080 PNG at 72 dpi effective (SVG is resolution-independent).
if command -v rsvg-convert >/dev/null 2>&1; then
  rsvg-convert -w "$WIDTH" -h "$HEIGHT" "$COLD_OPEN_SVG" > "$COLD_OPEN_PNG"
  rsvg-convert -w "$WIDTH" -h "$HEIGHT" "$OUTRO_SVG"     > "$OUTRO_PNG"
else
  # FFmpeg's SVG decoder is adequate but renders text at runtime-installed
  # fonts. Outcome on CI differs from local — use rsvg-convert where possible.
  ffmpeg -y -i "$COLD_OPEN_SVG" -vf "scale=${WIDTH}:${HEIGHT}" "$COLD_OPEN_PNG"
  ffmpeg -y -i "$OUTRO_SVG"     -vf "scale=${WIDTH}:${HEIGHT}" "$OUTRO_PNG"
fi

# ─── Step 2: PNG + silence → title-card video clips ──────────────────────────
# Each title-card PNG becomes a 3-second silent MP4 clip at 30 fps with AAC
# silence so audio tracks align for concatenation.
ffmpeg -y \
  -loop 1 -framerate "$FPS" -t "$COLD_OPEN_HOLD" -i "$COLD_OPEN_PNG" \
  -f lavfi -t "$COLD_OPEN_HOLD" -i "anullsrc=r=48000:cl=stereo" \
  -c:v libx264 -pix_fmt yuv420p -r "$FPS" \
  -c:a aac -b:a 192k \
  -shortest \
  "$COLD_OPEN_CLIP"

ffmpeg -y \
  -loop 1 -framerate "$FPS" -t "$OUTRO_HOLD" -i "$OUTRO_PNG" \
  -f lavfi -t "$OUTRO_HOLD" -i "anullsrc=r=48000:cl=stereo" \
  -c:v libx264 -pix_fmt yuv420p -r "$FPS" \
  -c:a aac -b:a 192k \
  -shortest \
  "$OUTRO_CLIP"

# ─── Step 3: Normalize walkthrough.webm → mp4 ────────────────────────────────
# Playwright records as VP8 webm at 30 fps with no audio. Transcode to H.264
# so the concat filter does not re-encode per segment (video+codec alignment
# matters for the demuxer concat). Add silent AAC to match the clip format.
WALK_MP4="${OUT_DIR}/walkthrough.mp4"
ffmpeg -y \
  -i "$WALKTHROUGH_WEBM" \
  -f lavfi -i "anullsrc=r=48000:cl=stereo" \
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r "$FPS" \
  -vf "scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2" \
  -c:a aac -b:a 192k \
  -shortest \
  "$WALK_MP4"

# ─── Step 4: Concatenate clips (cold-open + walkthrough + outro) ─────────────
# FFmpeg demuxer concat expects a plaintext list of clip paths. All three
# segments share codec/pix_fmt/fps/audio-format at this point.
cat > "$CONCAT_LIST" <<EOF
file '${COLD_OPEN_CLIP}'
file '${WALK_MP4}'
file '${OUTRO_CLIP}'
EOF

ffmpeg -y -f concat -safe 0 -i "$CONCAT_LIST" -c copy "$MERGED_VIDEO"

# ─── Step 5: Overlay narration.mp3 ───────────────────────────────────────────
# Final encode: keep video stream copied-where-possible; mix narration over
# the existing silent AAC. Narration starts 1.5s into the video (after the
# cold-open title card) so the opening line lands on screen — adjust the
# `-itsoffset` if the narration.mp3 already includes leading silence.
NARRATION_OFFSET="1.5"

ffmpeg -y \
  -i "$MERGED_VIDEO" \
  -itsoffset "$NARRATION_OFFSET" -i "$NARRATION_MP3" \
  -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -movflags +faststart \
  "$FINAL_MP4"

# ─── Step 6: Report ──────────────────────────────────────────────────────────
FINAL_SEC="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FINAL_MP4" | awk '{print int($1)}')"
FINAL_MB="$(du -m "$FINAL_MP4" | awk '{print $1}')"
echo
echo "─────────────────────────────────────────────────"
echo "  Intellios demo-v1 composition: DONE"
echo "─────────────────────────────────────────────────"
echo "  Output:   $FINAL_MP4"
echo "  Duration: ${FINAL_SEC}s (target 510–570s ≈ 8:30–9:30)"
echo "  Size:     ${FINAL_MB} MB"
echo "  Upload:   YouTube (unlisted) — no further encoding needed."
echo
echo "  Next: open $FINAL_MP4 locally to review. If pacing is off, edit"
echo "        narration.md and walkthrough.spec.ts together, re-capture,"
echo "        and re-run this script."
echo "─────────────────────────────────────────────────"

# ─── End of reference pipeline ───────────────────────────────────────────────
