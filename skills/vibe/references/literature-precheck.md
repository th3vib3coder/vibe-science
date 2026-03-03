# Literature Precheck (L-1 Gate) — Reference Protocol

Gate L-1 requires a literature search before committing to any new research direction. Its purpose is to prevent wasted effort on questions that have already been answered and to ensure that new directions build on existing knowledge rather than reinventing it.

---

## When to Run

**Trigger:** Before committing to any new research direction. Specifically: Phase 0 brainstorming (Step 2b), creating a new direction node, pivoting mid-session, R2 redirects, or serendipity flags suggesting new inquiry.

L-1 does NOT need to be re-run for continuing work on approved directions, deepening existing branches, or bug fixes.

---

## What to Search

L-1 requires three categories of search, progressively broader:

### Search 1 — Exact Intersection

Search for the specific combination: `"{method}" AND "{domain}" AND "{application/question}"`. Answers: **Has someone already done exactly this?**

### Search 2 — Component Searches

Search each major component separately: the method in any domain, the domain with any method, the question with any approach. Answers: **What has been done with each piece?**

### Search 3 — Methodological Precedent

Search for known pitfalls: `"{method}" AND ("limitations" OR "pitfalls" OR "best practices")`. Answers: **What should I watch out for?**

---

## Decision Framework

### If Prior Work Found

Two options, with explicit rationale required:

**Option A — PIVOT**
The proposed direction has been thoroughly covered. Choose a different direction.
- Document: what was found, why it makes the proposed direction redundant, what alternative direction is being pursued instead.
- The pivot itself triggers a new L-1 check for the alternative direction.

**Option B — DIFFERENTIATE**
Prior work exists but leaves a clear gap that the proposed direction addresses.
- Document: what exists, what gap remains, how the proposed direction fills it.
- The differentiation must be specific and testable, not vague ("we use more data" is not differentiation).

### If No Prior Work Found

This is unusual and warrants caution. Document:
- The exact queries used (copy-paste, not paraphrased)
- The databases and sources searched
- The null results (zero hits, or hits that are not relevant)
- A brief assessment of why no prior work exists (too new? too niche? bad search terms?)

A null result does NOT mean the direction is automatically good. It may mean the search was insufficient.

---

## Search Sources

L-1 searches should cover at least two independent sources appropriate to the domain: academic databases, preprint servers, dataset repositories, open-access indices, or general web search.

---

## Output Format

L-1 results are documented in a structured format:

```markdown
### L-1 Literature Precheck — {Direction Name}

**Date:** {ISO 8601}
**Proposed direction:** {One-sentence description}

#### Search 1 — Exact Intersection
- **Query:** "{exact query}"
- **Sources:** {databases searched}
- **Results:** {N hits, top 3 summarized}
- **Assessment:** {covered / partially covered / not covered}

#### Search 2 — Components
- **Query A:** "{query}" — {N hits, assessment}
- **Query B:** "{query}" — {N hits, assessment}
- **Query C:** "{query}" — {N hits, assessment}

#### Search 3 — Methodological Precedent
- **Query:** "{query}"
- **Key findings:** {known limitations or best practices}

#### Decision
- **Action:** PIVOT / DIFFERENTIATE / PROCEED (no prior work)
- **Rationale:** {why this decision}
- **Differentiation (if applicable):** {specific gap being addressed}
```

This output is saved to `.vibe-science/literature/L1-{direction-id}-{timestamp}.md`.

---

## Integration with Brainstorm Engine

In Phase 0 (brainstorming), Step 2 generates candidate hypotheses and directions. L-1 is triggered at Step 2b:

1. **Step 2a:** Generate candidate directions (brainstorm).
2. **Step 2b:** Run L-1 on the top candidates. This may eliminate some.
3. **Step 2c:** Select directions that passed L-1. These enter the investigation tree.

This ensures that no direction enters the tree without a literature foundation.

---

## Integration with Serendipity

When a serendipity flag suggests a new line of inquiry, L-1 is required before the flag can be promoted to a direction node. This prevents the system from chasing anomalies that are already well-explained in the literature.

---

## Common Mistakes

1. **Searching too narrowly** — If Search 1 returns nothing, that does not mean the topic is unexplored. Broaden with Search 2.
2. **Searching too broadly** — "machine learning prediction" will return millions of results. Be specific enough to be useful.
3. **Stopping at titles** — Read abstracts, not just titles. A paper titled differently may address exactly your question.
4. **Skipping Search 3** — Methodological pitfalls are the most actionable results. Do not skip them.
5. **Treating L-1 as a formality** — The point is not to check a box. The point is to learn what has been done so you can do something new.

---

*This protocol is domain-agnostic. It applies to any research direction in any field.*
