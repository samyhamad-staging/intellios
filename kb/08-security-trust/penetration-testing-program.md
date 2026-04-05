---
id: 08-006
title: Penetration Testing Program
slug: penetration-testing-program
type: reference
audiences:
- compliance
- executive
status: published
created: &id001 2026-04-05
updated: *id001
tags:
- penetration testing
- security testing
- vulnerability
- pen test
- assessment
- remediation
tldr: Security validation through regular penetration testing and vulnerability assessments
---

# Penetration Testing Program

Intellios conducts regular penetration testing and vulnerability assessments to validate security controls and identify risks.

---

## Program Overview

**Frequency:** Annual + after major releases

**Scope:** Full Intellios platform (API, UI, database, infrastructure)

**Methodology:** OWASP Testing Guide + NIST SP 800-115

**Test types:**
- Vulnerability scanning (automated)
- Manual penetration testing (human-performed)
- Source code security review
- Infrastructure security assessment
- Social engineering (optional, with consent)

---

## Testing Schedule

### Annual Penetration Test

**Timing:** Q2 each year (post-release window)

**Scope:** Comprehensive security assessment of latest release

**Duration:** 4-6 weeks

**Deliverable:** Penetration Test Report with findings, severity ratings, remediation recommendations

### Post-Release Testing

**Trigger:** Major feature release (v1.2.0, v2.0.0, etc.)

**Timing:** Within 2 weeks of release

**Scope:** New features + integration points

**Duration:** 2-3 weeks

### Vulnerability Scanning

**Frequency:** Monthly (automated)

**Scope:** Infrastructure, dependencies, configuration drift

**Tools:** Trivy, Snyk, AWS Inspector

**Report:** Email summary of any findings

---

## Penetration Testing Scope

### In Scope

- **API endpoints:** `/api/intake/*`, `/api/blueprints/*`, `/api/governance/*`, `/api/registry/*`, `/api/review/*`
- **Web UI:** Intake forms, Blueprint Studio, Registry, Review Queue, Dashboards
- **Database:** PostgreSQL access controls, data isolation, injection vulnerabilities
- **Infrastructure:** VPC, security groups, WAF, load balancer, SSL/TLS configuration
- **Authentication & Authorization:** JWT validation, OIDC integration, RBAC enforcement
- **Secrets management:** AWS Secrets Manager access, credential exposure risk

### Out of Scope

- **Third-party services:** AWS, Anthropic API, Bedrock (responsibility of those services)
- **Customer infrastructure:** Customer's data sources, deployment targets
- **Social engineering (default):** Requires explicit opt-in

---

## Testing Methodology

### Phase 1: Reconnaissance (1 week)

**Activities:**
- Enumerate endpoints (API routes, UI pages, configuration files)
- Identify technologies (frameworks, databases, libraries)
- Map data flows (how data flows through system)
- Document architecture (infrastructure diagram, deployment topology)

**Tools:** Burp Suite, OWASP ZAP, nmap, curl, browser developer tools

**Deliverable:** Reconnaissance report

---

### Phase 2: Vulnerability Identification (2-3 weeks)

**Activities:**
- Automated scanning (OWASP ZAP, Trivy) for known vulnerabilities
- Manual testing (business logic flaws, edge cases, auth bypasses)
- Source code review (static analysis for security issues)
- Configuration review (hardening checks, default credentials)

**Common test cases:**

```
1. Authentication
   - Brute force password login
   - JWT token manipulation (expiration, signature, payload)
   - OIDC bypass (redirect manipulation)
   - Session hijacking (token reuse)

2. Authorization
   - Privilege escalation (user → admin)
   - Multi-tenancy bypass (access another tenant's data)
   - Parameter tampering (enterprise_id manipulation)

3. Data validation
   - SQL injection (payload in agent name, policy definition)
   - Command injection (shell commands in inputs)
   - Path traversal (access files outside intended directory)
   - XXE (XML External Entity attacks)

4. API Security
   - Rate limiting bypass (exceed limits without throttling)
   - API key exposure (secrets in logs, error messages)
   - CORS misconfigurations

5. Cryptography
   - Weak encryption (MD5 hashing instead of bcrypt)
   - Exposed secrets (hardcoded keys in code/configs)
   - TLS misconfigurations (weak ciphers, old SSL versions)
```

**Tools:** Burp Suite Pro, OWASP ZAP, Synopsys Checkmarx, GitGuardian

