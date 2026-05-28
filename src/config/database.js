const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbConfig = process.env.DATABASE_URL || process.env.MYSQL_URL || {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vsl_learning'
};

const pool = mysql.createPool(
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
