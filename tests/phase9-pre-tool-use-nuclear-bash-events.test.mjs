import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const VRE_ROOT = path.resolve(ROOT, '..', 'vibe-research-environment');
const rel = (...segments) => path.join(ROOT, ...segments);
const relUrl = (...segments) => pathToFileURL(path.join(ROOT, ...segments)).href;
const vreUrl = (...segments) => pathToFileURL(path.join(VRE_ROOT, ...segments)).href;

const dbMod = await import(relUrl('plugin', 'lib', 'db.js'));
const migrationMod = await import(relUrl('plugin', 'lib', 'migrations.js'));
const manifestMod = await import(vreUrl('environment', 'lib', 'manifest.js'));
const storeMod = await import(vreUrl('environment', 'objectives', 'store.js'));

const analysisFixture = JSON.parse(
  fs.readFileSync(
    path.join(
      VRE_ROOT,
      'environment',
      'tests',
      'fixtures',
      'phase9',
      'analysis-manifest',
      'valid-python.json',
    ),
    'utf8',
  ),
);
const objectiveFixture = JSON.parse(
  fs.readFileSync(
    path.join(
      VRE_ROOT,
      'environment',
      'tests',
      'fixtures',
      'phase9',
      'objective',
      'valid-active.json',
    ),
    'utf8',
  ),
);
const pointerFixture = JSON.parse(
  fs.readFileSync(
    path.join(
      VRE_ROOT,
      'environment',
      'tests',
      'fixtures',
      'phase9',
      'active-objective-pointer',
      'valid-active.json',
    ),
    'utf8',
  ),
);

const cleanupRoots = [];

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function removeWithRetry(targetPath) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      fs.rmSync(targetPath, { recursive: true, force: true });
      return;
    } catch (error) {
      if (error.code !== 'EPERM') throw error;
      if (attempt === 9) return;
      sleepMs(100);
    }
  }
}

afterEach(() => {
  while (cleanupRoots.length > 0) {
    removeWithRetry(cleanupRoots.pop());
  }
});

function createWorkspace(prefix = 'vibe-phase9-pre-tool-use-') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  cleanupRoots.push(root);

  const fakeHome = path.join(root, 'home');
  const pluginRoot = path.join(root, 'vibe-science');
  const vreRoot = path.join(root, 'vibe-research-environment');
  const dbPath = path.join(fakeHome, '.vibe-science', 'db', 'vibe-science.db');

  fs.mkdirSync(path.join(pluginRoot, 'plugin', 'scripts'), { recursive: true });
  fs.writeFileSync(
    path.join(pluginRoot, 'package.json'),
    JSON.stringify({ name: 'vibe-science-plugin', type: 'module' }, null, 2),
    'utf8',
  );
  fs.writeFileSync(path.join(pluginRoot, 'plugin', 'scripts', 'session-start.js'), 'export default null;\n', 'utf8');

  fs.cpSync(path.join(VRE_ROOT, 'environment'), path.join(vreRoot, 'environment'), { recursive: true });
  fs.mkdirSync(path.join(vreRoot, 'bin'), { recursive: true });
  fs.writeFileSync(
    path.join(vreRoot, 'package.json'),
    JSON.stringify({ name: 'vibe-research-environment', type: 'module' }, null, 2),
    'utf8',
  );
  fs.writeFileSync(path.join(vreRoot, 'bin', 'vre'), '#!/usr/bin/env node\n', 'utf8');
  if (fs.existsSync(path.join(VRE_ROOT, 'node_modules'))) {
    fs.symlinkSync(path.join(VRE_ROOT, 'node_modules'), path.join(vreRoot, 'node_modules'), 'junction');
  }
  fs.mkdirSync(fakeHome, { recursive: true });
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = dbMod.openDB(dbPath);
  dbMod.initDB(db);
  migrationMod.applyMigrations(db);
  dbMod.createSession(db, {
    id: 'sess-nuclear',
    project_path: pluginRoot,
    started_at: '2026-04-29T00:00:00.000Z',
  });
  dbMod.closeDB(db);

  return { root, fakeHome, pluginRoot, vreRoot, dbPath };
}

function createClaimWorkspace() {
  const workspace = createWorkspace('vibe-phase9-pre-tool-claim-');
  const projectDir = path.join(workspace.root, 'project');
  fs.mkdirSync(path.join(projectDir, '.vibe-science'), { recursive: true });
  fs.writeFileSync(path.join(projectDir, '.vibe-science', 'STATE.md'), '# state\n', 'utf8');
  return { ...workspace, projectDir };
}

