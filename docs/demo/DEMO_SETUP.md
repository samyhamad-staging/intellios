# Intellios — Demo Setup Guide

**Audience:** Anyone running a live showcase of Intellios
**Time to set up:** ~10 minutes (after DB and API key are in place)

---

## Prerequisites

| Requirement | Notes |
|---|---|
| PostgreSQL | Running and accessible. Local or hosted (Supabase, Neon, Railway, etc.) |
| Anthropic API key | Claude Sonnet + Haiku access required |
| Node.js 20+ | For running the seed scripts |

---

## Step 1 — Environment Variables

Create `src/.env.local` with:

```bash
DATABASE_URL=postgresql://user:password@host:5432/intellios

ANTHROPIC_API_KEY=sk-ant-...

AUTH_SECRET=<generate with: openssl rand -base64 32>

# Optional — only needed for AgentCore direct deploy (skippable for demo)
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
# AWS_REGION=us-east-1
```

---

## Step 2 — Database Setup

```bash
cd src

# Install dependencies
npm install

# Apply all migrations (creates all tables)
npm run db:push

# Seed demo users (admin, designer, reviewer, compliance officer)
npx tsx lib/db/seed-users.ts

# Seed the Acme Financial demo scenario (5 agents, policies, audit trail, briefing)
npx tsx lib/db/seed-demo.ts
```

Expected output from `seed-demo.ts`:
```
🌱  Seeding Acme Financial Services demo data…

Step 1/11 — Tagging users to acme-financial
  set   admin@intellios.dev → acme-financial
  ...
✅  Demo seed complete!
```

---

## Step 3 — Start the Application

```bash
npm run dev
```

Navigate to `http://localhost:3000`. You should be redirected to `/login`.

---

## Demo Credentials

| Role | Email | Password | What they see |
|---|---|---|---|
| Designer | `designer@intellios.dev` | `Designer1234!` | Intake, Pipeline, Registry, Blueprint Workbench |
| Reviewer | `reviewer@intellios.dev` | `Reviewer1234!` | Review Queue, Deploy Console, Registry |
| Compliance Officer | `officer@intellios.dev` | `Officer1234!` | Governance Hub, Compliance, Audit Trail, Monitor |
| Admin | `admin@intellios.dev` | `Admin1234!` | Everything + Settings, Users, Webhooks |

---

## What the Demo Data Contains

After seeding, the system contains **5 agents** from "Acme Financial Services" at every lifecycle stage:

| Agent | Status | Key Demo Point |
|---|---|---|
| **Customer Inquiry Bot** | `deployed` (AgentCore) | Full lifecycle complete — audit trail, MRM report, test results, governance health = clean |
| **Fraud Detection Advisor** | `in_review` (Step 2/3) | Multi-step approval in progress — awaiting Compliance Officer sign-off |
| **Loan Application Assistant** | `approved` | Ready to deploy — shows Deploy Console workflow |
| **Data Privacy Compliance Agent** | `draft` (blocked) | 2 error violations blocking submission — shows governance gate |
| **HR Onboarding Guide** | `deprecated` | Full lifecycle completed — end-to-end story |

**Also seeded:**
- 3 enterprise governance policies (Financial Services Safety Baseline, SR 11-7 Model Documentation, Customer Data Handling)
- Complete 8-event audit trail for the Customer Inquiry Bot
- 2 behavioral test cases + 1 passing test run
- Blueprint quality scores for all 5 agents (ranging from 31 to 88)
- 3 system health snapshots (5 days of trend data)
- 1 pre-generated intelligence briefing with 5 structured sections

---

## Recommended Demo Flow (~12 minutes)

### Stop 1 — Home Screen (1 min)
Sign in as `designer@intellios.dev`. Show the role-differentiated home screen with the designer's active agents and the New Agent CTA.

