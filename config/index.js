// index.js in the root of the 'config' module

// Require each of the module files
const config = require('./config');
const database = require('./database');
const logger = require('./logger');

// Export the modules so they can be imported from elsewhere
module.exports = {
  config,
  database,
  logger
};
