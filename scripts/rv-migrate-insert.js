#!/usr/bin/env node
/**
 * rv-migrate-insert.js — Phase 3: insert the migrated audio rows into river-voices production
 *
 * Fetches the candidate rows fresh from DRIFTCONDITIONS PRODUCTION (by audioID, from the
 * manifest built in phase 1) and inserts them into river-voices production VERBATIM — every
 * column copied as-is (title, createDate, editDate, lastUsed, timesUsed, etc.), preserving the
 * original audioID. Files were already copied server-side under those exact IDs/filenames.
 *
 * The one unavoidable exception: creatorID (NOT NULL, FK) and editorID (FK) reference DC's
 * users table. Where a row's creatorID/editorID points to a DC user that doesn't exist in
 * river-voices (river-voices only carries the 2 shared admin/service accounts from fork time —
 * userID 1 'nobody' and 18 'wmodes'), that specific value is mapped to 1 ('nobody') since there
 * is no valid FK target otherwise. Values that already point to 1 or 18 are left untouched.
 *
 * Runs as a single transaction — all rows commit together or none do.
 *
 * Usage:
 *   node scripts/rv-migrate-insert.js --dry-run   # preview only
 *   node scripts/rv-migrate-insert.js             # commit
 */

'use strict';

const path = require('path');
const fs   = require('fs');
const mysql = require('mysql2/promise');

const MANIFEST_FILE = path.join(__dirname, 'rv-migrate-manifest.json');
const FALLBACK_USER = 1; // 'nobody' — used only when the original creator/editor doesn't exist in RV
const DRY_RUN = process.argv.includes('--dry-run');

function loadEnv(envPath) {
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

async function main() {
  const { manifest } = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  const ids = manifest.map(m => m.audioID);
  console.log(`${ids.length} rows to migrate.${DRY_RUN ? ' [DRY RUN]' : ''}`);

  const dcEnv = loadEnv(path.join(__dirname, '../AdminServer/.env'));
  const dcProdDb = mysql.createPool({
    host: 'driftconditions.org', user: 'mysql', password: dcEnv.DATABASE_REMOTE_PASSWORD,
    database: 'driftconditions', waitForConnections: true, connectionLimit: 2,
  });

  const rvEnv = loadEnv(path.join(__dirname, '../../river-voices/AdminServer/.env'));
  const rvDb = mysql.createPool({
    host: 'driftconditions.org', user: 'rivervoices', password: rvEnv.DATABASE_REMOTE_PASSWORD,
    database: 'rivervoices', waitForConnections: true, connectionLimit: 2,
  });

  // Fetch source rows verbatim from DC production, and RV's valid userIDs.
  const [dcRows] = await dcProdDb.query(
    `SELECT * FROM audio WHERE audioID IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  const [rvUsers] = await rvDb.query('SELECT userID FROM users');
  const validUserIDs = new Set(rvUsers.map(u => u.userID));
  await dcProdDb.end();

  let remappedCreator = 0, remappedEditor = 0;

  const conn = await rvDb.getConnection();
  try {
    await conn.beginTransaction();

    for (const r of dcRows) {
      const creatorID = validUserIDs.has(r.creatorID) ? r.creatorID : FALLBACK_USER;
      if (creatorID !== r.creatorID) remappedCreator++;

      let editorID = r.editorID;
      if (editorID != null && !validUserIDs.has(editorID)) {
        editorID = FALLBACK_USER;
        remappedEditor++;
      }

      const values = [
        r.audioID, r.title, r.status, r.filename, creatorID, r.createDate,
        editorID, r.editDate, r.editlock, r.duration, r.filetype,
        r.breakpoints    != null ? JSON.stringify(r.breakpoints)    : null,
        r.classification != null ? JSON.stringify(r.classification): null,
        r.tags           != null ? JSON.stringify(r.tags)           : null,
        r.internalTags   != null ? JSON.stringify(r.internalTags)   : null,
        r.comments, r.copyrightCert, r.lastUsed, r.checksum, r.timesUsed, r.coverImage,
      ];

      // Always run the real INSERT (validates constraints/types even in dry-run mode) —
      // DRY_RUN only changes whether we commit or roll back at the end.
      await conn.query(
        `INSERT INTO audio
          (audioID, title, status, filename, creatorID, createDate, editorID, editDate,
           editlock, duration, filetype, breakpoints, classification, tags, internalTags,
           comments, copyrightCert, lastUsed, checksum, timesUsed, coverImage)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values
      );
    }

    console.log(`creatorID remapped to 'nobody' (no matching RV user): ${remappedCreator}`);
    console.log(`editorID remapped to 'nobody' (no matching RV user): ${remappedEditor}`);

    if (DRY_RUN) {
      console.log('Dry run — rolling back (nothing was written).');
      await conn.rollback();
    } else {
      await conn.commit();
      console.log(`Committed ${dcRows.length} rows.`);
    }
  } catch (err) {
    await conn.rollback();
    console.error('Error — rolled back entire transaction:', err.message);
    process.exitCode = 1;
  } finally {
    conn.release();
  }

  const [[{ total }]] = await rvDb.query('SELECT COUNT(*) AS total FROM audio');
  console.log(`river-voices audio table now has ${total} rows.`);

  await rvDb.end();
}

main().catch(err => { console.error(err); process.exit(1); });
