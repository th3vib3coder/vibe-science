// Phase 8 Wave 2 — tests for the pre-delivery-discipline hook.
//
// Two layers of coverage:
//   A. Pure-function tests against exported helpers in the hook module
//      (matchesDeliverablePath, hasDeclaredClosureClaim, hasValidAttestation,
//      hasExemptionComment, getPostEditContent, evaluateDeliveryDiscipline).
//   B. Process-boundary test: spawn the hook script with a fake stdin JSON
//      event and assert exit code + stdout permissionDecision.
//
// Schema-shape validation is partially inlined in the hook (not full Ajv);
// full JSON Schema enforcement lives in Wave 3 validator + schema file.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const HOOK_PATH = path.join(ROOT, 'plugin', 'scripts', 'pre-delivery-discipline.js');

// Windows needs file:// URLs for import(); bash paths fail with ERR_UNSUPPORTED_ESM_URL_SCHEME.
const hookModule = await import(pathToFileURL(HOOK_PATH).href);
const {
    matchesDeliverablePath,
    hasDeclaredClosureClaim,
    hasValidAttestation,
    hasExemptionComment,
    getPostEditContent,
    evaluateDeliveryDiscipline,
    probeDbAvailability,
    findAllClosureClaimPositions,
    everyClosureHasBoundAttestation,
    // Shared with validateDeliveryHonesty via import — any drift here
    // would flow into both hook and validator simultaneously, by design.
    extractEnforceableContent,
} = hookModule;

// Valid attestation fixture reused across tests.
const VALID_ATTESTATION = `## Delivery Attestation

\`\`\`json
{
  "covered": [
    "Implementation verified directly by reading source files",
    "All 3 fixture cases exercised in test suite"
  ],
  "scope_cuts": [
    {
      "item": "Governance event logging",
      "reason": "Deferred to Wave 4 per Phase 8 plan"
    }
  ],
  "self_review_findings": [
    "A skeptical reviewer would challenge the regex for edge-case prose like quoted 'CLOSED' inside code blocks",
    "The hook reads file from disk for Edit tools; on Windows with read permission issues it might degrade silently",
    "The minLength of 20 chars for self_review_findings could be gamed with padded generic strings"
  ],
  "external_review_status": "pending"
}
\`\`\``;

function closeoutContent(body) {
    return `# Test Phase Closeout\n\n${body}\n\n${VALID_ATTESTATION}\n`;
}

function closeoutWithoutAttestation(body) {
    return `# Test Phase Closeout\n\n${body}\n`;
}

// ---------------------------------------------------------------------------
// A. Pure-function tests
// ---------------------------------------------------------------------------

describe('matchesDeliverablePath', () => {
    it('matches closeout / phase / wave / sprint / skill / readme / changelog basenames', () => {
        assert.equal(matchesDeliverablePath('phase8-closeout.md'), true);
        assert.equal(matchesDeliverablePath('wave-3-summary.md'), true);
        assert.equal(matchesDeliverablePath('some/path/SKILL.md'), true);
        assert.equal(matchesDeliverablePath('README.md'), true);
        assert.equal(matchesDeliverablePath('CHANGELOG.md'), true);
        assert.equal(matchesDeliverablePath('phase8-01-wave-0-contracts.md'), true);
        assert.equal(matchesDeliverablePath('docs/project-status.md'), true);
        assert.equal(matchesDeliverablePath('verdict.md'), true);
        // P2-A (review): skill promised sprint*-*.md; path matcher must honor it
        assert.equal(matchesDeliverablePath('sprint0-plan.md'), true);
        assert.equal(matchesDeliverablePath('sprint-3-retro.md'), true);
    });

    it('rejects plain notes + source code + non-markdown', () => {
        assert.equal(matchesDeliverablePath('notes.md'), false);
        assert.equal(matchesDeliverablePath('src/api-reference.md'), false);
        assert.equal(matchesDeliverablePath('index.js'), false);
        assert.equal(matchesDeliverablePath('settings.json'), false);
        assert.equal(matchesDeliverablePath(''), false);
        assert.equal(matchesDeliverablePath(null), false);
    });
});

