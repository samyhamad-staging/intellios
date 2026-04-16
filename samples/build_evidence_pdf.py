"""
Intellios Evidence Package PDF generator — sample rendering.

Produces a PDF-form rendering of the evidence-package JSON emitted by
GET /api/blueprints/[id]/evidence-package, faithful to the real 14-section
MRMReport shape + wrapper (exportMetadata, mrmReport, approvalChain,
qualityEvaluation, testEvidence).

All enterprise-specific values are hand-written seed data flagged [FR] for
founder review. Structure and field names reflect the real codebase.

Run:
    python3 build_evidence_pdf.py

Output:
    ./evidence-package-claims-triage-agent-v2.1-2026-04-09.pdf
"""

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    Table, TableStyle, KeepTogether, HRFlowable, NextPageTemplate,
    FrameBreak,
)
from reportlab.pdfgen import canvas

# =============================================================================
# BRAND / STYLE CONSTANTS
# =============================================================================

# Pulled from docs/design-tokens.md
INDIGO       = colors.HexColor("#4f46e5")   # primary brand
INDIGO_DARK  = colors.HexColor("#4338ca")   # primary hover
INDIGO_TINT  = colors.HexColor("#eef2ff")   # very light indigo bg
INK          = colors.HexColor("#0f172a")   # slate-900
INK_2        = colors.HexColor("#1e293b")   # slate-800
TEXT         = colors.HexColor("#334155")   # slate-700 body text
TEXT_MUTED   = colors.HexColor("#475569")   # slate-600 (WCAG AA)
TEXT_FADED   = colors.HexColor("#64748b")   # slate-500 (meta)
RULE         = colors.HexColor("#e2e8f0")   # slate-200 table rules
RULE_HARD    = colors.HexColor("#cbd5e1")   # slate-300
BG_SOFT      = colors.HexColor("#f8fafc")   # slate-50
CODE_BG      = colors.HexColor("#f1f5f9")   # slate-100
SUCCESS      = colors.HexColor("#059669")   # emerald-600
WARNING      = colors.HexColor("#b45309")   # amber-700 (readable)
DANGER       = colors.HexColor("#b91c1c")   # red-700 (readable)
FR_BG        = colors.HexColor("#fef3c7")   # amber-100
FR_TEXT      = colors.HexColor("#92400e")   # amber-800

PAGE_W, PAGE_H = LETTER
MARGIN_L = 0.75 * inch
MARGIN_R = 0.75 * inch
MARGIN_T = 1.00 * inch     # room for running header
MARGIN_B = 0.85 * inch     # room for page number

FRAME_W = PAGE_W - MARGIN_L - MARGIN_R
FRAME_H = PAGE_H - MARGIN_T - MARGIN_B

# =============================================================================
# STYLES
# =============================================================================

styles = getSampleStyleSheet()

def mk(name, **kw):
    base = kw.pop("parent", styles["Normal"])
    return ParagraphStyle(name, parent=base, **kw)

S = {
    "cover_eyebrow": mk("cover_eyebrow",
        fontName="Helvetica-Bold", fontSize=9, textColor=INDIGO,
        leading=11, spaceAfter=6, letterSpacing=1.5),
    "cover_title": mk("cover_title",
        fontName="Times-Bold", fontSize=42, textColor=INK,
        leading=46, spaceAfter=8),
    "cover_subtitle": mk("cover_subtitle",
        fontName="Times-Roman", fontSize=16, textColor=TEXT_MUTED,
        leading=20, spaceAfter=24),
    "cover_meta_k": mk("cover_meta_k",
        fontName="Helvetica-Bold", fontSize=8, textColor=INDIGO,
        leading=10, letterSpacing=0.6),
    "cover_meta_v": mk("cover_meta_v",
        fontName="Helvetica", fontSize=11, textColor=INK_2,
        leading=14),
    "cover_meta_v_mono": mk("cover_meta_v_mono",
        fontName="Courier", fontSize=10, textColor=INK_2,
        leading=14),
    "cover_footer": mk("cover_footer",
        fontName="Helvetica-Oblique", fontSize=8, textColor=TEXT_FADED,
        leading=11, alignment=TA_CENTER),
    "classification": mk("classification",
        fontName="Helvetica-Bold", fontSize=10, textColor=colors.white,
        leading=12, alignment=TA_CENTER, letterSpacing=2),

    # Section / body
    "h1": mk("h1",
        fontName="Times-Bold", fontSize=22, textColor=INK,
        leading=26, spaceBefore=0, spaceAfter=4),
    "h1_rule": mk("h1_rule",
        fontName="Helvetica", fontSize=8, textColor=INDIGO,
        leading=10, spaceAfter=14, letterSpacing=1.2),
    "h2": mk("h2",
        fontName="Helvetica-Bold", fontSize=12, textColor=INK,
        leading=15, spaceBefore=14, spaceAfter=6),
    "h3": mk("h3",
        fontName="Helvetica-Bold", fontSize=10, textColor=INDIGO,
        leading=13, spaceBefore=10, spaceAfter=4, letterSpacing=0.5),
    "body": mk("body",
        fontName="Helvetica", fontSize=10, textColor=TEXT,
        leading=14, spaceAfter=6, alignment=TA_LEFT),
    "body_justify": mk("body_justify",
        fontName="Helvetica", fontSize=10, textColor=TEXT,
        leading=14, spaceAfter=6, alignment=TA_JUSTIFY),
    "meta": mk("meta",
        fontName="Helvetica", fontSize=8.5, textColor=TEXT_FADED,
        leading=11, spaceAfter=4),
    "callout_body": mk("callout_body",
        fontName="Helvetica", fontSize=9.5, textColor=INK_2,
        leading=13, leftIndent=10, rightIndent=10,
        spaceBefore=4, spaceAfter=4),

    # Mono / code
    "mono": mk("mono",
        fontName="Courier", fontSize=8.5, textColor=INK_2, leading=11),
    "mono_small": mk("mono_small",
        fontName="Courier", fontSize=7.5, textColor=INK_2, leading=10),

    # Tables
    "th": mk("th",
        fontName="Helvetica-Bold", fontSize=8, textColor=colors.white,
        leading=10, alignment=TA_LEFT, letterSpacing=0.5),
    "td": mk("td",
        fontName="Helvetica", fontSize=8.5, textColor=INK_2, leading=11),
    "td_mono": mk("td_mono",
        fontName="Courier", fontSize=7.5, textColor=INK_2, leading=10),
    "td_muted": mk("td_muted",
        fontName="Helvetica", fontSize=8, textColor=TEXT_FADED, leading=11),
    "td_center": mk("td_center",
        fontName="Helvetica", fontSize=8.5, textColor=INK_2,
        leading=11, alignment=TA_CENTER),

    # KV row
    "kv_k": mk("kv_k",
        fontName="Helvetica-Bold", fontSize=8, textColor=INDIGO,
        leading=10, letterSpacing=0.5),
    "kv_v": mk("kv_v",
        fontName="Helvetica", fontSize=9.5, textColor=INK_2, leading=13),
    "kv_v_mono": mk("kv_v_mono",
        fontName="Courier", fontSize=8.5, textColor=INK_2, leading=12),

    # Footnote
    "footnote": mk("footnote",
        fontName="Helvetica-Oblique", fontSize=7.5, textColor=TEXT_FADED,
        leading=10, spaceBefore=4, spaceAfter=2),
    "footnote_body": mk("footnote_body",
        fontName="Helvetica", fontSize=8, textColor=TEXT_MUTED,
        leading=11, spaceBefore=4, spaceAfter=4),

    # Signature
    "sig_label": mk("sig_label",
        fontName="Helvetica-Bold", fontSize=7.5, textColor=INDIGO,
        leading=9, letterSpacing=0.6),
    "sig_name": mk("sig_name",
        fontName="Helvetica-Bold", fontSize=10.5, textColor=INK,
        leading=13, spaceAfter=2),
    "sig_role": mk("sig_role",
        fontName="Helvetica", fontSize=8.5, textColor=TEXT_MUTED,
        leading=11, spaceAfter=4),
    "sig_timestamp": mk("sig_timestamp",
        fontName="Courier", fontSize=8, textColor=TEXT_FADED, leading=11),
    "sig_comment": mk("sig_comment",
        fontName="Helvetica-Oblique", fontSize=8.5, textColor=TEXT,
        leading=11, spaceBefore=3),
}

# =============================================================================
# HELPERS
# =============================================================================

def hx(c):
    """Convert a reportlab Color (or already-string hex) to '#RRGGBB'."""
    if hasattr(c, "hexval"):
        return "#" + c.hexval()[2:]
    if isinstance(c, str):
        return c if c.startswith("#") else "#" + c
    return str(c)

def fr(text=""):
    """Inline [FOUNDER REVIEW] badge."""
    label = "[FR]"
    if text:
        return f"{text}&nbsp;<font name='Helvetica-Bold' size='6' color='#92400e' backColor='#fef3c7'>&nbsp;{label}&nbsp;</font>"
    return f"<font name='Helvetica-Bold' size='6' color='#92400e' backColor='#fef3c7'>&nbsp;{label}&nbsp;</font>"

def mono(text):
    return f"<font name='Courier' size='8.5'>{text}</font>"

def chip(text, bg=INDIGO, fg="#ffffff"):
    return f"<font name='Helvetica-Bold' size='7' color='{fg}' backColor='{hx(bg)}'>&nbsp;{text}&nbsp;</font>"

def section_header(title, eyebrow="SECTION"):
    return [
        Paragraph(eyebrow.upper(), S["h1_rule"]),
        Paragraph(title, S["h1"]),
        HRFlowable(width="100%", thickness=0.8, color=INDIGO,
                   spaceBefore=2, spaceAfter=16, lineCap="round"),
    ]

