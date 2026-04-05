---
id: "11-001"
title: "Intellios Glossary"
slug: "glossary"
type: "reference"
audiences:
  - "executive"
  - "compliance"
  - "engineering"
  - "product"
status: "published"
version: "1.0.0"
platform_version: "1.0.0"
created: "2026-04-05"
updated: "2026-04-05"
author: "Intellios"
reviewers: []
tags:
  - "glossary"
  - "definitions"
  - "terminology"
  - "reference"
prerequisites: []
related: []
next_steps: []
feedback_url: "[PLACEHOLDER]"
tldr: >
  Comprehensive reference for all Intellios terminology, organized alphabetically
  across five categories: Platform, Regulatory, Technical, Industry, and Core
  Concepts. Defines 50+ terms used in Intellios documentation, governance policies,
  and platform communication.
---

# Intellios Glossary

> **TL;DR:** This glossary defines all terminology used across Intellios documentation. Bold a term on first use in any article and link back to this reference. Maintain term consistency by using exact definitions.

## Overview

The Intellios Glossary is the authoritative reference for all terminology used in platform documentation, governance policies, compliance communications, and product interfaces. This includes core platform concepts, regulatory terminology, technical architecture terms, industry-standard concepts, and cloud/enterprise integration terminology.

When writing Intellios documentation:
- **Consistency:** Use terms exactly as defined here. Do not create synonyms or variations.
- **Disclosure:** Bold a term on its first use in an article and link it to this glossary.
- **Scope:** This glossary covers all five audience types (executive, compliance, engineering, product) and all knowledge base sections.

---

## A

**Agent** (Platform)
An AI-powered autonomous unit designed to perform tasks on behalf of an enterprise. Agents are governed, versioned, and managed through their Agent Blueprint Package (ABP). See also: _Agent Blueprint Package, Agent Lifecycle, Runtime Adapter_.

**Agent Blueprint Package (ABP)** (Core Concept)
The central structured artifact produced by Intellios that fully describes an agent. An ABP contains: agent identity (name, description, branding), capabilities (tools and integrations), constraints (denied actions, rate limits), governance policies, compliance mappings, and versioning metadata. The ABP is the single source of truth for an agent throughout its lifecycle. See also: _ABP Schema, Blueprint, Agent Lifecycle States_.

**Agent Fleet** (Industry)
A collection of agents deployed by an enterprise, managed collectively as a group. Fleet management includes version rollout, policy propagation, performance monitoring, and deprecation. See also: _Agent Lifecycle, Runtime Adapter_.

**Agent Lifecycle** (Platform)
The stages an agent passes through from creation to retirement: draft → in_review → approved/rejected → deployed → monitoring → deprecated. Governance policies constrain valid transitions. See also: _Lifecycle State Machine, Blueprint Review UI_.

**Agent Lifecycle States** (Platform)
The discrete status values in the agent lifecycle: **draft** (incomplete), **in_review** (awaiting approval), **approved** (governance passed), **rejected** (governance failed or human review rejected), **deployed** (active in production), **monitored** (operational tracking), **deprecated** (end-of-life). See also: _Lifecycle State Machine, Review Queue_.

**Audit Trail** (Regulatory)
A complete chronological record of all actions taken on an agent, including creation, modification, approval, deployment, and runtime execution. Audit trails are machine-readable and satisfy regulatory requirements (SOX, HIPAA, GDPR). See also: _Compliance Evidence Chain, Model Inventory_.

**Azure AI Foundry** (Technical)
Microsoft's cloud platform for building and deploying AI agents. Intellios provides a **runtime adapter** that translates ABPs into Azure AI Foundry configurations. See also: _Runtime Adapter, AWS AgentCore_.

**AWS AgentCore** (Technical)
Amazon's managed service for deploying and scaling AI agents. Intellios provides a **runtime adapter** that translates ABPs into AWS AgentCore configurations. See also: _Runtime Adapter, Azure AI Foundry_.

