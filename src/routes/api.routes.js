const express = require('express');
const authService = require('../services/auth.service');
const lessonService = require('../services/lesson.service');
const studentService = require('../services/student.service');
const teacherService = require('../services/teacher.service');
const userService = require('../services/user.service');
const adminTeacherService = require('../services/adminTeacher.service');
const assignmentService = require('../services/assignment.service');
const topicLessonService = require('../services/topicLesson.service');
const { requireAuth, optionalAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const paymentService = require('../services/payment.service');

const router = express.Router();

function getFrontendUrl() {
  return process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
}

function buildPaymentResultRedirectUrl(query) {
  const redirectUrl = new URL('/payment/result', getFrontendUrl());
  Object.entries(query || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => redirectUrl.searchParams.append(key, item));
      return;
    }
    if (value !== undefined && value !== null) {
      redirectUrl.searchParams.set(key, value);
    }
  });
  return redirectUrl.toString();
}

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'slms-backend',
    timestamp: new Date().toISOString()
  });
});

router.get('/course-overview', async (req, res, next) => {
  try {
    const parts = await lessonService.getAllPartsWithChapters();
    res.json({ data: { parts } });
  } catch (error) {
    next(error);
  }
});

router.post('/auth/register', async (req, res, next) => {
  try {
    // Public registration is strictly for STUDENTs
    const payload = {
      ...req.body,
      role: 'STUDENT'
    };
    const user = await authService.register(payload);
    res.status(201).json({ data: { user } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.status === 409) {
      return res.status(409).json({ error: true, message: 'Email or username already exists.' });
    }
    return next(error);
  }
});

router.get('/auth/me', requireAuth, (req, res) => {
  res.json({ data: { user: req.user } });
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const user = await authService.login(req.body.email, req.body.password);
    if (!user) {
      return res.status(401).json({ error: true, message: 'Invalid email or password.' });
    }
    return res.json({ data: { user } });
  } catch (error) {
    return next(error);
  }
});

router.post('/auth/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword, otp, verificationToken } = req.body;

    if (!currentPassword || !newPassword || (!verificationToken && !otp)) {
      return res.status(400).json({
        error: true,
        message: 'Current password, new password, and verified OTP are required.'
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        error: true,
        message: 'New password must be at least 6 characters.'
      });
    }

    const user = await authService.changePassword(req.user.id, currentPassword, newPassword, {
      otp,
      verificationToken
    });
    return res.json({ data: { user } });
  } catch (error) {
    return next(error);
  }
});

router.post('/auth/change-password/request-otp', requireAuth, async (req, res, next) => {
  try {
    const data = await authService.requestPasswordChangeOtp(req.user.id);
    return res.json({
      data: {
        expiresAt: data.expiresAt
      },
      message: 'Password change OTP sent to your email.'
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/auth/change-password/verify-otp', requireAuth, async (req, res, next) => {
  try {
    if (!req.body.otp) {
      return res.status(400).json({
        error: true,
        message: 'OTP is required.'
      });
    }

    const data = await authService.verifyPasswordChangeOtp(req.user.id, req.body.otp);
    return res.json({
      data,
      message: 'OTP verified. You can now change your password.'
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/teachers', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const temporaryPassword = req.body.temporaryPassword || req.body.password;

    if (!req.body.email || !temporaryPassword) {
      return res.status(400).json({
        error: true,
        message: 'Email and temporary password are required.'
      });
    }

    if (String(temporaryPassword).length < 6) {
      return res.status(400).json({
        error: true,
        message: 'Temporary password must be at least 6 characters.'
      });
    }

    const teacher = await authService.createTeacher({
      name: req.body.name || req.body.fullName,
      email: req.body.email,
      temporaryPassword,
      status: req.body.status
    });

    res.status(201).json({ data: { teacher } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.status === 409) {
      return res.status(409).json({ error: true, message: 'Email or username already exists.' });
    }
    return next(error);
  }
});

router.get('/admin/teachers', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const teachers = await adminTeacherService.listTeachers();
    res.json({ data: { teachers } });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/teachers/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const teacher = await adminTeacherService.getTeacherById(req.params.id);
    res.json({ data: { teacher } });
  } catch (error) {
    res.status(error.status || 500).json({ error: true, message: error.message });
  }
});

router.patch('/admin/teachers/:id/profile', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const teacher = await adminTeacherService.updateTeacherProfile(req.params.id, req.body || {});
    res.json({ data: { teacher } });
  } catch (error) {
    res.status(error.status || 500).json({ error: true, message: error.message });
  }
});

router.patch('/admin/teachers/:id/status', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const teacher = await adminTeacherService.updateTeacherStatus(req.params.id, req.body.status);
    res.json({ data: { teacher } });
  } catch (error) {
    res.status(error.status || 500).json({ error: true, message: error.message });
  }
});