def kv_table(rows, col_widths=None):
    """rows: list of (label, value_str_or_paragraph). Returns a Table."""
    data = []
    for label, value in rows:
        label_para = Paragraph(label.upper(), S["kv_k"])
        if isinstance(value, str):
            value_para = Paragraph(value, S["kv_v"])
        else:
            value_para = value
        data.append([label_para, value_para])
    widths = col_widths or [1.35*inch, FRAME_W - 1.35*inch]
    t = Table(data, colWidths=widths, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, -1), 0.25, RULE),
    ]))
    return t

def data_table(header_row, body_rows, col_widths, mono_cols=None,
               center_cols=None):
    """Generic bordered data table with indigo header."""
    mono_cols = mono_cols or []
    center_cols = center_cols or []
    head = [Paragraph(h.upper(), S["th"]) for h in header_row]
    data = [head]
    for r in body_rows:
        row_paras = []
        for i, cell in enumerate(r):
            if isinstance(cell, Paragraph):
                row_paras.append(cell)
            else:
                if i in mono_cols:
                    row_paras.append(Paragraph(str(cell), S["td_mono"]))
                elif i in center_cols:
                    row_paras.append(Paragraph(str(cell), S["td_center"]))
                else:
                    row_paras.append(Paragraph(str(cell), S["td"]))
        data.append(row_paras)
    t = Table(data, colWidths=col_widths, hAlign="LEFT", repeatRows=1)
    t.setStyle(TableStyle([
        # Header
        ("BACKGROUND", (0, 0), (-1, 0), INDIGO),
        ("VALIGN", (0, 0), (-1, 0), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        # Body
        ("VALIGN", (0, 1), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 1), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_SOFT]),
        # Rules
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, INDIGO_DARK),
        ("LINEBELOW", (0, 1), (-1, -1), 0.25, RULE),
        ("BOX", (0, 0), (-1, -1), 0.5, RULE_HARD),
    ]))
    return t

def yaml_block(title, lines, policy_type, description, fr_marker=False):
    """Render a YAML-looking code block with line numbers."""
    # Build the monospace rows
    rows = []
    for i, line in enumerate(lines, start=1):
        num = Paragraph(
            f"<font color='#94a3b8'>{i:>2}</font>",
            S["mono_small"])
        code = Paragraph(
            line.replace(" ", "&nbsp;") if line else "&nbsp;",
            S["mono_small"])
        rows.append([num, code])
    code_table = Table(rows, colWidths=[0.28*inch, FRAME_W - 0.28*inch - 16],
                       hAlign="LEFT")
    code_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("BACKGROUND", (0, 0), (-1, -1), CODE_BG),
        ("LINEAFTER", (0, 0), (0, -1), 0.5, RULE_HARD),
    ]))

    # Header bar
    fr_badge = f" {fr()}" if fr_marker else ""
    header_text = f"<b>{title}</b> &nbsp;<font color='#64748b' size='7'>type: {policy_type}</font>{fr_badge}"
    header = Paragraph(header_text, mk("yh",
        fontName="Helvetica", fontSize=9, textColor=INK_2,
        leading=11, backColor=INDIGO_TINT, borderPadding=(5, 6, 5, 6)))

    desc = Paragraph(f"<i>{description}</i>", S["meta"])

    return KeepTogether([header, Spacer(1, 2), desc, Spacer(1, 3), code_table,
                         Spacer(1, 10)])

def stat_box(label, value, value_color=INK):
    label_p = Paragraph(label.upper(), mk("sb_l",
        fontName="Helvetica-Bold", fontSize=7, textColor=INDIGO,
        leading=9, alignment=TA_CENTER, letterSpacing=0.6))
    value_p = Paragraph(str(value), mk("sb_v",
        fontName="Helvetica-Bold", fontSize=18, textColor=value_color,
        leading=22, alignment=TA_CENTER))
    t = Table([[value_p], [label_p]], colWidths=[1.55*inch], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_SOFT),
        ("BOX", (0, 0), (-1, -1), 0.5, RULE_HARD),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (0, 0), 10),
        ("BOTTOMPADDING", (0, 0), (0, 0), 2),
        ("TOPPADDING", (0, 1), (0, 1), 0),
        ("BOTTOMPADDING", (0, 1), (0, 1), 8),
    ]))
    return t

def callout(title, body_html, color=INDIGO):
    title_p = Paragraph(title,
        mk("cl_t", fontName="Helvetica-Bold", fontSize=9, textColor=color,
           leading=11, letterSpacing=0.5))
    body_p = Paragraph(body_html, S["callout_body"])
    t = Table([[title_p], [body_p]], colWidths=[FRAME_W], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_SOFT),
        ("LINEBEFORE", (0, 0), (0, -1), 3, color),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (0, 0), 8),
        ("BOTTOMPADDING", (0, 0), (0, 0), 2),
        ("TOPPADDING", (0, 1), (0, 1), 2),
        ("BOTTOMPADDING", (0, 1), (0, 1), 8),
    ]))
    return t

# =============================================================================
# PAGE DECORATIONS
# =============================================================================

def cover_page_decoration(canvas_obj, doc):
    canvas_obj.saveState()
    # Top indigo bar
    canvas_obj.setFillColor(INDIGO)
    canvas_obj.rect(0, PAGE_H - 0.3*inch, PAGE_W, 0.3*inch, fill=1, stroke=0)
    # Wordmark
    canvas_obj.setFillColor(colors.white)
    canvas_obj.setFont("Helvetica-Bold", 10)
    canvas_obj.drawString(MARGIN_L, PAGE_H - 0.19*inch, "INTELLIOS")
    canvas_obj.setFont("Helvetica", 8)
    canvas_obj.drawRightString(PAGE_W - MARGIN_R, PAGE_H - 0.19*inch,
                                "EVIDENCE PACKAGE")
    # Bottom thin rule
    canvas_obj.setStrokeColor(RULE_HARD)
    canvas_obj.setLineWidth(0.5)
    canvas_obj.line(MARGIN_L, 0.55*inch, PAGE_W - MARGIN_R, 0.55*inch)
    # Classification strip (bottom)
    canvas_obj.setFillColor(INK)
    canvas_obj.rect(0, 0, PAGE_W, 0.32*inch, fill=1, stroke=0)
    canvas_obj.setFillColor(colors.white)
    canvas_obj.setFont("Helvetica-Bold", 9)
    canvas_obj.drawCentredString(PAGE_W/2, 0.11*inch,
                                  "C O N F I D E N T I A L   \u2014   R E G U L A T O R Y   E V I D E N C E")
    canvas_obj.restoreState()

def content_page_decoration(canvas_obj, doc):
    canvas_obj.saveState()
    # Running header rule
    canvas_obj.setStrokeColor(INDIGO)
    canvas_obj.setLineWidth(0.8)
    canvas_obj.line(MARGIN_L, PAGE_H - 0.6*inch, PAGE_W - MARGIN_R,
                    PAGE_H - 0.6*inch)
    # Left header
    canvas_obj.setFillColor(INDIGO)
    canvas_obj.setFont("Helvetica-Bold", 7)
    canvas_obj.drawString(MARGIN_L, PAGE_H - 0.48*inch,
                          "INTELLIOS  /  EVIDENCE PACKAGE")
    canvas_obj.setFillColor(TEXT_MUTED)
    canvas_obj.setFont("Helvetica", 7)
    canvas_obj.drawString(MARGIN_L, PAGE_H - 0.38*inch,
                          "Claims-Triage-Agent \u00b7 v2.1 \u00b7 Acme Mutual Insurance  [FR]")
    # Right header
    canvas_obj.setFillColor(INK)
    canvas_obj.setFont("Helvetica-Bold", 7)
    canvas_obj.drawRightString(PAGE_W - MARGIN_R, PAGE_H - 0.48*inch,
                                "CONFIDENTIAL  /  REGULATORY EVIDENCE")
    canvas_obj.setFillColor(TEXT_FADED)
    canvas_obj.setFont("Helvetica", 7)
    canvas_obj.drawRightString(PAGE_W - MARGIN_R, PAGE_H - 0.38*inch,
                                "Exported 2026-04-09T14:22:11Z")

    # Footer rule
    canvas_obj.setStrokeColor(RULE)
    canvas_obj.setLineWidth(0.4)
    canvas_obj.line(MARGIN_L, 0.7*inch, PAGE_W - MARGIN_R, 0.7*inch)
    # Page number
    canvas_obj.setFillColor(TEXT_FADED)
    canvas_obj.setFont("Helvetica", 8)
    canvas_obj.drawCentredString(PAGE_W/2, 0.5*inch,
                                  f"Page {doc.page}")
    # Footer disclaimer
    canvas_obj.setFillColor(TEXT_FADED)
    canvas_obj.setFont("Helvetica-Oblique", 6.5)
    canvas_obj.drawString(MARGIN_L, 0.5*inch,
                          "Sample rendering \u00b7 v1.0")
    canvas_obj.drawRightString(PAGE_W - MARGIN_R, 0.5*inch,
                                "Intellios / Acme Mutual Insurance [FR]")
    canvas_obj.restoreState()

# =============================================================================
# SEED DATA — Hand-written faithful to real MRMReport + wrapper shape.
# Every enterprise-specific value is [FR] flagged.
# =============================================================================

