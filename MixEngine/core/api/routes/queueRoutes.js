// queueRoutes.js - Route for handling the queue

// foundational imports
const express = require('express');
const logger = require('config/logger').custom('MixEngine', 'info');
const router = express.Router();
const { database: db } = require('config');

// authentication imports
const jwt = require('jsonwebtoken');

// configuration import
const { config } = require('config');
// pull these out of the config object

// Route to get the next mix from the queue
router.post('/nextmix', async (req, res) => {
  try {
    const mix = await getNextMixFromQueue();
    if (mix) {
      res.json(mix);
    } else {
      res.status(404).send('No mix available');
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Route to mark a mix as played
router.post('/markplayed', async (req, res) => {
  try {
    const { mixID } = req.body;
    await markMixAsPlayed(mixID);
    res.json({ message: 'Mix marked as played' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//
// Helper functions
//

// Helper function to get the next mix from the queue
async function getNextMixFromQueue() {
  logger.info('Getting the next mix from the queue');
  try {
    const queryStr = `
      SELECT *
      FROM mixQueue 
      WHERE status = 'Queued'
      ORDER BY mixID ASC 
      LIMIT 1
    `;
    const [rows] = await db.execute(queryStr);
    return rows[0];
  } catch (error) {
    logger.error('queueRoutes:getNextMixFromQueue: Error getting next mix from the queue', error);
    throw error;
  }
}

// Helper function to mark a mix as played
async function markMixAsPlayed(mixID) {
  logger.info(`Marking mix as played: ${mixID}`);
  try {
    const queryStr = `
      UPDATE mixQueue
      SET dateUsed = NOW(), status = 'Played'
      WHERE mixID = ?
    `;
    await db.execute(queryStr, [mixID]);
  } catch (error) {
    logger.error('Error marking mix as played', error);
    throw error;
  }
}

module.exports = router;