# Intellios Demo Deployment Guide

Complete setup for a publicly accessible Intellios demo instance with AgentCore (Amazon Bedrock) integration.

**Stack:** Vercel (hosting) · Vercel Postgres (database) · AWS Bedrock (AgentCore)

---

## Overview

| Step | Where | Time |
|---|---|---|
| 1. AWS — IAM credentials for Intellios | AWS Console | 5 min |
| 2. AWS — IAM role for Bedrock agents | AWS Console | 5 min |
| 3. AWS — Enable Bedrock model access | AWS Console | 2 min |
| 4. Vercel — Create project + Postgres | Vercel | 5 min |
| 5. Vercel — Set environment variables | Vercel | 5 min |
| 6. Vercel — Deploy | Vercel | 3 min |
| 7. Database — Run migrations + seed | Terminal | 2 min |
| 8. Intellios — Configure AgentCore | Browser | 2 min |

---

## Step 1 — AWS IAM Credentials for Intellios

Intellios needs AWS credentials to call the Bedrock API when deploying agents.

1. Go to **AWS Console → IAM → Users → Create user**
2. Name: `intellios-bedrock`
3. Attach permissions: select **Attach policies directly** → Create inline policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": [
         "bedrock:CreateAgent",
         "bedrock:CreateAgentActionGroup",
         "bedrock:PrepareAgent",
         "bedrock:GetAgent",
         "bedrock:DeleteAgent",
         "bedrock:InvokeAgent"
       ],
       "Resource": "*"
     }]
   }
   ```
4. After creating the user, go to **Security credentials → Create access key**
5. Select **Application running outside AWS** → create
6. **Save the Access Key ID and Secret Access Key** — you'll need them in Step 5

---

## Step 2 — AWS IAM Role for Bedrock Agent Execution

Amazon Bedrock needs a role to assume when running agents on its behalf.

1. Go to **AWS Console → IAM → Roles → Create role**
2. **Trusted entity type:** AWS service
3. **Use case:** Scroll down → select **Bedrock** → **Bedrock - Agent**
   - If not listed, choose custom trust policy:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [{
         "Effect": "Allow",
         "Principal": { "Service": "bedrock.amazonaws.com" },
         "Action": "sts:AssumeRole"
       }]
     }
     ```
4. **Add permissions:** attach `AmazonBedrockFullAccess` (or a scoped policy allowing `bedrock:InvokeModel`)
5. **Role name:** `AmazonBedrockExecutionRoleForAgents_Intellios`
6. Create role. Open it and **copy the Role ARN** — it looks like:
   ```
   arn:aws:iam::123456789012:role/AmazonBedrockExecutionRoleForAgents_Intellios
   ```
   You'll need this in Step 8.

---

## Step 3 — AWS Bedrock Model Access

1. Go to **AWS Console → Amazon Bedrock → Model access** (left sidebar)
2. Click **Modify model access**
3. Find **Anthropic → Claude 3.5 Sonnet v2** and check the box
4. Submit request — approval is usually instant
5. **Note the region you're in** (e.g. `us-east-1`) — Bedrock is region-specific; use the same region throughout

> To use a different model: any Anthropic model available in your region works. You'll specify it in Step 8.

---

## Step 4 — Vercel: Create Project + Postgres

### 4a. Connect the repository

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import from GitHub: select `samyhamad-staging/intellios`
3. **Root directory:** `src` (the Next.js app is in the `src/` subfolder — this is critical)
4. Framework: Next.js (auto-detected)
5. Do **not** deploy yet — continue to Step 5 first

### 4b. Add Vercel Postgres

1. In your Vercel project dashboard, go to **Storage → Create Database**
2. Select **Postgres** → **Create New**
3. Name: `intellios-demo` · Region: match your AWS region if possible
4. After creation, click **Connect to Project** → select your Intellios project
5. Vercel will automatically add `POSTGRES_URL` and related variables to your project environment — you don't need to copy these manually

---

## Step 5 — Vercel: Set Environment Variables

In your Vercel project → **Settings → Environment Variables**, add the following.

**Required:**

