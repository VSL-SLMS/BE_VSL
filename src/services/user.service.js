const { pool } = require('../config/database');

async function listUsers() {
  const [rows] = await pool.query(`
    SELECT id, username, email, display_name, role, status, must_change_password, created_at
    FROM users
    ORDER BY created_at DESC
  `);
  return rows;
}

module.exports = { listUsers };
