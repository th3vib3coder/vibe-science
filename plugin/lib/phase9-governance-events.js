/**
 * Phase 9 Governance Event Types — T5.1
 * (vibe-science/blueprints/private/phase9-implementation-plan/06-wave-5-governance-audit.md)
 *
 * Wave 5 makes autonomy auditable by recording why every action was allowed,
 * blocked, resumed, or degraded. T5.1 extends the existing append-only
 * `governance_events` table with a Phase 9 event-type allowlist plus
 * optional `objectiveId` and `sourceComponent` fields, while preserving the
 * Phase 8 events that already log through `logGovernanceEvent`.
 *
 * The validator is strict about the event_type string but permissive about
 * everything else: governance log writers across Phase 8 and Phase 9 use
 * heterogeneous payload shapes inside `details`, and the table is meant to
 * accept that diversity. The contract is "every event that lands names
 * itself with a known type", not "every event has the same fields".
 *
 * Three legacy Phase 8 event types must continue to validate so that the
 * existing pre-tool-use / post-tool-use governance logging keeps working
 * after Wave 5 lands:
 *   - `claim_without_harness`        (LAW 9 violation)
 *   - `law_violation`                (general guardrail violation)
 *   - `schema_modification_attempt`  (read-only schema protection)
 *
 * Phase 9 adds the 17 event types listed in the spec at lines 17-34.
 */
import { logGovernanceEvent as logGovernanceEventRaw } from './db.js';

export const PHASE9_GOVERNANCE_EVENT_TYPES = Object.freeze([
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
]);

export const PHASE8_LEGACY_GOVERNANCE_EVENT_TYPES = Object.freeze([
    'claim_without_harness',
    'law_violation',
    'schema_modification_attempt',
]);

export const ALL_GOVERNANCE_EVENT_TYPES = Object.freeze([
    ...PHASE8_LEGACY_GOVERNANCE_EVENT_TYPES,
    ...PHASE9_GOVERNANCE_EVENT_TYPES,
]);

const ALL_TYPES_SET = new Set(ALL_GOVERNANCE_EVENT_TYPES);
const PHASE9_TYPES_SET = new Set(PHASE9_GOVERNANCE_EVENT_TYPES);

const KNOWN_SOURCE_COMPONENTS = new Set([
    'plugin',
    'plugin/hooks/session-start',
    'plugin/hooks/pre-tool-use',
    'plugin/hooks/post-tool-use',
    'plugin/hooks/prompt-submit',
    'plugin/hooks/stop',
    'plugin/hooks/subagent-stop',
    'plugin/hooks/pre-compact',
    'plugin/scripts/handshake-inject',
    'plugin/scripts/governance-log',
    'plugin/scripts/objective-loader',
    'plugin/scripts/loop-wake',
    'plugin/scripts/r2-bridge-writer',
    'vre/bin/vre',
    'vre/orchestrator/agent-orchestration',
    'vre/orchestrator/autonomy-runtime',
    'vre/orchestrator/execution-lane',
    'vre/orchestrator/governance-logger',
    'vre/orchestrator/semantic-drift-checkpoint',
    'vre/orchestrator/windows-task-scheduler',
    'vre/control/capability-handshake',
    'vre/control/capabilities',
    'vre/control/middleware',
    'vre/flows/writing',
    'vre/flows/writing-packs',
    'vre/memory/sync',
    'vre/objectives/cli',
    'vre/objectives/store',
    'vre/objectives/blocker-flag',
    'vre/objectives/digest-writer',
    'vre/objectives/resume-snapshot',
    'test',
]);

export class GovernanceEventValidationError extends Error {
    constructor({ code, message, extra = {} }) {
        super(message);
        this.name = 'GovernanceEventValidationError';
        this.code = code;
        this.extra = extra;
    }
}

function fail(code, message, extra = {}) {
    throw new GovernanceEventValidationError({ code, message, extra });
}

/**
 * Validate a governance event payload against the Phase 8 + Phase 9 allowlist
 * and the optional `objectiveId` / `sourceComponent` shape. Returns a
 * normalized event ready to pass to `logGovernanceEventRaw`.
 *
 * Required:
 *   - event_type ∈ ALL_GOVERNANCE_EVENT_TYPES
 *
 * Optional (validated when present):
 *   - session_id (string)
 *   - tool_name (string)
 *   - severity ∈ {info, warning, critical}
 *   - details (string or object)
 *   - timestamp (finite number)
 *   - objective_id (string, must match /^OBJ-/u when in Phase 9 event types)
 *   - source_component (string; warned-not-failed if outside KNOWN_SOURCE_COMPONENTS,
 *     because the allowlist is informational; foreign sources still write)
 */