SEED = {
    "exportMetadata": {
        "packageFormatVersion": "1.0",
        "exportedAt": "2026-04-09T14:22:11Z",
        "exportedBy": "maria.chen@acmemutual.com",
        "exportedByRole": "compliance_officer",
        "intellios_schema_version": "v1.0 (2026-04-09)",
    },
    "cover": {
        "agentName": "Claims-Triage-Agent",
        "currentStatus": "DEPLOYED",
        "currentVersion": "2.1",
        "enterpriseId": "ent_acme_mutual",
        "enterpriseDisplayName": "Acme Mutual Insurance",
        "blueprintId": "bp_01K5XPQR8V4N7F2WYZ",
        "agentId": "agent_claims_triage",
    },
    "riskClassification": {
        "intendedUse": (
            "Triages first-notice-of-loss submissions on Acme Mutual's P&C "
            "auto and homeowners lines. Classifies claim complexity, routes "
            "to the correct adjuster queue, and drafts an initial coverage "
            "assessment memo for adjuster review. Does not make coverage "
            "decisions or authorize payments \u2014 all outputs are advisory "
            "and subject to human adjuster approval."
        ),
        "riskTier": "High",
        "riskTierBasis": (
            "Derived from governance policy types applied at validation: "
            "[safety, compliance, data_handling, audit]. Validate against "
            "enterprise model risk taxonomy before regulatory submission."
        ),
        "deploymentType": "internal_tool",
        "dataSensitivity": "regulated_pii",
        "regulatoryScope": [
            "GLBA",
            "NY DFS Part 500",
            "NAIC UCSPA",
            "CA Ins. Code \u00a7790.03",
        ],
        "stakeholdersConsulted": [
            "MRM", "Legal", "Claims Operations", "InfoSec",
        ],
        "businessOwner": "ent_acme_mutual",
        "modelOwner": "dwilliams@acmemutual.com",
    },
    "identity": {
        "name": "Claims-Triage-Agent",
        "description": (
            "First-notice-of-loss triage assistant for P&C claims. Routes to "
            "appropriate adjuster queues and drafts initial coverage memos."
        ),
        "persona": (
            "A senior claims intake specialist with 10+ years of experience "
            "in P&C auto and homeowners lines. Speaks in plain language, "
            "cites policy provisions by section, and never authorizes "
            "payments without adjuster review."
        ),
        "tags": ["claims", "p&c", "triage", "fnol", "adjuster-routing"],
    },
    "capabilities": {
        "toolCount": 5,
        "tools": [
            {"name": "policy_lookup", "type": "knowledge_base",
             "description": "Retrieves policy terms, endorsements, and exclusions for a given policy number."},
            {"name": "claim_history_lookup", "type": "data_source",
             "description": "Retrieves the prior claim history for the policyholder from the claims warehouse."},
            {"name": "coverage_calculator", "type": "function",
             "description": "Computes applicable coverage limits and deductibles for a given loss type."},
            {"name": "damage_estimate_lookup", "type": "data_source",
             "description": "Retrieves third-party damage estimate data from the CCC One integration."},
            {"name": "route_to_adjuster", "type": "function",
             "description": "Routes the triaged claim to the appropriate adjuster queue based on severity and line of business."},
        ],
        "knowledgeSourceCount": 3,
        "knowledgeSources": [
            {"name": "Acme Policy Terms Corpus", "type": "vector_store",
             "description": "All active P&C policy forms, endorsements, and state-specific variants."},
            {"name": "NAIC Claim Handling Guidelines", "type": "document_set",
             "description": "NAIC Model Unfair Claims Settlement Practices Act + state implementations."},
            {"name": "Acme Adjuster Playbooks", "type": "document_set",
             "description": "Internal adjuster decision guides for common loss scenarios."},
        ],
        "instructionsConfigured": True,
    },
    "governanceValidation": {
        "validated": True,
        "valid": True,
        "violationCount": 2,
        "errorCount": 0,
        "warningCount": 2,
        "policyCount": 12,
        "violations": [
            {
                "policyName": "Acme PII Handling Policy",
                "ruleId": "pii-redaction-in-logs",
                "severity": "warning",
                "message": "Audit log PII redaction flag is enabled, but redaction granularity is not specified.",
                "suggestion": "Add pii_redaction_fields to governance.audit to enumerate which PII categories are redacted.",
            },
            {
                "policyName": "Audit Standards",
                "ruleId": "retention-above-baseline",
                "severity": "warning",
                "message": "Retention period (2555 days) exceeds NAIC baseline (1825 days). Consider justification documentation.",
                "suggestion": "Add a comment to governance.audit.retention_days explaining the 7-year retention rationale.",
            },
        ],
    },
    "reviewDecision": {
        "outcome": "approved",
        "reviewedBy": "rpatel@acmemutual.com",
        "reviewedAt": "2026-04-04T16:41:29Z",
        "comment": (
            "Reviewed for SR 11-7 conceptual soundness, data quality, and "
            "outcomes analysis. All four seeded baseline policies satisfied; "
            "two warnings accepted with remediation documented in this "
            "review. Approved for deployment to AgentCore staging, pending "
            "Legal sign-off on the final approval chain."
        ),
    },
    "sodEvidence": {
        "architect": "dwilliams@acmemutual.com",
        "architectTimestamp": "2026-04-02T11:08:14Z",
        "reviewer": "rpatel@acmemutual.com",
        "reviewerTimestamp": "2026-04-04T16:41:29Z",
        "deployer": "jkim@acmemutual.com",
        "deployerTimestamp": "2026-04-08T19:22:03Z",
        "sodSatisfied": True,
    },
    "approvalChain": [
        {"step": 1, "label": "Model Owner", "role": "model_owner",
         "approvedBy": "dwilliams@acmemutual.com", "decision": "approved",
         "comment": "Owner attestation \u2014 intended use matches original intake scope.",
         "approvedAt": "2026-04-04T14:02:17Z"},
        {"step": 2, "label": "Model Risk Management",
         "role": "mrm_reviewer",
         "approvedBy": "rpatel@acmemutual.com", "decision": "approved",
         "comment": "SR 11-7 dimensions reviewed. Conceptual soundness, data quality, and outcomes analysis all satisfactory.",
         "approvedAt": "2026-04-04T16:41:29Z"},
        {"step": 3, "label": "Legal & Compliance", "role": "legal_reviewer",
         "approvedBy": "slin@acmemutual.com", "decision": "approved",
         "comment": "Reviewed against NAIC UCSPA, NY 11 NYCRR 216, and CA Ins. Code \u00a7790.03. No blockers.",
         "approvedAt": "2026-04-07T10:18:55Z"},
        {"step": 4, "label": "InfoSec", "role": "security_reviewer",
         "approvedBy": "arao@acmemutual.com", "decision": "approved",
         "comment": "Data handling and tool scopes reviewed. GLBA and NY DFS Part 500 obligations satisfied.",
         "approvedAt": "2026-04-08T13:44:12Z"},
    ],
    "modelLineage": {
        "versionHistory": [
            {"version": "1.0", "status": "deprecated",
             "createdBy": "dwilliams@acmemutual.com",
             "createdAt": "2026-01-14T09:30:00Z",
             "refinementCount": 2},
            {"version": "2.0", "status": "rejected",
             "createdBy": "dwilliams@acmemutual.com",
             "createdAt": "2026-03-15T14:21:00Z",
             "refinementCount": 0},
            {"version": "2.1", "status": "deployed",
             "createdBy": "dwilliams@acmemutual.com",
             "createdAt": "2026-04-02T10:14:37Z",
             "refinementCount": 4},
        ],
        "deploymentLineage": [
            {"version": "1.0", "deployedAt": "2026-01-20T11:00:00Z",
             "deployedBy": "jkim@acmemutual.com",
             "changeRef": "CHG-2026-0083"},
            {"version": "2.1", "deployedAt": "2026-04-08T19:22:03Z",
             "deployedBy": "jkim@acmemutual.com",
             "changeRef": "CHG-2026-0412"},
        ],
    },
    "deploymentRecord": {
        "deployed": True,
        "deployedAt": "2026-04-08T19:22:03Z",
        "deployedBy": "jkim@acmemutual.com",
        "changeRef": "CHG-2026-0412",
        "deploymentNotes": (
            "Staged rollout: 10% of FNOL volume for 72 hours, then full "
            "cutover pending claims ops confirmation of queue routing "
            "accuracy. Rollback plan: revert to v1.0 by updating "
            "claims-intake Lambda environment variable."
        ),
        "deploymentTarget": "agentcore",
        "agentcoreRecord": {
            "agentId": "acme-claims-triage-prd",
            "agentArn": "arn:aws:bedrock-agentcore:us-east-1:847291058412:agent/acme-claims-triage-prd",
            "region": "us-east-1",
            "foundationModel": "anthropic.claude-sonnet-4-6-v1:0",
            "deployedAt": "2026-04-08T19:22:03Z",
            "deployedBy": "jkim@acmemutual.com",
        },
    },
    "regulatoryFrameworks": [
        {
            "frameworkId": "eu-ai-act",
            "frameworkName": "EU AI Act (Regulation 2024/1689)",
            "euAiActRiskTier": "high-risk",
            "overallStatus": "partial",
            "requirementsSatisfied": 7,
            "requirementsTotal": 9,
            "gaps": [
                "eu-ai-act-art-12 (Record-keeping): automated runtime logging out of scope for design-time export.",
                "eu-ai-act-art-15 (Accuracy/Robustness): post-deployment monitoring metrics not yet wired.",
            ],
            "requirements": [
                ("eu-ai-act-risk-tier", "Risk Tier Classification",
                 "satisfied", "Classified as high-risk per Annex III."),
                ("eu-ai-act-art-9", "Risk Management System",
                 "satisfied", "SR 11-7 lifecycle satisfies Art. 9 governance."),
                ("eu-ai-act-art-10", "Data and Data Governance",
                 "satisfied", "Policy lookup and claim history sources documented with lineage."),
                ("eu-ai-act-art-11", "Technical Documentation",
                 "satisfied", "ABP serves as single-source technical documentation."),
                ("eu-ai-act-art-12", "Record-keeping",
                 "partial", "Lifecycle audit chain captured; runtime interaction logs are Acme's responsibility."),
                ("eu-ai-act-art-13", "Transparency to Users",
                 "satisfied", "Adjuster-facing disclosure language present in persona."),
                ("eu-ai-act-art-14", "Human Oversight",
                 "satisfied", "HITL gate enforced \u2014 all outputs are advisory, subject to adjuster approval."),
                ("eu-ai-act-art-15", "Accuracy, Robustness, Cybersecurity",
                 "partial", "Blueprint-level coverage adequate; post-deployment monitoring metrics pending."),
                ("eu-ai-act-art-52", "Transparency Obligations",
                 "satisfied", "System prompt discloses AI nature to downstream consumers."),
            ],
        },
        {
            "frameworkId": "sr-11-7",
            "frameworkName": "SR 11-7 (Federal Reserve Model Risk Management)",
            "overallStatus": "satisfied",
            "requirementsSatisfied": 9,
            "requirementsTotal": 9,
            "gaps": [],
            "requirements": [
                ("sr117-iii-a-soundness", "Conceptual Soundness",
                 "satisfied", "Reviewed by MRM (rpatel) with explicit attestation."),
                ("sr117-iii-a-documentation", "Model Documentation",
                 "satisfied", "ABP + review record + approval chain \u2014 full lineage."),
                ("sr117-iii-b-data-quality", "Data Quality",
                 "satisfied", "Knowledge source inventory + lineage in ABP."),
                ("sr117-iii-c-limitations", "Model Limitations",
                 "satisfied", "Persona explicitly states advisory-only nature."),
                ("sr117-iii-d-monitoring-logging", "Ongoing Monitoring \u2014 Logging",
                 "satisfied", "Audit log configured with 2555-day retention."),
                ("sr117-iii-d-monitoring-policy", "Ongoing Monitoring \u2014 Policy",
                 "satisfied", "Periodic review scheduled at 12-month cadence."),
                ("sr117-iv-validation", "Independent Validation",
                 "satisfied", "SOD enforced \u2014 architect, reviewer, deployer distinct."),
                ("sr117-v-a-policies", "MRM Policies",
                 "satisfied", "All four seeded baseline policies evaluated."),
                ("sr117-v-c-audit", "Internal Audit",
                 "satisfied", "Multi-step approval chain \u2014 4 independent approvers."),
            ],
        },
        {
            "frameworkId": "nist-ai-rmf",
            "frameworkName": "NIST AI Risk Management Framework 1.0",
            "overallStatus": "satisfied",
            "requirementsSatisfied": 8,
            "requirementsTotal": 8,
            "gaps": [],
            "requirements": [
                ("nist-govern-1", "Governance Policies and Processes",
                 "satisfied", "Governance section of ABP fully populated."),
                ("nist-govern-2", "Accountability Structures",
                 "satisfied", "SOD + approval chain establish clear accountability."),
                ("nist-map-1", "Context of Use",
                 "satisfied", "Intake session documents enterprise context."),
                ("nist-map-2", "Categorization of AI System",
                 "satisfied", "Risk tier + deployment type + data sensitivity captured."),
                ("nist-measure-1", "Appropriate Metrics",
                 "satisfied", "Quality evaluation rubric scored (see Section 9)."),
                ("nist-measure-2", "Risks Identified and Tracked",
                 "satisfied", "Governance validation violations tracked in audit chain."),
                ("nist-manage-1", "Risk Response",
                 "satisfied", "Remediation workflow exercised v2.0 \u2192 v2.1."),
                ("nist-manage-2", "Risk Communication",
                 "satisfied", "Evidence package is the communication artifact."),
            ],
        },
    ],
    "auditChain": [
        {"ts": "2026-03-15T14:21:00Z", "action": "blueprint.created",
         "actor": "dwilliams@acmemutual.com",
         "fromStatus": "", "toStatus": "draft"},
        {"ts": "2026-03-18T09:14:02Z", "action": "blueprint.validated",
         "actor": "system",
         "fromStatus": "draft", "toStatus": "draft",
         "meta": "valid=false, errors=3"},
        {"ts": "2026-03-18T09:14:45Z", "action": "blueprint.status_changed",
         "actor": "dwilliams@acmemutual.com",
         "fromStatus": "draft", "toStatus": "rejected",
         "meta": "v2.0 blocked at gate \u2014 safety baseline violations"},
        {"ts": "2026-04-02T10:14:37Z", "action": "blueprint.refined",
         "actor": "dwilliams@acmemutual.com",
         "fromStatus": "rejected", "toStatus": "draft",
         "meta": "v2.1 created as remediation of v2.0"},
        {"ts": "2026-04-02T11:08:14Z", "action": "blueprint.status_changed",
         "actor": "dwilliams@acmemutual.com",
         "fromStatus": "draft", "toStatus": "in_review"},
        {"ts": "2026-04-04T16:41:29Z", "action": "blueprint.approved",
         "actor": "rpatel@acmemutual.com",
         "fromStatus": "in_review", "toStatus": "approved"},
        {"ts": "2026-04-08T19:22:03Z", "action": "blueprint.status_changed",
         "actor": "jkim@acmemutual.com",
         "fromStatus": "approved", "toStatus": "deployed",
         "meta": "AgentCore deploy CHG-2026-0412"},
        {"ts": "2026-04-09T14:22:11Z", "action": "blueprint.evidence_package_exported",
         "actor": "maria.chen@acmemutual.com",
         "fromStatus": "deployed", "toStatus": "deployed",
         "meta": "Regulatory export \u2014 this document"},
    ],
    "stakeholderContributions": [
        {"email": "rpatel@acmemutual.com", "role": "mrm_reviewer",
         "domain": "MRM", "submittedAt": "2026-03-16T10:22:00Z"},
        {"email": "slin@acmemutual.com", "role": "legal_counsel",
         "domain": "Legal", "submittedAt": "2026-03-16T14:08:00Z"},
        {"email": "bmartinez@acmemutual.com", "role": "claims_ops_lead",
         "domain": "Claims Operations", "submittedAt": "2026-03-17T09:45:00Z"},
        {"email": "arao@acmemutual.com", "role": "ciso",
         "domain": "InfoSec", "submittedAt": "2026-03-17T16:12:00Z"},
    ],
    "stakeholderCoverageGaps": [],
    "workflowContext": [
        {"workflowId": "wf_claims_intake",
         "workflowName": "Acme Claims Intake Pipeline",
         "role": "First-Notice Triage", "required": True},
    ],
    "periodicReviewSchedule": {
        "enabled": True,
        "cadenceMonths": 12,
        "lastPeriodicReviewAt": None,
        "nextReviewDueAt": "2027-04-09T00:00:00Z",
        "isOverdue": False,
    },
    "qualityEvaluation": {
        "overallScore": 4.4,
        "evaluatedAt": "2026-04-02T11:55:00Z",
        "evaluatedBy": "system",
        "dimensions": [
            {"name": "Intent Alignment", "score": 5,
             "rationale": "Blueprint intent mirrors intake session brief verbatim."},
            {"name": "Tool Appropriateness", "score": 4,
             "rationale": "Five tools cover claim retrieval and routing; no destructive tools exposed."},
            {"name": "Instruction Specificity", "score": 4,
             "rationale": "System instructions enumerate advisory-only stance explicitly."},
            {"name": "Governance Adequacy", "score": 5,
             "rationale": "All four baseline policy types covered + one enterprise-specific policy."},
            {"name": "Ownership Completeness", "score": 4,
             "rationale": "Business unit, owner email, and data classification populated; no downstream contact."},
        ],
    },
    "testEvidence": {
        "ranAt": "2026-04-02T12:10:00Z",
        "suiteVersion": "blueprint-harness v0.6.1",
        "scenariosTotal": 14,
        "scenariosPassed": 13,
        "scenariosFailed": 1,
        "scenariosSkipped": 0,
        "failedScenarios": [
            {"id": "fnol-014", "name": "Total loss edge case",
             "severity": "low",
             "note": "Agent correctly routed to total-loss queue but omitted optional salvage disclosure. Tracked as enhancement."},
        ],
    },
}

