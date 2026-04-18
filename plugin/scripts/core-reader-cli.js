#!/usr/bin/env node
/**
 * Vibe Science core-reader CLI — stdin/stdout envelope for the VRE bridge.
 *
 * Reads a projection name from argv[2], reads optional JSON args from stdin,
 * calls the matching projection in plugin/lib/core-reader.js, and writes a
 * versioned envelope to stdout:
 *
 *   { ok: true,  projection, projectPath, data }
 *   { ok: false, projection, error }
 *
 * Matches the contract declared in the VRE repo at
 * `environment/lib/kernel-bridge.js` (WP-150).
 *
 * Degraded-mode safe: if `better-sqlite3` is absent or the DB file does not
 * exist, projections return empty / default data. The envelope is still
 * well-formed; the VRE bridge treats the degraded payload as "kernel reports
 * nothing, not kernel broken".
 */

import { PROJECTIONS, getProjectionMeta } from '../lib/core-reader.js';

function resolveProjection(name) {
    if (typeof name !== 'string' || name.trim() === '') {
        return null;
    }
    return PROJECTIONS[name] ?? null;
}

function writeEnvelope(payload) {
    process.stdout.write(JSON.stringify(payload));
    process.stdout.write('\n');
}

async function main() {
    const projection = process.argv[2] ?? '';
    const projectionFn = resolveProjection(projection);

    if (!projectionFn) {
        writeEnvelope({
            ok: false,
            projection,
            error: `Unknown projection: "${projection}". Known: ${Object.keys(PROJECTIONS).join(', ')}.`,
        });
        process.exitCode = 2;
        return;
    }

    // Read optional JSON args from stdin. Empty stdin → {}.
    let stdinBuf = '';
    await new Promise((resolve) => {
        process.stdin.on('data', (chunk) => { stdinBuf += chunk.toString('utf8'); });
        process.stdin.on('end', resolve);
        process.stdin.on('error', resolve);
    });

    let input;
    try {
        input = stdinBuf.trim() === '' ? {} : JSON.parse(stdinBuf);
    } catch (error) {
        writeEnvelope({
            ok: false,
            projection,
            error: `Invalid stdin JSON: ${error.message}`,
        });
        process.exitCode = 2;
        return;
    }

    try {
        const data = await projectionFn(input);
        const meta = getProjectionMeta(data);
        writeEnvelope({
            ok: true,
            projection,
            projectPath: input.projectPath ?? null,
            dbAvailable: meta.dbAvailable,
            sourceMode: meta.sourceMode,
            degradedReason: meta.degradedReason,
            data,
        });
    } catch (error) {
        writeEnvelope({
            ok: false,
            projection,
            error: error?.message ?? String(error),
        });
        process.exitCode = 1;
    }
}

await main();
