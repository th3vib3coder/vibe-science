# Writeup Engine — Paper Drafting Protocol

> Load this when: Stage 5, paper drafting, or when the user requests a written output from the research.

## Overview

The Writeup Engine produces research documents from the accumulated evidence. It pulls from the CLAIM-LEDGER, confounder harness results, R2 reviews, and tree search history to produce accurate, evidence-grounded text.

The writeup engine does NOT invent claims. It reports what was found, verified, and survived adversarial review.

---

## When to Use

- Stage 5 (Synthesis & Review) — primary use case
- User requests a paper draft or research report
- Creating supplementary materials
- Producing a methods section for reproducibility

---

## Input Requirements

Before the writeup engine can produce output, verify these exist:

```
REQUIRED:
□ CLAIM-LEDGER.md — all claims with final statuses
□ ASSUMPTION-REGISTER.md — all assumptions with statuses
□ CONFOUNDER-HARNESS files — for every promoted quantitative claim
□ R2 final ensemble review — ACCEPT verdict
□ TREE-STATE.json — full tree with best nodes identified
□ 08-tree/best-nodes.md — stage-best summaries
□ RQ.md — original hypothesis, success criteria, kill conditions
□ 00-brainstorm/ — context, landscape, gaps, hypotheses

RECOMMENDED:
□ 06-runs/ — run manifests and reports
□ 08-tree/tree-visualization.md — final tree snapshot
□ Figures validated by VLM (if available)
```

---

## Document Structure (IMRAD)

### 1. Introduction
**Source from:** RQ.md (question, hypothesis), 00-brainstorm/landscape.md (field context), 00-brainstorm/gaps.md (motivation)

**Rules:**
- State the research question clearly
- Motivate with evidence from the literature landscape
- State the hypothesis and its falsifiable predictions
- Do NOT overclaim — use language consistent with what R2 approved

### 2. Methods
**Source from:** TREE-STATE.json (approach), 08-tree/nodes/ (what was actually done), 06-runs/ (manifests), ASSUMPTION-REGISTER.md (stated assumptions)

**Rules:**
- Describe what was ACTUALLY done (not what was planned)
- Include: data sources with accession numbers, preprocessing steps, model details, evaluation metrics
- State all assumptions explicitly
- Include reproducibility contract: seeds, versions, parameters
- Reference the confounder harness methodology

### 3. Results
**Source from:** CLAIM-LEDGER.md (verified/confirmed/robust claims ONLY), confounder harness files, 08-tree/best-nodes.md (metrics), figures

**Rules:**
- Report ONLY claims with status VERIFIED, CONFIRMED, or ROBUST
- Do NOT include UNVERIFIED, ARTIFACT, CONFOUNDED, or REJECTED claims in positive language
- For each major claim: state the finding, provide the evidence, report the confounder harness result
- Include negative results (what was killed and why)
- Report ablation results (which components matter)
- Use R2-approved phrasing (from "What You Can Claim" section of R2 review)

### 4. Discussion
**Source from:** R2 final review (guiding sentence), CLAIM-LEDGER.md (all claims including killed), ASSUMPTION-REGISTER.md (limitations)

**Rules:**
- Lead with R2's "Single Guiding Sentence" (section M of R2 output)
- Discuss findings in context of the literature landscape
- Explicitly state limitations (from R2 review and assumption register)
- Discuss what was killed and why (this adds credibility)
- Do NOT use language that R2 flagged in "What You Cannot Claim"
- Propose future work based on unresolved questions and queued serendipity items

---

## Claim-to-Text Rules

### Safe Phrasing
When converting claims to prose:

| Claim Status | Allowed Language |
|-------------|-----------------|
| ROBUST | "We find that...", "Our analysis demonstrates..." |
| CONFIRMED | "We confirm that...", "Consistent with [prior work]..." |
| VERIFIED | "Our results suggest...", "We observe..." |
| CONFOUNDED | "The apparent effect of X is partially explained by confounder Y" |
| ARTIFACT | Do NOT include as positive finding. Mention in "killed claims" section if relevant. |
| REJECTED | Do NOT include as positive finding. |

### Confidence-to-Language Mapping

| Confidence | Language |
|-----------|----------|
| 0.80-1.00 (HIGH) | "strongly suggests", "demonstrates", "provides evidence for" |
| 0.60-0.79 (MEDIUM) | "suggests", "is consistent with", "our results indicate" |
| 0.40-0.59 (LOW) | "may suggest", "preliminary evidence for", "requires further investigation" |
| < 0.40 (INSUFFICIENT) | Do NOT include in conclusions. Log for transparency only. |

---

## Figure Selection

1. Collect all figures from `08-tree/nodes/` that are associated with promoted claims
2. If VLM validation was run, prefer figures with vlm_score >= 0.8
3. Select figures that directly support the narrative
4. Do NOT include figures that contradict the conclusions unless discussing them explicitly
5. Ensure all figures are labeled, accessible, and publication-quality

---

## Supplementary Materials

Generate supplementary materials for:
- Full claim ledger (all 34+ claims with statuses)
- Confounder harness results for each quantitative claim
- Tree search visualization (final snapshot)
- Sprint reports (if applicable)
- Complete ablation matrix
- Sensitivity analyses

---

## Skill Dispatch for Writing

Use skill-router.md to dispatch to writing skills:

| Task | Skill |
|------|-------|
| Paper draft | `scientific-writing` skill |
| LaTeX formatting | `venue-templates` skill (for specific venues) |
| Citation formatting | `citation-management` skill |
| Figures | `scientific-visualization` skill |
| Supplementary tables | `xlsx` or internal formatting |

---

## Quality Checks Before Output

Before finalizing any written document:

1. **Claim Verification**: Every claim in the text exists in CLAIM-LEDGER.md with appropriate status
2. **Citation Verification**: Every cited paper has a verified DOI
3. **R2 Language Check**: No phrasing that R2 flagged in "What You Cannot Claim"
4. **Confounder Status**: Every quantitative claim reports its confounder harness result
5. **Negative Results**: Killed claims are documented (adds credibility)
6. **Assumption Transparency**: All active assumptions stated in limitations
7. **Reproducibility**: Methods section includes all information needed to reproduce

---

## R2 Review of Writeup

The writeup itself should be reviewed by R2 (final Stage 5 review):
- R2 checks that prose matches evidence
- R2 flags any overclaiming (language stronger than evidence supports)
- R2 verifies negative results are reported
- R2 checks that limitations are honest and complete
- R2 verdict on writeup: ACCEPT → publish. REVISION → fix and re-review.
