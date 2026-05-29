const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../config/database');
const emailService = require('./email.service');

const ALLOWED_PURPOSES = new Set(['EMAIL_VERIFICATION', 'PASSWORD_RESET']);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizePurpose(purpose) {
  const normalized = String(purpose || 'EMAIL_VERIFICATION').trim().toUpperCase();
  return ALLOWED_PURPOSES.has(normalized) ? normalized : 'EMAIL_VERIFICATION';
}

function getOtpConfig() {
  return {
    length: Number(process.env.OTP_LENGTH || 6),
    expiresInMinutes: Number(process.env.OTP_EXPIRES_MINUTES || 10),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 5),
    debugResponse: ['1', 'true', 'yes', 'on'].includes(String(process.env.OTP_DEBUG_RESPONSE || '').toLowerCase())
  };
}

function generateOtp(length) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(crypto.randomInt(min, max + 1));
}

function buildOtpEmail({ otp, purpose, expiresInMinutes }) {
  const title = purpose === 'PASSWORD_RESET'
    ? 'Reset your SLMS password'
    : 'Verify your SLMS email';
  const text = [
    title,
    '',
    `Your OTP code is ${otp}.`,
    `This code expires in ${expiresInMinutes} minutes.`,
    '',
    'If you did not request this code, you can ignore this email.'
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h2>${title}</h2>
      <p>Your OTP code is:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:4px">${otp}</p>
      <p>This code expires in ${expiresInMinutes} minutes.</p>
      <p>If you did not request this code, you can ignore this email.</p>
    </div>
  `;

  return { subject: title, text, html };
}

async function requestOtp({ email, purpose }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    const error = new Error('Email is required.');
    error.status = 400;
    throw error;
  }

  const normalizedPurpose = normalizePurpose(purpose);
  const config = getOtpConfig();
  const otp = generateOtp(config.length);
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + config.expiresInMinutes * 60 * 1000);

  await pool.query(`
    UPDATE email_otps
    SET consumed_at = UTC_TIMESTAMP()
    WHERE email = ?
      AND purpose = ?
      AND consumed_at IS NULL
      AND verified_at IS NULL
  `, [normalizedEmail, normalizedPurpose]);

  await pool.query(`
    INSERT INTO email_otps (
      email,
      purpose,
      otp_hash,
      max_attempts,
      expires_at
    )
    VALUES (?, ?, ?, ?, ?)
  `, [normalizedEmail, normalizedPurpose, otpHash, config.maxAttempts, expiresAt]);

  const message = buildOtpEmail({
    otp,
    purpose: normalizedPurpose,
    expiresInMinutes: config.expiresInMinutes
  });
  const delivery = await emailService.sendMail({
    to: normalizedEmail,
    ...message
  });

  return {
    email: normalizedEmail,
    purpose: normalizedPurpose,
    expiresAt,
    expiresInMinutes: config.expiresInMinutes,
    delivery,
    ...(config.debugResponse ? { otp } : {})
  };
}

async function verifyOtp({ email, purpose, otp }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPurpose = normalizePurpose(purpose);
  const normalizedOtp = String(otp || '').trim();

  if (!normalizedEmail || !normalizedOtp) {
    const error = new Error('Email and OTP are required.');
    error.status = 400;
    throw error;
  }

  const [rows] = await pool.query(`
    SELECT id, otp_hash, attempt_count, max_attempts, expires_at, verified_at, consumed_at
    FROM email_otps
    WHERE email = ?
      AND purpose = ?
      AND consumed_at IS NULL
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `, [normalizedEmail, normalizedPurpose]);

  const record = rows[0];
  if (!record) {
    const error = new Error('OTP not found. Please request a new code.');
    error.status = 404;
    throw error;
  }

  if (record.verified_at) {
    return {
      email: normalizedEmail,
      purpose: normalizedPurpose,
      verified: true,
      alreadyVerified: true
    };
  }

  if (new Date(record.expires_at).getTime() <= Date.now()) {
    await pool.query(`
      UPDATE email_otps
      SET consumed_at = UTC_TIMESTAMP()
      WHERE id = ?
    `, [record.id]);

    const error = new Error('OTP has expired. Please request a new code.');
    error.status = 400;
    throw error;
  }

  if (record.attempt_count >= record.max_attempts) {
    const error = new Error('Maximum OTP attempts exceeded. Please request a new code.');
    error.status = 429;
    throw error;
  }

  const isValid = await bcrypt.compare(normalizedOtp, record.otp_hash);
  if (!isValid) {
    await pool.query(`
      UPDATE email_otps
      SET attempt_count = attempt_count + 1
      WHERE id = ?
    `, [record.id]);

    const error = new Error('Invalid OTP.');
    error.status = 400;
    throw error;
  }

  await pool.query(`
    UPDATE email_otps
    SET verified_at = UTC_TIMESTAMP(),
        consumed_at = UTC_TIMESTAMP()
    WHERE id = ?
  `, [record.id]);

  return {
    email: normalizedEmail,
    purpose: normalizedPurpose,
    verified: true
  };
}

module.exports = {
  generateOtp,
  normalizeEmail,
  normalizePurpose,
  requestOtp,
  verifyOtp
};
