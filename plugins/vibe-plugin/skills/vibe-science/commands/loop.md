# vibe-science:loop

Execute one cycle of the Vibe Science research loop.

## When to Use

After `/vibe-science:init` or to continue an existing session.

## Usage

```
/vibe-science:loop
```

## What It Does

One complete cycle of the research loop:

```
1. CRYSTALLIZE → 2. SEARCH → 3. ANALYZE → 4. EXTRACT → 5. VALIDATE → 6. CHECK STOP
```

## Process

### Step 1: Crystallize State

Read current state and update:

```markdown
Reading .vibe-science/STATE.md...

Current state:
- RQ: RQ-001-uot-crispr
- Phase: discovery
- Cycle: 7
- Minor findings pending: 2

Resuming from: "Search PubMed for GUIDE-seq protocol details"
```

### Step 2: Search Literature

Execute next planned search:

```markdown
**Query:** TITLE-ABS-KEY("GUIDE-seq") AND TITLE-ABS-KEY(protocol OR method)
**Database:** Scopus
**Results:** 45

Analyzing results...
- 12 methodology papers
- 8 application papers
- 3 review articles

Flagging for deep-dive:
1. Tsai 2015 (original method) - DOI:10.1038/nbt.3117
2. Lazzarotto 2020 (improvements) - DOI:10.1038/s41596-020-0310-7
```

Log to `queries.log` and `PROGRESS.md`.

### Step 3: Analyze Findings

For each relevant paper:

```markdown
Reading: Tsai et al. 2015

**Finding:** GUIDE-seq produces genome-wide off-target site counts

**Type:** MAJOR - directly relevant to OT formulation
**Confidence:** HIGH - primary source, methodology paper

→ STOP: Major finding triggers Reviewer 2
```

Or:

```markdown
**Finding:** Cell viability affects read counts in GUIDE-seq

**Type:** MINOR - supporting evidence
**Confidence:** MEDIUM - mentioned in discussion

Minor findings pending: 3/3 → Batch Reviewer 2 triggered
```

### Step 4: Extract Data (if applicable)

If paper has relevant supplementary data:

```markdown
Downloading supplementary materials for Tsai 2015...

- Table S1: Off-target sites (CSV) ✓
- Table S2: Read counts (XLSX) ✓
- Methods S1: Protocol (PDF) ✓

Reading Table S1 (complete - 2,847 rows)...
Reading Table S2 (complete - 156 rows)...

Extracted: Off-target count data suitable for OT input
```

### Step 5: Validate

Check data availability:

```markdown
Validation check:
- [ ] Data exists? YES - Table S1 has count data
- [ ] Accessible? YES - Supplementary materials downloaded
- [ ] Format usable? YES - CSV with clear columns

→ CONTINUE (data available)
```

Or:

```markdown
Validation check:
- [ ] Data exists? NO - paper describes method but no public data
- [ ] Alternative? Checking GEO... NOT FOUND

→ PATH BLOCKED - Need alternative data source
```

### Step 6: Check Stop Conditions

```markdown
Stop condition check:

- Goal achieved? NO - still gathering evidence
- Dead end? NO - promising direction
- Serendipity? NO - staying on track
- Blocked? NO - data available

→ CONTINUE TO NEXT CYCLE
```

### Step 7: Update State

```markdown
Updating STATE.md:
- Cycle: 8
- Phase: discovery (continuing)
- Minor findings pending: 0 (cleared by batch review)
- Next action: Deep-dive Tsai 2015 methodology

Appending to PROGRESS.md:
### Cycle 7 - 15:45
- **Action:** Scopus search GUIDE-seq methodology
- **Result:** Found 45 papers, 3 flagged
- **Decision:** Major finding on count data → Reviewer 2
- **Serendipity:** None
```

## Reviewer 2 Triggers

During the loop, these trigger Reviewer 2:

| Trigger | Action |
|---------|--------|
| Major finding | STOP loop, invoke `/vibe-science:reviewer2` |
| 3 minor findings | STOP loop, invoke `/vibe-science:reviewer2 --batch` |

After Reviewer 2 completes, loop resumes.

## Loop Termination

The loop ends when:

1. **SUCCESS:** All success criteria in RQ.md met
2. **NEGATIVE:** Kill condition triggered
3. **PIVOT:** Serendipity warrants new RQ

Output appropriate CONCLUSION.md template.

## Example Cycle

```
/vibe-science:loop

─────────────────────────────────────────
VIBE SCIENCE - Cycle 7
─────────────────────────────────────────

[1/6] CRYSTALLIZE
Reading state... RQ-001-uot-crispr, Phase: discovery, Cycle: 7
Minor findings pending: 2
Next action: Search PubMed for GUIDE-seq protocol

[2/6] SEARCH
Database: PubMed
Query: "GUIDE-seq"[Title] AND ("protocol"[Title] OR "method"[Title])
Results: 23

[3/6] ANALYZE
Paper 1: Tsai 2015 - Original GUIDE-seq method
→ MAJOR FINDING: Count data suitable for optimal transport!

[STOP] Major finding detected. Invoking Reviewer 2...

─────────────────────────────────────────
REVIEWER 2 SESSION
─────────────────────────────────────────

[Reviewer 2 critique and response...]

Verdict: APPROVED

─────────────────────────────────────────
RESUMING LOOP
─────────────────────────────────────────

[4/6] EXTRACT
Downloading Tsai 2015 supplementary...
Table S1: 2,847 off-target sites ✓
Reading complete.

[5/6] VALIDATE
Data exists: YES
Accessible: YES
Format usable: YES
→ CONTINUE

[6/6] CHECK STOP
Goal achieved: NO
Dead end: NO
Serendipity: NO
→ NEXT CYCLE

─────────────────────────────────────────
Cycle 7 complete. State updated.
Next: Run /vibe-science:loop for cycle 8
─────────────────────────────────────────
```
