const isDev = process.env.NODE_ENV !== 'production';

const timestamp = () => new Date().toISOString();

const logger = {
  info: (message, meta = {}) => {
    console.log(JSON.stringify({ level: 'info', time: timestamp(), message, ...meta }));
  },
  warn: (message, meta = {}) => {
    console.warn(JSON.stringify({ level: 'warn', time: timestamp(), message, ...meta }));
  },
  error: (message, meta = {}) => {
    console.error(JSON.stringify({ level: 'error', time: timestamp(), message, ...meta }));
  },
  debug: (message, meta = {}) => {
    if (isDev) {
      console.log(JSON.stringify({ level: 'debug', time: timestamp(), message, ...meta }));
    }
  },
};

module.exports = logger;
