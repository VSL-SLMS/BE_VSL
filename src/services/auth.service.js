const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const otpService = require('./otp.service');

const columnCache = new Map();

async function hasColumn(tableName, columnName) {
  const cacheKey = `${tableName}.${columnName}`;
  if (columnCache.has(cacheKey)) return columnCache.get(cacheKey);

  const [rows] = await pool.query(`
    SELECT COUNT(*) AS count
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND column_name = ?
  `, [tableName, columnName]);

  const exists = Number(rows[0]?.count || 0) > 0;
  columnCache.set(cacheKey, exists);
  return exists;
}

function signAuthToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in environment');
  }

  return jwt.sign(
    { id: user.id, role: user.role, status: user.status, token_version: user.token_version },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

async function register({ name, email, password, role }) {
  const normalizedRole = role === 'TEACHER' ? 'TEACHER' : 'STUDENT';
  const username = email.split('@')[0];
  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(`
    INSERT INTO users (username, email, password_hash, display_name, role, status)
    VALUES (?, ?, ?, ?, ?, 'ACTIVE')
  `, [username, email, passwordHash, name || username, normalizedRole]);

  // Query back the user to reliably get the ID (bypassing result.insertId issues on some clouds)
  const [userRows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (!userRows || userRows.length === 0) {
    throw new Error('Failed to create user or retrieve user ID after insertion.');
  }
  const userId = userRows[0].id;

  if (normalizedRole === 'TEACHER') {
    await pool.query('INSERT INTO teachers (user_id) VALUES (?)', [userId]);
  }

  if (normalizedRole === 'STUDENT') {
    await pool.query('INSERT INTO students (user_id) VALUES (?)', [userId]);
  }

  const user = await getUserById(userId);
  user.token = signAuthToken(user);

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
  user.token = signAuthToken(user);

  return user;
}

async function createTeacher({ name, email, temporaryPassword, status = 'ACTIVE' }) {
  const normalizedStatus = status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
  const username = email.split('@')[0];
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);
  const hasMustChangePassword = await hasColumn('users', 'must_change_password');
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (hasMustChangePassword) {
      await connection.query(`
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
    } else {
      await connection.query(`
        INSERT INTO users (username, email, password_hash, display_name, role, status)
        VALUES (?, ?, ?, ?, 'TEACHER', ?)
      `, [username, email, passwordHash, name || username, normalizedStatus]);
    }

    const [userRows] = await connection.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    const userId = userRows[0]?.id;
    if (!userId) throw new Error('Failed to create teacher user.');

    await connection.query('INSERT INTO teachers (user_id) VALUES (?)', [userId]);
    await connection.commit();

    const teacher = await getUserById(userId);
    try {
      teacher.email_delivery = await otpService.sendTeacherTemporaryPassword(teacher, temporaryPassword);
    } catch (mailError) {
      teacher.email_delivery = { sent: false, reason: mailError.message };
    }
    return teacher;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function requestPasswordChangeOtp(userId) {
  const user = await getUserById(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }

  return otpService.sendPasswordChangeOtp(user);
}

async function changePassword(userId, currentPassword, newPassword, otp) {
  if (!otp) {
    const error = new Error('OTP is required to change password.');
    error.status = 400;
    throw error;
  }

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

  await otpService.verifyPasswordChangeOtp(userId, otp);

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const hasMustChangePassword = await hasColumn('users', 'must_change_password');

  if (hasMustChangePassword) {
    await pool.query(`
      UPDATE users
      SET password_hash = ?,
          must_change_password = FALSE,
          token_version = token_version + 1
      WHERE id = ?
    `, [passwordHash, userId]);
  } else {
    await pool.query(`
      UPDATE users
      SET password_hash = ?,
          token_version = token_version + 1
      WHERE id = ?
    `, [passwordHash, userId]);
  }

  const updatedUser = await getUserById(userId);
  updatedUser.token = signAuthToken(updatedUser);
  return updatedUser;
}

async function getUserById(id) {
  const hasMustChangePassword = await hasColumn('users', 'must_change_password');
  const mustChangePasswordSelect = hasMustChangePassword ? ', must_change_password' : '';
  const [rows] = await pool.query(`
    SELECT id, username, email, display_name, avatar_url, role, status, token_version${mustChangePasswordSelect}, created_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `, [id]);
  return rows[0] || null;
}

module.exports = { register, login, createTeacher, requestPasswordChangeOtp, changePassword, getUserById };