describe('hasDeclaredClosureClaim', () => {
    it('matches declarative patterns (Status:, **Result:, table, Phase N is)', () => {
        assert.equal(hasDeclaredClosureClaim('Status: CLOSED'), true);
        assert.equal(hasDeclaredClosureClaim('Verdict: PASS'), true);
        assert.equal(hasDeclaredClosureClaim('**Result: PASSED**'), true);
        assert.equal(hasDeclaredClosureClaim('| gate | PASS |'), true);
        assert.equal(hasDeclaredClosureClaim('Phase 8 is CLOSED.'), true);
        assert.equal(hasDeclaredClosureClaim('Wave 2 is DONE'), true);
        assert.equal(hasDeclaredClosureClaim('Phase 6.2 is COMPLETE'), true);
        assert.equal(hasDeclaredClosureClaim('CLOSED.'), true);
        assert.equal(hasDeclaredClosureClaim('**SHIPPED**'), true);
    });

    it('rejects casual prose that mentions closure words', () => {
        assert.equal(hasDeclaredClosureClaim('I closed the file earlier.'), false);
        assert.equal(hasDeclaredClosureClaim('When the user is done, they commit.'), false);
        assert.equal(hasDeclaredClosureClaim('The build passed unit tests.'), false);
        assert.equal(hasDeclaredClosureClaim('nothing here'), false);
        assert.equal(hasDeclaredClosureClaim(''), false);
    });

    // P2-B (review): failure/partial statuses are also closure declarations
    it('matches negative closure declarations (FAILED / BLOCKED / PARTIAL / FALSE-POSITIVE)', () => {
        assert.equal(hasDeclaredClosureClaim('Verdict: FAILED'), true);
        assert.equal(hasDeclaredClosureClaim('Result: BLOCKED'), true);
        assert.equal(hasDeclaredClosureClaim('Gate: PARTIAL'), true);
        assert.equal(hasDeclaredClosureClaim('Phase 7 is FAILED.'), true);
        assert.equal(hasDeclaredClosureClaim('**Sprint 0 is BLOCKED**'), true);
        assert.equal(hasDeclaredClosureClaim('| gate | FALSE-POSITIVE |'), true);
    });

    // fixup-4 P2-B: former pattern 3 (generic bold-wrapped closure word)
    // was over-matching — it fired on bold filenames and any prose bolding
    // that happened to contain a closure word. Pattern 1 covers the real
    // declarative form `**Result: PASS**` via `\*{0,2}` substitutions and
    // `\b` boundaries. Removing pattern 3 must not reintroduce the bypass.
    it('does NOT match bold filenames or prose bolding that happens to contain a closure word', () => {
        // Bold filename reference — the reviewer's exact example.
        assert.equal(hasDeclaredClosureClaim('See **blind-first-pass.md** for details.'), false);
        // Bold proper noun that contains SHIPPED as part of a name.
        assert.equal(hasDeclaredClosureClaim('Project **UnSHIPPEDWare** is still in beta.'), false);
        // Prose bolding of a closure word inside a sentence (not a declaration).
        assert.equal(hasDeclaredClosureClaim('The builder **shipped** all containers yesterday.'), false);
    });

    it('still matches the declarative forms that pattern 3 used to handle (via pattern 1/2/5)', () => {
        // These MUST still match after pattern-3 removal or we regressed coverage.
        assert.equal(hasDeclaredClosureClaim('**Result: PASSED**'), true, 'pattern 1 handles bold-wrapped declarative');
        assert.equal(hasDeclaredClosureClaim('**SHIPPED**'), true, 'pattern 2 handles line-start bold closure');
        assert.equal(hasDeclaredClosureClaim('**Phase 7 is CLOSED**'), true, 'pattern 5 handles bold Phase-is sentence');
        assert.equal(hasDeclaredClosureClaim('**Wave 2 is PARTIAL**'), true, 'pattern 5 handles negative closures too');
    });
});

// ---------------------------------------------------------------------------
// Positional attestation binding (P1-B fix from fresh-eyes review)
// ---------------------------------------------------------------------------

describe('findAllClosureClaimPositions', () => {
    it('returns empty array for text without closure claims', () => {
        const positions = findAllClosureClaimPositions('Just casual prose.');
        assert.equal(positions.length, 0);
    });

    it('returns one position for a single closure claim', () => {
        const positions = findAllClosureClaimPositions('Preamble. **Phase 7 is CLOSED.** Trailing.');
        assert.equal(positions.length, 1);
        assert.ok(positions[0].match.includes('CLOSED'));
    });

    it('returns multiple positions sorted by index for multiple claims', () => {
        const positions = findAllClosureClaimPositions(
            '## v7.1\n**Phase 8 is SHIPPED.**\n\n## v7.0\n**Phase 7 is CLOSED.**\n',
        );
        assert.equal(positions.length, 2);
        assert.ok(positions[0].index < positions[1].index);
    });

    it('deduplicates overlapping matches from different patterns', () => {
        // "Phase 8 is CLOSED" matches both pattern 1 (Phase N : ...)
        // and pattern 5 ("Phase X is CLOSURE"). Should appear once.
        const positions = findAllClosureClaimPositions('Phase 8 is CLOSED');
        assert.equal(positions.length, 1);
    });
});

