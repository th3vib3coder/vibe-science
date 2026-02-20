# Vibe Science Photonics — Forensic Acceptance Checklist

> **Purpose**: This checklist defines the acceptance criteria for the Vibe Science Photonics fork (based on v5.5 ORO).
> Every item must be verified before the fork is considered "done."
> Use this during T-24 (final verification) and before any GitHub release.
>
> **Fork context**: Specialized for literature-based research in photonics and high-speed optical interconnects (IM-DD, VCSEL, PAM4). Expert-guided mode with Human Expert gates. v5.5 ORO adds 7 domain-general gates (L-1, DQ1-DQ4, DD0, DC0), R2 INLINE mode, SSOT rule, structured logbook, and operational integrity checks.

---

## A. Hard-Fail Criteria (ALL must be YES or the fork is not shippable)

- [ ] **A1. Non-bypassability**: R2/R3 cannot write to CLAIM-LEDGER.md. Only orchestrator writes. Verified by: permission model in SKILL.md + CLAUDE.md role constraints.
- [ ] **A2. Schema enforcement**: All 8 schema-enforced gates fail automatically on invalid artifacts. Prose is ignored. Verified by: schema-validation.md protocol + all 9 JSON Schema files present and valid.
- [ ] **A3. V0 gate operational**: SFI injects faults, V0 checks caught=true for all non-EQUIV faults. RMS >= 0.80 AND FAR <= 0.10 required. Verified by: seeded-fault-injection.md + fault-taxonomy.yaml + vigilance-check.schema.json.
- [ ] **A6. DQ gates operational (v5.5)**: DQ1 (post-extraction), DQ2 (post-training), DQ3 (post-calibration), DQ4 (post-finding) are hard stops in pipeline. HALT on failure. Verified by: gates.md DQ section + loop-otae.md.
- [ ] **A7. R2 INLINE mode operational (v5.5)**: 7-point checklist fires at every finding formulation, BEFORE CLAIM-LEDGER entry. Verified by: reviewer2-ensemble.md INLINE section.
- [ ] **A4. Deadlock control**: Circuit breaker triggers after 3 rounds gossip. DISPUTED state exists in claim ledger. S5 poison pill blocks synthesis with unresolved disputes. Verified by: circuit-breaker.md protocol.
- [ ] **A5. Retry limits in CHECKPOINT flow**: V0 max 3 failures, J0 max 2 consecutive, schema max 3 attempts. All with ESCALATE to human. Verified by: SKILL.md checkpoint flow section.

---

## B. Control-Plane & Separation of Powers

- [ ] **B1. Verdict != Execution**: R2 produces verdict_artifact.yaml. Orchestrator parses and applies. R3 scores but never rewrites R2's report. Verified by: reviewer2-ensemble.md + judge-agent.md.
- [ ] **B2. Transition validation**: State machine enforces legal transitions only. KILLED->VERIFIED requires revival protocol. Verified by: permission model in SKILL.md.
- [ ] **B3. Schemas READ-ONLY**: No agent can modify schema files. Verified by: schema-validation.md protocol.
- [ ] **B4. claim.type locked**: Assigned by orchestrator, locked after assignment, reclassification requires R2 review. Verified by: claim-promotion.schema.json includes claim_type_assigned_by and claim_type_locked fields.

---

## C. SFI Quality (Mutation Testing for Claims)

