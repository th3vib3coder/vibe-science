# R2 Temporal Decay Calibration — Reference Protocol

R2 (Reviewer 2) is the adversarial reviewer. Its effectiveness varies over time — it develops blind spots, misses certain fault categories, and its thoroughness fluctuates. The calibration system tracks R2's historical performance and uses temporal decay to generate actionable hints for the current session. Recent performance matters more than ancient history.

---

## The Decay Formula

```
weight = exp(-0.02 * ageWeeks)
```

Where:
- `ageWeeks = (now - timestamp) / (7 * 24 * 60 * 60 * 1000)`
- `now` is the current time in milliseconds since epoch
- `timestamp` is the review's timestamp in milliseconds since epoch

**Decay curve:**

| Age | Weight | Interpretation |
|-----|--------|---------------|
| 0 weeks (today) | 1.000 | Full weight |
| 1 week | 0.980 | Near-full weight |
| 4 weeks | 0.923 | Still significant |
| 12 weeks | 0.787 | Moderate weight |
| 26 weeks | 0.595 | Half-life approaching |
| 52 weeks | 0.354 | Substantially decayed |
| 104 weeks | 0.125 | Minimal weight |

The half-life is approximately 34.7 weeks (~8 months). This means R2's performance from last month is nearly as relevant as today's, but performance from a year ago is heavily discounted.

---

## What Decays

Three data streams are subject to temporal decay:

### 1. Weakness Counts

**Source:** `r2_reviews.r2_weaknesses` column (JSON array of weakness categories).

Each R2 review records the weaknesses that R2 identified (or failed to identify). Weakness categories include:
- `confounder_missed` — R2 did not flag an obvious confounder
- `prior_art_missed` — R2 did not find contradicting prior literature
- `methodology_weak` — R2 accepted a flawed methodology
- `statistics_error` — R2 missed a statistical error
- `sample_size_ignored` — R2 did not challenge insufficient sample size
- `leakage_missed` — R2 did not detect data leakage
- `batch_effect_missed` — R2 did not flag batch effects

**Decay application:** Each weakness occurrence is weighted by the decay formula based on the review's timestamp. The decayed weights are summed per category.

**Example:**
```
confounder_missed:
  - Review 2 weeks ago: weight = 0.961
  - Review 8 weeks ago: weight = 0.852
  - Decayed total: 1.813

batch_effect_missed:
  - Review 1 week ago: weight = 0.980
  - Decayed total: 0.980
```

### 2. SFI Catch Rates

**Source:** `r2_reviews` table columns: `sfi_caught`, `sfi_injected`, `sfi_missed`.

Seeded Fault Injection (SFI) injects known faults into claim sets before R2 reviews. The catch rate measures how many seeded faults R2 actually detected.

**Decay application:** Each SFI review is weighted by the decay formula. Per-category miss rates are computed:
- `miss_rate(category) = sum(missed * weight) / sum(injected * weight)`

Categories come from the fault taxonomy (`assets/fault-taxonomy.yaml`):
- `SIGN_REVERSAL` — Effect direction is reversed
- `CONFOUNDER_HIDDEN` — A confounder explains the effect
- `P_HACKING` — Multiple comparisons without correction
- `LEAKAGE` — Training data leaks into test
- `FABRICATION` — Number does not trace to computation

### 3. J0 Scores

**Source:** `r2_reviews.j0_score` column (numeric, 0-100 scale from Judge Agent).

**Decay application:** J0 scores are weighted by the decay formula to compute a weighted average:
- `weighted_j0 = sum(j0_score * weight) / sum(weight)`

The trend is computed by comparing weighted recent J0 (last 4 weeks) against weighted older J0:
- Recent > older + 5: **improving**
- Recent < older - 5: **declining**
- Otherwise: **stable**
- Fewer than 3 scored reviews: **insufficient_data**

---

## Data Source

