# Task 2: Wire harness-hints into session-start.js

**Files:**
- Modify: `plugin/scripts/session-start.js`

**Spec reference:** [03-session-start-integration.md](./03-session-start-integration.md)

**Depends on:** Task 1 (harness-hints.js must exist)

---

- [ ] **Step 1: Add graceful import**

In `plugin/scripts/session-start.js`, after the existing `context-builder.js` import block (line ~80), add:

```js
let computeHarnessHints = null;
try {
    const hintsMod = await import('../lib/harness-hints.js');
    computeHarnessHints = hintsMod.computeHarnessHints;
} catch {
    // harness-hints.js not available -- skip
}
```

Note: follows naming convention of existing imports (`buildContext`, `loadR2CalibrationData`, `getActivePatterns` — no `Fn` suffix).

- [ ] **Step 2: Add hint accumulator + computation step 4c**

First, initialize the accumulator with the other top-level locals in `main()`:

```js
let harnessHintsBlock = '';
```

Place it next to:

```js
let context;
let alerts = [];
let r2Stats = { hint: null, topWeaknesses: [], totalReviews: 0 };
let researchPatterns = [];
```

Then, after step 4b (load cross-session patterns, around line 383), add only the computation block:

```js
// ---- 4c. Compute harness hints (TRACE+ADAPT V0) ----------------
try {
    if (computeHarnessHints) {
        harnessHintsBlock = computeHarnessHints(db, projectPath);
    }
} catch (err) {
    warnings.push(`Harness hints failed: ${err.message}`);
    // Never block — hints are advisory
}
```

Reason: if `harnessHintsBlock` is declared inside `if (db && dbAvailable)`, the final injection step cannot see it and `session-start.js` will throw a scope error when hints are enabled.

- [ ] **Step 3: Unify [PATTERNS] and [HARNESS HINTS] injection**

Replace the existing [PATTERNS] injection block (lines ~428-435):

```js
// Append cross-session patterns (works with both formatters)
if (researchPatterns.length > 0 && formatContextForInjection) {
    // External formatter doesn't know about patterns yet — inject before END marker
    const patternLines = researchPatterns.slice(0, 5).map(
        p => `  - [${p.pattern_type}] ${p.description} (conf: ${(p.confidence ?? 0).toFixed(2)}, seen: ${p.occurrences}x)`
    );
    const patternBlock = '\n[PATTERNS]\n' + patternLines.join('\n');
    contextString = contextString.replace('--- END CONTEXT ---', patternBlock + '\n--- END CONTEXT ---');
}
```

With a unified injection that handles both sections in one pass:

```js
// Append [PATTERNS] and [HARNESS HINTS] in canonical order before END marker.
// Single injection pass prevents ordering inversions between formatter paths.
{
    const suffix = [];

    // [PATTERNS] — descriptive cross-session patterns
    if (researchPatterns.length > 0 && formatContextForInjection) {
        const patternLines = researchPatterns.slice(0, 5).map(
            p => `  - [${p.pattern_type}] ${p.description} (conf: ${(p.confidence ?? 0).toFixed(2)}, seen: ${p.occurrences}x)`
        );
        suffix.push('[PATTERNS]', ...patternLines);
    }

    // [HARNESS HINTS] — prescriptive carry-over hints (unconditional: works with both formatters)
    if (harnessHintsBlock) {
        suffix.push('[HARNESS HINTS]', harnessHintsBlock);
    }

    if (suffix.length > 0) {
        const endMarker = '--- END CONTEXT ---';
        const renderedSuffix = '\n' + suffix.join('\n');
        contextString = contextString.includes(endMarker)
            ? contextString.replace(endMarker, renderedSuffix + '\n' + endMarker)
            : contextString + renderedSuffix;
    }
}
```

Key: `[PATTERNS]` injection remains conditional on `formatContextForInjection` (because the fallback formatter already includes them). `[HARNESS HINTS]` is unconditional — it must work with both formatters.
The `endMarker` guard prevents silent loss of hints if a future formatter changes the trailer unexpectedly.

- [ ] **Step 4: Verify syntax**

Run: `node --check plugin/scripts/session-start.js`
Expected: exit 0

- [ ] **Step 5: Quick smoke test**

Run from the repo root with the current workspace as `cwd`:
`echo "{\"cwd\":\"<repo-root>\"}" | node plugin/scripts/session-start.js`
Expected: JSON output with `hookSpecificOutput.additionalContext` containing `--- VIBE SCIENCE CONTEXT ---` and `--- END CONTEXT ---`. No crash.

- [ ] **Step 6: Commit**

```bash
git add plugin/scripts/session-start.js
git commit -m "feat(trace-adapt): wire harness hints into session-start

Step 4c computes hints after patterns, before formatting.
Single injection pass for [PATTERNS] + [HARNESS HINTS] prevents ordering drift.
Graceful degradation: import failure or computation error → warning, no block.

Spec: blueprints/trace-adapt-v0/03-session-start-integration.md"
```
