// Phase 8 Wave 1 — static test for the delivery-discipline skill file.
//
// Validates:
//   1. SKILL.md exists at the expected path.
//   2. Frontmatter parses and contains ONLY `name` + `description`.
//   3. `name` is exactly "delivery-discipline".
//   4. `description` is a non-empty string starting with "Use when".
//   5. Body declares all 4 rules.
//   6. Body contains a `## Delivery Attestation` section (case-insensitive).
//   7. Body contains a rationalization table.
//   8. The first fenced json block under the attestation heading parses as
//      valid JSON with the 4 required fields.
//
// Schema-shape validation (minItems, minLength, enum) is deferred to Wave 3
// when `delivery-attestation.schema.json` ships. This Wave 1 test only
// confirms the skill file is well-formed and self-consistent.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SKILL_PATH = path.join(
    ROOT,
    '.claude',
    'skills',
    'delivery-discipline',
    'SKILL.md',
);

function readSkill() {
    return fs.readFileSync(SKILL_PATH, 'utf8');
}

function extractFrontmatter(source) {
    const match = source.match(/^---\n([\s\S]*?)\n---\n/u);
    if (!match) return null;
    const block = match[1];
    const pairs = {};
    for (const rawLine of block.split('\n')) {
        if (rawLine.trim() === '') continue;
        const pairMatch = rawLine.match(/^\s*([a-zA-Z0-9_-]+):\s*(.*)$/u);
        if (!pairMatch) {
            throw new Error(`Unsupported frontmatter line: ${rawLine}`);
        }
        const [, key, rawValue] = pairMatch;
        pairs[key] = rawValue;
    }
    return pairs;
}

function extractAttestationJson(source) {
    // Find first `## Delivery Attestation` heading (case-insensitive, ## or ###).
    const headingMatch = source.match(/^#{2,3}\s+delivery\s+attestation\s*$/imu);
    if (!headingMatch) return null;
    const afterHeading = source.slice(headingMatch.index + headingMatch[0].length);
    // Find first fenced ```json block in the remaining text.
    const fenceMatch = afterHeading.match(/```(?:json)?\s*\n([\s\S]*?)\n```/u);
    if (!fenceMatch) return null;
    return fenceMatch[1];
}

describe('delivery-discipline skill file', () => {
    it('exists at .claude/skills/delivery-discipline/SKILL.md', () => {
        assert.ok(fs.existsSync(SKILL_PATH), `missing ${SKILL_PATH}`);
    });

    it('has a parseable frontmatter with only name + description', () => {
        const source = readSkill();
        const frontmatter = extractFrontmatter(source);
        assert.ok(frontmatter, 'frontmatter block not found');
        const keys = Object.keys(frontmatter).sort();
        assert.deepEqual(
            keys,
            ['description', 'name'],
            `frontmatter must contain exactly name + description, got: ${keys.join(',')}`,
        );
    });

    it('declares name = "delivery-discipline"', () => {
        const frontmatter = extractFrontmatter(readSkill());
        assert.equal(frontmatter.name, 'delivery-discipline');
    });

    it('declares a non-empty description starting with "Use when"', () => {
        const frontmatter = extractFrontmatter(readSkill());
        assert.ok(
            typeof frontmatter.description === 'string' && frontmatter.description.length > 0,
            'description must be a non-empty string',
        );
        assert.match(
            frontmatter.description,
            /^Use when/u,
            'description must start with "Use when" per skill authoring convention',
        );
    });

    it('body contains all 4 non-negotiable rule markers', () => {
        const source = readSkill();
        for (const marker of ['Rule 1', 'Rule 2', 'Rule 3', 'Rule 4']) {
            assert.match(
                source,
                new RegExp(`###?\\s+${marker}\\b`, 'u'),
                `rule marker "${marker}" missing from skill body`,
            );
        }
    });

    it('body contains the attestation section heading', () => {
        const source = readSkill();
        assert.match(
            source,
            /^#{2,3}\s+delivery\s+attestation\s*$/imu,
            'missing "## Delivery Attestation" heading in skill body',
        );
    });

    it('body contains a rationalization table', () => {
        const source = readSkill();
        assert.match(
            source,
            /rationalization table/iu,
            'skill must contain a rationalization table to close agent excuses',
        );
    });

    it('attestation example JSON parses to an object with the 4 required fields', () => {
        const source = readSkill();
        const rawJson = extractAttestationJson(source);
        assert.ok(rawJson, 'no fenced json block found under Delivery Attestation heading');

        let parsed;
        try {
            parsed = JSON.parse(rawJson);
        } catch (error) {
            assert.fail(`attestation example JSON did not parse: ${error.message}`);
        }

        assert.equal(typeof parsed, 'object', 'attestation must be an object');
        for (const field of ['covered', 'scope_cuts', 'self_review_findings', 'external_review_status']) {
            assert.ok(
                Object.prototype.hasOwnProperty.call(parsed, field),
                `attestation example is missing required field "${field}"`,
            );
        }
        assert.ok(
            Array.isArray(parsed.covered) && parsed.covered.length >= 1,
            'covered must be a non-empty array in the example',
        );
        assert.ok(
            Array.isArray(parsed.self_review_findings) && parsed.self_review_findings.length >= 3,
            'self_review_findings must have at least 3 items in the example',
        );
        assert.ok(
            ['pending', 'cleared', 'blocked'].includes(parsed.external_review_status),
            `external_review_status must be pending|cleared|blocked, got ${parsed.external_review_status}`,
        );
    });

    it('references the enforcement layer (hook / validator / governance)', () => {
        const source = readSkill();
        // Soft link to the rest of Phase 8 so future maintainers understand
        // the skill is one leg of a three-legged enforcement pattern.
        assert.match(
            source,
            /hook|validator|governance/iu,
            'skill should reference the hook/validator/governance-event enforcement layer',
        );
    });
});
