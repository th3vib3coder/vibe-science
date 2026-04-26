import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const relUrl = (...segments) => pathToFileURL(path.join(ROOT, ...segments)).href;

const dbMod = await import(relUrl('plugin', 'lib', 'db.js'));
const migrationMod = await import(relUrl('plugin', 'lib', 'migrations.js'));
const claimIngestionMod = await import(relUrl('plugin', 'lib', 'claim-ingestion.js'));
const bridgeMod = await import(relUrl('plugin', 'scripts', 'r2-bridge-writer.js'));

let tempRoot = null;

afterEach(() => {
    if (tempRoot) {
        fs.rmSync(tempRoot, { recursive: true, force: true });
        tempRoot = null;
    }
});

function createHarness() {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phase9-r2-bridge-'));
    const dbPath = path.join(tempRoot, 'home', '.vibe-science', 'db', 'vibe-science.db');
    const projectRoot = path.join(tempRoot, 'project');
    const objectiveId = 'OBJ-R2-BRIDGE-001';
    const objectiveDir = path.join(projectRoot, '.vibe-science-environment', 'objectives', objectiveId);
    const eventLogPath = path.join(objectiveDir, 'events.jsonl');

    fs.mkdirSync(objectiveDir, { recursive: true });
    const db = dbMod.openDB(dbPath);
    dbMod.initDB(db);
    migrationMod.applyMigrations(db);
    dbMod.createSession(db, {
        id: 'sess-r2-bridge',
        project_path: projectRoot,
        started_at: '2026-04-26T10:00:00Z',
    });
    dbMod.logClaimEvent(db, {
        claim_id: 'C-001',
        session_id: 'sess-r2-bridge',
        event_type: 'CREATED',
        new_status: 'CREATED',
        confidence: 0.51,
        narrative: 'claim exists before R2 bridge',
        timestamp: '2026-04-26T10:01:00Z',
    });
    dbMod.closeDB(db);

    fs.writeFileSync(eventLogPath, `${JSON.stringify({
        eventId: 'EV-R2-BRIDGE-001',
        objectiveId,
        kind: 'r2-verdict',
        createdAt: '2026-04-26T10:02:00Z',
        payload: {
            gateId: 'PROMOTION_REQUIRES_R2_REVIEW',
            claimId: 'C-001',
            verdict: 'ACCEPT',
            reviewerRole: 'reviewer-2',
            handoffId: 'H-R2-BRIDGE-001',
            reviewedArtifactPaths: ['review/r2-verdict.md'],
            resolvedBlockerCodes: ['E_R2_REVIEW_PENDING'],
            summary: 'Reviewer-2 accepted the claim promotion evidence.',
        },
    })}\n`, 'utf8');

    return { dbPath, eventLogPath, objectiveId };
}

function createSiblingVreHarness() {
    const harness = createHarness();
    const workspaceRoot = tempRoot;
    const pluginRepoRoot = path.join(workspaceRoot, 'vibe-science');
    const vreRoot = path.join(workspaceRoot, 'vibe-research-environment');
    const objectiveDir = path.join(
        vreRoot,
        '.vibe-science-environment',
        'objectives',
        harness.objectiveId,
    );
    const eventLogPath = path.join(objectiveDir, 'events.jsonl');

    fs.mkdirSync(path.join(pluginRepoRoot, 'plugin', 'scripts'), { recursive: true });
    fs.writeFileSync(
        path.join(pluginRepoRoot, 'package.json'),
        JSON.stringify({ name: 'vibe-science-plugin' }),
        'utf8',
    );
    fs.writeFileSync(path.join(pluginRepoRoot, 'plugin', 'scripts', 'session-start.js'), '', 'utf8');
    fs.mkdirSync(path.join(vreRoot, 'bin'), { recursive: true });
    fs.mkdirSync(path.join(vreRoot, 'environment', 'schemas'), { recursive: true });
    fs.writeFileSync(
        path.join(vreRoot, 'package.json'),
        JSON.stringify({ name: 'vibe-research-environment' }),
        'utf8',
    );
    fs.writeFileSync(path.join(vreRoot, 'bin', 'vre'), '', 'utf8');
    fs.mkdirSync(objectiveDir, { recursive: true });
    fs.copyFileSync(harness.eventLogPath, eventLogPath);
    fs.appendFileSync(eventLogPath, '{"eventId":"PARTIAL-RACE"', 'utf8');

    return {
        ...harness,
        eventLogPath,
        pluginRepoRoot,
        vreRoot,
    };
}

