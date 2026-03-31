import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const relUrl = (...segments) => pathToFileURL(path.join(ROOT, ...segments)).href;

const dbMod = await import(relUrl('plugin', 'lib', 'db.js'));
const migrationMod = await import(relUrl('plugin', 'lib', 'migrations.js'));

let tempRoot = null;

afterEach(() => {
    if (tempRoot) {
        fs.rmSync(tempRoot, { recursive: true, force: true });
        tempRoot = null;
    }
});

function makeTempDbPath(name) {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-governance-'));
    return path.join(tempRoot, name);
}

function triggerNamesFor(db, tableName) {
    return db.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'trigger' AND tbl_name = ?
        ORDER BY name ASC
    `).all(tableName).map(row => row.name);
}

describe('governance_events substrate', () => {
    it('creates the append-only governance_events table on a fresh database', () => {
        const db = dbMod.openDB(makeTempDbPath('fresh.db'));
        assert.ok(db, 'better-sqlite3 must be available for governance DB tests');

        try {
            dbMod.initDB(db);
            const migration = migrationMod.applyMigrations(db);

            assert.equal(migration.currentVersion, 5);
            assert.equal(migrationMod.getSchemaVersion(db), 5);
            assert.ok(
                db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'governance_events'`).get(),
                'governance_events table should exist after init'
            );
            assert.deepEqual(triggerNamesFor(db, 'governance_events'), [
                'governance_events_no_delete',
                'governance_events_no_update',
            ]);

            dbMod.logGovernanceEvent(db, {
                session_id: null,
                event_type: 'law_violation',
                tool_name: 'Write',
                severity: 'CRITICAL',
                details: { law: 'LAW 3', reason: 'immutable schema touched' },
            });

            const events = dbMod.getGovernanceEvents(db, { limit: 10 });
            assert.equal(events.length, 1);
            assert.match(events[0].id, /^GOV-/);
            assert.equal(events[0].event_type, 'law_violation');
            assert.equal(events[0].severity, 'critical');
            assert.deepEqual(events[0].details, {
                law: 'LAW 3',
                reason: 'immutable schema touched',
            });

            assert.throws(() => {
                db.exec(`UPDATE governance_events SET severity = 'warning'`);
            }, /append-only/);

            assert.throws(() => {
                db.exec(`DELETE FROM governance_events`);
            }, /append-only/);
        } finally {
            dbMod.closeDB(db);
        }
    });

    it('upgrades a v4 database in place by adding governance_events at schema version 5', () => {
        const db = dbMod.openDB(makeTempDbPath('v4.db'));
        assert.ok(db, 'better-sqlite3 must be available for governance DB tests');

        try {
            db.exec(`
                CREATE TABLE meta (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
                CREATE TABLE sessions (
                    id TEXT PRIMARY KEY
                );
            `);
            db.prepare(`
                INSERT INTO meta (key, value, updated_at)
                VALUES ('schema_version', '4', datetime('now'))
            `).run();

            const migration = migrationMod.applyMigrations(db);

            assert.deepEqual(migration.applied, [5]);
            assert.equal(migration.currentVersion, 5);
            assert.equal(migrationMod.getSchemaVersion(db), 5);
            assert.ok(
                db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'governance_events'`).get(),
                'governance_events should be created during migration'
            );

            dbMod.logGovernanceEvent(db, {
                id: 'GOV-TEST-001',
                session_id: null,
                event_type: 'schema_modification_attempt',
                tool_name: 'Edit',
                severity: 'warning',
                details: 'immutable schema write blocked',
                timestamp: 1767225600000,
            });

            const events = dbMod.getGovernanceEvents(db, {
                eventType: 'schema_modification_attempt',
                limit: 5,
            });

            assert.equal(events.length, 1);
            assert.equal(events[0].id, 'GOV-TEST-001');
            assert.equal(events[0].details, 'immutable schema write blocked');
            assert.equal(events[0].timestamp, 1767225600000);
        } finally {
            dbMod.closeDB(db);
        }
    });
});
