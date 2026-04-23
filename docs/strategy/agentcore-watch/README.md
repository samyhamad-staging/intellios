# AgentCore Watch — Monthly Review Cadence

This directory contains monthly release-notes reviews of Amazon Bedrock AgentCore, tracking feature announcements against Intellios's governance surface to surface platform-encroachment risk early.

## Purpose

Risk S1 from `docs/strategy/2026-04-23_strategic-direction-memo.md`: *"AWS AgentCore ships native governance that subsumes Intellios."* This is the single highest-severity strategic risk to the wedge. Monitoring explicitly — per Epic 2.3.1 — is the earliest viable mitigation.

## Cadence

One review per month, on or around the first week of the month. Reviews are triggered early if a material AWS announcement lands mid-month (re:Invent, re:Inforce, or an explicitly flagged "governance" announcement from the Bedrock team).

## Trigger conditions for an early review

- AWS announces a feature containing the words "governance," "approval workflow," "policy enforcement," "lifecycle management," or "evidence" in the context of Bedrock Agents.
- A feature is announced that directly names any of Intellios's five subsystems (Intake, Generation, Governance Validator, Agent Registry, Blueprint Review).
- AWS ships a native multi-step approval chain for agent deployment.
- AWS ships a native evidence package or audit report for deployed agents.

## Overlap threshold

Per strategic memo §7 and DELIVERABLE 7 validation test #6: **any feature overlap >20% with Intellios's governance surface on any one of the three axes is material and requires action.**

The three axes:
- **(a)** Intake-to-blueprint generation
- **(b)** Policy-based governance validation
- **(c)** Lifecycle (review, deploy, invoke, retire, evidence)

If any axis crosses 20%: open OQs, recommend an ADR (do not author it in the review session — authoring belongs in a dedicated strategic session), and update the Confluence AgentCore Watch page.

## File naming

`YYYY-MM.md` — one file per month. Files are never modified after the month closes; corrections go in the next month's file.