- [ ] **C1. Fault taxonomy complete**: All 8 categories have >= 2 ACTIVE faults. Difficulty ratings assigned. Equivalence risk rated. Verified by: fault-taxonomy.yaml.
- [ ] **C2. EQUIV state defined**: Non-discriminable faults excluded from RMS denominator. Verified by: seeded-fault-injection.md.
- [ ] **C3. Retirement mechanism**: Faults caught 3+ times -> RETIRED. Minimum 2 ACTIVE per category enforced. Verified by: seeded-fault-injection.md.
- [ ] **C4. Meta-faults present**: At least 3 domain-independent meta-faults (claim type misclassification, cherry-picked citation, p-hacking narrative). Verified by: fault-taxonomy.yaml.
- [ ] **C5. R2 awareness documented**: Blueprint explains why R2 knowing fault categories is OK (knows types, not specific injections). Verified by: blueprint SFI section.
- [ ] **C6. Physical impossibility fault present**: SFI-03 tests for violations of Shannon limit, thermodynamic laws, and optical physical limits (not biological impossibility). Verified by: fault-taxonomy.yaml SFI-03 entry.
- [ ] **C7. Simulation-only fault present**: SFI-05 tests for claims validated only in simulation with no experimental device confirmation. Verified by: fault-taxonomy.yaml SFI-05 entry.
- [ ] **C8. Missing practical constraint fault present**: SFI-08 tests for claims ignoring cost, yield, thermal budget, packaging, or reliability constraints. Verified by: fault-taxonomy.yaml SFI-08 entry.

---

## D. BFP Quality (Anti-Anchoring)

- [ ] **D1. Two-phase protocol**: Phase 1 (blind) -> Phase 2 (full context) clearly specified. Verified by: blind-first-pass.md.
- [ ] **D2. Discrepancy accounting mandatory**: R2 must explain any Phase1/Phase2 divergence. Verified by: blind-first-pass.md.
- [ ] **D3. CoVe integration**: Phase 1 includes verification question generation. Verified by: blind-first-pass.md.
- [ ] **D4. SOLO mode self-consistency**: N=3 independent assessments, most conservative verdict. Verified by: blind-first-pass.md.
- [ ] **D5. Physical limits question in Phase 1**: Phase 1 includes the standard question "What physical limits constrain this claim?" (Shannon limit, thermodynamics, optical bandwidth, noise floors). Verified by: blind-first-pass.md Phase 1 question list.

---

## E. R3/J0 Quality (Meta-Review)

- [ ] **E1. Rubric operational**: 6 dimensions, 0-3 each, total 18. PASS >= 12, WEAK 9-11, FAIL < 9. Verified by: judge-agent.md + judge-rubric.yaml.
- [ ] **E2. Anti-gaming rule**: Brevity not penalized. Specificity and evidence rewarded. Verified by: judge-agent.md.
- [ ] **E3. SOLO mode specification**: Self-consistency N=2, lower score wins. Blind input (no researcher justifications). Monitoring for SOLO vs TEAM J0 FAIL rate divergence. Verified by: judge-agent.md.
- [ ] **E4. No dimension = 0 allowed**: Even if total >= 12, any dimension at 0 triggers FAIL. Verified by: judge-agent.md + J0 gate spec in gates.md.

---

## F. Serendipity Preservation

- [ ] **F1. Salvagente protocol**: R2 MUST produce seed when kill_reason is INSUFFICIENT_EVIDENCE, CONFOUNDED, or PREMATURE. Skip only for LOGICALLY_FALSE or KNOWN_ARTIFACT. Verified by: reviewer2-ensemble.md.
- [ ] **F2. Seed schema enforced**: All seeds validate against serendipity-seed.schema.json. Mandatory fields: causal_question, falsifiers (3-5), discriminating_test, expected_value. Verified by: schema + serendipity-engine.md.
- [ ] **F3. Exploration floor at T3**: Warning < 0.20, FAIL < 0.10. Verified by: gates.md T3 spec.
- [ ] **F4. Triage deadline**: Seeds must be triaged within N+5 cycles. Verified by: serendipity-engine.md.

---

## G. Confidence Formula

