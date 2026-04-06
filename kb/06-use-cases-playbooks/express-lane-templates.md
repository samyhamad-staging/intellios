---
id: 06-007
title: 'Express-Lane Templates: Rapid Agent Onboarding'
slug: express-lane-templates
type: task
audiences:
- product
- engineering
status: published
version: 1.0.0
platform_version: 1.0.0
created: '2026-04-05'
updated: '2026-04-05'
author: Intellios
reviewers: []
tags:
- workflows
- templates
- design-studio
- intake
- agent-creation
prerequisites:
- 03-001
- 03-008
- 03-002
related:
- 06-002
- 06-003
- 05-010
next_steps:
- 03-011
- 06-007
feedback_url: https://feedback.intellios.ai/kb
tldr: 'Express-lane templates are pre-configured intake paths for common agent types
  (claims processor, chatbot, document analyzer, etc.). They reduce design time by
  automating setup: populating standard governance policies, providing example capabilities,
  and shortcutting the conversational intake for well-understood patterns. This guide
  explains what templates are, how to use built-in templates, how to create custom
  templates, when to use them, and how templates are governed.

  '
---



# Express-Lane Templates: Rapid Agent Onboarding

> **TL;DR:** Express-lane templates are pre-configured intake paths for common agent types (claims processor, chatbot, document analyzer, etc.). They reduce design time by automating setup: populating standard governance policies, providing example capabilities, and shortcutting the conversational intake for well-understood patterns. This guide explains what templates are, how to use built-in templates, how to create custom templates, when to use them, and how templates are governed.

## Overview

Building a new agent from scratch requires careful thought about capabilities, constraints, and governance. For a first-time user, the full conversational intake process can take 1-2 hours. For organizations deploying multiple agents of similar types (e.g., multiple claims processing agents for different departments), this overhead becomes burdensome.

**Express-lane templates** solve this problem. A template is a pre-configured intake path that:

- Populates standard agent metadata (type, deployment model, data sensitivity).
- Includes example capabilities, constraints, and behavior instructions.
- Specifies applicable governance policies upfront.
- Shortcircuits the conversational intake for well-understood decisions.
- Allows customization while guiding users toward compliant configurations.

For a typical organization, using a template can reduce agent onboarding time from 2 hours to 15-30 minutes. This guide explains how to use, create, and govern templates.

---

## What Are Express-Lane Templates?

An express-lane template is a parameterized Agent Blueprint Package (ABP) with:

1. **Fixed Structure** — The template defines which sections of the ABP are predefined, which are customizable, and which are required.
2. **Governance Binding** — The template specifies which governance policies automatically apply to agents created from this template.
3. **Guided Questions** — For customizable sections, the template provides a simplified form-based intake instead of conversational intake.
4. **Examples & Guidance** — The template includes example capabilities, constraints, and instructions to guide the user.

### Template Anatomy

```yaml
template:
  id: "tmpl-claims-processor"
  name: "Claims Processing Agent"
  description: "Automate claims intake, validation, and routing"
  category: "insurance"
  deployment_model: "internal_only"  # Fixed
  data_sensitivity: "regulated"        # Fixed

  # Customizable section
  customizable:
    agent:
      name: "PARAM: {agent_name}"
      description: "PARAM: {agent_description}"
      # User provides these via form

    capabilities:
      tools:
        - name: "submit_claim"
          description: "PARAM: {claim_type}"
          # User specifies what types of claims this agent handles
        - name: "validate_coverage"
          # Predefined, not customizable
        - name: "route_claim"
          # Predefined, not customizable

    constraints:
      # Predefined, based on template's regulatory requirements
      denied_actions:
        - "Approve or deny claims without human review"
        - "Modify or delete claim records"
      rate_limits:
        - "max 1000 claims per hour"  # User can adjust threshold

  # Governance binding
  governance_policies:
    - "Claims Audit Policy"           # Automatically enforced
    - "Data Security Policy"          # Automatically enforced
    - "Fair Handling Policy"          # Automatically enforced
    # These policies are non-negotiable; agents from this template must satisfy them

  # Simplified intake form
  intake_form:
    questions:
      - id: "agent_name"
        label: "Agent Name"
        type: "text"
        required: true
        validation: "max 50 chars"

      - id: "claim_type"
        label: "What types of claims does this agent process?"
        type: "checkbox"
        options:
          - "Auto Claims"
          - "Homeowner Claims"
          - "Commercial Claims"
          - "Other (specify)"
        required: true

      - id: "escalation_threshold"
        label: "Claims above what amount require manager approval?"
        type: "number"
        default: 50000
        unit: "USD"
        required: true

      - id: "approval_group"
        label: "Which team should approve agent changes?"
        type: "select"
        options: ["Loss Control", "Claims Operations", "Compliance"]
        required: true
```

