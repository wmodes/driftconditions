const logger = require('config/logger').custom('MixEngine', 'debug');

const { config } = require('config');

class ClipAdjustor {
  constructor() {
    // Initialize any necessary properties here

  }

  adjustClipTimings(recipe) {
    const currentRecipeObj = recipe.recipeObj;
    // Calculate initial durations and ranges
    currentRecipeObj.forEach(track => {
      track.duration = 0;  // Initialize as numerical
      track.minLength = 0;
      track.maxLength = 0;
      track.clips.forEach(clip => {
        if ('duration' in clip) {
          let clipDuration = parseFloat(clip.duration);
          track.duration += clipDuration;
          track.minLength += clipDuration;
          track.maxLength += clipDuration;
        } else if ('minLength' in clip && 'maxLength' in clip) {
          let minLen = parseFloat(clip.minLength);
          let maxLen = parseFloat(clip.maxLength);
          track.minLength += minLen;
          track.maxLength += maxLen;
          track.duration += minLen; // Assume minLength for initial calculation
        }
      });
    });
    // Find the longest track by max possible duration
    let longestTrack = currentRecipeObj.reduce((max, track) => track.maxLength > max.maxLength ? track : max, currentRecipeObj[0]);
    // Adjust silences in other tracks to match the longest track's duration
    currentRecipeObj.forEach(track => {
      if (track !== longestTrack) {
        // Difference needed to match longest track
        let durationDiff = longestTrack.maxLength - track.minLength; 
        if (durationDiff > 0) {
          let availableExtension = track.maxLength - track.minLength;
          if (availableExtension >= durationDiff) {
            this._adjustSilences(track, durationDiff);
          } else {
            this._adjustSilences(track, availableExtension);
          }
        }
      }
    });
  }

  // Private method to adjust silences proportionally
  _adjustSilences(track, durationChange) {
    let totalAdjustableDuration = track.clips.reduce((sum, clip) => {
        return (clip.minLength && clip.maxLength) ? sum + (clip.maxLength - clip.minLength) : sum;
    }, 0);
    logger.debug(`Total adjustable duration in track: ${totalAdjustableDuration}`);
    logger.debug(`Attempting to adjust track duration by: ${durationChange}`);
    track.clips.forEach(clip => {
        if (clip.minLength && clip.maxLength) {
            // Initialize duration if not already set
            if (!clip.duration) {
                clip.duration = clip.minLength; // Start with the minimum length
            }
            let clipAdjustment = (clip.maxLength - clip.minLength) / totalAdjustableDuration * durationChange;
            // Adjust from current duration
            let newDuration = clip.duration + clipAdjustment; 
            // Ensure bounds are respected
            newDuration = Math.max(clip.minLength, Math.min(newDuration, clip.maxLength)); 
            logger.debug(`Adjusting clip from ${clip.duration} to ${newDuration}`);
            // Set adjusted duration within bounds
            clip.duration = newDuration; 
        }
    });
  }


}

module.exports = ClipAdjustor;

