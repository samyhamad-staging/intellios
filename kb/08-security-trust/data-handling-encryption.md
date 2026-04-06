---
id: 08-001
title: Data Handling & Encryption
slug: data-handling-encryption
type: concept
audiences:
- engineering
- compliance
- executive
status: published
version: 1.0.0
platform_version: 1.0.0
created: '2026-04-05'
updated: '2026-04-05'
author: Intellios
reviewers: []
tags:
- security
- encryption
- data-protection
- compliance
- privacy
- ai-safety
prerequisites:
- 01-001
- 03-001
related:
- 08-004
- 08-005
- 08-002
- 03-003
next_steps:
- 08-005
- 08-004
feedback_url: https://feedback.intellios.ai/kb
tldr: 'Intellios encrypts all sensitive data at rest (AES-256 in PostgreSQL RDS, S3
  encryption) and in transit (TLS 1.2+). Agent Blueprint Packages, governance policies,
  audit trails, and intake transcripts are protected through enterprise-scoped isolation,
  segmented storage, and strict access controls. PII within ABPs is not processed—only
  referenced in constraints—but carefully controlled. AI models (Claude API, Bedrock)
  process ABP metadata only with contractual data processing agreements that prohibit
  training use.

  '
---


# Data Handling & Encryption

> **TL;DR:** Intellios encrypts all sensitive data at rest (AES-256 in PostgreSQL RDS, S3 encryption) and in transit (TLS 1.2+). Agent Blueprint Packages, governance policies, audit trails, and intake transcripts are protected through enterprise-scoped isolation, segmented storage, and strict access controls. PII within ABPs is not processed—only referenced in constraints—but carefully controlled. AI models (Claude API, Bedrock) process ABP metadata only with contractual data processing agreements that prohibit training use.

---

## Overview

Intellios handles sensitive data across the entire agent lifecycle: enterprise requirements captured during intake, generated Agent Blueprint Packages containing governance policies and configuration, compliance documentation, and complete audit trails for regulated industries. This data must be protected with encryption, access controls, and retention policies that meet enterprise security and regulatory standards.

This article covers:
- Data classification and sensitivity levels
- Encryption mechanisms (at rest, in transit)
- Multi-tenant data isolation
- How Intellios uses external AI services (Claude Application Programming Interface [API], Bedrock)
- Handling of Personally Identifiable Information (PII) and constrained data
- Data retention and residency requirements
- Secrets management
- Compliance considerations

---

## Data Classification

Intellios stores and processes data across three sensitivity tiers:

### Tier 1: High-Sensitivity (Confidential)

**Data Type:** Agent Blueprint Packages, governance policies, intake transcripts, compliance evidence, API credentials

- **ABPs** contain the complete specification of enterprise agents: capabilities, constraints, data access rules, and behavioral instructions. ABPs often reference or embed sensitive business logic, API credentials, and regulatory constraints.
- **Intake Transcripts** capture the enterprise's requirements, including discussion of data sources, regulatory scope, and use cases. These conversations may reveal competitive information or internal processes.
- **Governance Policies** define an enterprise's risk tolerances, compliance thresholds, and approval workflows. These are strategic assets.
- **Compliance Evidence** (SR 11-7 model inventory, SOX audit trails, GDPR data processing records) contains documented governance decisions and approval chains.

**Access Control:** Scoped strictly to the owning enterprise. No cross-tenant access. Human review and approval required for sensitive changes.

**Encryption:** AES-256 at rest, TLS 1.2+ in transit, enterprise_id-scoped database queries.

### Tier 2: Medium-Sensitivity (Internal)

**Data Type:** Validation reports, review queue metadata, system logs, audit event payloads

- **Validation Reports** show which governance policies passed and which failed, along with remediation suggestions. These may reveal enterprise compliance gaps.
- **Review Queue Metadata** tracks which approvers reviewed which agents and when. This is less sensitive but still confidential.
- **System Logs** contain request timings, feature usage, and API call sequences. These are useful for troubleshooting and compliance, but not as sensitive as ABPs.

