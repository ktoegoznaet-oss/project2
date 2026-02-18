const express = require('express');
const { query } = require('../config/database');
const { auth } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const statsAgent = require('../services/statsAgent');
const logger = require('../utils/logger');
const router = express.Router();

router.get('/dashboard', auth, adminOnly, async (req, res, next) => {
  try {
    const [usersCount, songsCount, ordersToday, revenue, activeListeners, pendingCustom] = await Promise.all([
      query('SELECT COUNT(*) FROM users'),
      query('SELECT COUNT(*) FROM songs WHERE is_active = TRUE'),
      query("SELECT COUNT(*) FROM song_orders WHERE created_at > NOW() - INTERVAL '24 hours'"),
      query("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'succeeded' AND created_at > NOW() - INTERVAL '30 days'"),
      query("SELECT COUNT(DISTINCT user_id) as count FROM listening_stats WHERE started_at > NOW() - INTERVAL '1 hour'"),
      query("SELECT COUNT(*) FROM custom_song_orders WHERE status IN ('new', 'paid', 'in_production')"),
    ]);

    res.json({
      users: parseInt(usersCount.rows[0].count),
      songs: parseInt(songsCount.rows[0].count),
      orders_today: parseInt(ordersToday.rows[0].count),
      revenue_30d: parseFloat(revenue.rows[0].total),
      active_listeners: parseInt(activeListeners.rows[0].count),
      pending_custom_orders: parseInt(pendingCustom.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/custom-orders', auth, adminOnly, async (req, res, next) => {
  try {
    const { status } = req.query;
    let whereClause = '';
    const params = [];

    if (status) {
      params.push(status);
      whereClause = `WHERE co.status = $1`;
    }

    const result = await query(
      `SELECT co.*, u.username, u.email,
              rs.title as reference_title, rs.artist as reference_artist
       FROM custom_song_orders co
       JOIN users u ON co.user_id = u.id
       LEFT JOIN songs rs ON co.reference_song_id = rs.id
       ${whereClause}
       ORDER BY co.created_at DESC
       LIMIT 100`,
      params
    );

    res.json({ orders: result.rows });
  } catch (err) {
    next(err);
  }
});

router.put('/custom-orders/:id', auth, adminOnly, async (req, res, next) => {
  try {
    const { status, admin_notes, result_song_id } = req.body;
    const orderId = req.params.id;

    const validStatuses = ['new', 'paid', 'in_production', 'review', 'approved', 'aired', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Неверный статус' });
    }

    const updates = [];
    const params = [];
    let paramIdx = 1;

    if (status) {
      updates.push(`status = $${paramIdx++}`);
      params.push(status);
    }
    if (admin_notes !== undefined) {
      updates.push(`admin_notes = $${paramIdx++}`);
      params.push(admin_notes);
    }
    if (result_song_id) {
      updates.push(`result_song_id = $${paramIdx++}`);
      params.push(result_song_id);
    }
    if (status === 'approved') {
      updates.push(`completed_at = NOW()`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нечего обновлять' });
    }

    params.push(orderId);
    const result = await query(
      `UPDATE custom_song_orders SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    if (status === 'approved' && result_song_id) {
      await query('UPDATE songs SET is_active = TRUE WHERE id = $1', [result_song_id]);
    }

    logger.info('Custom order updated', { orderId, status });
    res.json({ order: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.get('/song-orders', auth, adminOnly, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let whereClause = '';

    if (status) {
      params.push(status);
      whereClause = `WHERE so.status = $1`;
    }

    params.push(parseInt(limit));
    params.push(offset);

    const result = await query(
      `SELECT so.*, u.username, s.title, s.artist
       FROM song_orders so
       JOIN users u ON so.user_id = u.id
       JOIN songs s ON so.song_id = s.id
       ${whereClause}
       ORDER BY so.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ orders: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/users', auth, adminOnly, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, username, email, role, balance, subscription_type, subscription_expires, created_at, last_active
       FROM users ORDER BY created_at DESC LIMIT 200`
    );
    res.json({ users: result.rows });
  } catch (err) {
    next(err);
  }
});

router.put('/users/:id', auth, adminOnly, async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { role, balance_add } = req.body;
    const updates = [];
    const params = [];
    let paramIdx = 1;

    if (role) {
      const validRoles = ['user', 'moderator', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Неверная роль' });
      }
      updates.push(`role = $${paramIdx++}`);
      params.push(role);
    }

    if (balance_add !== undefined && balance_add !== null) {
      const amount = parseFloat(balance_add);
      if (isNaN(amount)) {
        return res.status(400).json({ error: 'Неверная сумма' });
      }
      updates.push(`balance = balance + $${paramIdx++}`);
      params.push(amount);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нечего обновлять' });
    }

    params.push(userId);
    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING id, username, email, role, balance, subscription_type, subscription_expires, created_at, last_active`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    logger.info('User updated by admin', { userId, role, balance_add });
    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', auth, adminOnly, async (req, res, next) => {
  try {
    const { question, type } = req.query;

    if (question) {
      const answer = await statsAgent.askAnalytics(question);
      return res.json({ answer });
    }

    if (type === 'top-songs') {
      const data = await statsAgent.getTopSongs(req.query.period || '7d');
      return res.json({ data });
    }

    if (type === 'prime-time') {
      const data = await statsAgent.getPrimeTime();
      return res.json({ data });
    }

    if (type === 'revenue') {
      const data = await statsAgent.getRevenueReport(req.query.period || '30d');
      return res.json({ data });
    }

    const [topSongs, primeTime, revenue] = await Promise.all([
      statsAgent.getTopSongs('7d'),
      statsAgent.getPrimeTime(),
      statsAgent.getRevenueReport('30d'),
    ]);

    res.json({ top_songs: topSongs, prime_time: primeTime, revenue });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
