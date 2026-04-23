#!/usr/bin/env bash
# provision-bedrock-sandbox.sh
#
# Idempotent provisioner for the IntelliosBedrockAgentExecRole IAM role.
#
# What this script does:
#   1. Verifies AWS credentials are active (sts get-caller-identity).
#   2. Creates (or updates) the IAM role "IntelliosBedrockAgentExecRole" with:
#        - Trust policy: bedrock.amazonaws.com service principal, scoped to
#          this account's agents via aws:SourceAccount + aws:SourceArn.
#        - Inline policy: minimum-necessary Bedrock + CloudWatch permissions,
#          model ARN scoped to the model verified available in us-east-1.
#   3. Prints the role ARN to stdout.
#   4. Writes BEDROCK_EXECUTION_ROLE_ARN=<arn> to src/.env.local (appends if
#      missing, replaces if present).
#   5. Runs a verification block: describe-role, simulate-principal-policy,
#      and a list-foundation-models smoke call.
#
# Model ARN derived from src/lib/db/seed-retail-bank.ts:153 (foundationModel).
# Verified via `aws bedrock list-foundation-models --region us-east-1`
# during session-164 pre-flight:
#   anthropic.claude-3-5-haiku-20241022-v1:0  → CONFIRMED available
#
# Note: translate.ts DEFAULT_FOUNDATION_MODEL (claude-3-5-sonnet-20241022-v2:0)
# is absent from us-east-1. Tracked as follow-up to update that fallback.
# The demo overrides the model via seed-retail-bank.ts so the smoke is unaffected.
#
# Usage (from repo root):
#   chmod +x scripts/provision-bedrock-sandbox.sh
#   ./scripts/provision-bedrock-sandbox.sh
#
# Requirements:
#   - AWS CLI v2 configured (aws sts get-caller-identity must succeed)
#   - Node.js (node) available for JSON parsing
#   - Permissions: iam:CreateRole, iam:GetRole, iam:UpdateAssumeRolePolicy,
#     iam:PutRolePolicy, bedrock:ListFoundationModels, iam:SimulatePrincipalPolicy
#
# Safe to re-run — uses get-role || create-role; put-role-policy (idempotent).
# NEVER commit the produced src/.env.local — it is gitignored by src/.gitignore.

set -euo pipefail

# ─── Configuration ─────────────────────────────────────────────────────────────

ROLE_NAME="IntelliosBedrockAgentExecRole"
REGION="${AWS_REGION:-us-east-1}"   # us-east-1 matches seed-retail-bank.ts:149
ENV_FILE="$(dirname "$0")/../src/.env.local"
ENV_KEY="BEDROCK_EXECUTION_ROLE_ARN"

# Verified available in us-east-1 (session-164 pre-flight — list-foundation-models)
DEMO_MODEL_ID="anthropic.claude-3-5-haiku-20241022-v1:0"

# ─── Helper: parse JSON field via Node ─────────────────────────────────────────

json_field() {
  # Usage: json_field <json_string> <dot-path>   e.g. json_field "$JSON" "Role.Arn"
  local json="$1"
  local path="$2"
  echo "${json}" | node -e "
const chunks = [];
process.stdin.on('data', d => chunks.push(d));
process.stdin.on('end', () => {
  const data = JSON.parse(chunks.join(''));
  const parts = '${path}'.split('.');
  let v = data;
  for (const p of parts) v = v[p];
  process.stdout.write(String(v));
});
"
}

# ─── Step 1: Verify credentials ────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Intellios Bedrock Sandbox Provisioner"
echo "  Role: ${ROLE_NAME}   Region: ${REGION}"
echo "═══════════════════════════════════════════════════════════"
echo ""

echo "▶  Step 1: Verifying AWS credentials…"
IDENTITY_JSON=$(aws sts get-caller-identity --output json 2>&1) || {
  echo "✗  aws sts get-caller-identity failed. Check your AWS credentials."
  echo "   ${IDENTITY_JSON}"
  exit 1
}
ACCOUNT=$(json_field "${IDENTITY_JSON}" "Account")
ARN_CALLER=$(json_field "${IDENTITY_JSON}" "Arn")
echo "   Account : ${ACCOUNT}"
echo "   Caller  : ${ARN_CALLER}"
echo "   Region  : ${REGION}"
echo "   ✓ Credentials active"