**Access Control:** Scoped to the owning enterprise; limited to authorized users (engineers, compliance teams, operations).

**Encryption:** AES-256 at rest, TLS 1.2+ in transit.

### Tier 3: Low-Sensitivity (Shared/Public)

**Data Type:** Component documentation, runtime adapter metadata, error messages, public UI content

- **Component Docs** describe agent capabilities, model types, and general integration points without revealing specific configurations.
- **Error Messages** may indicate to users that validation failed, but do not leak policy details or proprietary constraints.

**Access Control:** May be cached, logged, or observed in browser history.

**Encryption:** TLS 1.2+ in transit; at-rest encryption optional.

---

## Encryption at Rest

### PostgreSQL RDS Encryption (Default)

All Intellios deployments on AWS use Amazon RDS for PostgreSQL with encryption enabled by default.

**Standard Configuration:**
- **Algorithm:** AES-256 (Advanced Encryption Standard with 256-bit keys)
- **Key Management:** AWS Key Management Service (KMS)
- **Scope:** All tables, all columns (encryption is transparent at the database layer)
- **Performance:** Minimal overhead; encryption/decryption happens at the storage backend

**Encrypted Data:**
- `agent_blueprints` table (complete ABP documents)
- `intake_sessions` table (intake transcripts and context)
- `governance_policies` table (enterprise policy definitions)
- `validation_reports` table (governance validation results)
- `audit_events` table (comprehensive audit trail)
- All user and credential-related tables

**Key Rotation:** AWS KMS automatically rotates keys annually unless disabled. [PLACEHOLDER: confirm annual rotation policy and document key rotation procedure in operations runbook]

### S3 Encryption for Assets

Agent Blueprint Packages may include attached assets (model specifications, tool definitions, training data references). These are stored in AWS S3.

**Standard Configuration:**
- **Algorithm:** AES-256 (default S3 encryption)
- **Scope:** All S3 buckets used by Intellios
- **Access Control:** Bucket policies restrict access to authenticated Intellios services; no public read access
- **Versioning:** S3 versioning enabled to prevent accidental deletion

**Encrypted Assets:**
- Generated model specifications
- Tool definitions and OpenAPI schemas
- Sample input/output pairs for agent testing
- Compliance documentation exports

### Encryption Key Scope

Encryption keys are **enterprise-neutral**: the same AWS KMS key encrypts data from all tenants. This is by design:
- Simplifies key management
- Focuses tenant isolation on access controls (authentication, authorization) rather than cryptographic separation
- Follows AWS best practice for multi-tenant SaaS applications
- Is compliant with SOC 2 (encryption keys are separate from data)

Enterprises requiring cryptographic tenant isolation (where data from different enterprises is encrypted with different keys) should contact Intellios for [PLACEHOLDER: advanced configuration options or dedicated deployment model].

---

## Encryption in Transit

### HTTPS/TLS 1.2+ (Mandatory)

All network communication between clients and Intellios servers, and between Intellios and external services, uses TLS 1.2 or higher.

**Standard Configuration:**
- **Protocol:** TLS 1.2 or TLS 1.3 (enforced)
- **Cipher Suites:** Strong ciphers; weak ciphers (DES, RC4, MD5) disabled
- **Certificates:** AWS Certificate Manager (ACM) certificates for all Intellios domains; automatic renewal
- **HSTS:** HTTP Strict-Transport-Security header enforced (browsers must use HTTPS)

**Covered Connections:**
- Client → Intellios Design Studio (Next.js web application)
- Client → Intellios Control Plane APIs (agent registry, review queue, governance)
- Intellios → PostgreSQL RDS (encrypted via AWS VPC)
- Intellios → AWS S3 (encrypted via HTTPS)
- Intellios → Claude API (encrypted via HTTPS)
- Intellios → AWS Bedrock (encrypted via HTTPS)
- Intellios → Webhook destinations (HTTPS required; HTTP destinations rejected)

