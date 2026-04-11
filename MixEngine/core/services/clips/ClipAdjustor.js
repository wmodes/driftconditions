/**
 * @file ClipAdjustor class to adjust the timing and duration of audio clips within a track
 *       to ensure that the total duration matches the desired length specified in a recipe.
 */

const logger = require('config/logger').custom('ClipAdjustor', 'debug');
const { config } = require('config');
const { silenceAdjustMaxAttempts } = config.audio;

class ClipAdjustor {
  /**
   * Constructor to initialize the ClipAdjustor class.
   */
  constructor () {
    /**
     * The target duration of the track marked with `mixLength: true`.
     * @type {number}
     */
    this.mixDuration = 0;

    /**
     * Array to store tracks that contain adjustable/silence clips.
     * @type {Array<Object>}
     */
    this.adjustableTracks = [];
  }

  /**
   * Adjusts the timing and duration of each clip in the tracks to match the desired track length.
   * Calls the relevant internal methods to perform the adjustments.
   * @param {Object} recipe - The recipe object containing track and clip information.
   * @returns {number} - The duration of the track that has `mixLength` set to true.
   */
  adjustClipTimings (recipe) {
    logger.debug('ClipAdjustor.adjustClipTimings: Starting adjustment process');
    this._totalInitialDurations(recipe);
    this._findMixDuration(recipe);
    this._findAdjustableTracks(recipe);
    this._adjustAdjustableTracks();
    logger.debug('ClipAdjustor.adjustClipTimings: Adjustment process complete');
    return this.mixDuration;
  }

  /**
   * Totals all the non-adjustable clips in each track and assigns it to track.duration.
   * @private
   * @param {Object} recipe - The recipe object containing track and clip information.
   */
  _totalInitialDurations (recipe) {
    logger.debug('ClipAdjustor._totalInitialDurations: Starting to calculate initial durations for all tracks');
    recipe.recipeObj.tracks.forEach(track => {
      track.duration = track.clips
        .filter(clip => 'duration' in clip)
        .reduce((total, clip) => total + parseFloat(clip.duration), 0);
      logger.debug(`ClipAdjustor._totalInitialDurations: Track total duration set: ${track.duration}`);
    });
  }

  /**
   * Finds the track marked `mixLength: true` and sets its duration as `mixDuration`.
   * @private
   * @param {Object} recipe - The recipe object containing track and clip information.
   */
  _findMixDuration (recipe) {
    logger.debug('ClipAdjustor._findMixDuration: Searching for track with mixLength=true');
    const mixLengthTrack = recipe.recipeObj.tracks.find(track => track.mixLength === true);

    if (mixLengthTrack) {
      this.mixDuration = parseFloat(mixLengthTrack.duration);
      logger.debug(`ClipAdjustor._findMixDuration: Found mixLengthTrack with duration: ${this.mixDuration}`);
    } else {
      logger.warn('ClipAdjustor._findMixDuration: No track marked with mixLength: true. Using the longest track as fallback.');
      const longestTrack = recipe.recipeObj.tracks.reduce(
        (max, track) => (track.duration > max.duration ? track : max),
        recipe.recipeObj.tracks[0]
      );
      this.mixDuration = parseFloat(longestTrack.duration);
      logger.debug(`ClipAdjustor._findMixDuration: Fallback mixDuration set to longest track duration: ${this.mixDuration}`);
    }
  }

  /**
   * Finds tracks with adjustable/silence clips and saves them in `adjustableTracks`.
   * @private
   * @param {Object} recipe - The recipe object containing track and clip information.
   */
  _findAdjustableTracks (recipe) {
    logger.debug('ClipAdjustor._findAdjustableTracks: Searching for tracks with adjustable/silence clips');

    // Correcting the property names to match the JSON structure (minLength and maxLength)
    this.adjustableTracks = recipe.recipeObj.tracks.filter(track =>
      track.clips.some(clip => 'minLength' in clip && 'maxLength' in clip)
    );

    logger.debug(`ClipAdjustor._findAdjustableTracks: Found ${this.adjustableTracks.length} adjustable tracks`);
  }

  /**
   * Iterates through each of the adjustableTracks, passing the track and `mixDuration` to `_adjustFlexibleClips`.
   * @private
   */
  _adjustAdjustableTracks () {
    logger.debug('ClipAdjustor._adjustAdjustableTracks: Adjusting each of the adjustable tracks');
    this.adjustableTracks.forEach(track => {
      logger.debug(`ClipAdjustor._adjustAdjustableTracks: Adjusting track with initial duration: ${track.duration}`);
      this._adjustFlexibleClips(track);
    });
  }