async function writeObjectiveState(vreRoot, objectiveId, experimentId) {
  const objectiveRecord = {
    ...structuredClone(objectiveFixture),
    objectiveId,
    status: 'active',
    artifactsIndex: {
      ...structuredClone(objectiveFixture.artifactsIndex ?? {}),
      experiments: [experimentId],
    },
  };
  await storeMod.activateObjective(vreRoot, objectiveRecord, {
    sessionId: pointerFixture.lockAcquiredBySession ?? 'sess-nuclear',
    lockAcquiredAt: pointerFixture.lockAcquiredAt,
  });
}

async function writeExperimentManifest(vreRoot, experimentId) {
  await manifestMod.createManifest(vreRoot, {
    experimentId,
    title: `Phase 9 nuclear event manifest ${experimentId}`,
    objective: 'OBJ-NUCLEAR-001',
  });
}

function writeAnalysisManifest(vreRoot, objectiveId, experimentId) {
  const manifestPath = path.join(
    vreRoot,
    '.vibe-science-environment',
    'objectives',
    objectiveId,
    'analysis-manifest.json',
  );
  const payload = {
    ...structuredClone(analysisFixture),
    objectiveId,
    experimentId,
    analysisId: 'ANL-NUCLEAR-001',
  };
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(payload, null, 2), 'utf8');
  return manifestPath;
}

function spawnPreToolUse(workspace, event, envOverrides = {}) {
  return spawnSync(
    process.execPath,
    [rel('plugin', 'scripts', 'pre-tool-use.js')],
    {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 30000,
      input: JSON.stringify(event),
      env: {
        ...process.env,
        HOME: workspace.fakeHome,
        USERPROFILE: workspace.fakeHome,
        ...envOverrides,
      },
    },
  );
}

function spawnBash(workspace, command, envOverrides = {}) {
  return spawnPreToolUse(
    workspace,
    {
      tool_name: 'Bash',
      tool_input: { command },
      session_id: 'sess-nuclear',
      cwd: workspace.pluginRoot,
    },
    envOverrides,
  );
}

function openGovernanceDb(dbPath) {
  const db = dbMod.openDB(dbPath);
  dbMod.initDB(db);
  migrationMod.applyMigrations(db);
  return db;
}

function readGovernanceEvents(dbPath, eventType) {
  const db = openGovernanceDb(dbPath);
  try {
    return dbMod.getGovernanceEvents(db, { eventType, limit: 20 });
  } finally {
    dbMod.closeDB(db);
  }
}

function assertNoDetailsLeak(details, forbiddenValues) {
  const serialized = JSON.stringify(details);
  for (const value of forbiddenValues) {
    assert.ok(!serialized.includes(value), `details leaked forbidden value: ${value}`);
  }
}

function assertNoNuclearEvents(dbPath) {
  assert.equal(readGovernanceEvents(dbPath, 'nuclear_bash_denied_bash').length, 0);
  assert.equal(readGovernanceEvents(dbPath, 'nuclear_bash_denied_allowlist_passed').length, 0);
}

test('nuclear Bash deny logs nuclear_bash_denied_bash governance event with hashed command signature', () => {
  const workspace = createWorkspace();
  const command = 'python secret-phase9-nuclear.py';
  const result = spawnBash(workspace, command, {
    SECRET_FOOBAR: 'xyz-phase9-nuclear-secret-sentinel',
  });

  assert.equal(result.status, 2, result.stderr || result.stdout);
  assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'deny');

  const events = readGovernanceEvents(workspace.dbPath, 'nuclear_bash_denied_bash');
  assert.equal(events.length, 1);
  assert.equal(events[0].session_id, 'sess-nuclear');
  assert.equal(events[0].source_component, 'plugin/hooks/pre-tool-use');
  assert.equal(events[0].objective_id, null);
  assert.equal(events[0].severity, 'warning');
  assert.match(events[0].details.command_signature, /^SIG-[a-f0-9]{12}$/u);
  assert.equal(events[0].details.command_class, 'external-script-invocation');
  assert.equal(events[0].details.reason, 'external-script-invocation');
  assertNoDetailsLeak(events[0].details, [
    command,
    'secret-phase9-nuclear.py',
    'xyz-phase9-nuclear-secret-sentinel',
    workspace.pluginRoot,
    workspace.fakeHome,
  ]);
});

