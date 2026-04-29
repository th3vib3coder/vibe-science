#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
    closeDB,
    openAndInit,
} from '../lib/db.js';
import { applyMigrations } from '../lib/migrations.js';
import { logPhase9GovernanceEvent } from '../lib/phase9-governance-events.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PLUGIN_REPO_ROOT = path.resolve(__dirname, '..', '..');

class GovernanceLogCliError extends Error {
    constructor({ code, message, exitCode = 1 }) {
        super(message);
        this.name = 'GovernanceLogCliError';
        this.code = code;
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
        throw new GovernanceLogCliError({
            code: 'E_BRIDGE_BAD_INPUT',
            message: `Invalid stdin JSON: ${error.message}`,
            exitCode: 1,
        });
    }
}

function resolveDbConfig(payload) {
    if (payload.pluginProjectRoot == null || payload.pluginProjectRoot === '') {
        return {
            dbPath: undefined,
            schemaPath: undefined,
        };
    }

    if (typeof payload.pluginProjectRoot !== 'string') {
        throw new GovernanceLogCliError({
            code: 'E_BRIDGE_DB_UNAVAILABLE',
            message: 'pluginProjectRoot must be a string when provided.',
            exitCode: 2,
        });
    }

    const pluginProjectRoot = path.resolve(payload.pluginProjectRoot);
    if (!fs.existsSync(pluginProjectRoot)) {
        throw new GovernanceLogCliError({
            code: 'E_BRIDGE_DB_UNAVAILABLE',
            message: `Plugin project root does not exist: ${pluginProjectRoot}`,
            exitCode: 2,
        });
    }

    return {
        dbPath: path.join(pluginProjectRoot, '.vibe-science', 'db', 'vibe-science.db'),
        schemaPath: path.join(pluginProjectRoot, 'plugin', 'db', 'schema.sql'),
    };
}

function openBridgeDb(payload) {
    const { dbPath, schemaPath } = resolveDbConfig(payload);
    const db = openAndInit(dbPath, schemaPath);
    if (!db) {
        throw new GovernanceLogCliError({
            code: 'E_BRIDGE_DB_UNAVAILABLE',
            message: 'Plugin database is unavailable.',
            exitCode: 2,
        });
    }
    applyMigrations(db);
    return db;
}

export async function runGovernanceLogCli({ stdin = null } = {}) {
    let payload;
    try {
        payload = parsePayload(stdin ?? await readStdin());
    } catch (error) {
        writeJson({
            ok: false,
            code: error.code ?? 'E_BRIDGE_BAD_INPUT',
            message: error.message,
        });
        return error.exitCode ?? 1;
    }
    let db;
    try {
        db = openBridgeDb(payload);
    } catch (error) {
        const code = error.code ?? 'E_BRIDGE_DB_UNAVAILABLE';
        writeJson({
            ok: false,
            code,
            message: error.message,
        });
        return error.exitCode ?? 2;
    }

    try {
        const { pluginProjectRoot, ...event } = payload;
        const eventId = typeof event.id === 'string' && event.id.trim() !== ''
            ? event.id
            : `GOV-${randomUUID()}`;
        const result = logPhase9GovernanceEvent(db, {
            ...event,
            id: eventId,
        });
        if (result?.ok === false) {
            writeJson({
                ok: false,
                code: result.code ?? 'E_BRIDGE_DB_UNAVAILABLE',
                message: 'Plugin database is unavailable.',
            });
            return 2;
        }
        writeJson({
            ok: true,
            eventId,
            code: 'OK',
        });
        return 0;
    } catch (error) {
        writeJson({
            ok: false,
            code: error.code ?? 'E_BRIDGE_VALIDATION',
            message: error.message,
        });
        return error.code ? 1 : 3;
    } finally {
        closeDB(db);
    }
}

if (path.resolve(process.argv[1] ?? '') === __filename) {
    const exitCode = await runGovernanceLogCli();
    process.exitCode = exitCode;
}
