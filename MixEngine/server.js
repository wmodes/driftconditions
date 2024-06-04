// server.js - primary server code including:

// Add global error handlers at the very top of the file
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Optionally, perform cleanup and exit process if necessary
  process.exit(1); // Exit the process with a failure code
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  // Optionally, perform cleanup and exit process if necessary
  process.exit(1); // Exit the process with a failure code
});

require('module-alias/register');
const express = require('express');
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Refactored requires using defined aliases
const { notFound, errorHandler } = require('@middleware/errorHandler');
const { logger } = require('config');

const Conductor = require('@services/Conductor');

const { config } = require('config');
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
const queueRoutes = require('./core/api/routes/queueRoutes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/queue', queueRoutes);

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

// Starts the server
app.listen(mixEngineServer.port, () => {
  logger.info(`Server listening at ${mixEngineServer.protocol}://${mixEngineServer.host}:${mixEngineServer.port}`);
});