export function validatePhase9GovernanceEvent(event, options = {}) {
    if (event == null || typeof event !== 'object') {
        fail(
            'E_GOVERNANCE_EVENT_INVALID',
            'governance event must be a non-null object.',
            { event },
        );
    }
    const allowSet = options.allowedTypes ?? ALL_TYPES_SET;
    const eventType = typeof event.event_type === 'string' ? event.event_type : null;
    if (!eventType) {
        fail(
            'E_GOVERNANCE_EVENT_TYPE_REQUIRED',
            'governance event must include event_type as a non-empty string.',
            { event },
        );
    }
    if (!allowSet.has(eventType)) {
        fail(
            'E_GOVERNANCE_EVENT_TYPE_UNKNOWN',
            `governance event_type "${eventType}" is not in the Phase 8 + Phase 9 allowlist.`,
            { eventType, allowedTypes: [...allowSet] },
        );
    }

    if (event.severity != null) {
        const normalized = String(event.severity).toLowerCase();
        if (!['info', 'warning', 'critical'].includes(normalized)) {
            fail(
                'E_GOVERNANCE_EVENT_SEVERITY_INVALID',
                `governance event severity must be info | warning | critical (got "${event.severity}").`,
                { severity: event.severity },
            );
        }
    }

    if (event.objective_id != null) {
        if (typeof event.objective_id !== 'string' || event.objective_id.trim() === '') {
            fail(
                'E_GOVERNANCE_EVENT_OBJECTIVE_ID_INVALID',
                'governance event objective_id must be a non-empty string when provided.',
                { objective_id: event.objective_id },
            );
        }
        if (PHASE9_TYPES_SET.has(eventType) && !/^OBJ-/u.test(event.objective_id)) {
            fail(
                'E_GOVERNANCE_EVENT_OBJECTIVE_ID_INVALID',
                `Phase 9 governance event "${eventType}" requires objective_id matching /^OBJ-/u (got "${event.objective_id}").`,
                { objective_id: event.objective_id, eventType },
            );
        }
    }

    if (event.source_component != null) {
        if (typeof event.source_component !== 'string' || event.source_component.trim() === '') {
            fail(
                'E_GOVERNANCE_EVENT_SOURCE_COMPONENT_INVALID',
                'governance event source_component must be a non-empty string when provided.',
                { source_component: event.source_component },
            );
        }
    }

    if (event.timestamp != null && !Number.isFinite(event.timestamp)) {
        fail(
            'E_GOVERNANCE_EVENT_TIMESTAMP_INVALID',
            'governance event timestamp must be a finite number when provided.',
            { timestamp: event.timestamp },
        );
    }

    return {
        ...event,
        event_type: eventType,
    };
}

/**
 * Log a Phase 9 (or legacy Phase 8) governance event after validating it
 * against the allowlist and the optional objective_id / source_component
 * shape.
 *
 * @returns {{id: string, run: import('better-sqlite3').RunResult}}
 *   The inserted event id and the underlying SQLite run result. Returns
 *   `{ ok: false, code }` if no DB is available.
 */
export function logPhase9GovernanceEvent(db, event, options = {}) {
    const validated = validatePhase9GovernanceEvent(event, options);
    if (!db) {
        return {
            ok: false,
            code: 'E_GOVERNANCE_EVENT_DB_UNAVAILABLE',
            event: validated,
        };
    }
    return logGovernanceEventRaw(db, validated);
}

/**
 * Recognize whether a given event_type belongs to the Phase 9 allowlist
 * (as opposed to Phase 8 legacy types).
 */
export function isPhase9GovernanceEventType(eventType) {
    return PHASE9_TYPES_SET.has(eventType);
}

/**
 * Recognize whether a given event_type belongs to the combined allowlist.
 */
export function isKnownGovernanceEventType(eventType) {
    return ALL_TYPES_SET.has(eventType);
}

export const KNOWN_GOVERNANCE_SOURCE_COMPONENTS = Object.freeze([...KNOWN_SOURCE_COMPONENTS]);
