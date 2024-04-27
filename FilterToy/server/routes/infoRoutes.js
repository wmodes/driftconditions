// infoRoutes.js - A route to fetch ffmpeg capabilities

const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const router = express.Router();
const logger = require('@config/logger');

// Utility function to fetch all ffmpeg data
async function fetchFfmpegCapabilities() {
  const getFormats = () => new Promise((resolve, reject) => {
    ffmpeg.getAvailableFormats((err, formats) => err ? reject(err) : resolve(formats));
  });
  const getCodecs = () => new Promise((resolve, reject) => {
    ffmpeg.getAvailableCodecs((err, codecs) => err ? reject(err) : resolve(codecs));
  });
  const getEncoders = () => new Promise((resolve, reject) => {
    ffmpeg.getAvailableEncoders((err, encoders) => err ? reject(err) : resolve(encoders));
  });
  const getFilters = () => new Promise((resolve, reject) => {
    ffmpeg.getAvailableFilters((err, filters) => err ? reject(err) : resolve(filters));
  });

  try {
    const [formats, codecs, encoders, filters] = await Promise.all([
      getFormats(), getCodecs(), getEncoders(), getFilters()
    ]);
    logger.debug(`Fetched ffmpeg details: ${Object.keys(formats).length} formats, ${Object.keys(codecs).length} codecs, ${Object.keys(encoders).length} encoders, ${Object.keys(filters).length} filters`);
    return { formats, codecs, encoders, filters };
  } catch (error) {
    throw error;
  }
}

// API route to get ffmpeg capabilities
router.get('/capabilities', async (req, res) => {
    try {
        const data = await fetchFfmpegCapabilities();
        res.json(data);
    } catch (error) {
        console.error(`Error fetching ffmpeg details: ${error}`);
        res.status(500).send({ message: 'Failed to fetch ffmpeg data' });
    }
});

module.exports = router;