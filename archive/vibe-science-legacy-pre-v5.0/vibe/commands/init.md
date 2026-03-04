> **REMEMBER: Think first, analyse second.** Before any analysis, know what exists in the literature and what gaps remain. Every analysis must answer something that has NOT been done yet. If you cannot explain in one sentence what new thing it will reveal, you are not ready to run it.

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
   ├── ASSUMPTION-REGISTER.md
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

**Note on skill interaction:** If a superpowers skill (e.g., brainstorming) is active, it may guide this step with structured questions. That is acceptable, but this command's Steps 1-3 define the MINIMUM information to gather. Do NOT skip Step 3 (search strategy) regardless of which skill is driving the conversation.

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

This step is MANDATORY even if the research question was defined through brainstorming. Without initial queries, Cycle 1 starts blind.

### Step 4: Create Structure

**IMPORTANT — Template-First Pattern:**

The agent MUST use the official templates as the base for all files. Never invent file formats — the templates define the canonical structure that downstream scripts (stop.js, narrative-engine.js) depend on.

**4a. Check for existing session:**

If `.vibe-science/STATE.md` already exists, READ it first to check for an active session.
- If an active session exists, ask the user: "A previous session was found (RQ: [rq], Phase: [phase]). Start fresh and overwrite, or add a new RQ to the existing project?"
- If the user wants to add a new RQ, increment the RQ number (RQ-002, RQ-003, etc.) and skip re-creating STATE.md/PROGRESS.md/SERENDIPITY.md.

**4b. Create folders:**

```bash
mkdir -p .vibe-science/RQ-001-[slug]/{01-discovery,02-analysis,03-data,04-validation,05-reviewer2}
```

**4c. Create files from templates:**

For each file below, READ the template first, then WRITE the populated version.
The templates live in `vibe-science/vibe/templates/` relative to the project root.

| Target file | Template source | Populate |
|-------------|----------------|----------|
| `.vibe-science/STATE.md` | `templates/STATE.md` | Fill frontmatter: rq, phase=discovery, cycle=1 |
| `.vibe-science/PROGRESS.md` | `templates/PROGRESS.md` | Add first entry with Cycle 0 init |
| `.vibe-science/SERENDIPITY.md` | `templates/SERENDIPITY.md` | No changes needed |
| `.vibe-science/ASSUMPTION-REGISTER.md` | `templates/ASSUMPTIONS.md` | Fill frontmatter: rq |
| `.vibe-science/RQ-001-[slug]/RQ.md` | `templates/RQ.md` | Fill all sections from Steps 1-3 |

**Why this matters:** The STATE.md template has YAML frontmatter (`rq`, `phase`, `cycle`, `last_updated`) that `stop.js` and `narrative-engine.js` parse. Writing a free-form STATE.md will break the stop hook. The PROGRESS.md template defines entry format (`### Cycle N - HH:MM` with Action/Result/Decision/Serendipity fields) that downstream scripts expect.

### Step 5: Confirm Ready

Output:
```
Vibe Science initialized for RQ-001: [question slug]

Structure created:
✓ .vibe-science/STATE.md (from template, frontmatter populated)
✓ .vibe-science/PROGRESS.md (from template)
✓ .vibe-science/SERENDIPITY.md (from template)
✓ .vibe-science/ASSUMPTION-REGISTER.md (from template)
✓ .vibe-science/RQ-001-[slug]/RQ.md (from template, all sections filled)

Initial search strategy:
- Scopus: [query 1]
- PubMed: [query 2]
- OpenAlex: [query 3]

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

Reading templates and creating structure...

✓ .vibe-science/STATE.md (from template, frontmatter: rq=RQ-001, phase=discovery, cycle=1)
✓ .vibe-science/PROGRESS.md (from template, Cycle 0 entry added)
✓ .vibe-science/SERENDIPITY.md (from template)
✓ .vibe-science/ASSUMPTION-REGISTER.md (from template)
✓ .vibe-science/RQ-001-uot-crispr-offtarget/RQ.md (from template, all sections filled)

Initial search strategy:
- Scopus: "unbalanced optimal transport" AND CRISPR
- Scopus: "optimal transport" AND "off-target"
- PubMed: GUIDE-seq methodology

Ready to begin. Run /vibe-science:loop to start research cycle.
```