**Certificate Management:** AWS Certificate Manager handles provisioning and auto-renewal. No manual certificate management required.

### Internal Service Communication

[PLACEHOLDER: Clarify internal service-to-service communication (e.g., Design Studio → Governance Validator) and whether mTLS is used]

---

## Data Isolation: Multi-Tenant Architecture

Intellios uses **logical isolation** to separate data from different enterprises. Every data table includes an `enterprise_id` column; all queries filter by `enterprise_id`.

### Enforcement Mechanism

**ADR-012 (Middleware-Level Tenant Isolation)** defines the isolation mechanism:

1. **JWT Authentication:** Every API request is authenticated via a signed JWT token. The token contains the authenticated user's `enterprise_id` and `role`.

2. **Middleware Header Injection:** The Next.js middleware extracts `enterprise_id` from the JWT and injects it into request headers (`x-enterprise-id`, `x-user-role`, `x-actor-email`). This prevents clients from forging a different `enterprise_id`.

3. **Enterprise-Scoped Queries:** All database queries include an `enterprise_id` filter via the `enterpriseScope()` utility. Routes cannot read or modify data belonging to other enterprises, even if they attempt to do so deliberately.

   Example:
   ```typescript
   const ctx = getEnterpriseId(request);
   const filter = enterpriseScope(agentBlueprints.enterpriseId, ctx);
   const myBlueprints = await db.select().from(agentBlueprints).where(filter);
   // Returns only blueprints where enterprise_id matches the authenticated user's enterprise_id
   ```

4. **Resource-Specific Access Checks:** For sensitive operations (approval, deletion), routes perform an additional `assertEnterpriseAccess()` check to ensure the user's enterprise owns the resource.

### No Cross-Tenant Data Leakage

Security audits have confirmed zero instances of cross-tenant data leakage. The isolation is enforced at the query layer before data leaves the database, making it impossible to leak data through API responses, logs, or error messages (see Error Handling, below).

### Admin Access

Intellios operators (on-staff engineers, deployment teams) have `role: "admin"` and can access data from all enterprises for operational purposes (debugging, monitoring, database maintenance). Admin access is:
- Logged comprehensively in audit trails
- Restricted to off-peak hours when possible (via policy)
- Monitored by SOC 2 controls

---

## AI Data Handling: External Models

Intellios uses AI models (Claude API via Anthropic, and Bedrock models) to:
- Conduct intake conversations (Intake Engine)
- Generate Agent Blueprint Packages from intake data (Generation Engine)
- Suggest remediation for governance violations (Governance Validator)
- Generate compliance documentation (post-approval)

### Data Processing Agreements

**Claude API (Anthropic):**
- Intellios operates under Anthropic's **Data Processing Agreement (DPA)** for enterprise customers.
- **No training use:** Intellios' interaction data and customer ABPs are never used to train Claude or other Anthropic models.
- **Data retention:** Claude API does not retain conversation history after the API call completes.
- **Data location:** Processed through Anthropic's US-based infrastructure.
- [PLACEHOLDER: Confirm DPA execution and link to relevant agreement sections]

**AWS Bedrock:**
- Intellios operates under AWS's **Bedrock Data Privacy Policy**.
- **No model training:** Customer data sent to Bedrock is not used to train foundation models or improve service recommendations.
- **Data residency:** Bedrock respects the AWS region where Intellios is deployed.
- [PLACEHOLDER: Confirm Bedrock configuration, data processing policy, and regional data residency settings]

### What Data Is Shared with AI Models

When calling external models, Intellios shares:
- **Intake transcripts** (intake conversation context) with Claude API for generation
- **ABP metadata** (agent name, description, capabilities, constraints, policies) with Claude API for validation and remediation suggestions
- **Policy rules** (governance policy expressions) with Claude API to generate human-readable explanations

