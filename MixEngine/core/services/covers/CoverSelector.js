/**
 * @file CoverSelector.js - Selects a cover image for a mix.
 *
 * Walks recipe tracks and clips in order, returning the coverImage from the
 * first clip that has one. Silence clips and clips with no cover art are
 * skipped naturally (they have no coverImage). Falls back to a randomly
 * chosen alt image if no clip cover is found.
 */

'use strict';

const path   = require('path');
const { config } = require('config');

const { dir: COVER_DIR,
        altDir: ALT_DIR,
        altNum: ALT_NUM } = config.content.coverImage;

class CoverSelector {

  /**
   * Select a cover image for the mix.
   * Returns the image identifier (bare filename without extension) to store
   * in mixDetails.coverImage and embed in the mix MP3.
   *
   * @param {Object} recipe - The fully-selected recipe object (recipeObj.tracks populated).
   * @returns {Object} { coverImage, coverImagePath, isAlt }
   *   coverImage     — identifier stored in DB (e.g. "1234" or "coveralt-07")
   *   coverImagePath — absolute path to the image file
   *   isAlt          — true if falling back to an alt image
   */
  selectCoverImage(recipe) {
    // Walk tracks and clips in order; skip anything without a coverImage
    for (const track of recipe.recipeObj.tracks) {
      for (const clip of track.clips) {
        if (clip.coverImage) {
          const coverImagePath = path.join(COVER_DIR, `${clip.coverImage}.jpg`);
          return { coverImage: `img/audio/${clip.coverImage}.jpg`, coverImagePath, isAlt: false };
        }
      }
    }

    // Fallback: pick a random alt image
    const altIndex = String(Math.floor(Math.random() * ALT_NUM)).padStart(2, '0');
    const altName  = `coveralt-${altIndex}`;
    const coverImagePath = path.join(ALT_DIR, `${altName}.jpg`);
    return { coverImage: `img/alt/${altName}.jpg`, coverImagePath, isAlt: true };
  }
}

module.exports = CoverSelector;