describe('everyClosureHasBoundAttestation', () => {
    const VALID_ATTESTATION_INLINE = `\n## Delivery Attestation\n\n\`\`\`json\n${
        JSON.stringify({
            covered: ['Item A verified'],
            scope_cuts: [{ item: 'Thing left out', reason: 'Deferred because it is complex' }],
            self_review_findings: [
                'A reviewer would push back on the regex edge cases in quoted code',
                'The hash allowlist relies on exact-match; whitespace flips it',
                'The closure vocabulary may need another synonym later',
            ],
            external_review_status: 'pending',
        }, null, 2)
    }\n\`\`\`\n`;

    it('returns true for text with no closure claims', () => {
        assert.equal(everyClosureHasBoundAttestation('Plain prose.'), true);
    });

    it('returns true when the single closure claim is followed by a valid attestation', () => {
        const text = `# Phase\n\n**Phase 7 is CLOSED.**\n${VALID_ATTESTATION_INLINE}`;
        assert.equal(everyClosureHasBoundAttestation(text), true);
    });

    it('returns false when attestation is ORPHANED (positioned BEFORE the claim)', () => {
        const text = `${VALID_ATTESTATION_INLINE}\n\n# Phase\n\n**Phase 7 is CLOSED.**`;
        assert.equal(everyClosureHasBoundAttestation(text), false,
            'attestation must come after the closure claim it attests');
    });

    it('returns true when every claim has its OWN attestation in between', () => {
        const text =
            `# v7.1\n\n**Phase 8 is SHIPPED.**\n${VALID_ATTESTATION_INLINE}` +
            `\n\n# v7.0\n\n**Phase 7 is CLOSED.**\n${VALID_ATTESTATION_INLINE}`;
        assert.equal(everyClosureHasBoundAttestation(text), true);
    });

    it('returns false when two claims share one trailing attestation (the P1-B bypass)', () => {
        const text =
            '# v7.1\n\n**Phase 8 is SHIPPED.**\n\n' +
            '# v7.0\n\n**Phase 7 is CLOSED.**\n' +
            VALID_ATTESTATION_INLINE;
        assert.equal(everyClosureHasBoundAttestation(text), false,
            'the v7.1 claim has no attestation in its scope (before v7.0)');
    });

    it('returns false when an intermediate claim is missing attestation', () => {
        const text =
            `# v7.2\n\n**Phase 9 is SHIPPED.**\n${VALID_ATTESTATION_INLINE}` +
            '\n# v7.1\n\n**Phase 8 is SHIPPED.**\n\n' + // no attestation here
            `# v7.0\n\n**Phase 7 is CLOSED.**\n${VALID_ATTESTATION_INLINE}`;
        assert.equal(everyClosureHasBoundAttestation(text), false);
    });

    // fixup-4 P2-A: contiguous table-row claims (gate-summary tables)
    // must be merged into a single claim block so one trailing attestation
    // suffices. Without merging, the positional binding over-corrected and
    // required an attestation between every row — user-hostile for normal
    // closeout tables. The merge rule: consecutive hits in `|...|` lines
    // with only table lines between them collapse into one block.

    it('accepts a multi-row gate-summary table with ONE trailing attestation (table-merge)', () => {
        const text =
            `# Phase 99\n\n| Gate | Status |\n|------|--------|\n` +
            `| G1   | PASS   |\n` +
            `| G2   | PASS   |\n` +
            `| G3   | FAILED |\n` +
            `\n${VALID_ATTESTATION_INLINE}`;
        assert.equal(everyClosureHasBoundAttestation(text), true,
            'one attestation after the full gate table must satisfy all table rows');
    });

    it('still DENIES a table followed by a non-table closure claim without its own attestation', () => {
        // Table rows merge, but the later "Phase X is CLOSED" claim is NOT
        // in a table line, so it becomes a separate claim needing its own
        // attestation.
        const text =
            `# Phase 99\n\n| Gate | Status |\n|------|--------|\n` +
            `| G1   | PASS   |\n` +
            `| G2   | PASS   |\n` +
            `\n${VALID_ATTESTATION_INLINE}` +
            `\n# Later\n\n**Phase 100 is CLOSED.**\n` +
            `\nNo attestation for this second claim.\n`;
        assert.equal(everyClosureHasBoundAttestation(text), false,
            'the non-table claim after the attestation still needs its own attestation');
    });

    it('does NOT merge non-contiguous table rows separated by prose', () => {
        // Prose between two table groups = claims do NOT merge.
        // Each table needs its own attestation.
        const text =
            `# Phase 99\n\n| G1 | PASS |\n\n` +
            `Some prose paragraph breaking the table.\n\n` +
            `| G2 | PASS |\n\n${VALID_ATTESTATION_INLINE}`;
        assert.equal(everyClosureHasBoundAttestation(text), false,
            'two separate tables need two separate attestations');
    });

    it('does NOT merge a table-row claim with a subsequent bold-heading claim', () => {
        // A claim inside a `|...|` line followed by a claim inside a
        // `**...**` heading line — the heading line is NOT a table line,
        // so they must NOT merge.
        const text =
            `| G1 | PASS |\n\n` +
            `**Phase 8 is CLOSED.**\n\n${VALID_ATTESTATION_INLINE}`;
        assert.equal(everyClosureHasBoundAttestation(text), false,
            'table-row and heading claims are distinct groups; each needs its own attestation');
    });
});

describe('hasValidAttestation', () => {
    it('accepts a well-formed attestation with 4 required fields', () => {
        assert.equal(hasValidAttestation(VALID_ATTESTATION), true);
    });

    it('rejects attestation missing a required field', () => {
        const bad = VALID_ATTESTATION.replace(/"external_review_status":\s*"pending"/u, '"foo": "bar"');
        assert.equal(hasValidAttestation(bad), false);
    });

    it('rejects attestation with fewer than 3 self_review_findings', () => {
        const bad = VALID_ATTESTATION.replace(
            /"self_review_findings":\s*\[[\s\S]*?\],/u,
            '"self_review_findings": ["only one finding with enough length to pass minLength"],',
        );
        assert.equal(hasValidAttestation(bad), false);
    });

    it('rejects attestation with self_review_findings entries shorter than 20 chars', () => {
        const bad = VALID_ATTESTATION.replace(
            /"self_review_findings":\s*\[[\s\S]*?\],/u,
            '"self_review_findings": ["short 1", "short 2", "short 3"],',
        );
        assert.equal(hasValidAttestation(bad), false);
    });

    it('rejects attestation with invalid external_review_status enum', () => {
        const bad = VALID_ATTESTATION.replace('"pending"', '"not-a-valid-value"');
        assert.equal(hasValidAttestation(bad), false);
    });

    it('rejects attestation with empty covered array', () => {
        const bad = VALID_ATTESTATION.replace(/"covered":\s*\[[\s\S]*?\],/u, '"covered": [],');
        assert.equal(hasValidAttestation(bad), false);
    });

    it('rejects when the Delivery Attestation heading is present but no fenced json follows', () => {
        const bad = '## Delivery Attestation\n\nNo fenced block here.';
        assert.equal(hasValidAttestation(bad), false);
    });

    it('rejects when the Delivery Attestation heading is missing', () => {
        assert.equal(hasValidAttestation('Status: CLOSED\n\nSome prose.'), false);
    });

    // Schema-conformance tightening (Wave 3 fixup P1-A):
    // Helper must enforce additionalProperties:false AND the scope_cuts
    // item shape {item, reason}, not just "is an array". Otherwise the
    // schema becomes aspirational documentation only.

    it('rejects attestation with EXTRA top-level fields (additionalProperties:false)', () => {
        const badExtra = VALID_ATTESTATION.replace(
            '"external_review_status": "pending"',
            '"external_review_status": "pending",\n  "extra_bogus_field": "should not pass"',
        );
        assert.equal(hasValidAttestation(badExtra), false,
            'attestation with unknown top-level field must be rejected');
    });

    it('rejects scope_cuts containing a bare string instead of {item, reason}', () => {
        const badCut = VALID_ATTESTATION.replace(
            /"scope_cuts":\s*\[[\s\S]*?\],/u,
            '"scope_cuts": ["not an object, just a string"],',
        );
        assert.equal(hasValidAttestation(badCut), false,
            'attestation with non-object scope_cuts entry must be rejected');
    });

    it('rejects scope_cuts entry missing the `reason` key', () => {
        const badCut = VALID_ATTESTATION.replace(
            /"scope_cuts":\s*\[[\s\S]*?\],/u,
            '"scope_cuts": [{"item": "Something"}],',
        );
        assert.equal(hasValidAttestation(badCut), false);
    });

    it('rejects scope_cuts entry missing the `item` key', () => {
        const badCut = VALID_ATTESTATION.replace(
            /"scope_cuts":\s*\[[\s\S]*?\],/u,
            '"scope_cuts": [{"reason": "Deferred because it is complex"}],',
        );
        assert.equal(hasValidAttestation(badCut), false);
    });

    it('rejects scope_cuts entry with `reason` shorter than 10 chars', () => {
        const badCut = VALID_ATTESTATION.replace(
            /"scope_cuts":\s*\[[\s\S]*?\],/u,
            '"scope_cuts": [{"item": "Something", "reason": "short"}],',
        );
        assert.equal(hasValidAttestation(badCut), false);
    });

    it('rejects scope_cuts entry with extra properties beyond {item, reason}', () => {
        const badCut = VALID_ATTESTATION.replace(
            /"scope_cuts":\s*\[[\s\S]*?\],/u,
            '"scope_cuts": [{"item": "Something", "reason": "Deferred because complex", "priority": "low"}],',
        );
        assert.equal(hasValidAttestation(badCut), false,
            'additionalProperties:false must apply to scope_cuts entries too');
    });

    it('accepts an empty scope_cuts array (minItems: 0 allowed)', () => {
        const empty = VALID_ATTESTATION.replace(
            /"scope_cuts":\s*\[[\s\S]*?\],/u,
            '"scope_cuts": [],',
        );
        assert.equal(hasValidAttestation(empty), true,
            'empty scope_cuts is schema-legal (minItems: 0)');
    });
});

