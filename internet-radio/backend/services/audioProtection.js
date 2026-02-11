const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { setCache, getCache, deleteCache } = require('../config/redis');
const logger = require('../utils/logger');

const execAsync = promisify(exec);
const HLS_DIR = process.env.HLS_SEGMENT_DIR || '/app/hls';
const MUSIC_DIR = process.env.MUSIC_DIR || '/app/music';

const generateKeyToken = async (userId) => {
  const token = crypto.randomBytes(32).toString('hex');
  const key = `hls_key:${token}`;
  await setCache(key, { userId, createdAt: Date.now() }, 3600);
  return token;
};

const validateKeyToken = async (token) => {
  const key = `hls_key:${token}`;
  const data = await getCache(key);
  if (!data) return null;
  await deleteCache(key);
  return data;
};

const generateHLSStream = async (songId, filePath) => {
  try {
    const outputDir = path.join(HLS_DIR, songId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const keyFile = path.join(outputDir, 'enc.key');
    const keyInfoFile = path.join(outputDir, 'enc.keyinfo');
    const key = crypto.randomBytes(16);
    const iv = crypto.randomBytes(16);

    fs.writeFileSync(keyFile, key);
    fs.writeFileSync(keyInfoFile, [
      `/api/stream/hls-key/${songId}`,
      keyFile,
      iv.toString('hex'),
    ].join('\n'));

    const inputPath = path.join(MUSIC_DIR, path.basename(filePath));
    const outputPath = path.join(outputDir, 'stream.m3u8');

    await execAsync(
      `ffmpeg -y -i "${inputPath}" -c:a aac -b:a 192k -hls_time 10 -hls_list_size 0 ` +
      `-hls_key_info_file "${keyInfoFile}" -hls_segment_filename "${outputDir}/seg_%03d.ts" "${outputPath}"`,
      { timeout: 60000 }
    );

    logger.info('HLS stream generated', { songId, outputDir });
    return { playlistUrl: `/api/stream/hls/${songId}/stream.m3u8` };
  } catch (err) {
    logger.error('HLS generation failed', { songId, error: err.message });
    throw err;
  }
};

const serveHLSFile = (req, res) => {
  const { songId, filename } = req.params;
  const filePath = path.join(HLS_DIR, songId, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Segment not found' });
  }

  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(HLS_DIR))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.m3u8': 'application/vnd.apple.mpegurl',
    '.ts': 'video/mp2t',
    '.key': 'application/octet-stream',
  };

  res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
};

const serveHLSKey = async (req, res) => {
  const { songId } = req.params;
  const token = req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  const valid = await validateKeyToken(token);
  if (!valid) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  const keyPath = path.join(HLS_DIR, songId, 'enc.key');
  if (!fs.existsSync(keyPath)) {
    return res.status(404).json({ error: 'Key not found' });
  }

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(keyPath).pipe(res);
};

module.exports = { generateKeyToken, validateKeyToken, generateHLSStream, serveHLSFile, serveHLSKey };
