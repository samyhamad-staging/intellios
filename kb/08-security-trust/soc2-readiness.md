---
id: 08-002
title: SOC 2 Readiness
slug: soc2-readiness
type: reference
audiences:
- compliance
- executive
status: published
created: &id001 2026-04-05
updated: *id001
tags:
- SOC 2
- audit
- compliance
- security
- availability
- confidentiality
- privacy
tldr: SOC 2 Type II compliance status and Trust Service Criteria mapping
---

# SOC 2 Readiness

Intellios is pursuing SOC 2 Type II certification to provide independent audit verification of our security, availability, processing integrity, confidentiality, and privacy controls.

---

## What is SOC 2?

**SOC 2** (Service Organization Control Framework) is an audit standard that evaluates a service provider's controls over five Trust Service Criteria:

1. **Security (CC):** Controls protecting assets and preventing unauthorized access
2. **Availability (A):** Controls ensuring systems are available for operation and use
3. **Processing Integrity (PI):** Controls ensuring complete, accurate, timely, and authorized processing
4. **Confidentiality (C):** Controls protecting confidential information
5. **Privacy (P):** Controls addressing the collection, use, retention, disclosure, and disposal of personal information

**SOC 2 Type II** involves a third-party auditor testing controls over a 6-12 month observation period. Once certified, Intellios provides a SOC 2 report to customers, demonstrating control effectiveness.

---

## Current Status

**SOC 2 Type II Audit:** In Progress (expected completion **May 2026**)

**Audit provider:** [PLACEHOLDER: Big Four accounting firm]

**Scope:** Intellios cloud platform (all deployment options: AWS, on-premises, Kubernetes)

---

## Trust Service Criteria Mapping

### CC (Security)

**Objective:** Prevent unauthorized access to system resources

**Intellios Controls:**

| Control | How Intellios Implements | Audit Evidence |
|---|---|---|
| **CC1 - Access Controls** | JWT tokens + OIDC integration; role-based access (Admin, Reviewer, Owner, Viewer); middleware enforces enterprise_id scoping | Access control matrix, RBAC test results, token validation logs |
| **CC2 - Boundaries** | VPC isolation (no public internet endpoints); ingress via load balancer with WAF | Network diagrams, WAF rules, security group configs |
| **CC3 - Identification** | Email + SSO authentication; multi-tenant isolation via enterprise_id | Auth logs, SSO integration test results |
| **CC4 - Logging** | Immutable audit log (every action logged with timestamp, actor, resource); 7-year retention | Audit log sample review, log integrity verification |
| **CC5 - Encryption** | AES-256 at rest (RDS, S3), TLS 1.2+ in transit, field-level encryption for sensitive data | Encryption config review, wireshark captures showing TLS |
| **CC6 - Cryptography** | AWS KMS for key management; no plaintext keys in code or logs | Key management policy review, secrets scanning test results |
| **CC7 - Monitoring** | CloudWatch alarms, intrusion detection, rate limiting | Alert configuration review, incident response procedures |

**Audit Status:** ✓ Controls documented, testing in progress (6/8 controls tested; 2 pending completion)

---

### A (Availability)

**Objective:** Ensure systems are available for operation and use as agreed

**Intellios Controls:**

| Control | How Intellios Implements | Audit Evidence |
|---|---|---|
| **A1 - Infrastructure** | RDS Multi-AZ (automatic failover), load balancer across AZs, health checks | Infrastructure diagrams, RDS failover test results |
| **A2 - Redundancy** | No single points of failure (API load balanced, DB multi-AZ, disaster recovery plan) | Architecture review, failover test logs |
| **A3 - Monitoring** | CloudWatch monitoring, alerts on latency/errors, paging on critical issues | Monitoring dashboard screenshots, alert config |
| **A4 - SLA/Uptime** | Target 99.9% uptime; SLA commitments to customers | Uptime tracking reports, SLA dashboard |

**Audit Status:** ✓ Controls in place; availability testing completed (99.92% uptime verified over test period)

---

### PI (Processing Integrity)

