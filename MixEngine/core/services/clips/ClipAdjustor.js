const logger = require('config/logger').custom('ClipAdjustor', 'debug');

class ClipAdjustor {
  adjustClipTimings(recipe) {
    logger.info('Adjusting clip timings...');
    const currentRecipeObj = recipe.recipeObj;

    // Calculate initial durations and ranges
    currentRecipeObj.tracks.forEach(track => {
      track.duration = 0;  // Initialize as numerical
      track.minLength = 0;
      track.maxLength = 0;
      track.clips.forEach(clip => {
        // If we already have a duration, use it
        if ('duration' in clip) {
          logger.debug(`ClipAdjustor.adjustClipTimings: Using clip duration: ${clip.duration}`);
          let clipDuration = parseFloat(clip.duration) || 0;
          track.duration += clipDuration;
          track.minLength += clipDuration;
          track.maxLength += clipDuration;
        }
        // If we have no duration but a range, use it
        else if ('minlength' in clip && 'maxlength' in clip) {
          logger.debug(`ClipAdjustor.adjustClipTimings: Using clip minlength and maxlength: ${clip.minlength} - ${clip.maxlength}`);
          let minLen = parseFloat(clip.minlength) || 0;
          let maxLen = parseFloat(clip.maxlength) || 0;
          track.minLength += minLen;
          track.maxLength += maxLen;
          track.duration += minLen; // Assume minLength for initial calculation
        }
      });
    });

    // Find the track marked with mixLength: true
    let mixLengthTrack = currentRecipeObj.tracks.find(track => track.mixLength === true);

    // If no track is marked, use the longest track as fallback
    if (!mixLengthTrack) {
      mixLengthTrack = currentRecipeObj.tracks.reduce(
        (max, track) => (track.maxLength > max.maxLength ? track : max), 
        currentRecipeObj.tracks[0]
      );
    }

    // Adjust durations for all tracks to match the mixLengthTrack's duration
    currentRecipeObj.tracks.forEach(track => {
      // If the track is not the mixLengthTrack, calculate the difference needed to match the mixLengthTrack
      let trackDurationAdjustNeeded = parseFloat(mixLengthTrack.maxLength) - parseFloat(track.minLength);

      track.clips.forEach(clip => {
        if (!('duration' in clip) && 'minlength' in clip && 'maxlength' in clip) {
          // Set initial duration for clips without a duration
          clip.duration = Math.random() * (parseFloat(clip.maxlength) - parseFloat(clip.minlength)) + parseFloat(clip.minlength);
          logger.debug(`ClipAdjustor.adjustClipTimings: Setting initial clip duration: ${clip.duration}`);
        }
      });

      // Adjust the durations of flexible clips to match the mixLengthTrack
      if (track !== mixLengthTrack && trackDurationAdjustNeeded > 0) {
        let trackDurationFlexAvail = parseFloat(track.maxLength) - parseFloat(track.minLength);

        if (trackDurationFlexAvail >= trackDurationAdjustNeeded) {
          this._adjustSilences(track, trackDurationAdjustNeeded);
        } else {
          this._adjustSilences(track, trackDurationFlexAvail);
        }
      }

      // Recalculate the track duration based on updated clip durations
      track.duration = track.clips.reduce((totalDuration, clip) => totalDuration + parseFloat(clip.duration) || 0, 0);
      logger.debug(`ClipAdjustor.adjustClipTimings: Updated track duration: ${track.duration}`);
    });

    return parseFloat(mixLengthTrack.maxLength); // Return the mixLengthTrack's duration
  }

  // Private method to adjust silences proportionally
  _adjustSilences(track, trackDurationAdjustNeeded) {
    const flexibleClips = track.clips.filter(clip => clip.duration === undefined);
    logger.debug(`ClipAdjustor._adjustSilences: Found ${flexibleClips.length} flexible clips`);
  
    // Calculate the total duration range for all flexible clips
    const totalDurationRange = flexibleClips.reduce((sum, clip) => {
      const minLen = parseFloat(clip.minlength) || 0;
      const maxLen = parseFloat(clip.maxlength) || 0;

      if (isNaN(minLen) || isNaN(maxLen)) {
        logger.warn(`ClipAdjustor._adjustSilences: Found NaN in minLength or maxLength: minLen=${minLen}, maxLen=${maxLen}`);
      }

      return sum + (maxLen - minLen);
    }, 0);

    // STEP 1: Randomly assign durations to each flexible clip within its minlength and maxlength bounds
    flexibleClips.forEach(clip => {
      const minLen = parseFloat(clip.minlength) || 0;
      const maxLen = parseFloat(clip.maxlength) || 0;

      if (minLen !== maxLen) {
        clip.duration = Math.random() * (maxLen - minLen) + minLen;
      } else {
        clip.duration = minLen;
      }

      if (isNaN(clip.duration)) {
        logger.warn(`ClipAdjustor._adjustSilences: Setting clip duration resulted in NaN: minLen=${minLen}, maxLen=${maxLen}, clip.duration=${clip.duration}`);
      } else {
        logger.debug(`ClipAdjustor._adjustSilences: Setting clip duration to ${clip.duration}`);
      }
    });

    // STEP 2: Adjust durations to ensure the total duration of all clips equals trackDurationAdjustNeeded
    let totalClipDuration = flexibleClips.reduce((sum, clip) => sum + parseFloat(clip.duration) || 0, 0);
    let attempts = 0;

    while (totalClipDuration !== trackDurationAdjustNeeded && attempts < 100) {
      const adjustmentFactor = trackDurationAdjustNeeded / totalClipDuration;

      flexibleClips.forEach(clip => {
        clip.duration *= adjustmentFactor;
      });

      totalClipDuration = flexibleClips.reduce((sum, clip) => sum + parseFloat(clip.duration) || 0, 0);
      attempts++;
    }

    if (totalClipDuration !== trackDurationAdjustNeeded) {
      logger.warn(`Failed to adjust durations to match trackDurationAdjustNeeded. Expected: ${trackDurationAdjustNeeded}, Actual: ${totalClipDuration}`);
    }
  }

}

module.exports = ClipAdjustor;
