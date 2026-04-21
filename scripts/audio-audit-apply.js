#!/usr/bin/env node
/**
 * audio-audit-apply.js — Phase 2: apply approved tag suggestions to the DB
 *
 * Reads scripts/audio-audit-results.json and merges suggested tags into each
 * audio record where approved: true. Appends a note to comments recording the
 * AI assistance. Logs each change to the audit table.
 *
 * Classification flags are printed for manual review but NOT auto-applied.
 *
 * Usage (run from project root):
 *   node scripts/audio-audit-apply.js            # apply to local DB
 *   node scripts/audio-audit-apply.js --dry-run  # preview only, no writes
 *   node scripts/audio-audit-apply.js --prod     # apply to production DB
 *   node scripts/audio-audit-apply.js --prod --dry-run
 */

'use strict';

const path = require('path');
const fs   = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../AdminServer/.env') });

process.env.NODE_PATH = path.join(__dirname, '../AdminServer/node_modules');
require('module').Module._initPaths();

const { logAudit } = require(path.join(__dirname, '../AdminServer/utils/audit'));

const INPUT_FILE = path.join(__dirname, 'audio-audit-results.json');
const DRY_RUN    = process.argv.includes('--dry-run');
const USE_PROD   = process.argv.includes('--prod');

let db;
if (USE_PROD) {
  const mysql = require('mysql2/promise');
  db = mysql.createPool({
    host:             'driftconditions.org',
    user:             'mysql',
    password:         process.env.DATABASE_REMOTE_PASSWORD,
    database:         'driftconditions',
    waitForConnections: true,
    connectionLimit:  5,
  });
} else {
  ({ database: db } = require('config'));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (USE_PROD) console.log('Connecting to PRODUCTION database.');
  if (DRY_RUN)  console.log('[DRY RUN] No changes will be written.\n');

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    console.error('Run audio-audit.js first.');
    process.exit(1);
  }

  const data     = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  const approved = data.suggestions.filter(s => s.approved && s.suggestedTags.length > 0);
  const flagged  = data.suggestions.filter(s => s.classificationFlag);

  console.log(`${data.suggestions.length} total entries`);
  console.log(`${approved.length} approved with tag suggestions`);
  console.log(`${flagged.length} flagged for classification review\n`);

  // ── Apply tag updates ──────────────────────────────────────────────────────

  let updated = 0;
  const date   = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const aiNote = `Tags supplemented by Claude Haiku (${date}).`;

  for (const entry of approved) {
    const [[row]] = await db.query(
      'SELECT tags, comments FROM audio WHERE audioID = ?',
      [entry.audioID]
    );
    if (!row) {
      console.warn(`  audioID ${entry.audioID} not found — skipping`);
      continue;
    }

    const currentTags = parseTags(row.tags);
    const mergedTags  = mergeTags(currentTags, entry.suggestedTags);
    const addedTags   = mergedTags.filter(t => !currentTags.map(x => x.toLowerCase()).includes(t.toLowerCase()));

    if (addedTags.length === 0) continue; // all suggestions already present

    // Append AI note to comments, but only once (idempotent on re-runs)
    const currentComments = row.comments || '';
    const newComments     = currentComments.includes('Claude Haiku')
      ? currentComments
      : [currentComments, aiNote].filter(Boolean).join('\n');

    console.log(`  [${entry.audioID}] "${entry.title}"`);
    console.log(`    + ${addedTags.join(', ')}`);

    if (!DRY_RUN) {
      await db.query(
        'UPDATE audio SET tags = ?, comments = ? WHERE audioID = ?',
        [JSON.stringify(mergedTags), newComments, entry.audioID]
      );
      logAudit({
        tableName:  'audio',
        recordID:   entry.audioID,
        actionType: 'tags_updated',
        before:     { tags: currentTags },
        after:      { tags: mergedTags },
        meta:       { source: 'claude-haiku', addedTags },
      });
      updated++;
    }
  }

  // ── Print classification flags (manual review only) ────────────────────────

  if (flagged.length > 0) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log('CLASSIFICATION FLAGS — review manually, not auto-applied:\n');
    for (const entry of flagged) {
      const current   = entry.classification?.join(', ') || 'none';
      const suggested = Array.isArray(entry.suggestedClassification)
        ? entry.suggestedClassification.join(', ')
        : (entry.suggestedClassification || '?');
      console.log(`  [${entry.audioID}] "${entry.title}"`);
      console.log(`    Current:   ${current}`);
      console.log(`    Suggested: ${suggested}`);
    }
  }

  console.log(`\n${DRY_RUN ? 'Would update' : 'Updated'} ${DRY_RUN ? approved.length : updated} clips.`);

  await db.end();
  process.exit(0);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTags(field) {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  try { return JSON.parse(field); } catch { return []; }
}

function mergeTags(existing, suggested) {
  const normalized = new Set(existing.map(t => t.toLowerCase()));
  const additions  = suggested.filter(t => !normalized.has(t.toLowerCase()));
  return [...existing, ...additions];
}

main().catch(err => { console.error(err); process.exit(1); });
