#!/usr/bin/env node

import { createReader } from '../lib/core-reader.js';

const PROJECTIONS = new Set([
    'overview',
    'claim-heads',
    'unresolved-claims',
    'gate-checks',
    'literature-searches',
    'observer-alerts',
    'citation-checks',
    'state-snapshot',
]);

function printJson(payload) {
    process.stdout.write(JSON.stringify(payload));
}

function parseList(value) {
    if (value == null) return null;
    const text = String(value).trim();
    if (!text) return null;
    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
            return parsed.map(item => String(item));
        }
    } catch {
        // fall through
    }
    return text.split(',').map(item => item.trim()).filter(Boolean);
}

function parseInteger(value, flagName) {
    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`${flagName} must be a positive integer`);
    }
    return parsed;
}

function parseBoolean(value) {
    if (value == null) return true;
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    throw new Error(`Invalid boolean value: ${value}`);
}

function parseArgs(argv) {
    const [projection, ...rest] = argv;
    if (!projection) {
        throw new Error('Missing projection. Expected one of: overview, claim-heads, unresolved-claims, gate-checks, literature-searches, observer-alerts, citation-checks, state-snapshot');
    }
    if (!PROJECTIONS.has(projection)) {
        throw new Error(`Unknown projection: ${projection}`);
    }

    const flags = {};
    for (let i = 0; i < rest.length; i++) {
        const token = rest[i];
        if (!token.startsWith('--')) {
            throw new Error(`Unexpected positional argument: ${token}`);
        }
        const name = token.slice(2);
        const next = rest[i + 1];
        if (!next || next.startsWith('--')) {
            flags[name] = true;
            continue;
        }
        flags[name] = next;
        i++;
    }

    const projectPath = flags.project ?? process.cwd();
    const options = {};

    if (flags.limit != null && flags.limit !== true) {
        options.limit = parseInteger(flags.limit, '--limit');
    }

    if (flags['recent-gate-limit'] != null && flags['recent-gate-limit'] !== true) {
        options.recentGateLimit = parseInteger(flags['recent-gate-limit'], '--recent-gate-limit');
    }

    if (flags.statuses != null && flags.statuses !== true) {
        options.statuses = parseList(flags.statuses);
    }

    if (flags['gate-ids'] != null && flags['gate-ids'] !== true) {
        options.gateIds = parseList(flags['gate-ids']);
    }

    if (flags['claim-id'] != null && flags['claim-id'] !== true) {
        options.claimId = String(flags['claim-id']);
    }

    if (flags['search-layers'] != null && flags['search-layers'] !== true) {
        options.searchLayers = parseList(flags['search-layers']);
    }

    if (flags['gate-context'] != null && flags['gate-context'] !== true) {
        options.gateContext = parseList(flags['gate-context']);
    }

    if (flags['verification-statuses'] != null && flags['verification-statuses'] !== true) {
        options.verificationStatuses = parseList(flags['verification-statuses']);
    }

    if (flags['unresolved-only'] != null) {
        options.unresolvedOnly = parseBoolean(flags['unresolved-only']);
    }

    return { projection, projectPath, options };
}

function projectionData(reader, projection, options) {
    switch (projection) {
    case 'overview':
        return reader.getProjectOverview(options);
    case 'claim-heads':
        return reader.listClaimHeads(options);
    case 'unresolved-claims':
        return reader.listUnresolvedClaims(options);
    case 'gate-checks':
        return reader.listGateChecks(options);
    case 'literature-searches':
        return reader.listLiteratureSearches(options);
    case 'observer-alerts':
        return reader.listObserverAlerts(options);
    case 'citation-checks':
        return reader.listCitationChecks(options);
    case 'state-snapshot':
        return reader.getStateSnapshot();
    default:
        throw new Error(`Unknown projection: ${projection}`);
    }
}

async function main(argv) {
    let reader = null;
    try {
        const { projection, projectPath, options } = parseArgs(argv);
        reader = createReader(projectPath);
        const data = projectionData(reader, projection, options);
        printJson({
            ok: true,
            projection,
            projectPath: reader.projectPath,
            data,
        });
        process.exit(0);
    } catch (err) {
        const projection = argv[0] ?? null;
        const safeProjectPath = process.cwd().replace(/\\/g, '/');
        printJson({
            ok: false,
            projection,
            projectPath: safeProjectPath,
            error: {
                code: err.message?.startsWith('Unknown projection') ? 'INVALID_ARGUMENT' : 'RUNTIME_ERROR',
                message: err.message,
            },
            data: null,
        });
        process.exit(1);
    } finally {
        if (reader) {
            reader.close();
        }
    }
}

main(process.argv.slice(2));
