const jwt = require('jsonwebtoken');

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || '').trim();

  if (!secret || secret === 'replace-with-a-long-random-secret') {
    const error = new Error('JWT_SECRET must be set to a non-empty production secret');
    error.status = 500;
    throw error;
  }

  return secret;
}

function signUserToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      status: user.status,
      token_version: user.token_version
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = { getJwtSecret, signUserToken, verifyToken };
