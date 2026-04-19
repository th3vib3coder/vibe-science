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
    it('matches closeout / phase / wave / skill / readme / changelog basenames', () => {
        assert.equal(matchesDeliverablePath('phase8-closeout.md'), true);
        assert.equal(matchesDeliverablePath('wave-3-summary.md'), true);
        assert.equal(matchesDeliverablePath('some/path/SKILL.md'), true);
        assert.equal(matchesDeliverablePath('README.md'), true);
        assert.equal(matchesDeliverablePath('CHANGELOG.md'), true);
        assert.equal(matchesDeliverablePath('phase8-01-wave-0-contracts.md'), true);
        assert.equal(matchesDeliverablePath('docs/project-status.md'), true);
        assert.equal(matchesDeliverablePath('verdict.md'), true);
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
});

describe('hasExemptionComment', () => {
    it('detects exemption comment at the top of the file', () => {
        const text = `<!-- delivery-discipline: exempt -->\n\n# Doc\n\nStatus: CLOSED`;
        assert.equal(hasExemptionComment(text), true);
    });

    it('does not detect exemption when buried deep in the file', () => {
        const filler = 'x'.repeat(1600);
        const text = `# Doc\n${filler}\n<!-- delivery-discipline: exempt -->\n`;
        assert.equal(hasExemptionComment(text), false);
    });

    it('detects exemption after a long YAML frontmatter', () => {
        const frontmatter = `---\nname: example\ndescription: ${'a'.repeat(400)}\n---\n`;
        const text = `${frontmatter}\n<!-- delivery-discipline: exempt -->\n\n# Body`;
        assert.equal(hasExemptionComment(text), true);
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
