# vibe-science:init

Initialize a new Vibe Science research session.

## When to Use

Use this command to:
- Start a completely new research project
- Add a new Research Question to an existing project

## Usage

```
/vibe-science:init [research question or topic]
```

## What It Does

1. **Creates folder structure** (if not exists):
   ```
   .vibe-science/
   ├── STATE.md
   ├── PROGRESS.md
   ├── SERENDIPITY.md
   └── RQ-001-[slug]/
       ├── RQ.md
       ├── FINDINGS.md
       └── 01-discovery/
           └── queries.log
   ```

2. **Populates RQ.md** with the research question

3. **Initializes STATE.md** with:
   - Current RQ
   - Phase: discovery
   - Cycle: 1

4. **Logs to PROGRESS.md**:
   - Session start
   - RQ defined

## Process

### Step 1: Understand the Question

Ask clarifying questions if needed:
- Is this testable/falsifiable?
- What data would validate this?
- What would make you abandon this question?

### Step 2: Define Success Criteria

Work with researcher to define:
- Measurable outcomes
- Data requirements
- Kill conditions

### Step 3: Plan Initial Search Strategy

Define first queries for:
- Scopus
- PubMed
- OpenAlex

### Step 4: Create Structure

```bash
# Create folders
mkdir -p .vibe-science/RQ-001-[slug]/{01-discovery,02-analysis,03-data,04-validation,05-reviewer2}

# Copy templates
cp templates/STATE.md .vibe-science/
cp templates/PROGRESS.md .vibe-science/
cp templates/SERENDIPITY.md .vibe-science/
cp templates/RQ.md .vibe-science/RQ-001-[slug]/
```

### Step 5: Confirm Ready

Output:
```
Vibe Science initialized for RQ-001: [question slug]

Structure created:
✓ .vibe-science/STATE.md
✓ .vibe-science/PROGRESS.md
✓ .vibe-science/RQ-001-[slug]/RQ.md

Next: Run /vibe-science:loop to begin research cycle.
```

## Example

```
User: /vibe-science:init Can unbalanced optimal transport improve CRISPR off-target prediction?

Claude: I'm initializing Vibe Science for this research question.

Let me clarify a few things:

1. **Testability:** This is testable - we can compare UOT-based predictions
   against standard methods using benchmark datasets.

2. **Data requirements:** We'll need:
   - CRISPR off-target datasets (GUIDE-seq, DISCOVER-seq)
   - Existing prediction tool benchmarks
   - Cell fate/death data for unbalanced mass justification

3. **Kill conditions:**
   - No publicly available off-target datasets
   - UOT already applied to this problem
   - Standard OT outperforms in existing benchmarks

Creating structure...

✓ .vibe-science/STATE.md
✓ .vibe-science/PROGRESS.md
✓ .vibe-science/RQ-001-uot-crispr-offtarget/RQ.md

Initial search strategy:
- Scopus: "unbalanced optimal transport" AND CRISPR
- Scopus: "optimal transport" AND "off-target"
- PubMed: GUIDE-seq methodology

Ready to begin. Run /vibe-science:loop to start research cycle.
```