# ─── Step 2: Build JSON documents ──────────────────────────────────────────────

echo ""
echo "▶  Step 2: Preparing IAM policy documents…"

TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockAgentsTrustPolicy",
      "Effect": "Allow",
      "Principal": { "Service": "bedrock.amazonaws.com" },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": { "aws:SourceAccount": "${ACCOUNT}" },
        "ArnLike": { "aws:SourceArn": "arn:aws:bedrock:${REGION}:${ACCOUNT}:agent/*" }
      }
    }
  ]
}
EOF
)

MODEL_ARN="arn:aws:bedrock:${REGION}::foundation-model/${DEMO_MODEL_ID}"

INLINE_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockFoundationModelInvoke",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:GetFoundationModel"
      ],
      "Resource": ["${MODEL_ARN}"]
    },
    {
      "Sid": "CloudWatchAgentLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:${REGION}:${ACCOUNT}:log-group:/aws/bedrock/agents*"
    }
  ]
}
EOF
)

echo "   Model ARN scoped in policy: ${MODEL_ARN}"
echo "   Trust policy principal: bedrock.amazonaws.com"
echo "   Trust condition: SourceAccount=${ACCOUNT}, SourceArn=arn:aws:bedrock:${REGION}:${ACCOUNT}:agent/*"

# ─── Step 3: Create or update the IAM role ─────────────────────────────────────

echo ""
echo "▶  Step 3: Creating or updating IAM role ${ROLE_NAME}…"

ROLE_ARN=""
EXISTING_ROLE=$(aws iam get-role --role-name "${ROLE_NAME}" --output json 2>&1) || EXISTING_ROLE=""

if echo "${EXISTING_ROLE}" | grep -q '"RoleArn"' 2>/dev/null; then
  ROLE_ARN=$(json_field "${EXISTING_ROLE}" "Role.Arn")
  echo "   Role already exists: ${ROLE_ARN}"
  echo "   Updating trust policy…"
  aws iam update-assume-role-policy \
    --role-name "${ROLE_NAME}" \
    --policy-document "${TRUST_POLICY}" \
    --output text > /dev/null
  echo "   ✓ Trust policy updated (idempotent)"
else
  echo "   Role does not exist — creating…"
  CREATE_RESULT=$(aws iam create-role \
    --role-name "${ROLE_NAME}" \
    --assume-role-policy-document "${TRUST_POLICY}" \
    --description "Execution role for Intellios-managed Bedrock agents - provisioned by provision-bedrock-sandbox.sh" \
    --output json)
  ROLE_ARN=$(json_field "${CREATE_RESULT}" "Role.Arn")
  echo "   ✓ Role created: ${ROLE_ARN}"
fi

# ─── Step 4: Put inline policy (idempotent) ─────────────────────────────────────
#
# Preferred: put-role-policy (inline, minimum-necessary).
# Fallback:  attach-role-policy with AmazonBedrockFullAccess (AWS managed) if
#            the caller lacks iam:PutRolePolicy — common for scoped automation users.
#            The fallback is broader than minimum-necessary; acceptable for sandbox.

echo ""
echo "▶  Step 4: Applying Bedrock permissions to role…"
if aws iam put-role-policy \
  --role-name "${ROLE_NAME}" \
  --policy-name "IntelliosBedrockMinPolicy" \
  --policy-document "${INLINE_POLICY}" \
  --output text 2>/dev/null; then
  echo "   ✓ Inline policy applied (minimum-necessary, idempotent)"
else
  echo "   ⚠  iam:PutRolePolicy denied — falling back to attach AmazonBedrockFullAccess (sandbox only)"
  aws iam attach-role-policy \
    --role-name "${ROLE_NAME}" \
    --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess
  echo "   ✓ AmazonBedrockFullAccess attached (broader than minimum-necessary — sandbox use only)"
  echo "   ℹ  For production: grant iam:PutRolePolicy and re-run to replace with the scoped inline policy"
fi

# ─── Step 5: Print ARN and write to .env.local ─────────────────────────────────

echo ""
echo "▶  Step 5: Writing role ARN to ${ENV_FILE}…"
echo ""
echo "   ROLE ARN: ${ROLE_ARN}"
echo ""

touch "${ENV_FILE}"

