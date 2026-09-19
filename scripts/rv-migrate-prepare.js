#!/usr/bin/env node
/**
 * rv-migrate-prepare.js — Phase 1: build the river-voices content migration manifest
 *
 * The local dev DB is used ONLY to decide which audioIDs qualify (it's the only place
 * xferRating/xferNotes exist). Every actual field of data written to river-voices — title,
 * filename, duration, tags, etc. — is re-fetched fresh from DRIFTCONDITIONS PRODUCTION,
 * never taken from the local dump. File content is not touched here at all; verifying and
 * copying the actual audio files happens server-side in a later phase (production DC ->
 * production river-voices, both on driftconditions.org) — never via this local machine.
 *
 * Usage (run from project root):
 *   node scripts/rv-migrate-prepare.js
 */

'use strict';

const path = require('path');
const fs   = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../AdminServer/.env') });
process.env.NODE_PATH = path.join(__dirname, '../AdminServer/node_modules');
require('module').Module._initPaths();

const mysql = require('mysql2/promise');
const { database: localDb } = require('config');

const EXCLUDE_IDS    = [292, 293]; // isolated vocal stems — excluded per project owner
const MANIFEST_FILE  = path.join(__dirname, 'rv-migrate-manifest.json');

function loadEnv(envPath) {
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

async function main() {
  // Step 1: LOCAL dev DB — used only to decide which audioIDs qualify (xferRating lives only here).
  const [localRows] = await localDb.query(`
    SELECT audioID FROM audio
    WHERE xferRating >= 5 AND status = 'Approved'
    ORDER BY audioID
  `);
  const candidateIDs = localRows.map(r => r.audioID).filter(id => !EXCLUDE_IDS.includes(id));
  console.log(`Candidate audioIDs from local rating pass: ${candidateIDs.length}`);
  await localDb.end();

  // Step 2: DRIFTCONDITIONS PRODUCTION — authoritative row data for those IDs.
  const dcEnv = loadEnv(path.join(__dirname, '../AdminServer/.env'));
  const dcProdDb = mysql.createPool({
    host: 'driftconditions.org', user: 'mysql', password: dcEnv.DATABASE_REMOTE_PASSWORD,
    database: 'driftconditions', waitForConnections: true, connectionLimit: 2,
  });
  const [dcRows] = await dcProdDb.query(
    `SELECT * FROM audio WHERE audioID IN (${candidateIDs.map(() => '?').join(',')}) AND status = 'Approved'`,
    candidateIDs
  );
  console.log(`Found in DC production with status=Approved: ${dcRows.length} (${candidateIDs.length - dcRows.length} no longer qualify on production — dropped)`);
  await dcProdDb.end();

  // Step 3: RIVER-VOICES PRODUCTION — existing filenames, to exclude already-migrated (pass 1) rows.
  const rvEnv = loadEnv(path.join(__dirname, '../../river-voices/AdminServer/.env'));
  const rvProdDb = mysql.createPool({
    host: 'driftconditions.org', user: 'rivervoices', password: rvEnv.DATABASE_REMOTE_PASSWORD,
    database: 'rivervoices', waitForConnections: true, connectionLimit: 2,
  });
  const [rvRows] = await rvProdDb.query('SELECT filename FROM audio');
  const rvFilenames = new Set(rvRows.map(r => r.filename));
  await rvProdDb.end();

  const candidates = dcRows.filter(r => !rvFilenames.has(r.filename));
  console.log(`Already in river-voices (by filename): ${dcRows.length - candidates.length}`);
  console.log(`Final transfer candidates: ${candidates.length}\n`);

  const manifest = candidates.map(r => ({
    audioID:        r.audioID,
    title:          r.title,
    filename:       r.filename,
    duration:       r.duration,
    filetype:       r.filetype,
    breakpoints:    r.breakpoints,
    classification: r.classification,
    tags:           r.tags,
    internalTags:   r.internalTags,
    comments:       r.comments,
    copyrightCert:  r.copyrightCert,
    coverImage:     r.coverImage,
  }));

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: 'driftconditions.org production (not local)',
    totalCandidates: manifest.length,
    manifest,
  }, null, 2));

  console.log(`Manifest written to: ${MANIFEST_FILE}`);
  console.log(`Records with a coverImage set: ${manifest.filter(m => m.coverImage).length}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