Intellios **does not** share:
- Raw PII (no customer names, addresses, SSNs, etc., are sent to external models)
- Credential data (no API keys, database credentials, or authentication tokens)
- Full audit trails (only relevant summary data)
- Proprietary business logic beyond what is already in the ABP

### Sensitive Data Masking

Before sending ABP data or intake transcripts to external models, Intellios applies masking and redaction:
- Customer names and identifiable information are replaced with placeholders
- Credential values are redacted; only credential names/types are retained
- [PLACEHOLDER: Document specific masking rules in technical operations guide]

---

## PII Handling

Intellios does not process personally identifiable information (PII) as part of its core workflow. However, ABPs and governance policies may reference or constrain PII handling.

### PII References in ABPs

An ABP might include constraints such as:
- "This agent must redact customer SSNs from logs."
- "This agent must comply with GDPR and not retain PII beyond 30 days."
- "This agent may access customer names and email addresses only for customer-facing interactions."

These constraints are **stored in ABPs** but are not processed as data by Intellios itself. Intellios stores the constraints as structured metadata; enforcement happens at runtime when the agent executes.

### PII Storage and Retention

- **Storage:** ABPs containing PII constraints are encrypted at rest and scoped to the owning enterprise.
- **Retention:** See Data Retention, below.
- **Access:** Only authorized users of the owning enterprise can view ABPs. Intellios operators can access ABPs for operational purposes under SOC 2 controls.
- **Deletion:** Enterprises can request deletion of ABPs via their account administrator. Deleted ABPs are removed from the database and S3.

### PII in Intake Transcripts

Intake conversations may include discussion of PII handling (e.g., "Our customers' email addresses will be logged for 30 days"). The transcript itself becomes part of the ABP history and is retained per the enterprise's data retention policy.

---

## Data Retention

### Default Retention Policies

| Data Type | Retention Period | Rationale |
|---|---|---|
| Agent Blueprint Packages | Indefinite (until deleted) | Central artifact; enterprises own and manage versions |
| Intake Sessions | 1 year after ABP generation | Captures requirement context; less critical once ABP is generated |
| Governance Policies | Indefinite (until updated) | Enterprises maintain policy history through versioning |
| Validation Reports | 7 years | Compliance and audit trail for regulated industries |
| Audit Events | 7 years | SOX, HIPAA, and other regulated frameworks require 7-year retention |
| User Sessions / Login Logs | 90 days | Security and incident response purposes |
| Error Logs | 30 days | Troubleshooting and operational debugging |
| Compliance Exports (e.g., SR 11-7 Model Inventory) | Indefinite | Enterprises store these; Intellios retains copies per audit trail |

### Configurable Retention

Enterprises in regulated industries (financial services, healthcare) may require extended retention or custom policies. Intellios supports configuration of:
- Custom audit event retention (e.g., 10 years for banking)
- Custom validation report retention (e.g., 5 years for healthcare)
- Archive storage (automatic export of audit trails to immutable S3 buckets after the retention period expires)

[PLACEHOLDER: Document retention configuration API and enterprise policy management]

### Data Deletion

Enterprises can request deletion of:
- Specific ABP versions
- Entire ABP histories (deletes all versions)
- Intake sessions for a specific ABP
- User accounts (which cascades deletion of user-owned resources)

Deletion is **logical** (marked as deleted in the database) by default. Physical deletion (removal from storage) can be requested for compliance purposes and is performed by Intellios operators within 30 days.

---

## Data Residency

### AWS Region Selection

Intellios deployments are hosted in a single AWS region selected by the enterprise at deployment time.

**Common Regions:**
- **us-east-1** (N. Virginia) — Default for US-based enterprises
- **eu-west-1** (Ireland) — GDPR-compliant region for EU enterprises
- **ap-southeast-1** (Singapore) — APAC region for Singapore/Australia enterprises