# =============================================================================
# PAGE BUILDERS
# =============================================================================

def build_cover(story):
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph("EVIDENCE PACKAGE", S["cover_eyebrow"]))
    story.append(Paragraph("Evidence Package", S["cover_title"]))
    story.append(Paragraph("Regulatory Export \u00b7 Agent Blueprint Package",
                            S["cover_subtitle"]))

    story.append(HRFlowable(width=FRAME_W, thickness=0.6, color=INDIGO,
                             spaceBefore=0, spaceAfter=24))

    c = SEED["cover"]
    m = SEED["exportMetadata"]

    # Subject of the package
    story.append(Paragraph("AGENT UNDER REVIEW",
        mk("_", fontName="Helvetica-Bold", fontSize=8, textColor=INDIGO,
           leading=10, letterSpacing=1)))
    story.append(Spacer(1, 6))

    subject = kv_table([
        ("Agent name", c["agentName"]),
        ("Version", f"<b>v{c['currentVersion']}</b>"),
        ("Lifecycle status",
         f"<font name='Helvetica-Bold' size='8' color='#ffffff' backColor='#4f46e5'>&nbsp;{c['currentStatus']}&nbsp;</font>"),
        ("Enterprise",
         f"{c['enterpriseDisplayName']} {fr()}"),
        ("Blueprint ID",
         Paragraph(f"<font name='Courier' size='9'>{c['blueprintId']}</font> {fr()}",
                   S["kv_v"])),
        ("Agent ID",
         Paragraph(f"<font name='Courier' size='9'>{c['agentId']}</font> {fr()}",
                   S["kv_v"])),
        ("Enterprise ID",
         Paragraph(f"<font name='Courier' size='9'>{c['enterpriseId']}</font> {fr()}",
                   S["kv_v"])),
    ])
    story.append(subject)

    story.append(Spacer(1, 22))
    story.append(Paragraph("EXPORT METADATA",
        mk("_", fontName="Helvetica-Bold", fontSize=8, textColor=INDIGO,
           leading=10, letterSpacing=1)))
    story.append(Spacer(1, 6))

    meta = kv_table([
        ("Package format", f"v{m['packageFormatVersion']}"),
        ("Schema version", m["intellios_schema_version"]),
        ("Exported at",
         Paragraph(f"<font name='Courier' size='9'>{m['exportedAt']}</font>",
                   S["kv_v"])),
        ("Exported by",
         Paragraph(f"<font name='Courier' size='9'>{m['exportedBy']}</font> {fr()}",
                   S["kv_v"])),
        ("Export role", m["exportedByRole"]),
        ("Audit log event",
         Paragraph("<font name='Courier' size='9'>blueprint.evidence_package_exported</font>",
                   S["kv_v"])),
    ])
    story.append(meta)

    story.append(Spacer(1, 36))
    story.append(HRFlowable(width=FRAME_W, thickness=0.4, color=RULE,
                             spaceBefore=0, spaceAfter=10))
    story.append(Paragraph(
        "Sample rendering. Structure and field names reflect Intellios "
        "evidence-package schema v1.0 as of 2026-04-09. Customer data is "
        "illustrative and flagged [FR] where fabricated.",
        S["cover_footer"]))

