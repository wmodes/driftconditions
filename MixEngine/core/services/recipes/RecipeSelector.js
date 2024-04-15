// recipeSelector.js - A class module for fetching and selecting recipes based on certain criteria

const { database: db } = require('config');
const logger = require('config/logger').custom('RecipeSelector', 'info');

const { config } = require('config');
// Extract values from the config object
const { selectPoolPercentSize, selectPoolMinSize } = config.recipes;

class RecipeSelector {

  constructor() {
    // Initialize properties to store fetched data
    this.earliestDate = null;
    this.latestDate = null;
    this.dateRange = null;
    this.recipes = [];
    this.recentClassifications = [];
    this.recentTags = [];
  }

  // Main method to get the next recipe
  //  check status: confirmed working
  async getNextRecipe() {
    // Fetch recipes from the database
    await this._fetchRecipes();
    // Set the date range for the recipes
    this._getEarliestAndLatestDates();
    // Set the recent classifications and tags
    this._setRecentClassificationAndTags();
    // Score the recipes
    this._scoreRecipes();
    // Select the next recipe
    const selectedRecipe = this._selectNextRecipe();
    // Use recipeID to select full recipe from the database
    const [selectedFullRecipe] = await this._fetchSelectedRecipe(selectedRecipe.recipeID);
    logger.debug(`Selected recipe: ${selectedFullRecipe.title}, score: ${selectedRecipe.score}`);
    // update the recipe with the new lastUsed timestamp
    await this._updateRecipeLastUsed(selectedRecipe.recipeID);
    // return the full recipe to the caller
    return selectedFullRecipe;
  }

  // Fetch select fields for ALL the recipes from the database
  //  check status: confirmed working
  async _fetchRecipes() {
    try {
      const query = `
        SELECT recipeID, title, classification, tags, lastUsed
        FROM recipes
        WHERE editLock = 0 AND status = 'Approved'
      `;
      const [recipes] = await db.execute(query);
      this.recipes = recipes;
    } catch (error) {
      logger.error(new Error(`Error fetching recipes: ${error.message}`));
      // Handling the error similarly, you may choose to throw it, 
      // or handle it in a way that the rest of your class can deal with (e.g., setting this._recipes to an empty array)
      throw error; // or this._recipes = [];
    }
    // logger.debug(`Recipes fetched successfully: ${this.recipes.length} recipes`);
  }

  // Calculate the earliest and latest dates from the recipes
  //  check status: confirmed working
  _getEarliestAndLatestDates() {
    // Initialize both earliest and latest to the Unix epoch start
    let earliest = new Date().getTime();
    let latest = 0; 
    // iterate over the recipes
    this.recipes.forEach(recipe => {
      const lastUsedTime = new Date(recipe.lastUsed).getTime();
        // Check if the recipe has been used and does not evaluate to NaN
        if (recipe.lastUsed && !isNaN(lastUsedTime)) {
          // Adjust earliest if the date is earlier than earlier date
          if (lastUsedTime < earliest) {
              earliest = lastUsedTime;
          }
          // Adjust latest only if we find a valid, later date
          if (lastUsedTime > latest) {
              latest = lastUsedTime;
          }
        }
        // if recipe.lastUsed is NULL, we don't change the earliest rendering
        // a true range. Later if a recipe has never been used (lastUser == NULL), 
        // we can set the newness score to 1
    });
    this.earliestDate = new Date(earliest);
    this.latestDate = new Date(latest);
    // Ensure dateRange is non-negative. It will be 0 if no valid dates were found.
    this.dateRange = Math.max(0, latest - earliest);

    // logger.debug(`Date range set: earliest: ${this.earliestDate.toISOString()}, latest: ${this.latestDate.toISOString()}, range: ${this.dateRange}`);
    return true;
  }

