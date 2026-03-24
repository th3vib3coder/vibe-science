/**
 * Vibe Science TRACE — Structured block parser foundation
 *
 * Shared parser for embedded fenced blocks:
 *   ```vibe-claim
 *   ```vibe-seed
 *   ```vibe-review
 *
 * v7 tolerance policy:
 *   - accept canonical tags
 *   - accept claim/seed/review aliases with warning
 *   - ignore extra fields
 *   - normalize optional known fields to null
 *   - never throw on malformed YAML; return warnings/errors instead
 *
 * Export: BLOCK_TAGS, parseStructuredBlocks, parseStructuredBlock,
 *         canonicalizeBlockTag, normalizeStructuredBlock
 */

export const BLOCK_TAGS = Object.freeze({
    claim: {
        canonicalTag: 'vibe-claim',
        aliases: ['claim'],
        knownFields: ['id', 'claim_id', 'event_type', 'event', 'confidence', 'confounder_status', 'old_status', 'new_status', 'r2_verdict', 'kill_reason', 'gate_id', 'narrative'],
        normalizedFields: ['id', 'event_type', 'confidence', 'confounder_status', 'old_status', 'new_status', 'r2_verdict', 'kill_reason', 'gate_id', 'narrative']
    },
    seed: {
        canonicalTag: 'vibe-seed',
        aliases: ['seed'],
        knownFields: ['seed_id', 'id', 'source', 'source_claim_id', 'score', 'causal_question', 'discriminating_test', 'fallback_test', 'narrative', 'status', 'resolution'],
        normalizedFields: ['seed_id', 'source', 'source_claim_id', 'score', 'causal_question', 'discriminating_test', 'fallback_test', 'narrative', 'status', 'resolution']
    },
    review: {
        canonicalTag: 'vibe-review',
        aliases: ['review'],
        knownFields: ['review_id', 'id', 'review_mode', 'mode', 'claims_reviewed', 'j0_score', 'j0_dimensions', 'sfi_injected', 'sfi_caught', 'sfi_missed', 'r2_weaknesses', 'narrative'],
        normalizedFields: ['review_id', 'review_mode', 'claims_reviewed', 'j0_score', 'j0_dimensions', 'sfi_injected', 'sfi_caught', 'sfi_missed', 'r2_weaknesses', 'narrative']
    }
});

/**
 * Resolve a block tag to canonical type/tag info.
 *
 * @param {string} rawTag
 * @returns {{ type: 'claim'|'seed'|'review', canonicalTag: string, originalTag: string, aliasUsed: boolean } | null}
 */
export function canonicalizeBlockTag(rawTag) {
    const tag = String(rawTag || '').trim().toLowerCase().split(/\s+/)[0];
    for (const [type, config] of Object.entries(BLOCK_TAGS)) {
        if (tag === config.canonicalTag) {
            return { type, canonicalTag: config.canonicalTag, originalTag: tag, aliasUsed: false };
        }
        if (config.aliases.includes(tag)) {
            return { type, canonicalTag: config.canonicalTag, originalTag: tag, aliasUsed: true };
        }
    }
    return null;
}

/**
 * Parse all recognized structured blocks from a text blob.
 *
 * @param {string} text
 * @param {{ allowedTypes?: Array<'claim'|'seed'|'review'> }} [options]
 * @returns {{ blocks: object[], warnings: string[] }}
 */
export function parseStructuredBlocks(text, options = {}) {
    const source = String(text || '');
    const warnings = [];
    const blocks = [];
    const lines = source.split(/\r?\n/);

    for (let index = 0; index < lines.length; index++) {
        const openMatch = lines[index].match(/^```([^\r\n]+?)\s*$/);
        if (!openMatch) continue;

        const rawTag = openMatch[1];
        const canonical = canonicalizeBlockTag(rawTag);
        if (!canonical) continue;

        let closeIndex = -1;
        for (let cursor = index + 1; cursor < lines.length; cursor++) {
            if (/^```\s*$/.test(lines[cursor])) {
                closeIndex = cursor;
                break;
            }
        }

        if (closeIndex === -1) {
            warnings.push(`Unclosed ${canonical.canonicalTag} block starting at line ${index + 1}.`);
            continue;
        }

        if (Array.isArray(options.allowedTypes) && !options.allowedTypes.includes(canonical.type)) {
            warnings.push(`Ignoring ${canonical.canonicalTag} block because it is not allowed in this parse context.`);
            index = closeIndex;
            continue;
        }

        const body = lines.slice(index + 1, closeIndex).join('\n');
        const parsed = parseStructuredBlock(rawTag, body, { lineStart: index + 1 });
        blocks.push(parsed);
        warnings.push(...parsed.warnings);
        index = closeIndex;
    }

    return { blocks, warnings };
}

/**
 * Parse a single structured block body.
 *
 * @param {string} rawTag
 * @param {string} yamlText
 * @param {{ lineStart?: number }} [options]
 * @returns {object}
 */
