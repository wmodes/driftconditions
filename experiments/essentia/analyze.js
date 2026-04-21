#!/usr/bin/env node
/**
 * analyze.js — Essentia.js audio analysis experiment
 *
 * Analyzes an audio file and outputs suggested tags based on confidence thresholds.
 *
 * Usage:
 *   node analyze.js <audio-file>
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Config ───────────────────────────────────────────────────────────────────

const CONFIG = {
  // Seconds to analyze from the middle of the file
  analyzeSeconds: 180,

  // Minimum RhythmExtractor2013 confidence to tag BPM (unbounded scale, empirical)
  bpmConfidenceMin: 0.5,

  // Minimum KeyExtractor strength to tag key/scale (0–1)
  keyStrengthMin: 0.5,

  // Minimum danceability score to tag as danceable (0–~3)
  danceabilityMin: 1.1,
};

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node analyze.js <audio-file>');
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  // Load Essentia
  const EssentiaWASM = require('essentia.js/dist/essentia-wasm.umd.js');
  const Essentia     = require('essentia.js/dist/essentia.js-core.umd.js');
  const essentia     = new Essentia(EssentiaWASM);

  // Decode audio
  const { default: decode } = require('audio-decode');
  const audioData = await decode(fs.readFileSync(filePath));
  const { channelData, sampleRate } = audioData;
  const numChannels  = channelData.length;
  const totalSamples = channelData[0].length;

  // Take up to analyzeSeconds from the middle
  const windowSamples = Math.min(sampleRate * CONFIG.analyzeSeconds, totalSamples);
  const startSample   = Math.max(0, Math.floor((totalSamples - windowSamples) / 2));

  console.error(`File:      ${path.basename(filePath)}`);
  console.error(`Duration:  ${(totalSamples / sampleRate).toFixed(1)}s total, analyzing ${(windowSamples / sampleRate).toFixed(0)}s from middle`);

  // Mix down to mono
  const mono = new Float32Array(windowSamples);
  for (let i = 0; i < windowSamples; i++) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch++) sum += channelData[ch][i + startSample];
    mono[i] = sum / numChannels;
  }

  const signal = essentia.arrayToVector(mono);

  // ── Analysis ───────────────────────────────────────────────────────────────

  const tags = [];
  const diagnostics = {};

  // BPM
  try {
    const rhythm = essentia.RhythmExtractor2013(signal, 208, 'multifeature', 40);
    const bpm        = Math.round(rhythm.bpm);
    const confidence = rhythm.confidence;
    diagnostics.bpm = { bpm, confidence, pass: confidence >= CONFIG.bpmConfidenceMin };
    if (confidence >= CONFIG.bpmConfidenceMin) {
      tags.push(`${bpm}-bpm`);
      // Also offer halved BPM in case detector latched onto double-time
      if (bpm > 120) tags.push(`${Math.round(bpm / 2)}-bpm`);
    }
  } catch(e) { diagnostics.bpm = { error: e.message }; }

  // Key
  try {
    const keyResult = essentia.KeyExtractor(signal);
    const scale    = keyResult.scale;                                 // "major" or "minor"
    const strength = keyResult.strength;
    // Convert Essentia key to readable tag: "G#" → "g-sharp", "Bb" → "b-flat", "G" → "g"
    const rawKey = keyResult.key;
    const noteName = rawKey.includes('#')
      ? rawKey.replace('#', '').toLowerCase() + '-sharp'
      : rawKey.length > 1 && rawKey.endsWith('b')
        ? rawKey[0].toLowerCase() + '-flat'
        : rawKey.toLowerCase();
    const keyTag = `${noteName}-${scale}-key`;                        // e.g. "g-minor-key"
    diagnostics.key = { key: rawKey, scale, strength, pass: strength >= CONFIG.keyStrengthMin };
    if (strength >= CONFIG.keyStrengthMin) tags.push(keyTag);
  } catch(e) { diagnostics.key = { error: e.message }; }

  // Danceability
  try {
    const dance       = essentia.Danceability(signal, 8800, 310, sampleRate);
    const danceability = dance.danceability;
    diagnostics.danceability = { danceability, pass: danceability >= CONFIG.danceabilityMin };
    if (danceability >= CONFIG.danceabilityMin) tags.push('danceable');
  } catch(e) { diagnostics.danceability = { error: e.message }; }

  // ── Output ─────────────────────────────────────────────────────────────────

  console.error('');
  console.error('Diagnostics:');
  console.error(JSON.stringify(diagnostics, null, 2));
  console.error('');

  console.log(JSON.stringify({ tags }, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