def build_executive_summary(story):
    story.extend(section_header("Executive Summary", "Section 01"))

    rc = SEED["riskClassification"]
    gv = SEED["governanceValidation"]
    sod = SEED["sodEvidence"]

    story.append(Paragraph("INTENDED USE", S["h3"]))
    story.append(Paragraph(
        f"{rc['intendedUse']} {fr()}",
        S["body_justify"]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("RISK CLASSIFICATION", S["h3"]))
    rc_rows = [
        ("Risk tier",
         Paragraph(f"<font name='Helvetica-Bold' size='9' color='#ffffff' backColor='#b91c1c'>&nbsp;{rc['riskTier'].upper()}&nbsp;</font>",
                   S["kv_v"])),
        ("Risk tier basis", rc["riskTierBasis"]),
        ("Deployment type", f"<font name='Courier' size='9'>{rc['deploymentType']}</font> {fr()}"),
        ("Data sensitivity", f"<font name='Courier' size='9'>{rc['dataSensitivity']}</font> {fr()}"),
        ("Regulatory scope",
         Paragraph(" &nbsp; ".join(
             [f"<font name='Helvetica-Bold' size='7' color='#4f46e5' backColor='#eef2ff'>&nbsp;{x}&nbsp;</font>"
              for x in rc["regulatoryScope"]]) + f" {fr()}",
             S["kv_v"])),
        ("Stakeholders consulted",
         f"{', '.join(rc['stakeholdersConsulted'])} {fr()}"),
        ("Model owner",
         Paragraph(f"<font name='Courier' size='9'>{rc['modelOwner']}</font> {fr()}",
                   S["kv_v"])),
        ("Business owner",
         Paragraph(f"<font name='Courier' size='9'>{rc['businessOwner']}</font> &nbsp;<i>(enterpriseId \u2014 closest proxy in current schema)</i>",
                   S["kv_v"])),
    ]
    story.append(kv_table(rc_rows))
    story.append(Spacer(1, 12))

    story.append(Paragraph("GOVERNANCE VALIDATION AT A GLANCE", S["h3"]))
    stats = Table(
        [[
            stat_box("Valid", "YES", SUCCESS),
            stat_box("Errors", str(gv["errorCount"]), SUCCESS if gv["errorCount"]==0 else DANGER),
            stat_box("Warnings", str(gv["warningCount"]), WARNING if gv["warningCount"]>0 else SUCCESS),
            stat_box("Policies", str(gv["policyCount"]), INDIGO),
        ]],
        colWidths=[1.7*inch]*4, hAlign="LEFT",
    )
    stats.setStyle(TableStyle([
        ("LEFTPADDING", (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 8),
    ]))
    story.append(stats)
    story.append(Spacer(1, 12))

    story.append(Paragraph("SEPARATION OF DUTIES", S["h3"]))
    sod_body = (
        f"<b>Satisfied.</b> Architect <font name='Courier' size='9'>{sod['architect']}</font>, "
        f"reviewer <font name='Courier' size='9'>{sod['reviewer']}</font>, "
        f"and deployer <font name='Courier' size='9'>{sod['deployer']}</font> "
        f"are three distinct individuals. See Section 06 for full chain. {fr()}"
    )
    story.append(callout("SOD \u2014 SATISFIED", sod_body, SUCCESS))
    story.append(Spacer(1, 10))

    story.append(HRFlowable(width=FRAME_W, thickness=0.4, color=RULE,
                             spaceBefore=2, spaceAfter=6))
    story.append(Paragraph(
        "This package was assembled from the Agent Registry against "
        "blueprint version <font name='Courier' size='8'>bp_01K5XPQR8V4N7F2WYZ</font> "
        "on 2026-04-09T14:22:11Z and written to the immutable audit log as "
        "<font name='Courier' size='8'>blueprint.evidence_package_exported</font>.",
        S["footnote_body"]))

def build_identity_capabilities(story):
    story.append(PageBreak())
    story.extend(section_header("Identity and Capabilities", "Section 02"))

    ident = SEED["identity"]
    caps = SEED["capabilities"]

    story.append(Paragraph("AGENT IDENTITY", S["h3"]))
    ident_rows = [
        ("Name", ident["name"]),
        ("Description", ident["description"]),
        ("Persona", ident["persona"]),
        ("Tags",
         Paragraph(" &nbsp; ".join(
             [f"<font name='Helvetica' size='7' color='#4f46e5' backColor='#eef2ff'>&nbsp;{t}&nbsp;</font>"
              for t in ident["tags"]]),
             S["kv_v"])),
    ]
    story.append(kv_table(ident_rows))

    story.append(Paragraph("TOOL INVENTORY", S["h3"]))
    story.append(Paragraph(
        f"<b>{caps['toolCount']} tools configured.</b> All tool definitions "
        f"below are copied verbatim from the ABP <font name='Courier' size='8'>capabilities.tools</font> array.",
        S["meta"]))
    story.append(Spacer(1, 4))
    tool_rows = []
    for t in caps["tools"]:
        tool_rows.append([
            Paragraph(f"<font name='Courier' size='8'>{t['name']}</font>",
                      S["td_mono"]),
            Paragraph(t["type"], S["td"]),
            Paragraph(f"{t['description']} {fr()}", S["td"]),
        ])
    story.append(data_table(
        ["Tool name", "Type", "Description"],
        tool_rows,
        col_widths=[1.5*inch, 1.1*inch, FRAME_W - 1.5*inch - 1.1*inch],
    ))
    story.append(Spacer(1, 10))

    story.append(Paragraph("KNOWLEDGE SOURCES", S["h3"]))
    story.append(Paragraph(
        f"<b>{caps['knowledgeSourceCount']} sources configured.</b> "
        f"Retrieval lineage is available via the Agent Registry detail page.",
        S["meta"]))
    story.append(Spacer(1, 4))
    ks_rows = []
    for k in caps["knowledgeSources"]:
        ks_rows.append([
            Paragraph(f"<b>{k['name']}</b>", S["td"]),
            Paragraph(k["type"], S["td"]),
            Paragraph(f"{k['description']} {fr()}", S["td"]),
        ])
    story.append(data_table(
        ["Source", "Type", "Description"],
        ks_rows,
        col_widths=[2.1*inch, 1.1*inch, FRAME_W - 2.1*inch - 1.1*inch],
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        f"<b>Instructions configured:</b> {str(caps['instructionsConfigured']).lower()} "
        f"&nbsp;\u00b7&nbsp; <i>(boolean flag in ABP)</i>",
        S["meta"]))

def build_policy_as_code(story):
    story.append(PageBreak())
    story.extend(section_header("Policy-as-Code (ABP Governance Section)",
                                 "Section 03"))

    story.append(Paragraph(
        "Policies below are rendered directly from the ABP "
        "<font name='Courier' size='8'>governance.policies</font> array and "
        "are the exact rules evaluated at design time by the Intellios "
        "Governance Validator (<font name='Courier' size='8'>src/lib/governance/evaluate.ts</font>). "
        "Field paths use dot-notation against the ABP document; operators "
        "shown are the real evaluator operators.",
        S["body_justify"]))
    story.append(Spacer(1, 8))

    # Four policies as YAML code blocks
    p1_lines = [
        "name: Safety Baseline",
        "type: safety",
        "description: Enterprise-wide safety baseline for any",
        "  customer-facing or operationally-impactful agent.",
        "rules:",
        "  - id: safety-persona-exists",
        "    field: identity.persona",
        "    operator: exists",
        "    severity: error",
        "    message: A persona must be defined that constrains",
        "      behavior and risk posture.",
        "  - id: safety-no-payment-tools",
        "    field: capabilities.tools",
        "    operator: not_includes_type",
        "    value: payment_processor",
        "    severity: error",
        "    message: Agents in this policy scope must not expose",
        "      payment processing tools.",
    ]
    story.append(yaml_block(
        "Safety Baseline",
        p1_lines,
        "safety",
        "Seeded baseline policy \u2014 real, listed in kb/05-governance-compliance/sr-11-7-mapping.md"))

    p2_lines = [
        "name: Audit Standards",
        "type: audit",
        "description: Retention and logging requirements for",
        "  regulated domains.",
        "rules:",
        "  - id: audit-log-interactions",
        "    field: governance.audit.log_interactions",
        "    operator: equals",
        "    value: true",
        "    severity: error",
        "    message: Interaction logging must be enabled.",
        "  - id: audit-retention-minimum",
        "    field: governance.audit.retention_days",
        "    operator: count_gte",
        "    value: 1825",
        "    severity: error",
        "    message: Retention must meet or exceed 5-year",
        "      NAIC baseline.",
        "  - id: audit-pii-redaction-flag",
        "    field: governance.audit.pii_redaction",
        "    operator: equals",
        "    value: true",
        "    severity: warning",
        "    message: PII redaction should be enabled for",
        "      regulated_pii data sensitivity.",
    ]
    story.append(yaml_block(
        "Audit Standards",
        p2_lines,
        "audit",
        "Seeded baseline policy \u2014 real"))

    p3_lines = [
        "name: Access Control Baseline",
        "type: access_control",
        "description: Ownership and access governance baseline.",
        "rules:",
        "  - id: access-owner-email",
        "    field: ownership.ownerEmail",
        "    operator: exists",
        "    severity: error",
        "    message: Owner email is required for accountability.",
        "  - id: access-data-classification",
        "    field: ownership.dataClassification",
        "    operator: exists",
        "    severity: error",
        "    message: Data classification must be specified.",
        "  - id: access-business-unit",
        "    field: ownership.businessUnit",
        "    operator: exists",
        "    severity: error",
        "    message: Business unit ownership must be specified.",
    ]
    story.append(yaml_block(
        "Access Control Baseline",
        p3_lines,
        "access_control",
        "Seeded baseline policy \u2014 real"))

    p4_lines = [
        "name: Acme PII Handling Policy",
        "type: data_handling",
        "description: Enterprise-specific PII handling policy",
        "  for claims data regulated under GLBA, NY DFS Part 500,",
        "  and CA Ins. Code section 790.03.",
        "rules:",
        "  - id: pii-data-classification-regulated",
        "    field: ownership.dataClassification",
        "    operator: equals",
        "    value: regulated_pii",
        "    severity: error",
        "    message: Claims agents must be classified as",
        "      regulated_pii.",
        "  - id: pii-retention-seven-year",
        "    field: governance.audit.retention_days",
        "    operator: count_gte",
        "    value: 2555",
        "    severity: warning",
        "    message: NAIC recommends 7-year retention for",
        "      claims records.",
        "  - id: pii-approval-chain-coverage",
        "    field: governance.approval_chain",
        "    operator: count_gte",
        "    value: 3",
        "    severity: error",
        "    message: Minimum 3 independent approvers required",
        "      (Owner, MRM, Legal).",
    ]
    story.append(yaml_block(
        "Acme PII Handling Policy",
        p4_lines,
        "data_handling",
        "Enterprise-specific policy for Acme Mutual",
        fr_marker=True))

    story.append(Paragraph(
        "Policies are evaluated at design time against the ABP document. "
        "Runtime telemetry-based policies (token budgets, circuit breakers, "
        "PII detection on outputs) are recorded separately in the runtime "
        "evaluator and are out of scope for this evidence package.",
        S["footnote"]))

def build_governance_validation(story):
    story.append(PageBreak())
    story.extend(section_header("Governance Validation Report", "Section 04"))

    gv = SEED["governanceValidation"]

    story.append(Paragraph("CURRENT VERSION (v2.1) VALIDATION RESULT", S["h3"]))

    result_rows = [
        ("Validated", "true"),
        ("Valid", Paragraph(
            f"<font name='Helvetica-Bold' size='8' color='#ffffff' backColor='#059669'>&nbsp;TRUE&nbsp;</font>",
            S["kv_v"])),
        ("Violation count", str(gv["violationCount"])),
        ("Error-severity count",
         Paragraph(f"<b><font color='#059669'>0</font></b>", S["kv_v"])),
        ("Warning-severity count",
         Paragraph(f"<b><font color='#b45309'>2</font></b>", S["kv_v"])),
        ("Policies evaluated", str(gv["policyCount"])),
    ]
    story.append(kv_table(result_rows))
    story.append(Spacer(1, 12))

    story.append(Paragraph("WARNING VIOLATIONS (NON-BLOCKING)", S["h3"]))
    viol_rows = []
    for v in gv["violations"]:
        sev_chip = f"<font name='Helvetica-Bold' size='7' color='#ffffff' backColor='#b45309'>&nbsp;WARN&nbsp;</font>"
        viol_rows.append([
            Paragraph(sev_chip, S["td_center"]),
            Paragraph(f"<b>{v['policyName']}</b><br/><font name='Courier' size='7' color='#64748b'>rule: {v['ruleId']}</font>",
                      S["td"]),
            Paragraph(f"{v['message']}<br/><br/><i><font color='#475569'>\u2192 {v['suggestion']}</font></i>",
                      S["td"]),
        ])
    story.append(data_table(
        ["Severity", "Policy / Rule", "Message and suggestion"],
        viol_rows,
        col_widths=[0.7*inch, 2.1*inch, FRAME_W - 0.7*inch - 2.1*inch],
    ))
    story.append(Spacer(1, 14))

    # Historical context callout
    story.append(callout(
        "HISTORICAL CONTEXT \u2014 v2.0 BLOCKED AT GATE",
        (
            "<b>Version 2.0 of this blueprint was not approved.</b> "
            "At validation on <font name='Courier' size='8'>2026-03-18T09:14:02Z</font>, "
            "the Governance Validator returned "
            "<font name='Courier' size='8'>valid=false</font> with "
            "<b><font color='#b91c1c'>3 error-severity violations</font></b> "
            "against the Safety Baseline and Audit Standards policies. "
            "v2.0 could not progress beyond <font name='Courier' size='8'>draft</font> "
            "status. The model owner remediated the violations and created v2.1 "
            "as a refinement, which passed validation and progressed through "
            "the full approval chain. See Section 07 \u2014 Model Lineage \u2014 "
            "for the full version history."
        ),
        DANGER))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "This is the core enforcement mechanism Intellios provides today: "
        "blueprints that fail governance validation cannot progress to "
        "<font name='Courier' size='8'>in_review</font> status. Review queues "
        "never see non-compliant blueprints.",
        S["footnote"]))

def build_review_sod_approval(story):
    story.append(PageBreak())
    story.extend(section_header(
        "Review Decision, Separation of Duties, and Approval Chain",
        "Section 05"))

    rev = SEED["reviewDecision"]
    sod = SEED["sodEvidence"]

    story.append(Paragraph("REVIEW DECISION", S["h3"]))
    decision_rows = [
        ("Outcome", Paragraph(
            f"<font name='Helvetica-Bold' size='9' color='#ffffff' backColor='#059669'>&nbsp;APPROVED&nbsp;</font>",
            S["kv_v"])),
        ("Reviewed by",
         Paragraph(f"<font name='Courier' size='9'>{rev['reviewedBy']}</font> {fr()}",
                   S["kv_v"])),
        ("Reviewed at",
         Paragraph(f"<font name='Courier' size='9'>{rev['reviewedAt']}</font>",
                   S["kv_v"])),
        ("Review comment", rev["comment"]),
    ]
    story.append(kv_table(decision_rows))
    story.append(Spacer(1, 12))

    story.append(Paragraph("SEPARATION OF DUTIES EVIDENCE", S["h3"]))
    sod_rows = [
        [Paragraph("Architect", S["td"]),
         Paragraph(f"<font name='Courier' size='8'>{sod['architect']}</font>",
                   S["td_mono"]),
         Paragraph(f"<font name='Courier' size='7'>{sod['architectTimestamp']}</font>",
                   S["td_mono"]),
         Paragraph(f"First transition to <font name='Courier' size='7'>in_review</font> {fr()}",
                   S["td"])],
        [Paragraph("Reviewer", S["td"]),
         Paragraph(f"<font name='Courier' size='8'>{sod['reviewer']}</font>",
                   S["td_mono"]),
         Paragraph(f"<font name='Courier' size='7'>{sod['reviewerTimestamp']}</font>",
                   S["td_mono"]),
         Paragraph(f"blueprint.reviewedBy {fr()}", S["td"])],
        [Paragraph("Deployer", S["td"]),
         Paragraph(f"<font name='Courier' size='8'>{sod['deployer']}</font>",
                   S["td_mono"]),
         Paragraph(f"<font name='Courier' size='7'>{sod['deployerTimestamp']}</font>",
                   S["td_mono"]),
         Paragraph(f"Deployment event actor {fr()}", S["td"])],
    ]
    story.append(data_table(
        ["Role", "Identity", "Timestamp", "Derived from"],
        sod_rows,
        col_widths=[0.9*inch, 2.1*inch, 1.4*inch, FRAME_W - 0.9*inch - 2.1*inch - 1.4*inch],
    ))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "<b><font color='#059669'>SOD satisfied.</font></b> All three roles "
        "are distinct identities. This check is performed programmatically by "
        "<font name='Courier' size='8'>assembleMRMReport()</font> and fails "
        "closed if any two roles resolve to the same user.",
        S["meta"]))
    story.append(Spacer(1, 12))

    story.append(Paragraph("MULTI-STEP APPROVAL CHAIN", S["h3"]))
    chain_rows = []
    for a in SEED["approvalChain"]:
        chain_rows.append([
            Paragraph(f"<b>{a['step']}</b>", S["td_center"]),
            Paragraph(a["label"], S["td"]),
            Paragraph(f"<font name='Courier' size='8'>{a['approvedBy']}</font> {fr()}",
                      S["td_mono"]),
            Paragraph(
                f"<font name='Helvetica-Bold' size='7' color='#ffffff' backColor='#059669'>&nbsp;{a['decision'].upper()}&nbsp;</font>",
                S["td_center"]),
            Paragraph(f"<font name='Courier' size='7'>{a['approvedAt']}</font>",
                      S["td_mono"]),
            Paragraph(f"<i>{a['comment']}</i>", S["td"]),
        ])
    story.append(data_table(
        ["#", "Step", "Approver", "Decision", "Timestamp", "Comment"],
        chain_rows,
        col_widths=[0.3*inch, 1.2*inch, 1.7*inch, 0.7*inch, 1.0*inch,
                    FRAME_W - 0.3*inch - 1.2*inch - 1.7*inch - 0.7*inch - 1.0*inch],
    ))