---

## Using Built-In Templates

### Step 1: Access Templates

In the Intellios Design Studio, click **"Create Agent"** → **"Start from Template"** (instead of "New Blank Agent").

The template gallery displays available templates:

```
┌─────────────────────────────────────────────────┐
│  EXPRESS-LANE TEMPLATES                         │
├─────────────────────────────────────────────────┤
│ Insurance                                       │
│  ☐ Claims Processing Agent                      │
│  ☐ Underwriting Assistant                       │
│  ☐ Fraud Investigation Agent                    │
│  ☐ Policy Recommendation Agent                  │
│                                                 │
│ Healthcare                                      │
│  ☐ Clinical Decision Support Agent              │
│  ☐ Patient Scheduling Agent                     │
│  ☐ Medical Coding Assistant                     │
│  ☐ Prior Authorization Processor                │
│                                                 │
│ Generic / Utility                               │
│  ☐ Customer Chatbot                             │
│  ☐ Document Analyzer                            │
│  ☐ Data Classification Agent                    │
│                                                 │
│ [Browse All Templates]                          │
└─────────────────────────────────────────────────┘
```

### Step 2: Select a Template

Click on a template to view details:

```
╔═════════════════════════════════════════════════╗
║ CLAIMS PROCESSING AGENT                         ║
╠═════════════════════════════════════════════════╣
║                                                 ║
║ Purpose:                                        ║
║ Automate claims intake, validation, and routing║
║                                                 ║
║ Typical Use Cases:                              ║
║ - Auto insurance claims                         ║
║ - Homeowner insurance claims                    ║
║ - Property & casualty claims                    ║
║                                                 ║
║ Governance Policies (automatically enforced):  ║
║ ✓ Claims Audit Policy                           ║
║ ✓ Data Security Policy                          ║
║ ✓ Fair Handling Policy                          ║
║ ✓ Human Oversight Policy                        ║
║                                                 ║
║ Estimated Setup Time: 20 minutes                ║
║ Complexity: Beginner                            ║
║                                                 ║
║ [Start from This Template]                      ║
╚═════════════════════════════════════════════════╝
```

### Step 3: Complete Intake Form

Instead of the full conversational intake, you complete a guided form:

```
┌─────────────────────────────────────────────────┐
│ CLAIMS PROCESSING AGENT — INTAKE FORM            │
├─────────────────────────────────────────────────┤
│                                                 │
│ Agent Name *                                    │
│ [Auto Claims Intake Bot_________________]       │
│                                                 │
│ Description (optional)                          │
│ [Accepts initial claims submissions from       │
│  customers via web form and routes to         │
│  appropriate adjusters...]                     │
│                                                 │
│ Claim Types Handled *                           │
│ ☑ Auto Claims                                   │
│ ☐ Homeowner Claims                              │
│ ☐ Commercial Claims                             │
│ ☐ Other (specify): [____________]               │
│                                                 │
│ Escalation Threshold (USD) *                    │
│ [50000____________]                             │
│ Claims above this amount require manager       │
│ approval before routing.                        │
│                                                 │
│ Approval Group *                                │
│ [Claims Operations           ▼]                 │
│                                                 │
│ [Continue] [Back]                               │
└─────────────────────────────────────────────────┘
```

The form is much shorter than the conversational intake. It asks only the questions necessary to instantiate the template.

### Step 4: Review Pre-Populated ABP

The system generates an ABP based on your form answers:

```
agent:
  id: "auto-claims-intake-v1"
  name: "Auto Claims Intake Bot"
  description: "Accepts initial claims submissions from customers..."
  deployment_type: "customer-facing"
  data_sensitivity: "regulated"

capabilities:
  tools:
    - name: "submit_claim"
      description: "Accept auto insurance claim submission"
      ...
    - name: "validate_coverage"
      ...
    - name: "route_claim"
      ...

constraints:
  denied_actions:
    - "Approve or deny claims without human review"
    - "Modify or delete claim records"
  rate_limits:
    - "max 1000 claims per hour"

governance:
  applicable_regulations:
    - "State Insurance Regulations"
    - "NAIC Guidelines"
  audit_logging:
    enabled: true
    retention_days: 2555
  approval_thresholds:
    - "Claims > $50,000 require manager approval"
  escalation_rules:
    - "Missing required documentation → escalate to human"

governance_policies:
  - "Claims Audit Policy"
  - "Data Security Policy"
  - "Fair Handling Policy"
  - "Human Oversight Policy"
```

