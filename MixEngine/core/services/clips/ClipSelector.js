// clipSelector.js - A class module for fetching and selecting audio clips based on certain criteria

const { database: db } = require('config');
const { logger } = require('config');
const { config } = require('config');
const clipLength = config.recipes.length;

class ClipSelector {
  constructor() {
    // Initialize properties
    // Consider what properties would be useful for selecting clips. Examples might include:
    this.clipPool = [];
    this.selectedClips = []; // For storing selected clips during operations
    // Add more properties as needed based on your selection criteria
  }

  // Main method to get clips based on your criteria
  async getClip(criteria) {
    // Fetch clips from the database based on the provided criteria
    await this._fillClipPool(criteria);
    // TODO: If the clips array is empty, return an error to the caller
    return this.clipPool;
    // Further processing or filtering based on additional criteria
    // Example: this._filterClipsByLength(minLength, maxLength);
    // Example: this._sortClipsByLastUsed();
    // Select clips based on processed criteria
    // Example: this._selectClips();
    // Return the selected clips
    return this.selectedClips;
  }

  // Fetch clips from the database
  async _fillClipPool(criteria) {
    try {
      logger.debug(`criteria: ${JSON.stringify(criteria)}`);
      let classificationQueryParts = [];
      let lengthQueryParts = [];
      let values = [];
      // Handle classification criteria
      if (criteria.classification) {
        // Ensure classification criteria is an array
        const classifications = Array.isArray(criteria.classification) ? criteria.classification : [criteria.classification];

        // For each classification, create a JSON_CONTAINS condition and add it to the queryParts array
        classifications.forEach((classification) => {
          // Format the classification as a JSON array string for the query
          const classificationJson = JSON.stringify([classification]);
          classificationQueryParts.push(`JSON_CONTAINS(classification, ?)`);
          values.push(classificationJson);
        });
      }
      // Handle length criteria
      if (criteria.length) {
        // Normalize criteria.length to an array and lowercase for case-insensitive matching
        const lengths = Array.isArray(criteria.length) ? criteria.length.map(l => l.toLowerCase()) : [criteria.length.toLowerCase()];
        // Iterate over each length criteria
        lengths.forEach((lengthCategory) => {
          // Attempt to find a matching length category in the config, normalized to lowercase keys
          const matchingLengthCategory = Object.keys(clipLength).find(key => key.toLowerCase() === lengthCategory);
          if (matchingLengthCategory) {
            // Retrieve the min and max duration for the matching length category from the configuration
            const { min, max } = clipLength[matchingLengthCategory];
            if (min !== undefined && max !== undefined) {
              lengthQueryParts.push(`(duration >= ? AND duration <= ?)`);
              values.push(min, max); // Add both min and max values to the values array
            }
          }
        });
      }
      // Build the complete query string with additional conditions
      // Join classification parts and length parts with OR
      let classificationQueryStr = classificationQueryParts.join(' OR ');
      let lengthQueryStr = lengthQueryParts.join(' OR ');
      // Add parentheses around classification and length conditions if they are not empty
      if (classificationQueryStr) {
        classificationQueryStr = `(${classificationQueryStr})`;
      }
      if (lengthQueryStr) {
        lengthQueryStr = `(${lengthQueryStr})`;
      }
      // Join classificationQueryStr and lengthQueryStr with AND in queryPartsStr
      // or alone if one of them is empty
      const queryParts = [];
      if (classificationQueryStr) {
        queryParts.push(classificationQueryStr);
      }
      if (lengthQueryStr) {
        queryParts.push(lengthQueryStr);
      }
      queryParts.push('editLock = 0');
      queryParts.push('status = "Approved"');
      const queryPartsStr = queryParts.join(' AND ');

      const query = `
        SELECT * 
        FROM audio 
        WHERE ${queryPartsStr}`;

      logger.debug(`Query: ${query}`);
      logger.debug(`Values: ${values}`);
      // Execute the query
      const [clips] = await db.execute(query, values);
      this.clipPool = clips;
      // logger.info(`Clips fetched successfully: ${clips.length} clips`);
    } catch (error) {
      logger.error(`Error fetching clips: ${error.message}`);
      throw error; // or handle accordingly
    }
  }  

  // Add additional methods as needed for processing and selecting clips
  // Examples: filtering by length, sorting by last used, etc.

  // Example method for filtering clips by length
  _filterClipsByLength(minLength, maxLength) {
    this.selectedClips = this.clipPool.filter(clip => 
      clip.length >= minLength && clip.length <= maxLength);
  }

  // Example method for sorting clips by last used date
  _sortClipsByLastUsed() {
    this.selectedClips.sort((a, b) => new Date(a.lastUsed) - new Date(b.lastUsed));
  }

  // Example method for selecting clips based on criteria
  _selectClips() {
    // Implement your selection logic here
    // This could involve choosing a subset of clips based on scores or other metrics
  }
}

module.exports = ClipSelector;
