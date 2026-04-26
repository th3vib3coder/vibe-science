#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    resolvePluginRepoRoot,
    resolveSiblingVreRoot,
} from './handshake-inject.js';
import {
    closeDB,
    getClaimHistory,
    initDB,
    logClaimEvent,
    openDB,
} from '../lib/db.js';
import { applyMigrations } from '../lib/migrations.js';
import { normalizeClaimId } from '../lib/claim-ingestion.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_PLUGIN_REPO_ROOT = path.resolve(__dirname, '..', '..');
export const R2_BRIDGE_GATE_ID = 'PROMOTION_REQUIRES_R2_REVIEW';
const OBJECTIVE_EVENTS_RELATIVE = ['.vibe-science-environment', 'objectives'];
const VALID_VERDICTS = new Set(['ACCEPT', 'REJECT', 'DEFER']);

export class R2BridgeWriterError extends Error {
    constructor({ code, message, exitCode = 1, extra = {} }) {
        super(message);
        this.name = 'R2BridgeWriterError';
        this.code = code;
        this.exitCode = exitCode;
        this.extra = extra;
    }
}

function nextOptionValue(argv, index, optionName) {
    const candidate = argv[index + 1];
    if (typeof candidate !== 'string' || candidate.startsWith('--')) {
        throw new R2BridgeWriterError({
            code: 'PHASE9_USAGE',
            exitCode: 3,
            message: `r2-bridge-writer requires ${optionName} <value>.`,
        });
    }
    return candidate;
}

export function parseR2BridgeArgs(argv = process.argv.slice(2)) {
    const options = {
        dbPath: null,
        eventId: null,
        eventLogPath: null,
        json: false,
        objectiveId: null,
        pluginRepoRoot: DEFAULT_PLUGIN_REPO_ROOT,
        sessionId: null,
        vreRoot: null,
    };
    const positionals = [];

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === '--db-path') {
            options.dbPath = nextOptionValue(argv, index, '--db-path');
            index += 1;
            continue;
        }
        if (token === '--event-id') {
            options.eventId = nextOptionValue(argv, index, '--event-id');
            index += 1;
            continue;
        }
        if (token === '--event-log') {
            options.eventLogPath = nextOptionValue(argv, index, '--event-log');
            index += 1;
            continue;
        }
        if (token === '--json') {
            options.json = true;
            continue;
        }
        if (token === '--objective') {
            options.objectiveId = nextOptionValue(argv, index, '--objective');
            index += 1;
            continue;
        }
        if (token === '--plugin-root') {
            options.pluginRepoRoot = nextOptionValue(argv, index, '--plugin-root');
            index += 1;
            continue;
        }
        if (token === '--session') {
            options.sessionId = nextOptionValue(argv, index, '--session');
            index += 1;
            continue;
        }
        if (token === '--vre-root') {
            options.vreRoot = nextOptionValue(argv, index, '--vre-root');
            index += 1;
            continue;
        }
        if (token.startsWith('--')) {
            throw new R2BridgeWriterError({
                code: 'PHASE9_USAGE',
                exitCode: 3,
                message: `r2-bridge-writer does not accept option ${token}.`,
            });
        }
        positionals.push(token);
    }

    if (positionals.length > 0) {
        throw new R2BridgeWriterError({
            code: 'PHASE9_USAGE',
            exitCode: 3,
            message: `r2-bridge-writer does not accept positional arguments: ${positionals.join(' ')}`,
        });
    }
    if (options.sessionId == null || options.sessionId.trim() === '') {
        throw new R2BridgeWriterError({
            code: 'PHASE9_USAGE',
            exitCode: 3,
            message: 'r2-bridge-writer requires --session <session-id>.',
        });
    }

    return options;
}

