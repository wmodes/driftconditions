#!/usr/bin/env node
/**
 * @file backfill-cover-images.js — One-time backfill shim
 *
 * Delegates all logic to AdminServer/jobs/run-cover-backfill.js.
 * Accepts and forwards all the same CLI flags (--prod, --dry-run, --limit, etc.).
 * Any fixes made to the job apply here automatically.
 *
 * Usage (run from project root):
 *   node scripts/backfill-cover-images.js [options]
 *
 * See AdminServer/jobs/run-cover-backfill.js for full option documentation.
 */

'use strict';

const path = require('path');
const { run } = require(path.join(__dirname, '../AdminServer/jobs/run-cover-backfill'));

run(process.argv.slice(2))
  .catch(err => { console.error(err); process.exit(1); });
