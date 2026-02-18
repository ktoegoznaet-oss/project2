const express = require('express');
const { query, getClient } = require('../config/database');
const { auth } = require('../middleware/auth');
const { orderLimiter } = require('../middleware/rateLimiter');
const { calculateOrderPrice, calculateCustomSongPrice, sanitizeInput } = require('../utils/helpers');
const liquidsoapService = require('../services/liquidsoap');
const djBot = require('../services/djBot');
const logger = require('../utils/logger');
const router = express.Router();

router.post('/song', auth, orderLimiter, async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { song_id, message = '' } = req.body;
    if (!song_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Укажите song_id' });
    }

    const songResult = await client.query('SELECT id, title, artist, order_price, file_path FROM songs WHERE id = $1 AND is_active = TRUE', [song_id]);
    if (songResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Песня не найдена' });
    }
    const song = songResult.rows[0];

    const userResult = await client.query('SELECT id, username, balance, subscription_type, free_orders_remaining FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    const user = userResult.rows[0];

    let pricePaid = 0;
    let usedFreeOrder = false;

    if (user.free_orders_remaining > 0) {
      usedFreeOrder = true;
      await client.query('UPDATE users SET free_orders_remaining = free_orders_remaining - 1 WHERE id = $1', [user.id]);
    } else {
      pricePaid = calculateOrderPrice(parseFloat(song.order_price), user.subscription_type);
      if (parseFloat(user.balance) < pricePaid) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Недостаточно средств на балансе', required: pricePaid, balance: parseFloat(user.balance) });
      }
      await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [pricePaid, user.id]);
    }

    const priority = user.subscription_type === 'premium' || user.subscription_type === 'vip' ? 1 : 0;
    const cleanMessage = sanitizeInput(message);

    const orderResult = await client.query(
      `INSERT INTO song_orders (user_id, song_id, message, price_paid, status, priority)
       VALUES ($1, $2, $3, $4, 'queued', $5)
       RETURNING id, song_id, message, price_paid, status, priority, created_at`,
      [user.id, song.id, cleanMessage, pricePaid, priority]
    );

    await client.query('COMMIT');

    const order = orderResult.rows[0];

    try {
      await djBot.generateAnnouncement(user.username, song.title, song.artist, cleanMessage);
      await liquidsoapService.queueSong(song.file_path, priority);
    } catch (serviceErr) {
      logger.error('Failed to queue song in liquidsoap', { error: serviceErr.message });
    }

    logger.info('Song ordered', { orderId: order.id, userId: user.id, songId: song.id, price: pricePaid, free: usedFreeOrder });

    res.status(201).json({
      order,
      used_free_order: usedFreeOrder,
      new_balance: usedFreeOrder ? parseFloat(user.balance) : parseFloat(user.balance) - pricePaid,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

router.post('/custom-song', auth, orderLimiter, async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { lyrics, style_description = '', reference_song_id, air_count = 1 } = req.body;

    if (!lyrics || lyrics.trim().length < 10) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Текст песни должен быть не менее 10 символов' });
    }

    const airCountNum = Math.max(1, Math.min(100, parseInt(air_count)));

    if (reference_song_id) {
      const refSong = await client.query('SELECT id FROM songs WHERE id = $1 FOR UPDATE', [reference_song_id]);
      if (refSong.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Референсная песня не найдена' });
      }
    }

    const userResult = await client.query('SELECT id, balance, subscription_type FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    const user = userResult.rows[0];

    const price = calculateCustomSongPrice(airCountNum, user.subscription_type);

    if (parseFloat(user.balance) < price) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Недостаточно средств', required: price, balance: parseFloat(user.balance) });
    }

    await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [price, user.id]);

    const result = await client.query(
      `INSERT INTO custom_song_orders (user_id, lyrics, style_description, reference_song_id, price, status, air_count)
       VALUES ($1, $2, $3, $4, $5, 'paid', $6)
       RETURNING id, lyrics, style_description, price, status, air_count, created_at`,
      [user.id, lyrics.trim(), sanitizeInput(style_description), reference_song_id || null, price, airCountNum]
    );

    await client.query('COMMIT');

    logger.info('Custom song ordered', { orderId: result.rows[0].id, userId: user.id, price });

    res.status(201).json({
      order: result.rows[0],
      new_balance: parseFloat(user.balance) - price,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

router.get('/my', auth, async (req, res, next) => {
  try {
    const songOrders = await query(
      `SELECT so.id, so.message, so.price_paid, so.status, so.created_at, so.played_at,
              s.title, s.artist, s.genre
       FROM song_orders so
       JOIN songs s ON so.song_id = s.id
       WHERE so.user_id = $1
       ORDER BY so.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    const customOrders = await query(
      `SELECT id, lyrics, style_description, price, status, air_count, aired_count, created_at, completed_at
       FROM custom_song_orders
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json({
      song_orders: songOrders.rows,
      custom_orders: customOrders.rows,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/price', auth, async (req, res, next) => {
  try {
    const { song_id, air_count } = req.query;

    if (song_id) {
      const songResult = await query('SELECT order_price FROM songs WHERE id = $1', [song_id]);
      if (songResult.rows.length === 0) {
        return res.status(404).json({ error: 'Песня не найдена' });
      }
      const price = calculateOrderPrice(parseFloat(songResult.rows[0].order_price), req.user.subscription_type);
      const hasFreeOrders = req.user.free_orders_remaining > 0;
      return res.json({ price, original_price: parseFloat(songResult.rows[0].order_price), free: hasFreeOrders });
    }

    if (air_count) {
      const price = calculateCustomSongPrice(parseInt(air_count), req.user.subscription_type);
      const basePrice = calculateCustomSongPrice(parseInt(air_count), null);
      return res.json({ price, original_price: basePrice });
    }

    res.status(400).json({ error: 'Укажите song_id или air_count' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