| Variable | Value |
|---|---|
| `DATABASE_URL` | Copy from **Storage → your database → .env.local** tab — use the `POSTGRES_URL_NON_POOLING` value |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (starts with `sk-ant-`) |
| `AUTH_SECRET` | Run `openssl rand -base64 32` in your terminal and paste the result |
| `AWS_ACCESS_KEY_ID` | From Step 1 |
| `AWS_SECRET_ACCESS_KEY` | From Step 1 |
| `AWS_DEFAULT_REGION` | e.g. `us-east-1` (same region where you enabled Bedrock in Step 3) |

**Optional (email notifications):**

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | From [resend.com](https://resend.com) — needed to send password reset + review reminder emails |
| `NOTIFICATION_FROM_EMAIL` | `notifications@yourdomain.com` (must be a verified Resend sender) |
| `NOTIFICATION_APP_URL` | Your Vercel URL, e.g. `https://intellios-demo.vercel.app` |

**Optional (cron security — recommended):**

| Variable | Value |
|---|---|
| `CRON_SECRET` | Run `openssl rand -hex 32` and paste the result |

> Set all variables for **Production**, **Preview**, and **Development** environments.

---

## Step 6 — Vercel: Deploy

1. Go to your Vercel project → **Deployments → Redeploy** (or trigger a new deployment from the GitHub push)
2. Watch the build log — it should complete in ~2 minutes
3. If it fails, check the build log for missing env vars or TypeScript errors

The deployed URL will be something like `https://intellios-[hash].vercel.app`.

---

## Step 7 — Database: Run Migrations + Seed

Run these commands from your local machine using the production `DATABASE_URL`.

```bash
cd src

# Set the production database URL
export DATABASE_URL="<paste POSTGRES_URL_NON_POOLING from Vercel Storage>"

# Apply all schema migrations
npx tsx lib/db/run-migrations.ts

# Create the 4 demo users
npx tsx lib/db/seed-users.ts

# Load demo data (sample agents, blueprints, governance policies)
npx tsx lib/db/seed-demo.ts
```

This creates:
- **4 demo accounts** (see login page for credentials)
- **Acme Financial** enterprise with governance policies
- **5 sample agents** across various lifecycle stages (Draft, In Review, Approved, Deployed, Deprecated)
- Sample intake sessions, audit log entries, webhooks

---

## Step 8 — Intellios: Configure AgentCore

1. Open your deployed app and log in as `admin@intellios.dev` / `Admin1234!`
2. Navigate to **Admin → Settings → Deployment Targets**
3. Toggle **Enable AgentCore** on
4. Fill in:
   - **AWS Region:** e.g. `us-east-1`
   - **Agent Resource Role ARN:** the role ARN from Step 2
   - **Foundation Model:** `anthropic.claude-3-5-sonnet-20241022-v2:0`
5. Click **Save**

The demo is now ready. Log in as `designer@intellios.dev` / `Designer1234!` to walk through the full flow.

---

## Demo Flow

The full experience for a remote user:

1. **Login** as `designer@intellios.dev` / `Designer1234!`
2. **Overview** → see the dashboard with existing agents
3. **Intake** → Design a New Agent → submit context form → watch it classify automatically
4. **Chat** with the governance intake agent to specify the agent
5. **Generate Blueprint** → review the generated ABP
6. **Registry** → browse existing approved agents
7. **Deploy** (as `reviewer@intellios.dev`) → deploy an approved agent to AgentCore
8. **Monitor** → check live Bedrock status
9. **Compliance** → see posture dashboard and MRM reports

---

## Troubleshooting

| Issue | Likely cause | Fix |
|---|---|---|
| Build fails: `Missing DATABASE_URL` | Env var not set in Vercel | Check Settings → Environment Variables |
| Build fails: `Cannot find module` | Root directory not set to `src/` | Vercel project settings → Root Directory = `src` |
| Login fails | Users not seeded | Run Step 7 commands |
| AgentCore deploy fails: permission denied | IAM policy missing from Step 1 | Verify the `intellios-bedrock` user has the inline policy |
| AgentCore deploy fails: model not found | Model access not approved | Check AWS Bedrock → Model access |
| Emails not sent | Resend not configured | Set `RESEND_API_KEY` + `NOTIFICATION_FROM_EMAIL` |

For detailed AgentCore troubleshooting, see [agentcore-setup.md](./agentcore-setup.md).