describe('hasExemptionComment', () => {
    it('detects exemption comment at the top of the file', () => {
        const text = `<!-- delivery-discipline: exempt -->\n\n# Doc\n\nStatus: CLOSED`;
        assert.equal(hasExemptionComment(text), true);
    });

    it('does not detect exemption when buried deep in the file', () => {
        const filler = 'x'.repeat(5100);
        const text = `# Doc\n${filler}\n<!-- delivery-discipline: exempt -->\n`;
        assert.equal(hasExemptionComment(text), false);
    });

    it('detects exemption after a long YAML frontmatter (up to ~5000 chars)', () => {
        // Oversized frontmatter: root SKILL.md's changelog field alone is ~1800 chars.
        const frontmatter = `---\nname: example\ndescription: ${'a'.repeat(2000)}\n---\n`;
        const text = `${frontmatter}\n<!-- delivery-discipline: exempt -->\n\n# Body`;
        assert.equal(hasExemptionComment(text), true);
    });
});

// ---------------------------------------------------------------------------
// fixup-4 P1-A: extractEnforceableContent (shared by hook + validator).
// Direct tests on the helper. Parity with the validator is covered in
// evaluateDeliveryDiscipline tests below and in the validator suite which
// imports this exact function.
// ---------------------------------------------------------------------------

describe('extractEnforceableContent', () => {
    it('returns full text with hasBoundary=false when no marker', () => {
        const text = '# Doc\n\nNo marker here.\n';
        const { enforceable, hasBoundary } = extractEnforceableContent(text);
        assert.equal(enforceable, text);
        assert.equal(hasBoundary, false);
    });

    it('returns only the portion BEFORE the marker when marker present', () => {
        const above = '# Changelog\n\n## [Unreleased]\nNext release prep.\n\n';
        const below = '\n## v7.0 — legacy content below\n';
        const text = `${above}<!-- delivery-discipline: legacy-boundary -->${below}`;
        const { enforceable, hasBoundary } = extractEnforceableContent(text);
        assert.equal(enforceable, above);
        assert.equal(hasBoundary, true);
    });

    it('is case-insensitive on the marker (matches IDEs that mangle case)', () => {
        const text = `Above.\n<!-- Delivery-Discipline: LEGACY-boundary -->\nBelow.`;
        const { enforceable, hasBoundary } = extractEnforceableContent(text);
        assert.equal(enforceable, 'Above.\n');
        assert.equal(hasBoundary, true);
    });

    it('gracefully handles non-string input', () => {
        assert.deepEqual(extractEnforceableContent(null), { enforceable: '', hasBoundary: false });
        assert.deepEqual(extractEnforceableContent(undefined), { enforceable: '', hasBoundary: false });
        assert.deepEqual(extractEnforceableContent(42), { enforceable: '', hasBoundary: false });
    });

    it('treats a marker at position 0 as "entire file is legacy"', () => {
        const text = '<!-- delivery-discipline: legacy-boundary -->\nall legacy below\n';
        const { enforceable, hasBoundary } = extractEnforceableContent(text);
        assert.equal(enforceable, '');
        assert.equal(hasBoundary, true);
    });
});

