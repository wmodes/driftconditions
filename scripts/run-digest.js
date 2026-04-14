#!/usr/bin/env node
// run-digest.js - Entry point for the contributor digest cron job
//
// Must be run with cwd set to AdminServer/ so the config symlink resolves:
//   cd /path/to/driftconditions/AdminServer && node ../scripts/run-digest.js
//
// Cron (daily at 9am):
//   0 9 * * * cd /path/to/driftconditions/AdminServer && node ../scripts/run-digest.js >> ../logs/digest.log 2>&1

const path = require('path');

require('dotenv').config(); // loads AdminServer/.env when cwd is AdminServer/

const { runDigest } = require(path.join(__dirname, '../AdminServer/utils/digestRunner'));

runDigest()
  .then(() => {
    console.log('Digest run complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Digest run failed:', err);
    process.exit(1);
  });
