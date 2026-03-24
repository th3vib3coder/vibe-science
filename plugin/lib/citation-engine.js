const DEFAULT_REQUEST_TIMEOUT_MS = 3000;
const DEFAULT_EVENT_BUDGET_MS = 5000;
const DEFAULT_MAX_SYNC_ATTEMPTS = 3;

export async function verifyCitationsQuick(citations = [], options = {}) {
    const fetchImpl = options.fetchImpl || globalThis.fetch;
    if (typeof fetchImpl !== 'function') {
        return {
            attempted: 0,
            elapsedMs: 0,
            budgetExhausted: false,
            results: [],
            warnings: ['fetch() is not available; citation verification stayed pending.'],
        };
    }

    const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    const eventBudgetMs = options.eventBudgetMs ?? DEFAULT_EVENT_BUDGET_MS;
    const maxSyncAttempts = options.maxSyncAttempts ?? DEFAULT_MAX_SYNC_ATTEMPTS;
    const startedAt = Date.now();
    const warnings = [];
    const results = [];

    const ordered = [...citations]
        .filter(citation => citation && citation.citation_id && citation.citation_type)
        .sort(compareCitationPriority)
        .slice(0, maxSyncAttempts);

    if (citations.length > maxSyncAttempts) {
        warnings.push(`Only the first ${maxSyncAttempts} citations were attempted synchronously; the rest remain pending.`);
    }

    for (const citation of ordered) {
        const elapsedMs = Date.now() - startedAt;
        const remainingBudgetMs = eventBudgetMs - elapsedMs;
        if (remainingBudgetMs <= 0) {
            warnings.push('Sync verification budget exhausted; remaining citations stayed pending.');
            break;
        }

        const timeoutMs = Math.max(1, Math.min(requestTimeoutMs, remainingBudgetMs));
        const result = await verifyCitation(citation, {
            fetchImpl,
            timeoutMs,
        });

        results.push(result);
    }

    return {
        attempted: results.length,
        elapsedMs: Date.now() - startedAt,
        budgetExhausted: Date.now() - startedAt >= eventBudgetMs,
        results,
        warnings,
    };
}

export async function verifyCitation(citation, options = {}) {
    const type = String(citation?.citation_type || '').toUpperCase();
    if (!type) {
        return pendingResult(citation, 'Missing citation type.');
    }

    try {
        if (type === 'DOI') return await verifyDoi(citation, options);
        if (type === 'PMID') return await verifyPmid(citation, options);
        if (type === 'ARXIV') return await verifyArxiv(citation, options);
        return pendingResult(citation, `Unsupported citation type: ${type}`);
    } catch (error) {
        if (isAbortLike(error)) {
            return pendingResult(citation, `Timed out after ${options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS}ms.`);
        }
        return pendingResult(citation, error.message || 'Verification failed unexpectedly.');
    }
}

export async function runFetchSpike(options = {}) {
    const fetchImpl = options.fetchImpl || globalThis.fetch;
    if (typeof fetchImpl !== 'function') {
        return { ok: false, reason: 'fetch unavailable' };
    }

    const timeoutMs = options.timeoutMs ?? 1500;
    const url = options.url || 'https://doi.org/10.1038/nature12373';
    try {
        let response = await fetchWithTimeout(url, {
            method: 'HEAD',
            headers: { Accept: 'application/vnd.citationstyles.csl+json' },
        }, { fetchImpl, timeoutMs });
        if (response.status === 405) {
            response = await fetchWithTimeout(url, {
                headers: { Accept: 'application/vnd.citationstyles.csl+json' },
            }, { fetchImpl, timeoutMs });
        }
        return { ok: response.ok, status: response.status, url };
    } catch (error) {
        return { ok: false, reason: error.message || 'fetch spike failed', url };
    }
}

