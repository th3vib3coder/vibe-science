#!/usr/bin/env python3
"""Generic Gate Validation: Validate artifact against JSON Schema.

Usage:
    python gate_check.py --gate G0|B0|... --artifact path/to/artifact.json --schema path/to/schema.json

Exit codes:
    0 = valid (gate PASS)
    1 = invalid (gate FAIL)

Output: JSON validation result to stdout.
"""

import argparse
import json
import sys
from pathlib import Path


def validate_schema(artifact, schema):
    """Validate artifact against JSON Schema (draft 2020-12 compatible subset).

    This is a lightweight validator that handles the most common JSON Schema
    constructs without requiring external dependencies.
    """
    errors = []

    def _validate(instance, schema_part, path="$"):
        if not isinstance(schema_part, dict):
            return

        # Type check
        if "type" in schema_part:
            expected = schema_part["type"]
            type_map = {
                "object": dict, "array": list, "string": str,
                "number": (int, float), "integer": int, "boolean": bool,
                "null": type(None),
            }
            if expected in type_map:
                if not isinstance(instance, type_map[expected]):
                    errors.append({
                        "path": path,
                        "error": f"Expected type '{expected}', got '{type(instance).__name__}'",
                    })
                    return

        # Required properties
        if "required" in schema_part and isinstance(instance, dict):
            for req in schema_part["required"]:
                if req not in instance:
                    errors.append({
                        "path": path,
                        "error": f"Missing required property: '{req}'",
                    })

        # Properties
        if "properties" in schema_part and isinstance(instance, dict):
            for prop, prop_schema in schema_part["properties"].items():
                if prop in instance:
                    _validate(instance[prop], prop_schema, f"{path}.{prop}")

        # Items (array)
        if "items" in schema_part and isinstance(instance, list):
            for i, item in enumerate(instance):
                _validate(item, schema_part["items"], f"{path}[{i}]")

        # Minimum/Maximum
        if isinstance(instance, (int, float)):
            if "minimum" in schema_part and instance < schema_part["minimum"]:
                errors.append({
                    "path": path,
                    "error": f"Value {instance} < minimum {schema_part['minimum']}",
                })
            if "maximum" in schema_part and instance > schema_part["maximum"]:
                errors.append({
                    "path": path,
                    "error": f"Value {instance} > maximum {schema_part['maximum']}",
                })

        # MinLength/MaxLength
        if isinstance(instance, str):
            if "minLength" in schema_part and len(instance) < schema_part["minLength"]:
                errors.append({
                    "path": path,
                    "error": f"String length {len(instance)} < minLength {schema_part['minLength']}",
                })

        # MinItems
        if isinstance(instance, list):
            if "minItems" in schema_part and len(instance) < schema_part["minItems"]:
                errors.append({
                    "path": path,
                    "error": f"Array length {len(instance)} < minItems {schema_part['minItems']}",
                })

        # Enum
        if "enum" in schema_part:
            if instance not in schema_part["enum"]:
                errors.append({
                    "path": path,
                    "error": f"Value '{instance}' not in enum {schema_part['enum']}",
                })

    _validate(artifact, schema)
    return errors


def main():
    parser = argparse.ArgumentParser(description="Generic Gate Validator")
    parser.add_argument("--gate", required=True, help="Gate name (for reporting)")
    parser.add_argument("--artifact", required=True, help="Path to artifact JSON")
    parser.add_argument("--schema", required=True, help="Path to JSON Schema file")
    args = parser.parse_args()

    # Load files
    with open(args.artifact) as f:
        artifact = json.load(f)
    with open(args.schema) as f:
        schema = json.load(f)

    # Validate
    errors = validate_schema(artifact, schema)
    is_valid = len(errors) == 0

    result = {
        "gate": args.gate,
        "status": "PASS" if is_valid else "FAIL",
        "schema_file": args.schema,
        "artifact_file": args.artifact,
        "errors": errors,
        "error_count": len(errors),
    }

    print(json.dumps(result, indent=2))
    sys.exit(0 if is_valid else 1)


if __name__ == "__main__":
    main()