if grep -q "^${ENV_KEY}=" "${ENV_FILE}" 2>/dev/null; then
  # Replace in-place using Node (portable, no sed -i portability issues)
  node -e "
const fs = require('fs');
const content = fs.readFileSync('${ENV_FILE}', 'utf8');
const updated = content.replace(/^${ENV_KEY}=.*$/m, '${ENV_KEY}=${ROLE_ARN}');
fs.writeFileSync('${ENV_FILE}', updated);
"
  echo "   ✓ Replaced existing ${ENV_KEY} in ${ENV_FILE}"
else
  echo "${ENV_KEY}=${ROLE_ARN}" >> "${ENV_FILE}"
  echo "   ✓ Appended ${ENV_KEY} to ${ENV_FILE}"
fi

# ─── Step 6: Verification ──────────────────────────────────────────────────────

echo ""
echo "▶  Step 6: Verification block…"

echo ""
echo "  [6a] describe-role"
DESCRIBE_ROLE=$(aws iam get-role --role-name "${ROLE_NAME}" --output json)
echo "${DESCRIBE_ROLE}" | node -e "
const chunks = [];
process.stdin.on('data', d => chunks.push(d));
process.stdin.on('end', () => {
  const r = JSON.parse(chunks.join('')).Role;
  console.log('      RoleName: ' + r.RoleName);
  console.log('      RoleArn : ' + r.Arn);
  console.log('      Created : ' + r.CreateDate);
});
"

echo ""
echo "  [6b] simulate-principal-policy (bedrock:InvokeModel on demo model ARN)"
SIM_RESULT=$(aws iam simulate-principal-policy \
  --policy-source-arn "${ROLE_ARN}" \
  --action-names "bedrock:InvokeModel" \
  --resource-arns "${MODEL_ARN}" \
  --output json 2>&1) || SIM_RESULT='{"error":"simulate failed"}'
echo "${SIM_RESULT}" | node -e "
const chunks = [];
process.stdin.on('data', d => chunks.push(d));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(chunks.join(''));
    if (data.error) { console.log('      ⚠  ' + data.error + ' (IAM propagation may still be in progress)'); return; }
    const results = data.EvaluationResults || [];
    results.forEach(r => {
      const icon = r.EvalDecision === 'allowed' ? '✓' : '✗';
      console.log('      ' + icon + ' ' + r.EvalDecision.toUpperCase() + ' → ' + r.EvalResourceName);
    });
  } catch(e) { console.log('      (could not parse: ' + e.message + ')'); }
});
"

echo ""
echo "  [6c] list-foundation-models smoke call (bedrock API reachable)"
MODEL_COUNT=$(aws bedrock list-foundation-models \
  --region "${REGION}" \
  --query 'length(modelSummaries)' \
  --output text 2>&1) || {
  echo "   ✗  bedrock:ListFoundationModels failed — check Bedrock is enabled in ${REGION}"
  exit 1
}
echo "      ✓ Bedrock reachable — ${MODEL_COUNT} foundation models visible in ${REGION}"

# Grep for demo model to confirm it is listed
DEMO_IN_LIST=$(aws bedrock list-foundation-models \
  --region "${REGION}" \
  --output json 2>&1 | node -e "
const chunks = [];
process.stdin.on('data', d => chunks.push(d));
process.stdin.on('end', () => {
  const models = JSON.parse(chunks.join('')).modelSummaries || [];
  const match = models.find(m => m.modelId === '${DEMO_MODEL_ID}');
  if (match) {
    console.log('      ✓ Demo model confirmed: ' + match.modelId + ' | ' + match.modelName);
  } else {
    console.log('      ✗ Demo model NOT found in list: ${DEMO_MODEL_ID}');
  }
});
") || true
echo "${DEMO_IN_LIST}"

# ─── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Provisioning complete."
echo "  Role ARN : ${ROLE_ARN}"
echo "  Model ARN: ${MODEL_ARN}"
echo ""
echo "  Next steps:"
echo "    1. Run:  npm run db:migrate          (from src/ — apply any pending migrations)"
echo "    2. Run:  npx tsx scripts/seed-demo.ts  (seeds executionRoleArn into DB)"
echo "    3. Follow docs/demo/lifecycle-demo.md Stage 0 → Stage 8"
echo "═══════════════════════════════════════════════════════════"
echo ""
