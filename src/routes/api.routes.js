const express = require('express');
const authService = require('../services/auth.service');
const lessonService = require('../services/lesson.service');
const studentService = require('../services/student.service');
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
    if (req.body.role && req.body.role !== 'STUDENT') {
      return res.status(403).json({
        error: true,
        message: 'Public registration is only available for students.'
      });
    }

    const user = await authService.register(req.body);
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

router.get('/teachers', requireAuth, async (req, res, next) => {
  try {
    const teachers = await studentService.listTeachers();
    res.json({ data: { teachers } });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/teachers', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { name, email, temporaryPassword, status } = req.body;

    if (!email || !temporaryPassword) {
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

    const teacher = await authService.createTeacher({ name, email, temporaryPassword, status });
    return res.status(201).json({ data: { teacher } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: true, message: 'Email or username already exists.' });
    }
    return next(error);
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

router.get('/lessons/:slug', async (req, res, next) => {
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

module.exports = router;
