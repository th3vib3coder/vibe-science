import crypto from 'node:crypto';
import { parseStructuredBlocks } from './structured-block-parser.js';
import { logSerendipitySeed } from './db.js';
import { normalizeClaimId } from './claim-ingestion.js';

const SEED_FILE_RE = /serendipity/i;
const SEED_STATUSES = ['PENDING_TRIAGE', 'QUEUED', 'TESTING', 'KILLED', 'PROMOTED_TO_CLAIM'];
const SEED_SOURCES = ['SCANNER', 'SALVAGED_FROM_R2', 'CROSS_BRANCH', 'USER'];

export function ingestSerendipitySeeds(db, payload) {
    const { sessionId, filePath = '', content = '' } = payload;
    if (!db || !sessionId || !SEED_FILE_RE.test(filePath) || !content) {
        return { inserted: 0, skipped: 0, warnings: [] };
    }

    const parsed = parseStructuredBlocks(content, { allowedTypes: ['seed'] });
    const candidates = parsed.blocks
        .filter(block => block.type === 'seed' && block.data)
        .map(block => toSeedFromBlock(block, sessionId, filePath));

    if (candidates.length === 0) {
        const fallback = toSeedFromFreeform(content, sessionId, filePath);
        if (fallback) candidates.push(fallback);
    }

    let inserted = 0;
    let skipped = 0;
    for (const seed of candidates) {
        if (!seed || !seed.seed_id || !seed.source) {
            skipped++;
            continue;
        }
        logSerendipitySeed(db, seed);
        inserted++;
    }

    return { inserted, skipped, warnings: parsed.warnings };
}

function toSeedFromBlock(block, sessionId, filePath) {
    const sourceClaimId = normalizeClaimId(block.data.source_claim_id);
    const causalQuestion = block.data.causal_question ?? null;
    const discriminatingTest = block.data.discriminating_test ?? null;
    const fallbackTest = block.data.fallback_test ?? null;
    const narrative = block.data.narrative ?? null;
    return {
        seed_id: block.data.seed_id || deriveSeedId({
            sessionId,
            filePath,
            sourceClaimId,
            causalQuestion,
            discriminatingTest,
            fallbackTest,
            narrative,
        }),
        created_session: sessionId,
        status: normalizeEnum(block.data.status, SEED_STATUSES) ?? 'PENDING_TRIAGE',
        source: normalizeEnum(block.data.source, SEED_SOURCES) ?? inferSource(block.data.narrative, sourceClaimId),
        score: normalizeNumber(block.data.score),
        causal_question: causalQuestion,
        discriminating_test: discriminatingTest,
        fallback_test: fallbackTest,
        narrative,
        source_claim_id: sourceClaimId,
        resolution: block.data.resolution ?? null,
        updated_at: new Date().toISOString(),
    };
}

function toSeedFromFreeform(content, sessionId, filePath) {
    const sourceClaimId = extractClaimId(content);
    const causalQuestion = extractField(content, 'causal_question') || extractSentence(content, /causal question[:=]?\s*/i);
    const discriminatingTest = extractField(content, 'discriminating_test');
    const fallbackTest = extractField(content, 'fallback_test');
    const source = inferSource(content, sourceClaimId);

    if (!causalQuestion && !sourceClaimId && !/serendipity|salvaged_from_r2/i.test(content)) {
        return null;
    }

    return {
        seed_id: deriveSeedId({
            sessionId,
            filePath,
            sourceClaimId,
            causalQuestion,
            discriminatingTest,
            fallbackTest,
            narrative: summarizeNarrative(content),
        }),
        created_session: sessionId,
        status: 'PENDING_TRIAGE',
        source,
        score: normalizeNumber(extractField(content, 'score')),
        causal_question: causalQuestion ?? null,
        discriminating_test: discriminatingTest ?? null,
        fallback_test: fallbackTest ?? null,
        narrative: summarizeNarrative(content),
        source_claim_id: sourceClaimId,
        updated_at: new Date().toISOString(),
    };
}

function inferSource(content, sourceClaimId) {
    if (sourceClaimId || /SALVAGED_FROM_R2|salvage(?:d| rule)?|killed claim/i.test(String(content || ''))) {
        return 'SALVAGED_FROM_R2';
    }
    return 'USER';
}

function deriveSeedId({ sessionId, filePath, sourceClaimId, causalQuestion, discriminatingTest, fallbackTest, narrative }) {
    const semanticParts = [
        sessionId,
        sourceClaimId,
        normalizeText(causalQuestion),
        normalizeText(discriminatingTest),
        normalizeText(fallbackTest),
    ].filter(Boolean);

    if (semanticParts.length > 1) {
        return makeStableId('SEED', ...semanticParts);
    }

    const narrativeKey = normalizeText(narrative);
    if (narrativeKey) {
        return makeStableId('SEED', sessionId, narrativeKey);
    }

    return makeStableId('SEED', sessionId, filePath);
}

function normalizeEnum(value, allowed) {
    if (value == null) return null;
    const normalized = String(value).trim().toUpperCase();
    return allowed.includes(normalized) ? normalized : null;
}

function normalizeNumber(value) {
    if (value == null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function extractField(content, fieldName) {
    const regex = new RegExp(`${fieldName}\\s*[:=]\\s*([^\\r\\n]+)`, 'i');
    const match = String(content || '').match(regex);
    return match ? match[1].trim() : null;
}

function extractSentence(content, prefixRegex) {
    const text = String(content || '');
    const start = text.search(prefixRegex);
    if (start < 0) return null;
    const after = text.slice(start).replace(prefixRegex, '');
    return after.split(/\r?\n|[.](?:\s|$)/)[0].trim() || null;
}

function extractClaimId(content) {
    const match = String(content || '').match(/\bC-?\d+\b|\bCLAIM-\d+\b/i);
    return match ? normalizeClaimId(match[0]) : null;
}

function summarizeNarrative(content) {
    const text = String(content || '').trim().replace(/\s+/g, ' ');
    return text ? text.slice(0, 500) : null;
}

function normalizeText(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function makeStableId(prefix, ...parts) {
    const digest = crypto
        .createHash('sha1')
        .update(parts.filter(Boolean).join('|'))
        .digest('hex')
        .slice(0, 12)
        .toUpperCase();
    return `${prefix}-${digest}`;
}
