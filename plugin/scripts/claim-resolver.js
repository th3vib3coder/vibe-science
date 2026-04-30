#!/usr/bin/env node
/**
 * Phase 9 D.1 claim resolver CLI.
 *
 * Contract:
 *   stdin  JSON: { "claimId": "CLAIM-...", "projectPath"?: "..." }
 *   stdout JSON: {
 *     "exists": boolean,
 *     "claimId": string|null,
 *     "source": "kernel-claim-events"|"not-found"|"unavailable"
 *   }
 *
 * This is a read-only boundary for VRE claim-edge validation. It keeps VRE
 * from importing plugin DB internals or depending on better-sqlite3 directly.
 */

import fs from 'node:fs';

import {
    DEFAULT_DB_PATH,
    closeDB,
    openDB,
} from '../lib/db.js';

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
    } catch {
        return {};
    }
}

function normalizeClaimId(value) {
    return typeof value === 'string' && value.trim() !== ''
        ? value.trim()
        : null;
}

function resolveDbPath(env = process.env) {
    return typeof env.VIBE_SCIENCE_DB_PATH === 'string' && env.VIBE_SCIENCE_DB_PATH.trim() !== ''
        ? env.VIBE_SCIENCE_DB_PATH
        : DEFAULT_DB_PATH;
}

export function resolveClaimFromDb({ claimId, projectPath = null, dbPath = resolveDbPath() } = {}) {
    const normalizedClaimId = normalizeClaimId(claimId);
    if (normalizedClaimId == null) {
        return {
            exists: false,
            claimId: null,
            source: 'not-found',
        };
    }

    try {
        if (!fs.existsSync(dbPath) || fs.statSync(dbPath).isDirectory()) {
            return {
                exists: false,
                claimId: normalizedClaimId,
                source: 'unavailable',
            };
        }
    } catch {
        return {
            exists: false,
            claimId: normalizedClaimId,
            source: 'unavailable',
        };
    }

    let db = null;
    try {
        db = openDB(dbPath);
        if (!db) {
            return {
                exists: false,
                claimId: normalizedClaimId,
                source: 'unavailable',
            };
        }

        // D.1 only needs claim-id existence. projectPath is accepted in the
        // stdin contract for future scoped readers, but not used as a filter.
        void projectPath;
        const row = db.prepare('SELECT 1 FROM claim_events WHERE claim_id = ? LIMIT 1').get(normalizedClaimId);

        return {
            exists: row != null,
            claimId: normalizedClaimId,
            source: row != null ? 'kernel-claim-events' : 'not-found',
        };
    } catch {
        return {
            exists: false,
            claimId: normalizedClaimId,
            source: 'unavailable',
        };
    } finally {
        closeDB(db);
    }
}

export async function runClaimResolverCli({ stdin = null, env = process.env } = {}) {
    const payload = parsePayload(stdin ?? await readStdin());
    writeJson(resolveClaimFromDb({
        claimId: payload.claimId,
        projectPath: payload.projectPath,
        dbPath: resolveDbPath(env),
    }));
    return 0;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url))) {
    process.exitCode = await runClaimResolverCli();
}
