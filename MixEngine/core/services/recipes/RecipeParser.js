// RecipeParser.js - RecipeParser class for normalizing recipe data

const logger = require('config/logger').custom('Conductor', 'info');

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
    // console.log('RecipeParser:validateRecipe: recipe:', JSON.stringify(recipe, null, 2));
    // console.log('RecipeParser:validateRecipe: recipe.recipeData:', recipe.recipeData);
    // check to make sure we have recipeData
    if (recipe.recipeData === undefined || recipe.recipeData === null) {
      logger.error('RecipeParser:validateRecipe: No recipe data found');
      return false;
    }
    let recipeData;
    try {
      // check to make sure recipeData is valid JSON, if not return error
      recipeData = JSON.parse(recipe.recipeData);
    }
    catch (error) {
      logger.error(`RecipeParser:validateRecipe: Invalid JSON in recipeData: ${error.message}`);
      return false;
    }
    // check to make sure has tracks, if not return error
    const tracks = recipeData.filter(record => record.track !== undefined);
    if (tracks.length === 0) {
      logger.error('RecipeParser:validateRecipe: No tracks found in the recipe');
      return false;
    }
    return true;
  }

  normalizeRecipe(recipe) {
    // Parse the JSON string once and store it in a new key 'recipeObj'
    recipe.recipeObj = JSON.parse(recipe.recipeData);
    
    // Operate on 'recipeObj' instead of parsing 'recipeData' every time
    const tracks = recipe.recipeObj.filter(record => record.track !== undefined);

    // Normalize each track and its clips
    tracks.forEach(track => {
      this._validateAndNormalizeKeys(track, RecipeParser.validTrackProperties);
      if (track.clips) {
        track.clips.forEach(clip => {
          this._validateAndNormalizeKeys(clip, RecipeParser.validClipProperties);
        });
      }
    });
    // Optionally update 'recipeData' if needed, or it can be done elsewhere when needed
    // recipe.recipeData = JSON.stringify(recipe.recipeObj);
  }

  _validateAndNormalizeKeys(object, validProperties) {
    Object.keys(object).forEach(originalKey => {
      let key = originalKey; // Use a mutable variable for key name
      // Rename 'length' key to 'clipLength' if necessary
      if (key === 'length') {
          object.clipLength = object[key];
          delete object[key];
          key = 'clipLength'; // Update key to 'clipLength' for subsequent checks
      }
      const normalizedKey = this._normalizeKey(key, validProperties);
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

  _normalizeKey(key, validProperties) {
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

  // Method to get a list of clips needed for a recipe
  // UPDATE: Unneeded - just use the recipeData directly
  // getListOfClipsNeeded(recipe) {
  //   const clipsNeeded = [];
  //   const recipeData = JSON.parse(recipe.recipeData);
  //   // Since the recipe is already normalized, every track should directly have the 'clips' property
  //   const tracks = recipeData.filter(record => record.track !== undefined);
  //   // Iterate through tracks to construct list of clips needed
  //   tracks.forEach(track => {
  //     track.clips.forEach(clip => {
  //       // Directly use the properties as they are already ensured to be in correct form and type
  //       const { classification, tags, volume, clipLength, effects } = clip;
  //       // Add the clip details to the list of clips needed
  //       clipsNeeded.push({ classification, tags, volume, clipLength, effects });
  //     });
  //   });
  //   return clipsNeeded;
  // }

  getTagsFromTracks(recipe) {
    const tagsList = [];
  
    // Iterate over each track in the recipe
    recipe.recipeObj.forEach(track => {
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
    recipe.recipeObj.forEach(track => {
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