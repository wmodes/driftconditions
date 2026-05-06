// RecipeParser.js - RecipeParser class for normalizing recipe data

const logger = require('config/logger').custom('RecipeParser', 'info');
const JSON5 = require('json5');

const { config } = require('config');
// Extract values from the config object
const { selectPoolPercentSize, selectPoolMinSize } = config.recipes;
const clipLength = config.audio.clipLength;

class RecipeParser {

  static validTrackProperties = ['track', 'label', 'tags', 'clips', 'volume', 'effects'];
  static validClipProperties = ['classification', 'tags', 'volume', 'clipLength', 'effects'];
  static arrayProperties = ['clips', 'classification', 'tags', 'clipLength', 'effects'];

  constructor() {
    // Initialize properties to store fetched data

  }

  validateRecipe(recipe) {
    // console.log('RecipeParser:validateRecipe: recipe:', JSON5.stringify(recipe, null, 2));
    // console.log('RecipeParser:validateRecipe: recipe.recipeData:', recipe.recipeData);
    // check to make sure we have recipeData
    if (recipe.recipeData === undefined || recipe.recipeData === null) {
      logger.error('RecipeParser:validateRecipe: No recipe data found');
      return false;
    }
    let recipeData;
    try {
      // check to make sure recipeData is valid JSON, if not return error
      recipeData = JSON5.parse(recipe.recipeData);
    }
    catch (error) {
      logger.error(`RecipeParser:validateRecipe: Invalid JSON in recipeData: ${error.message}`);
      return false;
    }
    // check to make sure has tracks, if not return error
    if (!recipeData.tracks || recipeData.tracks.length === 0) {
      logger.error('RecipeParser:validateRecipe: No tracks found in the recipe');
      return false;
    }
    return true;
  }

  normalizeRecipe(recipe) {
    // Parse the JSON string once and store it in a new key 'recipeObj'
    recipe.recipeObj = JSON5.parse(recipe.recipeData);

    // Convert all keys and values to lowercase
    recipe.recipeObj = this._convertToLowercase(recipe.recipeObj);
    
    // Operate on 'recipeObj' instead of parsing 'recipeData' every time
    const tracks = recipe.recipeObj.tracks;

    // Normalize each track and its clips
    tracks.forEach(track => {
      this._validateAndNormalize(track, RecipeParser.validTrackProperties);
      if (track.clips) {
        track.clips.forEach(clip => {
          this._validateAndNormalize(clip, RecipeParser.validClipProperties);
        });
      }
    });
    // Optionally update 'recipeData' if needed, or it can be done elsewhere when needed
    // recipe.recipeData = JSON5.stringify(recipe.recipeObj);
  }

  _validateAndNormalize(object, validProperties) {
    Object.keys(object).forEach(originalKey => {
      let key = originalKey; // Use a mutable variable for key name
      // Rename 'length' key to 'clipLength' if necessary
      if (key === 'length') {
          object.clipLength = object[key];
          delete object[key];
          key = 'clipLength'; // Update key to 'clipLength' for subsequent checks
      }
      const normalizedKey = this._normalizeKeys(key, validProperties);
      // Remove keys that are not in the valid properties list
      if (!validProperties.includes(normalizedKey)) {
          delete object[normalizedKey];
      } else {
          // Rename key if it's valid but in the wrong form
          if (normalizedKey !== key) {
              object[normalizedKey] = object[key];
              delete object[key];
          }
          // Ensure properties that should be arrays are arrays
          if (RecipeParser.arrayProperties.includes(normalizedKey)) {
              this._ensureArray(object, normalizedKey);
          }
      }
    });
  }

  _normalizeKeys(key, validProperties) {
    const singular = key.endsWith('s') ? key.slice(0, -1) : key;
    const plural = key + 's';
    if (validProperties.includes(singular)) {
      return singular;
    } else if (validProperties.includes(plural)) {
      return plural;
    }
    return key;
  }

  // Helper method to ensure a property is always an array
  _ensureArray(object, key) {
    if (!Array.isArray(object[key])) {
      object[key] = [object[key]];  // Convert single values to an array
    }
  }