test('T4.5.3.1: bridge mirrors VRE r2-verdict into exactly one plugin R2_REVIEWED claim event', () => {
    const harness = createHarness();

    const first = bridgeMod.bridgeR2Verdicts({
        dbPath: harness.dbPath,
        eventLogPath: harness.eventLogPath,
        sessionId: 'sess-r2-bridge',
    });
    const second = bridgeMod.bridgeR2Verdicts({
        dbPath: harness.dbPath,
        eventLogPath: harness.eventLogPath,
        sessionId: 'sess-r2-bridge',
    });

    assert.equal(first.inserted, 1);
    assert.equal(first.skipped, 0);
    assert.equal(second.inserted, 0);
    assert.equal(second.skipped, 1);

    const db = dbMod.openDB(harness.dbPath);
    try {
        const history = dbMod.getClaimHistory(db, 'C-001')
            .filter((event) => event.event_type === 'R2_REVIEWED');
        assert.equal(history.length, 1);
        assert.equal(history[0].new_status, null);
        assert.equal(history[0].r2_verdict, 'ACCEPT');
        assert.equal(history[0].gate_id, 'PROMOTION_REQUIRES_R2_REVIEW');
        assert.match(history[0].narrative, /EV-R2-BRIDGE-001/u);
        assert.match(history[0].narrative, /H-R2-BRIDGE-001/u);
    } finally {
        dbMod.closeDB(db);
    }
});

test('T4.5.3.1: bridge resolves objective events through sibling VRE and skips a partial race line', () => {
    const harness = createSiblingVreHarness();

    const result = bridgeMod.bridgeR2Verdicts({
        dbPath: harness.dbPath,
        objectiveId: harness.objectiveId,
        pluginRepoRoot: harness.pluginRepoRoot,
        sessionId: 'sess-r2-bridge',
    });

    assert.equal(result.inserted, 1);
    assert.equal(result.warnings.length, 1);
    assert.equal(result.warnings[0].code, 'partial-line-skipped');
});

test('T4.5.3.1: bridge fails closed when the objective event log is missing', () => {
    const harness = createHarness();
    fs.rmSync(harness.eventLogPath, { force: true });

    assert.throws(
        () => bridgeMod.bridgeR2Verdicts({
            dbPath: harness.dbPath,
            eventLogPath: harness.eventLogPath,
            sessionId: 'sess-r2-bridge',
        }),
        (error) => error instanceof bridgeMod.R2BridgeWriterError
            && error.code === 'E_R2_EVENT_LOG_MISSING',
    );
});

test('T4.5.3.1: missing bridge keeps promotion blocked; bridge write unblocks existing promotion gate', () => {
    const harness = createHarness();

    const promotionEvent = {
        claim_id: 'C-001',
        session_id: 'sess-r2-bridge',
        event_type: 'PROMOTED',
        new_status: 'PROMOTED',
        confidence: 0.82,
    };

    let db = dbMod.openDB(harness.dbPath);
    try {
        const violations = claimIngestionMod.validateClaimLifecycleTransitions(db, [promotionEvent]);
        assert.equal(violations.length, 1);
        assert.equal(violations[0].code, 'PROMOTION_REQUIRES_R2_REVIEW');
    } finally {
        dbMod.closeDB(db);
    }

    bridgeMod.bridgeR2Verdicts({
        dbPath: harness.dbPath,
        eventLogPath: harness.eventLogPath,
        sessionId: 'sess-r2-bridge',
    });

    db = dbMod.openDB(harness.dbPath);
    try {
        const violations = claimIngestionMod.validateClaimLifecycleTransitions(db, [promotionEvent]);
        assert.deepEqual(violations, []);
    } finally {
        dbMod.closeDB(db);
    }
});
