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
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    const error = new Error('SMTP credentials are not configured.');
    error.status = 500;
    throw error;
  }

  mailer = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  return mailer;
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

  await getTransporter().sendMail({
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
  verifyPasswordChangeOtp
};
