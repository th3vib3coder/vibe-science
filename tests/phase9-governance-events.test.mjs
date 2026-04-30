import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  closeDB,
  getGovernanceEvents,
  initDB,
  logGovernanceEvent,
  openDB,
} from '../plugin/lib/db.js';
import { applyMigrations, columnExists } from '../plugin/lib/migrations.js';
import {
  ALL_GOVERNANCE_EVENT_TYPES,
  GovernanceEventValidationError,
  KNOWN_GOVERNANCE_SOURCE_COMPONENTS,
  PHASE8_LEGACY_GOVERNANCE_EVENT_TYPES,
  PHASE9_GOVERNANCE_EVENT_TYPES,
  isKnownGovernanceEventType,
  isPhase9GovernanceEventType,
  logPhase9GovernanceEvent,
  validatePhase9GovernanceEvent,
} from '../plugin/lib/phase9-governance-events.js';

function withTempDb(testBody) {
  return async (t) => {
    const tempDir = mkdtempSync(path.join(tmpdir(), 'phase9-governance-events-'));
    const dbPath = path.join(tempDir, 'test.sqlite');
    const db = openDB(dbPath);
    if (!db) {
      rmSync(tempDir, { recursive: true, force: true });
      t.skip('better-sqlite3 not available');
      return;
    }
    try {
      initDB(db);
      applyMigrations(db);
      await testBody({ db, dbPath, tempDir });
    } finally {
      closeDB(db);
      rmSync(tempDir, { recursive: true, force: true });
    }
  };
}

test('PHASE9_GOVERNANCE_EVENT_TYPES has the 17 spec-listed event types', () => {
  assert.equal(PHASE9_GOVERNANCE_EVENT_TYPES.length, 17);
  for (const eventType of [
    'handshake_injected',
    'handshake_degraded',
    'objective_started',
    'objective_paused',
    'objective_resumed',
    'objective_blocked',
    'objective_completed',
    'analysis_run_started',
    'analysis_run_completed',
    'loop_iteration',
    'heartbeat',
    'semantic_drift_detected',
    'state_conflict_detected',
    'state_repair_applied',
    'nuclear_bash_denied_bash',
    'nuclear_bash_denied_allowlist_passed',
    'kernel_vre_truth_mismatch',
  ]) {
    assert.equal(
      PHASE9_GOVERNANCE_EVENT_TYPES.includes(eventType),
      true,
      `expected ${eventType} in Phase 9 allowlist`,
    );
    assert.equal(isPhase9GovernanceEventType(eventType), true);
    assert.equal(isKnownGovernanceEventType(eventType), true);
  }
});

test('PHASE8_LEGACY_GOVERNANCE_EVENT_TYPES preserves the existing Phase 8 types', () => {
  for (const eventType of [
    'claim_without_harness',
    'law_violation',
    'schema_modification_attempt',
  ]) {
    assert.equal(
      PHASE8_LEGACY_GOVERNANCE_EVENT_TYPES.includes(eventType),
      true,
      `expected ${eventType} preserved as Phase 8 legacy`,
    );
    assert.equal(isKnownGovernanceEventType(eventType), true);
    // Phase 8 events are NOT Phase 9 types
    assert.equal(isPhase9GovernanceEventType(eventType), false);
  }
});

test('KNOWN_GOVERNANCE_SOURCE_COMPONENTS includes soft-probe control-plane sources', () => {
  for (const sourceComponent of [
    'vre/control/capabilities',
    'vre/control/middleware',
  ]) {
    assert.equal(
      KNOWN_GOVERNANCE_SOURCE_COMPONENTS.includes(sourceComponent),
      true,
      `expected ${sourceComponent} in governance source component allowlist`,
    );
    const validated = validatePhase9GovernanceEvent({
      event_type: 'kernel_vre_truth_mismatch',
      source_component: sourceComponent,
      severity: 'critical',
      details: {
        projectionName: 'listUnresolvedClaims',
        errorClass: 'KernelBridgeContractMismatchError',
      },
    });
    assert.equal(validated.source_component, sourceComponent);
  }
});

test('ALL_GOVERNANCE_EVENT_TYPES is the merged union of Phase 8 + Phase 9', () => {
  assert.equal(
    ALL_GOVERNANCE_EVENT_TYPES.length,
    PHASE8_LEGACY_GOVERNANCE_EVENT_TYPES.length + PHASE9_GOVERNANCE_EVENT_TYPES.length,
  );
});

