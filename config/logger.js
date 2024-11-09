/**
 * @file Logger module for creating and managing loggers.
 */

const winston = require('winston');
const config = require('./config');

/**
 * Creates a logger with the specified module name.
 *
 * @param {string} [moduleName] - The name of the module to be included in log messages.
 * @returns {winston.Logger} The configured logger instance.
 */
function createLogger(moduleName) {
  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.printf(info => {
        // Check if the log info contains a stack trace
        const stack = info.stack ? `\nStack: ${info.stack}` : '';
        const moduleNameString = moduleName ? `[${moduleName}]` : '';
        return `${info.timestamp} ${info.level}: ${moduleNameString} ${info.message}${stack}`;
      })
    ),
    defaultMeta: { service: 'user-service' },
    transports: [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(info => {
            // Check if the log info contains a stack trace
            const stack = info.stack ? `\nStack: ${info.stack}` : '';
            const moduleNameString = moduleName ? `[${moduleName}]` : '';
            return `${info.timestamp} ${info.level}: ${moduleNameString} ${info.message}${stack}`;
          })
        ),
      }),
      // File transport using logfile from config
      // new winston.transports.File({ filename: config.adminServer.logfile }),
    ],
  });
}

// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
// //
// if (process.env.NODE_ENV !== 'production') {
//   logger.add(new winston.transports.Console({
//     format: winston.format.simple(),
//   }));
// }

/**
 * Default logger instance.
 */
const logger = createLogger();

/**
 * Method to create or get module-specific loggers.
 *
 * @param {string} moduleName - The name of the module.
 * @param {string} [level='info'] - The log level.
 * @returns {winston.Logger} The module-specific logger instance.
 */
logger.custom = (moduleName, level = 'info') => {
  const moduleLogger = createLogger(moduleName);
  moduleLogger.level = level;
  return moduleLogger;
};

module.exports = logger;
