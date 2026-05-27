const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { withTransaction } = require('../utils/transaction');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function makeUsername(email) {
  return normalizeEmail(email).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function signUserToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      status: user.status,
      must_change_password: Boolean(user.must_change_password)
    },
    process.env.SESSION_SECRET || 'secret',
    { expiresIn: '1d' }
  );
}

async function register({ name, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const username = makeUsername(normalizedEmail);
  const passwordHash = await bcrypt.hash(password, 10);

  const [result] = await pool.query(`
    INSERT INTO users (username, email, password_hash, display_name, role, status, must_change_password)
    VALUES (?, ?, ?, ?, 'STUDENT', 'ACTIVE', FALSE)
  `, [username, normalizedEmail, passwordHash, name || username]);

  await pool.query('INSERT INTO students (user_id) VALUES (?)', [result.insertId]);

  const user = await getUserById(result.insertId);
  user.token = signUserToken(user);

  return user;
}

async function login(email, password) {
  const [users] = await pool.query(`
    SELECT id, username, email, password_hash, display_name, role, status, must_change_password
    FROM users
    WHERE email = ?
    LIMIT 1
  `, [normalizeEmail(email)]);

  const user = users[0];
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;
  if (user.status !== 'ACTIVE') {
    const error = new Error('Account is not active.');
    error.status = 403;
    throw error;
  }

  delete user.password_hash;
  user.token = signUserToken(user);

  return user;
}

async function getUserById(id) {
  const [rows] = await pool.query(`
    SELECT id, username, email, display_name, avatar_url, role, status, must_change_password, created_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `, [id]);
  return rows[0] || null;
}

async function getUserByIdWithConnection(connection, id) {
  const [rows] = await connection.query(`
    SELECT id, username, email, display_name, avatar_url, role, status, must_change_password, created_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `, [id]);
  return rows[0] || null;
}

async function createTeacher({ name, email, temporaryPassword, status = 'ACTIVE' }) {
  const normalizedEmail = normalizeEmail(email);
  const username = makeUsername(normalizedEmail);
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);
  const normalizedStatus = status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';

  return withTransaction(async (connection) => {
    const [result] = await connection.query(`
      INSERT INTO users (username, email, password_hash, display_name, role, status, must_change_password)
      VALUES (?, ?, ?, ?, 'TEACHER', ?, TRUE)
    `, [username, normalizedEmail, passwordHash, name || username, normalizedStatus]);

    await connection.query('INSERT INTO teachers (user_id) VALUES (?)', [result.insertId]);
    return getUserByIdWithConnection(connection, result.insertId);
  });
}

async function changePassword(userId, currentPassword, newPassword) {
  const [rows] = await pool.query(`
    SELECT id, password_hash, role, status, must_change_password
    FROM users
    WHERE id = ?
    LIMIT 1
  `, [userId]);

  const user = rows[0];
  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    const error = new Error('Current password is incorrect.');
    error.status = 401;
    throw error;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query(`
    UPDATE users
    SET password_hash = ?, must_change_password = FALSE
    WHERE id = ?
  `, [passwordHash, userId]);

  const updatedUser = await getUserById(userId);
  updatedUser.token = signUserToken(updatedUser);
  return updatedUser;
}

module.exports = { register, login, getUserById, createTeacher, changePassword };