Review the ABP. You can edit any section before proceeding.

### Step 5: Governance Validation

The system automatically runs governance validation:

```
╔═════════════════════════════════════════════════╗
║ GOVERNANCE VALIDATION                           ║
╠═════════════════════════════════════════════════╣
║                                                 ║
║ ✓ Claims Audit Policy ........................ PASS
║ ✓ Data Security Policy ....................... PASS
║ ✓ Fair Handling Policy ....................... PASS
║ ✓ Human Oversight Policy ..................... PASS
║                                                 ║
║ Result: ALL POLICIES PASS                       ║
║                                                 ║
║ [Proceed to Review] [Edit ABP]                  ║
╚═════════════════════════════════════════════════╝
```

If any policies fail, you can edit the ABP to fix violations or request a policy exception.

### Step 6: Human Review & Approval

The generated ABP goes to the review queue for human approval (same as a blank agent). Reviewers verify that the customizations are appropriate.

### Step 7: Deployment

Once approved, the agent is deployed and ready to use.

---

## Creating Custom Templates

If your organization frequently builds agents of a new type, you can create a custom template.

### Prerequisites

To create a template, you need:

1. **A working agent** — An agent that already exists and is approved.
2. **Permission** — Template creation requires compliance or architecture team approval.
3. **Governance policies** — You should have identified the policies that will be bound to this template.

### Step 1: Identify Template Parameters

Define what is fixed and what is customizable. For example:

```
Template: "Claims Processing Agent"

Fixed Sections:
- deployment_type: "customer-facing"
- data_sensitivity: "regulated"
- denied_actions: ["Approve or deny claims without human review"]
- audit_logging: enabled
- applicable_regulations: ["State Insurance Regulations", "NAIC Guidelines"]

Customizable Sections:
- agent.name: PARAM: {agent_name}
- agent.description: PARAM: {agent_description}
- capabilities.tools[0].description: PARAM: {claim_types}
- constraints.rate_limits[0].threshold: PARAM: {max_claims_per_hour}
- constraints.approval_thresholds: PARAM: {escalation_amount}

Guided Questions:
- What is the agent name?
- What claim types does it handle?
- What is the escalation threshold for manager approval?
```

### Step 2: Document Template Rationale

Create a template specification document:

```markdown
# Claims Processing Agent Template

## Purpose
Enable rapid onboarding of insurance claims processing agents while ensuring compliance with regulatory and governance requirements.

## Target Users
Claims operations teams, insurance carriers

## Typical Use Cases
- Auto insurance claims intake
- Homeowner insurance claims intake
- Property & casualty claims intake

## Governance Policies (Non-Negotiable)
- Claims Audit Policy: All claims must be logged with decision path
- Data Security Policy: PII must be redacted in logs
- Fair Handling Policy: Escalation rules must be based on claim characteristics, not demographics
- Human Oversight Policy: Claims above threshold require human approval

## Customizable Elements
- Agent name and description
- Claim types handled
- Escalation thresholds
- Approval group

## Fixed Elements
- Deployment type: customer-facing
- Data sensitivity: regulated
- Denied actions: approve/deny without human review
- Audit logging: 7-year retention

## Estimated Setup Time
15-20 minutes (vs. 2 hours for blank agent)

## Known Limitations
- Does not support internal-only claims processing (requires blank agent)
- Does not support claims approval automation (designed for intake only)
```

### Step 3: Create Template in Intellios

In the Admin Console, navigate to **"Governance & Policies"** → **"Templates"** → **"Create Template"**.