  /**
   * Assigns durations to flexible clips (silences, stretch, or any clip with minLength/maxLength)
   * within a track so that the total track
   * duration fits within mixDuration without exceeding it.
   *
   * ## Design intent
   * Silence clips are spacers between effect clips on a track. The recipe creator expresses
   * distribution intent through the silence clip's clipLength range:
   *
   *   track2: tiny silence + effect + tiny silence + effect + tiny silence
   *     → effect clips bunched near the start; tiny gaps between them
   *
   *   track2: short-long silence + effect + short-long silence + effect + short-long silence
   *     → effect clips spread loosely across whatever track1's duration is
   *
   * To honor that intent, each silence is sampled *independently and uniformly* within its
   * own [minLength, maxLength] range. Sequential allocation would bias earlier silences toward
   * longer values (greedy); proportional scaling would bias larger-range silences. Rejection
   * sampling avoids both: just keep trying until the total fits.
   *
   * ## Pre-check
   * If even the minimum silence durations exceed the available budget (mixDuration minus fixed
   * content), the recipe's fixed clips are too long to honor minLengths. In this case we scale
   * all silences down proportionally — preserving relative proportions as best we can — and
   * return early. ffmpeg handles a track that runs slightly long or short gracefully.
   *
   * ## Rejection sampling + fallback
   * The pre-check guarantees a feasible solution exists (sum of mins ≤ budget), so rejection
   * sampling will always terminate in theory. We cap attempts at config.audio.silenceAdjustMaxAttempts
   * to bound worst-case behavior when the feasible region is very tight. If the cap is hit,
   * we scale the last attempt down proportionally to fit the budget — better than resetting to
   * minimums because it preserves the relative spacing between effect clips.
   *
   * @private
   * @param {Object} track - The track object containing clips to be adjusted.
   */
  _adjustFlexibleClips (track) {
    logger.debug('ClipAdjustor._adjustFlexibleClips: Starting adjustment of silences');

    // Identify flexible clips — silence spacers with a specified range but no fixed duration yet
    const flexibleClips = track.clips.filter(
      clip => !('duration' in clip) && 'minLength' in clip && 'maxLength' in clip
    );
    if (flexibleClips.length === 0) return;

    // Budget = time remaining for silences after all fixed clips are accounted for
    const fixedContent = this._calculateTotalTrackDuration(track);
    const budget = this.mixDuration - fixedContent;
    logger.debug(`ClipAdjustor._adjustFlexibleClips: fixedContent=${fixedContent}s, budget=${budget}s, mixDuration=${this.mixDuration}s`);

    const totalMins = flexibleClips.reduce((sum, clip) => sum + parseFloat(clip.minLength), 0);

    // Pre-check: if even minimum silences exceed the budget, fixed content is too long.
    // Scale all silence minimums down proportionally to fit and return early.
    if (totalMins > budget) {
      logger.warn(`ClipAdjustor._adjustFlexibleClips: Min silences (${totalMins}s) exceed budget (${budget}s) — scaling down proportionally`);
      const scale = budget > 0 ? budget / totalMins : 0;
      flexibleClips.forEach(clip => {
        clip.duration = parseFloat(clip.minLength) * scale;
        logger.debug(`ClipAdjustor._adjustFlexibleClips: Clip scaled to ${clip.duration}s`);
      });
      track.duration = this._calculateTotalTrackDuration(track);
      logger.debug(`ClipAdjustor._adjustFlexibleClips: Final track duration after scale-down: ${track.duration}s`);
      return;
    }

    // Rejection sampling: pick each silence independently and uniformly within its own range.
    // Accept the attempt if the total fits within budget. The pre-check above guarantees
    // a valid solution exists, so this converges — but we cap attempts to be safe.
    let lastAttempt = flexibleClips.map(clip => parseFloat(clip.minLength)); // safe initial fallback
    let accepted = false;

    for (let attempt = 0; attempt < silenceAdjustMaxAttempts; attempt++) {
      const durations = flexibleClips.map(clip => {
        const min = parseFloat(clip.minLength);
        const max = parseFloat(clip.maxLength);
        return min + Math.random() * (max - min);
      });
      lastAttempt = durations;
      const total = durations.reduce((sum, d) => sum + d, 0);
      if (total <= budget) {
        accepted = true;
        logger.debug(`ClipAdjustor._adjustFlexibleClips: Accepted on attempt ${attempt + 1} (total=${total.toFixed(1)}s, budget=${budget.toFixed(1)}s)`);
        break;
      }
    }

    // Fallback: scale the last attempt down to fit the budget.
    // Preserves relative proportions between silences better than resetting to minimums,
    // so effect clip distribution is approximated as closely as possible.
    if (!accepted) {
      logger.warn(`ClipAdjustor._adjustFlexibleClips: Rejection sampling hit ${silenceAdjustMaxAttempts}-attempt limit — scaling last attempt to fit budget`);
      const lastTotal = lastAttempt.reduce((sum, d) => sum + d, 0);
      const scale = lastTotal > 0 ? budget / lastTotal : 0;
      lastAttempt = lastAttempt.map(d => d * scale);
    }

    // Apply final durations to clips
    flexibleClips.forEach((clip, i) => {
      clip.duration = lastAttempt[i];
      logger.debug(`ClipAdjustor._adjustFlexibleClips: Clip duration set to ${clip.duration.toFixed(1)}s [min=${clip.minLength}, max=${clip.maxLength}]`);
    });

    track.duration = this._calculateTotalTrackDuration(track);
    logger.debug(`ClipAdjustor._adjustFlexibleClips: Final track duration: ${track.duration}s`);
  }

  /**
 * Calculates and returns the total duration of a track, including both fixed and adjustable clips.
 * @private
 * @param {Object} track - The track object containing the clips to be calculated.
 * @returns {number} - The total duration of the track.
 */
  _calculateTotalTrackDuration (track) {
    const totalTrackDuration = track.clips
      .filter(clip => 'duration' in clip)
      .reduce((total, clip) => total + parseFloat(clip.duration), 0);

    logger.debug(`ClipAdjustor._calculateTotalTrackDuration: Calculated totalTrackDuration=${totalTrackDuration}`);
    return totalTrackDuration;
  }
}

module.exports = ClipAdjustor;
