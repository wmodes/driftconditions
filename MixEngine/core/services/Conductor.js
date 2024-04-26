// Conductor.js - Main orchestrator for managing recipe selection and other tasks

const { database: db } = require('config');
const logger = require('config/logger').custom('Conductor', 'debug');
const { config } = require('config');
const RecipeSelector = require('./recipes/RecipeSelector');
const RecipeParser = require('./recipes/RecipeParser');
const ClipSelector = require('./clips/ClipSelector');
const ClipAdjustor = require('./clips/ClipAdjustor');
const MixEngine = require('./audio/MixEngine');

class Conductor {
  constructor() {
    this.recipeSelector = new RecipeSelector();
    this.recipeParser = new RecipeParser();
    this.clipSelector = new ClipSelector(); 
    this.clipAdjustor = new ClipAdjustor();
    this.mixEngine = new MixEngine();
  }

  async start() {
    // Example of a program loop
    while (true) {
      try {
        //
        // Select a fresh new recipe
        const selectedRecipe = await this.recipeSelector.getNextRecipe();
        logger.info(`Selected Recipe: ${selectedRecipe.title}`);
        //
        // Validate the recipe
        if (!this.recipeParser.validateRecipe(selectedRecipe)) {
          logger.error(`Validation failed: ${selectedRecipe.title} (${selectedRecipe.recipeID})`);
          // start new loop iteration
          continue;
        }
        // console.log('typeof selectedRecipe.recipeData:', typeof selectedRecipe.recipeData);
        // console.log('Selected Recipe:', JSON.stringify(selectedRecipe.recipeData, null, 2));
        //
        // Normalize the recipe
        // this.testRecipeNormalize()
        this.recipeParser.normalizeRecipe(selectedRecipe);
        //
        // Set tags for clip selection
        this.clipSelector.resetTags();
        const trackTags = this.recipeParser.getTagsFromTracks(selectedRecipe);
        this.clipSelector.addTags(trackTags);
        //
        // Get list of criteria
        // UPDATE: Unneeded - just use the recipeObj directly
        // const criteriaList = this.recipeParser.getListOfClipsNeeded(selectedRecipe);
        // logger.info(`criteriaList: ${JSON.stringify(criteriaList, null, 2)}`);
        //
        // Select files based on clips as criteria
        // TODO: rather than return a new list, just add files to recipe
        // const selectedClips = await this.clipSelector.selectClips(criteriaList);
        const clipResults = await this.clipSelector.selectAudioClips(selectedRecipe);
        logger.debug(`recipe after clip selection: ${JSON.stringify(selectedRecipe.recipeObj, null, 2)}`);
        //
        // Did we find clips for this recipe?
        if (!clipResults) {
          logger.error(`Clips not found for recipe: ${selectedRecipe.title} (${selectedRecipe.recipeID})`);
          // start new loop iteration and get new recipe
          continue;
        }
        //
        // Adjust timings for clips
        const duration = this.clipAdjustor.adjustClipTimings(selectedRecipe);
        logger.debug(`recipe after clip timing adjustment: ${JSON.stringify(selectedRecipe.recipeObj, null, 2)}`);
        //
        // Make the mix
        this.mixEngine.makeMix(selectedRecipe, duration);

      } catch (error) {
        logger.error(new Error(`Conductor error: ${error.message}, ${error.stack}`));
        // Handle error or break loop based on your application's needs
      }
        
      //wait for some time or check for a condition to continue
      await this.waitForNextIteration(); // Placeholder for timing logic
    }
  }

  testRecipeNormalize() {
    const testRecipe = {
      "recipeData": JSON.stringify([
        {
          "track": 1,
          "tag": "ambient",  // Should become an array
          "clips": [
            {
              "filename": "clip1.mp3",
              "length": 120,  // Should be renamed to prefLength
              "volum": "80%",  // Misnamed, should be deleted
              "extraClipAttr": "deleteThis"  // Extraneous, should be deleted
            }
          ],
          "extraTrackAttr": "deleteThis"  // Extraneous, should be deleted
        },
        {
          "track": 2,
          "tags": ["background", "soft"],  // Already an array
          "clip": [
            {
              "filename": "clip2.mp3",
              "volume": "50%",
              "classifications": "dialogue"  // Should become an array
            }
          ]
        }
      ])
    }
    console.log('Original Recipe:', JSON.stringify(JSON.parse(testRecipe.recipeData), null, 2));
    this.recipeParser.normalizeRecipe(testRecipe);
    console.log('Normalized Recipe:', JSON.stringify(testRecipe.recipeObj, null, 2));
    return;
  }

  async waitForNextIteration() {
    // Placeholder method for timing logic
    // Adjust the timing logic as necessary for your application
    const waitTimeInMs = 1000 * 60 * 60; // Example: wait for 1 hour
    return new Promise(resolve => setTimeout(resolve, waitTimeInMs));
  }

  // Add any additional methods needed for your application logic
}

module.exports = Conductor;
