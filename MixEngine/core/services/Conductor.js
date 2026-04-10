/**
 * @file Conductor.js - Main orchestrator for managing recipe selection and other tasks
 */

const logger = require('config/logger').custom('Conductor', 'info');
const JSON5 = require('json5');
const RecipeSelector = require('@services/recipes/RecipeSelector');
const RecipeParser = require('@services/recipes/RecipeParser');
const ClipSelector = require('@services/clips/ClipSelector');
const ClipAdjustor = require('@services/clips/ClipAdjustor');
const MixEngine = require('@services/audio/MixEngine');
const MixQueue = require('@services/queue/MixQueue');
const RecordKeeper = require('@services/recordkeeper/RecordKeeper');

const { config } = require('config');
const maxQueued = config.mixes.maxQueued;
const checkTime = config.mixes.checkTime;
const retryTime = 5000; // short delay between failed mix attempts (ms)

/**
 * Class representing the Conductor.
 */
class Conductor {
  constructor () {
    this.recipeSelector = new RecipeSelector();
    this.recipeParser = new RecipeParser();
    this.clipSelector = new ClipSelector();
    this.clipAdjustor = new ClipAdjustor();
    this.mixEngine = new MixEngine();
    this.mixQueue = new MixQueue();
    this.recordKeeper = new RecordKeeper();
  }

  /**
   * Starts the conductor's main loop.
   * @async
   */
  async start () {
    while (true) {
      //
      // Check queue — infrastructure failure here warrants a wait
      let numberMixesInQueue;
      try {
        numberMixesInQueue = await this.mixQueue.getNumberOfMixesInQueue();
        logger.debug(`Number of mixes in queue: ${numberMixesInQueue}`);
      } catch (error) {
        logger.error(`Conductor: Failed to check queue: ${error.message}`);
        await this.waitForNextIteration();
        continue;
      }
      //
      // Queue full — wait before trying again
      if (numberMixesInQueue > maxQueued) {
        logger.info('Conductor: Queue full, waiting...');
        await this.waitForNextIteration();
        continue;
      }
      //
      // Mix pipeline — errors here are recipe/clip/ffmpeg failures;
      // skip to next iteration immediately to try a different recipe
      try {
        const mixDetails = {};
        //
        // Select a fresh new recipe
        const selectedRecipe = await this.recipeSelector.getNextRecipe();
        logger.info(`Selected Recipe: ${selectedRecipe.title}`);
        //
        // Validate the recipe
        if (!this.recipeParser.validateRecipe(selectedRecipe)) {
          logger.error(`Validation failed: ${selectedRecipe.title} (${selectedRecipe.recipeID})`);
          continue;
        }
        //
        // Normalize the recipe
        // this.testRecipeNormalize()
        this.recipeParser.normalizeRecipe(selectedRecipe);
        //
        // Mark the mix length track
        this.recipeParser.markMixLengthTrack(selectedRecipe);
        //
        // Set tags for clip selection
        this.clipSelector.resetTags();
        const trackTags = this.recipeParser.getTagsFromTracks(selectedRecipe);
        this.clipSelector.addTags(trackTags);
        //
        // Select files based on clips as criteria
        const clipResults = await this.clipSelector.selectAudioClips(selectedRecipe);
        logger.debug(`recipe after clip selection: ${JSON5.stringify(selectedRecipe.recipeObj, null, 2)}`);
        //
        // Did we find clips for this recipe?
        if (!clipResults) {
          logger.error(`Clips not found for recipe: ${selectedRecipe.title} (${selectedRecipe.recipeID})`);
          continue;
        }
        //
        // Adjust timings for clips
        mixDetails.duration = this.clipAdjustor.adjustClipTimings(selectedRecipe);
        logger.debug(`recipe after clip timing adjustment: ${JSON5.stringify(selectedRecipe.recipeObj, null, 2)}`);
        //
        // Record what was actually heard, update lastUsed, log clipUsage, build accurate playlist
        mixDetails.playlist = await this.recordKeeper.record(selectedRecipe, mixDetails.duration);
        //
        // Get next mix ID
        mixDetails.mixID = await this.mixQueue.getNextMixID();
        //
        // Make the mix
        await this.mixEngine.makeMix(selectedRecipe, mixDetails);
        logger.debug(`Conductor:start: mixDetails: ${JSON5.stringify(mixDetails, null, 2)}`);
        //
        // Create entry into the database for the mix
        await this.mixQueue.createMixQueueEntry(selectedRecipe, mixDetails);
        //
        // Prune old mixes
        await this.mixQueue.pruneMixes();
      } catch (error) {
        logger.error(`Conductor: Mix generation failed, trying next recipe: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, retryTime));
      }
    }
  }

  /**
   * Waits before the next loop iteration, whether due to a full queue or an error.
   * @async
   */
  async waitForNextIteration () {
    return new Promise(resolve => setTimeout(resolve, checkTime));
  }

  // Add any additional methods needed for your application logic
}

module.exports = Conductor;