test('sanctioned VRE allowlist pass logs nuclear_bash_denied_allowlist_passed governance event', async () => {
  const workspace = createWorkspace();
  const objectiveId = 'OBJ-NUCLEAR-001';
  const experimentId = 'EXP-115';
  await writeObjectiveState(workspace.vreRoot, objectiveId, experimentId);
  await writeExperimentManifest(workspace.vreRoot, experimentId);
  const manifestPath = writeAnalysisManifest(workspace.vreRoot, objectiveId, experimentId);
  const manifestArg = path.relative(workspace.pluginRoot, manifestPath).split(path.sep).join('/');
  const command = [
    'node',
    '../vibe-research-environment/bin/vre',
    'run-analysis',
    '--manifest',
    manifestArg,
  ].join(' ');

  const result = spawnBash(workspace, command, { VIBE_PHASE9_ENABLED: '1' });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'allow');

  const events = readGovernanceEvents(workspace.dbPath, 'nuclear_bash_denied_allowlist_passed');
  assert.equal(events.length, 1);
  assert.equal(events[0].session_id, 'sess-nuclear');
  assert.equal(events[0].source_component, 'plugin/hooks/pre-tool-use');
  assert.equal(events[0].objective_id, null);
  assert.equal(events[0].severity, 'info');
  assert.equal(events[0].details.path_pattern, 'vre-run-analysis-literal-manifest');
  assert.equal(events[0].details.allowlist_rule, 'vre-run-analysis-literal-manifest');
  assertNoDetailsLeak(events[0].details, [
    command,
    manifestArg,
    manifestPath,
    workspace.vreRoot,
    workspace.pluginRoot,
    workspace.fakeHome,
  ]);
});

test('nuclear governance event details never persist raw command, env secrets, or sensitive paths', () => {
  const workspace = createWorkspace();
  const command = 'rm -rf ./sensitive-runtime-state';
  const result = spawnBash(workspace, command, {
    SECRET_FOOBAR: 'xyz-phase9-nuclear-redaction-sentinel',
  });

  assert.equal(result.status, 2, result.stderr || result.stdout);

  const events = readGovernanceEvents(workspace.dbPath, 'nuclear_bash_denied_bash');
  assert.equal(events.length, 1);
  assert.match(events[0].details.command_signature, /^SIG-[a-f0-9]{12}$/u);
  assert.equal(events[0].details.command_class, 'delete-primitive');
  assert.equal(events[0].details.reason, 'delete-primitive');
  assertNoDetailsLeak(events[0].details, [
    command,
    './sensitive-runtime-state',
    'sensitive-runtime-state',
    'xyz-phase9-nuclear-redaction-sentinel',
    workspace.pluginRoot,
    workspace.fakeHome,
  ]);
});

test('Phase 8 claim_without_harness event remains unchanged and unshadowed by nuclear events', () => {
  const workspace = createClaimWorkspace();
  const result = spawnPreToolUse(workspace, {
    tool_name: 'Write',
    tool_input: {
      file_path: path.join(workspace.projectDir, 'CLAIM-LEDGER.md'),
      content: [
        'C-001',
        'event_type: CREATED',
        'confidence: 0.42',
        'narrative: test claim without harness',
      ].join('\n'),
    },
    session_id: 'sess-nuclear',
    cwd: workspace.projectDir,
  });

  assert.equal(result.status, 2, result.stderr || result.stdout);

  const claimEvents = readGovernanceEvents(workspace.dbPath, 'claim_without_harness');
  assert.equal(claimEvents.length, 1);
  assert.equal(claimEvents[0].event_type, 'claim_without_harness');
  assert.equal(claimEvents[0].source_component, null);
  assert.equal(claimEvents[0].objective_id, null);
  assert.equal(claimEvents[0].tool_name, 'Write');
  assert.equal(claimEvents[0].severity, 'critical');
  assertNoNuclearEvents(workspace.dbPath);
});

test('nuclear telemetry failure does not change the original Bash deny decision', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-phase9-pre-tool-unwritable-home-'));
  cleanupRoots.push(root);
  const badHome = path.join(root, 'home-as-file');
  fs.writeFileSync(badHome, 'not a directory\n', 'utf8');
  const pluginRoot = path.join(root, 'vibe-science');
  fs.mkdirSync(path.join(pluginRoot, 'plugin', 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(pluginRoot, 'plugin', 'scripts', 'session-start.js'), 'export default null;\n', 'utf8');
  fs.writeFileSync(
    path.join(pluginRoot, 'package.json'),
    JSON.stringify({ name: 'vibe-science-plugin', type: 'module' }, null, 2),
    'utf8',
  );

  const result = spawnSync(
    process.execPath,
    [rel('plugin', 'scripts', 'pre-tool-use.js')],
    {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 30000,
      input: JSON.stringify({
        tool_name: 'Bash',
        tool_input: { command: 'python secret-phase9-nuclear.py' },
        session_id: 'sess-nuclear',
        cwd: pluginRoot,
      }),
      env: {
        ...process.env,
        HOME: badHome,
        USERPROFILE: badHome,
      },
    },
  );

  assert.equal(result.status, 2, result.stderr || result.stdout);
  assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'deny');
  assert.match(result.stderr, /Opzione B nuclear/i);
});
