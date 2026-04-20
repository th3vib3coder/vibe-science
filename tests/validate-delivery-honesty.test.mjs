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
import { spawnSync } from 'node:child_process';
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

// Pre-Phase-8 baseline: files that existed BEFORE Phase 8 and whose
// entire current content predates the delivery-discipline contract.
// Entries are skipped by the validator (reported as 'legacy-allowlist').
// Adding new paths here requires an explicit code change + reviewer
// approval — this is intentional. Per-file opt-outs for new files must
// go through the in-file `<!-- delivery-discipline: exempt -->` comment
// mechanism, which is logged by Wave 4 as `delivery_discipline_exemption_used`.
export const LEGACY_ALLOWLIST = new Set([
    'SKILL.md',                  // vibe-science monolithic meta-skill, pre-Phase-8
    'skills/vibe/SKILL.md',      // same family, duplicate scientific-truth meta-skill
    'CHANGELOG.md',              // pre-Phase-8 release-note entries; future entries SHOULD add attestation
]);

// Directory prefixes whose entire contents are out of scope regardless
// of allowlist. Historical snapshots + gitignored private planning.
const LEGACY_DIR_PREFIXES = [
    'archive/',
    'blueprints/private/',
];

// Fallback walk only skips system dirs — legacy filtering is done
// downstream by classifySkip() so the rule is a single source of truth.
// In real git repos `git ls-files` returns only tracked files so the
// gitignored basenames (CHANGELOG_V2.md, UPGRADE_PLAN_V2.md) never
// appear. In tmp fixtures (where fallback runs) those files don't exist.
const FALLBACK_SKIP_DIRS = new Set(['node_modules', '.git']);

/**
 * Preferred: use `git ls-files '*.md'` to get tracked markdown files.
 * Falls back to a filesystem walk only if git is unavailable or rootDir
 * is not a git repository (e.g. test fixtures in a tmp dir).
 */
function listMarkdownFiles(rootDir) {
    try {
        const result = spawnSync('git', ['-C', rootDir, 'ls-files', '*.md'], {
            encoding: 'utf8',
            timeout: 10000,
        });
        if (result.error) throw result.error;
        if (result.status !== 0) {
            throw new Error(`git ls-files exited ${result.status}: ${String(result.stderr).slice(0, 200)}`);
        }
        return result.stdout
            .split(/\r?\n/u)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
    } catch {
        // Fallback: filesystem walk. Used for:
        //   - test fixtures running in tmp dirs (not git repos)
        //   - environments without git CLI
        return fallbackWalk(rootDir);
    }
}

function fallbackWalk(rootDir) {
    const out = [];
    function walk(dir, relDir) {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
            if (entry.isDirectory()) {
                if (FALLBACK_SKIP_DIRS.has(entry.name)) continue;
                walk(full, rel);
                continue;
            }
            if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
                out.push(rel);
            }
        }
    }
    walk(rootDir, '');
    return out;
}

function classifySkip(relPath) {
    if (LEGACY_ALLOWLIST.has(relPath)) return 'legacy-allowlist';
    for (const prefix of LEGACY_DIR_PREFIXES) {
        if (relPath.startsWith(prefix)) return 'legacy-directory';
    }
    return null;
}

/**
 * Validate delivery honesty across a repo root. Returns a structured
 * report: violations, per-file-exempted, legacy-skipped, scanned count.
 * Does NOT throw; caller decides what to assert.
 *
 * Two distinct skip channels:
 *   - `legacyCount` counts files skipped via LEGACY_ALLOWLIST / LEGACY_DIR_PREFIXES
 *     (validator-side, auditable via code change).
 *   - `exemptedCount` counts files skipped via in-file
 *     `<!-- delivery-discipline: exempt -->` comment (per-file, logged
 *     by Wave 4 as governance event).
 *
 * This separation matters: legacy skips are permanent baseline state;
 * exemption comments are per-file opt-outs that Wave 4 audits. Bundling
 * them would let new edits to legacy files silently bypass enforcement
 * forever — the P1-B pitfall of the first Wave 3 implementation.
 */
