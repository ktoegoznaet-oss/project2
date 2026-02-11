const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const readonlyPool = new Pool({
  connectionString: process.env.DATABASE_READONLY_URL || process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

readonlyPool.on('error', (err) => {
  console.error('Unexpected readonly pool error:', err);
});

const query = (text, params) => pool.query(text, params);
const readonlyQuery = (text, params) => readonlyPool.query(text, params);

const getClient = () => pool.connect();

module.exports = { pool, readonlyPool, query, readonlyQuery, getClient };
