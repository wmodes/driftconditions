#!/usr/bin/env node
/**
 * backfill-cover-images.js — Cover image backfill for audio clips
 *
 * Phase 1: Extraction
 *   Extracts embedded APIC cover art from each MP3, normalizes to 500×500 JPEG.
 *   Tags successful clips image-from-embed; passes the rest to Phase 2.
 *
 * Phase 2: Album Lookup
 *   2a. Query generation  — Clips are sent to Claude Haiku in batches. Haiku
 *       identifies the likely commercial source and generates an optimized search
 *       query with a confidence score. Below-threshold clips are tagged
 *       image-not-found and dropped.
 *   2b. iTunes lookup     — Clips are searched against the iTunes Search API
 *       (entity=song), returning up to ITUNES_LIMIT candidates per clip.
 *   2c. (extensible)      — Additional album art APIs (MusicBrainz, Discogs,
 *       Spotify, etc.) can be inserted here, merging candidates into the pool
 *       before 2d sees them.
 *   2d. Candidate selection — iTunes candidates are sent back to Haiku. Haiku
 *       picks the best match or rejects all (mashup, novelty, false positive).
 *       Confirmed matches are downloaded, normalized, and saved.
 *       Tags: image-from-haiku or image-not-found.
 *
 * Phase 3: Image Lookup  (fallback for clips that failed Phase 2)
 *   3a. Google Custom Image Search — broad web image search for album art.
 *   3b. Candidate selection — Haiku sanity-checks Google results (lower bar
 *       than 2d: "plausible?" rather than "exact match?").
 *       Tags: image-from-google or image-not-found.
 *
 * Usage (run from project root):
 *   node scripts/backfill-cover-images.js [options]
 *
 * Options:
 *   --prod               Connect to production DB (uses DATABASE_REMOTE_PASSWORD)
 *   --phase1             Run Phase 1 only (extraction; skip Phases 2–3)
 *   --phase2             Skip Phase 1 (extraction), start at Phase 2 (Album Lookup)
 *   --limit N            Process at most N clips (useful for calibration runs)
 *   --offset N           Skip first N eligible clips (useful for calibration runs)
 *   --threshold N        Haiku confidence threshold 0–1 (default: 0.50)
 *   --dry-run            Report what would happen without writing files or updating DB
 *   --retry-not-found    Re-run Phases 2–3 on clips previously marked image-not-found
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
const PHASE2_ONLY     = args.includes('--phase2');    // skip Phase 1 (extraction), start at Phase 2 (Album Lookup)
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
const ITUNES_LIMIT  = 5;     // max candidates to fetch from iTunes per clip
const DDG_LIMIT     = 5;     // max candidates to fetch from DDG image search per clip

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

  // ── Phase 1: Extraction ───────────────────────────────────────────────────────
  // Try to pull APIC cover art directly from the MP3 file. This is the cleanest
  // source — no API calls, no guessing. Clips without embedded art are queued
  // for Phase 2a (query generation).

  const needsQuery = [];   // clips that need Haiku query generation

  if (!PHASE2_ONLY) {
    console.log('── Phase 1: Extraction ────────────────────────────────────────');
    let extracted = 0;

    for (const clip of clips) {
      const audioPath = path.join(BASEDIR, 'content', clip.filename);
      const outPath   = path.join(COVER_DIR, `${clip.audioID}.${COVER_EXT}`);
      const label     = `[${clip.audioID}] ${clip.title.slice(0, 55)}`;

      if (!fs.existsSync(audioPath)) {
        console.log(`  ${label} — file missing, queuing for Phase 2a`);
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

    console.log(`\nPhase 1 complete: ${extracted} extracted, ${needsQuery.length} queued for Phase 2a.\n`);
  } else {
    // --phase2: skip Phase 1, send everything directly to Phase 2a
    needsQuery.push(...clips);
  }

  if (PHASE1_ONLY || needsQuery.length === 0) {
    console.log('Done.');
    await db.end();
    process.exit(0);
  }

  // ── Phase 2a: Query generation (Haiku) ───────────────────────────────────────
  // Send clips to Haiku in batches. Haiku identifies the likely commercial source
  // and constructs an optimized search query with a confidence score.
  // Clips below the confidence threshold are tagged image-not-found and dropped.
  // Output: needsAlbumSearch[] — clips with a search query ready for Phase 2b.

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY in AdminServer/.env');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log(`── Phase 2a: Query generation (${needsQuery.length} clips, threshold ${THRESHOLD}) ──`);

  const needsAlbumSearch = [];   // clips with a confirmed search query for Phase 2b
  let p2aNotFound = 0, p2aErrors = 0;

  const p2aBatches = [];
  for (let i = 0; i < needsQuery.length; i += BATCH_SIZE) {
    p2aBatches.push(needsQuery.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < p2aBatches.length; i++) {
    console.log(`\nBatch ${i + 1}/${p2aBatches.length}:`);
    const results = await buildSearchQueries(client, p2aBatches[i]);

    for (const result of results) {
      const clip  = needsQuery.find(c => c.audioID === result.audioID);
      const label = `  [${result.audioID}] ${(clip?.title || '').slice(0, 50)}`;

      if (result.error) {
        console.log(`${label} — haiku error: ${result.error}`);
        if (!DRY_RUN) await setCoverImage(result.audioID, null, INTERNAL_TAGS.imageNotFound);
        p2aErrors++;
        continue;
      }

      if (result.confidence < THRESHOLD || !result.searchQuery) {
        const conf = result.confidence != null ? result.confidence.toFixed(2) : 'n/a';
        console.log(`${label} — low confidence (${conf}), skipping`);
        if (!DRY_RUN) await setCoverImage(result.audioID, null, INTERNAL_TAGS.imageNotFound);
        p2aNotFound++;
        continue;
      }

      console.log(`${label} — query: "${result.searchQuery}" (${result.confidence.toFixed(2)})`);
      needsAlbumSearch.push({ audioID: result.audioID, title: clip.title, source: result.source, searchQuery: result.searchQuery });
    }

    if (i < p2aBatches.length - 1) await sleep(BATCH_DELAY);
  }

  console.log(`\nPhase 2a complete: ${needsAlbumSearch.length} queued for album search, ${p2aNotFound} skipped, ${p2aErrors} errors.\n`);

  if (needsAlbumSearch.length === 0) {
    console.log('Done.');
    await db.end();
    process.exit(0);
  }

  // ── Phase 2b: iTunes lookup ───────────────────────────────────────────────────
  // Query the iTunes Search API for each clip's search query, returning up to
  // ITUNES_LIMIT album candidates per clip. Clips with no results fall through
  // to Phase 3 (Google Image Lookup).
  //
  // Phase 2c extension point: additional album art APIs (MusicBrainz, Discogs,
  // Spotify, etc.) go here — fetch candidates and merge into the array before
  // the needsCandidateSelect push so Phase 2d sees all candidates at once.
  //
  // Output: needsCandidateSelect[] — clips with candidate lists for Phase 2d.

  console.log(`── Phase 2b: iTunes lookup (${needsAlbumSearch.length} clips) ──`);

  const needsCandidateSelect = [];   // clips with iTunes candidates for Phase 2d
  const needsImageSearch     = [];   // clips that failed Phase 2 → fall through to Phase 3
  let p2bNotFound = 0, p2bErrors = 0;

  for (const clip of needsAlbumSearch) {
    const label = `  [${clip.audioID}] ${clip.title.slice(0, 50)}`;
    try {
      const candidates = await itunesCandidates(clip.searchQuery);
      if (candidates.length === 0) {
        console.log(`${label} — no iTunes results (→ Phase 3)`);
        if (RETRY_NOT_FOUND && !DRY_RUN) await removeTag(clip.audioID, INTERNAL_TAGS.imageNotFound);
        needsImageSearch.push({ audioID: clip.audioID, title: clip.title });
        p2bNotFound++;
      } else {
        const names = candidates.map(c => `${c.artistName} — ${c.collectionName}`).join(', ');
        console.log(`${label} — ${candidates.length} candidate(s): ${names.slice(0, 80)}`);
        needsCandidateSelect.push({ ...clip, candidates });
      }
    } catch (err) {
      console.log(`${label} — iTunes error: ${err.message}`);
      if (!DRY_RUN) await setCoverImage(clip.audioID, null, INTERNAL_TAGS.imageNotFound);
      p2bErrors++;
    }
  }

  console.log(`\nPhase 2b complete: ${needsCandidateSelect.length} queued for candidate selection, ${p2bNotFound} no results, ${p2bErrors} errors.\n`);

  if (needsCandidateSelect.length === 0) {
    console.log('Done.');
    await db.end();
    process.exit(0);
  }

  // ── Phase 2d: Candidate selection (Haiku) ────────────────────────────────────
  // Send clips with album candidates back to Haiku for final match check.
  // Haiku compares the original clip title to each candidate and either selects
  // the best match or rejects all (e.g. mashup, novelty track, keyword-only
  // false positive). Confirmed matches are downloaded, normalized, and saved.
  // Rejected clips fall through to Phase 3 (Google Image Lookup).

  console.log(`── Phase 2d: Candidate selection (${needsCandidateSelect.length} clips) ──`);

  let p2dFound = 0, p2dRejected = 0, p2dErrors = 0;

  const p2dBatches = [];
  for (let i = 0; i < needsCandidateSelect.length; i += BATCH_SIZE) {
    p2dBatches.push(needsCandidateSelect.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < p2dBatches.length; i++) {
    console.log(`\nBatch ${i + 1}/${p2dBatches.length}:`);
    const verifications = await verifyMatches(client, p2dBatches[i]);

    for (const v of verifications) {
      const clip    = needsCandidateSelect.find(c => c.audioID === v.audioID);
      const label   = `  [${v.audioID}] ${(clip?.title || '').slice(0, 50)}`;
      const outPath = path.join(COVER_DIR, `${v.audioID}.${COVER_EXT}`);

      if (v.error) {
        console.log(`${label} — verify error: ${v.error}`);
        if (!DRY_RUN) await setCoverImage(v.audioID, null, INTERNAL_TAGS.imageNotFound);
        p2dErrors++;
        continue;
      }

      if (v.matchIndex === null) {
        console.log(`${label} — rejected (${v.reason}) — (→ Phase 3)`);
        if (RETRY_NOT_FOUND && !DRY_RUN) await removeTag(v.audioID, INTERNAL_TAGS.imageNotFound);
        needsImageSearch.push({ audioID: v.audioID, title: clip.title });
        p2dRejected++;
        continue;
      }

      const match = clip.candidates[v.matchIndex];
      console.log(`${label} — matched: ${match.artistName} — ${match.collectionName}`);
      console.log(`    url: ${match.artworkUrl}`);

      if (DRY_RUN) { p2dFound++; continue; }

      const fetched = await fetchAndNormalize(match.artworkUrl, outPath);
      if (fetched) {
        console.log(`    saved`);
        await setCoverImage(v.audioID, String(v.audioID), INTERNAL_TAGS.imageFromHaiku);
        p2dFound++;
      } else {
        console.log(`    fetch/normalize failed`);
        await setCoverImage(v.audioID, null, INTERNAL_TAGS.imageNotFound);
        p2dErrors++;
      }
    }

    if (i < p2dBatches.length - 1) await sleep(BATCH_DELAY);
  }

  console.log(`\nPhase 2d complete: ${p2dFound} saved, ${p2dRejected} rejected (→ Phase 3), ${p2dErrors} errors.`);

  if (needsImageSearch.length === 0) {
    console.log('\nDone.');
    await db.end();
    process.exit(0);
  }

  // ── Phase 3a: DDG image search ────────────────────────────────────────────────
  // Fallback for clips that failed Phase 2 (no iTunes candidates, or all
  // candidates rejected by Phase 2d). Searches DuckDuckGo Images using the
  // full original clip title — more context is better here since we're doing
  // open web search, not structured album lookup.
  //
  // Returns direct image URLs plus page metadata (title, source URL) that
  // Phase 3b passes to Haiku for sanity-checking.

  console.log(`\n── Phase 3a: DDG image search (${needsImageSearch.length} clips) ──`);

  const needsImageSelect = [];   // clips with DDG candidates for Phase 3b
  let p3aNotFound = 0, p3aErrors = 0;

  for (const clip of needsImageSearch) {
    const label = `  [${clip.audioID}] ${clip.title.slice(0, 50)}`;
    try {
      const candidates = await ddgCandidates(clip.title);
      if (candidates.length === 0) {
        console.log(`${label} — no DDG results`);
        if (!DRY_RUN) await setCoverImage(clip.audioID, null, INTERNAL_TAGS.imageNotFound);
        p3aNotFound++;
      } else {
        const sources = candidates.map(c => new URL(c.url).hostname).join(', ');
        console.log(`${label} — ${candidates.length} candidate(s): ${sources.slice(0, 80)}`);
        needsImageSelect.push({ ...clip, candidates });
      }
    } catch (err) {
      console.log(`${label} — DDG error: ${err.message}`);
      if (!DRY_RUN) await setCoverImage(clip.audioID, null, INTERNAL_TAGS.imageNotFound);
      p3aErrors++;
    }
  }

  console.log(`\nPhase 3a complete: ${needsImageSelect.length} queued for image selection, ${p3aNotFound} no results, ${p3aErrors} errors.\n`);

  if (needsImageSelect.length === 0) {
    console.log('Done.');
    await db.end();
    process.exit(0);
  }

  // ── Phase 3b: Candidate selection (Haiku) ────────────────────────────────────
  // Send clips with DDG candidates to Haiku for a sanity check.
  // Lower bar than Phase 2d — we're asking "does this image plausibly match?"
  // rather than "is this the exact album release?". Haiku gets the full original
  // clip title plus all DDG metadata (page title, source URL, image filename)
  // to make the best possible determination.

  console.log(`── Phase 3b: Image candidate selection (${needsImageSelect.length} clips) ──`);

  let p3bFound = 0, p3bRejected = 0, p3bErrors = 0;

  const p3bBatches = [];
  for (let i = 0; i < needsImageSelect.length; i += BATCH_SIZE) {
    p3bBatches.push(needsImageSelect.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < p3bBatches.length; i++) {
    console.log(`\nBatch ${i + 1}/${p3bBatches.length}:`);
    const selections = await selectImageCandidate(client, p3bBatches[i]);

    for (const s of selections) {
      const clip    = needsImageSelect.find(c => c.audioID === s.audioID);
      const label   = `  [${s.audioID}] ${(clip?.title || '').slice(0, 50)}`;
      const outPath = path.join(COVER_DIR, `${s.audioID}.${COVER_EXT}`);

      if (s.error) {
        console.log(`${label} — selection error: ${s.error}`);
        if (!DRY_RUN) await setCoverImage(s.audioID, null, INTERNAL_TAGS.imageNotFound);
        p3bErrors++;
        continue;
      }

      if (s.matchIndex === null) {
        console.log(`${label} — rejected (${s.reason})`);
        if (!DRY_RUN) await setCoverImage(s.audioID, null, INTERNAL_TAGS.imageNotFound);
        p3bRejected++;
        continue;
      }

      const match = clip.candidates[s.matchIndex];
      console.log(`${label} — matched: ${match.title}`);
      console.log(`    url: ${match.image}`);

      if (DRY_RUN) { p3bFound++; continue; }

      const fetched = await fetchAndNormalize(match.image, outPath);
      if (fetched) {
        console.log(`    saved`);
        await setCoverImage(s.audioID, String(s.audioID), INTERNAL_TAGS.imageFromGoogle);
        p3bFound++;
      } else {
        console.log(`    fetch/normalize failed`);
        await setCoverImage(s.audioID, null, INTERNAL_TAGS.imageNotFound);
        p3bErrors++;
      }
    }

    if (i < p3bBatches.length - 1) await sleep(BATCH_DELAY);
  }

  console.log(`\nPhase 3b complete: ${p3bFound} saved, ${p3bRejected} rejected, ${p3bErrors} errors.`);
  console.log('\nDone.');
  await db.end();
  process.exit(0);
}

// ─── Phase 2a: Query generation (Haiku) ──────────────────────────────────────

// Ask Haiku to identify the source and construct an optimized search query.
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

// ─── Phase 2b: iTunes lookup ──────────────────────────────────────────────────

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

// ─── Phase 3a: DDG image search ──────────────────────────────────────────────

// Search DuckDuckGo Images for the full original clip title.
// DDG requires a two-step dance: first fetch the page to get a session token
// (vqd), then use that token to hit the image results endpoint.
// Returns an array of { title, url, image, width, height } objects —
// all metadata Haiku can use to judge relevance in Phase 3b.
async function ddgCandidates(query) {
  const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // Step 1: get the vqd session token DDG embeds in the search page
  const initRes = await fetch(
    `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
    { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) }
  );
  const initHtml = await initRes.text();
  const vqd = initHtml.match(/vqd=['"]([^'"]+)['"]/)?.[1];
  if (!vqd) throw new Error('Could not extract DDG vqd token');

  // Step 2: fetch image results using the token
  const imgRes = await fetch(
    `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&vqd=${vqd}&o=json&p=1&s=0&u=bing&f=,,,,,`,
    { headers: { 'User-Agent': UA, 'Referer': 'https://duckduckgo.com/' },
      signal: AbortSignal.timeout(10000) }
  );
  if (!imgRes.ok) throw new Error(`DDG image API error ${imgRes.status}`);
  const data = await imgRes.json();

  return (data.results || [])
    .slice(0, DDG_LIMIT)
    .map(r => ({
      title:  r.title,   // page title — often artist/album name
      url:    r.url,     // source page URL — domain is a useful signal
      image:  r.image,   // direct image URL
      width:  r.width,
      height: r.height,
    }));
}

// ─── Phase 3b: Image candidate selection (Haiku) ──────────────────────────────

// Ask Haiku whether any DDG image candidate plausibly matches the clip.
// Lower bar than Phase 2d: "does this image plausibly represent this audio?"
// rather than "is this the exact commercial release?".
// Haiku receives the full original clip title plus all DDG metadata
// (page title, source URL, image filename) to make the best determination.
// Returns an array of { audioID, matchIndex, reason } objects.
async function selectImageCandidate(client, batch) {
  const clipLines = batch.map((clip, idx) => {
    const candidateList = clip.candidates.map((c, ci) => {
      const filename = c.image.split('/').pop().split('?')[0];
      return `    ${ci}. Title: "${c.title}"\n       Source: ${c.url}\n       File: ${filename}\n       Size: ${c.width}x${c.height}`;
    }).join('\n');
    return `${idx + 1}. audioID=${clip.audioID}\n   Original clip title: "${clip.title}"\n   Image candidates:\n${candidateList}`;
  }).join('\n\n');

  const prompt = `You are helping find cover art for audio clips in a generative streaming radio station. These clips were sourced from the web — Free Music Archive, archive.org, artist websites, and similar sources. They may not have commercial releases.

For each clip, look at the image candidates returned from a web image search and select the one most likely to be meaningful cover art for this audio. Use all available metadata: the page title, source website domain, and image filename often reveal the content.

The bar here is lower than a strict album match — accept an image if it plausibly represents the audio (e.g. an artist photo from the right artist's site, artwork from the release page, album art from a streaming site). Reject only if the candidates are clearly unrelated (wrong artist, generic stock photo, unrelated content).

Return ONLY a valid JSON array — no explanation, no markdown:
[
  {
    "audioID": 123,
    "matchIndex": 0,
    "reason": "brief reason for selection or rejection"
  }
]

Use null for matchIndex when no candidate is plausibly related.

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

// ─── Phase 2d: Candidate selection (Haiku) ───────────────────────────────────

// Ask Haiku to compare each original clip title to its album candidates.
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
