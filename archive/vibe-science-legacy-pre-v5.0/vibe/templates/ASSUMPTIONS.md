---
rq: RQ-XXX
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
total_assumptions: 0
critical_assumptions: 0
---

# ASSUMPTIONS REGISTER

## Purpose

Every conclusion is built on assumptions. This document makes them EXPLICIT.

If an assumption is wrong, the conclusions built on it may collapse.

---

## Assumption Template

```markdown
### A[N]: [Short Title]

**Statement:** [What we assume to be true]

**Type:**
- [ ] Methodological (how we do research)
- [ ] Theoretical (underlying science)
- [ ] Data (about our data sources)
- [ ] Technical (tools/software)

**Criticality:**
- [ ] CRITICAL (if wrong, entire RQ fails)
- [ ] HIGH (if wrong, major findings affected)
- [ ] MEDIUM (if wrong, some findings affected)
- [ ] LOW (if wrong, minor impact)

**Source:** [Where this assumption comes from]
- Explicit in: [paper/method/protocol]
- Inferred from: [observation/practice]
- Assumed without source: [reasoning]

**Verification Status:**
- [ ] Verified (evidence attached)
- [ ] Partially verified (some evidence)
- [ ] Unverified (accepted without proof)
- [ ] Cannot verify (unfalsifiable)

**Risk Assessment:**

| If Wrong | Impact | Affected Findings |
|----------|--------|-------------------|
| [Scenario] | [What happens] | FINDING-001, FINDING-003 |

**Mitigation:** [How we reduce risk if assumption fails]

**Review Schedule:** [When to re-check this assumption]
```

---

## Core Assumptions

### A1: [Title]

**Statement:** [What we assume]

**Type:** [ ] Methodological [ ] Theoretical [ ] Data [ ] Technical

**Criticality:** [ ] CRITICAL [ ] HIGH [ ] MEDIUM [ ] LOW

**Source:**

**Verification Status:** [ ] Verified [ ] Partially [ ] Unverified [ ] Cannot verify

**Risk Assessment:**

| If Wrong | Impact | Affected Findings |
|----------|--------|-------------------|
| | | |

**Mitigation:**

**Review Schedule:**

---

## Assumption Dependency Map

```
RQ Conclusion
├── FINDING-001
│   ├── A1 (CRITICAL)
│   └── A3 (MEDIUM)
├── FINDING-002
│   ├── A2 (HIGH)
│   └── A1 (CRITICAL)  ← shared with FINDING-001
└── FINDING-003
    └── A4 (LOW)
```

If A1 fails: FINDING-001, FINDING-002, and potentially RQ conclusion affected.

---

## Assumption Change Log

| Date | Assumption | Change | Reason | Impact |
|------|------------|--------|--------|--------|
| YYYY-MM-DD | A1 | Created | Initial assumption | - |
| YYYY-MM-DD | A2 | Upgraded to CRITICAL | New evidence | FINDING-002 now critical |
| YYYY-MM-DD | A1 | VERIFIED | Found supporting data | Confidence increased |

---

## Unverified Assumptions Summary

| ID | Statement | Criticality | Risk | Action Needed |
|----|-----------|-------------|------|---------------|
| A2 | ... | HIGH | ... | Find verification |
| A5 | ... | MEDIUM | ... | Document limitation |

---

## Reviewer 2 Integration

Before R2 Final Review, all CRITICAL assumptions must be:
- [ ] Explicitly documented
- [ ] Verification status known
- [ ] Risk if wrong assessed
- [ ] Mitigation identified

R2 will check:
1. Are all critical assumptions listed?
2. Are any hidden assumptions not documented?
3. Is criticality assessment appropriate?
4. Are unverified assumptions flagged in conclusion?

---

## Example: Filled Template

### A1: GUIDE-seq Representativity

**Statement:** GUIDE-seq captures >90% of biologically relevant off-target sites.

**Type:** [x] Data

**Criticality:** [x] CRITICAL

**Source:**
- Explicit in: Tsai 2015 validation experiments
- Compared to: DISCOVER-seq in Lazzarotto 2020

**Verification Status:** [x] Partially verified

**Risk Assessment:**

| If Wrong | Impact | Affected Findings |
|----------|--------|-------------------|
| GUIDE-seq misses 30% of off-targets | UOT model trained on incomplete data | FINDING-001, FINDING-003, CONCLUSION |
| Missing sites are non-random | Systematic bias in predictions | FINDING-002, CONCLUSION |

**Mitigation:**
- Cross-validate with DISCOVER-seq data if available
- Acknowledge limitation in methods section
- Sensitivity analysis with simulated missing sites

**Review Schedule:** Before final conclusion

---

### A2: Cell Death is Positionally Random

**Statement:** Cells dying after CRISPR editing die randomly with respect to off-target genomic positions.

**Type:** [x] Theoretical

**Criticality:** [x] HIGH

**Source:**
- Inferred from: Kim 2020 discussion (not explicitly stated)
- Assumed without strong evidence

**Verification Status:** [x] Unverified

**Risk Assessment:**

| If Wrong | Impact | Affected Findings |
|----------|--------|-------------------|
| Cell death correlates with off-target severity | UOT mass adjustment is biased | FINDING-003 |
| Essential gene off-targets cause selective death | Missing signal in surviving cells | FINDING-001 |

**Mitigation:**
- Check if viability data available per off-target site
- Test correlation between off-target score and cell viability
- If correlation exists: adjust UOT weighting

**Review Schedule:** During data analysis phase

---

## Checklist Before RQ Conclusion

- [ ] All assumptions identified (minimum 3 for any RQ)
- [ ] Criticality assessed for each
- [ ] CRITICAL assumptions verified or limitations documented
- [ ] Dependency map created
- [ ] Unverified assumptions flagged in conclusion
- [ ] Reviewer 2 has seen assumption register