```
┌─────────────────────────────────────────────────┐
│ CREATE NEW TEMPLATE                             │
├─────────────────────────────────────────────────┤
│                                                 │
│ Template ID *                                   │
│ [tmpl-claims-processor________________]         │
│                                                 │
│ Template Name *                                 │
│ [Claims Processing Agent_________________]      │
│                                                 │
│ Category *                                      │
│ [Insurance_____________________▼]               │
│                                                 │
│ Description                                     │
│ [Automates claims intake, validation,           │
│  and routing for insurance carriers...]         │
│                                                 │
│ Base ABP Version                                │
│ [Select Existing Agent ▼]                       │
│ This agent will be used as the template base.  │
│                                                 │
│ Governance Policies (Select all that apply)     │
│ ☑ Claims Audit Policy                           │
│ ☑ Data Security Policy                          │
│ ☑ Fair Handling Policy                          │
│ ☑ Human Oversight Policy                        │
│                                                 │
│ [Next] [Back]                                   │
└─────────────────────────────────────────────────┘
```

### Step 4: Define Template Parameters

Specify which parts of the ABP are fixed and which are customizable:

```
┌─────────────────────────────────────────────────┐
│ TEMPLATE PARAMETERS                             │
├─────────────────────────────────────────────────┤
│                                                 │
│ agent.name                                      │
│ ○ Fixed: [Auto Claims Intake Bot]              │
│ ● Customizable: PARAM {agent_name}              │
│                                                 │
│ agent.description                               │
│ ○ Fixed                                         │
│ ● Customizable: PARAM {agent_description}       │
│                                                 │
│ capabilities.tools[0].description               │
│ ○ Fixed                                         │
│ ● Customizable: PARAM {claim_types}             │
│                                                 │
│ constraints.approval_thresholds[0].amount       │
│ ○ Fixed: 50000                                  │
│ ● Customizable: PARAM {escalation_amount}       │
│    Default: 50000, Min: 10000, Max: 500000      │
│                                                 │
│ [Next] [Back]                                   │
└─────────────────────────────────────────────────┘
```

### Step 5: Create Intake Form Questions

Define the guided questions for users:

```
┌─────────────────────────────────────────────────┐
│ INTAKE FORM QUESTIONS                           │
├─────────────────────────────────────────────────┤
│                                                 │
│ [+ Add Question]                                │
│                                                 │
│ Question 1:                                     │
│ Label: "Agent Name"                             │
│ Type: Text                                      │
│ Required: Yes                                   │
│ Validation: max 50 characters                   │
│ Maps to: agent.name                             │
│                                                 │
│ Question 2:                                     │
│ Label: "Claim Types Handled"                    │
│ Type: Checkbox                                  │
│ Options:                                        │
│   - Auto Claims                                 │
│   - Homeowner Claims                            │
│   - Commercial Claims                           │
│ Maps to: capabilities.tools[0].description      │
│                                                 │
│ Question 3:                                     │
│ Label: "Escalation Threshold (USD)"             │
│ Type: Number                                    │
│ Default: 50000                                  │
│ Min: 10000, Max: 500000                         │
│ Unit: USD                                       │
│ Maps to: constraints.approval_thresholds[0]     │
│                                                 │
│ [Create Template] [Back]                        │
└─────────────────────────────────────────────────┘
```

### Step 6: Publish Template

Once all parameters are defined, click **"Publish Template"**. The template is now available to users in the template gallery.

```
Status: PUBLISHED
Availability: All users in [ORGANIZATION]
Version: 1.0.0
Published: 2026-04-05
Published By: [YOUR_NAME]
```

---

## When to Use Templates vs. Blank Agents

