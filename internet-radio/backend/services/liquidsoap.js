const net = require('net');
const logger = require('../utils/logger');

const TELNET_HOST = process.env.LIQUIDSOAP_TELNET_HOST || 'icecast';
const TELNET_PORT = parseInt(process.env.LIQUIDSOAP_TELNET_PORT) || 1234;
const TIMEOUT = 5000;

const sendCommand = (command) => {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let data = '';

    client.setTimeout(TIMEOUT);

    client.connect(TELNET_PORT, TELNET_HOST, () => {
      client.write(command + '\n');
    });

    client.on('data', (chunk) => {
      data += chunk.toString();
      if (data.includes('END') || data.includes('\n')) {
        client.end();
      }
    });

    client.on('end', () => {
      resolve(data.trim());
    });

    client.on('timeout', () => {
      client.destroy();
      reject(new Error('Liquidsoap telnet timeout'));
    });

    client.on('error', (err) => {
      reject(new Error(`Liquidsoap connection error: ${err.message}`));
    });
  });
};

const queueSong = async (filePath, priority = 0) => {
  try {
    const queueName = priority > 0 ? 'priority_queue' : 'request_queue';
    const response = await sendCommand(`${queueName}.push ${filePath}`);
    logger.info('Song queued in Liquidsoap', { filePath, priority, response });
    return response;
  } catch (err) {
    logger.error('Failed to queue song', { filePath, error: err.message });
    throw err;
  }
};

const queueJingle = async (jinglePath) => {
  try {
    const response = await sendCommand(`jingle_queue.push ${jinglePath}`);
    logger.info('Jingle queued', { jinglePath, response });
    return response;
  } catch (err) {
    logger.error('Failed to queue jingle', { jinglePath, error: err.message });
    throw err;
  }
};

const skip = async () => {
  try {
    const response = await sendCommand('main.skip');
    logger.info('Track skipped');
    return response;
  } catch (err) {
    logger.error('Failed to skip track', { error: err.message });
    throw err;
  }
};

const getStatus = async () => {
  try {
    const remaining = await sendCommand('request_queue.queue');
    return {
      queue: remaining.split('\n').filter(l => l.trim()),
    };
  } catch (err) {
    logger.error('Failed to get Liquidsoap status', { error: err.message });
    return { queue: [] };
  }
};

module.exports = { sendCommand, queueSong, queueJingle, skip, getStatus };