**Deliverable:** Vulnerability list (by severity: Critical, High, Medium, Low)

---

### Phase 3: Exploitation & Validation (1 week)

**Activities:**
- Attempt to exploit identified vulnerabilities
- Verify findings (false positives eliminated)
- Determine impact (what can attacker do?)
- Document proof-of-concept (reproducible steps)

**Example exploitation:**

```
Vulnerability: SQL Injection in agent blueprint search
Severity: Critical

Exploitation:
  1. Navigate to Registry → Search
  2. Enter: ' OR '1'='1
  3. System returns all agents (should only return matching)
  4. Extract sensitive data (prompts, policies)

Impact: Attacker can read all agents, including high-risk ones

Proof-of-Concept:
  curl "https://intellios.example.com/api/registry/search?q=' OR '1'='1"
  # Returns all agents instead of empty result set
```

**Tools:** Burp Suite Repeater, custom scripts, proof-of-concept tools

**Deliverable:** Penetration test report with exploits documented

---

## Recent Findings Summary [PLACEHOLDER]

### 2025 Annual Penetration Test Results

**Tester:** [PLACEHOLDER: Acme Security Inc.]

**Dates:** April 1-30, 2025

**Summary:** 8 vulnerabilities identified; 7 resolved before release; 1 remains (low-risk, in backlog)

**Findings:**

| ID | Title | Severity | Status |
|---|---|---|---|
| PT-2025-001 | Rate limiting bypass | High | ✓ Fixed (v1.1.0) |
| PT-2025-002 | JWT token validation gap | High | ✓ Fixed (v1.1.0) |
| PT-2025-003 | Missing CSRF token | Medium | ✓ Fixed (v1.1.0) |
| PT-2025-004 | Error message info disclosure | Medium | ✓ Fixed (v1.1.0) |
| PT-2025-005 | Weak password hashing | Medium | ✓ Fixed (v1.0.1) |
| PT-2025-006 | Missing security headers | Low | ✓ Fixed (v1.1.0) |
| PT-2025-007 | Outdated dependency | Low | ✓ Fixed (v1.0.1) |
| PT-2025-008 | Potential DoS (long-running query) | Low | In backlog |

**Outstanding issues:** 1 (Low) — no remediation planned (acceptable risk per risk assessment)

**Retesting:** Post-fix retesting completed; all fixes validated

---

## Remediation Process

### Finding Severity → Response Time

| Severity | Response Time | Remediation Target |
|---|---|---|
| **Critical** | 24 hours | Fix + hotfix release within 2 weeks |
| **High** | 5 business days | Fix in next scheduled release (2-4 weeks) |
| **Medium** | 2 weeks | Fix in next release (1-2 months) |
| **Low** | 30 days | Backlog (fix when convenient) |

### Remediation Steps

1. **Triage:** Security team reviews finding, validates severity
2. **Root cause analysis:** Why did vulnerability exist?
3. **Fix development:** Engineer implements fix
4. **Code review:** Peer reviews fix for correctness and security
5. **Testing:** Automated + manual testing of fix
6. **Retesting:** Penetration tester validates fix (eliminates false positives)
7. **Release:** Fix included in next release (hotfix if Critical)
8. **Communication:** Notify customers if vulnerability affects them

### Example Remediation: Rate Limiting Bypass

```
Finding: Attacker can exceed API rate limits by manipulating headers

Vulnerability:
  - Rate limiting checked X-Forwarded-For header (spoofable)
  - Attacker could forge header to get new rate limit bucket

Fix:
  1. Rate limiting now checks authenticated user (JWT), not IP
  2. Even if attacker spoofs IP, same user = same rate limit bucket
  3. Verified by tester: Rate limit now enforced correctly

Code change:
  OLD: getRateLimitBucket(req.ip)  // Uses X-Forwarded-For
  NEW: getRateLimitBucket(req.user.id)  // Uses authenticated user

Testing:
  - Unit test: Same user across different IPs → same bucket
  - Integration test: Attempt to bypass with spoofed IP → rejected
  - Penetration test: Rate limit enforced correctly
```

---

## Penetration Testing Partners [PLACEHOLDER]

Intellios engages third-party security firms for independent testing:

| Firm | Services | Annual Cost |
|---|---|---|
| **Acme Security Inc.** | Annual pen test, vulnerability scanning | $50K |
| **Trustwave** | Incident response retainer, ad-hoc testing | $30K |
| **Trail of Bits** | Source code security review (annual) | $40K |

