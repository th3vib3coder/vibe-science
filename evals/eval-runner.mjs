/**
 * Vibe Science v6.0 NEXUS — Eval Case Runner
 *
 * Scans evals/cases/ subdirectories for .yaml eval case files,
 * validates their structure, and reports pass/fail.
 *
 * Usage:  node evals/eval-runner.mjs
 *
 * YAML eval case format:
 *   id: T01
 *   name: hypothesis-testing
 *   category: trigger
 *   prompt: "Analyze this RNA-seq dataset for differential expression"
 *   expected_markers:
 *     - "OTAE"
 *     - "claim"
 *   expected_absent_markers:
 *     - "skip"
 *   description: "Skill should activate OTAE loop"
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// =====================================================
// Path resolution
// =====================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CASES_DIR = path.join(__dirname, 'cases');

// =====================================================
// Simple YAML parser (zero dependencies)
// =====================================================

/**
 * Parse a simple YAML string into a plain object.
 *
 * Supports:
 *   - Key-value pairs  (key: value)
 *   - Quoted values     (key: "value with : colons")
 *   - List items under a key (indented lines starting with "- ")
 *   - Comments          (# ...)
 *   - Blank lines
 *
 * Does NOT support:
 *   - Nested objects, multi-document, anchors/aliases, flow syntax
 */
function parseSimpleYaml(text) {
    const result = {};
    const lines = text.split(/\r?\n/);
    let currentListKey = null;

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];

        // Strip inline comments (but not inside quotes)
        const line = raw.replace(/\s+#.*$/, '');

        // Skip blank lines and full-line comments
        if (line.trim() === '' || line.trim().startsWith('#')) {
            // A blank line or comment resets list context only if
            // the next non-blank line is NOT a continuation "- " item.
            continue;
        }

        // Detect list item: starts with whitespace then "- "
        const listMatch = line.match(/^\s+-\s+(.*)/);
        if (listMatch && currentListKey) {
            let val = listMatch[1].trim();
            // Strip surrounding quotes
            val = stripQuotes(val);
            result[currentListKey].push(val);
            continue;
        }

        // Detect key: value
        const kvMatch = line.match(/^(\w[\w_-]*)\s*:\s*(.*)/);
        if (kvMatch) {
            const key = kvMatch[1].trim();
            let val = kvMatch[2].trim();

            if (val === '' || val === '|' || val === '>') {
                // Next lines may be list items belonging to this key
                // or a multi-line scalar (we only handle lists here)
                currentListKey = key;
                result[key] = [];
                continue;
            }

            // Strip surrounding quotes
            val = stripQuotes(val);
            currentListKey = null;
            result[key] = val;
            continue;
        }

        // If we reach here, line is unrecognized — skip silently
        currentListKey = null;
    }

    // Post-process: convert single-element arrays that should be scalars
    // and empty arrays that were never populated back to empty string
    for (const [key, val] of Object.entries(result)) {
        if (Array.isArray(val) && val.length === 0) {
            // Keep as empty array — the schema check will decide
        }
    }

    return result;
}

/**
 * Remove surrounding single or double quotes from a string.
 */
function stripQuotes(s) {
    if (
        (s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'"))
    ) {
        return s.slice(1, -1);
    }
    return s;
}

// =====================================================
// Case discovery
// =====================================================

/**
 * Recursively find all .yaml files under a directory.
 */
function findYamlFiles(dir) {
    const results = [];
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return results;
    }
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findYamlFiles(full));
        } else if (entry.isFile() && /\.ya?ml$/i.test(entry.name)) {
            results.push(full);
        }
    }
    return results;
}

// =====================================================
// Validation
// =====================================================

const REQUIRED_FIELDS = ['id', 'name', 'category', 'prompt'];

/**
 * Validate a parsed eval case object.
 * Returns an array of error strings (empty = valid).
 */
function validateCase(parsed, filePath) {
    const errors = [];

    for (const field of REQUIRED_FIELDS) {
        if (!(field in parsed) || parsed[field] === '' || parsed[field] === undefined) {
            errors.push(`missing required field: "${field}"`);
        }
    }

    const hasMarkers = (
        ('expected_markers' in parsed && Array.isArray(parsed.expected_markers) && parsed.expected_markers.length > 0)
    );
    const hasAbsentMarkers = (
        ('expected_absent_markers' in parsed && Array.isArray(parsed.expected_absent_markers) && parsed.expected_absent_markers.length > 0)
    );

    if (!hasMarkers && !hasAbsentMarkers) {
        errors.push('must have at least one of "expected_markers" or "expected_absent_markers" (non-empty list)');
    }

    return errors;
}

// =====================================================
// Main runner
// =====================================================

const yamlFiles = findYamlFiles(CASES_DIR);

let passCount = 0;
let failCount = 0;

if (yamlFiles.length === 0) {
    // No cases found — report and exit cleanly
    describe('Eval Runner', () => {
        it('initialization check', () => {
            console.log(`\nEval runner ready. 0 eval cases found.`);
            console.log(`Add .yaml files to evals/cases/ subdirectories to define eval cases.\n`);
            assert.ok(true);
        });
    });
} else {
    describe('Eval Cases', () => {
        for (const filePath of yamlFiles) {
            const relPath = path.relative(CASES_DIR, filePath);

            it(`validate: ${relPath}`, () => {
                const raw = fs.readFileSync(filePath, 'utf-8');
                const parsed = parseSimpleYaml(raw);
                const errors = validateCase(parsed, filePath);

                if (errors.length > 0) {
                    failCount++;
                    assert.fail(
                        `Eval case ${relPath} has ${errors.length} validation error(s):\n` +
                        errors.map(e => `  - ${e}`).join('\n')
                    );
                } else {
                    passCount++;
                }
            });
        }
    });

    describe('Eval Summary', () => {
        it('print results', () => {
            console.log('\n========================================');
            console.log(`  Eval Runner Summary`);
            console.log(`  Cases found : ${yamlFiles.length}`);
            console.log(`  Passed      : ${passCount}`);
            console.log(`  Failed      : ${failCount}`);
            console.log('========================================\n');
            assert.ok(true);
        });
    });
}
