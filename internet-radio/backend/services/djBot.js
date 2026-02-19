const { chatCompletion } = require('../config/openai');
const { query } = require('../config/database');
const liquidsoapService = require('./liquidsoap');
const logger = require('../utils/logger');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');

const execAsync = promisify(exec);
const JINGLES_DIR = process.env.JINGLES_DIR || '/app/jingles';

// Will be set by server.js after chatServer init (avoids circular dependency)
let broadcastFn = null;

const setBroadcast = (fn) => {
  broadcastFn = fn;
};

const broadcastDJ = (text) => {
  if (!broadcastFn) return;
  broadcastFn({
    type: 'dj_message',
    id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'),
    message: `🎙 DJ Толик: ${text}`,
    username: 'DJ Толик',
    role: 'bot',
    is_bot: true,
    message_type: 'dj',
    created_at: new Date().toISOString(),
  });
};

const generateAnnouncement = async (username, songTitle, artist, userMessage) => {
  try {
    const prompt = `Ты — энергичный радиоведущий. Слушатель ${username} заказал песню ${artist} - ${songTitle}. Сообщение: ${userMessage || 'без сообщения'}. Сгенерируй короткое (2-3 предложения) объявление для радио. Будь дружелюбным и позитивным. Не используй эмодзи.`;

    const text = await chatCompletion([
      { role: 'system', content: 'Ты — энергичный и позитивный ведущий интернет-радио по имени Толик. Говори по-русски. Коротко и ярко.' },
      { role: 'user', content: prompt },
    ], { max_tokens: 200, temperature: 0.8 });

    logger.info('DJ announcement generated', { text });

    const audioPath = await textToSpeech(text);

    if (audioPath) {
      try {
        await liquidsoapService.queueJingle(audioPath);
      } catch (err) {
        logger.warn('Failed to queue jingle, will play without it', { error: err.message });
      }
    }

    await query(
      "INSERT INTO chat_messages (message, is_bot, message_type) VALUES ($1, TRUE, 'dj')",
      [`🎙 DJ Толик: ${text}`]
    );

    broadcastDJ(text);

    return { text, audioPath };
  } catch (err) {
    logger.error('DJ announcement generation failed', { error: err.message });
    return { text: null, audioPath: null };
  }
};

const generateChatResponse = async (username, userMessage) => {
  try {
    const recentMessages = await query(
      `SELECT message, is_bot, message_type FROM chat_messages
       ORDER BY created_at DESC LIMIT 10`
    );

    const context = recentMessages.rows.reverse().map(m =>
      m.is_bot ? { role: 'assistant', content: m.message } : { role: 'user', content: m.message }
    );

    const text = await chatCompletion([
      {
        role: 'system',
        content: 'Ты — дружелюбный DJ по имени Толик, ведущий интернет-радио RadioWave. Отвечай по-русски, коротко (1-3 предложения). Ты ведёшь эфир, общаешься со слушателями, рассказываешь о музыке, шутишь. Не используй эмодзи. Если тебя спрашивают о чём-то, что ты не знаешь — отвечай с юмором. Твоё имя — Толик.',
      },
      ...context,
      { role: 'user', content: `Слушатель ${username} пишет: ${userMessage}` },
    ], { max_tokens: 200, temperature: 0.9 });

    logger.info('DJ chat response generated', { text, username });

    await query(
      "INSERT INTO chat_messages (message, is_bot, message_type) VALUES ($1, TRUE, 'dj')",
      [`🎙 DJ Толик: ${text}`]
    );

    broadcastDJ(text);

    return text;
  } catch (err) {
    logger.error('DJ chat response failed', { error: err.message });
    return null;
  }
};

