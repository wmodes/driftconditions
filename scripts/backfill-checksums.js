#!/usr/bin/env node
// backfill-checksums.js - Compute and store MD5 checksums for existing audio files
// Run from the project root: node scripts/backfill-checksums.js

// Use the project config module (handles dotenv loading)
const { config, database: db } = require('../config');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const clipsDir = config.content.clipsDir;

async function main() {
  console.log('Connected to database.');

  // Fetch all audio records without a checksum
  const [rows] = await db.query('SELECT audioID, filename FROM audio WHERE checksum IS NULL');
  console.log(`Found ${rows.length} audio records without checksums.`);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const fullPath = path.join(clipsDir, row.filename);
    if (!fs.existsSync(fullPath)) {
      console.warn(`  SKIP  [${row.audioID}] File not found: ${row.filename}`);
      skipped++;
      continue;
    }
    const buffer = fs.readFileSync(fullPath);
    const checksum = crypto.createHash('md5').update(buffer).digest('hex');
    await db.query('UPDATE audio SET checksum = ? WHERE audioID = ?', [checksum, row.audioID]);
    console.log(`  OK    [${row.audioID}] ${row.filename} → ${checksum}`);
    updated++;
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