def build_lineage_deployment(story):
    story.append(PageBreak())
    story.extend(section_header("Model Lineage and Deployment Record",
                                 "Section 06"))

    ml = SEED["modelLineage"]
    dep = SEED["deploymentRecord"]

    story.append(Paragraph("VERSION HISTORY", S["h3"]))
    status_color = {
        "deployed": SUCCESS, "approved": SUCCESS, "rejected": DANGER,
        "deprecated": TEXT_FADED, "draft": INDIGO, "in_review": INDIGO,
    }
    vh_rows = []
    for v in ml["versionHistory"]:
        color = status_color.get(v["status"], TEXT)
        status_chip = f"<font name='Helvetica-Bold' size='7' color='#ffffff' backColor='{hx(color)}'>&nbsp;{v['status'].upper()}&nbsp;</font>"
        vh_rows.append([
            Paragraph(f"<b>v{v['version']}</b>", S["td"]),
            Paragraph(status_chip, S["td_center"]),
            Paragraph(f"<font name='Courier' size='8'>{v['createdBy']}</font> {fr()}",
                      S["td_mono"]),
            Paragraph(f"<font name='Courier' size='7'>{v['createdAt']}</font>",
                      S["td_mono"]),
            Paragraph(str(v["refinementCount"]), S["td_center"]),
        ])
    story.append(data_table(
        ["Version", "Status", "Created by", "Created at", "Refinements"],
        vh_rows,
        col_widths=[0.9*inch, 1.1*inch, 1.9*inch, 1.4*inch,
                    FRAME_W - 0.9*inch - 1.1*inch - 1.9*inch - 1.4*inch],
    ))
    story.append(Spacer(1, 12))

    story.append(Paragraph("DEPLOYMENT LINEAGE", S["h3"]))
    dl_rows = []
    for d in ml["deploymentLineage"]:
        dl_rows.append([
            Paragraph(f"<b>v{d['version']}</b>", S["td"]),
            Paragraph(f"<font name='Courier' size='7'>{d['deployedAt']}</font>",
                      S["td_mono"]),
            Paragraph(f"<font name='Courier' size='8'>{d['deployedBy']}</font> {fr()}",
                      S["td_mono"]),
            Paragraph(f"<font name='Courier' size='8'>{d['changeRef']}</font> {fr()}",
                      S["td_mono"]),
        ])
    story.append(data_table(
        ["Version", "Deployed at", "Deployed by", "Change ref"],
        dl_rows,
        col_widths=[0.9*inch, 1.6*inch, 2.1*inch,
                    FRAME_W - 0.9*inch - 1.6*inch - 2.1*inch],
    ))
    story.append(Spacer(1, 12))

    story.append(Paragraph("CURRENT DEPLOYMENT RECORD", S["h3"]))
    dep_rows = [
        ("Deployed", "true"),
        ("Deployed at",
         Paragraph(f"<font name='Courier' size='9'>{dep['deployedAt']}</font>",
                   S["kv_v"])),
        ("Deployed by",
         Paragraph(f"<font name='Courier' size='9'>{dep['deployedBy']}</font> {fr()}",
                   S["kv_v"])),
        ("Change ref",
         Paragraph(f"<font name='Courier' size='9'>{dep['changeRef']}</font> {fr()}",
                   S["kv_v"])),
        ("Deployment target", dep["deploymentTarget"]),
        ("Deployment notes", dep["deploymentNotes"]),
    ]
    story.append(kv_table(dep_rows))
    story.append(Spacer(1, 10))

    story.append(Paragraph("AGENTCORE DEPLOYMENT RECORD", S["h3"]))
    ac = dep["agentcoreRecord"]
    ac_rows = [
        ("AgentCore agent ID",
         Paragraph(f"<font name='Courier' size='9'>{ac['agentId']}</font> {fr()}",
                   S["kv_v"])),
        ("Agent ARN",
         Paragraph(f"<font name='Courier' size='7'>{ac['agentArn']}</font> {fr()}",
                   S["kv_v"])),
        ("Region", ac["region"]),
        ("Foundation model",
         Paragraph(f"<font name='Courier' size='9'>{ac['foundationModel']}</font>",
                   S["kv_v"])),
        ("AgentCore deploy timestamp",
         Paragraph(f"<font name='Courier' size='9'>{ac['deployedAt']}</font>",
                   S["kv_v"])),
    ]
    story.append(kv_table(ac_rows))

def build_regulatory_frameworks(story):
    story.append(PageBreak())
    story.extend(section_header("Regulatory Framework Assessment",
                                 "Section 07"))

    story.append(Paragraph(
        "Per-requirement assessments below are the deterministic output of "
        "<font name='Courier' size='8'>assessAllFrameworks()</font> in "
        "<font name='Courier' size='8'>src/lib/regulatory/frameworks.ts</font>. "
        "Requirement IDs are the real framework constants. Per-requirement "
        "rationales in this sample are [FR]-flagged \u2014 in production "
        "they are generated deterministically from ABP contents.",
        S["body_justify"]))
    story.append(Spacer(1, 10))

    status_color = {
        "satisfied": SUCCESS,
        "partial": WARNING,
        "missing": DANGER,
        "not_applicable": TEXT_FADED,
    }

    for fw in SEED["regulatoryFrameworks"]:
        overall_color = status_color[fw["overallStatus"]]

        header_html = (
            f"<b>{fw['frameworkName']}</b>"
        )
        story.append(Paragraph(header_html, S["h2"]))

        badges = []
        badges.append(
            f"<font name='Helvetica-Bold' size='7' color='#ffffff' backColor='{hx(overall_color)}'>"
            f"&nbsp;{fw['overallStatus'].upper().replace('_',' ')}&nbsp;</font>")
        badges.append(
            f"<font name='Helvetica-Bold' size='7' color='#4f46e5' backColor='#eef2ff'>"
            f"&nbsp;{fw['requirementsSatisfied']}/{fw['requirementsTotal']} REQUIREMENTS&nbsp;</font>")
        if fw.get("euAiActRiskTier"):
            badges.append(
                f"<font name='Helvetica-Bold' size='7' color='#ffffff' backColor='#b91c1c'>"
                f"&nbsp;RISK TIER: {fw['euAiActRiskTier'].upper()}&nbsp;</font>")
        story.append(Paragraph(" &nbsp; ".join(badges), S["meta"]))
        story.append(Spacer(1, 4))

        req_rows = []
        for req_id, req_title, req_status, req_evidence in fw["requirements"]:
            st_color = status_color[req_status]
            st_chip = f"<font name='Helvetica-Bold' size='7' color='#ffffff' backColor='{hx(st_color)}'>&nbsp;{req_status.upper().replace('_',' ')}&nbsp;</font>"
            req_rows.append([
                Paragraph(f"<font name='Courier' size='7'>{req_id}</font>",
                          S["td_mono"]),
                Paragraph(req_title, S["td"]),
                Paragraph(st_chip, S["td_center"]),
                Paragraph(f"{req_evidence} {fr()}", S["td"]),
            ])
        story.append(data_table(
            ["Requirement ID", "Title", "Status", "Evidence"],
            req_rows,
            col_widths=[1.35*inch, 1.5*inch, 0.85*inch,
                        FRAME_W - 1.35*inch - 1.5*inch - 0.85*inch],
        ))
        if fw["gaps"]:
            story.append(Spacer(1, 4))
            gaps_html = "<b>Gaps:</b><br/>" + "<br/>".join(
                [f"\u2022 {g}" for g in fw["gaps"]])
            story.append(Paragraph(gaps_html, S["footnote_body"]))
        story.append(Spacer(1, 12))

