import test, { afterEach } from 'node:test';
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
const migrationMod = await import(relUrl('plugin', 'lib', 'migrations.js'));
const pathUtilsMod = await import(relUrl('plugin', 'lib', 'path-utils.js'));

let tempRoot = null;

afterEach(() => {
    if (tempRoot) {
        fs.rmSync(tempRoot, { recursive: true, force: true });
        tempRoot = null;
    }
});

function createHarness() {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-governance-hooks-'));
    const fakeHome = path.join(tempRoot, 'home');
    const projectDir = path.join(tempRoot, 'project');
    const dbPath = path.join(fakeHome, '.vibe-science', 'db', 'vibe-science.db');

    fs.mkdirSync(path.join(fakeHome, '.vibe-science', 'db'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, '.vibe-science'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, '.vibe-science', 'STATE.md'), '# state', 'utf-8');

    const db = dbMod.openDB(dbPath);
    dbMod.initDB(db);
    migrationMod.applyMigrations(db);

    const projectPath = pathUtilsMod.canonicalizeProjectPath(projectDir);
    dbMod.createSession(db, {
        id: 'sess-001',
        project_path: projectPath,
        started_at: '2026-03-31T10:00:00Z',
    });

    dbMod.closeDB(db);

    return {
        fakeHome,
        projectDir,
        dbPath,
        projectPath,
    };
}

function openHarnessDb(dbPath) {
    return dbMod.openDB(dbPath);
}

function normalizeSlashPath(value) {
    return String(value || '').replace(/\\/g, '/');
}

function spawnHook(scriptRelativePath, event, harness, cwd = harness.projectDir) {
    return spawnSync(
        process.execPath,
        [rel(scriptRelativePath)],
        {
            cwd,
            encoding: 'utf-8',
            input: JSON.stringify(event),
            env: {
                ...process.env,
                HOME: harness.fakeHome,
                USERPROFILE: harness.fakeHome,
            },
        }
    );
}

test('pre-tool-use logs claim_without_harness when CLAIM-LEDGER write omits confounder_status', () => {
    const harness = createHarness();

    const result = spawnHook('plugin/scripts/pre-tool-use.js', {
        tool_name: 'Write',
        tool_input: {
            file_path: path.join(harness.projectDir, 'CLAIM-LEDGER.md'),
            content: [
                'C-001',
                'event_type: CREATED',
                'confidence: 0.42',
                'narrative: test claim without harness',
            ].join('\n'),
        },
        session_id: 'sess-001',
        cwd: harness.projectDir,
    }, harness);

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'deny');
    assert.match(result.stderr, /LAW 9 VIOLATION/i);

    const db = openHarnessDb(harness.dbPath);
    try {
        const events = dbMod.getGovernanceEvents(db, {
            eventType: 'claim_without_harness',
            limit: 10,
        });
        assert.equal(events.length, 1);
        assert.equal(events[0].session_id, 'sess-001');
        assert.equal(events[0].tool_name, 'Write');
        assert.equal(events[0].severity, 'critical');
        assert.equal(
            normalizeSlashPath(events[0].details.file_path),
            normalizeSlashPath(path.join(harness.projectDir, 'CLAIM-LEDGER.md'))
        );
    } finally {
        dbMod.closeDB(db);
    }
});

test('pre-tool-use blocks protected schema writes and logs schema_modification_attempt', () => {
    const harness = createHarness();

    const result = spawnHook('plugin/scripts/pre-tool-use.js', {
        tool_name: 'Write',
        tool_input: {
            file_path: 'skills/vibe/assets/schemas/stage4-exit.schema.json',
            content: '{"type":"object"}',
        },
        session_id: 'sess-001',
        cwd: harness.projectDir,
    }, harness);

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'deny');
    assert.match(result.stderr, /IMMUTABLE FILE BLOCKED/i);

    const db = openHarnessDb(harness.dbPath);
    try {
        const events = dbMod.getGovernanceEvents(db, {
            eventType: 'schema_modification_attempt',
            limit: 10,
        });
        assert.equal(events.length, 1);
        assert.equal(events[0].tool_name, 'Write');
        assert.equal(events[0].details.protected_rule, 'skills/vibe/assets/schemas/*.schema.json');
        assert.equal(events[0].details.file_path, 'skills/vibe/assets/schemas/stage4-exit.schema.json');
    } finally {
        dbMod.closeDB(db);
    }
});

