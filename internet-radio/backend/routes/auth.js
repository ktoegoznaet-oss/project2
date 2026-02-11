const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { auth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { sanitizeInput } = require('../utils/helpers');
const router = express.Router();

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Заполните все поля: username, email, password' });
    }

    const cleanUsername = sanitizeInput(username);
    if (cleanUsername.length < 3 || cleanUsername.length > 50) {
      return res.status(400).json({ error: 'Имя пользователя должно быть от 3 до 50 символов' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Некорректный email' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1 OR username = $2', [email.toLowerCase(), cleanUsername]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Пользователь с таким email или именем уже существует' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, role, balance, subscription_type',
      [cleanUsername, email.toLowerCase(), passwordHash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Заполните email и password' });
    }

    const result = await query('SELECT id, username, email, password_hash, role, balance, subscription_type, subscription_expires, free_orders_remaining FROM users WHERE email = $1', [email.toLowerCase()]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    await query('UPDATE users SET last_active = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    const { password_hash, ...userData } = user;
    res.json({ token, user: userData });
  } catch (err) {
    next(err);
  }
});

router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
