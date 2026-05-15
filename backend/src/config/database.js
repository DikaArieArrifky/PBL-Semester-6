const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
  keepAlive: true
});

// Handle database errors globally
pool.on('error', (err, client) => {
  console.error('[DB] Unexpected error on idle client', err);
  // Don't exit process, let connection pool handle it
});

// Test connection with retry
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('DB connected:', result.rows[0].now);
    return true;
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    return false;
  }
}

// Initial connection test
testConnection();

module.exports = pool;