# Intellios Glossary

Canonical definitions for all project terms. Use these exact terms in all documentation, code, and conversation.

---

| Term | Definition |
|---|---|
| **Intellios** | The white-label enterprise agent factory platform. |
| **Agent** | An AI-powered autonomous unit designed to perform tasks on behalf of an enterprise. |
| **Agent Blueprint Package (ABP)** | The core artifact produced by Intellios. A structured, versioned package that fully describes an agent's identity, capabilities, constraints, and governance policies. |
| **Blueprint** | Shorthand for Agent Blueprint Package. |
| **Design Studio** | The subsystem responsible for intake and blueprint generation. Comprises the Intake Engine and Generation Engine. |
| **Control Plane** | The subsystem responsible for governance, registry, and lifecycle management of agents. |
| **Intake Engine** | The component that captures enterprise requirements, constraints, and preferences for agent creation. |
| **Generation Engine** | The component that produces an Agent Blueprint Package from intake data. |
| **Governance Validator** | The component that validates a blueprint against enterprise policies, compliance rules, and safety constraints. |
| **Agent Registry** | The component that stores, versions, and manages Agent Blueprint Packages. |
| **Blueprint Review UI** | The human-facing interface for reviewing, approving, or requesting changes to generated blueprints. |
| **White-label** | The capability for enterprises to brand and customize Intellios-generated agents as their own. |
| **Enterprise** | A customer organization that uses Intellios to create and manage agents. |
| **Policy** | A set of rules defined by an enterprise that constrain agent behavior, capabilities, or data access. |
| **Lifecycle** | The stages an agent passes through: design, generation, review, approval, deployment, monitoring, retirement. |
| **ADR** | Architectural Decision Record. A document that captures a significant technical or architectural decision. |
| **Validation Report** | The output of the Governance Validator for a given ABP. Contains valid (bool), violations (list), policyCount, and generatedAt. Stored in agent_blueprints.validation_report. |
| **Violation** | A single policy rule failure in a Validation Report. Contains the policy name, rule ID, field path, severity (error/warning), message, and an optional Claude-generated remediation suggestion. |
| **Intake Session** | A database record representing one intake conversation between a designer and the Intake Engine. Stores the progressive intake_payload and all messages. |
| **Lifecycle State Machine** | The set of valid status transitions for an ABP: draft to in_review to approved/rejected to deprecated. in_review to draft is also valid (request changes). |
| **Review Queue** | The list of ABPs currently in in_review status, accessible at /review. Entry point for human reviewers. |
| **Studio** | Shorthand for the Blueprint Studio — the /blueprints/[id] page where designers preview and refine a generated ABP before submitting for review. |
| **OQ** | Open Question. A tracked unresolved decision recorded in docs/open-questions.md with an OQ-NNN identifier. |
