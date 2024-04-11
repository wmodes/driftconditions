// server.js - primary server code including:

require('module-alias/register');
const express = require('express');
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Refactored requires using defined aliases
const { notFound, errorHandler } = require('@middleware/errorHandler');
const logger = require('@config/logger');

const Conductor = require('@services/Conductor');

const config = require('@config/config');
const corsOptions = config.corsOptions;
const mixEngineServer = config.mixEngineServer;

// Middleware setup
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser());

// Place the logging middleware after cookie-parser to ensure cookies are parsed
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request on ${req.path}`);
  next();
});

// Require route modules
const authRoutes = require('./core/api/routes/authRoutes');

// Use routes
app.use('/api/auth', authRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Instantiate and start the Conductor
const conductor = new Conductor();
conductor.start().then(() => {
  logger.info('Conductor has started.');
}).catch(error => {
  logger.error(`Conductor failed to start: ${error.message}`);
});

// Starts the server, highlighting the use of a specific port for listening to incoming requests.
app.listen(mixEngineServer.port, () => {
  logger.info(`Server listening at ${mixEngineServer.protocol}://${mixEngineServer.host}:${mixEngineServer.port}`);
});