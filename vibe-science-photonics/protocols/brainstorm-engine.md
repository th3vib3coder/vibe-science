# Brainstorm Engine — Phase 0 Protocol

> Load this when: session initialization (Phase 0), before any OTAE cycle begins.

## Overview

Phase 0 is MANDATORY. It cannot be skipped. Before any OTAE cycle runs, the system must go through a structured brainstorming process to identify the research question, validate data availability, and get adversarial review of the chosen direction.

Phase 0 produces: a locked RQ with hypothesis, success criteria, kill conditions, data availability confirmed, and R2 approval (Gate B0 PASS).

---

## Phase 0 Steps

### Step 1: UNDERSTAND — Context Gathering

**Who does it:** Lead (TEAM) or Researcher (SOLO) with user.

**Actions:**
1. Ask the user about their domain, interests, and constraints
2. Identify: what field? what resources? what timeline? what expertise level?
3. Record constraints: compute budget, data access, ethical considerations
4. Clarify: is this purely computational, literature-based, or mixed?

#### Expert Knowledge Harvest

Before proceeding to landscape mapping, harvest the expert's tacit knowledge with these 3 key questions:

1. **"What do you already know about this topic that the literature might not capture?"**
   - Practical device behavior, fabrication insights, measurement pitfalls
   - Record in `EXPERT-ASSERTIONS.md` with confidence floor 0.70

2. **"Are there common misconceptions in this area?"**
   - Widely-cited results that are misleading, outdated assumptions, marketing vs. reality
   - These become priority targets for the CONTRADICTION SCAN

3. **"What practical constraints should we keep in mind?"**
   - Fabrication tolerances, thermal budgets, packaging limitations, cost targets
   - These constrain the hypothesis space and prevent generating untestable ideas

**Output:** `00-brainstorm/context.md`
```markdown
# Research Context

## Domain
[User's research field and sub-area]

## Interests
[Specific topics the user wants to explore]

## Constraints
- Compute: [available resources]
- Data: [what they have access to]
- Timeline: [how much time]
- Expertise: [what they're comfortable with]

## Type
[computational | literature | mixed]
```

### Step 2: LANDSCAPE — Field Mapping

**Who does it:** Researcher (TEAM and SOLO).

**Actions:**
1. Rapid literature scan using search-protocol.md
2. Dispatch to relevant skills: `openalex-database`, `perplexity-search`, `literature-review`, `research-lookup`
3. Identify: major papers (last 3 years), key groups, dominant methods, recent trends
4. Map the competitive landscape: who is doing what, where are the clusters

**Output:** `00-brainstorm/landscape.md`
```markdown
# Field Landscape

## Key Papers (last 3 years)
| Paper | DOI | Year | Relevance |
|-------|-----|------|-----------|
| ... | ... | ... | ... |

## Major Groups
- [Group 1]: [what they focus on]

## Dominant Methods
- [Method 1]: [who uses it, strengths, limitations]

## Recent Trends
- [Trend 1]: [evidence]

## Gaps Visible from Landscape
- [Preliminary gap 1]
```

### Step 2b: LITERATURE PRE-CHECK — Prior Art Verification (v5.5)

**Who does it:** Researcher (TEAM and SOLO).

**Gate:** L-1 (Literature Pre-Check) — MUST PASS before proceeding to GAPS.

**Why this exists (v5.5):** Post-mortem analysis revealed that pursuing a direction without first checking for prior work wastes hours (dead end when someone else had already done it). This step is fast (15-30 minutes) and prevents investing in already-explored territory.

**Actions:**
1. For EACH promising direction visible from the landscape, search for the **exact intersection**:
   - IEEE Xplore: `"[method]" AND "[domain application]"`
   - Optica Publishing: same query
   - arXiv (physics.optics, eess.SP): same query (if computational method)
   - Google Scholar: same query (catches theses, conference papers)
2. Search **components separately** as well:
   - "[method] review" — to understand the method landscape
   - "[domain application] computational methods" — to understand what's been tried
3. For each search: record the query, database, date, and number of results
4. **If prior work found:**
   - Document what exists (paper, year, what they did, what they found)
   - Explicit decision: **PIVOT** (abandon this direction) or **DIFFERENTIATE** (proceed with a clear distinction)
   - If DIFFERENTIATE: state exactly what is different about our approach
   - Decision logged in `00-brainstorm/literature-precheck.md`
5. **If no prior work found:**
   - Document the null result (queries, databases, date)
   - This is POSITIVE evidence of a gap — carry forward to Step 3

