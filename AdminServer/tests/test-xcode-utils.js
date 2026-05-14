#!/usr/bin/env node
/**
 * Local test for xcodeUtils.needsTranscode() and transcodeFile()
 *
 * Generates synthetic audio files with ffmpeg — no server or DB needed.
 * Run from AdminServer/: node tests/test-xcode-utils.js
 *
 * Tests:
 *   large-hq.wav  — 60s uncompressed WAV (~10MB+), expect xcode-needed  → true
 *   tiny.mp3      — 2s 128kbps MP3 (<1MB),         expect xcode-needed  → false
 */

'use strict';

const { execFileSync } = require('child_process');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

// Stub config before requiring xcodeUtils
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xcode-test-'));

// Minimal config stub — avoids needing the full config package locally
const configStub = {
  content: { clipsDir: tmpDir },
  audio: {
    internalTags: {
      xcodeNeeded:    'xcode-needed',
      xcodeNotNeeded: 'xcode-not-needed',
      xcodeCompleted: 'xcode-completed',
      xcodeError:     'xcode-error',
    },
    xcode: {
      fileSizeThresholdMB:  10,
      bitrateThresholdKbps: 192,
      targetBitrate:        192,
    },
  },
};

// Intercept require('config') before loading xcodeUtils
const Module = require('module');
const _origLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'config') return { database: dbStub, config: configStub };
  if (request === 'config/logger') return { custom: () => console };
  return _origLoad.apply(this, arguments);
};

// DB stub — captures updates instead of hitting MySQL
const updates = [];
const dbStub = {
  query: async (sql, params) => {
    updates.push({ sql, params });
    return [[]];
  },
};

const { needsTranscode, transcodeFile } = require('../utils/xcodeUtils');

// ─── Generate test files ──────────────────────────────────────────────────────

const largeWav = path.join(tmpDir, 'large-hq.wav');
const tinyMp3  = path.join(tmpDir, 'tiny.mp3');

console.log(`\nGenerating test files in ${tmpDir}...`);

// ~60s of silence as uncompressed PCM WAV (~10MB)
execFileSync('ffmpeg', [
  '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
  '-t', '62',
  '-acodec', 'pcm_s16le',
  '-y', largeWav,
], { stdio: 'pipe' });

// 2s tiny 128kbps MP3
execFileSync('ffmpeg', [
  '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
  '-t', '2',
  '-acodec', 'libmp3lame', '-b:a', '128k',
  '-y', tinyMp3,
], { stdio: 'pipe' });

const largeSize = (fs.statSync(largeWav).size / 1024 / 1024).toFixed(1);
const tinySize  = (fs.statSync(tinyMp3).size  / 1024).toFixed(1);
console.log(`  large-hq.wav: ${largeSize} MB`);
console.log(`  tiny.mp3:     ${tinySize} KB`);

// ─── Run tests ────────────────────────────────────────────────────────────────

async function run() {
  let passed = 0;
  let failed = 0;

  function assert(label, actual, expected) {
    if (actual === expected) {
      console.log(`  ✓ ${label}`);
      passed++;
    } else {
      console.log(`  ✗ ${label} — expected ${expected}, got ${actual}`);
      failed++;
    }
  }

  // Test 1: large WAV should need transcode
  console.log('\nTest 1: large uncompressed WAV (expect xcode-needed → true)');
  updates.length = 0;
  const rec1 = { audioID: 9901, filename: 'large-hq.wav', internalTags: [] };
  const result1 = await needsTranscode(rec1, largeWav);
  assert('needsTranscode returns true',  result1, true);
  assert('internalTags set to xcode-needed', rec1.internalTags.includes('xcode-needed'), true);
  assert('DB updated', updates.length > 0, true);

  // Test 2: tiny MP3 should not need transcode
  console.log('\nTest 2: tiny MP3 (expect xcode-needed → false)');
  updates.length = 0;
  const rec2 = { audioID: 9902, filename: 'tiny.mp3', internalTags: [] };
  const result2 = await needsTranscode(rec2, tinyMp3);
  assert('needsTranscode returns false', result2, false);
  assert('internalTags set to xcode-not-needed', rec2.internalTags.includes('xcode-not-needed'), true);

  // Test 3: transcodeFile on the large WAV
  console.log('\nTest 3: transcodeFile on large WAV');
  updates.length = 0;
  const rec3 = { audioID: 9903, filename: 'large-hq.wav', internalTags: ['xcode-needed'] };
  await transcodeFile(rec3, largeWav);
  const outPath = path.join(tmpDir, 'large-hq-xcode.mp3');
  assert('output file exists',      fs.existsSync(outPath), true);
  assert('internalTags has xcode-completed', rec3.internalTags.includes('xcode-completed'), true);
  assert('internalTags has xcode-192',       rec3.internalTags.includes('xcode-192'), true);
  assert('filename updated in DB',  updates.some(u => u.sql.includes('filename')), true);
  if (fs.existsSync(outPath)) {
    const outSize = (fs.statSync(outPath).size / 1024).toFixed(1);
    console.log(`  output size: ${outSize} KB`);
  }

  // Test 4: missing file
  console.log('\nTest 4: missing file (expect xcode-error)');
  updates.length = 0;
  const rec4 = { audioID: 9904, filename: 'missing.wav', internalTags: [] };
  const result4 = await needsTranscode(rec4, path.join(tmpDir, 'missing.wav'));
  assert('needsTranscode returns false', result4, false);
  assert('internalTags set to xcode-error', rec4.internalTags.includes('xcode-error'), true);

  // Summary
  console.log(`\n${passed} passed, ${failed} failed`);

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });
