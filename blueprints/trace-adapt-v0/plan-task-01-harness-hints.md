# Task 1: Create harness-hints.js

**Files:**
- Create: `plugin/lib/harness-hints.js`

**Spec reference:** [02-registry-and-queries.md](./02-registry-and-queries.md)

---

- [ ] **Step 1: Create module skeleton with exports**

Create `plugin/lib/harness-hints.js`:

```js
/**
 * Vibe Science v7.0 TRACE — Harness Hint Registry (V0)
 *
 * Deterministic catalog: no new tables, no LLM calls, no migrations.
 * Computes active hints on-the-fly from existing gate_checks and observer_alerts.
 * Consumer: session-start.js → [HARNESS HINTS] section.
 *
 * Spec: blueprints/trace-adapt-v0/02-registry-and-queries.md
 */

const MAX_HINTS = 3;
const COOLDOWN_SESSIONS = 3;
const COOLDOWN_DAYS = 7;

// ─────────────────────────────────────────────────────────────────────
// Catalog
// ─────────────────────────────────────────────────────────────────────

const CATALOG = [
  // Gate-based (source: gate_checks JOIN sessions)
  {
    id: 'H-01',
    query: (db, pp) => gateFailureStrength(db, pp, 'DQ4'),
    hint: 'DQ4 ricorrente: confronta ogni numero con il JSON sorgente prima di scrivere FINDINGS.md. Genera il .md dal JSON, non viceversa.',
  },
  {
    id: 'H-03',
    query: (db, pp) => gateFailureStrength(db, pp, 'L-1+'),
    hint: 'L-1+ ricorrente: esegui literature search (WebSearch, PubMed, OpenAlex) PRIMA di definire qualsiasi direzione OTAE.',
  },
  {
    id: 'H-05',
    query: (db, pp) => gateFailureStrength(db, pp, 'L0'),
    hint: 'L0 ricorrente: verifica DOI/PMID subito dopo averli scritti, non a fine sessione.',
  },
  {
    id: 'H-06',
    query: (db, pp) => gateFailureStrength(db, pp, 'D1'),
    hint: 'D1 ricorrente: prima di promuovere un claim, verifica che tutte le citazioni siano VERIFIED.',
  },
  {
    id: 'H-07',
    query: (db, pp) => gateFailureStrength(db, pp, 'SALVAGENTE'),
    hint: 'Salvagente ricorrente: genera il seed di serendipity PRIMA di scrivere il kill in CLAIM-LEDGER.',
  },

  // Observer-based (source: observer_alerts — V0 debt: regex on prose)
  {
    id: 'H-09',
    query: (db, pp) => observerAlertStrength(db, pp, /STATE\.md.*(?:stale|not been updated)/i),
    hint: 'STATE.md stale ricorrente: aggiornalo ad ogni ciclo OTAE, non solo a fine sessione.',
  },
  {
    id: 'H-10',
    query: (db, pp) => observerAlertStrength(db, pp, /desync|SSOT/i),
    hint: 'Desync SSOT ricorrente: modifica il JSON prima, poi rigenera il .md. Mai editare il .md direttamente.',
  },
  {
    id: 'H-11',
    query: (db, pp) => observerAlertStrength(db, pp, /Design-execution drift/),
    hint: 'Drift ricorrente: a inizio ciclo, leggi STATE.md e allinea le azioni alla fase dichiarata.',
  },
];

// ─────────────────────────────────────────────────────────────────────
// Signal strength: gate-based
// ─────────────────────────────────────────────────────────────────────

function gateFailureStrength(db, projectPath, gateId) {
  const row = db.prepare(`
    SELECT COUNT(DISTINCT gc.session_id) AS session_count
    FROM gate_checks gc
    JOIN sessions s ON gc.session_id = s.id
    WHERE s.project_path = ?
      AND gc.gate_id = ?
      AND gc.status = 'FAIL'
  `).get(projectPath, gateId);

  if (!row || row.session_count < 2) return null;

  // Cooldown: require at least COOLDOWN_SESSIONS completed sessions
  const completedCount = db.prepare(`
    SELECT COUNT(*) AS cnt FROM sessions
    WHERE project_path = ? AND ended_at IS NOT NULL
  `).get(projectPath);

  if (completedCount && completedCount.cnt >= COOLDOWN_SESSIONS) {
    const recentFailures = db.prepare(`
      SELECT COUNT(*) AS cnt
      FROM gate_checks gc
      WHERE gc.session_id IN (
        SELECT id FROM sessions
        WHERE project_path = ? AND ended_at IS NOT NULL
        ORDER BY ended_at DESC
        LIMIT ?
      )
      AND gc.gate_id = ?
      AND gc.status = 'FAIL'
    `).get(projectPath, COOLDOWN_SESSIONS, gateId);

    if (recentFailures && recentFailures.cnt === 0) return null;
  }

  return { strength: Math.min(1.0, 0.3 + (row.session_count * 0.15)) };
}

// ─────────────────────────────────────────────────────────────────────
// Signal strength: observer-based
// ─────────────────────────────────────────────────────────────────────

function observerAlertStrength(db, projectPath, messagePattern) {
  const rows = db.prepare(`
    SELECT message, created_at
    FROM observer_alerts
    WHERE project_path = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(projectPath);

  const matching = rows.filter(r => messagePattern.test(r.message));
  const distinctDays = new Set(
    matching.map(r => r.created_at?.slice(0, 10)).filter(Boolean)
  );

  if (distinctDays.size < 2) return null;

  // Cooldown: no matching alert in last COOLDOWN_DAYS days
  const cutoff = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const recentMatch = matching.some(r => r.created_at > cutoff);
  if (!recentMatch) return null;

  return { strength: Math.min(1.0, 0.3 + (distinctDays.size * 0.15)) };
}

// ─────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────

/**
 * Compute active harness hints for the current session.
 * Called by session-start.js after buildContext().
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} projectPath
 * @returns {string} formatted hint lines, or empty string
 */
export function computeHarnessHints(db, projectPath) {
  if (!db) return '';

  const active = [];

  for (const entry of CATALOG) {
    try {
      const result = entry.query(db, projectPath);
      if (!result) continue;
      active.push({ id: entry.id, strength: result.strength, text: entry.hint });
    } catch {
      // Individual hint eval failed — skip, never block
    }
  }

  if (active.length === 0) return '';

  active.sort((a, b) => b.strength - a.strength);
  const top = active.slice(0, MAX_HINTS);
  return top.map(h => `  [${h.id}] ${h.text}`).join('\n');
}

// Exported for testing only
export { CATALOG, gateFailureStrength, observerAlertStrength, MAX_HINTS, COOLDOWN_SESSIONS, COOLDOWN_DAYS };
```

- [ ] **Step 2: Verify syntax**

Run: `node --check plugin/lib/harness-hints.js`
Expected: exit 0, no output

- [ ] **Step 3: Verify import**

Run: `node -e "import('./plugin/lib/harness-hints.js').then(m => console.log(typeof m.computeHarnessHints))"`
Expected: `function`

- [ ] **Step 4: Commit**

```bash
git add plugin/lib/harness-hints.js
git commit -m "feat(trace-adapt): add harness-hints.js catalog registry V0

Deterministic catalog of 8 hints (5 gate-based, 3 observer-based).
Computed on-the-fly from gate_checks and observer_alerts.
No new tables, no LLM calls, no schema changes.

Spec: blueprints/trace-adapt-v0/02-registry-and-queries.md"
```
