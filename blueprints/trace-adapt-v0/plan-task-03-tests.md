# Task 3: Tests and Readiness Validation

**Files:**
- Modify: `__test_e2e.mjs`

**Spec reference:** [04-test-and-readiness.md](./04-test-and-readiness.md)

**Depends on:** Task 1 + Task 2

---

## Part A: Update B1 inventory

- [ ] **Step 1: Add harness-hints.js to the libs array**

In `__test_e2e.mjs`, find the `libs` array (line ~75-93) and add after `'plugin/lib/citation-engine.js'`:

```js
        'plugin/lib/harness-hints.js',
```

- [ ] **Step 2: Update the file count assertion**

Find line 116-117:
```js
    it('all 29 JS files are present', () => {
        assert.equal(allJsFiles.length, 29, 'Expected exactly 29 JS files (12 scripts + 17 libs)');
```

Change to:
```js
    it('all 30 JS files are present', () => {
        assert.equal(allJsFiles.length, 30, 'Expected exactly 30 JS files (12 scripts + 18 libs)');
```

Also update the stale descriptive header comment at the top of `__test_e2e.mjs` so the file inventory description stays truthful after adding `plugin/lib/harness-hints.js`.

---

## Part B: Add B9 test block

- [ ] **Step 3: Add B9 harness hints test block**

At the end of `__test_e2e.mjs`, before the final summary output, add a new `describe('B9. Harness Hints Tests', ...)` block. The block must contain:

**Required test cases (13 total):**

1. `harness-hints.js exports computeHarnessHints` — verify the function is exported
2. `returns empty string when no failures exist` — empty DB, empty result
3. `H-01 activates after DQ4 fails in 2+ sessions` — insert 2 sessions with DQ4 FAIL, verify `[H-01]` in output
4. `H-01 does NOT activate with only 1 session failure` — 1 session, verify absent
5. `gate cooldown: hint deactivates after 3 clean sessions` — 2 old failures + 3 clean sessions, verify absent
6. `gate cooldown: hint stays active with fewer than 3 clean completed sessions` — 2 older failure sessions + only 2 later clean sessions, verify stays active
7. `observer behavior: H-09 fires for STATE.md stale messages` — assert through the actual module behavior, not a duplicated regex literal
8. `observer behavior: H-11 matches only Design-execution drift` — must NOT match "Data drift" or "Concept drift"
9. `max 3 hints returned` — 5 gate failures, verify output has at most 3 hint lines
10. `graceful degradation: broken DB adapter returns empty string` — pass an object whose `prepare()` throws; verify no exception escapes and result is empty
11. `session-start output includes HARNESS HINTS when expected` — integration check against real `session-start.js` output, not just `computeHarnessHints()`
12. `session-start output omits HARNESS HINTS when no recurring failures exist` — integration check against real `session-start.js` output
13. `final assembled session-start context stays within budget sentinel` — use the real hook output and assert the final context remains under the agreed approximate ceiling

**Test helpers needed:**

```js
// Helper: create in-memory DB with schema
async function setupHintsDb() {
    const Database = (await import('better-sqlite3')).default;
    const db = new Database(':memory:');
    db.exec(fs.readFileSync(rel('plugin', 'db', 'schema.sql'), 'utf-8'));
    return db;
}

// Helper: insert a completed session
function insertSession(db, id, projectPath, endedAt) {
    db.prepare(`
        INSERT INTO sessions (id, project_path, started_at, ended_at)
        VALUES (?, ?, datetime('now'), ?)
    `).run(id, projectPath, endedAt);
}

// Helper: insert a gate failure
function insertGateFail(db, sessionId, gateId) {
    db.prepare(`
        INSERT INTO gate_checks (session_id, gate_id, status, timestamp)
        VALUES (?, ?, 'FAIL', datetime('now'))
    `).run(sessionId, gateId);
}

// Helper: insert an observer alert
function insertAlert(db, projectPath, message, createdAt) {
    db.prepare(`
        INSERT INTO observer_alerts (project_path, level, message, created_at)
        VALUES (?, 'WARN', ?, ?)
    `).run(projectPath, message, createdAt);
}

// Helper: create an isolated on-disk DB for the real SessionStart hook.
async function setupIsolatedHintsDb(tempHome) {
    const Database = (await import('better-sqlite3')).default;
    const dbDir = path.join(tempHome, '.vibe-science', 'db');
    fs.mkdirSync(dbDir, { recursive: true });
    const dbPath = path.join(dbDir, 'vibe-science.db');
    const db = new Database(dbPath);
    db.exec(fs.readFileSync(rel('plugin', 'db', 'schema.sql'), 'utf-8'));
    return { db, dbPath };
}

// Helper: run SessionStart against an isolated temp HOME / USERPROFILE.
function runIsolatedSessionStart(tempHome, payload) {
    const result = spawnSync('node', [rel('plugin', 'scripts', 'session-start.js')], {
        cwd: ROOT,
        input: JSON.stringify(payload),
        encoding: 'utf-8',
        timeout: 30000,
        env: {
            ...process.env,
            HOME: tempHome,
            USERPROFILE: tempHome,
        },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return JSON.parse(result.stdout);
}

function approxTokenCount(text) {
    return Math.ceil(String(text || '').length / 4);
}
```

