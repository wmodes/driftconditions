// clipSelector.js - A class module for fetching and selecting audio clips based on certain criteria

const { database: db } = require('config');
const JSON5 = require('json5');
const logger = require('config/logger').custom('ClipSelector', 'info');

const { config } = require('config');
const { 
  selectPoolPercentSize, selectPoolMinSize,
  newnessScoreWeight, tagScoreWeight } = config.audio;
const clipLengthRanges = config.audio.clipLength;

class ClipSelector {
  constructor() {
    // Initialize properties
    this.clipPool = [];
    this.earliestDate = null;
    this.latestDate = null;
    this.dateRange = null;
    this.recentTags = []; 
  }

  // given recipe which includes clip criteria, get audio clips from db
  //  nomenclature here (since things can get confusing):
  //    "clip" is the part of the recipe file that specifies criteria for a clip
  //    "audioClip" is a record from the database audio table representing a clip file
  async selectAudioClips(recipe) {
    // Iterate over each track in the recipe
    for (const track of recipe.recipeObj.tracks) {  
      // Iterate over each clip in the track
      for (const clip of track.clips) {
        //check for classification includes "silence"
        if (clip.classification.includes('silence')) {
          this._setSilenceBasics(clip);
          // go to next iteration of loop
          continue;
        }
        // we treat the clip as the search criteria
        let selectedAudioClip = null;
        let oneLastTime = false;
        // loop until we either get an audio clip or we run out of options
        while (!selectedAudioClip) {
          // get our audio clip
          selectedAudioClip = await this._getAudioClip(clip);
          // did we find a clip?
          if (selectedAudioClip) {
            // yay! we found a clip
            break;
          }
          // uh oh, no clip found, we need to loosen our criteria
          else if (clip.classification.length > 0) {
            // (we got here if no selectedClip & we still have classifications to try)
            // remove a classification to try less restrictive criteria
            clip.classification.pop();
            logger.debug(`Adjusted criteria after removing the last classification: ${JSON5.stringify(clip)}`);
            // now try again
          }
          // if we've removed all classifications, we need to try something else
          else if (oneLastTime) {
            // (we got here if no selectedClip & we have no classifications and oneLastTime is set)
            logger.error('No audio clip found after loosening all criteria. Reject this recipe.');
            return false;
          }
          // this is our last chance, try without classification
          else {
            // (we got here if no selectedClip & no classifications and oneLastTime is not set)
            // try one more time with no classification
            oneLastTime = true;
            // now try one last time
          }
        }
        // add the details from the selected audio clip to the clip portion of our recipeObj
        clip.audioID = selectedAudioClip.audioID;
        clip.title = selectedAudioClip.title;
        clip.filename = selectedAudioClip.filename;
        clip.duration = parseFloat(selectedAudioClip.duration);
        clip.creatorID = selectedAudioClip.creatorID;
        clip.creatorUsername = selectedAudioClip.creatorUsername;
      };
    };
    return true;
  }

// Set the basic parameters for a silence clip
_setSilenceBasics(clip) {
  // Extract clip length ranges from the configuration
  const clipLengthRanges = config.audio.clipLength;
  // Initialize variables to store the minimum and maximum durations possible for the clip
  let minLength = Infinity;
  let maxLength = 0;
  // Process each clip length designation in the clip's clipLength array
  clip.clipLength.forEach(lengthKey => {
    if (clipLengthRanges[lengthKey]) {
      const range = clipLengthRanges[lengthKey];
      // Update the minimum length if the current range's min is lower
      if (range.min < minLength) {
        minLength = range.min;
      }
      // Update the maximum length if the current range's max is higher
      if (range.max > maxLength) {
        maxLength = range.max;
      }
    } else {
      logger.debug(`No range found for clip length key: ${lengthKey}`);
    }
  });
  // Set the calculated minLength and maxLength to the clip
  clip.minLength = minLength;
  clip.maxLength = maxLength;
  logger.debug(`Set silence clip lengths: min=${minLength} seconds, max=${maxLength} seconds`);
}


