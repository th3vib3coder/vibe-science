#!/usr/bin/env node
// PreToolUse hook — Phase 8 Wave 2 delivery-discipline write barrier.
//
// Blocks Write/Edit/MultiEdit BEFORE they mutate a commit-relevant
// deliverable when the post-edit content declares closure
// (CLOSED/DONE/PASS/SHIPPED/COMPLETE/FINALIZED/READY) in declarative
// context but does NOT contain a valid `## Delivery Attestation` block
// with fenced json that has the 4 required fields.
//
// Matcher: "Write|Edit|MultiEdit" (regex) — narrower than the existing
// pre-tool-use.js matcher (which covers Bash too). This hook is
// independent and runs in addition to pre-tool-use.js. Either blocking
// denies the write.
//
// Exit 0 = allow, Exit 2 = deny, Exit 1 = internal error (graceful: allow).
//
// Input (stdin JSON): { tool_name, tool_input, session_id, cwd, hook_event_name }
// Output (stdout JSON): { hookSpecificOutput: { permissionDecision, permissionDecisionReason? } }
//
// Scope cuts deferred to later waves:
//   - Governance event logging of violations/exemptions  → Wave 4 (WP-8-4)
//   - Full JSON-Schema validation via Ajv                 → Wave 3 (WP-8-3)
//   - CI validator scanning tracked markdown              → Wave 3 (WP-8-3)
//   - Audit-log cross-reference for external_review_status → Phase 8.1
//
// Strict mode (VIBE_SCIENCE_STRICT=1) denies any discipline-relevant
// write when the governance DB is unavailable for Wave 4 logging. Even
// though Wave 2 does not yet log, strict mode refuses to allow the
// bypass paths (exemption / attestation) because the future audit
// trail would be broken. This matches the Wave 0 contract.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Pure helpers (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Deliverable path matcher. The hook only intercepts markdown files whose
 * basename looks like a committable deliverable: closeout, status report,
 * summary, verdict, phase N doc, wave N doc, skill file, README, CHANGELOG.
 */
export function matchesDeliverablePath(filePath) {
  if (typeof filePath !== 'string' || !filePath.toLowerCase().endsWith('.md')) {
    return false;
  }
  const basename = path.basename(filePath).toLowerCase();
  return /(closeout|status|summary|verdict|phase[\d.-]+|wave[\d-]+|skill|readme|changelog)/u.test(basename);
}

/**
 * Closure-claim detection in declarative context. Returns true only when
 * a closure word appears in a position that signals "declared completion",
 * not casual prose. Five patterns covered:
 *   1. `Status: CLOSED` / `Verdict: PASS` / `Phase 8: CLOSED`
 *   2. Line starting with closure word (`CLOSED.` / `**PASS**`)
 *   3. Bold wrapped closure (`**Result: PASS**`)
 *   4. Markdown table cell (`| PASS |` / `| CLOSED |`)
 *   5. "Phase X is CLOSED" / "Wave Y is DONE" sentence form
 */
export function hasDeclaredClosureClaim(text) {
  if (typeof text !== 'string' || text.length === 0) return false;

  const CLOSURE = '(?:CLOSED|DONE|PASS(?:ED)?|SHIPPED|COMPLETED?|FINALIZED|READY)';

  // Pattern 1: Status/Verdict/Result/Phase/Wave : CLOSURE
  const p1 = new RegExp(
    `\\b(?:status|verdict|result|outcome|phase\\s*[\\d.]*|wave\\s*\\d+)\\s*[:=]\\s*\\*{0,2}\\s*${CLOSURE}\\b`,
    'iu',
  );
  if (p1.test(text)) return true;

  // Pattern 2: Line starting with CLOSURE (bold/emph stripped)
  const p2 = new RegExp(`^[ \\t>*_]*\\**\\s*${CLOSURE}\\s*[\\s.!:*]`, 'imu');
  if (p2.test(text)) return true;

  // Pattern 3: Bold wrapped with CLOSURE inside
  const p3 = new RegExp(`\\*\\*[^*\\n]{0,80}\\b${CLOSURE}\\b[^*\\n]{0,80}\\*\\*`, 'iu');
  if (p3.test(text)) return true;

  // Pattern 4: Table cell
  const p4 = new RegExp(`\\|\\s*${CLOSURE}\\s*\\|`, 'iu');
  if (p4.test(text)) return true;

  // Pattern 5: "Phase X is CLOSURE" sentence form
  const p5 = new RegExp(
    `\\b(?:phase|wave|stage|gate|sprint|release)\\s+[a-z0-9.\\-]+\\s+(?:is|are|=)\\s+\\*{0,2}${CLOSURE}\\b`,
    'iu',
  );
  if (p5.test(text)) return true;

  return false;
}

