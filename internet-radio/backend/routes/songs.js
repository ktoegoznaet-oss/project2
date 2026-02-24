const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const { query } = require('../config/database');
const { auth, optionalAuth } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const { fileHash } = require('../utils/helpers');
const logger = require('../utils/logger');
const router = express.Router();

// Извлечь title/artist/genre/duration из тегов файла через ffprobe
const extractAudioMetadata = (filePath) =>
  new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err || !data) return resolve(null);
      const tags = data?.format?.tags || {};
      resolve({
        title:    tags.title    || tags.TITLE    || null,
        artist:   tags.artist   || tags.ARTIST   || tags.album_artist || null,
        genre:    tags.genre    || tags.GENRE    || null,
        duration: Math.round(data?.format?.duration || 0),
      });
    });
  });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.MUSIC_DIR || '/app/music');
  },
  filename: (req, file, cb) => {
    const uniqueName = crypto.randomBytes(16).toString('hex') + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp3', '.wav', '.ogg', '.flac'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Допустимые форматы: MP3, WAV, OGG, FLAC'));
    }
  },
});

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { genre, search, page = 1, limit = 20, sort = 'created_at' } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const params = [];
    const conditions = ['s.is_active = TRUE'];

    if (genre && genre !== 'all') {
      params.push(genre);
      conditions.push(`s.genre = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(s.title ILIKE $${params.length} OR s.artist ILIKE $${params.length})`);
    }

    const sortOptions = {
      created_at: 's.created_at DESC',
      play_count: 's.play_count DESC',
      title: 's.title ASC',
      artist: 's.artist ASC',
      price: 's.order_price ASC',
    };
    const orderBy = sortOptions[sort] || 's.created_at DESC';

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await query(`SELECT COUNT(*) FROM songs s ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const result = await query(
      `SELECT s.id, s.title, s.artist, s.genre, s.duration, s.cover_url, s.order_price, s.play_count, s.created_at
       FROM songs s ${where}
       ORDER BY ${orderBy}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      songs: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/genres', async (req, res, next) => {
  try {
    const result = await query("SELECT DISTINCT genre FROM songs WHERE is_active = TRUE AND genre IS NOT NULL ORDER BY genre");
    res.json({ genres: result.rows.map(r => r.genre) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, title, artist, genre, duration, cover_url, order_price, play_count, created_at FROM songs WHERE id = $1 AND is_active = TRUE',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Песня не найдена' });
    }
    res.json({ song: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/upload', auth, adminOnly, upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const fullPath = path.join(process.env.MUSIC_DIR || '/app/music', req.file.filename);
    const { genre: formGenre, order_price } = req.body;

    // Ручные данные имеют приоритет; если не указаны — берём из тегов файла
    let title  = req.body.title?.trim()  || '';
    let artist = req.body.artist?.trim() || '';

    if (!title || !artist) {
      const tags = await extractAudioMetadata(fullPath);
      if (!title)  title  = tags?.title  || '';
      if (!artist) artist = tags?.artist || '';
    }

    // Последний резерв — имя файла
    if (!title)  title  = path.basename(req.file.originalname, path.extname(req.file.originalname));
    if (!artist) artist = 'Unknown Artist';

    // Длительность из тегов (если не передана явно)
    let duration = parseInt(req.body.duration) || 0;
    if (!duration) {
      const tags = await extractAudioMetadata(fullPath);
      duration = tags?.duration || 0;
    }

    // Жанр из тегов, если форма не указала
    let genre = formGenre || '';
    if (!genre) {
      const tags = await extractAudioMetadata(fullPath);
      genre = tags?.genre || 'other';
    }

    const filePath = `/music/${req.file.filename}`;
    const hash = crypto.randomBytes(16).toString('hex');

    const result = await query(
      `INSERT INTO songs (title, artist, genre, file_path, file_hash, order_price, duration)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, artist, genre, order_price, created_at`,
      [title, artist, genre, filePath, hash, parseFloat(order_price) || 100, duration]
    );

    logger.info('Song uploaded', { songId: result.rows[0].id, title, artist });
    res.status(201).json({ song: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
