#!/usr/bin/env node
/**
 * backfill-cover-images.js — Cover image backfill for audio clips
 *
 * Phase 1: Extract  — Extracts embedded APIC cover art from each MP3, normalizes
 *          to 500×500 JPEG. Tags successful clips image-from-embed; passes the
 *          rest to Phase 2.
 *
 * Phase 2: Query    — Clips are sent to Claude Haiku in batches. Haiku identifies
 *          the likely commercial source and generates an optimized iTunes search
 *          query with a confidence score. Clips below the threshold are tagged
 *          image-not-found and dropped here.
 *
 * Phase 3: Lookup   — Clips that passed Phase 2 are searched against the iTunes
 *          Search API, returning up to 5 album candidates per clip. Clips with
 *          no results are tagged image-not-found and dropped.
 *          (Additional search APIs — Discogs, Spotify, etc. — can be inserted
 *          here and their candidates merged before Phase 4.)
 *
 * Phase 4: Verify   — iTunes candidates are sent back to Claude Haiku in batches.
 *          Haiku compares the original clip title to each candidate and selects
 *          the best match, or rejects all if none qualify (e.g. mashup, novelty,
 *          keyword-only false positive). Confirmed matches are downloaded,
 *          normalized, and saved. Tags: image-from-haiku or image-not-found.
 *
 * Usage (run from project root):
 *   node scripts/backfill-cover-images.js [options]
 *
 * Options:
 *   --prod               Connect to production DB (uses DATABASE_REMOTE_PASSWORD)
 *   --phase1             Run Phase 1 only (embed extraction; skip Phases 2–4)
 *   --phase2             Start at Phase 2, skipping embed extraction
 *   --limit N            Process at most N clips (useful for calibration runs)
 *   --offset N           Skip first N eligible clips (useful for calibration runs)
 *   --threshold N        Haiku confidence threshold 0–1 (default: 0.75)
 *   --dry-run            Report what would happen without writing files or updating DB
 *   --retry-not-found    Re-run Phases 2–4 on clips previously marked image-not-found
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

const args            = process.argv.slice(2);
const USE_PROD        = args.includes('--prod');
const PHASE1_ONLY     = args.includes('--phase1');
const PHASE2_ONLY     = args.includes('--phase2');    // start at Phase 2, skip embed extraction
const DRY_RUN         = args.includes('--dry-run');
const RETRY_NOT_FOUND = args.includes('--retry-not-found');

const limitIdx  = args.indexOf('--limit');
const LIMIT     = limitIdx  !== -1 ? parseInt(args[limitIdx  + 1], 10) : null;

const offsetIdx = args.indexOf('--offset');
const OFFSET    = offsetIdx !== -1 ? parseInt(args[offsetIdx + 1], 10) : 0;

const threshIdx = args.indexOf('--threshold');
const THRESHOLD = threshIdx !== -1 ? parseFloat(args[threshIdx + 1]) : 0.50;

const MODEL        = 'claude-haiku-4-5-20251001';
const BATCH_SIZE   = 5;
const BATCH_DELAY  = 500;   // ms between Haiku batches
const ITUNES_LIMIT = 5;     // max candidates to fetch from iTunes per clip

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

const { config }           = require('config');
const { dir: COVER_DIR,
        ext: COVER_EXT,
        size: COVER_SIZE } = config.content.coverImage;
const INTERNAL_TAGS        = config.audio.internalTags;
const BASEDIR              = process.env.BASEDIR;

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!BASEDIR) { console.error('BASEDIR not set in .env'); process.exit(1); }
  if (DRY_RUN)  console.log('DRY RUN — no files written, no DB changes.');
  if (USE_PROD) console.log('Connecting to PRODUCTION database.');

  // Fetch approved clips with no cover image.
  // Default: skip clips already marked image-not-found.
  // --retry-not-found: include only clips marked image-not-found (re-run with improved prompt).
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

  // ── Phase 1: Embed extraction ─────────────────────────────────────────────────
  // Try to pull APIC cover art directly from the MP3 file. This is the cleanest
  // source — no API calls, no guessing. Clips without embedded art are queued
  // for Phase 2 (Haiku query generation).

  const needsQuery = [];   // clips that need Haiku query generation

  if (!PHASE2_ONLY) {
    console.log('── Phase 1: Embed extraction ──────────────────────────────────');
    let extracted = 0;

    for (const clip of clips) {
      const audioPath = path.join(BASEDIR, 'content', clip.filename);
      const outPath   = path.join(COVER_DIR, `${clip.audioID}.${COVER_EXT}`);
      const label     = `[${clip.audioID}] ${clip.title.slice(0, 55)}`;

      if (!fs.existsSync(audioPath)) {
        console.log(`  ${label} — file missing, queuing for Phase 2`);
        needsQuery.push(clip);
        continue;
      }

      const ok = await extractEmbeddedArt(audioPath, outPath);
      if (ok) {
        console.log(`  ${label} — extracted`);
        if (!DRY_RUN) await setCoverImage(clip.audioID, String(clip.audioID), INTERNAL_TAGS.imageFromEmbed);
        extracted++;
      } else {
        console.log(`  ${label} — no embedded art`);
        needsQuery.push(clip);
      }
    }

    console.log(`\nPhase 1 complete: ${extracted} extracted, ${needsQuery.length} queued for Phase 2.\n`);
  } else {
    // --phase2: skip embed extraction, send everything directly to Phase 2
    needsQuery.push(...clips);
  }

  if (PHASE1_ONLY || needsQuery.length === 0) {
    console.log('Done.');
    await db.end();
    process.exit(0);
  }

  // ── Phase 2: Haiku query generation ──────────────────────────────────────────
  // Send clips to Haiku in batches. Haiku identifies the likely commercial source
  // and constructs an optimized iTunes search query with a confidence score.
  // Clips below the confidence threshold are tagged image-not-found and dropped.
  // Output: needsLookup[] — clips with a search query ready for Phase 3.

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY in AdminServer/.env');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log(`── Phase 2: Haiku query generation (${needsQuery.length} clips, threshold ${THRESHOLD}) ──`);

  const needsLookup = [];   // clips with a confirmed search query for Phase 3
  let p2NotFound = 0, p2Errors = 0;

  const p2Batches = [];
  for (let i = 0; i < needsQuery.length; i += BATCH_SIZE) {
    p2Batches.push(needsQuery.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < p2Batches.length; i++) {
    console.log(`\nBatch ${i + 1}/${p2Batches.length}:`);
    const results = await buildSearchQueries(client, p2Batches[i]);

    for (const result of results) {
      const clip  = needsQuery.find(c => c.audioID === result.audioID);
      const label = `  [${result.audioID}] ${(clip?.title || '').slice(0, 50)}`;

      if (result.error) {
        console.log(`${label} — haiku error: ${result.error}`);
        if (!DRY_RUN) await setCoverImage(result.audioID, null, INTERNAL_TAGS.imageNotFound);
        p2Errors++;
        continue;
      }

      if (result.confidence < THRESHOLD || !result.searchQuery) {
        const conf = result.confidence != null ? result.confidence.toFixed(2) : 'n/a';
        console.log(`${label} — low confidence (${conf}), skipping`);
        if (!DRY_RUN) await setCoverImage(result.audioID, null, INTERNAL_TAGS.imageNotFound);
        p2NotFound++;
        continue;
      }

      console.log(`${label} — query: "${result.searchQuery}" (${result.confidence.toFixed(2)})`);
      needsLookup.push({ audioID: result.audioID, title: clip.title, source: result.source, searchQuery: result.searchQuery });
    }

    if (i < p2Batches.length - 1) await sleep(BATCH_DELAY);
  }

  console.log(`\nPhase 2 complete: ${needsLookup.length} queued for lookup, ${p2NotFound} skipped, ${p2Errors} errors.\n`);

  if (needsLookup.length === 0) {
    console.log('Done.');
    await db.end();
    process.exit(0);
  }

  // ── Phase 3: iTunes lookup ────────────────────────────────────────────────────
  // Query the iTunes Search API for each clip's search query, returning up to
  // ITUNES_LIMIT album candidates per clip. Clips with no results are tagged
  // image-not-found and dropped here.
  //
  // This is the right place to add additional search APIs (Discogs, Spotify,
  // MusicBrainz, etc.) — fetch their candidates and merge them into the array
  // before the needsVerification push, then Phase 4 sees all candidates at once.
  //
  // Output: needsVerification[] — clips with candidate lists for Phase 4.

  console.log(`── Phase 3: iTunes lookup (${needsLookup.length} clips) ──`);

  const needsVerification = [];   // clips with iTunes candidates for Phase 4
  let p3NotFound = 0, p3Errors = 0;

  for (const clip of needsLookup) {
    const label = `  [${clip.audioID}] ${clip.title.slice(0, 50)}`;
    try {
      const candidates = await itunesCandidates(clip.searchQuery);
      if (candidates.length === 0) {
        console.log(`${label} — no iTunes results`);
        if (!DRY_RUN) await setCoverImage(clip.audioID, null, INTERNAL_TAGS.imageNotFound);
        p3NotFound++;
      } else {
        const names = candidates.map(c => `${c.artistName} — ${c.collectionName}`).join(', ');
        console.log(`${label} — ${candidates.length} candidate(s): ${names.slice(0, 80)}`);
        needsVerification.push({ ...clip, candidates });
      }
    } catch (err) {
      console.log(`${label} — iTunes error: ${err.message}`);
      if (!DRY_RUN) await setCoverImage(clip.audioID, null, INTERNAL_TAGS.imageNotFound);
      p3Errors++;
    }
  }

  console.log(`\nPhase 3 complete: ${needsVerification.length} queued for verification, ${p3NotFound} no results, ${p3Errors} errors.\n`);

  if (needsVerification.length === 0) {
    console.log('Done.');
    await db.end();
    process.exit(0);
  }

  // ── Phase 4: Haiku verification ───────────────────────────────────────────────
  // Send clips with iTunes candidates back to Haiku for a final match check.
  // Haiku compares the original clip title to each candidate and either selects
  // the best match or rejects all (e.g. when iTunes returned a keyword-only false
  // positive for a mashup, novelty track, or unrelated release).
  // Confirmed matches are downloaded, normalized, and saved.

  console.log(`── Phase 4: Haiku verification (${needsVerification.length} clips) ──`);

  let p4Found = 0, p4Rejected = 0, p4Errors = 0;

  const p4Batches = [];
  for (let i = 0; i < needsVerification.length; i += BATCH_SIZE) {
    p4Batches.push(needsVerification.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < p4Batches.length; i++) {
    console.log(`\nBatch ${i + 1}/${p4Batches.length}:`);
    const verifications = await verifyMatches(client, p4Batches[i]);

    for (const v of verifications) {
      const clip    = needsVerification.find(c => c.audioID === v.audioID);
      const label   = `  [${v.audioID}] ${(clip?.title || '').slice(0, 50)}`;
      const outPath = path.join(COVER_DIR, `${v.audioID}.${COVER_EXT}`);

      if (v.error) {
        console.log(`${label} — verify error: ${v.error}`);
        if (!DRY_RUN) await setCoverImage(v.audioID, null, INTERNAL_TAGS.imageNotFound);
        p4Errors++;
        continue;
      }

      if (v.matchIndex === null) {
        console.log(`${label} — rejected (${v.reason})`);
        if (!DRY_RUN) await setCoverImage(v.audioID, null, INTERNAL_TAGS.imageNotFound);
        p4Rejected++;
        continue;
      }

      const match = clip.candidates[v.matchIndex];
      console.log(`${label} — matched: ${match.artistName} — ${match.collectionName}`);
      console.log(`    url: ${match.artworkUrl}`);

      if (DRY_RUN) { p4Found++; continue; }

      const fetched = await fetchAndNormalize(match.artworkUrl, outPath);
      if (fetched) {
        console.log(`    saved`);
        await setCoverImage(v.audioID, String(v.audioID), INTERNAL_TAGS.imageFromHaiku);
        p4Found++;
      } else {
        console.log(`    fetch/normalize failed`);
        await setCoverImage(v.audioID, null, INTERNAL_TAGS.imageNotFound);
        p4Errors++;
      }
    }

    if (i < p4Batches.length - 1) await sleep(BATCH_DELAY);
  }

  console.log(`\nPhase 4 complete: ${p4Found} verified and saved, ${p4Rejected} rejected, ${p4Errors} errors.`);
  console.log('\nDone.');
  await db.end();
  process.exit(0);
}

// ─── Phase 2: Haiku query generation ─────────────────────────────────────────

// Ask Haiku to identify the source and construct an optimized iTunes search query.
// Returns an array of { audioID, source, searchQuery, confidence } objects.
// On parse failure, returns error objects so the main loop can handle them gracefully.
async function buildSearchQueries(client, batch) {
  const clipLines = batch.map((clip, idx) =>
    `${idx + 1}. audioID=${clip.audioID} | Title: "${clip.title}"`
  ).join('\n');

  const prompt = `You are helping find cover art for audio clips in a generative streaming radio station. Clips are mostly archival recordings, field recordings, ambient music, and experimental audio. Titles may contain song titles, album titles, and artist name derived from the original filename. Your goal will be to create search terms that can be used to search music databases.

  For each clip, strip out anything that won't help us find the source of the audio. For example:

  - "Podington Bear - Starling (lofi field recording)" → "Podington Bear Starling"
  - "08 Tom Waits - Rain Dogs [1985] (remastered)" → "Tom Waits Rain Dogs"
  - "Music Has the Right to Children by Boards of Canada (sped up + reverb)" → "Music Has the Right to Children Boards of Canada"

  Be conservative about what you strip out. Don't strip out anything that might be part of the original commercial release title, e.g. "Live", "Mono", "Acoustic", "Instrumental", "Single", "EP", "Mix", "Edit", "Version", etc. Use your best judgment to balance removing extraneous adjectives without losing important identifying information.

  Strip out any adjectives or symbols that don't help identify the source, e.g. dashes, track numbers, "lofi", "field recording", "sped up", "reverb", "remastered".

  Do NOT add "cover art", "album cover", or any other suffix.

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
    below 0.5 — uncertain or not a commercial release; set both to null

  Always set confidence below 0.5 (and both fields to null) for derivative works that have no original iTunes entry:
    - Mashups combining two unrelated songs (e.g. "Hank Williams Sings Straight Outta Compton")
    - Novelty genre-swaps (e.g. "Poker Face - 1940s Western Swing Edition", "Straight Outta Compton - Oktoberfest Edition")
    - AI-generated or clearly synthetic covers
    - Fan edits, unofficial remixes, or bootlegs

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

// ─── Phase 3: iTunes lookup ───────────────────────────────────────────────────

// Query iTunes Search API for up to ITUNES_LIMIT album candidates.
// Returns an array of { artistName, collectionName, artworkUrl } objects.
// artworkUrl100 is always 100×100; suffix-swapped here to 600×600.
async function itunesCandidates(query) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${ITUNES_LIMIT}`;
  const res  = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`iTunes API error ${res.status}`);
  const data = await res.json();
  return (data.results || [])
    .map(r => ({
      artistName:     r.artistName,
      collectionName: r.collectionName,
      artworkUrl:     r.artworkUrl100?.replace('100x100bb', '600x600bb') ?? null,
    }))
    .filter(r => r.artworkUrl);  // drop any results with no artwork
}

// ─── Phase 4: Haiku verification ─────────────────────────────────────────────

// Ask Haiku to compare each original clip title to its iTunes candidates.
// Returns an array of { audioID, matchIndex, reason } objects.
// matchIndex is the 0-based index into clip.candidates, or null if no match.
async function verifyMatches(client, batch) {
  const clipLines = batch.map((clip, idx) => {
    const candidateList = clip.candidates
      .map((c, ci) => `    ${ci}. ${c.artistName} — ${c.collectionName}`)
      .join('\n');
    return `${idx + 1}. audioID=${clip.audioID}\n   Original title: "${clip.title}"\n   iTunes candidates:\n${candidateList}`;
  }).join('\n\n');

  const prompt = `You are verifying whether iTunes search results are a genuine match for an original audio clip.

For each clip, compare the original title to the iTunes candidates and select the best match — or return null if none are a genuine match. A match means the candidate is the original commercial release that this clip comes from or is directly derived from.

Reject (return null for matchIndex) when:
- The clip is a mashup combining two unrelated songs (e.g. "Hank Williams Sings Straight Outta Compton" should NOT match NWA's album)
- The clip is a novelty genre-swap or parody (e.g. "Poker Face - 1940s Western Swing Edition")
- The clip is AI-generated, a fan remix, or bootleg with no original iTunes release
- Candidates share only a keyword with the clip but are clearly a different work

Return ONLY a valid JSON array — no explanation, no markdown:
[
  {
    "audioID": 123,
    "matchIndex": 0,
    "reason": "brief reason for match or rejection"
  }
]

Use null for matchIndex when no candidate is a genuine match.

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
        audioID:    clip.audioID,
        matchIndex: r?.matchIndex ?? null,
        reason:     r?.reason    ?? 'no response',
      };
    });
  } catch (err) {
    return batch.map(clip => ({ audioID: clip.audioID, matchIndex: null, error: err.message }));
  }
}

// ─── ffmpeg helpers ───────────────────────────────────────────────────────────

// Extract embedded APIC cover art from an MP3 and normalize to COVER_SIZE JPEG.
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

// Fetch an image URL, write to a temp file, normalize to COVER_SIZE JPEG, clean up.
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
