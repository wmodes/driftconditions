#!/usr/bin/env node
/**
 * backfill-cover-images.js — Cover image backfill for audio clips
 *
 * Phase 1: Extracts embedded APIC cover art from each MP3, normalizes to 500×500 JPEG.
 *          Tags successful clips image-from-embed; passes the rest to Phase 2.
 *
 * Phase 2: Remaining clips are sent to Claude Haiku in batches. Haiku identifies
 *          the source and constructs an optimized image search query. That query is
 *          passed to the Google Custom Search API (image search) to find a real,
 *          indexed image URL. The first result is fetched, normalized, and saved.
 *          Tags clips: image-from-haiku (success) or image-not-found (nothing found).
 *
 * Usage (run from project root):
 *   node scripts/backfill-cover-images.js [options]
 *
 * Options:
 *   --prod          Connect to production DB (uses DATABASE_REMOTE_PASSWORD)
 *   --phase1        Run Phase 1 only (embed extraction; skip Haiku)
 *   --phase2        Run Phase 2 only (Haiku + Google search; skip embed extraction)
 *   --limit N       Process at most N clips (useful for calibration runs)
 *   --offset N      Skip first N eligible clips (useful for calibration runs)
 *   --threshold N        Confidence threshold 0–1 for attempting iTunes search (default: 0.70)
 *   --dry-run            Report what would happen without writing files or updating the DB
 *   --retry-not-found    Re-run Phase 2 on clips previously marked image-not-found
 */

'use strict';

const path      = require('path');
const fs        = require('fs');
const { spawn } = require('child_process');

// Add AdminServer/node_modules first so dotenv and other deps resolve correctly
process.env.NODE_PATH = path.join(__dirname, '../AdminServer/node_modules');
require('module').Module._initPaths();

// Load env from AdminServer/.env (DB credentials, API keys, BASEDIR)
require('dotenv').config({ path: path.join(__dirname, '../AdminServer/.env') });

const Anthropic = require('@anthropic-ai/sdk');

// ─── Args ─────────────────────────────────────────────────────────────────────

const args        = process.argv.slice(2);
const USE_PROD       = args.includes('--prod');
const PHASE1_ONLY    = args.includes('--phase1');
const PHASE2_ONLY    = args.includes('--phase2');
const DRY_RUN        = args.includes('--dry-run');
const RETRY_NOT_FOUND = args.includes('--retry-not-found'); // re-run Phase 2 on image-not-found clips

const limitIdx  = args.indexOf('--limit');
const LIMIT     = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : null;

const offsetIdx = args.indexOf('--offset');
const OFFSET    = offsetIdx !== -1 ? parseInt(args[offsetIdx + 1], 10) : 0;

const threshIdx = args.indexOf('--threshold');
const THRESHOLD = threshIdx !== -1 ? parseFloat(args[threshIdx + 1]) : 0.70;

const MODEL       = 'claude-haiku-4-5-20251001';
const BATCH_SIZE  = 5;
const BATCH_DELAY = 500; // ms between Haiku batches

// ─── DB setup ─────────────────────────────────────────────────────────────────

let db;
if (USE_PROD) {
  const mysql = require('mysql2/promise');
  db = mysql.createPool({
    host:               'driftconditions.org',
    user:               'mysql',
    password:           process.env.DATABASE_REMOTE_PASSWORD,
    database:           'driftconditions',
    waitForConnections: true,
    connectionLimit:    5,
  });
} else {
  ({ database: db } = require('config'));
}

const { config }                    = require('config');
const { dir: COVER_DIR,
        ext: COVER_EXT,
        size: COVER_SIZE }          = config.content.coverImage;