  // get audio clip based on your criteria
  async _getAudioClip(criteria) {
    // Fetch clips from the database based on the provided criteria
    await this._fillClipPool(criteria);
    // TODO: If the clips array is empty, return an error to the caller
    if (this.clipPool.length === 0) {
      // logger.error('No clips found for the provided criteria.');
      return null;
    }
    // Set the date range for the clips
    this._getEarliestAndLatestDates();
    // Add tags from the criteria
    this.addTags(criteria.tags);
    // Score the clips
    this._scoreClips();
    // Select the next clip
    const selectedClip = this._selectNextClip();
    // Use audioID to select full clip from the database
    const [selectedFullClip] = await this._fetchSelectedClip(selectedClip.audioID);
    logger.debug(`Selected clip: ${selectedFullClip.title}, score: ${selectedClip.score}`);
    // logger.debug(`Selected clip: ${JSON5.stringify(selectedFullClip, null, 2)}`);
    // Add new tags to the recent tags array
    this._addNewTags(selectedFullClip.tags);
    // update the clip with the new lastUsed timestamp
    await this._updateClipLastUsed(selectedClip.audioID);
    // return the full clip to the caller
    return selectedFullClip;
  }

  // Refactored _fillClipPool method using the helper functions
  //  check status: confirmed working
  async _fillClipPool(criteria) {
    try {
      const queryParts = [];
      const queryValues = [];
      let querySubParts, querySubValues;
      // construct classification query
      ({ querySubParts, querySubValues } = this._constructClassificationQuery(criteria));
      if (querySubParts) queryParts.push(querySubParts);
      if (querySubValues) queryValues.push(...querySubValues);
      // construct length query
      ({ querySubParts, querySubValues } = this._constructLengthQuery(criteria));
      if (querySubParts) queryParts.push(querySubParts);
      if (querySubValues) queryValues.push(...querySubValues);
      // Always include these conditions to ensure the query respects edit locks and status
      queryParts.push('editLock = 0');
      queryParts.push('status = "Approved"');
      const queryPartsStr = queryParts.join(' AND ');

      const queryStr = `SELECT * FROM audio WHERE ${queryPartsStr}`;

      logger.debug(`queryStr: ${queryStr}`);
      logger.debug(`queryValues: ${queryValues}`);
      const [clips] = await db.execute(queryStr, queryValues);
      this.clipPool = clips;
      logger.debug(`ClipSelector:_fillClipPool: Clips fetched: ${clips.length} clips`);
    } catch (error) {
      logger.error(new Error(`ClipSelector:_fillClipPool: Error fetching clips: ${error.message}`));
      throw error; // or handle accordingly
    }
  }

  // Helper function to construct the classification part of the SQL query
  //  check status: confirmed working
  _constructClassificationQuery(criteria) {
    let querySubParts = [];
    let querySubValues = [];
    // Handle classification criteria
    if (criteria.classification) {
      const classifications = Array.isArray(criteria.classification) ? criteria.classification : [criteria.classification];
      classifications.forEach(classification => {
        const classificationJson = JSON.stringify([classification.toLowerCase()]);
        querySubParts.push(`JSON_CONTAINS(LOWER(classification), ?)`);
        querySubValues.push(classificationJson);
      });
    }
    return {
      querySubParts: querySubParts.length ? `(${querySubParts.join(' OR ')})` : '',
      querySubValues: querySubValues
    };
  }

  // Helper function to construct the length part of the SQL query
  //  check status: confirmed working
  _constructLengthQuery(criteria) {
    let querySubParts = [];
    let querySubValues = [];
    // Handle clipLength criteria
    if (criteria.clipLength) {
      const clipLengths = criteria.clipLength.map(l => l.toLowerCase());
      clipLengths.forEach(lengthCategory => {
        const matchingLengthCategory = Object.keys(clipLengthRanges).find(key => key.toLowerCase() === lengthCategory);
        if (matchingLengthCategory) {
          const { min, max } = clipLengthRanges[matchingLengthCategory];
          querySubParts.push(`(duration >= ? AND duration <= ?)`);
          querySubValues.push(min, max);
        }
      });
    }
    return {
      querySubParts: querySubParts.length ? `(${querySubParts.join(' OR ')})` : '',
      querySubValues: querySubValues
    };
  }

