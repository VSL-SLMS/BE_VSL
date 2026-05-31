const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const crypto = require('crypto');
const emailService = require('./email.service');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, token_version: user.token_version },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}


function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

async function requestOTP(email) {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  await pool.query(`
    INSERT INTO otp_codes (email, otp_code, expires_at)
    VALUES (?, ?, ?)
  `, [email, otp, expiresAt]);

  // If email configuration is set, send it; otherwise just log it for dev
  if (process.env.SMTP_USER) {
    try {
      await emailService.sendStudentOTP(email, otp);
    } catch (err) {
      console.error("Failed to send OTP email:", err);
    }
  } else {
    console.log(`[DEV MODE] OTP for ${email}: ${otp}`);
  }

  return { message: "OTP sent successfully" };
}

async function verifyOTP(email, otp) {
  const [rows] = await pool.query(`
    SELECT * FROM otp_codes
    WHERE email = ? AND otp_code = ? AND used = FALSE AND expires_at > NOW()
    ORDER BY created_at DESC LIMIT 1
  `, [email, otp]);

  if (rows.length === 0) {
    throw new Error("Invalid or expired OTP");
  }

  await pool.query('UPDATE otp_codes SET used = TRUE WHERE id = ?', [rows[0].id]);
  return true;
}

async function register({ name, email, password, role }) {
  const normalizedRole = ['STUDENT', 'TEACHER'].includes(role) ? role : 'STUDENT';
  const username = email.split('@')[0];
  const passwordHash = await bcrypt.hash(password, 10);

  // If it's a student, they must be verified (since they went through OTP, or if we assume this is the final registration step after verifyOTP)
  const isVerified = normalizedRole === 'STUDENT' ? true : true; // In this setup, we assume teacher is verified by admin.

  const [result] = await pool.query(`
    INSERT INTO users (username, email, password_hash, display_name, role, status, is_verified)
    VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)
  `, [username, email, passwordHash, name || username, normalizedRole, isVerified]);

  // Re-fetch user ID using unique email to handle potential insertId null issues
  const [users] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  const newUserId = users[0].id;

  if (normalizedRole === 'TEACHER') {
    await pool.query('INSERT INTO teachers (user_id) VALUES (?)', [newUserId]);
    // Send email to teacher
    if (process.env.SMTP_USER) {
      try {
        await emailService.sendTeacherCredentials(email, name || username, password);
      } catch (err) {
         console.error("Failed to send Teacher Credentials email:", err);
      }
    } else {
      console.log(`[DEV MODE] Teacher credentials for ${email}: Password is ${password}`);
    }
  }

  if (normalizedRole === 'STUDENT') {
    await pool.query('INSERT INTO students (user_id) VALUES (?)', [newUserId]);
  }

  const user = await getUserById(newUserId);
  user.token = generateToken(user);
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
  user.token = generateToken(user);
  return user;
}

async function getUserById(id) {
  const [rows] = await pool.query(`
    SELECT id, username, email, display_name, avatar_url, role, status, token_version, created_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `, [id]);
  return rows[0] || null;
}

module.exports = { requestOTP, verifyOTP, register, login, getUserById };
