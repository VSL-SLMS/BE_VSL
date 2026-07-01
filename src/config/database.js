const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbConfig = process.env.DATABASE_URL || process.env.MYSQL_URL || {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vsl_learning'
};

let poolInstance;

function createPool() {
  const mysql = require('mysql2/promise');
  return mysql.createPool(
    typeof dbConfig === 'string'
      ? dbConfig
      : {
          ...dbConfig,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          charset: 'utf8mb4'
        }
  );
}

function getPool() {
  if (!poolInstance) {
    poolInstance = createPool();
  }
  return poolInstance;
}

const pool = {
  query(...args) {
    return getPool().query(...args);
  },
  execute(...args) {
    return getPool().execute(...args);
  },
  getConnection(...args) {
    return getPool().getConnection(...args);
  },
  async end(...args) {
    if (!poolInstance) return;
    const instance = poolInstance;
    poolInstance = undefined;
    await instance.end(...args);
  }
};

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    connection.release();
    return true;
  } catch (error) {
    console.error('MySQL connection failed:', error.message);
    return false;
  }
}

module.exports = { pool, testConnection };
