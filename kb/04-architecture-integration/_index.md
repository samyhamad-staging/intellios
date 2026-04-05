---
id: "04-INDEX"
title: "Architecture & Integration"
slug: "architecture-integration-index"
type: "reference"
audiences:
  - "executive"
  - "compliance"
  - "engineering"
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
tags:
  - "section-index"
tldr: >
  Navigation index for Architecture & Integration
---

# Architecture & Integration

> Technical deep dives into system design, data flow, APIs, and integration patterns for architects and engineers implementing Intellios.

## In This Section

| Article | Type | Audiences | Description |
|---|---|---|---|
| [System Architecture](system-architecture.md) | Reference | EN, AR | Comprehensive technical architecture covering subsystems, infrastructure stack, API routes, database schema, and scalability considerations |
| [Data Flow](data-flow.md) | Concept | EN, AR | End-to-end data transformations through six phases: Intake, Generation, Governance, Review, Versioning, and Deployment with sequence diagrams and code examples |
| [Runtime Adapter Pattern](runtime-adapter-pattern.md) | Concept | AR, EN | Extensible adapter design for connecting agents to external runtimes |
| [API Reference](api-reference/_index.md) | Reference | EN | Complete REST API documentation: Intake, Blueprints, Registry, Governance, Review |
| [AgentCore Integration](agentcore-integration.md) | Task | EN, AR | Deploy Intellios agents with Microsoft Azure AgentCore for enterprise-grade AI orchestration |
| [AI Foundry Integration](ai-foundry-integration.md) | Task | EN, AR | Connect to Microsoft Azure AI Foundry for model versioning, monitoring, and production deployment |
| [Webhook Integration](webhook-integration.md) | Task | EN | Integrate Intellios events into external systems via webhooks for automation and monitoring |
| [Database Schema](database-schema.md) | Reference | EN, AR | Complete Drizzle ORM schema: tables, relationships, indexes, and migration procedures |
| [Deployment Guide](deployment-guide.md) | Task | EN, AR, OPS | Production deployment procedures: infrastructure setup, security hardening, scaling, and monitoring |

## Suggested Reading Order

1. **[System Architecture](system-architecture.md)** — Start with the high-level subsystem design and component relationships
2. **[Data Flow](data-flow.md)** — Understand how data moves through the platform lifecycle
3. **[Runtime Adapter Pattern](runtime-adapter-pattern.md)** — Learn the extensibility model for connecting external systems
4. **[API Reference](api-reference/_index.md)** — Reference the REST APIs for intake, generation, governance, and deployment
5. **[Database Schema](database-schema.md)** — Review data models and relationships
6. **[Deployment Guide](deployment-guide.md)** — Deploy Intellios in your infrastructure
7. **[AgentCore Integration](agentcore-integration.md)** — Integrate with Azure AgentCore
8. **[AI Foundry Integration](ai-foundry-integration.md)** — Connect to Azure AI Foundry
9. **[Webhook Integration](webhook-integration.md)** — Set up event-driven automation

## Audiences

- **AR** — Architect
- **EN** — Engineer
- **OPS** — Operations team

## Related Sections

- [Core Concepts](../03-core-concepts/_index.md) — Understand ABP, governance, and lifecycle concepts before diving into architecture
- [Getting Started](../02-getting-started/_index.md) — Follow setup guides before implementing integrations
- [Administration & Operations](../07-administration-operations/_index.md) — Learn operational considerations after architecture review
