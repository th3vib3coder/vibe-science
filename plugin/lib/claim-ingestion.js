import { parseStructuredBlocks } from './structured-block-parser.js';
import { logClaimEvent } from './db.js';

const CLAIM_FILE_RE = /claim-ledger/i;
const CLAIM_ID_RE = /\bC-?(\d+)\b|\bCLAIM-(\d+)\b/gi;
const EVENT_TYPES = ['CREATED', 'PROMOTED', 'KILLED', 'DISPUTED', 'R2_REVIEWED', 'VERIFIED'];
const KILL_REASONS = ['INSUFFICIENT_EVIDENCE', 'CONFOUNDED', 'ARTIFACT', 'LOGICALLY_FALSE', 'PREMATURE'];
const R2_VERDICTS = ['ACCEPT', 'REJECT', 'DEFER'];

export function ingestClaimEvents(db, payload) {
    const { sessionId, filePath = '', content = '' } = payload;
    if (!db || !sessionId || !CLAIM_FILE_RE.test(filePath) || !content) {
        return { inserted: 0, skipped: 0, warnings: [] };
    }

    const parsed = parseStructuredBlocks(content, { allowedTypes: ['claim'] });
    const candidates = parsed.blocks
        .filter(block => block.type === 'claim' && block.data)
        .map(block => toClaimEventFromBlock(block, sessionId));

    if (candidates.length === 0) {
        const fallback = toClaimEventFromFreeform(content, sessionId);
        if (fallback) candidates.push(fallback);
    }

    let inserted = 0;
    let skipped = 0;
    for (const event of candidates) {
        if (!event || !event.claim_id || !event.event_type) {
            skipped++;
            continue;
        }

        if (shouldSkipClaimEvent(db, event)) {
            skipped++;
            continue;
        }

        logClaimEvent(db, event);
        inserted++;
    }

    return { inserted, skipped, warnings: parsed.warnings };
}

export function normalizeClaimId(value) {
    if (!value) return null;
    const raw = String(value).trim().toUpperCase();
    const compact = raw.match(/^C-?(\d+)$/);
    if (compact) {
        const digits = compact[1].padStart(3, '0');
        return `C-${digits}`;
    }
    const legacy = raw.match(/^CLAIM-(\d+)$/);
    if (legacy) return `CLAIM-${legacy[1]}`;
    return raw;
}

/**
 * Extract the claim IDs that are actually being written in ledger content.
 *
 * Priority:
 *   1. structured vibe-claim blocks (canonical source of truth)
 *   2. freeform ledger lines that begin with a claim ID
 *   3. first claim-like token as a last resort
 *
 * This avoids gating incidental references like "extends C-001" as if the
 * user were editing claim C-001.
 *
 * @param {string} content
 * @returns {string[]}
 */
export function extractClaimIdsForWrite(content) {
    const text = String(content || '');
    if (!text.trim()) return [];

    const parsed = parseStructuredBlocks(text, { allowedTypes: ['claim'] });
    const structuredIds = parsed.blocks
        .filter(block => block.type === 'claim' && block.data?.id)
        .map(block => normalizeClaimId(block.data.id))
        .filter(Boolean);

    if (structuredIds.length > 0) {
        return [...new Set(structuredIds)];
    }

    const lineScopedIds = new Set();
    for (const line of text.split(/\r?\n/)) {
        const match = line.match(/^\s*(?:[-*+]\s*)?(C-?\d+|CLAIM-\d+)\b(?:\s*[:|-]|\s+)/i);
        if (match) {
            lineScopedIds.add(normalizeClaimId(match[1]));
        }
    }
    if (lineScopedIds.size > 0) {
        return [...lineScopedIds];
    }

    const fallbackId = extractFirstClaimId(text);
    return fallbackId ? [fallbackId] : [];
}

