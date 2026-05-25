function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: true,
      message: 'Authentication required.'
    });
  }

  if (req.user.status === 'SUSPENDED') {
    return res.status(403).json({
      error: true,
      message: 'Account suspended.'
    });
  }

  return next();
}

function requireGuest(req, res, next) {
  return next();
}

module.exports = { requireAuth, requireGuest };
