/**
 * Simple logger utility for the application
 */

const isDev = process.env.NODE_ENV !== 'production';

const logger = {
  error: (message, meta = {}) => {
    console.error(`[ERROR] ${message}`, meta);
  },
  
  warn: (message, meta = {}) => {
    console.warn(`[WARN] ${message}`, meta);
  },
  
  info: (message, meta = {}) => {
    console.info(`[INFO] ${message}`, meta);
  },
  
  debug: (message, meta = {}) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, meta);
    }
  }
};

module.exports = logger; 