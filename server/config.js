// config.js
// This file contains the configuration for the server

// Load environment variables from .env file
require('dotenv').config();

module.exports = {
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
  },
  authCookie: {
    cookieExpires: 7 * 24 * 60 * 60 * 1000, // 7 days in
  },
  corsOptions: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
  upload: {
    uploadFileDir: '/Users/wmodes/dev/interference/uploads',
    tmpFileDir: '/Users/wmodes/dev/interference/uploads/tmp',
  }
};