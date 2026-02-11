const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query('SELECT id, username, email, role, balance, subscription_type, subscription_expires, free_orders_remaining FROM users WHERE id = $1', [decoded.userId]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    const user = result.rows[0];

    if (user.subscription_expires && new Date(user.subscription_expires) < new Date()) {
      await query('UPDATE users SET subscription_type = NULL, subscription_expires = NULL, free_orders_remaining = 0 WHERE id = $1', [user.id]);
      user.subscription_type = null;
      user.subscription_expires = null;
      user.free_orders_remaining = 0;
    }

    await query('UPDATE users SET last_active = NOW() WHERE id = $1', [user.id]);

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Токен истёк' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Невалидный токен' });
    }
    next(err);
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return next();
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query('SELECT id, username, email, role, balance, subscription_type, subscription_expires, free_orders_remaining FROM users WHERE id = $1', [decoded.userId]);

    if (result.rows.length > 0) {
      req.user = result.rows[0];
    }
  } catch (err) {
    // Token invalid — continue as unauthenticated
  }
  next();
};

module.exports = { auth, optionalAuth };
