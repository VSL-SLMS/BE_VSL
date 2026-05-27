const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: true,
      message: 'Authentication required.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'secret');
    req.user = decoded;

    if (req.user.status === 'SUSPENDED') {
      return res.status(403).json({
        error: true,
        message: 'Account suspended.'
      });
    }

    return next();
  } catch (error) {
    return res.status(401).json({
      error: true,
      message: 'Invalid or expired token.'
    });
  }
}

function requireGuest(req, res, next) {
  return next();
}

module.exports = { requireAuth, requireGuest };