describe('getPostEditContent', () => {
    it('returns full content for Write', () => {
        const content = '# Hello\n\nSome body.';
        const out = getPostEditContent('Write', { content });
        assert.equal(out, content);
    });

    it('applies Edit replace on top of disk content via readFileImpl', () => {
        const fakeRead = () => 'Prefix [PLACEHOLDER] suffix';
        const out = getPostEditContent(
            'Edit',
            {
                file_path: 'fake.md',
                old_string: '[PLACEHOLDER]',
                new_string: 'Status: CLOSED',
            },
            { readFileImpl: fakeRead },
        );
        assert.equal(out, 'Prefix Status: CLOSED suffix');
    });

    it('treats missing disk file as empty for Edit', () => {
        const fakeRead = () => {
            throw new Error('ENOENT');
        };
        const out = getPostEditContent(
            'Edit',
            { file_path: 'fake.md', old_string: '', new_string: 'NEW CONTENT' },
            { readFileImpl: fakeRead },
        );
        assert.equal(out, 'NEW CONTENT');
    });

    it('applies multiple MultiEdit replaces sequentially', () => {
        const fakeRead = () => 'AAA BBB CCC';
        const out = getPostEditContent(
            'MultiEdit',
            {
                file_path: 'fake.md',
                edits: [
                    { old_string: 'AAA', new_string: 'AAA2' },
                    { old_string: 'CCC', new_string: 'CCC2' },
                ],
            },
            { readFileImpl: fakeRead },
        );
        assert.equal(out, 'AAA2 BBB CCC2');
    });
});

// ---------------------------------------------------------------------------
// B. evaluateDeliveryDiscipline — end-to-end decision logic
// ---------------------------------------------------------------------------

function buildWriteEvent(filePath, content) {
    return {
        tool_name: 'Write',
        tool_input: { file_path: filePath, content },
    };
}

describe('evaluateDeliveryDiscipline', () => {
    it('allows writing a plain notes.md with casual "done" prose', () => {
        const event = buildWriteEvent('notes.md', 'I closed the file. The work is done.');
        const result = evaluateDeliveryDiscipline(event);
        assert.equal(result.decision, 'allow');
        assert.equal(result.reason, 'path-not-deliverable');
    });

    it('allows writing a deliverable-path file with no closure claim', () => {
        const event = buildWriteEvent('README.md', '# Project\n\nSome prose without verdicts.');
        const result = evaluateDeliveryDiscipline(event);
        assert.equal(result.decision, 'allow');
        assert.equal(result.reason, 'no-closure-claim');
    });

    it('DENIES writing a closeout with closure claim and no attestation', () => {
        const content = closeoutWithoutAttestation('**Phase 99 is CLOSED.**\n\nAll tests pass.');
        const event = buildWriteEvent('phase99-closeout.md', content);
        const result = evaluateDeliveryDiscipline(event);
        assert.equal(result.decision, 'deny');
        assert.equal(result.reason, 'missing-or-invalid-attestation');
        assert.equal(result.targetPath, 'phase99-closeout.md');
        assert.ok(result.matched && result.matched.length > 0);
    });

    it('allows writing a closeout with closure claim AND valid attestation', () => {
        const content = closeoutContent('**Phase 99 is CLOSED.**');
        const event = buildWriteEvent('phase99-closeout.md', content);
        const result = evaluateDeliveryDiscipline(event);
        assert.equal(result.decision, 'allow');
        assert.equal(result.reason, 'closure-with-valid-attestation');
    });

    it('allows writing a closeout with exemption comment even if no attestation', () => {
        const content = `<!-- delivery-discipline: exempt -->\n\n# Phase\n\nStatus: CLOSED.`;
        const event = buildWriteEvent('phase99-closeout.md', content);
        const result = evaluateDeliveryDiscipline(event);
        assert.equal(result.decision, 'allow');
        assert.equal(result.reason, 'exemption-comment');
    });

    it('DENIES writing a closeout with attestation missing a required field', () => {
        const brokenAttestation = VALID_ATTESTATION.replace('"external_review_status"', '"bogus_key"');
        const content = `# Phase\n\n**Phase 99 is CLOSED.**\n\n${brokenAttestation}\n`;
        const event = buildWriteEvent('phase99-closeout.md', content);
        const result = evaluateDeliveryDiscipline(event);
        assert.equal(result.decision, 'deny');
    });

    it('DENIES writing a closeout with only 2 self_review_findings', () => {
        const weakAttestation = VALID_ATTESTATION.replace(
            /"self_review_findings":\s*\[[\s\S]*?\]/u,
            '"self_review_findings": ["finding one with twenty chars please", "finding two with enough length"]',
        );
        const content = `# Phase\n\n**Phase 99 is CLOSED.**\n\n${weakAttestation}\n`;
        const event = buildWriteEvent('phase99-closeout.md', content);
        const result = evaluateDeliveryDiscipline(event);
        assert.equal(result.decision, 'deny');
    });

    it('allows Edit to a file that already has attestation on disk', () => {
        const diskContent = closeoutContent('Previous closure.');
        const event = {
            tool_name: 'Edit',
            tool_input: {
                file_path: 'phase99-closeout.md',
                old_string: 'Previous closure.',
                new_string: '**Phase 99 is CLOSED.**',
            },
        };
        const result = evaluateDeliveryDiscipline(event, { readFileImpl: () => diskContent });
        assert.equal(result.decision, 'allow');
        assert.equal(result.reason, 'closure-with-valid-attestation');
    });

    it('DENIES Edit that introduces closure claim when disk file has no attestation', () => {
        const diskContent = '# Phase\n\nSome prose.';
        const event = {
            tool_name: 'Edit',
            tool_input: {
                file_path: 'phase99-closeout.md',
                old_string: 'Some prose.',
                new_string: '**Phase 99 is CLOSED.**',
            },
        };
        const result = evaluateDeliveryDiscipline(event, { readFileImpl: () => diskContent });
        assert.equal(result.decision, 'deny');
    });

    it('allows tool calls out of scope (e.g. Read)', () => {
        const event = { tool_name: 'Read', tool_input: { file_path: 'phase99-closeout.md' } };
        const result = evaluateDeliveryDiscipline(event);
        assert.equal(result.decision, 'allow');
        assert.equal(result.reason, 'tool-out-of-scope');
    });

    // fixup-4 P1-A: the hook MUST honor <!-- delivery-discipline:
    // legacy-boundary --> the same way the CI validator does. Before
    // fixup-4 the hook would deny a CHANGELOG.md write whose new entries
    // above the marker had no closure claim, because it was scanning the
    // legacy release notes below the marker (which DO contain closures).
    // Parity with the validator is now guaranteed by shared helper.

    it('ALLOWS a closeout-path file where the only closure claims live BELOW the legacy boundary', () => {
        // Above the marker: new content, no closure claim → nothing to enforce.
        // Below the marker: legacy release notes with CLOSED/SHIPPED/PASS
        // → MUST be ignored because they are legacy.
        const content =
            '# Changelog\n\n## [Unreleased]\n\nNext release prep, no verdicts yet.\n\n' +
            '<!-- delivery-discipline: legacy-boundary -->\n\n' +
            '## v7.0 — TRACE\n\n**Phase 7 is CLOSED.** (legacy, no attestation)\n' +
            '## v6.0\n\n**Phase 6 is SHIPPED.** (legacy, no attestation)\n';
        const event = buildWriteEvent('CHANGELOG.md', content);
        const result = evaluateDeliveryDiscipline(event);
        assert.equal(result.decision, 'allow',
            'hook must ignore closure claims below the legacy boundary, matching validator');
        assert.equal(result.reason, 'no-closure-claim');
    });

    it('DENIES a closeout-path file with a closure claim ABOVE the legacy boundary and no attestation', () => {
        const content =
            '# Changelog\n\n## v7.1 — fixup-4\n\n**Result: PASSED**\n\nNo attestation here.\n\n' +
            '<!-- delivery-discipline: legacy-boundary -->\n\n' +
            '## v7.0\n\n(legacy)\n';
        const event = buildWriteEvent('CHANGELOG.md', content);
        const result = evaluateDeliveryDiscipline(event);
        assert.equal(result.decision, 'deny',
            'closure claim above the boundary still requires attestation');
        assert.equal(result.reason, 'missing-or-invalid-attestation');
    });

    it('ALLOWS a closeout-path file with closure + attestation ABOVE boundary and legacy BELOW', () => {
        const content =
            `# Changelog\n\n## v7.1 — fixup-4\n\n**Result: PASSED**\n\n${VALID_ATTESTATION}\n\n` +
            '<!-- delivery-discipline: legacy-boundary -->\n\n' +
            '## v7.0\n\n**Phase 7 is CLOSED.** (legacy, no attestation needed)\n';
        const event = buildWriteEvent('CHANGELOG.md', content);
        const result = evaluateDeliveryDiscipline(event);
        assert.equal(result.decision, 'allow');
        assert.equal(result.reason, 'closure-with-valid-attestation');
    });

    // fixup-4 P2-A: full-path table-merge scenario through
    // evaluateDeliveryDiscipline (not just the inner helper).
    it('ALLOWS a gate-summary table closeout with ONE trailing attestation', () => {
        const content =
            `# Phase 99 Closeout\n\n## Gate Summary\n\n` +
            `| Gate | Status |\n|------|--------|\n` +
            `| G1   | PASS   |\n` +
            `| G2   | PASS   |\n` +
            `| G3   | FAILED |\n` +
            `\n${VALID_ATTESTATION}\n`;
        const event = buildWriteEvent('phase99-closeout.md', content);
        const result = evaluateDeliveryDiscipline(event);
        assert.equal(result.decision, 'allow',
            'a single attestation after the gate-summary table must satisfy every row');
        assert.equal(result.reason, 'closure-with-valid-attestation');
    });
});