async function verifyDoi(citation, options) {
    const doi = citation.doi || citation.normalized_id;
    if (!doi) return pendingResult(citation, 'Missing DOI identifier.');

    const encodedDoi = encodeDoiPath(doi);
    const doiUrl = `https://doi.org/${encodedDoi}`;
    const doiResponse = await fetchWithTimeout(doiUrl, {
        headers: { Accept: 'application/vnd.citationstyles.csl+json' },
    }, options);

    if (doiResponse.ok) {
        let csl = null;
        try {
            csl = await doiResponse.json();
        } catch {
            csl = null;
        }

        const result = {
            citation_id: citation.citation_id,
            verification_status: 'VERIFIED',
            verification_method: 'web_fetch',
            resolver: 'DOI_ORG',
            source_url: doiUrl,
            resolved_title: extractTitle(csl),
            title: extractTitle(csl),
            resolved_source_type: classifySourceType(csl?.type),
            retraction_status: inferRetractionStatus(csl, { sourceType: 'DOI_CSL' }),
            resolved_payload: csl,
            http_status: doiResponse.status,
            http_status_code: doiResponse.status,
            checked_at: new Date().toISOString(),
        };

        if (result.retraction_status === 'RETRACTED') {
            result.verification_status = 'RETRACTED';
        }

        return result;
    }

    const crossrefUrl = `https://api.crossref.org/works/${encodedDoi}`;
    const crossrefResponse = await fetchWithTimeout(crossrefUrl, {
        headers: { Accept: 'application/json' },
    }, options);

    if (!crossrefResponse.ok) {
        if (isUnresolvedStatus(crossrefResponse.status)) {
            return unresolvedResult(citation, {
                resolver: 'CROSSREF',
                sourceUrl: crossrefUrl,
                httpStatus: crossrefResponse.status,
            });
        }
        return pendingResult(citation, `Crossref returned ${crossrefResponse.status}.`, {
            resolver: 'CROSSREF',
            sourceUrl: crossrefUrl,
            httpStatus: crossrefResponse.status,
        });
    }

    const payload = await crossrefResponse.json();
    const message = payload?.message || {};
    const retractionStatus = inferRetractionStatus(message, { sourceType: 'CROSSREF' });
    return {
        citation_id: citation.citation_id,
        verification_status: retractionStatus === 'RETRACTED' ? 'RETRACTED' : 'VERIFIED',
        verification_method: 'database_lookup',
        resolver: 'CROSSREF',
        source_url: crossrefUrl,
        resolved_title: extractTitle(message),
        title: extractTitle(message),
        resolved_source_type: classifySourceType(message.type),
        retraction_status: retractionStatus,
        resolved_payload: message,
        http_status: crossrefResponse.status,
        http_status_code: crossrefResponse.status,
        checked_at: new Date().toISOString(),
    };
}