**Objective:** Ensure complete, accurate, timely, and authorized processing

**Intellios Controls:**

| Control | How Intellios Implements | Audit Evidence |
|---|---|---|
| **PI1 - Policies** | Governance policies codified (11 operators); execution deterministic | Policy documentation, operator execution tests |
| **PI2 - Completeness** | Agent blueprints validated before deployment; no incomplete deployments | Validation report samples, deployment logs |
| **PI3 - Accuracy** | Policy evaluation deterministic (same input → same output); cryptographic hashing of validation reports | Test cases (same blueprint, same policy → same result) |
| **PI4 - Timeliness** | Agents timestamped (created, validated, deployed); audit log ordered by timestamp | Audit log review (no temporal gaps/inconsistencies) |
| **PI5 - Authorization** | Role-based approval workflows; high-risk agents require explicit approvals | Review queue logs showing approvals |

**Audit Status:** ✓ Controls tested; processing integrity confirmed (deterministic evaluation verified)

---

### C (Confidentiality)

**Objective:** Protect confidential information (blueprints, policies, audit logs)

**Intellios Controls:**

| Control | How Intellios Implements | Audit Evidence |
|---|---|---|
| **C1 - Boundaries** | Multi-tenant isolation (enterprise_id scoping); tenant A cannot access tenant B | Access control tests (user from tenant A queries tenant B → 403 Forbidden) |
| **C2 - Data Classification** | Sensitive data marked (API keys, passwords, customer data); encryption applied | Data classification matrix review |
| **C3 - Encryption** | Field-level encryption for API keys, tokens, secrets | Database schema review, encryption key rotation procedures |
| **C4 - Retention** | Audit logs retained 7 years; customer can delete own agents (with audit trail) | Retention policy documentation, deletion logs |

**Audit Status:** ✓ Multi-tenancy isolation tested; confidentiality controls verified (no cross-tenant data leakage detected)

---

### P (Privacy)

**Objective:** Protect personal information (GDPR, CCPA, etc.)

**Intellios Controls:**

| Control | How Intellios Implements | Audit Evidence |
|---|---|---|
| **P1 - Collection** | Only collect necessary user data (email, name, role); GDPR Legitimate Interest documented | Privacy notice review, consent flows |
| **P2 - Use** | User data used only for authentication, authorization, audit; no selling/sharing | Data usage policy review, no third-party sharing contracts |
| **P3 - Retention** | Delete user data on account termination (except audit logs, retained per regulation) | User data retention schedule, deletion logs |
| **P4 - Disclosure** | No disclosure of user data without consent; DPA in place with processors | Data Processing Addendum (DPA) review |
| **P5 - Data Requests** | GDPR Right to Access: Users can download their data (export blueprint, audit logs) | Subject Access Request (SAR) procedure, test SAR completion |

**Audit Status:** ✓ Controls documented; GDPR compliance verified (SAR process tested)

---

## Customer Benefits of SOC 2 Type II

Once Intellios receives SOC 2 Type II certification:

1. **Reduced security reviews:** Customer organizations can rely on Intellios' SOC 2 report instead of conducting independent security audits
2. **Insurance requirements:** Many insurance policies require vendors to be SOC 2 certified
3. **Regulatory evidence:** Organizations can cite Intellios' SOC 2 report in their own compliance frameworks (SR 11-7, etc.)
4. **Vendor management:** Security/IT teams can require SOC 2 as vendor selection criteria (many do)

---

## Gaps Requiring Customer Controls

SOC 2 audits the service provider (Intellios). Customers are responsible for:

1. **Governance policy design:** Defining your organization's governance rules (Intellios enforces, you define)
2. **Access control:** Managing user roles in Intellios (Intellios provides RBAC; you assign roles)
3. **Data protection:** Protecting data at rest in your EHR, databases (Intellios protects in-flight and at rest for Intellios-managed data)
4. **Change management:** Approving policy changes, agent updates (Intellios enforces approval workflows; you decide approval logic)

---

## Audit Preparation

### For Intellios

**Remaining work (as of April 2026):**

