/**
 * @file RecordKeeper.js - Handles all post-selection recordkeeping for a mix.
 *
 * After clips are selected and timings are fully resolved, RecordKeeper:
 *   - Determines which clips were actually heard (within mixDuration, per track)
 *   - Updates audio.lastUsed and audio.timesUsed for each heard clip
 *   - Writes a row to clipUsage for each heard clip
 *   - Updates recipes.lastUsed, recipes.timesUsed, and recipes.avgDuration
 *   - Writes a row to recipeUsage
 *   - Returns an accurate playlist of heard clips for storage in mixQueue
 *
 * Replaces the former RecipeParser.getPlaylistFromRecipe(), the per-clip
 * _updateClipLastUsed() in ClipSelector, and _updateRecipeLastUsed() in RecipeSelector.
 */

const { database: db } = require('config');
const { config } = require('config');
const logger = require('config/logger').custom('RecordKeeper', 'info');

const tinyMax = config.audio.clipLength.tiny.max;
const avgDurationHistoryWeight = config.recipes.avgDurationHistoryWeight;

class RecordKeeper {
  /**
   * Main entry point. Call after clipAdjustor.adjustClipTimings() so that
   * every clip.duration and mixDuration are fully resolved.
   *
   * @param {Object} recipe - The fully provisioned recipe object (recipeObj inside).
   * @param {number} mixDuration - The final mix duration in seconds.
   * @returns {Array} playlist - Clips that were actually heard in this mix.
   */
  async record (recipe, mixDuration) {
    const heardClips = this._getHeardClips(recipe, mixDuration);
    await this._updateLastUsed(heardClips);
    await this._logClipUsage(heardClips, recipe.recipeID);
    await this._updateRecipeUsage(recipe.recipeID, mixDuration);
    const playlist = this._buildPlaylist(heardClips);
    return playlist;
  }

  /**
   * Walks each track, accumulating clip durations to determine which clips
   * fall within mixDuration. A clip is "heard" if its start offset is less
   * than mixDuration (it may be partially heard if it straddles the boundary).
   *
   * Silence clips and clips shorter than tiny.max are excluded (matching the
   * former getPlaylistFromRecipe behaviour).
   *
   * @param {Object} recipe - The fully provisioned recipe object.
   * @param {number} mixDuration - The final mix duration in seconds.
   * @returns {Array} heardClips - Clip objects that were actually heard.
   */
  _getHeardClips (recipe, mixDuration) {
    const heardClips = [];

    recipe.recipeObj.tracks.forEach(track => {
      let elapsed = 0;
      (track.clips || []).forEach(clip => {
        const duration = parseFloat(clip.duration) || 0;
        // clip starts at `elapsed`; if that's already past the mix end, it was never heard
        if (elapsed < mixDuration) {
          // exclude silence — no audioID to log
          if (!clip.classification.includes('silence')) {
            // avoid duplicate audioIDs across tracks
            const alreadyListed = heardClips.some(c => c.audioID === clip.audioID);
            if (!alreadyListed) {
              heardClips.push(clip);
            }
          }
        }
        elapsed += duration;
      });
    });

    return heardClips;
  }

  /**
   * Updates audio.lastUsed timestamp for each heard clip.
   *
   * @param {Array} heardClips - Clips that were heard.
   */
  async _updateLastUsed (heardClips) {
    const now = new Date();
    for (const clip of heardClips) {
      try {
        await db.execute(
          'UPDATE audio SET lastUsed = ?, timesUsed = timesUsed + 1 WHERE audioID = ?',
          [now, clip.audioID]
        );
      } catch (error) {
        logger.error(new Error(`RecordKeeper:_updateLastUsed: Failed for audioID ${clip.audioID}: ${error.message}`));
      }
    }
  }

  /**
   * Inserts a clipUsage row for each heard clip.
   *
   * @param {Array} heardClips - Clips that were heard.
   * @param {number} recipeID - The recipe that generated this mix.
   */
  async _logClipUsage (heardClips, recipeID) {
    for (const clip of heardClips) {
      try {
        await db.execute(
          'INSERT INTO clipUsage (audioID, recipeID) VALUES (?, ?)',
          [clip.audioID, recipeID]
        );
      } catch (error) {
        logger.error(new Error(`RecordKeeper:_logClipUsage: Failed for audioID ${clip.audioID}: ${error.message}`));
      }
    }
  }

  /**
   * Updates recipe usage tracking: increments timesUsed, inserts a recipeUsage row,
   * and updates the avgDuration running average.
   *
   * avgDuration = (avgDuration * historyWeight + mixDuration) / (historyWeight + 1)
   * If avgDuration is NULL (first run), mixDuration is stored directly.
   *
   * @param {number} recipeID - The recipe that generated this mix.
   * @param {number} mixDuration - The final mix duration in seconds.
   */
  async _updateRecipeUsage (recipeID, mixDuration) {
    try {
      await db.execute(
        'INSERT INTO recipeUsage (recipeID, duration) VALUES (?, ?)',
        [recipeID, mixDuration]
      );
    } catch (error) {
      logger.error(new Error(`RecordKeeper:_updateRecipeUsage: Failed to insert recipeUsage for recipeID ${recipeID}: ${error.message}`));
    }
    try {
      await db.execute(
        `UPDATE recipes SET
          lastUsed = ?,
          timesUsed = timesUsed + 1,
          avgDuration = IF(avgDuration IS NULL,
            ?,
            (avgDuration * ? + ?) / (? + 1))
        WHERE recipeID = ?`,
        [new Date(), mixDuration, avgDurationHistoryWeight, mixDuration, avgDurationHistoryWeight, recipeID]
      );
    } catch (error) {
      logger.error(new Error(`RecordKeeper:_updateRecipeUsage: Failed to update recipes for recipeID ${recipeID}: ${error.message}`));
    }
  }

  /**
   * Builds the playlist array from heard clips for storage in mixQueue.
   *
   * @param {Array} heardClips - Clips that were heard.
   * @returns {Array} playlist
   */
  _buildPlaylist (heardClips) {
    return heardClips
      .filter(clip => parseFloat(clip.duration) >= tinyMax) // exclude tiny clips from public playlist
      .map(clip => ({
        audioID: clip.audioID,
        title: clip.title,
        filename: clip.filename,
        duration: clip.duration,
        creatorID: clip.creatorID,
        classification: clip.classification,
        tags: clip.tags
      }));
  }
}

module.exports = RecordKeeper;