router.get('/teachers', requireAuth, async (req, res, next) => {
  try {
    const recommend = String(req.query.recommend || '').toLowerCase() === 'true';
    const teachers = await studentService.listTeachers({ recommend });
    res.json({ data: { teachers, recommendedTeacher: recommend ? teachers[0] || null : null } });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/users', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const users = await userService.listUsers();
    res.json({ data: { users } });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/me/profile', requireAuth, async (req, res, next) => {
  try {
    const user = await userService.updateUserProfile(req.user, req.user.id, {
      name: req.body.name || req.body.displayName,
      email: req.body.email,
      avatarUrl: req.body.avatarUrl || req.body.avatar_url,
      dateOfBirth: req.body.dateOfBirth || req.body.date_of_birth,
      bio: req.body.bio
    });
    res.json({ data: { user } });
  } catch (error) {
    next(error);
  }
});

router.post('/users/me/avatar/upload-signature', requireAuth, async (req, res, next) => {
  try {
    const data = userService.requestAvatarUploadSignature(req.user, req.body || {});
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.delete('/users/me/avatar', requireAuth, async (req, res, next) => {
  try {
    const user = await userService.deleteUserAvatar(req.user, req.user.id);
    res.json({ data: { user } });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id/profile', requireAuth, async (req, res, next) => {
  try {
    const user = await userService.updateUserProfile(req.user, req.params.id, {
      name: req.body.name || req.body.displayName,
      email: req.body.email,
      avatarUrl: req.body.avatarUrl || req.body.avatar_url,
      dateOfBirth: req.body.dateOfBirth || req.body.date_of_birth,
      bio: req.body.bio
    });
    res.json({ data: { user } });
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:id/avatar', requireAuth, async (req, res, next) => {
  try {
    const user = await userService.deleteUserAvatar(req.user, req.params.id);
    res.json({ data: { user } });
  } catch (error) {
    next(error);
  }
});

router.get('/lessons', async (req, res, next) => {
  try {
    const parts = await lessonService.getAllPartsWithChapters();
    res.json({ data: { parts } });
  } catch (error) {
    next(error);
  }
});

router.get('/lessons/:slug', optionalAuth, async (req, res, next) => {
  try {
    const lesson = await lessonService.getLessonBySlug(req.params.slug);
    if (!lesson) {
      return res.status(404).json({ error: true, message: 'Lesson not found.' });
    }

    const hasAccess = req.user ? await paymentService.getUserCourseAccess(req.user.id) : false;

    if (!hasAccess) {
      return res.json({
        data: {
          lesson,
          content: [],
          pages: [],
          navigation: null,
          hasAccess: false
        }
      });
    }

    const [content, pages, navigation] = await Promise.all([
      lessonService.getLessonContent(lesson.id),
      lessonService.getPageImagesByLessonId(lesson.id),
      lessonService.getLessonNavigation(lesson)
    ]);

    return res.json({
      data: {
        lesson,
        content,
        pages,
        navigation,
        hasAccess: true
      }
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/lessons/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const lesson = await lessonService.updateLessonById(req.params.id, req.body);
    res.json({ data: { lesson } });
  } catch (error) {
    next(error);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const results = await lessonService.searchContent(req.query.q);
    res.json({ data: results });
  } catch (error) {
    next(error);
  }
});


// ==========================================
// STUDENT ROUTES
// ==========================================
router.get('/student/dashboard', requireAuth, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const data = await studentService.getDashboard(req.user.id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.post('/student/choose-teacher', requireAuth, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const { teacherId } = req.body;
    await studentService.chooseTeacher(req.user.id, teacherId);
    res.json({ message: 'Teacher selected successfully' });
  } catch (error) {
    res.status(400).json({ error: true, message: error.message });
  }
});

router.post('/student/request-teacher-change', requireAuth, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const reason = String(req.body.reason || '').trim();

    if (!reason) {
      return res.status(400).json({
        error: true,
        message: 'Reason is required.'
      });
    }

    const data = await studentService.requestTeacherChange(req.user.id, reason);
    res.status(201).json({ data });
  } catch (error) {
    res.status(error.status || 400).json({ error: true, message: error.message });
  }
});

router.get('/student/lessons', requireAuth, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const data = await studentService.getLessons(req.user.id);
    res.json({ data });
  } catch (error) {
    res.status(error.status || 500).json({
      error: true,
      code: error.code || 'STUDENT_LESSONS_ERROR',
      message: error.message
    });
  }
});

router.get('/student/lessons/:slug', requireAuth, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const data = await studentService.getLessonDetail(req.user.id, req.params.slug);
    res.json({ data });
  } catch (error) {
    res.status(error.status || 500).json({
      error: true,
      code: error.code || 'STUDENT_LESSON_ERROR',
      message: error.message
    });
  }
});

router.post('/student/lessons/:lessonId/complete', requireAuth, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const data = await studentService.completeLesson(req.user.id, req.params.lessonId);
    res.json({ data });
  } catch (error) {
    res.status(error.status || 500).json({
      error: true,
      code: error.code || 'LESSON_COMPLETE_ERROR',
      message: error.message
    });
  }
});