function toClaimEventFromBlock(block, sessionId) {
    const claimId = normalizeClaimId(block.data.id);
    const eventType = normalizeEventType(block.data.event_type);
    return {
        claim_id: claimId,
        session_id: sessionId,
        event_type: eventType,
        old_status: block.data.old_status ?? null,
        new_status: block.data.new_status ?? inferNewStatus(eventType),
        confidence: normalizeNumber(block.data.confidence),
        r2_verdict: normalizeEnum(block.data.r2_verdict, R2_VERDICTS),
        kill_reason: normalizeEnum(block.data.kill_reason, KILL_REASONS),
        gate_id: block.data.gate_id ?? null,
        narrative: block.data.narrative ?? null,
    };
}

function toClaimEventFromFreeform(content, sessionId) {
    const claimId = extractFirstClaimId(content);
    if (!claimId) return null;

    const eventType = inferEventType(content);
    return {
        claim_id: claimId,
        session_id: sessionId,
        event_type: eventType,
        old_status: null,
        new_status: inferNewStatus(eventType),
        confidence: extractNumberField(content, 'confidence'),
        r2_verdict: extractEnum(content, /(ACCEPT|REJECT|DEFER)/gi, R2_VERDICTS),
        kill_reason: extractEnum(content, new RegExp(`\\b(${KILL_REASONS.join('|')})\\b`, 'gi'), KILL_REASONS),
        gate_id: extractTextField(content, 'gate_id'),
        narrative: summarizeNarrative(content),
    };
}

function shouldSkipClaimEvent(db, event) {
    try {
        const latest = db.prepare(`
            SELECT event_type, old_status, new_status, confidence, r2_verdict, kill_reason, gate_id, narrative
            FROM claim_events
            WHERE claim_id = ?
            ORDER BY timestamp DESC
            LIMIT 1
        `).get(event.claim_id);

        if (!latest) return false;

        return (
            latest.event_type === event.event_type &&
            normalizeNullable(latest.old_status) === normalizeNullable(event.old_status) &&
            normalizeNullable(latest.new_status) === normalizeNullable(event.new_status) &&
            normalizeNullable(latest.r2_verdict) === normalizeNullable(event.r2_verdict) &&
            normalizeNullable(latest.kill_reason) === normalizeNullable(event.kill_reason) &&
            normalizeNullable(latest.gate_id) === normalizeNullable(event.gate_id) &&
            normalizeNullable(latest.narrative) === normalizeNullable(event.narrative) &&
            normalizeNumber(latest.confidence) === normalizeNumber(event.confidence)
        );
    } catch {
        return false;
    }
}

function inferEventType(content) {
    for (const eventType of EVENT_TYPES) {
        if (new RegExp(`\\b${eventType}\\b`, 'i').test(content)) {
            return eventType;
        }
    }
    if (/reviewed by r2|review complete|verification complete/i.test(content)) return 'R2_REVIEWED';
    return 'CREATED';
}

function inferNewStatus(eventType) {
    if (!eventType) return null;
    if (eventType === 'R2_REVIEWED') return null;
    return eventType;
}

function extractFirstClaimId(content) {
    const matches = [...String(content || '').matchAll(CLAIM_ID_RE)];
    if (matches.length === 0) return null;
    const raw = matches[0][0];
    return normalizeClaimId(raw);
}

function normalizeEventType(value) {
    return normalizeEnum(value, EVENT_TYPES) ?? 'CREATED';
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

function extractNumberField(content, fieldName) {
    const regex = new RegExp(`${fieldName}\\s*[:=]\\s*(-?\\d+(?:\\.\\d+)?)`, 'i');
    const match = String(content || '').match(regex);
    return match ? normalizeNumber(match[1]) : null;
}

function extractTextField(content, fieldName) {
    const regex = new RegExp(`${fieldName}\\s*[:=]\\s*([^\\r\\n]+)`, 'i');
    const match = String(content || '').match(regex);
    return match ? match[1].trim() : null;
}

function extractEnum(content, regex, allowed) {
    const match = String(content || '').match(regex);
    return match ? normalizeEnum(match[0], allowed) : null;
}

function summarizeNarrative(content) {
    const text = String(content || '').trim().replace(/\s+/g, ' ');
    return text ? text.slice(0, 500) : null;
}

function normalizeNullable(value) {
    return value == null ? null : String(value);
}
