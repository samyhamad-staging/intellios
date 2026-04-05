---
id: 10-006
title: Escalation Paths
slug: escalation-paths
type: reference
audiences:
- executive
- compliance
- engineering
- product
status: published
created: &id001 2026-04-05
updated: *id001
tags:
- support
- escalation
- SLA
- severity
- help
- contact
tldr: Support tier structure, SLAs, and when to escalate issues
---

# Escalation Paths

## Support Tiers

Intellios offers 4 support tiers, each with defined response and resolution times.

### Tier 1: Self-Service & Documentation

**Access:** All customers (included in all plans)

**How to get help:**
- Knowledge base articles (this site)
- FAQ pages (executive, compliance, engineering, product)
- Community forum [PLACEHOLDER: forum.intellios.com]
- GitHub issues (public; bugs/feature requests)
- Email support portal (self-serve ticket submission)

**Response time:** None (self-service; no guaranteed response from Intellios team)

**Resolution time:** Varies (depends on community engagement)

**Best for:** General questions, feature clarifications, known issues with published workarounds

**Example issues:** "How do I create a custom intake template?", "What's the API rate limit?", "Known issue with concurrent refinement—what's the workaround?"

---

### Tier 2: Support Ticket System

**Access:** All customers (response may vary by plan)

**How to get help:**
- Submit support ticket via email: [PLACEHOLDER: support@intellios.com]
- Include: description, steps to reproduce, environment details, logs
- Assigned to support engineer

**Response time:**
- **Starter plan:** 48 business hours
- **Growth plan:** 24 business hours
- **Enterprise plan:** 4 business hours

**Resolution time:**
- **P4 (Low):** 10 business days
- **P3 (Medium):** 5 business days
- **P2 (High):** 2 business days
- **P1 (Critical):** 4 hours (with 1-hour updates)

**Best for:** Bug reports, configuration issues, integration questions, edge cases

**Example issues:** "Agent validation timeout on 600KB blueprint", "Webhook not delivering after deployment", "RBAC not restricting access as expected"

**Escalation from Tier 2 → Tier 3:** If issue unresolved after 24 hours of investigation, support engineer escalates to engineering team.

---

### Tier 3: Dedicated Support Queue (Engineering Escalation)

**Access:** Growth plan and above

**How to get help:**
- Support engineer escalates; or
- Contact your CSM directly: [PLACEHOLDER: your.csm@intellios.com]
- CSM routes to engineering team

**Response time:**
- **Growth plan:** 2 business hours
- **Enterprise plan:** 1 hour

**Resolution time:**
- **P3 (Medium):** 3 business days
- **P2 (High):** 1 business day
- **P1 (Critical):** 2 hours (with 30-minute updates)

**Best for:** Production incidents, data integrity issues, urgent fixes, architectural guidance

**Example issues:** "Production deployment blocked by governance validator bug", "Data corruption in audit log", "Multi-tenant isolation breach detected"

**Who handles it:** Senior engineers, product leads, sometimes our founder/CTO for critical issues

---

### Tier 4: Dedicated CSM & Executive Escalation

**Access:** Enterprise plan customers only

**How to get help:**
- Contact your dedicated CSM
- CSM coordinates with engineering, product, and exec team
- Phone/video calls as needed
- Executive sponsor assigned for enterprise customers

**Response time:** 15 minutes (with executive sponsor on-call)

**Resolution time:**
- **P1 (Critical):** 1 hour (all hands available)
- **P2 (High):** 4 hours
- **P3 (Medium):** 1 business day

**Best for:** Strategic escalations, contract/SLA disputes, complex integrations, VIP customer issues

**Example issues:** "Our entire agent deployment pipeline is blocked", "Regulatory examiner is asking about governance audit trails—need documentation ASAP", "Multi-cloud integration not working across 3 environments"

**Who handles it:** CSM, VP of Product, VP of Engineering, Chief Compliance Officer (as needed)

---

## Severity Matrix

Use this matrix to determine which severity level applies to your issue.

| Severity | Definition | Examples | Response Time |
|----------|-----------|----------|---|
| **P1 Critical** | Production system down; unable to deploy or approve agents; data loss/corruption; security breach | Agent validation completely broken in production; audit logs are missing; multi-tenant data leak | 4 hours (Tier 3+) |
| **P2 High** | Feature broken but workaround exists; significant performance degradation; affects multiple teams | Concurrent refinement conflicts; webhook retries not working; governance validation timeout on large blueprints | 2 hours (Tier 3), 24h (Tier 2) |
| **P3 Medium** | Feature partially broken; affects workflow but not production; API issue with workaround | Template creation requires admin; specific role cannot access certain pages; rate limiting too aggressive | 24 hours (Tier 2), 2 hours (Tier 3) |
| **P4 Low** | Question/clarification; feature request; cosmetic bug | "How do I export agent blueprints to Git?", "Can we customize the dashboard colors?", "UI button is misaligned" | 48 hours (Tier 2) |

---

## What Information to Include in a Support Request

To get help faster, include:

