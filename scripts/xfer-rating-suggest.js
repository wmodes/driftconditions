#!/usr/bin/env node
/**
 * xfer-rating-suggest.js — LLM-assisted "Voices of River History" transfer ratings
 *
 * Sends unrated audio clips (xferRating IS NULL) to Claude Haiku in batches,
 * scoring each 1-10 for suitability as supporting texture/music/environmental/
 * archival material for the Voices of River History stream. Results are written
 * to scripts/xfer-rating-results.json for review — nothing is written to the DB
 * here.
 *
 * Rows the model is unsure about are flagged wobbler: true and are NOT
 * auto-applied by xfer-rating-apply.js; they're printed for manual review.
 *
 * Usage (run from project root):
 *   node scripts/xfer-rating-suggest.js
 *   node scripts/xfer-rating-suggest.js --limit 300   # cap how many rows to send
 *
 * Requires ANTHROPIC_API_KEY in AdminServer/.env
 * After reviewing results, run xfer-rating-apply.js to write changes to the DB.
 */

'use strict';

const path = require('path');
const fs   = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../AdminServer/.env') });

process.env.NODE_PATH = path.join(__dirname, '../AdminServer/node_modules');
require('module').Module._initPaths();

const Anthropic = require('@anthropic-ai/sdk');

const { database: db } = require('config');

const BATCH_SIZE     = 10;
const BATCH_DELAY_MS = 500;
const MODEL          = 'claude-haiku-4-5-20251001';
const OUTPUT_FILE    = path.join(__dirname, 'xfer-rating-results.json');

const limitArgIdx = process.argv.indexOf('--limit');
const ROW_LIMIT    = limitArgIdx !== -1 ? parseInt(process.argv[limitArgIdx + 1], 10) : null;

// ─── Rubric ───────────────────────────────────────────────────────────────────
// Compiled from a manually-rated calibration pass (audioID 1-375) reviewed with
// the project owner. See scratchpad/xfer_rating_rubric.md for the full writeup.

