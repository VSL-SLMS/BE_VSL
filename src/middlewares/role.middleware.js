function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: true,
        message: 'You do not have permission to access this resource.'
      });
    }
    return next();
  };
}

module.exports = { requireRole };