const INTERNAL_TAGS                 = config.audio.internalTags;
const BASEDIR                       = process.env.BASEDIR;

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!BASEDIR) { console.error('BASEDIR not set in .env'); process.exit(1); }
  if (DRY_RUN)  console.log('DRY RUN — no files written, no DB changes.');
  if (USE_PROD) console.log('Connecting to PRODUCTION database.');

  // Fetch approved clips with no cover image.
  // Default: skip clips already marked image-not-found.
  // --retry-not-found: include only clips marked image-not-found (for re-running with improved prompt).
  const limitClause = LIMIT ? `LIMIT ${LIMIT} OFFSET ${OFFSET}` : (OFFSET ? `LIMIT 99999 OFFSET ${OFFSET}` : '');
  const notFoundFilter = RETRY_NOT_FOUND
    ? `AND JSON_CONTAINS(COALESCE(internalTags, '[]'), '"${INTERNAL_TAGS.imageNotFound}"', '$')`
    : `AND (internalTags IS NULL OR NOT JSON_CONTAINS(internalTags, '"${INTERNAL_TAGS.imageNotFound}"', '$'))`;
  const [clips] = await db.query(`
    SELECT audioID, title, filename, internalTags
    FROM audio
    WHERE status = 'Approved'
      AND coverImage IS NULL
      ${notFoundFilter}
    ORDER BY audioID
    ${limitClause}
  `);

  console.log(`Found ${clips.length} clip(s) to process.\n`);
  if (clips.length === 0) { await db.end(); process.exit(0); }

  // ── Phase 1: embedded APIC extraction ────────────────────────────────────────

  const needsHaiku = [];

  if (!PHASE2_ONLY) {
    console.log('── Phase 1: Embed extraction ──────────────────────────────────');
    let extracted = 0;

    for (const clip of clips) {
      const audioPath = path.join(BASEDIR, 'content', clip.filename);
      const outPath   = path.join(COVER_DIR, `${clip.audioID}.${COVER_EXT}`);
      const label     = `[${clip.audioID}] ${clip.title.slice(0, 55)}`;

      if (!fs.existsSync(audioPath)) {
        console.log(`  ${label} — file missing, queuing for Phase 2`);
        needsHaiku.push(clip);
        continue;
      }

      const ok = await extractEmbeddedArt(audioPath, outPath);
      if (ok) {
        console.log(`  ${label} — extracted`);
        if (!DRY_RUN) await setCoverImage(clip.audioID, String(clip.audioID), INTERNAL_TAGS.imageFromEmbed);
        extracted++;
      } else {
        console.log(`  ${label} — no embedded art`);
        needsHaiku.push(clip);
      }
    }

    console.log(`\nPhase 1 complete: ${extracted} extracted, ${needsHaiku.length} queued for Phase 2.\n`);
  } else {
    // --phase2 flag: skip embed extraction, send everything to Haiku
    needsHaiku.push(...clips);
  }

  if (PHASE1_ONLY || needsHaiku.length === 0) {
    console.log('Done.');
    await db.end();
    process.exit(0);
  }

  // ── Phase 2: Claude Haiku lookup ─────────────────────────────────────────────

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY in AdminServer/.env');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log(`── Phase 2: Haiku lookup (${needsHaiku.length} clips, threshold ${THRESHOLD}) ──`);

  let found = 0, notFound = 0, errors = 0;

  const batches = [];
  for (let i = 0; i < needsHaiku.length; i += BATCH_SIZE) {
    batches.push(needsHaiku.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i++) {
    console.log(`\nBatch ${i + 1}/${batches.length}:`);
    const results = await buildSearchQueries(client, batches[i]);

    for (const result of results) {
      const outPath = path.join(COVER_DIR, `${result.audioID}.${COVER_EXT}`);
      const clip    = needsHaiku.find(c => c.audioID === result.audioID);
      const label   = `  [${result.audioID}] ${(clip?.title || '').slice(0, 50)}`;

      if (result.error) {
        console.log(`${label} — haiku error: ${result.error}`);
        if (!DRY_RUN) await setCoverImage(result.audioID, null, INTERNAL_TAGS.imageNotFound);
        errors++;
        continue;
      }

      if (result.confidence < THRESHOLD || !result.searchQuery) {
        const conf = result.confidence != null ? result.confidence.toFixed(2) : 'n/a';
        console.log(`${label} — low confidence (${conf}), skipping`);
        if (!DRY_RUN) await setCoverImage(result.audioID, null, INTERNAL_TAGS.imageNotFound);
        notFound++;
        continue;
      }

      // Haiku identified the source — now ask iTunes for the artwork URL
      console.log(`${label} — searching: ${result.searchQuery}`);
      let imageUrl = null;
      try {
        imageUrl = await itunesImageSearch(result.searchQuery);
      } catch (err) {
        console.log(`    itunes error: ${err.message}`);
        if (!DRY_RUN) await setCoverImage(result.audioID, null, INTERNAL_TAGS.imageNotFound);
        errors++;
        continue;
      }

      if (!imageUrl) {
        console.log(`    no results from iTunes`);
        if (!DRY_RUN) await setCoverImage(result.audioID, null, INTERNAL_TAGS.imageNotFound);
        notFound++;
        continue;
      }

      console.log(`    url: ${imageUrl}`);

      // In dry-run mode: show the URL but don't fetch/save/update DB
      if (DRY_RUN) { found++; continue; }

      const fetched = await fetchAndNormalize(imageUrl, outPath);
      if (fetched) {
        console.log(`    saved (${result.confidence.toFixed(2)}): ${result.source}`);
        await setCoverImage(result.audioID, String(result.audioID), INTERNAL_TAGS.imageFromHaiku);
        found++;
      } else {
        console.log(`    fetch/normalize failed`);
        await setCoverImage(result.audioID, null, INTERNAL_TAGS.imageNotFound);
        notFound++;
      }
    }

    if (i < batches.length - 1) await sleep(BATCH_DELAY);
  }

  console.log(`\nPhase 2 complete: ${found} found, ${notFound} not found, ${errors} errors.`);
  console.log('\nDone.');
  await db.end();
  process.exit(0);
}

