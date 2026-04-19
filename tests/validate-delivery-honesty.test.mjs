// Phase 8 Wave 3 — validate-delivery-honesty CI validator.
//
// Scans tracked markdown deliverables in the repo and verifies that every
// file containing a declarative closure claim also contains a valid
// Delivery Attestation block — OR carries an explicit exemption comment.
//
// The Wave 0 contract (WP-8-3) originally specified Ajv-based JSON Schema
// validation. This implementation deviates: the validator reuses the pure
// helpers already shipped in Wave 2 (`hasValidAttestation`,
// `hasDeclaredClosureClaim`, `hasExemptionComment`, `matchesDeliverablePath`)
// instead of loading Ajv as a new dependency. Rationale: (1) the kernel
// plugin's dependency footprint stays minimal (only better-sqlite3 +
// @huggingface/transformers); (2) the PreToolUse hook and the CI
// validator share identical validation logic by construction — no drift
// is possible between runtime-enforcement and CI-enforcement. The schema
// file at skills/vibe/assets/schemas/delivery-attestation.schema.json is
// the authoritative documentation contract; a future Phase 8.X test can
// add an Ajv cross-check that asserts the JS helper and the schema stay
// synchronized.
//
// Scope cuts:
//   - Does NOT scan blueprints/private/  → private planning docs are
//     gitignored and out of scope for public honesty enforcement.
//   - Does NOT scan node_modules/ or .git/.
//   - Does NOT emit governance_events   → that is Wave 4 scope.
//   - Does NOT cross-reference external_review_status against real review
//     records → that is Phase 8.1 scope.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const HOOK_PATH = path.join(ROOT, 'plugin', 'scripts', 'pre-delivery-discipline.js');
const SCHEMA_PATH = path.join(ROOT, 'skills', 'vibe', 'assets', 'schemas', 'delivery-attestation.schema.json');

const hookModule = await import(pathToFileURL(HOOK_PATH).href);
const {
    matchesDeliverablePath,
    hasDeclaredClosureClaim,
    hasValidAttestation,
    hasExemptionComment,
} = hookModule;

// ---------------------------------------------------------------------------
// Validator core (exported-shape function, testable)
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set([
    'node_modules',
    '.git',
    'private',
    'archive',        // historical snapshots (pre-Phase 8); immutable, not subject to delivery discipline
]);
const SKIP_PATH_SUFFIXES = [
    path.sep + 'blueprints' + path.sep + 'private',
];
const SKIP_BASENAMES = new Set([
    // Gitignored files scanned on disk but not part of the public contract.
    'CHANGELOG_V2.md',
    'UPGRADE_PLAN_V2.md',
]);

function walkMarkdownFiles(rootDir) {
    const out = [];
    function walk(dir) {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (SKIP_DIRS.has(entry.name)) continue;
                if (SKIP_PATH_SUFFIXES.some((suffix) => full.endsWith(suffix))) continue;
                walk(full);
                continue;
            }
            if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
                if (SKIP_BASENAMES.has(entry.name)) continue;
                out.push(full);
            }
        }
    }
    walk(rootDir);
    return out;
}

/**
 * Validate delivery honesty across a repo root. Returns a structured
 * report: violations, exemptions, scanned count. Does NOT throw; caller
 * decides what to assert.
 */
export function validateDeliveryHonesty(rootDir) {
    const scanned = [];
    const violations = [];
    const exempted = [];
    const notDeliverable = [];

    for (const filePath of walkMarkdownFiles(rootDir)) {
        const rel = path.relative(rootDir, filePath).split(path.sep).join('/');
        scanned.push(rel);
        if (!matchesDeliverablePath(rel)) {
            notDeliverable.push(rel);
            continue;
        }
        let content;
        try {
            content = fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            violations.push({ file: rel, reason: `read-error: ${error.message}` });
            continue;
        }
        if (hasExemptionComment(content)) {
            exempted.push(rel);
            continue;
        }
        if (!hasDeclaredClosureClaim(content)) {
            continue; // file matches path but declares no closure — no enforcement needed
        }
        if (!hasValidAttestation(content)) {
            violations.push({
                file: rel,
                reason: 'closure-claim-without-valid-attestation',
            });
        }
    }

    return {
        scannedCount: scanned.length,
        enforcedCount: scanned.length - notDeliverable.length - exempted.length,
        exemptedCount: exempted.length,
        violations,
        exempted,
    };
}

