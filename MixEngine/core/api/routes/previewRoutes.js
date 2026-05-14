// previewRoutes.js — off-the-record mix preview for recipe editors
//
// POST /api/preview
//   Body: { recipeData: <JSON string> }
//   Runs the full mix pipeline (RecipeParser → ClipSelector → ClipAdjustor →
//   MixEngine) without touching RecordKeeper or MixQueue.
//   Returns: { url, playlist, duration }

'use strict';

const express       = require('express');
const router        = express.Router();
const path          = require('path');
const fs            = require('fs');
const JSON5         = require('json5');

const logger        = require('config/logger').custom('PreviewRoute', 'info');
const { config }    = require('config');

const RecipeParser  = require('@services/recipes/RecipeParser');
const ClipSelector  = require('@services/clips/ClipSelector');
const ClipAdjustor  = require('@services/clips/ClipAdjustor');
const MixEngine     = require('@services/audio/MixEngine');
const CoverSelector = require('@services/covers/CoverSelector');

const mixPreviewDir = config.content.mixPreviewDir;

// ─── POST /api/preview ────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { recipeData } = req.body;

  if (!recipeData) {
    return res.status(400).json({ error: 'recipeData is required' });
  }

  // Parse recipe JSON from the editor (may be JSON5)
  let recipeObj;
  try {
    recipeObj = JSON5.parse(recipeData);
  } catch (err) {
    return res.status(400).json({ error: `Invalid recipe JSON: ${err.message}` });
  }

  // Build a minimal recipe structure that matches what the pipeline expects.
  // recipeData (string) is required by validateRecipe; recipeObj is set here
  // so normalizeRecipe doesn't need to re-parse it (it will overwrite, which is fine).
  const recipe = {
    recipeID:   0,
    title:      req.body.title || 'preview',
    recipeData, // string — required by validateRecipe
    recipeObj,  // pre-parsed — overwritten by normalizeRecipe but saves a parse
  };

  try {
    const recipeParser  = new RecipeParser();
    const clipSelector  = new ClipSelector();
    const clipAdjustor  = new ClipAdjustor();
    const mixEngine     = new MixEngine();
    const coverSelector = new CoverSelector();

    // Validate
    if (!recipeParser.validateRecipe(recipe)) {
      return res.status(422).json({ error: 'Recipe validation failed' });
    }

    // Normalize and mark mix length track
    recipeParser.normalizeRecipe(recipe);
    recipeParser.markMixLengthTrack(recipe);

    // Select clips from DB
    const clipsFound = await clipSelector.selectAudioClips(recipe);
    if (!clipsFound) {
      return res.status(422).json({ error: 'No matching clips found for this recipe' });
    }

    // Verify all selected clip files exist locally before handing off to ffmpeg
    const clipsDir = config.content.clipsDir;
    const missingFiles = recipe.recipeObj.tracks
      .flatMap(t => t.clips)
      .filter(c => !c.classification?.includes('silence') && c.filename)
      .map(c => path.join(clipsDir, c.filename))
      .filter(p => !fs.existsSync(p));

    if (missingFiles.length > 0) {
      logger.warn(`PreviewRoute: ${missingFiles.length} clip file(s) not found locally`);
      return res.status(422).json({
        error: `${missingFiles.length} selected clip file(s) are not available locally. ` +
               `Try regenerating — a different clip may be selected.`,
      });
    }

    // Adjust timings
    const duration = clipAdjustor.adjustClipTimings(recipe);

    // Build playlist summary (mirrors RecordKeeper output format)
    const playlist = recipe.recipeObj.tracks
      .flatMap(t => t.clips)
      .filter(c => !c.classification?.includes('silence'))
      .map(c => ({ title: c.title, audioID: c.audioID }));

    // Cover image (best-effort, no fallback required for preview)
    const { coverImagePath } = coverSelector.selectCoverImage(recipe);

    // Timestamp-based ID so filenames are unique and sortable
    const previewID = `preview-${Date.now()}`;

    const mixDetails = {
      mixID:         previewID,
      outputDir:     mixPreviewDir,
      skipMetadata:  true,   // avoid ffmpeg title-with-spaces bug in _embedMetadata
      playlist,
      duration,
    };

    try {
      await mixEngine.makeMix(recipe, mixDetails);
    } catch (err) {
      // If the mix file was created despite the error (e.g. metadata step failed
      // after a successful render), treat it as success.
      if (!mixDetails.filepath || !fs.existsSync(mixDetails.filepath)) {
        logger.error(`PreviewRoute: mix render failed: ${err.message}`);
        return res.status(500).json({ error: `Mix generation failed: ${err.message}` });
      }
      logger.warn(`PreviewRoute: mix rendered but post-processing failed (${err.message}) — serving anyway`);
    }

    const filename = path.basename(mixDetails.filepath);
    logger.info(`PreviewRoute: rendered ${filename} (${Math.round(duration)}s)`);

    res.json({
      url:      `/mixpreview/${filename}`,
      playlist,
      duration,
    });

  } catch (err) {
    logger.error(`PreviewRoute: pipeline error: ${err.message}`);
    res.status(500).json({ error: `Mix generation failed: ${err.message}` });
  }
});

module.exports = router;
