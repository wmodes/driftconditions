// filterRoutes.js - A route for testing a filter with ffmpeg

const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const router = express.Router(); // Use Router instead of applying routes directly to the app

// Middleware to parse JSON bodies
router.use(express.json());

// POST route to process a filter chain with ffmpeg
router.post('/process-filter', (req, res) => {
    const { filterChain } = req.body;
    
    // Check if the filterChain is provided
    if (!filterChain) {
        return res.status(400).json({ error: 'No filter chain provided' });
    }

    // Implement your ffmpeg logic here
    ffmpeg('input.mp4')
        .complexFilter(filterChain)
        .on('error', (err) => {
            console.error('ffmpeg error:', err.message);
            res.status(500).json({ error: 'Processing failed', details: err.message });
        })
        .on('end', () => {
            console.log('Processing finished successfully');
            res.json({ success: true, message: 'Processing finished successfully' });
        })
        .save('output.mp4'); // Consider dynamically generating output file names to avoid conflicts
});

module.exports = router;