**Output:** `00-brainstorm/literature-precheck.md`
```markdown
# Literature Pre-Check

| Direction | Query | Database | Results | Prior Work? | Decision |
|-----------|-------|----------|---------|-------------|----------|
| [dir 1] | "[method] AND [domain]" | IEEE Xplore | 0 | NO | PROCEED |
| [dir 2] | "[method2] AND [domain]" | IEEE Xplore | 3 | YES (Smith 2024) | DIFFERENTIATE: we add X |
| [dir 3] | "[method3] AND [domain]" | arXiv | 1 | YES (exact match) | PIVOT |
```

**Gate L-1 check:** At least 1 direction has either (a) no prior work, or (b) explicit differentiation documented. If ALL directions have exact prior work with no differentiation → return to Step 2 and expand the landscape.

---

### Step 3: GAPS — Blue Ocean Hunting

**Who does it:** Researcher + Serendipity (TEAM) or Researcher (SOLO).

**Actions:**
1. Systematic gap identification using multiple strategies (focus on directions that PASSED L-1):
   - **Cross-domain transfer**: Methods successful in field A not yet applied to field B
   - **Assumption reversal**: What if a widely-held assumption is wrong?
   - **Scale change**: What happens at different scales (single-channel vs. WDM, device-level vs. system-level)?
   - **Negative space**: What has NOT been published? (absence of evidence)
   - **Method gap**: Standard method exists but no one applied it to this specific data type
2. For each gap: evidence that it IS a gap (not just unaware of existing work)
3. Preprint check: search arXiv (physics.optics, eess.SP) to confirm gap is still open

**Output:** `00-brainstorm/gaps.md`
```markdown
# Research Gaps

## Gap 1: [title]
- **Description:** [what's missing]
- **Evidence it's a gap:** [searched X, Y, Z — nothing found]
- **Preprint check:** [searched arXiv physics.optics YYYY-MM-DD — not addressed]
- **Strategy:** [cross-domain | assumption-reversal | scale-change | negative-space | method-gap]
- **Potential impact:** [HIGH | MEDIUM | LOW]

## Gap 2: ...
```

### Step 3b: INVERSION

After identifying gaps via blue-ocean hunting, systematically invert consensus claims to generate contrarian hypotheses.

**Protocol:**
1. From LANDSCAPE output, identify the top 3 consensus claims in the field
2. For each claim, formulate its inversion: "What if the opposite were true?"
3. For each inversion, assess:
   - **Plausibility** (0-3): Is there any evidence, even indirect, supporting the inversion?
   - **Testability**: Could this inversion be tested with available data?
   - **Prior attempts**: Has anyone tried this and failed? If so, WHY did they fail? Have constraints changed?
4. Inversions scoring plausibility ≥ 2 → add to gaps.md as "CONTRARIAN GAP"
5. Inversions where prior attempts failed due to now-resolved constraints → flag as "REVIVAL CANDIDATE"

**Output:** Append to `00-brainstorm/gaps.md`:
```
## Contrarian Gaps (from Inversion Exercise)
| Consensus Claim | Inversion | Plausibility | Testable | Prior Attempts | Status |
|---|---|---|---|---|---|
| [claim] | [inversion] | 0-3 | Yes/No | [ref or "none found"] | GAP / REVIVAL / DISMISSED |
```

**Why this matters:** Transformative discoveries often come from questioning what everyone assumes is true. This step forces structured contrarian thinking rather than relying on the model's natural (incremental) ideation.

### Step 4: DATA — Reality Check

**Who does it:** Researcher (TEAM and SOLO).

**Actions:**
1. For each gap identified, check data availability
2. Dispatch to relevant skills: `openalex-database`, `perplexity-search`, `literature-review`, `research-lookup` — search IEEE Xplore, Optica, SPIE, arXiv for datasets and benchmarks
3. Score each gap: DATA_AVAILABLE (0-1)
   - 1.0: Public dataset with clear accession, well-documented, sufficient sample size
   - 0.7: Public dataset exists but needs preprocessing or has limitations
   - 0.5: Data exists but access is restricted or format is problematic
   - 0.3: Data partially available, would need augmentation
   - 0.0: No data available — STOP (LAW 1)

