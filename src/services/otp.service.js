const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { pool } = require('../config/database');

let tableReady = false;
let mailer = null;

async function ensureOtpTable() {
  if (tableReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_otps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      otp_hash VARCHAR(255) NOT NULL,
      purpose ENUM('CHANGE_PASSWORD') NOT NULL DEFAULT 'CHANGE_PASSWORD',
      expires_at DATETIME NOT NULL,
      consumed_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_password_reset_otps_user_purpose (user_id, purpose, expires_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  tableReady = true;
}

function hashOtp(otp) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in environment');
  }

  return crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(String(otp))
    .digest('hex');
}

function getTransporter() {
  if (mailer) return mailer;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');
  const timeoutMs = Number(process.env.SMTP_TIMEOUT_MS || 4000);

  if (!user || !pass) {
    const error = new Error('SMTP credentials are not configured.');
    error.status = 500;
    throw error;
  }

  mailer = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: timeoutMs,
    greetingTimeout: timeoutMs,
    socketTimeout: timeoutMs
  });

  return mailer;
}

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(timeoutMessage);
      error.code = 'SMTP_TIMEOUT';
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function sendMailWithTimeout(mailOptions) {
  const timeoutMs = Number(process.env.SMTP_TIMEOUT_MS || 4000);
  return withTimeout(
    getTransporter().sendMail(mailOptions),
    timeoutMs,
    `SMTP send timed out after ${timeoutMs}ms`
  );
}

async function sendTeacherTemporaryPassword(user, temporaryPassword) {
  if (!isSmtpConfigured()) {
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  try {
    await sendMailWithTimeout({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: 'SignLearn teacher account',
      text: [
        `Hello ${user.display_name || user.email},`,
        '',
        'Your SignLearn teacher account has been created by Admin.',
        `Email: ${user.email}`,
        `Temporary password: ${temporaryPassword}`,
        '',
        'Please log in and change your password on first login.'
      ].join('\n')
    });

    return { sent: true };
  } catch (error) {
    console.warn('Teacher temporary password email failed:', error.message);
    return {
      sent: false,
      reason: error.code || error.message || 'SMTP_SEND_FAILED'
    };
  }
}

async function sendPasswordChangeOtp(user) {
  await ensureOtpTable();

  const otp = String(crypto.randomInt(100000, 1000000));
  const expiresInMinutes = Number(process.env.OTP_EXPIRES_MINUTES || 10);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  await pool.query(`
    UPDATE password_reset_otps
    SET consumed_at = NOW()
    WHERE user_id = ? AND purpose = 'CHANGE_PASSWORD' AND consumed_at IS NULL
  `, [user.id]);

  await pool.query(`
    INSERT INTO password_reset_otps (user_id, otp_hash, purpose, expires_at)
    VALUES (?, ?, 'CHANGE_PASSWORD', ?)
  `, [user.id, hashOtp(otp), expiresAt]);

  await sendMailWithTimeout({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: user.email,
    subject: 'SignLearn password change OTP',
    text: `Your SignLearn password change OTP is ${otp}. It expires in ${expiresInMinutes} minutes.`
  });

  return { expiresAt };
}

async function verifyPasswordChangeOtp(userId, otp) {
  await ensureOtpTable();

  const [rows] = await pool.query(`
    SELECT id
    FROM password_reset_otps
    WHERE user_id = ?
      AND purpose = 'CHANGE_PASSWORD'
      AND otp_hash = ?
      AND consumed_at IS NULL
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `, [userId, hashOtp(otp)]);

  const record = rows[0];
  if (!record) {
    const error = new Error('OTP is invalid or expired.');
    error.status = 400;
    throw error;
  }

  await pool.query('UPDATE password_reset_otps SET consumed_at = NOW() WHERE id = ?', [record.id]);
}

module.exports = {
  sendPasswordChangeOtp,
  verifyPasswordChangeOtp,
  sendTeacherTemporaryPassword,
  isSmtpConfigured
};
