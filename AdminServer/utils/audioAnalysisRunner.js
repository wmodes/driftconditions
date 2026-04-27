/**
 * @file audioAnalysisRunner.js
 * @description Audio analysis runner — processes clips queued for BPM/key/danceability tagging.
 *
 * Fires nightly via systemd timer. Queries for audio records with the
 * `needs-audio-analysis` internal tag, runs experiments/essentia/analyze.js
 * on each file, merges the resulting tags into the clip's visible tags, then
 * swaps the internal tags: removes `needs-audio-analysis`, adds `audio-analyzed`.
 *
 * On analysis failure the clip gets `analysis-error` instead of `audio-analyzed`
 * so failures are visible and retryable (re-add `needs-audio-analysis` to requeue).
 *
 * Called by AdminServer/jobs/run-audio-analysis.js. Can also be invoked manually for testing.
 */

'use strict';

const { spawn }   = require('child_process');
const path        = require('path');
const { database: db } = require('config');
const { config }  = require('config');
const logger      = require('config/logger').custom('AdminServer', 'info');

const clipsDir   = config.content.clipsDir;
const { analysisQueue, analyzed } = config.audio.internalTags;
const analyzeScript    = path.resolve(__dirname, '../../experiments/essentia/analyze.js');

// ─── Main entry point ────────────────────────────────────────────────────────

async function runAudioAnalysis() {
  logger.info('audioAnalysisRunner: starting run');

  const [rows] = await db.query(
    `SELECT audioID, filename, tags, internalTags
       FROM audio
      WHERE JSON_CONTAINS(internalTags, ?)
        AND status != 'Trashed'`,
    [JSON.stringify(analysisQueue)]
  );

  logger.info(`audioAnalysisRunner: ${rows.length} clip(s) queued`);

  for (const row of rows) {
    await analyzeClip(row);
  }

  logger.info('audioAnalysisRunner: run complete');
}

// ─── Per-clip analysis ───────────────────────────────────────────────────────

async function analyzeClip(row) {
  const { audioID, filename } = row;
  const fullPath = path.join(clipsDir, filename);
  logger.info(`audioAnalysisRunner: analyzing audioID ${audioID} — ${filename}`);

  let newTags;
  try {
    newTags = await runAnalyzeScript(fullPath);
    logger.info(`audioAnalysisRunner: audioID ${audioID} → tags: ${JSON.stringify(newTags)}`);
  } catch (err) {
    logger.error(`audioAnalysisRunner: audioID ${audioID} analysis failed: ${err.message}`);
    await updateRecord(row, null, 'analysis-error');
    return;
  }

  await updateRecord(row, newTags, analyzed);
}

// ─── DB update ───────────────────────────────────────────────────────────────

async function updateRecord(row, newTags, newInternalTag) {
  const { audioID } = row;

  // Parse existing tags — mysql2 returns JSON columns as objects, but guard anyway
  const existingTags     = safeParseArray(row.tags);
  const existingInternal = safeParseArray(row.internalTags);

  // Merge in new tags (deduped), or leave unchanged on error
  const mergedTags = newTags
    ? [...new Set([...existingTags, ...newTags])]
    : existingTags;

  // Remove the queue tag, add the result tag
  const updatedInternal = [
    ...existingInternal.filter(t => t !== analysisQueue),
    newInternalTag,
  ];

  await db.query(
    'UPDATE audio SET tags = ?, internalTags = ? WHERE audioID = ?',
    [JSON.stringify(mergedTags), JSON.stringify(updatedInternal), audioID]
  );
}

// ─── Essentia subprocess ─────────────────────────────────────────────────────

function runAnalyzeScript(filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [analyzeScript, filePath]);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });

    child.on('close', code => {
      // Log stderr as diagnostics regardless of exit code
      if (stderr.trim()) logger.debug(`audioAnalysisRunner: analyze stderr:\n${stderr.trim()}`);

      if (code !== 0) {
        reject(new Error(`analyze.js exited ${code}: ${stderr.trim()}`));
        return;
      }
      try {
        const result = JSON.parse(stdout);
        resolve(result.tags || []);
      } catch (e) {
        reject(new Error(`Failed to parse analyze.js output: ${stdout.trim()}`));
      }
    });

    child.on('error', err => reject(err));
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeParseArray(val) {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

module.exports = { runAudioAnalysis };