**Output:** `00-brainstorm/data-audit.md`
```markdown
# Data Audit

## Gap 1: [title]
- **DATA_AVAILABLE:** 0.X
- **Dataset:** [name, accession, URL]
- **Sample size:** [N]
- **Format:** [CSV | S-parameter | GDS | simulation files | ...]
- **Limitations:** [known issues]
- **Access:** [public | restricted | requires approval]

## Gap 2: ...

## Summary
| Gap | DATA_AVAILABLE | Go/No-Go |
|-----|---------------|----------|
| Gap 1 | 0.8 | GO |
| Gap 2 | 0.3 | NO-GO (insufficient data) |
```

### Step 5: HYPOTHESES — Generate Testable Claims

**Who does it:** Researcher (TEAM and SOLO).

**Actions:**
1. For gaps with DATA_AVAILABLE >= 0.5, generate 3-5 testable hypotheses
2. For each hypothesis, ask: **"What's the physics/mechanism?"** — every hypothesis must be grounded in a physical mechanism (electromagnetic, thermal, material), not just empirical correlation
3. Each hypothesis must be FALSIFIABLE: state null hypothesis and predictions
4. Each hypothesis must have clear success criteria and kill conditions

**Output:** `00-brainstorm/hypotheses.md`
```markdown
# Hypotheses

## H1: [hypothesis statement]
- **Gap addressed:** Gap N
- **Null hypothesis:** [what we expect if no effect]
- **Predictions:**
  - If true: [specific observable X]
  - If false: [specific observable Y]
- **Success criteria:** [measurable]
- **Kill conditions:** [when to abandon]
- **Data:** [which dataset]
- **Skills needed:** [which MCP tools]

## H2: ...
```

### Step 5b: COLLISION-ZONE

After generating domain-internal hypotheses, force at least 1 cross-domain collision to generate non-obvious hypotheses.

**Protocol:**
1. Select the strongest hypothesis from Step 5
2. Pick a concept from a DIFFERENT domain (biology, economics, network theory, materials science, information theory)
3. Formulate: "What if [mechanism X from our domain] worked like [principle Y from other domain]?"
4. Identify:
   - Where the analogy HOLDS → potential mechanism insight
   - Where the analogy BREAKS → that's the research frontier
5. Score the collision hypothesis using the serendipity formula (0-15)
6. If score ≥ 8 → promote to hypothesis list with tag `[COLLISION]`
7. If score < 8 → log in `00-brainstorm/hypotheses.md` as "Explored collision, dismissed because [reason]"

**Output:** Append to `00-brainstorm/hypotheses.md`:
```
## Cross-Domain Collision Hypotheses
| Our Mechanism | Other Domain | Analogy | Where It Breaks | Serendipity Score | Status |
|---|---|---|---|---|---|
| [mechanism] | [domain: principle] | [analogy] | [frontier] | X/15 | PROMOTED / LOGGED |
```

**Why this matters:** Natural ideation tends toward incremental thinking. Forced cross-domain collisions generate the kind of non-obvious hypotheses that the Serendipity Engine would flag as INTERRUPT — but at brainstorming time, before any resources are spent.

### Step 6: TRIAGE — Scoring and Ranking

**Who does it:** Lead (TEAM) or Researcher (SOLO).

**Actions:**
1. Score each hypothesis on 5 dimensions (0-3 each, max 15):
   - **Impact**: How important is the finding if true? (0-3)
   - **Feasibility**: Can we do it with available data + compute? (0-3)
   - **Novelty**: How original is the approach? (0-3)
   - **Data**: DATA_AVAILABLE score normalized to 0-3 (0-3)
   - **Serendipity potential**: Likelihood of unexpected secondary findings? (0-3)
2. **Expert vote has weight 2x compared to automated scoring** — if the domain expert ranks a hypothesis higher, their assessment carries double weight in the final triage score
3. Rank hypotheses by total score (incorporating expert weight)
4. Present top 2-3 to user with rationale

**Output:** `00-brainstorm/triage.md`
```markdown
# Hypothesis Triage

| Hypothesis | Impact | Feasibility | Novelty | Data | Serendipity | TOTAL |
|------------|--------|-------------|---------|------|-------------|-------|
| H1 | 3 | 2 | 3 | 2 | 2 | 12 |
| H2 | 2 | 3 | 1 | 3 | 1 | 10 |

## Recommendation
[Which hypothesis and why — present to user]

## Trade-offs
[What we lose by choosing H1 over H2]
```

### Productive Tensions Check (after TRIAGE scoring)

After scoring all hypotheses, check for productive tensions that should be preserved rather than resolved.

