// clipSelector.js - A class module for fetching and selecting audio clips based on certain criteria

const db = require('@config/database');
const logger = require('@config/logger');
const config = require('@config/config');
// You might have specific configuration for clips selection, similar to recipes

class ClipSelector {
  constructor() {
    // Initialize properties
    // Consider what properties would be useful for selecting clips. Examples might include:
    this.clips = [];
    this.selectedClips = []; // For storing selected clips during operations
    // Add more properties as needed based on your selection criteria
  }

  // Main method to get clips based on your criteria
  async getClips(criteria) {
    // Fetch clips from the database based on the provided criteria
    await this._fetchClips(criteria);
    // Further processing or filtering based on additional criteria
    // Example: this._filterClipsByLength(minLength, maxLength);
    // Example: this._sortClipsByLastUsed();
    // Select clips based on processed criteria
    // Example: this._selectClips();
    // Return the selected clips
    return this.selectedClips;
  }

  // Fetch clips from the database
  async _fetchClips(criteria) {
    try {
      let queryParts = [];
      let values = [];
  
      // Handle classification criteria
      if (criteria.classification) {
        const classifications = Array.isArray(criteria.classification) ? criteria.classification : [criteria.classification];
        queryParts.push(`(classification IN (?${', ?'.repeat(classifications.length - 1)}))`);
        values.push(...classifications);
      }
  
      // Handle tag criteria
      if (criteria.tag) {
        const tags = Array.isArray(criteria.tag) ? criteria.tag : [criteria.tag];
        queryParts.push(`(tag IN (?${', ?'.repeat(tags.length - 1)}))`);
        values.push(...tags);
      }
  
      // Handle length criteria
      if (criteria.length) {
        const lengths = Array.isArray(criteria.length) ? criteria.length : [criteria.length];
        queryParts.push(`(length IN (?${', ?'.repeat(lengths.length - 1)}))`);
        values.push(...lengths);
      }
  
      // Build the complete query string with additional conditions
      let query;
      if (queryParts.length > 0) {
        const queryConditions = queryParts.join(' OR ');
        query = `
          SELECT * 
          FROM clips 
          WHERE (${queryConditions}) AND editLock = 0 AND status = 'Approved'`;
      } else {
        query = `
          SELECT * 
          FROM clips 
          WHERE editLock = 0 AND status = 'Approved'`;
      }
  
      // Execute the query
      const [clips] = await db.execute(query, values);
      this.clips = clips;
      logger.info(`Clips fetched successfully: ${clips.length} clips`);
    } catch (error) {
      logger.error(`Error fetching clips: ${error.message}`);
      throw error; // or handle accordingly
    }
  }  

  // Add additional methods as needed for processing and selecting clips
  // Examples: filtering by length, sorting by last used, etc.

  // Example method for filtering clips by length
  _filterClipsByLength(minLength, maxLength) {
    this.selectedClips = this.clips.filter(clip => 
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
