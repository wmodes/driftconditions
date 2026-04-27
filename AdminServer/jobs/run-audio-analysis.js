#!/usr/bin/env node
// run-audio-analysis.js - Entry point for the nightly audio analysis cron job
//
// Must be run with cwd set to AdminServer/ so the config symlink resolves:
//   cd /path/to/driftconditions/AdminServer && node jobs/run-audio-analysis.js
//
// Processes all audio clips tagged with `needs-audio-analysis`, runs Essentia
// BPM/key/danceability analysis on each, and writes the resulting tags back.

const path = require('path');

require('dotenv').config(); // loads AdminServer/.env when cwd is AdminServer/

const { runAudioAnalysis } = require(path.join(__dirname, '../utils/audioAnalysisRunner'));

runAudioAnalysis()
  .then(() => {
    console.log('Audio analysis run complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Audio analysis run failed:', err);
    process.exit(1);
  });
