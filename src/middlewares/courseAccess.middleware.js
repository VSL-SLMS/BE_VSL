const paymentService = require('../services/payment.service');

async function requireCourseAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: true,
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication required.'
    });
  }

  // Bypass for ADMIN and TEACHER roles
  if (req.user.role === 'ADMIN' || req.user.role === 'TEACHER') {
    return next();
  }

  try {
    const hasAccess = await paymentService.getUserCourseAccess(req.user.id);
    if (!hasAccess) {
      return res.status(403).json({
        error: true,
        code: 'COURSE_PURCHASE_REQUIRED',
        message: 'You must purchase this course to access this lesson.'
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { requireCourseAccess };
