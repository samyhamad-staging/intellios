---
id: 08-003
title: FedRAMP Readiness
slug: fedramp-readiness
type: reference
audiences:
- compliance
- executive
- engineering
status: published
created: &id001 2026-04-05
updated: *id001
tags:
- FedRAMP
- federal
- NIST 800-53
- moderate
- authorization
- ATO
tldr: Federal compliance roadmap and current NIST 800-53 control status
---

# FedRAMP Readiness

This document outlines Intellios' roadmap to FedRAMP authorization and current control coverage for federal government use.

---

## What is FedRAMP?

**FedRAMP** (Federal Risk and Authorization Management Program) is a US government-wide program that provides a standardized approach for security assessment, authorization, and continuous monitoring of cloud services.

**FedRAMP authorizations:**

- **Low:** Systems handling non-sensitive federal data (advisory information)
- **Moderate:** Systems handling sensitive federal data (personal information, financial data)
- **High:** Systems handling highly classified information (restricted to specific agencies)

**Most government agencies require Moderate baseline for AI systems.**

---

## NIST 800-53 Control Families

FedRAMP baseline controls are derived from NIST SP 800-53 (Security and Privacy Controls for Federal Information Systems).

**Control families:** 14 major families (AC, AT, AU, CA, CM, CP, IA, IR, MA, MP, PE, PL, PS, SC, SI)

**Example controls:**

```
AC-2 (Access Control - Account Management)
  - Create, enable, disable, remove user accounts
  - Enforce least privilege
  - Group/role-based access

AU-2 (Audit and Accountability - Audit Events)
  - Determine which events to audit
  - Define audit processing
  - Protect audit logs

CM-3 (Configuration Management - Access Restrictions for Change)
  - Review and approve proposed system changes
  - Implement approved changes
  - Document configuration changes
```

---

## Intellios Control Coverage

### Current Status (April 2026)

**Informal Assessment:** Intellios meets **NIST 800-53 Moderate baseline** for 80% of required controls.

**Control family breakdown:**

| Family | Abbr | Total Controls | Implemented | Gap | Status |
|---|---|---|---|---|---|
| **Access Control** | AC | 22 | 18 | 4 | 82% ✓ |
| **Audit & Accountability** | AU | 12 | 12 | 0 | 100% ✓ |
| **Identification & Authentication** | IA | 10 | 8 | 2 | 80% ✓ |
| **Incident Response** | IR | 8 | 6 | 2 | 75% ⚠ |
| **System & Communications Protection** | SC | 15 | 14 | 1 | 93% ✓ |
| **Configuration Management** | CM | 9 | 7 | 2 | 78% ⚠ |
| **Planning** | PL | 11 | 9 | 2 | 82% ✓ |
| **System & Services Acquisition** | SA | 16 | 14 | 2 | 88% ✓ |

**Overall coverage:** 88 of 103 controls = **85% implemented**

**Gaps (remaining 15 controls):**
- Physical & Environmental Protection (PE): Not applicable (cloud-native; AWS responsible)
- Personnel Security (PS): Customer organization responsible
- Media Protection (MP): AWS RDS handles; Intellios transparent
- Maintenance (MA): AWS/customer responsible
- System Development Lifecycle (SD): Gap (no SDLC documentation per NIST 800-53 SA-3)

---

## Roadmap to FedRAMP Authorization

### Phase 1: Gap Closure (Q2-Q3 2026)

**Activities:**
- Document remaining 15 controls (write policies, procedures)
- Implement missing technical controls (e.g., automated configuration scanning)
- Conduct internal assessment against NIST 800-53 Moderate baseline
- Achieve 100% control coverage (including documented workarounds for AWS-owned controls)

**Effort:** 2-3 months (Intellios + external consultant)

**Outcome:** Ready for 3PAO (Third Party Assessor Organization) assessment

---

### Phase 2: 3PAO Assessment (Q4 2026 – Q1 2027)

**Activities:**
- Select FedRAMP-accredited 3PAO
- 3PAO conducts formal NIST 800-53 assessment (test controls, review evidence)
- Intellios prepares Security Assessment Report (SAR)
- Remediate any findings during assessment

**Effort:** 4-6 months

**Outcome:** Completed SAR ready for FEDRAMP PMO review

---

### Phase 3: FEDRAMP PMO Review & ATO (Q2-Q3 2027)

**Activities:**
- FEDRAMP PMO reviews SAR
- Intellios addresses PMO questions (30-day review + revision cycle)
- Authorization Letter issued (ATO)
- Intellios added to FEDRAMP Marketplace

**Effort:** 2-3 months

**Outcome:** FedRAMP ATO (Moderate baseline)

---

## Current Intellios Strengths (FedRAMP Perspective)

**What Intellios already does well:**

1. **Immutable audit logging (AU family):** Complete audit trail with cryptographic integrity
2. **Encryption (SC family):** TLS in transit, AES-256 at rest
3. **Multi-tenancy isolation (AC family):** enterprise_id scoping prevents cross-tenant access
4. **Access control (IA family):** JWT + OIDC, RBAC roles, MFA ready (not yet required, but architecture supports)
5. **Change management (CM family):** Agents versioned, policies versioned, deployments audited

---

## Current Intellios Gaps (FedRAMP Perspective)

**What needs work for formal ATO:**

