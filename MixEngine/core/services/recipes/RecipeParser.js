// RecipeParser.js - RecipeParser class for normalizing recipe data

const logger = require('config/logger').custom('RecipeParser', 'info');
const JSON5 = require('json5');

const { config } = require('config');
// Extract values from the config object
const { selectPoolPercentSize, selectPoolMinSize } = config.recipes;
const clipLength = config.audio.clipLength;

class RecipeParser {

  static validTrackProperties = ['track', 'tags', 'clips', 'volume', 'effects'];
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
    const tracks = recipeData.tracks.filter(record => record.track !== undefined);
    if (tracks.length === 0) {
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
    const tracks = recipe.recipeObj.tracks.filter(record => record.track !== undefined);

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
            // Mark this track for 'shortest' effect (override any previous)
            trackToMark = 'shortest';
          } else if (effect === 'longest') {
            // Mark this track for 'longest' effect (override any previous)
            trackToMark = 'longest';
          } else if (effect === 'trim') {
            // Mark the track that has the 'trim' effect
            trackToMark = index;
          }
        });
      }
    });

    // If no specific effect is found, default to the longest track
    if (trackToMark === null || trackToMark === 'longest') {
      let longestTrack = recipe.recipeObj.tracks.reduce((max, track) => track.maxLength > max.maxLength ? track : max, recipe.recipeObj.tracks[0]);
      longestTrack.mixLength = true;
    } else if (trackToMark === 'shortest') {
      // Find and mark the shortest track
      let shortestTrack = recipe.recipeObj.tracks.reduce((min, track) => track.maxLength < min.maxLength ? track : min, recipe.recipeObj.tracks[0]);
      shortestTrack.mixLength = true;
    } else {
      // Otherwise, mark the specific track identified
      recipe.recipeObj.tracks[trackToMark].mixLength = true;
    }
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

  getPlaylistFromRecipe(recipe) {
    const playlist = [];
    // Iterate over each track in the recipe
    recipe.recipeObj.tracks.forEach(track => {
      if (track.clips) {
        // Iterate over each clip in the track
        track.clips.forEach(clip => {
          // Ignore silence clips
          if (clip.classification.includes('silence')) {
            return;
          }
          // Ignore clips with duration (s) less than clipLength.tiny.max (s)
          if (clip.duration < clipLength.tiny.max) {
            return;
          }
          // Check if the clip is already in the playlist to avoid duplicates
          const isDuplicate = playlist.some(existingClip => existingClip.audioID === clip.audioID);
          if (!isDuplicate) {
              // Directly add the clip to the playlist if it's not a duplicate
              playlist.push(clip);
          }
        });
      }
    });
    return playlist;
  }

}

module.exports = RecipeParser;