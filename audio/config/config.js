// config.js
// This file contains the configuration for the server

// WARNNG: This file is hardlinked to server/config.js and audio/config/config.js

// Load environment variables from .env file
require('dotenv').config();

module.exports = {
  server: {
    host: 'localhost',
    port: 8081,
    logfile: '/Users/wmodes/dev/interference/logs/audioserver.log',
  },
  dbConfig: {
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: process.env.DATABASE_PASSWORD,
    database: 'interference',
  },
  bcrypt: {
    saltRounds: 10,
  },
  authToken: {
    jwtSecretKey: process.env.JWT_SECRET_KEY,
    tokenExpires: '7d',
    tokenRefresh: 3600 * 1000,
  },
  authCookie: {
    cookieExpires: 7 * 24 * 60 * 60 * 1000, // 7 days in
  },
  corsOptions: {
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    origin: 'http://localhost:8081',
    credentials: true,
  },
  upload: {
    uploadFileDir: '/Users/wmodes/dev/interference/uploads',
    tmpFileDir: '/Users/wmodes/dev/interference/uploads/tmp',
  }
};