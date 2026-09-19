#!/usr/bin/env node
/**
 * xfer-rating-apply.js — Phase 2: apply approved transfer ratings to the DB
 *
 * Reads scripts/xfer-rating-results.json and writes xferRating/xferNotes into
 * the local audio table for entries where approved: true AND wobbler: false.
 * Wobbler entries are printed for manual review and skipped — resolve them
 * (edit the JSON, or rate directly via SQL) before re-running.
 *
 * This is local-only by design: ratings are worked out on the local dev copy
 * of the audio table, never written directly to production.
 *
 * Usage (run from project root):
 *   node scripts/xfer-rating-apply.js            # apply to local DB
 *   node scripts/xfer-rating-apply.js --dry-run  # preview only, no writes
 */

'use strict';

const path = require('path');
const fs   = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../AdminServer/.env') });

process.env.NODE_PATH = path.join(__dirname, '../AdminServer/node_modules');
require('module').Module._initPaths();

const { logAudit } = require(path.join(__dirname, '../AdminServer/utils/audit'));
const { database: db } = require('config');

const INPUT_FILE = path.join(__dirname, 'xfer-rating-results.json');
const DRY_RUN    = process.argv.includes('--dry-run');

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) console.log('[DRY RUN] No changes will be written.\n');

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    console.error('Run xfer-rating-suggest.js first.');
    process.exit(1);
  }

  const data     = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  const toApply  = data.ratings.filter(r => r.approved && !r.wobbler && r.xferRating != null);
  const wobblers = data.ratings.filter(r => r.wobbler);

  console.log(`${data.ratings.length} total entries`);
  console.log(`${toApply.length} to apply`);
  console.log(`${wobblers.length} flagged as wobblers (manual review)\n`);

  let updated = 0;
  for (const entry of toApply) {
    console.log(`  [${entry.audioID}] rating=${entry.xferRating} "${entry.title}"`);

    if (!DRY_RUN) {
      await db.query(
        'UPDATE audio SET xferRating = ?, xferNotes = ? WHERE audioID = ?',
        [entry.xferRating, entry.xferNotes.slice(0, 512), entry.audioID]
      );
      logAudit({
        tableName:  'audio',
        recordID:   entry.audioID,
        actionType: 'xferRating_updated',
        before:     {},
        after:      { xferRating: entry.xferRating, xferNotes: entry.xferNotes },
        meta:       { source: 'claude-haiku' },
      });
      updated++;
    }
  }

  if (wobblers.length > 0) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log('WOBBLERS — review manually, not auto-applied:\n');
    for (const entry of wobblers) {
      console.log(`  [${entry.audioID}] "${entry.title}" (suggested rating: ${entry.xferRating})`);
      console.log(`    ${entry.xferNotes}`);
    }
  }

  console.log(`\n${DRY_RUN ? 'Would update' : 'Updated'} ${DRY_RUN ? toApply.length : updated} clips.`);

  await db.end();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