| Scenario | Use Template | Use Blank Agent |
|----------|--------------|-----------------|
| Building a second claims processing agent | ✓ | |
| Building your first agent of a type | Depends | |
| Building an agent with unique requirements | | ✓ |
| Building an agent that doesn't fit any template | | ✓ |
| Building multiple agents of the same type | ✓ | |
| Building an internal-only agent from a customer-facing template | | ✓ (template doesn't fit) |
| Learning how to build agents | Depends | ✓ (more educational) |

**Recommendation:** If a template exists that matches your use case, use it. If you need to deviate significantly from the template, use a blank agent. After building 2-3 agents of a new type, create a custom template for future agents of that type.

---

## Template Governance

Templates themselves are governed. They must comply with the same governance policies as agents:

### 1. Template Approval

Before a template is published, it must be reviewed and approved by:

- **Product/Architecture Team** — Confirms that the template architecture is sound and generalizable.
- **Compliance Officer** — Confirms that the template's governance policies are appropriate and enforceable.
- **Legal/Risk Team** (if applicable) — Confirms that the template aligns with organizational risk appetite.

### 2. Template Versioning

Templates are versioned like agents:

```
tmpl-claims-processor:
  v1.0.0: Initial release (2026-04-05)
  v1.1.0: Added "Other" claim type option (2026-05-10)
  v2.0.0: Updated audit retention to 7 years (2026-06-01)
```

When a template is updated, all agents created from that template are notified (but not automatically updated). Users can opt-in to upgrade their agent to use the new template version.

### 3. Template Retirement

When a template is no longer needed, it can be retired:

```
Status: RETIRED (as of 2026-09-01)
Reason: Consolidated with Generic Claims Processing Template
Redirect: tmpl-claims-processor-generic v2.0.0
Agents on this template: 12 (all grandfathered in, no new agents can be created)
```

Retiring a template does not affect agents already created from it, but prevents new agents from being created.

### 4. Template Audit Trail

All template changes are logged:

```
Template ID: tmpl-claims-processor
Version: 1.0.0 → 1.1.0
Published: 2026-05-10
Published By: [TEMPLATE_OWNER]
Changes:
  - Added optional "Other" claim type
  - Updated escalation threshold default from $50k to $75k
  - Added new intake question: "Approval group"
Reviewed By: [COMPLIANCE_OFFICER]
Approval Status: APPROVED
Agents using this template: 8
```

---

## Managing Templates Over Time

### Monitoring Template Usage

Track which templates are most used:

```
Template Usage (Last 30 Days):

tmpl-claims-processor: 12 new agents
tmpl-chatbot-generic: 8 new agents
tmpl-document-analyzer: 5 new agents
tmpl-underwriting-assistant: 3 new agents
tmpl-clinical-decision-support: 2 new agents

Trends:
- Claims processing demand is growing
- Generic chatbots remain popular
- Clinical decision support adoption is low (may need marketing)
```

### Feedback & Improvements

Collect feedback from users on templates:

```
Question: "Did the template save you time?"
  - Yes, saved 1-2 hours: 85%
  - Somewhat helpful: 10%
  - No, had to customize heavily: 5%

Question: "Would you use this template again?"
  - Yes: 90%
  - Maybe: 8%
  - No: 2%

Common feedback:
- "Need a template for internal-only claims agents" (requested by 3 users)
- "Would like more customization for escalation rules" (requested by 2 users)
```

Incorporate feedback into new template versions or new templates.

### Sunset Unused Templates

If a template has not been used in 6 months, consider retiring or consolidating it:

```
Candidate Retirement (no usage in 6+ months):
- tmpl-patient-intake: 0 uses in last 6 months
  → Covered by tmpl-healthcare-intake (more general)
  → Recommend retirement with redirect
```

---

## Best Practices

1. **Start Specific, Generalize Over Time** — Create templates for your most common agent types first. As you learn patterns, create more general-purpose templates.

2. **Balance Guidance with Flexibility** — Templates should guide users but not be overly restrictive. If you find users always customizing the same elements, consider making them configurable.

3. **Document Rationale** — Include a "When to Use This Template" section in template documentation so users know when a template applies.

4. **Version Governance Policies** — When you update governance policies, consider versioning templates. Users can choose to upgrade to the new template version.

5. **Collect Feedback** — Ask users whether templates are helpful. Use feedback to improve existing templates and identify new template opportunities.

6. **Review Regularly** — Quarterly, review template usage, feedback, and retirement candidates.

---

## Next Steps

Now that you understand express-lane templates, you can:

1. **Browse Existing Templates** — Log into Intellios Design Studio and explore the built-in templates.
2. **Use a Template** — Create your first agent using a template.
3. **Propose Custom Templates** — If your organization builds multiple agents of a type, propose creating a custom template.
4. **Provide Feedback** — Help improve templates by reporting what worked and what didn't.

For detailed guidance on specific agent types, see:

- **[Insurance Scenarios](insurance-scenarios.md)** — Patterns for insurance agents, including claims, underwriting, fraud, recommendations.
- **[Healthcare Scenarios](healthcare-scenarios.md)** — Patterns for healthcare agents, including clinical decision support, scheduling, coding.
- **[Governance Policy Guide](../05-governance-compliance/policy-authoring-guide.md)** — Deep dive into policy definition.

---

*See also: [Insurance Scenarios](insurance-scenarios.md), [Healthcare Scenarios](healthcare-scenarios.md), [Agent Blueprint Package](../03-core-concepts/agent-blueprint-package.md)*

*Next: [Creating Your First Agent](../02-getting-started/engineer-setup-guide.md)*
