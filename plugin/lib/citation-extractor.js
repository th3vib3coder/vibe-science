import crypto from 'node:crypto';
import { normalizeClaimId } from './claim-ingestion.js';

const DOI_RE = /\b(10\.\d{4,9}\/[-._;()/:A-Z0-9]+[A-Z0-9])\b/gi;
const DOI_URL_RE = /\bhttps?:\/\/(?:dx\.)?doi\.org\/(10\.\d{4,9}\/[-._;()/:A-Z0-9]+[A-Z0-9])\b/gi;
const PMID_RE = /\bPMID\s*:\s*(\d+)\b/gi;
const PUBMED_URL_RE = /\bhttps?:\/\/(?:www\.)?ncbi\.nlm\.nih\.gov\/pubmed\/(\d+)\/?\b/gi;
const PUBMED_PATH_RE = /\bpubmed(?:\.ncbi(?:\.nlm)?\.nih\.gov)?\/(\d+)\/?\b/gi;
const ARXIV_RE = /\barxiv\s*:\s*([A-Z.-]+\/\d{7}(?:V\d+)?|\d{4}\.\d{4,5}(?:V\d+)?)\b/gi;
const ARXIV_URL_RE = /\bhttps?:\/\/arxiv\.org\/(?:abs|pdf)\/([A-Z.-]+\/\d{7}(?:V\d+)?|\d{4}\.\d{4,5}(?:V\d+)?)(?:\.pdf)?\b/gi;
const CLAIM_ID_RE = /\bC-?\d+\b|\bCLAIM-\d+\b/i;

export function extractCitationsFromEvent(event = {}) {
    const sessionId = event.session_id || null;
    if (!sessionId) return { citations: [], claimId: null, warnings: [] };

    const sources = collectTextSources(event);
    const claimId = extractClaimIdFromTexts(sources.map(source => source.text));
    const warnings = [];
    const dedupe = new Map();

    for (const source of sources) {
        for (const citation of extractCitationsFromText(source.text, {
            sessionId,
            claimId,
            sourceLabel: source.label,
        })) {
            if (!dedupe.has(citation.citation_id)) {
                dedupe.set(citation.citation_id, citation);
            }
        }
    }

    if (sources.length === 0) {
        warnings.push('No textual payloads available for citation extraction.');
    }

    return {
        citations: [...dedupe.values()],
        claimId,
        warnings,
    };
}

export function extractCitationsFromText(text, options = {}) {
    const sourceText = String(text || '');
    if (!sourceText.trim()) return [];

    const { sessionId, claimId = null, sourceLabel = 'text' } = options;
    const dedupe = new Map();

    const detectors = [
        { regex: DOI_URL_RE, type: 'DOI', normalize: normalizeDoi },
        { regex: DOI_RE, type: 'DOI', normalize: normalizeDoi },
        { regex: PMID_RE, type: 'PMID', normalize: normalizePmid },
        { regex: PUBMED_URL_RE, type: 'PMID', normalize: normalizePmid },
        { regex: PUBMED_PATH_RE, type: 'PMID', normalize: normalizePmid },
        { regex: ARXIV_URL_RE, type: 'ARXIV', normalize: normalizeArxivId },
        { regex: ARXIV_RE, type: 'ARXIV', normalize: normalizeArxivId },
    ];

    for (const detector of detectors) {
        for (const match of sourceText.matchAll(detector.regex)) {
            const captured = match[1] || match[0];
            const normalized = detector.normalize(captured);
            if (!normalized) continue;

            const rawRef = sanitizeRawRef(match[0]);
            const citation = buildCitationRecord({
                sessionId,
                claimId,
                rawRef,
                citationType: detector.type,
                normalizedId: normalized,
                sourceLabel,
            });

            dedupe.set(citation.citation_id, citation);
        }
    }

    return [...dedupe.values()];
}

