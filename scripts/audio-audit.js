#!/usr/bin/env node
/**
 * audio-audit.js — LLM-assisted audio clip audit
 *
 * Sends all approved audio clips to Claude Haiku in batches. For each clip,
 * the model suggests additional tags AND flags potential misclassification.
 * Results are written to scripts/audio-audit-results.json for review.
 *
 * Usage (run from project root):
 *   node scripts/audio-audit.js
 *
 * Requires ANTHROPIC_API_KEY in AdminServer/.env
 * After reviewing results, run audio-audit-apply.js to write changes to the DB.
 */

'use strict';

const path = require('path');
const fs   = require('fs');

// Load env from AdminServer/.env (where DB credentials and API keys live)
require('dotenv').config({ path: path.join(__dirname, '../AdminServer/.env') });

// Add AdminServer/node_modules to the search path so we can require 'config',
// 'mysql2', etc. without duplicating those deps at the root level.
process.env.NODE_PATH = path.join(__dirname, '../AdminServer/node_modules');
require('module').Module._initPaths();

const Anthropic = require('@anthropic-ai/sdk');

// --prod flag connects directly to the production DB using DATABASE_REMOTE_PASSWORD
const USE_PROD = process.argv.includes('--prod');
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

const BATCH_SIZE     = 5;
const BATCH_DELAY_MS = 500;
const MODEL          = 'claude-haiku-4-5-20251001';
const OUTPUT_FILE    = path.join(__dirname, 'audio-audit-results.json');

// Valid classification values the model should choose from
const VALID_CLASSIFICATIONS = [
  'Ambient', 'Atmospheric', 'Environmental', 'Premixed', 'Soundscape',
  'Archival', 'Spoken Word', 'Narrative', 'Instructional',
  'Vocal Music', 'Instrumental', 'Experimental', 'Digital', 'Effect', 'Other',
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY in AdminServer/.env');
    process.exit(1);
  }
  if (USE_PROD) console.log('Connecting to PRODUCTION database.');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // 1. Fetch all approved, unlocked clips
  const [clips] = await db.query(`
    SELECT audioID, title, classification, tags, duration, comments
    FROM audio
    WHERE status = 'Approved' AND editlock = 0
    ORDER BY audioID
  `);
  console.log(`Found ${clips.length} approved clips.`);

  // 2. Build tag vocabulary from the full corpus (for consistency)
  const vocab = new Set();
  for (const clip of clips) {
    for (const tag of parseTags(clip.tags)) vocab.add(tag);
  }
  const tagVocab = [...vocab].sort();
  console.log(`Tag vocabulary: ${tagVocab.length} unique tags across corpus.\n`);

  // 3. Batch and process
  const batches = [];
  for (let i = 0; i < clips.length; i += BATCH_SIZE) {
    batches.push(clips.slice(i, i + BATCH_SIZE));
  }

  const results = [];
  for (let i = 0; i < batches.length; i++) {
    process.stdout.write(`Batch ${i + 1}/${batches.length} ... `);
    const batchResults = await processBatch(client, batches[i], tagVocab);
    results.push(...batchResults);
    console.log('done');
    if (i < batches.length - 1) await sleep(BATCH_DELAY_MS);
  }

  // 4. Summarize and write output
  const withTags           = results.filter(r => r.suggestedTags.length > 0).length;
  const withClassFlag      = results.filter(r => r.classificationFlag).length;
  const withErrors         = results.filter(r => r.error).length;

  const output = {
    generatedAt:             new Date().toISOString(),
    model:                   MODEL,
    totalClips:              clips.length,
    clipsWithTagSuggestions: withTags,
    clipsWithClassFlag:      withClassFlag,
    errors:                  withErrors,
    instructions: [
      'Each entry has:',
      '  suggestedTags    — tags to add; set approved: false to skip a clip entirely',
      '  classificationFlag — true if the model thinks the classification may be wrong',
      '  suggestedClassification — proposed replacement (review carefully before accepting)',
      'Run audio-audit-apply.js to write approved tag changes to the DB.',
      'Classification changes are flagged for manual review only — apply-script will not auto-change them.',
    ].join('\n'),
    suggestions: results,
  };

  fs.writeFileSync(OUTPUT_FILE, compactStringArrays(JSON.stringify(output, null, 2)));

  console.log(`\nSummary:`);
  console.log(`  Clips with tag suggestions:     ${withTags}/${clips.length}`);
  console.log(`  Clips with classification flags: ${withClassFlag}/${clips.length}`);
  console.log(`  Errors:                          ${withErrors}`);
  console.log(`\nResults written to: ${OUTPUT_FILE}`);

  await db.end();
  process.exit(0);
}

// ─── Batch processor ──────────────────────────────────────────────────────────

