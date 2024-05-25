const logger = require('config/logger').custom('MixEngine', 'info');

const { config } = require('config');

class ClipAdjustor {
  constructor() {
    // Initialize any necessary properties here

  }

  adjustClipTimings(recipe) {
    const currentRecipeObj = recipe.recipeObj;
    // Calculate initial durations and ranges
    currentRecipeObj.tracks.forEach(track => {
      track.duration = 0;  // Initialize as numerical
      track.minLength = 0;
      track.maxLength = 0;
      track.clips.forEach(clip => {
        // if we already have a duration, use it
        if ('duration' in clip) {
          let clipDuration = parseFloat(clip.duration);
          track.duration += clipDuration;
          track.minLength += clipDuration;
          track.maxLength += clipDuration;
        } 
        // if we have no duration but a range, use it
        else if ('minLength' in clip && 'maxLength' in clip) {
          let minLen = parseFloat(clip.minLength);
          let maxLen = parseFloat(clip.maxLength);
          track.minLength += minLen;
          track.maxLength += maxLen;
          track.duration += minLen; // Assume minLength for initial calculation
        }
      });
    });
    // Find the longest track by max possible duration
    let longestTrack = currentRecipeObj.tracks.reduce((max, track) => track.maxLength > max.maxLength ? track : max, currentRecipeObj.tracks[0]);
    // Adjust silences in other tracks to match the longest track's duration
    currentRecipeObj.tracks.forEach(track => {
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
  //  assign each flexible track a random duration between it's minLength and maxLength 
  //  that totals trackDurationAdjustNeeded
  _adjustSilences(track, trackDurationAdjustNeeded) {
    // Filter flexible clips with defined minLength and maxLength
    const flexibleClips = track.clips.filter(clip => clip.minLength !== undefined && clip.maxLength !== undefined);
  
    // Calculate the total duration range for all flexible clips
    const totalDurationRange = flexibleClips.reduce((sum, clip) => sum + (clip.maxLength - clip.minLength), 0);
  
    // STEP 1: Randomly assign durations to each flexible clip within its minLength and maxLength bounds
    flexibleClips.forEach(clip => {
      clip.duration = Math.random() * (clip.maxLength - clip.minLength) + clip.minLength;
    });
  
    // STEP 2: Adjust durations to ensure the total duration of all clips equals trackDurationAdjustNeeded
    let totalClipDuration = flexibleClips.reduce((sum, clip) => sum + clip.duration, 0); // Calculate the total duration of all clips
    let attempts = 0; // Initialize the attempts counter
    while (totalClipDuration !== trackDurationAdjustNeeded && attempts < 100) {
      const adjustmentFactor = trackDurationAdjustNeeded / totalClipDuration; // Calculate the adjustment factor
      flexibleClips.forEach(clip => {
        clip.duration *= adjustmentFactor; // Adjust each clip's duration by the adjustment factor
      });
      totalClipDuration = flexibleClips.reduce((sum, clip) => sum + clip.duration, 0); // Recalculate the total duration
      attempts++; // Increment the attempts counter
    }
  
    // STEP 3: Log a warning if the total duration still does not match trackDurationAdjustNeeded
    if (totalClipDuration !== trackDurationAdjustNeeded) {
      logger.warn('Failed to adjust durations to match trackDurationAdjustNeeded.');
    }
  }  


}

module.exports = ClipAdjustor;

