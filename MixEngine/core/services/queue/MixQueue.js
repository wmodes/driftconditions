// QueueStuff.js - Queue management for MixEngine


const { database: db } = require('config');
const logger = require('config/logger').custom('MixEngine', 'info');

const { config } = require('config');

class MixQueue {
  constructor() {
    // Initialize any necessary properties here
  }

  // retrieve the next mixID without actually assigning it. It retrieves the maximum mixID from the database and increments it to get the next available mixID
  async getNextMixID() {
    logger.info('MixQueue:getNextMixID(): Getting the next mixID');
    try {
      // SQL Query to get the maximum mixID from the mixQueue table
      const queryStr = 'SELECT MAX(mixID) AS maxMixID FROM mixQueue';
      const [rows] = await db.execute(queryStr);
      const maxMixID = rows[0].maxMixID || 0; // If no mixID exists, default to 0
      const nextMixID = maxMixID + 1;
      logger.debug(`MixQueue:getNextMixID(): Next mixID: ${nextMixID}`);
      return nextMixID;
    } catch (error) {
      logger.error('MixQueue:getNextMixID(): Error getting next mixID', error);
      throw new Error('Failed to get next mixID');
    }
  }

  // Create an entry in the database for the mix
  async createMixQueueEntry(recipe, mixDetails) {
    logger.info('MixQueue:createMixQueueEntry(): Creating database entry for the mix');
    try {
      // SQL Query to insert a new mix entry
      const queryStr = `
        INSERT INTO mixQueue 
          (recipeID, title, status, filename, duration, playlist, recipeObj, classification, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const queryValues = [
        recipe.recipeID, 
        recipe.title, 
        "Queued",
        mixDetails.filepath,
        mixDetails.duration,
        JSON.stringify(mixDetails.playlist),
        JSON.stringify(recipe.recipeObj),
        JSON.stringify(recipe.classification), 
        JSON.stringify(recipe.tags)
      ];
      logger.debug(`MixQueue:createMixQueueEntry(): queryStr: ${queryStr}`);
      logger.debug(`MixQueue:createMixQueueEntry(): queryValues: ${JSON.stringify(queryValues, null, 2)}`);
      const [result] = await db.execute(queryStr, queryValues);
      // Log the newly created mixID
      logger.debug(`MixQueue:createMixQueueEntry(): New mix created with mixID: ${result.insertId}`);
      return result.insertId;
    } catch (error) {
      logger.error('MixQueue:createMixQueueEntry(): Error creating mix entry', error);
      throw new Error('Failed to create mix entry');
    }
  }

  async getNumberOfMixesInQueue() {
    logger.info('MixQueue:getNumberOfMixesInQueue(): Getting the number of mixes in the queue');
    try {
      // SQL Query to get the number of mixes in the queue
      const queryStr = `
        SELECT COUNT(*) 
        AS mixCount 
        FROM mixQueue
        WHERE status = 'Queued'
      `;
      const [rows] = await db.execute(queryStr);
      const mixCount = rows[0].mixCount || 0; // If no mix exists, default to 0
      logger.debug(`MixQueue:getNumberOfMixesInQueue(): Number of mixes in the queue: ${mixCount}`);
      return mixCount;
    } catch (error) {
      logger.error('MixQueue:getNumberOfMixesInQueue(): Error getting number of mixes in queue', error);
      throw new Error('Failed to get number of mixes in queue');
    }
  }

}


module.exports = MixQueue;