async function verifyPmid(citation, options) {
    const pmid = citation.pmid || citation.normalized_id;
    if (!pmid) return pendingResult(citation, 'Missing PMID identifier.');

    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${encodeURIComponent(pmid)}&retmode=json`;
    const response = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, options);

    if (!response.ok) {
        if (isUnresolvedStatus(response.status)) {
            return unresolvedResult(citation, {
                resolver: 'PUBMED',
                sourceUrl: url,
                httpStatus: response.status,
            });
        }
        return pendingResult(citation, `PubMed returned ${response.status}.`, {
            resolver: 'PUBMED',
            sourceUrl: url,
            httpStatus: response.status,
        });
    }

    const payload = await response.json();
    const summary = payload?.result?.[pmid];
    if (!summary || summary.uid !== pmid) {
        return unresolvedResult(citation, {
            resolver: 'PUBMED',
            sourceUrl: url,
            httpStatus: response.status,
        });
    }

    const retractionStatus = inferRetractionStatus(summary, { sourceType: 'PUBMED' });
    return {
        citation_id: citation.citation_id,
        verification_status: retractionStatus === 'RETRACTED' ? 'RETRACTED' : 'VERIFIED',
        verification_method: 'database_lookup',
        resolver: 'PUBMED',
        source_url: url,
        resolved_title: summary.title || null,
        title: summary.title || null,
        resolved_source_type: classifyPubmedSourceType(summary),
        retraction_status: retractionStatus,
        resolved_payload: summary,
        http_status: response.status,
        http_status_code: response.status,
        checked_at: new Date().toISOString(),
    };
}

async function verifyArxiv(citation, options) {
    const arxivId = citation.arxiv_id || citation.normalized_id;
    if (!arxivId) return pendingResult(citation, 'Missing arXiv identifier.');

    const url = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`;
    const response = await fetchWithTimeout(url, { headers: { Accept: 'application/atom+xml' } }, options);

    if (!response.ok) {
        if (isUnresolvedStatus(response.status)) {
            return unresolvedResult(citation, {
                resolver: 'ARXIV',
                sourceUrl: url,
                httpStatus: response.status,
            });
        }
        return pendingResult(citation, `arXiv returned ${response.status}.`, {
            resolver: 'ARXIV',
            sourceUrl: url,
            httpStatus: response.status,
        });
    }

    const xml = await response.text();
    const entryBlock = extractXmlTag(xml, 'entry');
    if (!entryBlock) {
        return unresolvedResult(citation, {
            resolver: 'ARXIV',
            sourceUrl: url,
            httpStatus: response.status,
        });
    }

    const title = normalizeWhitespace(extractXmlTag(entryBlock, 'title'));
    const retractionStatus = inferRetractionStatus({ title }, { sourceType: 'ARXIV' });
    return {
        citation_id: citation.citation_id,
        verification_status: retractionStatus === 'RETRACTED' ? 'RETRACTED' : 'VERIFIED',
        verification_method: 'database_lookup',
        resolver: 'ARXIV',
        source_url: url,
        resolved_title: title || null,
        title: title || null,
        resolved_source_type: 'preprint',
        retraction_status: retractionStatus,
        resolved_payload: truncatePayload(xml),
        http_status: response.status,
        http_status_code: response.status,
        checked_at: new Date().toISOString(),
    };
}

async function fetchWithTimeout(url, requestInit = {}, options = {}) {
    const fetchImpl = options.fetchImpl || globalThis.fetch;
    const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);

    try {
        return await fetchImpl(url, {
            ...requestInit,
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeout);
    }
}

function pendingResult(citation, reason, extras = {}) {
    return {
        citation_id: citation?.citation_id,
        verification_status: 'PENDING',
        verification_method: extras.verificationMethod ?? null,
        resolver: extras.resolver ?? null,
        source_url: extras.sourceUrl ?? citation?.source_url ?? null,
        resolved_title: null,
        title: null,
        resolved_source_type: null,
        retraction_status: extras.retractionStatus ?? null,
        resolved_payload: reason ? { pending_reason: reason } : null,
        http_status: extras.httpStatus ?? null,
        http_status_code: extras.httpStatus ?? null,
        checked_at: new Date().toISOString(),
    };
}

function unresolvedResult(citation, extras = {}) {
    return {
        citation_id: citation?.citation_id,
        verification_status: extras.retractionStatus === 'RETRACTED' ? 'RETRACTED' : 'UNRESOLVED',
        verification_method: extras.verificationMethod ?? 'web_fetch',
        resolver: extras.resolver ?? null,
        source_url: extras.sourceUrl ?? citation?.source_url ?? null,
        resolved_title: null,
        title: null,
        resolved_source_type: null,
        retraction_status: extras.retractionStatus ?? null,
        resolved_payload: extras.resolvedPayload ?? null,
        http_status: extras.httpStatus ?? null,
        http_status_code: extras.httpStatus ?? null,
        checked_at: new Date().toISOString(),
    };
}

function compareCitationPriority(left, right) {
    return priorityForType(left?.citation_type) - priorityForType(right?.citation_type);
}

function priorityForType(type) {
    const normalized = String(type || '').toUpperCase();
    if (normalized === 'DOI') return 0;
    if (normalized === 'PMID') return 1;
    if (normalized === 'ARXIV') return 2;
    return 99;
}

function classifySourceType(type) {
    const normalized = String(type || '').toLowerCase();
    if (!normalized) return 'other';
    if (normalized.includes('posted-content') || normalized.includes('preprint')) return 'preprint';
    if (normalized.includes('proceedings')) return 'conference';
    if (normalized.includes('report')) return 'technical_report';
    if (normalized.includes('journal') || normalized.includes('article') || normalized.includes('book-chapter')) {
        return 'peer_reviewed';
    }
    return 'other';
}