// ---------------------------------------------------------------------------
// fixup-4 parity: hook and validator must give IDENTICAL verdicts on the
// same text. Since the validator imports the same helpers (and the shared
// extractEnforceableContent), this is structural — but a direct parity
// assertion catches accidental divergence if someone reintroduces a local
// helper in the validator later.
// ---------------------------------------------------------------------------

describe('hook/validator parity — identical enforcement semantics', () => {
    // Helper: both paths reach the same everyClosureHasBoundAttestation
    // decision when given the same enforceable slice.
    function hookDecision(content) {
        return evaluateDeliveryDiscipline(
            { tool_name: 'Write', tool_input: { file_path: 'phase99-closeout.md', content } },
        ).decision;
    }
    function validatorDecision(content) {
        const { enforceable } = extractEnforceableContent(content);
        if (!hasDeclaredClosureClaim(enforceable)) return 'allow';
        if (hasExemptionComment(enforceable)) return 'allow';
        if (everyClosureHasBoundAttestation(enforceable)) return 'allow';
        return 'deny';
    }

    const cases = [
        {
            label: 'no claim above, closure below boundary → allow',
            content:
                '# Changelog\n\n## [Unreleased]\nPrep.\n\n' +
                '<!-- delivery-discipline: legacy-boundary -->\n\n' +
                '**Phase 7 is CLOSED.**\n',
        },
        {
            label: 'claim above boundary with attestation → allow',
            content:
                `# Changelog\n\n**Phase 8 is CLOSED.**\n${VALID_ATTESTATION}\n\n` +
                '<!-- delivery-discipline: legacy-boundary -->\n\n' +
                '**Phase 7 is CLOSED.**\n',
        },
        {
            label: 'claim above boundary without attestation → deny',
            content:
                '# Changelog\n\n**Phase 8 is CLOSED.**\n\nNo attestation.\n\n' +
                '<!-- delivery-discipline: legacy-boundary -->\n\n' +
                'whatever\n',
        },
        {
            label: 'gate-summary table with one trailing attestation → allow',
            content:
                `# Close\n\n| G1 | PASS |\n| G2 | PASS |\n\n${VALID_ATTESTATION}\n`,
        },
        {
            label: 'gate-summary table without any attestation → deny',
            content:
                '# Close\n\n| G1 | PASS |\n| G2 | PASS |\n\nNo attestation block.\n',
        },
    ];

    for (const c of cases) {
        it(`agrees on: ${c.label}`, () => {
            assert.equal(
                hookDecision(c.content),
                validatorDecision(c.content),
                `hook and validator disagree on "${c.label}"`,
            );
        });
    }
});

