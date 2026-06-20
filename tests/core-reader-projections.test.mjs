import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
    closeDB,
    initDB,
    logClaimEvent,
    openDB,
} from '../plugin/lib/db.js';
import {
    applyMigrations,
    columnExists,
} from '../plugin/lib/migrations.js';
import {
    getProjectionMeta,
    listCitationChecks,
    listR2Reviews,
} from '../plugin/lib/core-reader.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CORE_READER_PATH = path.join(ROOT, 'plugin', 'lib', 'core-reader.js');

function createTempKernelDb() {
    const tempDir = mkdtempSync(path.join(tmpdir(), 'core-reader-projection-'));
    const dbPath = path.join(tempDir, 'vibe-science.db');
    const db = openDB(dbPath);
    if (!db) {
        rmSync(tempDir, { recursive: true, force: true });
        return { skipped: true, reason: 'better-sqlite3 not available' };
    }

    initDB(db);
    applyMigrations(db);

    assert.equal(columnExists(db, 'citation_checks', 'confidence'), false);
    assert.equal(columnExists(db, 'citation_checks', 'source'), false);
    assert.equal(columnExists(db, 'citation_checks', 'updated_at'), false);
    assert.equal(columnExists(db, 'citation_checks', 'source_url'), true);
    assert.equal(columnExists(db, 'citation_checks', 'checked_at'), true);

    db.prepare(`
        INSERT INTO sessions (id, project_path, started_at)
        VALUES (@id, @projectPath, @startedAt)
    `).run({
        id: 'SESSION-CORE-READER',
        projectPath: ROOT,
        startedAt: '2026-06-18T10:00:00.000Z',
    });

    db.prepare(`
        INSERT INTO citation_checks (
            citation_id,
            session_id,
            claim_id,
            raw_ref,
            citation_text,
            citation_type,
            normalized_id,
            verification_status,
            resolver,
            source_url,
            resolved_source_type,
            checked_at,
            created_at
        )
        VALUES (
            @citationId,
            @sessionId,
            @claimId,
            @rawRef,
            @citationText,
            @citationType,
            @normalizedId,
            @verificationStatus,
            @resolver,
            @sourceUrl,
            @resolvedSourceType,
            @checkedAt,
            @createdAt
        )
    `).run({
        citationId: 'CIT-CORE-READER-001',
        sessionId: 'SESSION-CORE-READER',
        claimId: 'CLAIM-CORE-READER',
        rawRef: 'Smith 2026',
        citationText: 'Smith 2026',
        citationType: 'DOI',
        normalizedId: '10.0000/example',
        verificationStatus: 'VERIFIED',
        resolver: 'DOI_ORG',
        sourceUrl: 'https://doi.org/10.0000/example',
        resolvedSourceType: 'peer_reviewed',
        checkedAt: '2026-06-18T10:15:00.000Z',
        createdAt: '2026-06-18T10:05:00.000Z',
    });

    closeDB(db);
    return { dbPath, tempDir };
}

test('listCitationChecks uses migration-backed citation columns', (t) => {
    const harness = createTempKernelDb();
    if (harness.skipped) {
        t.skip(harness.reason);
        return;
    }

    try {
        const rows = listCitationChecks({
            dbPath: harness.dbPath,
            projectPath: ROOT,
            limit: 10,
        });
        const meta = getProjectionMeta(rows);

        assert.equal(meta.sourceMode, 'kernel-backed', meta.degradedReason ?? '');
        assert.equal(rows.length, 1);
        assert.equal(rows[0].citationId, 'CIT-CORE-READER-001');
        assert.equal(rows[0].verificationStatus, 'VERIFIED');
        assert.equal(rows[0].updatedAt, '2026-06-18T10:15:00.000Z');
        assert.equal(rows[0].source, 'https://doi.org/10.0000/example');
        assert.equal(rows[0].confidence, null);
    } finally {
        rmSync(harness.tempDir, { recursive: true, force: true });
    }
});

test('listR2Reviews projects R2_REVIEWED claim events as schema-shaped rows', (t) => {
    const harness = createTempKernelDb();
    if (harness.skipped) {
        t.skip(harness.reason);
        return;
    }

    const db = openDB(harness.dbPath);
    try {
        logClaimEvent(db, {
            claim_id: 'CLAIM-CORE-READER-R2',
            session_id: 'SESSION-CORE-READER',
            event_type: 'R2_VERDICT',
            old_status: 'CREATED',
            new_status: 'R2_REVIEWED',
            r2_verdict: 'ACCEPT',
            timestamp: '2026-06-18T10:30:00.000Z',
        });
    } finally {
        closeDB(db);
    }

    try {
        const projection = listR2Reviews({
            dbPath: harness.dbPath,
            projectPath: ROOT,
            limit: 10,
        });
        const meta = getProjectionMeta(projection);

        assert.equal(meta.sourceMode, 'kernel-backed', meta.degradedReason ?? '');
        assert.equal(projection.schemaVersion, 'phase9.r2-projection.v1');
        assert.equal(projection.records.length, 1);
        assert.deepEqual(projection.records[0], {
            claimId: 'CLAIM-CORE-READER-R2',
            r2VerdictEventId: 'EV-0001',
            status: 'resolved',
            resolved: true,
            severity: 'low',
            reviewedAt: '2026-06-18T10:30:00.000Z',
        });
    } finally {
        rmSync(harness.tempDir, { recursive: true, force: true });
    }
});

test('listGateChecks projection does not run full test suite in hot path', () => {
    const source = fs.readFileSync(CORE_READER_PATH, 'utf8');

    assert.doesNotMatch(
        source,
        /spawnSync\(\s*process\.execPath,\s*\[\s*['"]--test['"]/u
    );
    assert.doesNotMatch(source, /governance hook probe .* passed/u);
    assert.doesNotMatch(source, /probeExitCode/u);
});
