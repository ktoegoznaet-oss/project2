const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  return redisClient;
};

const getCache = async (key) => {
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

const setCache = async (key, value, ttlSeconds = 300) => {
  await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
};

const deleteCache = async (key) => {
  await redisClient.del(key);
};

module.exports = { redisClient, connectRedis, getCache, setCache, deleteCache };
