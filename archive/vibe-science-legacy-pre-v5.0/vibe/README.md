# Vibe Science

Scientific research in serendipity mode.

## What Is This?

A skill for Claude to conduct rigorous scientific literature research with:
- **Infinite loops** until discovery or dead end
- **State crystallization** via .md files (persistent context across sessions)
- **Adversarial review** (Reviewer 2 challenges all major findings)
- **Serendipity tracking** (unexpected discoveries are features, not bugs)
- **Anti-hallucination** (every claim requires verified source)

## Core Principle

> "Biologia teorica + validazione con dati. Senza conferme numeriche, si lascia perdere."
>
> Theoretical biology validated by data. Without numerical confirmation, abandon it.

## Quick Start

```
/vibe-science:init Can unbalanced optimal transport improve CRISPR off-target prediction?
```

Then:

```
/vibe-science:loop
```

Repeat until conclusion.

## The Loop

```
1. CRYSTALLIZE → Write state to .md files
2. SEARCH      → Query Scopus, PubMed, OpenAlex
3. ANALYZE     → Find patterns, gaps, connections
4. EXTRACT     → Download supplementary data (NO truncation)
5. VALIDATE    → Confirm data exists (NO DATA = NO GO)
6. CHECK STOP  → Goal achieved? Dead end? Serendipity?
                 └─ If none: LOOP BACK TO 1
```

## Commands

| Command | Description |
|---------|-------------|
| `/vibe-science:init` | Start new research session |
| `/vibe-science:loop` | Execute one research cycle |
| `/vibe-science:reviewer2` | Invoke adversarial review |
| `/vibe-science:search` | Literature search |

## Reviewer 2

An adversarial agent that challenges findings:

- **Major finding** → Immediate review
- **3 minor findings** → Batch review
- **Concluding RQ** → Final review

Reviewer 2 demands:
- Counter-analysis
- Falsification attempts
- Source verification
- Alternative explanations

## Folder Structure

```
.vibe-science/
├── STATE.md              # Current state (max 100 lines)
├── PROGRESS.md           # Append-only action log
├── SERENDIPITY.md        # Unexpected discoveries
│
└── RQ-001-[slug]/        # Per research question
    ├── RQ.md             # Question definition
    ├── FINDINGS.md       # Findings list
    ├── 01-discovery/     # Literature phase
    ├── 02-analysis/      # Pattern phase
    ├── 03-data/          # Extraction phase
    ├── 04-validation/    # Validation phase
    └── 05-reviewer2/     # Review sessions
```

## APIs Required

- **Scopus** (via institutional VPN)
- **PubMed** (free)
- **OpenAlex** (free)

See `config/apis.md` for setup.

## Example Session

See `examples/uot-crispr-session.md` for a complete walkthrough investigating UOT for CRISPR off-target prediction.

## Design Inspirations

- **Ralph** (github.com/RalphHarada/Ralph) - Infinite loop architecture
- **Get Shit Done** (github.com/dstenb/get-shit-done) - State management templates
- **OpenAI Codex** - Context compaction patterns
- **BMAD Method** - Research workflow structure
- **K-Dense Scientific Skills** - API integration patterns

## License

MIT