async function processBatch(client, batch, tagVocab) {
  const clipLines = batch.map((clip, idx) => {
    const tags           = parseTags(clip.tags);
    const classification = parseTags(clip.classification);
    const durationSec    = clip.duration ? Math.round(parseFloat(clip.duration)) : null;
    const parts = [
      `${idx + 1}. audioID=${clip.audioID}`,
      `Title: "${clip.title}"`,
      `Classification: ${classification.join(', ') || 'none'}`,
      `Duration: ${durationSec != null ? durationSec + 's' : 'unknown'}`,
      `Existing tags: ${tags.length > 0 ? tags.join(', ') : 'none'}`,
    ];
    if (clip.comments) parts.push(`Notes: "${clip.comments}"`);
    return parts.join(' | ');
  }).join('\n');

  const vocabSection = tagVocab.length > 0
    ? `Existing tag vocabulary — prefer these where they fit:\n${tagVocab.join(', ')}\n\n`
    : '';

  const classificationList = VALID_CLASSIFICATIONS.join(', ');

  const prompt = `You are auditing audio clips for a generative streaming radio station.

TAGS: Tags are used by the system to match a clip to playlist recipes and to other clips. Essentially, the more meaningful tags provided, the more helpful. It is common to have as many as 20 tags. Look for obvious tags, adjacent tags, and synonyms.

If you can surmise from the title and comments, try to create tags that describe every meaningful dimension of the audio. Think across all of these categories:
- Sonic texture: crackle, hiss, buzz, wash, drone, shimmer, rumble, pulse, hum, squeal
- Technical/production: analog, digital, detuned, broadcast, lo-fi, field-recording
- Use-case: bed, texture, atmosphere, stinger, wash
- Mood/feel: haunting, tense, peaceful, unsettling, meditative, eerie, dark
- Subject/content: what the audio is of or about — rain, crowd, machinery, speech
- Setting: urban, industrial, nighttime, indoors, outdoor
- Musical (if applicable): tempo like "100 bpm", key like "E#m", genre like "jazz"

For each clip, also think: What would a sound designer search for to find this? What adjacent sounds or textures does it share? How might it be used — as a bed, a wash, a texture layer?

Use short, single-word tags where possible. Do not use compound tags like "train-station" — use "train, station" instead. The system handles plurals automatically.

Example of a well-tagged clip:
Title: "260414 Queensgate Rail Yard 1" | Classification: Atmospheric, Soundscape, Effect | Duration: 1053s
Tags: field-recording, transportation, urban, ominous, tense, eerie, dark, overnight, night, nighttime, machinery, industrial, impact, coupling, clanking, crashing, steel, metal, screech, squeal, rail, railroad, trains, freight, hump-yard, train-yard, rail-yard

CLASSIFICATION: Each clip has one or more of these classifications:
${classificationList}

${vocabSection}For each clip, do two things:
1. Suggest additional tags to ADD (do not repeat existing tags). Be thorough — draw from all the categories above.
2. Check whether the classification seems right given the title, tags, duration, and notes. If it seems wrong or incomplete, set classificationFlag to true and suggest a corrected classification.

Return ONLY a valid JSON array — no explanation, no markdown:
[
  {
    "audioID": 123,
    "suggestedTags": ["tag1", "tag2"],
    "classificationFlag": false,
    "suggestedClassification": null
  },
  ...
]

Clips:
${clipLines}`;

  try {
    const message = await client.messages.create({
      model:      MODEL,
      max_tokens: 2048,
      messages:   [{ role: 'user', content: prompt }],
    });

    // Strip markdown code fences if present
    const text   = message.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(text);

    return batch.map(clip => {
      const s = parsed.find(p => p.audioID === clip.audioID);
      return {
        audioID:                  clip.audioID,
        title:                    clip.title,
        classification:           parseTags(clip.classification),
        duration:                 clip.duration ? Math.round(parseFloat(clip.duration)) : null,
        currentTags:              parseTags(clip.tags),
        comments:                 clip.comments || null,
        suggestedTags:            [
          ...(s?.suggestedTags || []),
          ...(s?.classificationFlag ? ['classification-needs-review'] : []),
        ],
        classificationFlag:       s?.classificationFlag       || false,
        suggestedClassification:  s?.suggestedClassification  || null,
        approved:                 true,
      };
    });
  } catch (err) {
    console.error(`\n  Error on batch [${batch.map(c => c.audioID).join(', ')}]: ${err.message}`);
    return batch.map(clip => ({
      audioID:                 clip.audioID,
      title:                   clip.title,
      classification:          parseTags(clip.classification),
      duration:                clip.duration ? Math.round(parseFloat(clip.duration)) : null,
      currentTags:             parseTags(clip.tags),
      comments:                clip.comments || null,
      suggestedTags:           [],
      classificationFlag:      false,
      suggestedClassification: null,
      approved:                false,
      error:                   err.message,
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

// Collapse arrays of strings onto a single line for readability.
// Leaves arrays of objects (like the suggestions array itself) untouched.
function compactStringArrays(jsonStr) {
  return jsonStr.replace(
    /\[\n(\s+"[^"]*"(?:,\n\s+"[^"]*")*)\n\s+\]/g,
    (_, inner) => '[' + inner.split(',\n').map(s => s.trim()).join(', ') + ']'
  );
}

main().catch(err => { console.error(err); process.exit(1); });