test('pre-tool-use blocks promotion without prior R2 review and logs r2_bypass_attempt', () => {
    const harness = createHarness();
    const db = openHarnessDb(harness.dbPath);
    try {
        dbMod.logClaimEvent(db, {
            claim_id: 'C-001',
            session_id: 'sess-001',
            event_type: 'CREATED',
            new_status: 'CREATED',
            confidence: 0.41,
            narrative: 'claim created but not reviewed',
            timestamp: '2026-03-31T10:05:00Z',
        });
    } finally {
        dbMod.closeDB(db);
    }

    const result = spawnHook('plugin/scripts/pre-tool-use.js', {
        tool_name: 'Write',
        tool_input: {
            file_path: path.join(harness.projectDir, 'CLAIM-LEDGER.md'),
            content: [
                'C-001',
                'event_type: PROMOTED',
                'new_status: PROMOTED',
                'confounder_status: ROBUST',
                'confidence: 0.82',
                'narrative: attempted promotion without R2 review',
            ].join('\n'),
        },
        session_id: 'sess-001',
        cwd: harness.projectDir,
    }, harness);

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'deny');
    assert.match(result.stderr, /R2 BYPASS BLOCKED/i);

    const verificationDb = openHarnessDb(harness.dbPath);
    try {
        const events = dbMod.getGovernanceEvents(verificationDb, {
            eventType: 'r2_bypass_attempt',
            limit: 10,
        });
        assert.equal(events.length, 1);
        assert.equal(events[0].tool_name, 'Write');
        assert.equal(events[0].details.claim_id, 'C-001');
        assert.equal(events[0].details.attempted_event_type, 'PROMOTED');
        assert.equal(events[0].details.latest_event_type, 'CREATED');
    } finally {
        dbMod.closeDB(verificationDb);
    }
});

test('pre-tool-use allows promotion after prior R2 review', () => {
    const harness = createHarness();
    const db = openHarnessDb(harness.dbPath);
    try {
        dbMod.logClaimEvent(db, {
            claim_id: 'C-001',
            session_id: 'sess-001',
            event_type: 'CREATED',
            new_status: 'CREATED',
            confidence: 0.41,
            narrative: 'claim created',
            timestamp: '2026-03-31T10:05:00Z',
        });
        dbMod.logClaimEvent(db, {
            claim_id: 'C-001',
            session_id: 'sess-001',
            event_type: 'R2_REVIEWED',
            new_status: null,
            r2_verdict: 'ACCEPT',
            narrative: 'claim reviewed by R2',
            timestamp: '2026-03-31T10:10:00Z',
        });
    } finally {
        dbMod.closeDB(db);
    }

    const result = spawnHook('plugin/scripts/pre-tool-use.js', {
        tool_name: 'Write',
        tool_input: {
            file_path: path.join(harness.projectDir, 'CLAIM-LEDGER.md'),
            content: [
                'C-001',
                'event_type: PROMOTED',
                'new_status: PROMOTED',
                'confounder_status: ROBUST',
                'confidence: 0.82',
                'narrative: promotion after review',
            ].join('\n'),
        },
        session_id: 'sess-001',
        cwd: harness.projectDir,
    }, harness);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'allow');
});