router.get('/student/topic-lessons', requireAuth, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const data = await topicLessonService.listStudentTopicLessons(req.user.id);
    res.json({ data });
  } catch (error) {
    res.status(error.status || 500).json({
      error: true,
      code: error.code || 'TOPIC_LESSONS_ERROR',
      message: error.message
    });
  }
});

router.get('/student/topic-lessons/progress', requireAuth, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const data = await topicLessonService.getStudentTopicProgress(req.user.id);
    res.json({ data });
  } catch (error) {
    res.status(error.status || 500).json({
      error: true,
      code: error.code || 'TOPIC_PROGRESS_ERROR',
      message: error.message
    });
  }
});

router.get('/student/topic-lessons/:slug', requireAuth, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const data = await topicLessonService.getTopicLessonBySlug(req.user.id, req.params.slug);
    res.json({ data });
  } catch (error) {
    res.status(error.status || 500).json({
      error: true,
      code: error.code || 'TOPIC_LESSON_ERROR',
      message: error.message
    });
  }
});

router.post('/student/topic-lessons/:slug/items/:itemId/complete', requireAuth, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const data = await topicLessonService.completeTopicLessonItem(req.user.id, req.params.slug, req.params.itemId);
    res.json({ data });
  } catch (error) {
    res.status(error.status || 500).json({
      error: true,
      code: error.code || 'TOPIC_ITEM_COMPLETE_ERROR',
      message: error.message
    });
  }
});

router.post('/student/topic-lessons/:slug/complete', requireAuth, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const data = await topicLessonService.completeTopicLesson(req.user.id, req.params.slug);
    res.json({ data });
  } catch (error) {
    res.status(error.status || 500).json({
      error: true,
      code: error.code || 'TOPIC_COMPLETE_ERROR',
      message: error.message
    });
  }
});

router.get('/student/progress', requireAuth, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const data = await studentService.getProgress(req.user.id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get('/student/assignments', requireAuth, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const data = await assignmentService.listStudentAssignments(req.user.id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get('/student/assignments/:id', requireAuth, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const data = await assignmentService.getStudentAssignmentDetail(req.user.id, req.params.id);
    res.json({ data });
  } catch (error) {
    res.status(error.status || 500).json({
      error: true,
      code: error.code || 'STUDENT_ASSIGNMENT_ERROR',
      message: error.message
    });
  }
});

router.post('/student/assignments/:id/upload-signature', requireAuth, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const data = await assignmentService.requestSubmissionUploadSignature(req.user.id, req.params.id, req.body || {});
    res.json({ data });
  } catch (error) {
    res.status(error.status || 500).json({
      error: true,
      code: error.code || 'ASSIGNMENT_UPLOAD_SIGNATURE_ERROR',
      message: error.message
    });
  }
});

router.post('/student/assignments/:id/submit', requireAuth, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const data = await assignmentService.submitAssignment(req.user.id, req.params.id, req.body || {});
    res.status(201).json({ data });
  } catch (error) {
    res.status(error.status || 500).json({
      error: true,
      code: error.code || 'ASSIGNMENT_SUBMIT_ERROR',
      message: error.message
    });
  }
});

router.get('/submissions/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const data = await assignmentService.listSubmissionComments(req.user, req.params.id);
    res.json({ data });
  } catch (error) {
    res.status(error.status || 500).json({
      error: true,
      code: error.code || 'SUBMISSION_COMMENTS_ERROR',
      message: error.message
    });
  }
});

router.post('/submissions/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const data = await assignmentService.addSubmissionComment(req.user, req.params.id, req.body || {});
    res.status(201).json({ data });
  } catch (error) {
    res.status(error.status || 500).json({
      error: true,
      code: error.code || 'SUBMISSION_COMMENT_CREATE_ERROR',
      message: error.message
    });
  }
});

