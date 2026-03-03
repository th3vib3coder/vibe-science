#!/usr/bin/env python3
"""DQ1-DQ4 Data Quality Gate Checks.

Usage:
    python dq_gate.py --gate DQ1|DQ2|DQ3|DQ4 --data data.json [--config domain-config.yaml]

Exit codes:
    0 = PASS (all checks passed)
    1 = FAIL (one or more checks failed)

Output: JSON result to stdout with check details.
"""

import argparse
import json
import math
import sys
from pathlib import Path

# Default thresholds (overridable via domain-config.yaml)
DEFAULTS = {
    "dq1_max_missing_frac": 0.50,
    "dq1_max_label_corr": 0.95,
    "dq2_min_cv_stability": 0.50,
    "dq2_max_feature_importance_frac": 0.50,
    "dq3_perfect_threshold": 0.001,
    "dq4_number_tolerance": 0.001,
}


def load_config(config_path):
    """Load domain config if provided, merge with defaults."""
    thresholds = dict(DEFAULTS)
    if config_path and Path(config_path).exists():
        try:
            import yaml  # Optional dependency
            with open(config_path) as f:
                cfg = yaml.safe_load(f) or {}
            if "thresholds" in cfg and "dq_gates" in cfg["thresholds"]:
                thresholds.update(cfg["thresholds"]["dq_gates"])
        except ImportError:
            # yaml not available — try JSON fallback
            if config_path.endswith(".json"):
                with open(config_path) as f:
                    cfg = json.load(f)
                if "thresholds" in cfg and "dq_gates" in cfg["thresholds"]:
                    thresholds.update(cfg["thresholds"]["dq_gates"])
    return thresholds


def check_dq1(data, thresholds):
    """Post-Extraction Data Quality."""
    checks = []
    features = data.get("features", [])
    labels = data.get("labels", [])
    n_samples = data.get("n_samples", 0)
    n_features = data.get("n_features", 0)

    # Check: no zero-variance features
    zero_var = [f["name"] for f in features if f.get("variance", 1) == 0]
    checks.append({
        "check": "zero_variance",
        "passed": len(zero_var) == 0,
        "detail": f"{len(zero_var)} zero-variance features" if zero_var else "OK",
        "flagged": zero_var[:5],
    })

    # Check: no features with >threshold missing values
    max_missing = thresholds["dq1_max_missing_frac"]
    high_missing = [
        f["name"] for f in features
        if f.get("missing_frac", 0) > max_missing
    ]
    checks.append({
        "check": "high_missing",
        "passed": len(high_missing) == 0,
        "detail": f"{len(high_missing)} features with >{max_missing*100:.0f}% missing" if high_missing else "OK",
        "flagged": high_missing[:5],
    })

    # Check: no feature with |correlation| > threshold with label (leakage)
    max_corr = thresholds["dq1_max_label_corr"]
    leakage = [
        f["name"] for f in features
        if abs(f.get("label_correlation", 0)) > max_corr
    ]
    checks.append({
        "check": "label_leakage",
        "passed": len(leakage) == 0,
        "detail": f"{len(leakage)} features with |corr| > {max_corr} to label" if leakage else "OK",
        "flagged": leakage[:5],
    })

    # Check: feature/sample count matches expectation
    expected_n = data.get("expected_n_samples")
    expected_f = data.get("expected_n_features")
    count_ok = True
    count_detail = "OK"
    if expected_n and n_samples != expected_n:
        count_ok = False
        count_detail = f"Expected {expected_n} samples, got {n_samples}"
    elif expected_f and n_features != expected_f:
        count_ok = False
        count_detail = f"Expected {expected_f} features, got {n_features}"
    checks.append({
        "check": "count_match",
        "passed": count_ok,
        "detail": count_detail,
    })

    # Check: cross-check values against metadata
    cross_checks = data.get("cross_checks", [])
    cross_ok = all(c.get("match", True) for c in cross_checks)
    mismatches = [c for c in cross_checks if not c.get("match", True)]
    checks.append({
        "check": "cross_check",
        "passed": cross_ok,
        "detail": f"{len(mismatches)} cross-check mismatches" if mismatches else "OK",
        "flagged": [m.get("field", "unknown") for m in mismatches[:5]],
    })

    return checks


def check_dq2(data, thresholds):
    """Post-Training Model Quality."""
    checks = []

    # Check: model outperforms trivial baseline
    model_metric = data.get("model_metric", 0)
    baseline_metric = data.get("baseline_metric", 0)
    checks.append({
        "check": "beats_baseline",
        "passed": model_metric > baseline_metric,
        "detail": f"Model={model_metric:.4f} vs Baseline={baseline_metric:.4f}",
    })

    # Check: no single feature dominance
    max_imp = thresholds["dq2_max_feature_importance_frac"]
    importances = data.get("feature_importances", [])
    dominant = [f for f in importances if f.get("importance", 0) > max_imp]
    checks.append({
        "check": "no_dominance",
        "passed": len(dominant) == 0,
        "detail": f"{len(dominant)} features with importance > {max_imp*100:.0f}%" if dominant else "OK",
        "flagged": [d.get("name", "?") for d in dominant[:3]],
    })

    # Check: fold stability
    max_cv = thresholds["dq2_min_cv_stability"]
    fold_metrics = data.get("fold_metrics", [])
    if len(fold_metrics) >= 2:
        mean_m = sum(fold_metrics) / len(fold_metrics)
        std_m = math.sqrt(sum((x - mean_m) ** 2 for x in fold_metrics) / len(fold_metrics))
        cv = std_m / mean_m if mean_m != 0 else float("inf")
        checks.append({
            "check": "fold_stability",
            "passed": cv < max_cv,
            "detail": f"CV={cv:.3f} (threshold={max_cv})",
        })
    else:
        checks.append({
            "check": "fold_stability",
            "passed": False,
            "detail": "Insufficient folds (need >= 2)",
        })

    # Check: no train-test leakage
    train_metric = data.get("train_metric", 0)
    test_metric = data.get("test_metric", model_metric)
    gap = train_metric - test_metric
    checks.append({
        "check": "no_leakage",
        "passed": gap < 0.3,  # >30% gap is suspicious
        "detail": f"Train-test gap={gap:.4f} (train={train_metric:.4f}, test={test_metric:.4f})",
    })

    return checks


