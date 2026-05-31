const express = require('express');
const authService = require('../services/auth.service');
const lessonService = require('../services/lesson.service');
const studentService = require('../services/student.service');
const teacherService = require('../services/teacher.service');
const userService = require('../services/user.service');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

const router = express.Router();

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
    if (error.code === 'ER_DUP_ENTRY') {
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
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: true,
        message: 'Current password and new password are required.'
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        error: true,
        message: 'New password must be at least 6 characters.'
      });
    }

    const user = await authService.changePassword(req.user.id, currentPassword, newPassword);
    return res.json({ data: { user } });
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
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: true, message: 'Email or username already exists.' });
    }
    return next(error);
  }
});

router.get('/teachers', requireAuth, async (req, res, next) => {
  try {
    const teachers = await studentService.listTeachers();
    res.json({ data: { teachers } });
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

router.get('/lessons', async (req, res, next) => {
  try {
    const parts = await lessonService.getAllPartsWithChapters();
    res.json({ data: { parts } });
  } catch (error) {
    next(error);
  }
});

router.get('/lessons/:slug', requireAuth, async (req, res, next) => {
  try {
    const lesson = await lessonService.getLessonBySlug(req.params.slug);
    if (!lesson) {
      return res.status(404).json({ error: true, message: 'Lesson not found.' });
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
        navigation
      }
    });
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
    const data = await studentService.getAssignments(req.user.id);
    res.json({ data });
  } catch (error) {
    next(error);
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

router.get('/teacher/assignments', requireAuth, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const data = await teacherService.getAssignments(req.user.id);
    res.json({ data });
  } catch (error) {
    next(error);
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

module.exports = router;