1. **Configuration Management (CM-3):** Need documented change approval process for production changes
2. **Incident Response (IR):** Need formalized incident response plan, procedures for federal incidents
3. **System Development Lifecycle (SA-3):** NIST requires documented SDLC; Intellios uses agile (need to map to NIST expectations)
4. **Continuity of Operations (CP):** Need disaster recovery plan with tested RTO/RPO targets
5. **Security Assessment & Authorization (CA-2):** Need periodic security assessment (yearly vs. current ad-hoc)

**None are blockers; all addressable in 2-3 months.**

---

## Deployment Considerations for Federal Use

### AWS GovCloud Requirements

Intellios deployed on AWS (primary region: us-east-1). For federal use, customer may require:

- **GovCloud deployment:** [PLACEHOLDER: AWS GovCloud support not yet available; planned Q3 2026]
- **Data residency:** Federal data must stay in US (Intellios supports us-east-1, us-west-2 with no cross-region replication)
- **Isolated AWS account:** Dedicated federal customer account (no sharing with commercial customers)

**Current federal deployment options:**

1. **Commercial AWS (pre-ATO):** Interim solution for non-classified systems
2. **GovCloud (post-ATO):** Full federal compliance after FedRAMP ATO

---

## Control Examples: How Intellios Demonstrates NIST 800-53 Compliance

### Example 1: AC-3 (Access Control - Enforcement)

**NIST Requirement:** "The organization enforces authorized access to information and system resources..."

**How Intellios satisfies:**

```
Middleware enforces enterprise_id scoping:

  1. User logs in (JWT token includes enterprise_id)
  2. Every API request middleware checks: Is enterprise_id in token?
  3. Every database query includes: WHERE enterprise_id = $1
  4. Result: User from Tenant A cannot access Tenant B data

Evidence:
  - Middleware code review (access control implementation)
  - Test results: Cross-tenant access attempts return 403 Forbidden
  - Audit logs: Show all access attempts, successes, failures
```

---

### Example 2: AU-12 (Audit and Accountability - Audit Generation)

**NIST Requirement:** "The organization provides a system capability to centralize the collection and analysis of audit events..."

**How Intellios satisfies:**

```
Centralized audit log:

  1. Every action logged (agent creation, deployment, policy change, user access)
  2. Logs stored in immutable PostgreSQL table
  3. Cryptographic chaining: Each log entry includes hash of previous entry
  4. 7-year retention policy enforced
  5. Export capability: Generate audit reports for any time period

Evidence:
  - Audit log schema (table definition, retention rules)
  - Sample audit logs (50+ entries showing various events)
  - Integrity verification: Recomputed hashes match stored hashes (no tampering)
  - Export test: Generated audit report covering 1-year period
```

---

### Example 3: SC-7 (System & Communications Protection - Boundary Protection)

**NIST Requirement:** "The organization monitors and controls communications at external boundaries and key internal boundaries..."

**How Intellios satisfies:**

```
VPC isolation:

  1. Intellios deployed in private subnets (no direct internet access)
  2. Ingress through ALB (Application Load Balancer) with WAF
  3. WAF rules block common attacks (SQL injection, XSS, DDoS)
  4. All traffic TLS 1.2+ (enforced)
  5. Egress restricted (only to approved services: RDS, S3, CloudWatch, LLM APIs)

Evidence:
  - VPC diagram (security groups, subnets, routing)
  - WAF rules (show attack pattern blocking)
  - TLS enforcement test (curl without TLS → rejected)
  - Egress restrictions (firewall rules)
```

---

## Timeline & Milestones

```
2026:
  Q1 (Jan-Mar):   Informal assessment complete; gaps identified
  Q2 (Apr-Jun):   Gap closure; internal assessment; 3PAO selection
  Q3 (Jul-Sep):   3PAO assessment underway
  Q4 (Oct-Dec):   SAR finalization

2027:
  Q1 (Jan-Mar):   FEDRAMP PMO review; remediation
  Q2-Q3 (Apr-Sep): ATO issued
```

**Expected FedRAMP ATO date: July 2027** (provisional)

---

## What Federal Customers Should Know

### Before FedRAMP ATO (Now)

If a federal agency wants to use Intellios before FedRAMP ATO:

**Option 1: Interim Authority to Operate (IATO)**
- Customer organization conducts own NIST assessment
- Customer grants IATO based on assessment
- Intellios must comply with customer's security requirements

**Option 2: Provisional Authorization**
- Customer treats Intellios as "pre-FedRAMP" service
- Enhanced monitoring & audit required
- Smaller scope (fewer agents, lower-risk use cases)

**Timeline for interim approval:** 4-8 weeks (customer-dependent)

---

### After FedRAMP ATO (2027 H2)

Once Intellios receives FedRAMP ATO:

- **Reciprocal acceptance:** Any federal agency can use Intellios without additional ATO process
- **Streamlined procurement:** No security assessment required (FedRAMP inherent acceptance)
- **Compliance documentation:** Intellios' SAR serves as compliance evidence

---

## Support for Federal Compliance

**Questions about FedRAMP, NIST 800-53, or federal deployment?**

- **Federal sales team:** [PLACEHOLDER: federal@intellios.com]
- **Compliance team:** [PLACEHOLDER: compliance@intellios.com]
- **Security assessment:** [PLACEHOLDER: security@intellios.com]

---

## Related Documents

- [SOC 2 Readiness](./soc2-readiness.md) — Commercial compliance status
- [Penetration Testing Program](./penetration-testing-program.md) — Security validation approach
- [Secret Management](./secret-management.md) — Secrets management per 800-53 requirements

