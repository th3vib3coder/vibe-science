#!/usr/bin/env node
// SubagentStop hook — Salvagente Rule enforcement
// When a subagent (R2) kills a claim, it MUST have produced a serendipity seed.
// Exit 0 = allow stop, Exit 2 = block (demand seed), Exit 1 = internal error
//
// Input (stdin JSON): { session_id, transcript_path, cwd, hook_event_name }
// Output (stdout JSON): { decision: "block"|undefined, reason: string }

let openDB, closeDB;
try {
  const dbModule = await import('../lib/db.js');
  openDB = dbModule.openDB;
  closeDB = dbModule.closeDB;
} catch (e) {
  // DB not available — graceful degradation
  openDB = () => null;
  closeDB = () => {};
}

let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { inputData += chunk; });
process.stdin.on('end', async () => {
  try {
    const event = JSON.parse(inputData);
    await main(event);
  } catch (e) {
    process.exit(0); // graceful degradation
  }
});

async function main(event) {
  const sessionId = event.session_id;
  if (!sessionId) {
    process.exit(0); // no session = allow
    return;
  }

  let db;
  try {
    db = openDB();
    if (!db) {
      process.exit(0);
      return;
    }

    // Find claims killed in this session
    const killedClaims = db.prepare(`
      SELECT DISTINCT claim_id
      FROM claim_events
      WHERE session_id = ? AND event_type = 'KILLED'
    `).all(sessionId);

    if (killedClaims.length === 0) {
      // No killed claims — nothing to check
      closeDB(db);
      process.exit(0);
      return;
    }

    // Check each killed claim for a serendipity seed
    const missingSeeds = [];
    for (const { claim_id } of killedClaims) {
      const seed = db.prepare(`
        SELECT seed_id FROM serendipity_seeds
        WHERE source_claim_id = ?
      `).get(claim_id);

      if (!seed) {
        missingSeeds.push(claim_id);
      }
    }

    closeDB(db);

    if (missingSeeds.length === 0) {
      // All killed claims have seeds — allow stop
      process.exit(0);
      return;
    }

    // BLOCK: Salvagente Rule violated
    const result = {
      decision: 'block',
      reason:
        `SALVAGENTE RULE VIOLATION: ${missingSeeds.length} killed claim(s) have no serendipity seed. ` +
        `Claims without seeds: ${missingSeeds.join(', ')}. ` +
        `R2 MUST produce a serendipity seed for every killed claim — what could be salvaged from the wreckage?`
    };
    process.stdout.write(JSON.stringify(result));
    process.exit(2);
  } catch (e) {
    if (db) closeDB(db);
    // Graceful degradation
    process.exit(0);
  }
}
