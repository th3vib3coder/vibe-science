# Serendipity Engine — Protocol

> Load this when: THINK-brainstorm phase, CHECKPOINT-serendipity trigger, or scheduled Serendipity Sprint.

## Core Principle

Serendipity is not chaos — it's structured exploration of unexpected connections. Every serendipitous observation gets tracked, triaged, and either pursued or filed.

## Detection

### During Normal Cycles
While executing any ACT phase, flag serendipity when you encounter:
- A paper in field X that unexpectedly connects to field Y
- A dataset that could answer a question you weren't asking
- A method from another domain applicable to current RQ
- A contradiction that opens a new research direction
- A gap in the literature that nobody seems to be addressing

### Serendipity Signal Format
Log immediately in SERENDIPITY.md:
```markdown
## S-NNN: [Brief title]
- **Date:** YYYY-MM-DD
- **Origin:** Cycle N of RQ-XXX, during [action]
- **Observation:** [What was unexpected]
- **Potential:** [Why this could matter — 1-2 sentences]
- **Data available?** YES/NO/UNKNOWN
- **Triage:** PENDING
```

## Triage Protocol

### Priority Assessment
For each pending serendipity observation, evaluate:

| Criterion | Score (0-3) |
|-----------|-------------|
| Data availability (can we test this?) | 0=none, 3=public dataset exists |
| Impact if true (how big a deal?) | 0=incremental, 3=paradigm shift |
| Connection to current work (synergy?) | 0=unrelated, 3=directly complementary |
| Novelty (has anyone explored this?) | 0=well-trodden, 3=nobody has tried |
| Feasibility (can we do this in <5 cycles?) | 0=years of work, 3=quick investigation |

**Total score (0-15):**
- 12-15: PURSUE NOW (create new RQ or integrate into current)
- 8-11: QUEUE (create RQ stub, revisit after current RQ concludes)
- 4-7: FILE (log in KNOWLEDGE/patterns.md for future reference)
- 0-3: DISCARD (interesting but not actionable)

### Triage Decision
Update SERENDIPITY.md entry:
```markdown
- **Triage:** [PURSUE/QUEUE/FILE/DISCARD]
- **Score:** [N/15] — Data:[N] Impact:[N] Connection:[N] Novelty:[N] Feasibility:[N]
- **Action:** [What to do next]
```

## Serendipity Sprint (Scheduled)

### When
- Every 10 cycles (automatic trigger)
- After completing a major RQ milestone
- When user requests blue-ocean exploration
- When diminishing returns detected on current path

### Sprint Protocol (1 cycle dedicated)

1. **BRAINSTORM** (unconstrained, target: 10 ideas)
   - Generate 10 "what if" questions related to current research domain
   - Don't filter yet — quantity over quality
   - Mix domains: biology + math, genomics + physics, medicine + engineering

2. **QUICK LITERATURE SCAN** (per idea)
   - 1 search query per idea (3-5 keywords)
   - Check: has anyone done this? Is there data?
   - 30 seconds per idea maximum

3. **SCORE AND RANK**
   - Apply triage scoring to all 10 ideas
   - Keep top 3

4. **FORMALIZE**
   Write for each of top 3:
   ```markdown
   ## Sprint Idea: [Title]
   - **Testable hypothesis:** [one sentence]
   - **Required data:** [specific dataset or measurement]
   - **First experiment:** [what you'd do to test it]
   - **Kill condition:** [when to abandon]
   - **Score:** [N/15]
   ```

5. **DECIDE**
   - Best idea (score ≥12)? → Create RQ, schedule investigation
   - Good ideas (score 8-11)? → Queue as RQ stubs
   - Weak ideas? → File in patterns.md

### Sprint Output
Append to SERENDIPITY.md:
```markdown
## Sprint [N] — YYYY-MM-DD (Cycle [N])
### Ideas Generated: 10
### Top 3:
1. [Title] — Score [N/15] — Action: [PURSUE/QUEUE/FILE]
2. [Title] — Score [N/15] — Action: [PURSUE/QUEUE/FILE]
3. [Title] — Score [N/15] — Action: [PURSUE/QUEUE/FILE]
### Next Sprint: Cycle [N+10]
```

## Integration with Main Loop

### If PURSUE Decision
1. R2 reviews the pivot justification (is this worth pursuing?)
2. If R2 approves: Create new RQ folder, define hypothesis + criteria
3. User decides: parallel (both RQs active) or sequential (park current)

### If QUEUE Decision
1. Create minimal RQ.md stub with hypothesis + data requirements
2. Set status: `queued`
3. Continue current RQ

### If FILE Decision
1. Add to KNOWLEDGE/patterns.md:
   ```markdown
   ## Pattern: [Title]
   - **Domain:** [fields connected]
   - **Observation:** [what was noticed]
   - **Reference:** [source, if any]
   - **Potential application:** [brief]
   ```

## Anti-Patterns

- **Shiny object syndrome**: Don't abandon current RQ for every serendipity. Complete or formally pivot.
- **Phantom serendipity**: "Interesting" is not serendipity. Must be unexpected AND actionable.
- **Untracked exploration**: Every minute of exploration must be logged. Invisible exploration = wasted exploration.