---

## B

**Blueprint** (Platform)
Shorthand for **Agent Blueprint Package (ABP)**. Used interchangeably in documentation and the product UI (e.g., "Blueprint Studio," "Blueprint Review UI"). See also: _Agent Blueprint Package_.

**Blueprint Review UI** (Platform)
The human-facing interface where designated reviewers (architects, compliance officers, security leads) assess generated ABPs against governance policies and domain expertise, then approve, request changes, or reject them. The Review UI displays the ABP, validation report, and provides structured review forms. See also: _Review Queue, Validation Report_.

**Blueprint Studio** (Platform)
Shorthand for the Blueprint Studio page (`/blueprints/[id]`) where agents are previewed, refined, and prepared for review. The Studio displays the generated ABP, governance validation results, and provides editing tools. See also: _Design Studio, Intake Engine_.

---

## C

**Catalyst** (Technical)
The Intellios UI component library—27 polished, production-ready React components from Tailwind Labs. Imported from `@/components/catalyst`. See also: _Design Studio_.

**Compliance Evidence Chain** (Regulatory)
The automated generation and maintenance of compliance documentation throughout an agent's lifecycle. Intellios produces: model inventory, audit trails, data processing records, risk assessments, policy mappings, and approval chains. Evidence is stored alongside the ABP and updated in real-time. See also: _Model Inventory, Audit Trail, Validation Report_.

**Control Plane** (Platform)
The subsystem responsible for governance, registry, and lifecycle management of agents. Comprises the Governance Validator, Agent Registry, and Blueprint Review UI. The Control Plane constrains agent progression and ensures compliance. See also: _Design Studio, Governance Validator, Agent Registry_.

---

## D

**Deterministic Evaluation** (Technical)
Policy evaluation that produces reproducible, explainable results using structured logic—no machine learning inference, no probabilistic outcomes. Intellios policies use deterministic operators (exists, not_exists, equals, contains, matches, count_gte, etc.) that guarantee the same policy always produces the same result for the same input. See also: _Policy Expression Language, Governance-as-Code_.

**Design Studio** (Platform)
The subsystem responsible for intake and agent generation. Comprises the Intake Engine (requirement capture) and Generation Engine (ABP production). The Design Studio is where enterprises describe what agents they want, and where those agents are auto-generated. See also: _Intake Engine, Generation Engine, Control Plane_.

**Design-Time Governance** (Platform)
Governance policies applied during agent design and generation, before deployment. Design-time governance prevents non-compliant agents from being created or advancing to review. Contrasts with runtime governance (policies applied during execution). See also: _Governance Validator, Lifecycle State Machine_.

---

## E

**Enterprise** (Platform)
A customer organization that uses Intellios to design, generate, govern, and deploy agents. An enterprise defines governance policies, manages the agent registry, and oversees the lifecycle of its agents. Multi-tenancy ensures data isolation between enterprises. See also: _White-label, Multi-tenancy, Tenant Isolation_.

**EU AI Act** (Regulatory)
The European Union's proposed regulation on artificial intelligence, emphasizing risk assessment, documentation, transparency, and human oversight for high-risk AI systems. Intellios generates compliance evidence for EU AI Act requirements. See also: _NIST AI RMF, Model Risk Management_.

**Express-Lane Template** (Platform)
A pre-configured agent template that allows rapid agent creation without full intake. Templates encode governance policies, common tool configurations, and compliance mappings for common use cases (e.g., "customer service agent," "internal research assistant"). See also: _Intake Engine, Intake Session_.

---

## G

**Generation Engine** (Platform)
The component that consumes intake data and produces an Agent Blueprint Package. The Generation Engine synthesizes enterprise requirements, regulatory constraints, and governance policies into a complete ABP specification. See also: _Intake Engine, Design Studio, Agent Blueprint Package_.

