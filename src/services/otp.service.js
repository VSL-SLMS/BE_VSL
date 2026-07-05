const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { pool } = require('../config/database');

let tableReady = false;

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function getSmtpTimeoutMs() {
  const configured = Number(process.env.SMTP_TIMEOUT_MS || 15000);
  if (!Number.isFinite(configured) || configured <= 0) return 15000;
  return Math.max(configured, 15000);
}

function getMailProvider() {
  return String(process.env.MAIL_PROVIDER || 'auto').trim().toLowerCase();
}

function getMailTimeoutMs() {
  return getSmtpTimeoutMs();
}

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

function getSmtpBaseConfig() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');
  const secure = parseBoolean(process.env.SMTP_SECURE, port === 465);
  const timeoutMs = getSmtpTimeoutMs();

  if (!user || !pass) {
    const error = new Error('SMTP credentials are not configured.');
    error.status = 500;
    throw error;
  }

  return { host, port, user, pass, secure, timeoutMs };
}

function createTransporter({ host, port, user, pass, secure, timeoutMs }) {
  const options = {
    host,
    port,
    secure,
    family: 4,
    auth: { user, pass },
    tls: {
      minVersion: 'TLSv1.2',
      servername: host
    },
    dnsTimeout: timeoutMs,
    connectionTimeout: timeoutMs,
    greetingTimeout: timeoutMs,
    socketTimeout: timeoutMs
  };

  if (!secure) {
    options.requireTLS = true;
  }

  return nodemailer.createTransport(options);
}

function getTransportAttempts() {
  const base = getSmtpBaseConfig();
  const attempts = [];
  const isGmail = base.host === 'smtp.gmail.com';

  if (isGmail && base.port !== 465) {
    attempts.push({
      ...base,
      port: 465,
      secure: true,
      label: 'gmail-ssl-465'
    });
  }

  attempts.push({
    ...base,
    label: `configured-${base.port}`
  });

  if (isGmail && base.port !== 587) {
    attempts.push({
      ...base,
      port: 587,
      secure: false,
      label: 'gmail-starttls-587'
    });
  }

  return attempts;
}

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function isSmtpFailure(error) {
  return error?.code === 'SMTP_SEND_FAILED' || /SMTP_/i.test(String(error?.message || ''));
}

function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

function isMailConfigured() {
  const provider = getMailProvider();
  if (provider === 'resend') return isResendConfigured();
  if (provider === 'smtp') return isSmtpConfigured();
  return isResendConfigured() || isSmtpConfigured();
}

function normalizeRecipients(to) {
  return Array.isArray(to) ? to : [to];
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
  if (parseBoolean(process.env.SMTP_DRY_RUN, false)) {
    return {
      accepted: [mailOptions.to],
      dryRun: true
    };
  }

  const attempts = getTransportAttempts();
  const errors = [];

  for (const attempt of attempts) {
    let transporter;
    try {
      transporter = createTransporter(attempt);
      return await withTimeout(
        transporter.sendMail(mailOptions),
        attempt.timeoutMs,
        `SMTP ${attempt.label} timed out after ${attempt.timeoutMs}ms`
      );
    } catch (error) {
      errors.push(`${attempt.label}: ${error.code || error.message}`);
      console.warn(`SMTP attempt failed (${attempt.label}):`, error.message);
    } finally {
      if (transporter) {
        transporter.close();
      }
    }
  }

  const finalError = new Error(errors.join(' | ') || 'SMTP_SEND_FAILED');
  finalError.code = 'SMTP_SEND_FAILED';
  finalError.status = 503;
  throw finalError;
}

async function sendMailWithResend(mailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const error = new Error('RESEND_API_KEY is not configured.');
    error.status = 500;
    error.code = 'RESEND_NOT_CONFIGURED';
    throw error;
  }

  const from = process.env.RESEND_FROM;
  if (!from) {
    const error = new Error('RESEND_FROM is not configured. Use a verified sender such as SLMS <no-reply@vsl.lat>.');
    error.status = 500;
    error.code = 'RESEND_FROM_NOT_CONFIGURED';
    throw error;
  }

  const timeoutMs = getMailTimeoutMs();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        from,
        to: normalizeRecipients(mailOptions.to),
        subject: mailOptions.subject,
        text: mailOptions.text
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || payload.error || 'Resend email delivery failed.');
      error.status = response.status >= 500 ? 503 : 502;
      error.code = 'RESEND_SEND_FAILED';
      throw error;
    }

    return {
      accepted: normalizeRecipients(mailOptions.to),
      provider: 'resend',
      id: payload.id
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Resend timed out after ${timeoutMs}ms`);
      timeoutError.status = 503;
      timeoutError.code = 'RESEND_TIMEOUT';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function sendMail(mailOptions) {
  if (parseBoolean(process.env.SMTP_DRY_RUN, false)) {
    return {
      accepted: normalizeRecipients(mailOptions.to),
      dryRun: true
    };
  }

  const provider = getMailProvider();

  if (provider === 'resend') {
    return sendMailWithResend(mailOptions);
  }

  if (provider === 'smtp') {
    return sendMailWithTimeout(mailOptions);
  }

  if (isResendConfigured()) {
    return sendMailWithResend(mailOptions);
  }

  return sendMailWithTimeout(mailOptions);
}

async function sendTeacherTemporaryPassword(user, temporaryPassword) {
  if (!isMailConfigured()) {
    return { sent: false, reason: 'MAIL_NOT_CONFIGURED' };
  }

  try {
    await sendMail({
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
      reason: error.message || error.code || 'SMTP_SEND_FAILED'
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

  const [insertResult] = await pool.query(`
    INSERT INTO password_reset_otps (user_id, otp_hash, purpose, expires_at)
    VALUES (?, ?, 'CHANGE_PASSWORD', ?)
  `, [user.id, hashOtp(otp), expiresAt]);

  try {
    await sendMail({
      to: user.email,
      subject: 'SignLearn password change OTP',
      text: `Your SignLearn password change OTP is ${otp}. It expires in ${expiresInMinutes} minutes.`
    });
  } catch (error) {
    if (insertResult.insertId) {
      await pool.query('DELETE FROM password_reset_otps WHERE id = ?', [insertResult.insertId]);
    }
    if (isSmtpFailure(error) || error.code === 'RESEND_SEND_FAILED' || error.code === 'RESEND_TIMEOUT') {
      const publicError = new Error('Email service is temporarily unavailable. Please try again later or contact Admin.');
      publicError.status = 503;
      publicError.code = 'EMAIL_SERVICE_UNAVAILABLE';
      publicError.details = error.message;
      throw publicError;
    }
    throw error;
  }

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
  isSmtpConfigured,
  __testing: {
    getMailProvider,
    isMailConfigured,
    isSmtpFailure
  }
};
