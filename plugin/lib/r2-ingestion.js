import crypto from 'node:crypto';
import { parseStructuredBlocks } from './structured-block-parser.js';
import { logClaimEvent, logR2Review } from './db.js';
import { normalizeClaimId } from './claim-ingestion.js';

const REVIEW_FILE_RE =
    /(?:^|[\\/])05-reviewer2(?:[\\/]|$)|(?:^|[\\/])(reviewer-?2|r2)(?:[\\/]|$)|(?:^|[\\/])(?:r2[-_.]?(review|report)|review[-_.]?r2|reviewer2[-_.]?(review|report))\.(md|txt|json|ya?ml)$/i;
const REVIEW_MODES = ['INLINE', 'FORCED', 'BATCH', 'SHADOW', 'BRAINSTORM'];

export function ingestR2Reviews(db, payload) {
    const { sessionId, filePath = '', content = '' } = payload;
    if (!db || !sessionId || !REVIEW_FILE_RE.test(filePath) || !content) {
        return { inserted: 0, skipped: 0, warnings: [] };
    }

    const parsed = parseStructuredBlocks(content, { allowedTypes: ['review'] });
    const candidates = parsed.blocks
        .filter(block => block.type === 'review' && block.data)
        .map(block => toReviewFromBlock(block, sessionId, filePath));

    if (candidates.length === 0) {
        for (const segment of splitFreeformReviewSegments(content)) {
            const fallback = toReviewFromFreeform(segment, sessionId, filePath);
            if (fallback) candidates.push(fallback);
        }
    }

    let inserted = 0;
    let skipped = 0;
    for (const review of candidates) {
        if (!review || !review.review_id) {
            skipped++;
            continue;
        }
        logR2Review(db, review);
        mirrorClaimReviewEvents(db, review);
        inserted++;
    }

    return { inserted, skipped, warnings: parsed.warnings };
}

function toReviewFromBlock(block, sessionId, filePath) {
    const claimsReviewed = normalizeClaimIds(block.data.claims_reviewed);
    const reviewMode = normalizeEnum(block.data.review_mode, REVIEW_MODES) ?? inferReviewMode(filePath, block.data.narrative);
    const j0Score = normalizeNumber(block.data.j0_score);
    const sfiInjected = normalizeNumber(block.data.sfi_injected);
    const sfiCaught = normalizeNumber(block.data.sfi_caught);
    return {
        review_id: block.data.review_id || deriveReviewId({
            sessionId,
            filePath,
            claimsReviewed,
            reviewMode,
            j0Score,
            sfiInjected,
            sfiCaught,
        }),
        session_id: sessionId,
        review_mode: reviewMode,
        claims_reviewed: claimsReviewed,
        j0_score: j0Score,
        j0_dimensions: block.data.j0_dimensions ?? null,
        sfi_injected: sfiInjected,
        sfi_caught: sfiCaught,
        sfi_missed: normalizeStringArray(block.data.sfi_missed),
        r2_weaknesses: normalizeStringArray(block.data.r2_weaknesses),
        narrative: block.data.narrative ?? null,
    };
}

function toReviewFromFreeform(content, sessionId, filePath) {
    const claimsReviewed = extractAllClaimIds(content);
    const hasReviewSignal = /review|reviewer ?2|\br2\b|j0|weakness|sfi/i.test(content);
    if (!hasReviewSignal) return null;
    const reviewMode = inferReviewMode(filePath, content);
    const j0Score = normalizeNumber(extractField(content, 'j0_score') || extractField(content, 'j0'));
    const sfiInjected = normalizeNumber(extractField(content, 'sfi_injected'));
    const sfiCaught = normalizeNumber(extractField(content, 'sfi_caught'));

    return {
        review_id: deriveReviewId({
            sessionId,
            filePath,
            claimsReviewed,
            reviewMode,
            j0Score,
            sfiInjected,
            sfiCaught,
        }),
        session_id: sessionId,
        review_mode: reviewMode,
        claims_reviewed: claimsReviewed,
        j0_score: j0Score,
        j0_dimensions: null,
        sfi_injected: sfiInjected,
        sfi_caught: sfiCaught,
        sfi_missed: [],
        r2_weaknesses: extractWeaknesses(content),
        narrative: summarizeNarrative(content),
    };
}

function splitFreeformReviewSegments(content) {
    const text = String(content || '');
    const lines = text.split(/\r?\n/);
    const headingIndexes = [];

    for (let index = 0; index < lines.length; index++) {
        if (isReviewHeadingLine(lines[index])) {
            headingIndexes.push(index);
        }
    }

    if (headingIndexes.length <= 1) {
        return [text];
    }

    const segments = [];
    for (let idx = 0; idx < headingIndexes.length; idx++) {
        const start = headingIndexes[idx];
        const end = idx + 1 < headingIndexes.length ? headingIndexes[idx + 1] : lines.length;
        const segment = lines.slice(start, end).join('\n').trim();
        if (segment) segments.push(segment);
    }

    return segments.length > 0 ? segments : [text];
}