test('stop hook logs law_violation when unresolved claims block session end', () => {
    const harness = createHarness();
    const db = openHarnessDb(harness.dbPath);
    try {
        dbMod.logClaimEvent(db, {
            claim_id: 'C-001',
            session_id: 'sess-001',
            event_type: 'CREATED',
            new_status: 'CREATED',
            confidence: 0.5,
            narrative: 'unreviewed claim',
            timestamp: '2026-03-31T10:05:00Z',
        });
    } finally {
        dbMod.closeDB(db);
    }

    const result = spawnHook('plugin/scripts/stop.js', {
        session_id: 'sess-001',
        cwd: harness.projectDir,
        project_path: harness.projectDir,
    }, harness);

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.match(result.stderr, /STOP BLOCKED/i);

    const verificationDb = openHarnessDb(harness.dbPath);
    try {
        const events = dbMod.getGovernanceEvents(verificationDb, {
            eventType: 'law_violation',
            limit: 10,
        });
        assert.equal(events.length, 1);
        assert.equal(events[0].tool_name, 'Stop');
        assert.equal(events[0].details.law, 'LAW 4');
        assert.deepEqual(events[0].details.unreviewed_claim_ids, ['C-001']);
    } finally {
        dbMod.closeDB(verificationDb);
    }
});

test('post-tool-use blocks DELETE/UPDATE targeting governance_events and logs law_violation', () => {
    const harness = createHarness();

    const result = spawnHook('plugin/scripts/post-tool-use.js', {
        tool_name: 'Bash',
        tool_input: {
            command: 'sqlite3 ~/.vibe-science/db/vibe-science.db "DELETE FROM governance_events WHERE 1=1;"',
        },
        tool_response: { exit_code: 0, stdout: '' },
        session_id: 'sess-001',
        cwd: harness.projectDir,
    }, harness);

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.match(result.stderr, /GOVERNANCE EVENTS IMMUTABLE/i);

    const db = openHarnessDb(harness.dbPath);
    try {
        const events = dbMod.getGovernanceEvents(db, {
            eventType: 'law_violation',
            limit: 10,
        });
        assert.equal(events.length, 1);
        assert.equal(events[0].tool_name, 'Bash');
        assert.equal(events[0].details.source, 'bash_command');
        assert.match(events[0].details.snippet, /DELETE FROM governance_events/i);
    } finally {
        dbMod.closeDB(db);
    }
});

// ---------------------------------------------------------------------------
// Fixup-10 P1 #1: Bash writes to markdown deliverables are blocked because
// the delivery-discipline hook is wired to Write|Edit|MultiEdit only.
// Without this, an agent can redirect into a closeout file via shell and
// bypass the attestation barrier entirely.
// ---------------------------------------------------------------------------

test('fixup-10 P1 #1: pre-tool-use blocks Bash redirect-writes to deliverable markdown paths', () => {
    const harness = createHarness();

    const result = spawnHook('plugin/scripts/pre-tool-use.js', {
        tool_name: 'Bash',
        tool_input: {
            command: "echo 'Status: CLOSED' > phase99-closeout.md",
        },
        session_id: 'sess-001',
        cwd: harness.projectDir,
    }, harness);

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'deny');
    assert.match(result.stderr, /DELIVERY DISCIPLINE BLOCK \(Bash\)/i);
    assert.match(result.stderr, /phase99-closeout\.md/u);
});

test('fixup-10 P1 #1: pre-tool-use blocks PowerShell Set-Content into a deliverable', () => {
    const harness = createHarness();

    const result = spawnHook('plugin/scripts/pre-tool-use.js', {
        tool_name: 'Bash',
        tool_input: {
            command: "pwsh -c \"Set-Content final-report.md 'Status: CLOSED'\"",
        },
        session_id: 'sess-001',
        cwd: harness.projectDir,
    }, harness);

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.match(result.stderr, /DELIVERY DISCIPLINE BLOCK \(Bash\)/i);
});

test('fixup-10 P1 #1: pre-tool-use blocks cat-heredoc into a deliverable', () => {
    const harness = createHarness();

    const result = spawnHook('plugin/scripts/pre-tool-use.js', {
        tool_name: 'Bash',
        tool_input: {
            command: "cat > phase99-closeout.md <<EOF\nStatus: CLOSED\nEOF",
        },
        session_id: 'sess-001',
        cwd: harness.projectDir,
    }, harness);

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.match(result.stderr, /DELIVERY DISCIPLINE BLOCK \(Bash\)/i);
});

