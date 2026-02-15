require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const path = require('path');

const { connectRedis } = require('./config/redis');
const { pool } = require('./config/database');
const { initWebSocket } = require('./websocket/chatServer');
const { generalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { startHourlySummaries } = require('./services/djBot');

const authRoutes = require('./routes/auth');
const songsRoutes = require('./routes/songs');
const ordersRoutes = require('./routes/orders');
const paymentsRoutes = require('./routes/payments');
const subscriptionsRoutes = require('./routes/subscriptions');
const chatRoutes = require('./routes/chat');
const streamRoutes = require('./routes/stream');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like curl, mobile apps, same-origin via nginx)
    if (!origin) return callback(null, true);
    // Allow any origin — Nginx handles access control
    return callback(null, true);
  },
  credentials: true,
}));
app.use(morgan('short'));
app.use(generalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/songs', songsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/admin', adminRoutes);

const audioProtection = require('./services/audioProtection');

app.get('/api/stream/hls/:songId/:filename', audioProtection.serveHLSFile);
app.get('/api/stream/hls-key/:songId', audioProtection.serveHLSKey);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const PORT = parseInt(process.env.PORT) || 3000;

const start = async () => {
  try {
    await connectRedis();
    logger.info('Redis connected');

    await pool.query('SELECT 1');
    logger.info('PostgreSQL connected');

    initWebSocket(server);
    logger.info('WebSocket server started');

    startHourlySummaries();
    logger.info('DJ hourly summaries started');

    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message, stack: err.stack });
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  server.close();
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  server.close();
  await pool.end();
  process.exit(0);
});

start();