- [ ] **G1. Hard veto**: E < 0.05 OR D < 0.05 -> confidence = 0. Verified by: evidence-engine.md.
- [ ] **G2. Geometric mean with floor**: R_eff = max(R, floor), same for C, K. confidence = E * D * (R_eff * C_eff * K_eff)^(1/3). Verified by: evidence-engine.md.
- [ ] **G3. Dynamic floor table**: 4 rows (descriptive/early, descriptive/late, causal, paper-critical) with correct floor values (0.05, 0.10, 0.15, 0.20). Verified by: evidence-engine.md.
- [ ] **G4. claim.type lock**: Floor depends on orchestrator-assigned type, not researcher-declared type. Verified by: evidence-engine.md + claim-promotion.schema.json.
- [ ] **G5. Expert assertion source**: Expert assertion documented as evidence source with E=0.80 in evidence-engine.md. Confidence formula correctly incorporates expert-provided evidence at this weight. Verified by: evidence-engine.md source table.
- [ ] **G6. Expert statuses defined**: EXPERT_CONFIRMED and EXPERT_DISPUTED statuses are defined as valid claim states. EXPERT_CONFIRMED boosts confidence floor to 0.70. EXPERT_DISPUTED triggers immediate R2 re-review. Verified by: evidence-engine.md status definitions + claim-promotion.schema.json.

---

## H. Circuit Breaker & Dispute Handling

- [ ] **H1. Gossip limit = 3**: Same claim, same objection, 3 rounds with no state change -> DISPUTED. Verified by: circuit-breaker.md.
- [ ] **H2. Verbatim preservation**: dispute_reason and researcher_position saved without reinterpretation. Verified by: circuit-breaker.md.
- [ ] **H3. S5 poison pill**: Stage 5 synthesis CANNOT close with DISPUTED claims. Resolution options documented (new data, drop, human override). Verified by: circuit-breaker.md + gates.md S5 spec.
- [ ] **H4. OTAE continues**: Other claims process normally while disputed claim is frozen. Verified by: circuit-breaker.md.

---

## I. Document Consistency (Doc-Lint)

- [ ] **I1. SFI scope**: "FORCED only" everywhere (not BATCH, not SHADOW). Check: SFI protocol, CHECKPOINT flow, design decisions.
- [ ] **I2. Gate count**: 36 everywhere. 25 base + 4 Human Expert gates (HE0-HE3) + 7 v5.5 gates (L-1, DQ1-DQ4, DD0, DC0). All references to gate count must reflect 36.
- [ ] **I3. Schema count**: 9 everywhere. 8 gate schemas + serendipity-seed.
- [ ] **I4. Task count**: Task numbering is sequential with no gaps. All tasks listed in Blueprint are accounted for.
- [ ] **I5. Reference count**: All references numbered sequentially. Literature references from v5.0 retained plus photonics-specific additions.
- [ ] **I6. Huang et al.**: Cited as (2024) everywhere. ICLR 2024.
- [ ] **I7. LAW 8**: Described as "principle preserved, enforcement quantified" — not "unchanged."
- [ ] **I8. SOLO mode defined**: For R2 (self-consistency N=3), R3 (self-consistency N=2, blind input), BFP (CoVe questions).
- [ ] **I14. R2 mode count (v5.5)**: 7 activation modes everywhere (BRAINSTORM, FORCED, BATCH, SHADOW, VETO, REDIRECT, INLINE). All references to R2 modes reflect 7, not 6.
- [ ] **I15. v5.5 gates present in gates.md (v5.5)**: L-1 (Literature Pre-Check), DQ1-DQ4 (Data Quality), DD0 (Data Dictionary), DC0 (Design Compliance) all defined with trigger conditions and HALT/WARN behavior.
- [ ] **I16. SSOT rule documented (v5.5)**: evidence-engine.md contains SSOT rule. Numbers in narrative documents traceable to structured data files.
- [ ] **I17. Structured logbook in CRYSTALLIZE (v5.5)**: loop-otae.md CRYSTALLIZE phase includes mandatory LOGBOOK.md entry with timestamp, phase, action, inputs, outputs, gate_status.
- [ ] **I18. Operational integrity checks in OBSERVE (v5.5)**: loop-otae.md OBSERVE phase includes orphaned dataset detection, document sync, design drift checks.
- [ ] **I9. Version consistency**: plugin.json, SKILL.md, CLAUDE.md, README.md all identify this as the Photonics fork of v5.5 ORO. Version 5.5.0 everywhere.
- [ ] **I10. File tree matches reality**: Every file listed in Blueprint exists. Every file that exists is listed. New files (CONTEXT.md, expert-knowledge.md, README.md) are present and accounted for.
- [ ] **I11. R2-Physics in all reviewer references**: Every reference to the domain-specialist reviewer role uses "R2-Physics" (not "R2-Bio"). This includes SKILL.md, CLAUDE.md, reviewer2-ensemble.md, blind-first-pass.md, gates.md, evidence-engine.md, and the Blueprint.
- [ ] **I12. Expert Knowledge Injection protocol referenced**: The Expert Knowledge Injection protocol is referenced in SKILL.md (expert-guided research mode section), brainstorm-engine.md (Step 1 Expert Knowledge Harvest), and reviewer2-ensemble.md (R2 consults EXPERT-ASSERTIONS.md). The protocol file protocols/expert-knowledge.md exists and is complete.
- [ ] **I13. CONTEXT.md present and referenced**: CONTEXT.md exists in the repository root. It is referenced in SKILL.md. It explains the fork context, domain, research mode, and expert-guided workflow to future instances.