const generateHourlySummary = async () => {
  try {
    const now = new Date();
    const hour = now.getHours();
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;

    const ordersResult = await query(
      "SELECT COUNT(*) as count FROM song_orders WHERE created_at > NOW() - INTERVAL '1 hour'"
    );
    const orderCount = parseInt(ordersResult.rows[0].count);

    const listenersResult = await query(
      "SELECT COUNT(DISTINCT ip_address) as count FROM listening_stats WHERE started_at > NOW() - INTERVAL '1 hour'"
    );
    const listenerCount = parseInt(listenersResult.rows[0].count);

    const prompt = `Ты — ведущий интернет-радио. Сейчас ${timeStr}. За последний час слушатели заказали ${orderCount} песен. Нас слушают примерно ${listenerCount} человек. Сгенерируй короткую (2-3 предложения) подводку. Не используй эмодзи. Будь позитивным.`;

    const text = await chatCompletion([
      { role: 'system', content: 'Ты — ведущий интернет-радио по имени Толик. Говори по-русски. Коротко и ярко.' },
      { role: 'user', content: prompt },
    ], { max_tokens: 200, temperature: 0.8 });

    const audioPath = await textToSpeech(text);

    if (audioPath) {
      try {
        await liquidsoapService.queueJingle(audioPath);
      } catch (err) {
        logger.warn('Failed to queue hourly jingle', { error: err.message });
      }
    }

    await query(
      "INSERT INTO chat_messages (message, is_bot, message_type) VALUES ($1, TRUE, 'dj')",
      [`🎙 DJ Толик: ${text}`]
    );

    broadcastDJ(text);

    logger.info('Hourly summary generated', { text });
    return { text, audioPath };
  } catch (err) {
    logger.error('Hourly summary generation failed', { error: err.message });
    return { text: null, audioPath: null };
  }
};

const textToSpeech = async (text) => {
  try {
    if (!fs.existsSync(JINGLES_DIR)) {
      fs.mkdirSync(JINGLES_DIR, { recursive: true });
    }

    const filename = `jingle_${crypto.randomBytes(8).toString('hex')}.mp3`;
    const outputPath = path.join(JINGLES_DIR, filename);

    if (process.env.ELEVENLABS_API_KEY) {
      return await elevenLabsTTS(text, outputPath);
    }

    return await edgeTTS(text, outputPath);
  } catch (err) {
    logger.error('TTS generation failed', { error: err.message });
    return null;
  }
};

const edgeTTS = async (text, outputPath) => {
  try {
    const escapedText = text.replace(/"/g, '\\"').replace(/'/g, "\\'");
    await execAsync(`edge-tts --voice ru-RU-DmitryNeural --text "${escapedText}" --write-media "${outputPath}"`, {
      timeout: 30000,
    });

    if (fs.existsSync(outputPath)) {
      logger.info('Edge-TTS audio generated', { outputPath });
      return outputPath;
    }
    return null;
  } catch (err) {
    logger.warn('edge-tts failed, returning null', { error: err.message });
    return null;
  }
};

const elevenLabsTTS = async (text, outputPath) => {
  try {
    const fetch = require('node-fetch');
    const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const buffer = await response.buffer();
    fs.writeFileSync(outputPath, buffer);
    logger.info('ElevenLabs TTS audio generated', { outputPath });
    return outputPath;
  } catch (err) {
    logger.warn('ElevenLabs TTS failed, falling back to edge-tts', { error: err.message });
    return edgeTTS(text, outputPath);
  }
};

let hourlyInterval = null;

const startHourlySummaries = () => {
  if (hourlyInterval) clearInterval(hourlyInterval);
  hourlyInterval = setInterval(() => {
    generateHourlySummary();
  }, 60 * 60 * 1000);
  logger.info('Hourly DJ summaries started');
};

const stopHourlySummaries = () => {
  if (hourlyInterval) {
    clearInterval(hourlyInterval);
    hourlyInterval = null;
  }
};

module.exports = {
  generateAnnouncement,
  generateChatResponse,
  generateHourlySummary,
  textToSpeech,
  startHourlySummaries,
  stopHourlySummaries,
  setBroadcast,
};