// ─── Haiku batch query construction ──────────────────────────────────────────

// Ask Haiku to identify the source and construct an optimized image search query.
// Returns an array of { audioID, source, searchQuery, confidence } objects.
async function buildSearchQueries(client, batch) {
  const clipLines = batch.map((clip, idx) =>
    `${idx + 1}. audioID=${clip.audioID} | Title: "${clip.title}"`
  ).join('\n');

  const prompt = `You are helping find cover art for audio clips in a generative streaming radio station. Clips are mostly archival recordings, field recordings, ambient music, and experimental audio. Titles typically contain artist name and work title derived from the original filename.

For each clip, identify the most likely commercially released album or single it comes from, and construct a search term optimized for the iTunes Search API — just "Artist Title" with no extra words (e.g. "Podington Bear Starling" or "Tom Waits Rain Dogs" or "Boards of Canada Music Has the Right to Children"). Do NOT add "cover art", "album cover", or any other suffix.

IMPORTANT — strip all modifiers from the search query. Use only the core artist name and original song/album title. Remove:
- Version descriptors: "isolated vocals", "acapella", "instrumental", "karaoke", "cover", "remix", "edit", "remaster", "remastered"
- Speed/pitch modifications: "slowed", "sped up", "pitched down", "nightcore", "daycore"
- Audio effects: "reverb", "reverb'd", "lofi", "lo-fi", "bass boosted"
- Dates and years: "(2023)", "- 1987", etc.
- Track/disc numbers: "01 -", "Track 03", etc.
- Any other non-title qualifiers in parentheses or after dashes

Example: "Pearl Jam - Black - Isolated Vocals (Slowed + Reverb)" → searchQuery: "Pearl Jam Black"

Return ONLY a valid JSON array — no explanation, no markdown:
[
  {
    "audioID": 123,
    "source": "identified album/release title, or null",
    "searchQuery": "Artist Album search term for iTunes, or null",
    "confidence": 0.0
  }
]

Confidence guidelines:
  0.75–1.0  — clearly a known commercial release; always provide searchQuery
  0.5–0.74  — probable match; provide your best guess
  below 0.5 — uncertain or not a commercial release (field recording, personal audio, etc.); set both to null

Clips:
${clipLines}`;

  try {
    const message = await client.messages.create({
      model:      MODEL,
      max_tokens: 1024,
      messages:   [{ role: 'user', content: prompt }],
    });

    const text   = message.content[0].text.trim()
      .replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(text);

    return batch.map(clip => {
      const r = parsed.find(p => p.audioID === clip.audioID);
      return {
        audioID:     clip.audioID,
        source:      r?.source      ?? null,
        searchQuery: r?.searchQuery ?? null,
        confidence:  r?.confidence  ?? 0,
      };
    });
  } catch (err) {
    return batch.map(clip => ({ audioID: clip.audioID, error: err.message }));
  }
}