  // Calculate the earliest and latest dates from the clips
  //  check status: confirmed working
  _getEarliestAndLatestDates() {
    // Initialize both earliest and latest to the Unix epoch start
    let earliest = new Date().getTime();
    let latest = 0; 
    // iterate over the clips
    this.clipPool.forEach(clip => {
      const lastUsedTime = new Date(clip.lastUsed).getTime();
        // Check if the clip has been used and does not evaluate to NaN
        if (clip.lastUsed && !isNaN(lastUsedTime)) {
          // Adjust earliest if the date is earlier than earlier date
          if (lastUsedTime < earliest) {
              earliest = lastUsedTime;
          }
          // Adjust latest only if we find a valid, later date
          if (lastUsedTime > latest) {
              latest = lastUsedTime;
          }
        }
        // if clip.lastUsed is NULL, we don't change the earliest rendering
        // a true range. Later if a clip has never been used (lastUser == NULL), 
        // we can set the newness score to 1
    });
    this.earliestDate = new Date(earliest);
    this.latestDate = new Date(latest);
    // Ensure dateRange is non-negative. It will be 0 if no valid dates were found.
    this.dateRange = Math.max(0, latest - earliest);

    // logger.debug(`Date range set: earliest: ${this.earliestDate.toISOString()}, latest: ${this.latestDate.toISOString()}, range: ${this.dateRange}`);
    return true;
  }

  // Add the tags from criteria (or similar object)
  //  check status: 
  addTags(tags) {
    if (tags) {
      this.recentTags.push(...tags);
    }
  }

  // Reset the recent tags array
  //  check status: confirmed working
  resetTags() {
    this.recentTags = [];
  }

  // Iterate over the clips and score each one
  //  check status: confirmed working
  _scoreClips() {
    this.clipPool = this.clipPool.map(clip => {
        // Calculate the score for the current clip
        const score = this._calculateScore(clip);       
        // Log the clip's identifiable property (e.g., title) and its score
        // logger.debug(`Clip scored: ${clip.title}, score: ${score}`);        
        // Return the clip object with the updated score
        return { ...clip, score: score };
    });
  }

  // Score a clip based on newness and classification (and other criteria if we wish)
  //  check status: confirmed working
  _calculateScore(clip) {
    const newnessScore = this._calculateNewnessScore(clip);
    const tagScore = this._calculateTagScore(clip);
    // combine scores for different criteria as weighted average
    const totalWeight = newnessScoreWeight + tagScoreWeight;
    const score = (newnessScore * newnessScoreWeight + tagScore * tagScoreWeight) / totalWeight;
    logger.debug(`Clip scored: ${clip.title}, newness: ${newnessScore}, tagScore: ${tagScore}, score: ${score}`);
    return score;
  }

  // Calculate the "newness" score, i.e., least recently used clips get a higher score
  //  check status: confirmed working
  _calculateNewnessScore(clip) {
    // If the clip has never been used (lastUsed is NULL) or the date range is 0,
    // assign the maximum newness score of 1.
    if (!clip.lastUsed || this.dateRange === 0) {
        return 1;
    }
    // For clips that have been used, calculate newness based on their lastUsed date.
    const lastUsedTime = new Date(clip.lastUsed).getTime();
    const earliestTime = this.earliestDate.getTime();
    // Calculate newness score based on the position of lastUsedTime within the date range.
    let newnessSubscore = 1 - (lastUsedTime - earliestTime) / this.dateRange;
    // Ensure the newness score is within the 0 to 1 range.
    const normalizedNewness = Math.min(Math.max(newnessSubscore, 0), 1);
    // logger.debug(`Newnesss: Clip "${clip.title}" scored. Newness: ${normalizedNewness}`);
    return normalizedNewness;
  }

  // Iterate over the tags in a clip and calculate a score
  //  matching tags get a higher score, no tags get a score of 0
  //  check status: confirmed working
  _calculateTagScore(clip) {
    // Ensure the clip has tags
    if (!clip.tags || clip.tags.length === 0) {
      return 1; // Return 0 if no tags are present
    }
    let totalTagCount = 0;
    let numberOfTags = this.recentTags.length;
    if (numberOfTags === 0) {
      return 0; // No tags to compare, you get a low score, sorry
    }
    // Loop over each tag in the clip
    clip.tags.forEach(tag => {
      // Normalize the classification to lower case for case-insensitive comparison
      const normalizedTag = this._normalizeTag(tag)
      // count the number of matching tags in recentTags (normalized for comparison
      const tagCount = this.recentTags.filter(recentTag => this._normalizeTag(recentTag) === normalizedTag).length;
      totalTagCount += tagCount;
    });
    // Calculate the average subscore (it should already be normalized between 0 and 1)
    const subscore = totalTagCount / numberOfTags;
    logger.debug(`TagScore: Clip "${clip.title}" scored. totalTagCount: ${totalTagCount}, numberOfTags: ${numberOfTags}, subscore: ${subscore}`);
    return subscore;
  }