/**
 * Attestation block detection + structural validation.
 * Returns true when the text contains:
 *   - A heading `##` or `###` followed by `Delivery Attestation` (case-insensitive)
 *   - A fenced ```json block (3 or 4 backticks) after the heading
 *   - Parsed JSON with the 4 required fields and basic shape checks
 *
 * Schema-shape enforcement (minLength, minItems) is delegated here to
 * catch trivially-bypassed attestations. Full Ajv validation lives in
 * Wave 3 CI validator.
 */
export function hasValidAttestation(text) {
  if (typeof text !== 'string' || text.length === 0) return false;

  const headingMatch = text.match(/^#{2,3}\s+delivery\s+attestation\s*$/imu);
  if (!headingMatch) return false;

  const afterHeading = text.slice(headingMatch.index + headingMatch[0].length);
  // The Wave 0 contract requires the attestation to live in a fenced
  // `json` block — the tag is mandatory so the CI validator in Wave 3
  // can key off the same marker. Accept 3-tick or 4-tick outer fences
  // (a skill file demonstrating the pattern wraps its example in 4
  // ticks so the inner 3-tick fence renders literally).
  const fenceMatch = afterHeading.match(/`{3,4}json\s*\n([\s\S]*?)\n`{3,4}/u);
  if (!fenceMatch) return false;

  let parsed;
  try {
    parsed = JSON.parse(fenceMatch[1]);
  } catch {
    return false;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return false;

  const required = ['covered', 'scope_cuts', 'self_review_findings', 'external_review_status'];
  for (const field of required) {
    if (!Object.prototype.hasOwnProperty.call(parsed, field)) return false;
  }
  // Enforce additionalProperties:false — schema is canonical, and the
  // helper must match it exactly. An attestation with extra top-level
  // fields is rejected.
  const allowed = new Set(required);
  for (const key of Object.keys(parsed)) {
    if (!allowed.has(key)) return false;
  }

  if (!Array.isArray(parsed.covered) || parsed.covered.length < 1) return false;
  if (!parsed.covered.every((x) => typeof x === 'string' && x.length >= 3)) return false;

  // scope_cuts is an array of {item, reason} objects per the schema.
  // minItems: 0 allowed, but each item MUST have correct shape.
  if (!Array.isArray(parsed.scope_cuts)) return false;
  for (const cut of parsed.scope_cuts) {
    if (cut === null || typeof cut !== 'object' || Array.isArray(cut)) return false;
    const cutKeys = Object.keys(cut);
    if (!cutKeys.includes('item') || !cutKeys.includes('reason')) return false;
    // additionalProperties:false on scope_cuts entries too
    if (cutKeys.some((k) => k !== 'item' && k !== 'reason')) return false;
    if (typeof cut.item !== 'string' || cut.item.length < 3) return false;
    if (typeof cut.reason !== 'string' || cut.reason.length < 10) return false;
  }

  if (!Array.isArray(parsed.self_review_findings)) return false;
  if (parsed.self_review_findings.length < 3) return false;
  if (!parsed.self_review_findings.every((x) => typeof x === 'string' && x.length >= 20)) return false;

  if (!['pending', 'cleared', 'blocked'].includes(parsed.external_review_status)) return false;

  return true;
}

/**
 * Exemption comment detection. The agent can opt out of the block by
 * placing `<!-- delivery-discipline: exempt -->` near the top of the
 * file (first 500 chars). Wave 4 will log exemption usage as a
 * `delivery_discipline_exemption_used` governance event so abuse is
 * auditable. In Wave 2 we only check; logging is deferred.
 */
export function hasExemptionComment(text) {
  if (typeof text !== 'string') return false;
  // Threshold 5000 chars accommodates even oversized YAML frontmatter
  // (e.g. the root SKILL.md changelog field is ~1800 chars alone) while
  // still forcing the exemption declaration to live "near the top" of
  // the file. At ~100 lines this is still unambiguously in the preamble
  // region from a reviewer's perspective. Exemption usage is logged in
  // Wave 4, so abuse becomes auditable regardless of where in the head
  // the comment sits.
  const head = text.slice(0, 5000);
  return /<!--\s*delivery-discipline:\s*exempt\s*-->/iu.test(head);
}

/**
 * Compute the post-edit full content the tool would land on disk.
 *   - Write: tool_input.content is the full new file.
 *   - Edit / MultiEdit: read current file from disk and apply the
 *     replace(s) in-memory. If the file does not exist, treat as empty.
 *
 * Reading the disk file is necessary so that legitimate edits to files
 * that ALREADY have an attestation block pass (the edit only sees the
 * new_string, not the full file state).
 */
export function getPostEditContent(toolName, toolInput, { readFileImpl = fs.readFileSync } = {}) {
  if (!toolInput || typeof toolInput !== 'object') return '';

  if (toolName === 'Write') {
    return typeof toolInput.content === 'string' ? toolInput.content : '';
  }

  const filePath = toolInput.file_path;
  let currentContent = '';
  if (typeof filePath === 'string' && filePath.length > 0) {
    try {
      currentContent = readFileImpl(filePath, 'utf8');
    } catch {
      currentContent = '';
    }
  }

  if (toolName === 'Edit') {
    const oldStr = typeof toolInput.old_string === 'string' ? toolInput.old_string : '';
    const newStr = typeof toolInput.new_string === 'string' ? toolInput.new_string : '';
    if (oldStr === '' && currentContent === '') {
      // Edit creating a new file — treat new_string as full content.
      return newStr;
    }
    if (toolInput.replace_all === true) {
      return currentContent.split(oldStr).join(newStr);
    }
    return currentContent.replace(oldStr, newStr);
  }

  if (toolName === 'MultiEdit') {
    const edits = Array.isArray(toolInput.edits) ? toolInput.edits : [];
    let result = currentContent;
    for (const edit of edits) {
      if (!edit || typeof edit !== 'object') continue;
      const oldStr = typeof edit.old_string === 'string' ? edit.old_string : '';
      const newStr = typeof edit.new_string === 'string' ? edit.new_string : '';
      if (edit.replace_all === true) {
        result = result.split(oldStr).join(newStr);
      } else {
        result = result.replace(oldStr, newStr);
      }
    }
    return result;
  }

  return '';
}

/**
 * Main decision function. Pure — returns a decision object without
 * touching stdin/stdout/process. Tested directly; the wrapper below
 * marshals stdin/stdout around it.
 *
 * Returns:
 *   { decision: 'allow', reason?: string, matched?: string, targetPath?: string }
 *   { decision: 'deny', reason: string, matched: string, targetPath: string }
 */
export function evaluateDeliveryDiscipline(event, options = {}) {
  if (!event || typeof event !== 'object') {
    return { decision: 'allow', reason: 'malformed-event' };
  }
  const toolName = event.tool_name || '';
  const toolInput = event.tool_input || {};

  // Fast exit 1: only Write/Edit/MultiEdit are in scope.
  if (!['Write', 'Edit', 'MultiEdit'].includes(toolName)) {
    return { decision: 'allow', reason: 'tool-out-of-scope' };
  }

  // Fast exit 2: only markdown deliverable-looking paths are in scope.
  const filePath = toolInput.file_path || '';
  if (!matchesDeliverablePath(filePath)) {
    return { decision: 'allow', reason: 'path-not-deliverable' };
  }

  // Compute post-edit content (the state the file would land in).
  const content = getPostEditContent(toolName, toolInput, options);
  if (content === '') {
    return { decision: 'allow', reason: 'empty-content' };
  }

  // Fast exit 3: no declared closure claim → nothing to enforce.
  // (Checked before exemption so strict-mode only fires when the
  // discipline would actually apply.)
  if (!hasDeclaredClosureClaim(content)) {
    return { decision: 'allow', reason: 'no-closure-claim' };
  }

  // Strict-mode gate: if VIBE_SCIENCE_STRICT=1 AND the governance DB
  // is unavailable for future Wave 4 logging, refuse to exercise any
  // bypass path (exemption or attestation) because the audit trail
  // would be broken. The Wave 0 contract explicitly names this case.
  const strictMode = options.strictMode === true;
  const dbAvailable = options.dbAvailable === undefined ? true : options.dbAvailable === true;
  if (strictMode && !dbAvailable) {
    return {
      decision: 'deny',
      reason: 'strict-mode-audit-unavailable',
      targetPath: filePath,
      matched: closureExcerpt(content),
    };
  }

  // Fast exit 4: explicit exemption (after strict-mode gate so strict
  // mode can still refuse exemptions when no audit trail is available).
  if (hasExemptionComment(content)) {
    return { decision: 'allow', reason: 'exemption-comment' };
  }

  // At this point: the file is a deliverable that declares closure.
  // It MUST contain a valid attestation block.
  if (hasValidAttestation(content)) {
    return { decision: 'allow', reason: 'closure-with-valid-attestation' };
  }

  return {
    decision: 'deny',
    reason: 'missing-or-invalid-attestation',
    matched: closureExcerpt(content),
    targetPath: filePath,
  };
}

function closureExcerpt(text) {
  const CLOSURE = /\b(CLOSED|DONE|PASS(?:ED)?|SHIPPED|COMPLETED?|FINALIZED|READY)\b/iu;
  const m = text.match(CLOSURE);
  if (!m) return '<closure>';
  const idx = m.index;
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + m[0].length + 40);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Output helpers (process-side; not exported; thin wrappers)
// ---------------------------------------------------------------------------

function writeAllowAndExit() {
  const output = { hookSpecificOutput: { permissionDecision: 'allow' } };
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

function writeDenyAndExit(targetPath, matched, reasonCode) {
  let reason;
  if (reasonCode === 'strict-mode-audit-unavailable') {
    reason =
      `DELIVERY DISCIPLINE BLOCK (strict mode): ${targetPath} contains a closure claim ("${matched}") ` +
      `but VIBE_SCIENCE_STRICT=1 is set and the governance DB probe failed (module unimportable, ` +
      `better-sqlite3 unavailable, openDB() returned null, or governance_events table missing). ` +
      `Strict mode refuses exemption / attestation bypass paths when the Wave 4 audit trail cannot ` +
      `be recorded. Fix the DB setup (install better-sqlite3 native bindings, run migrations) or ` +
      `unset VIBE_SCIENCE_STRICT before retrying.`;
  } else if (reasonCode === 'strict-mode-internal-error') {
    reason =
      `DELIVERY DISCIPLINE BLOCK (strict mode): internal error while evaluating ${targetPath}. ` +
      `Strict mode fails closed because the discipline cannot be reliably evaluated. ` +
      `Check hook logs or run with VIBE_SCIENCE_STRICT unset to bypass.`;
  } else {
    reason =
      `DELIVERY DISCIPLINE BLOCK: ${targetPath} contains a closure claim ("${matched}") ` +
      `but no valid "## Delivery Attestation" block with fenced JSON ` +
      `(required fields: covered, scope_cuts, self_review_findings, external_review_status; ` +
      `self_review_findings must have at least 3 entries of ≥20 characters each; fence must be \`\`\`json). ` +
      `Add the attestation section before writing. ` +
      `See .claude/skills/delivery-discipline/SKILL.md.`;
  }
  const output = {
    hookSpecificOutput: {
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  };
  process.stdout.write(JSON.stringify(output));
  process.exit(2);
}

// ---------------------------------------------------------------------------
// stdin/stdout wrapper — only runs when invoked directly, not on import.
// ---------------------------------------------------------------------------

const isDirectRun =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

/**
 * Probe whether the governance DB is actually usable for Wave 4 audit
 * logging. An importable db.js module is NOT sufficient evidence — db.js
 * intentionally catches better-sqlite3 load failures internally and
 * exposes `openDB()` that returns `null` when the native binding is
 * unavailable. Strict mode must therefore verify:
 *   (1) the db module imports,
 *   (2) openDB() returns a real handle (not null),
 *   (3) the governance_events table exists in the schema
 *       (Wave 4 logging targets this table),
 *   (4) we can close the handle cleanly.
 *
 * Mirrors the openHookDb pattern from pre-tool-use.js so both hooks
 * share the same notion of "DB works" in strict mode.
 *
 * Injection hooks (dbModule, dbPath) are exposed only for tests — the
 * runtime call chain uses defaults.
 */
export async function probeDbAvailability({ dbModule = null, dbPath = null } = {}) {
  let mod = dbModule;
  if (!mod) {
    try {
      mod = await import('../lib/db.js');
    } catch {
      return false;
    }
  }

  const { openDB, initDB, applyMigrations, closeDB } = mod;
  if (typeof openDB !== 'function') return false;

  let db = null;
  try {
    db = dbPath === null ? openDB() : openDB(dbPath);
    if (!db) return false;
    if (typeof initDB === 'function') initDB(db);
    if (typeof applyMigrations === 'function') applyMigrations(db);

    // Verify governance_events table exists — Wave 4 logging needs it.
    const tableRow = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='governance_events'")
      .get();
    if (!tableRow) return false;

    return true;
  } catch {
    return false;
  } finally {
    if (db) {
      try {
        if (typeof closeDB === 'function') closeDB(db);
        else if (typeof db.close === 'function') db.close();
      } catch {
        // Ignore close errors in a probe — the answer we care about is
        // whether open/init/table-check succeeded.
      }
    }
  }
}

if (isDirectRun) {
  let inputData = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    inputData += chunk;
  });
  process.stdin.on('end', async () => {
    let event;
    try {
      event = JSON.parse(inputData);
    } catch {
      // Malformed event: graceful allow (matches existing hook pattern).
      writeAllowAndExit();
      return;
    }
    const strictMode = process.env.VIBE_SCIENCE_STRICT === '1';
    let dbAvailable = true;
    if (strictMode) {
      // Only pay the import cost when strict mode is on; normal mode
      // never consults the DB availability, so we skip the probe.
      try {
        dbAvailable = await probeDbAvailability();
      } catch {
        dbAvailable = false;
      }
    }
    try {
      const result = evaluateDeliveryDiscipline(event, { strictMode, dbAvailable });
      if (result.decision === 'deny') {
        writeDenyAndExit(
          result.targetPath || '<unknown>',
          result.matched || '<closure>',
          result.reason,
        );
      } else {
        writeAllowAndExit();
      }
    } catch {
      // Internal error: graceful allow in non-strict mode. In strict
      // mode we prefer to fail closed because an internal error means
      // the discipline cannot be reliably evaluated.
      if (strictMode) {
        writeDenyAndExit(
          event?.tool_input?.file_path || '<unknown>',
          '<internal-error>',
          'strict-mode-internal-error',
        );
      } else {
        writeAllowAndExit();
      }
    }
  });
}