All calibration data comes from the `r2_reviews` table:

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `session_id` | TEXT | Session that produced this review |
| `review_mode` | TEXT | `INLINE`, `FORCED`, `SFI` |
| `r2_weaknesses` | TEXT (JSON) | Array of weakness category strings |
| `sfi_caught` | INTEGER | Number of seeded faults caught (SFI mode only) |
| `sfi_injected` | INTEGER | Number of seeded faults injected (SFI mode only) |
| `sfi_missed` | TEXT (JSON) | Array of missed fault categories (SFI mode only) |
| `j0_score` | REAL | Judge Agent score, 0-100 (null if not judged) |
| `timestamp` | TEXT | ISO 8601 timestamp of the review |
| `project_path` | TEXT | RQ directory path |

---

## Session-Start Hint Generation

The SessionStart hook queries the `r2_reviews` table and generates calibration hints. The hints are included in the `[R2-CAL]` block of the progressive context.

### Hint 1: Top 3 Weaknesses

Query all weakness occurrences, apply decay weights, sum per category. Report the top 3 categories where `decayed_weight >= 1.5`.

**Format:**
```
[R2-CAL] Top weaknesses (decayed):
  1. confounder_missed (weight: 2.81) — R2 historically misses confounders
  2. batch_effect_missed (weight: 1.92) — batch effects under-scrutinized
  3. statistics_error (weight: 1.53) — statistical methodology sometimes accepted uncritically
```

If no category reaches the 1.5 threshold, report: `[R2-CAL] No significant weakness patterns detected.`

### Hint 2: Top SFI Miss Categories

Query all SFI reviews, apply decay weights, compute miss rates per category. Report categories with `miss_rate > 0.30`.

**Format:**
```
[R2-CAL] SFI miss rates (decayed):
  SIGN_REVERSAL: 0.67 (missed 2 of 3, weighted)
  CONFOUNDER_HIDDEN: 0.40 (missed 2 of 5, weighted)
```

If no category exceeds 0.30: `[R2-CAL] SFI catch rates acceptable across all categories.`

### Hint 3: J0 Trend

Compute weighted J0 for recent (last 4 weeks) vs. older reviews. Report the trend.

**Format:**
```
[R2-CAL] J0 trend: declining (recent weighted avg: 62, older weighted avg: 74)
```

Or: `[R2-CAL] J0 trend: insufficient_data (fewer than 3 scored reviews)`

---

## Guard Clauses

Calibration data can be messy. These guard clauses prevent crashes:

| Condition | Handling |
|-----------|----------|
| `timestamp` is null | Treat as `weight = 1.0` (assume recent) |
| `timestamp` is NaN or unparseable | Treat as `weight = 1.0` (assume recent) |
| Computed `ageWeeks` is negative | Clamp to 0 (weight = 1.0) |
| `r2_weaknesses` is null or not valid JSON | Skip this review for weakness analysis |
| `sfi_caught` / `sfi_injected` is null | Skip this review for SFI analysis |
| `sfi_injected` is 0 | Skip (avoid division by zero in miss rate) |
| `j0_score` is null | Skip this review for J0 analysis |
| No reviews in DB | Report `[R2-CAL] No prior review data available.` |
| All reviews older than 52 weeks | Report `[R2-CAL] All review data is stale (>1 year). Treat as fresh start.` |

---

## Integration

- **SessionStart hook** calls this protocol to generate the `[R2-CAL]` context block.
- **R2 agent** receives the calibration hints as part of its session context. The hints guide R2 to focus on historically weak areas.
- **SFI protocol** (`protocols/seeded-fault-injection.md`) generates the raw data that feeds into SFI catch rate analysis.
- **Judge Agent** (`protocols/judge-agent.md`) generates the J0 scores that feed into J0 trend analysis.
- **Stop hook** does not directly update calibration — calibration is derived from review records, which are written during the session.

---

## Design Rationale

Why temporal decay instead of simple averages?

1. **Recency matters.** R2's performance last week is more predictive of its performance today than its performance six months ago. The agent may have learned, or the research domain may have shifted.
2. **No hard cutoffs.** A simple "last 30 days" window creates discontinuities — a review from 29 days ago has full weight, one from 31 days has zero. Exponential decay is smooth.
3. **Self-correcting.** If R2 fixes a weakness, the old failures naturally decay, and the hint disappears. No manual cleanup needed.
4. **Resistant to outliers.** A single bad review from months ago does not permanently taint the calibration. It decays.

---

*This protocol is specific to R2 calibration but the temporal decay formula is reused across the system (see pattern-extraction.md, instinct-model.md).*
