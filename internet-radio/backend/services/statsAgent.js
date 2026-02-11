const { chatCompletion } = require('../config/openai');
const { readonlyQuery } = require('../config/database');
const { getCache, setCache } = require('../config/redis');
const logger = require('../utils/logger');

const CACHE_TTL = 300;

const periodToInterval = (period) => {
  const map = {
    '1d': '1 day',
    '7d': '7 days',
    '30d': '30 days',
    '90d': '90 days',
    '1y': '365 days',
  };
  return map[period] || '7 days';
};

const getTopSongs = async (period = '7d') => {
  const cacheKey = `stats:top_songs:${period}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const interval = periodToInterval(period);

  const result = await readonlyQuery(
    `SELECT s.id, s.title, s.artist, s.genre,
            COUNT(so.id) as order_count,
            s.play_count,
            COALESCE(SUM(so.price_paid), 0) as revenue
     FROM songs s
     LEFT JOIN song_orders so ON s.id = so.song_id AND so.created_at > NOW() - $1::interval AND so.status != 'cancelled'
     WHERE s.is_active = TRUE
     GROUP BY s.id
     ORDER BY order_count DESC, s.play_count DESC
     LIMIT 10`,
    [interval]
  );

  const data = result.rows;
  await setCache(cacheKey, data, CACHE_TTL);
  return data;
};

const getPrimeTime = async () => {
  const cacheKey = 'stats:prime_time';
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const result = await readonlyQuery(
    `SELECT
       EXTRACT(HOUR FROM started_at) as hour,
       EXTRACT(DOW FROM started_at) as day_of_week,
       COUNT(*) as listeners,
       ROUND(AVG(duration_listened)) as avg_duration
     FROM listening_stats
     WHERE started_at > NOW() - INTERVAL '30 days'
     GROUP BY hour, day_of_week
     ORDER BY listeners DESC`
  );

  const hourly = {};
  for (const row of result.rows) {
    const h = parseInt(row.hour);
    if (!hourly[h]) {
      hourly[h] = { hour: h, total_listeners: 0, avg_duration: 0, count: 0 };
    }
    hourly[h].total_listeners += parseInt(row.listeners);
    hourly[h].avg_duration += parseInt(row.avg_duration || 0);
    hourly[h].count += 1;
  }

  const hours = Object.values(hourly)
    .map(h => ({
      hour: h.hour,
      listeners: h.total_listeners,
      avg_duration: h.count > 0 ? Math.round(h.avg_duration / h.count) : 0,
    }))
    .sort((a, b) => b.listeners - a.listeners);

  const peakHours = hours.slice(0, 5);

  const data = { peak_hours: peakHours, all_hours: hours.sort((a, b) => a.hour - b.hour) };
  await setCache(cacheKey, data, CACHE_TTL);
  return data;
};

const getRevenueReport = async (period = '30d') => {
  const cacheKey = `stats:revenue:${period}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const interval = periodToInterval(period);

  const [orderRevenue, subscriptionRevenue, customRevenue, topUpRevenue] = await Promise.all([
    readonlyQuery(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
       FROM payments WHERE payment_type = 'song_order' AND status = 'succeeded' AND created_at > NOW() - $1::interval`,
      [interval]
    ),
    readonlyQuery(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
       FROM payments WHERE payment_type = 'subscription' AND status = 'succeeded' AND created_at > NOW() - $1::interval`,
      [interval]
    ),
    readonlyQuery(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
       FROM payments WHERE payment_type = 'custom_song' AND status = 'succeeded' AND created_at > NOW() - $1::interval`,
      [interval]
    ),
    readonlyQuery(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
       FROM payments WHERE payment_type = 'balance_topup' AND status = 'succeeded' AND created_at > NOW() - $1::interval`,
      [interval]
    ),
  ]);

  const dailyRevenue = await readonlyQuery(
    `SELECT DATE(created_at) as date, SUM(amount) as total, COUNT(*) as count
     FROM payments WHERE status = 'succeeded' AND created_at > NOW() - $1::interval
     GROUP BY DATE(created_at)
     ORDER BY date`,
    [interval]
  );

  const data = {
    period,
    song_orders: { total: parseFloat(orderRevenue.rows[0].total), count: parseInt(orderRevenue.rows[0].count) },
    subscriptions: { total: parseFloat(subscriptionRevenue.rows[0].total), count: parseInt(subscriptionRevenue.rows[0].count) },
    custom_songs: { total: parseFloat(customRevenue.rows[0].total), count: parseInt(customRevenue.rows[0].count) },
    balance_topups: { total: parseFloat(topUpRevenue.rows[0].total), count: parseInt(topUpRevenue.rows[0].count) },
    grand_total: parseFloat(orderRevenue.rows[0].total) + parseFloat(subscriptionRevenue.rows[0].total) + parseFloat(customRevenue.rows[0].total) + parseFloat(topUpRevenue.rows[0].total),
    daily: dailyRevenue.rows,
  };

  await setCache(cacheKey, data, CACHE_TTL);
  return data;
};

