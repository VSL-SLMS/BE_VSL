const nodemailer = require('nodemailer');

function getBooleanEnv(name, defaultValue = false) {
  const value = process.env[name];
  if (value === undefined || value === null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function getSmtpConfig() {
  const port = Number(process.env.SMTP_PORT || 587);

  return {
    host: process.env.SMTP_HOST,
    port,
    secure: getBooleanEnv('SMTP_SECURE', port === 465),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    dryRun: getBooleanEnv('SMTP_DRY_RUN', false)
  };
}

function createTransport() {
  const config = getSmtpConfig();

  if (config.dryRun) {
    return null;
  }

  if (!config.host || !config.user || !config.pass || !config.from) {
    const error = new Error('SMTP is not configured.');
    error.status = 503;
    throw error;
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });
}

async function sendMail({ to, subject, text, html }) {
  const config = getSmtpConfig();

  if (config.dryRun) {
    console.log('[SMTP_DRY_RUN]', { to, subject, text });
    return { dryRun: true };
  }

  const transporter = createTransport();
  const info = await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
    html
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected
  };
}

module.exports = { getSmtpConfig, sendMail };
