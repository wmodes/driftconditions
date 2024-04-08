// server.js - primary server code including:
//   - User registration and authentication
//   - User profiles and modifying user information
//   - Audio upload and management
//   - Protected routes and middleware
//   - Database connection and queries
//   - File upload and processing
//   - JWT token generation and verification
//   - Error handling and logging
//   - CORS and cookie management

require('module-alias/register');
const express = require('express');
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Refactored requires using defined aliases
const { notFound, errorHandler } = require('@middleware/errorHandler');
const logger = require('@config/logger');

const config = require('@config/config');
const corsOptions = config.corsOptions;
const audioServer = config.audioServer;

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

// Use the notFound middleware
app.use(notFound);
// Use the errorHandler middleware
app.use(errorHandler);

// Starts the server, highlighting the use of a specific port for listening to incoming requests.
app.listen(audioServer.port, () => {
  logger.info(`Server listening at ${audioServer.protocol}://${audioServer.host}:${audioServer.port}`);
});