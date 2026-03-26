# 02. Registry and Queries

## Module

Canonical file:

- `plugin/lib/harness-hints.js`

Exports:

- `computeHarnessHints(db, projectPath) -> string`

## Registry Shape

Preferred structure:

```js
const MAX_HINTS = 3;
const COOLDOWN_SESSIONS = 3;
const COOLDOWN_DAYS = 7;

const CATALOG = [
  { id, query, hint },
  ...
];
```

## Gate-Based Activation

A gate-based hint is active when the same gate has `FAIL` in at least 2 distinct sessions for the same project.

Required join:

```sql
SELECT COUNT(DISTINCT gc.session_id)
FROM gate_checks gc
JOIN sessions s ON gc.session_id = s.id
WHERE s.project_path = ?
  AND gc.gate_id = ?
  AND gc.status = 'FAIL'
```

## Gate-Based Cooldown

Cooldown is valid only if the project has at least `COOLDOWN_SESSIONS` completed sessions.

Then:

- inspect the last `N` completed sessions
- count failures for the same `gate_id`
- deactivate only if the count is zero

Important:

- this must be based on the last `N` completed sessions, not on an aggregate over all history
- if fewer than `N` completed sessions exist, the hint stays active

## Observer-Based Activation

Observer hints use:

- `project_path`
- `created_at`
- message regex matching in JS
- historical alert rows, not only unresolved ones

Activation:

- 2 or more distinct days with matching alerts

Cooldown:

- no matching alert in the last `COOLDOWN_DAYS`

## Observer Debt

This is explicitly V0 debt:

- regex over prose is fragile
- `alert_code` is the proper V0.1 answer
- historical recurrence and live unresolved-alert semantics are intentionally not identical in V0

So V0 must keep the observer catalog conservative and tightly matched.

In particular:

- `H-11` must match `Design-execution drift`
- not generic `drift`

## Output Behavior

`computeHarnessHints()` should:

- evaluate all entries
- skip failures silently
- sort by strength descending
- return the top `MAX_HINTS`

No persistence in V0.  
No new tables.  
No schema changes.
