# Intellios — One-Pager

**Audience:** Head of AI Governance · Enterprise Architect for AI · Director of ML Platform Engineering · Chief Risk Officer (or AI risk delegate) · Internal Audit and Compliance leaders.

**Stage:** Phase A — wedge close. First design-partner conversations.

---

## What Intellios is

**The governed control plane for enterprise AI agents.** A white-label platform where enterprises design, generate, validate, review, deploy, retire, and audit AI agents under their own brand, their own policies, and their own compliance frameworks.

The canonical artifact is the **Agent Blueprint Package (ABP)** — a versioned, schema-validated description of an agent's identity, capabilities, constraints, governance rules, approval chain, and lineage. Every agent that runs in your enterprise has exactly one ABP, recorded, validated, audit-trailed.

Execution happens on the customer's cloud runtime — Amazon Bedrock AgentCore today; Azure AI Foundry and Vertex are addressable when a paying customer requires it. The compute is not the product. The governance wrapper is.

What an evidence package looks like is concrete, not promised: a 14-section Model Risk Management report covering identity, risk classification, governance validation, separation-of-duties evidence, deployment record, audit chain, regulatory framework assessment (EU AI Act, SR 11-7, NIST AI RMF), and periodic review schedule. Available as both a JSON export (machine-readable, archival) and a Big-Four-style PDF (signature-ready, deterministic). Both are shipped. Both render from real blueprints.

## What Intellios is not

- **Not a runtime.** We do not execute action groups, proxy production traffic, or own an SLO on invocation latency. The Test Console is explicitly a governed test harness, not a production runtime (ADR-027). Owning runtime is a different company.
- **Not a connector catalog.** Connectors commoditize fast. Building Yet Another Integration Platform is a strategic fight we will lose. Connectors are last-mile work, built only when a paying customer blocks on one.
- **Not a system of record competing with your existing stack.** We do not replace your IAM, your GRC platform, your Jira, your CMDB, your ITSM. We produce the canonical ABP and the audit trail; your existing systems remain the systems of record for users, tickets, and changes.
- **Not a multi-cloud runtime abstraction.** The ABP schema is provider-agnostic; the integration adapters target one runtime at a time. Multi-runtime support follows paying customers.
- **Not a services business.** Services-led revenue starves the product. We package operating models as a playbook, not as a billable hour.

## What Intellios replaces

- **Ad-hoc spreadsheets, shared docs, and Confluence pages** that today carry the governance trail for AI agents.
- **Hand-rolled approval workflows** assembled in Jira, ServiceNow, or email — without separation-of-duties enforcement, multi-step chains, or a canonical artifact at the end.
- **Manual audit-evidence assembly** — the night-before-the-audit scramble that compliance officers know too well — replaced by a one-click export of a 14-section MRM report tied to a specific ABP version.
- **The "what AI is running here?" question** that no one in the enterprise can answer in writing today.

## What Intellios complements

- **Amazon Bedrock AgentCore** (and equivalents) — Intellios deploys ABPs to AgentCore via the documented integration path; AgentCore runs the agent; Intellios records and proves the governance.
- **Existing GRC platforms** (OneTrust, ServiceNow GRC, IBM watsonx.governance) — Intellios produces the artifact those platforms can consume. We are the source of truth for "what AI agent exists, with what authority"; they integrate the broader compliance program.
- **Existing identity and access systems** (Okta, Microsoft Entra, Auth0) — Intellios records who designed, reviewed, and deployed each agent; your IAM remains the authoritative authentication layer.
- **Enterprise risk programs aligned to SR 11-7, EU AI Act, NIST AI RMF, ISO 42001** — Intellios produces the evidence those programs require, mapped per-requirement, deterministic, exportable.
- **The customer's existing Jira and Confluence** — Intellios's own internal operating model (the four-surface evidence discipline of repo + Jira + Confluence + ADR catalog) is published as a reference playbook, not a connector. Customers adopt the discipline using their existing tools.

## Why now

EU AI Act enforcement is ramping in 2026. NIST AI RMF and ISO 42001 are board conversations in every Fortune 1000. CISOs and Chief Risk Officers have line items for AI governance tooling that did not exist 18 months ago. The buyer is real, the budget is allocated, the regulator is named. The window to plant the "governed control plane" flag is the next 12 months.

## What we're asking from a design partner

A real enterprise willing to deploy one production AI agent on AWS Bedrock through Intellios's full lifecycle (intake → governance → review → deploy → invoke → retire), against the partner's actual policy set, with the partner's governance team in the review loop. In exchange: early access, attentive support, influence over the roadmap, named-reference rights when the engagement succeeds. Pricing is design-partner ($25K–$75K) — small enough to land quickly, large enough to produce real feedback.

---

*Last updated: 2026-04-25 (post-Session 172). Authoritative source: this file in the Intellios repo at `docs/marketing/one-pager.md`.*