test('fixup-12 P1: pre-tool-use blocks Bash writes to any visible markdown path', () => {
    const harness = createHarness();

    const result = spawnHook('plugin/scripts/pre-tool-use.js', {
        tool_name: 'Bash',
        tool_input: {
            command: "echo 'just some notes' > notes.md",
        },
        session_id: 'sess-001',
        cwd: harness.projectDir,
    }, harness);

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.match(result.stderr, /DELIVERY DISCIPLINE BLOCK \(Bash\)/i);
});

test('fixup-12 P1: pre-tool-use still ALLOWS Bash writes to non-markdown scratch files', () => {
    const harness = createHarness();

    const result = spawnHook('plugin/scripts/pre-tool-use.js', {
        tool_name: 'Bash',
        tool_input: {
            command: "echo 'just some notes' > notes.txt",
        },
        session_id: 'sess-001',
        cwd: harness.projectDir,
    }, harness);

    assert.equal(result.status, 0, result.stderr || result.stdout);
});

for (const [label, command] of [
    ['bash concatenated variable path', "p=final; q=-report.md; echo 'Status: CLOSED' > $p$q"],
    ['bash command substitution path', "printf 'Status: CLOSED' > final$(echo -report).md"],
    ['PowerShell concatenated variable path', "$p='final' + '-report.md'; Set-Content $p 'Status: CLOSED'"],
    ['node computed writeFileSync path', "node -e \"const p='final'+'-report.md'; require('fs').writeFileSync(p,'Status: CLOSED')\""],
    ['python computed open-write path', "python -c \"p='final'+'-report.md'; open(p,'w').write('Status: CLOSED')\""],
    ['opaque variable target with no literal extension', "p=$env:OUT; Set-Content $p 'Status: CLOSED'"],
]) {
    test(`fixup-12 P1: pre-tool-use blocks computed Bash markdown write (${label})`, () => {
        const harness = createHarness();

        const result = spawnHook('plugin/scripts/pre-tool-use.js', {
            tool_name: 'Bash',
            tool_input: { command },
            session_id: 'sess-001',
            cwd: harness.projectDir,
        }, harness);

        assert.equal(result.status, 2, result.stderr || result.stdout);
        assert.match(result.stderr, /DELIVERY DISCIPLINE BLOCK \(Bash\)/i);
    });
}

test('fixup-10 P1 #1: pre-tool-use ALLOWS Bash writes to deliverables when VIBE_SCIENCE_DEV=1', () => {
    const harness = createHarness();

    const result = spawnSync(
        process.execPath,
        [rel('plugin/scripts/pre-tool-use.js')],
        {
            cwd: harness.projectDir,
            encoding: 'utf-8',
            input: JSON.stringify({
                tool_name: 'Bash',
                tool_input: { command: "echo 'Status: CLOSED' > phase99-closeout.md" },
                session_id: 'sess-001',
                cwd: harness.projectDir,
            }),
            env: {
                ...process.env,
                HOME: harness.fakeHome,
                USERPROFILE: harness.fakeHome,
                VIBE_SCIENCE_DEV: '1',
            },
        }
    );

    assert.equal(result.status, 0,
        `dev-mode env should bypass Bash deliverable block but got: ${result.stderr || result.stdout}`);
});

// ---------------------------------------------------------------------------
// Fixup-10/11 P1: guardrail files (hook scripts, dual-config registration,
// CI wiring, local settings, and canonical tests) are protected from
// self-modification so an agent cannot disable enforcement mid-session.
// VIBE_SCIENCE_DEV=1 is the escape hatch for plugin developers working
// on the hook itself.
// ---------------------------------------------------------------------------