// ---------------------------------------------------------------------------
// Schema file presence + shape tests
// ---------------------------------------------------------------------------

describe('delivery-attestation.schema.json', () => {
    it('exists at the declared path', () => {
        assert.ok(fs.existsSync(SCHEMA_PATH), `schema file missing at ${SCHEMA_PATH}`);
    });

    it('parses as valid JSON with draft-07 + the 4 required fields', () => {
        const raw = fs.readFileSync(SCHEMA_PATH, 'utf8');
        const schema = JSON.parse(raw);
        assert.equal(schema.$schema, 'http://json-schema.org/draft-07/schema#');
        assert.equal(schema.type, 'object');
        assert.equal(schema.additionalProperties, false);
        assert.deepEqual(
            [...schema.required].sort(),
            ['covered', 'external_review_status', 'scope_cuts', 'self_review_findings'],
        );
        assert.equal(schema.properties.self_review_findings.minItems, 3);
        assert.deepEqual(
            schema.properties.external_review_status.enum,
            ['pending', 'cleared', 'blocked'],
        );
    });

    it('is protected by pre-tool-use.js PROTECTED_CONFIG_RULES', () => {
        const preToolUse = fs.readFileSync(path.join(ROOT, 'plugin', 'scripts', 'pre-tool-use.js'), 'utf8');
        assert.match(
            preToolUse,
            /delivery-attestation\.schema\.json/u,
            'pre-tool-use.js must list delivery-attestation.schema.json in PROTECTED_CONFIG_RULES',
        );
    });

    it('is denied by .claude/settings.json deny-list', () => {
        const settings = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude', 'settings.json'), 'utf8'));
        const denyList = settings.permissions?.deny ?? [];
        const hasEditRule = denyList.some((rule) => /delivery-attestation\.schema\.json/u.test(rule) && rule.startsWith('Edit'));
        const hasWriteRule = denyList.some((rule) => /delivery-attestation\.schema\.json/u.test(rule) && rule.startsWith('Write'));
        assert.ok(hasEditRule, 'settings.json deny-list must block Edit on delivery-attestation.schema.json');
        assert.ok(hasWriteRule, 'settings.json deny-list must block Write on delivery-attestation.schema.json');
    });
});

// ---------------------------------------------------------------------------
// SKILL.md embedded example validates against the hook's validator
// (cross-check: example in the skill teaches the same shape the hook
// actually enforces)
// ---------------------------------------------------------------------------

describe('SKILL.md embedded attestation example vs hook validator', () => {
    it('the attestation block the skill teaches passes hasValidAttestation', () => {
        const skillPath = path.join(ROOT, '.claude', 'skills', 'delivery-discipline', 'SKILL.md');
        const skillSource = fs.readFileSync(skillPath, 'utf8');
        assert.ok(hasValidAttestation(skillSource),
            'the skill file contains a Delivery Attestation example; hasValidAttestation must accept it');
    });
});

// ---------------------------------------------------------------------------
// Validator behavior on synthetic fixtures
// ---------------------------------------------------------------------------

function makeTempDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFile(dir, relativePath, content) {
    const full = path.join(dir, relativePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf8');
    return full;
}

const VALID_ATTESTATION_BLOCK = `## Delivery Attestation

\`\`\`json
{
  "covered": [
    "Item A verified directly",
    "Item B cross-checked"
  ],
  "scope_cuts": [
    {
      "item": "Wave 4 logging",
      "reason": "Not in Wave 3 scope per phase plan"
    }
  ],
  "self_review_findings": [
    "A skeptical reviewer would challenge the regex for edge-case prose in code blocks",
    "The exemption threshold of 1500 chars could be gamed by frontmatter-padded files",
    "Test coverage uses injected mocks; process-boundary failure mode is less exercised"
  ],
  "external_review_status": "pending"
}
\`\`\`
`;

describe('validateDeliveryHonesty — synthetic fixtures', () => {
    it('flags a phase closeout with closure claim but no attestation', () => {
        const dir = makeTempDir('vds-fail-');
        try {
            writeFile(dir, 'phase99-closeout.md',
                '# Phase 99\n\n**Phase 99 is CLOSED.**\n\nNo attestation here.\n');
            const report = validateDeliveryHonesty(dir);
            assert.equal(report.violations.length, 1);
            assert.match(report.violations[0].file, /phase99-closeout\.md/u);
            assert.equal(report.violations[0].reason, 'closure-claim-without-valid-attestation');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('passes a phase closeout with closure claim AND valid attestation', () => {
        const dir = makeTempDir('vds-pass-');
        try {
            writeFile(dir, 'phase99-closeout.md',
                `# Phase 99\n\n**Phase 99 is CLOSED.**\n\n${VALID_ATTESTATION_BLOCK}`);
            const report = validateDeliveryHonesty(dir);
            assert.equal(report.violations.length, 0);
            assert.equal(report.enforcedCount, 1);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('skips a file carrying the exemption comment even with closure claim', () => {
        const dir = makeTempDir('vds-exempt-');
        try {
            writeFile(dir, 'SKILL.md',
                `<!-- delivery-discipline: exempt -->\n\n# Example skill\n\n**Phase 99 is CLOSED.**\n`);
            const report = validateDeliveryHonesty(dir);
            assert.equal(report.violations.length, 0);
            assert.equal(report.exemptedCount, 1);
            assert.match(report.exempted[0], /SKILL\.md/u);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('ignores non-deliverable markdown even with closure-like prose', () => {
        const dir = makeTempDir('vds-nondeliv-');
        try {
            writeFile(dir, 'notes.md', '# Notes\n\nWork is done. File closed.\n');
            const report = validateDeliveryHonesty(dir);
            assert.equal(report.violations.length, 0);
            assert.equal(report.enforcedCount, 0);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('does NOT scan blueprints/private/ subdirectories', () => {
        const dir = makeTempDir('vds-private-');
        try {
            writeFile(dir, 'blueprints/private/phase99-plan.md',
                '# Private plan\n\n**Phase 99 is CLOSED.**\n\nNo attestation; should be ignored.\n');
            const report = validateDeliveryHonesty(dir);
            assert.equal(report.violations.length, 0, 'private/ must be skipped');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('treats multiple files correctly in one scan (mix of pass, fail, exempt, non-deliverable)', () => {
        const dir = makeTempDir('vds-mixed-');
        try {
            writeFile(dir, 'phase1-closeout.md',
                `# Phase 1\n\n**Phase 1 is CLOSED.**\n\n${VALID_ATTESTATION_BLOCK}`);
            writeFile(dir, 'phase2-closeout.md',
                '# Phase 2\n\n**Phase 2 is CLOSED.**\n\nMissing attestation.\n');
            writeFile(dir, 'SKILL.md',
                '<!-- delivery-discipline: exempt -->\n\n# Skill\n\n**Phase 3 is CLOSED.**\n');
            writeFile(dir, 'notes.md', '# Random prose without closure\n');

            const report = validateDeliveryHonesty(dir);
            assert.equal(report.violations.length, 1);
            assert.match(report.violations[0].file, /phase2-closeout/u);
            assert.equal(report.exemptedCount, 1);
            assert.equal(report.scannedCount, 4);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
});

// ---------------------------------------------------------------------------
// Live scan: the REAL plugin repo must pass the validator today
// ---------------------------------------------------------------------------

describe('validateDeliveryHonesty — live scan of the plugin repo', () => {
    it('the plugin repo itself has zero delivery-discipline violations', () => {
        const report = validateDeliveryHonesty(ROOT);
        if (report.violations.length > 0) {
            const summary = report.violations
                .map((v) => `  - ${v.file}: ${v.reason}`)
                .join('\n');
            assert.fail(
                `validate-delivery-honesty found ${report.violations.length} violations in the plugin repo:\n${summary}`,
            );
        }
        assert.equal(report.violations.length, 0);
    });
});
