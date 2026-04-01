import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const relUrl = (...segments) => pathToFileURL(path.join(ROOT, ...segments)).href;
const rel = (...segments) => path.join(ROOT, ...segments);

const dbMod = await import(relUrl('plugin', 'lib', 'db.js'));
const coreReaderMod = await import(relUrl('plugin', 'lib', 'core-reader.js'));
const pathUtilsMod = await import(relUrl('plugin', 'lib', 'path-utils.js'));

describe('core-reader integration', () => {
    let tempRoot;
    let projectDir;
    let dbPath;
    let canonicalProjectPath;

    before(() => {
        tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-reader-'));
        projectDir = path.join(tempRoot, 'Project A');
        dbPath = path.join(tempRoot, 'reader.db');
        fs.mkdirSync(path.join(projectDir, '.vibe-science'), { recursive: true });
        fs.writeFileSync(
            path.join(projectDir, '.vibe-science', 'STATE.md'),
            '# Vibe Science — State\n\n## Last Session\nReader integration test.\n',
            'utf-8'
        );

        canonicalProjectPath = pathUtilsMod.canonicalizeProjectPath(projectDir);

        const db = dbMod.openDB(dbPath);
        dbMod.initDB(db);

        dbMod.createSession(db, {
            id: 'sess-001',
            project_path: canonicalProjectPath,
            started_at: '2026-03-28T08:00:00Z',
        });
        dbMod.endSession(db, 'sess-001', {
            ended_at: '2026-03-28T08:30:00Z',
            narrative_summary: 'Early work on the project.',
            total_actions: 3,
            claims_created: 2,
            claims_killed: 0,
            gates_passed: 1,
            gates_failed: 0,
        });

        dbMod.createSession(db, {
            id: 'sess-002',
            project_path: canonicalProjectPath,
            started_at: '2026-03-28T09:00:00Z',
        });
        dbMod.endSession(db, 'sess-002', {
            ended_at: '2026-03-28T09:45:00Z',
            narrative_summary: 'Promoted claim C-001 and opened C-002.',
            total_actions: 7,
            claims_created: 2,
            claims_killed: 1,
            gates_passed: 2,
            gates_failed: 1,
        });

        dbMod.logClaimEvent(db, {
            claim_id: 'C-001',
            session_id: 'sess-001',
            event_type: 'CREATED',
            new_status: 'CREATED',
            confidence: 0.41,
            narrative: 'Initial draft for C-001',
            timestamp: '2026-03-28T08:05:00Z',
        });
        dbMod.logClaimEvent(db, {
            claim_id: 'C-001',
            session_id: 'sess-001',
            event_type: 'R2_REVIEWED',
            new_status: null,
            r2_verdict: 'ACCEPT',
            narrative: 'R2 reviewed C-001',
            timestamp: '2026-03-28T08:10:00Z',
        });
        dbMod.logClaimEvent(db, {
            claim_id: 'C-001',
            session_id: 'sess-002',
            event_type: 'PROMOTED',
            new_status: 'PROMOTED',
            confidence: 0.82,
            narrative: 'C-001 promoted after review',
            timestamp: '2026-03-28T09:10:00Z',
        });

        dbMod.logClaimEvent(db, {
            claim_id: 'C-002',
            session_id: 'sess-002',
            event_type: 'CREATED',
            new_status: 'CREATED',
            confidence: 0.33,
            narrative: 'Unresolved new claim',
            timestamp: '2026-03-28T09:20:00Z',
        });

        dbMod.logClaimEvent(db, {
            claim_id: 'C-003',
            session_id: 'sess-002',
            event_type: 'CREATED',
            new_status: 'CREATED',
            confidence: 0.25,
            narrative: 'Created then reviewed',
            timestamp: '2026-03-28T09:25:00Z',
        });
        dbMod.logClaimEvent(db, {
            claim_id: 'C-003',
            session_id: 'sess-002',
            event_type: 'R2_REVIEWED',
            new_status: null,
            r2_verdict: 'ACCEPT',
            narrative: 'C-003 reviewed but not promoted',
            timestamp: '2026-03-28T09:30:00Z',
        });

        dbMod.logClaimEvent(db, {
            claim_id: 'C-004',
            session_id: 'sess-002',
            event_type: 'CREATED',
            new_status: 'CREATED',
            confidence: 0.19,
            narrative: 'Later killed claim',
            timestamp: '2026-03-28T09:32:00Z',
        });
        dbMod.logClaimEvent(db, {
            claim_id: 'C-004',
            session_id: 'sess-002',
            event_type: 'KILLED',
            new_status: 'KILLED',
            kill_reason: 'PREMATURE',
            narrative: 'Killed claim C-004',
            timestamp: '2026-03-28T09:40:00Z',
        });

        dbMod.logGateCheck(db, {
            session_id: 'sess-002',
            gate_id: 'D1',
            claim_id: 'C-001',
            status: 'PASS',
            checks_passed: 3,
            timestamp: '2026-03-28T09:11:00Z',
        });
        dbMod.logGateCheck(db, {
            session_id: 'sess-002',
            gate_id: 'L-1+',
            claim_id: 'C-002',
            status: 'FAIL',
            checks_failed: 1,
            details: { reason: 'No literature search logged' },
            timestamp: '2026-03-28T09:21:00Z',
        });

        dbMod.logLiteratureSearch(db, {
            session_id: 'sess-002',
            query: 'single cell batch correction ablation',
            sources: ['pubmed', 'openalex'],
            results_count: 9,
            relevant_count: 3,
            key_papers: ['10.1000/example-doi'],
            search_layer: 'WEBSEARCH',
            gate_context: 'OTAE_CONTINUOUS',
            timestamp: '2026-03-28T09:05:00Z',
        });

        dbMod.createAlert(db, {
            project_path: canonicalProjectPath,
            level: 'WARN',
            message: 'Open review debt remains',
            created_at: '2026-03-28T09:35:00Z',
        });

        dbMod.logSerendipitySeed(db, {
            seed_id: 'SEED-001',
            created_session: 'sess-002',
            status: 'PENDING_TRIAGE',
            source: 'SCANNER',
            score: 0.74,
            causal_question: 'Could batch correction flip the sign of C-001?',
            created_at: '2026-03-28T09:15:00Z',
            updated_at: '2026-03-28T09:15:00Z',
        });

        dbMod.upsertCitationCheck(db, {
            citation_id: 'CIT-001',
            session_id: 'sess-002',
            claim_id: 'C-001',
            raw_ref: '10.1000/example-doi',
            citation_type: 'DOI',
            normalized_id: '10.1000/example-doi',
            verification_status: 'VERIFIED',
            resolver: 'CROSSREF',
            resolved_title: 'A verified paper',
            checked_at: '2026-03-28T09:12:00Z',
        });
        dbMod.upsertCitationCheck(db, {
            citation_id: 'CIT-002',
            session_id: 'sess-002',
            claim_id: 'C-002',
            raw_ref: '10.1000/pending-doi',
            citation_type: 'DOI',
            normalized_id: '10.1000/pending-doi',
            verification_status: 'PENDING',
        });

        dbMod.upsertPattern(db, {
            pattern_type: 'REPEATED_ACTION',
            description: 'Researcher repeatedly revisits batch correction',
            evidence: ['sess-001', 'sess-002'],
            confidence: 0.8,
            project_path: canonicalProjectPath,
        });

        db.close();
    });

    after(() => {
        fs.rmSync(tempRoot, { recursive: true, force: true });
    });

    it('createReader exposes normalized project projections against a temp DB', () => {
        process.env.VIBE_SCIENCE_DB_PATH = dbPath;
        const reader = coreReaderMod.createReader(projectDir);

        try {
            assert.equal(reader.dbAvailable, true);
            assert.equal(reader.projectPath, canonicalProjectPath);

            const overview = reader.getProjectOverview();
            assert.equal(overview.projectPath, canonicalProjectPath);
            assert.equal(overview.lastSession?.id, 'sess-002');
            assert.equal(overview.lastSession?.narrativeSummary, 'Promoted claim C-001 and opened C-002.');
            assert.equal(overview.unresolvedAlertCount, 1);
            assert.equal(overview.pendingSeedCount, 1);
            assert.equal(overview.activePatternCount, 1);
            assert.equal(overview.recentGateFailures.length, 1);
            assert.equal(overview.recentGateFailures[0].gateId, 'L-1+');

            const heads = reader.listClaimHeads();
            assert.equal(heads.length, 4);
            assert.equal(heads.find(row => row.claimId === 'C-001')?.currentStatus, 'PROMOTED');
            assert.equal(heads.find(row => row.claimId === 'C-003')?.currentStatus, 'CREATED');
            assert.equal(heads.find(row => row.claimId === 'C-004')?.isActive, false);

            const unresolved = reader.listUnresolvedClaims();
            assert.deepEqual(
                unresolved.map(row => row.claimId),
                ['C-002', 'C-001'],
                'resolved-by-R2 claim C-003 should not appear in unresolved set'
            );

            const gateChecks = reader.listGateChecks({ statuses: ['FAIL'] });
            assert.equal(gateChecks.length, 1);
            assert.deepEqual(gateChecks[0].details, { reason: 'No literature search logged' });

            const searches = reader.listLiteratureSearches();
            assert.equal(searches.length, 1);
            assert.deepEqual(searches[0].sources, ['pubmed', 'openalex']);
            assert.deepEqual(searches[0].keyPapers, ['10.1000/example-doi']);

            const alerts = reader.listObserverAlerts();
            assert.equal(alerts.length, 1);
            assert.equal(alerts[0].resolved, false);

            const citationChecks = reader.listCitationChecks({ claimId: 'C-001' });
            assert.equal(citationChecks.length, 1);
            assert.equal(citationChecks[0].verificationStatus, 'VERIFIED');

            const snapshot = reader.getStateSnapshot();
            assert.equal(snapshot.exists, true);
            assert.match(snapshot.content, /Reader integration test/);
        } finally {
            reader.close();
            delete process.env.VIBE_SCIENCE_DB_PATH;
        }
    });

    it('core-reader-cli returns the stable JSON envelope', () => {
        const env = { ...process.env, VIBE_SCIENCE_DB_PATH: dbPath };
        const result = spawnSync(
            'node',
            [rel('plugin', 'scripts', 'core-reader-cli.js'), 'overview', '--project', projectDir],
            { cwd: ROOT, encoding: 'utf-8', env }
        );

        assert.equal(result.status, 0, result.stderr || result.stdout);
        const payload = JSON.parse(result.stdout);
        assert.equal(payload.ok, true);
        assert.equal(payload.projection, 'overview');
        assert.equal(payload.projectPath, canonicalProjectPath);
        assert.equal(payload.data.lastSession.id, 'sess-002');
    });

    it('core-reader-cli returns a JSON error envelope for bad projections', () => {
        const env = { ...process.env, VIBE_SCIENCE_DB_PATH: dbPath };
        const result = spawnSync(
            'node',
            [rel('plugin', 'scripts', 'core-reader-cli.js'), 'not-a-projection', '--project', projectDir],
            { cwd: ROOT, encoding: 'utf-8', env }
        );

        assert.notEqual(result.status, 0);
        const payload = JSON.parse(result.stdout);
        assert.equal(payload.ok, false);
        assert.equal(payload.error.code, 'INVALID_ARGUMENT');
    });
});