function inferReviewMode(filePath, content) {
    const combined = `${filePath} ${content}`.toUpperCase();
    for (const mode of REVIEW_MODES) {
        if (combined.includes(mode)) return mode;
    }
    return 'INLINE';
}

function deriveReviewId({ sessionId, filePath, claimsReviewed, reviewMode, j0Score, sfiInjected, sfiCaught }) {
    const semanticParts = [
        sessionId,
        claimsReviewed.join(','),
        reviewMode,
        j0Score ?? '',
        sfiInjected ?? '',
        sfiCaught ?? '',
    ].filter(part => part !== '');

    if (semanticParts.length > 1) {
        return makeStableId('REV', ...semanticParts);
    }

    return makeStableId('REV', sessionId, filePath, reviewMode);
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

function normalizeClaimIds(value) {
    return normalizeStringArray(value)
        .map(normalizeClaimId)
        .filter(Boolean);
}

function normalizeStringArray(value) {
    if (value == null) return [];
    const arr = Array.isArray(value) ? value : [value];
    return arr
        .map(item => String(item).trim())
        .filter(Boolean);
}

function extractField(content, fieldName) {
    const regex = new RegExp(`${fieldName}\\s*[:=]\\s*([^\\r\\n]+)`, 'i');
    const match = String(content || '').match(regex);
    return match ? match[1].trim() : null;
}

function extractAllClaimIds(content) {
    const text = String(content || '');
    // Prefer explicit claims_reviewed field if present (avoids capturing incidental mentions)
    const fieldMatch = text.match(/claims_reviewed\s*[:=]\s*\[?([^\]\n]+)\]?/i);
    if (fieldMatch) {
        const ids = [...fieldMatch[1].matchAll(/\bC-?\d+\b|\bCLAIM-\d+\b/gi)]
            .map(m => normalizeClaimId(m[0]))
            .filter(Boolean);
        if (ids.length > 0) return [...new Set(ids)];
    }

    // Prefer a claim ID anchored in a review heading / lead sentence.
    for (const line of text.split(/\r?\n/)) {
        const headingMatch = line.match(/^\s*(?:#+\s*)?(?:r2\s+)?review(?:\s+for|\s*:)?\s*(C-?\d+|CLAIM-\d+)\b/i);
        if (headingMatch) {
            const normalized = normalizeClaimId(headingMatch[1]);
            if (normalized) return [normalized];
        }
    }

    // Conservative fallback: only auto-attribute when exactly one unique claim
    // is mentioned. Multiple mentions are ambiguous and should not mirror review
    // events into unrelated claims.
    const mentions = [...text.matchAll(/\bC-?\d+\b|\bCLAIM-\d+\b/gi)]
        .map(match => normalizeClaimId(match[0]))
        .filter((value, index, arr) => value && arr.indexOf(value) === index);
    return mentions.length === 1 ? mentions : [];
}

function isReviewHeadingLine(line) {
    return /^\s*(?:#+\s*)?(?:r2\s+)?review(?:\s+for|\s*:)?\s*(?:C-?\d+|CLAIM-\d+)\b/i.test(String(line || ''));
}

function extractWeaknesses(content) {
    const lines = String(content || '').split(/\r?\n/);
    const weaknesses = [];
    for (const line of lines) {
        if (/weakness|issue|concern|artifact/i.test(line) && /^[-*]\s+/.test(line.trim())) {
            weaknesses.push(line.replace(/^[-*]\s+/, '').trim());
        }
    }
    return weaknesses;
}

function summarizeNarrative(content) {
    const text = String(content || '').trim().replace(/\s+/g, ' ');
    return text ? text.slice(0, 500) : null;
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

function mirrorClaimReviewEvents(db, review) {
    const claimsReviewed = Array.isArray(review?.claims_reviewed) ? review.claims_reviewed : [];
    const narrative = review?.narrative
        ? `[R2 REVIEW ${review.review_id}] ${review.narrative}`.slice(0, 500)
        : `[R2 REVIEW ${review.review_id}] ${review.review_mode || 'INLINE'} review recorded`;

    for (const claimId of claimsReviewed) {
        if (!claimId) continue;
        if (hasMirroredReviewEvent(db, review.session_id, claimId, review.review_id)) {
            continue;
        }
        logClaimEvent(db, {
            claim_id: claimId,
            session_id: review.session_id,
            event_type: 'R2_REVIEWED',
            narrative,
        });
    }
}

function hasMirroredReviewEvent(db, sessionId, claimId, reviewId) {
    try {
        const row = db.prepare(`
            SELECT 1
            FROM claim_events
            WHERE session_id = ?
              AND claim_id = ?
              AND event_type = 'R2_REVIEWED'
              AND narrative LIKE ?
            LIMIT 1
        `).get(sessionId, claimId, `%${reviewId}%`);
        return Boolean(row);
    } catch {
        return false;
    }
}