router.get('/student/submissions/:id/media', requireAuth, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const data = await assignmentService.getSubmissionMedia(req.user, req.params.id);
    res.json({ data });
  } catch (error) {
    res.status(error.status || 500).json({
      error: true,
      code: error.code || 'SUBMISSION_MEDIA_ERROR',
      message: error.message
    });
  }
});

// ==========================================
// TEACHER ROUTES
// ==========================================
router.get('/teacher/dashboard', requireAuth, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const data = await teacherService.getDashboard(req.user.id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get('/teacher/students', requireAuth, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const data = await teacherService.getStudents(req.user.id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.post('/teacher/assignments', requireAuth, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const data = await assignmentService.createTeacherAssignment(req.user.id, req.body || {});
    res.status(201).json({ data });
  } catch (error) {
    res.status(error.status || 500).json({
      error: true,
      code: error.code || 'ASSIGNMENT_CREATE_ERROR',
      message: error.message
    });
  }
});

router.get('/teacher/assignments', requireAuth, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const data = await assignmentService.listTeacherAssignments(req.user.id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get('/teacher/submissions', requireAuth, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const data = await assignmentService.listTeacherSubmissions(req.user.id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get('/teacher/submissions/:id', requireAuth, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const data = await assignmentService.getTeacherSubmissionDetail(req.user.id, req.params.id);
    res.json({ data });
  } catch (error) {
    res.status(error.status || 500).json({
      error: true,
      code: error.code || 'SUBMISSION_DETAIL_ERROR',
      message: error.message
    });
  }
});

router.get('/teacher/submissions/:id/media', requireAuth, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const data = await assignmentService.getSubmissionMedia(req.user, req.params.id);
    res.json({ data });
  } catch (error) {
    res.status(error.status || 500).json({
      error: true,
      code: error.code || 'SUBMISSION_MEDIA_ERROR',
      message: error.message
    });
  }
});

router.post('/teacher/submissions/:id/grade', requireAuth, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const data = await assignmentService.gradeSubmission(req.user.id, req.params.id, req.body || {});
    res.json({ data });
  } catch (error) {
    res.status(error.status || 500).json({
      error: true,
      code: error.code || 'SUBMISSION_GRADE_ERROR',
      message: error.message
    });
  }
});

router.post('/teacher/submissions/:id/return-revision', requireAuth, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const data = await assignmentService.returnSubmissionForRevision(req.user.id, req.params.id, req.body || {});
    res.json({ data });
  } catch (error) {
    res.status(error.status || 500).json({
      error: true,
      code: error.code || 'SUBMISSION_REVISION_ERROR',
      message: error.message
    });
  }
});

router.get('/teacher/accuracy', requireAuth, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const data = await teacherService.getAccuracy(req.user.id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/teacher-change-requests', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const requests = await userService.listTeacherChangeRequests();
    res.json({ data: { requests } });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/teacher-change-requests/:id/review', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const data = await userService.reviewTeacherChangeRequest(req.params.id, req.body.status);
    res.json({ data });
  } catch (error) {
    res.status(error.status || 400).json({ error: true, message: error.message });
  }
});

// ==========================================
// PAYMENTS & PRICING ROUTES
// ==========================================

router.get('/pricing', async (req, res, next) => {
  try {
    const pricing = await paymentService.getActivePricing();
    if (!pricing) {
      return res.status(404).json({ error: true, message: 'No active course pricing found.' });
    }
    return res.json({ data: { pricing } });
  } catch (error) {
    return next(error);
  }
});

router.get('/course-access/me', requireAuth, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const access = await paymentService.getCourseAccess(req.user.id);
    return res.json({ data: access });
  } catch (error) {
    return next(error);
  }
});

router.post('/payments/vnpay/create', requireAuth, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const { pricingId } = req.body || {};
    
    const paymentData = await paymentService.createPayment(req.user.id, pricingId, ipAddr);
    return res.status(201).json({ data: paymentData });
  } catch (error) {
    return next(error);
  }
});

router.get('/payments/vnpay/return', async (req, res, next) => {
  try {
    const result = await paymentService.processReturn(req.query);
    if (String(req.headers.accept || '').includes('text/html')) {
      return res.redirect(buildPaymentResultRedirectUrl(req.query));
    }
    return res.json({ data: result });
  } catch (error) {
    return next(error);
  }
});

router.get('/payments/vnpay/ipn', async (req, res, next) => {
  try {
    const response = await paymentService.processIpn(req.query);
    return res.json(response);
  } catch (error) {
    console.error('IPN route error:', error);
    return res.json({ RspCode: '99', Message: 'Unknown error' });
  }
});

module.exports = router;