---

## J. GitHub Publication Quality

- [ ] **J1. README.md**: Clear explanation of what Vibe Science Photonics is, what the fork adds over standard v5.0, how to install/use, architecture diagram, license.
- [ ] **J2. LICENSE**: MIT license file present.
- [ ] **J3. No secrets**: No API keys, no personal data, no hardcoded paths in any file.
- [ ] **J4. Mermaid diagram**: At least one architecture diagram in README (OTAE-Tree flow or CHECKPOINT flow).
- [ ] **J5. Changelog**: CHANGELOG.md with fork entry listing all photonics-specific adaptations and additions.
- [ ] **J6. No personal names**: Zero personal names anywhere in the repository. No author names, no user names, no company names, no GitHub handles, no social media handles, no email addresses of individuals. Verified by: exhaustive grep for all known personal identifiers across every file in the repository.
- [ ] **J7. No proprietary data references**: Zero references to proprietary datasets, internal company data, private measurement results, or confidential experimental data. All data references point to publicly available literature (IEEE Xplore, Optica, SPIE, arXiv, ITU-T standards). Verified by: grep for proprietary identifiers and internal project names.

---

## K. Domain Verification (Photonics Fork Specific)

> **Purpose**: This section verifies that the fork has been correctly specialized for photonics.
> ALL items must be checked. A single failure means the fork still contains biological contamination or is missing required photonics infrastructure.

- [ ] **K1. ZERO biological terms**: The entire repository contains zero instances of the following bio-specific terms (in their domain-specific context): scRNA, scRNA-seq, single-cell RNA, CRISPR, Cas9, off-target (in CRISPR context), guide RNA, cell_type, cell types (in biological context), gene, genes, gene expression (in biological context), scanpy, scvi-tools, scvi, pydeseq2, anndata, AnnData, UMAP (in biological context), batch_key (in scRNA context), batch_id (in scRNA context), pct_mito, pct_ribo, mitochondrial, ribosomal, iLISI, cLISI, kBET, ARI (in scRNA context), NMI (in scRNA context), 10X Chromium, SmartSeq, SmartSeq2, DropSeq, GEO (as database), CellxGene, ENCODE, TCGA, PubMed (as primary source), bioRxiv (as primary source), medrxiv, donor_id, tissue (in biological context), disease (in biological context), organism, n_HVG, n_latent, hvg_flavor, trajectory (in biological context), Waddington, biological impossibility. Verified by: exhaustive recursive grep across all files for each term.

- [ ] **K2. PRESENT photonics terms**: The repository contains appropriate instances of the following photonics-specific terms in their correct locations: VCSEL, IM-DD, PAM4, NRZ, optical interconnect, BER, SNR, power_penalty, reach, eye diagram, IEEE Xplore, Optica, SPIE, arXiv physics.optics, temperature (as measurement parameter), fiber_type, modulation_format, Shannon limit, bandwidth, extinction ratio, threshold current, slope efficiency, power penalty, link budget, wavelength, data rate, FEC, eye height, eye width, sensitivity, RIN. Verified by: grep confirms presence in relevant protocol, asset, and schema files.