**Total annual security testing budget:** $120K

---

## How to Request Penetration Test Report

**For customers:**

If you need to review Intellios' penetration test results for your own compliance:

```
Email: compliance@intellios.com
Subject: Pen Test Report Request

Body:
Dear Intellios Compliance Team,

We are preparing for a regulatory examination and would like to
review your most recent penetration testing report.

Organization: [Your bank/org name]
Examiner: [Federal Reserve / OCC / etc.]
Date needed by: [Date]

Can you provide:
1. Summary of findings
2. Severity distribution
3. Remediation status
4. Retesting results

Thank you,
[Your name]
```

**Typical response:** 2-3 business days (requires NDA signature)

---

## Bug Bounty Program [PLACEHOLDER]

Intellios currently does not operate a public bug bounty program. However:

**Responsible disclosure:**

If you discover a security vulnerability in Intellios:

1. **DO NOT** publish or share the vulnerability publicly
2. **Email:** security@intellios.com with details
3. **Include:** Description, reproduction steps, potential impact
4. **Timeline:** Intellios team responds within 48 hours
5. **Remediation:** We will fix and notify you when patch is released

**Incentive:** Recognition in release notes (with your permission)

**Future plans:** Formal bug bounty program launching [PLACEHOLDER: Q3 2026]

---

## Vulnerability Disclosure Policy

**If Intellios discovers a vulnerability:**

1. **Assessment:** Security team determines severity
2. **Notification:** Affected customers notified within 24 hours (Critical), 5 days (High), 30 days (Medium/Low)
3. **Timeline:** Patch released on fixed schedule (Critical: within 2 weeks; others: next release)
4. **Public disclosure:** Vulnerability published 30 days after patch release (gives time for customers to upgrade)

**Example notification email:**

```
Subject: SECURITY UPDATE: Critical Vulnerability in Intellios v1.1.0

Dear [Customer],

We have identified and fixed a critical security vulnerability in
Intellios that could allow unauthorized access to governance policies.

Affected versions: v1.1.0, v1.1.1
Patched version: v1.1.2
Patch availability: [Date]

Action required:
1. Upgrade to v1.1.2 as soon as possible
2. Review access logs for unauthorized policy access
3. Contact us if you have questions

Severity: CRITICAL
CVSS Score: 9.8

We apologize for any inconvenience. Thank you for using Intellios.

Security Team
```

---

## Monitoring & Continuous Assessment

### Dependency Scanning

**Tools:** Snyk, GitHub Dependabot

**Frequency:** Weekly

**Actions:** Automatically open pull requests for outdated dependencies

```
Snyk scan results:
  ✓ 0 critical vulnerabilities
  ⚠ 2 high-severity vulnerabilities (outdated express version)
  - Action: Upgrade express@4.18.2 → 4.19.0 (fixes vulnerability)
```

### Configuration Drift Detection

**Tools:** AWS Config, custom scripts

**Frequency:** Daily

**Actions:** Alert if security group, SSL certificate, or IAM permissions change unexpectedly

```
AWS Config change notification:
  Resource: Security group sg-0123456
  Change: Ingress rule added (0.0.0.0/0 → port 22)
  Alert: Potential security misconfiguration
  Response: Revert change immediately
```

---

## Security Program Roadmap

### Q2 2026
- [ ] Expand vulnerability scanning (add Checkmarx for SAST)
- [ ] Formalize bug bounty program (launch public program)

### Q3 2026
- [ ] Source code security review (Trail of Bits, annual)
- [ ] Infrastructure penetration test (AWS GovCloud readiness)

### Q4 2026
- [ ] Third-party red team exercise (day-long simulated attack)
- [ ] Security training for development team

---

## Support & Questions

**For penetration testing inquiries:**

- **Security team:** [PLACEHOLDER: security@intellios.com]
- **Compliance team (for customer pen test reports):** [PLACEHOLDER: compliance@intellios.com]
- **Incident response:** [PLACEHOLDER: security-incidents@intellios.com]

---

## Related Resources

- [SOC 2 Readiness](./soc2-readiness.md) — Compliance audit status
- [FedRAMP Readiness](./fedramp-readiness.md) — Federal security requirements
- [Secret Management](./secret-management.md) — Protecting sensitive data

