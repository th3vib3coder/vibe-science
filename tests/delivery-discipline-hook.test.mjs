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
    // Fixup-5: hashed legacy-boundary markers require the exact hash
    // of the below-marker content. Tests compute it inline using the
    // canonical helper so fixture hashes are always correct.
    computeBoundaryHash,
    // Fixup-7: fence-depth-aware attestation scanner. Exported so the
    // P1 #1 nested-fence test can exercise it directly.
    findAttestationJsonContent,
    // Fixup-9: path+hash boundary allowlist. Mutated by tests to bless
    // synthetic fixtures; restored after each test in the try/finally
    // wrapper `withBoundaryApproved`.
    LEGACY_BOUNDARY_HASHES,
    isApprovedBoundaryFile,
} = hookModule;

// Helper: build a hash-pinned legacy-boundary marker for the given
// below-marker content. Used by tests that exercise the new fixup-5
// semantics instead of the deprecated bare marker.
function hashedBoundaryMarker(belowContent) {
    return `<!-- delivery-discipline: legacy-boundary hash=${computeBoundaryHash(belowContent)} -->`;
}

// Fixup-9: temporarily bless (relPath, hash) in the boundary allowlist
// for the duration of a test callback. Used to exercise boundary
// semantics on synthetic fixtures without hardcoding the real
// CHANGELOG below-content. Restores previous state even on throw.
function withBoundaryApproved(relPath, hash, callback) {
    const previous = LEGACY_BOUNDARY_HASHES[relPath];
    LEGACY_BOUNDARY_HASHES[relPath] = hash;
    try {
        return callback();
    } finally {
        if (previous === undefined) delete LEGACY_BOUNDARY_HASHES[relPath];
        else LEGACY_BOUNDARY_HASHES[relPath] = previous;
    }
}

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

    // Fixup-7 P2 #3: whitelist expansion for common closeout basenames
    // the 7th adversarial review surfaced as gaps.
    it('matches release / completion / retro / shipped / finalization basenames', () => {
        assert.equal(matchesDeliverablePath('RELEASE.md'), true);
        assert.equal(matchesDeliverablePath('release-notes.md'), true);
        assert.equal(matchesDeliverablePath('v7.0-release.md'), true);
        assert.equal(matchesDeliverablePath('completion-report.md'), true);
        assert.equal(matchesDeliverablePath('completion.md'), true);
        assert.equal(matchesDeliverablePath('retrospective.md'), true);
        assert.equal(matchesDeliverablePath('retro-q2.md'), true);
        assert.equal(matchesDeliverablePath('shipped.md'), true);
        assert.equal(matchesDeliverablePath('finalization.md'), true);
        assert.equal(matchesDeliverablePath('finalized.md'), true);
        assert.equal(matchesDeliverablePath('final-report.md'), true);
        assert.equal(matchesDeliverablePath('final-summary.md'), true);
        assert.equal(matchesDeliverablePath('final-review.md'), true);
        assert.equal(matchesDeliverablePath('ready-to-ship.md'), true);
        assert.equal(matchesDeliverablePath('ready-to-merge.md'), true);
    });

    it('does NOT match conservative-exclusion patterns that would false-positive', () => {
        // `done` is intentionally excluded because it substring-matches
        // common prose like `abandoned`, `undone`.
        assert.equal(matchesDeliverablePath('abandoned.md'), false,
            '`done` must not be a substring trigger');
        assert.equal(matchesDeliverablePath('undone-items.md'), false);
        // `delivery` is excluded to avoid false-positives on planning
        // docs like `delivery-roadmap.md`.
        assert.equal(matchesDeliverablePath('04-delivery-roadmap.md'), false,
            '`delivery-*` planning docs must not trigger');
        // `ready` is excluded as a bare substring (`already.md` must not match)
        assert.equal(matchesDeliverablePath('already-indexed.md'), false);
        // `final` is intentionally not a bare substring trigger.
        assert.equal(matchesDeliverablePath('finally-notes.md'), false);
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

    // Fixup-5 P2: expand closure vocabulary to cover common status
    // tokens the previous regex missed: `FAIL` (imperative form of
    // FAILED, very common in gate tables) and review verdicts
    // `ACCEPTED`/`REJECTED`. The 5th adversarial review reproduced a
    // bypass using `Verdict: FAIL` and `| gate | FAIL |`.
    it('matches FAIL (not just FAILED) in every declarative form', () => {
        assert.equal(hasDeclaredClosureClaim('Verdict: FAIL'), true);
        assert.equal(hasDeclaredClosureClaim('| gate | FAIL |'), true);
        assert.equal(hasDeclaredClosureClaim('**Result: FAIL**'), true);
        assert.equal(hasDeclaredClosureClaim('Phase 8 is FAIL.'), true);
        assert.equal(hasDeclaredClosureClaim('FAIL.'), true); // line-start form
    });

    it('matches review-verdict declarations (ACCEPTED / REJECTED)', () => {
        assert.equal(hasDeclaredClosureClaim('Verdict: ACCEPTED'), true);
        assert.equal(hasDeclaredClosureClaim('Verdict: REJECTED'), true);
        assert.equal(hasDeclaredClosureClaim('| r2-review | ACCEPTED |'), true);
        assert.equal(hasDeclaredClosureClaim('| r2-review | REJECTED |'), true);
        assert.equal(hasDeclaredClosureClaim('**Result: REJECTED**'), true);
        assert.equal(hasDeclaredClosureClaim('Phase 9 is ACCEPTED.'), true);
    });

    it('does not treat ACCEPTED / REJECTED as bare line-start closure words', () => {
        // ACCEPTED/REJECTED are verdict tokens only in declarative status
        // contexts. As bare line-start prose they are ordinary adjectives.
        assert.equal(hasDeclaredClosureClaim('Accepted manuscripts are indexed after publication.'), false);
        assert.equal(hasDeclaredClosureClaim('Accepted inputs:'), false);
        assert.equal(hasDeclaredClosureClaim('Rejected candidates are archived for review.'), false);

        // The intended declarative forms still trigger.
        assert.equal(hasDeclaredClosureClaim('Verdict: ACCEPTED'), true);
        assert.equal(hasDeclaredClosureClaim('Result: REJECTED'), true);
        assert.equal(hasDeclaredClosureClaim('| review | ACCEPTED |'), true);
        assert.equal(hasDeclaredClosureClaim('| review | REJECTED |'), true);
    });

    it('rejects FAILURES/FAILING/FAILS as they are not declarative status words', () => {
        // Closure words in the vocabulary are terminal status tokens.
        // Conjugations like FAILING / FAILURES that appear in narrative
        // prose should NOT trigger enforcement.
        assert.equal(hasDeclaredClosureClaim('The test is FAILING intermittently.'), false);
        assert.equal(hasDeclaredClosureClaim('Recent FAILURES are documented below.'), false);
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

    // Fixup-7 P1 #1: the 7th adversarial review reproduced a bypass where
    // an agent copies the SKILL.md docs example verbatim INCLUDING the
    // outer 4-tick ````markdown wrapper. The inner 3-tick ```json block
    // would then pass the old nesting-blind regex. Under the new
    // fence-depth-aware parser, that nested json is correctly ignored.

    it('REJECTS an attestation nested inside a 4-tick ````markdown outer fence', () => {
        const jsonBody = `{
  "covered": ["item verified directly"],
  "scope_cuts": [{"item": "Something", "reason": "Deferred because it is complex"}],
  "self_review_findings": [
    "A skeptical reviewer would challenge the regex for edge-case prose like quoted CLOSED",
    "The hook reads file from disk for Edit tools; on Windows read errors degrade silently",
    "The minLength of 20 chars for self_review_findings could be gamed with padded strings"
  ],
  "external_review_status": "pending"
}`;
        // Agent copy-pastes the skill's docs-in-docs example:
        const wrapped =
            '## Delivery Attestation\n\n' +
            '````markdown\n' +
            '```json\n' +
            jsonBody + '\n' +
            '```\n' +
            '````\n';
        assert.equal(hasValidAttestation(wrapped), false,
            'a json fence nested inside a 4-tick outer fence is documentation, not attestation');
    });

    it('REJECTS an attestation nested inside an INDENTED 4-tick outer fence', () => {
        const jsonBody = `{
  "covered": ["item verified directly"],
  "scope_cuts": [{"item": "Something", "reason": "Deferred because it is complex"}],
  "self_review_findings": [
    "A skeptical reviewer would challenge the regex for edge-case prose like quoted CLOSED",
    "The hook reads file from disk for Edit tools; on Windows read errors degrade silently",
    "The minLength of 20 chars for self_review_findings could be gamed with padded strings"
  ],
  "external_review_status": "pending"
}`;
        // CommonMark permits 0-3 spaces before a fence. The previous
        // fixup-7 parser ignored the indented outer fence, so the inner
        // ```json was treated as depth-0 and accepted.
        const wrapped =
            '## Delivery Attestation\n\n' +
            ' ````markdown\n' +
            '```json\n' +
            jsonBody + '\n' +
            '```\n' +
            ' ````\n';
        assert.equal(hasValidAttestation(wrapped), false,
            'an indented outer fence is still an outer fence and must hide nested json');
    });

    it('REJECTS an attestation nested inside a 5-tick outer fence', () => {
        // 5+ tick outer with 3-tick json inner — same class of bypass
        // as the 4-tick case.
        const wrapped =
            '## Delivery Attestation\n\n' +
            '`````markdown\n' +
            '```json\n' +
            '{"covered":["x verified"],"scope_cuts":[],"self_review_findings":[' +
            '"reviewer would attack the regex edge-case prose handling here..............",' +
            '"reviewer would attack the boundary hash pin strategy in detail...............",' +
            '"reviewer would attack the stopping condition of positional binding..........",' +
            '],"external_review_status":"pending"}\n' +
            '```\n' +
            '`````\n';
        assert.equal(hasValidAttestation(wrapped), false);
    });

    // Fixup-9 P1 #2: tab indentation must NOT produce a valid attestation.
    // Per CommonMark, a leading tab equals 4 columns of indentation,
    // i.e. into an indented code block — not into a heading/fence. The
    // 9th review reproduced a bypass where `\t## Delivery Attestation`
    // + `\t```json` passed as a valid attestation.

    it('REJECTS an attestation where heading and fence are tab-indented (CommonMark code-block indent)', () => {
        const tabbed = [
            '# Phase 99 CLOSED', '',
            'Status: CLOSED', '',
            '\t## Delivery Attestation', '',
            '\t```json',
            '\t{"covered":["x verified directly"],"scope_cuts":[],"self_review_findings":[',
            '\t"attack one with enough text to clear the 20-char minimum please..........",',
            '\t"attack two with enough text to clear the 20-char minimum please..........",',
            '\t"attack three with enough text to clear the 20-char minimum please........"',
            '\t],"external_review_status":"pending"}',
            '\t```',
        ].join('\n');
        assert.equal(hasValidAttestation(tabbed), false,
            'tab-indented heading and fence must not be treated as real attestation');
    });

    it('REJECTS an attestation with a heading that starts with a tab', () => {
        const tabbedHeading = [
            'Status: CLOSED', '',
            '\t## Delivery Attestation', '',  // tab-indent heading
            '```json',                         // fence at column 0
            '{"covered":["x verified directly"],"scope_cuts":[],"self_review_findings":[',
            '"attack one with enough text to clear the 20-char minimum please..........",',
            '"attack two with enough text to clear the 20-char minimum please..........",',
            '"attack three with enough text to clear the 20-char minimum please........"',
            '],"external_review_status":"pending"}',
            '```',
        ].join('\n');
        assert.equal(hasValidAttestation(tabbedHeading), false,
            'tab-indented heading is a code-block indent and does not count as a real heading');
    });

    it('ACCEPTS an attestation with heading and fence at column 0 (the canonical form)', () => {
        // Regression guard after fixup-9 tightening: the ordinary case
        // must still work.
        assert.equal(hasValidAttestation(VALID_ATTESTATION), true);
    });

    it('ACCEPTS a CRLF-formatted attestation (fixup-9 P3)', () => {
        // CRLF line endings are typical on Windows. The parser now
        // normalizes them so a legitimate Windows-authored attestation
        // is no longer false-negatived.
        const crlfContent = VALID_ATTESTATION.replace(/\n/gu, '\r\n');
        assert.equal(hasValidAttestation(crlfContent), true,
            'CRLF attestation must parse successfully after line-ending normalization');
    });

    it('ACCEPTS an attestation preceded by a UTF-8 BOM (fixup-9 P3)', () => {
        const bomContent = '\uFEFF' + VALID_ATTESTATION;
        assert.equal(hasValidAttestation(bomContent), true,
            'a leading BOM must be stripped before parsing so the heading regex still anchors');
    });

    it('REJECTS a `## Delivery Attestation` heading that appears INSIDE a code fence', () => {
        // A fake heading buried in a code fence must not activate the
        // attestation scope. Only a heading at fence-depth zero counts.
        const fakeInsideFence =
            '# Phase 99 CLOSED\n\n' +
            'Status: CLOSED.\n\n' +
            '```markdown\n' +
            '## Delivery Attestation\n\n' +
            '```json\n' +
            '{"covered":["x"],"scope_cuts":[],"self_review_findings":["a","b","c"],"external_review_status":"pending"}\n' +
            '```\n' +
            '```\n';
        // No real heading at depth 0, so no attestation is found.
        assert.equal(hasValidAttestation(fakeInsideFence), false);
    });

    it('still ACCEPTS a plain 3-tick json fence at depth 0 after a real heading', () => {
        // Regression guard: the ordinary case still works.
        assert.equal(hasValidAttestation(VALID_ATTESTATION), true);
    });

    it('ACCEPTS a valid heading + json fence indented up to 3 spaces', () => {
        const indented = VALID_ATTESTATION
            .split('\n')
            .map((line) => (line.startsWith('## Delivery Attestation') || line.startsWith('```') ? `   ${line}` : line))
            .join('\n');
        assert.equal(hasValidAttestation(indented), true,
            'CommonMark permits headings and fences indented up to 3 spaces');
    });
});

// ---------------------------------------------------------------------------
// fixup-7 P1 #1: direct tests on the fence-depth-aware scanner helper.
// ---------------------------------------------------------------------------

describe('findAttestationJsonContent (fence-depth-aware scanner)', () => {
    it('returns null when there is no attestation heading', () => {
        assert.equal(findAttestationJsonContent('# A doc\n\nPlain text.'), null);
    });

    it('returns null for non-string input', () => {
        assert.equal(findAttestationJsonContent(null), null);
        assert.equal(findAttestationJsonContent(undefined), null);
        assert.equal(findAttestationJsonContent(42), null);
    });

    it('returns the inner JSON when the fence is at depth 0 after the heading', () => {
        const text =
            '## Delivery Attestation\n\n' +
            '```json\n' +
            '{"a":1}\n' +
            '```\n';
        assert.equal(findAttestationJsonContent(text), '{"a":1}');
    });

    it('returns null when the json fence is nested inside a 4-tick outer fence', () => {
        const text =
            '## Delivery Attestation\n\n' +
            '````markdown\n' +
            '```json\n' +
            '{"a":1}\n' +
            '```\n' +
            '````\n';
        assert.equal(findAttestationJsonContent(text), null,
            'a nested 3-tick json fence must not be treated as the attestation');
    });

    it('returns null when there is an outer fence but no json at depth 0 after the heading', () => {
        const text =
            '```text\nno heading here\n```\n' +
            '## Delivery Attestation\n\n' +
            '````markdown\n' +
            '```json\n' +
            '{"a":1}\n' +
            '```\n' +
            '````\n';
        assert.equal(findAttestationJsonContent(text), null);
    });

    it('returns null when the json fence is nested inside an INDENTED 4-tick outer fence', () => {
        const text =
            '## Delivery Attestation\n\n' +
            ' ````markdown\n' +
            '```json\n' +
            '{"a":1}\n' +
            '```\n' +
            ' ````\n';
        assert.equal(findAttestationJsonContent(text), null);
    });

    it('does NOT treat a heading inside a fence as the attestation heading', () => {
        const text =
            '```markdown\n' +
            '## Delivery Attestation\n' +
            '```\n' +
            '```json\n' +
            '{"a":1}\n' +
            '```\n';
        assert.equal(findAttestationJsonContent(text), null,
            'the ```json appears before any REAL heading, so no attestation scope is active');
    });

    it('does NOT treat a heading inside an INDENTED fence as the attestation heading', () => {
        const text =
            ' ````markdown\n' +
            '## Delivery Attestation\n' +
            '```json\n' +
            '{"a":1}\n' +
            '```\n' +
            ' ````\n';
        assert.equal(findAttestationJsonContent(text), null);
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
    it('returns full text with hasBoundary=false, hashValid=true when no marker', () => {
        const text = '# Doc\n\nNo marker here.\n';
        const result = extractEnforceableContent(text);
        assert.equal(result.enforceable, text);
        assert.equal(result.hasBoundary, false);
        assert.equal(result.hashValid, true);
    });

    it('returns only the portion BEFORE the marker when marker carries a matching hash (and path is approved)', () => {
        const above = '# Changelog\n\n## [Unreleased]\nNext release prep.\n\n';
        const below = '\n## v7.0 — legacy content below\n';
        const hash = computeBoundaryHash(below);
        const text = `${above}<!-- delivery-discipline: legacy-boundary hash=${hash} -->${below}`;
        withBoundaryApproved('CHANGELOG.md', hash, () => {
            const result = extractEnforceableContent(text, 'CHANGELOG.md');
            assert.equal(result.enforceable, above);
            assert.equal(result.hasBoundary, true);
            assert.equal(result.hashValid, true);
        });
    });

    it('is case-insensitive on the marker keyword (matches IDEs that mangle case)', () => {
        const below = '\nBelow.';
        const hash = computeBoundaryHash(below);
        const text = `Above.\n<!-- Delivery-Discipline: LEGACY-boundary hash=${hash} -->${below}`;
        withBoundaryApproved('CHANGELOG.md', hash, () => {
            const result = extractEnforceableContent(text, 'CHANGELOG.md');
            assert.equal(result.enforceable, 'Above.\n');
            assert.equal(result.hasBoundary, true);
            assert.equal(result.hashValid, true);
        });
    });

    it('gracefully handles non-string input', () => {
        assert.deepEqual(
            extractEnforceableContent(null),
            { enforceable: '', hasBoundary: false, hashValid: true },
        );
        assert.deepEqual(
            extractEnforceableContent(undefined),
            { enforceable: '', hasBoundary: false, hashValid: true },
        );
        assert.deepEqual(
            extractEnforceableContent(42),
            { enforceable: '', hasBoundary: false, hashValid: true },
        );
    });

    it('treats a hashed marker at position 0 as "entire file is legacy" (approved path only)', () => {
        const below = '\nall legacy below\n';
        const hash = computeBoundaryHash(below);
        const text = `<!-- delivery-discipline: legacy-boundary hash=${hash} -->${below}`;
        withBoundaryApproved('CHANGELOG.md', hash, () => {
            const result = extractEnforceableContent(text, 'CHANGELOG.md');
            assert.equal(result.enforceable, '');
            assert.equal(result.hasBoundary, true);
            assert.equal(result.hashValid, true);
        });
    });

    // Fixup-5 P1: bare marker (no hash) must NOT grant boundary.
    // Otherwise anyone could append new closure claims below it and
    // silently bypass the discipline.
    it('rejects a bare marker (no hash) and falls back to full-file enforcement', () => {
        const text = '# Changelog\n\n## [Unreleased]\n\n<!-- delivery-discipline: legacy-boundary -->\n\n## v7.0\n\n**Phase 7 is CLOSED.**\n';
        const result = extractEnforceableContent(text);
        assert.equal(result.hasBoundary, false,
            'bare marker must NOT grant boundary under fixup-5 semantics');
        assert.equal(result.hashValid, false);
        assert.equal(result.reason, 'legacy-boundary-without-hash');
        assert.equal(result.enforceable, text,
            'fall back to enforcing the whole file when the marker is bare');
    });

    // Fixup-5 P1: the whole point — appending new below-marker content
    // changes the hash, which invalidates the boundary. The file becomes
    // fully enforced until the hash is explicitly re-blessed.
    it('rejects a hash-pinned marker whose hash no longer matches below content (drift)', () => {
        const originalBelow = '\n## v7.0\n\nLegacy history.\n';
        const hash = computeBoundaryHash(originalBelow);
        // Tampered content: someone added `## [8.0.0]` below the marker
        // without re-blessing the hash. The exact attack the reviewer
        // reproduced on CHANGELOG.md.
        const tamperedBelow = '\n## v7.0\n\nLegacy history.\n\n## [8.0.0]\n\nStatus: SHIPPED\n';
        const text = `# Changelog\n\n<!-- delivery-discipline: legacy-boundary hash=${hash} -->${tamperedBelow}`;
        const result = extractEnforceableContent(text);
        assert.equal(result.hasBoundary, false,
            'drifted boundary must NOT grant bypass');
        assert.equal(result.hashValid, false);
        assert.equal(result.reason, 'legacy-boundary-hash-mismatch');
        assert.equal(result.enforceable, text,
            'fall back to enforcing the whole file on drift');
        assert.equal(result.expectedHash, hash);
        assert.notEqual(result.actualHash, hash);
    });

    // Line-ending stability: the hash is computed on LF-normalized
    // content, so a CRLF-formatted file checked out on Windows still
    // validates against a hash computed on the LF version.
    it('validates a hashed marker when below content uses CRLF line endings (approved path)', () => {
        const belowLf = '\n## v7.0\n\nLegacy history.\n';
        const hash = computeBoundaryHash(belowLf);
        const belowCrlf = belowLf.replace(/\n/gu, '\r\n');
        const text = `# Changelog\n<!-- delivery-discipline: legacy-boundary hash=${hash} -->${belowCrlf}`;
        withBoundaryApproved('CHANGELOG.md', hash, () => {
            const result = extractEnforceableContent(text, 'CHANGELOG.md');
            assert.equal(result.hasBoundary, true,
                'CRLF below-marker content must validate against LF-normalized hash');
            assert.equal(result.hashValid, true);
        });
    });

    // Fixup-9 P1 #1: boundary mint rejection — a file not in the
    // LEGACY_BOUNDARY_HASHES allowlist must NOT receive a boundary
    // even if its hashed marker is self-consistent.
    it('REJECTS a self-consistent hashed boundary when the path is not in the allowlist', () => {
        const below = '\n## v7.0\n\nFresh attack content.\n';
        const hash = computeBoundaryHash(below);
        const text = `# Fresh\n<!-- delivery-discipline: legacy-boundary hash=${hash} -->${below}`;
        // filePath is a brand-new deliverable, not in LEGACY_BOUNDARY_HASHES.
        const result = extractEnforceableContent(text, 'phase99-closeout.md');
        assert.equal(result.hasBoundary, false,
            'unapproved path must not be granted a boundary even with consistent hash');
        assert.equal(result.hashValid, false);
        assert.equal(result.reason, 'legacy-boundary-not-approved-for-this-path');
        assert.equal(result.enforceable, text,
            'enforceable must fall back to full text on boundary rejection');
    });

    it('REJECTS a boundary when filePath is missing (null) — fail-closed on unknown path', () => {
        const below = '\nlegacy\n';
        const hash = computeBoundaryHash(below);
        const text = `# Doc\n<!-- delivery-discipline: legacy-boundary hash=${hash} -->${below}`;
        const result = extractEnforceableContent(text /* no filePath */);
        assert.equal(result.hasBoundary, false);
        assert.equal(result.hashValid, false);
        assert.equal(result.reason, 'legacy-boundary-not-approved-for-this-path',
            'null filePath cannot match the allowlist → reject');
    });

    it('REJECTS a boundary when the file path is approved but the hash does not match the allowlisted one', () => {
        // filePath IS in allowlist, but the marker uses a different hash.
        const below = '\nnot the real CHANGELOG below\n';
        const hash = computeBoundaryHash(below);
        const text = `# Fake\n<!-- delivery-discipline: legacy-boundary hash=${hash} -->${below}`;
        // Use the real allowlist value, not a blessed fixture.
        const result = extractEnforceableContent(text, 'CHANGELOG.md');
        assert.equal(result.hasBoundary, false);
        assert.equal(result.hashValid, false);
        assert.equal(result.reason, 'legacy-boundary-not-approved-for-this-path',
            'hash must match the specific value in the allowlist for this path');
    });

    // Fixup-9 P3: BOM + CRLF normalization.
    it('strips a leading UTF-8 BOM before parsing', () => {
        const below = '\nlegacy\n';
        const hash = computeBoundaryHash(below);
        const bodyWithoutBom = `# Doc\n<!-- delivery-discipline: legacy-boundary hash=${hash} -->${below}`;
        const bodyWithBom = '\uFEFF' + bodyWithoutBom;
        withBoundaryApproved('CHANGELOG.md', hash, () => {
            const resultWith = extractEnforceableContent(bodyWithBom, 'CHANGELOG.md');
            const resultWithout = extractEnforceableContent(bodyWithoutBom, 'CHANGELOG.md');
            assert.equal(resultWith.hasBoundary, true, 'BOM must not prevent boundary recognition');
            assert.equal(resultWithout.hasBoundary, true);
            assert.equal(resultWith.hashValid, resultWithout.hashValid);
        });
    });
});

describe('computeBoundaryHash', () => {
    it('returns a stable sha256 hex for identical content', () => {
        const a = computeBoundaryHash('hello');
        const b = computeBoundaryHash('hello');
        assert.equal(a, b);
        assert.match(a, /^[a-f0-9]{64}$/u);
    });

    it('is LF-normalized: CRLF and LF variants produce the same hash', () => {
        const lf = '# Doc\nline 1\nline 2\n';
        const crlf = lf.replace(/\n/gu, '\r\n');
        assert.equal(computeBoundaryHash(lf), computeBoundaryHash(crlf));
    });

    it('treats bare CR as LF (handles old-Mac line endings)', () => {
        const lf = 'a\nb\nc';
        const cr = 'a\rb\rc';
        assert.equal(computeBoundaryHash(lf), computeBoundaryHash(cr));
    });

    it('returns a stable value for non-string inputs (empty → known hash)', () => {
        // sha256 of empty string
        const emptyHash = '0000000000000000000000000000000000000000000000000000000000000000';
        const real = computeBoundaryHash('');
        // Just assert it's consistent; the actual value is deterministic.
        assert.equal(real, computeBoundaryHash(''));
        assert.notEqual(real, emptyHash); // nothing magical, just a stable hash
        assert.equal(computeBoundaryHash(null), computeBoundaryHash(''),
            'non-string input hashes the same as empty string');
        assert.equal(computeBoundaryHash(undefined), computeBoundaryHash(''));
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

    it('DENIES closure when the only attestation-looking JSON is nested in an indented outer fence', () => {
        const innerJson = findAttestationJsonContent(VALID_ATTESTATION);
        assert.ok(innerJson, 'test fixture must contain valid top-level attestation json');
        const content =
            '# Phase\n\nStatus: CLOSED.\n\n' +
            '## Delivery Attestation\n\n' +
            ' ````markdown\n' +
            '```json\n' +
            innerJson + '\n' +
            '```\n' +
            ' ````\n';
        const event = buildWriteEvent('phase99-closeout.md', content);
        const result = evaluateDeliveryDiscipline(event);
        assert.equal(result.decision, 'deny');
        assert.equal(result.reason, 'missing-or-invalid-attestation');
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

    it('ALLOWS a closeout-path file where the only closure claims live BELOW a VALID hashed boundary', () => {
        // Above the marker: new content, no closure claim → nothing to enforce.
        // Below the marker: legacy release notes with CLOSED/SHIPPED/PASS
        // → MUST be ignored because they are legacy AND the hash matches
        // AND the path is in the boundary allowlist.
        const below =
            '\n\n## v7.0 — TRACE\n\n**Phase 7 is CLOSED.** (legacy, no attestation)\n' +
            '## v6.0\n\n**Phase 6 is SHIPPED.** (legacy, no attestation)\n';
        const hash = computeBoundaryHash(below);
        const content =
            '# Changelog\n\n## [Unreleased]\n\nNext release prep, no verdicts yet.\n\n' +
            `<!-- delivery-discipline: legacy-boundary hash=${hash} -->${below}`;
        withBoundaryApproved('CHANGELOG.md', hash, () => {
            const event = buildWriteEvent('CHANGELOG.md', content);
            const result = evaluateDeliveryDiscipline(event);
            assert.equal(result.decision, 'allow',
                'hook must ignore closure claims below a valid hashed boundary, matching validator');
            assert.equal(result.reason, 'no-closure-claim');
        });
    });

    it('DENIES a closeout-path file with a closure claim ABOVE the hashed boundary and no attestation', () => {
        const below = '\n\n## v7.0\n\n(legacy)\n';
        const hash = computeBoundaryHash(below);
        const content =
            '# Changelog\n\n## v7.1 — fixup-4\n\n**Result: PASSED**\n\nNo attestation here.\n\n' +
            `<!-- delivery-discipline: legacy-boundary hash=${hash} -->${below}`;
        withBoundaryApproved('CHANGELOG.md', hash, () => {
            const event = buildWriteEvent('CHANGELOG.md', content);
            const result = evaluateDeliveryDiscipline(event);
            assert.equal(result.decision, 'deny',
                'closure claim above the boundary still requires attestation');
            assert.equal(result.reason, 'missing-or-invalid-attestation');
        });
    });

    it('ALLOWS a closeout-path file with closure + attestation ABOVE hashed boundary and legacy BELOW', () => {
        const below =
            '\n\n## v7.0\n\n**Phase 7 is CLOSED.** (legacy, no attestation needed)\n';
        const hash = computeBoundaryHash(below);
        const content =
            `# Changelog\n\n## v7.1 — fixup-4\n\n**Result: PASSED**\n\n${VALID_ATTESTATION}\n\n` +
            `<!-- delivery-discipline: legacy-boundary hash=${hash} -->${below}`;
        withBoundaryApproved('CHANGELOG.md', hash, () => {
            const event = buildWriteEvent('CHANGELOG.md', content);
            const result = evaluateDeliveryDiscipline(event);
            assert.equal(result.decision, 'allow');
            assert.equal(result.reason, 'closure-with-valid-attestation');
        });
    });

    // Fixup-9 P1 #1: the boundary-mint repro from the 9th review.
    // Fresh phase99-closeout.md with a valid-looking hashed marker at
    // the top must NOT grandfather the rest of the file just because
    // the hash is self-consistent.
    it('DENIES a fresh deliverable that mints its own valid-looking hashed boundary', () => {
        const below = '\nStatus: CLOSED\n\nDeclaration without any attestation proof.\n';
        const hash = computeBoundaryHash(below);
        const content =
            `<!-- delivery-discipline: legacy-boundary hash=${hash} -->` + below;
        // Do NOT bless this path in the allowlist — that is the attack.
        const event = buildWriteEvent('phase99-closeout.md', content);
        const result = evaluateDeliveryDiscipline(event);
        assert.equal(result.decision, 'deny',
            'freshly-minted boundary on an unapproved path must not bypass enforcement');
        assert.equal(result.reason, 'legacy-boundary-not-approved-for-this-path',
            'reason must pinpoint the allowlist violation, not something generic');
    });

    // Fixup-5 P1: reviewer's reproduction. Someone appends a new
    // release section with a closure declaration below an existing
    // hashed boundary. The hash no longer matches the expanded below
    // content, so the file falls back to whole-file enforcement. The
    // new closure claim has no attestation → deny. This is the exact
    // scenario the 4th adversarial review proved bypassed fixup-4.
    it('DENIES a file where a new closure claim was appended below a hashed boundary (drift)', () => {
        const originalBelow = '\n\n## v7.0\n\nLegacy, no attestation.\n';
        const hash = computeBoundaryHash(originalBelow);
        // Bypass attempt: append `## [8.0.0]` with a closure verdict
        // below the marker WITHOUT re-blessing the hash.
        const tamperedBelow =
            originalBelow + '\n## [8.0.0]\n\nStatus: SHIPPED\n\nNo attestation.\n';
        const content =
            '# Changelog\n\n## [Unreleased]\n\nPrep.\n\n' +
            `<!-- delivery-discipline: legacy-boundary hash=${hash} -->${tamperedBelow}`;
        const event = buildWriteEvent('CHANGELOG.md', content);
        const result = evaluateDeliveryDiscipline(event);
        assert.equal(result.decision, 'deny',
            'appending a new closure below the marker must not silently bypass');
        assert.equal(result.reason, 'legacy-boundary-hash-mismatch',
            'the reason must point at the boundary integrity issue, not a generic attestation error');
        assert.equal(result.expectedHash, hash);
        assert.ok(result.actualHash && result.actualHash !== hash);
    });

    it('DENIES a drifted boundary even when an exemption comment is appended below it', () => {
        const originalBelow = '\n\n## v7.0\n\nLegacy, no attestation.\n';
        const hash = computeBoundaryHash(originalBelow);
        const tamperedBelow =
            originalBelow +
            '\n<!-- delivery-discipline: exempt -->\n\n' +
            '## [8.0.0]\n\nStatus: SHIPPED\n\nNo attestation.\n';
        const content =
            '# Changelog\n\n## [Unreleased]\n\nPrep.\n\n' +
            `<!-- delivery-discipline: legacy-boundary hash=${hash} -->${tamperedBelow}`;
        const event = buildWriteEvent('CHANGELOG.md', content);
        const result = evaluateDeliveryDiscipline(event);
        assert.equal(result.decision, 'deny',
            'a boundary-integrity failure must not be rescued by an exemption below the marker');
        assert.equal(result.reason, 'legacy-boundary-hash-mismatch');
    });

    it('DENIES a file with a bare legacy-boundary marker (no hash) containing closure claims below', () => {
        const content =
            '# Changelog\n\n## [Unreleased]\n\n' +
            '<!-- delivery-discipline: legacy-boundary -->\n\n' +
            '## v7.0\n\n**Phase 7 is CLOSED.**\n';
        const event = buildWriteEvent('CHANGELOG.md', content);
        const result = evaluateDeliveryDiscipline(event);
        assert.equal(result.decision, 'deny',
            'bare marker (no hash) must not grant bypass under fixup-5');
        assert.equal(result.reason, 'legacy-boundary-without-hash');
    });

    // Fixup-7 P1 #2: the 7th adversarial review reproduced a drift.
    // Hook was scanning FULL content for the exemption comment, while
    // the validator scanned only the ENFORCEABLE (above-marker) slice.
    // An agent could hide an exemption comment BELOW a valid hashed
    // boundary and the hook would allow the write while the validator
    // (CI) would deny it. Parity is now enforced by anchoring the
    // hook's exemption check to `enforceable` as well.

    it('DENIES (does NOT exempt) when an exemption comment is hidden BELOW a valid hashed boundary', () => {
        // Fixup-9: use CHANGELOG.md (approved path) + temporary bless so
        // the boundary genuinely grants (enforceable = above-marker).
        // The exemption comment is BELOW the marker and should be
        // invisible to the hook.
        const below =
            '\nGenuine-looking historical content.\n\n' +
            '<!-- delivery-discipline: exempt -->\n\n' +
            'More historical text.\n';
        const hash = computeBoundaryHash(below);
        const content =
            '# Changelog\n\nStatus: CLOSED.\n\n' +
            `<!-- delivery-discipline: legacy-boundary hash=${hash} -->` +
            below;
        withBoundaryApproved('CHANGELOG.md', hash, () => {
            const event = buildWriteEvent('CHANGELOG.md', content);
            const result = evaluateDeliveryDiscipline(event);
            assert.equal(result.decision, 'deny',
                'exemption hidden below a valid boundary must not grant bypass — must match validator');
            assert.equal(result.reason, 'missing-or-invalid-attestation',
                'reason must point at missing attestation, not at the hidden exemption');
        });
    });

    it('still ALLOWS exemption when it is placed at the top of the file (valid location)', () => {
        const content =
            '<!-- delivery-discipline: exempt -->\n\n' +
            '# Phase 99\n\nStatus: CLOSED.\n';
        const event = buildWriteEvent('phase99-closeout.md', content);
        const result = evaluateDeliveryDiscipline(event);
        assert.equal(result.decision, 'allow');
        assert.equal(result.reason, 'exemption-comment');
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

    // Build hashed-marker fixtures inline so each case's `below` slice
    // matches the hash it pins. Under fixup-5, bare markers no longer
    // grant a boundary — so parity cases that rely on the boundary must
    // use the hashed form.
    const below1 = '\n**Phase 7 is CLOSED.**\n';
    const below2 = '\n**Phase 7 is CLOSED.**\n';
    const below3 = '\nwhatever\n';
    const cases = [
        {
            label: 'no claim above, closure below VALID hashed boundary → allow',
            content:
                '# Changelog\n\n## [Unreleased]\nPrep.\n\n' +
                `${hashedBoundaryMarker(below1)}${below1}`,
        },
        {
            label: 'claim above hashed boundary with attestation → allow',
            content:
                `# Changelog\n\n**Phase 8 is CLOSED.**\n${VALID_ATTESTATION}\n\n` +
                `${hashedBoundaryMarker(below2)}${below2}`,
        },
        {
            label: 'claim above hashed boundary without attestation → deny',
            content:
                '# Changelog\n\n**Phase 8 is CLOSED.**\n\nNo attestation.\n\n' +
                `${hashedBoundaryMarker(below3)}${below3}`,
        },
        {
            label: 'bare marker (no hash) with closure below → deny (fixup-5)',
            content:
                '# Changelog\n\n## [Unreleased]\nPrep.\n\n' +
                '<!-- delivery-discipline: legacy-boundary -->\n\n' +
                '**Phase 7 is CLOSED.**\n',
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