const GUARDRAIL_SUBSTRATE_PATHS = [
    'plugin/scripts/pre-delivery-discipline.js',
    'plugin/scripts/pre-tool-use.js',
    '.claude/settings.json',
    '.claude/settings.local.json',
    'hooks/hooks.json',
    'package.json',
    'package-lock.json',
    '.github/workflows/ci.yml',
    '__test_e2e.mjs',
    'tests/governance-events.test.mjs',
    'tests/governance-hooks.test.mjs',
    'tests/delivery-discipline-skill.test.mjs',
    'tests/validate-delivery-honesty.test.mjs',
    'tests/delivery-discipline-hook.test.mjs',
];

for (const guardrailPath of GUARDRAIL_SUBSTRATE_PATHS) {
    test(`fixup-10 P1 #2: pre-tool-use blocks Write to guardrail file ${guardrailPath}`, () => {
        const harness = createHarness();

        const result = spawnHook('plugin/scripts/pre-tool-use.js', {
            tool_name: 'Write',
            tool_input: {
                file_path: guardrailPath,
                content: '// disabled\n',
            },
            session_id: 'sess-001',
            cwd: harness.projectDir,
        }, harness);

        assert.equal(result.status, 2, result.stderr || result.stdout);
        assert.match(result.stderr, /GUARDRAIL SELF-MODIFICATION BLOCKED/i,
            `expected guardrail-specific deny message for ${guardrailPath}`);
    });
}

test('fixup-11 P1: .claude/settings.json deny-list includes every guardrail substrate path', () => {
    const settings = JSON.parse(fs.readFileSync(rel('.claude/settings.json'), 'utf-8'));
    const deny = settings.permissions?.deny ?? [];

    for (const guardrailPath of GUARDRAIL_SUBSTRATE_PATHS) {
        const settingRulePath = guardrailPath.startsWith('.')
            ? `**/${guardrailPath}`
            : `**/${guardrailPath}`;
        assert.ok(
            deny.includes(`Edit(${settingRulePath})`),
            `.claude/settings.json must deny Edit for ${guardrailPath}`,
        );
        assert.ok(
            deny.includes(`Write(${settingRulePath})`),
            `.claude/settings.json must deny Write for ${guardrailPath}`,
        );
    }
});

test('fixup-10 P1 #2: VIBE_SCIENCE_DEV=1 unblocks guardrail edits (plugin developer escape)', () => {
    const harness = createHarness();

    const result = spawnSync(
        process.execPath,
        [rel('plugin/scripts/pre-tool-use.js')],
        {
            cwd: harness.projectDir,
            encoding: 'utf-8',
            input: JSON.stringify({
                tool_name: 'Write',
                tool_input: {
                    file_path: 'plugin/scripts/pre-delivery-discipline.js',
                    content: '// dev-mode edit\n',
                },
                session_id: 'sess-001',
                cwd: harness.projectDir,
            }),
            env: {
                ...process.env,
                HOME: harness.fakeHome,
                USERPROFILE: harness.fakeHome,
                VIBE_SCIENCE_DEV: '1',
            },
        }
    );

    assert.equal(result.status, 0,
        `dev-mode env should bypass guardrail self-modification block but got: ${result.stderr || result.stdout}`);
});

test('fixup-10 P1 #2: a look-alike name (foopre-tool-use.js) does NOT count as guardrail protection', () => {
    // Basename suffix match must be anchored by `/` so attackers cannot
    // smuggle dangerous edits under a similar name.
    const harness = createHarness();

    const result = spawnHook('plugin/scripts/pre-tool-use.js', {
        tool_name: 'Write',
        tool_input: {
            file_path: 'foopre-tool-use.js',
            content: '// harmless\n',
        },
        session_id: 'sess-001',
        cwd: harness.projectDir,
    }, harness);

    // Not a guardrail path → no guardrail-specific deny. (Whether it's
    // allowed or blocked for some other reason is out of scope here;
    // the assertion is only that it does NOT hit the guardrail branch.)
    if (result.status === 2) {
        // If any deny happens, it must NOT be the guardrail message.
        assert.doesNotMatch(result.stderr, /GUARDRAIL SELF-MODIFICATION BLOCKED/i);
    } else {
        assert.equal(result.status, 0);
    }
});