export function parseStructuredBlock(rawTag, yamlText, options = {}) {
    const canonical = canonicalizeBlockTag(rawTag);
    if (!canonical) {
        return {
            type: null,
            canonicalTag: null,
            originalTag: String(rawTag || ''),
            aliasUsed: false,
            data: null,
            raw: null,
            warnings: [`Unknown structured block tag: ${rawTag}`],
            error: `Unknown structured block tag: ${rawTag}`,
            lineStart: options.lineStart ?? null
        };
    }

    const warnings = [];
    if (canonical.aliasUsed) {
        warnings.push(`Alias tag "${canonical.originalTag}" accepted for ${canonical.canonicalTag} in v7 compatibility mode.`);
    }

    const yamlResult = parseSimpleYaml(yamlText);
    if (yamlResult.error) {
        warnings.push(`${canonical.canonicalTag} block YAML malformed: ${yamlResult.error}`);
        return {
            type: canonical.type,
            canonicalTag: canonical.canonicalTag,
            originalTag: canonical.originalTag,
            aliasUsed: canonical.aliasUsed,
            data: null,
            raw: null,
            warnings,
            error: yamlResult.error,
            lineStart: options.lineStart ?? null
        };
    }

    const normalized = normalizeStructuredBlock(canonical.type, yamlResult.data);
    warnings.push(...normalized.warnings);

    return {
        type: canonical.type,
        canonicalTag: canonical.canonicalTag,
        originalTag: canonical.originalTag,
        aliasUsed: canonical.aliasUsed,
        data: normalized.data,
        raw: yamlResult.data,
        extraFields: normalized.extraFields,
        warnings,
        error: null,
        lineStart: options.lineStart ?? null
    };
}

/**
 * Normalize a parsed block into its canonical v7 shape.
 *
 * @param {'claim'|'seed'|'review'} type
 * @param {Record<string, any>} rawData
 * @returns {{ data: Record<string, any>, warnings: string[], extraFields: string[] }}
 */
export function normalizeStructuredBlock(type, rawData = {}) {
    const config = BLOCK_TAGS[type];
    if (!config) {
        return { data: { ...rawData }, warnings: [`Unknown block type: ${type}`], extraFields: Object.keys(rawData || {}) };
    }

    const warnings = [];
    const data = {};

    if (type === 'claim') {
        data.id = rawData.id ?? rawData.claim_id ?? null;
        data.event_type = rawData.event_type ?? rawData.event ?? null;
        data.confidence = rawData.confidence ?? null;
        data.confounder_status = rawData.confounder_status ?? null;
        data.old_status = rawData.old_status ?? null;
        data.new_status = rawData.new_status ?? null;
        data.r2_verdict = rawData.r2_verdict ?? null;
        data.kill_reason = rawData.kill_reason ?? null;
        data.gate_id = rawData.gate_id ?? null;
        data.narrative = rawData.narrative ?? null;
    } else if (type === 'seed') {
        data.seed_id = rawData.seed_id ?? rawData.id ?? null;
        data.source = rawData.source ?? null;
        data.source_claim_id = rawData.source_claim_id ?? null;
        data.score = rawData.score ?? null;
        data.causal_question = rawData.causal_question ?? null;
        data.discriminating_test = rawData.discriminating_test ?? null;
        data.fallback_test = rawData.fallback_test ?? null;
        data.narrative = rawData.narrative ?? null;
        data.status = rawData.status ?? null;
        data.resolution = rawData.resolution ?? null;
    } else if (type === 'review') {
        data.review_id = rawData.review_id ?? rawData.id ?? null;
        data.review_mode = rawData.review_mode ?? rawData.mode ?? null;
        data.claims_reviewed = normalizeArray(rawData.claims_reviewed);
        data.j0_score = rawData.j0_score ?? null;
        data.j0_dimensions = rawData.j0_dimensions ?? null;
        data.sfi_injected = rawData.sfi_injected ?? null;
        data.sfi_caught = rawData.sfi_caught ?? null;
        data.sfi_missed = normalizeArray(rawData.sfi_missed);
        data.r2_weaknesses = normalizeArray(rawData.r2_weaknesses);
        data.narrative = rawData.narrative ?? null;
    }

    const extraFields = Object.keys(rawData).filter(key => !config.knownFields.includes(key));
    if (extraFields.length > 0) {
        warnings.push(`Ignoring extra fields in ${config.canonicalTag}: ${extraFields.join(', ')}`);
    }

    return { data, warnings, extraFields };
}

function normalizeArray(value) {
    if (value == null) return null;
    if (Array.isArray(value)) return value;
    return [value];
}

function parseSimpleYaml(yamlText) {
    const lines = String(yamlText || '').replace(/\t/g, '    ').split(/\r?\n/);
    const data = {};
    let currentKey = null;
    let expectingList = false;

    for (let index = 0; index < lines.length; index++) {
        const rawLine = lines[index];
        const line = rawLine.trim();

        if (!line || line.startsWith('#')) continue;

        const keyMatch = rawLine.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
        if (keyMatch) {
            const [, key, valuePart = ''] = keyMatch;
            currentKey = key;
            expectingList = valuePart === '';
            if (expectingList) {
                data[key] = null;
            } else {
                data[key] = parseScalar(valuePart);
            }
            continue;
        }

        const listMatch = rawLine.match(/^\s*-\s*(.*)$/);
        if (listMatch && currentKey) {
            if (!Array.isArray(data[currentKey])) {
                data[currentKey] = [];
            }
            data[currentKey].push(parseScalar(listMatch[1]));
            expectingList = false;
            continue;
        }

        if (expectingList) {
            return { data: null, error: `Expected list item after key "${currentKey}" at line ${index + 1}` };
        }

        return { data: null, error: `Cannot parse line ${index + 1}: ${line}` };
    }

    return { data, error: null };
}

function parseScalar(value) {
    const trimmed = String(value).trim();
    if (trimmed === '') return null;
    if (trimmed === 'null') return null;
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith('\'') && trimmed.endsWith('\''))) {
        return trimmed.slice(1, -1);
    }
    if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
        return Number(trimmed);
    }
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const inner = trimmed.slice(1, -1).trim();
        if (!inner) return [];
        return inner.split(',').map(part => parseScalar(part.trim()));
    }
    return trimmed;
}