  // Create an array of recent classifications and tags
  //  check status: confirmed working
  _setRecentClassificationAndTags() {
    // Sort the recipes from most recent to earliest
    this._sortRecipesRecentToEarliest();
    // Initialize the arrays
    this.recentClassifications = [];
    this.recentTags = [];
    // loop over each recipe
    this.recipes.forEach(recipe => {
      if (recipe.classification) {
        // loop over the classifications in this recipe
        recipe.classification.forEach(classification => {
          if (!this.recentClassifications.includes(classification)) {
            this.recentClassifications.push(classification);
          }
        });
      }
      if (recipe.tags) {
        // loop over the tags in this recipe
        recipe.tags.forEach(tag => {
          if (!this.recentTags.includes(tag)) {
            this.recentTags.push(tag);
          }
        });
      }
    });
    // logger.debug(`recentClassifications: ${this.recentClassifications.length}, recentTags: ${this.recentTags.length}`);
  }

  // Iterate over the recipes and score each one
  //  check status: confirmed working
  _scoreRecipes() {
    this.recipes = this.recipes.map(recipe => {
        // Calculate the score for the current recipe
        const score = this._calculateScore(recipe);       
        // Log the recipe's identifiable property (e.g., title) and its score
        // logger.debug(`Recipe scored: ${recipe.title}, score: ${score}`);        
        // Return the recipe object with the updated score
        return { ...recipe, score: score };
    });
  }

  // Score a recipe based on newness and classification (and other criteria if we wish)
  //  check status: confirmed working
  _calculateScore(recipe) {
    const newnessScoreNorm = this._calculateNewnessScore(recipe);
    const classificationScoreNorm = this._calculateClassificationScore(recipe);
    // combine scores for different criteria here 
    //  (average for now, but a weighted average makes more sense)
    const score = (newnessScoreNorm + classificationScoreNorm) / 2;
    logger.debug(`Recipe scored: ${recipe.title}, newness: ${newnessScoreNorm}, classification: ${classificationScoreNorm}, score: ${score}`);
    return score;
  }

  // Calculate the "newness" score, i.e., least recently used recipes get a higher score
  //  check status: confirmed working
  _calculateNewnessScore(recipe) {
    // If the recipe has never been used (lastUsed is NULL) or the date range is 0,
    // assign the maximum newness score of 1.
    if (!recipe.lastUsed || this.dateRange === 0) {
        return 1;
    }
    // For recipes that have been used, calculate newness based on their lastUsed date.
    const lastUsedTime = new Date(recipe.lastUsed).getTime();
    const earliestTime = this.earliestDate.getTime();
    // Calculate newness score based on the position of lastUsedTime within the date range.
    let newnessSubscore = 1 - (lastUsedTime - earliestTime) / this.dateRange;
    // Ensure the newness score is within the 0 to 1 range.
    const normalizedNewness = Math.min(Math.max(newnessSubscore, 0), 1);
    // logger.debug(`Recipe "${recipe.title}" scored. Newness: ${normalizedNewness}`);
    return normalizedNewness;
  }

  // Iterate over the classifications in a recipe and calculate a score
  //  lower scores are more recent classifications, higher scores are older
  //  check status: confirmed working
  _calculateClassificationScore(recipe) {
    // Ensure the recipe has classifications
    if (!recipe.classification || recipe.classification.length === 0) {
      return 1; // Return 0 if no classifications are present
    }
    let totalSubscore = 0;
    let numberOfClassifications = 0;
    // Loop over each classification in the recipe
    recipe.classification.forEach(classification => {
      // Calculate subscore for each classification
      const subscore = this._calculateClassificationSubscore(classification);
      // Add subscore to the total
      totalSubscore += subscore;
      // Increment the count of classifications
      numberOfClassifications++;
    });
    // Calculate the average subscore (it should already be normalized between 0 and 1)
    const averageSubscore = totalSubscore / numberOfClassifications;
    return averageSubscore;
  }

  // Calculate classification score - least recent classifications get a higher score
  //  check status: confirmed working
  _calculateClassificationSubscore(classification) {
    // scoring classification
    //  1 - recipe with least recent classification (or no match)
    //  0 - recipe with most recent classification
    //
    // Normalize the classification to lower case (or upper case) for case-insensitive comparison
    const normalizedClassification = classification.toLowerCase();
    // Find the index of the classification in the recentClassifications array, ignoring case
    const index = this.recentClassifications.findIndex(c => c.toLowerCase() === normalizedClassification);
    // If the classification is not found, return 1
    if (index === -1) {
      // logger.debug(`Classification "${classification}" not found, scored: ${subscore}`)
      return 1;
    }
    // Scale the value based on the index position
    const subscore = index / (this.recentClassifications.length - 1);
    // logger.debug(`Classification "${classification}" index: ${index}, scored: ${subscore}`)
    return subscore;
  }

