#!/usr/bin/env python3
"""Research Spine Entry: Create and validate structured logbook entries.

Usage:
    python spine_entry.py --spine SPINE.md --type DATA_LOAD --action "Loaded dataset X" \
        [--input "path/to/data.csv"] [--output "23 features extracted"] \
        [--gate "DQ1:PASS"] [--error "none"] [--next "Run DQ1 gate"]

Exit codes:
    0 = entry created successfully
    1 = validation error

Output: The formatted entry to stdout, also appended to SPINE.md.
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

VALID_TYPES = [
    "INIT", "DATA_LOAD", "EXTRACT", "MODEL_TRAIN", "CALIBRATE",
    "FINDING", "REVIEW", "BUG_FIX", "DESIGN_CHANGE", "GATE_CHECK",
    "LITERATURE_SEARCH", "DATASET_DOWNLOAD",
]

ENTRY_TEMPLATE = """### {timestamp} | {action_type}
- **Action**: {action}
- **Input**: {input}
- **Output**: {output}
- **Gate**: {gate}
- **Errors**: {errors}
- **Next**: {next_action}
"""


def validate_entry(args):
    """Validate spine entry fields."""
    errors = []

    if args.type not in VALID_TYPES:
        errors.append(f"Invalid type '{args.type}'. Valid: {', '.join(VALID_TYPES)}")

    if not args.action or len(args.action.strip()) == 0:
        errors.append("Action description cannot be empty")

    if len(args.action) > 500:
        errors.append("Action description too long (max 500 chars)")

    return errors


def format_entry(args):
    """Format a spine entry."""
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    return ENTRY_TEMPLATE.format(
        timestamp=timestamp,
        action_type=args.type,
        action=args.action,
        input=args.input or "—",
        output=args.output or "—",
        gate=args.gate or "—",
        errors=args.error or "none",
        next_action=args.next or "—",
    )


def main():
    parser = argparse.ArgumentParser(description="Research Spine Entry Creator")
    parser.add_argument("--spine", required=True, help="Path to SPINE.md")
    parser.add_argument("--type", required=True, choices=VALID_TYPES,
                        help="Action type")
    parser.add_argument("--action", required=True, help="Action description")
    parser.add_argument("--input", default=None, help="Input description")
    parser.add_argument("--output", default=None, help="Output description")
    parser.add_argument("--gate", default=None, help="Gate status (e.g., 'DQ1:PASS')")
    parser.add_argument("--error", default=None, help="Error description")
    parser.add_argument("--next", default=None, help="Next planned action")
    parser.add_argument("--validate-only", action="store_true",
                        help="Only validate, don't write")
    args = parser.parse_args()

    # Validate
    errors = validate_entry(args)
    if errors:
        result = {"status": "FAIL", "errors": errors}
        print(json.dumps(result, indent=2))
        sys.exit(1)

    # Format entry
    entry = format_entry(args)

    if not args.validate_only:
        # Ensure spine file exists
        spine_path = Path(args.spine)
        if not spine_path.exists():
            spine_path.write_text(
                "# Research Spine\n\n"
                "> Structured logbook. Each entry records one action in the research process.\n"
                "> Auto-appended during CRYSTALLIZE. Not optional, not retroactive.\n\n"
                "---\n\n"
            )

        # Append entry
        with open(spine_path, "a", encoding="utf-8") as f:
            f.write(entry)
            f.write("\n")

    result = {
        "status": "PASS",
        "type": args.type,
        "action": args.action,
        "entry": entry.strip(),
    }
    print(json.dumps(result, indent=2))
    sys.exit(0)


if __name__ == "__main__":
    main()