// ─── iTunes Search API ────────────────────────────────────────────────────────

// Query iTunes Search API; returns a full-resolution artwork URL or null.
// No API key required. artworkUrl100 is always 100×100; swap suffix for 600×600.
async function itunesImageSearch(query) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=5`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`iTunes API error ${res.status}`);
  const data = await res.json();
  const artwork = data.results?.[0]?.artworkUrl100;
  if (!artwork) return null;
  // Upgrade to 600×600 (iTunes CDN supports arbitrary sizes via this suffix)
  return artwork.replace('100x100bb', '600x600bb');
}

// ─── ffmpeg helpers ───────────────────────────────────────────────────────────

// Extract embedded APIC cover art from an MP3 and normalize to COVER_SIZE.
// Returns true if a non-empty output file was written.
function extractEmbeddedArt(audioPath, outPath) {
  return new Promise(resolve => {
    const [w, h] = COVER_SIZE;
    const vf = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`;
    const proc = spawn('ffmpeg', ['-y', '-i', audioPath, '-an', '-vf', vf, '-q:v', '2', outPath],
      { stdio: 'pipe' });
    proc.on('close', () => {
      try { resolve(fs.statSync(outPath).size > 0); } catch { resolve(false); }
    });
  });
}

// Normalize an image file (any format) to COVER_SIZE JPEG.
function normalizeImage(inputPath, outPath) {
  return new Promise(resolve => {
    const [w, h] = COVER_SIZE;
    const vf = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`;
    const proc = spawn('ffmpeg', ['-y', '-i', inputPath, '-vf', vf, '-q:v', '2', outPath],
      { stdio: 'pipe' });
    proc.on('close', () => {
      try { resolve(fs.statSync(outPath).size > 0); } catch { resolve(false); }
    });
  });
}

// Fetch an image URL, write to a temp file, normalize, clean up.
async function fetchAndNormalize(url, outPath) {
  const tmpPath = outPath + '.tmp';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return false;
    fs.writeFileSync(tmpPath, Buffer.from(await res.arrayBuffer()));
    return await normalizeImage(tmpPath, outPath);
  } catch {
    return false;
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

// Remove a specific tag value from a JSON array column.
// MySQL lacks a direct JSON_ARRAY_REMOVE_VALUE; we rebuild using JSON_SEARCH.
async function removeTag(audioID, tagValue) {
  // JSON_REMOVE needs a path; JSON_UNQUOTE(JSON_SEARCH(...)) gives us e.g. '$[2]'
  await db.query(
    `UPDATE audio
     SET internalTags = JSON_REMOVE(internalTags,
           JSON_UNQUOTE(JSON_SEARCH(internalTags, 'one', ?)))
     WHERE audioID = ?
       AND JSON_CONTAINS(COALESCE(internalTags, '[]'), ?, '$')`,
    [tagValue, audioID, JSON.stringify(tagValue)]
  );
}

// Set coverImage and append the source tag to internalTags.
// Pass coverImage=null to only update internalTags (image-not-found case).
// If RETRY_NOT_FOUND, first strip the old image-not-found tag to avoid duplicates.
async function setCoverImage(audioID, coverImage, tag) {
  if (RETRY_NOT_FOUND) {
    await removeTag(audioID, INTERNAL_TAGS.imageNotFound);
  }
  if (coverImage !== null) {
    await db.query(
      `UPDATE audio
       SET coverImage   = ?,
           internalTags = JSON_ARRAY_APPEND(COALESCE(internalTags, JSON_ARRAY()), '$', ?)
       WHERE audioID = ?`,
      [coverImage, tag, audioID]
    );
  } else {
    await db.query(
      `UPDATE audio
       SET internalTags = JSON_ARRAY_APPEND(COALESCE(internalTags, JSON_ARRAY()), '$', ?)
       WHERE audioID = ?`,
      [tag, audioID]
    );
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => { console.error(err); process.exit(1); });