def build_quality_and_tests(story):
    story.append(PageBreak())
    story.extend(section_header("Quality Evaluation and Test Evidence",
                                 "Section 08"))

    qe = SEED["qualityEvaluation"]
    te = SEED["testEvidence"]

    story.append(Paragraph("BLUEPRINT QUALITY EVALUATION", S["h3"]))
    story.append(Paragraph(
        f"Scored automatically at blueprint generation time. "
        f"<b>Overall score: {qe['overallScore']}/5.0</b> "
        f"\u00b7 evaluated at <font name='Courier' size='8'>{qe['evaluatedAt']}</font> "
        f"by <font name='Courier' size='8'>{qe['evaluatedBy']}</font>.",
        S["meta"]))
    story.append(Spacer(1, 4))

    qe_rows = []
    for d in qe["dimensions"]:
        score_color = SUCCESS if d["score"] >= 4 else WARNING
        score_chip = (f"<font name='Helvetica-Bold' size='9' color='#ffffff' "
                      f"backColor='{hx(score_color)}'>&nbsp;{d['score']}&nbsp;/&nbsp;5&nbsp;</font>")
        qe_rows.append([
            Paragraph(f"<b>{d['name']}</b>", S["td"]),
            Paragraph(score_chip, S["td_center"]),
            Paragraph(d["rationale"], S["td"]),
        ])
    story.append(data_table(
        ["Dimension", "Score", "Rationale"],
        qe_rows,
        col_widths=[1.8*inch, 0.9*inch, FRAME_W - 1.8*inch - 0.9*inch],
    ))
    story.append(Spacer(1, 14))

    story.append(Paragraph("BEHAVIORAL TEST EVIDENCE", S["h3"]))
    story.append(Paragraph(
        f"Run via <font name='Courier' size='8'>{te['suiteVersion']}</font> "
        f"at <font name='Courier' size='8'>{te['ranAt']}</font>.",
        S["meta"]))
    story.append(Spacer(1, 6))

    # Stats row
    stats = Table([[
        stat_box("Total", str(te["scenariosTotal"]), INDIGO),
        stat_box("Passed", str(te["scenariosPassed"]), SUCCESS),
        stat_box("Failed", str(te["scenariosFailed"]),
                 WARNING if te["scenariosFailed"] > 0 else SUCCESS),
        stat_box("Skipped", str(te["scenariosSkipped"]), TEXT_FADED),
    ]], colWidths=[1.7*inch]*4, hAlign="LEFT")
    stats.setStyle(TableStyle([
        ("LEFTPADDING", (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 8),
    ]))
    story.append(stats)
    story.append(Spacer(1, 10))

    if te["failedScenarios"]:
        story.append(Paragraph("FAILED / ENHANCEMENT SCENARIOS", S["h3"]))
        fs_rows = []
        for f in te["failedScenarios"]:
            sev_color = {"low": TEXT_FADED, "medium": WARNING, "high": DANGER}[f["severity"]]
            sev_chip = f"<font name='Helvetica-Bold' size='7' color='#ffffff' backColor='{hx(sev_color)}'>&nbsp;{f['severity'].upper()}&nbsp;</font>"
            fs_rows.append([
                Paragraph(f"<font name='Courier' size='8'>{f['id']}</font>",
                          S["td_mono"]),
                Paragraph(f["name"], S["td"]),
                Paragraph(sev_chip, S["td_center"]),
                Paragraph(f"{f['note']} {fr()}", S["td"]),
            ])
        story.append(data_table(
            ["Scenario ID", "Scenario", "Severity", "Note"],
            fs_rows,
            col_widths=[1.1*inch, 2.0*inch, 0.85*inch,
                        FRAME_W - 1.1*inch - 2.0*inch - 0.85*inch],
        ))

def build_audit_chain_context(story):
    story.append(PageBreak())
    story.extend(section_header(
        "Audit Chain, Stakeholders, Workflow, Periodic Review",
        "Section 09"))

    story.append(Paragraph("LIFECYCLE AUDIT CHAIN", S["h3"]))
    story.append(Paragraph(
        "Records blueprint lifecycle state transitions. Runtime "
        "per-decision audit records (individual claims triaged in "
        "production) are held in Acme Mutual's observability subsystem "
        "and are <b>out of scope</b> for this evidence package. {fr}".format(fr=fr()),
        S["meta"]))
    story.append(Spacer(1, 4))

    ac_rows = []
    for e in SEED["auditChain"]:
        ts_short = e["ts"].replace("T", " ").replace("Z", "")
        meta_str = e.get("meta", "")
        status_str = ""
        if e["fromStatus"] and e["toStatus"]:
            status_str = f"<font name='Courier' size='7'>{e['fromStatus']}</font> \u2192 <font name='Courier' size='7'>{e['toStatus']}</font>"
        elif e["toStatus"]:
            status_str = f"\u2192 <font name='Courier' size='7'>{e['toStatus']}</font>"
        combined = status_str
        if meta_str:
            combined = (combined + "<br/>" if combined else "") + f"<i><font color='#475569' size='7'>{meta_str}</font></i>"
        ac_rows.append([
            Paragraph(f"<font name='Courier' size='7'>{ts_short}</font>",
                      S["td_mono"]),
            Paragraph(f"<font name='Courier' size='7'>{e['action']}</font>",
                      S["td_mono"]),
            Paragraph(f"<font name='Courier' size='7'>{e['actor']}</font>",
                      S["td_mono"]),
            Paragraph(combined, S["td"]),
        ])
    story.append(data_table(
        ["Timestamp (UTC)", "Action", "Actor", "Transition / Metadata"],
        ac_rows,
        col_widths=[1.25*inch, 1.85*inch, 1.85*inch,
                    FRAME_W - 1.25*inch - 1.85*inch - 1.85*inch],
    ))
    story.append(Spacer(1, 12))

    # Stakeholders
    story.append(Paragraph("STAKEHOLDER CONTRIBUTIONS", S["h3"]))
    sc_rows = []
    for s in SEED["stakeholderContributions"]:
        sc_rows.append([
            Paragraph(f"<font name='Courier' size='8'>{s['email']}</font> {fr()}",
                      S["td_mono"]),
            Paragraph(s["role"], S["td"]),
            Paragraph(s["domain"], S["td"]),
            Paragraph(f"<font name='Courier' size='7'>{s['submittedAt']}</font>",
                      S["td_mono"]),
        ])
    story.append(data_table(
        ["Contributor", "Role", "Domain", "Submitted at"],
        sc_rows,
        col_widths=[2.2*inch, 1.4*inch, 1.3*inch,
                    FRAME_W - 2.2*inch - 1.4*inch - 1.3*inch],
    ))
    gaps_text = ("<b>Coverage gaps:</b> none \u2014 all intake-derived "
                 "stakeholder domains submitted contributions.")
    story.append(Spacer(1, 4))
    story.append(Paragraph(gaps_text, S["meta"]))
    story.append(Spacer(1, 12))

    # Workflow
    story.append(Paragraph("WORKFLOW CONTEXT", S["h3"]))
    wf_rows = []
    for w in SEED["workflowContext"]:
        wf_rows.append([
            Paragraph(f"<font name='Courier' size='8'>{w['workflowId']}</font> {fr()}",
                      S["td_mono"]),
            Paragraph(f"{w['workflowName']} {fr()}", S["td"]),
            Paragraph(w["role"], S["td"]),
            Paragraph("required" if w["required"] else "optional", S["td_center"]),
        ])
    story.append(data_table(
        ["Workflow ID", "Workflow name", "Agent role", "Participation"],
        wf_rows,
        col_widths=[1.5*inch, 2.2*inch, 1.5*inch,
                    FRAME_W - 1.5*inch - 2.2*inch - 1.5*inch],
    ))
    story.append(Spacer(1, 12))

    # Periodic review
    story.append(Paragraph("PERIODIC REVIEW SCHEDULE", S["h3"]))
    pr = SEED["periodicReviewSchedule"]
    pr_rows = [
        ("Enabled", "true"),
        ("Cadence", f"{pr['cadenceMonths']} months"),
        ("Last periodic review",
         Paragraph("<i>none (initial deployment)</i>", S["kv_v"])),
        ("Next review due",
         Paragraph(f"<font name='Courier' size='9'>{pr['nextReviewDueAt']}</font>",
                   S["kv_v"])),
        ("Currently overdue", "false"),
    ]
    story.append(kv_table(pr_rows))

def build_signoff(story):
    story.append(PageBreak())
    story.extend(section_header("Formal Attestation", "Section 10"))

    story.append(Paragraph(
        "The attestations on this page are not re-signed at export time \u2014 "
        "they are replayed from the blueprint's immutable audit chain. Each "
        "signature block represents a recorded action in the Intellios audit "
        "log. All timestamps are authoritative.",
        S["body_justify"]))
    story.append(Spacer(1, 14))

    sod = SEED["sodEvidence"]
    rev = SEED["reviewDecision"]
    dep = SEED["deploymentRecord"]

    def sig_block(label, name, role, ts, comment):
        return [
            Paragraph(label, S["sig_label"]),
            HRFlowable(width=FRAME_W, thickness=0.8, color=INDIGO,
                        spaceBefore=2, spaceAfter=6),
            Paragraph(name, S["sig_name"]),
            Paragraph(role, S["sig_role"]),
            Paragraph(ts, S["sig_timestamp"]),
            Paragraph(comment, S["sig_comment"]),
            Spacer(1, 18),
        ]

    story.extend(sig_block(
        "MODEL OWNER \u2014 ARCHITECT ATTESTATION",
        f"{sod['architect']} {fr()}",
        "Model Owner / Architect of record",
        f"Recorded: {sod['architectTimestamp']}",
        "Attested via the first transition from draft to in_review. "
        "Owner attests the intended use matches the original intake scope."))

    story.extend(sig_block(
        "INDEPENDENT REVIEWER \u2014 MRM ATTESTATION",
        f"{sod['reviewer']} {fr()}",
        "Model Risk Management Reviewer",
        f"Recorded: {sod['reviewerTimestamp']}",
        f"&ldquo;{rev['comment']}&rdquo;"))

    story.extend(sig_block(
        "DEPLOYMENT APPROVER \u2014 CHANGE CONTROL ATTESTATION",
        f"{sod['deployer']} {fr()}",
        "Deployment Approver / Change Owner",
        f"Recorded: {sod['deployerTimestamp']}",
        f"Deployed to {dep['deploymentTarget']} under change reference "
        f"<font name='Courier' size='8'>{dep['changeRef']}</font>. {fr()}"))

    story.append(HRFlowable(width=FRAME_W, thickness=0.4, color=RULE,
                             spaceBefore=6, spaceAfter=8))
    story.append(Paragraph("PACKAGE INTEGRITY STATEMENT", S["h3"]))
    story.append(Paragraph(
        "This package was assembled from the Agent Registry at "
        "<font name='Courier' size='8'>2026-04-09T14:22:11Z</font> by "
        "<font name='Courier' size='8'>assembleMRMReport()</font>. "
        "The canonical JSON export is cached at "
        "<font name='Courier' size='8'>evidence/bp_01K5XPQR8V4N7F2WYZ/2.1.json</font> "
        "and served via signed URL on re-export. The export action was "
        "recorded in the blueprint audit log as "
        "<font name='Courier' size='8'>blueprint.evidence_package_exported</font>. "
        "This PDF is a <b>rendering</b> of that canonical JSON. On any "
        "discrepancy, the JSON export is authoritative.",
        S["body_justify"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Intellios does not currently emit cryptographic signatures on "
        "evidence packages. Integrity is enforced by the immutable audit "
        "log and the append-only Agent Registry. Cryptographic attestation "
        "(SHA-256 manifest + signing key chain) is tracked as a roadmap "
        "item for a future release.",
        S["footnote"]))

# =============================================================================
# DOCUMENT ASSEMBLY
# =============================================================================

def build_document(out_path):
    doc = BaseDocTemplate(
        out_path,
        pagesize=LETTER,
        leftMargin=MARGIN_L, rightMargin=MARGIN_R,
        topMargin=MARGIN_T, bottomMargin=MARGIN_B,
        title="Evidence Package \u2014 Claims-Triage-Agent v2.1",
        author="Intellios (sample rendering)",
        subject="Regulatory Evidence Export \u2014 Sample",
    )

    cover_frame = Frame(
        MARGIN_L, MARGIN_B, FRAME_W, FRAME_H,
        id="cover", leftPadding=0, rightPadding=0,
        topPadding=0, bottomPadding=0,
    )
    content_frame = Frame(
        MARGIN_L, MARGIN_B, FRAME_W, FRAME_H,
        id="content", leftPadding=0, rightPadding=0,
        topPadding=0, bottomPadding=0,
    )

    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[cover_frame],
                      onPage=cover_page_decoration),
        PageTemplate(id="content", frames=[content_frame],
                      onPage=content_page_decoration),
    ])

    story = []
    build_cover(story)
    story.append(NextPageTemplate("content"))
    story.append(PageBreak())

    build_executive_summary(story)
    build_identity_capabilities(story)
    build_policy_as_code(story)
    build_governance_validation(story)
    build_review_sod_approval(story)
    build_lineage_deployment(story)
    build_regulatory_frameworks(story)
    build_quality_and_tests(story)
    build_audit_chain_context(story)
    build_signoff(story)

    doc.build(story)
    print(f"Wrote: {out_path}")


if __name__ == "__main__":
    out = "evidence-package-claims-triage-agent-v2.1-2026-04-09.pdf"
    build_document(out)