### For all issues:
- **Summary:** One-sentence problem description
- **Severity:** P1/P2/P3/P4
- **Environment:**
  - Intellios version: `v1.2.0`
  - Deployment: AWS ECS / self-hosted Kubernetes / Docker Compose
  - Region: us-east-1
- **Contact info:** Your name, email, phone, team, company

### For bugs:
- **Steps to reproduce:** Numbered list
- **Expected behavior:** What should happen
- **Actual behavior:** What actually happens
- **Logs:** Error messages (from UI, API, database, application logs)
- **Attachments:** Screenshots, JSON blueprints, curl requests

### For integration issues:
- **Integration type:** Bedrock? Lambda? Custom runtime adapter?
- **Configuration:** API endpoint, authentication method
- **Error messages:** Full stack traces
- **Recent changes:** Did this work before? What changed?

### For performance issues:
- **Baseline metrics:** How many agents? How large?
- **Current performance:** How long does operation X take?
- **Expected performance:** How long should it take?
- **Load test results:** Any metrics from load testing tools (k6, JMeter)?

### For compliance/audit issues:
- **Regulatory context:** SR 11-7? OCC? HIPAA?
- **Requirement:** What policy/standard requires this?
- **Evidence:** What documentation do you need?
- **Timeline:** When is this needed (exam date, deployment deadline)?

---

## When to Escalate

### Escalate immediately (P1) if:
- Production agents cannot be deployed
- Audit logs are missing or corrupted
- Security vulnerability discovered (security breach)
- Regulatory examiner on-site and needs documentation NOW

**Action:** Call your CSM or use emergency escalation number [PLACEHOLDER: +1-415-XXX-XXXX].

### Escalate after 24 hours (P2) if:
- Issue affects multiple teams and has no workaround
- Blocker for critical deadline (regulatory submission, major deployment)
- Engineering team cannot diagnose root cause

**Action:** Email support@intellios.com with subject `[ESCALATION] <Issue Name>` and include all severity justification.

### Escalate for strategy (non-urgent) if:
- Evaluating Intellios fit for your organization
- Planning multi-year governance strategy
- Designing custom integration (runtime adapter, webhook, policy operator)
- Preparing for regulatory examination

**Action:** Schedule a consultation with your CSM (email [PLACEHOLDER: sales@intellios.com] to connect if you don't have one).

---

## Support Channel Preferences

| Channel | Best For | Response Time |
|---------|----------|---|
| **Email (support@intellios.com)** | Bug reports, feature requests, general questions | 24-48 hours (Tier 2) |
| **Slack (Enterprise)** | Quick questions, real-time collaboration, urgent issues | 15 minutes (if monitoring enabled) |
| **Phone (Enterprise)** | Critical issues, complex troubleshooting, executive escalation | 4 hours (P1) |
| **GitHub Issues (Public)** | Feature requests, public bugs, community discussion | 1-2 weeks (community-driven) |
| **CSM (Enterprise)** | Strategic questions, integrations, account management | 1-2 hours |

---

## SLA Compliance & Credits

Intellios tracks SLA compliance per customer. If we miss an SLA:

- **Response time miss:** 10% service credit
- **Resolution time miss:** 20% service credit
- **Multiple misses in month:** Up to 50% monthly credit

**How to request credit:**
1. Document the SLA miss (include ticket numbers, timestamps)
2. Email [PLACEHOLDER: billing@intellios.com] with details
3. Intellios Finance reviews and applies credit automatically

**Note:** Credits applied to next month's invoice; unused credits expire after 6 months.

---

## Support Availability

**Business hours:** Monday–Friday, 9 AM–6 PM PT (except US federal holidays)

**On-call rotation (Enterprise customers):** 24/7 escalation available; on-call engineer responds within 1 hour for P1 issues

**Expected downtime:** We target 99.9% uptime. Planned maintenance windows announced 2 weeks in advance; scheduled for low-traffic periods (weekends, late evening PT).

---

## Contact Directory

| Team | Email | Phone | Use Case |
|------|-------|-------|----------|
| **Support** | support@intellios.com | [PLACEHOLDER] | Bug reports, Tier 2/3 escalation |
| **Sales/CSM** | sales@intellios.com | [PLACEHOLDER] | Account management, strategic planning |
| **Compliance** | compliance@intellios.com | [PLACEHOLDER] | Audit, SOC 2, FedRAMP questions |
| **Engineering** | engineering@intellios.com | [PLACEHOLDER] | Technical architecture, integration help |
| **Finance/Billing** | billing@intellios.com | [PLACEHOLDER] | Invoices, pricing questions |
| **Emergency** | [PLACEHOLDER: on-call number] | [PLACEHOLDER] | P1 critical issues, 24/7 escalation |

---

## Feedback & Continuous Improvement

We value your feedback. Share:
- **Product suggestions:** What features would help you?
- **Documentation gaps:** Where were you stuck?
- **Support experience:** How was your experience? (NPS survey sent quarterly)

**Channel:** Email [PLACEHOLDER: product@intellios.com] with title `[Feedback]` or respond to NPS surveys.
