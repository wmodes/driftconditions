#!/usr/bin/env node
/**
 * @file run-xcode-backfill.js — Transcode backfill job for audio clips
 *
 * Pass 1 — Detection: tags every untagged audio record as xcode-needed or
 *   xcode-not-needed based on file size (>10MB) and bitrate (>192kbps).
 *
 * Pass 2 — Transcode: processes all xcode-needed records, producing a
 *   192kbps MP3 alongside the original and updating audio.filename.
 *
 * Records already carrying any xcode-* tag are skipped, so this job is
 * safe to re-run and can be interrupted and resumed.
 *
 * Usage (run from project root):
 *   node AdminServer/jobs/run-xcode-backfill.js [--prod]
 *
 * Options:
 *   --prod    Connect to production DB (uses DATABASE_REMOTE_PASSWORD)
 *
 * Must be run with cwd set to AdminServer/ so the config symlink resolves:
 *   cd /path/to/driftconditions/AdminServer && node jobs/run-xcode-backfill.js
 */

'use strict';

require('dotenv').config();

const path = require('path');
const { runXcodeBackfill } = require(path.join(__dirname, '../utils/xcodeRunner'));

runXcodeBackfill()
  .then(() => {
    console.log('Xcode backfill run complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Xcode backfill run failed:', err);
    process.exit(1);
  });
