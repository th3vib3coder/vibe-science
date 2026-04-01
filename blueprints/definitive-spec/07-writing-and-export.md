# 07 — Writing and Export

---

## Purpose

Turn validated research outputs into structured writing inputs and deliverable bundles. This module connects kernel-validated truth to the researcher's paper, without letting the writing process create new truth.

---

## Three Tiers of Writing

| Tier | Content type | Kernel authority | Rule |
|------|-------------|-----------------|------|
| **Claim-backed** | Results, quantitative conclusions | Full — MUST reference export-eligible claims | Only kernel-validated claims appear here |
| **Artifact-backed** | Methods, preprocessing, parameters | Partial — grounded in experiment manifests | Must trace to registered experiment manifests |
| **Free** | Introduction, Discussion, hypotheses | None — researcher writes freely | Kernel has no authority over speculation |

**The critical boundary:** Claim-backed writing ONLY shows export-eligible claims. The researcher CANNOT accidentally include a killed or disputed finding in their Results section.

---

## Export Eligibility

A claim is export-eligible ONLY when the shared normative helper
`exportEligibility()` returns `eligible: true`.

The helper returns:

```js
{
  eligible: true | false,
  reasons: ['not_promoted', 'unverified_citations', 'zero_citations', ...]
}
```

V1 normative rule:
1. **Lifecycle:** claim head status is exactly `PROMOTED`
2. **Citations:** at least one tracked citation exists, and all are `VERIFIED`
3. **Profile safety:** if `governance_profile_at_creation = minimal`, require explicit R2 evidence + fresh schema validation at export time

`listUnresolvedClaims()` may still be consumed for diagnostics/review debt
surfacing, but it is NOT the sole normative export-safe predicate for claim-backed
writing.

**Implementation:** `environment/lib/export-eligibility.js`

### Inputs Required By The Profile-Safety Extension

The base export rule can already be computed from current reader projections.
The profile-safety extension adds two extra inputs that MUST be sourced
explicitly:

1. `governanceProfileAtCreation`
   - source of truth: kernel-provided claim metadata once available
   - minimum compatibility requirement: a claim-head companion field or adjacent
     projection that tells the outer project whether the claim was created under
     `minimal`, `standard`, or `strict`
2. `hasFreshSchemaValidation`
   - source of truth: outer-project validation artifact written at export time
   - location: `.vibe-science-environment/governance/schema-validation/<claimId>.json`
   - contract: `environment/schemas/schema-validation-record.schema.json`

Validation artifact shape:

```json
{
  "claimId": "C-014",
  "validatedAt": "2026-03-29T15:10:00Z",
  "validatorVersion": "v1",
  "ok": true
}
```

If the kernel does not yet expose `governanceProfileAtCreation`, the outer
project may treat the claim as `standard` for compatibility, but it MUST record
that the profile-safety extension was not fully available. That is a degraded
mode, not silent equivalence.

```js
function exportEligibility(claimId, reader, options = {}) {
  const reasons = [];
  const heads = reader.listClaimHeads();
  const head = heads.find(c => c.claimId === claimId);
  if (!head || head.currentStatus !== 'PROMOTED') reasons.push('not_promoted');

  const reviewDebt = reader.listUnresolvedClaims();
  if (head && head.currentStatus !== 'PROMOTED' && reviewDebt.some(c => c.claimId === claimId)) {
    reasons.push('review_debt_signal');
  }

  const citations = reader.listCitationChecks({ claimId });
  if (citations.length === 0) reasons.push('zero_citations');
  if (citations.length > 0 && !citations.every(c => c.verificationStatus === 'VERIFIED')) {
    reasons.push('unverified_citations');
  }

  if (options.governanceProfileAtCreation === 'minimal' && !options.hasFreshSchemaValidation) {
    reasons.push('needs_fresh_schema_validation');
  }

  return {
    eligible: !reasons.some(r => ['not_promoted', 'zero_citations', 'unverified_citations', 'needs_fresh_schema_validation'].includes(r)),
    reasons
  };
}
```

**Test with 7 cases:** eligible, created/unpromoted, killed, disputed, unverified citation, zero tracked citations, minimal-profile claim without fresh schema validation.

---

## Export Snapshot

Claim-backed export MUST run against a frozen snapshot, not against projections
that may drift mid-command.

Before `/flow-writing` generates seeds or bundles, it writes:

`.vibe-science-environment/writing/exports/snapshots/<snapshot-id>.json`

Contract:
- `environment/schemas/export-snapshot.schema.json`
- `environment/flows/writing.js`

Suggested shape:

```json
{
  "snapshotId": "WEXP-2026-03-30-001",
  "createdAt": "2026-03-30T09:45:00Z",
  "claimIds": ["C-014"],
  "eligibility": [
    {"claimId": "C-014", "eligible": true, "reasons": []}
  ],
  "citations": [
    {"claimId": "C-014", "citationId": "CIT-033", "verificationStatus": "VERIFIED"}
  ],
  "capabilities": {
    "governanceProfileAtCreation": false
  }
}
```

