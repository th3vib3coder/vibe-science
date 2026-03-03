#!/usr/bin/env python3
"""Silent Observer: Check project health (orphans, desync, drift, naming).

Usage:
    python observer.py --project .vibe-science/ [--config domain-config.yaml]

Exit codes:
    0 = no HALT-level alerts
    1 = HALT-level alert found

Output: JSON alerts to stdout (level: INFO|WARN|HALT).
"""

import argparse
import json
import os
import sys
from pathlib import Path


def check_orphaned_files(project_path):
    """Check for data files not referenced in STATE.md or PROGRESS.md."""
    alerts = []
    data_dirs = ["03-data", "06-runs"]

    # Collect referenced files from STATE.md and PROGRESS.md
    referenced = set()
    for doc in ["STATE.md", "PROGRESS.md", "CLAIM-LEDGER.md"]:
        doc_path = project_path / doc
        if doc_path.exists():
            content = doc_path.read_text(encoding="utf-8", errors="replace")
            # Extract file references (paths mentioned in documents)
            for line in content.split("\n"):
                for word in line.split():
                    if "/" in word or "\\" in word:
                        clean = word.strip("`[]()\"'")
                        referenced.add(clean)

    # Scan RQ directories for data files
    for rq_dir in project_path.iterdir():
        if not rq_dir.is_dir() or not rq_dir.name.startswith("RQ-"):
            continue
        for sub in data_dirs:
            sub_path = rq_dir / sub
            if not sub_path.exists():
                continue
            for f in sub_path.rglob("*"):
                if f.is_file() and f.suffix in (".json", ".csv", ".h5ad", ".pkl", ".parquet"):
                    rel = str(f.relative_to(project_path))
                    # Check if any reference contains this filename
                    name = f.name
                    if not any(name in ref for ref in referenced):
                        alerts.append({
                            "level": "WARN",
                            "check": "orphaned_file",
                            "detail": f"File '{rel}' not referenced in any document",
                        })

    return alerts


def check_document_desync(project_path):
    """Check STATE.md and TREE-STATE.json are in sync."""
    alerts = []
    state_path = project_path / "STATE.md"
    tree_path = project_path / "TREE-STATE.json"

    if not state_path.exists():
        alerts.append({
            "level": "WARN",
            "check": "missing_state",
            "detail": "STATE.md does not exist",
        })
        return alerts

    if not tree_path.exists():
        alerts.append({
            "level": "WARN",
            "check": "missing_tree",
            "detail": "TREE-STATE.json does not exist",
        })
        return alerts

    # Check staleness (STATE.md should be updated within recent cycles)
    state_mtime = os.path.getmtime(state_path)
    tree_mtime = os.path.getmtime(tree_path)
    time_diff = abs(state_mtime - tree_mtime)

    if time_diff > 3600:  # More than 1 hour apart
        alerts.append({
            "level": "WARN",
            "check": "state_tree_desync",
            "detail": f"STATE.md and TREE-STATE.json modified {time_diff:.0f}s apart",
        })

    # Check that STATE.md has cycle/stage info matching TREE-STATE.json
    try:
        state_content = state_path.read_text(encoding="utf-8", errors="replace")
        with open(tree_path) as f:
            tree_data = json.load(f)

        tree_stage = tree_data.get("current_stage", None)
        tree_cycle = tree_data.get("cycle", None)

        if tree_stage and f"stage: {tree_stage}" not in state_content.lower() and f"Stage {tree_stage}" not in state_content:
            alerts.append({
                "level": "WARN",
                "check": "stage_desync",
                "detail": f"TREE-STATE.json says stage={tree_stage}, STATE.md may not reflect this",
            })
    except (json.JSONDecodeError, KeyError):
        alerts.append({
            "level": "HALT",
            "check": "tree_parse_error",
            "detail": "TREE-STATE.json is not valid JSON",
        })

    return alerts


def check_design_drift(project_path):
    """Check for design compliance issues."""
    alerts = []

    for rq_dir in project_path.iterdir():
        if not rq_dir.is_dir() or not rq_dir.name.startswith("RQ-"):
            continue

        rq_path = rq_dir / "RQ.md"
        if not rq_path.exists():
            alerts.append({
                "level": "WARN",
                "check": "missing_rq",
                "detail": f"No RQ.md in {rq_dir.name}",
            })
            continue

        # Check that decision-log exists if there are runs
        runs_dir = rq_dir / "06-runs"
        decision_log = rq_dir / "07-audit" / "decision-log.md"
        if runs_dir.exists() and any(runs_dir.iterdir()) and not decision_log.exists():
            alerts.append({
                "level": "WARN",
                "check": "missing_decision_log",
                "detail": f"Runs exist in {rq_dir.name} but no decision-log.md",
            })

    return alerts


def check_naming_consistency(project_path):
    """Check for naming inconsistencies across documents."""
    alerts = []

    # Check CLAIM-LEDGER for consistent claim IDs
    ledger_path = project_path / "CLAIM-LEDGER.md"
    if ledger_path.exists():
        content = ledger_path.read_text(encoding="utf-8", errors="replace")
        import re
        claim_ids = re.findall(r'C-(\d+)', content)
        if claim_ids:
            # Check for gaps in numbering
            nums = sorted(set(int(x) for x in claim_ids))
            expected = list(range(nums[0], nums[-1] + 1))
            gaps = set(expected) - set(nums)
            if gaps:
                alerts.append({
                    "level": "INFO",
                    "check": "claim_id_gaps",
                    "detail": f"Gaps in claim numbering: {sorted(gaps)[:5]}",
                })

    # Check SPINE.md exists if PROGRESS.md has entries
    spine_path = project_path / "SPINE.md"
    progress_path = project_path / "PROGRESS.md"
    if progress_path.exists() and not spine_path.exists():
        progress_content = progress_path.read_text(encoding="utf-8", errors="replace")
        if len(progress_content.strip().split("\n")) > 5:
            alerts.append({
                "level": "WARN",
                "check": "missing_spine",
                "detail": "PROGRESS.md has entries but SPINE.md does not exist (v5.5 requirement)",
            })

    return alerts


def main():
    parser = argparse.ArgumentParser(description="Silent Observer")
    parser.add_argument("--project", required=True, help="Path to .vibe-science/ directory")
    parser.add_argument("--config", default=None, help="Path to domain-config.yaml")
    args = parser.parse_args()

    project = Path(args.project)
    if not project.exists():
        result = {
            "status": "HALT",
            "alerts": [{"level": "HALT", "check": "project_missing", "detail": f"{args.project} does not exist"}],
        }
        print(json.dumps(result, indent=2))
        sys.exit(1)

    # Run all checks
    alerts = []
    alerts.extend(check_orphaned_files(project))
    alerts.extend(check_document_desync(project))
    alerts.extend(check_design_drift(project))
    alerts.extend(check_naming_consistency(project))

    # Determine overall status
    has_halt = any(a["level"] == "HALT" for a in alerts)
    has_warn = any(a["level"] == "WARN" for a in alerts)

    result = {
        "status": "HALT" if has_halt else ("WARN" if has_warn else "OK"),
        "total_alerts": len(alerts),
        "halt_count": sum(1 for a in alerts if a["level"] == "HALT"),
        "warn_count": sum(1 for a in alerts if a["level"] == "WARN"),
        "info_count": sum(1 for a in alerts if a["level"] == "INFO"),
        "alerts": alerts,
    }

    print(json.dumps(result, indent=2))
    sys.exit(1 if has_halt else 0)


if __name__ == "__main__":
    main()