### Stop 2 — Pipeline Board (1 min)
Navigate to `/pipeline`. Show all 5 lifecycle columns populated. Highlight the Data Privacy Agent's draft state with violation badges. Show SLA ring on the Fraud Detection Advisor.

### Stop 3 — Blueprint Workbench (2 min)
Click the Data Privacy Compliance Agent → "Open in Studio". Show the 3-column layout. Point out the 2 error violations in the right panel blocking submission. Click Re-validate to show the live governance engine. Explain what the designer needs to fix.

### Stop 4 — Deployed Agent — Full Story (2 min)
Still signed in as `designer@intellios.dev`. Navigate to Registry → Customer Inquiry Bot. Walk through the tabs:
- **Blueprint** — the complete 7-section agent spec
- **Governance** — passes all 3 policies, zero violations
- **Versions** — version history
Then click **"View MRM Report"** (visible to all roles) to show the 13-section compliance evidence document. Point out the approval chain, SOD evidence, and Regulatory Framework Assessment.

### Stop 5 — Review Queue — Multi-Step Approval (2 min)
Sign in as `officer@intellios.dev`. Navigate to `/review`. Show the Fraud Detection Advisor at Step 2/3. Open the review panel — show the prior approval from the Senior Reviewer. Show the AI Risk Brief generation (triggers a Claude call). Submit a Compliance Officer approval — a green "Approval submitted — advancing to Final Sign-off" confirmation appears, then the item clears from the queue.

### Stop 6 — Governance Hub (1.5 min)
Navigate to `/governance`. Show the policy library with 3 policies. Click **"Preview Impact"** directly on the SR 11-7 policy card to show the inline simulation (no navigation required — results appear below the card). Show the governance analytics section.

### Stop 7 — Compliance Command Center (1 min)
Navigate to `/compliance`. Show the 5-section posture overview: deployed agent clean, 1 in review, policy coverage, 30-day trends.

### Stop 8 — Deploy Console (1 min)
Sign in as `reviewer@intellios.dev`. Navigate to `/deploy`. Show the Loan Application Assistant in the Ready to Deploy queue. Open the deploy confirmation modal — show the change reference requirement and authorization checkbox. (You can cancel without deploying.)

### Stop 9 — Intelligence Briefing (0.5 min)
Click **Monitor** in the sidebar → then **"Intelligence →"** on the Monitor page. Show the pre-generated briefing with 5 structured sections, QI trend chart, and anomaly signal for the Data Privacy Agent.

---

## Troubleshooting

**"No agents appear" after seeding**
→ Users may not be tagged to the enterprise. Check that seed-users.ts ran before seed-demo.ts, and that seed-demo.ts completed Step 1 successfully.

**Login fails**
→ Run `seed-users.ts` if not already done. Verify `AUTH_SECRET` is set in `.env.local`.

**Blueprint generation fails**
→ Verify `ANTHROPIC_API_KEY` is valid and has Claude Sonnet access. Test with: `curl https://api.anthropic.com/v1/models -H "x-api-key: $ANTHROPIC_API_KEY"`

**AgentCore deploy fails**
→ Skip the direct deploy path during demos if AWS credentials aren't configured. Use the Export manifest path instead (downloads JSON without AWS). The demo data already has a pre-deployed AgentCore agent to show — no live deploy needed.

**Re-seeding (if something looks wrong)**
→ The seed script is idempotent and skips existing rows. To fully reset, drop and recreate the database, then re-run both seed scripts.

---

## What NOT to Demo Live

| Feature | Why to skip | Alternative |
|---|---|---|
| AgentCore direct deploy | Requires live AWS credentials + 90s wait | Show the pre-deployed Customer Inquiry Bot in the registry instead |
| Intake chat from scratch | Claude generation takes 10–30s | Pre-seed intake session, or show the completed Phase 3 review screen |
| Daily briefing generation | 20–30s Sonnet call | Pre-seeded briefing already appears on the Intelligence page |
