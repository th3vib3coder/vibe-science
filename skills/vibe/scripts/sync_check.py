#!/usr/bin/env python3
"""SSOT Sync Check: Verify numbers in markdown match JSON source.

Usage:
    python sync_check.py --json results.json --md FINDINGS.md [--tolerance 0.001]

Exit codes:
    0 = all numbers match
    1 = mismatches found

Output: Mismatch report to stdout as JSON.
"""

import argparse
import json
import re
import sys
from pathlib import Path

# Pattern matches: integers, decimals, percentages, scientific notation
NUMBER_PATTERN = re.compile(
    r'(?<![a-zA-Z_\-])(-?\d+\.?\d*(?:[eE][+-]?\d+)?%?)(?![a-zA-Z_\-\d])'
)

# Patterns to SKIP (dates, IDs, section numbers, etc.)
SKIP_PATTERNS = [
    re.compile(r'\d{4}-\d{2}-\d{2}'),       # dates
    re.compile(r'[A-Z]+-\d{3}'),              # claim IDs like C-001
    re.compile(r'v\d+\.\d+'),                 # version numbers
    re.compile(r'#+ '),                        # heading markers
    re.compile(r'^\|'),                        # table delimiters
    re.compile(r'DQ\d|G\d|S\d|L\d|T\d|D\d'),  # gate names
]


def extract_numbers_from_text(text):
    """Extract all numeric values from markdown text."""
    numbers = []
    for line_num, line in enumerate(text.split('\n'), 1):
        # Skip lines that are likely structural (headings, code fences, etc.)
        stripped = line.strip()
        if stripped.startswith('```') or stripped.startswith('#') or stripped == '---':
            continue

        for match in NUMBER_PATTERN.finditer(line):
            num_str = match.group(0)
            # Skip if part of a date, ID, or other structural pattern
            context = line[max(0, match.start() - 10):match.end() + 10]
            skip = False
            for sp in SKIP_PATTERNS:
                if sp.search(context):
                    skip = True
                    break
            if skip:
                continue

            # Parse the number
            is_pct = num_str.endswith('%')
            clean = num_str.rstrip('%')
            try:
                value = float(clean)
                if is_pct:
                    value = value / 100.0  # Normalize percentages
                numbers.append({
                    "line": line_num,
                    "raw": num_str,
                    "value": value,
                    "is_percentage": is_pct,
                })
            except ValueError:
                continue

    return numbers


def flatten_json(obj, prefix=""):
    """Flatten nested JSON into a flat dict of paths → values."""
    items = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            new_key = f"{prefix}.{k}" if prefix else k
            if isinstance(v, (dict, list)):
                items.update(flatten_json(v, new_key))
            elif isinstance(v, (int, float)):
                items[new_key] = float(v)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            new_key = f"{prefix}[{i}]"
            if isinstance(v, (dict, list)):
                items.update(flatten_json(v, new_key))
            elif isinstance(v, (int, float)):
                items[new_key] = float(v)
    return items


def find_closest_match(value, json_values, tolerance):
    """Find the closest matching value in JSON source."""
    best_key = None
    best_diff = float("inf")
    for key, jval in json_values.items():
        diff = abs(value - jval)
        if diff < best_diff:
            best_diff = diff
            best_key = key
    if best_diff <= tolerance:
        return best_key, best_diff
    # Also check percentage form
    for key, jval in json_values.items():
        diff = abs(value - jval / 100.0)
        if diff <= tolerance:
            return key, diff
    return None, best_diff


def main():
    parser = argparse.ArgumentParser(description="SSOT Sync Checker")
    parser.add_argument("--json", required=True, help="Path to JSON source file")
    parser.add_argument("--md", required=True, help="Path to markdown document")
    parser.add_argument("--tolerance", type=float, default=0.001,
                        help="Numeric tolerance for matching (default: 0.001)")
    args = parser.parse_args()

    # Load files
    with open(args.json) as f:
        json_data = json.load(f)
    with open(args.md) as f:
        md_text = f.read()

    # Extract
    json_values = flatten_json(json_data)
    md_numbers = extract_numbers_from_text(md_text)

    # Match
    mismatches = []
    matched = []
    for num in md_numbers:
        key, diff = find_closest_match(num["value"], json_values, args.tolerance)
        if key is None:
            mismatches.append({
                "line": num["line"],
                "markdown_value": num["raw"],
                "parsed_value": num["value"],
                "closest_json_key": None,
                "closest_diff": round(diff, 6),
                "status": "NO_MATCH",
            })
        else:
            matched.append({
                "line": num["line"],
                "markdown_value": num["raw"],
                "json_key": key,
                "diff": round(diff, 6),
            })

    result = {
        "status": "PASS" if len(mismatches) == 0 else "FAIL",
        "total_numbers_in_markdown": len(md_numbers),
        "matched": len(matched),
        "mismatched": len(mismatches),
        "tolerance": args.tolerance,
        "mismatches": mismatches,
    }

    print(json.dumps(result, indent=2))
    sys.exit(0 if len(mismatches) == 0 else 1)


if __name__ == "__main__":
    main()
