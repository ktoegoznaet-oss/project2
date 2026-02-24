const express = require('express');
const { query } = require('../config/database');
const { setCache, getCache } = require('../config/redis');
const { auth } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const logger = require('../utils/logger');
const router = express.Router();

router.get('/now-playing', async (req, res, next) => {
  try {
    const cached = await getCache('now_playing');
    if (cached) {
      return res.json(cached);
    }

    res.json({
      title: 'Internet Radio',
      artist: 'Добро пожаловать',
      genre: '',
      duration: 0,
      cover_url: null,
      listeners: 0,
      started_at: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/now-playing', async (req, res, next) => {
  try {
    const { title, artist, file_path } = req.body;

    let song = null;
    if (file_path) {
      const result = await query('SELECT id, title, artist, genre, duration, cover_url FROM songs WHERE file_path = $1', [file_path]);
      if (result.rows.length > 0) {
        song = result.rows[0];
        await query('UPDATE songs SET play_count = play_count + 1 WHERE id = $1', [song.id]);
      }
    }

    const nowPlaying = {
      title: song?.title || title || 'Unknown',
      artist: song?.artist || artist || 'Unknown',
      genre: song?.genre || '',
      duration: song?.duration || 0,
      cover_url: song?.cover_url || null,
      song_id: song?.id || null,
      started_at: new Date().toISOString(),
    };

    await setCache('now_playing', nowPlaying, 600);

    if (song) {
      await query(
        'INSERT INTO listening_stats (song_id, started_at, duration_listened) VALUES ($1, NOW(), $2)',
        [song.id, song.duration || 0]
      );
    }

    // Закрываем предыдущие «играет» → «проиграна»
    await query("UPDATE song_orders SET status = 'played' WHERE status = 'playing'");

    const pendingOrders = await query(
      "SELECT so.id FROM song_orders so WHERE so.status = 'queued' AND so.song_id = $1 ORDER BY so.created_at LIMIT 1",
      [song?.id]
    );
    if (pendingOrders.rows.length > 0) {
      await query("UPDATE song_orders SET status = 'playing', played_at = NOW() WHERE id = $1", [pendingOrders.rows[0].id]);
    }

    logger.info('Now playing updated', { title: nowPlaying.title, artist: nowPlaying.artist });
    res.json({ ok: true, nowPlaying });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const cached = await getCache('stream_stats');
    if (cached) return res.json(cached);

    const totalSongs = await query('SELECT COUNT(*) FROM songs WHERE is_active = TRUE');
    const totalOrders = await query('SELECT COUNT(*) FROM song_orders');
    const totalUsers = await query('SELECT COUNT(*) FROM users');
    const todayOrders = await query("SELECT COUNT(*) FROM song_orders WHERE created_at > NOW() - INTERVAL '24 hours'");

    const stats = {
      total_songs: parseInt(totalSongs.rows[0].count),
      total_orders: parseInt(totalOrders.rows[0].count),
      total_users: parseInt(totalUsers.rows[0].count),
      today_orders: parseInt(todayOrders.rows[0].count),
    };

    await setCache('stream_stats', stats, 60);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