**Governance-as-Code** (Platform)
The practice of expressing governance policies in deterministic, machine-readable rule language instead of prose or checklists. Policies are versioned, audited, and executable. See also: _Policy Expression Language, Deterministic Evaluation, Governance Validator_.

**Governance Gate** (Platform)
A control point in the agent lifecycle where the Governance Validator checks the ABP against policies and decides whether the agent can proceed. If error-severity violations exist, the agent cannot progress from draft to in_review status. See also: _Governance Validator, Lifecycle State Machine, Violation_.

**Governance Validator** (Platform)
The component that automatically evaluates a generated ABP against enterprise governance policies, compliance rules, and safety constraints. The Validator produces a Validation Report with pass/fail status, list of violations, and remediation suggestions. See also: _Validation Report, Violation, Governance-as-Code_.

**Governance-as-Code** (Technical)
Policies expressed in deterministic, structured rule language (JSON) that define what agents can and cannot do. Policies can be versioned, reviewed, and applied consistently across all agents. See also: _Policy Expression Language, Deterministic Evaluation_.

---

## I

**Intake Engine** (Platform)
The component that captures enterprise requirements, constraints, and preferences for agent creation. The Intake Engine conducts a three-phase intake process: structured context form → conversational AI interview → pre-generation review. Output: an intake payload that feeds the Generation Engine. See also: _Intake Session, Design Studio, Generation Engine_.

**Intake Payload** (Technical)
The structured data collected by the Intake Engine during an intake session. Contains: deployment type, data sensitivity, regulatory scope, integrations, capabilities, constraints, governance context, and user metadata. The Intake Payload is the input to the Generation Engine. See also: _Intake Session, Generation Engine_.

**Intake Session** (Platform)
A database record representing one intake conversation between a designer and the Intake Engine. Stores the progressive intake_payload, all messages, and session metadata. Designers can resume or re-run intake sessions. See also: _Intake Engine, Intake Payload_.

**Intellios** (Platform)
The white-label enterprise agent factory and governed control plane for designing, generating, governing, and deploying AI agents at scale. Intellios enables enterprises to build agents under their own brand while maintaining compliance, auditability, and policy control. See also: _White-label, Design Studio, Control Plane_.

---

## L

**Lifecycle State Machine** (Technical)
The formal state machine that defines valid agent status transitions: draft → in_review → approved/rejected → deployed → monitoring → deprecated. Policies constrain transitions (e.g., error violations block progression from draft). See also: _Agent Lifecycle States, Governance Gate_.

---

## M

**Model Drift** (Industry)
The degradation of an agent's performance over time due to changes in input data, business context, or real-world conditions. Intellios provides monitoring signals to detect model drift. See also: _Agent Fleet, Agent Lifecycle_.

**Model Inventory** (Regulatory)
A comprehensive catalog of all agents deployed by an enterprise, required by frameworks like SR 11-7. Intellios generates model inventory automatically from ABP metadata, including: agent identity, risk classification, governance policies, approval chain, and deployment status. See also: _Compliance Evidence Chain, SR 11-7, Model Risk Management_.

**Model Risk Management (MRM)** (Regulatory)
The enterprise discipline of identifying, assessing, and managing risks associated with AI/ML systems. Regulatory frameworks (SR 11-7, NIST AI RMF) impose MRM requirements. Intellios integrates MRM by embedding governance, documentation, and audit capabilities into agent design. See also: _SR 11-7, NIST AI RMF, Model Inventory_.

**Model Validation** (Regulatory)
The process of verifying that an agent performs as intended and complies with governance policies. Intellios conducts model validation at design time (Governance Validator) and runtime (monitoring signals). See also: _Governance Validator, Compliance Evidence Chain_.

**Multi-tenancy** (Industry)
The architectural capability for Intellios to serve multiple enterprises from a single deployment, with complete data and policy isolation between tenants. Each enterprise's agents, policies, and audit trails are isolated. See also: _Enterprise, Tenant Isolation, White-label_.

---

## N

