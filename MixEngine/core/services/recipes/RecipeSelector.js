// recipeSelector.js - A class module for fetching and selecting recipes based on certain criteria

const db = require('@config/database');
const logger = require('@config/logger');
const config = require('@config/config');
// Utilize any needed configuration values here
const { selectionPoolSize } = config.recipes;

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

  async fetchRecipes() {
    const [recipes] = await db.execute(`
        SELECT recipeID, title, classification, tags, lastUsed
        FROM recipes
        WHERE editLock = 0 AND status = 'Approved'
    `);
    this.recipes = recipes;
  }

  setDateRange() {
    let earliest = Infinity;
    let latest = 0;
    this.recipes.forEach(recipe => {
      if (recipe.lastUsed) {
        const lastUsedTimestamp = new Date(recipe.lastUsed).getTime();
        if (lastUsedTimestamp < earliest) {
          earliest = lastUsedTimestamp;
        }
        if (lastUsedTimestamp > latest) {
          latest = lastUsedTimestamp;
        }
      }
    });
    // Update class properties
    this.earliestDate = earliest === Infinity ? null : earliest;
    this.latestDate = latest === 0 ? null : latest;
    this.dateRange = this.latestDate && this.earliestDate ? this.latestDate - this.earliestDate : null;
  }

  setRecentClassificationAndTags() {
    this.sortRecipesRecentToEarliest();
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
  }

  scoreRecipes() {
    this.recipes = this.recipes.map(recipe => {
        return { ...recipe, score: this.calculateScore(recipe) };
    });
  }

  calculateScore(recipe) {
    if (!this.dateRange) {
      // Default score or logic if date range is not available
      return 0;
    }
    const newnessScoreNorm = this.calculateNewnessScore(recipe);
    const classificationScoreNorm = this.calculateClassificationScore(recipe);
    // combine scores for different criteria here 
    //  (average for now, but a weighted average makes more sense)
    score = (newnessScoreNorm + classificationScoreNorm) / 2;
    return score;
  }

  calculateNewnessScore(recipe) {
    // scoring newness
    //  1 - last used recipe
    //  0 - earliest used recipe
    let newnessSubscore = 0;
    if (recipe.lastUsed) {
      const lastUsedTime = new Date(recipe.lastUsed).getTime() - this.earliestDate;
      newnessSubscore = 1 - (lastUsedTime / this.dateRange);
    }
    const normalizedNewness = Math.min(Math.max(newnessSubscore, 0), 1);
    return normalizedNewness;
  }

  calculateClassificationScore(recipe) {
    // Ensure the recipe has classifications
    if (!recipe.classification || recipe.classification.length === 0) {
      return 1; // Return 0 if no classifications are present
    }
    let totalSubscore = 0;
    let numberOfClassifications = 0;
    // Loop over each classification in the recipe
    recipe.classification.forEach(classification => {
      // Calculate subscore for each classification
      const subscore = this.calculateClassificationSubscore(classification);
      // Add subscore to the total
      totalSubscore += subscore;
      // Increment the count of classifications
      numberOfClassifications++;
    });
    // Calculate the average subscore (it should already be normalized between 0 and 1)
    const averageSubscore = totalSubscore / numberOfClassifications;
    return averageSubscore;
  }

  calculateClassificationSubscore(classification) {
    // scoring classification
    //  1 - recipe with least recent classification (or no match)
    //  0 - recipe with most recent classification
    // Find the index of the classification in the recentClassifications array
    const index = this.recentClassifications.indexOf(classification);
    // If the classification is not found, return 1
    if (index === -1) {
      return 1;
    }
    // Scale the value based on the index position
    const subscore = index / (this.recentClassifications.length - 1);
    return subscore;
  }

  sortRecipesForSelection() {
    this.recipes.sort((a, b) => b.score - a.score);
  }

  sortRecipesRecentToEarliest() {
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

  selectNextRecipe() {
    const selectionPool = scoredRecipes.slice(0, selectionPoolSize);
    const selectedRecipe = selectionPool[Math.floor(Math.random() * selectionPool.length)];

    return selectedRecipe;
  }
}


module.exports = RecipeSelector;
