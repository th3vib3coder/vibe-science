#!/usr/bin/env node
/**
 * TRACE smoke test on a synthetic research project fixture.
 *
 * Verifies that setup + session-start + post-tool-use + stop cooperate
 * on a realistic temp project and DB.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function main() {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-trace-smoke-'));
    const homeDir = path.join(tempRoot, 'home');
    const projectDir = path.join(tempRoot, 'project');
    fs.mkdirSync(homeDir, { recursive: true });
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, '.vibe-science'), { recursive: true });

    fs.writeFileSync(path.join(projectDir, '.vibe-science', 'STATE.md'), '# STATE\n', 'utf-8');
    fs.writeFileSync(path.join(projectDir, 'CLAIM-LEDGER.md'), '# CLAIM LEDGER\n', 'utf-8');
    fs.writeFileSync(path.join(projectDir, 'SERENDIPITY.md'), '# SERENDIPITY\n', 'utf-8');

    const env = {
        ...process.env,
        HOME: homeDir,
        USERPROFILE: homeDir,
    };

    const setup = runHook('plugin/scripts/setup.js', {}, env);
    if (setup.status !== 0) fail('setup failed', setup);

    const sessionStart = runHook('plugin/scripts/session-start.js', {
        cwd: projectDir,
        project_path: projectDir,
    }, env);
    if (sessionStart.status !== 0) fail('session-start failed', sessionStart);

    const dbPath = path.join(homeDir, '.vibe-science', 'db', 'vibe-science.db');
    const db = new Database(dbPath);
    const session = db.prepare(`SELECT id, integrity_status FROM sessions ORDER BY started_at DESC LIMIT 1`).get();
    if (!session?.id) fail('session-start did not persist a session', { dbPath });

    // Smoke uses pre-approved gate fixtures so it can focus on the
    // end-to-end TRACE lifecycle path. Gate logic itself is exercised
    // more thoroughly in __test_e2e.mjs.
    // NOTE: DC0 removed from runtime base gates (no producer exists) — only DQ4 needed.
    for (const gateId of ['DQ4']) {
        db.prepare(`
            INSERT INTO gate_checks
                (session_id, gate_id, claim_id, status, checks_passed, checks_warned, checks_failed, details, timestamp)
            VALUES (?, ?, ?, 'PASS', 1, 0, 0, ?, ?)
        `).run(
            session.id,
            gateId,
            'C-010',
            JSON.stringify({ smoke_fixture: true }),
            new Date().toISOString(),
        );
    }

    const claimWrite = runHook('plugin/scripts/post-tool-use.js', {
        session_id: session.id,
        cwd: projectDir,
        tool_name: 'Write',
        tool_input: {
            file_path: path.join(projectDir, 'CLAIM-LEDGER.md'),
            content: [
                '```vibe-claim',
                'id: C-010',
                'event_type: CREATED',
                'narrative: Found a supported signal with doi:10.1038/nature12373',
                '```',
            ].join('\n'),
        },
        tool_response: '',
    }, env);
    if (claimWrite.status !== 0 && claimWrite.status !== 2) fail('claim write hook failed', claimWrite);

    const seedWrite = runHook('plugin/scripts/post-tool-use.js', {
        session_id: session.id,
        cwd: projectDir,
        tool_name: 'Write',
        tool_input: {
            file_path: path.join(projectDir, 'SERENDIPITY.md'),
            content: [
                '```vibe-seed',
                'id: SEED-001',
                'source: SALVAGED_FROM_R2',
                'source_claim_id: C-010',
                'causal_question: Does the effect persist after confounder control?',
                'discriminating_test: Repeat with matched controls',
                '```',
            ].join('\n'),
        },
        tool_response: '',
    }, env);
    if (seedWrite.status !== 0 && seedWrite.status !== 2) fail('seed write hook failed', seedWrite);

    const stop = runHook('plugin/scripts/stop.js', {
        session_id: session.id,
        cwd: projectDir,
        project_path: projectDir,
    }, env);

    const schemaVersion = db.prepare(`SELECT value FROM meta WHERE key = 'schema_version'`).get();
    const claimEvents = db.prepare(`SELECT COUNT(*) AS n FROM claim_events WHERE session_id = ?`).get(session.id).n;
    const seedCount = db.prepare(`SELECT COUNT(*) AS n FROM serendipity_seeds WHERE created_session = ?`).get(session.id).n;
    const citationCount = db.prepare(`SELECT COUNT(*) AS n FROM citation_checks WHERE session_id = ?`).get(session.id).n;
    db.close();

    const checks = {
        setup_ready: parseJson(setup.stdout)?.status === 'ready',
        session_started: Boolean(session.id),
        schema_version: Number(schemaVersion?.value || 0),
        claim_events_populated: claimEvents > 0,
        serendipity_populated: seedCount > 0,
        citations_populated: citationCount > 0,
        stop_blocks_unreviewed_claims: stop.status === 2 && /TRACE lifecycle enforcement is active/i.test(stop.stderr),
    };

    const ok = checks.setup_ready
        && checks.session_started
        && checks.schema_version >= 4
        && checks.claim_events_populated
        && checks.serendipity_populated
        && checks.citations_populated
        && checks.stop_blocks_unreviewed_claims;

    const summary = {
        ok,
        db_path: dbPath,
        project_path: projectDir,
        checks,
    };

    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    process.exit(ok ? 0 : 1);
}

function runHook(relativeScript, payload, env) {
    return spawnSync(process.execPath, [relativeScript], {
        cwd: ROOT,
        env,
        input: JSON.stringify(payload),
        encoding: 'utf-8',
        timeout: 60000,
    });
}

function parseJson(text) {
    try {
        return JSON.parse(String(text || '').trim() || '{}');
    } catch {
        return null;
    }
}

function fail(message, details) {
    process.stderr.write(`${message}\n${JSON.stringify(details, null, 2)}\n`);
    process.exit(1);
}

main();