test('validatePhase9GovernanceEvent: each Phase 9 event type validates with minimal payload', () => {
  for (const eventType of PHASE9_GOVERNANCE_EVENT_TYPES) {
    const validated = validatePhase9GovernanceEvent({ event_type: eventType });
    assert.equal(validated.event_type, eventType);
  }
});

test('validatePhase9GovernanceEvent: each Phase 8 legacy event type validates', () => {
  for (const eventType of PHASE8_LEGACY_GOVERNANCE_EVENT_TYPES) {
    const validated = validatePhase9GovernanceEvent({ event_type: eventType });
    assert.equal(validated.event_type, eventType);
  }
});

test('validatePhase9GovernanceEvent: unknown event_type is rejected with E_GOVERNANCE_EVENT_TYPE_UNKNOWN', () => {
  try {
    validatePhase9GovernanceEvent({ event_type: 'totally_made_up_event' });
    assert.fail('expected GovernanceEventValidationError');
  } catch (error) {
    assert.equal(error instanceof GovernanceEventValidationError, true);
    assert.equal(error.code, 'E_GOVERNANCE_EVENT_TYPE_UNKNOWN');
  }
});

test('validatePhase9GovernanceEvent: missing event_type is rejected with E_GOVERNANCE_EVENT_TYPE_REQUIRED', () => {
  try {
    validatePhase9GovernanceEvent({});
    assert.fail('expected GovernanceEventValidationError');
  } catch (error) {
    assert.equal(error instanceof GovernanceEventValidationError, true);
    assert.equal(error.code, 'E_GOVERNANCE_EVENT_TYPE_REQUIRED');
  }
});

test('validatePhase9GovernanceEvent: null event is rejected with E_GOVERNANCE_EVENT_INVALID', () => {
  try {
    validatePhase9GovernanceEvent(null);
    assert.fail('expected GovernanceEventValidationError');
  } catch (error) {
    assert.equal(error.code, 'E_GOVERNANCE_EVENT_INVALID');
  }
});

test('validatePhase9GovernanceEvent: invalid severity is rejected', () => {
  try {
    validatePhase9GovernanceEvent({
      event_type: 'objective_started',
      severity: 'urgent',
    });
    assert.fail('expected GovernanceEventValidationError');
  } catch (error) {
    assert.equal(error.code, 'E_GOVERNANCE_EVENT_SEVERITY_INVALID');
  }
});

test('validatePhase9GovernanceEvent: Phase 9 event with non-OBJ-prefixed objective_id is rejected', () => {
  try {
    validatePhase9GovernanceEvent({
      event_type: 'objective_started',
      objective_id: 'NOT-AN-OBJ-PREFIX',
    });
    assert.fail('expected GovernanceEventValidationError');
  } catch (error) {
    assert.equal(error.code, 'E_GOVERNANCE_EVENT_OBJECTIVE_ID_INVALID');
  }
});

test('validatePhase9GovernanceEvent: Phase 9 event with OBJ-prefixed objective_id validates', () => {
  const validated = validatePhase9GovernanceEvent({
    event_type: 'objective_started',
    objective_id: 'OBJ-T51-EXAMPLE',
  });
  assert.equal(validated.objective_id, 'OBJ-T51-EXAMPLE');
});

test('validatePhase9GovernanceEvent: Phase 8 legacy event with non-OBJ objective_id is permitted', () => {
  const validated = validatePhase9GovernanceEvent({
    event_type: 'claim_without_harness',
    objective_id: 'CLAIM-LEGACY-123',
  });
  assert.equal(validated.objective_id, 'CLAIM-LEGACY-123');
});

test('validatePhase9GovernanceEvent: empty source_component is rejected', () => {
  try {
    validatePhase9GovernanceEvent({
      event_type: 'objective_started',
      source_component: '',
    });
    assert.fail('expected GovernanceEventValidationError');
  } catch (error) {
    assert.equal(error.code, 'E_GOVERNANCE_EVENT_SOURCE_COMPONENT_INVALID');
  }
});

test('validatePhase9GovernanceEvent: non-string source_component is rejected', () => {
  try {
    validatePhase9GovernanceEvent({
      event_type: 'objective_started',
      source_component: 42,
    });
    assert.fail('expected GovernanceEventValidationError');
  } catch (error) {
    assert.equal(error.code, 'E_GOVERNANCE_EVENT_SOURCE_COMPONENT_INVALID');
  }
});

