const logger = require('config/logger').custom('ClipAdjustor', 'info');

const { config } = require('config');

class ClipAdjustor {
  constructor() {
    // Initialize any necessary properties here
  }

  adjustClipTimings(recipe) {
    logger.info('Adjusting clip timings...');
    const currentRecipeObj = recipe.recipeObj; 
    //
    // Calculate initial durations and ranges
    currentRecipeObj.tracks.forEach(track => {
      track.duration = 0;  // Initialize as numerical
      track.minLength = 0;
      track.maxLength = 0;
      track.clips.forEach(clip => {
        // if we already have a duration, use it
        if ('duration' in clip) {
          logger.debug(`ClipAdjustor.adjustClipTimings: Using clip duration: ${clip.duration}`);
          let clipDuration = parseFloat(clip.duration);
          track.duration += clipDuration;
          track.minLength += clipDuration;
          track.maxLength += clipDuration;
        } 
        // if we have no duration but a range, use it
        else if ('minLength' in clip && 'maxLength' in clip) {
          logger.debug(`ClipAdjustor.adjustClipTimings: Using clip minLength and maxLength: ${clip.minLength} - ${clip.maxLength}`);
          let minLen = parseFloat(clip.minLength);
          let maxLen = parseFloat(clip.maxLength);
          track.minLength += minLen;
          track.maxLength += maxLen;
          track.duration += minLen; // Assume minLength for initial calculation
        }
      });
    });  
    //
    // Find the longest track by max possible duration
    let longestTrack = currentRecipeObj.tracks.reduce((max, track) => track.maxLength > max.maxLength ? track : max, currentRecipeObj.tracks[0]);  
    //
    // Adjust durations for all tracks to match the longest track's duration
    currentRecipeObj.tracks.forEach(track => {
      // If the track is not the longest, calculate the difference needed to match the longest track
      let trackDurationAdjustNeeded = longestTrack.maxLength - track.minLength; 
      //
      track.clips.forEach(clip => {
        if (!('duration' in clip) && 'minLength' in clip && 'maxLength' in clip) {
          // Set initial duration for clips without a duration
          clip.duration = Math.random() * (clip.maxLength - clip.minLength) + clip.minLength;
          logger.debug(`ClipAdjustor.adjustClipTimings: Setting initial clip duration: ${clip.duration}`);
        }
      });
      //
      // Adjust the durations of flexible clips to match the longest track
      if (track !== longestTrack && trackDurationAdjustNeeded > 0) {
        let trackDurationFlexAvail = track.maxLength - track.minLength;
  
        if (trackDurationFlexAvail >= trackDurationAdjustNeeded) {
          this._adjustSilences(track, trackDurationAdjustNeeded);
        } else {
          this._adjustSilences(track, trackDurationFlexAvail);
        }
      }
      //
      // Recalculate the track duration based on updated clip durations
      track.duration = track.clips.reduce((totalDuration, clip) => totalDuration + parseFloat(clip.duration), 0);
      logger.debug(`ClipAdjustor.adjustClipTimings: Updated track duration: ${track.duration}`);
    });
  
    return longestTrack.maxLength; // Return the longest track's duration
  }  

  // Private method to adjust silences proportionally
  //  assign each flexible track a random duration between it's minLength and maxLength 
  //  that totals trackDurationAdjustNeeded
  _adjustSilences(track, trackDurationAdjustNeeded) {
    // Filter flexible clips with defined minLength and maxLength
    const flexibleClips = track.clips.filter(clip => clip.duration === undefined);
    logger.debug(`ClipAdjustor._adjustSilences: Found ${flexibleClips.length} flexible clips`);
  
    // Calculate the total duration range for all flexible clips
    const totalDurationRange = flexibleClips.reduce((sum, clip) => sum + (clip.maxLength - clip.minLength), 0);
  
    // STEP 1: Randomly assign durations to each flexible clip within its minLength and maxLength bounds
    flexibleClips.forEach(clip => {
      clip.duration = Math.random() * (clip.maxLength - clip.minLength) + clip.minLength;
      logger.debug(`ClipAdjustor._adjustSilences: Setting clip duration to ${clip.duration}`);
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