function resolveEventLogPath({
    eventLogPath,
    objectiveId,
    pluginRepoRoot = DEFAULT_PLUGIN_REPO_ROOT,
    vreRoot,
    existsSyncImpl = fs.existsSync,
} = {}) {
    if (typeof eventLogPath === 'string' && eventLogPath.trim() !== '') {
        return path.resolve(eventLogPath);
    }
    if (typeof objectiveId !== 'string' || objectiveId.trim() === '') {
        throw new R2BridgeWriterError({
            code: 'PHASE9_USAGE',
            exitCode: 3,
            message: 'r2-bridge-writer requires --event-log or --objective.',
        });
    }

    let resolvedVreRoot = vreRoot;
    if (typeof resolvedVreRoot !== 'string' || resolvedVreRoot.trim() === '') {
        const resolvedPluginRoot = resolvePluginRepoRoot(pluginRepoRoot);
        const discovery = resolveSiblingVreRoot({
            pluginRepoRoot: resolvedPluginRoot,
            existsSyncImpl,
        });
        if (!discovery.vreRoot) {
            throw new R2BridgeWriterError({
                code: 'VRE_MISSING',
                message: discovery.reason,
            });
        }
        resolvedVreRoot = discovery.vreRoot;
    }

    return path.join(
        path.resolve(resolvedVreRoot),
        ...OBJECTIVE_EVENTS_RELATIVE,
        objectiveId,
        'events.jsonl',
    );
}

function readObjectiveEvents(eventLogPath) {
    let raw;
    try {
        raw = fs.readFileSync(eventLogPath, 'utf-8');
    } catch (error) {
        if (error?.code === 'ENOENT') {
            throw new R2BridgeWriterError({
                code: 'E_R2_EVENT_LOG_MISSING',
                message: `r2-bridge-writer could not find VRE objective event log: ${eventLogPath}`,
                extra: { eventLogPath },
            });
        }
        throw error;
    }

    const events = [];
    const warnings = [];
    const lines = raw.split(/\r?\n/u);
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        if (line.trim() === '') continue;
        try {
            events.push(JSON.parse(line));
        } catch (error) {
            const isLastLine = index === lines.length - 1 || (index === lines.length - 2 && lines.at(-1) === '');
            if (isLastLine && !raw.endsWith('\n')) {
                warnings.push({
                    code: 'partial-line-skipped',
                    line: index + 1,
                    message: 'Skipped a partial final events.jsonl line while VRE may still be writing.',
                });
                continue;
            }
            throw new R2BridgeWriterError({
                code: 'E_R2_EVENT_LOG_INVALID',
                message: `r2-bridge-writer could not parse events.jsonl line ${index + 1}: ${error.message}`,
                extra: { eventLogPath, line: index + 1 },
            });
        }
    }
    return { events, warnings };
}

function normalizeR2Event(event) {
    if (event?.kind !== 'r2-verdict') return null;
    const payload = event.payload ?? {};
    const claimId = normalizeClaimId(payload.claimId);
    const verdict = typeof payload.verdict === 'string'
        ? payload.verdict.trim().toUpperCase()
        : null;

    if (!claimId || !VALID_VERDICTS.has(verdict)) {
        throw new R2BridgeWriterError({
            code: 'E_R2_VERDICT_EVENT_INVALID',
            message: 'r2-verdict events must include payload.claimId and verdict ACCEPT | REJECT | DEFER.',
            extra: { eventId: event.eventId ?? null },
        });
    }

    return {
        claimId,
        eventId: event.eventId ?? null,
        handoffId: payload.handoffId ?? null,
        summary: payload.summary ?? null,
        timestamp: event.createdAt ?? null,
        verdict,
    };
}

function hasMirroredEvent(db, claimId, eventId) {
    if (!eventId) return false;
    return getClaimHistory(db, claimId).some((event) =>
        event.event_type === 'R2_REVIEWED'
        && event.gate_id === R2_BRIDGE_GATE_ID
        && typeof event.narrative === 'string'
        && event.narrative.includes(`VRE r2-verdict ${eventId}`)
    );
}