Rules:
- all claim-backed writing artifacts reference `snapshotId`
- advisor packs and export logs may reference a snapshot when generated from the
  same run
- post-export safety compares current projections against the frozen snapshot,
  not against remembered prose
- this is a versioned derived record, not a promise that kernel resources are
  globally immutable

---

## Writing Handoff Flow (`/flow-writing`)

### Step 1: Create Snapshot, Then Gather Export-Eligible Claims
```bash
node plugin/scripts/core-reader-cli.js claim-heads --project .
```
Create the export snapshot first, then filter through `exportEligibility()`.
Present only claims where `eligible === true`.

### Step 2: Present Claims with Evidence Chains
For each eligible claim, present:
- Claim ID, status, confidence
- Claim narrative/summary ONLY if available via claim-head metadata or future export packet
- Citation references

Optional enrichment when available:
- Supporting experiment IDs (from experiment manifests or future export packet)
- Confounder harness summary (from future kernel-owned export packet)

V1 rule: if those optional fields are not available through current contract
surfaces, do NOT fabricate them.

Specifically:
- do NOT parse `CLAIM-LEDGER.md` ad hoc just to invent a "title"
- do NOT synthesize a title from assistant prose
- if no canonical summary exists, render `claimId` plus lifecycle metadata only

### Step 3: Generate Claim-Backed Writing Seed

```markdown
## Results Seed — Claim C-014

**Finding:** Cell-type composition confounds bulk differential expression analysis.
**Status:** PROMOTED
**Confidence:** 0.91
**Citations:** [DOI:10.1234/example — VERIFIED], [PMID:12345678 — VERIFIED]

Optional enrichment:
- Supporting experiments: EXP-003, EXP-007
- Confounder harness summary: raw → conditioned → matched stable

This seed contains kernel-validated facts plus optional manually-linked or
future-export-packet enrichments. The researcher transforms it into paper prose.
```

### Step 4: Track Export

Every claim export is tracked:
```json
{
  "claimId": "C-014",
  "snapshotId": "WEXP-2026-03-30-001",
  "exportedAt": "2026-03-29T15:00:00Z",
  "exportedToFlow": "writing",
  "governanceProfileAtExport": "standard"
}
```

**Storage:** `.vibe-science-environment/writing/exports/export-log.jsonl`
**Contract:** `environment/schemas/export-record.schema.json`

If the claim later becomes killed/disputed, the writing flow surfaces a warning next time it runs.

---

## Deliverable Bundles

### Advisor Meeting Pack

Reads kernel state + experiment registry + memory:
```
.vibe-science-environment/writing/advisor-packs/2026-03-29/
├── status-summary.md       — active claims, recent changes
├── experiment-progress.md  — running/completed/blocked experiments
├── open-questions.md       — blockers and unresolved items
├── figures/                — latest figures from result bundles
└── next-steps.md           — proposed next actions
```

### Rebuttal Prep Pack (Phase 3)

After paper submission, when reviewer comments arrive:
```
.vibe-science-environment/writing/rebuttal/submission-001/
├── reviewer-comments.md    — imported reviewer feedback
├── claim-status.md         — current status of each challenged claim
├── experiment-plan.md      — new experiments needed to address feedback
└── response-draft.md       — structured response skeleton
```

---

## Citation Discipline

**WARNING:** `/flow-writing` is a consumer of citation truth, not the owner of citation verification.

For claim-backed writing artifacts:
1. `/flow-writing` only consumes citations already marked `VERIFIED` in kernel projections
2. if a required citation is missing or unverified, export stops with reason code
3. the researcher must rerun the kernel-owned citation-verification workflow before retrying export

If a citation is not already verified in kernel state: mark `[CITATION NEEDED]` in non-claim-backed drafting space. Do NOT fabricate a plausible-looking reference.

---

## Post-Export Safety

What happens if a claim changes AFTER being exported to writing:

| Change | Action |
|--------|--------|
| Claim KILLED | WARNING next time `/flow-writing` runs: "C-003 was exported but is now KILLED" |
| Claim DISPUTED | WARNING: "C-003 was exported but is now DISPUTED — remove from draft" |
| Citation retracted | WARNING: "Citation in C-003 retracted — review evidence chain" |
| New R2 review downgrades confidence | INFO: "C-003 confidence changed: 0.91 → 0.65 — review draft language" |

These are **warnings**, not automatic edits. The researcher decides how to handle them.

Persist warning records to:
`.vibe-science-environment/writing/exports/export-alerts.jsonl`

Contract:
- `environment/schemas/export-alert-record.schema.json`

---

## Invariants

1. Claim-backed writing ONLY references export-eligible claims
2. Every exported claim carries claim_id for audit traceability
3. Export eligibility is computed once in the shared helper, not re-encoded per flow
4. Post-export changes surface warnings, not silent updates
5. Free writing (intro, discussion) is explicitly NOT claim-backed
6. The writing flow prepares materials — the human writes the paper
7. Claim-backed exports consume citations already verified by kernel workflows; they do not verify citations themselves
8. Claim-backed export runs against a frozen snapshot, not live state that may drift mid-command