export function normalizeDoi(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const withoutPrefix = raw
        .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
        .replace(/^doi:\s*/i, '')
        .trim();
    const sanitized = withoutPrefix.replace(/[)\].,;:]+$/g, '');
    return /^10\.\d{4,9}\/\S+$/i.test(sanitized) ? sanitized.toLowerCase() : null;
}

export function normalizePmid(value) {
    const digits = String(value || '').replace(/\D+/g, '');
    return digits ? digits : null;
}

export function normalizeArxivId(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const withoutPrefix = raw
        .replace(/^https?:\/\/arxiv\.org\/(?:abs|pdf)\//i, '')
        .replace(/^arxiv:\s*/i, '')
        .replace(/\.pdf$/i, '')
        .trim();
    const sanitized = withoutPrefix.replace(/[)\].,;:]+$/g, '');
    return sanitized ? sanitized.toLowerCase() : null;
}

function collectTextSources(event) {
    const { tool_name = '', tool_input = {}, tool_response } = event;
    const outputText = typeof tool_response === 'string'
        ? tool_response
        : JSON.stringify(tool_response ?? '');

    const sources = [];
    pushSource(sources, 'content', tool_input.content);
    pushSource(sources, 'new_string', tool_input.new_string);
    pushSource(sources, 'query', tool_input.query);
    pushSource(sources, 'url', tool_input.url);
    if (Array.isArray(tool_input.edits)) {
        tool_input.edits.forEach((edit, index) => {
            pushSource(sources, `edit_${index + 1}`, edit?.new_string);
        });
    }

    // Read/WebFetch payloads often surface citations in their response body.
    if (tool_name === 'Read' || tool_name === 'WebFetch' || tool_name === 'WebSearch') {
        pushSource(sources, `${tool_name.toLowerCase()}_payload`, outputText);
    } else {
        pushSource(sources, 'output', outputText);
    }

    return sources;
}

function pushSource(target, label, value) {
    const text = String(value || '').trim();
    if (text) {
        target.push({ label, text });
    }
}

function extractClaimIdFromTexts(texts) {
    for (const text of texts) {
        const match = String(text || '').match(CLAIM_ID_RE);
        if (match) return normalizeClaimId(match[0]);
    }
    return null;
}

function buildCitationRecord({ sessionId, claimId, rawRef, citationType, normalizedId, sourceLabel }) {
    const identityRef = normalizedId || sanitizeRawRef(rawRef);
    const citationId = makeStableId(
        'CIT',
        sessionId,
        claimId || '__SESSION__',
        citationType,
        identityRef,
    );

    const citation = {
        citation_id: citationId,
        session_id: sessionId,
        claim_id: claimId,
        raw_ref: sanitizeRawRef(rawRef),
        citation_text: sanitizeRawRef(rawRef),
        citation_type: citationType,
        normalized_id: normalizedId,
        verification_status: 'PENDING',
        verification_method: null,
        resolver: null,
        source_url: buildCanonicalUrl(citationType, normalizedId),
        resolved_title: null,
        title: null,
        resolved_source_type: null,
        retraction_status: null,
        resolved_payload: { source_label: sourceLabel },
        http_status: null,
        http_status_code: null,
        checked_at: null,
    };

    if (citationType === 'DOI') citation.doi = normalizedId;
    if (citationType === 'PMID') citation.pmid = normalizedId;
    if (citationType === 'ARXIV') citation.arxiv_id = normalizedId;

    return citation;
}

function sanitizeRawRef(rawRef) {
    return String(rawRef || '').trim().replace(/\s+/g, ' ').replace(/[)\].,;:]+$/g, '');
}

function buildCanonicalUrl(citationType, normalizedId) {
    if (!normalizedId) return null;
    if (citationType === 'DOI') return `https://doi.org/${normalizedId}`;
    if (citationType === 'PMID') return `https://pubmed.ncbi.nlm.nih.gov/${normalizedId}/`;
    if (citationType === 'ARXIV') return `https://arxiv.org/abs/${normalizedId}`;
    return null;
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
