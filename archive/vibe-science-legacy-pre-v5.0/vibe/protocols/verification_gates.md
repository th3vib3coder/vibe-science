# VERIFICATION GATES v2.0

**Principle:** "NO CLAIM WITHOUT FRESH VERIFICATION EVIDENCE"

Saying "it works" without showing it works = scientific dishonesty.

---

## GATE PROTOCOL

### 5-Step Verification (MANDATORY)

```
1. IDENTIFY → What command/test proves this claim?
2. RUN → Execute FRESH (not cached from earlier)
3. READ → Check COMPLETE output, exit codes, counts
4. VERIFY → Does output MATCH the claim?
5. DOCUMENT → Attach evidence to claim
```

Only AFTER all 5 steps: claim is "verified"

---

## EVIDENCE MATRIX

| Claim Type | VALID Evidence | INVALID Evidence |
|------------|----------------|------------------|
| "Finding validated" | 2+ independent sources with verified DOIs | "Should be correct" |
| "Data supports hypothesis" | Statistical test with p-value and effect size | "Looks right" |
| "Method works" | Replication on independent test data | "Code runs without errors" |
| "Search complete" | Query log with results count per database | "I checked everything" |
| "No contradictions found" | Exhaustive search log with null results | "Didn't find any" |
| "Literature gap confirmed" | Search across 3+ databases with 0 results | Single database check |
| "Quote accurate" | Page number + screenshot if needed | Paraphrasing |
| "DOI valid" | HTTP 200 response from doi.org | "I remember it's correct" |

---

## GATE TYPES

### Gate 1: Source Verification Gate

**Trigger:** Before any finding uses a source

**Check:**
```
□ DOI resolves (HTTP 200 from https://doi.org/{doi})
□ Paper accessible (can read abstract at minimum)
□ Quote exists at cited location
□ Quote not cherry-picked (read surrounding context)
□ Paper type identified (primary/review/etc.)
```

**Evidence Required:**
```markdown
Source: Tsai 2015
DOI: 10.1038/nbt.3117
Verified: 2026-02-06T10:30:00Z
Status: RESOLVED
Quote location: Methods, p.3, paragraph 2
Context verified: YES
```

**Block if:** DOI doesn't resolve OR quote not found

---

### Gate 2: Search Completeness Gate

**Trigger:** Before claiming "search complete" or "gap identified"

**Check:**
```
□ All tier-1 databases searched (Scopus, PubMed, OpenAlex)
□ Synonym keywords tried
□ Recent preprints checked (<6 months)
□ Citation tracking done (who cites key papers?)
□ Negative results logged
```

**Evidence Required:**
```markdown
Search Completeness Report

| Database | Query | Results | Relevant | Date |
|----------|-------|---------|----------|------|
| Scopus | "optimal transport" CRISPR | 57 | 4 | 2026-02-06 |
| PubMed | "optimal transport" CRISPR | 23 | 2 | 2026-02-06 |
| OpenAlex | "optimal transport" CRISPR | 89 | 5 | 2026-02-06 |
| bioRxiv | "optimal transport" CRISPR | 3 | 1 | 2026-02-06 |

Synonyms tried: "Wasserstein", "earth mover"
Citation tracking: Tsai 2015 (457 citing papers reviewed)
Gap confirmed: 0 papers on UOT + CRISPR
```

**Block if:** Any tier-1 database missing OR no synonym search

---

### Gate 3: Data Availability Gate

**Trigger:** Before claiming "data supports" or marking data as available

**Check:**
```
□ Data actually downloadable (not just referenced)
□ Data format readable (not corrupted/encrypted)
□ Data matches description (rows/columns as expected)
□ Data sufficient for analysis (coverage, sample size)
```

**Evidence Required:**
```markdown
Data Availability Report

Source: Tsai 2015 Supplementary Table S1
URL: https://www.nature.com/articles/nbt.3117/tables/1
Downloaded: 2026-02-06T10:45:00Z
Format: CSV
Rows: 2,847 (expected: ~3,000)
Columns: gene_id, position, read_count, significance
Integrity: MD5 hash stored
Sufficient: YES (covers all tested guide RNAs)
```

**Block if:** Data not actually accessible OR format unreadable

---

### Gate 4: Statistical Verification Gate

**Trigger:** Before claiming "statistically significant" or quantitative results

