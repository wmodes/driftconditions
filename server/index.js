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
const { corsOptions } = require('./config');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Middleware setup
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors(corsOptions));
app.use(cookieParser());

// Place the logging middleware after cookie-parser to ensure cookies are parsed
app.use((req, res, next) => {
  // console.log('Cookies: ', req.cookies);
  next();
});

// Require route modules
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const audioRoutes = require('./routes/audioRoutes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/audio', audioRoutes);

// Use the notFound middleware
app.use(notFound);

// Use the errorHandler middleware
app.use(errorHandler);

// Starts the server, highlighting the use of a specific port for listening to incoming requests.
app.listen(8080, () => {
  console.log('server listening on port 8080');
  console.log('No need to connect to this server, the client will do that for you.');
})