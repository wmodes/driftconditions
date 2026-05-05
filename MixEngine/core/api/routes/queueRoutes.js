// queueRoutes.js - Route for handling the queue

// foundational imports
const express = require('express');
const router = express.Router();
const path = require('path');
const logger = require('config/logger').custom('MixEngine', 'info');
const { database: db } = require('config');

// authentication imports
const jwt = require('jsonwebtoken');

// configuration import
const { config } = require('config');
// pull these out of the config object
const mixFileDir = config.content.mixFileDir;
const playlistPeriod = config.mixes.playlistPeriod; // in ms

// simple in-memory rate limiter: one heart action per IP per mixID per window
const heartRateWindow = 60 * 1000; // 1 minute
const heartRateCache = new Map(); // key: `${ip}:${mixID}` → timestamp
const heartRateLimitHit = (ip, mixID) => {
  const key = `${ip}:${mixID}`;
  const last = heartRateCache.get(key);
  const now = Date.now();
  if (last && now - last < heartRateWindow) return true;
  heartRateCache.set(key, now);
  return false;
};

// Route to get the next mix from the queue
router.get('/nextmix', async (req, res) => {
  try {
    const mixRecord = await getNextMixFromQueue();
    if (mixRecord) {
      await markMixAsPlayed(mixRecord.mixID);
      const fullPath = path.join(mixFileDir, mixRecord.filename);
      logger.info(`queueRoutes:/nextmix: Sending mix: ${fullPath}`);
      res.send(fullPath);
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

// Route to heart or unheart a mix (no auth required)
router.post('/heart', async (req, res) => {
  const { mixID, hearted } = req.body;
  if (!mixID || typeof hearted !== 'boolean') {
    return res.status(400).json({ message: 'mixID and hearted (boolean) required' });
  }
  const ip = req.ip;
  if (hearted && heartRateLimitHit(ip, mixID)) {
    return res.status(429).json({ message: 'Too many requests' });
  }
  try {
    const delta = hearted ? 1 : -1;
    const queryStr = `
      UPDATE mixQueue
      SET favorites = GREATEST(0, favorites + ?)
      WHERE mixID = ?
    `;
    await db.execute(queryStr, [delta, mixID]);
    const [[row]] = await db.execute('SELECT favorites FROM mixQueue WHERE mixID = ?', [mixID]);
    res.json({ favorites: row?.favorites ?? 0 });
  } catch (error) {
    logger.error('queueRoutes:/heart: Error updating favorites', error);
    res.status(500).json({ message: error.message });
  }
});

// Route to get the current playlist
router.get('/getplaylist', async (req, res) => {
  try {
    const mixArray = await getCurrentPlaylist();
    if (mixArray) {
      res.json(mixArray);
    } else {
      res.status(404).send('Playlist unavailable');
    }
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

// Helper function to get the current playlist
async function getCurrentPlaylist() {
  logger.info('Fetching the current playlist');
  try {
    const playlistCutoff = new Date(Date.now() - playlistPeriod);
    const queryStr = `
      SELECT *
      FROM mixQueue 
      WHERE status = 'Played' AND dateUsed >= ?
      ORDER BY dateUsed DESC
    `;
    const [rows] = await db.execute(queryStr, [playlistCutoff]);
    return rows;
  } catch (error) {
    logger.error('queueRoutes:getCurrentPlaylist: Error fetching the playlist', error);
    throw error;
  }
}

module.exports = router;