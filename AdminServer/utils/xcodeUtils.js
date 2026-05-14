/**
 * @file xcodeUtils.js
 * @description Transcode utilities for large/high-bitrate audio files.
 *
 * needsTranscode(audioRecord, filePath)
 *   Checks file size and bitrate via ffprobe. Writes xcode-needed or
 *   xcode-not-needed to internalTags and returns a boolean.
 *
 * transcodeFile(audioRecord, filePath)
 *   Transcodes the file to 192kbps MP3 via ffmpeg, writing the output
 *   alongside the original with a -xcode suffix. Updates audio.filename
 *   and internalTags (xcode-completed + xcode-<bitrate>).
 *
 * Both functions update the DB directly and are safe to call from the
 * upload handler or from xcodeRunner.js.
 */

'use strict';

const { execFile }  = require('child_process');
const path          = require('path');
const fs            = require('fs');
const { promisify } = require('util');
const { database: db } = require('config');
const { config }    = require('config');
const logger        = require('config/logger').custom('AdminServer', 'info');

const execFileAsync = promisify(execFile);

const clipsDir = config.content.clipsDir;
const { xcodeNeeded, xcodeNotNeeded, xcodeCompleted, xcodeError } = config.audio.internalTags;
const { fileSizeThresholdMB, bitrateThresholdKbps, targetBitrate } = config.audio.xcode;

const FILE_SIZE_THRESHOLD_BYTES = fileSizeThresholdMB * 1024 * 1024;
const xcodeTargetTag = `xcode-${targetBitrate}`;

// ─── Public: needsTranscode ───────────────────────────────────────────────────

/**
 * Evaluates whether an audio file should be transcoded.
 * Checks file size first (fast), then bitrate via ffprobe (slower).
 * Writes xcode-needed or xcode-not-needed to internalTags.
 * @param {Object} audioRecord - Row from audio table (audioID, internalTags)
 * @param {string} filePath - Absolute path to the audio file
 * @returns {Promise<boolean>} true if transcoding is needed
 */
async function needsTranscode(audioRecord, filePath) {
  const { audioID } = audioRecord;

  // Size check — fast, no subprocess
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch (err) {
    logger.warn(`xcodeUtils.needsTranscode: audioID ${audioID} — file not found: ${filePath}`);
    await addInternalTag(audioRecord, xcodeError);
    return false;
  }

  if (stat.size <= FILE_SIZE_THRESHOLD_BYTES) {
    logger.info(`xcodeUtils.needsTranscode: audioID ${audioID} — under size threshold, skipping`);
    await addInternalTag(audioRecord, xcodeNotNeeded);
    return false;
  }

  // Bitrate check via ffprobe
  let bitrate;
  try {
    bitrate = await probeBitrate(filePath);
  } catch (err) {
    // Can't determine bitrate — tag as needed to be conservative
    logger.warn(`xcodeUtils.needsTranscode: audioID ${audioID} — ffprobe failed (${err.message}), tagging xcode-needed`);
    await addInternalTag(audioRecord, xcodeNeeded);
    return true;
  }

  if (bitrate <= bitrateThresholdKbps) {
    logger.info(`xcodeUtils.needsTranscode: audioID ${audioID} — bitrate ${bitrate}kbps at or below threshold, skipping`);
    await addInternalTag(audioRecord, xcodeNotNeeded);
    return false;
  }

  logger.info(`xcodeUtils.needsTranscode: audioID ${audioID} — ${stat.size} bytes, ${bitrate}kbps — transcode needed`);
  await addInternalTag(audioRecord, xcodeNeeded);
  return true;
}

// ─── Public: transcodeFile ────────────────────────────────────────────────────

/**
 * Transcodes a file to 192kbps MP3, writing output alongside the original
 * with a -xcode suffix. Updates audio.filename and internalTags on success.
 * @param {Object} audioRecord - Row from audio table (audioID, filename, internalTags)
 * @param {string} filePath - Absolute path to the source file
 * @returns {Promise<void>}
 */
async function transcodeFile(audioRecord, filePath) {
  const { audioID, filename } = audioRecord;

  // Build output path: same dir, stem + -xcode.mp3
  const dir      = path.dirname(filePath);
  const stem     = path.basename(filePath, path.extname(filePath));
  const outName  = `${stem}-xcode.mp3`;
  const outPath  = path.join(dir, outName);

  // Relative filename for DB storage (same structure as original)
  const outFilename = path.join(path.dirname(filename), outName);

  logger.info(`xcodeUtils.transcodeFile: audioID ${audioID} — transcoding to ${outName}`);

  try {
    await runFfmpeg(filePath, outPath, targetBitrate);
  } catch (err) {
    logger.error(`xcodeUtils.transcodeFile: audioID ${audioID} — ffmpeg failed: ${err.message}`);
    await swapInternalTag(audioRecord, xcodeNeeded, xcodeError);
    return;
  }

  // Update DB: new filename + swap internal tags
  const existingInternal = safeParseArray(audioRecord.internalTags);
  const updatedInternal = [
    ...existingInternal.filter(t => t !== xcodeNeeded && t !== xcodeError),
    xcodeCompleted,
    xcodeTargetTag,
  ];

  await db.query(
    'UPDATE audio SET filename = ?, internalTags = ? WHERE audioID = ?',
    [outFilename, JSON.stringify(updatedInternal), audioID]
  );

  audioRecord.internalTags = updatedInternal;
  logger.info(`xcodeUtils.transcodeFile: audioID ${audioID} — complete, filename → ${outFilename}`);
}

// ─── ffprobe ──────────────────────────────────────────────────────────────────

async function probeBitrate(filePath) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    filePath,
  ]);
  const data = JSON.parse(stdout);
  const bitrateStr = data?.format?.bit_rate;
  if (!bitrateStr) throw new Error('ffprobe returned no bit_rate');
  return Math.round(parseInt(bitrateStr, 10) / 1000); // bps → kbps
}

// ─── ffmpeg ───────────────────────────────────────────────────────────────────

function runFfmpeg(inputPath, outputPath, bitrate) {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-codec:a', 'libmp3lame',
      '-b:a', `${bitrate}k`,
      '-y',        // overwrite output if it exists
      outputPath,
    ];
    const child = require('child_process').spawn('ffmpeg', args);
    let stderr = '';
    child.stderr.on('data', d => { stderr += d; });
    child.on('close', code => {
      if (code !== 0) reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-300)}`));
      else resolve();
    });
    child.on('error', reject);
  });
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function addInternalTag(audioRecord, tag) {
  const { audioID } = audioRecord;
  const existing = safeParseArray(audioRecord.internalTags);
  if (existing.includes(tag)) return;
  const updated = [...existing, tag];
  await db.query(
    'UPDATE audio SET internalTags = ? WHERE audioID = ?',
    [JSON.stringify(updated), audioID]
  );
  // Keep the in-memory record current for callers that read it after
  audioRecord.internalTags = updated;
}

async function swapInternalTag(audioRecord, removeTag, addTag) {
  const { audioID } = audioRecord;
  const existing = safeParseArray(audioRecord.internalTags);
  const updated = [...existing.filter(t => t !== removeTag), addTag];
  await db.query(
    'UPDATE audio SET internalTags = ? WHERE audioID = ?',
    [JSON.stringify(updated), audioID]
  );
  audioRecord.internalTags = updated;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeParseArray(val) {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

module.exports = { needsTranscode, transcodeFile };
