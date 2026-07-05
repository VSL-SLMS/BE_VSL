const crypto = require('crypto');

function parseExpiresIn(value) {
  if (!value) return null;
  if (typeof value === 'number') return value;

  const match = String(value).trim().match(/^(\d+)([smhd])?$/i);
  if (!match) {
    throw new Error('Invalid expiresIn value.');
  }

  const amount = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return amount * multipliers[unit];
}

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decodeJson(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function sign(payload, secret, options = {}) {
  if (!secret) {
    throw new Error('JWT secret is required.');
  }

  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now };
  const ttlSeconds = parseExpiresIn(options.expiresIn);
  if (ttlSeconds) {
    body.exp = now + ttlSeconds;
  }

  const header = { alg: 'HS256', typ: 'JWT' };
  const data = `${encodeJson(header)}.${encodeJson(body)}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verify(token, secret) {
  if (!secret) {
    throw new Error('JWT secret is required.');
  }

  const parts = String(token || '').split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token.');
  }

  const [headerPart, payloadPart, signature] = parts;
  const data = `${headerPart}.${payloadPart}`;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid token signature.');
  }

  const header = decodeJson(headerPart);
  if (header.alg !== 'HS256') {
    throw new Error('Unsupported token algorithm.');
  }

  const payload = decodeJson(payloadPart);
  if (payload.exp && Math.floor(Date.now() / 1000) >= Number(payload.exp)) {
    throw new Error('Token expired.');
  }

  return payload;
}

module.exports = { sign, verify };
