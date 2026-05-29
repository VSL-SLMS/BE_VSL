const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { signUserToken } = require('../utils/jwt');

async function register({ name, email, password }) {
  const username = email.split('@')[0];
  const passwordHash = await bcrypt.hash(password, 10);

  const [result] = await pool.query(`
    INSERT INTO users (username, email, password_hash, display_name, role, status)
    VALUES (?, ?, ?, ?, 'STUDENT', 'ACTIVE')
  `, [username, email, passwordHash, name || username]);

  await pool.query('INSERT INTO students (user_id) VALUES (?)', [result.insertId]);

  const user = await getUserById(result.insertId);
  user.token = signUserToken(user);

  return user;
}

async function login(email, password) {
  const [users] = await pool.query(`
    SELECT id, username, email, password_hash, display_name, role, status, token_version
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

  delete user.password_hash;
  user.token = signUserToken(user);

  return user;
}

async function createTeacher({ name, email, temporaryPassword, status = 'ACTIVE' }) {
  const normalizedStatus = status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
  const username = email.split('@')[0];
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(`
      INSERT INTO users (
        username,
        email,
        password_hash,
        display_name,
        role,
        status,
        must_change_password
      )
      VALUES (?, ?, ?, ?, 'TEACHER', ?, TRUE)
    `, [username, email, passwordHash, name || username, normalizedStatus]);

    await connection.query('INSERT INTO teachers (user_id) VALUES (?)', [result.insertId]);
    await connection.commit();

    return getUserById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function changePassword(userId, currentPassword, newPassword) {
  const [users] = await pool.query(`
    SELECT id, password_hash
    FROM users
    WHERE id = ?
    LIMIT 1
  `, [userId]);

  const user = users[0];
  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    const error = new Error('Current password is incorrect.');
    error.status = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query(`
    UPDATE users
    SET password_hash = ?,
        must_change_password = FALSE,
        token_version = token_version + 1
    WHERE id = ?
  `, [passwordHash, userId]);

  const updatedUser = await getUserById(userId);
  updatedUser.token = signUserToken(updatedUser);
  return updatedUser;
}

async function getUserById(id) {
  const [rows] = await pool.query(`
    SELECT
      id,
      username,
      email,
      display_name,
      avatar_url,
      role,
      status,
      token_version,
      must_change_password,
      created_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `, [id]);
  return rows[0] || null;
}

module.exports = { register, login, createTeacher, changePassword, getUserById };
