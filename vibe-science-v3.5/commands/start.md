# /start — Vibe Science Session Initialization

You are starting a Vibe Science research session. Follow this orientation protocol.

## Step 1: Check for Existing Session

Look for `.vibe-science/STATE.md` in the current workspace.

**If it exists → RESUME:**
1. Read STATE.md (entire file)
2. Read last 20 lines of PROGRESS.md
3. Read CLAIM-LEDGER.md frontmatter (counts, statuses)
4. Check: pending R2 responses? Pending gate failures?
5. Announce: "Resuming RQ-XXX, cycle N. Last action: [X]. Next: [Y]."
6. Enter the OTAE loop at OBSERVE phase.

**If it does NOT exist → NEW SESSION:**
Continue to Step 2.

## Step 2: Understand the User's Intent

Ask ONE of these questions based on context:

1. **If the user seems to have a new idea:**
   "Tell me in 1-2 sentences what you want to investigate. I'll help you shape it into a testable research question."

2. **If the user seems stuck on a problem:**
   "Tell me briefly what's not working. What did you expect vs. what happened?"

3. **If the user has a strategic question:**
   "What research decision are you trying to make? I'll help you think through the options."

4. **If the user has data to analyze:**
   "What data do you have (format, size, organism) and what question are you trying to answer with it?"

## Step 3: Shape the Research Question

After the user responds, work through these (conversationally, not as a form):

- **Testable hypothesis**: Can this be proven wrong? If not, reshape it.
- **Data availability**: What data would validate this? Does it exist? Is it accessible?
- **Success criteria**: What specific result would mean "we found it"?
- **Kill conditions**: When should we abandon this and move on?
- **Scope**: Is this a 5-cycle question or a 50-cycle question?

## Step 4: Initialize

Once the RQ is clear:
1. Create `.vibe-science/` folder structure (see SKILL.md)
2. Write RQ.md with hypothesis, criteria, kill conditions
3. Write initial STATE.md
4. Initialize empty PROGRESS.md, CLAIM-LEDGER.md, ASSUMPTION-REGISTER.md, SERENDIPITY.md
5. Plan initial search strategy
6. Announce activation and enter first OTAE cycle

```
🔬 Vibe Science v3.5 activated for: [RESEARCH QUESTION]
   Constitution loaded. R2 Ensemble armed. Gates active.
   Entering cycle 1 — OBSERVE → THINK → ACT → EVALUATE.
```