const RUBRIC = `You are rating audio clips from DriftConditions' library for reuse as supporting
texture/music/environmental/archival material in "Voices of River History" — a generative
"radio station" stream (same conceit as DriftConditions) focused on river journeys and personal
stories of American river communities. Real oral-history interview excerpts will be added
separately later; you are rating the instrumental/environmental/archival supporting bed only.

Rate each clip 1-10. 5 is the actual transfer threshold (>=5 will likely be migrated) — be
decisive in the 4-6 range rather than defaulting to a safe middle score. Clear high/low cases
don't need much deliberation.

RATE HIGH (7-9):
- Library of Congress / Alan Lomax / Folkways prison songs, work songs, spirituals — Southern
  Delta blues & African-American oral-history tradition. (9)
- Direct, literal river/water references (song titles/lyrics naming a real river, a river
  confluence town, sailor/nautical songs). (8-9)
- Radio static, tuning, interference, broadcast artifacts of any era — this IS the core
  "radio station" conceit, carries over directly. (7-8)
- Physical train sounds — engines, whistles, wheels, passing trains (NOT spoken train PA
  announcements — those rate low, see below). (7-8)
- Western swing, early Americana, old-time/roots music. (7-8)
- Piano or acoustic instrumental music beds (any genre, any era). (7)
- Oral-history / documentary interview segments about real people/places/community history
  (biography, local history, first-person narrative) — matches the interview-excerpt conceit
  even when not river-specific. (7-8)
- General environmental/nature field recordings usable as ambient texture (crickets, owls,
  forest, rain, wind, water). (6-7)

RATE MODERATE (5-6):
- Vintage instrumental music with no direct thematic tie but plausible as incidental "radio
  drift" texture (e.g. a tango orchestra track that could plausibly be heard drifting from a
  shantyboat radio). (6)
- American immigrant/ethnic-American culture (e.g. American Yiddish/klezmer, American gospel) —
  fits river-community cultural diversity even without a literal river link. (6)
- Generic but pleasant vintage vocal/instrumental with no thematic tie. (4-5)

RATE LOW (1-3):
- NASA/space/Apollo/space-shuttle content, INCLUDING technical artifacts of that era (e.g.
  Quindar tones) — space theme is explicitly excluded regardless of "broadcast" framing. (1)
- Sci-fi/alien/robotic/vocoder/synthesized-voice effects. (1)
- EDM / electronic dance music. (low)
- Generic unrelated sound effects (car horns, crashes, etc. with no scene relevance). (low)
- "Black Rock Station" (Burning Man) project material. (low)
- Train PA/spoken announcements (as opposed to physical train sound — see HIGH above). (low)
- Non-American indigenous/ethnographic music — even when thematically water-related (e.g.
  Cameroon Baka "water drums") — the theme is American river communities specifically, not
  water/nature generically. (2)
- Absurdist/experimental radio-art audio collage with no river/community content, even though
  it's radio-format (e.g. skit/sketch-comedy shows). (2)
- Celebrity/musician interviews unrelated to river/community themes (e.g. an artist discussing
  their own career). (2)
- Off-theme contemporary political/topical content with no river/community connection. (2)
- Foreign/international vocal music with no American or immigrant-American tie. (3)

COPYRIGHT: if something looks copyright-sketchy (e.g. isolated vocal stems of famous artists),
note it in xferNotes but do NOT reduce the rating for that reason alone — copyright is a separate
downstream flag, not a fit-suitability factor.

WOBBLER FLAG: if a clip doesn't clearly fit one of the patterns above, or involves a cultural/
geographic judgment call not explicitly covered, set "wobbler": true and explain the uncertainty
in xferNotes. Do not silently guess on genuinely novel categories — flag them instead.`;

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY in AdminServer/.env');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const [clips] = await db.query(`
    SELECT audioID, title, classification, tags, duration, comments
    FROM audio
    WHERE xferRating IS NULL
    ORDER BY audioID
    ${ROW_LIMIT ? 'LIMIT ' + ROW_LIMIT : ''}
  `);
  console.log(`Found ${clips.length} unrated clips.`);
  if (clips.length === 0) { await db.end(); process.exit(0); }

  const batches = [];
  for (let i = 0; i < clips.length; i += BATCH_SIZE) {
    batches.push(clips.slice(i, i + BATCH_SIZE));
  }

  const results = [];
  for (let i = 0; i < batches.length; i++) {
    process.stdout.write(`Batch ${i + 1}/${batches.length} (audioID ${batches[i][0].audioID}-${batches[i][batches[i].length - 1].audioID}) ... `);
    const batchResults = await processBatch(client, batches[i]);
    results.push(...batchResults);
    console.log('done');
    if (i < batches.length - 1) await sleep(BATCH_DELAY_MS);
  }

  const wobblers = results.filter(r => r.wobbler).length;
  const errors   = results.filter(r => r.error).length;

  const output = {
    generatedAt: new Date().toISOString(),
    model:       MODEL,
    totalClips:  clips.length,
    wobblers,
    errors,
    instructions: [
      'Each entry has: xferRating (1-10), xferNotes, wobbler (bool), approved (bool).',
      'xfer-rating-apply.js writes xferRating/xferNotes to the DB for entries where',
      'approved: true AND wobbler: false. Wobbler entries are printed for manual review',
      'and skipped — resolve them (edit xferRating/wobbler:false in this file, or rate',
      'directly via SQL) before re-running apply, or re-run apply after editing.',
    ].join('\n'),
    ratings: results,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log(`\nSummary:`);
  console.log(`  Rated:    ${results.length - errors}/${clips.length}`);
  console.log(`  Wobblers: ${wobblers} (flagged for manual review, not auto-applied)`);
  console.log(`  Errors:   ${errors}`);
  console.log(`\nResults written to: ${OUTPUT_FILE}`);

  await db.end();
  process.exit(0);
}

// ─── Batch processor ──────────────────────────────────────────────────────────

async function processBatch(client, batch) {
  const clipLines = batch.map((clip, idx) => {
    const tags           = parseTags(clip.tags);
    const classification = parseTags(clip.classification);
    const durationSec    = clip.duration ? Math.round(parseFloat(clip.duration)) : null;
    const parts = [
      `${idx + 1}. audioID=${clip.audioID}`,
      `Title: "${clip.title}"`,
      `Classification: ${classification.join(', ') || 'none'}`,
      `Duration: ${durationSec != null ? durationSec + 's' : 'unknown'}`,
      `Tags: ${tags.length > 0 ? tags.join(', ') : 'none'}`,
    ];
    if (clip.comments) parts.push(`Notes: "${clip.comments}"`);
    return parts.join(' | ');
  }).join('\n');

  const prompt = `${RUBRIC}

Return ONLY a valid JSON array — no explanation, no markdown:
[
  {
    "audioID": 123,
    "xferRating": 7,
    "xferNotes": "brief reason, <=512 chars",
    "wobbler": false
  },
  ...
]

Clips:
${clipLines}`;

  try {
    const message = await client.messages.create({
      model:      MODEL,
      max_tokens: 3072,
      messages:   [{ role: 'user', content: prompt }],
    });

    const text   = message.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(text);

    return batch.map(clip => {
      const r = parsed.find(p => p.audioID === clip.audioID);
      return {
        audioID:        clip.audioID,
        title:          clip.title,
        classification: parseTags(clip.classification),
        duration:       clip.duration ? Math.round(parseFloat(clip.duration)) : null,
        tags:           parseTags(clip.tags),
        comments:       clip.comments || null,
        xferRating:     r?.xferRating ?? null,
        xferNotes:      r?.xferNotes  || '',
        wobbler:        r?.wobbler    || false,
        approved:       true,
      };
    });
  } catch (err) {
    console.error(`\n  Error on batch [${batch.map(c => c.audioID).join(', ')}]: ${err.message}`);
    return batch.map(clip => ({
      audioID:        clip.audioID,
      title:          clip.title,
      classification: parseTags(clip.classification),
      duration:       clip.duration ? Math.round(parseFloat(clip.duration)) : null,
      tags:           parseTags(clip.tags),
      comments:       clip.comments || null,
      xferRating:     null,
      xferNotes:      '',
      wobbler:        false,
      approved:       false,
      error:          err.message,
    }));
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTags(field) {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  try { return JSON.parse(field); } catch { return []; }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => { console.error(err); process.exit(1); });
