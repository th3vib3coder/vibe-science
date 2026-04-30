#!/usr/bin/env node
/**
 * Phase 9 E.1 audit query CLI.
 *
 * Contract:
 *   stdin  JSON: { "from"?: ISO|number, "to"?: ISO|number, "pluginProjectRoot"?: "..." }
 *   stdout JSON:
 *     success: { "ok": true, "rows": [{ "event_type": string, "source_component": string|null, "count": number }] }
 *     error:   { "ok": false, "error": string }
 *
 * This is a read-only boundary for VRE audit evidence. It keeps VRE from
 * importing plugin DB internals or depending on better-sqlite3 directly.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
    DEFAULT_DB_PATH,
    closeDB,
    openDB,
} from '../lib/db.js';

class AuditQueryCliError extends Error {
    constructor(message, { exitCode = 1 } = {}) {
        super(message);
        this.name = 'AuditQueryCliError';
        this.exitCode = exitCode;
    }
}

function writeJson(payload) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
}

async function readStdin() {
    let raw = '';
    for await (const chunk of process.stdin) {
        raw += chunk.toString('utf8');
    }
    return raw;
}

function parsePayload(raw) {
    try {
        return raw.trim() === '' ? {} : JSON.parse(raw);
    } catch (error) {
        throw new AuditQueryCliError(`Malformed input JSON: ${error.message}`, { exitCode: 1 });
    }
}

function resolveDbPath({ env = process.env, pluginProjectRoot = null } = {}) {
    if (typeof env.VIBE_SCIENCE_DB_PATH === 'string' && env.VIBE_SCIENCE_DB_PATH.trim() !== '') {
        return env.VIBE_SCIENCE_DB_PATH;
    }
    if (typeof pluginProjectRoot === 'string' && pluginProjectRoot.trim() !== '') {
        return path.join(path.resolve(pluginProjectRoot), '.vibe-science', 'db', 'vibe-science.db');
    }
    return DEFAULT_DB_PATH;
}

function normalizeTimestampBound(value, label) {
    if (value == null || value === '') {
        return null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
            return numeric;
        }
        const parsed = Date.parse(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    throw new AuditQueryCliError(`${label} must be an ISO timestamp or finite number.`, { exitCode: 1 });
}

function assertDbReadable(dbPath) {
    try {
        if (!fs.existsSync(dbPath) || fs.statSync(dbPath).isDirectory()) {
            throw new AuditQueryCliError('Plugin governance DB unavailable.', { exitCode: 2 });
        }
    } catch (error) {
        if (error instanceof AuditQueryCliError) {
            throw error;
        }
        throw new AuditQueryCliError('Plugin governance DB unavailable.', { exitCode: 2 });
    }
}

export function queryGovernanceEventAggregates({
    dbPath = resolveDbPath(),
    from = null,
    to = null,
} = {}) {
    const fromTimestamp = normalizeTimestampBound(from, 'from');
    const toTimestamp = normalizeTimestampBound(to, 'to');
    assertDbReadable(dbPath);

    let db = null;
    try {
        db = openDB(dbPath);
        if (!db) {
            throw new AuditQueryCliError('Plugin governance DB unavailable.', { exitCode: 2 });
        }

        const whereClauses = [];
        const params = [];
        if (fromTimestamp != null) {
            whereClauses.push('timestamp >= ?');
            params.push(fromTimestamp);
        }
        if (toTimestamp != null) {
            whereClauses.push('timestamp <= ?');
            params.push(toTimestamp);
        }

        const whereSql = whereClauses.length > 0
            ? `WHERE ${whereClauses.join(' AND ')}`
            : '';
        const rows = db.prepare(`
            SELECT event_type, source_component, COUNT(*) AS count
            FROM governance_events
            ${whereSql}
            GROUP BY event_type, source_component
            ORDER BY event_type ASC, source_component ASC
        `).all(...params);

        return rows.map((row) => ({
            event_type: String(row.event_type),
            source_component: row.source_component ?? null,
            count: Number(row.count),
        }));
    } catch (error) {
        if (error instanceof AuditQueryCliError) {
            throw error;
        }
        throw new AuditQueryCliError(`Plugin governance DB unavailable: ${error.message}`, { exitCode: 2 });
    } finally {
        closeDB(db);
    }
}

export async function runAuditQueryCli({ stdin = null, env = process.env } = {}) {
    try {
        const payload = parsePayload(stdin ?? await readStdin());
        const rows = queryGovernanceEventAggregates({
            dbPath: resolveDbPath({ env, pluginProjectRoot: payload.pluginProjectRoot }),
            from: payload.from,
            to: payload.to,
        });
        writeJson({ ok: true, rows });
        return 0;
    } catch (error) {
        writeJson({
            ok: false,
            error: error.message ?? 'Audit query failed.',
        });
        return error.exitCode ?? 1;
    }
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url))) {
    process.exitCode = await runAuditQueryCli();
}