**Integration check requirement (must use real SessionStart output):**

The inclusion/omission/budget checks must execute `plugin/scripts/session-start.js` through the hook protocol and inspect `hookSpecificOutput.additionalContext`. A pure unit test on `computeHarnessHints()` is not sufficient because V0 appends `[HARNESS HINTS]` after context formatting, alongside `[PATTERNS]` and optional `[DOMAIN]`.

Because `session-start.js` ultimately reads the default DB under `os.homedir()`, these tests must seed an isolated temp DB and override `HOME` / `USERPROFILE` before spawning the hook. Otherwise the test can read or mutate the developer's real `~/.vibe-science` state.

Recommended pattern:

```js
const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'trace-adapt-'));
const tempProject = fs.mkdtempSync(path.join(os.tmpdir(), 'trace-adapt-project-'));
const { db } = await setupIsolatedHintsDb(tempHome);
insertSession(db, 's1', tempProject, '2026-03-26T08:00:00.000Z');
insertGateFail(db, 's1', 'DQ4');
insertSession(db, 's2', tempProject, '2026-03-26T09:00:00.000Z');
insertGateFail(db, 's2', 'DQ4');
db.close();

const output = runIsolatedSessionStart(tempHome, { cwd: tempProject });
const text = output.hookSpecificOutput.additionalContext;
assert.match(text, /\[HARNESS HINTS\]/);
assert.match(text, /\[H-01\]/);
assert.ok(approxTokenCount(text) <= 850);
```

For the cooldown guard test, the fixture must be ordered as:

- failure session
- failure session
- clean completed session
- clean completed session

This is the only shape that catches accidental deactivation after just 1-2 clean sessions.

**Observer regression assertions (critical for V0 debt):**

```js
const mod = await import(relUrl('plugin', 'lib', 'harness-hints.js'));

// H-09: assert through the actual module behavior
insertAlert(db, projectPath, 'STATE.md has not been updated in 48 hours. Consider updating...', nowIso);
insertAlert(db, projectPath, 'STATE.md has not been updated in 72 hours (>72h limit). The project state is severely stale.', tomorrowIso);
assert.match(mod.computeHarnessHints(db, projectPath), /\[H-09\]/);

// H-11: must not fire for generic drift prose
insertAlert(db2, projectPath, 'Data drift detected in feature distribution.', nowIso);
assert.doesNotMatch(mod.computeHarnessHints(db2, projectPath), /\[H-11\]/);
insertAlert(db2, projectPath, 'Design-execution drift: STATE.md says phase is "DATA" but 80% of actions are "MODEL_TRAIN".', tomorrowIso);
assert.match(mod.computeHarnessHints(db2, projectPath), /\[H-11\]/);
```

- [ ] **Step 4: Run full test suite**

Run: `cd vibe-science && node --test __test_e2e.mjs`
Expected: all tests pass including new B9 block

- [ ] **Step 5: Run smoke**

Run: `node evals/smoke-trace.mjs`
Expected: PASS

- [ ] **Step 6: Run readiness**

Run: `node scripts/v7-readiness.mjs`
Expected: PASS (this runs `node --test __test_e2e.mjs` internally)

- [ ] **Step 7: Commit**

```bash
git add __test_e2e.mjs
git commit -m "test(trace-adapt): add B9 harness hints test block

13 test cases: activation, cooldown, observer regression, max hints,
graceful degradation, isolated SessionStart integration, budget sentinel.
Updates B1 inventory count from 29 to 30.

Spec: blueprints/trace-adapt-v0/04-test-and-readiness.md"
```