export function validateDeliveryHonesty(rootDir) {
    const scanned = [];
    const violations = [];
    const exempted = [];
    const legacy = [];
    const notDeliverable = [];

    for (const rel of listMarkdownFiles(rootDir)) {
        scanned.push(rel);

        const legacyReason = classifySkip(rel);
        if (legacyReason !== null) {
            legacy.push({ file: rel, reason: legacyReason });
            continue;
        }

        if (!matchesDeliverablePath(rel)) {
            notDeliverable.push(rel);
            continue;
        }

        const filePath = path.join(rootDir, rel);
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
        enforcedCount: scanned.length - notDeliverable.length - exempted.length - legacy.length,
        exemptedCount: exempted.length,
        legacyCount: legacy.length,
        violations,
        exempted,
        legacy,
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
            // Deliberately NOT 'SKILL.md' — that's in LEGACY_ALLOWLIST, which
            // would mark the file legacy-skipped instead of exemption-skipped.
            // This test proves the in-file exemption path works for
            // non-allowlisted deliverables.
            writeFile(dir, 'phase42-closeout.md',
                `<!-- delivery-discipline: exempt -->\n\n# Phase 42\n\n**Phase 42 is CLOSED.**\n`);
            const report = validateDeliveryHonesty(dir);
            assert.equal(report.violations.length, 0);
            assert.equal(report.exemptedCount, 1);
            assert.match(report.exempted[0], /phase42-closeout\.md/u);
            assert.equal(report.legacyCount, 0, 'must NOT trigger legacy-allowlist path');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('marks LEGACY_ALLOWLIST entries as legacy (not exempted) even without exemption comment', () => {
        const dir = makeTempDir('vds-legacy-');
        try {
            // Simulate a pre-Phase-8 file — it's in the allowlist, so the
            // validator skips it with reason 'legacy-allowlist' even when
            // there's no `<!-- delivery-discipline: exempt -->` comment.
            writeFile(dir, 'SKILL.md',
                '# Legacy vibe-science meta-skill\n\n**Phase 7 is CLOSED.** No attestation.\n');
            const report = validateDeliveryHonesty(dir);
            assert.equal(report.violations.length, 0);
            assert.equal(report.legacyCount, 1);
            assert.equal(report.legacy[0].file, 'SKILL.md');
            assert.equal(report.legacy[0].reason, 'legacy-allowlist');
            assert.equal(report.exemptedCount, 0, 'must NOT trigger per-file exemption path');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('skips files under LEGACY_DIR_PREFIXES like archive/', () => {
        const dir = makeTempDir('vds-archive-');
        try {
            writeFile(dir, 'archive/v5.5/phase-closeout.md',
                '# Historical\n\n**Phase 5 is CLOSED.** No attestation.\n');
            const report = validateDeliveryHonesty(dir);
            assert.equal(report.violations.length, 0);
            assert.equal(report.legacyCount, 1);
            assert.equal(report.legacy[0].reason, 'legacy-directory');
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

    it('treats multiple files correctly in one scan (mix of pass, fail, exempt, legacy, non-deliverable)', () => {
        const dir = makeTempDir('vds-mixed-');
        try {
            writeFile(dir, 'phase1-closeout.md',
                `# Phase 1\n\n**Phase 1 is CLOSED.**\n\n${VALID_ATTESTATION_BLOCK}`);
            writeFile(dir, 'phase2-closeout.md',
                '# Phase 2\n\n**Phase 2 is CLOSED.**\n\nMissing attestation.\n');
            writeFile(dir, 'phase3-closeout.md',
                '<!-- delivery-discipline: exempt -->\n\n# Phase 3\n\n**Phase 3 is CLOSED.**\n');
            writeFile(dir, 'SKILL.md',
                '# Legacy skill\n\n**Phase 4 is CLOSED.** No attestation, but allowlisted.\n');
            writeFile(dir, 'notes.md', '# Random prose without closure\n');

            const report = validateDeliveryHonesty(dir);
            assert.equal(report.violations.length, 1);
            assert.match(report.violations[0].file, /phase2-closeout/u);
            assert.equal(report.exemptedCount, 1, 'phase3 uses per-file exemption');
            assert.equal(report.legacyCount, 1, 'SKILL.md is allowlisted legacy');
            assert.equal(report.scannedCount, 5);
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
