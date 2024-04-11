// index.js - primary server code including:
//   - User registration and authentication
//   - User profiles and modifying user information
//   - Audio upload and management
//   - Protected routes and middleware
//   - Database connection and queries
//   - File upload and processing
//   - JWT token generation and verification
//   - Error handling and logging
//   - CORS and cookie management

const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { corsOptions } = require('./config/config');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const logger = require('./config/logger');

const config = require('./config/config');
const server = config.adminServer;

// Middleware setup
// app.use(bodyParser.urlencoded({extended: false}));
// app.use(bodyParser.json());
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
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const audioRoutes = require('./routes/audioRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const roleRoutes = require('./routes/roleRoutes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/recipe', recipeRoutes);
app.use('/api/role', roleRoutes);

// Use the notFound middleware
app.use(notFound);

// Use the errorHandler middleware
app.use(errorHandler);

// Starts the server, highlighting the use of a specific port for listening to incoming requests.
// Starts the server, highlighting the use of a specific port for listening to incoming requests.
app.listen(server.port, () => {
  logger.info(`Server listening at ${server.protocol}://${server.host}:${server.port}`);
});