// ---------------------------------------------------------------------------
// B2. Strict mode + DB availability (Wave 0 contract)
// ---------------------------------------------------------------------------

describe('evaluateDeliveryDiscipline — strict mode + DB availability', () => {
    it('DENIES when strict + dbAvailable=false + closure claim with exemption', () => {
        const content = `<!-- delivery-discipline: exempt -->\n\n# Phase\n\n**Phase 99 is CLOSED.**`;
        const event = buildWriteEvent('phase99-closeout.md', content);
        const result = evaluateDeliveryDiscipline(event, { strictMode: true, dbAvailable: false });
        assert.equal(result.decision, 'deny');
        assert.equal(result.reason, 'strict-mode-audit-unavailable');
    });

    it('DENIES when strict + dbAvailable=false + closure claim with valid attestation', () => {
        const content = closeoutContent('**Phase 99 is CLOSED.**');
        const event = buildWriteEvent('phase99-closeout.md', content);
        const result = evaluateDeliveryDiscipline(event, { strictMode: true, dbAvailable: false });
        assert.equal(result.decision, 'deny');
        assert.equal(result.reason, 'strict-mode-audit-unavailable');
    });

    it('ALLOWS when strict + dbAvailable=true + valid attestation (normal enforcement)', () => {
        const content = closeoutContent('**Phase 99 is CLOSED.**');
        const event = buildWriteEvent('phase99-closeout.md', content);
        const result = evaluateDeliveryDiscipline(event, { strictMode: true, dbAvailable: true });
        assert.equal(result.decision, 'allow');
        assert.equal(result.reason, 'closure-with-valid-attestation');
    });

    it('ALLOWS when strict + dbAvailable=false + NO closure claim (fast-path not triggered)', () => {
        const event = buildWriteEvent('README.md', '# Project\n\nPlain prose no verdicts.');
        const result = evaluateDeliveryDiscipline(event, { strictMode: true, dbAvailable: false });
        assert.equal(result.decision, 'allow');
        assert.equal(result.reason, 'no-closure-claim');
    });

    it('ALLOWS when NOT strict + dbAvailable=false + exemption (normal behavior)', () => {
        const content = `<!-- delivery-discipline: exempt -->\n\n# Phase\n\n**Phase 99 is CLOSED.**`;
        const event = buildWriteEvent('phase99-closeout.md', content);
        const result = evaluateDeliveryDiscipline(event, { strictMode: false, dbAvailable: false });
        assert.equal(result.decision, 'allow');
        assert.equal(result.reason, 'exemption-comment');
    });
});

// ---------------------------------------------------------------------------
// B3. Fence-tag tightness (P2a: json tag required)
// ---------------------------------------------------------------------------

describe('evaluateDeliveryDiscipline — fence tag', () => {
    it('DENIES an attestation with a non-json fence (bare ``` with no language tag)', () => {
        const badFence = VALID_ATTESTATION.replace('```json', '```');
        const content = `# Phase\n\n**Phase 99 is CLOSED.**\n\n${badFence}\n`;
        const event = buildWriteEvent('phase99-closeout.md', content);
        const result = evaluateDeliveryDiscipline(event);
        assert.equal(result.decision, 'deny', 'attestation without explicit json fence tag must be rejected');
    });

    it('DENIES an attestation with a foreign fence tag (e.g. yaml)', () => {
        const badFence = VALID_ATTESTATION.replace('```json', '```yaml');
        const content = `# Phase\n\n**Phase 99 is CLOSED.**\n\n${badFence}\n`;
        const event = buildWriteEvent('phase99-closeout.md', content);
        const result = evaluateDeliveryDiscipline(event);
        assert.equal(result.decision, 'deny', 'attestation must use ```json fence; yaml tag rejected');
    });
});

// ---------------------------------------------------------------------------
// B4. Dual-config regression (P2c: hook MUST be registered in both configs)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// B5. probeDbAvailability — real DB probe, not just module import
// ---------------------------------------------------------------------------

describe('probeDbAvailability — actually verifies DB operability', () => {
    function fakeDbMod({ openResult, prepareResult, closeThrows = false } = {}) {
        return {
            openDB: () => openResult,
            initDB: () => {},
            applyMigrations: () => {},
            closeDB: () => {
                if (closeThrows) throw new Error('close failed');
            },
        };
    }

    function fakeDbHandle({ tableExists = true } = {}) {
        return {
            prepare: () => ({
                get: () => (tableExists ? { name: 'governance_events' } : undefined),
            }),
            close: () => {},
        };
    }

    it('returns false when the injected module has no openDB function', async () => {
        const mod = { openDB: null };
        assert.equal(await probeDbAvailability({ dbModule: mod }), false);
    });

    it('returns false when openDB returns null (better-sqlite3 degraded mode)', async () => {
        const mod = fakeDbMod({ openResult: null });
        assert.equal(await probeDbAvailability({ dbModule: mod }), false);
    });

    it('returns false when openDB throws synchronously', async () => {
        const mod = {
            openDB: () => {
                throw new Error('DB file corrupt');
            },
        };
        assert.equal(await probeDbAvailability({ dbModule: mod }), false);
    });

    it('returns false when DB opens but governance_events table is missing', async () => {
        const mod = fakeDbMod({ openResult: fakeDbHandle({ tableExists: false }) });
        assert.equal(await probeDbAvailability({ dbModule: mod }), false);
    });

    it('returns true when DB opens AND governance_events table exists', async () => {
        const mod = fakeDbMod({ openResult: fakeDbHandle({ tableExists: true }) });
        assert.equal(await probeDbAvailability({ dbModule: mod }), true);
    });

    it('returns false on initDB throw (DB cannot be initialized)', async () => {
        const mod = {
            openDB: () => fakeDbHandle(),
            initDB: () => {
                throw new Error('init failed');
            },
            applyMigrations: () => {},
            closeDB: () => {},
        };
        assert.equal(await probeDbAvailability({ dbModule: mod }), false);
    });

    it('returns false on applyMigrations throw (schema state unknown)', async () => {
        const mod = {
            openDB: () => fakeDbHandle(),
            initDB: () => {},
            applyMigrations: () => {
                throw new Error('migration mismatch');
            },
            closeDB: () => {},
        };
        assert.equal(await probeDbAvailability({ dbModule: mod }), false);
    });

    it('still returns true when closeDB throws (close failure is not a probe failure)', async () => {
        const mod = fakeDbMod({ openResult: fakeDbHandle(), closeThrows: true });
        assert.equal(await probeDbAvailability({ dbModule: mod }), true);
    });
});