  // Helper method to convert all keys and values to lowercase
  _convertToLowercase(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this._convertToLowercase(item));
    } else if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).reduce((acc, key) => {
        const lowerKey = key.toLowerCase();
        acc[lowerKey] = this._convertToLowercase(obj[key]);
        return acc;
      }, {});
    } else if (typeof obj === 'string') {
      return obj.toLowerCase();
    }
    return obj;
  }

  /**
  * Mark the track that determines the mix length based on effects.
  * @param {object} recipe - The recipe object containing track information.
  */
  markMixLengthTrack(recipe) {
    let trackToMark = null;

    // Iterate over each track to find the one that sets the mix length
    recipe.recipeObj.tracks.forEach((track, index) => {
      if (track.effects && Array.isArray(track.effects)) {
        track.effects.forEach(effect => {
          if (effect === 'first' && trackToMark === null) {
            // Mark the first track if 'first' effect is found and no track has been marked yet
            trackToMark = 0;
          } else if (effect === 'shortest') {
            // Defer to resolveShortestLongestTrack() after clip selection
            trackToMark = 'shortest';
          } else if (effect === 'longest') {
            // Defer to resolveShortestLongestTrack() after clip selection
            trackToMark = 'longest';
          } else if (effect === 'trim') {
            // Mark the track that has the 'trim' effect
            trackToMark = index;
          }
        });
      }
    });

    if (trackToMark === 'shortest' || trackToMark === 'longest') {
      // Real resolution deferred to resolveShortestLongestTrack() after clip selection;
      // temporarily mark track 0 as a placeholder so ClipAdjustor has a mixLength track
      recipe.recipeObj.tracks[0].mixLength = true;
      recipe.recipeObj._pendingMixLength = trackToMark;
    } else if (trackToMark === null) {
      // Default: longest track — also deferred, placeholder on track 0
      recipe.recipeObj.tracks[0].mixLength = true;
      recipe.recipeObj._pendingMixLength = 'longest';
    } else {
      // Specific track index (trim/first) — mark directly, no deferral needed
      recipe.recipeObj.tracks[trackToMark].mixLength = true;
    }
  }

  /**
   * Resolves 'shortest' and 'longest' mixLength markers after clip selection,
   * when actual clip durations are known. Call this after selectAudioClips().
   * @param {object} recipe - The recipe object with fully selected clips.
   */
  resolveShortestLongestTrack(recipe) {
    const pending = recipe.recipeObj._pendingMixLength;
    if (!pending) return; // nothing to resolve — trim/first already handled

    // Sum actual clip durations per track. Note: silence clips have no duration yet at this
    // point — ClipAdjustor assigns them after this step — so their contribution is 0 here.
    // That's fine: we're comparing structured content length, not total track length.
    const trackDurations = recipe.recipeObj.tracks.map(track => {
      const total = (track.clips || []).reduce((sum, clip) => sum + (parseFloat(clip.duration) || 0), 0);
      return { track, total };
    });

    // Exclude looping tracks from candidacy as the mix-length driver.
    //
    // A track (or any clip within it) with a 'loop' effect becomes duration-infinite in
    // MixEngine — it is designed to fill whatever length the mix dictates, not define it.
    // Without this filter, a looping bed with a long source file could "win" as the longest
    // track, causing ClipAdjustor to use that file's raw duration as mixDuration and crushing
    // silences on the real structured track to near-zero. Looping tracks are beds, not clocks.
    //
    // All-looping edge case: if every track loops (a degenerate recipe with no finite duration
    // driver), fall back to the full unfiltered set. MixEngine handles infinite durations
    // downstream via _determineMixDuration(), so we don't need to solve that here — but we
    // warn loudly so the recipe author knows to add an explicit 'trim' to a duration-driver track.
    const nonLoopingCandidates = trackDurations.filter(t => !this._isLoopingTrack(t.track));
    if (nonLoopingCandidates.length === 0) {
      logger.warn('resolveShortestLongestTrack: all tracks are looping — no finite duration driver. Falling back to full track set. Add "trim" to the intended duration-driver track to fix this.');
    }
    const candidates = nonLoopingCandidates.length > 0 ? nonLoopingCandidates : trackDurations;

    // Find the target track among candidates
    let target;
    if (pending === 'shortest') {
      target = candidates.reduce((min, t) => t.total < min.total ? t : min, candidates[0]);
    } else {
      // 'longest' or default
      target = candidates.reduce((max, t) => t.total > max.total ? t : max, candidates[0]);
    }

    // Clear the placeholder and mark the correct track
    recipe.recipeObj.tracks.forEach(t => { t.mixLength = false; });
    target.track.mixLength = true;
    delete recipe.recipeObj._pendingMixLength;

    logger.debug(`resolveShortestLongestTrack: resolved '${pending}' to track "${target.track.label}" (${target.total.toFixed(1)}s)`);
  }

  /**
   * Returns true if a track is effectively infinite-duration — i.e., if the track itself
   * or any of its clips carries a 'loop' effect. Used by resolveShortestLongestTrack to
   * exclude looping tracks from mix-length candidacy: a looping track is a bed that fills
   * the mix, not a clock that defines it.
   *
   * We check both track-level and clip-level effects because either makes the track infinite:
   *   track.effects: ['loop', ...]       → the entire track loops
   *   clip.effects:  ['loop', ...]       → that clip loops, making the track run forever
   *
   * @param {object} track - A normalized track object from the recipe.
   * @returns {boolean}
   */
  _isLoopingTrack(track) {
    function hasLoopEffect(effects) {
      if (!effects) return false;
      for (let i = 0; i < effects.length; i++) {
        if (effects[i] === 'loop') return true;
      }
      return false;
    }
    if (hasLoopEffect(track.effects)) return true;
    if (track.clips) {
      for (let i = 0; i < track.clips.length; i++) {
        if (hasLoopEffect(track.clips[i].effects)) return true;
      }
    }
    return false;
  }

  getTagsFromTracks(recipe) {
    const tagsList = [];
  
    // Iterate over each track in the recipe
    recipe.recipeObj.tracks.forEach(track => {
      if (track.tags) {
        // Directly add all tags from this track to the tagsList
        tagsList.push(...track.tags);
      }
    });
    return tagsList;
  }  

}

module.exports = RecipeParser;