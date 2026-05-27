const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

function readEnv(...keys) {
  return keys.map((key) => process.env[key]).find((value) => value !== undefined && value !== '');
}

function shouldUseSsl() {
  return ['true', '1', 'yes'].includes(String(process.env.DB_SSL || '').toLowerCase());
}

function getDatabaseConfig() {
  const connectionString = readEnv('DATABASE_URL', 'MYSQL_URL', 'MYSQL_PRIVATE_URL', 'MYSQL_PUBLIC_URL');
  const sharedConfig = {
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    charset: 'utf8mb4'
  };

  if (connectionString) {
    return {
      uri: connectionString,
      ...sharedConfig,
      ...(shouldUseSsl() ? { ssl: { rejectUnauthorized: false } } : {})
    };
  }

  return {
    host: readEnv('DB_HOST', 'MYSQLHOST', 'MYSQL_HOST') || 'localhost',
    port: Number(readEnv('DB_PORT', 'MYSQLPORT', 'MYSQL_PORT') || 3306),
    user: readEnv('DB_USER', 'MYSQLUSER', 'MYSQL_USER') || 'root',
    password: readEnv('DB_PASSWORD', 'MYSQLPASSWORD', 'MYSQL_PASSWORD') || '',
    database: readEnv('DB_NAME', 'MYSQLDATABASE', 'MYSQL_DATABASE') || 'vsl_learning',
    ...sharedConfig,
    ...(shouldUseSsl() ? { ssl: { rejectUnauthorized: false } } : {})
  };
}

const pool = mysql.createPool(getDatabaseConfig());

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

module.exports = { pool, testConnection, getDatabaseConfig };