**Check:**
```
□ Test appropriate for data type
□ Assumptions met (normality, independence, etc.)
□ P-value and effect size both reported
□ Multiple testing correction if needed
□ Results reproducible (code/script attached)
```

**Evidence Required:**
```markdown
Statistical Verification Report

Test: Wilcoxon rank-sum test
Justification: Non-normal distribution (Shapiro p=0.002)
Sample sizes: n1=2847, n2=1523
P-value: 2.3e-15
Effect size: Cohen's d = 0.82 (large)
Multiple testing: Bonferroni correction applied
Script: analysis/statistical_test.py (commit abc123)
```

**Block if:** Test inappropriate OR assumptions violated OR no reproducibility

---

### Gate 5: Conclusion Gate

**Trigger:** Before marking RQ as complete with SUCCESS/NEGATIVE

**Check:**
```
□ All success criteria addressed (from RQ.md)
□ All major findings R2-approved
□ No outstanding mandatory R2 responses
□ Numerical validation obtained
□ Counter-evidence addressed or acknowledged
□ Assumptions documented
□ Limitations documented
```

**Evidence Required:**
```markdown
Conclusion Verification Report

## Success Criteria Checklist

- [x] Gap in literature confirmed (Search Gate passed)
- [x] Data availability verified (Data Gate passed)
- [x] Method feasibility demonstrated (Analysis complete)
- [x] Results quantified (Statistical Gate passed)

## Reviewer 2 Status

| Finding | R2 Score | Verdict |
|---------|----------|---------|
| FINDING-001 | 85 | APPROVED |
| FINDING-002 | 78 | APPROVED_WITH_CONCERNS |
| FINDING-003 | 92 | APPROVED |

Outstanding mandatory responses: 0

## Final Confidence

Score: 0.82
Level: HIGH
Trajectory: ↗ (increasing over last 5 cycles)
```

**Block if:** Any success criterion unmet OR R2 responses pending

---

## RED FLAGS (IMMEDIATE BLOCK)

These phrases trigger automatic gate failure:

| Phrase | Problem | Required Instead |
|--------|---------|------------------|
| "should work" | Unverified assumption | Fresh test output |
| "probably" | Uncertainty without acknowledgment | Quantified confidence |
| "seems to" | Vague observation | Specific measurement |
| "I think" | Personal opinion | Cited evidence |
| "obviously" | Skipped verification | Explicit proof |
| "everyone knows" | Appeal to authority | Primary source |
| "it's common knowledge" | Unverified claim | Citation needed |
| "I remember" | Memory without verification | Fresh lookup |

---

## GATE FAILURE PROTOCOL

When a gate fails:

1. **Document failure reason**
   ```
   Gate: Source Verification
   Failure: DOI 10.1234/fake.doi does not resolve
   Severity: BLOCKING
   ```

2. **Block dependent claims**
   - All claims using this source = UNVERIFIED
   - Confidence = temporarily set to VERY_LOW

3. **Create remediation task**
   ```
   TODO: Verify DOI for Kim 2020
   Priority: BLOCKING
   Deadline: Before next cycle
   ```

4. **Resume only after resolution**
   - Gate must PASS before proceeding
   - No "proceed anyway" option

---

## AUDIT TRAIL

All gate checks logged to `verification_log.jsonl`:

```json
{
  "timestamp": "2026-02-06T10:30:00Z",
  "gate": "source_verification",
  "finding": "FINDING-001",
  "source": "Tsai 2015",
  "doi": "10.1038/nbt.3117",
  "checks": {
    "doi_resolves": true,
    "quote_verified": true,
    "context_checked": true
  },
  "result": "PASS",
  "evidence_attached": "verification/tsai2015_check.md"
}
```

---

## INTEGRATION WITH REVIEWER 2

Reviewer 2 v2.0 checks gate status BEFORE reviewing:

```
IF any gate FAILED for finding:
    R2 verdict = BLOCKED (cannot review until gates pass)
    Return: "Fix verification gates before requesting review"

IF all gates PASS:
    Proceed with hostile review
```

Gates are PREREQUISITE for R2, not replacement.

---

## PHILOSOPHY

"Trust, but verify" is WRONG for science.

"Verify, then maybe trust a little" is correct.

Gates ensure we never claim what we haven't proven.
