const logger = require('config/logger').custom('MixEngine', 'info');

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
        let trackDurationFlexMax = longestTrack.maxLength - track.minLength; 
        if (trackDurationFlexMax > 0) {
          let trackDurationFlexAvail = track.maxLength - track.minLength;
          // if we can't extend flexible clips to match longest track
          if (trackDurationFlexAvail >= trackDurationFlexMax) {
            // if longest track is longer than the adjustable space we have,
            //  just adjust silence duration as much as we can
            this._adjustSilences(track, trackDurationFlexMax);
          } else {
            // if adjustable space can fill the max duration, 
            //  adjust silence durations to fill the track
            this._adjustSilences(track, trackDurationFlexAvail);
          }
        }
      }
    });
    return longestTrack.maxLength; // Return the longest track's duration
  }

  // Private method to adjust silences proportionally
  // to fill the space in a track
  // How would I assign each flexible track a random duration between it's minLength and maxLength that totals trackDurationAdjustNeeded?
  _adjustSilences(track, trackDurationAdjustNeeded) {
    let trackMinMaxFlexDuration = track.clips.reduce((sum, clip) => {
        return (clip.minLength && clip.maxLength) ? sum + (clip.maxLength - clip.minLength) : sum;
    }, 0);
    logger.debug(`Total adjustable duration in track: ${trackMinMaxFlexDuration}`);
    logger.debug(`Attempting to adjust track duration by: ${trackDurationAdjustNeeded}`);
    track.clips.forEach(clip => {
        if (clip.minLength && clip.maxLength) {
            // Initialize duration if not already set
            if (!clip.duration) {
                clip.duration = clip.minLength; // Start with the minimum length
            }
            let clipAdjustment = (clip.maxLength - clip.minLength) / trackMinMaxFlexDuration * trackDurationAdjustNeeded;
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