describe('pre-delivery-discipline — dual-config registration', () => {
    it('is registered in .claude/settings.json PreToolUse[1]', async () => {
        const { readFile } = await import('node:fs/promises');
        const raw = await readFile(path.join(ROOT, '.claude', 'settings.json'), 'utf8');
        const settings = JSON.parse(raw);
        const preToolUse = settings?.hooks?.PreToolUse;
        assert.ok(Array.isArray(preToolUse), 'PreToolUse must be an array');
        const hasHook = preToolUse.some((entry) =>
            (entry.hooks || []).some((h) => typeof h.command === 'string' && h.command.includes('pre-delivery-discipline.js')),
        );
        assert.ok(hasHook, 'settings.json must register pre-delivery-discipline.js in PreToolUse');
    });

    it('is registered in hooks/hooks.json PreToolUse with ${CLAUDE_PLUGIN_ROOT}', async () => {
        const { readFile } = await import('node:fs/promises');
        const raw = await readFile(path.join(ROOT, 'hooks', 'hooks.json'), 'utf8');
        const settings = JSON.parse(raw);
        const preToolUse = settings?.hooks?.PreToolUse;
        assert.ok(Array.isArray(preToolUse), 'hooks.json PreToolUse must be an array');
        const hookEntry = preToolUse
            .flatMap((entry) => entry.hooks || [])
            .find((h) => typeof h.command === 'string' && h.command.includes('pre-delivery-discipline.js'));
        assert.ok(hookEntry, 'hooks.json must register pre-delivery-discipline.js');
        assert.match(hookEntry.command, /\$\{CLAUDE_PLUGIN_ROOT\}/u, 'plugin-mode must use ${CLAUDE_PLUGIN_ROOT} substitution');
    });

    it('both configs use matcher Write|Edit|MultiEdit (no Bash) for the new hook', async () => {
        const { readFile } = await import('node:fs/promises');
        for (const configPath of [['.claude', 'settings.json'], ['hooks', 'hooks.json']]) {
            const raw = await readFile(path.join(ROOT, ...configPath), 'utf8');
            const settings = JSON.parse(raw);
            const entries = settings?.hooks?.PreToolUse || [];
            const ourEntry = entries.find((entry) =>
                (entry.hooks || []).some((h) => typeof h.command === 'string' && h.command.includes('pre-delivery-discipline.js')),
            );
            assert.ok(ourEntry, `${configPath.join('/')} must contain the delivery-discipline hook`);
            assert.equal(
                ourEntry.matcher,
                'Write|Edit|MultiEdit',
                `${configPath.join('/')} matcher must be Write|Edit|MultiEdit (no Bash)`,
            );
        }
    });
});

// ---------------------------------------------------------------------------
// C. Process-boundary test — spawn the hook script with real stdin/stdout
// ---------------------------------------------------------------------------

function runHook(event) {
    const payload = JSON.stringify(event);
    const result = spawnSync(process.execPath, [HOOK_PATH], {
        input: payload,
        encoding: 'utf8',
        timeout: 10000,
    });
    return {
        status: result.status,
        stdout: result.stdout,
        stderr: result.stderr,
    };
}

describe('pre-delivery-discipline hook — process boundary', () => {
    it('exits 0 (allow) on a plain notes.md write', () => {
        const res = runHook(buildWriteEvent('notes.md', 'casual done prose'));
        assert.equal(res.status, 0);
        const parsed = JSON.parse(res.stdout);
        assert.equal(parsed.hookSpecificOutput.permissionDecision, 'allow');
    });

    it('exits 2 (deny) on a closeout write missing attestation', () => {
        const content = closeoutWithoutAttestation('**Phase 99 is CLOSED.**');
        const res = runHook(buildWriteEvent('phase99-closeout.md', content));
        assert.equal(res.status, 2);
        const parsed = JSON.parse(res.stdout);
        assert.equal(parsed.hookSpecificOutput.permissionDecision, 'deny');
        assert.match(parsed.hookSpecificOutput.permissionDecisionReason, /DELIVERY DISCIPLINE BLOCK/u);
        assert.match(parsed.hookSpecificOutput.permissionDecisionReason, /phase99-closeout\.md/u);
    });

    it('exits 0 (allow) on a closeout write with valid attestation', () => {
        const content = closeoutContent('**Phase 99 is CLOSED.**');
        const res = runHook(buildWriteEvent('phase99-closeout.md', content));
        assert.equal(res.status, 0);
        const parsed = JSON.parse(res.stdout);
        assert.equal(parsed.hookSpecificOutput.permissionDecision, 'allow');
    });

    it('exits 0 (graceful allow) on malformed stdin', () => {
        const result = spawnSync(process.execPath, [HOOK_PATH], {
            input: 'this is not json',
            encoding: 'utf8',
            timeout: 10000,
        });
        assert.equal(result.status, 0);
    });
});
