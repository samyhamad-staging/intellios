# ADR-029: Jira and Confluence as mandatory evidence surfaces

**Status:** accepted
**Date:** 2026-04-23
**Accepted:** 2026-04-23
**Supersedes:** (none)

## Context

CLAUDE.md's "Documentation Updates — MANDATORY" checklist covered eight repo-internal artifacts (spec, roadmap, session log, effort log, architecture, ADRs, open questions, project journal). It did not require any update to Jira or Confluence. In practice this produced two asymmetries:

1. The SCRUM Jira project and the Intellios Confluence space exist as mirrors of the repo, but they kept drifting out of sync. A spec change in the repo did not automatically produce a Confluence edit, and implementation work did not consistently map back to a Story. Samy (Product Manager and primary human reviewer) does most of his status checks in Jira and Confluence, so drift is invisible to Claude but immediately visible to Samy.

2. Claude's working memory of which ADR is being implemented, which Story it maps to, and which Confluence page describes it was recomputed every session from first principles. This burned tokens and occasionally produced inconsistencies (e.g., Jira Story summaries quoting outdated ADR wording).

The Jira Playbook (Confluence page 2752514) already defined the structure for how Jira should be used — label taxonomy, description template, epic map, JQL conventions — but it was a reference document, not a commitment. Nothing in CLAUDE.md required Claude to actually use it every session. This ADR promotes the Playbook's conventions from "reference" to "rule" by wiring them into the mandatory checklist.

## Decision

Two additions to CLAUDE.md's "Documentation Updates — MANDATORY" checklist, and one extension to the closing rule.

**Item 9 — Jira.** Implementation work is tied to a SCRUM Story.
- *Session-start:* identify or create the Story, transition it to **In Progress**, record the key in the session-log front-matter.
- *Mid-session:* tick off acceptance-criteria checkboxes as they complete.
- *Session-close:* post a Story comment with a one-paragraph summary and the commit SHA(s); transition to **Done** if fully shipped.
- *ADR acceptance:* add a confirming comment to the linked Story.
- *New scope:* create a Story under the correct Epic with `sys:*`, `concern:*`, and `adr-NNN` labels per the Jira Playbook.
- *Exemption:* meta / governance sessions — CLAUDE.md edits, ADR authoring, pure documentation work — use the ADR + session log as sufficient evidence and do not require a Story.

**Item 10 — Confluence.** The Intellios Confluence space mirrors the repo.
- Repo doc changes during a session (spec, ADR status, roadmap, journal) require matching Confluence edits in the same session.
- New ADRs get a new child page under the ADR index; accepted ADRs have their status flipped on the Confluence page.
- The Intellios Home "Last sync" line bumps at session close.

**Closing-rule extension.** The existing "do not commit code without committing the corresponding documentation update" extends to "do not close a session without the Jira comment and any Confluence mirrors in place."

## Consequences

**Positive.**

- Samy sees effort and currency in his primary surfaces (Jira, Confluence) without having to read the repo.
- Every ADR-to-implementation trace becomes three-way: ADR file → Jira Story → Confluence page. Any two can reconstruct the third.
- Session-start Jira-Story alignment surfaces scope creep earlier. If the Story doesn't exist, the scope wasn't planned — that's a prompt to pause and scope it.
- Meta / governance work is explicitly exempted from the Story requirement, so this ADR itself can be authored without a Story while still honoring the rule.
- The Jira Playbook (page 2752514) becomes load-bearing: following it is no longer optional.

**Negative.**

- Per-session overhead increases: roughly one Jira API call at session start (transition), a handful at session end (comment, transition, maybe close), and one-to-three Confluence edits where applicable. Acceptable given the audit value, and the new Story-creation-at-scope-time cost is offset by not rebuilding the same context next session.
- Confluence edits require the Atlassian MCP connector. Offline sessions can't mirror in real time — mitigation is a "pending mirrors" note in the session log, resolved in the next online session.
- Payload-size gotcha already documented in memory (`intellios_jira_setup.md`) applies. Bulk `searchJiraIssuesUsingJql` with wide filters still blows past context limits. Narrow queries by epic or label, not by project.
- Discipline decay risk: if a few sessions skip the Jira comment, the audit trail silently degrades. Mitigation: this rule is in CLAUDE.md, which is re-read at the top of every session, so the reminder is unavoidable.

## References

- [CLAUDE.md — Documentation Updates checklist](../../CLAUDE.md)
- [Jira Playbook (Confluence page 2752514)](https://samyhamad.atlassian.net/wiki/spaces/INTELLIOS/pages/2752514)
- [Intellios Home (Confluence page 458925)](https://samyhamad.atlassian.net/wiki/spaces/INTELLIOS/overview)
- [SCRUM Jira project](https://samyhamad.atlassian.net/jira/software/projects/SCRUM)