function classifyPubmedSourceType(summary) {
    const pubTypes = Array.isArray(summary?.pubtype) ? summary.pubtype.map(item => String(item).toLowerCase()) : [];
    if (pubTypes.some(item => item.includes('preprint'))) return 'preprint';
    if (pubTypes.some(item => item.includes('congress') || item.includes('conference'))) return 'conference';
    return 'peer_reviewed';
}

function inferRetractionStatus(payload, options = {}) {
    if (!payload) return null;

    const sourceType = String(options.sourceType || '').toUpperCase();

    if (sourceType === 'PUBMED') {
        return hasPubmedRetractionSignal(payload) ? 'RETRACTED' : 'CLEAR';
    }

    if (sourceType === 'CROSSREF') {
        if (hasCrossrefRetractionSignal(payload)) return 'RETRACTED';
        return looksLikeRetractionTitle(extractTitle(payload)) ? 'RETRACTED' : 'CLEAR';
    }

    if (sourceType === 'DOI_CSL') {
        return looksLikeRetractionTitle(extractTitle(payload)) ? 'RETRACTED' : 'CLEAR';
    }

    if (sourceType === 'ARXIV') {
        return looksLikeRetractionTitle(extractTitle(payload)) ? 'RETRACTED' : 'CLEAR';
    }

    return looksLikeRetractionTitle(extractTitle(payload)) ? 'RETRACTED' : 'CLEAR';
}

function extractTitle(payload) {
    if (!payload) return null;
    if (typeof payload.title === 'string') return payload.title;
    if (Array.isArray(payload.title) && payload.title[0]) return String(payload.title[0]);
    return null;
}

function extractXmlTag(xml, tagName) {
    const match = String(xml || '').match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
    return match ? match[1] : null;
}

function truncatePayload(value) {
    const text = String(value || '');
    return text.length <= 4000 ? text : `${text.slice(0, 4000)}...`;
}

function normalizeWhitespace(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function isUnresolvedStatus(status) {
    return [400, 404, 410, 422].includes(Number(status));
}

function isAbortLike(error) {
    return error?.name === 'AbortError' || /timeout/i.test(String(error?.message || ''));
}

function encodeDoiPath(doi) {
    return String(doi || '')
        .split('/')
        .map(part => encodeURIComponent(part))
        .join('/');
}

function hasCrossrefRetractionSignal(payload) {
    return hasCrossrefRetractionRelation(payload?.relation)
        || hasCrossrefRetractionUpdates(payload?.['update-to'])
        || hasCrossrefRetractionUpdates(payload?.update_to);
}

function hasCrossrefRetractionRelation(relation) {
    if (!relation || typeof relation !== 'object') return false;

    const retractionKeys = [
        'is-retracted-by',
        'is_retracted_by',
        'has-retraction',
        'has_retraction',
    ];

    for (const key of retractionKeys) {
        const value = relation[key];
        if (hasNonEmptyRelationEntries(value)) return true;
    }

    return false;
}

function hasCrossrefRetractionUpdates(updateTo) {
    const entries = asArray(updateTo);
    return entries.some(entry => {
        if (!entry || typeof entry !== 'object') return false;
        const type = String(entry.type || entry.label || '').toLowerCase();
        return type.includes('retraction') || type.includes('withdraw');
    });
}

function hasPubmedRetractionSignal(summary) {
    const pubTypes = asArray(summary?.pubtype).map(item => String(item || '').toLowerCase());
    return pubTypes.some(type => type.includes('retracted publication') || type.includes('withdrawn publication'));
}

function hasNonEmptyRelationEntries(value) {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.keys(value).length > 0;
    return Boolean(value);
}

function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return [];
    return [value];
}

function looksLikeRetractionTitle(title) {
    const normalized = normalizeWhitespace(title).toLowerCase();
    if (!normalized) return false;
    return /^(retracted|withdrawn)\s*:/i.test(normalized);
}
