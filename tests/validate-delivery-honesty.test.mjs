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
import crypto from 'node:crypto';
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
    everyClosureHasBoundAttestation,
    // Shared boundary-extraction helper. The validator MUST import the
    // hook's version (not keep its own copy) so write-time enforcement
    // (hook) and CI-time enforcement (validator) cannot drift on how
    // they treat `<!-- delivery-discipline: legacy-boundary -->`. The
    // fixup-4 review identified a drift risk: the hook did not honor
    // the marker while the validator did. Sharing the helper makes
    // that class of drift structurally impossible.
    extractEnforceableContent,
    // Fixup-5: hashed legacy-boundary markers. Tests compute expected
    // hashes inline so fixtures stay self-consistent.
    computeBoundaryHash,
} = hookModule;

function hashedBoundaryMarker(belowContent) {
    return `<!-- delivery-discipline: legacy-boundary hash=${computeBoundaryHash(belowContent)} -->`;
}

// Placeholder for the self-import below (resolved at module eval time).
let validatorModule;
let ORIGINAL_SKILL_MD_HASH;

// ---------------------------------------------------------------------------
// Validator core (exported-shape function, testable)
// ---------------------------------------------------------------------------

// Content-addressed legacy allowlist: pre-Phase-8 files whose CURRENT
// content is known-legacy. Each entry is sha256(file-content). When
// the file is edited, the hash changes, the allowlist no longer matches,
// and the validator enforces the discipline on the new state. To
// re-bless a file after intentional changes, update the hash here in a
// reviewed commit — that surfaces the change and forces explicit
// attention. Path-wide allowlisting (the previous approach) silently
// bypassed future edits; content-hash allowlisting does not.
export const LEGACY_CONTENT_HASHES = {
    // Updating these hashes requires a reviewed code change. If the
    // corresponding file is edited and a new attestation is added per
    // the skill, the allowlist entry can be dropped entirely.
    'SKILL.md': '79dff082973bb451db8fc0547b092fabee87b8429958239f7392b743dc73a9f2',
    'skills/vibe/SKILL.md': '3dc410fa6075e5995040dc8e1ccf1ac3ab9a6e65aabdd7ea82c6464eae4c5a05',
};

// Directory prefixes whose entire contents are out of scope regardless
// of per-file rules. Historical snapshots + gitignored private planning.
// Unlike content-hash allowlist, these stay path-wide because their
// whole purpose is "frozen history"; adding new files in them is
// intentionally unchecked.
const LEGACY_DIR_PREFIXES = [
    'archive/',
    'blueprints/private/',
];

// Boundary marker: files that contain both legacy content (below marker)
// and new content (above marker) use this marker to partition enforcement.
// Primary use case: CHANGELOG.md — pre-Phase-8 release notes below the
// marker are legacy; future release-note entries above the marker must
// include a Delivery Attestation block per the skill.
// The marker regex + extraction semantics live in the hook module
// (extractEnforceableContent, imported above) so hook and validator use
// the same definition by construction.

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

/**
 * Classify a file as legacy (skip) or enforceable. Requires content to
 * support content-hash allowlisting — pass the full file contents. A
 * bare path-wide check (directory prefix) is applied first; if that
 * doesn't match, we compute the sha256 hash and compare against
 * LEGACY_CONTENT_HASHES. If the hash differs from the allowlist value,
 * the file is considered edited since legacy-freeze and is enforced
 * normally (returns null).
 */
function classifySkip(relPath, content) {
    for (const prefix of LEGACY_DIR_PREFIXES) {
        if (relPath.startsWith(prefix)) return 'legacy-directory';
    }
    const expectedHash = LEGACY_CONTENT_HASHES[relPath];
    if (expectedHash !== undefined && typeof content === 'string') {
        const actualHash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
        if (actualHash === expectedHash) {
            return 'legacy-content-hash';
        }
        // Hash mismatch: file was edited since legacy-freeze. Do NOT skip.
        // The validator enforces normally; the caller can inspect
        // report.hashMismatches[] to see which allowlisted files drifted.
    }
    return null;
}