  // Select the next recipe based on the calculated scores
  //  check status: confirmed working
  _selectNextRecipe() {
    // Sort the recipes for selection based on score
    this._sortRecipesByScore();
    // create our pool
    //   how many? selectPoolPercentSize or selectPoolMinSize, whichever is greater
    const totalRecipes = this.recipes.length;
    // Calculate the intended size of the selection pool based on a percentage of the total recipes
    const poolSizeByPercent = Math.ceil(totalRecipes * (selectPoolPercentSize / 100));
    // Determine the actual size of the selection pool, choosing the larger between poolSizeByPercent and selectPoolMinSize
    const poolSize = Math.max(poolSizeByPercent, selectPoolMinSize);
    // Ensure that the actualPoolSize does not exceed the number of available recipes
    const adjustedPoolSize = Math.min(poolSize, totalRecipes);
    // logger.debug(`totalRecipes: ${totalRecipes}, poolSizeByPercent: ${poolSizeByPercent}, selectPoolMinSize: ${selectPoolMinSize}, adjustedPoolSize: ${adjustedPoolSize}`);
    // Create the selection pool from the top N recipes, according to the calculated pool size
    const selectionPool = this.recipes.slice(0, adjustedPoolSize);

    // If the selection pool is empty (e.g., no recipes available), handle accordingly
    if (selectionPool.length === 0) {
      logger.error(new Error('No recipes available for selection.'));
      return null; // Adjust based on your error handling strategy
    }
    // Select a random recipe from the selection pool
    const randomIndex = Math.floor(Math.random() * selectionPool.length);
    const selectedRecipe = selectionPool[randomIndex];
    // logger.debug(`Selected recipe: ${selectedRecipe.title}, score: ${selectedRecipe.score}`);
    return selectedRecipe;
  }

  // Fetch the full recipe based on the recipeID after selection
  // check status: confirmed working
  async _fetchSelectedRecipe(recipeID) {
    try {
      const query = `
        SELECT *
        FROM recipes
        WHERE recipeID = ?
      `;
      const values = [recipeID];
      const [recipe] = await db.execute(query, values);
      return recipe;
    } catch (error) {
      logger.error(new Error(`Error fetching selected recipe with ID ${recipeID}: ${error.message}`));
      // Depending on your error handling strategy, you might want to rethrow the error
      // or return null/undefined/a default value
      throw error; // or return null; 
    }
  }

  // Sort recipes based on lastUsed timestamp, from most recent to earliest
  //  check status: confirmed working
  _sortRecipesRecentToEarliest() {
    this.recipes.sort((a, b) => {
      if (a.lastUsed === null && b.lastUsed === null) {
        return 0; // Leave them in their current order
      } else if (a.lastUsed === null) {
        return -1; // Place record with null lastUsed at the top
      } else if (b.lastUsed === null) {
        return 1; // Place record with null lastUsed at the top
      } else {
        return b.lastUsed - a.lastUsed; // Sort based on timestamps
      }
    });
  }

  // Sort recipes based on score
  //  check status: confirmed working
  _sortRecipesByScore() {
    this.recipes.sort((a, b) => b.score - a.score);
  }

  // update the recipe.lastUsed - we do this after selecting the recipe
  // check status: confirmed working
  async _updateRecipeLastUsed(recipeID) {
    try {
      const query = `
        UPDATE recipes
        SET lastUsed = ?
        WHERE recipeID = ?
      `;
      const values = [new Date(), recipeID];
      await db.execute(query, values);
    } catch (error) {
      logger.error(new Error(`Error updating lastUsed timestamp for recipe with ID ${recipeID}: ${error.message}`));
      // Depending on your error handling strategy, you might want to rethrow the error
      // or handle it in a way that the rest of your class can deal with
      throw error; // or return null;
    } 
  }

}

module.exports = RecipeSelector;