**NIST AI RMF** (Regulatory)
The National Institute of Standards and Technology's AI Risk Management Framework, providing guidance on AI governance, risk assessment, and documentation. Intellios generates compliance evidence for NIST AI RMF requirements. See also: _Model Risk Management, SR 11-7, EU AI Act_.

---

## O

**OCC** (Regulatory)
The Office of the Comptroller of the Currency—a U.S. federal regulator of national banks. The OCC issued guidance on AI governance and endorsed SR 11-7 model risk management standards. See also: _SR 11-7, Model Risk Management_.

**Open Question (OQ)** (Internal)
A tracked, unresolved decision or clarification needed in the Intellios project, recorded in `docs/open-questions.md` with an OQ-NNN identifier. OQs are resolved through architectural decisions (ADRs). See also: _ADR_.

---

## P

**Policy** (Platform)
A set of rules defined by an enterprise that constrain agent behavior, capabilities, data access, or compliance posture. Policies are expressed in deterministic, machine-readable language and automatically evaluated during governance validation. See also: _Governance-as-Code, Policy Expression Language, Governance Validator_.

**Policy Expression Language** (Technical)
The deterministic, structured rule language used to author governance policies in Intellios. Supports operators: exists, not_exists, equals, not_equals, contains, not_contains, matches, count_gte, count_lte, includes_type, not_includes_type. Policies are JSON documents with field, operator, value, severity, and message fields. See also: _Governance-as-Code, Deterministic Evaluation_.

---

## R

**Remediation Suggestion** (Technical)
An optional, Claude-generated recommendation provided alongside a policy violation in the Validation Report. The suggestion proposes how to modify the ABP to resolve the violation. See also: _Violation, Validation Report, Governance Validator_.

**Review Queue** (Platform)
The list of ABPs currently in in_review status, accessible at `/review`. The Review Queue is the entry point for human reviewers and provides visibility into pending approvals. See also: _Blueprint Review UI, Lifecycle State Machine, Agent Lifecycle States_.

**Runtime Adapter** (Technical)
An interface that translates an Agent Blueprint Package into runtime-specific configurations for deployment to AWS AgentCore, Azure AI Foundry, Kubernetes, or other orchestrators. Runtime adapters decouple the ABP from deployment targets, enabling multi-cloud and hybrid deployments. See also: _Agent Blueprint Package, AWS AgentCore, Azure AI Foundry_.

---

## S

**Shadow AI** (Industry)
Ungoverned AI systems deployed by employees outside formal IT and compliance processes—e.g., teams using ChatGPT for business tasks without tracking, approval, or audit. Shadow AI creates regulatory exposure, intellectual property risk, and data security vulnerabilities. Intellios addresses shadow AI by making the governed path easier than the ungoverned path. See also: _Governance-as-Code, Compliance Evidence Chain_.

**Severity (Error/Warning)** (Technical)
A classification for policy violations. **Error** violations block agent progression (agent cannot leave draft status). **Warning** violations are logged but do not block progression. Each policy rule specifies its severity level. See also: _Violation, Governance Validator, Policy_.

**Stakeholder Contribution** (Platform)
The ability for multiple stakeholders (compliance officers, security leads, business owners) to influence agent design through governance policies and review gates. Stakeholders define policies upfront, and the Governance Validator applies them automatically during generation and review. See also: _Policy, Governance Validator, Blueprint Review UI_.

**SR 11-7** (Regulatory)
A 2011 Federal Reserve guidance letter ("Guidance on Model Risk Management") that establishes expectations for banks' model governance, validation, documentation, and risk management. SR 11-7 is now a de facto standard for AI governance in financial services. Intellios generates SR 11-7 compliance evidence automatically. See also: _Model Risk Management, Model Inventory, Compliance Evidence Chain_.

**Studio** (Platform)
Shorthand for Blueprint Studio. The `/blueprints/[id]` page where designers preview, refine, and prepare an ABP for review. See also: _Blueprint Studio, Design Studio_.

---

## T