const DB_SCHEMA = `
Tables:
- users (id UUID, username, email, role, balance, subscription_type, subscription_expires, free_orders_remaining, created_at, last_active)
- songs (id UUID, title, artist, genre, duration, file_path, is_active, is_custom, order_price, play_count, created_at)
- song_orders (id UUID, user_id, song_id, message, price_paid, status, priority, created_at, played_at)
- custom_song_orders (id UUID, user_id, lyrics, style_description, reference_song_id, price, status, result_song_id, air_count, aired_count, created_at, completed_at)
- payments (id UUID, user_id, amount, payment_type, payment_method, external_id, status, metadata JSONB, created_at)
- listening_stats (id UUID, user_id, song_id, started_at, duration_listened, ip_address)
- chat_messages (id UUID, user_id, message, is_bot, message_type, created_at)
- subscriptions (id UUID, name, slug, price_monthly, price_yearly, features JSONB, is_active)
`;

const askAnalytics = async (question) => {
  const cacheKey = `stats:ask:${Buffer.from(question).toString('base64').slice(0, 60)}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  try {
    const sqlGenPrompt = `Ты — аналитик данных. На основе вопроса пользователя сгенерируй PostgreSQL SELECT-запрос.
Схема базы данных:
${DB_SCHEMA}

Правила:
- Только SELECT запросы (никаких INSERT, UPDATE, DELETE, DROP)
- Не используй функции, которые могут изменить данные
- Ответ должен содержать ТОЛЬКО SQL-запрос, без пояснений
- Используй LIMIT 20 максимум
- Для дат используй NOW() и INTERVAL

Вопрос: ${question}`;

    const sqlQuery = await chatCompletion([
      { role: 'system', content: 'Ты генерируешь только PostgreSQL SELECT-запросы. Отвечай только SQL-кодом, без markdown.' },
      { role: 'user', content: sqlGenPrompt },
    ], { max_tokens: 500, temperature: 0 });

    const cleanSQL = sqlQuery.replace(/```sql/g, '').replace(/```/g, '').trim();

    const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE', 'EXEC'];
    const upperSQL = cleanSQL.toUpperCase();
    for (const word of forbidden) {
      if (upperSQL.includes(word)) {
        return { answer: 'Запрос отклонён: содержит запрещённые операции.', sql: cleanSQL, data: null };
      }
    }

    const result = await readonlyQuery(cleanSQL);

    const interpretPrompt = `Вопрос пользователя: "${question}"
SQL-запрос: ${cleanSQL}
Результат (JSON): ${JSON.stringify(result.rows.slice(0, 20))}

Дай краткий понятный ответ на русском языке на основе этих данных. Не упоминай SQL.`;

    const answer = await chatCompletion([
      { role: 'system', content: 'Ты — аналитик интернет-радио. Отвечай кратко и по делу на русском.' },
      { role: 'user', content: interpretPrompt },
    ], { max_tokens: 500, temperature: 0.3 });

    const responseData = { answer, sql: cleanSQL, data: result.rows.slice(0, 20) };
    await setCache(cacheKey, responseData, CACHE_TTL);
    return responseData;
  } catch (err) {
    logger.error('Analytics agent error', { error: err.message, question });
    return { answer: `Ошибка при обработке вопроса: ${err.message}`, sql: null, data: null };
  }
};

module.exports = { getTopSongs, getPrimeTime, getRevenueReport, askAnalytics };
