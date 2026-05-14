/**
 * @file xcodeRunner.js
 * @description Backfill runner for audio transcode pipeline.
 *
 * Two passes per run:
 *
 *   Pass 1 — Detection: finds records with no xcode-* tag, runs needsTranscode()
 *   on each to classify them as xcode-needed or xcode-not-needed.
 *
 *   Pass 2 — Transcode: finds records tagged xcode-needed, runs transcodeFile()
 *   on each to produce a 192kbps MP3 and update audio.filename.
 *
 * Records already carrying any xcode-* tag are skipped on the relevant pass,
 * making the job safely re-runnable and interruptible.
 *
 * Called by AdminServer/jobs/run-xcode-backfill.js.
 */

'use strict';

const path = require('path');
const { database: db } = require('config');
const { config }       = require('config');
const logger           = require('config/logger').custom('AdminServer', 'info');

const { needsTranscode, transcodeFile } = require('./xcodeUtils');

const clipsDir = config.content.clipsDir;
const { xcodeNeeded, xcodeNotNeeded, xcodeCompleted, xcodeError } = config.audio.internalTags;

const XCODE_TAGS = [xcodeNeeded, xcodeNotNeeded, xcodeCompleted, xcodeError];

// ─── Main entry point ─────────────────────────────────────────────────────────

async function runXcodeBackfill() {
  logger.info('xcodeRunner: starting run');

  await runDetectionPass();
  await runTranscodePass();

  logger.info('xcodeRunner: run complete');
}

// ─── Pass 1: Detection ────────────────────────────────────────────────────────

async function runDetectionPass() {
  // Find records with no xcode-* tag at all
  const placeholders = XCODE_TAGS.map(() => '?').join(', ');
  const conditions   = XCODE_TAGS.map(() => `NOT JSON_CONTAINS(COALESCE(internalTags, '[]'), ?)`).join(' AND ');

  const [rows] = await db.query(
    `SELECT audioID, filename, internalTags
       FROM audio
      WHERE status != 'Trashed'
        AND ${conditions}`,
    [...XCODE_TAGS.map(t => JSON.stringify(t))]
  );

  logger.info(`xcodeRunner: detection pass — ${rows.length} untagged record(s)`);

  for (const row of rows) {
    const filePath = path.join(clipsDir, row.filename);
    await needsTranscode(row, filePath);
  }
}

// ─── Pass 2: Transcode ────────────────────────────────────────────────────────

async function runTranscodePass() {
  const [rows] = await db.query(
    `SELECT audioID, filename, internalTags
       FROM audio
      WHERE status != 'Trashed'
        AND JSON_CONTAINS(COALESCE(internalTags, '[]'), ?)`,
    [JSON.stringify(xcodeNeeded)]
  );

  logger.info(`xcodeRunner: transcode pass — ${rows.length} file(s) to transcode`);

  for (const row of rows) {
    const filePath = path.join(clipsDir, row.filename);
    await transcodeFile(row, filePath);
  }
}

module.exports = { runXcodeBackfill };
