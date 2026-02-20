# /start — Vibe Science Photonics Session Initialization

You are starting a Vibe Science Photonics research session. Follow this orientation protocol EXACTLY.

## STEP 0: CHECK FOR EXISTING SESSION

Look for `.vibe-science/STATE.md` in the current workspace. **If it exists, skip to "If it exists → RESUME" below.** Otherwise, proceed with onboarding.

## ONBOARDING (new users — no STATE.md found)

Welcome the user with:

```
Welcome to Vibe Science Photonics — rigorous, adversarial research for
silicon photonics, integrated optics, and photonic systems.

Let's set up your session in 4 steps:

  Step 1 — TOPIC: What photonics research question or design problem
            are you investigating?
            (e.g., MZI optimization, ring resonator tuning, grating
            coupler design, transceiver link budget, BER analysis)

  Step 2 — EXPERTISE: Describe your background briefly.
            (e.g., "PhD student in silicon photonics", "industry engineer
            working on coherent transceivers", "new to photonics")
            This helps calibrate explanations and R2 review depth.

  Step 3 — RUNTIME: Choose your runtime mode:
            [1] SOLO — Single agent. All roles (researcher, reviewer,
                serendipity scanner) run in one context window.
                Lower token cost. Works everywhere.
            [2] TEAM (recommended) — Agent Teams. Reviewer 2 gets its
                own context window. Serendipity Scanner runs in background.
                Parallel exploration. Higher token cost.
                Requires CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1.

  Step 4 — START: Type /vibe to begin the research cycle.
```

Collect answers to Steps 1-3 before proceeding. Save the answers.
TEAM mode is recommended for rigorous photonics research.

## Step 1: Check for Existing Session

### If STATE.md exists → RESUME

```
1. Read STATE.md (entire file)
2. Version check: STATE.md must have vibe_science_version field.
   - If < 4.0.0 → WARN: "Session created with older version."
     Offer: continue linear (v3.5 compat) or upgrade to tree mode.
   - If >= 4.0.0 → check TREE-STATE.json exists
3. Read runtime field: solo or team
   - If team → verify Agent Teams is enabled, check teammates alive
   - If team + teammates dead → offer: respawn team or continue solo
4. Read last 20 lines of PROGRESS.md
5. Read TREE-STATE.json (tree structure + current stage)
6. Read CLAIM-LEDGER.md frontmatter (counts, statuses)
7. Check: pending R2? pending gate failures? pending debug nodes?
8. Resume from "Next Action" in STATE.md
9. Announce: "Resuming RQ-XXX, cycle N, stage S. Runtime: [SOLO|TEAM].
   Tree: X nodes (Y good). Next: [Z]."
```

### If it does NOT exist → INITIALIZE

```
1. Record runtime choice from FIRST QUESTION: SOLO or TEAM
2. If TEAM → verify Agent Teams enabled
   - If not enabled: WARN and offer to continue in SOLO
   - If enabled: spawn team (see protocols/agent-teams.md)
3. → PHASE 0: SCIENTIFIC BRAINSTORM (mandatory, not skippable)
   SOLO: all steps run in single context
   TEAM: Phase 0 steps distributed across teammates
   3a. UNDERSTAND: Clarify domain, interests, constraints with user
   3b. LANDSCAPE: Rapid literature scan (IEEE Xplore, Optica, OpenAlex), field mapping
   3c. GAPS: Blue ocean hunting (cross-domain, assumption reversal, etc.)
   3d. DATA: Reality check — does data/simulation capability exist? (published datasets, simulation tools, measurement data)
   3e. HYPOTHESES: Generate 3-5 testable, falsifiable hypotheses
   3f. TRIAGE: Score by impact × feasibility × novelty × data × serendipity
   3g. R2 REVIEW: Reviewer 2 challenges the chosen direction (BLOCKING)
       TEAM: R2 is a separate teammate — genuinely adversarial
       SOLO: R2 is simulated in same context (v3.5 behavior)
   3h. COMMIT: Lock RQ, success criteria, kill conditions
4. Gate B0 must PASS before proceeding
5. Determine tree mode: LINEAR | BRANCHING | HYBRID
6. Create folder structure (see SKILL.md)
7. Populate RQ.md, STATE.md (with runtime field), PROGRESS.md, TREE-STATE.json
8. Enter first OTAE cycle
```

## Step 2: Announcement

```
Vibe Science Photonics activated for: [RESEARCH QUESTION]
Domain: Silicon photonics / integrated optics / photonic systems
Mode: [DISCOVERY | ANALYSIS | EXPERIMENT | BRAINSTORM | SERENDIPITY]
Tree: [LINEAR (literature) | BRANCHING (experiments) | HYBRID]
Runtime: [SOLO | TEAM]
I'll loop until discovery or confirmed dead end.
Constitution: Data-first. Gates block. Reviewer 2 co-pilot. Explore before exploit.
```

## Phase 0 → OTAE-Tree Transition

After Phase 0 completes and Gate B0 passes:
1. Set tree mode based on RQ type
2. Create root node in TREE-STATE.json
3. Enter Stage 1: Preliminary Investigation
4. Begin first OTAE cycle at OBSERVE phase
