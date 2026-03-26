# 03. SessionStart Integration

## Integration Point

The adaptation layer belongs in:

- `plugin/scripts/session-start.js`

Not in:

- `context-builder.js`
- `post-tool-use.js`
- `stop.js`

Reason:

- `session-start.js` has DB, `projectPath`, and the final context string
- the existing TRACE runtime already injects `[PATTERNS]` there after formatting

## Required Flow

The order should be:

1. build normal TRACE context
2. load active patterns
3. initialize `harnessHintsBlock` with the other top-level locals in `main()`
4. compute harness hints
5. format context
6. append `[PATTERNS]` and `[HARNESS HINTS]` in one canonical order before `--- END CONTEXT ---`

## Injection Rule

Final section order must be stable across both runtime paths.

Canonical order for V0:

- `[PATTERNS]`
- `[HARNESS HINTS]`

So the implementation should avoid two unrelated append passes that can invert ordering.

Instead, `session-start.js` should own a single final injection step that works with:

- the external formatter path
- the fallback formatter path

That means:

- compute before final output
- declare the hint accumulator outside the `if (db && dbAvailable)` block, otherwise the final injection step cannot see it
- inject by replacing the end marker once, with the canonical combined suffix
- never assume the formatter itself knows about harness hints
- if the end marker is unexpectedly missing, append the suffix at the end instead of silently dropping the hints

## Graceful Degradation

If `harness-hints.js`:

- fails to import, continue
- throws during computation, continue with warning

The feature is advisory only and must never block session start.

## Overlap with Existing Sections

V0 intentionally allows overlap with `[PATTERNS]`.

Interpretation:

- `[PATTERNS]` = descriptive
- `[HARNESS HINTS]` = prescriptive

No suppression logic is required in V0.

## V0 Write Set

Only:

- `plugin/lib/harness-hints.js`
- `plugin/scripts/session-start.js`

If integration requires touching more runtime files, stop and re-evaluate scope.