// `extractEnforceableContent` used below is imported from the hook
// module (top of this file) so write-time and CI-time enforcement
// share a single definition. The previous local copy was removed in
// fixup-4 to eliminate the drift risk surfaced by adversarial review.

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
// Self-import so tests can reach validator-side data (LEGACY_CONTENT_HASHES)
// by reference. This lets tests mutate the allowlist in tmp fixtures
// without touching real files. Real consumers never import this back.
validatorModule = { LEGACY_CONTENT_HASHES };
ORIGINAL_SKILL_MD_HASH = LEGACY_CONTENT_HASHES['SKILL.md'];

export function validateDeliveryHonesty(rootDir) {
    const scanned = [];
    const violations = [];
    const exempted = [];
    const legacy = [];
    const hashMismatches = [];
    const notDeliverable = [];

    for (const rel of listMarkdownFiles(rootDir)) {
        scanned.push(rel);

        // Read early — classifySkip needs content for hash allowlist.
        const filePath = path.join(rootDir, rel);
        let content;
        try {
            content = fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            violations.push({ file: rel, reason: `read-error: ${error.message}` });
            continue;
        }

        const legacyReason = classifySkip(rel, content);
        if (legacyReason !== null) {
            legacy.push({ file: rel, reason: legacyReason });
            continue;
        }

        // Hash-mismatch diagnostic: if the path is in LEGACY_CONTENT_HASHES
        // but the hash differs, surface that explicitly so reviewers see
        // "this was edited since legacy-freeze, now subject to enforcement".
        if (LEGACY_CONTENT_HASHES[rel] !== undefined) {
            hashMismatches.push(rel);
        }

        if (!matchesDeliverablePath(rel)) {
            notDeliverable.push(rel);
            continue;
        }

        // Split content around legacy-boundary marker. Only the
        // enforceable portion (above a VALID marker) is subject to
        // the discipline. If no marker or the marker is bare/drifted,
        // enforceable = full content (fail-closed).
        const {
            enforceable,
            hasBoundary,
            hashValid,
            reason: boundaryReason,
            expectedHash,
            actualHash,
        } = extractEnforceableContent(content);

        if (hasExemptionComment(enforceable)) {
            exempted.push(rel);
            continue;
        }

        if (!hasDeclaredClosureClaim(enforceable)) {
            continue; // new content has no closure claim → no enforcement
        }

        // Positional binding: each closure claim must have its own
        // attestation scoped to the text between this claim and the
        // next. Prevents stale/shared attestation bypass.
        if (!everyClosureHasBoundAttestation(enforceable)) {
            // Surface boundary-integrity diagnostics first: if the
            // marker was bare or its hash drifted, that IS the root
            // cause the reviewer needs to see in the CI log, not the
            // generic "add an attestation" message.
            let reason;
            if (hashValid === false && boundaryReason) {
                reason = boundaryReason; // 'legacy-boundary-without-hash' | 'legacy-boundary-hash-mismatch'
            } else if (hasBoundary) {
                reason = 'closure-claim-above-legacy-boundary-without-attestation';
            } else {
                reason = 'closure-claim-without-valid-attestation';
            }
            const entry = { file: rel, reason };
            if (reason === 'legacy-boundary-hash-mismatch') {
                entry.expectedHash = expectedHash;
                entry.actualHash = actualHash;
            }
            violations.push(entry);
        }
    }

    return {
        scannedCount: scanned.length,
        enforcedCount: scanned.length - notDeliverable.length - exempted.length - legacy.length,
        exemptedCount: exempted.length,
        legacyCount: legacy.length,
        hashMismatches,
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

    it('marks a file matching LEGACY_CONTENT_HASHES as legacy (content-hash pin)', () => {
        const dir = makeTempDir('vds-hash-');
        try {
            // Reproduce the exact content whose sha256 is in LEGACY_CONTENT_HASHES.
            // For the test we override LEGACY_CONTENT_HASHES semantically by
            // using a custom content whose hash we compute here and assert
            // against. The canonical hashes in the module are for the real
            // SKILL.md files; a tmp fixture would need its own hash. We
            // verify by ensuring a known fixture + known hash → legacy.
            const content = '# Legacy vibe-science meta-skill\n\n**Phase 7 is CLOSED.** No attestation.\n';
            const expected = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
            // Monkey-patch the hash for the test: add this path to the map.
            // (Real consumers never mutate the map; this is a test affordance.)
            validatorModule.LEGACY_CONTENT_HASHES['SKILL.md'] = expected;

            writeFile(dir, 'SKILL.md', content);
            const report = validateDeliveryHonesty(dir);
            assert.equal(report.violations.length, 0);
            assert.equal(report.legacyCount, 1);
            assert.equal(report.legacy[0].file, 'SKILL.md');
            assert.equal(report.legacy[0].reason, 'legacy-content-hash');
            assert.equal(report.exemptedCount, 0, 'must NOT trigger per-file exemption path');
            assert.equal(report.hashMismatches.length, 0, 'exact match must not be reported as mismatch');
        } finally {
            // Restore original hash so later tests see the real values.
            validatorModule.LEGACY_CONTENT_HASHES['SKILL.md'] = ORIGINAL_SKILL_MD_HASH;
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('ENFORCES (does not skip) a hash-allowlisted file whose content has drifted', () => {
        const dir = makeTempDir('vds-hashdrift-');
        try {
            // Path is in LEGACY_CONTENT_HASHES but content differs from the
            // pinned hash → validator enforces normally and records a
            // hash-mismatch diagnostic.
            writeFile(dir, 'SKILL.md',
                '# Edited vibe-science meta-skill\n\n**Phase 99 is CLOSED.** No attestation.\n');
            const report = validateDeliveryHonesty(dir);
            assert.equal(report.violations.length, 1,
                'hash mismatch means the file was edited since legacy-freeze; must be enforced');
            assert.match(report.violations[0].file, /SKILL\.md/u);
            assert.equal(report.legacyCount, 0, 'edited file is no longer legacy');
            assert.ok(report.hashMismatches.includes('SKILL.md'),
                'hashMismatches diagnostic must flag the drifted file');
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

    it('legacy-boundary marker (hashed): enforces content ABOVE marker, skips content BELOW', () => {
        const dir = makeTempDir('vds-boundary-');
        try {
            // New entry above marker = no closure claim, no attestation needed.
            // Legacy entries below = skipped entirely BECAUSE the hash matches.
            const below = '\n\n## v7.0 — TRACE\n\nPhase 6 is CLOSED. (legacy, no attestation)\n';
            writeFile(dir, 'changelog.md',
                '# Changelog\n\n## [Unreleased]\n\nPrepping next release.\n\n' +
                `${hashedBoundaryMarker(below)}${below}`);
            const report = validateDeliveryHonesty(dir);
            assert.equal(report.violations.length, 0,
                'closure claims below a valid hashed boundary are legacy and ignored');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('legacy-boundary marker (hashed): DENIES closure claim ABOVE the marker without attestation', () => {
        const dir = makeTempDir('vds-boundary-fail-');
        try {
            const below = '\n\n## v7.0\n\n(legacy below — not scanned)\n';
            writeFile(dir, 'changelog.md',
                '# Changelog\n\n## v7.1 SHIPPED\n\n**Result: PASSED**\nNo attestation.\n\n' +
                `${hashedBoundaryMarker(below)}${below}`);
            const report = validateDeliveryHonesty(dir);
            assert.equal(report.violations.length, 1,
                'closure claim above the boundary must require attestation');
            assert.equal(report.violations[0].reason,
                'closure-claim-above-legacy-boundary-without-attestation');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    // Fixup-5 P1: the exact bypass the 5th adversarial review reproduced.
    // Someone appends a new `## [8.0.0] SHIPPED` section below the
    // marker. Without the hash pin, both hook and validator would allow
    // it. With hash pin, the hash mismatches → full file is enforced →
    // the new closure claim below the (now-invalid) marker needs an
    // attestation and doesn't have one → violation with a specific
    // reason that tells the reviewer WHERE the problem is.
    it('fixup-5 P1: DENIES a CHANGELOG-shaped file with a new closure appended below the marker', () => {
        const dir = makeTempDir('vds-hash-drift-');
        try {
            const originalBelow = '\n\n## v7.0\n\nLegacy, no attestation.\n';
            const pinnedHash = computeBoundaryHash(originalBelow);
            // Tampered: appended `## [8.0.0]` + closure without updating pin.
            const tamperedBelow = originalBelow + '\n## [8.0.0]\n\nStatus: SHIPPED\n\nNo attestation.\n';
            writeFile(dir, 'changelog.md',
                '# Changelog\n\n## [Unreleased]\n\nPrep.\n\n' +
                `<!-- delivery-discipline: legacy-boundary hash=${pinnedHash} -->${tamperedBelow}`);
            const report = validateDeliveryHonesty(dir);
            assert.equal(report.violations.length, 1,
                'appending a closure below the marker must be detected via hash drift');
            assert.equal(report.violations[0].reason, 'legacy-boundary-hash-mismatch',
                'reason must pinpoint the boundary integrity issue');
            assert.equal(report.violations[0].expectedHash, pinnedHash);
            assert.ok(
                report.violations[0].actualHash && report.violations[0].actualHash !== pinnedHash,
                'actualHash must be present and different from expected',
            );
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('fixup-5 P1: DENIES a file with a BARE legacy-boundary marker (no hash) and a closure below', () => {
        const dir = makeTempDir('vds-bare-marker-');
        try {
            writeFile(dir, 'changelog.md',
                '# Changelog\n\n## [Unreleased]\n\n' +
                '<!-- delivery-discipline: legacy-boundary -->\n\n' +
                '## v7.0\n\n**Phase 7 is CLOSED.**\n');
            const report = validateDeliveryHonesty(dir);
            assert.equal(report.violations.length, 1,
                'bare marker must not grandfather below content under fixup-5');
            assert.equal(report.violations[0].reason, 'legacy-boundary-without-hash',
                'reason must tell the reviewer to convert the marker to hash-pinned form');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('fixup-5 P1: ALLOWS a bare marker file when there are NO closure claims anywhere', () => {
        // If no closure claim is declared anywhere, a bare marker is a
        // cosmetic no-op and the file is fine. Enforcement kicks in
        // only when there's something to enforce.
        const dir = makeTempDir('vds-bare-noclaim-');
        try {
            writeFile(dir, 'changelog.md',
                '# Changelog\n\n## [Unreleased]\n\nPrepping.\n\n' +
                '<!-- delivery-discipline: legacy-boundary -->\n\n' +
                'Historical context paragraph, no closure verdicts.\n');
            const report = validateDeliveryHonesty(dir);
            assert.equal(report.violations.length, 0,
                'no closure claim means no enforcement, bare marker or not');
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
            writeFile(dir, 'phase3-closeout.md',
                '<!-- delivery-discipline: exempt -->\n\n# Phase 3\n\n**Phase 3 is CLOSED.**\n');
            writeFile(dir, 'notes.md', '# Random prose without closure\n');

            const report = validateDeliveryHonesty(dir);
            assert.equal(report.violations.length, 1);
            assert.match(report.violations[0].file, /phase2-closeout/u);
            assert.equal(report.exemptedCount, 1, 'phase3 uses per-file exemption');
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