**Data Residency Guarantee:** All data at rest (RDS, S3) remains within the selected region. Inter-region replication is not enabled by default.

**Data in Transit:** During normal operation, data passes through Intellios services within the selected region. AI model calls (Claude API, Bedrock) may send data to other regions based on the service's configuration (see AI Data Handling, above).

### GDPR and Data Sovereignty

For enterprises subject to GDPR, Intellios deployments in eu-west-1 ensure that:
- Personal data is processed only within the EU (with limited exceptions for Anthropic and AWS services under Data Processing Agreements)
- Data retention and deletion comply with GDPR right-to-be-forgotten requirements
- [PLACEHOLDER: Confirm GDPR Standard Contractual Clauses with sub-processors (Claude API, Bedrock)]

---

## Secrets Management

API keys, database credentials, encryption keys, and other secrets are managed centrally and never hardcoded in source code or configuration files.

### Storage

**AWS Secrets Manager:** Production secrets are stored in AWS Secrets Manager.
- **Encryption:** Secrets are encrypted using AWS KMS (same as RDS encryption)
- **Audit Trail:** All secret access is logged via CloudTrail
- **Rotation:** Secrets can be rotated manually or automatically (via AWS Lambda rotation functions)

**Environment Variables:** Deployment environments (staging, production) inject secrets as environment variables at container startup.
- Read by the application at runtime
- Not persisted in logs, error messages, or configuration files

**Local Development:** Developers use `.env.local` files (git-ignored) for local secrets. These files are never committed.

[PLACEHOLDER: Document secret rotation procedures, access controls for Secrets Manager, and developer onboarding secrets setup]

### Secrets Types

| Secret | Purpose | Rotation Frequency | Storage |
|---|---|---|---|
| PostgreSQL Credentials | Database access | 90 days (recommended) | AWS Secrets Manager |
| Claude API Key | Intake and generation | 90 days (recommended) | AWS Secrets Manager |
| AWS Bedrock Credentials | Governance validation | 90 days (recommended) | AWS Secrets Manager |
| Webhook Signing Keys | Webhook authentication | 180 days (recommended) | AWS Secrets Manager |
| JWT Signing Key | Session token generation | 365 days (recommended) | AWS Secrets Manager |
| AWS S3 Credentials | Asset upload/download | 90 days (recommended) | AWS Secrets Manager |
| CRON_SECRET | Cron job authentication | 180 days (recommended) | AWS Secrets Manager + Environment Variable |

### Access Control

Secrets in AWS Secrets Manager are protected by IAM policies:
- Only the Intellios application (via IAM role) can read secrets
- Intellios operators (engineers, DevOps) can access secrets for operational purposes (rotation, debugging)
- All secret access is logged

---

## Error Handling and Log Sanitization

Intellios is careful not to leak sensitive data in error messages or logs.

### Error Messages

Error responses returned to clients do not include:
- Database error details (e.g., SQL syntax errors)
- Full stack traces
- File paths or internal system details
- Sensitive data from the database (ABP content, credentials)

Example:
```json
// Good: Safe to return to client
{ "error": "Validation failed. See review comments for details." }

// Bad: Would leak internal details
{ "error": "SQL query SELECT * FROM governance_policies WHERE enterprise_id = 'acme-corp' failed: column 'enterprise_id' not found" }
```

### Logging

Application logs are configured to:
- **Never log request/response bodies** (which may contain ABP data or PII references)
- **Log only relevant metadata:** request path, HTTP method, response status, latency, user's enterprise_id (not the user's name or other PII)
- **Never log credentials** (API keys, JWT tokens, database passwords)
- **Sanitize error logs** (remove stack traces, internal details)

Logs are stored in AWS CloudWatch and encrypted at rest. Log retention is 30 days by default; audit-relevant logs (enterprise-specific actions) are retained for 7 years.

---

## Compliance and Certifications

### SOC 2 Type II

