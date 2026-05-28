const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

async function register({ name, email, password, role }) {
  const normalizedRole = ['STUDENT', 'TEACHER'].includes(role) ? role : 'STUDENT';
  const username = email.split('@')[0];
  const passwordHash = await bcrypt.hash(password, 10);

  const [result] = await pool.query(`
    INSERT INTO users (username, email, password_hash, display_name, role, status)
    VALUES (?, ?, ?, ?, ?, 'ACTIVE')
  `, [username, email, passwordHash, name || username, normalizedRole]);

  if (normalizedRole === 'TEACHER') {
    await pool.query('INSERT INTO teachers (user_id) VALUES (?)', [result.insertId]);
  }

  if (normalizedRole === 'STUDENT') {
    await pool.query('INSERT INTO students (user_id) VALUES (?)', [result.insertId]);
  }

  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET must be set in production');
  }

  const user = await getUserById(result.insertId);
  user.token = jwt.sign(
    { id: user.id, role: user.role, status: user.status },
    process.env.SESSION_SECRET || 'secret',
    { expiresIn: '1d' }
  );

  return user;
}

async function login(email, password) {
  const [users] = await pool.query(`
    SELECT id, username, email, password_hash, display_name, role, status
    FROM users
    WHERE email = ?
    LIMIT 1
  `, [email]);

  const user = users[0];
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;
  if (user.status !== 'ACTIVE') {
    const error = new Error('Account is not active.');
    error.status = 403;
    throw error;
  }

  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET must be set in production');
  }

  delete user.password_hash;
  user.token = jwt.sign(
    { id: user.id, role: user.role, status: user.status },
    process.env.SESSION_SECRET || 'secret',
    { expiresIn: '1d' }
  );

  return user;
}

async function getUserById(id) {
  const [rows] = await pool.query(`
    SELECT id, username, email, display_name, avatar_url, role, status, created_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `, [id]);
  return rows[0] || null;
}

module.exports = { register, login, getUserById };

