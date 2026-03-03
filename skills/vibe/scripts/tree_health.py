#!/usr/bin/env python3
"""Tree Health Check (Gate T3).

Usage:
    python tree_health.py --tree TREE-STATE.json

Exit codes:
    0 = healthy (T3 PASS)
    1 = unhealthy (T3 FAIL)

Output: JSON result to stdout with health metrics.
"""

import argparse
import json
import sys


def check_tree_health(tree_data):
    """Run T3 gate checks on tree state."""
    checks = []
    nodes = tree_data.get("nodes", [])
    total = len(nodes)

    if total == 0:
        return [{
            "check": "tree_exists",
            "passed": False,
            "detail": "No nodes in tree",
        }]

    # Count node statuses
    good_nodes = sum(1 for n in nodes if n.get("status") == "good")
    pruned = sum(1 for n in nodes if n.get("status") == "pruned")
    active = total - pruned

    # Check 1: good/total ratio >= 0.2
    ratio = good_nodes / total if total > 0 else 0
    checks.append({
        "check": "good_ratio",
        "passed": ratio >= 0.2,
        "detail": f"{good_nodes}/{total} = {ratio:.2f} (threshold: 0.20)",
    })

    # Check 2: exploration ratio >= 0.20
    exploration_types = {"draft", "serendipity"}
    exploration_nodes = sum(
        1 for n in nodes
        if n.get("type") in exploration_types and n.get("status") != "pruned"
    )
    exploration_ratio = exploration_nodes / active if active > 0 else 0
    checks.append({
        "check": "exploration_ratio",
        "passed": exploration_ratio >= 0.20,
        "detail": f"{exploration_nodes}/{active} = {exploration_ratio:.2f} (threshold: 0.20)",
        "warning": exploration_ratio < 0.20 and exploration_ratio >= 0.10,
    })

    # Check 3: no branch with 5+ consecutive non-improving nodes
    branches = {}
    for n in nodes:
        branch = n.get("branch", n.get("parent", "root"))
        if branch not in branches:
            branches[branch] = []
        branches[branch].append(n)

    stale_branches = []
    for branch_id, branch_nodes in branches.items():
        consecutive_non_improving = 0
        max_consecutive = 0
        for n in sorted(branch_nodes, key=lambda x: x.get("cycle", 0)):
            if n.get("status") not in ("good", "improving"):
                consecutive_non_improving += 1
            else:
                consecutive_non_improving = 0
            max_consecutive = max(max_consecutive, consecutive_non_improving)
        if max_consecutive >= 5:
            stale_branches.append(branch_id)

    checks.append({
        "check": "no_stale_branches",
        "passed": len(stale_branches) == 0,
        "detail": f"{len(stale_branches)} stale branches (5+ non-improving)" if stale_branches else "OK",
        "flagged": stale_branches[:3],
    })

    # Check 4: at least 2 branches explored (unless LINEAR mode)
    tree_mode = tree_data.get("mode", "HYBRID")
    unique_branches = len(set(
        n.get("branch", n.get("parent", "root"))
        for n in nodes if n.get("status") != "pruned"
    ))
    if tree_mode != "LINEAR":
        checks.append({
            "check": "branch_diversity",
            "passed": unique_branches >= 2,
            "detail": f"{unique_branches} branches (mode: {tree_mode})",
        })

    return checks


def main():
    parser = argparse.ArgumentParser(description="Tree Health Checker (T3)")
    parser.add_argument("--tree", required=True, help="Path to TREE-STATE.json")
    args = parser.parse_args()

    with open(args.tree) as f:
        tree_data = json.load(f)

    checks = check_tree_health(tree_data)
    all_passed = all(c["passed"] for c in checks)

    result = {
        "gate": "T3",
        "status": "PASS" if all_passed else "FAIL",
        "checks": checks,
    }

    print(json.dumps(result, indent=2))
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