function buildClaimEvent(event, sessionId, timestamp) {
    return {
        claim_id: event.claimId,
        session_id: sessionId,
        event_type: 'R2_REVIEWED',
        old_status: null,
        new_status: null,
        confidence: null,
        r2_verdict: event.verdict,
        kill_reason: null,
        gate_id: R2_BRIDGE_GATE_ID,
        narrative: [
            `VRE r2-verdict ${event.eventId ?? 'unknown'} bridged to plugin claim ledger.`,
            event.handoffId ? `handoffId=${event.handoffId}.` : null,
            event.summary,
        ].filter(Boolean).join(' '),
        timestamp: timestamp ?? event.timestamp ?? new Date().toISOString(),
    };
}

export function bridgeR2Verdicts({
    dbPath = null,
    eventId = null,
    eventLogPath = null,
    existsSyncImpl = fs.existsSync,
    now = null,
    objectiveId = null,
    pluginRepoRoot = DEFAULT_PLUGIN_REPO_ROOT,
    sessionId,
    vreRoot = null,
} = {}) {
    if (typeof sessionId !== 'string' || sessionId.trim() === '') {
        throw new R2BridgeWriterError({
            code: 'PHASE9_USAGE',
            exitCode: 3,
            message: 'bridgeR2Verdicts requires sessionId.',
        });
    }

    const resolvedEventLogPath = resolveEventLogPath({
        eventLogPath,
        objectiveId,
        pluginRepoRoot,
        vreRoot,
        existsSyncImpl,
    });
    const { events, warnings } = readObjectiveEvents(resolvedEventLogPath);
    const targetEvents = events
        .filter((event) => event?.kind === 'r2-verdict')
        .filter((event) => eventId == null || event.eventId === eventId)
        .map(normalizeR2Event)
        .filter(Boolean);

    if (eventId != null && targetEvents.length === 0) {
        throw new R2BridgeWriterError({
            code: 'E_R2_VERDICT_EVENT_NOT_FOUND',
            message: `r2-bridge-writer found no r2-verdict event with eventId ${eventId}.`,
            extra: { eventId, eventLogPath: resolvedEventLogPath },
        });
    }

    const db = openDB(dbPath ?? undefined);
    if (!db) {
        throw new R2BridgeWriterError({
            code: 'E_DB_UNAVAILABLE',
            message: 'r2-bridge-writer could not open the plugin database.',
        });
    }

    let inserted = 0;
    let skipped = 0;
    const mirrored = [];
    try {
        initDB(db);
        applyMigrations(db);

        for (const event of targetEvents) {
            if (hasMirroredEvent(db, event.claimId, event.eventId)) {
                skipped += 1;
                continue;
            }
            logClaimEvent(db, buildClaimEvent(event, sessionId, now));
            inserted += 1;
            mirrored.push({ claimId: event.claimId, eventId: event.eventId, verdict: event.verdict });
        }
    } finally {
        closeDB(db);
    }

    return {
        ok: true,
        inserted,
        mirrored,
        scanned: targetEvents.length,
        skipped,
        warnings,
    };
}

export function runR2BridgeWriter({
    argv = process.argv.slice(2),
    env = process.env,
    existsSyncImpl = fs.existsSync,
} = {}) {
    const options = parseR2BridgeArgs(argv);
    const result = bridgeR2Verdicts({
        dbPath: options.dbPath ?? env.VIBE_SCIENCE_DB_PATH ?? null,
        eventId: options.eventId,
        eventLogPath: options.eventLogPath,
        existsSyncImpl,
        objectiveId: options.objectiveId,
        pluginRepoRoot: options.pluginRepoRoot,
        sessionId: options.sessionId,
        vreRoot: options.vreRoot,
    });
    if (options.json) {
        process.stdout.write(`${JSON.stringify(result)}\n`);
    }
    return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
    try {
        runR2BridgeWriter();
    } catch (error) {
        const code = error instanceof R2BridgeWriterError ? error.code : 'E_R2_BRIDGE_WRITER_FAILED';
        const exitCode = error instanceof R2BridgeWriterError ? error.exitCode : 1;
        process.stderr.write(`${code}: ${error.message}\n`);
        process.exit(exitCode);
    }
}