- [ ] **K3. ZERO personal names**: No instances of any personal names, including but not limited to: author first names, author last names, user handles, company names, or any other personally identifying information. This overlaps with J6 but is independently verified here as a domain-correctness check. Verified by: exhaustive grep for all known personal identifiers.

- [ ] **K4. All database references updated**: Every reference to a literature database or data source uses photonics-appropriate sources. Primary sources: IEEE Xplore, Optica Publishing Group, SPIE Digital Library, arXiv (physics.optics and eess.SP sections), ITU-T standards, NIST databases. No references to bio-specific databases (GEO, CellxGene, ENCODE, TCGA, PubMed, bioRxiv) as primary sources. Verified by: grep across search-protocol.md, SKILL.md, brainstorm-engine.md, data-extraction.md, and all other files referencing data sources.

- [ ] **K5. R2-Physics in all reviewer references**: Every mention of the domain-specialist reviewer uses "R2-Physics" and never "R2-Bio." The R2-Physics role description references physical plausibility, electromagnetism, optics, semiconductor physics, Shannon limit, and thermodynamic constraints. Verified by: grep for "R2-Bio" returns zero results; grep for "R2-Physics" returns results in all expected files (SKILL.md, CLAUDE.md, reviewer2-ensemble.md, blind-first-pass.md, gates.md, evidence-engine.md, Blueprint).
- [ ] **K8. L-1 uses photonics databases (v5.5)**: Literature Pre-Check gate L-1 references IEEE Xplore, Optica Publishing, arXiv (physics.optics, eess.SP) as databases — NOT PubMed/bioRxiv. Verified by: gates.md L-1 section + brainstorm-engine.md Step 2b.
- [ ] **K9. DD0 uses photonics examples (v5.5)**: Data Dictionary gate DD0 examples reference photonics parameters (output_power, bandwidth, BER, wavelength_nm, power_penalty_dB) — NOT biological features. Verified by: data-extraction.md DD0 section.

- [ ] **K6. Expert Knowledge Injection protocol present and integrated**: The file protocols/expert-knowledge.md exists and defines the complete Expert Knowledge Injection protocol, including: EXPERT-ASSERTIONS.md format and location (.vibe-science/), linguistic triggers for automatic capture, EA-xxx format with source, domain, and confidence fields, claim-vs-expert-assertion collision detection, R2 mandatory consultation of EXPERT-ASSERTIONS.md before every review, and Brainstorm Step 1 "Expert Knowledge Harvest" integration. The protocol is cross-referenced in SKILL.md, brainstorm-engine.md, reviewer2-ensemble.md, and evidence-engine.md. Verified by: reading expert-knowledge.md + grep for cross-references.

- [ ] **K7. HE0-HE3 gates defined in gates.md**: The four Human Expert gates are fully defined in gates.md with the following specifications: HE0 (post-Brainstorm Step 1, "Context correct?", BLOCKING), HE1 (post-Triage Step 6, "Research questions correctly prioritized?", BLOCKING), HE2 (every Stage transition, "Physically plausible?", BLOCKING), HE3 (pre-S5, "Conclusions: what is missing?", BLOCKING). Each gate specifies trigger condition, blocking behavior, expert input format, and timeout/escalation. Verified by: reading gates.md HE gate section.

---

## Scoring

- **Section A (Hard-Fail)**: ALL must be checked. Any unchecked = NOT SHIPPABLE.
- **Sections B-H (Forensic)**: Target >= 80% checked. Below 60% = "theatre of rigor."
- **Section I (Doc-Lint)**: ALL must be checked. These are bugs, not opinions.
- **Section J (GitHub)**: ALL must be checked for public release.
- **Section K (Domain Verification)**: ALL must be checked for domain-correct fork. Any unchecked item means the fork has not been fully adapted from the biological origin and is not ready for release.

---

_Reformulated from the Vibe Science v5.5 ORO Forensic Acceptance Checklist for the Photonics fork._
_Based on cross-model adversarial review (Claude + ChatGPT + Gemini 3) of the v5.0 IUDEX blueprint, updated for v5.5 ORO._
_Last updated: 2026-02-19_
