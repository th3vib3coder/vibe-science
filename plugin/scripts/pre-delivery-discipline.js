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
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Pure helpers (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Deliverable path matcher. The hook only intercepts markdown files whose
 * basename looks like a committable deliverable: closeout, status report,
 * summary, verdict, phase N doc, wave N doc, sprint N doc, skill file,
 * README, CHANGELOG.
 */
export function matchesDeliverablePath(filePath) {
  if (typeof filePath !== 'string' || !filePath.toLowerCase().endsWith('.md')) {
    return false;
  }
  const basename = path.basename(filePath).toLowerCase();
  return /(closeout|status|summary|verdict|phase[\d.-]+|wave[\d-]+|sprint[\d-]*|skill|readme|changelog)/u.test(basename);
}

// Closure vocabulary: positive closure + failure/partial statuses +
// review-verdict statuses. A declaration of FAIL/FAILED/BLOCKED/
// PARTIAL/FALSE-POSITIVE/REJECTED is also a consequential closeout
// claim and must be auditable, matching the skill's stated scope
// ("pass/fail status declarations").
//
// fixup-5 P2: `FAIL` added alongside `FAILED` (common short form used
// in gate tables: `| G1 | FAIL |`). `ACCEPTED`/`REJECTED` added as
// review-verdict closeouts. `PASS(?:ED)?` and `FAIL(?:ED)?` keep both
// the imperative and past-participle forms.
const CLOSURE_WORD =
  '(?:CLOSED|DONE|PASS(?:ED)?|SHIPPED|COMPLETED?|FINALIZED|READY|' +
  'FAIL(?:ED)?|BLOCKED|PARTIAL|FALSE-POSITIVE|ACCEPTED|REJECTED)';

// The 5 declarative-context patterns, each returned as a fresh regex
// with the `g` + `i` + `m`/`u` flags needed by callers that want
// positions (findAllClosureClaimPositions) vs callers that just want
// a boolean (hasDeclaredClosureClaim).
function closureClaimPatterns(globalFlag = false) {
  const g = globalFlag ? 'g' : '';
  return [
    // Pattern 1: Status/Verdict/Result/Gate/Phase/Wave/Sprint : CLOSURE
    new RegExp(
      `\\b(?:status|verdict|result|outcome|gate\\s*[\\d.]*|phase\\s*[\\d.]*|wave\\s*\\d+|sprint\\s*\\d*)\\s*[:=]\\s*\\*{0,2}\\s*${CLOSURE_WORD}\\b`,
      `${g}iu`,
    ),
    // Pattern 2: Line starting with CLOSURE (bold/emph stripped)
    new RegExp(`^[ \\t>*_]*\\**\\s*${CLOSURE_WORD}\\s*[\\s.!:*]`, `${g}imu`),
    // (Former Pattern 3 "bold wrapped with CLOSURE inside" removed in
    // fixup-4 — it matched filenames like **blind-first-pass.md** and
    // any prose bolding that happened to contain a closure word.
    // Pattern 1 already handles bold-wrapped declarative forms like
    // `**Result: PASS**` via its `\*{0,2}` substitutions and `\b`
    // boundary matching.)
    // Pattern 4 (now 3): Table cell
    new RegExp(`\\|\\s*${CLOSURE_WORD}\\s*\\|`, `${g}iu`),
    // Pattern 5: "Phase X is CLOSURE" / "Sprint Y is BLOCKED" sentence form
    new RegExp(
      `\\b(?:phase|wave|stage|gate|sprint|release)\\s+[a-z0-9.\\-]+\\s+(?:is|are|=)\\s+\\*{0,2}${CLOSURE_WORD}\\b`,
      `${g}iu`,
    ),
  ];
}

/**
 * Closure-claim detection in declarative context. Returns true only when
 * a closure word (positive OR negative, positive=CLOSED/DONE/PASS/SHIPPED/
 * COMPLETE/FINALIZED/READY; negative=FAILED/BLOCKED/PARTIAL/FALSE-POSITIVE)
 * appears in a position that signals "declared status", not casual prose.
 * Five patterns covered:
 *   1. `Status: CLOSED` / `Verdict: FAILED` / `Phase 8: BLOCKED`
 *   2. Line starting with closure word (`CLOSED.` / `**FAILED**`)
 *   3. Bold wrapped closure (`**Result: PASS**` / `**Wave is PARTIAL**`)
 *   4. Markdown table cell (`| PASS |` / `| FAILED |`)
 *   5. "Phase X is CLOSED" / "Sprint Y is FAILED" sentence form
 */
export function hasDeclaredClosureClaim(text) {
  if (typeof text !== 'string' || text.length === 0) return false;
  for (const pattern of closureClaimPatterns(false)) {
    if (pattern.test(text)) return true;
  }
  return false;
}

/**
 * Find every closure-claim position in `text`. Returns an array of
 * `{index, length, match}` sorted by position, with overlapping
 * matches from different patterns deduplicated.
 *
 * Used by everyClosureHasBoundAttestation() to bind each claim to
 * its own attestation (prevents the "one stale attestation satisfies
 * all future closure claims in the same file" bypass).
 */
export function findAllClosureClaimPositions(text) {
  if (typeof text !== 'string' || text.length === 0) return [];
  const raw = [];
  for (const pattern of closureClaimPatterns(true)) {
    for (const m of text.matchAll(pattern)) {
      if (m.index === undefined) continue;
      raw.push({ index: m.index, length: m[0].length, match: m[0] });
    }
  }
  raw.sort((a, b) => a.index - b.index);
  // Dedup: if two patterns matched overlapping ranges, keep the first.
  const deduped = [];
  for (const hit of raw) {
    const last = deduped[deduped.length - 1];
    if (!last || hit.index >= last.index + last.length) {
      deduped.push(hit);
    }
  }
  return deduped;
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
 * Group contiguous table-row closure hits into a single claim block.
 * A multi-row gate-summary table like
 *   | G1 | PASS |
 *   | G2 | PASS |
 *   | G3 | FAILED |
 * would otherwise require 3 separate attestations (one between each
 * row). That's user-hostile for normal closeout tables. Contract: two
 * consecutive hits are merged if both are inside lines starting with
 * `|` AND every non-blank line between them also starts with `|`
 * (i.e. they live in the same markdown table).
 *
 * Merging collapses the group into the FIRST hit's index but extends
 * its `length` to cover the last hit. The binding check then treats
 * the whole table as a single closure that needs ONE attestation after
 * it.
 */
function mergeContiguousTableClaims(positions, text) {
  if (positions.length === 0) return positions;
  const getLine = (idx) => {
    const start = text.lastIndexOf('\n', idx - 1) + 1;
    const endIdx = text.indexOf('\n', idx);
    return text.slice(start, endIdx === -1 ? text.length : endIdx);
  };
  const isTableLine = (line) => line.trim().startsWith('|');
  const betweenIsAllTable = (aEnd, bStart) => {
    const gap = text.slice(aEnd, bStart);
    return gap.split('\n').every((line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return true;
      return trimmed.startsWith('|');
    });
  };

  const merged = [{ ...positions[0] }];
  for (let i = 1; i < positions.length; i += 1) {
    const hit = positions[i];
    const prev = merged[merged.length - 1];
    const prevLine = getLine(prev.index);
    const hitLine = getLine(hit.index);
    const bothTable = isTableLine(prevLine) && isTableLine(hitLine);
    const gapAllTable = betweenIsAllTable(prev.index + prev.length, hit.index);
    if (bothTable && gapAllTable) {
      const newEnd = hit.index + hit.length;
      prev.length = newEnd - prev.index;
      prev.match = `${prev.match} … ${hit.match}`;
      continue;
    }
    merged.push({ ...hit });
  }
  return merged;
}

/**
 * Positional binding: each closure claim in `text` must be followed by
 * its own valid attestation block BEFORE the next closure claim (or
 * end of text). This prevents a single stale attestation from
 * satisfying multiple later claims in the same file.
 *
 * Contiguous table-row claims (e.g. a gate-summary table) are merged
 * into a single claim block so a closeout table plus one trailing
 * attestation is a valid shape — the reviewer's P2-A usability concern.
 *
 * Example that FAILS (positional binding violated):
 *   # v7.1 SHIPPED  ← closure claim 1
 *   <no attestation>
 *   # v7.0 SHIPPED  ← closure claim 2
 *   ## Delivery Attestation   ← only here, orphaned for v7.1
 *   ```json {...} ```
 *
 * Example that PASSES (table merge):
 *   | Gate | Status |
 *   | G1   | PASS   |
 *   | G2   | PASS   |
 *   | G3   | FAILED |
 *   ## Delivery Attestation
 *   ```json {...} ```
 *
 * Returns true when every claim block is bound, or no claims exist.
 */
export function everyClosureHasBoundAttestation(text) {
  if (typeof text !== 'string' || text.length === 0) return true;
  const rawClaims = findAllClosureClaimPositions(text);
  if (rawClaims.length === 0) return true;
  const claims = mergeContiguousTableClaims(rawClaims, text);

  for (let i = 0; i < claims.length; i += 1) {
    const start = claims[i].index;
    const end = i + 1 < claims.length ? claims[i + 1].index : text.length;
    const scoped = text.slice(start, end);
    if (!hasValidAttestation(scoped)) return false;
  }
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
 * Normalize line endings for hash stability. Git's autocrlf translation
 * means a Windows checkout has CRLF while the committed blob is LF.
 * Hashing the raw working-copy bytes would produce OS-dependent hashes.
 * We normalize CRLF and bare CR to LF before hashing so the pinned hash
 * value is the same everywhere.
 */
function normalizeLineEndings(text) {
  return text.replace(/\r\n/gu, '\n').replace(/\r/gu, '\n');
}

/**
 * Compute the canonical below-boundary hash for a given text slice.
 * Exported for tooling / tests: given the below-marker content, returns
 * the sha256 hex that must appear in the `hash=` attribute of the
 * marker for the boundary to validate.
 */
export function computeBoundaryHash(belowContent) {
  const normalized = normalizeLineEndings(typeof belowContent === 'string' ? belowContent : '');
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

// Regex that recognizes the legacy-boundary marker in both the
// deprecated bare form (no hash) and the required hash-pinned form.
// Bare form is matched only so we can emit a specific diagnostic; it
// does NOT grant a boundary (callers fall back to full-file enforcement
// when the hash is absent or mismatches).
const LEGACY_BOUNDARY_MARKER_RE =
  /<!--\s*delivery-discipline:\s*legacy-boundary(?:\s+hash=([a-f0-9]{64}))?\s*-->/iu;

/**
 * Legacy-boundary marker splitting with integrity pin.
 *
 * Before fixup-5 the marker was bare: `<!-- delivery-discipline:
 * legacy-boundary -->`. Anyone could append new closure claims BELOW
 * the marker and they would be silently grandfathered — a file-wide
 * bypass scoped to the lower half of the file. An adversarial review
 * caught this by appending a new `## [8.0.0] SHIPPED` section below
 * the marker and confirming both hook and validator allowed it.
 *
 * Fixup-5 requires the marker to carry a sha256 hash of the content
 * below it (LF-normalized). Any change to below-marker content makes
 * the hash mismatch, which DISABLES the boundary and re-subjects the
 * whole file to the discipline. Re-blessing the legacy content means
 * updating the hash in a reviewed commit (git diff shows both the
 * content change and the hash change, so the re-bless is visible).
 *
 * Returns:
 *   {
 *     enforceable: string,   // the slice to enforce against
 *     hasBoundary: boolean,  // true only when a VALID marker is present
 *     hashValid: boolean,    // true when no marker OR hash matches
 *     reason?: string,       // set when hashValid === false
 *     expectedHash?: string, // hash declared in the marker (if any)
 *     actualHash?: string,   // hash computed over below-marker content
 *   }
 *
 * When `hashValid` is false (bare marker OR drift), `enforceable` is
 * the FULL text — the boundary does not take effect. Callers can pass
 * `reason` through to diagnostics but do not need to special-case
 * enforcement: enforcing the full text is the correct fallback.
 *
 * Shared by the hook (evaluateDeliveryDiscipline) and the CI validator
 * (validateDeliveryHonesty) via direct import so write-time and
 * CI-time enforcement use identical semantics — no drift possible.
 */
export function extractEnforceableContent(text) {
  if (typeof text !== 'string') {
    return { enforceable: '', hasBoundary: false, hashValid: true };
  }
  const match = text.match(LEGACY_BOUNDARY_MARKER_RE);
  if (!match || match.index === undefined) {
    return { enforceable: text, hasBoundary: false, hashValid: true };
  }
  const expectedHash = match[1] ?? null;
  const belowContent = text.slice(match.index + match[0].length);
  if (expectedHash === null) {
    // Deprecated bare marker. Fall back to full-file enforcement so
    // a missing hash never silently grandfathers the below portion.
    return {
      enforceable: text,
      hasBoundary: false,
      hashValid: false,
      reason: 'legacy-boundary-without-hash',
    };
  }
  const actualHash = computeBoundaryHash(belowContent);
  if (actualHash !== expectedHash) {
    return {
      enforceable: text,
      hasBoundary: false,
      hashValid: false,
      reason: 'legacy-boundary-hash-mismatch',
      expectedHash,
      actualHash,
    };
  }
  return {
    enforceable: text.slice(0, match.index),
    hasBoundary: true,
    hashValid: true,
    expectedHash,
    actualHash,
  };
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

  // Legacy-boundary: if the file carries the boundary marker, only the
  // content BEFORE the marker is subject to the discipline. The
  // validator (validateDeliveryHonesty) uses the same split, so write-
  // time and CI-time enforcement stay identical.
  //
  // Fixup-5: the marker must carry a sha256 hash of its below content
  // (`hash=<64-hex>`). When the hash is missing or mismatches,
  // extractEnforceableContent falls back to enforcing the FULL file,
  // so new closure claims below a drifted boundary can no longer be
  // grandfathered. We also surface the diagnostic so the deny message
  // points at the real problem (drifted boundary vs missing attestation).
  const {
    enforceable,
    hashValid,
    reason: boundaryReason,
    expectedHash,
    actualHash,
  } = extractEnforceableContent(content);

  // Fast exit 3: no declared closure claim in the enforceable slice →
  // nothing to enforce.
  // (Checked before exemption so strict-mode only fires when the
  // discipline would actually apply.)
  if (!hasDeclaredClosureClaim(enforceable)) {
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
  // Exemption is checked against the full content because the comment
  // itself may be before the legacy boundary.
  if (hasExemptionComment(content)) {
    return { decision: 'allow', reason: 'exemption-comment' };
  }

  // At this point: the file is a deliverable that declares closure in
  // its enforceable portion. Every closure claim in that portion must
  // have its OWN attestation block positioned after it (and before the
  // next claim). A single stale attestation no longer satisfies
  // multiple later claims.
  if (everyClosureHasBoundAttestation(enforceable)) {
    return { decision: 'allow', reason: 'closure-with-valid-attestation' };
  }

  // Attestation is missing / invalid. If the boundary was bare or
  // drifted, surface THAT diagnostic first: the user added (or left)
  // closure claims below a boundary that no longer protects them, and
  // the right fix is either (a) removing the below-marker claim,
  // (b) re-blessing the boundary hash explicitly, or
  // (c) converting a bare marker to the hash-pinned form.
  if (hashValid === false) {
    return {
      decision: 'deny',
      reason: boundaryReason ?? 'legacy-boundary-invalid',
      matched: closureExcerpt(enforceable),
      targetPath: filePath,
      expectedHash,
      actualHash,
    };
  }

  return {
    decision: 'deny',
    reason: 'missing-or-invalid-attestation',
    matched: closureExcerpt(enforceable),
    targetPath: filePath,
  };
}

function closureExcerpt(text) {
  // Derive from CLOSURE_WORD so an excerpt is shown for every status
  // in the vocabulary, including negative verdicts like FAIL/REJECTED.
  // Using the shared constant also prevents future drift between the
  // detection regex and the diagnostic excerpt.
  const CLOSURE = new RegExp(`\\b${CLOSURE_WORD}\\b`, 'iu');
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

function writeDenyAndExit(targetPath, matched, reasonCode, extra = {}) {
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
  } else if (reasonCode === 'legacy-boundary-without-hash') {
    reason =
      `DELIVERY DISCIPLINE BLOCK: ${targetPath} uses a bare legacy-boundary marker ` +
      `(\`<!-- delivery-discipline: legacy-boundary -->\`) that does not carry a hash. ` +
      `Bare markers no longer grandfather below-marker content because they permit ` +
      `silent bypass by appending new closure claims. Convert the marker to the ` +
      `hash-pinned form \`<!-- delivery-discipline: legacy-boundary hash=<sha256-hex> -->\`, ` +
      `where the hash covers the LF-normalized content below the marker. ` +
      `See .claude/skills/delivery-discipline/SKILL.md.`;
  } else if (reasonCode === 'legacy-boundary-hash-mismatch') {
    const expected = extra.expectedHash || '<missing>';
    const actual = extra.actualHash || '<unknown>';
    reason =
      `DELIVERY DISCIPLINE BLOCK: ${targetPath} has a legacy-boundary marker whose ` +
      `declared hash does NOT match the current below-marker content. ` +
      `Expected: ${expected}; actual: ${actual}. ` +
      `This means below-marker content was modified since the boundary was blessed. ` +
      `Either (a) remove the new closure claim below the marker, ` +
      `(b) add a valid Delivery Attestation for the full enforceable range, or ` +
      `(c) re-bless the boundary by updating the hash in a reviewed commit. ` +
      `See .claude/skills/delivery-discipline/SKILL.md.`;
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
          { expectedHash: result.expectedHash, actualHash: result.actualHash },
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