test('validatePhase9GovernanceEvent: invalid timestamp is rejected', () => {
  try {
    validatePhase9GovernanceEvent({
      event_type: 'objective_started',
      timestamp: 'not-a-number',
    });
    assert.fail('expected GovernanceEventValidationError');
  } catch (error) {
    assert.equal(error.code, 'E_GOVERNANCE_EVENT_TIMESTAMP_INVALID');
  }
});

test('migration step 6 adds objective_id and source_component columns to governance_events', withTempDb(async ({ db }) => {
  assert.equal(columnExists(db, 'governance_events', 'objective_id'), true);
  assert.equal(columnExists(db, 'governance_events', 'source_component'), true);
}));

test('logGovernanceEvent persists objective_id and source_component round-trip', withTempDb(async ({ db }) => {
  // session_id omitted: governance_events.session_id is a FK to sessions(id);
  // testing the new Phase 9 columns does not require an existing session row.
  const inserted = logGovernanceEvent(db, {
    id: 'GOV-T51-RT-1',
    event_type: 'objective_started',
    objective_id: 'OBJ-T51-ROUNDTRIP',
    source_component: 'vre/objectives/cli',
    severity: 'info',
    details: { reasoningMode: 'rule-only' },
  });
  assert.equal(inserted.changes, 1);
  const events = getGovernanceEvents(db, { eventType: 'objective_started' });
  assert.equal(events.length, 1);
  assert.equal(events[0].objective_id, 'OBJ-T51-ROUNDTRIP');
  assert.equal(events[0].source_component, 'vre/objectives/cli');
  assert.equal(events[0].event_type, 'objective_started');
  assert.deepEqual(events[0].details, { reasoningMode: 'rule-only' });
}));

test('logPhase9GovernanceEvent validates then persists', withTempDb(async ({ db }) => {
  const result = logPhase9GovernanceEvent(db, {
    event_type: 'heartbeat',
    objective_id: 'OBJ-T51-HB',
    source_component: 'vre/orchestrator/autonomy-runtime',
    details: { wakeId: 'WAKE-T51', wakeCaller: 'windows-task-scheduler' },
  });
  assert.equal(result.changes, 1);
  const events = getGovernanceEvents(db, { eventType: 'heartbeat' });
  assert.equal(events.length, 1);
  assert.equal(events[0].objective_id, 'OBJ-T51-HB');
  assert.equal(events[0].source_component, 'vre/orchestrator/autonomy-runtime');
  assert.equal(events[0].details.wakeId, 'WAKE-T51');
}));

test('logPhase9GovernanceEvent rejects unknown event_type before writing', withTempDb(async ({ db }) => {
  try {
    logPhase9GovernanceEvent(db, { event_type: 'fictional_event_type' });
    assert.fail('expected GovernanceEventValidationError');
  } catch (error) {
    assert.equal(error instanceof GovernanceEventValidationError, true);
    assert.equal(error.code, 'E_GOVERNANCE_EVENT_TYPE_UNKNOWN');
  }
  const events = getGovernanceEvents(db, { eventType: 'fictional_event_type' });
  assert.equal(events.length, 0, 'invalid event must not have been written');
}));

test('logPhase9GovernanceEvent without DB returns structured E_GOVERNANCE_EVENT_DB_UNAVAILABLE', () => {
  const result = logPhase9GovernanceEvent(null, {
    event_type: 'objective_started',
    objective_id: 'OBJ-T51-NODB',
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'E_GOVERNANCE_EVENT_DB_UNAVAILABLE');
  assert.equal(result.event.event_type, 'objective_started');
});

test('governance_events table remains append-only after Phase 9 migration', withTempDb(async ({ db }) => {
  logPhase9GovernanceEvent(db, {
    event_type: 'objective_started',
    objective_id: 'OBJ-T51-IMMUTABLE',
    source_component: 'test',
  });
  // UPDATE must fail
  try {
    db.prepare(`UPDATE governance_events SET event_type = 'tampered'`).run();
    assert.fail('expected RAISE on UPDATE');
  } catch (error) {
    assert.match(error.message, /governance_events is append-only/);
  }
  // DELETE must fail
  try {
    db.prepare(`DELETE FROM governance_events`).run();
    assert.fail('expected RAISE on DELETE');
  } catch (error) {
    assert.match(error.message, /governance_events is append-only/);
  }
}));
