// core/utils/logger.js
const winston = require('winston');
const config = require('./config');

// create a logger
function createLogger(moduleName) {
  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
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
            return `${info.timestamp} ${info.level}: ${info.message}${stack}`;
          })
        ),
      }),
      // File transport using logfile from config
      new winston.transports.File({ filename: config.adminServer.logfile }),
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


// Create the default logger
const logger = createLogger();

// Method to set or get module-specific loggers
logger.custom = (moduleName, level = 'info') => {
    const moduleLogger = createLogger(moduleName);
    moduleLogger.level = level;
    return moduleLogger;
};

module.exports = logger;