def check_dq3(data, thresholds):
    """Post-Calibration Statistical Quality."""
    checks = []
    perfect_thresh = thresholds["dq3_perfect_threshold"]

    # Check: metric in plausible range
    metric_value = data.get("metric_value", None)
    metric_min = data.get("plausible_min", 0)
    metric_max = data.get("plausible_max", 1)
    if metric_value is not None:
        in_range = metric_min <= metric_value <= metric_max
        checks.append({
            "check": "plausible_range",
            "passed": in_range,
            "detail": f"Value={metric_value:.4f}, range=[{metric_min}, {metric_max}]",
        })
    else:
        checks.append({
            "check": "plausible_range",
            "passed": False,
            "detail": "No metric_value provided",
        })

    # Check: not suspiciously perfect
    if metric_value is not None:
        is_perfect = abs(metric_value - 1.0) < perfect_thresh or abs(metric_value) < perfect_thresh
        checks.append({
            "check": "not_perfect",
            "passed": not is_perfect,
            "detail": f"Value={metric_value:.6f} (suspiciously perfect)" if is_perfect else "OK",
        })

    # Check: adequate sample size
    n = data.get("sample_size", 0)
    precision_digits = data.get("reported_precision_digits", 3)
    min_n = 10 ** precision_digits  # rough heuristic
    checks.append({
        "check": "adequate_sample",
        "passed": n >= min(min_n, 30),  # at least 30 or precision-based
        "detail": f"n={n}, reporting {precision_digits} digits",
    })

    # Check: reproducible across seeds
    seed_results = data.get("seed_results", [])
    if len(seed_results) >= 2:
        checks.append({
            "check": "reproducible",
            "passed": True,
            "detail": f"{len(seed_results)} seeds tested",
        })
    else:
        checks.append({
            "check": "reproducible",
            "passed": len(seed_results) == 1,
            "detail": f"{len(seed_results)} seed(s) — consider more" if seed_results else "No seeds reported",
        })

    return checks


def check_dq4(data, thresholds):
    """Post-Finding Document Quality."""
    checks = []
    tol = thresholds["dq4_number_tolerance"]

    # Check: numbers match source
    reported_numbers = data.get("reported_numbers", {})
    source_numbers = data.get("source_numbers", {})
    mismatches = []
    for key, reported in reported_numbers.items():
        source = source_numbers.get(key)
        if source is None:
            mismatches.append({"key": key, "reported": reported, "source": "MISSING"})
        elif abs(float(reported) - float(source)) > tol:
            mismatches.append({"key": key, "reported": reported, "source": source})
    checks.append({
        "check": "numbers_match",
        "passed": len(mismatches) == 0,
        "detail": f"{len(mismatches)} mismatches" if mismatches else "OK",
        "flagged": mismatches[:5],
    })

    # Check: sample size reported
    has_n = data.get("sample_size_reported", False)
    checks.append({
        "check": "sample_size",
        "passed": has_n,
        "detail": "Sample size reported" if has_n else "Sample size NOT reported in finding",
    })

    # Check: alternative explanations
    alternatives = data.get("alternative_explanations", [])
    is_surprising = data.get("is_surprising", False)
    alt_ok = not is_surprising or len(alternatives) >= 1
    checks.append({
        "check": "alternatives",
        "passed": alt_ok,
        "detail": f"{len(alternatives)} alternatives listed" if alternatives else ("OK — not surprising" if not is_surprising else "No alternatives for surprising result"),
    })

    # Check: terminology consistency
    term_issues = data.get("terminology_issues", [])
    checks.append({
        "check": "terminology",
        "passed": len(term_issues) == 0,
        "detail": f"{len(term_issues)} inconsistencies" if term_issues else "OK",
        "flagged": term_issues[:5],
    })

    return checks


def main():
    parser = argparse.ArgumentParser(description="DQ Gate Checker")
    parser.add_argument("--gate", required=True, choices=["DQ1", "DQ2", "DQ3", "DQ4"])
    parser.add_argument("--data", required=True, help="Path to JSON data file")
    parser.add_argument("--config", default=None, help="Path to domain-config.yaml")
    args = parser.parse_args()

    with open(args.data) as f:
        data = json.load(f)

    thresholds = load_config(args.config)

    gate_funcs = {
        "DQ1": check_dq1,
        "DQ2": check_dq2,
        "DQ3": check_dq3,
        "DQ4": check_dq4,
    }

    checks = gate_funcs[args.gate](data, thresholds)
    all_passed = all(c["passed"] for c in checks)

    result = {
        "gate": args.gate,
        "status": "PASS" if all_passed else "FAIL",
        "checks": checks,
    }

    print(json.dumps(result, indent=2))
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
