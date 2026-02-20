# VLM Gate Protocol — Visual Validation

> Load this when: EVALUATE-vlm, after figures are generated and VLM access is available.

## Overview

Gate G6 (VLM Validation) uses a vision-language model to assess figure quality. This gate is OPTIONAL — if no VLM access is available, skip it. It is the only optional gate in the system.

When available, VLM validation catches figure-level problems that metric-based gates miss: garbled plots, unlabeled axes, trends that contradict the metrics, misleading color schemes.

---

## When to Run

- After any computational node produces figures
- After scientific-visualization skill generates publication figures
- Before figures are included in a report or paper draft
- During Stage 5 (Synthesis) for all figures in the writeup

---

## VLM Validation Checklist

For each figure, the VLM assesses:

### 1. Readability (0-1)
- Is the figure readable? (not garbled, not blank, not corrupted)
- Are all text elements legible? (labels, legends, titles)
- Is the resolution sufficient?

### 2. Labeling (0-1)
- Are axes labeled with units?
- Is there a legend if multiple series are shown?
- Is there a title or caption?
- Are color bar labels present (if heatmap)?

### 3. Trend-Metric Consistency (0-1)
- Do visual trends match the quantitative metrics?
- If accuracy = 0.78, does the ROC curve look like 0.78?
- If signal quality is claimed, is it visible in eye diagram?
- Mismatch between figure and metrics → potential bug in figure generation

### 4. Accessibility (0-1)
- Is the color scheme colorblind-friendly?
- Is there sufficient contrast?
- Can the figure be understood in grayscale? (for print)

### 5. Scientific Integrity (0-1)
- Are error bars present where expected?
- Is the y-axis starting at zero (or justified if not)?
- Are outliers visible and not hidden?
- No misleading scaling or truncation?

---

## VLM Score Computation

```
vlm_score = mean(readability, labeling, trend_metric, accessibility, integrity)
```

### Thresholds

| Score | Action |
|-------|--------|
| >= 0.8 | PASS — figure ready for use |
| 0.6-0.79 | PASS with WARNINGS — fix minor issues if time permits |
| < 0.6 | FAIL — regenerate figure before using |

---

## Gate G6 Pass/Fail

```
PASS criteria:
□ Figures are readable (not garbled, not blank)
□ Axes are labeled with units
□ Trends visible in figures match quantitative metrics
□ Color schemes are colorblind-friendly
□ VLM quality score >= 0.6

FAIL actions:
- Garbled/blank figures → regenerate
- Axes unlabeled → fix and regenerate
- Trend-metric mismatch → INVESTIGATE (potential bug in figure generation)

OPTIONAL: If no VLM access, skip this gate. Not blocking.
```

---

## VLM Invocation

When invoking VLM for figure analysis:

1. Read the figure file (PNG, PDF, SVG)
2. Provide context: what the figure is supposed to show, what metrics to expect
3. Ask VLM to assess using the 5-point checklist above
4. Record VLM feedback in node's `vlm_feedback` field
5. Record VLM score in node's `vlm_score` field

### Prompt Template for VLM

```
Analyze this scientific figure. Context: [what the figure shows].
Expected metrics: [relevant metric values].

Assess on these 5 dimensions (score 0-1 each):
1. Readability: Can you read all text? Is the figure clear?
2. Labeling: Are axes labeled with units? Legend present?
3. Trend-Metric Consistency: Does the visual trend match expected metrics?
4. Accessibility: Colorblind-friendly? Sufficient contrast?
5. Scientific Integrity: Error bars? Appropriate y-axis? No misleading scaling?

For each dimension: score + brief justification.
Overall assessment: what needs fixing.
```

---

## Figures in Writeup

During Stage 5, ALL figures intended for the final writeup must pass VLM validation (if available). This ensures publication-quality output.

For figures that fail:
1. Note specific issues from VLM feedback
2. Regenerate using scientific-visualization skill with fixes
3. Re-validate
4. If still failing after 2 attempts: include with documented caveats
