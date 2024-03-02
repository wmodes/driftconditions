// database.js - database connection setup
// This file contains the database connection setup using the mysql2 package.
//
// The database connection is created and exported as a pool to be used throughout the application.

const mysql = require('mysql2');
const { dbConfig } = require('./config'); // Ensure the path to config.js is correct

const pool = mysql.createPool(dbConfig);

module.exports = pool;