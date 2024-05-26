/**
 * @file MixQueue.js - Queue management for MixEngine
 */

const { database: db } = require('config');
const logger = require('config/logger').custom('MixQueue', 'debug');
const path = require('path');
const fs = require('fs').promises;

const { config } = require('config');
const mixKeepPeriod = config.mixes.mixKeepPeriod;
const mixFileDir = config.content.mixFileDir;

/**
 * Class representing the mix queue.
 */
class MixQueue {
  constructor() {
    // Initialize any necessary properties here
  }

  /**
   * Retrieve the next mixID without actually assigning it. 
   * It retrieves the maximum mixID from the database and increments it to get the next available mixID.
   * @returns {Promise<number>} The next mixID.
   * @throws {Error} If there is an error getting the next mixID.
   */
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

  /**
   * Create an entry in the database for the mix.
   * @param {Object} recipe - The recipe object.
   * @param {Object} mixDetails - The mix details object.
   * @returns {Promise<number>} The ID of the newly created mix.
   * @throws {Error} If there is an error creating the mix entry.
   */
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

  /**
   * Get the number of mixes in the queue.
   * @returns {Promise<number>} The number of mixes in the queue.
   * @throws {Error} If there is an error getting the number of mixes in the queue.
   */
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

  /**
   * Prune mixes that are older than the specified period and have been played.
   * Deletes the files and updates the database status to "Deleted".
   * @returns {Promise<void>}
   * @throws {Error} If there is an error pruning the mixes.
   */
  async pruneOldMixes() {
    logger.info('MixQueue:pruneMixes(): Pruning old mixes');
    try {
      const thresholdDate = new Date(Date.now() - mixKeepPeriod * 1000);
      const queryStr = `
        SELECT 
          mixID, filename 
        FROM 
          mixQueue 
        WHERE 
          status = 'Played' 
        AND dateUsed < ?
      `;
      const queryValues = [thresholdDate];
      const [rows] = await db.execute(queryStr, queryValues);
      const mixesToDelete = rows.map(row => ({
        mixID: row.mixID,
        filepath: path.join(mixFileDir, row.filename),
      }));

      const mixIDs = [];

      for (const mix of mixesToDelete) {
        try {
          await fs.unlink(mix.filepath);
          logger.info(`MixQueue:pruneMixes(): Deleted file ${mix.filepath}`);
          mixIDs.push(mix.mixID); // Only push mixID if file deletion is successful
        } catch (err) {
          logger.error(`MixQueue:pruneMixes(): Error deleting file ${mix.filepath}`, err);
        }
      }

      if (mixIDs.length > 0) {
        const updateStr = `
          UPDATE mixQueue
          SET status = 'Deleted'
          WHERE mixID IN (?)
        `;
        const queryValues = [mixIDs];
        await db.execute(updateStr, queryValues);
        logger.info(`MixQueue:pruneMixes(): Updated status to 'Deleted' for mixIDs: ${mixIDs.join(', ')}`);
      }
    } catch (error) {
      logger.error('MixQueue:pruneMixes(): Error pruning mixes', error);
      throw new Error('Failed to prune mixes');
    }
  }

}

module.exports = MixQueue;