**Protocol:**
1. Compare the top 2 scored hypotheses
2. If BOTH conditions are true:
   - Score difference < 10% (e.g., 8.2 vs 7.6 on a 0-15 scale)
   - They represent genuinely DIFFERENT paradigms (not minor variations)
   Then: **PRESERVE BOTH.** Do NOT eliminate one.
3. Document: "H-A is preferred IF [condition]. H-B is preferred IF [condition]."
4. Both hypotheses feed into the tree as separate branches at Stage 1
5. The tree architecture is DESIGNED for exploring multiple branches — forcing a single hypothesis at Phase 0 wastes this potential

**Output:** In `00-brainstorm/triage.md`, add a "Productive Tensions" section:
```
## Productive Tensions
| Hypothesis A | Score | Hypothesis B | Score | Condition for A | Condition for B |
|---|---|---|---|---|---|
| [H-A] | X.X | [H-B] | X.X | [when A is better] | [when B is better] |
```

**Why this matters:** Premature convergence is a known failure mode in scientific brainstorming. When two strong hypotheses represent different paradigms, eliminating one prematurely discards potentially transformative research directions.

### Step 7: R2 REVIEW — Adversarial Challenge

**Who does it:** Reviewer 2 teammate (TEAM) or simulated R2 (SOLO).

**Actions:**
1. R2 reviews ALL brainstorm output: context, landscape, gaps, data audit, hypotheses, triage
2. R2 challenges:
   - Are the gaps real? (search for prior art R2 independently)
   - Is the hypothesis falsifiable? (can it actually be proven wrong?)
   - Is the data sufficient? (what are the limitations?)
   - Are there obvious confounders? (what would invalidate the approach?)
   - Is the hypothesis worth pursuing? (impact vs. risk)
3. R2 outputs verdict: REJECT | WEAK_ACCEPT | ACCEPT

**R2 must WEAK_ACCEPT or better for Gate B0 to pass.**

If R2 REJECTS:
- Address R2's specific demands
- Revise hypothesis or choose alternative
- Re-submit to R2
- Maximum 3 R2 cycles on brainstorm before asking user to make final call

### Step 8: COMMIT — Lock the Direction

**Who does it:** Lead + User (TEAM) or Researcher + User (SOLO).

**Actions:**
1. Present final hypothesis to user with R2's assessment
2. User approves or redirects
3. Lock: RQ, hypothesis, null hypothesis, success criteria, kill conditions
4. Determine tree mode: LINEAR | BRANCHING | HYBRID
5. Create folder structure (see SKILL.md Session Initialization)
6. Populate: RQ.md, STATE.md, PROGRESS.md, TREE-STATE.json

---

## Gate B0 — Brainstorm Quality

ALL must be true:
- Gate L-1 PASSED (v5.5): literature pre-check performed, prior art addressed
- At least 3 gaps identified with evidence
- At least 1 gap verified as not-yet-addressed (preprint check)
- Data availability confirmed for chosen hypothesis (DATA_AVAILABLE >= 0.5)
- Hypothesis is falsifiable (null hypothesis stated)
- Predictions stated (if true → X, if false → Y)
- R2 brainstorm review: WEAK_ACCEPT or better
- User approved the chosen direction

B0 MUST PASS before any OTAE cycle begins. No exceptions.

---

## Phase 0 in TEAM Mode Distribution

| Step | Who | What |
|------|-----|------|
| UNDERSTAND | Lead + User | Lead asks user, shares context with all teammates |
| LANDSCAPE | Researcher | Rapid literature scan |
| LIT PRE-CHECK | Researcher | Prior art search for each direction (Gate L-1) |
| GAPS | Researcher + Serendipity | Both hunt for gaps from different angles (L-1 passed directions) |
| DATA | Researcher | Data audit via IEEE Xplore, Optica, SPIE, arXiv |
| HYPOTHESES | Researcher | Generates hypotheses |
| TRIAGE | Lead | Synthesizes, scores, presents to user |
| R2 REVIEW | **Reviewer 2** | Reviews brainstorm output — genuinely independent context! |
| COMMIT | Lead + User | Final decision |

---

## Phase 0 Timing

Phase 0 should take 3-8 cycles depending on domain complexity. It is NOT rushed. The quality of Phase 0 determines the entire research trajectory.

If Phase 0 takes more than 12 cycles, something is wrong:
- Domain too broad → narrow the focus
- No data available → change domain or approach
- R2 keeps rejecting → hypothesis needs fundamental rework
