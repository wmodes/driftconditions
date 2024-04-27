// server.js - The main entry point for the server

require('module-alias/register');

const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('@config/config');  // Ensuring this matches your module-alias setup
const logger = require('@config/logger');

const ffmpegInfoRoutes = require('./routes/infoRoutes');  // Importing ffmpeg info routes
const filterRoutes = require('./routes/filterRoutes');  // Importing filter processing routes

const app = express();
const PORT = config.server.port;

// Apply CORS options from your config
app.use(cors(config.corsOptions));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    logger.info(`Received ${req.method} request on ${req.path}`);
    next();
});

// Route handlers
app.use('/api/ffmpeg', ffmpegInfoRoutes);  // Use ffmpeg info routes under '/api/ffmpeg'
app.use('/api/ffmpeg', filterRoutes);  // Use filter processing routes under the same base path for consistency

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '..', 'client', 'build')));

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
    });
}

// Basic API endpoint for testing server status
app.get('/api/status', (req, res) => {
    res.status(200).send({ status: 'Server is running!' });
});

// Error handling for undefined routes
app.use((req, res, next) => {
    res.status(404).send('Sorry can\'t find that!');
});

// Generic error handler
app.use((err, req, res, next) => {
    logger.error(`Server error: ${err.message}`);
    res.status(500).send('Server error');
});

// Start the server
app.listen(PORT, () => {
    logger.info(`Server listening on ${config.server.protocol}://${config.server.host}:${PORT}`);
});
