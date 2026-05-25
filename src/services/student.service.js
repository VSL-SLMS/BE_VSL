const { pool } = require('../config/database');

async function getDashboard(userId) {
  const [progress] = await pool.query(`
    SELECT
      COUNT(*) AS tracked_lessons,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_lessons
    FROM lesson_progress
    WHERE student_id = (SELECT id FROM students WHERE user_id = ?)
  `, [userId]);

  const [totalLessons] = await pool.query('SELECT COUNT(*) AS total FROM lessons');
  return {
    progress: progress[0],
    totalLessons: totalLessons[0].total
  };
}

async function listTeachers() {
  const [rows] = await pool.query(`
    SELECT t.id, u.display_name, u.email, t.accuracy
    FROM teachers t
    JOIN users u ON u.id = t.user_id
    WHERE u.status = 'ACTIVE'
    ORDER BY u.display_name
  `);
  return rows;
}

async function chooseTeacher(userId, teacherId) {
  const [students] = await pool.query('SELECT id, teacher_id FROM students WHERE user_id = ? LIMIT 1', [userId]);
  const student = students[0];
  if (!student) throw new Error('Student profile not found.');
  if (student.teacher_id) throw new Error('Teacher already selected.');

  await pool.query('UPDATE students SET teacher_id = ? WHERE id = ?', [teacherId, student.id]);
}

async function getProgress(userId) {
  const [rows] = await pool.query(`
    SELECT lp.*, l.title, l.slug, c.title AS chapter_title
    FROM lesson_progress lp
    JOIN lessons l ON l.id = lp.lesson_id
    JOIN chapters c ON c.id = l.chapter_id
    WHERE lp.student_id = (SELECT id FROM students WHERE user_id = ?)
    ORDER BY lp.completed_at DESC, lp.started_at DESC
  `, [userId]);
  return rows;
}

async function getAssignments(userId) {
  const [rows] = await pool.query(`
    SELECT a.*, s.status AS submission_status, s.score
    FROM assignment_students ast
    JOIN assignments a ON a.id = ast.assignment_id
    LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ast.student_id
    WHERE ast.student_id = (SELECT id FROM students WHERE user_id = ?)
    ORDER BY a.created_at DESC
  `, [userId]);
  return rows;
}

module.exports = { getDashboard, listTeachers, chooseTeacher, getProgress, getAssignments };

