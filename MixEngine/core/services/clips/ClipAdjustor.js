/**
 * @file ClipAdjustor class to adjust the timing and duration of audio clips within a track 
 *       to ensure that the total duration matches the desired length specified in a recipe.
 */

const logger = require('config/logger').custom('ClipAdjustor', 'info');

class ClipAdjustor {
  /**
   * Constructor to initialize the ClipAdjustor class.
   */
  constructor() {
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
  adjustClipTimings(recipe) {
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
  _totalInitialDurations(recipe) {
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
  _findMixDuration(recipe) {
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
  _findAdjustableTracks(recipe) {
    logger.debug('ClipAdjustor._findAdjustableTracks: Searching for tracks with adjustable/silence clips');
    
    // Correcting the property names to match the JSON structure (minLength and maxLength)
    this.adjustableTracks = recipe.recipeObj.tracks.filter(track =>
      track.clips.some(clip => 'minLength' in clip && 'maxLength' in clip)
    );

    logger.debug(`ClipAdjustor._findAdjustableTracks: Found ${this.adjustableTracks.length} adjustable tracks`);
  }


  /**
   * Iterates through each of the adjustableTracks, passing the track and `mixDuration` to `_adjustSilences`.
   * @private
   */
  _adjustAdjustableTracks() {
    logger.debug('ClipAdjustor._adjustAdjustableTracks: Adjusting each of the adjustable tracks');
    this.adjustableTracks.forEach(track => {
      logger.debug(`ClipAdjustor._adjustAdjustableTracks: Adjusting track with initial duration: ${track.duration}`);
      this._adjustSilences(track);
    });
  }

  /**
   * Adjusts the durations of flexible clips (e.g., silences) within a track based on the difference
   * between the track's duration and `mixDuration`, using random assignments until the total duration is within an acceptable range.
   * @private
   * @param {Object} track - The track object containing the clips to be adjusted.
   */
  _adjustSilences(track) {
    logger.debug('ClipAdjustor._adjustSilences: Starting adjustment of silences');

    // Calculate the initial totalTrackDuration and totalMaxFlexibleDuration
    const totalTrackDuration = this._calculateTotalTrackDuration(track);
    const totalMaxFlexibleDuration = track.clips
      .filter(clip => !('duration' in clip) && 'minLength' in clip && 'maxLength' in clip)
      .reduce((total, clip) => total + parseFloat(clip.maxLength), 0);

    logger.debug(`ClipAdjustor._adjustSilences: totalTrackDuration=${totalTrackDuration}, totalMaxFlexibleDuration=${totalMaxFlexibleDuration}`);

    // If the totalTrackDuration + the total maxLength of adjustable tracks is less than 33% of mixDuration
    // to prevent an infinite loop if we can't fill the space
    if (totalTrackDuration + totalMaxFlexibleDuration < this.mixDuration * 0.33) {
      logger.debug(`ClipAdjustor._adjustSilences: Not enough flexible material to fill space, setting all flexible tracks to maxLength`);
      // Set all flexible clips to maxLength 
      track.clips.filter(clip => !('duration' in clip) && 'minLength' in clip && 'maxLength' in clip)
        .forEach(clip => {
          clip.duration = parseFloat(clip.maxLength);
          logger.debug(`ClipAdjustor._adjustSilences: Clip set to maxLength duration=${clip.duration}`);
        });
    } else {
      // Start by setting each adjustable clip to minLength.
      logger.debug(`ClipAdjustor._adjustSilences: Proceeding with random adjustment strategy`);
      
      const flexibleClips = track.clips.filter(clip => !('duration' in clip) && 'minLength' in clip && 'maxLength' in clip);
      flexibleClips.forEach(clip => {
        clip.duration = parseFloat(clip.minLength);
      });

      // Get the totalTrackDuration 
      let updatedTrackDuration = this._calculateTotalTrackDuration(track);

      // If the totalTrackDuration is less than mixDuration to prevent an infinite loop if we have too much material
      if (updatedTrackDuration < this.mixDuration) {
        logger.debug(`ClipAdjustor._adjustSilences: Initial updatedTrackDuration (${updatedTrackDuration}) is less than mixDuration (${this.mixDuration}), starting random adjustment loop`);

        // Create an infinite while loop
        while (true) {
          // Iterate over the adjustable clips in the track
          flexibleClips.forEach(clip => {
            // Pick a random value within minLength and maxLength and assign it to the clip duration
            const minLen = parseFloat(clip.minLength);
            const maxLen = parseFloat(clip.maxLength);
            clip.duration = minLen + Math.random() * (maxLen - minLen);
            logger.debug(`ClipAdjustor._adjustSilences: Clip adjusted to random duration=${clip.duration}`);
          });

          // Calculate the totalTrackDuration (including both silence and fixed clips)
          updatedTrackDuration = this._calculateTotalTrackDuration(track);

          // If the totalTrackDuration is greater than mixLengthDuration, loop again
          if (updatedTrackDuration > this.mixDuration) {
            logger.debug(`ClipAdjustor._adjustSilences: updatedTrackDuration (${updatedTrackDuration}) exceeds mixDuration (${this.mixDuration}), trying again`);
            // Reset to minLength and try again
            flexibleClips.forEach(clip => {
              clip.duration = parseFloat(clip.minLength);
            });
            continue; // Go to the next iteration
          }

          // If the totalTrackDuration is within 33% of mixLengthDuration, break out of the loop
          if (updatedTrackDuration >= this.mixDuration * 0.67) {
            logger.debug(`ClipAdjustor._adjustSilences: updatedTrackDuration (${updatedTrackDuration}) is within 33% of mixDuration (${this.mixDuration}), breaking loop`);
            break; // Break the loop if within 33% of mixDuration
          }
        }
      } else {
        logger.debug(`ClipAdjustor._adjustSilences: No adjustment needed as updatedTrackDuration (${updatedTrackDuration}) is not less than mixDuration (${this.mixDuration})`);
      }
    }

    // Final track duration after adjustment
    track.duration = this._calculateTotalTrackDuration(track);
    logger.debug(`ClipAdjustor._adjustSilences: Final track duration after adjustment: ${track.duration}`);
  }

  /**
 * Calculates and returns the total duration of a track, including both fixed and adjustable clips.
 * @private
 * @param {Object} track - The track object containing the clips to be calculated.
 * @returns {number} - The total duration of the track.
 */
  _calculateTotalTrackDuration(track) {
    const totalTrackDuration = track.clips
      .filter(clip => 'duration' in clip)
      .reduce((total, clip) => total + parseFloat(clip.duration), 0);
    
    logger.debug(`ClipAdjustor._calculateTotalTrackDuration: Calculated totalTrackDuration=${totalTrackDuration}`);
    return totalTrackDuration;
  }

}

module.exports = ClipAdjustor;
