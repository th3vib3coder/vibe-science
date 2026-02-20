# Context: Vibe Science Photonics Edition

> This file provides context for the Claude Code instance that will operate this skill.

## What This Is

This is a specialized fork of Vibe Science v5.0 IUDEX, adapted for **literature-based research in photonics and high-speed optical interconnects** (IM-DD, VCSEL, PAM4/NRZ).

## Research Domain

- **Primary focus**: High-speed optical interconnect architectures
- **Key technologies**: VCSEL (Vertical-Cavity Surface-Emitting Laser), IM-DD (Intensity Modulation / Direct Detection)
- **Modulation formats**: NRZ, PAM4, PAM6, DMT, OFDM
- **Fiber types**: MMF (OM3-OM5), SMF (G.652, G.654)
- **Performance metrics**: BER, SNR, eye diagram quality, power penalty, reach, energy efficiency
- **Key standards**: IEEE 802.3 (Ethernet), ITU-T G-series

## How Research Works Here

This skill is designed for **literature-based research guided by a domain expert**:
- The user is an expert in photonics/laser physics — they know more than you about device physics
- Research is based on PUBLIC scientific literature, NOT proprietary data
- When the user says "that doesn't work because...", "actually...", "the real problem is..." → this is Expert Knowledge Injection. Capture it immediately in EXPERT-ASSERTIONS.md
- The user may be new to Claude Code — be patient, explain commands, suggest next steps

## Key Differences from Standard v5.0

1. **Expert Knowledge Injection**: User's domain assertions are captured as ground truth (protocols/expert-knowledge.md)
2. **Human Expert Gates (HE0-HE3)**: Blocking gates where the system pauses for expert validation
3. **R2-Physics** (not R2-Bio): Reviews for physical plausibility — Shannon limit, thermodynamics, electromagnetic constraints
4. **Literature sources**: IEEE Xplore, Optica, SPIE, arXiv physics.optics (NOT PubMed, GEO, CellxGene)
5. **Domain metrics**: BER, SNR, power penalty, reach, eye diagram (NOT iLISI, cLISI, ARI)

## Recommended Mode

**TEAM mode** is strongly recommended if Agent Teams is available. It provides real context separation for R2-Physics, making the Blind-First Pass architecturally genuine rather than approximated.

If TEAM is not available, SOLO mode works but with the self-agreement limitations documented in the architecture.

## What To Watch For

- Claims that violate physical limits (Shannon, thermodynamics, optical diffraction) — these are SFI-03 faults
- Simulation-only claims presented as universally valid (SFI-05) — critical in VCSEL research
- Missing practical constraints (cost, yield, thermal budget, packaging, reliability) — SFI-08
- Temperature as a confounder — VCSEL performance is highly temperature-dependent
- Conference papers (OFC, ECOC, CLEO) are often more current than journal publications in this field

## Architecture Reference

For the complete architectural design, see:
- `Vibe-Science-Photonics-BLUEPRINT.md` — Full architecture document
- `Vibe-Science-Photonics-FORENSIC-CHECKLIST.md` — Acceptance criteria
- `SKILL.md` — Operational specification
- `CLAUDE.md` — Constitution and laws