**Tenant Isolation** (Technical)
The architectural guarantee that one enterprise's agents, policies, and data are completely isolated from another enterprise's agents, policies, and data. Tenant isolation is essential for multi-tenancy and white-label deployments. See also: _Multi-tenancy, Enterprise, White-label_.

---

## V

**Validation Report** (Platform)
The output of the Governance Validator for a given ABP. Contains: valid (boolean), violations (list of Violation objects), policyCount, and generatedAt timestamp. Stored in the agent_blueprints database table and displayed in the Blueprint Review UI. See also: _Violation, Governance Validator, Violation_.

**Violation** (Technical)
A single policy rule failure in a Validation Report. Contains: policy name, rule ID, field path (which ABP field violated the rule), severity (error or warning), message, and optional remediation suggestion. Multiple violations can exist for a single ABP. See also: _Validation Report, Governance Validator, Severity_.

---

## W

**White-label** (Platform)
The capability for enterprises to brand and customize Intellios-generated agents as their own products. Agents can be deployed under the enterprise's brand, logo, and policies, while Intellios infrastructure remains transparent. White-label deployments support multi-tenancy and tenant isolation. See also: _Enterprise, Multi-tenancy, Tenant Isolation_.

---

## Z

_(No terms in this section.)_

---

## Cross-Reference Index

### By Category

**Core Concepts:**
Agent, Agent Blueprint Package, Agent Lifecycle, Agent Lifecycle States, Blueprint, Compliance Evidence Chain, Governance-as-Code

**Platform Subsystems:**
Design Studio, Control Plane, Intake Engine, Generation Engine, Governance Validator, Agent Registry, Blueprint Review UI, Blueprint Studio, Review Queue

**Technical Architecture:**
ABP Schema, Catalyst, Deterministic Evaluation, Governance-as-Code, Lifecycle State Machine, Policy Expression Language, Remediation Suggestion, Runtime Adapter, Tenant Isolation, Violation

**Regulatory & Compliance:**
Audit Trail, Compliance Evidence Chain, EU AI Act, Model Drift, Model Inventory, Model Risk Management, Model Validation, NIST AI RMF, OCC, SR 11-7

**Enterprise & Industry:**
Agent Fleet, Enterprise, Multi-tenancy, Shadow AI, Stakeholder Contribution, White-label

**Governance & Policy:**
Design-Time Governance, Express-Lane Template, Governance Gate, Governance Validator, Policy, Severity (Error/Warning), Validation Report

### By Regulatory Framework

**SR 11-7:**
Audit Trail, Compliance Evidence Chain, Model Inventory, Model Risk Management, Model Validation, Severity, Validation Report

**EU AI Act:**
Audit Trail, Compliance Evidence Chain, Model Risk Management, Validation Report

**NIST AI RMF:**
Compliance Evidence Chain, Model Risk Management, Model Validation

**GDPR/HIPAA:**
Audit Trail, Compliance Evidence Chain, Data Handling

### By Audience

**Executive:**
Agent Fleet, Enterprise, Intellios, Model Risk Management, Shadow AI, Strategic Impact, White-label

**Compliance:**
Audit Trail, Compliance Evidence Chain, EU AI Act, Model Inventory, Model Risk Management, Model Validation, NIST AI RMF, OCC, SR 11-7, Severity

**Engineering:**
ABP Schema, Catalyst, Deterministic Evaluation, Lifecycle State Machine, Policy Expression Language, Remediation Suggestion, Runtime Adapter, Tenant Isolation, Violation

**Product:**
Agent, Blueprint, Design Studio, Intake Engine, Governance Validator, Review Queue, Stakeholder Contribution, User Workflow

---

*This glossary is maintained alongside the Intellios knowledge base. Submit feedback or suggest new definitions via the [PLACEHOLDER].*

*See also: [Style Guide](../_meta/style-guide.md), [Content Types](../_meta/content-types.md)*

*Last Updated: 2026-04-05*