- [ ] Complete testing of 2 pending controls (A3 Monitoring, PI2 Completeness)
- [ ] Draft SOC 2 report (auditor)
- [ ] Final review with audit firm
- [ ] Customer SOC 2 portal setup (to share report with customers)

**Expected completion:** May 30, 2026

### For Customers

**How to prepare for a regulator asking about vendor SOC 2:**

1. **Request SOC 2 report:** Ask your Intellios contact for the SOC 2 Type II report (once published)
2. **Review control evidence:** Focus on controls relevant to your use case (most banks care about Security, Availability, Processing Integrity; healthcare also cares about Privacy)
3. **Map to regulatory requirements:** Document how Intellios' controls satisfy your regulatory requirements (e.g., "SOC 2 Security controls (CC1-7) demonstrate Intellios meets SR 11-7 requirement for protected systems")
4. **Supplement with own controls:** SOC 2 covers Intellios; your organization covers:
   - Policy design (governance rules you write)
   - Access provisioning (role assignment)
   - Data protection outside Intellios (your EHR, database)

**Examiner conversation example:**

```
Examiner: "How do you ensure your AI governance vendor is secure?"

Response: "Intellios is SOC 2 Type II certified [show report].
Their controls address security, availability, processing integrity,
confidentiality, and privacy. We've also validated their multi-tenancy
isolation [point to access control test results]. We supplement by
implementing strong access controls on our side, and we conduct
quarterly security reviews."

Examiner: "That's comprehensive. What about their uptime?"

Response: "SOC 2 report shows 99.9% uptime target, and testing
validated 99.92% actual uptime during the audit period.
We have SLAs with Intellios requiring 4-hour response for P1 issues."
```

---

## Frequently Asked Questions

### Q: When will SOC 2 be available?

**A:** Expected May 30, 2026. We'll notify all customers immediately upon receipt.

---

### Q: Will Intellios be SOC 2 Type I instead of Type II?

**A:** No. Intellios is pursuing SOC 2 Type II, which includes 6-12 month observation period. Type II is more valuable (demonstrates controls are effective over time, not just at a point in time).

---

### Q: Do we need SOC 2 from Intellios?

**A:** Depends on your organization's requirements:

- **Banks/financial services:** Usually required (part of vendor management policy)
- **Insurance:** Typically required
- **Healthcare:** Often required (combined with HIPAA BAA)
- **Mid-market/smaller orgs:** Less critical (but increasingly requested by boards/insurers)

Ask your CISO or vendor management team.

---

### Q: What if we need SOC 2 before May 2026?

**A:** Contact Intellios sales. We may be able to provide:

1. **Interim SOC 2 audit** (limited scope, shorter timeline): 4-6 weeks
2. **Self-assessment:** Intellios' own control documentation (not third-party audit, but evidence available)
3. **Reference customers:** Talk to other organizations using Intellios (they can share their security assessment)

---

### Q: Do you offer HIPAA BAA (Business Associate Agreement)?

**A:** Yes. HIPAA BAA available for healthcare customers. BAA covers:

- Processor status (Intellios processes PHI on behalf of customer)
- Security controls (HIPAA Security Rule)
- Breach notification requirements
- Subcontracting (any subprocessors)

HIPAA BAA execution timeline: 2-4 weeks.

---

### Q: What about FedRAMP?

**A:** FedRAMP certification is roadmapped but not yet in progress. Timeline: 2027 H1 (provisional). For federal agencies, discuss interim solutions with sales.

---

## Related Resources

- [Penetration Testing Program](./penetration-testing-program.md) — How Intellios validates security through pen testing
- [Secret Management](./secret-management.md) — How Intellios manages API keys and credentials
- [FedRAMP Readiness](./fedramp-readiness.md) — Government compliance roadmap

---

## Support

**Questions about SOC 2 or security controls?**

- **Compliance team:** [PLACEHOLDER: compliance@intellios.com]
- **Sales (for SOC 2 report):** [PLACEHOLDER: sales@intellios.com]
- **Security team (for detailed control questions):** [PLACEHOLDER: security@intellios.com]