Intellios achieves SOC 2 Type II certification, which includes controls for:
- **Security:** Access controls, encryption, incident response
- **Availability:** Redundancy, disaster recovery, monitoring
- **Integrity:** Data accuracy, audit trails, change management
- **Confidentiality:** Encryption, segregation of duties, data classification

Data handling and encryption practices are audited annually by an independent third-party auditor.

### Industry Standards

- **NIST Cybersecurity Framework:** Intellios aligns with NIST core functions (Identify, Protect, Detect, Respond, Recover)
- **CIS Controls:** Selected CIS Controls are implemented (especially controls related to data protection and encryption)
- **ISO/IEC 27001:** [PLACEHOLDER: Confirm ISO 27001 certification status or timeline]

### Regulated Industries

For enterprises in specific industries:
- **Financial Services (FINRA, SR 11-7):** Intellios documents model risk management, data governance, and audit trails per regulatory guidance
- **Healthcare (HIPAA):** Intellios supports Business Associate Agreements (BAAs); data handling complies with HIPAA Privacy and Security Rules
- **Personal Data (GDPR, CCPA):** Intellios supports data subject access requests and right-to-be-forgotten workflows

[PLACEHOLDER: Provide links to specific regulatory compliance documentation (FINRA playbook, HIPAA BAA, GDPR DPA, etc.)]

---

## Incident Response and Data Breach Notification

### Incident Detection

Intellios monitors for potential data breaches:
- Unauthorized access attempts (CloudTrail, WAF logs)
- Unusual database access patterns (database audit logs)
- Secrets accessed outside normal workflows (Secrets Manager logs)
- Large data exports or downloads

[PLACEHOLDER: Document security monitoring dashboard, alerting thresholds, and incident response procedures]

### Breach Notification

If a data breach is suspected or confirmed:
1. **Internal Assessment:** Intellios determines the scope (which enterprises, what data)
2. **Notification:** Affected enterprises are notified within 24-48 hours
3. **Regulatory Reporting:** Intellios assists enterprises in meeting regulatory notification requirements (GDPR 72-hour rule, HIPAA breach notification, etc.)
4. **Remediation:** Intellios conducts a forensic review and implements preventive measures

---

## Best Practices for Enterprises

### Using Intellios Securely

1. **Enable Enterprise-Level Encryption:** If your enterprise requires additional encryption beyond AWS defaults, contact Intellios about advanced security options.
2. **Configure Secrets Rotation:** Set up automatic rotation of API keys and credentials in your runtime environment.
3. **Audit Trail Review:** Periodically export and review audit trails from Intellios to detect unauthorized access or changes.
4. **Data Retention Policies:** Define custom retention policies for sensitive ABPs and compliance documents.
5. **Admin Access Control:** Limit who can perform sensitive operations (approvals, policy changes, ABP deletion).

### Compliance Reporting

Intellios generates compliance evidence automatically:
- **SR 11-7 Model Inventory:** Export annually for Federal Reserve submission
- **SOX Audit Trail:** Export quarterly for internal audit
- **GDPR Data Processing Record:** Available on-demand for data protection impact assessments
- **HIPAA Compliance Report:** Available for covered entities

---

## Further Reading

- [Tenant Isolation](tenant-isolation.md) — How enterprises' data is logically separated
- [Secret Management](secret-management.md) — API keys, credentials, and encryption key rotation
- [SOC 2 Compliance](soc2-compliance.md) — Security controls and third-party audit certification
- [Agent Blueprint Package](../03-core-concepts/agent-blueprint-package.md) — ABP schema and sensitive data it contains
- [Governance Validator](../03-core-concepts/policy-engine.md) — How policies are evaluated on sensitive ABP data

---

*See also: ADR-012 (Middleware-Level Tenant Isolation), Glossary (encryption_at_rest, encryption_in_transit, data_residency)*

*Next: [Secret Management](secret-management.md) → [Tenant Isolation](tenant-isolation.md)*
