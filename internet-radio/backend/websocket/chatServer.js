const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { sanitizeInput } = require('../utils/helpers');
const logger = require('../utils/logger');

let wss = null;
let djBot = null;

const initWebSocket = (server) => {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.user = null;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (rawData) => {
      try {
        const data = JSON.parse(rawData.toString());

        switch (data.type) {
          case 'auth':
            await handleAuth(ws, data.token);
            break;
          case 'chat_message':
            await handleChatMessage(ws, data);
            break;
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          default:
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
        }
      } catch (err) {
        logger.error('WebSocket message error', { error: err.message });
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      logger.debug('WebSocket client disconnected', { user: ws.user?.username });
    });

    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Подключено к чату',
      listeners: getListenersCount(),
    }));
  });

  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  // Lazy-load djBot to avoid circular dependency (djBot → liquidsoap, server → chatServer → djBot)
  djBot = require('../services/djBot');

  logger.info('WebSocket server initialized');
  return wss;
};

const handleAuth = async (ws, token) => {
  try {
    if (!token) {
      ws.send(JSON.stringify({ type: 'auth_error', message: 'Токен не предоставлен' }));
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query('SELECT id, username, role FROM users WHERE id = $1', [decoded.userId]);

    if (result.rows.length === 0) {
      ws.send(JSON.stringify({ type: 'auth_error', message: 'Пользователь не найден' }));
      return;
    }

    ws.user = result.rows[0];
    ws.send(JSON.stringify({ type: 'auth_success', user: ws.user }));
    logger.debug('WebSocket user authenticated', { username: ws.user.username });
  } catch (err) {
    ws.send(JSON.stringify({ type: 'auth_error', message: 'Невалидный токен' }));
  }
};

const handleChatMessage = async (ws, data) => {
  if (!ws.user) {
    ws.send(JSON.stringify({ type: 'error', message: 'Авторизуйтесь для отправки сообщений' }));
    return;
  }

  const message = sanitizeInput(data.message || '');
  if (!message || message.length > 500) {
    ws.send(JSON.stringify({ type: 'error', message: 'Сообщение пустое или слишком длинное (макс. 500 символов)' }));
    return;
  }

  const result = await query(
    "INSERT INTO chat_messages (user_id, message, message_type) VALUES ($1, $2, 'text') RETURNING id, message, created_at",
    [ws.user.id, message]
  );

  const chatMessage = {
    type: 'chat_message',
    id: result.rows[0].id,
    message: result.rows[0].message,
    username: ws.user.username,
    role: ws.user.role,
    is_bot: false,
    message_type: 'text',
    created_at: result.rows[0].created_at,
  };

  broadcast(chatMessage);

  // Trigger DJ bot response (non-blocking, with rate limiting)
  if (djBot && message.length > 2) {
    // Respond to ~30% of messages to avoid spam, or always respond to questions
    const isQuestion = message.includes('?') || message.startsWith('@dj') || message.toLowerCase().includes('бот') || message.toLowerCase().includes('диджей') || message.toLowerCase().includes('толик');
    if (isQuestion || Math.random() < 0.3) {
      djBot.generateChatResponse(ws.user.username, message).catch(err => {
        logger.warn('DJ bot chat response error', { error: err.message });
      });
    }
  }
};

const broadcast = (data) => {
  if (!wss) return;
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

const broadcastNowPlaying = (nowPlaying) => {
  broadcast({ type: 'now_playing', ...nowPlaying });
};

const broadcastOrderUpdate = (order) => {
  broadcast({ type: 'order_update', order });
};

const broadcastDJMessage = (message) => {
  broadcast({ type: 'dj_message', message });
};

const getListenersCount = () => {
  if (!wss) return 0;
  let count = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) count++;
  });
  return count;
};

module.exports = { initWebSocket, broadcast, broadcastNowPlaying, broadcastOrderUpdate, broadcastDJMessage, getListenersCount };