  _normalizeTag(tag) {
    // Convert to lowercase
    let normalized = tag.toLowerCase();
    // Remove dashes
    normalized = normalized.replace(/-/g, '');
    // Replace common plural forms with singular
    // This is a simple version and might need more rules depending on your data
    if (normalized.endsWith('ies')) {
      // cities -> city
      normalized = normalized.replace(/ies$/, 'y');
    } else if (normalized.endsWith('es')) {
      // boxes -> box
      normalized = normalized.replace(/es$/, '');
    } else if (normalized.endsWith('s') && !normalized.endsWith('ss')) {
      // cats -> cat, but leaves 'class' unchanged
      normalized = normalized.replace(/s$/, '');
    }
    return normalized;
  }

  // Select the next clip based on the calculated scores
  //  check status: confirmed working
  _selectNextClip() {
    // Sort the clips for selection based on score
    this._sortClipsByScore();
    const totalClips = this.clipPool.length;
    // Calculate the intended size of the selection pool based on a percentage of the total clips
    const poolSizeByPercent = Math.ceil(totalClips * (selectPoolPercentSize / 100));
    // Determine the actual size of the selection pool, choosing the larger between poolSizeByPercent and selectPoolMinSize
    const poolSize = Math.max(poolSizeByPercent, selectPoolMinSize);
    // Ensure that the actualPoolSize does not exceed the number of available clips
    const adjustedPoolSize = Math.min(poolSize, totalClips);
    logger.debug(`totalClips: ${totalClips}, poolSizeByPercent: ${poolSizeByPercent}, selectPoolMinSize: ${selectPoolMinSize}, adjustedPoolSize: ${adjustedPoolSize}`);
    // Create the selection pool from the top N clips, according to the calculated pool size
    const selectionPool = this.clipPool.slice(0, adjustedPoolSize);
    // Select a random clip from the selection pool
    const randomIndex = Math.floor(Math.random() * selectionPool.length);
    const selectedClip = selectionPool[randomIndex];
    // logger.debug(`Selected clip: ${selectedClip.title}, score: ${selectedClip.score}`);
    return selectedClip;
  }

  // Fetch the full clip based on the audioID after selection
  // check status: confirmed working
  async _fetchSelectedClip(audioID) {
    try {
      const queryStr = `
        SELECT audio.*, users.username AS creatorUsername
        FROM audio
        LEFT JOIN users ON audio.creatorID = users.userID
        WHERE audioID = ?
      `;
      const queryValues = [audioID];
      const [clip] = await db.execute(queryStr, queryValues);
      return clip;
    } catch (error) {
      logger.error(new Error(`Error fetching selected clip with ID ${audioID}: ${error.message}`));
      // Depending on your error handling strategy, you might want to rethrow the error
      // or return null/undefined/a default value
      throw error; // or return null; 
    }
  }

  // Sort clips based on lastUsed timestamp, from most recent to earliest
  //  check status: confirmed working
  _sortClipsRecentToEarliest() {
    this.clipPool.sort((a, b) => {
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

  // Sort clips based on score
  //  check status: confirmed working
  _sortClipsByScore() {
    this.clipPool.sort((a, b) => b.score - a.score);
  }

  // Add new tags to the recent tags array
  _addNewTags(tags) {
    this.recentTags.push(...tags);
  }

  // update the clip.lastUsed - we do this after selecting the clip
  // check status: confirmed working
  async _updateClipLastUsed(audioID) {
    try {
      const query = `
        UPDATE audio
        SET lastUsed = ?
        WHERE audioID = ?
      `;
      const values = [new Date(), audioID];
      await db.execute(query, values);
    } catch (error) {
      logger.error(new Error(`Error updating lastUsed timestamp for clip with ID ${audioID}: ${error.message}`));
      // Depending on your error handling strategy, you might want to rethrow the error
      // or handle it in a way that the rest of your class can deal with
      throw error; // or return null;
    } 
  }

}

module.exports = ClipSelector;
