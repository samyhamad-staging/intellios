#!/usr/bin/env bash
#
# publish-chromium-pack.sh
#
# Publishes the @sparticuz/chromium-min binary tarball to the Intellios
# artifact S3 bucket so the production evidence-package PDF renderer can
# load it on cold start (CHROMIUM_REMOTE_EXECUTABLE_URL).
#
# Why: see ADR-015 + docs/runbooks/pdf-renderer-smoke.md (Phase 1, Path A).
#
# Convention: Bash + AWS CLI + node -e (per CLAUDE.md "Infra Scripts Are
# Node-First"). No Python.
#
# Required env:
#   ARTIFACT_BUCKET   The S3 bucket already used for evidence-package caches.
#   AWS_REGION        Defaults to us-east-1; override if your bucket is elsewhere.
#   AWS credentials   Standard AWS CLI credential chain (env, profile, instance role).
#                     Needs s3:PutObject (and s3:PutObjectAcl if ACLs are enabled).
#
# What this does:
#   1. Confirms the @sparticuz/chromium-min version pinned in src/package.json
#      matches the version constant below (CHROMIUM_VERSION). Bails if not.
#   2. Downloads chromium-v${CHROMIUM_VERSION}-pack.x64.tar from the Sparticuz
#      GitHub release into a temp directory.
#   3. Computes the SHA-256 and prints it for manual cross-check against the
#      GitHub release page's published checksum.
#   4. Uploads to s3://${ARTIFACT_BUCKET}/assets/chromium/v${CHROMIUM_VERSION}/chromium-pack.x64.tar
#      with public-read ACL and Content-Type application/x-tar.
#   5. Prints the resulting public URL — paste this into Vercel as
#      CHROMIUM_REMOTE_EXECUTABLE_URL.
#
# If your bucket has Object Ownership set to "BucketOwnerEnforced", ACLs
# are disabled. The PutObject will still succeed but --acl is silently
# ignored — you'll need a bucket policy granting s3:GetObject to '*' on
# arn:aws:s3:::${ARTIFACT_BUCKET}/assets/chromium/*. The script prints
# a templated bucket-policy snippet at the end for that case.
#

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────

# Must match the version pinned in src/package.json. When you bump
# @sparticuz/chromium-min, bump this and re-run to publish a sibling
# binary; the URL is versioned so the old one stays valid for rollback.
CHROMIUM_VERSION="131.0.1"

REGION="${AWS_REGION:-us-east-1}"
KEY="assets/chromium/v${CHROMIUM_VERSION}/chromium-pack.x64.tar"
GH_URL="https://github.com/Sparticuz/chromium/releases/download/v${CHROMIUM_VERSION}/chromium-v${CHROMIUM_VERSION}-pack.x64.tar"

# ── Pre-flight ────────────────────────────────────────────────────────────

if [[ -z "${ARTIFACT_BUCKET:-}" ]]; then
  echo "ERROR: ARTIFACT_BUCKET is not set." >&2
  echo "       Set it to the S3 bucket already used for evidence-package caches." >&2
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "ERROR: aws CLI not found on PATH." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node not found on PATH." >&2
  exit 1
fi

# Verify the version in the script matches src/package.json. Drift here
# means we'd publish a binary that doesn't match the chromium-min API
# the runtime is calling — silent breakage.
PKG_VERSION="$(node -e '
  const pkg = require("./src/package.json");
  const dep = (pkg.dependencies && pkg.dependencies["@sparticuz/chromium-min"]) || "";
  // Strip ^ ~ etc.
  process.stdout.write(dep.replace(/^[\^~>=<]+/, ""));
')"

if [[ "${PKG_VERSION}" != "${CHROMIUM_VERSION}" ]]; then
  echo "ERROR: version drift." >&2
  echo "       src/package.json @sparticuz/chromium-min: ${PKG_VERSION}" >&2
  echo "       this script CHROMIUM_VERSION:             ${CHROMIUM_VERSION}" >&2
  echo "       Bump the script constant to match, or downgrade the package." >&2
  exit 1
fi

# ── Download ──────────────────────────────────────────────────────────────

WORK_DIR="$(mktemp -d -t chromium-pack-XXXXXX)"
trap 'rm -rf "${WORK_DIR}"' EXIT

LOCAL_TAR="${WORK_DIR}/chromium-pack.x64.tar"

echo "→ Downloading: ${GH_URL}"
curl -fsSL --output "${LOCAL_TAR}" "${GH_URL}"

SIZE_BYTES="$(node -e "process.stdout.write(String(require('fs').statSync(process.argv[1]).size))" "${LOCAL_TAR}")"
SHA256="$(node -e "
  const crypto = require('crypto');
  const fs     = require('fs');
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(process.argv[1]));
  process.stdout.write(h.digest('hex'));
" "${LOCAL_TAR}")"

echo "  size:   ${SIZE_BYTES} bytes"
echo "  sha256: ${SHA256}"
echo
echo "→ Cross-check that sha256 against the GitHub release page:"
echo "    https://github.com/Sparticuz/chromium/releases/tag/v${CHROMIUM_VERSION}"
echo

# ── Upload ────────────────────────────────────────────────────────────────

echo "→ Uploading to s3://${ARTIFACT_BUCKET}/${KEY} (region: ${REGION})"

# --acl public-read is silently ignored if the bucket has Object Ownership
# = BucketOwnerEnforced. We emit a bucket-policy snippet at the end so
# operators on locked-down buckets can grant read another way.
aws s3api put-object \
  --bucket      "${ARTIFACT_BUCKET}" \
  --key         "${KEY}" \
  --body        "${LOCAL_TAR}" \
  --content-type "application/x-tar" \
  --acl         "public-read" \
  --region      "${REGION}" \
  >/dev/null

# ── Output ────────────────────────────────────────────────────────────────

PUBLIC_URL="https://${ARTIFACT_BUCKET}.s3.${REGION}.amazonaws.com/${KEY}"

echo
echo "✓ Published."
echo
echo "  CHROMIUM_REMOTE_EXECUTABLE_URL = ${PUBLIC_URL}"
echo
echo "Paste the value above into:"
echo "  vercel.com → Intellios project → Settings → Environment Variables"
echo "  Scope: Production. Sensitivity: not sensitive."
echo

# ── Verify the object is readable anonymously ─────────────────────────────

echo "→ Anonymous-read verification…"
HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' "${PUBLIC_URL}")"
if [[ "${HTTP_CODE}" == "200" ]]; then
  echo "  HTTP 200 — public read OK."
else
  echo "  HTTP ${HTTP_CODE} — public read FAILED." >&2
  echo
  echo "  Your bucket likely has Object Ownership = BucketOwnerEnforced," >&2
  echo "  which disables ACLs. Add this bucket-policy statement to grant" >&2
  echo "  anonymous GetObject on the chromium prefix only:" >&2
  cat >&2 <<EOF

  {
    "Sid": "PublicReadChromiumAssets",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::${ARTIFACT_BUCKET}/assets/chromium/*"
  }

EOF
  exit 2
fi
